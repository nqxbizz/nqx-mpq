import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const REDIS_URL = process.env.REDIS_URL
const STRIPE_API_KEY = process.env.STRIPE_API_KEY

// The Payment module always registers the built-in manual/system provider
// ("pp_system_default") automatically, so checkout is testable today.
// Stripe is added automatically once STRIPE_API_KEY is set in .env.
const paymentProviders: any[] = []
if (STRIPE_API_KEY) {
  paymentProviders.push({
    resolve: '@medusajs/medusa/payment-stripe',
    id: 'stripe',
    options: {
      apiKey: STRIPE_API_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
  })
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Local/Dockerised Postgres has no SSL; Medusa otherwise tries SSL in
    // production mode and fails with "server does not support SSL".
    databaseDriverOptions: {
      connection: { ssl: false },
    },
    redisUrl: REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
    },
    // Medusa forces the admin session cookie to Secure+SameSite=None in
    // production, so it is DROPPED over plain http://localhost (express-session
    // won't even send Set-Cookie) — the admin then 401s and bounces back to
    // the login form. cookieOptions is spread last into the session cookie,
    // so this is the supported override. Set COOKIE_SECURE=true behind HTTPS.
    cookieOptions: {
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: process.env.COOKIE_SECURE === 'true' ? 'none' : 'lax',
      httpOnly: true,
      maxAge: 10 * 60 * 60 * 1000,
    },
  },
  admin: {
    backendUrl: process.env.BACKEND_PUBLIC_URL || 'http://localhost:9000',
  },
  modules: [
    // ---- Redis-backed infra (events, cache, workflows) ----
    ...(REDIS_URL
      ? [
          {
            resolve: '@medusajs/medusa/cache-redis',
            options: { redisUrl: REDIS_URL },
          },
          {
            resolve: '@medusajs/medusa/event-bus-redis',
            options: { redisUrl: REDIS_URL },
          },
          {
            resolve: '@medusajs/medusa/workflow-engine-redis',
            options: { redis: { url: REDIS_URL } },
          },
        ]
      : []),

    // ---- File storage on MinIO (S3-compatible) ----
    {
      resolve: '@medusajs/medusa/file',
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/file-s3',
            id: 's3',
            options: {
              file_url: process.env.S3_FILE_URL,
              endpoint: process.env.S3_ENDPOINT,
              bucket: process.env.S3_BUCKET,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION || 'us-east-1',
              additional_client_config: { forcePathStyle: true },
            },
          },
        ],
      },
    },

    // ---- Payment (manual always; Stripe when key present) ----
    {
      resolve: '@medusajs/medusa/payment',
      options: { providers: paymentProviders },
    },
  ],
})
