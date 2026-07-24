import { supabase } from "@/lib/supabase";

export const ACTIVITY_IMAGES_BUCKET = "activity-images";
const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function getPathFromPublicUrl(url: string | null | undefined) {
  if (!url) return null;
  const marker = `/object/public/${ACTIVITY_IMAGES_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

export async function uploadActivityImage(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only JPG, PNG, WEBP, and GIF are supported");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File must be 3 MB or smaller");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(ACTIVITY_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(error.message || "Failed to upload image");
  }

  const { data } = supabase.storage
    .from(ACTIVITY_IMAGES_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function deleteActivityImage(url: string | null | undefined) {
  const path = getPathFromPublicUrl(url);
  if (!path) return;

  await supabase.storage.from(ACTIVITY_IMAGES_BUCKET).remove([path]);
}
