// i18n helper for SBAL
import en from './locales/en.js';
import zhTW from './locales/zh-TW.js';

const locales = { en, 'zh-TW': zhTW };
const COOKIE_NAME = 'sbale_lang';
const COOKIE_OPTIONS = 'Max-Age=31536000; Path=/; SameSite=Lax'; // 1 year

// 從 Cookie 讀取語言
export function getLocaleFromCookie(req) {
  const cookie = req.header('Cookie') || '';
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (match && locales[match[1]]) return match[1];
  return null;
}

// 寫入語言 Cookie 到 Response
export function setLocaleCookie(resp, locale) {
  resp.headers.append('Set-Cookie', `${COOKIE_NAME}=${locale}; ${COOKIE_OPTIONS}`);
}

// 检测语言顺序: URL > Cookie > Accept-Language
export function getLocale(req) {
  // 1. URL 參數 ?lang=zh-TW
  const url = new URL(req.url);
  const langParam = url.searchParams.get('lang');
  if (langParam && locales[langParam]) return langParam;

  // 2. Cookie
  const cookieLang = getLocaleFromCookie(req);
  if (cookieLang && locales[cookieLang]) return cookieLang;

  // 3. Accept-Language header
  const acceptLang = req.header('Accept-Language') || '';
  for (const lang of acceptLang.split(',')) {
    const code = lang.split(';')[0].trim();
    if (locales[code]) return code;
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

// 创建一个绑定到特定 locale 的 t 函数（同步）
export function createT(locale) {
  return function(path, params = {}) {
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
  };
}

// 旧版 t 函数（保留兼容）
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
  return value;
}
