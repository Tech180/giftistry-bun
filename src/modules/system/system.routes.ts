import { Elysia, t } from 'elysia';
import { authMiddleware } from '../auth/presentation/auth.routes';
import { loadConfig, saveConfig, sql } from '@/common/database/connection';
import { initializeSchema } from '@/common/database/init-schema';
import { AppError } from '@/common/middlewares/error.middleware';
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

    return {
      success: true,
      initialized
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
      INSERT INTO users (username, email, first_name, last_name, auth_hash, is_admin, email_verified)
      VALUES (${username}, ${email}, ${fName}, ${lName}, ${authHash}, true, true)
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

    // 3. Resolve smtpPass if masked
    let smtpPass = settings.smtpPass;
    if (smtpPass === '******') {
      const config = loadConfig();
      smtpPass = config.smtpPass || '';
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
        })
      })
    })
  });
