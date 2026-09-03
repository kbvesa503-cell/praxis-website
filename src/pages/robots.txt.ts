/*
 * robots.txt. Собирается, а не лежит в public/, потому что адрес карты
 * сайта зависит от домена — а домен задаётся один раз в astro.config.mjs.
 *
 * Файл статический: prerender по умолчанию, на сервер ничего не уходит.
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap.xml', site).href;

  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    /* Маршрут приёма заявок индексировать нечего: он отвечает только
       на POST и не содержит контента. */
    'Disallow: /api/',
    '',
    `Sitemap: ${sitemap}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
