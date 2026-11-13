'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { requestPermission, showErrorDialog } from '@/lib/ui/feedback';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function QrDeleteButton({
  qrCodeId,
  label,
  canDelete = true,
  onDeleted,
}: {
  qrCodeId: string;
  label?: string;
  canDelete?: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!canDelete) {
    return (
      <button
        type="button"
        aria-label={label ? `Delete QR code ${label}` : 'Delete QR code'}
        title="Delete QR code"
        onClick={() => requestPermission('delete QR codes')}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#f3d3d3] bg-brick-tint text-[#c23434] transition-colors hover:border-[#e8b4b4] hover:bg-brick-tint-strong hover:text-[#a82828] dark:border-[#4a2530] dark:text-[#f09a9a]"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  async function onDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/qr/${qrCodeId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete QR code');
      }

      toast.success('QR code deleted');
      setOpen(false);
      if (onDeleted) {
        onDeleted();
      } else {
        router.refresh();
      }
    } catch (e) {
      showErrorDialog((e as Error).message || 'Failed to delete QR code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={loading}
          aria-label={label ? `Delete QR code ${label}` : 'Delete QR code'}
          title="Delete QR code"
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#f3d3d3] bg-brick-tint text-[#c23434] transition-colors hover:border-[#e8b4b4] hover:bg-brick-tint-strong hover:text-[#a82828] dark:border-[#4a2530] dark:text-[#f09a9a] dark:hover:border-[#6a3540] dark:hover:text-[#f0b0b0]',
            loading && 'pointer-events-none opacity-50'
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this QR code?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the QR code
            {label ? ` ${label}` : ''}, all of its SVG, PNG, and PDF printables,
            its assignment history, and its scan statistics. Any physical printed
            copies will stop working. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void onDelete();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete QR code'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}