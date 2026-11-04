/**
 * ZYNTHEOR Localization & Translation Engine (i18n)
 * Buffalo Edition 0.9.0
 *
 * Centralized translation resources and useTranslation hook
 * supporting Thai ('th') and English ('en') with fallback and interpolation.
 * Default language: Thai (th-TH)
 */

import { useState, useEffect, useCallback } from 'react';

export type SupportedLanguage = 'th' | 'en';
export const SUPPORTED_LANGUAGES = ['th', 'en'] as const;

export const LANGUAGE_STORAGE_KEY = 'zyntheor.language.v1';
export const SETTINGS_STORAGE_KEY = 'zyntheor.settings';
export const LANGUAGE_CHANGE_EVENT = 'zyntheor:language-change';

export interface TranslationDictionary {
  [key: string]: string;
}

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  th: {
    // Brand & Workspace
    'app.title': 'ZYNTHEOR AI ENGINE',
    'app.subtitle': 'พื้นที่ทำงานปัญญาประดิษฐ์วิศวกรรมแบบประมวลผลในเครื่อง',
    'app.edition': 'รุ่น บัฟฟาโล่ 0.9.0',
    'brand.edition': 'Buffalo 0.9.0',
    'brand.sub': 'ระบบปัญญาประดิษฐ์สำหรับนักพัฒนา',

    // Navigation groups
    'nav.workspace': 'พื้นที่ทำงาน',
    'nav.intelligence': 'ระบบอัจฉริยะ',
    'nav.operations': 'การปฏิบัติการ',
    'nav.trust_safety': 'ความเชื่อมั่นและความปลอดภัย',
    'nav.system': 'ระบบ',

    // Navigation items
    'nav.chat': 'พื้นที่คิดและพัฒนา AI',
    'nav.ai_workspace': 'พื้นที่คิดและพัฒนา AI',
    'nav.projects': 'โครงการ',
    'nav.plans': 'แผนงาน',
    'nav.files': 'ไฟล์และโครงสร้างโค้ด',
    'nav.memory_center': 'ศูนย์ความจำ (Memory)',
    'nav.repo_intelligence': 'วิเคราะห์โครงสร้างโปรเจกต์',
    'nav.repository_intelligence': 'วิเคราะห์โครงสร้างโปรเจกต์',
    'nav.agent_command_center': 'ศูนย์บัญชาการ Agent',
    'nav.intelligent_debugging': 'แก้ไขบั๊กอัจฉริยะ',
    'nav.prompt_forge': 'เครื่องมือสร้างพรอมป์ต์',
    'nav.models': 'ศูนย์ควบคุมโมเดล AI',
    'nav.core_model_studio': 'ศูนย์ควบคุมโมเดล AI',
    'nav.evaluation_lab': 'ห้องทดสอบ AI (Eval Lab)',
    'nav.ci/cd': 'CI/CD และไปป์ไลน์',
    'nav.cicd': 'CI/CD และไปป์ไลน์',
    'nav.ci_cd': 'CI/CD และไปป์ไลน์',
    'nav.ci/cd_&_pipelines': 'CI/CD และไปป์ไลน์',
    'nav.audit_ledger': 'บัญชีบันทึกการตรวจสอบ',
    'nav.diagnostics': 'การวินิจฉัยระบบ',
    'nav.team': 'ทีมและสิทธิ์การเข้าถึง',
    'nav.team_&_access': 'ทีมและสิทธิ์การเข้าถึง',
    'nav.billing': 'การเรียกเก็บเงินและแพ็กเกจ',
    'nav.billing_&_plans': 'การเรียกเก็บเงินและแพ็กเกจ',
    'nav.settings': 'ตั้งค่าระบบ',

    // Page Copy
    'page.chat.eyebrow': 'ระบบอัจฉริยะ ZYNTHEOR',
    'page.chat.title': 'พื้นที่คิดและพัฒนาซอฟต์แวร์',
    'page.chat.subtitle': 'ถาม สร้าง แก้บั๊ก และวิเคราะห์ระบบ — พร้อมแสดงสถานะการทำงานจริง',

    'page.projects.eyebrow': 'พื้นที่ทำงาน / โครงการ',
    'page.projects.title': 'พัฒนาในบริบทของโครงการ',
    'page.projects.subtitle': 'จัดการซอร์สโค้ด แนวคิด และโครงสร้างงานในพื้นที่เฉพาะ',

    'page.plans.eyebrow': 'พื้นที่ทำงาน / แผนงาน',
    'page.plans.title': 'วางแผนก่อนลงมือทำ',
    'page.plans.subtitle': 'แปลงเป้าหมายเป็นขั้นตอนชัดเจน พร้อมแยกข้อมูลที่ยืนยันแล้วออกจากสมมติฐาน',

    'page.files.eyebrow': 'พื้นที่ทำงาน / ไฟล์',
    'page.files.title': 'ไฟล์และโครงสร้างโค้ด',
    'page.files.subtitle': 'ตรวจสอบไฟล์ในระบบเพื่อทำความเข้าใจและเตรียมการแก้ไขอย่างปลอดภัย',

    'page.repo_intelligence.eyebrow': 'ระบบอัจฉริยะ / วิเคราะห์โครงสร้างโปรเจกต์',
    'page.repo_intelligence.title': 'ความเข้าใจโครงสร้างโค้ดเชิงลึก (Repository Intelligence)',
    'page.repo_intelligence.subtitle': 'ถอดรหัสโครงสร้างโปรเจกต์ Symbol Table และ Dependency Graph เป็น JSON Hierarchy',

    'page.intelligent_debugging.eyebrow': 'ระบบอัจฉริยะ / แก้ไขบั๊กอัจฉริยะ',
    'page.intelligent_debugging.title': 'กระบวนการวิเคราะห์และแก้บั๊ก (Intelligent Debugging Workflow)',
    'page.intelligent_debugging.subtitle': 'ดักจับ Stack Trace, ดึงโค้ดจาก Workspace และจัดลำดับ Root Cause',

    'page.prompt_forge.eyebrow': 'ระบบอัจฉริยะ / เครื่องมือสร้างพรอมป์',
    'page.prompt_forge.title': 'สร้าง ปรับแต่ง และทดสอบพรอมป์ต์ 0.2',
    'page.prompt_forge.subtitle': 'สร้างพรอมป์ต์ระดับมืออาชีพ ตรวจสอบตามเกณฑ์คุณภาพ และจำลองการทดสอบจริง',

    'page.models.eyebrow': 'ระบบอัจฉริยะ / โมเดล AI',
    'page.models.title': 'ศูนย์ควบคุมโมเดล AI',
    'page.models.subtitle': 'ตรวจสอบสถานะของ endpoint จริง การลงทะเบียนโมเดลไม่ใช่ข้อพิสูจน์ของการทำงานจริง',

    'page.audit_ledger.eyebrow': 'ความเชื่อมั่นและความปลอดภัย / บัญชีบันทึกการตรวจสอบ',
    'page.audit_ledger.title': 'หลักฐานสำคัญกว่าสมมติฐาน',
    'page.audit_ledger.subtitle': 'ตรวจสอบประวัติกิจกรรมและลายเซ็นดิจิทัล (Integrity Hash)',

    'page.diagnostics.eyebrow': 'ความเชื่อมั่นและความปลอดภัย / การวินิจฉัยระบบ',
    'page.diagnostics.title': 'การวินิจฉัยและตรวจเช็กระบบ',
    'page.diagnostics.subtitle': 'ทดสอบเซิร์ฟเวอร์และการประมวลผลของโมเดลอย่างอิสระ',

    'page.settings.eyebrow': 'ระบบ / ตั้งค่า',
    'page.settings.title': 'กำหนดขอบเขตและความปลอดภัย',
    'page.settings.subtitle': 'ตั้งค่าโหมดใช้งานภายในเครื่อง เลือกภาษา และควบคุมการเข้าถึงบริการภายนอก',

    // Topbar & Common Controls
    'common.search': 'ค้นหาในระบบ...',
    'common.search_shortcut': '⌘K',
    'common.new_chat': 'แชตใหม่',
    'common.language': 'ภาษา (Language)',
    'common.lang_th': 'ไทย (TH)',
    'common.lang_en': 'English (EN)',
    'common.status_local': 'โหมดใช้งานภายในเครื่อง',
    'common.status_remote': 'โหมดเชื่อมต่อออนไลน์',
    'common.server_ready': 'เซิร์ฟเวอร์พร้อมใช้งาน',
    'common.loading': 'กำลังโหลด…',
    'common.save': 'บันทึก',
    'common.cancel': 'ยกเลิก',
    'common.delete': 'ลบ',
    'common.confirm': 'ยืนยัน',
    'common.close': 'ปิด',
    'common.copy': 'คัดลอก',
    'common.copied': 'คัดลอกแล้ว',
    'common.verified': 'ตรวจสอบแล้ว (VERIFIED)',
    'common.assumption': 'สมมติฐาน (ASSUMPTION)',
    'common.proposed': 'ข้อเสนอ (PROPOSED)',
    'common.unverified': 'ยังไม่ยืนยัน (UNVERIFIED)',
    'common.all': 'ทั้งหมด',
    'common.refresh': 'รีเฟรช',

    // Intelligence Observability
    'obs.title': 'สถานะการทำงานของ AI', 'obs.subtitle': 'ข้อมูลจากการเรียกใช้งานจริง ไม่ส่ง Health Probe เพิ่ม', 'obs.refresh': 'รีเฟรช', 'obs.provider': 'ผู้ให้บริการ', 'obs.status': 'สถานะ', 'obs.latency': 'เวลาตอบสนองล่าสุด', 'obs.failures': 'จำนวนครั้งที่ล้มเหลวต่อเนื่อง', 'obs.last_success': 'สำเร็จล่าสุด', 'obs.last_error': 'ข้อผิดพลาดล่าสุด', 'obs.updated': 'อัปเดต', 'obs.timeline': 'ประวัติคำขอ', 'obs.stored': 'คำขอที่บันทึก', 'obs.succeeded': 'สำเร็จ', 'obs.failed': 'ล้มเหลว', 'obs.tokens_known': 'โทเคนที่ทราบ', 'obs.time': 'เวลา', 'obs.provider_model': 'ผู้ให้บริการ / โมเดล', 'obs.mode': 'โหมด', 'obs.result': 'ผลลัพธ์', 'obs.tokens': 'โทเคน', 'obs.unavailable': 'ไม่มีข้อมูล', 'obs.empty': 'ยังไม่มีประวัติคำขอ', 'obs.retention': 'ประวัติจัดเก็บในเซิร์ฟเวอร์และแยกตามผู้ใช้กับ Workspace',

    // System Health & Checks
    'diag.system_health': 'สุขภาพระบบและการตรวจสอบ',
    'diag.server_status': 'สถานะเซิร์ฟเวอร์',
    'diag.model_status': 'สถานะโมเดล AI',
    'diag.test_button': 'ทดสอบการส่งคำขอไปยังโมเดล (Run Inference Test)',
    'diag.testing': 'กำลังทดสอบ…',

    // Files
    'files.selected': 'ไฟล์ที่เลือก',
    'files.modal_title': 'ดูตัวอย่างไฟล์ (Read-Only Preview)',
    'files.modal_readonly_badge': 'โหมดอ่านอย่างเดียว (Read-Only)',
    'files.modal_size': 'ขนาด: {size}',
    'files.modal_type': 'ประเภท: {type}',
    'files.modal_modified': 'แก้ไขล่าสุด: {date}',
    'files.view_snippet': 'ดูเนื้อหา (Snippet)',
    'files.empty_snippet': 'ไม่สามารถแสดงตัวอย่างไฟล์นี้ได้ หรือไฟล์ไม่มีข้อความ',
    'files.binary_note': 'ไฟล์ไบนารี/รูปภาพ — แสดงเฉพาะข้อมูลเมตา',

    // Shortcuts
    'shortcuts.modal_title': 'แป้นพิมพ์ลัด (Keyboard Shortcuts)',
    'shortcuts.search': 'ค้นหาในระบบ / ไปยังหน้างาน',
    'shortcuts.search_key': '⌘ K / Ctrl+K',
    'shortcuts.clear': 'ล้างการค้นหา / ปิดหน้าต่าง',
    'shortcuts.clear_key': 'Esc',
    'shortcuts.send': 'ส่งข้อความในแชต',
    'shortcuts.send_key': 'Enter',
    'shortcuts.newline': 'ขึ้นบรรทัดใหม่ในแชต',
    'shortcuts.newline_key': 'Shift + Enter',
    'shortcuts.help': 'เปิดดูแป้นพิมพ์ลัด',
    'shortcuts.help_key': '?',

    // Projects Timeline & Progress
    'projects.start_date': 'วันเริ่มต้น',
    'projects.end_date': 'วันสิ้นสุด',
    'projects.timeline': 'เส้นเวลา: {start} → {end}',
    'projects.progress': 'ความคืบหน้า: {percent}%',
    'projects.status_on_track': 'ตามกำหนดการ (On Track)',
    'projects.status_completed': 'เสร็จสมบูรณ์ (Completed)',
    'projects.status_upcoming': 'ยังไม่เริ่ม (Upcoming)',
    'projects.status_overdue': 'เกินกำหนด (Overdue)',

    // Chat Modes
    'chat.mode.auto': 'อัตโนมัติ (Auto)',
    'chat.mode.auto_hint': 'AI เลือกแนวทางตอบตามคำขอ',
    'chat.mode.plan': 'วางแผน (Plan)',
    'chat.mode.plan_hint': 'วิเคราะห์ปัญหาและทำแผนก่อนลงมือ',
    'chat.mode.code': 'เขียนโค้ด (Code)',
    'chat.mode.code_hint': 'เน้นเขียน อธิบาย และแก้โค้ด',
    'chat.mode.analysis_badge': 'โหมดวิเคราะห์โค้ด (เชิงลึก)',
    'chat.composer.placeholder': 'ถาม ปรึกษา ให้วางแผน หรือวางโค้ดที่ต้องการวิเคราะห์...',
    'chat.composer.disclaimer': 'ข้อความทั้งหมดถูกประมวลผลภายใต้นโยบายความปลอดภัยของระบบ',
    'chat.composer.token_local': 'โหมดปลอดภัยภายในเครื่อง',
    'chat.composer.token_remote': 'ผู้ให้บริการออนไลน์',
    'chat.send': 'ส่ง',
    'chat.stop': 'หยุด',
    'chat.welcome.eyebrow': 'ZYNTHEOR AI ENGINE 0.9.0',
    'chat.welcome.title': 'ผู้ช่วยพัฒนาซอฟต์แวร์ระดับมืออาชีพ',
    'chat.welcome.desc': 'สร้างพรอมป์ต์ วางแผนงาน วิเคราะห์บั๊ก ตรวจสอบความปลอดภัย และเขียนโค้ด',
    'chat.suggest.plan_title': 'วางแผนสถาปัตยกรรมซอฟต์แวร์',
    'chat.suggest.plan_desc': 'สร้างแผนสถาปัตยกรรม บันทึกสมมติฐาน และกำหนดขั้นตอน',
    'chat.suggest.debug_title': 'วิเคราะห์สาเหตุของปัญหาและข้อผิดพลาด',
    'chat.suggest.debug_desc': 'แยกข้อเท็จจริงออกจากสมมติฐานและเสนอ patch ที่เล็กที่สุด',
    'chat.suggest.forge_title': 'สร้าง Production Prompt',
    'chat.suggest.forge_desc': 'สร้างพรอมป์ต์สำหรับ AI Agent, Web, หรือ System Instructions',
    'chat.error.model_unavailable': 'ยังไม่ได้รับคำตอบจากโมเดลจริง\n\nสาเหตุ: {reason}\n\nเปิด การวินิจฉัยระบบ เพื่อตรวจสอบ endpoint และตรวจว่า Ollama หรือบริการโมเดลกำลังทำงานอยู่',

    // Prompt Forge
    'forge.tab.forge': 'สร้างและปรับแต่ง (Forge & Optimize)',
    'forge.tab.analyze': 'วิเคราะห์พรอมป์ต์ (Analyzer)',
    'forge.tab.templates': 'แม่แบบรายหมวด (Templates)',
    'forge.tab.testbench': 'สนามทดสอบ (Test Bench)',
    'forge.card.title': 'สร้างและปรับปรุงพรอมป์ต์ (Prompt Generator & Optimizer)',
    'forge.field.intent': '1. เป้าหมายหรือคำอธิบายสิ่งที่ต้องการ (User Intent)',
    'forge.field.intent_ph': 'เช่น ออกแบบ AI Agent สำหรับตรวจสอบ Pull Request และ lint โค้ด...',
    'forge.field.category': '2. หมวดหมู่งาน (Task Category)',
    'forge.field.output_format': '3. รูปแบบผลลัพธ์ (Output Format)',
    'forge.field.target_language': '4. ภาษาของพรอมป์ต์ผลลัพธ์ (Target Output Language)',
    'forge.lang.auto': 'ตามภาษาที่ป้อน (Follow Input)',
    'forge.lang.th': 'ภาษาไทย (Thai)',
    'forge.lang.en': 'English',
    'forge.lang.custom': 'ภาษาอื่นๆ (Custom Language)',
    'forge.field.custom_language_ph': 'ระบุภาษา เช่น Japanese, Chinese, German...',
    'forge.field.constraints': '5. ข้อกำหนดหรือข้อห้ามเพิ่มเติม (Optional Constraints)',
    'forge.field.constraints_ph': 'เช่น ห้ามใช้ไลบรารีภายนอก, ปฏิบัติตาม OWASP Top 10...',
    'forge.button.generate': 'สร้างพรอมป์ต์ (Generate Prompt)',
    'forge.button.optimizing': 'กำลังปรับปรุง…',
    'forge.button.optimize': 'ปรับปรุงพรอมป์ต์เดิม (Optimize)',
    'forge.button.clear': 'ล้างข้อมูล',
    'forge.paste_label': 'หรือวางพรอมป์ต์เดิมเพื่อ Optimize โดยตรง:',
    'forge.output.title': 'พรอมป์ต์ฉบับสมบูรณ์ (Production-Ready Prompt)',
    'forge.output.purpose': 'วัตถุประสงค์ของพรอมป์ต์ (Prompt Purpose):',
    'forge.output.empty': 'ยังไม่มีพรอมป์ต์ที่สร้าง กรอกคำอธิบายทางซ้ายแล้วกด "สร้างพรอมป์ต์"',
    'forge.output.design_choices': 'เหตุผลการออกแบบ (Design Choices & Findings):',
    'forge.output.variables': 'ตัวแปรที่ต้องใส่ค่า (Slots to Fill):',

    // Prompt Forge Categories & Formats
    'forge.cat.web_mobile': 'พัฒนาเว็บไซต์และแอปมือถือ (Website & Mobile App Dev)',
    'forge.cat.code_inspection': 'เขียนและตรวจสอบโค้ด (Code Writing & Inspection)',
    'forge.cat.bug_analysis': 'วิเคราะห์และแก้ไขบั๊ก (Bug Analysis & Debugging)',
    'forge.cat.agent_design': 'ออกแบบ AI Agent (AI Agent Design)',
    'forge.cat.media_generation': 'สร้างภาพและสื่อ (Image & Media Generation)',
    'forge.cat.data_research': 'วิเคราะห์ข้อมูลและทำวิจัย (Data Analysis & Research)',
    'forge.cat.system_instructions': 'สร้าง System Instructions',
    'forge.cat.software_planning': 'วางแผนโครงการซอฟต์แวร์ (Software Project Planning)',
    'forge.cat.software_eng': 'วิศวกรรมซอฟต์แวร์ (General Software Engineering)',
    'forge.cat.education': 'การศึกษาและการเรียนรู้ (Education & Tutoring)',
    'forge.cat.business': 'วางแผนธุรกิจ (Business Planning)',

    'forge.fmt.markdown': 'Structured Markdown',
    'forge.fmt.code_only': 'Code-Only (Minimal Comments)',
    'forge.fmt.step_plan': 'Step-by-Step Plan',
    'forge.fmt.json': 'Strict JSON Schema',
    'forge.fmt.table': 'Comparative Table',

    // Prompt Forge Toasts & Errors
    'forge.toast.copied': 'คัดลอกพรอมป์ต์ไปยังคลิปบอร์ดแล้ว',
    'forge.toast.empty_intent': 'กรุณาระบุเป้าหมายหรือคำอธิบายสิ่งที่ต้องการสร้าง',
    'forge.toast.empty_optimize': 'กรุณากรอกพรอมป์ต์เดิมที่ต้องการปรับปรุง',
    'forge.toast.empty_analyze': 'กรุณากรอกพรอมป์ต์ที่ต้องการวิเคราะห์',
    'forge.toast.empty_test': 'กรุณากรอกพรอมป์ต์ที่ต้องการทดสอบ',
    'forge.toast.gen_success_model': 'สร้างพรอมป์ต์ด้วยโมเดลสำเร็จ',
    'forge.toast.gen_success_template': 'สร้างพรอมป์ต์ด้วย Template Engine สำเร็จ',
    'forge.toast.opt_success': 'ปรับปรุงพรอมป์ต์สำเร็จ',
    'forge.toast.analyze_success': 'วิเคราะห์เสร็จสิ้น: คะแนน {score}/100 (เกรด {grade})',
    'forge.toast.test_success': 'รัน Test Bench สำเร็จ',
    'forge.toast.test_offline': 'ทดสอบโครงสร้างแบบ Offline (Local-only mode)',
    'forge.toast.load_template': 'โหลดแม่แบบ: {title}',
    'forge.error.generate_failed': 'สร้างพรอมป์ต์ไม่สำเร็จ: {reason}',
    'forge.error.optimize_failed': 'ปรับปรุงพรอมป์ต์ไม่สำเร็จ: {reason}',
    'forge.error.analyze_failed': 'วิเคราะห์พรอมป์ต์ไม่สำเร็จ: {reason}',
    'forge.error.test_failed': 'รัน Test Bench ไม่สำเร็จ: {reason}',

    'forge.count.templates': 'แม่แบบทั้งหมด {count} รายการ',
    'forge.count.variables': 'ตรวจพบ {count} ตัวแปร',
    'forge.count.test_cases': '{count} กรณีทดสอบ',

    // Planner
    'planner.title': 'ระบบวางแผนการพัฒนาซอฟต์แวร์ (Development Planner)',
    'planner.desc': 'แปลงโจทย์เป็นแผนงานสถาปัตยกรรม ความต้องการ และขั้นตอนพัฒนาที่ชัดเจน',
    'planner.new_plan': 'สร้างแผนใหม่',
    'planner.goal_label': 'เป้าหมายของโครงการ (Project Goal)',
    'planner.goal_placeholder': 'เช่น สร้างระบบจัดการงานที่มีระบบเข้าสู่ระบบและฐานข้อมูล...',
    'planner.generate_button': 'สร้างแผนงานพัฒนา (Generate Plan)',
    'planner.progress_title': 'ความคืบหน้าของแผนงาน',
    'planner.tag_verified': 'ตรวจสอบแล้ว (VERIFIED)',
    'planner.tag_assumption': 'สมมติฐาน (ASSUMPTION)',
    'planner.tag_proposed': 'ข้อเสนอ (PROPOSED)',
    'planner.tag_unverified': 'ยังไม่ยืนยัน (UNVERIFIED)',

    // Settings
    'settings.section.language': 'การตั้งค่าภาษา (Language Settings)',
    'settings.section.language_desc': 'เลือกภาษาสำหรับหน้าจอ เมนู และการสื่อสารในระบบ (สลับเปลี่ยนภาษาไทย / ภาษาอังกฤษ)',
    'settings.language_label': 'ภาษา UI ที่แสดงผล (UI Language)',
    'settings.language_hint': 'เปลี่ยนภาษา UI ทันทีและจดจำค่าภาษาไว้หลัง Refresh และ Restart',
    'settings.section.security': 'นโยบายความปลอดภัยและขอบเขตเครือข่าย',
    'settings.section.security_desc': 'ควบคุมการส่งข้อมูลไปยังผู้ให้บริการภายนอกและการจำกัดสิทธิ์',
    'settings.local_only_label': 'โหมดใช้งานภายในเครื่อง (Local Mode)',
    'settings.local_only_desc': 'บล็อกการส่งข้อมูลไปยังเซิร์ฟเวอร์ภายนอกทั้งหมด อนุญาตเฉพาะเครื่องในเครือข่ายท้องถิ่น (Local Ollama)',
    'settings.online_consent_label': 'การยินยอมใช้บริการออนไลน์ (Online Service Consent)',
    'settings.online_consent_desc': 'การยินยอมส่งคำขอไปยังโมเดลภายนอก (Google Gemini API) เมื่อ Local Mode ปิดอยู่',
    'settings.runtime_info': 'ข้อมูลสภาพแวดล้อมระบบ (Runtime Status)',
    'settings.access_token_label': 'Access Token (ถ้ามีการเปิดใช้)',
    'settings.access_token_hint': 'ใส่โทเค็นเพื่อยืนยันสิทธิ์ในการเรียกใช้งาน API ของโมเดล',

    // Diagnostics & Errors
    'error.local_only_blocked': 'คำขอถูกบล็อกโดยนโยบาย Local Mode: ไม่อนุญาตให้ส่งข้อมูลออกภายนอก',
    'error.consent_required': 'ต้องยินยอมการใช้งานบริการภายนอกก่อนดำเนินการ',
    'error.rate_limited': 'ส่งคำขอถี่เกินไป โปรดลองอีกครั้งภายหลัง',
  },
  en: {
    // Brand & Workspace
    'app.title': 'ZYNTHEOR AI ENGINE',
    'app.subtitle': 'Local-first engineering intelligence workspace',
    'app.edition': 'Buffalo Edition 0.9.0',
    'brand.edition': 'Buffalo 0.9.0',
    'brand.sub': 'AI DEV INTELLIGENCE',

    // Navigation groups
    'nav.workspace': 'WORKSPACE',
    'nav.intelligence': 'INTELLIGENCE',
    'nav.operations': 'OPERATIONS',
    'nav.trust_safety': 'TRUST & SAFETY',
    'nav.system': 'SYSTEM',

    // Navigation items
    'nav.chat': 'AI Workspace',
    'nav.ai_workspace': 'AI Workspace',
    'nav.projects': 'Projects',
    'nav.plans': 'Plans',
    'nav.files': 'Files',
    'nav.memory_center': 'Memory Center',
    'nav.repo_intelligence': 'Repo Intelligence',
    'nav.repository_intelligence': 'Repo Intelligence',
    'nav.agent_command_center': 'Agent Command Center',
    'nav.intelligent_debugging': 'Intelligent Debugging',
    'nav.prompt_forge': 'Prompt Forge',
    'nav.models': 'CORE Model Studio',
    'nav.core_model_studio': 'CORE Model Studio',
    'nav.evaluation_lab': 'Evaluation Lab',
    'nav.ci/cd': 'CI/CD & Pipelines',
    'nav.cicd': 'CI/CD & Pipelines',
    'nav.ci_cd': 'CI/CD & Pipelines',
    'nav.ci/cd_&_pipelines': 'CI/CD & Pipelines',
    'nav.audit_ledger': 'Audit Ledger',
    'nav.diagnostics': 'Diagnostics',
    'nav.team': 'Team & Access',
    'nav.team_&_access': 'Team & Access',
    'nav.billing': 'Billing & Plans',
    'nav.billing_&_plans': 'Billing & Plans',
    'nav.settings': 'Settings',

    // Page Copy
    'page.chat.eyebrow': 'ZYNTHEOR INTELLIGENCE',
    'page.chat.title': 'Your thinking workspace',
    'page.chat.subtitle': 'Ask, build, debug and reason — with visible system status.',

    'page.projects.eyebrow': 'WORKSPACE / PROJECTS',
    'page.projects.title': 'Build in context.',
    'page.projects.subtitle': 'Organize codebases and ideas into dedicated workspaces.',

    'page.plans.eyebrow': 'WORKSPACE / PLANS',
    'page.plans.title': 'Plan before action.',
    'page.plans.subtitle': 'Turn a goal into clear steps, separating verified facts from assumptions.',

    'page.files.eyebrow': 'WORKSPACE / FILES',
    'page.files.title': 'Your project files.',
    'page.files.subtitle': 'Review files in the system to understand architecture and plan safe changes.',

    'page.repo_intelligence.eyebrow': 'INTELLIGENCE / REPO INTELLIGENCE',
    'page.repo_intelligence.title': 'Repository Intelligence Engine',
    'page.repo_intelligence.subtitle': 'Map project structure, resolve symbols and exports into JSON context hierarchy.',

    'page.intelligent_debugging.eyebrow': 'INTELLIGENCE / INTELLIGENT DEBUGGING',
    'page.intelligent_debugging.title': 'Intelligent Debugging Workflow',
    'page.intelligent_debugging.subtitle': 'Capture stack traces, fetch workspace code, and rank root cause hypotheses.',

    'page.prompt_forge.eyebrow': 'INTELLIGENCE / PROMPT FORGE',
    'page.prompt_forge.title': 'Forge, optimize & benchmark prompts 0.2',
    'page.prompt_forge.subtitle': 'Generate production-ready prompts, audit against rubrics, and run test benches.',

    'page.models.eyebrow': 'INTELLIGENCE / MODELS',
    'page.models.title': 'Model control center.',
    'page.models.subtitle': 'See actual endpoint status. A registered model is not proof of execution readiness.',

    'page.audit_ledger.eyebrow': 'TRUST & SAFETY / AUDIT',
    'page.audit_ledger.title': 'Evidence over assumptions.',
    'page.audit_ledger.subtitle': 'Inspect recorded events and their cryptographic integrity fingerprints.',

    'page.diagnostics.eyebrow': 'TRUST & SAFETY / DIAGNOSTICS',
    'page.diagnostics.title': 'Know what is working.',
    'page.diagnostics.subtitle': 'Check the server and configured model independently.',

    'page.settings.eyebrow': 'SYSTEM / SETTINGS',
    'page.settings.title': 'Control the boundaries.',
    'page.settings.subtitle': 'Set local-first behavior, choose language, and manage runtime permissions.',

    // Topbar & Common Controls
    'common.search': 'Search...',
    'common.search_shortcut': '⌘K',
    'common.new_chat': 'New Chat',
    'common.language': 'Language',
    'common.lang_th': 'ไทย (TH)',
    'common.lang_en': 'English (EN)',
    'common.status_local': 'Local Mode',
    'common.status_remote': 'Online Mode',
    'common.server_ready': 'Server Ready',
    'common.loading': 'Loading…',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
    'common.copy': 'Copy',
    'common.copied': 'Copied',
    'common.verified': 'VERIFIED',
    'common.assumption': 'ASSUMPTION',
    'common.proposed': 'PROPOSED',
    'common.unverified': 'UNVERIFIED',
    'common.all': 'All',
    'common.refresh': 'Refresh',

    // Intelligence Observability
    'obs.title': 'AI Runtime Status', 'obs.subtitle': 'Live request telemetry; no additional health probes are sent', 'obs.refresh': 'Refresh', 'obs.provider': 'Provider', 'obs.status': 'Status', 'obs.latency': 'Latest latency', 'obs.failures': 'Consecutive failures', 'obs.last_success': 'Last success', 'obs.last_error': 'Last error', 'obs.updated': 'Updated', 'obs.timeline': 'Request timeline', 'obs.stored': 'Stored requests', 'obs.succeeded': 'Succeeded', 'obs.failed': 'Failed', 'obs.tokens_known': 'Known tokens', 'obs.time': 'Time', 'obs.provider_model': 'Provider / Model', 'obs.mode': 'Mode', 'obs.result': 'Result', 'obs.tokens': 'Tokens', 'obs.unavailable': 'Unavailable', 'obs.empty': 'No request history yet', 'obs.retention': 'History is stored on the server and scoped by user and workspace',

    // System Health & Checks
    'diag.system_health': 'System Health & Checks',
    'diag.server_status': 'Server Status',
    'diag.model_status': 'Model Status',
    'diag.test_button': 'Run Inference Diagnostic Test',
    'diag.testing': 'Testing…',

    // Files
    'files.selected': 'Selected files',
    'files.modal_title': 'File Preview (Read-Only)',
    'files.modal_readonly_badge': 'Read-Only Mode',
    'files.modal_size': 'Size: {size}',
    'files.modal_type': 'Type: {type}',
    'files.modal_modified': 'Last modified: {date}',
    'files.view_snippet': 'View snippet',
    'files.empty_snippet': 'Preview unavailable or file is empty.',
    'files.binary_note': 'Binary or media file — metadata only.',

    // Shortcuts
    'shortcuts.modal_title': 'Keyboard Shortcuts',
    'shortcuts.search': 'Global Search / Workspace',
    'shortcuts.search_key': '⌘ K / Ctrl+K',
    'shortcuts.clear': 'Clear search / Dismiss modal',
    'shortcuts.clear_key': 'Esc',
    'shortcuts.send': 'Send chat message',
    'shortcuts.send_key': 'Enter',
    'shortcuts.newline': 'New line in composer',
    'shortcuts.newline_key': 'Shift + Enter',
    'shortcuts.help': 'Toggle Shortcuts Help',
    'shortcuts.help_key': '?',

    // Projects Timeline & Progress
    'projects.start_date': 'Start Date',
    'projects.end_date': 'End Date',
    'projects.timeline': 'Timeline: {start} → {end}',
    'projects.progress': 'Progress: {percent}%',
    'projects.status_on_track': 'On Track',
    'projects.status_completed': 'Completed',
    'projects.status_upcoming': 'Upcoming',
    'projects.status_overdue': 'Overdue',

    // Chat Modes
    'chat.mode.auto': 'Auto',
    'chat.mode.auto_hint': 'AI selects best reasoning approach',
    'chat.mode.plan': 'Plan',
    'chat.mode.plan_hint': 'Analyze problem and plan before action',
    'chat.mode.code': 'Code',
    'chat.mode.code_hint': 'Focus on writing, explaining, and patching code',
    'chat.mode.analysis_badge': 'Deep Code Analysis Mode',
    'chat.composer.placeholder': 'Ask, plan, reason, or paste code to analyze...',
    'chat.composer.disclaimer': 'All messages are processed under strict system security boundaries.',
    'chat.composer.token_local': 'Local Safe',
    'chat.composer.token_remote': 'Online Provider',
    'chat.send': 'Send',
    'chat.stop': 'Stop',
    'chat.welcome.eyebrow': 'ZYNTHEOR AI ENGINE 0.9.0',
    'chat.welcome.title': 'Your engineering intelligence assistant',
    'chat.welcome.desc': 'Forge prompts, plan architecture, diagnose bugs, and write verified code.',
    'chat.suggest.plan_title': 'Plan Software Architecture',
    'chat.suggest.plan_desc': 'Break goals into functional requirements, tech stack, and risk matrices.',
    'chat.suggest.debug_title': 'Root Cause & Bug Diagnostics',
    'chat.suggest.debug_desc': 'Separate verified facts from hypotheses and craft minimal patches.',
    'chat.suggest.forge_title': 'Craft Production Prompt',
    'chat.suggest.forge_desc': 'Build authoritative prompts for AI Agents, Web Dev, or System Instructions.',
    'chat.error.model_unavailable': 'No response received from the model.\n\nReason: {reason}\n\nCheck Diagnostics to inspect endpoint reachability.',

    // Prompt Forge
    'forge.tab.forge': 'Forge & Optimize',
    'forge.tab.analyze': 'Prompt Analyzer',
    'forge.tab.templates': 'Domain Templates',
    'forge.tab.testbench': 'Test Bench',
    'forge.card.title': 'Prompt Generator & Optimizer 0.2',
    'forge.field.intent': '1. User Objective & Intent',
    'forge.field.intent_ph': 'e.g. Design an autonomous AI agent to inspect GitHub PRs and run security linters...',
    'forge.field.category': '2. Task Category',
    'forge.field.output_format': '3. Desired Output Format',
    'forge.field.target_language': '4. Target Output Language',
    'forge.lang.auto': 'Follow Input Language',
    'forge.lang.th': 'Thai (ภาษาไทย)',
    'forge.lang.en': 'English',
    'forge.lang.custom': 'Custom Language',
    'forge.field.custom_language_ph': 'Specify language e.g. Japanese, Chinese, German...',
    'forge.field.constraints': '5. Additional Constraints or Negative Directives',
    'forge.field.constraints_ph': 'e.g. No external dependencies, follow OWASP Top 10...',
    'forge.button.generate': 'Generate Prompt',
    'forge.button.optimizing': 'Optimizing…',
    'forge.button.optimize': 'Optimize Existing',
    'forge.button.clear': 'Clear',
    'forge.paste_label': 'Or paste an existing prompt to optimize directly:',
    'forge.output.title': 'Production-Ready Prompt',
    'forge.output.purpose': 'Prompt Purpose & Target Objective:',
    'forge.output.empty': 'No prompt generated yet. Fill the inputs on the left and click "Generate Prompt"',
    'forge.output.design_choices': 'Design Choices & Rubric Alignment:',
    'forge.output.variables': 'Variables to Fill (Placeholders):',

    // Prompt Forge Categories & Formats
    'forge.cat.web_mobile': 'Website and Mobile App Development',
    'forge.cat.code_inspection': 'Code Writing and Inspection',
    'forge.cat.bug_analysis': 'Bug Analysis and Debugging',
    'forge.cat.agent_design': 'AI Agent Design',
    'forge.cat.media_generation': 'Image and Media Generation',
    'forge.cat.data_research': 'Data Analysis and Research',
    'forge.cat.system_instructions': 'System Instructions',
    'forge.cat.software_planning': 'Software Project Planning',
    'forge.cat.software_eng': 'Software Engineering',
    'forge.cat.education': 'Education and Tutoring',
    'forge.cat.business': 'Business Planning',

    'forge.fmt.markdown': 'Structured Markdown',
    'forge.fmt.code_only': 'Code-Only (Minimal Comments)',
    'forge.fmt.step_plan': 'Step-by-Step Plan',
    'forge.fmt.json': 'Strict JSON Schema',
    'forge.fmt.table': 'Comparative Table',

    // Prompt Forge Toasts & Errors
    'forge.toast.copied': 'Prompt copied to clipboard',
    'forge.toast.empty_intent': 'Please specify the goal or intent for the prompt',
    'forge.toast.empty_optimize': 'Please enter the prompt to optimize',
    'forge.toast.empty_analyze': 'Please enter the prompt to analyze',
    'forge.toast.empty_test': 'Please enter the prompt to test',
    'forge.toast.gen_success_model': 'Prompt generated with model successfully',
    'forge.toast.gen_success_template': 'Prompt generated with Template Engine successfully',
    'forge.toast.opt_success': 'Prompt optimized successfully',
    'forge.toast.analyze_success': 'Analysis completed: score {score}/100 (grade {grade})',
    'forge.toast.test_success': 'Test Bench executed successfully with model',
    'forge.toast.test_offline': 'Structural test performed offline (Local-only mode)',
    'forge.toast.load_template': 'Loaded template: {title}',
    'forge.error.generate_failed': 'Failed to generate prompt: {reason}',
    'forge.error.optimize_failed': 'Failed to optimize prompt: {reason}',
    'forge.error.analyze_failed': 'Failed to analyze prompt: {reason}',
    'forge.error.test_failed': 'Test Bench failed: {reason}',

    'forge.count.templates': '{count} Domain Templates',
    'forge.count.variables': '{count} variable(s) detected',
    'forge.count.test_cases': '{count} test case(s)',

    // Planner
    'planner.title': 'Development Planner',
    'planner.desc': 'Transform natural language goals into structured architecture, requirements, and execution phases.',
    'planner.new_plan': 'Create Plan',
    'planner.goal_label': 'Project Goal or Feature Request',
    'planner.goal_placeholder': 'e.g. Build a task management app with authentication and SQLite database...',
    'planner.generate_button': 'Generate Architecture Plan',
    'planner.progress_title': 'Plan Execution Progress',
    'planner.tag_verified': 'VERIFIED',
    'planner.tag_assumption': 'ASSUMPTION',
    'planner.tag_proposed': 'PROPOSED',
    'planner.tag_unverified': 'UNVERIFIED',

    // Settings
    'settings.section.language': 'Language Settings',
    'settings.section.language_desc': 'Select UI and system language preference.',
    'settings.language_label': 'Interface Language',
    'settings.language_hint': 'Immediately changes the application language and persists across sessions.',
    'settings.section.security': 'Security & Network Boundaries',
    'settings.section.security_desc': 'Control outbound traffic, local-only defaults, and external provider access.',
    'settings.local_only_label': 'Local Mode',
    'settings.local_only_desc': 'Blocks all outbound requests to external non-local endpoints, allowing only local Ollama traffic.',
    'settings.online_consent_label': 'Online Service Consent',
    'settings.online_consent_desc': 'Explicit consent to reach external model providers (e.g. Google Gemini API).',
    'settings.runtime_info': 'Runtime & Provider Status',
    'settings.access_token_label': 'Access Token (Optional)',
    'settings.access_token_hint': 'Enter access token to authenticate model requests if configured on server.',

    // Diagnostics & Errors
    'error.local_only_blocked': 'Request blocked by Local Mode policy: external provider access is restricted.',
    'error.consent_required': 'Explicit online consent required to use external provider.',
    'error.rate_limited': 'Rate limit exceeded. Please wait before retrying.',
  },
};

