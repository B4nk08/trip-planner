"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Trash2 } from "lucide-react";
import { ActivityCard } from "@/components/activity-card";
import { Button } from "@/components/ui/button";
import type { Activity } from "@/lib/types";
import { cn } from "@/lib/utils";

type DaySectionProps = {
  dayNumber: number;
  activities: Activity[];
  onAdd: (dayNumber: number) => void;
  onEdit: (activity: Activity) => void;
  onDeleteDay: (dayNumber: number) => void;
};

export function DaySection({
  dayNumber,
  activities,
  onAdd,
  onEdit,
  onDeleteDay,
}: DaySectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayNumber}`,
    data: { type: "day", dayNumber },
  });

  return (
    <section className="animate-fade-up">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-[0.18em] text-[var(--ink-muted)] uppercase">
            Planner
          </p>
          <h2 className="font-display text-3xl text-[var(--ink)]">
            Day {dayNumber}
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-600"
          onClick={() => onDeleteDay(dayNumber)}
        >
          <Trash2 className="size-3.5" />
          Delete all activities
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "space-y-3 rounded-3xl border border-dashed border-transparent p-1 transition",
          isOver && "border-[var(--accent)]/40 bg-white/40",
        )}
      >
        <SortableContext
          items={activities.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {activities.length === 0 ? (
            <div className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-white/40 px-4 text-sm text-[var(--ink-muted)]">
              No activities yet, drag and drop cards here
            </div>
          ) : (
            activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onEdit={onEdit}
              />
            ))
          )}
        </SortableContext>
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-3 w-full rounded-full border-[var(--line)] bg-white/55 text-[var(--ink-soft)] hover:bg-white/90"
        onClick={() => onAdd(dayNumber)}
      >
        <Plus className="size-4" />
        Add activity
      </Button>
    </section>
  );
}
