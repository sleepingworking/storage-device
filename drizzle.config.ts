import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
config({ path: '.env.local' });

console.log('Drizzle config: connecting to', process.env.DATABASE_URL);
export default defineConfig({
  schema: ['./src/modules/*/infrastructure/persistence/schema.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});