/**
 * Resolves current language preference:
 * Default is Thai ('th').
 */
export function getInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'th';
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage | null;
    if (saved && (saved === 'th' || saved === 'en')) {
      return saved;
    }
    const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (rawSettings) {
      try {
        const parsed = JSON.parse(rawSettings);
        if (parsed.defaultLanguage === 'th' || parsed.defaultLanguage === 'en') {
          return parsed.defaultLanguage;
        }
        if (parsed.language === 'th' || parsed.language === 'en') {
          return parsed.language;
        }
      } catch {
        /* invalid json */
      }
    }
  } catch {
    /* localStorage disabled or restricted */
  }
  return 'th';
}

/**
 * Save language preference and notify all components.
 */
export function persistLanguage(lang: SupportedLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    try {
      const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const parsed = rawSettings ? JSON.parse(rawSettings) : {};
      parsed.defaultLanguage = lang;
      parsed.language = lang;
      parsed.updatedAt = new Date().toISOString();
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      /* ignore storage serialization errors */
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { lang } }));
      document.documentElement.lang = lang === 'th' ? 'th-TH' : 'en-US';
    }
  } catch {
    /* localStorage disabled or restricted */
  }
}

/**
 * Helper that supports dynamic interpolation for common UI strings.
 */
export function translate(
  lang: SupportedLanguage,
  key: string,
  params?: Record<string, string | number | boolean | Date>
): string {
  const dict = translations[lang] || translations.th;
  let text = dict[key];

  // Fallback to Thai, then to English
  if (typeof text !== 'string') {
    text = translations.th[key] ?? translations.en[key];
  }

  if (typeof text !== 'string') {
    return key;
  }

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      let formattedVal: string;
      if (v instanceof Date) {
        formattedVal = v.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'medium' });
      } else if (typeof v === 'number') {
        formattedVal = v.toLocaleString(lang === 'th' ? 'th-TH' : 'en-US');
      } else {
        formattedVal = String(v ?? '');
      }
      text = text.replaceAll(`{${k}}`, formattedVal);
    }
  }

  return text;
}

export const getTranslationKey = translate;

/**
 * React hook for components to retrieve localized text and change language.
 */
export function useTranslation() {
  const [lang, setLangState] = useState<SupportedLanguage>(() => getInitialLanguage());

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ lang: SupportedLanguage }>;
      const nextLang = customEvent.detail?.lang;
      if (nextLang && (nextLang === 'th' || nextLang === 'en')) {
        setLangState(nextLang);
      }
    };

    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    window.addEventListener('storage', (e) => {
      if (e.key === LANGUAGE_STORAGE_KEY && (e.newValue === 'th' || e.newValue === 'en')) {
        setLangState(e.newValue as SupportedLanguage);
      }
    });

    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    };
  }, []);

  const changeLanguage = useCallback((newLang: SupportedLanguage) => {
    setLangState(newLang);
    persistLanguage(newLang);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number | boolean>): string => {
      return translate(lang, key, params);
    },
    [lang]
  );

  return {
    lang,
    setLanguage: changeLanguage,
    t,
  };
}
