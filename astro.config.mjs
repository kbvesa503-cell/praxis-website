import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

/*
 * Публичный адрес сайта. Единственное место, где он задаётся:
 * canonical, og:url, sitemap.xml, robots.txt и JSON-LD читают его
 * через Astro.site и нигде не дублируют строку.
 *
 * Порядок разрешения:
 *   1. SITE_URL — ручное переопределение. Нужно, только если адрес
 *      отличается от production-домена проекта в Vercel.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — системная переменная Vercel:
 *      production-домен проекта, доступный в том числе в preview-сборках.
 *      Пока домена нет, это *.vercel.app; после подключения собственного
 *      домена значение меняется само, и правок в коде не требуется.
 *      Поэтому ни один адрес не зашит в репозиторий.
 *   3. localhost — для локальной разработки.
 */
const siteUrl =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:4321');

// Одностраничник остаётся статикой: страница по-прежнему собирается в HTML
// и уходит на CDN. Адаптер нужен ровно для одного маршрута — /api/lead,
// который помечен `prerender = false` и выполняется на сервере. Только там
// доступны TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID: в клиентский бандл
// они не попадают ни при какой сборке.
export default defineConfig({
  site: siteUrl,
  adapter: vercel({ webAnalytics: { enabled: true } }),
  build: { inlineStylesheets: 'always' },
  compressHTML: true,
});
