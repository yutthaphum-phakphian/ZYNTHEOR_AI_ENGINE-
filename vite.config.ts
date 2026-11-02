import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site under repository subpath; local dev and normal builds stay at '/'.
const base = process.env.GITHUB_PAGES === 'true' ? '/ZYNTHEOR_AI_ENGINE-/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    include: ['lib/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.mts', 'tests/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/buffalo-0.17-*.test.ts',
      'tests/patch-security-regression.test.ts',
      'tests/system-diagnostics.test.ts',
      'tests/truth-enforcement-boundary.test.ts',
      'tests/truth-kernel.test.ts'
    ]
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
          if (id.includes('TrainingMonitor') || id.includes('HardwareReadiness')) return 'training';
          if (id.includes('buffaloSovereign') || id.includes('codeGraph') || id.includes('patchApplier')) return 'buffalo';
        }
      }
    }
  }
});
