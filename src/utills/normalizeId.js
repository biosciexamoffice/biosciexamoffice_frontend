export const normalizeId = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    if (typeof value.toHexString === 'function') {
      return value.toHexString();
    }
    if (typeof value.toString === 'function') {
      return value.toString();
    }
  }
  return String(value);
};

export const idsMatch = (a, b) => normalizeId(a) === normalizeId(b);
