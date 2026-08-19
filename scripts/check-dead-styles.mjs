/*
 * Astro не пробрасывает scoped-класс внутрь компонента: конструкция вида
 *   <SectionHeading class="foo" />  +  .foo { ... } в <style> того же файла
 * молча не применяется — стиль просто не работает, ошибки нигде нет.
 * Проверка ловит такие случаи до того, как они попадут в вёрстку.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const files = globSync('src/**/*.astro');
const usage = /<([A-Z]\w*)[^>]*?\bclass="([^"]+)"/gs;
let failed = 0;

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const styleAt = source.indexOf('<style>');
  if (styleAt === -1) continue;

  const markup = source.slice(0, styleAt);
  const styles = source.slice(styleAt);

  for (const [, tag, classList] of markup.matchAll(usage)) {
    for (const name of classList.split(/\s+/)) {
      if (new RegExp(`\\.${name}\\b`).test(styles)) {
        console.error(
          `${file}: правило .${name} задано для <${tag}>, но scoped-класс туда не долетает`,
        );
        failed++;
      }
    }
  }
}

if (failed) {
  console.error(`\nНайдено мёртвых правил: ${failed}. Задайте стиль пропсом компонента.`);
  process.exit(1);
}

console.log('Мёртвых scoped-правил не найдено.');
