import { defineConfig } from 'astro/config';

// Статическая сборка одностраничника. Никаких интеграций и рантайм-фреймворков:
// в продакшн уходит HTML, CSS и ~3 KB собственного JS.
export default defineConfig({
  site: 'https://praxis.ru',
  build: { inlineStylesheets: 'always' },
  compressHTML: true,
});
