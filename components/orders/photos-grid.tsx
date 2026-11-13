'use client';

import { Fragment, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, GripVertical } from 'lucide-react';
import { DeleteIconButton } from '@/components/admin/ui/icon-action';
import { toast } from 'sonner';
import { requestPermission, showErrorDialog } from '@/lib/ui/feedback';

interface Photo {
  id: string;
  url: string;
  urlMls?: string | null;
  filename: string;
}

type DropTarget = { id: string; side: 'before' | 'after' } | null;

function movePhoto(
  list: Photo[],
  fromId: string,
  toId: string,
  side: 'before' | 'after'
): Photo[] {
  const fromIdx = list.findIndex((x) => x.id === fromId);
  if (fromIdx === -1) return list;
  const copy = [...list];
  const [moved] = copy.splice(fromIdx, 1);
  let dst = copy.findIndex((x) => x.id === toId);
  if (dst === -1) return list;
  if (side === 'after') dst += 1;
  copy.splice(dst, 0, moved);
  return copy;
}

function DropPlaceholder({
  onDragOver,
  onDrop,
}: {
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      aria-hidden
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="flex aspect-[4/3] w-full items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/50 bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
    >
      Drop here
    </div>
  );
}

export function PhotosGrid({
  orderId,
  refreshToken = 0,
  canManage = true,
}: {
  orderId: string;
  refreshToken?: number;
  canManage?: boolean;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/media/photos`);
      if (res.ok) setPhotos(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [orderId, refreshToken]);

  useEffect(() => {
    setSelected({});
  }, [orderId, refreshToken]);

  async function removeMany(ids: string[]) {
    if (!canManage) {
      requestPermission('delete photos');
      return;
    }
    setDeleting('bulk');
    try {
      const res = await fetch(`/api/orders/${orderId}/media/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete photos');
      }
      setPhotos((p) => p.filter((x) => !ids.includes(x.id)));
      setSelected({});
    } catch (e) {
      showErrorDialog((e as Error).message || 'Failed to delete photos');
    } finally {
      setDeleting(null);
    }
  }

  async function remove(id: string) {
    await removeMany([id]);
  }

  function handleDragStart(id: string) {
    if (!canManage) return;
    setDragId(id);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, id: string) {
    if (!canManage || !dragId) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const side = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
    setDropTarget((prev) =>
      prev?.id === id && prev.side === side ? prev : { id, side }
    );
  }

  async function handleDrop(toId: string, side: 'before' | 'after') {
    if (!canManage) {
      requestPermission('reorder photos');
      return;
    }
    if (!dragId || dragId === toId) {
      setDragId(null);
      setDropTarget(null);
      return;
    }
    const next = movePhoto(photos, dragId, toId, side);
    setPhotos(next);
    setDragId(null);
    setDropTarget(null);
    try {
      setSavingOrder(true);
      const ids = next.map((p) => p.id);
      const res = await fetch(`/api/orders/${orderId}/media/photos/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Failed to save order');
      toast.success('Photo order saved');
    } catch (e) {
      showErrorDialog((e as Error).message || 'Failed to save photo order');
    } finally {
      setSavingOrder(false);
    }
  }

  if (loading)
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading photos...
      </div>
    );

  if (!photos.length)
    return <div className="text-sm text-muted-foreground">No photos yet</div>;

  const allSelected = photos.length > 0 && selectedIds.length === photos.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={allSelected}
            onChange={(e) => {
              if (e.target.checked)
                setSelected(Object.fromEntries(photos.map((p) => [p.id, true])));
              else setSelected({});
            }}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} selected
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelected({})}
            disabled={!selectedIds.length}
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => removeMany(selectedIds)}
            disabled={!selectedIds.length || deleting !== null}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />{' '}
                <span className="hidden sm:inline">Delete selected</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {photos.map((p) => (
          <Fragment key={p.id}>
            {dropTarget?.id === p.id && dropTarget.side === 'before' && (
              <DropPlaceholder
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleDrop(p.id, "before");
                }}
              />
            )}
            <div
              className={`relative group overflow-hidden rounded-md border transition-opacity ${
                selected[p.id] ? 'ring-2 ring-primary' : ''
              } ${dragId === p.id ? 'opacity-40' : ''}`}
              draggable={canManage}
              onDragStart={() => handleDragStart(p.id)}
              onDragOver={(e) => handleDragOver(e, p.id)}
              onDrop={(e) => {
                e.preventDefault();
                if (!dropTarget || dropTarget.id !== p.id) {
                  void handleDrop(p.id, 'after');
                } else {
                  void handleDrop(p.id, dropTarget.side);
                }
              }}
              onDragEnd={() => {
                setDragId(null);
                setDropTarget(null);
              }}
            >
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                <span className="inline-flex select-none items-center justify-center rounded border bg-white/80 px-1.5 py-1 text-[10px] text-foreground">
                  <GripVertical className="mr-1 h-3 w-3" /> Drag
                </span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.urlMls || p.url}
                alt={p.filename}
                className="aspect-[4/3] w-full object-cover"
                onClick={() => setSelected((s) => ({ ...s, [p.id]: !s[p.id] }))}
              />
              <input
                type="checkbox"
                className="absolute top-2 left-2 h-4 w-4 bg-white/80"
                checked={!!selected[p.id]}
                onChange={(e) =>
                  setSelected((s) => ({ ...s, [p.id]: e.target.checked }))
                }
              />
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 transition group-hover:opacity-100">

                <DeleteIconButton
                  label="Delete photo"
                  onClick={() => remove(p.id)}
                  loading={deleting === p.id}
                />
              </div>
            </div>
            {dropTarget?.id === p.id && dropTarget.side === 'after' && (
              <DropPlaceholder
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleDrop(p.id, "after");
                }}
              />
            )}
          </Fragment>
        ))}
      </div>

      {savingOrder && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Saving order...
        </div>
      )}
    </div>
  );
}
