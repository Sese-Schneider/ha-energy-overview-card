import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
export default defineConfig(({ mode }) => ({
  test: {
    include: ['test/**/*.test.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      commands: {
        async setReducedMotion({ page }, preference: 'reduce' | 'no-preference' | null) {
          await page.emulateMedia({ reducedMotion: preference });
        },
      },
      // V8 coverage stays on Chromium; the webkit mode runs separately.
      instances: [{ browser: mode === 'webkit' ? 'webkit' : 'chromium' }],
      headless: true,
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'lcov', 'html'],
      thresholds: { statements: 80, branches: 75, functions: 80, lines: 85 },
    },
  },
}));
