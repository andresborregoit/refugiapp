import Joi from 'joi';

const productionJwtSecretSchema = Joi.string()
  .min(32)
  .required()
  .custom((value, helpers) => {
    if (/replace-with|change-?me|changeme|example|placeholder|your-/i.test(value)) {
      return helpers.error('any.invalid');
    }

    return value;
  })
  .messages({
    'any.invalid': 'JWT_SECRET must not be a placeholder in production.',
  });

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),

  DATABASE_URL: Joi.string()
    .uri({
      scheme: ['postgres', 'postgresql'],
    })
    .required(),
  DB_SSL: Joi.boolean().default(true),
  DB_SSL_REJECT_UNAUTHORIZED: Joi.boolean().default(false),
  DB_POOL_SIZE: Joi.number().integer().min(1).max(50).default(10),
  TYPEORM_SYNCHRONIZE: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.boolean().valid(false).default(false).messages({
      'any.only': 'TYPEORM_SYNCHRONIZE must be false in production.',
    }),
    otherwise: Joi.boolean().default(false),
  }),
  TYPEORM_LOGGING: Joi.boolean().default(false),

  INITIAL_ADMIN_EMAIL: Joi.string().email().allow('').default(''),
  INITIAL_ADMIN_PASSWORD: Joi.string().min(12).allow('').default(''),
  INITIAL_ADMIN_FIRST_NAME: Joi.string().allow('').default(''),
  INITIAL_ADMIN_LAST_NAME: Joi.string().allow('').default(''),
  INITIAL_ADMIN_RESET_PASSWORD: Joi.boolean().default(false),
  INITIAL_ADMIN_SEED_ALLOW_PRODUCTION: Joi.boolean().default(false),

  JWT_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: productionJwtSecretSchema,
    otherwise: Joi.string().min(32).required(),
  }),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  JWT_ISSUER: Joi.string().default('refugiapp-api'),
  JWT_AUDIENCE: Joi.string().default('refugiapp-mobile'),

  CLOUDINARY_CLOUD_NAME: Joi.string().min(1).required(),
  CLOUDINARY_API_KEY: Joi.string().min(1).required(),
  CLOUDINARY_API_SECRET: Joi.string().min(1).required(),
  CLOUDINARY_SECURE: Joi.boolean().default(true),
});
