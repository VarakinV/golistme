import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { getAuthContext, hasPermission } from '@/lib/auth/workspace';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import NewListingForm from '@/components/portal/new-listing-form';

export default async function NewPortalListingPage() {
  const ctx = await getAuthContext();
  if (!ctx) return notFound();

  if (!hasPermission(ctx, 'MANAGE_LISTINGS')) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            <ShieldX className="h-7 w-7" />
          </div>
          <h2 className="font-display text-xl font-semibold">Permission needed</h2>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-6 text-muted-foreground">
            You don&apos;t have permission to create listings in this workspace.
            Ask the workspace owner to update your permissions.
          </p>
          <Button asChild className="mt-5">
            <Link href="/portal/orders">Back to my listings</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <NewListingForm />;
}
