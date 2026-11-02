export type Provider = 'openai' | 'anthropic' | 'gemini' | 'zyntheor';

export class ProviderCompatibilityValidator {
  validate(provider: Provider, json: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof json === 'string') {
      try {
        json = JSON.parse(json);
      } catch {
        errors.push('Invalid JSON payload string');
        return { valid: false, errors };
      }
    }

    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      errors.push('JSON payload must be an object');
      return { valid: false, errors };
    }

    if (provider === 'openai') {
      if (!json.model || typeof json.model !== 'string') errors.push('OpenAI requires string field "model"');
      if (!json.messages && !json.prompt) errors.push('OpenAI requires "messages" or "prompt"');
      if (json.messages && !Array.isArray(json.messages)) errors.push('OpenAI "messages" must be an array');
      if (json.messages && Array.isArray(json.messages)) {
        for (const msg of json.messages) {
          if (!msg.role || !msg.content) errors.push('OpenAI message objects must have "role" and "content"');
        }
      }
    }

    if (provider === 'anthropic') {
      if (!json.model || typeof json.model !== 'string') errors.push('Anthropic requires string field "model"');
      if (!json.messages || !Array.isArray(json.messages)) errors.push('Anthropic requires array field "messages"');
    }

    if (provider === 'gemini') {
      if (!json.contents && !json.prompt && !json.systemInstruction) {
        errors.push('Gemini requires "contents", "systemInstruction", or "prompt"');
      }
    }

    if (provider === 'zyntheor') {
      if (!json.prompt && !json.systemPrompt) errors.push('Zyntheor requires "prompt" or "systemPrompt"');
    }

    return { valid: errors.length === 0, errors };
  }
}
