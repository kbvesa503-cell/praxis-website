/*
 * Форма заявки: открытие, отправка, состояния.
 * Подключается только когда в src/data/config.ts задан адрес приёма.
 */
import { contact } from '~/data/config';
import { contactForm } from '~/data/content';

const dialog = document.querySelector<HTMLDialogElement>('#contact-dialog');
const form = dialog?.querySelector<HTMLFormElement>('[data-contact-form]');
const status = dialog?.querySelector<HTMLElement>('[data-contact-status]');
const submit = dialog?.querySelector<HTMLButtonElement>('[data-contact-submit]');

function setState(state: 'idle' | 'sending' | 'sent' | 'error', message = ''): void {
  if (!dialog || !status || !submit) return;
  dialog.dataset.state = state;
  status.textContent = message;
  submit.disabled = state === 'sending';
  submit.textContent = state === 'sending' ? contactForm.sending : contactForm.submit;
}

function open(): void {
  if (!dialog) return;
  setState('idle');
  dialog.showModal();
}

if (dialog && form && status && submit) {
  document.querySelectorAll<HTMLElement>('[data-open-contact]').forEach((el) => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      open();
    });
  });

  dialog.querySelector('[data-close-contact]')?.addEventListener('click', () => dialog.close());

  // Клик по подложке закрывает окно: у <dialog> клик приходит на сам элемент.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const data = new FormData(form);

    // Ловушка заполнена — это бот. Показываем успех и ничего не отправляем.
    if (String(data.get('company_website') ?? '').length > 0) {
      setState('sent', contactForm.success);
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
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      form.reset();
      setState('sent', contactForm.success);
    } catch {
      setState('error', contactForm.error);
    }
  });
}

export {};
