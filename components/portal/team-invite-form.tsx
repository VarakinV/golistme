'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Permission } from '@prisma/client';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ASSISTANT_DEFAULT_PERMISSIONS } from '@/lib/config/credits';
import { PermissionCheckboxes } from '@/components/portal/permission-checkboxes';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

export function TeamInviteForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [permissions, setPermissions] = useState<Permission[]>(
    ASSISTANT_DEFAULT_PERMISSIONS
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email.toLowerCase(),
          workspaceId,
          role: 'ASSISTANT',
          permissions,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation');

      toast.success('Invitation sent');
      form.reset();
      setPermissions(ASSISTANT_DEFAULT_PERMISSIONS);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Failed to send invitation');
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="font-display text-[16px] font-semibold">
          Invite an assistant
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose what the assistant can do. You can change these permissions later.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="assistant@example.com"
                      {...field}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button
            type="submit"
            className="sm:mt-7"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Sending...' : 'Send invitation'}
          </Button>
        </div>

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold">Permissions</h3>
          <PermissionCheckboxes
            value={permissions}
            onChange={setPermissions}
            disabled={form.formState.isSubmitting}
          />
        </div>
      </form>
    </Form>
  );
}