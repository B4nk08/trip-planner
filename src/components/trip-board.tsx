"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  ActivityFormDialog,
  type ActivityFormValues,
} from "@/components/activity-form-dialog";
import { DaySection } from "@/components/day-section";
import { TicketCard } from "@/components/ticket-card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getDayNumbers,
  groupByDay,
  nextOrderIndex,
} from "@/lib/activities";
import { deleteActivityImage, uploadActivityImage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import type { Activity } from "@/lib/types";

type FormState =
  | { mode: "create"; dayNumber: number }
  | { mode: "edit"; activity: Activity }
  | null;

function parseDayId(id: string | number): number | null {
  if (typeof id === "string" && id.startsWith("day-")) {
    const n = Number(id.replace("day-", ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function TripBoard() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [extraDays, setExtraDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<FormState>(null);
  const [dayToDelete, setDayToDelete] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activitiesRef = useRef(activities);

  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const dayNumbers = useMemo(
    () => getDayNumbers(activities, extraDays),
    [activities, extraDays]
  );

  const byDay = useMemo(() => groupByDay(activities), [activities]);

  const activeActivity = useMemo(
    () => activities.find((a) => a.id === activeId) ?? null,
    [activities, activeId]
  );

  const loadActivities = useCallback(async () => {
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("day_number", { ascending: true })
      .order("order_index", { ascending: true });

    if (error) {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
      setLoading(false);
      return;
    }

    setActivities((data as Activity[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchInitial() {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("day_number", { ascending: true })
        .order("order_index", { ascending: true });

      if (cancelled) return;

      if (error) {
        toast.error("โหลดข้อมูลไม่สำเร็จ");
        setLoading(false);
        return;
      }

      setActivities((data as Activity[]) ?? []);
      setLoading(false);
    }

    void fetchInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("activities-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities" },
        () => {
          void loadActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadActivities]);

  async function persistOrder(updates: { id: string; day_number: number; order_index: number }[]) {
    const results = await Promise.all(
      updates.map((u) =>
        supabase
          .from("activities")
          .update({ day_number: u.day_number, order_index: u.order_index })
          .eq("id", u.id)
      )
    );

    const failed = results.some((r) => r.error);
    if (failed) {
      toast.error("อัปเดตลำดับไม่สำเร็จ");
      await loadActivities();
    }
  }

  function findContainer(
    list: Activity[],
    id: string | number
  ): number | null {
    const asDay = parseDayId(id);
    if (asDay !== null) return asDay;
    const item = list.find((a) => a.id === id);
    return item?.day_number ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    setActivities((prev) => {
      const activeContainer = findContainer(prev, active.id);
      const overContainer =
        parseDayId(over.id) ?? findContainer(prev, over.id);

      if (
        activeContainer === null ||
        overContainer === null ||
        activeContainer === overContainer
      ) {
        return prev;
      }

      const activeItem = prev.find((a) => a.id === active.id);
      if (!activeItem) return prev;

      const without = prev.filter((a) => a.id !== active.id);
      const overItems = without
        .filter((a) => a.day_number === overContainer)
        .sort((a, b) => a.order_index - b.order_index);

      const overIndex = overItems.findIndex((a) => a.id === over.id);
      const insertIndex =
        parseDayId(over.id) !== null
          ? overItems.length
          : overIndex >= 0
            ? overIndex
            : overItems.length;

      const moved: Activity = {
        ...activeItem,
        day_number: overContainer,
      };

      const nextOver = [...overItems];
      nextOver.splice(insertIndex, 0, moved);

      const reindexedOver = nextOver.map((item, index) => ({
        ...item,
        order_index: index,
      }));

      const sourceRemaining = without
        .filter((a) => a.day_number === activeContainer)
        .sort((a, b) => a.order_index - b.order_index)
        .map((item, index) => ({ ...item, order_index: index }));

      const rest = without.filter(
        (a) =>
          a.day_number !== activeContainer && a.day_number !== overContainer
      );

      return [...rest, ...sourceRemaining, ...reindexedOver];
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      await loadActivities();
      return;
    }

    const current = activitiesRef.current;
    const activeItem = current.find((a) => a.id === active.id);
    if (!activeItem) {
      await loadActivities();
      return;
    }

    const overDay =
      parseDayId(over.id) ??
      current.find((a) => a.id === over.id)?.day_number ??
      null;

    if (overDay === null) {
      await loadActivities();
      return;
    }

    let nextActivities = current;
    const sourceDay = activeItem.day_number;

    if (sourceDay === overDay) {
      const items = current
        .filter((a) => a.day_number === sourceDay)
        .sort((a, b) => a.order_index - b.order_index);
      const oldIndex = items.findIndex((a) => a.id === active.id);
      const newIndex = items.findIndex((a) => a.id === over.id);

      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        const reordered = arrayMove(items, oldIndex, newIndex).map(
          (item, index) => ({ ...item, order_index: index })
        );
        nextActivities = [
          ...current.filter((a) => a.day_number !== sourceDay),
          ...reordered,
        ];
        setActivities(nextActivities);
      } else if (oldIndex === newIndex) {
        return;
      }
    }

    const touchedDays = new Set([sourceDay, overDay]);
    const updates = nextActivities
      .filter((a) => touchedDays.has(a.day_number))
      .map((a) => ({
        id: a.id,
        day_number: a.day_number,
        order_index: a.order_index,
      }));

    if (updates.length > 0) {
      await persistOrder(updates);
      toast.success("อัปเดตลำดับแล้ว");
    }
  }

  async function handleSave(values: ActivityFormValues) {
    if (!formState) return;

    let imageUrl: string | null =
      formState.mode === "edit" ? formState.activity.image_url : null;

    if (values.removeImage) {
      if (imageUrl) {
        await deleteActivityImage(imageUrl);
      }
      imageUrl = null;
    }

    if (values.imageFile) {
      if (imageUrl) {
        await deleteActivityImage(imageUrl);
      }
      try {
        imageUrl = await uploadActivityImage(values.imageFile);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "อัปโหลดรูปไม่สำเร็จ"
        );
        throw err;
      }
    }

    if (formState.mode === "create") {
      const order_index = nextOrderIndex(activities, formState.dayNumber);
      const { error } = await supabase.from("activities").insert({
        day_number: formState.dayNumber,
        time: values.time || null,
        location: values.location || null,
        activity: values.activity || null,
        note: values.note || null,
        image_url: imageUrl,
        order_index,
      });

      if (error) {
        toast.error("เพิ่มกิจกรรมไม่สำเร็จ");
        throw error;
      }

      toast.success("เพิ่มกิจกรรมแล้ว");
      await loadActivities();
      return;
    }

    const { error } = await supabase
      .from("activities")
      .update({
        time: values.time || null,
        location: values.location || null,
        activity: values.activity || null,
        note: values.note || null,
        image_url: imageUrl,
      })
      .eq("id", formState.activity.id);

    if (error) {
      toast.error("บันทึกไม่สำเร็จ");
      throw error;
    }

    toast.success("บันทึกแล้ว");
    await loadActivities();
  }

  async function handleDeleteActivity() {
    if (!formState || formState.mode !== "edit") return;

    const imageUrl = formState.activity.image_url;
    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", formState.activity.id);

    if (error) {
      toast.error("ลบไม่สำเร็จ");
      throw error;
    }

    if (imageUrl) {
      await deleteActivityImage(imageUrl);
    }

    toast.success("ลบกิจกรรมแล้ว");
    await loadActivities();
  }

  function handleAddDay() {
    const maxDay = Math.max(0, ...dayNumbers);
    const next = maxDay + 1;
    setExtraDays((prev) => [...prev, next]);
    toast.success(`เพิ่ม Day ${next} แล้ว`);
  }

  async function handleDeleteDay() {
    if (dayToDelete === null) return;
    const day = dayToDelete;

    const toDelete = activities.filter((a) => a.day_number === day);
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from("activities")
        .delete()
        .eq("day_number", day);

      if (error) {
        toast.error("ลบวันไม่สำเร็จ");
        setDayToDelete(null);
        return;
      }

      await Promise.all(
        toDelete.map((item) => deleteActivityImage(item.image_url))
      );
    }

    const higher = activities.filter((a) => a.day_number > day);
    if (higher.length > 0) {
      const results = await Promise.all(
        higher.map((a) =>
          supabase
            .from("activities")
            .update({ day_number: a.day_number - 1 })
            .eq("id", a.id)
        )
      );
      if (results.some((r) => r.error)) {
        toast.error("จัดเรียงวันใหม่ไม่สำเร็จ");
      }
    }

    setExtraDays((prev) =>
      prev
        .filter((d) => d !== day)
        .map((d) => (d > day ? d - 1 : d))
    );
    setDayToDelete(null);
    toast.success(`ลบ Day ${day} แล้ว`);
    await loadActivities();
  }

  const formDayNumber =
    formState?.mode === "create"
      ? formState.dayNumber
      : formState?.mode === "edit"
        ? formState.activity.day_number
        : 1;

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--pastel-sky)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_var(--pastel-blush)_0%,_transparent_45%),radial-gradient(ellipse_at_bottom_left,_var(--pastel-mint)_0%,_transparent_40%)]" />
      <div className="paper-grain pointer-events-none absolute inset-0 opacity-35" />

      <div className="relative mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="animate-fade-up">
            <p className="text-[11px] font-medium tracking-[0.2em] text-[var(--ink-muted)] uppercase">
              TripPlanner
            </p>
            <h1 className="font-display text-4xl tracking-tight text-[var(--ink)] sm:text-5xl">
              Trip Khao Yai
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--ink-soft)]">
              Trip planner for Khao Yai National Park
            </p>
          </div>

          <Button
            type="button"
            className="animate-fade-up rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)]"
            onClick={handleAddDay}
          >
            <Plus className="size-4" />
            เพิ่มวันใหม่
          </Button>
        </header>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-3xl bg-white/50"
              />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-10">
              {dayNumbers.map((day) => (
                <DaySection
                  key={day}
                  dayNumber={day}
                  activities={byDay.get(day) ?? []}
                  onAdd={(dayNumber) =>
                    setFormState({ mode: "create", dayNumber })
                  }
                  onEdit={(activity) =>
                    setFormState({ mode: "edit", activity })
                  }
                  onDeleteDay={setDayToDelete}
                />
              ))}
            </div>

            <DragOverlay>
              {activeActivity ? (
                <div className="w-[min(100vw-2rem,36rem)] opacity-95">
                  <TicketCard
                    activity={activeActivity}
                    isDragging
                    showImage={false}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <ActivityFormDialog
        open={formState !== null}
        onOpenChange={(open) => {
          if (!open) setFormState(null);
        }}
        dayNumber={formDayNumber}
        initial={formState?.mode === "edit" ? formState.activity : null}
        onSave={handleSave}
        onDelete={
          formState?.mode === "edit" ? handleDeleteActivity : undefined
        }
      />

      <AlertDialog
        open={dayToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setDayToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl border-white/70 bg-[#fffcfa]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">
              ลบทั้ง Day {dayToDelete}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              กิจกรรมทั้งหมดในวันนี้จะถูกลบ และวันถัดไปจะเลขวันใหม่ให้อัตโนมัติ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-rose-500 text-white hover:bg-rose-600"
              onClick={handleDeleteDay}
            >
              ยืนยันลบทั้งวัน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
