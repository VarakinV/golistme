'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { requestPermission, showErrorDialog } from '@/lib/ui/feedback';

export function EmailLeadButton({
  leadId,
  leadName,
  leadEmail,
  propertyAddress,
}: {
  leadId: string;
  leadName: string;
  leadEmail: string;
  propertyAddress?: string;
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(
    propertyAddress ? `Regarding ${propertyAddress}` : 'Regarding your inquiry'
  );
  const [message, setMessage] = useState(
    `Hi ${leadName.split(' ')[0] || 'there'},\n\nThank you for your interest. `
  );
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403) {
          setOpen(false);
          requestPermission('email leads');
          return;
        }
        throw new Error(data.error || 'The email could not be sent.');
      }
      toast.success(`Email sent to ${leadEmail}`);
      setOpen(false);
    } catch (e) {
      showErrorDialog((e as Error).message, 'Could not send email');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="gap-2">
        <Mail className="h-4 w-4" /> Email {leadName}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Email {leadName}</DialogTitle>
            <DialogDescription>
              This sends from GoList.me and replies go to your account email.
              The lead will see your message at {leadEmail}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="lead-email-subject" className="text-[13px] font-medium">
                Subject
              </label>
              <Input
                id="lead-email-subject"
                value={subject}
                maxLength={160}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lead-email-message" className="text-[13px] font-medium">
                Message
              </label>
              <textarea
                id="lead-email-message"
                value={message}
                maxLength={6000}
                rows={8}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={send}
              disabled={sending || !subject.trim() || !message.trim()}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                'Send email'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
