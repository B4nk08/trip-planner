"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Trash2 } from "lucide-react";
import { ActivityCard } from "@/components/activity-card";
import { Button } from "@/components/ui/button";
import { formatDayHeading } from "@/lib/activities";
import type { Activity } from "@/lib/types";
import { cn } from "@/lib/utils";

type DaySectionProps = {
  dayDate: string;
  activities: Activity[];
  onAdd: (dayDate: string) => void;
  onEdit: (activity: Activity) => void;
  onDeleteDay: (dayDate: string) => void;
};

export function DaySection({
  dayDate,
  activities,
  onAdd,
  onEdit,
  onDeleteDay,
}: DaySectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayDate}`,
    data: { type: "day", dayDate },
  });

  return (
    <section className="animate-fade-up">
      <div className="mb-3 flex items-start justify-between gap-2 sm:items-end sm:gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.18em] text-[var(--ink-muted)] uppercase">
            Planner
          </p>
          <h2 className="font-display text-2xl leading-tight text-[var(--ink)] sm:text-3xl">
            {formatDayHeading(dayDate)}
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 shrink-0 rounded-full px-2.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 sm:px-3"
          onClick={() => onDeleteDay(dayDate)}
        >
          <Trash2 className="size-3.5" />
          <span className="hidden sm:inline">Delete day</span>
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "space-y-3 rounded-3xl border border-dashed border-transparent p-0.5 transition sm:p-1",
          isOver && "border-[var(--accent)]/40 bg-white/40"
        )}
      >
        <SortableContext
          items={activities.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {activities.length === 0 ? (
            <div className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-white/40 px-4 text-center text-sm text-[var(--ink-muted)]">
              No activities yet — hold and drag cards here
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
        className="mt-3 h-11 w-full rounded-full border-[var(--line)] bg-white/55 text-[var(--ink-soft)] hover:bg-white/90"
        onClick={() => onAdd(dayDate)}
      >
        <Plus className="size-4" />
        Add activity
      </Button>
    </section>
  );
}
