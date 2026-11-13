"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { UploadDropzone } from "@/components/orders/upload-dropzone";
import {
  IMAGE_ACCEPT,
  PDF_ACCEPT,
  VIDEO_ACCEPT,
  validateUpload,
  type UploadCategory,
} from "@/lib/media/validation";
import { requestPermission, showErrorDialog } from "@/lib/ui/feedback";

type Item = {
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
};

const CONFIG: Record<
  UploadCategory,
  { accept: string; label: string; deniedAction: string; noun: string }
> = {
  photos: {
    accept: IMAGE_ACCEPT,
    label: "Drop images here or click to select",
    deniedAction: "upload or delete photos",
    noun: "image",
  },
  videos: {
    accept: VIDEO_ACCEPT,
    label: "Drop videos here or click to select",
    deniedAction: "upload or delete videos",
    noun: "video",
  },
  floorplans: {
    accept: IMAGE_ACCEPT,
    label: "Drop floor plan images here or click to select",
    deniedAction: "upload or delete floor plans",
    noun: "image",
  },
  attachments: {
    accept: PDF_ACCEPT,
    label: "Drop PDFs here or click to select",
    deniedAction: "upload or delete attachments",
    noun: "PDF",
  },
  "reels-sources": {
    accept: IMAGE_ACCEPT,
    label: "Drop images here or click to select",
    deniedAction: "manage reel images",
    noun: "image",
  },
};

export function MediaUploader({
  orderId,
  category,
  onUploaded,
  refreshToken = 0,
  canManage = true,
  maxFiles,
  hint,
  onDenied,
}: {
  orderId: string;
  category: UploadCategory;
  onUploaded?: () => void;
  refreshToken?: number;
  canManage?: boolean;
  maxFiles?: number;
  hint?: string;
  onDenied?: () => void;
}) {
  const config = CONFIG[category];
  const denied = () =>
    onDenied ? onDenied() : requestPermission(config.deniedAction);
  const endpoint = `/api/orders/${orderId}/media/${category}`;
  const [isConfigured, setIsConfigured] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [uploading, setUploading] = useState(false);
  const [existingCount, setExistingCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoStartRef = useRef(false);

  useEffect(() => {
    fetch("/api/s3-status")
      .then((r) => r.json())
      .then((d) => setIsConfigured(Boolean(d.isConfigured)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (maxFiles == null) return;
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => setExistingCount(Array.isArray(arr) ? arr.length : 0))
      .catch(() => {});
  }, [endpoint, maxFiles, refreshToken]);

  useEffect(() => {
    if (
      autoStartRef.current &&
      items.some((i) => i.status === "queued" || i.status === "error") &&
      !uploading
    ) {
      autoStartRef.current = false;
      void handleUpload();
    }
  }, [items, uploading]);

  function addFiles(files: FileList | File[]) {
    const all = Array.from(files);
    const valid: File[] = [];
    const rejected: string[] = [];

    for (const file of all) {
      const result = validateUpload(category, file.type, file.name);
      if (result.ok) valid.push(file);
      else rejected.push(result.error);
    }

    if (rejected.length) {
      showErrorDialog(
        rejected[0] + (rejected.length > 1 ? ` (${rejected.length - 1} more file(s) skipped)` : ""),
        "Unsupported file type"
      );
    }

    let selected = valid;
    if (maxFiles != null) {
      const remaining = Math.max(0, maxFiles - existingCount - items.length);
      selected = valid.slice(0, remaining);
      if (remaining === 0) return;
      if (valid.length > remaining) {
        showErrorDialog(
          `You can upload up to ${maxFiles} images here.`,
          "Upload limit reached"
        );
      }
    }

    if (!selected.length) return;
    setItems((prev) => [
      ...prev,
      ...selected.map((f) => ({ file: f, progress: 0, status: "queued" as const })),
    ]);
    autoStartRef.current = true;
  }

  async function uploadOne(item: Item): Promise<{ url: string; filename: string } | null> {
    const pres = await fetch(`/api/orders/${orderId}/media/presigned-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        fileName: item.file.name,
        fileType: item.file.type,
      }),
    });

    if (!pres.ok) {
      const data = await pres.json().catch(() => ({}));
      throw new Error(data.error || "Could not start the upload.");
    }

    const { uploadUrl, fileUrl } = await pres.json();

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100);
          setItems((prev) =>
            prev.map((it) => (it.file === item.file ? { ...it, progress: pct } : it))
          );
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error("The file upload failed. Please try again."));
      };
      xhr.onerror = () => reject(new Error("The file upload failed. Check your connection and try again."));
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", item.file.type);
      xhr.send(item.file);
      setItems((prev) =>
        prev.map((it) => (it.file === item.file ? { ...it, status: "uploading" } : it))
      );
    });

    setItems((prev) =>
      prev.map((it) => (it.file === item.file ? { ...it, status: "done", progress: 100 } : it))
    );
    return { url: fileUrl, filename: item.file.name };
  }

  async function handleUpload() {
    const queue = items.filter((i) => i.status === "queued" || i.status === "error");
    if (!queue.length) return;
    setUploading(true);
    try {
      const results: { url: string; filename: string }[] = [];
      for (const it of queue) {
        try {
          const res = await uploadOne(it);
          if (res) results.push(res);
        } catch (e) {
          setItems((prev) =>
            prev.map((x) => (x.file === it.file ? { ...x, status: "error" } : x))
          );
          showErrorDialog(
            (e as Error).message || `The ${config.noun} could not be uploaded.`,
            "Upload failed"
          );
        }
      }
      if (results.length) {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(results),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `The ${config.noun} could not be saved.`);
        }
        setItems([]);
        setExistingCount((n) => (maxFiles != null ? Math.min(maxFiles, n + results.length) : n));
        onUploaded?.();
      }
    } catch (e) {
      showErrorDialog((e as Error).message || "Upload failed.", "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {!isConfigured && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          File storage is not configured, so uploads are unavailable.
        </div>
      )}

      {hint && (
        <div className="rounded-md border border-border bg-surface-2 p-3 text-[13px] text-muted-foreground">
          {hint}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={config.accept}
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files || []);
          e.target.value = "";
        }}
      />

      <UploadDropzone
        accept={config.accept}
        label={config.label}
        onFiles={addFiles}
        onClick={() => inputRef.current?.click()}
        disabled={!canManage}
        onDenied={denied}
      />

      {!!items.length && (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={`${it.file.name}-${idx}`} className="rounded-md border p-2">
              <div className="flex items-center justify-between text-sm">
                <div className="mr-3 truncate">{it.file.name}</div>
                <div className="text-xs text-muted-foreground">{it.progress}%</div>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded bg-border">
                <div
                  className={`h-full ${it.status === "error" ? "bg-red-500" : "bg-navy-600"}`}
                  style={{ width: `${it.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => (canManage ? inputRef.current?.click() : denied())}
          disabled={!isConfigured || uploading}
        >
          <Upload className="mr-2 h-4 w-4" /> Browse
        </Button>
        <Button
          type="button"
          onClick={() => (canManage ? handleUpload() : denied())}
          disabled={!canManage ? false : !items.length || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
            </>
          ) : (
            "Upload"
          )}
        </Button>
      </div>
    </div>
  );
}
