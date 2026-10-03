const WEEKDAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Compute next occurrence date string (YYYY-MM-DD) for task recurrence rules.
 */
export function computeNextOccurrenceDate(
  recurrence: 'once' | 'daily' | 'weekly' | 'custom',
  customConfig?: { type: 'specific_days'; days: string[] } | { type: 'interval'; everyNDays: number } | null,
  fromOccurrenceDate?: string
): string | null {
  if (recurrence === 'once') return null;

  let baseDate: Date;
  if (fromOccurrenceDate) {
    const [y, m, d] = fromOccurrenceDate.split('-').map(Number);
    baseDate = new Date(Date.UTC(y, m - 1, d));
  } else {
    const now = new Date();
    baseDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  if (recurrence === 'daily') {
    baseDate.setUTCDate(baseDate.getUTCDate() + 1);
    return baseDate.toISOString().split('T')[0];
  }

  if (recurrence === 'weekly') {
    baseDate.setUTCDate(baseDate.getUTCDate() + 7);
    return baseDate.toISOString().split('T')[0];
  }

  if (recurrence === 'custom' && customConfig) {
    if (customConfig.type === 'interval') {
      const intervalDays = Math.max(1, customConfig.everyNDays || 1);
      baseDate.setUTCDate(baseDate.getUTCDate() + intervalDays);
      return baseDate.toISOString().split('T')[0];
    }

    if (customConfig.type === 'specific_days' && Array.isArray(customConfig.days) && customConfig.days.length > 0) {
      const targetDays = customConfig.days
        .map((d) => WEEKDAY_MAP[d.toLowerCase()])
        .filter((d) => d !== undefined);

      if (targetDays.length === 0) {
        baseDate.setUTCDate(baseDate.getUTCDate() + 1);
        return baseDate.toISOString().split('T')[0];
      }

      const currentDay = baseDate.getUTCDay();

      for (let offset = 1; offset <= 7; offset++) {
        const checkDay = (currentDay + offset) % 7;
        if (targetDays.includes(checkDay)) {
          baseDate.setUTCDate(baseDate.getUTCDate() + offset);
          return baseDate.toISOString().split('T')[0];
        }
      }
    }
  }

  baseDate.setUTCDate(baseDate.getUTCDate() + 1);
  return baseDate.toISOString().split('T')[0];
}
