import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getAuthContext } from '@/lib/auth/workspace';
import { prisma } from '@/lib/db/prisma';
import { CreateWorkspaceForm } from '@/components/workspace/create-workspace-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Create your realtor profile',
  robots: { index: false, follow: false },
};

export default async function CreateWorkspacePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.platformRole === 'ADMIN' || ctx.platformRole === 'SUPERADMIN') {
    redirect('/admin/dashboard');
  }

  // Assistants and workspace-less users may create their own workspace.
  // Users who already own one should not create another from this page.
  const ownedWorkspaces = await prisma.workspaceMembership.count({
    where: { userId: ctx.userId, role: 'OWNER', status: 'ACTIVE' },
  });
  if (ownedWorkspaces > 0) redirect('/my-profile');

  const user = session.user as { name?: string | null; email?: string | null };
  const parts = (user.name || '').trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ');

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="font-display text-2xl font-semibold">
          Create your realtor profile
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This creates your own workspace. You can manage your listings,
          generate marketing assets, and invite assistants later.
        </p>

        <div className="mt-6">
          <CreateWorkspaceForm
            defaultFirstName={firstName}
            defaultLastName={lastName}
            defaultEmail={user.email || ''}
          />
        </div>
      </div>
    </div>
  );
}