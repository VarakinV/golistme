"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FEEDBACK_EVENT, type FeedbackDetail } from "@/lib/ui/feedback";

export function FeedbackDialogHost({ ownerName = "" }: { ownerName?: string }) {
  const [feedback, setFeedback] = useState<FeedbackDetail | null>(null);

  useEffect(() => {
    function onFeedback(event: Event) {
      const detail = (event as CustomEvent<FeedbackDetail>).detail;
      if (detail) setFeedback(detail);
    }
    window.addEventListener(FEEDBACK_EVENT, onFeedback);
    return () => window.removeEventListener(FEEDBACK_EVENT, onFeedback);
  }, []);

  const open = feedback !== null;
  const isPermission = feedback?.kind === "permission";
  const owner = ownerName.trim() || "the workspace owner";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && setFeedback(null)}>
      <DialogContent showCloseButton={false} className="max-w-md">
        <DialogHeader className="items-center text-center sm:items-center sm:text-center">
          <div
            className={`mb-1 flex h-14 w-14 items-center justify-center rounded-full ${
              isPermission
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
            }`}
          >
            {isPermission ? (
              <ShieldX className="h-7 w-7" />
            ) : (
              <AlertTriangle className="h-7 w-7" />
            )}
          </div>
          <DialogTitle>
            {isPermission
              ? "Permission needed"
              : feedback?.kind === "error" && feedback.title
                ? feedback.title
                : "Something went wrong"}
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-6">
            {feedback?.kind === "permission" ? (
              <>
                You don&apos;t have permission to {feedback.action} in this workspace.
                Ask {owner} to update your permissions.
              </>
            ) : feedback?.kind === "error" ? (
              feedback.message
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button type="button" onClick={() => setFeedback(null)} className="min-w-24">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
