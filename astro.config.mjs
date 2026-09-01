import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Одностраничник остаётся статикой: страница по-прежнему собирается в HTML
// и уходит на CDN. Адаптер нужен ровно для одного маршрута — /api/lead,
// который помечен `prerender = false` и выполняется на сервере. Только там
// доступны TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID: в клиентский бандл
// они не попадают ни при какой сборке.
export default defineConfig({
  site: 'https://praxis.ru',
  adapter: vercel(),
  build: { inlineStylesheets: 'always' },
  compressHTML: true,
});
