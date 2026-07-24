"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { CalendarIcon, CalendarDays, ChevronRight, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  ActivityFormDialog,
  type ActivityFormValues,
} from "@/components/activity-form-dialog";
import { DaySection } from "@/components/day-section";
import { FundPanel } from "@/components/fund-panel";
import { TicketCard } from "@/components/ticket-card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { fundBalance, formatMoney } from "@/lib/fund";
import {
  formatDayHeading,
  getDayDates,
  groupByDay,
  nextOrderIndex,
  toDateKey,
  todayKey,
} from "@/lib/activities";
import { deleteActivityImage, uploadActivityImage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import type { Activity, FundTransaction, Trip } from "@/lib/types";

type FormState =
  | { mode: "create"; dayDate: string }
  | { mode: "edit"; activity: Activity }
  | null;

function parseDayId(id: string | number): string | null {
  if (typeof id === "string" && id.startsWith("day-")) {
    return id.slice(4);
  }
  return null;
}

type TripBoardProps = {
  trip: Trip;
};

type BoardView = "activities" | "fund";

export function TripBoard({ trip }: TripBoardProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [extraDays, setExtraDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<FormState>(null);
  const [dayToDelete, setDayToDelete] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addDayOpen, setAddDayOpen] = useState(false);
  const [pendingDay, setPendingDay] = useState<Date | undefined>(undefined);
  const [view, setView] = useState<BoardView>("activities");
  const activitiesRef = useRef(activities);
  const dragOriginDayRef = useRef<string | null>(null);

  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  useEffect(() => {
    setExtraDays([]);
    setFormState(null);
    setDayToDelete(null);
    setView("activities");
    setLoading(true);
  }, [trip.id]);

  const balance = useMemo(() => fundBalance(transactions), [transactions]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    })
  );

  const dayDates = useMemo(
    () => getDayDates(activities, extraDays),
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
      .eq("trip_id", trip.id)
      .order("day_date", { ascending: true })
      .order("order_index", { ascending: true });

    if (error) {
      toast.error("Failed to load activities");
      setLoading(false);
      return;
    }

    setActivities((data as Activity[]) ?? []);
    setLoading(false);
  }, [trip.id]);

  const loadTransactions = useCallback(async () => {
    const { data, error } = await supabase
      .from("fund_transactions")
      .select("*")
      .eq("trip_id", trip.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load fund");
      return;
    }

    setTransactions(
      ((data as FundTransaction[]) ?? []).map((tx) => ({
        ...tx,
        amount: Number(tx.amount),
      }))
    );
  }, [trip.id]);

  useEffect(() => {
    let cancelled = false;

    async function fetchInitial() {
      const [acts, funds] = await Promise.all([
        supabase
          .from("activities")
          .select("*")
          .eq("trip_id", trip.id)
          .order("day_date", { ascending: true })
          .order("order_index", { ascending: true }),
        supabase
          .from("fund_transactions")
          .select("*")
          .eq("trip_id", trip.id)
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      if (acts.error) {
        toast.error("Failed to load activities");
      } else {
        setActivities((acts.data as Activity[]) ?? []);
      }

      if (funds.error) {
        toast.error("Failed to load fund");
      } else {
        setTransactions(
          ((funds.data as FundTransaction[]) ?? []).map((tx) => ({
            ...tx,
            amount: Number(tx.amount),
          }))
        );
      }

      setLoading(false);
    }

    void fetchInitial();
    return () => {
      cancelled = true;
    };
  }, [trip.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`trip-${trip.id}-realtime`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activities",
          filter: `trip_id=eq.${trip.id}`,
        },
        () => {
          void loadActivities();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fund_transactions",
          filter: `trip_id=eq.${trip.id}`,
        },
        () => {
          void loadTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trip.id, loadActivities, loadTransactions]);

  async function persistOrder(
    updates: { id: string; day_date: string; order_index: number }[]
  ) {
    const results = await Promise.all(
      updates.map((u) =>
        supabase
          .from("activities")
          .update({ day_date: u.day_date, order_index: u.order_index })
          .eq("id", u.id)
      )
    );

    const failed = results.some((r) => r.error);
    if (failed) {
      toast.error("Failed to update order");
      await loadActivities();
    }
  }

  function findContainer(
    list: Activity[],
    id: string | number
  ): string | null {
    const asDay = parseDayId(id);
    if (asDay !== null) return asDay;
    const item = list.find((a) => a.id === id);
    return item?.day_date ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveId(id);
    const item = activitiesRef.current.find((a) => a.id === id);
    dragOriginDayRef.current = item?.day_date ?? null;
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
        .filter((a) => a.day_date === overContainer)
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
        day_date: overContainer,
      };

      const nextOver = [...overItems];
      nextOver.splice(insertIndex, 0, moved);

      const reindexedOver = nextOver.map((item, index) => ({
        ...item,
        order_index: index,
      }));

      const sourceRemaining = without
        .filter((a) => a.day_date === activeContainer)
        .sort((a, b) => a.order_index - b.order_index)
        .map((item, index) => ({ ...item, order_index: index }));

      const rest = without.filter(
        (a) =>
          a.day_date !== activeContainer && a.day_date !== overContainer
      );

      const next = [...rest, ...sourceRemaining, ...reindexedOver];
      activitiesRef.current = next;
      return next;
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    const originDay = dragOriginDayRef.current;
    dragOriginDayRef.current = null;

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
      current.find((a) => a.id === over.id)?.day_date ??
      null;

    if (overDay === null) {
      await loadActivities();
      return;
    }

    let nextActivities = current;
    const currentDay = activeItem.day_date;
    const movedAcrossDays = Boolean(originDay && originDay !== overDay);

    // Same-day reorder (or final position tweak after a cross-day dragOver)
    if (currentDay === overDay) {
      const items = current
        .filter((a) => a.day_date === currentDay)
        .sort((a, b) => a.order_index - b.order_index);
      const oldIndex = items.findIndex((a) => a.id === active.id);
      const overIsDay = parseDayId(over.id) !== null;
      const newIndex = overIsDay
        ? items.length - 1
        : items.findIndex((a) => a.id === over.id);

      if (
        oldIndex >= 0 &&
        newIndex >= 0 &&
        oldIndex !== newIndex
      ) {
        const reordered = arrayMove(items, oldIndex, newIndex).map(
          (item, index) => ({ ...item, order_index: index })
        );
        nextActivities = [
          ...current.filter((a) => a.day_date !== currentDay),
          ...reordered,
        ];
        setActivities(nextActivities);
      } else if (oldIndex === newIndex && !movedAcrossDays) {
        // Nothing changed — skip DB write
        return;
      }
    } else {
      // Dropped onto another day without a prior dragOver update — move now
      const without = current.filter((a) => a.id !== active.id);
      const destItems = without
        .filter((a) => a.day_date === overDay)
        .sort((a, b) => a.order_index - b.order_index);
      const overIndex = destItems.findIndex((a) => a.id === over.id);
      const insertIndex =
        parseDayId(over.id) !== null
          ? destItems.length
          : overIndex >= 0
            ? overIndex
            : destItems.length;

      const moved: Activity = { ...activeItem, day_date: overDay };
      const nextDest = [...destItems];
      nextDest.splice(insertIndex, 0, moved);

      const reindexedDest = nextDest.map((item, index) => ({
        ...item,
        order_index: index,
      }));

      const sourceRemaining = without
        .filter((a) => a.day_date === currentDay)
        .sort((a, b) => a.order_index - b.order_index)
        .map((item, index) => ({ ...item, order_index: index }));

      const rest = without.filter(
        (a) => a.day_date !== currentDay && a.day_date !== overDay
      );

      nextActivities = [...rest, ...sourceRemaining, ...reindexedDest];
      setActivities(nextActivities);
    }

    const touchedDays = new Set<string>([overDay, currentDay]);
    if (originDay) touchedDays.add(originDay);

    const updates = nextActivities
      .filter((a) => touchedDays.has(a.day_date))
      .map((a) => ({
        id: a.id,
        day_date: a.day_date,
        order_index: a.order_index,
      }));

    // Always include the moved card itself (covers edge cases)
    if (!updates.some((u) => u.id === activeItem.id)) {
      const latest = nextActivities.find((a) => a.id === activeItem.id);
      if (latest) {
        updates.push({
          id: latest.id,
          day_date: latest.day_date,
          order_index: latest.order_index,
        });
      }
    }

    if (updates.length > 0) {
      await persistOrder(updates);
      toast.success(movedAcrossDays ? "Moved to another day" : "Order updated");
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
          err instanceof Error ? err.message : "Failed to upload image"
        );
        throw err;
      }
    }

    if (formState.mode === "create") {
      const order_index = nextOrderIndex(activities, formState.dayDate);
      const distance =
        values.distance_km.trim() === ""
          ? null
          : Number(values.distance_km);
      const { error } = await supabase.from("activities").insert({
        trip_id: trip.id,
        day_date: formState.dayDate,
        time: values.time || null,
        location: values.location || null,
        activity: values.activity || null,
        note: values.note || null,
        distance_km:
          distance != null && Number.isFinite(distance) && distance >= 0
            ? distance
            : null,
        image_url: imageUrl,
        order_index,
      });

      if (error) {
        toast.error("Failed to add activity");
        throw error;
      }

      toast.success("Activity added");
      await loadActivities();
      return;
    }

    const distance =
      values.distance_km.trim() === "" ? null : Number(values.distance_km);
    const { error } = await supabase
      .from("activities")
      .update({
        time: values.time || null,
        location: values.location || null,
        activity: values.activity || null,
        note: values.note || null,
        distance_km:
          distance != null && Number.isFinite(distance) && distance >= 0
            ? distance
            : null,
        image_url: imageUrl,
      })
      .eq("id", formState.activity.id);

    if (error) {
      toast.error("Failed to save");
      throw error;
    }

    toast.success("Saved");
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
      toast.error("Failed to delete");
      throw error;
    }

    if (imageUrl) {
      await deleteActivityImage(imageUrl);
    }

    toast.success("Activity deleted");
    await loadActivities();
  }

  function handleConfirmAddDay() {
    if (!pendingDay) return;
    const key = toDateKey(pendingDay);
    if (dayDates.includes(key)) {
      toast.error("That day is already on the board");
      return;
    }
    setExtraDays((prev) => [...prev, key]);
    setAddDayOpen(false);
    setPendingDay(undefined);
    toast.success(`Added ${formatDayHeading(key)}`);
  }

  async function handleDeleteDay() {
    if (dayToDelete === null) return;
    const day = dayToDelete;

    const toDelete = activities.filter((a) => a.day_date === day);
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from("activities")
        .delete()
        .eq("trip_id", trip.id)
        .eq("day_date", day);

      if (error) {
        toast.error("Failed to delete day");
        setDayToDelete(null);
        return;
      }

      await Promise.all(
        toDelete.map((item) => deleteActivityImage(item.image_url))
      );
    }

    setExtraDays((prev) => prev.filter((d) => d !== day));
    setDayToDelete(null);
    toast.success(`${formatDayHeading(day)} deleted`);
    await loadActivities();
  }

  const formDayDate =
    formState?.mode === "create"
      ? formState.dayDate
      : formState?.mode === "edit"
        ? formState.activity.day_date
        : todayKey();

  return (
    <div className="relative min-h-svh flex-1">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--pastel-sky)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_var(--pastel-blush)_0%,_transparent_45%),radial-gradient(ellipse_at_bottom_left,_var(--pastel-mint)_0%,_transparent_40%)]" />
      <div className="paper-grain pointer-events-none absolute inset-0 opacity-35" />

      <header className="sticky top-0 z-20 border-b border-white/60 bg-[#f4f7f5]/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:px-4">
          <SidebarTrigger
            className="-ml-0.5 size-8 shrink-0"
            aria-label="Toggle trips sidebar"
          />
          <Separator
            orientation="vertical"
            className="mr-1 data-[orientation=vertical]:h-4"
          />
          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
            <span className="hidden shrink-0 text-[var(--ink-muted)] sm:inline">
              TripPlanner
            </span>
            <ChevronRight
              className="hidden size-3.5 shrink-0 text-[var(--ink-muted)] sm:block"
              aria-hidden
            />
            <h1 className="truncate font-medium text-[var(--ink)]">
              {trip.name}
            </h1>
          </div>
          {view === "activities" ? (
            <Popover open={addDayOpen} onOpenChange={setAddDayOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 shrink-0 rounded-full bg-[var(--accent)] px-3 text-white hover:bg-[var(--accent-deep)]"
                >
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">Add day</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[min(100vw-1.5rem,20rem)] rounded-3xl border-white/70 bg-[#fffcfa] p-2 sm:w-auto sm:p-3"
              >
                <Calendar
                  mode="single"
                  selected={pendingDay}
                  onSelect={setPendingDay}
                  disabled={(date) => dayDates.includes(toDateKey(date))}
                  className="mx-auto"
                />
                <Button
                  type="button"
                  className="mt-2 w-full rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)]"
                  disabled={!pendingDay}
                  onClick={handleConfirmAddDay}
                >
                  <CalendarIcon className="size-4" />
                  Add selected day
                </Button>
              </PopoverContent>
            </Popover>
          ) : (
            <p className="max-w-[40%] shrink-0 truncate text-right font-display text-sm text-[var(--accent-deep)] sm:max-w-none">
              {formatMoney(balance)}
            </p>
          )}
        </div>

        <nav className="mx-auto flex max-w-2xl gap-1 px-3 pb-2.5 sm:px-6 sm:pb-3">
          <button
            type="button"
            onClick={() => setView("activities")}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-sm font-medium transition sm:gap-2 sm:px-3",
              view === "activities"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "bg-white/55 text-[var(--ink-soft)] hover:bg-white/90"
            )}
          >
            <CalendarDays className="size-4 shrink-0" />
            <span>Activities</span>
          </button>
          <button
            type="button"
            onClick={() => setView("fund")}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-sm font-medium transition sm:gap-2 sm:px-3",
              view === "fund"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "bg-white/55 text-[var(--ink-soft)] hover:bg-white/90"
            )}
          >
            <Wallet className="size-4 shrink-0" />
            <span className="sm:hidden">Fund</span>
            <span className="hidden sm:inline">Shared fund</span>
          </button>
        </nav>
      </header>

      <div className="relative mx-auto max-w-2xl px-3 pb-[max(4rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-8">
        {view === "fund" ? (
          <div className="animate-fade-up">
            <FundPanel
              tripId={trip.id}
              transactions={transactions}
              onChanged={loadTransactions}
            />
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-3xl bg-white/50"
              />
            ))}
          </div>
        ) : dayDates.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--line)] bg-white/50 px-6 py-16 text-center">
            <p className="font-display text-2xl text-[var(--ink)]">
              No days yet
            </p>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              Pick a date to start planning this trip
            </p>
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
              {dayDates.map((day) => (
                <DaySection
                  key={day}
                  dayDate={day}
                  activities={byDay.get(day) ?? []}
                  onAdd={(dayDate) =>
                    setFormState({ mode: "create", dayDate })
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
        dayDate={formDayDate}
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
              Delete {dayToDelete ? formatDayHeading(dayToDelete) : "this day"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All activities for this day will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-rose-500 text-white hover:bg-rose-600"
              onClick={handleDeleteDay}
            >
              Confirm delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
