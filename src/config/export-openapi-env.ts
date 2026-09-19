// Must be imported before AppModule: ConfigModule.forRoot() validates
// process.env while app.module.ts is being evaluated (ES imports hoist),
// so these values have to exist before any other import runs.
//
// Inert placeholder values: the OpenAPI export never connects to a database
// (the TypeORM DataSource is stubbed), so no real credentials are required
// or referenced. The URL intentionally carries no user:password pair so it
// cannot be mistaken for a real connection string.
const EXPORT_ENV_DEFAULTS: Record<string, string> = {
  DATABASE_URL: 'postgresql://localhost:5432/refugiapp_export',
  DB_SSL: 'false',
  JWT_SECRET: 'openapi-export-only-secret-with-at-least-32-characters',
  CLOUDINARY_CLOUD_NAME: '',
  CLOUDINARY_API_KEY: '',
  CLOUDINARY_API_SECRET: '',
};

for (const [key, value] of Object.entries(EXPORT_ENV_DEFAULTS)) {
  process.env[key] = value;
}
