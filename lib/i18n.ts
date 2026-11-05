// @ts-nocheck
export const SUPPORTED_LANGUAGES = ['th', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const translations: Record<SupportedLanguage, Record<string, string>> = {
  th: {
    'common.new_chat': 'แชทใหม่',
    'common.search': 'ค้นหา',
    'page.settings.title': 'การตั้งค่า',
    'page.prompt_forge.title': 'Prompt Forge',
    'forge.field.target_language': 'ภาษาเป้าหมาย',
    'planner.title': 'ผู้วางแผนงาน',
    'settings.section.language': 'ภาษา',
    'forge.count.templates': 'แม่แบบทั้งหมด {count} รายการ',
    'projects.progress': 'ความคืบหน้า: {percent}%',
    'debugging.title': 'การวินิจฉัยและแก้ปัญหาอัจฉริยะ',
    'debugging.run': 'เริ่มการวินิจฉัย',
    'debugging.status': 'สถานะการตรวจสอบ',
  },
  en: {
    'common.new_chat': 'New Chat',
    'common.search': 'Search',
    'page.settings.title': 'Settings',
    'page.prompt_forge.title': 'Prompt Forge',
    'forge.field.target_language': 'Target Language',
    'planner.title': 'Task Planner',
    'settings.section.language': 'Language',
    'forge.count.templates': '{count} Domain Templates',
    'projects.progress': 'Progress: {percent}%',
    'debugging.title': 'Intelligent Debugging',
    'debugging.run': 'Run Diagnostics',
    'debugging.status': 'Audit Status',
  },
};

export function translate(lang: string, key: string): string {
  const selectedLang = lang === 'th' ? 'th' : 'en';
  return translations[selectedLang]?.[key] || key;
}

export function getTranslationKey(
  lang: string,
  key: string,
  params: Record<string, any> = {}
): string {
  let template = translate(lang, key);
  for (const [placeholder, value] of Object.entries(params)) {
    template = template.replaceAll(`{${placeholder}}`, String(value));
  }
  return template;
}

export function useTranslation() {
  const lang: SupportedLanguage = 'th';
  const t = (key: string, params?: Record<string, any>) => {
    if (params) {
      return getTranslationKey(lang, key, params);
    }
    return translate(lang, key);
  };
  return {
    t,
    lang,
    language: lang,
    setLanguage: () => {},
  };
}
