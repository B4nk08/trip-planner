"use client";

import { useMemo, useState } from "react";
import {
  CalendarIcon,
  ChevronDown,
  History,
  LogOut,
  MapPinned,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { type DateRange } from "react-day-picker";
import { toast } from "sonner";
import { usePartnerSession } from "@/lib/partner-session";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
  isActiveTrip,
  isPastTrip,
  toDateKey,
} from "@/lib/activities";
import type { AppSection, Trip } from "@/lib/types";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  trips: Trip[];
  selectedTripId: string | null;
  section: AppSection;
  onSectionChange: (section: AppSection) => void;
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
  section,
  onSectionChange,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: AppSidebarProps) {
  const { partner, logout } = usePartnerSession();
  const { isMobile, setOpenMobile, state } = useSidebar();
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
  const [tripsOpen, setTripsOpen] = useState(true);
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const today = useMemo(() => startOfToday(), []);

  const activeTrips = useMemo(
    () => trips.filter(isActiveTrip),
    [trips]
  );
  const pastTrips = useMemo(
    () =>
      [...trips.filter(isPastTrip)].sort((a, b) =>
        (b.end_date ?? "").localeCompare(a.end_date ?? "")
      ),
    [trips]
  );

  const departureLabel = dateRange?.from
    ? formatShortDate(toDateKey(dateRange.from))
    : "Departure";
  const returnLabel = dateRange?.to
    ? formatShortDate(toDateKey(dateRange.to))
    : "Return";

  function handleSelectTrip(tripId: string) {
    onSectionChange("trips");
    onSelect(tripId);
    if (isMobile) setOpenMobile(false);
  }

  function handleOpenWishlist() {
    onSectionChange("wishlist");
    if (isMobile) setOpenMobile(false);
  }

  function handleOpenMemories() {
    onSectionChange("memories");
    setMemoriesOpen(true);
    if (isMobile) setOpenMobile(false);
  }

  function openCreate() {
    setNameValue("");
    setInitialFund("");
    setDateRange(undefined);
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
        <SidebarHeader className="p-2 group-data-[collapsible=icon]:items-center">
          <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-1 py-1.5 text-left transition hover:bg-white/70",
                  "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                )}
                aria-label="Account menu"
              >
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-sm"
                  title={partner?.display_name ?? "You & Me"}
                >
                  <span className="text-xs font-semibold">
                    {partner
                      ? partner.display_name.trim().charAt(0).toUpperCase()
                      : "♥"}
                  </span>
                </div>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate font-display text-base leading-tight text-[var(--ink)]">
                    {partner?.display_name ?? "You & Me"}
                  </p>
                  <p className="truncate text-[11px] text-[var(--ink-muted)]">
                    {partner ? `@${partner.username}` : "Our trips together"}
                  </p>
                </div>
                <ChevronDown className="size-3.5 shrink-0 text-[var(--ink-muted)] group-data-[collapsible=icon]:hidden" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="bottom"
              className="w-52 rounded-2xl border-white/70 bg-[#fffcfa] p-1.5 shadow-lg"
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[var(--ink)] transition hover:bg-rose-50 hover:text-rose-600"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </PopoverContent>
          </Popover>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="group-data-[collapsible=icon]:px-1">
            <div
              className={cn(
                "mb-1 flex h-8 w-full items-center gap-1 rounded-md",
                "group-data-[collapsible=icon]:justify-center"
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setTripsOpen((open) => !open);
                  onSectionChange("trips");
                }}
                className={cn(
                  "flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-xs font-medium tracking-wide text-[var(--ink-muted)] uppercase transition hover:bg-[var(--pastel-mint)]/50 hover:text-[var(--ink)]",
                  "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                  section === "trips" && "bg-[var(--pastel-mint)]/40 text-[var(--ink)]"
                )}
                aria-expanded={tripsOpen}
              >
                <MapPinned className="size-3.5 shrink-0 group-data-[collapsible=icon]:size-4" />
                <span className="flex-1 truncate group-data-[collapsible=icon]:hidden">
                  Trips
                </span>
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 transition-transform group-data-[collapsible=icon]:hidden",
                    tripsOpen ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--accent)] transition hover:bg-[var(--pastel-mint)]/60 group-data-[collapsible=icon]:hidden"
                aria-label="New trip"
                title="New trip"
              >
                <Plus className="size-3.5" />
              </button>
            </div>

            <SidebarGroupContent
              hidden={!tripsOpen}
              className={cn(
                "overflow-hidden transition-all duration-200",
                tripsOpen ? "mt-0 opacity-100" : "pointer-events-none h-0 opacity-0"
              )}
            >
              <SidebarMenu>
                {activeTrips.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-[var(--ink-muted)] group-data-[collapsible=icon]:hidden">
                    No active trips
                  </p>
                ) : (
                  activeTrips.map((trip) => {
                    const active =
                      section === "trips" && trip.id === selectedTripId;
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
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="group-data-[collapsible=icon]:px-1">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={section === "wishlist"}
                  tooltip="Want to go"
                  onClick={handleOpenWishlist}
                  className="font-medium"
                >
                  <Sparkles className="size-4" />
                  <span>Want to go</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup className="group-data-[collapsible=icon]:px-1">
            <button
              type="button"
              onClick={() => {
                setMemoriesOpen((open) => !open);
                onSectionChange("memories");
              }}
              className={cn(
                "mb-1 flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs font-medium tracking-wide text-[var(--ink-muted)] uppercase transition hover:bg-[var(--pastel-mint)]/50 hover:text-[var(--ink)]",
                "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                section === "memories" &&
                  "bg-[var(--pastel-mint)]/40 text-[var(--ink)]"
              )}
              aria-expanded={memoriesOpen}
            >
              <History className="size-3.5 shrink-0 group-data-[collapsible=icon]:size-4" />
              <span className="flex-1 truncate group-data-[collapsible=icon]:hidden">
                Been there
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 transition-transform group-data-[collapsible=icon]:hidden",
                  memoriesOpen ? "rotate-0" : "-rotate-90"
                )}
              />
            </button>

            <SidebarGroupContent
              hidden={!memoriesOpen}
              className={cn(
                "overflow-hidden transition-all duration-200",
                memoriesOpen
                  ? "mt-0 opacity-100"
                  : "pointer-events-none h-0 opacity-0"
              )}
            >
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={section === "memories"}
                    tooltip="All past trips"
                    onClick={handleOpenMemories}
                    className="font-medium"
                  >
                    <History className="size-4" />
                    <span>View all</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {pastTrips.slice(0, 5).map((trip) => (
                  <SidebarMenuItem key={trip.id}>
                    <SidebarMenuButton
                      isActive={
                        section === "trips" && trip.id === selectedTripId
                      }
                      onClick={() => handleSelectTrip(trip.id)}
                      tooltip={trip.name}
                      className="font-medium"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-[var(--pastel-blush)] text-[11px] font-semibold text-[var(--ink)]">
                        {tripInitial(trip.name)}
                      </span>
                      <span className="truncate">{trip.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {pastTrips.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-[var(--ink-muted)] group-data-[collapsible=icon]:hidden">
                    No past trips yet
                  </p>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

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
            "gap-0 overflow-visible rounded-[1.75rem] border-white/70 bg-[#fffcfa] p-0 sm:max-w-md",
            nameDialog?.mode === "create" && "sm:max-w-lg"
          )}
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('[data-slot="popover-content"]')) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('[data-slot="popover-content"]')) {
              e.preventDefault();
            }
          }}
          onFocusOutside={(e) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('[data-slot="popover-content"]')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="space-y-1.5 px-6 pt-6 pb-4 sm:px-8 sm:pt-8">
            <DialogTitle className="font-display text-3xl">
              {nameDialog?.mode === "rename" ? "Rename trip" : "New trip"}
            </DialogTitle>
            <DialogDescription className="text-base text-[var(--ink-soft)]">
              {nameDialog?.mode === "rename"
                ? "Update the trip name"
                : "Name it, pick the days, set the fund"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-6 pb-2 sm:px-8">
            <div className="space-y-2">
              <Label htmlFor="trip-name" className="text-sm">
                Trip name
              </Label>
              <Input
                id="trip-name"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                placeholder="Summer in Japan"
                className="h-12 rounded-2xl border-[var(--line)] bg-white/90 text-base"
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
                  <Label className="text-sm">Travel dates</Label>
                  <Popover modal open={rangeOpen} onOpenChange={setRangeOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "grid w-full grid-cols-2 gap-3 rounded-2xl text-left transition",
                          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-3.5 ring-1 ring-[var(--line)]",
                            dateRange?.from
                              ? "bg-[var(--pastel-mint)]/70"
                              : "bg-white/90"
                          )}
                        >
                          <p className="text-[11px] tracking-[0.14em] text-[var(--ink-muted)] uppercase">
                            From
                          </p>
                          <p className="mt-1 truncate text-base font-medium text-[var(--ink)]">
                            {departureLabel}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-3.5 ring-1 ring-[var(--line)]",
                            dateRange?.to
                              ? "bg-[var(--pastel-mint)]/70"
                              : "bg-white/90"
                          )}
                        >
                          <p className="text-[11px] tracking-[0.14em] text-[var(--ink-muted)] uppercase">
                            To
                          </p>
                          <p className="mt-1 truncate text-base font-medium text-[var(--ink)]">
                            {returnLabel}
                          </p>
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="center"
                      side="bottom"
                      sideOffset={10}
                      className="z-[100] w-auto rounded-3xl border-white/80 bg-[#fffcfa] p-4 shadow-xl"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="mb-2 flex items-center gap-2 px-1 text-sm text-[var(--ink-muted)]">
                        <CalendarIcon className="size-4 text-[var(--accent)]" />
                        Tap departure, then return
                      </div>
                      <Calendar
                        mode="range"
                        numberOfMonths={1}
                        selected={dateRange}
                        onSelect={(range) => {
                          setDateRange(range);
                          if (range?.from && range?.to) {
                            setRangeOpen(false);
                          }
                        }}
                        disabled={{ before: today }}
                        defaultMonth={dateRange?.from ?? today}
                        showOutsideDays={false}
                        className="[--cell-size:2.75rem]"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trip-fund" className="text-sm">
                    Starting fund
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base text-[var(--ink-muted)]">
                      ฿
                    </span>
                    <Input
                      id="trip-fund"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={initialFund}
                      onChange={(e) => setInitialFund(e.target.value)}
                      placeholder="5000"
                      className="h-12 rounded-2xl border-[var(--line)] bg-white/90 pl-9 text-base"
                      required
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleSaveName();
                      }}
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter className="mt-4 gap-3 border-t-0 bg-transparent px-6 pt-1 pb-6 sm:justify-stretch sm:px-8 sm:pb-8">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 rounded-full text-base"
              onClick={() => setNameDialog(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-12 flex-1 rounded-full bg-[var(--accent)] text-base text-white hover:bg-[var(--accent-deep)]"
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
              {saving
                ? "Saving…"
                : nameDialog?.mode === "rename"
                  ? "Save"
                  : "Create trip"}
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
