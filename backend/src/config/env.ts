import { z } from 'zod';

/**
 * Environment variable schema with strict validation
 * Fail fast if required variables are missing
 */
const envSchema = z.object({
  // Server
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // CORS - Required in production
  ALLOWED_ORIGINS: z.string().min(1, 'ALLOWED_ORIGINS is required'),
  
  // Supabase (required)
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),
  
  // HCP Integration (required for HCP sync endpoints)
  HCP_CLIENT_ID: z.string().min(1, 'HCP_CLIENT_ID is required'),
  HCP_CLIENT_SECRET: z.string().min(1, 'HCP_CLIENT_SECRET is required'),
  HCP_REDIRECT_URI: z.string().url('HCP_REDIRECT_URI must be a valid URL'),
  
  // QuickBooks Online (optional - only needed if using QBO)
  QBO_CLIENT_ID: z.string().optional(),
  QBO_CLIENT_SECRET: z.string().optional(),
  QBO_REDIRECT_URI: z.string().optional(),
  QBO_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  
  // QuickBooks Desktop (optional - only needed if using QBD)
  QBD_COMPANY_FILE: z.string().optional(),
  QBD_APP_NAME: z.string().optional(),
  
  // Integration Security Key (for Netlify Functions)
  INTEGRATIONS_KEY: z.string().min(32, 'INTEGRATIONS_KEY must be at least 32 characters').optional(),
  
  // Optional URLs
  APP_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().optional(),
  NETLIFY_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables at startup
 * @throws {Error} If validation fails
 */
export function validateEnv(): Env {
  console.log('🔍 Validating environment variables...');
  
  try {
    const env = envSchema.parse(process.env);
    console.log('✅ Environment validation passed');
    
    // Log non-sensitive config in development
    if (env.NODE_ENV === 'development') {
      console.log('📋 Configuration:');
      console.log(`  - NODE_ENV: ${env.NODE_ENV}`);
      console.log(`  - PORT: ${env.PORT}`);
      console.log(`  - ALLOWED_ORIGINS: ${env.ALLOWED_ORIGINS}`);
      console.log(`  - SUPABASE_URL: ${env.SUPABASE_URL}`);
      console.log(`  - HCP_CLIENT_ID: ${env.HCP_CLIENT_ID ? '✓' : '✗'}`);
      console.log(`  - QBO_CLIENT_ID: ${env.QBO_CLIENT_ID ? '✓' : '✗'}`);
      console.log(`  - INTEGRATIONS_KEY: ${env.INTEGRATIONS_KEY ? '✓' : '✗'}`);
    }
    
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\n💡 Tip: Check your .env file and ensure all required variables are set');
      console.error('Required variables: ALLOWED_ORIGINS, SUPABASE_URL, SUPABASE_SERVICE_KEY, HCP_CLIENT_ID, HCP_CLIENT_SECRET, HCP_REDIRECT_URI');
      process.exit(1);
    }
    console.error('❌ Unexpected error during environment validation:', error);
    throw error;
  }
}

/**
 * Get validated environment variables
 * Must be called after validateEnv()
 */
export function getEnv(): Env {
  return process.env as unknown as Env;
}

/**
 * Parse ALLOWED_ORIGINS into array
 */
export function getAllowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean);
}
