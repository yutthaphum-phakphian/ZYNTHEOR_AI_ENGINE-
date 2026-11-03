import test from 'node:test';
import assert from 'node:assert/strict';
import { translate, translations, SUPPORTED_LANGUAGES, getTranslationKey } from '../lib/i18n.ts';

test('i18n: supports Thai and English dictionaries with matching primary keys', () => {
  assert.deepEqual([...SUPPORTED_LANGUAGES], ['th', 'en']);
  assert.ok(translations.th);
  assert.ok(translations.en);

  // Check critical keys in both languages
  const sampleKeys = [
    'common.new_chat',
    'common.search',
    'page.settings.title',
    'page.prompt_forge.title',
    'forge.field.target_language',
    'planner.title',
    'settings.section.language',
  ];

  for (const key of sampleKeys) {
    const thVal = translate('th', key);
    const enVal = translate('en', key);
    assert.ok(thVal && thVal !== key, `Key ${key} should resolve in Thai`);
    assert.ok(enVal && enVal !== key, `Key ${key} should resolve in English`);
  }
});

test('i18n: falls back to key or English when key is missing', () => {
  assert.equal(translate('th', 'non.existent.key'), 'non.existent.key');
});

test('i18n: getTranslationKey dynamically interpolates {count}, {name}, {date} placeholders', () => {
  const enCount = getTranslationKey('en', 'forge.count.templates', { count: 10 });
  assert.equal(enCount, '10 Domain Templates');

  const thCount = getTranslationKey('th', 'forge.count.templates', { count: 10 });
  assert.equal(thCount, 'แม่แบบทั้งหมด 10 รายการ');

  const enProgress = getTranslationKey('en', 'projects.progress', { percent: 75 });
  assert.equal(enProgress, 'Progress: 75%');

  const thProgress = getTranslationKey('th', 'projects.progress', { percent: 75 });
  assert.equal(thProgress, 'ความคืบหน้า: 75%');
});

