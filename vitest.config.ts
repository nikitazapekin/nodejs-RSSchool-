import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.unit.spec.ts'],
    exclude: ['tests/**', 'dist/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.controller.ts',
        'src/auth/interfaces/**',
        'src/common/types/**',
        'src/common/interfaces/**',
        'src/common/middleware/**',
        'src/common/models/**',
        'src/auth/decorators/current-user.decorator.ts',
        'src/database/prisma-client-options.ts',
        'src/database/prisma.service.ts',
      ],
      thresholds: {
        lines: 90,
        branches: 85,
        functions: 90,
        statements: 90,
      },
    },
  },
});
