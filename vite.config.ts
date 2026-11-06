import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves the site under /zyntheor-ai/; local dev and normal builds stay at '/'.
const base = process.env.GITHUB_PAGES === 'true' ? '/zyntheor-ai-fixed/' : '/';

export default defineConfig({
  base,
  plugins: [tailwindcss(), react()],
  test: {
    include: [
      'src/**/*.test.ts',
      'lib/**/*.test.ts',
      'tests/memoryPersistence.test.ts',
      'tests/knowledgeIntelligence.test.ts',
      'tests/phase3Reasoning.test.ts',
      'tests/phase4AgentOrchestration.test.ts',
      'tests/phase5NativeModel.test.ts',
      'tests/phase6Multimodal.test.ts',
      'tests/outputPipelineAndSearchGating.test.ts',
      'tests/step4RuntimeVerification.test.ts'
    ],
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
