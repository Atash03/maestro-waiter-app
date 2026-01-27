import type { SupportedLanguage } from '../../utils/translations';
import en from './en.json';
import ru from './ru.json';
import tm from './tm.json';

type NestedRecord = { [key: string]: string | NestedRecord };

const locales: Record<SupportedLanguage, NestedRecord> = { en, ru, tm };

function resolve(obj: NestedRecord, path: string): string | undefined {
  const parts = path.split('.');
  let current: NestedRecord | string = obj;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

export function getUIString(key: string, language: SupportedLanguage): string {
  return resolve(locales[language], key) ?? resolve(locales.en, key) ?? key;
}
