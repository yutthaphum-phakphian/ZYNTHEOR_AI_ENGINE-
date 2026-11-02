import { AgentOrchestrator } from '../src/server/AgentOrchestrator.ts';

async function runHealthCheck() {
  console.log('🩺 Running ZYNTHEOR Health Check...');
  const agent = new AgentOrchestrator(process.env.GEMINI_API_KEY || '');
  const result = await agent.runTask("Say 'OK' if you are alive.");
  if (!result.includes('OK')) {
    throw new Error('Agent failed health check!');
  }
  console.log('✅ Agent is healthy! Response:', result);
}

runHealthCheck().catch((e) => {
  console.error(e);
  process.exit(1);
});
