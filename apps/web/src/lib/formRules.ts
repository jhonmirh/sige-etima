import type { FormEvent } from 'react';

export const NAME_PATTERN = "[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+";
export const DIGITS_PATTERN = '[0-9]+';

export function toUpperInput(event: FormEvent<HTMLInputElement | HTMLTextAreaElement>) {
  event.currentTarget.value = event.currentTarget.value.toLocaleUpperCase('es-VE');
}

export function digitsOnlyInput(event: FormEvent<HTMLInputElement>) {
  event.currentTarget.value = event.currentTarget.value.replace(/\D+/g, '');
}

export function nameOnlyInput(event: FormEvent<HTMLInputElement>) {
  event.currentTarget.value = event.currentTarget.value
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+/g, '')
    .toLocaleUpperCase('es-VE');
}

export function uppercaseValue(value: unknown) {
  return typeof value === 'string' ? value.trim().toLocaleUpperCase('es-VE') : value;
}
