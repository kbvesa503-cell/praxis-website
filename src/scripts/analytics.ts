/*
 * Коммерческие события для Vercel Web Analytics.
 *
 * Скрипт аналитики подключает сам адаптер (`webAnalytics.enabled`
 * в astro.config.mjs): он объявляет очередь `window.va` в <head> и грузит
 * /_vercel/insights/script.js. Поэтому отдельной зависимости здесь нет —
 * события кладутся в ту же очередь, и до загрузки скрипта они не теряются.
 *
 * Если аналитика недоступна (локальная сборка, блокировщик, выключенная
 * в проекте Web Analytics), вызов молча ничего не делает: страница
 * от этого не зависит.
 *
 * ВАЖНО. В события не попадает ничего из того, что ввёл человек:
 * ни имя, ни компания, ни телефон, ни телеграм, ни описание процесса.
 * Разрешены только значения из фиксированных списков ниже.
 */

declare global {
  interface Window {
    va?: (event: 'event', payload: { name: string; data?: EventData }) => void;
  }
}

/** Имена событий. Другие имена не отправляются. */
export type EventName =
  | 'cta_click'
  | 'form_open'
  | 'lead_submit_success'
  | 'lead_submit_error';

/**
 * Свойства события. Оба поля — значения из закрытых списков,
 * а не пользовательский ввод.
 *
 * place  — какая кнопка на странице (header, hero, first_step, final_cta);
 * reason — код отказа сервера (delivery, server, rate_limited, …).
 */
export interface EventData {
  place?: string;
  reason?: string;
}

export function track(name: EventName, data?: EventData): void {
  try {
    window.va?.('event', data ? { name, data } : { name });
  } catch {
    // Аналитика никогда не должна ломать страницу.
  }
}
