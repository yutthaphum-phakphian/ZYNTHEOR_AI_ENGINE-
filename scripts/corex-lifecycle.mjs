import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectLifecycle, registerCandidate } from '../lib/model-lifecycle.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const command=process.argv[2]||'verify';
try {
  const result=command==='verify'?inspectLifecycle(root):command==='register'?registerCandidate(root):null;
  if(!result) throw new Error('COMMAND_NOT_SUPPORTED');
  console.log(JSON.stringify(result,null,2));
} catch(error) { console.error(JSON.stringify({phase:'P18',status:'ERROR',reason:error.message},null,2)); process.exitCode=2; }
