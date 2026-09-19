const dateFmt = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });
const dateTimeFmt = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

type DateInput = string | number | Date | null | undefined;

export const formatDate = (value: DateInput) => (value ? dateFmt.format(new Date(value)) : '—');
export const formatDateTime = (value: DateInput) =>
  value ? dateTimeFmt.format(new Date(value)) : '—';

export const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
