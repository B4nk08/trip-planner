import type { Activity } from "@/lib/types";

export function groupByDay(activities: Activity[]): Map<number, Activity[]> {
  const map = new Map<number, Activity[]>();

  for (const item of activities) {
    const list = map.get(item.day_number) ?? [];
    list.push(item);
    map.set(item.day_number, list);
  }

  for (const [day, list] of map) {
    map.set(
      day,
      [...list].sort((a, b) => a.order_index - b.order_index)
    );
  }

  return map;
}

export function getDayNumbers(
  activities: Activity[],
  extraDays: number[] = []
): number[] {
  const fromData = activities.map((a) => a.day_number);
  const all = new Set([...fromData, ...extraDays]);
  if (all.size === 0) return [1];
  return [...all].sort((a, b) => a - b);
}

export function nextOrderIndex(activities: Activity[], dayNumber: number) {
  const dayItems = activities.filter((a) => a.day_number === dayNumber);
  if (dayItems.length === 0) return 0;
  return Math.max(...dayItems.map((a) => a.order_index)) + 1;
}
