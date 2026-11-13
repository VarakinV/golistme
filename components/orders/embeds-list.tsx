'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DeleteIconButton } from '@/components/admin/ui/icon-action';
import { requestPermission, showErrorDialog } from '@/lib/ui/feedback';

interface Item {
  id: string;
  title: string;
  embedUrl: string;
}

export function EmbedsList({
  orderId,
  refreshToken = 0,
  canManage = true,
}: {
  orderId: string;
  refreshToken?: number;
  canManage?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/media/embeds`);
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [orderId, refreshToken]);

  async function remove(id: string) {
    if (!canManage) {
      requestPermission('remove a 3D Virtual Tour');
      return;
    }
    setDeleting(id);
    try {
      const res = await fetch(`/api/orders/${orderId}/media/embeds`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'The 3D tour link could not be removed.');
      }
      setItems((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      showErrorDialog((e as Error).message, 'Could not remove tour');
    } finally {
      setDeleting(null);
    }
  }

  if (loading)
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading embeds...
      </div>
    );

  if (!items.length)
    return <div className="text-sm text-muted-foreground">No 3D tours yet</div>;

  return (
    <div className="grid grid-cols-1 gap-3">
      {items.map((p) => (
        <div key={p.id} className="rounded-md border p-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">{p.title}</div>
            <DeleteIconButton
              label="Delete embed"
              onClick={() => remove(p.id)}
              loading={deleting === p.id}
            />
          </div>
          <div className="mt-2">
            <iframe src={p.embedUrl} className="h-64 w-full rounded border" allowFullScreen />
          </div>
        </div>
      ))}
    </div>
  );
}
