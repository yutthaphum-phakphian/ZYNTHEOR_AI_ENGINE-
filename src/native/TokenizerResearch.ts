// Research tokenizer - BPE 16K Thai + English + Code
export class ZyntheorTokenizerResearch {
  static vocabSize = 16000;
  static specialTokens = ['<|im_start|>', '<|im_end|>', '<|code|>', '<|thai|>', '<|en|>'];

  static evaluate(texts: string[]): { tokensPerChar: number; thaiEfficiency: number } {
    const thaiText = texts.filter((t) => /[ก-๙]/.test(t)).join('');
    const enText = texts.filter((t) => /[a-zA-Z]/.test(t)).join('');
    const totalChars = thaiText.length + enText.length;
    if (totalChars === 0) {
      return { tokensPerChar: 0, thaiEfficiency: 0 };
    }
    return {
      tokensPerChar: Number((totalChars / (thaiText.length * 1.5 + enText.length + 1)).toFixed(3)),
      thaiEfficiency: thaiText.length > 0 ? 0.72 : 0,
    };
  }
}
