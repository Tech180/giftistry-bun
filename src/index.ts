import type { AnyElysia } from 'elysia';
import { getEnv } from './common/config/utils/get-env.util';
import { getPublicAppUrl } from './common/utils/public-app-url.util';
import { createAppContainer } from './app.container';
import {
  resolveProcessRole,
  shouldListenRealtimeFanout,
  shouldRunJobs,
  shouldServeHttp,
} from './common/utils/process-role.util';
import { wireDirectRealtimePublishers } from '@/boot/runtime-publishers';
import { createHttpApp } from '@/boot/create-http-app';
import { ensureDatabaseSchema } from '@/boot/utils/ensure-database-schema.util';
import { startPostgresRealtimeListener } from '@/modules/jobs/infrastructure/adapters/postgres-realtime-listener';

const processRole = resolveProcessRole();
if (processRole === 'worker') {
  console.error(
    '[boot] GIFTISTRY_PROCESS_ROLE=worker is not valid for src/index.ts. Use: bun run src/worker.ts'
  );
  process.exit(1);
}

const container = createAppContainer({
  skipItemJobCompletionNotify: false,
});
const {
  authModule,
  wishlistModule,
  itemModule,
  jobsModule,
  jobRunner,
  jobRepo,
  notifyItemJobCompletion,
  commentModule,
  friendsModule,
  notificationsModule,
  invitesModule,
  registrationInviteModule,
  systemModule,
  adminModule,
  userRepo,
  realtimePublishers,
  linkTokenRepo,
} = container;

export const app: AnyElysia = createHttpApp({
  authModule: authModule as AnyElysia,
  notificationsModule: notificationsModule as AnyElysia,
  wishlistModule: wishlistModule as AnyElysia,
  itemModule: itemModule as AnyElysia,
  jobsModule: jobsModule as AnyElysia,
  commentModule: commentModule as AnyElysia,
  friendsModule: friendsModule as AnyElysia,
  invitesModule: invitesModule as AnyElysia,
  registrationInviteModule: registrationInviteModule as AnyElysia,
  systemModule: systemModule as AnyElysia,
  adminModule: adminModule as AnyElysia,
  userRepo,
  linkTokenRepo,
});

const databaseReady = await ensureDatabaseSchema();

if (process.env.NODE_ENV !== 'test') {
  if (!shouldServeHttp(processRole)) {
    console.error(`[boot] Role "${processRole}" cannot serve HTTP via index.ts`);
    process.exit(1);
  }

  const runtime = getEnv();
  if (runtime.isProduction && !getPublicAppUrl()) {
    console.warn(
      '[boot] PublicAppUrl is unset — set it in onboarding/admin (config.json). CORS is open until then; email/OAuth links need it.'
    );
  }

  app.listen(runtime.PORT);
  wireDirectRealtimePublishers((room, data) => {
    app.server?.publish(room, data);
  }, realtimePublishers);

  if (databaseReady && shouldListenRealtimeFanout(processRole)) {
    void startPostgresRealtimeListener({
      jobRepo,
      publishToWs: (room, payloadJson) => {
        app.server?.publish(room, payloadJson);
      },
      notifyItemJobCompletion,
    }).catch((err) => {
      console.error('[boot] Failed to start realtime fanout listener:', err);
    });
  }

  if (shouldRunJobs(processRole)) {
    if (databaseReady) {
      jobRunner.start();
    } else {
      console.warn(
        '[boot] Job runner deferred — database unavailable; restart after Postgres is up'
      );
    }
  } else {
    console.log(
      `[boot] Job runner disabled (GIFTISTRY_PROCESS_ROLE=${processRole}); use the worker process for jobs`
    );
  }

  console.log(
    `Giftistry API is running at http://${app.server?.hostname}:${app.server?.port} (role=${processRole})`
  );
}
