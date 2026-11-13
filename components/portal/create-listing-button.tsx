'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestPermission } from '@/lib/ui/feedback';

export function CreateListingButton({
  canManage,
  label = '+ Create Listing',
  compact = false,
  className,
}: {
  canManage: boolean;
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const content = compact ? (
    <>
      <span className="lg:hidden">{label}</span>
      <span className="hidden items-center justify-center lg:inline-flex">
        <Plus className="h-4 w-4" />
      </span>
    </>
  ) : (
    label
  );

  if (!canManage) {
    return (
      <Button
        type="button"
        className={className}
        onClick={() => requestPermission('create listings')}
      >
        {content}
      </Button>
    );
  }

  return (
    <Button asChild className={className}>
      <Link href="/portal/orders/new">{content}</Link>
    </Button>
  );
}