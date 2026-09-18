const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'] as const;

export function assertEnv(): void {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  const { MONGODB_URI = '', JWT_SECRET = '' } = process.env;
  // Catch values copied straight from .env.example.
  if (/<[a-z]+>/i.test(MONGODB_URI)) {
    throw new Error(
      'MONGODB_URI in apps/api/.env still contains placeholders like <cluster>. ' +
        'Paste your Atlas connection string, or run `npm run db:local` and use ' +
        'MONGODB_URI=mongodb://127.0.0.1:27018/learning-platform?replicaSet=local',
    );
  }
  if (JWT_SECRET === 'change-me') {
    throw new Error('JWT_SECRET in apps/api/.env is still the example value; set a random one');
  }
  if (process.env.NODE_ENV === 'production' && JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
}
