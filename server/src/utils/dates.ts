export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function toDateKey(d: Date) {
  return startOfDay(d).toISOString().slice(0, 10);
}

export function parseTimeOnDate(date: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const x = new Date(date);
  x.setHours(h, m, 0, 0);
  return x;
}

export function isWeekend(d: Date) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function eachDate(start: Date, end: Date) {
  const dates: Date[] = [];
  const cur = startOfDay(start);
  const last = startOfDay(end);
  while (cur <= last) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function yearMonth(d = new Date()) {
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function workingDaysInMonth(year: number, month: number, holidays: Set<string>) {
  const days: Date[] = [];
  const cursor = new Date(year, month - 1, 1);
  while (cursor.getMonth() === month - 1) {
    const key = toDateKey(cursor);
    if (!isWeekend(cursor) && !holidays.has(key)) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
