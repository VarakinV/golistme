"use client";

import { useState } from "react";
import { ShieldX, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadDropzone({
  label,
  onFiles,
  onClick,
  disabled = false,
  onDenied,
}: {
  accept: string;
  label: string;
  onFiles: (files: FileList | File[]) => void;
  onClick?: () => void;
  disabled?: boolean;
  onDenied?: () => void;
}) {
  const [dragging, setDragging] = useState(false);

  if (disabled) {
    return (
      <button
        type="button"
        onClick={onDenied}
        className="flex h-28 w-full items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/50 bg-surface-2/40 text-sm text-muted-foreground transition-colors hover:border-muted-foreground"
      >
        <ShieldX className="mr-2 h-4 w-4" /> You don&apos;t have permission to upload files
      </button>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex h-28 cursor-pointer items-center justify-center rounded-md border-2 border-dashed bg-surface-2/40 text-sm text-muted-foreground transition-colors",
        dragging
          ? "border-green-500 bg-green-50 text-green-800 dark:border-green-400 dark:bg-green-950/30 dark:text-green-200"
          : "border-muted-foreground/50 hover:border-muted-foreground"
      )}
    >
      <span className="flex items-center gap-2">
        <Upload className="h-4 w-4" /> {label}
      </span>
    </div>
  );
}
