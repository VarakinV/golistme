import type { ListingStatus } from "@prisma/client";

export function isListingStatus(value: unknown): value is ListingStatus {
  return value === "DRAFT" || value === "ACTIVE" || value === "SOLD";
}

type TimestampPatch = {
  publishedAt?: Date | null;
  soldAt?: Date | null;
  archivedAt?: Date | null;
};

function timestampsFor(status: ListingStatus): TimestampPatch {
  switch (status) {
    case "ACTIVE":
      return { publishedAt: new Date(), soldAt: null, archivedAt: null };
    case "SOLD":
      return { soldAt: new Date(), archivedAt: null };
    case "DRAFT":
      return { publishedAt: null, soldAt: null, archivedAt: null };
  }
}

export type StatusUpdate =
  | { ok: true; status: ListingStatus; timestamps: TimestampPatch }
  | { ok: false; error: string };

/**
 * Realtors may move a listing between Draft, Active, and Sold in any order.
 * The only validation is that the requested value is a supported status.
 */
export function resolveListingStatusUpdate(
  current: ListingStatus,
  next: unknown
): StatusUpdate {
  if (!isListingStatus(next)) {
    return { ok: false, error: "Invalid listing status" };
  }
  if (next === current) {
    return { ok: true, status: current, timestamps: {} };
  }
  return { ok: true, status: next, timestamps: timestampsFor(next) };
}