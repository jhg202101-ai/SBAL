// i18n helper for SBAL
import en from './locales/en.js';
import zhTW from './locales/zh-TW.js';

const locales = { en, 'zh-TW': zhTW };

// 根據 URL 參數、localStorage 或 Accept-Language header 判斷語言
export function getLocale(req) {
  // 1. URL 參數 ?lang=zh-TW
  const url = new URL(req.url);
  const langParam = url.searchParams.get('lang');
  if (langParam && locales[langParam]) return langParam;

  // 2. localStorage (frontend only) - handled in client code
  // 3. Accept-Language header
  const acceptLang = req.header('Accept-Language') || '';
  for (const lang of acceptLang.split(',')) {
    const code = lang.split(';')[0].trim();
    if (locales[code]) return code;
    // 模糊匹配：zh-TW, zh-CN, zh
    if (code.startsWith('zh')) return 'zh-TW';
  }

  return 'en'; // default
}

// 深度替换模板變量 {{var}} 為實際值
export function interpolate(template, params) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
}

// 取得翻譯字串並可選參數插值
export function t(locale, path, params = {}) {
  const keys = path.split('.');
  let value = locales[locale];
  for (const k of keys) {
    if (!value) return path; // fallback to path
    value = value[k];
  }
  if (typeof value === 'string') {
    return interpolate(value, params);
  }
  return value; // could be an object
}
