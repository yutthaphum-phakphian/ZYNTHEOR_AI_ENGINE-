// @ts-nocheck
export type CapabilityId =
  | 'KNOWLEDGE_RESEARCH'
  | 'EDUCATION'
  | 'WRITING_TRANSLATION'
  | 'GENERAL_CONVERSATION'
  | 'REASONING'
  | 'DATA_ANALYSIS'
  | 'CREATIVITY'
  | 'TECHNICAL_ASSISTANCE'
  | 'PRODUCTIVITY';

export interface CapabilityItem {
  id: CapabilityId;
  nameThai: string;
  nameEn: string;
  description: string;
  icon: string;
  examples: string[];
}

export const CAPABILITIES: CapabilityItem[] = [
  {
    id: 'KNOWLEDGE_RESEARCH',
    nameThai: 'ค้นคว้าและวิจัยความรู้',
    nameEn: 'Knowledge & Research',
    description: 'สืบค้นข้อมูลเชิงลึก สรุปเอกสาร และวิเคราะห์ข้อเท็จจริง',
    icon: '🔍',
    examples: ['สรุปแนวคิดของ Quantum Computing', 'ค้นคว้าประวัติศาสตร์คอมพิวเตอร์']
  },
  {
    id: 'EDUCATION',
    nameThai: 'การศึกษาและการเรียนรู้',
    nameEn: 'Education & Tutoring',
    description: 'อธิบายบทเรียน สอนแนวคิดยากให้เข้าใจง่าย และสร้างแบบทดสอบ',
    icon: '📚',
    examples: ['อธิบายกฎข้อที่สองของเทอร์โมไดนามิกส์', 'ช่วยสอนพื้นฐานคณิตศาสตร์แคลคูลัส']
  },
  {
    id: 'WRITING_TRANSLATION',
    nameThai: 'งานเขียนและการแปลภาษา',
    nameEn: 'Writing & Translation',
    description: 'เรียบเรียงบทความ ตรวจทานภาษา แปลไทย-อังกฤษอย่างสละสลวย',
    icon: '✍️',
    examples: ['แปลบทความวิชาการภาษาอังกฤษเป็นไทย', 'เขียนอีเมลธุรกิจแบบสุภาพ']
  },
  {
    id: 'GENERAL_CONVERSATION',
    nameThai: 'สนทนาทั่วไปและถามตอบ',
    nameEn: 'General Conversation',
    description: 'พูดคุย แลกเปลี่ยนความคิดเห็น และตอบคำถามทั่วไปอย่างเป็นธรรมชาติ',
    icon: '💬',
    examples: ['สวัสดีครับ วันนี้มีอะไรน่าสนใจบ้าง', 'แนะนำวิธีจัดตารางเวลาทำงานให้มีประสิทธิภาพ']
  },
  {
    id: 'REASONING',
    nameThai: 'การคิดเชิงเหตุผลและการตัดสินใจ',
    nameEn: 'Reasoning & Logic',
    description: 'จำแนกตรรกะ วิเคราะห์ข้อดีข้อเสีย และแก้ปัญหาเชิงโครงสร้าง',
    icon: '🧠',
    examples: ['ช่วยวิเคราะห์ trade-offs ระหว่าง Monolith และ Microservices', 'แก้โจทย์ปัญหาเชิงตรรกะ']
  },
  {
    id: 'DATA_ANALYSIS',
    nameThai: 'การวิเคราะห์ข้อมูลและตัวเลข',
    nameEn: 'Data Analysis',
    description: 'ประมวลผลข้อมูล แปลความหมายสถิติ และสรุปสาระสำคัญของชุดข้อมูล',
    icon: '📊',
    examples: ['วิเคราะห์แนวโน้มยอดขายจากข้อมูล', 'ช่วยออกแบบ Schema ฐานข้อมูล']
  },
  {
    id: 'CREATIVITY',
    nameThai: 'ความคิดสร้างสรรค์และไอเดีย',
    nameEn: 'Creativity & Brainstorming',
    description: 'ระดมความคิด แต่งเรื่องราว ออกแบบคอนเซปต์ และจินตนาการสิ่งใหม่',
    icon: '✨',
    examples: ['ช่วยคิดชื่อแบรนด์กาแฟสไตล์ธรรมชาติ', 'แต่งโครงเรื่องนิยายไซไฟ']
  },
  {
    id: 'TECHNICAL_ASSISTANCE',
    nameThai: 'ช่วยเหลือทางเทคนิคและเขียนโค้ด',
    nameEn: 'Technical & Coding',
    description: 'ช่วยเขียน ตรวจสอบ และแก้ไขปัญหาโปรแกรมมิ่ง ระบบเครือข่าย และซอฟต์แวร์',
    icon: '💻',
    examples: ['ช่วยแก้บั๊ก TypeScript ใน API', 'แนะนำแนวทางเขียน React Hook']
  },
  {
    id: 'PRODUCTIVITY',
    nameThai: 'การทำงานและเพิ่มผลผลิต',
    nameEn: 'Productivity & Planning',
    description: 'วางแผนงาน จัดการโปรเจกต์ และสร้างรายการสิ่งที่ต้องทำ',
    icon: '⚡',
    examples: ['ช่วยวางแผนขั้นตอนเปิดตัวผลิตภัณฑ์ใน 30 วัน', 'สรุปบันทึกการประชุม']
  }
];

export function classifyAutoMode(input: string): CapabilityId & { mode?: string; reason?: string } {
  const query = (input || '').toLowerCase();
  let id: CapabilityId = 'GENERAL_CONVERSATION';
  let mode = 'chat';
  let reason = 'General conversation intent';

  if (/โค้ด|code|บั๊ก|bug|typescript|javascript|react|api|เขียนโปรแกรม|function|debug/i.test(query)) {
    id = 'TECHNICAL_ASSISTANCE';
    mode = 'coding';
    reason = 'Technical coding query';
  } else if (/วิเคราะห์|เหตุผล|logic|reasoning|เปรียบเทียบ|สถาปัตยกรรม/i.test(query)) {
    id = 'REASONING';
    mode = 'reasoning';
    reason = 'Analysis and reasoning intent';
  } else if (/ค้นคว้า|วิจัย|ข้อมูลล่าสุด|อ้างอิง|research|search|grounding/i.test(query)) {
    id = 'KNOWLEDGE_RESEARCH';
    mode = 'research';
    reason = 'Research and information retrieval';
  } else if (/แก้ไขไฟล์|รันคำสั่ง|agent|ดำเนินการ|รัน/i.test(query)) {
    id = 'PRODUCTIVITY';
    mode = 'agent';
    reason = 'Automated agent task';
  } else if (/เรียน|สอน|อธิบายแนวคิด|ความหมาย|ศึกษา/i.test(query)) {
    id = 'EDUCATION';
    mode = 'chat';
    reason = 'Educational explanation';
  } else if (/เขียน|แปล|บทความ|จดหมาย|email|translate/i.test(query)) {
    id = 'WRITING_TRANSLATION';
    mode = 'chat';
    reason = 'Writing and translation';
  } else if (/ไอเดีย|สร้างสรรค์|คิดชื่อ|เรื่องราว|creative/i.test(query)) {
    id = 'CREATIVITY';
    mode = 'chat';
    reason = 'Creative ideation';
  } else if (/สถิติ|ข้อมูล|chart|วิเคราะห์ข้อมูล|dataset/i.test(query)) {
    id = 'DATA_ANALYSIS';
    mode = 'reasoning';
    reason = 'Data analysis';
  }

  const res = new String(id) as any;
  res.id = id;
  res.mode = mode;
  res.reason = reason;
  return res;
}
