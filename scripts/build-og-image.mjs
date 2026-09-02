/*
 * Сборка OG-картинки 1200×630 и apple-touch-icon 180×180.
 *
 * Картинка собирается из той же системы, что и сайт: те же пять цветов
 * Brand Core, тот же знак, та же шрифтовая пара. Никакой отдельной
 * «рекламной» вёрстки — типографика, волосяные линии и одна песочная
 * полоса по нижнему краю, как полоса «после» на первом экране.
 *
 * Шрифты вшиваются в HTML как data-URI: страница рендерится из строки,
 * и подтягивать woff2 по file:// браузеру нельзя.
 *
 * Запуск: node scripts/build-og-image.mjs
 * Результат: public/og-image.png, public/apple-touch-icon.png
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');

const font = (file) =>
  `url(data:font/woff2;base64,${readFileSync(join(root, 'public/fonts', file)).toString('base64')}) format('woff2')`;

/* Знак PRAXIS — та же геометрия, что в src/components/brand/Logo.astro. */
const mark = (height, square, glyph) => {
  const width = Math.round((height * 114) / 149);
  return `<svg width="${width}" height="${height}" viewBox="-14 0 114 149" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="-14" y="0" width="38" height="38" fill="${square}"/>
    <path d="M 0,67 L 24,43 L 100,43 L 100,149 L 72,149 L 72,71 L 34,71 L 28,77 L 28,149 L 0,149 Z" fill="${glyph}"/>
  </svg>`;
};

const FONTS = `
  @font-face { font-family: 'Commissioner'; font-weight: 500; font-style: normal; font-display: block;
    src: ${font('commissioner-500-cyrillic.woff2')}; }
  @font-face { font-family: 'Commissioner'; font-weight: 500; font-style: normal; font-display: block;
    src: ${font('commissioner-500-latin.woff2')}; unicode-range: U+0000-00FF; }
  @font-face { font-family: 'Golos Text'; font-weight: 400; font-style: normal; font-display: block;
    src: ${font('golos-400-cyrillic.woff2')}; }
  @font-face { font-family: 'Golos Text'; font-weight: 400; font-style: normal; font-display: block;
    src: ${font('golos-400-latin.woff2')}; unicode-range: U+0000-00FF; }
  @font-face { font-family: 'IBM Plex Mono'; font-weight: 400; font-style: normal; font-display: block;
    src: ${font('plexmono-400-cyrillic.woff2')}; }
  @font-face { font-family: 'IBM Plex Mono'; font-weight: 400; font-style: normal; font-display: block;
    src: ${font('plexmono-400-latin.woff2')}; unicode-range: U+0000-00FF; }
`;

const og = `<!doctype html><html><head><meta charset="utf-8"><style>
  ${FONTS}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    display: flex; flex-direction: column;
    background: #FFFFFF; color: #000000;
    padding: 72px 80px 0;
    -webkit-font-smoothing: antialiased;
  }
  .lockup { display: flex; align-items: flex-end; gap: 14px; }
  .word {
    font-family: 'Commissioner'; font-weight: 500; font-size: 40px;
    letter-spacing: 0.06em; line-height: 0.85; color: #000000;
  }
  .rule { height: 1px; background: #B5B5B5; }
  .rule--ink { background: #000000; }
  .body { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 30px; }
  .display {
    font-family: 'Commissioner'; font-weight: 500; font-size: 76px;
    letter-spacing: -0.02em; line-height: 1.08; color: #000000;
  }
  .lead {
    font-family: 'Golos Text'; font-weight: 400; font-size: 28px;
    line-height: 1.45; color: #52513C;
  }
  .foot { display: flex; align-items: center; justify-content: space-between; padding: 26px 0 30px; }
  .label {
    font-family: 'IBM Plex Mono'; font-weight: 400; font-size: 15px;
    letter-spacing: 0.18em; text-transform: uppercase; color: #6B6B6B;
  }
  /* Песочная полоса по нижнему краю — та же, что под перестроенным
     процессом на первом экране. Единственный декоративный элемент. */
  .band { position: fixed; left: 0; right: 0; bottom: 0; height: 12px; background: #D8C4A3; }
</style></head><body>
  <div class="lockup">${mark(46, '#52513C', '#000000')}<span class="word">PRAXIS</span></div>

  <div class="body">
    <div class="rule rule--ink"></div>
    <h1 class="display">Технологии в действии</h1>
    <!-- Перенос задан вручную по первой строке заголовка на сайте:
         автоматический рвал строку после союза. -->
    <p class="lead">Делаем процессы бизнеса<br>быстрее и дешевле с помощью AI</p>
  </div>

  <div class="rule"></div>
  <div class="foot"><span class="label">AI · автоматизация процессов</span></div>
  <div class="band"></div>
</body></html>`;

const icon = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; }
  html, body { width: 180px; height: 180px; }
  body { background: #000000; display: flex; align-items: center; justify-content: center; }
</style></head><body>${mark(104, '#52513C', '#FFFFFF')}</body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'praxis-og-'));
const pages = [
  { html: og, width: 1200, height: 630, out: 'public/og-image.png', name: 'og.html' },
  { html: icon, width: 180, height: 180, out: 'public/apple-touch-icon.png', name: 'icon.html' },
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});

for (const page of pages) {
  const file = join(dir, page.name);
  writeFileSync(file, page.html);

  const ctx = await browser.newContext({
    viewport: { width: page.width, height: page.height },
    deviceScaleFactor: 1,
  });
  const tab = await ctx.newPage();
  await tab.goto(`file://${file}`);
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: join(root, page.out) });
  await ctx.close();

  console.log(`${page.out} — ${page.width}×${page.height}`);
}

await browser.close();
