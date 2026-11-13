import { auth } from '@/lib/auth/auth';
import { getAuthContext, hasPermission } from '@/lib/auth/workspace';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { PortalShell } from '@/components/portal/shell/portal-shell';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const user = session?.user as any;

  if (!user) {
    redirect('/login');
  }

  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  // Admins keep the admin shell; portal users get the portal shell.
  const isAdmin = ctx.platformRole === 'ADMIN' || ctx.platformRole === 'SUPERADMIN';

  // Customers must confirm their email before using the portal.
  if (!isAdmin && ctx.emailVerified === false) {
    redirect('/verify-email');
  }

  // A signed-in user without an active workspace is sent to the onboarding
  // page instead of being bounced back to /login.
  if (!isAdmin && !ctx.workspaceId) {
    redirect('/no-workspace');
  }

  const memberships = await prisma.workspaceMembership.findMany({
    where: { userId: ctx.userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: {
      role: true,
      workspace: {
        select: { id: true, name: true, firstName: true, lastName: true },
      },
    },
  });

  const workspaceMeta = memberships.map((membership) => {
    const realtorName =
      [membership.workspace.firstName, membership.workspace.lastName]
        .filter(Boolean)
        .join(' ') || membership.workspace.name;
    return {
      id: membership.workspace.id,
      label: membership.role === 'OWNER' ? 'My Workspace' : realtorName,
      name: membership.workspace.name,
      role: membership.role,
      realtorName,
    };
  });

  const activeWorkspace = workspaceMeta.find(
    (workspace) => workspace.id === ctx.workspaceId
  );

  return (
    <PortalShell
      user={user}
      isAdmin={isAdmin}
      workspaces={workspaceMeta.map(({ id, label, name, role }) => ({
        id,
        label,
        name,
        role,
      }))}
      activeWorkspaceId={ctx.workspaceId}
      activeWorkspaceLabel={activeWorkspace?.realtorName ?? ''}
      activeIsAssistant={activeWorkspace?.role === 'ASSISTANT'}
      canManageListings={hasPermission(ctx, 'MANAGE_LISTINGS')}
      canViewLeads={hasPermission(ctx, 'VIEW_LEADS')}
    >
      {children}
    </PortalShell>
  );
}
