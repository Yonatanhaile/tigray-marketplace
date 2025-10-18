export function formatPrice(value, currency = 'ETB') {
  if (value == null || isNaN(Number(value))) return '';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value));
  } catch {
    return `${Number(value).toLocaleString()} ${currency}`;
  }
}


