import type { Metadata } from 'next';
import Link from 'next/link';
import { SuspendedSupportForm } from '@/components/auth/suspended-support-form';

export const metadata: Metadata = {
  title: 'Account suspended',
  robots: { index: false, follow: false },
};

export default async function AccountSuspendedPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="font-display text-2xl font-semibold">Your account is suspended</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This account cannot sign in right now. If you believe this is a mistake,
          send a message to our support team and we will review it.
        </p>

        <SuspendedSupportForm defaultEmail={email ?? ''} />

        <p className="mt-6 text-xs text-muted-foreground">
          Already resolved?{' '}
          <Link href="/login" className="underline">
            Return to sign in
          </Link>
          .
        </p>
      </div>
    </div>
  );
}