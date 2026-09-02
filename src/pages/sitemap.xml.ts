/*
 * Карта сайта. На одностраничнике это ровно один адрес, поэтому
 * интеграция @astrojs/sitemap с её sitemap-index не нужна: она добавила бы
 * зависимость и два файла вместо одного.
 *
 * Адрес берётся из Astro.site — того же единственного источника,
 * что canonical и og:url.
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const home = new URL('/', site).href;

  /* Дата последней сборки: для одной статической страницы это
     честнее, чем выдуманная фиксированная дата. */
  const lastmod = new Date().toISOString().slice(0, 10);

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${home}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
