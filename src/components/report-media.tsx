import { useEffect, useRef, useState } from "react";
import { Download, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  MAX_PHOTO_BYTES,
  MAX_REPORT_PHOTOS,
  deleteReportPhoto,
  downloadAllReportPhotos,
  downloadReportPhoto,
  listReportPhotos,
  updatePhotoCaption,
  uploadReportPhoto,
  type ReportPhoto,
} from "@/lib/report-photos";

export function ReportMediaPanel({
  reportId,
  readOnly,
  zipBaseName,
}: {
  reportId: string;
  readOnly: boolean;
  zipBaseName: string;
}) {
  const { t } = useT();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const load = async () => {
    try {
      setPhotos(await listReportPhotos(reportId));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    if (!navigator.onLine) {
      toast.error(t.photoUploadOffline);
      return;
    }
    setBusy(true);
    let currentCount = photos.length;
    try {
      for (const file of Array.from(list)) {
        if (currentCount >= MAX_REPORT_PHOTOS) {
          toast.error(t.photoTooMany.replace("{max}", String(MAX_REPORT_PHOTOS)));
          break;
        }
        if (file.size > MAX_PHOTO_BYTES * 3) {
          toast.error(`${file.name}: ${t.photoTooLarge}`);
          continue;
        }
        try {
          const row = await uploadReportPhoto(reportId, file, user?.id, currentCount);
          currentCount += 1;
          setPhotos((prev) => [...prev, row]);
        } catch (e: unknown) {
          const code = e instanceof Error ? e.message : "";
          if (code === "type") toast.error(`${file.name}: ${t.photoTypeInvalid}`);
          else if (code === "size") toast.error(`${file.name}: ${t.photoTooLarge}`);
          else toast.error(e instanceof Error ? e.message : t.photoUploadFailed);
        }
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (photo: ReportPhoto) => {
    if (!confirm(t.confirmDeletePhoto)) return;
    try {
      await deleteReportPhoto(photo);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      toast.success(t.photoDeleted);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>{t.tabMedia}</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">{t.mediaHint}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {photos.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await downloadAllReportPhotos(photos, `${zipBaseName || "epic-photos"}.zip`);
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : t.error);
                }
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              {t.downloadAllPhotos}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!readOnly && (
          <div
            className={`mb-4 rounded-xl border border-dashed p-4 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-muted/20"}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy && photos.length < MAX_REPORT_PHOTOS) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (busy || photos.length >= MAX_REPORT_PHOTOS) return;
              onFiles(e.dataTransfer.files);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <Button
              type="button"
              size="sm"
              disabled={busy || photos.length >= MAX_REPORT_PHOTOS}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-1" />}
              {t.uploadPhotos}
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">{t.uploadPhotosHint}</p>
          </div>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">{t.loading}</p>
        ) : photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.mediaEmpty}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {photos.map((photo) => (
              <figure key={photo.id} className="rounded-lg border bg-background overflow-hidden">
                {photo.previewUrl ? (
                  <img
                    src={photo.previewUrl}
                    alt={photo.caption || photo.file_name}
                    className="w-full h-48 object-cover bg-muted"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted" />
                )}
                <figcaption className="p-3 space-y-2">
                  <Input
                    value={photo.caption ?? ""}
                    disabled={readOnly}
                    placeholder={t.photoCaptionPlaceholder}
                    onChange={(e) =>
                      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, caption: e.target.value } : p)))
                    }
                    onBlur={async (e) => {
                      if (readOnly) return;
                      try {
                        await updatePhotoCaption(photo.id, e.target.value);
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : t.error);
                      }
                    }}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground truncate">{photo.file_name}</span>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => downloadReportPhoto(photo)}>
                        <Download className="h-4 w-4" />
                        <span className="sr-only">{t.downloadPhoto}</span>
                      </Button>
                      {!readOnly && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(photo)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">{t.deletePhoto}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          {t.photosCount.replace("{count}", String(photos.length)).replace("{max}", String(MAX_REPORT_PHOTOS))}
        </p>
      </CardContent>
    </Card>
  );
}
