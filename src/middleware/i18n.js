// i18n middleware for Hono
import { getLocale, setLocaleCookie, createT } from '../i18n.js';

export function i18nMiddleware(app) {
  app.use('*', async (c, next) => {
    const locale = getLocale(c.req);
    c.set('locale', locale);
    c.set('t', createT(locale)); // synchronous translation function

    // If URL has ?lang=..., set cookie for persistence
    const url = new URL(c.req.url);
    const langParam = url.searchParams.get('lang');
    if (langParam && ['en', 'zh-TW'].includes(langParam)) {
      setLocaleCookie(c.res, langParam);
    }

    await next();
  });
}
