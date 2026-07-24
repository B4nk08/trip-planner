"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  getPasscode,
  isUnlocked,
  setUnlocked,
  subscribeUnlock,
} from "@/lib/passcode";

type PasscodeGateProps = {
  children: React.ReactNode;
};

export function PasscodeGate({ children }: PasscodeGateProps) {
  const unlocked = useSyncExternalStore(
    subscribeUnlock,
    isUnlocked,
    () => false
  );
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (hydrated && !unlocked) {
      inputsRef.current[0]?.focus();
    }
  }, [hydrated, unlocked]);

  function handleChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    setError(false);

    if (cleaned && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    if (next.every((d) => d.length === 1)) {
      verify(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    const next = Array.from({ length: 6 }, (_, i) => pasted[i] ?? "");
    setDigits(next);
    setError(false);
    if (pasted.length === 6) {
      verify(pasted);
    } else {
      inputsRef.current[pasted.length]?.focus();
    }
  }

  function verify(code: string) {
    if (code === getPasscode()) {
      setUnlocked(true);
    } else {
      setError(true);
      setDigits(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--pastel-mint)]" />
      </div>
    );
  }

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--pastel-sky)_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_var(--pastel-blush)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_left,_var(--pastel-mint)_0%,_transparent_45%)]" />
      <div className="paper-grain pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative w-full max-w-sm animate-fade-up rounded-3xl border border-white/70 bg-white/70 p-8 shadow-[0_20px_60px_-24px_rgba(90,120,140,0.35)] backdrop-blur-md">
        <p className="font-display text-3xl tracking-tight text-[var(--ink)]">
          Trip Journal
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
          กรอกรหัสผ่าน 6 หลักเพื่อเข้าสู่แผนทริป
        </p>

        <div className="mt-8 flex justify-between gap-2" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`h-12 w-10 rounded-xl border bg-white/80 text-center font-display text-xl text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30 sm:h-14 sm:w-11 ${
                error
                  ? "border-rose-300 animate-shake"
                  : "border-[var(--line)]"
              }`}
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        {error && (
          <p className="mt-3 text-center text-sm text-rose-500">
            รหัสไม่ถูกต้อง ลองอีกครั้ง
          </p>
        )}

        <Button
          type="button"
          className="mt-6 w-full rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)]"
          onClick={() => verify(digits.join(""))}
          disabled={digits.some((d) => !d)}
        >
          เข้าสู่แผนทริป
        </Button>
      </div>
    </div>
  );
}
