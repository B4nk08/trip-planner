"use client";

import { useMemo, useState } from "react";
import { CalendarIcon, MapPinned, Pencil, Plus, Trash2 } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatShortDate,
  toDateKey,
  todayKey,
} from "@/lib/activities";
import type { Trip } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type AppSidebarProps = {
  trips: Trip[];
  selectedTripId: string | null;
  onSelect: (tripId: string) => void;
  onCreate: (
    name: string,
    initialFund: number,
    startDate: string,
    endDate: string
  ) => Promise<void>;
  onRename: (tripId: string, name: string) => Promise<void>;
  onDelete: (tripId: string) => Promise<void>;
};

function tripInitial(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "T";
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function AppSidebar({
  trips,
  selectedTripId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: AppSidebarProps) {
  const { isMobile, setOpenMobile, state } = useSidebar();
  const isNarrow = useIsMobile();
  const collapsed = state === "collapsed" && !isMobile;
  const [nameDialog, setNameDialog] = useState<
    | { mode: "create" }
    | { mode: "rename"; trip: Trip }
    | null
  >(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [initialFund, setInitialFund] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [rangeOpen, setRangeOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = useMemo(() => startOfToday(), []);

  const rangeLabel = useMemo(() => {
    if (!dateRange?.from) return "Select travel dates";
    const fromKey = toDateKey(dateRange.from);
    if (!dateRange.to) return `${formatShortDate(fromKey)} – …`;
    return `${formatShortDate(fromKey)} – ${formatShortDate(toDateKey(dateRange.to))}`;
  }, [dateRange]);

  function handleSelectTrip(tripId: string) {
    onSelect(tripId);
    if (isMobile) setOpenMobile(false);
  }

  function openCreate() {
    setNameValue("");
    setInitialFund("");
    setDateRange({ from: today, to: undefined });
    setRangeOpen(false);
    setNameDialog({ mode: "create" });
  }

  function openRename(trip: Trip) {
    setNameValue(trip.name);
    setInitialFund("");
    setDateRange(undefined);
    setNameDialog({ mode: "rename", trip });
  }

  async function handleSaveName() {
    const name = nameValue.trim();
    if (!name || !nameDialog) return;

    if (nameDialog.mode === "create") {
      const fund = Number(initialFund);
      if (!Number.isFinite(fund) || fund <= 0) {
        toast.error("Please set a starting fund greater than 0");
        return;
      }
      if (!dateRange?.from || !dateRange?.to) {
        toast.error("Please select departure and return dates");
        return;
      }
      if (dateRange.from < today) {
        toast.error("Departure cannot be before today");
        return;
      }
    }

    setSaving(true);
    try {
      if (nameDialog.mode === "create") {
        await onCreate(
          name,
          Number(initialFund),
          toDateKey(dateRange!.from!),
          toDateKey(dateRange!.to!)
        );
        toast.success("Trip created");
      } else {
        await onRename(nameDialog.trip.id, name);
        toast.success("Trip renamed");
      }
      setNameDialog(null);
    } catch {
      toast.error(
        nameDialog.mode === "create"
          ? "Failed to create trip"
          : "Failed to rename trip"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTrip() {
    if (!tripToDelete) return;
    setSaving(true);
    try {
      await onDelete(tripToDelete.id);
      toast.success("Trip deleted");
      setTripToDelete(null);
    } catch {
      toast.error("Failed to delete trip");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Sidebar collapsible="icon" className="border-[var(--line)]">
        <SidebarHeader className="flex flex-row items-center gap-2 px-2 py-3 group-data-[collapsible=icon]:justify-center">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-sm"
            title="TripPlanner"
          >
            <MapPinned className="size-4" />
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate font-display text-base leading-tight text-[var(--ink)]">
              TripPlanner
            </p>
            <p className="truncate text-[11px] text-[var(--ink-muted)]">
              Your trips
            </p>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="group-data-[collapsible=icon]:px-1">
            <SidebarGroupLabel>Trips</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {trips.map((trip) => {
                  const active = trip.id === selectedTripId;
                  return (
                    <SidebarMenuItem key={trip.id} className="group/trip">
                      <SidebarMenuButton
                        isActive={active}
                        onClick={() => handleSelectTrip(trip.id)}
                        tooltip={trip.name}
                        className={cn(
                          "font-medium",
                          !collapsed && "pr-16"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
                            active
                              ? "bg-[var(--accent)] text-white"
                              : "bg-[var(--pastel-mint)] text-[var(--ink)]"
                          )}
                        >
                          {tripInitial(trip.name)}
                        </span>
                        <span className="truncate">{trip.name}</span>
                      </SidebarMenuButton>
                      <div
                        className={cn(
                          "absolute top-1.5 right-1 flex items-center gap-0.5 opacity-0 transition group-hover/trip:opacity-100 group-data-[collapsible=icon]:hidden",
                          active && "opacity-100"
                        )}
                      >
                        <button
                          type="button"
                          className="rounded-md p-1 text-[var(--ink-muted)] hover:bg-white/80 hover:text-[var(--ink)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRename(trip);
                          }}
                          aria-label={`Rename ${trip.name}`}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTripToDelete(trip);
                          }}
                          aria-label={`Delete ${trip.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="New trip"
                onClick={openCreate}
                className="bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)] hover:text-white data-active:bg-[var(--accent-deep)] data-active:text-white"
              >
                <Plus className="size-4" />
                <span>New trip</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <Dialog
        open={nameDialog !== null}
        onOpenChange={(open) => {
          if (!open) setNameDialog(null);
        }}
      >
        <DialogContent
          className={cn(
            "rounded-3xl border-white/70 bg-[#fffcfa]",
            nameDialog?.mode === "create"
              ? "sm:max-w-[min(92vw,44rem)]"
              : "sm:max-w-sm"
          )}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {nameDialog?.mode === "rename" ? "Rename trip" : "New trip"}
            </DialogTitle>
            <DialogDescription>
              {nameDialog?.mode === "rename"
                ? "Update the trip name"
                : "Pick dates, set the starting fund, and name your trip"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="trip-name">Trip name</Label>
              <Input
                id="trip-name"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                placeholder="My Trip"
                className="rounded-xl"
                autoFocus={nameDialog?.mode === "rename"}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nameDialog?.mode === "rename") {
                    void handleSaveName();
                  }
                }}
              />
            </div>

            {nameDialog?.mode === "create" ? (
              <>
                <div className="space-y-2">
                  <Label>Travel dates</Label>
                  <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-10 w-full justify-start rounded-xl border-[var(--line)] bg-white/80 font-normal",
                          !dateRange?.from && "text-[var(--ink-muted)]"
                        )}
                      >
                        <CalendarIcon className="size-4 text-[var(--accent)]" />
                        {rangeLabel}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      sideOffset={8}
                      className="w-auto rounded-3xl border-white/70 bg-[#fffcfa] p-3 shadow-xl"
                    >
                      <Calendar
                        mode="range"
                        numberOfMonths={isNarrow ? 1 : 2}
                        selected={dateRange}
                        onSelect={(range) => {
                          setDateRange(range);
                          if (range?.from && range?.to) {
                            setRangeOpen(false);
                          }
                        }}
                        disabled={{ before: today }}
                        defaultMonth={today}
                        className="rounded-2xl bg-[#fffcfa]"
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-[var(--ink-muted)]">
                    From today onward — departure through return. Empty day
                    boards are created automatically.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trip-fund">Starting shared fund</Label>
                  <Input
                    id="trip-fund"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={initialFund}
                    onChange={(e) => setInitialFund(e.target.value)}
                    placeholder="e.g. 5000"
                    className="rounded-xl"
                    required
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSaveName();
                    }}
                  />
                  <p className="text-xs text-[var(--ink-muted)]">
                    This becomes the trip fund balance. You can receive or pay
                    later.
                  </p>
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setNameDialog(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)]"
              onClick={() => void handleSaveName()}
              disabled={
                saving ||
                !nameValue.trim() ||
                (nameDialog?.mode === "create" &&
                  (!initialFund ||
                    Number(initialFund) <= 0 ||
                    !dateRange?.from ||
                    !dateRange?.to))
              }
            >
              {saving ? "Saving..." : "Create trip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={tripToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTripToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl border-white/70 bg-[#fffcfa]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">
              Delete “{tripToDelete?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all activities and fund transactions
              for this trip.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" disabled={saving}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-rose-500 text-white hover:bg-rose-600"
              onClick={() => void handleDeleteTrip()}
              disabled={saving}
            >
              Confirm delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
