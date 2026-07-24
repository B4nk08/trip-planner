import type { Activity } from "@/lib/types";

/** Format YYYY-MM-DD for storage / droppable ids */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD as local date (avoids UTC shift) */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** English long date e.g. August 12, 2026 */
export function formatDayHeading(dayDate: string): string {
  return parseDateKey(dayDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function groupByDay(activities: Activity[]): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();

  for (const item of activities) {
    const list = map.get(item.day_date) ?? [];
    list.push(item);
    map.set(item.day_date, list);
  }

  for (const [day, list] of map) {
    map.set(
      day,
      [...list].sort((a, b) => a.order_index - b.order_index)
    );
  }

  return map;
}

export function getDayDates(
  activities: Activity[],
  extraDays: string[] = []
): string[] {
  const fromData = activities.map((a) => a.day_date);
  const all = new Set([...fromData, ...extraDays]);
  return [...all].sort((a, b) => a.localeCompare(b));
}

export function nextOrderIndex(activities: Activity[], dayDate: string) {
  const dayItems = activities.filter((a) => a.day_date === dayDate);
  if (dayItems.length === 0) return 0;
  return Math.max(...dayItems.map((a) => a.order_index)) + 1;
}
