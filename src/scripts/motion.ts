/*
 * Движение страницы: проявление блоков, схема первого экрана, липкая шапка.
 * Ничего не делает, если пользователь просил уменьшить количество анимации.
 */

declare global {
  interface Window {
    __praxisMotion?: boolean;
  }
}

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Проявление блоков при попадании в область просмотра. Один раз на блок. */
function initReveal(): void {
  const blocks = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!blocks.length) return;

  if (!('IntersectionObserver' in window)) {
    blocks.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  );

  blocks.forEach((el) => io.observe(el));
}

/**
 * Схема первого экрана. Проигрывается один раз, когда видна на 40 %.
 * Начальное состояние ставится классом hd--anim прямо перед запуском,
 * поэтому без скрипта схема просто отрисована целиком.
 */
function initHeroDiagram(): void {
  const svg = document.querySelector<SVGSVGElement>('.hd');
  if (!svg) return;

  const play = () => {
    svg.classList.add('hd--anim');
    // Форсируем пересчёт стилей, чтобы переход стартовал с начального состояния.
    void svg.getBoundingClientRect();
    svg.classList.add('is-playing');
  };

  if (!('IntersectionObserver' in window)) {
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.disconnect();
        play();
      }
    },
    { threshold: 0.4 },
  );

  io.observe(svg);
}

/**
 * Шапка уезжает при прокрутке вперёд и возвращается при движении вверх.
 * Порог не даёт ей дёргаться от мелких движений.
 */
function initStickyHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  const THRESHOLD = 6;
  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const delta = y - lastY;

    if (Math.abs(delta) < THRESHOLD) return;

    // Пока шапка стоит на своём месте в потоке, прятать нечего.
    const past = y > header.offsetHeight * 2;
    header.classList.toggle('is-hidden', delta > 0 && past);
    lastY = y;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
}

if (!REDUCED) {
  window.__praxisMotion = true;
  initReveal();
  initHeroDiagram();
}

// Липкая шапка — навигация, а не декор: работает независимо от настроек анимации.
initStickyHeader();

export {};
