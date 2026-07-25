"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { MemoriesPanel } from "@/components/memories-panel";
import { TripBoard } from "@/components/trip-board";
import { WishlistPanel } from "@/components/wishlist-panel";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { isPastTrip } from "@/lib/activities";
import { deleteActivityImage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import {
  clearStoredTripId,
  getStoredTripId,
  setStoredTripId,
} from "@/lib/trips";
import type { AppSection, Trip } from "@/lib/types";

export function TripApp() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [section, setSection] = useState<AppSection>("trips");
  const [loading, setLoading] = useState(true);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) ?? null,
    [trips, selectedTripId]
  );

  const pastTrips = useMemo(
    () =>
      [...trips.filter(isPastTrip)].sort((a, b) =>
        (b.end_date ?? "").localeCompare(a.end_date ?? "")
      ),
    [trips]
  );

  const selectTrip = useCallback((tripId: string) => {
    setSelectedTripId(tripId);
    setStoredTripId(tripId);
    setSection("trips");
  }, []);

  const loadTrips = useCallback(async () => {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load trips");
      setLoading(false);
      return [] as Trip[];
    }

    const list = (data as Trip[]) ?? [];
    setTrips(list);

    if (list.length === 0) {
      clearStoredTripId();
      setSelectedTripId(null);
      setLoading(false);
      return list;
    }

    const stored = getStoredTripId();
    const stillValid = stored && list.some((t) => t.id === stored);
    const nextId = stillValid ? stored! : list[0].id;
    setSelectedTripId(nextId);
    setStoredTripId(nextId);
    setLoading(false);
    return list;
  }, []);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  useEffect(() => {
    const channel = supabase
      .channel("trips-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        () => {
          void loadTrips();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTrips]);

  async function handleCreate(
    name: string,
    initialFund: number,
    startDate: string,
    endDate: string
  ) {
    const { data, error } = await supabase
      .from("trips")
      .insert({
        name,
        start_date: startDate,
        end_date: endDate,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("create failed");
    }

    const trip = data as Trip;

    const { error: fundError } = await supabase
      .from("fund_transactions")
      .insert({
        trip_id: trip.id,
        type: "receive",
        amount: initialFund,
        reason: "Starting shared fund",
      });

    if (fundError) {
      await supabase.from("trips").delete().eq("id", trip.id);
      throw fundError;
    }

    setTrips((prev) => [...prev, trip]);
    selectTrip(trip.id);
  }

  async function handleRename(tripId: string, name: string) {
    const { error } = await supabase
      .from("trips")
      .update({ name })
      .eq("id", tripId);

    if (error) throw error;

    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, name } : t))
    );
  }

  async function handleDelete(tripId: string) {
    const { data: activities } = await supabase
      .from("activities")
      .select("image_url")
      .eq("trip_id", tripId);

    const { error } = await supabase.from("trips").delete().eq("id", tripId);
    if (error) throw error;

    if (activities) {
      await Promise.all(
        activities.map((a) => deleteActivityImage(a.image_url))
      );
    }

    const remaining = trips.filter((t) => t.id !== tripId);
    setTrips(remaining);

    if (remaining.length === 0) {
      clearStoredTripId();
      setSelectedTripId(null);
      return;
    }

    if (selectedTripId === tripId) {
      selectTrip(remaining[0].id);
    }
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar
        trips={trips}
        selectedTripId={selectedTripId}
        section={section}
        onSectionChange={setSection}
        onSelect={selectTrip}
        onCreate={handleCreate}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      <SidebarInset>
        {loading ? (
          <div className="flex min-h-svh flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--pastel-mint)]" />
          </div>
        ) : section === "wishlist" ? (
          <WishlistPanel />
        ) : section === "memories" ? (
          <MemoriesPanel trips={pastTrips} onOpenTrip={selectTrip} />
        ) : selectedTrip ? (
          <TripBoard key={selectedTrip.id} trip={selectedTrip} />
        ) : (
          <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="font-display text-2xl text-[var(--ink)]">
              No trips yet
            </p>
            <p className="max-w-sm text-sm text-[var(--ink-soft)]">
              Open the sidebar and tap New trip to plan your first adventure
              together
            </p>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
