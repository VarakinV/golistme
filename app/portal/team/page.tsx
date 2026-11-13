import { getAuthContext } from '@/lib/auth/workspace';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { PageHead } from '@/components/admin/ui/page-head';
import { TeamInviteForm } from '@/components/portal/team-invite-form';
import { TeamMemberActions } from '@/components/portal/team-member-actions';

export const dynamic = 'force-dynamic';

export default async function PortalTeamPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (!ctx.workspaceId) redirect('/login');

  const workspace = await prisma.realtorWorkspace.findUnique({
    where: { id: ctx.workspaceId },
    select: {
      id: true,
      name: true,
      memberships: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          permissions: true,
          createdAt: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (!workspace) redirect('/portal');

  const invites = await prisma.invitation.findMany({
    where: { workspaceId: workspace.id, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, role: true, expiresAt: true },
  });

  const canInvite =
    ctx.platformRole === 'ADMIN' ||
    ctx.platformRole === 'SUPERADMIN' ||
    ctx.workspaceRole === 'OWNER';

  return (
    <div className="w-full space-y-6">
      <PageHead
        title="My Team"
        subtitle="Invite assistants to help manage listings and marketing"
      />

      {canInvite ? (
        <TeamInviteForm workspaceId={workspace.id} />
      ) : (
        <div className="rounded-2xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
          Only the workspace owner can invite team members.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-[16px] font-semibold">Members</h2>
          <ul className="mt-3 divide-y divide-border">
            {workspace.memberships.map((membership) => (
              <li key={membership.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {membership.user.name || membership.user.email}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {membership.user.email}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {membership.role}
                  </span>
                  {canInvite && membership.role === 'ASSISTANT' && (
                    <TeamMemberActions
                      workspaceId={workspace.id}
                      userId={membership.user.id}
                      memberName={membership.user.name || membership.user.email}
                      permissions={membership.permissions}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-[16px] font-semibold">Pending invitations</h2>
          {invites.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No pending invitations.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {invites.map((invite) => (
                <li key={invite.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{invite.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {invite.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}