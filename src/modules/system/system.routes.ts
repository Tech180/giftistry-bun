import { Elysia, t } from 'elysia';
import { authMiddleware } from '../auth/presentation/auth.routes';
import { loadConfig, saveConfig, sql } from '@/common/database/connection';
import { initializeSchema } from '@/common/database/init-schema';
import { AppError } from '@/common/middlewares/error.middleware';
import { getSitePolicy } from '@/common/services/site-policy.service';
import { writeAuditLog } from '@/common/services/audit-log.service';
import postgres from 'postgres';
import nodemailer from 'nodemailer';

export const systemRoutes = new Elysia({ prefix: '/api/system' })
  .get('/status', async () => {
    let initialized = false;
    try {
      const [row] = await sql<any[]>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'users'
        ) as exists
      `;
      if (row?.exists) {
        const [countRow] = await sql<any[]>`SELECT COUNT(*)::integer as count FROM users`;
        initialized = (countRow && countRow.count > 0);
      }
    } catch (err) {
      initialized = false;
    }

    const config = loadConfig();
    const sitePolicy = await getSitePolicy();
    return {
      success: true,
      initialized,
      aiEnabled: config.aiEnabled ?? false,
      maintenanceMode: sitePolicy.maintenanceMode,
      maintenanceMessage: sitePolicy.maintenanceMessage,
      registrationMode: sitePolicy.registrationMode,
    };
  })
  .post('/setup', async ({ body: { Giftistry: { Setup: payload } } }) => {
    let initialized = false;
    try {
      const [row] = await sql<any[]>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'users'
        ) as exists
      `;
      if (row?.exists) {
        const [countRow] = await sql<any[]>`SELECT COUNT(*)::integer as count FROM users`;
        initialized = (countRow && countRow.count > 0);
      }
    } catch (err) {
      initialized = false;
    }

    if (initialized) {
      throw new AppError('Forbidden: System already setup', 400, 'BAD_REQUEST');
    }

    // 2. Test database connection if remote
    if (payload.dbType === 'remote') {
      if (!payload.dbUrl) {
        throw new AppError('Database connection URL is required for remote database type', 400, 'BAD_REQUEST');
      }
      try {
        const testSql = postgres(payload.dbUrl, { max: 1, connect_timeout: 5 });
        await testSql`SELECT 1`;
        await testSql.end();
      } catch (err: any) {
        throw new AppError(`Failed to connect to the remote database: ${err.message}`, 400, 'BAD_REQUEST');
      }
    }

    // 3. Test SMTP connection if remote
    if (payload.smtpType === 'remote') {
      if (!payload.smtpHost || payload.smtpPort === undefined) {
        throw new AppError('SMTP host and port are required for remote SMTP type', 400, 'BAD_REQUEST');
      }
      const transportOptions: any = {
        host: payload.smtpHost,
        port: payload.smtpPort,
        secure: payload.smtpSecure,
      };
      if (payload.smtpUser || payload.smtpPass) {
        transportOptions.auth = {
          user: payload.smtpUser || '',
          pass: payload.smtpPass || '',
        };
      }
      try {
        const testTransporter = nodemailer.createTransport(transportOptions);
        await testTransporter.verify();
      } catch (err: any) {
        throw new AppError(`Failed to verify SMTP connection: ${err.message}`, 400, 'BAD_REQUEST');
      }
    }

    // 4. Save configuration
    saveConfig({
      dbType: payload.dbType as 'local' | 'remote',
      dbUrl: payload.dbUrl,
      smtpType: payload.smtpType as 'local' | 'remote',
      smtpHost: payload.smtpHost,
      smtpPort: payload.smtpPort,
      smtpUser: payload.smtpUser,
      smtpPass: payload.smtpPass,
      smtpSecure: payload.smtpSecure,
      smtpFrom: payload.smtpFrom,
    });

    // 5. Initialize schema
    await initializeSchema(sql);

    // 6. Register administrator account
    const { username, email, password, firstName, lastName } = payload.admin;
    if (!username || !email || !password) {
      throw new AppError('Admin credentials (username, email, password) are required', 400, 'BAD_REQUEST');
    }

    const authHash = await Bun.password.hash(password);
    
    // Check if user already exists
    const [existing] = await sql`SELECT id FROM users WHERE username = ${username} OR email = ${email}`;
    if (existing) {
      throw new AppError('User already exists in setup phase', 400, 'BAD_REQUEST');
    }

    const fName = firstName || 'System';
    const lName = lastName || 'Admin';

    await sql`
      INSERT INTO users (username, email, first_name, last_name, auth_hash, is_admin, is_owner, email_verified)
      VALUES (${username}, ${email}, ${fName}, ${lName}, ${authHash}, true, true, true)
    `;

    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Setup: t.Object({
          dbType: t.String(),
          dbUrl: t.Optional(t.String()),
          smtpType: t.String(),
          smtpHost: t.Optional(t.String()),
          smtpPort: t.Optional(t.Numeric()),
          smtpUser: t.Optional(t.String()),
          smtpPass: t.Optional(t.String()),
          smtpSecure: t.Optional(t.Boolean()),
          smtpFrom: t.Optional(t.String()),
          admin: t.Object({
            username: t.String(),
            email: t.String(),
            password: t.String(),
            firstName: t.Optional(t.String()),
            lastName: t.Optional(t.String()),
          })
        })
      })
    })
  })
  .use(authMiddleware)
  .get('/settings', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    if (!user.IsAdmin) {
      throw new AppError('Forbidden: Admin access required', 403, 'FORBIDDEN');
    }

    const config = loadConfig();
    return {
      success: true,
      data: {
        dbType: config.dbType,
        dbUrl: config.dbUrl || '',
        smtpType: config.smtpType,
        smtpHost: config.smtpHost || '',
        smtpPort: config.smtpPort !== undefined ? config.smtpPort : 1025,
        smtpUser: config.smtpUser || '',
        smtpPass: config.smtpPass ? '******' : '',
        smtpSecure: !!config.smtpSecure,
        smtpFrom: config.smtpFrom || 'noreply@giftistry.local',
        aiEnabled: !!config.aiEnabled,
        aiProvider: config.aiProvider || 'gemini',
        aiApiKey: config.aiApiKey ? '******' : '',
        aiModel: config.aiModel || '',
        aiPrompt: config.aiPrompt || '',
        aiEndpoint: config.aiEndpoint || '',
      }
    };
  })
  .post('/settings', async ({ getAuthUser, body: { Giftistry: { System: settings } } }) => {
    const user = await getAuthUser();
    if (!user.IsAdmin) {
      throw new AppError('Forbidden: Admin access required', 403, 'FORBIDDEN');
    }

    // 1. Test database connection if type is remote
    if (settings.dbType === 'remote') {
      if (!settings.dbUrl) {
        throw new AppError('Database connection URL is required for remote database type', 400, 'BAD_REQUEST');
      }
      try {
        const testSql = postgres(settings.dbUrl, { max: 1, connect_timeout: 5 });
        await testSql`SELECT 1`;
        await testSql.end();
      } catch (err: any) {
        throw new AppError(`Failed to connect to the remote database: ${err.message}`, 400, 'BAD_REQUEST');
      }
    }

    // 2. Test SMTP connection if type is remote
    if (settings.smtpType === 'remote') {
      if (!settings.smtpHost || settings.smtpPort === undefined) {
        throw new AppError('SMTP host and port are required for remote SMTP type', 400, 'BAD_REQUEST');
      }
      
      let smtpPass = settings.smtpPass;
      if (smtpPass === '******') {
        const config = loadConfig();
        smtpPass = config.smtpPass || '';
      }

      const transportOptions: any = {
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpSecure,
      };
      if (settings.smtpUser || smtpPass) {
        transportOptions.auth = {
          user: settings.smtpUser,
          pass: smtpPass
        };
      }

      try {
        const testTransporter = nodemailer.createTransport(transportOptions);
        await testTransporter.verify();
      } catch (err: any) {
        throw new AppError(`Failed to verify SMTP connection: ${err.message}`, 400, 'BAD_REQUEST');
      }
    }

    // 3. Resolve smtpPass and aiApiKey if masked
    let smtpPass = settings.smtpPass;
    if (smtpPass === '******') {
      const config = loadConfig();
      smtpPass = config.smtpPass || '';
    }

    let aiApiKey = settings.aiApiKey;
    if (aiApiKey === '******') {
      const config = loadConfig();
      aiApiKey = config.aiApiKey || '';
    }

    // 4. Save configuration
    saveConfig({
      dbType: settings.dbType as 'local' | 'remote',
      dbUrl: settings.dbUrl,
      smtpType: settings.smtpType as 'local' | 'remote',
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPass: smtpPass,
      smtpSecure: settings.smtpSecure,
      smtpFrom: settings.smtpFrom,
      aiEnabled: settings.aiEnabled,
      aiProvider: settings.aiProvider as any,
      aiApiKey: aiApiKey,
      aiModel: settings.aiModel,
      aiPrompt: settings.aiPrompt,
      aiEndpoint: settings.aiEndpoint,
    });

    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        System: t.Object({
          dbType: t.String(),
          dbUrl: t.Optional(t.String()),
          smtpType: t.String(),
          smtpHost: t.Optional(t.String()),
          smtpPort: t.Optional(t.Numeric()),
          smtpUser: t.Optional(t.String()),
          smtpPass: t.Optional(t.String()),
          smtpSecure: t.Optional(t.Boolean()),
          smtpFrom: t.Optional(t.String()),
          aiEnabled: t.Optional(t.Boolean()),
          aiProvider: t.Optional(t.String()),
          aiApiKey: t.Optional(t.String()),
          aiModel: t.Optional(t.String()),
          aiPrompt: t.Optional(t.String()),
          aiEndpoint: t.Optional(t.String()),
        })
      })
    })
  })
  .post('/transfer-ownership', async ({ getAuthUser, body: { Giftistry: { Ownership: payload } }, request }) => {
    const actor = await getAuthUser();

    const [actorRow] = await sql<any[]>`
      SELECT is_owner as "IsOwner" FROM users WHERE id = ${actor.Id}
    `;
    if (!actorRow?.IsOwner) {
      throw new AppError('Only the server owner can transfer ownership', 403, 'FORBIDDEN');
    }

    const targetUserId = payload?.userId?.trim();
    if (!targetUserId) {
      throw new AppError('Target user is required', 400, 'BAD_REQUEST');
    }

    if (targetUserId === actor.Id) {
      throw new AppError('You cannot transfer ownership to yourself', 400, 'BAD_REQUEST');
    }

    const [target] = await sql<any[]>`
      SELECT id, username, is_disabled as "IsDisabled"
      FROM users WHERE id = ${targetUserId}
    `;
    if (!target) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    if (target.IsDisabled) {
      throw new AppError('Cannot transfer ownership to a disabled account', 400, 'BAD_REQUEST');
    }

    await sql.begin(async (tx) => {
      await tx`UPDATE users SET is_owner = false WHERE id = ${actor.Id}`;
      await tx`UPDATE users SET is_owner = true, is_admin = true WHERE id = ${targetUserId}`;
    });

    await writeAuditLog({
      actorId: actor.Id,
      targetId: targetUserId,
      action: 'system.transfer_ownership',
      metadata: { newOwnerUsername: target.username },
      ip: request.headers.get('x-forwarded-for'),
    });

    return {
      success: true,
      NewOwnerId: targetUserId,
      NewOwnerUsername: target.username,
    };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Ownership: t.Object({
          userId: t.String(),
        }),
      }),
    }),
  })
  .post('/delete-server', async ({ getAuthUser, request }) => {
    const actor = await getAuthUser();

    const [actorRow] = await sql<any[]>`
      SELECT is_owner as "IsOwner" FROM users WHERE id = ${actor.Id}
    `;
    if (!actorRow?.IsOwner) {
      throw new AppError('Only the server owner can delete this server', 403, 'FORBIDDEN');
    }

    await writeAuditLog({
      actorId: actor.Id,
      action: 'system.delete_server',
      metadata: { initiatedBy: actor.Username },
      ip: request.headers.get('x-forwarded-for'),
    });

    await sql`DELETE FROM user_passkeys`;
    await sql`DELETE FROM users`;

    return { success: true };
  });
