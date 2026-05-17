import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

// Surfaces every infra endpoint + credential in one admin page, so the owner
// never has to dig through .env to reach MinIO or the database.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({
    services: [
      {
        name: 'Storefront',
        url: process.env.STOREFRONT_PUBLIC_URL || 'http://localhost:8800',
        description: 'Public shop',
      },
      {
        name: 'Backend API',
        url: process.env.BACKEND_PUBLIC_URL || 'http://localhost:9000',
        description: 'Medusa REST / Store API',
      },
      {
        name: 'Database browser (Adminer)',
        url: process.env.ADMINER_PUBLIC_URL || 'http://localhost:8085',
        description: 'Browse / query Postgres in the browser',
        credentials: {
          System: 'PostgreSQL',
          Server: 'postgres',
          Username: process.env.POSTGRES_USER || 'mpq',
          Password: process.env.POSTGRES_PASSWORD || '(see .env)',
          Database: process.env.POSTGRES_DB || 'mpq',
        },
      },
      {
        name: 'MinIO console (image storage)',
        url:
          process.env.MINIO_CONSOLE_PUBLIC_URL || 'http://localhost:9011',
        description: 'Browse / manage uploaded product images',
        credentials: {
          Username: process.env.MINIO_ROOT_USER || 'mpqminio',
          Password: process.env.MINIO_ROOT_PASSWORD || '(see .env)',
          Bucket: process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'mpq-media',
        },
      },
    ],
    connectionStrings: {
      database: process.env.DATABASE_URL || '(see .env)',
      redis: process.env.REDIS_URL || '(see .env)',
      s3Endpoint: process.env.S3_ENDPOINT || '(see .env)',
    },
  })
}
