// Pure date helpers used across views. `iso` values are either full ISO
// timestamps or YYYY-MM-DD date-only strings.

export const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

export const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso) || iso.endsWith('T00:00:00.000Z');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(isDateOnly ? { timeZone: 'UTC' } : {}),
  });
};

export const formatAge = (iso, baseDate) => {
  if (!iso) return '—';
  const now = baseDate || new Date();
  const diffMs = now - new Date(iso);
  if (diffMs < 0) return 'Just now';

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} m`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} d`;

  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks} w`;
};

export const daysBetween = (a, b) => {
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
};

export const mondayOf = (dateIso) => {
  const d = new Date(dateIso);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const weekKeyOf = (dateIso) => {
  return mondayOf(dateIso).toISOString().slice(0, 10);
};

export const weekLabel = (weekKeyStr) => {
  const start = new Date(weekKeyStr);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return fmt(start) + ' – ' + fmt(end);
};
