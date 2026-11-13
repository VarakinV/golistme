'use client';

import { useState } from 'react';
import { showErrorDialog, requestPermission } from '@/lib/ui/feedback';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SOLD', label: 'Sold' },
] as const;

export function ListingStatusSelect({
  listingId,
  status,
  canManage = true,
}: {
  listingId: string;
  status: string;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);

  async function onChange(next: string) {
    if (!canManage) {
      requestPermission('change the listing status');
      return;
    }
    const previous = value;
    setValue(next);
    setSaving(true);

    try {
      const res = await fetch(`/api/orders/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update status');
      }

      toast.success('Status updated');
      router.refresh();
    } catch (e) {
      setValue(previous);
      showErrorDialog((e as Error).message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={saving}>
      <SelectTrigger className="h-8 w-[120px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
