"use client";

import { CalendarRange, MapPinned } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { formatShortDate } from "@/lib/activities";
import type { Trip } from "@/lib/types";

type MemoriesPanelProps = {
  trips: Trip[];
  onOpenTrip: (tripId: string) => void;
};

export function MemoriesPanel({ trips, onOpenTrip }: MemoriesPanelProps) {
  return (
    <div className="relative min-h-svh flex-1">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--pastel-sky)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_var(--pastel-blush)_0%,_transparent_45%),radial-gradient(ellipse_at_bottom_left,_var(--pastel-mint)_0%,_transparent_40%)]" />
      <div className="paper-grain pointer-events-none absolute inset-0 opacity-35" />

      <header className="sticky top-0 z-20 border-b border-white/60 bg-[#f4f7f5]/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:px-4">
          <SidebarTrigger
            className="-ml-0.5 size-8 shrink-0"
            aria-label="Toggle sidebar"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] tracking-[0.16em] text-[var(--ink-muted)] uppercase">
              You & Me
            </p>
            <h1 className="truncate font-display text-lg text-[var(--ink)] sm:text-xl">
              Been there
            </h1>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-2xl px-3 pb-[max(4rem,env(safe-area-inset-bottom))] pt-6 sm:px-6">
        <p className="mb-6 text-sm text-[var(--ink-soft)]">
          Past trips with an end date before today — open any trip to revisit
          the plan
        </p>

        {trips.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--line)] bg-white/50 px-6 py-14 text-center">
            <p className="font-display text-2xl text-[var(--ink)]">
              No past trips yet
            </p>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              When a trip’s return date passes, it shows up here
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {trips.map((trip) => (
              <li key={trip.id}>
                <button
                  type="button"
                  onClick={() => onOpenTrip(trip.id)}
                  className="flex w-full items-start gap-3 rounded-3xl border border-white/70 bg-white/70 px-4 py-4 text-left shadow-[0_8px_24px_-18px_rgba(80,110,130,0.35)] transition hover:bg-white"
                >
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--pastel-mint)] text-[var(--accent-deep)]">
                    <MapPinned className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl text-[var(--ink)]">
                      {trip.name}
                    </span>
                    {trip.start_date && trip.end_date ? (
                      <span className="mt-1 flex items-center gap-1.5 text-sm text-[var(--ink-soft)]">
                        <CalendarRange className="size-3.5 shrink-0" />
                        {formatShortDate(trip.start_date)} –{" "}
                        {formatShortDate(trip.end_date)}
                      </span>
                    ) : (
                      <span className="mt-1 text-sm text-[var(--ink-muted)]">
                        No dates set
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
