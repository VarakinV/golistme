import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getAuthContext } from '@/lib/auth/workspace';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/auth/logout-button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'No active workspace',
  robots: { index: false, follow: false },
};

export default async function NoWorkspacePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  if (ctx.platformRole === 'ADMIN' || ctx.platformRole === 'SUPERADMIN') {
    redirect('/admin/dashboard');
  }
  if (ctx.workspaceId) redirect('/portal');

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="font-display text-2xl font-semibold">
          You do not have an active workspace
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You are signed in, but no realtor workspace is connected to your
          account. If you are a realtor, create your own workspace to manage
          listings, generate marketing assets, and publish property pages. New
          workspaces include a free welcome credit for your first listing.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          If you were invited as an assistant, open the invitation link in your
          email. If the invitation was removed, ask the workspace owner to invite
          you again.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="sm:flex-1">
            <Link href="/create-workspace">Create Realtor Profile</Link>
          </Button>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}