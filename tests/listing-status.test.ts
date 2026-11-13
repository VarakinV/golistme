import { describe, expect, it } from "vitest";
import { isListingStatus, resolveListingStatusUpdate } from "@/lib/listings/status";

describe("listing status transitions", () => {
  it("recognizes only supported statuses", () => {
    expect(isListingStatus("DRAFT")).toBe(true);
    expect(isListingStatus("ACTIVE")).toBe(true);
    expect(isListingStatus("SOLD")).toBe(true);
    expect(isListingStatus("ARCHIVED")).toBe(false);
    expect(isListingStatus(null)).toBe(false);
  });

  it("publishes a draft", () => {
    const result = resolveListingStatusUpdate("DRAFT", "ACTIVE");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("ACTIVE");
    expect(result.timestamps.publishedAt).toBeInstanceOf(Date);
    expect(result.timestamps.soldAt).toBeNull();
    expect(result.timestamps.archivedAt).toBeNull();
  });

  it("marks an active listing as sold", () => {
    const result = resolveListingStatusUpdate("ACTIVE", "SOLD");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("SOLD");
    expect(result.timestamps.soldAt).toBeInstanceOf(Date);
    expect(result.timestamps.archivedAt).toBeNull();
  });

  it("returns a sold listing to active", () => {
    const result = resolveListingStatusUpdate("SOLD", "ACTIVE");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("ACTIVE");
    expect(result.timestamps.publishedAt).toBeInstanceOf(Date);
    expect(result.timestamps.soldAt).toBeNull();
    expect(result.timestamps.archivedAt).toBeNull();
  });

  it("returns an active listing to draft", () => {
    const result = resolveListingStatusUpdate("ACTIVE", "DRAFT");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("DRAFT");
    expect(result.timestamps.publishedAt).toBeNull();
    expect(result.timestamps.soldAt).toBeNull();
    expect(result.timestamps.archivedAt).toBeNull();
  });

  it("leaves timestamps untouched when the status does not change", () => {
    for (const status of ["DRAFT", "ACTIVE", "SOLD"] as const) {
      const result = resolveListingStatusUpdate(status, status);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.status).toBe(status);
      expect(result.timestamps).toEqual({});
    }
  });

  it("rejects an unsupported status", () => {
    const result = resolveListingStatusUpdate("DRAFT", "PUBLISHED");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("Invalid listing status");
  });
});