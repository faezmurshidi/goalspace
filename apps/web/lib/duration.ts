const MS_PER_DAY = 24 * 60 * 60 * 1000;

function utcMidnight(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysBetween(from: string, to: string): number {
  const diff = (utcMidnight(to) - utcMidnight(from)) / MS_PER_DAY;
  return diff > 0 ? Math.round(diff) : 0;
}

export function formatElapsed(days: number): { value: string; unit: string } {
  if (days >= 730) {
    const years = Math.floor(days / 365);
    return { value: String(years), unit: years === 1 ? 'year' : 'years' };
  }
  if (days >= 60) {
    const months = Math.floor(days / 30);
    return { value: String(months), unit: months === 1 ? 'month' : 'months' };
  }
  return { value: String(days), unit: days === 1 ? 'day' : 'days' };
}
