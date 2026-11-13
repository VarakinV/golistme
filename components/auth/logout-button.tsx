'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function LogoutButton({
  label = 'Log Out',
  callbackUrl = '/login',
}: {
  label?: string;
  callbackUrl?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => signOut({ callbackUrl })}
    >
      {label}
    </Button>
  );
}