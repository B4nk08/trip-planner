"use client";

import { useEffect, useState } from "react";
import { Heart, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePartnerSession } from "@/lib/partner-session";
import { supabase } from "@/lib/supabase";
import type { WishlistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatPostTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeItem(row: WishlistItem): WishlistItem {
  return {
    ...row,
    liked_by: Array.isArray(row.liked_by) ? row.liked_by : [],
  };
}

export function WishlistPanel() {
  const { partner } = usePartnerSession();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<WishlistItem | null>(null);

  async function loadItems() {
    const { data, error } = await supabase
      .from("wishlist_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load places");
      setLoading(false);
      return;
    }

    setItems(((data as WishlistItem[]) ?? []).map(normalizeItem));
    setLoading(false);
  }

  useEffect(() => {
    void loadItems();

    const channel = supabase
      .channel("wishlist-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wishlist_items" },
        () => {
          void loadItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    const trimmedPlace = place.trim();
    if (!trimmedPlace) {
      toast.error("Where do you want to go?");
      return;
    }
    if (!partner) {
      toast.error("Please sign in first");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("wishlist_items").insert({
      title: trimmedPlace,
      place: trimmedPlace,
      note: note.trim() || null,
      author_id: partner.id,
      author_name: partner.display_name,
      liked_by: [],
    });
    setSaving(false);

    if (error) {
      toast.error("Failed to post");
      return;
    }

    setPlace("");
    setNote("");
    toast.success("Posted");
    await loadItems();
  }

  async function handleToggleLike(item: WishlistItem) {
    if (!partner || likingId) return;

    const liked = item.liked_by.includes(partner.id);
    const nextLikes = liked
      ? item.liked_by.filter((id) => id !== partner.id)
      : [...item.liked_by, partner.id];

    setLikingId(item.id);
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, liked_by: nextLikes } : row
      )
    );

    const { error } = await supabase
      .from("wishlist_items")
      .update({ liked_by: nextLikes })
      .eq("id", item.id);

    setLikingId(null);

    if (error) {
      toast.error("Could not update like");
      await loadItems();
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("id", toDelete.id);

    if (error) {
      toast.error("Failed to delete");
      setToDelete(null);
      return;
    }

    toast.success("Post removed");
    setToDelete(null);
    await loadItems();
  }

  return (
    <>
      <div className="relative min-h-svh flex-1">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--pastel-sky)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_var(--pastel-blush)_0%,_transparent_45%),radial-gradient(ellipse_at_bottom_left,_var(--pastel-mint)_0%,_transparent_40%)]" />
        <div className="paper-grain pointer-events-none absolute inset-0 opacity-35" />

        <header className="sticky top-0 z-20 border-b border-white/60 bg-[#f4f7f5]/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:px-4">
            <SidebarTrigger
              className="-ml-0.5 size-8 shrink-0"
              aria-label="Toggle sidebar"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] tracking-[0.16em] text-[var(--ink-muted)] uppercase">
                You & Me
              </p>
              <h1 className="truncate font-display text-lg text-[var(--ink)] sm:text-xl">
                Places we want to go
              </h1>
            </div>
          </div>
        </header>

        <div className="relative mx-auto max-w-lg space-y-4 px-4 py-6 sm:px-6">
          <form
            onSubmit={handlePost}
            className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_12px_40px_-28px_rgba(90,120,140,0.45)] backdrop-blur-sm"
          >
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
                {(partner?.display_name ?? "?").trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--ink)]">
                  {partner?.display_name ?? "You"}
                </p>
                <p className="text-[11px] text-[var(--ink-muted)]">
                  Share a place you want to visit
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="wish-place" className="sr-only">
                  Place
                </Label>
                <Input
                  id="wish-place"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="Where do we want to go?"
                  className="rounded-2xl border-white/80 bg-white/90"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wish-note" className="sr-only">
                  Why
                </Label>
                <Textarea
                  id="wish-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why this place? (optional)"
                  className="min-h-20 resize-none rounded-2xl border-white/80 bg-white/90"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[var(--accent)] px-5 text-white hover:bg-[var(--accent-deep)]"
                >
                  <Plus className="size-4" />
                  {saving ? "Posting…" : "Post"}
                </Button>
              </div>
            </div>
          </form>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--pastel-mint)]" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--ink-muted)]">
              No places yet — post somewhere you both dream of going
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const liked =
                  !!partner && item.liked_by.includes(partner.id);
                const likeCount = item.liked_by.length;
                const author =
                  item.author_name?.trim() ||
                  (item.author_id === partner?.id
                    ? partner.display_name
                    : "Partner");

                return (
                  <li
                    key={item.id}
                    className="animate-fade-up rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_12px_40px_-28px_rgba(90,120,140,0.4)] backdrop-blur-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--pastel-blush)] text-sm font-semibold text-[var(--ink)]">
                        {author.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--ink)]">
                              {author}
                            </p>
                            <p className="text-[11px] text-[var(--ink-muted)]">
                              {formatPostTime(item.created_at)}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-[var(--ink-muted)] transition hover:bg-rose-50 hover:text-rose-500"
                            onClick={() => setToDelete(item)}
                            aria-label={`Delete ${item.place ?? item.title}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>

                        <h2 className="mt-3 flex items-start gap-1.5 font-display text-xl leading-snug text-[var(--ink)]">
                          <MapPin className="mt-1 size-4 shrink-0 text-[var(--accent)]" />
                          <span>{item.place ?? item.title}</span>
                        </h2>

                        {item.note ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink-soft)]">
                            {item.note}
                          </p>
                        ) : null}

                        <div className="mt-4 flex items-center gap-2 border-t border-[var(--line)] pt-3">
                          <button
                            type="button"
                            disabled={!partner || likingId === item.id}
                            onClick={() => void handleToggleLike(item)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
                              liked
                                ? "bg-rose-50 text-rose-500"
                                : "text-[var(--ink-muted)] hover:bg-rose-50/70 hover:text-rose-500"
                            )}
                            aria-pressed={liked}
                            aria-label={liked ? "Unlike" : "Like"}
                          >
                            <Heart
                              className={cn(
                                "size-4",
                                liked && "fill-current"
                              )}
                            />
                            <span>{liked ? "Liked" : "Like"}</span>
                            {likeCount > 0 ? (
                              <span className="tabular-nums text-[var(--ink-soft)]">
                                {likeCount}
                              </span>
                            ) : null}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this post?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? `“${toDelete.place ?? toDelete.title}” will be removed.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-rose-500 text-white hover:bg-rose-600"
              onClick={() => void handleDelete()}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
