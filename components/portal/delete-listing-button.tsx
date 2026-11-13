'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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

export function DeleteListingButton({
  listingId,
  listingLabel,
  redirectTo,
  canDelete = true,
}: {
  listingId: string;
  listingLabel?: string | null;
  redirectTo?: string;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!canDelete) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="text-destructive hover:text-destructive"
        title="Delete listing"
        onClick={() => requestPermission('delete listings')}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }

  async function onDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${listingId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete listing');
      }

      toast.success('Listing deleted');
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (e) {
      showErrorDialog((e as Error).message || 'Failed to delete listing');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="text-destructive hover:text-destructive"
          title="Delete listing"
          disabled={loading}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes{' '}
            {listingLabel ? `"${listingLabel}"` : 'the listing'}, its uploaded media, and all
            generated assets. This cannot be undone.
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
            {loading ? 'Deleting...' : 'Delete listing'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}