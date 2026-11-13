import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResendVerificationButton } from '@/components/auth/resend-verification-button';

export const dynamic = 'force-dynamic';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerified: true },
  });
  if (!user) redirect('/login');
  if (user.emailVerified) redirect('/portal');

  const sp = await searchParams;
  const invalid = sp?.error === 'invalid';

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            We sent a verification link to <strong>{user.email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {invalid && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">
              This verification link is invalid or has expired. Request a new one below.
            </p>
          )}
          <p>
            Click the link in the email to confirm your address and unlock your
            workspace. The link expires in 24 hours.
          </p>
          <ResendVerificationButton />
          <p className="text-xs">
            Wrong account?{' '}
            <Link href="/login" className="underline">
              Sign in with a different email
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}