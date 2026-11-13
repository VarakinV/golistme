'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function ResendVerificationButton() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-verification-email', { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      if (data?.alreadyVerified) {
        toast.success('Your email is already verified.');
        window.location.href = '/portal';
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send verification email');
      }

      setSent(true);
      toast.success(
        data?.throttled
          ? 'A verification email was just sent. Check your inbox.'
          : 'Verification email sent.'
      );
    } catch (e) {
      toast.error((e as Error).message || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" onClick={onClick} disabled={loading || sent} className="w-full">
      {loading ? 'Sending...' : sent ? 'Email sent' : 'Resend verification email'}
    </Button>
  );
}