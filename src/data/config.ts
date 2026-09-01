/*
 * Настройки, которые зависят от инфраструктуры, а не от дизайна.
 */

export const contact = {
  /**
   * Серверный маршрут приёма заявок. Отправляет заявку в Telegram,
   * читая TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID из окружения сервера.
   * В клиентский код не попадает ничего, кроме этого пути.
   *
   * Реализация — src/pages/api/lead.ts.
   */
  endpoint: '/api/lead',
} as const;

export const isContactEnabled = contact.endpoint.length > 0;
