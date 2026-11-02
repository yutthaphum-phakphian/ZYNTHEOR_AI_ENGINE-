import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site under /zyntheor-ai/; local dev and normal builds stay at '/'.
const base = process.env.GITHUB_PAGES === 'true' ? '/zyntheor-ai-fixed/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    include: ['lib/**/*.test.ts', 'src/**/*.test.ts', 'tests/**/*.test.mts'],
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
