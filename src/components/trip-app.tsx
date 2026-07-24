"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { TripBoard } from "@/components/trip-board";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { deleteActivityImage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import {
  clearStoredTripId,
  getStoredTripId,
  setStoredTripId,
} from "@/lib/trips";
import type { Trip } from "@/lib/types";

export function TripApp() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) ?? null,
    [trips, selectedTripId]
  );

  const selectTrip = useCallback((tripId: string) => {
    setSelectedTripId(tripId);
    setStoredTripId(tripId);
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

    let list = (data as Trip[]) ?? [];

    if (list.length === 0) {
      const { data: created, error: createError } = await supabase
        .from("trips")
        .insert({ name: "My Trip" })
        .select("*")
        .single();

      if (createError || !created) {
        toast.error("Failed to create default trip");
        setLoading(false);
        return [];
      }

      list = [created as Trip];
    }

    setTrips(list);

    const stored = getStoredTripId();
    const stillValid = stored && list.some((t) => t.id === stored);
    const nextId = stillValid ? stored : list[0].id;
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

  async function handleCreate(name: string, initialFund: number) {
    const { data, error } = await supabase
      .from("trips")
      .insert({ name })
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
      await loadTrips();
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
        onSelect={selectTrip}
        onCreate={handleCreate}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      <SidebarInset>
        {loading || !selectedTrip ? (
          <div className="flex min-h-svh flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--pastel-mint)]" />
          </div>
        ) : (
          <TripBoard key={selectedTrip.id} trip={selectedTrip} />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
