'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus } from 'lucide-react';
import { requestPermission, showErrorDialog } from '@/lib/ui/feedback';

export function EmbedsForm({
  orderId,
  onAdded,
  canManage = true,
}: {
  orderId: string;
  onAdded: () => void;
  canManage?: boolean;
}) {
  const DEFAULT_TITLE = '3D Virtual Tour';
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const normalizedUrl = url.trim();

  async function submit() {
    if (!canManage) {
      requestPermission('add or remove a 3D Virtual Tour');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/media/embeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || DEFAULT_TITLE, embedUrl: normalizedUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'The 3D tour link could not be added.');
      }
      setTitle(DEFAULT_TITLE);
      setUrl('');
      onAdded();
    } catch (e) {
      showErrorDialog((e as Error).message || 'The 3D tour link could not be added.', 'Could not add tour');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        className="w-full"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={!canManage}
      />
      <Input
        className="w-full"
        placeholder="Embed URL (Matterport, iGUIDE, etc.)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={!canManage}
      />
      <Button
        type="button"
        onClick={submit}
        disabled={canManage && (loading || !normalizedUrl)}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" /> Add
          </>
        )}
      </Button>
    </div>
  );
}
