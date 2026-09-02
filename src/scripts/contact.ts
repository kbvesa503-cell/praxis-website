/*
 * Форма заявки: открытие, валидация, отправка, состояния.
 *
 * Фокус-ловушку, Esc и подложку даёт нативный <dialog>. Здесь — только
 * то, чего браузер не делает сам: возврат фокуса на кнопку-источник,
 * блокировка прокрутки страницы, свои сообщения об ошибках и защита
 * от повторной отправки.
 */
import { contact } from '~/data/config';
import { contactForm } from '~/data/content';
import { track } from '~/scripts/analytics';

type State = 'idle' | 'sending' | 'sent' | 'error';

const dialog = document.querySelector<HTMLDialogElement>('#contact-dialog');
const form = dialog?.querySelector<HTMLFormElement>('[data-contact-form]');
const status = dialog?.querySelector<HTMLElement>('[data-contact-status]');
const submit = dialog?.querySelector<HTMLButtonElement>('[data-contact-submit]');

/* Кнопка, с которой форму открыли: на неё возвращается фокус при закрытии. */
let opener: HTMLElement | null = null;

/* Отдельный флаг, а не только disabled у кнопки: submit может прийти
   и по Enter из поля, когда кнопка ещё не успела заблокироваться. */
let sending = false;

const fieldNames = Object.keys(contactForm.fields);

function fieldBox(name: string): HTMLElement | null {
  return dialog?.querySelector<HTMLElement>(`[data-field="${name}"]`) ?? null;
}

function setFieldError(name: string, message: string): void {
  const box = fieldBox(name);
  if (!box) return;

  const error = box.querySelector<HTMLElement>('[data-field-error]');
  if (error) error.textContent = message;

  if (message) box.setAttribute('data-invalid', '');
  else box.removeAttribute('data-invalid');

  box
    .querySelector<HTMLInputElement | HTMLTextAreaElement>('.cdlg__input')
    ?.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function clearErrors(): void {
  fieldNames.forEach((name) => setFieldError(name, ''));
}

function setState(state: State, message = ''): void {
  if (!dialog || !status || !submit) return;

  sending = state === 'sending';
  dialog.dataset.state = state;
  status.textContent = message;
  submit.disabled = state === 'sending';
  submit.textContent = state === 'sending' ? contactForm.sending : contactForm.submit;
}

function open(trigger: HTMLElement | null): void {
  if (!dialog || !form) return;

  track('form_open', { place: trigger?.dataset.cta });

  opener = trigger;
  clearErrors();
  setState('idle');
  dialog.showModal();

  /* Прокрутку страницы под модальным окном браузер не блокирует сам. */
  document.documentElement.style.overflow = 'hidden';

  // Фокус ставим на первое поле, а не на кнопку закрытия.
  form.querySelector<HTMLInputElement>('.cdlg__input')?.focus();
}

function close(): void {
  dialog?.close();
}

/** Обязательные поля проверяем сами: у формы novalidate, сообщения свои. */
function validate(data: FormData): boolean {
  let firstInvalid: string | null = null;

  for (const [name, field] of Object.entries(contactForm.fields)) {
    if (!field.required) continue;

    const value = String(data.get(name) ?? '').trim();
    const bad = value.length === 0;

    setFieldError(name, bad ? contactForm.errors.required : '');
    if (bad && !firstInvalid) firstInvalid = name;
  }

  if (firstInvalid) {
    fieldBox(firstInvalid)?.querySelector<HTMLInputElement>('.cdlg__input')?.focus();
    return false;
  }

  return true;
}

/** Сообщение по коду ответа сервера. Кода нет — считаем сбоем сети. */
function messageFor(code: unknown): string {
  switch (code) {
    case 'rate_limited':
      return contactForm.errors.rateLimited;
    case 'invalid':
      return contactForm.errors.invalid;
    case 'delivery':
    case 'server':
    case 'bad_request':
    case 'too_large':
      return contactForm.errors.server;
    default:
      return contactForm.errors.network;
  }
}

if (dialog && form && status && submit) {
  document.querySelectorAll<HTMLElement>('[data-open-contact]').forEach((el) => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      track('cta_click', { place: el.dataset.cta });
      open(el);
    });
  });

  dialog.querySelector('[data-close-contact]')?.addEventListener('click', close);

  /* Клик вне формы. Проверяем не только цель, но и координаты: у <dialog>
     клик по подложке приходит на сам элемент, а нажатие внутри поля с
     открытым списком автозаполнения — тоже, но с координатами внутри окна. */
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;

    const box = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;

    if (!inside) close();
  });

  /* close срабатывает и на Esc, и на кнопку, и на клик по подложке —
     поэтому возврат фокуса и разблокировка прокрутки живут здесь. */
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    opener?.focus();
    opener = null;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;

    const data = new FormData(form);

    /* Ловушка заполнена — это бот. Показываем успех и ничего не отправляем. */
    if (String(data.get('company_website') ?? '').length > 0) {
      setState('sent', contactForm.success);
      return;
    }

    if (!validate(data)) {
      setState('error', contactForm.errors.invalid);
      return;
    }

    setState('sending');

    try {
      const response = await fetch(contact.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          company: data.get('company'),
          contact: data.get('contact'),
          process: data.get('process'),
          page: location.href,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        fields?: string[];
      };

      if (!response.ok || !body.ok) {
        /* Сервер может назвать конкретные поля — подсвечиваем их. */
        body.fields?.forEach((name) => setFieldError(name, contactForm.errors.required));
        /* В аналитику уходит только код отказа — содержимое формы никогда. */
        track('lead_submit_error', { reason: body.error ?? 'unknown' });
        setState('error', messageFor(body.error));
        return;
      }

      track('lead_submit_success');
      form.reset();
      clearErrors();
      setState('sent', contactForm.success);
    } catch {
      track('lead_submit_error', { reason: 'network' });
      setState('error', contactForm.errors.network);
    }
  });

  /* Правка поля снимает с него ошибку: сообщение не должно висеть,
     пока человек уже исправляет. */
  form.addEventListener('input', (event) => {
    const target = event.target as HTMLElement | null;
    const box = target?.closest<HTMLElement>('[data-field]');
    const name = box?.dataset.field;
    if (name && box.hasAttribute('data-invalid')) setFieldError(name, '');
  });
}

export {};
