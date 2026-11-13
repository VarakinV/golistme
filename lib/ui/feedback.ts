export type FeedbackDetail =
  | { kind: "permission"; action: string }
  | { kind: "error"; message: string; title?: string };

export const FEEDBACK_EVENT = "golist:feedback";

function dispatch(detail: FeedbackDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<FeedbackDetail>(FEEDBACK_EVENT, { detail }));
}

/** Ask the UI to explain that the current user lacks a permission. */
export function requestPermission(action: string) {
  dispatch({ kind: "permission", action });
}

/** Ask the UI to show a consistent error dialog with an OK button. */
export function showErrorDialog(message: string, title?: string) {
  dispatch({ kind: "error", message, title });
}
