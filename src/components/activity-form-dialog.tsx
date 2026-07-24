"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import type { Activity } from "@/lib/types";

export type ActivityFormValues = {
  time: string;
  location: string;
  activity: string;
  note: string;
  image_url: string | null;
  imageFile: File | null;
  removeImage: boolean;
};

type ActivityFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayNumber: number;
  initial?: Activity | null;
  onSave: (values: ActivityFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
};

function toValues(initial?: Activity | null): ActivityFormValues {
  return {
    time: initial?.time ?? "",
    location: initial?.location ?? "",
    activity: initial?.activity ?? "",
    note: initial?.note ?? "",
    image_url: initial?.image_url ?? null,
    imageFile: null,
    removeImage: false,
  };
}

function ActivityFormFields({
  dayNumber,
  initial,
  onOpenChange,
  onSave,
  onDelete,
}: {
  dayNumber: number;
  initial?: Activity | null;
  onOpenChange: (open: boolean) => void;
  onSave: (values: ActivityFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [values, setValues] = useState(() => toValues(initial));
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initial?.image_url ?? null
  );
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(initial);

  function handlePickFile(file: File | undefined) {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setValues((v) => ({
      ...v,
      imageFile: file,
      removeImage: false,
    }));
  }

  function handleRemoveImage() {
    setPreviewUrl(null);
    setValues((v) => ({
      ...v,
      imageFile: null,
      removeImage: true,
      image_url: null,
    }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(values);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setSaving(true);
    try {
      await onDelete();
      setConfirmDelete(false);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <DialogHeader className="border-b border-[var(--line)] px-6 py-5">
          <DialogTitle className="font-display text-2xl text-[var(--ink)]">
            {isEdit ? "แก้ไขกิจกรรม" : "เพิ่มกิจกรรม"}
          </DialogTitle>
          <DialogDescription className="text-[var(--ink-soft)]">
            Day {dayNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={values.time}
              onChange={(e) =>
                setValues((v) => ({ ...v, time: e.target.value }))
              }
              className="rounded-xl bg-white/80"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={values.location}
              onChange={(e) =>
                setValues((v) => ({ ...v, location: e.target.value }))
              }
              placeholder="e.g. Airport / Cafe"
              className="rounded-xl bg-white/80"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activity">Activity</Label>
            <Input
              id="activity"
              value={values.activity}
              onChange={(e) =>
                setValues((v) => ({ ...v, activity: e.target.value }))
              }
              placeholder="เช่น Check-in / Dinner"
              required
              className="rounded-xl bg-white/80"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={values.note}
              onChange={(e) =>
                setValues((v) => ({ ...v, note: e.target.value }))
              }
              placeholder="Additional details"
              rows={3}
              className="rounded-xl bg-white/80"
            />
          </div>

          <div className="space-y-2">
            <Label>Image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handlePickFile(e.target.files?.[0])}
            />

            {previewUrl ? (
              <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-white/70">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Example image"
                  className="max-h-48 w-full object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  className="absolute top-2 right-2 rounded-full bg-white/90"
                  onClick={handleRemoveImage}
                  aria-label="Remove image"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--line)] bg-white/60 px-4 py-8 text-sm text-[var(--ink-soft)] transition hover:bg-white/90"
              >
                <ImagePlus className="size-5 text-[var(--accent)]" />
                Select image (maximum 3 MB)
              </button>
            )}

            {previewUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => fileInputRef.current?.click()}
              >
                Change image
              </Button>
            ) : null}
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 border-t border-[var(--line)] px-6 py-4 sm:justify-between">
          {isEdit && onDelete ? (
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)]"
              disabled={saving || !values.activity.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </form>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-3xl border-white/70 bg-[#fffcfa]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">
                Delete this activity?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deleting this activity cannot be undone
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-rose-500 text-white hover:bg-rose-600"
              onClick={handleDelete}
            >
              Confirm delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ActivityFormDialog({
  open,
  onOpenChange,
  dayNumber,
  initial,
  onSave,
  onDelete,
}: ActivityFormDialogProps) {
  const formKey = initial?.id ?? `create-${dayNumber}-${open}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-3xl border-white/70 bg-[#fffcfa]/95 p-0 shadow-xl sm:max-w-md">
        {open ? (
          <ActivityFormFields
            key={formKey}
            dayNumber={dayNumber}
            initial={initial}
            onOpenChange={onOpenChange}
            onSave={onSave}
            onDelete={onDelete}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
