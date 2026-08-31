/*
 * Приём заявки с сайта и отправка её в Telegram.
 *
 * Маршрут выполняется на сервере (`prerender = false`) — это единственное
 * место, где существуют TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID. Секреты
 * читаются только из process.env: в отличие от import.meta.env, эти
 * обращения не подставляются значениями на этапе сборки, поэтому токен
 * физически не может оказаться в клиентском бандле или в HTML.
 *
 * Клиенту не возвращается ничего, кроме кода ошибки из фиксированного
 * списка. Ни токен, ни ответ Telegram наружу не уходят.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

/* ---- Ограничения полей ------------------------------------------------- */
/* Совпадают с ограничениями на клиенте, но клиенту не доверяем:
   проверка здесь — единственная, которая что-то значит. */
const LIMITS = {
  name: { min: 2, max: 80, required: true },
  company: { min: 0, max: 120, required: false },
  contact: { min: 3, max: 120, required: true },
  process: { min: 0, max: 2000, required: false },
} as const;

type Field = keyof typeof LIMITS;

/** Тело запроса целиком: защита от гигантского JSON до его разбора. */
const MAX_BODY_BYTES = 16 * 1024;

/** Адрес страницы, с которой пришла заявка. Обрезаем, а не отвергаем. */
const MAX_PAGE_CHARS = 300;

/* ---- Ограничение частоты ----------------------------------------------- */
/*
 * Счётчик живёт в памяти инстанса. На serverless это осознанный компромисс:
 * инстансов несколько и они умирают, поэтому лимит останавливает поток
 * с одного адреса, но не является строгой гарантией. Внешнего хранилища
 * ради этого не заводим — для формы заявок цена не оправдана.
 */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_HITS = 5;
const RATE_MAX_KEYS = 5_000;

const hits = new Map<string, number[]>();

function rateLimited(key: string, now: number): boolean {
  const fresh = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);

  if (fresh.length >= RATE_MAX_HITS) {
    hits.set(key, fresh);
    return true;
  }

  fresh.push(now);
  hits.set(key, fresh);

  // Карта не должна расти бесконечно, если инстанс живёт долго.
  if (hits.size > RATE_MAX_KEYS) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }

  return false;
}

/* ---- Вспомогательное ---------------------------------------------------- */

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/** Управляющие символы и лишние пробелы убираем: в Telegram уходит текст. */
function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    // Управляющие символы вырезаем, перевод строки оставляем.
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

/**
 * Первый адрес из X-Forwarded-For. clientAddress на Vercel уже учитывает
 * заголовок, но в dev его нет — тогда ключ общий, и это нормально.
 */
function clientKey(request: Request, fallback: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || fallback || 'unknown';
}

/** Заявка в том виде, в каком её читает человек в Telegram. */
function buildMessage(
  values: Record<Field, string>,
  page: string,
  now: Date,
): string {
  const dash = (s: string) => (s.length > 0 ? s : '—');

  const time = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Moscow',
  }).format(now);

  return [
    'Новая заявка — PRAXIS',
    '',
    `Имя: ${dash(values.name)}`,
    `Компания: ${dash(values.company)}`,
    `Контакт: ${dash(values.contact)}`,
    `Процесс: ${dash(values.process)}`,
    '',
    `Страница: ${dash(page)}`,
    `Время: ${time} МСК`,
  ].join('\n');
}

/* ---- Маршрут ------------------------------------------------------------ */

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const now = Date.now();

  if (rateLimited(clientKey(request, clientAddress), now)) {
    return json(429, { ok: false, error: 'rate_limited' });
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return json(415, { ok: false, error: 'bad_request' });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: 'too_large' });
  }

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return json(400, { ok: false, error: 'bad_request' });
  }

  /* Ловушка для ботов. Отвечаем как при успехе и ничего не отправляем:
     заполнивший её не должен понять, что заявка не ушла. */
  if (clean(payload.company_website, 200).length > 0) {
    return json(200, { ok: true });
  }

  const values = {} as Record<Field, string>;
  const invalid: Field[] = [];

  for (const field of Object.keys(LIMITS) as Field[]) {
    const rule = LIMITS[field];
    const value = clean(payload[field], rule.max);

    if (rule.required && value.length < rule.min) invalid.push(field);
    values[field] = value;
  }

  if (invalid.length > 0) {
    return json(400, { ok: false, error: 'invalid', fields: invalid });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    // В сообщение не попадает ни имя переменной со значением, ни само значение.
    console.error('[lead] Telegram credentials are not configured');
    return json(500, { ok: false, error: 'server' });
  }

  const page = clean(payload.page, MAX_PAGE_CHARS) || clean(request.headers.get('referer'), MAX_PAGE_CHARS);
  const text = buildMessage(values, page, new Date(now));

  /* База API вынесена в переменную окружения только ради тестов:
     по умолчанию — настоящий Telegram. */
  const apiBase = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';

  try {
    const response = await fetch(`${apiBase}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      /* Тело ответа Telegram пишем в лог, но сначала вычищаем из него токен:
         подставить его в текст ошибки может только сам Telegram, и всё же
         в логи он попасть не должен ни при каком ответе. */
      const detail = (await response.text().catch(() => '')).slice(0, 500);
      console.error(
        `[lead] Telegram responded ${response.status}: ${detail.split(token).join('***')}`,
      );
      return json(502, { ok: false, error: 'delivery' });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`[lead] Telegram request failed: ${message.split(token).join('***')}`);
    return json(502, { ok: false, error: 'delivery' });
  }

  return json(200, { ok: true });
};

/** Форма ходит только POST-ом; остальное закрываем явно. */
export const ALL: APIRoute = () =>
  new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Allow: 'POST',
      'Cache-Control': 'no-store',
    },
  });
