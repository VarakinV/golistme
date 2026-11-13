'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';
import { getRecaptchaToken } from '@/lib/recaptcha/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .refine((v) => /[a-z]/.test(v), { message: 'Must include a lowercase letter' })
  .refine((v) => /[A-Z]/.test(v), { message: 'Must include an uppercase letter' })
  .refine((v) => /\d/.test(v), { message: 'Must include a number' })
  .refine((v) => /[^A-Za-z0-9]/.test(v), {
    message: 'Must include a special character',
  });

const schema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export function AcceptInviteForm({
  token,
  workspaceLabel,
}: {
  token: string;
  workspaceLabel?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          password: values.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error || 'Failed to accept invitation';
        if (data?.details && Array.isArray(data.details)) {
          data.details.forEach((e: string) => toast.error(e));
        } else {
          toast.error(msg);
        }
        return;
      }

      if (data?.requiresSignIn) {
        toast.success('Invitation accepted. Sign in with your existing password.');
        router.replace('/login');
        return;
      }

      const email = data?.user?.email as string | undefined;
      if (!email) {
        router.replace('/login');
        return;
      }

      toast.success('Invitation accepted. Signing you in...');
      const recaptchaToken = await getRecaptchaToken('login');
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password: values.password,
        recaptchaToken: recaptchaToken || undefined,
      });

      if (result?.ok) {
        router.replace('/portal');
        router.refresh();
      } else {
        toast.error('Account created. Please sign in.');
        router.replace('/login');
      }
    } catch (e) {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="font-display text-xl font-semibold">Accept invitation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm your name and set a password to join{' '}
          {workspaceLabel ? `${workspaceLabel}'s workspace` : 'the workspace'}.
          Your email is already verified through the invitation.
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="invite-first-name">First name</Label>
              <Input
                id="invite-first-name"
                className="mt-1"
                placeholder="Jane"
                autoComplete="given-name"
                {...form.register('firstName')}
              />
              {form.formState.errors.firstName && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="invite-last-name">Last name</Label>
              <Input
                id="invite-last-name"
                className="mt-1"
                placeholder="Doe"
                autoComplete="family-name"
                {...form.register('lastName')}
              />
              {form.formState.errors.lastName && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="invite-password">Password</Label>
            <Input
              id="invite-password"
              type="password"
              className="mt-1"
              placeholder="********"
              autoComplete="new-password"
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
            {(() => {
              const pwd = form.watch('password') || '';
              const checklist = [
                { label: 'At least 8 characters', ok: pwd.length >= 8 },
                { label: 'One lowercase letter', ok: /[a-z]/.test(pwd) },
                { label: 'One uppercase letter', ok: /[A-Z]/.test(pwd) },
                { label: 'One number', ok: /\d/.test(pwd) },
                { label: 'One special character', ok: /[^A-Za-z0-9]/.test(pwd) },
              ];
              return (
                <ul className="mt-2 text-xs" aria-live="polite">
                  {checklist.map((item) => (
                    <li
                      key={item.label}
                      className={
                        item.ok ? 'text-green-600' : 'text-muted-foreground'
                      }
                    >
                      {item.ok ? '✓' : '•'} {item.label}
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>

          <div>
            <Label htmlFor="invite-confirm-password">Re-enter password</Label>
            <Input
              id="invite-confirm-password"
              type="password"
              className="mt-1"
              placeholder="********"
              autoComplete="new-password"
              {...form.register('confirmPassword')}
            />
            {form.formState.errors.confirmPassword && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Setting up...' : 'Accept & Create Account'}
          </Button>
        </form>
      </div>
    </div>
  );
}