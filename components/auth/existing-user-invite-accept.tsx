'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ExistingUserInviteAccept({
  token,
  workspaceLabel,
  alreadyAccepted = false,
}: {
  token: string;
  workspaceLabel: string;
  alreadyAccepted?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'accepted' | 'error'>(
    alreadyAccepted ? 'accepted' : 'loading'
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (alreadyAccepted) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/invitations/${token}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to accept invitation');
        if (!cancelled) setState('accepted');
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setState('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, alreadyAccepted]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        {state === 'loading' && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Accepting invitation...
          </div>
        )}

        {state === 'error' && (
          <>
            <h1 className="font-display text-xl font-semibold">
              Could not accept invitation
            </h1>
            <p className="mt-2 text-sm text-destructive">{error}</p>
            <Button asChild className="mt-5 w-full">
              <Link href="/portal">Go to portal</Link>
            </Button>
          </>
        )}

        {state === 'accepted' && (
          <>
            <h1 className="font-display text-xl font-semibold">
              Invitation accepted
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You have accepted an invitation and can now manage the{' '}
              <strong>{workspaceLabel}</strong> workspace.
            </p>
            <Button
              className="mt-5 w-full"
              onClick={() => {
                router.push('/portal');
                router.refresh();
              }}
            >
              Manage account
            </Button>
          </>
        )}
      </div>
    </div>
  );
}