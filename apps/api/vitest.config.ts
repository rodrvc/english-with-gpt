import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    env: {
      OPENAI_API_KEY: 'test-key-not-real',
      OPENAI_MODEL: 'test-model',
      DATABASE_PATH: ':memory:',
    },
  },
});
