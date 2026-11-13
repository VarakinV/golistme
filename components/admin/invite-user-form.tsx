"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteUserForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="bg-card rounded-lg shadow p-4 space-y-3">
      <h2 className="font-medium">Invite an assistant</h2>
      <p className="text-sm text-muted-foreground">
        Workspaces have one owner. Invited members join as assistants with the
        default assistant permissions.
      </p>
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
        <div className="flex-1 w-full">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="assistant@example.com"
            className="mt-1"
          />
        </div>
        <input type="hidden" name="role" value="ASSISTANT" />
        <Button type="submit">Send invite</Button>
      </div>
    </form>
  );
}