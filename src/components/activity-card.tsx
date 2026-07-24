"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TicketCard } from "@/components/ticket-card";
import type { Activity } from "@/lib/types";

type ActivityCardProps = {
  activity: Activity;
  onEdit: (activity: Activity) => void;
};

export function ActivityCard({ activity, onEdit }: ActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: activity.id,
    data: { type: "activity", activity },
  });

  return (
    <div ref={setNodeRef}>
      <TicketCard
        activity={activity}
        onEdit={onEdit}
        isDragging={isDragging}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}
