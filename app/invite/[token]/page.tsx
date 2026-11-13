import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { hashToken } from '@/lib/utils/invite';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/auth/logout-button';
import { AcceptInviteForm } from '@/components/auth/accept-invite-form';
import { ExistingUserInviteAccept } from '@/components/auth/existing-user-invite-accept';

export const dynamic = 'force-dynamic';

function MessageCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="font-display text-xl font-semibold">{title}</h1>
        <div className="mt-2 text-sm text-muted-foreground">{children}</div>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      workspace: {
        select: { id: true, name: true, firstName: true, lastName: true },
      },
    },
  });

  if (!invite) {
    return (
      <MessageCard title="Invalid invitation">
        This invitation link is not valid. Ask the workspace owner to send a new
        invitation.
      </MessageCard>
    );
  }

  const workspaceLabel =
    [invite.workspace.firstName, invite.workspace.lastName]
      .filter(Boolean)
      .join(' ') || invite.workspace.name;

  if (invite.status === 'REVOKED') {
    return (
      <MessageCard title="Invitation revoked">
        This invitation is no longer active. Ask the workspace owner to send a new
        one.
      </MessageCard>
    );
  }

  if (
    invite.status === 'EXPIRED' ||
    (invite.status === 'PENDING' && invite.expiresAt < new Date())
  ) {
    return (
      <MessageCard title="Invitation expired">
        This invitation has expired. Ask the workspace owner to send a new one.
      </MessageCard>
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true, email: true, status: true },
  });

  const session = await auth();
  const sessionEmail = (
    (session?.user as { email?: string | null } | undefined)?.email || ''
  ).toLowerCase();
  const inviteEmail = invite.email.toLowerCase();
  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`;

  if (existing) {
    if (existing.status !== 'ACTIVE') {
      return (
        <MessageCard title="Account unavailable">
          This account cannot accept invitations right now. Please contact
          support.
        </MessageCard>
      );
    }

    if (!session?.user) {
      return (
        <MessageCard
          title="You have been invited"
          action={
            <Button asChild className="w-full">
              <Link href={loginHref}>Log in to accept</Link>
            </Button>
          }
        >
          You have been invited to manage the <strong>{workspaceLabel}</strong>{' '}
          workspace. Sign in as <strong>{invite.email}</strong> to accept the
          invitation.
        </MessageCard>
      );
    }

    if (sessionEmail !== inviteEmail) {
      return (
        <MessageCard
          title="Wrong account"
          action={
            <LogoutButton
              label="Sign out"
              callbackUrl={loginHref}
            />
          }
        >
          This invitation is for <strong>{invite.email}</strong>, but you are
          signed in as <strong>{sessionEmail}</strong>. Sign out and sign in with
          the invited email.
        </MessageCard>
      );
    }

    const membership = await prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: existing.id,
        },
      },
      select: { status: true },
    });

    if (invite.status === 'ACCEPTED') {
      if (membership?.status === 'ACTIVE') {
        return (
          <ExistingUserInviteAccept
            token={token}
            workspaceLabel={workspaceLabel}
            alreadyAccepted
          />
        );
      }

      return (
        <MessageCard title="Invitation already used">
          This invitation was already used. Ask the workspace owner to send a new
          invitation.
        </MessageCard>
      );
    }

    return (
      <ExistingUserInviteAccept token={token} workspaceLabel={workspaceLabel} />
    );
  }

  if (invite.status !== 'PENDING') {
    return (
      <MessageCard title="Invitation already used">
        This invitation was already used. Ask the workspace owner to send a new
        invitation.
      </MessageCard>
    );
  }

  return <AcceptInviteForm token={token} workspaceLabel={workspaceLabel} />;
}