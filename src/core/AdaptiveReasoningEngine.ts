export interface ReasoningBudget {
  maxTokens: number;        // จำกัดจำนวน Token ที่จะใช้คิด
  maxSteps: number;         // จำนวนรอบสูงสุดในการวางแผน (Planning Depth)
  verificationLevel: 'NONE' | 'BASIC' | 'STRICT'; // ระดับการตรวจสอบผลลัพธ์
}

export class AdaptiveReasoningEngine {
  /**
   * คำนวณ Budget ตามความซับซ้อนของงาน (Zero-Mock: ไม่ใช่การเดา แต่ประเมินจาก Task)
   */
  static allocateBudget(taskComplexityScore: number): ReasoningBudget {
    if (taskComplexityScore > 80) {
      // งานซับซ้อนมาก (เช่น เขียน Architecture, แก้บั๊กยากๆ)
      return { maxTokens: 4096, maxSteps: 5, verificationLevel: 'STRICT' };
    } else if (taskComplexityScore > 40) {
      // งานปานกลาง (เช่น เขียนฟังก์ชัน, ค้นหาเว็บ)
      return { maxTokens: 2048, maxSteps: 3, verificationLevel: 'BASIC' };
    } else {
      // งานง่าย (เช่น ตอบคำถามสั้นๆ)
      return { maxTokens: 512, maxSteps: 1, verificationLevel: 'NONE' };
    }
  }
}
