const UNLOCK_KEY = "trip-planner-unlocked";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeUnlock(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPasscode() {
  return process.env.NEXT_PUBLIC_PASSCODE ?? "123456";
}

export function isUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(UNLOCK_KEY) === "true";
}

export function setUnlocked(value: boolean) {
  if (typeof window === "undefined") return;
  if (value) {
    localStorage.setItem(UNLOCK_KEY, "true");
  } else {
    localStorage.removeItem(UNLOCK_KEY);
  }
  emit();
}
