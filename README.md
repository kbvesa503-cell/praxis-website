# PRAXIS — лендинг

Реализация утверждённого Landing Concept на базе Brand Core v1.0.

## Стек

- **Astro 5** — статическая сборка, ноль рантайм-JS
- **TypeScript** — строгий режим
- **Нативный CSS** — токены в `src/styles/tokens.css`, scoped-стили в компонентах

## Команды

```bash
npm install
npm run dev       # локальная разработка
npm run build     # сборка в dist/
npm run preview   # просмотр собранного
npm run check     # проверка типов
```

## Структура

```
public/fonts/          woff2-сабсеты (Commissioner, Golos Text, IBM Plex Mono)
src/data/content.ts    все тексты сайта
src/styles/tokens.css  палитра, типографика, ритм, движение
src/components/brand/  знак и lockup
src/components/ui/     переиспользуемые примитивы
src/components/hero/   схема первого экрана
src/components/sections/ секции страницы
```

## Правила проекта

Палитра, шрифтовая пара и геометрия знака зафиксированы Brand Core v1.0
(«форма закрыта») и не правятся в рамках проекта. Тексты меняются только
в `src/data/content.ts` и только по согласованию.

Тексты не содержат придуманных кейсов, клиентов и показателей. Цифры
в секции «Логика экономического эффекта» — иллюстрация методики расчёта,
что прямо оговорено на странице.
