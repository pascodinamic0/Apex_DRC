import { supabase } from "@/integrations/supabase/client";
import { downloadBlob } from "@/lib/export/consolidated-report";

export const REPORT_PHOTOS_BUCKET = "report-photos";
export const MAX_REPORT_PHOTOS = 20;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_EDGE = 1920;

export type ReportPhoto = {
  id: string;
  report_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  caption: string | null;
  sort_order: number;
  created_at: string;
  previewUrl?: string;
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export function photoExt(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function compressReportPhoto(file: File): Promise<{ blob: Blob; mime: string; name: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("type");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("compress");
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return { blob, mime: "image/jpeg", name: `${base}.jpg` };
}

export async function listReportPhotos(reportId: string): Promise<ReportPhoto[]> {
  const { data, error } = await supabase
    .from("report_photos")
    .select("id, report_id, storage_path, file_name, mime_type, file_size, caption, sort_order, created_at")
    .eq("report_id", reportId)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  const rows = (data || []) as ReportPhoto[];
  const withUrls = await Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await supabase.storage
        .from(REPORT_PHOTOS_BUCKET)
        .createSignedUrl(row.storage_path, 3600);
      return { ...row, previewUrl: signed?.signedUrl };
    }),
  );
  return withUrls;
}

export async function uploadReportPhoto(reportId: string, file: File, userId: string | undefined, sortOrder: number) {
  const compressed = await compressReportPhoto(file);
  if (compressed.blob.size > MAX_PHOTO_BYTES) throw new Error("size");
  const id = crypto.randomUUID();
  const path = `${reportId}/${id}.jpg`;
  const { error: upErr } = await supabase.storage.from(REPORT_PHOTOS_BUCKET).upload(path, compressed.blob, {
    contentType: compressed.mime,
    upsert: false,
  });
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("report_photos")
    .insert({
      id,
      report_id: reportId,
      storage_path: path,
      file_name: compressed.name,
      mime_type: compressed.mime,
      file_size: compressed.blob.size,
      caption: "",
      sort_order: sortOrder,
      uploaded_by: userId ?? null,
    })
    .select("id, report_id, storage_path, file_name, mime_type, file_size, caption, sort_order, created_at")
    .single();
  if (error) {
    await supabase.storage.from(REPORT_PHOTOS_BUCKET).remove([path]);
    throw error;
  }
  const { data: signed } = await supabase.storage.from(REPORT_PHOTOS_BUCKET).createSignedUrl(path, 3600);
  return { ...(data as ReportPhoto), previewUrl: signed?.signedUrl };
}

export async function updatePhotoCaption(id: string, caption: string) {
  const { error } = await supabase.from("report_photos").update({ caption }).eq("id", id);
  if (error) throw error;
}

export async function deleteReportPhoto(photo: Pick<ReportPhoto, "id" | "storage_path">) {
  const { error } = await supabase.from("report_photos").delete().eq("id", photo.id);
  if (error) throw error;
  await supabase.storage.from(REPORT_PHOTOS_BUCKET).remove([photo.storage_path]);
}

export async function downloadReportPhoto(photo: ReportPhoto) {
  const { data, error } = await supabase.storage.from(REPORT_PHOTOS_BUCKET).download(photo.storage_path);
  if (error || !data) throw error || new Error("download");
  downloadBlob(data, photo.file_name || `photo-${photo.id}.jpg`);
}

export async function downloadAllReportPhotos(photos: ReportPhoto[], zipName: string) {
  const files: { name: string; data: Uint8Array }[] = [];
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const { data, error } = await supabase.storage.from(REPORT_PHOTOS_BUCKET).download(photo.storage_path);
    if (error || !data) continue;
    const buf = new Uint8Array(await data.arrayBuffer());
    const safe = (photo.file_name || `photo-${i + 1}.jpg`).replace(/[/\\]/g, "_");
    files.push({ name: `${String(i + 1).padStart(2, "0")}-${safe}`, data: buf });
  }
  if (!files.length) throw new Error("empty");
  downloadBlob(zipStore(files), zipName);
}

export async function photosForPdf(reportId: string): Promise<{ caption: string; jpegDataUrl: string }[]> {
  const photos = await listReportPhotos(reportId);
  const out: { caption: string; jpegDataUrl: string }[] = [];
  for (const photo of photos) {
    const { data, error } = await supabase.storage.from(REPORT_PHOTOS_BUCKET).download(photo.storage_path);
    if (error || !data) continue;
    out.push({
      caption: [photo.caption, photo.file_name].filter(Boolean).join(" — "),
      jpegDataUrl: await blobToJpegDataUrl(data),
    });
  }
  return out;
}

async function blobToJpegDataUrl(blob: Blob) {
  if (blob.type === "image/jpeg" || blob.type === "image/jpg") {
    return await blobToDataUrl(blob);
  }
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return await blobToDataUrl(blob);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  return await blobToDataUrl(jpeg || blob);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number) {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}

function u32(n: number) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function zipStore(files: { name: string; data: Uint8Array }[]) {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);
    const local = concat([
      new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(name.length),
      u16(0),
      name,
      file.data,
    ]);
    const central = concat([
      new Uint8Array([0x50, 0x4b, 0x01, 0x02, 0x14, 0x00, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralDir = concat(centrals);
  const end = concat([
    new Uint8Array([0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00]),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);
  return new Blob([concat([...locals, centralDir, end])], { type: "application/zip" });
}
