const SELECTED_TRIP_KEY = "trip-planner:selected-trip-id";

export function getStoredTripId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SELECTED_TRIP_KEY);
  } catch {
    return null;
  }
}

export function setStoredTripId(tripId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SELECTED_TRIP_KEY, tripId);
  } catch {
    // ignore quota / private mode
  }
}

export function clearStoredTripId() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SELECTED_TRIP_KEY);
  } catch {
    // ignore
  }
}
