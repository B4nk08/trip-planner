"use client";

import { GripVertical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Activity } from "@/lib/types";
import { cn } from "@/lib/utils";

const TICKET_TONES = [
  "from-[#f7ece6] to-[#fff9f6]",
  "from-[#e8f3ef] to-[#f7fcfa]",
  "from-[#e8eef7] to-[#f6f9fd]",
  "from-[#f3ebe8] to-[#fbf7f5]",
  "from-[#eaf1ea] to-[#f7faf7]",
];

type TicketCardProps = {
  activity: Activity;
  onEdit?: (activity: Activity) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  className?: string;
  style?: React.CSSProperties;
  isDragging?: boolean;
  showImage?: boolean;
};

export function TicketCard({
  activity,
  onEdit,
  dragHandleProps,
  className,
  style,
  isDragging,
  showImage = true,
}: TicketCardProps) {
  const tone = TICKET_TONES[(activity.day_number - 1) % TICKET_TONES.length];

  return (
    <div style={style} className={cn("space-y-2", className)}>
      <article
        className={cn(
          "ticket-card group relative flex overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-r shadow-[0_10px_30px_-18px_rgba(80,110,130,0.45)]",
          tone,
          isDragging && "z-50 scale-[1.02] opacity-90 shadow-xl"
        )}
      >
        <button
          type="button"
          className="flex w-9 shrink-0 cursor-grab items-center justify-center border-r border-dashed border-[var(--line)] text-[var(--ink-muted)] touch-none active:cursor-grabbing"
          aria-label="ลากเพื่อย้ายลำดับ"
          {...dragHandleProps}
        >
          <GripVertical className="size-4" />
        </button>

        <div className="flex min-w-0 flex-1">
          <div className="flex w-[4.75rem] shrink-0 flex-col items-center justify-center border-r border-dashed border-[var(--line)] px-2 py-3 text-center sm:w-24">
            <span className="text-[10px] font-medium tracking-[0.14em] text-[var(--ink-muted)] uppercase">
              Time
            </span>
            <span className="mt-1 font-display text-lg leading-none text-[var(--ink)] sm:text-xl">
              {activity.time || "--:--"}
            </span>
          </div>

          <div className="min-w-0 flex-1 px-3 py-3 sm:px-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] tracking-wide text-[var(--ink-muted)] uppercase">
                  {activity.location || "ไม่ระบุสถานที่"}
                </p>
                <h3 className="mt-0.5 truncate font-display text-lg text-[var(--ink)] sm:text-xl">
                  {activity.activity || "กิจกรรมไม่มีชื่อ"}
                </h3>
              </div>
              {onEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-[var(--ink-soft)] hover:bg-white/70 hover:text-[var(--ink)]"
                  onClick={() => onEdit(activity)}
                  aria-label="แก้ไขกิจกรรม"
                >
                  <Pencil className="size-3.5" />
                </Button>
              ) : null}
            </div>
            {activity.note ? (
              <p className="mt-1 line-clamp-2 text-sm text-[var(--ink-soft)]">
                {activity.note}
              </p>
            ) : null}
          </div>
        </div>

        <div className="ticket-notch ticket-notch-top" aria-hidden />
        <div className="ticket-notch ticket-notch-bottom" aria-hidden />
      </article>

      {showImage && activity.image_url ? (
        <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/55 shadow-[0_8px_24px_-18px_rgba(80,110,130,0.4)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activity.image_url}
            alt={activity.activity || "รูปกิจกรรม"}
            className="max-h-56 w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
    </div>
  );
}
