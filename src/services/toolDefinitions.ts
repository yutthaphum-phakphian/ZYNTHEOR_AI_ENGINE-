import { z } from 'zod';
export const toolDefinitions = [
  {
    name: 'write_file',
    description: 'Write file to workspace',
    parameters: z.object({ filepath: z.string(), content: z.string() }),
    schema: { type: 'object', properties: { filepath: { type: 'string' }, content: { type: 'string' } }, required: ['filepath','content'] }
  },
  {
    name: 'read_file',
    description: 'Read file from workspace',
    parameters: z.object({ filepath: z.string() }),
    schema: { type: 'object', properties: { filepath: { type: 'string' } }, required: ['filepath'] }
  },
  {
    name: 'execute_command',
    description: 'Execute shell command in sandbox',
    parameters: z.object({ command: z.string() }),
    schema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] }
  },
  {
    name: 'search_codebase',
    description: 'Search repository codebase semantically using vector embeddings (Gemini)',
    parameters: z.object({ query: z.string(), limit: z.number().optional() }),
    schema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] }
  }
];
