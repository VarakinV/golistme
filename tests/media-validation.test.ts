import { describe, expect, it } from "vitest";
import {
  validateUpload,
  isAcceptedFile,
  IMAGE_ACCEPT,
} from "@/lib/media/validation";

describe("media upload validation", () => {
  it("accepts common image types for photos and floor plans", () => {
    for (const [type, name] of [
      ["image/jpeg", "front.jpg"],
      ["image/png", "plan.png"],
      ["image/webp", "living.webp"],
      ["image/heic", "IMG_0001.HEIC"],
    ]) {
      expect(validateUpload("photos", type, name)).toEqual({ ok: true });
      expect(validateUpload("floorplans", type, name)).toEqual({ ok: true });
    }
  });

  it("rejects PDFs and videos for photos and floor plans", () => {
    const pdf = validateUpload("photos", "application/pdf", "plan.pdf");
    expect(pdf.ok).toBe(false);
    if (!pdf.ok) expect(pdf.error).toContain("not a supported image");

    const video = validateUpload("floorplans", "video/mp4", "tour.mp4");
    expect(video.ok).toBe(false);
  });

  it("accepts only video types for videos", () => {
    expect(validateUpload("videos", "video/mp4", "tour.mp4")).toEqual({ ok: true });
    expect(validateUpload("videos", "video/quicktime", "tour.mov")).toEqual({ ok: true });
    expect(validateUpload("videos", "image/jpeg", "poster.jpg").ok).toBe(false);
    expect(validateUpload("videos", "application/pdf", "tour.pdf").ok).toBe(false);
  });

  it("rejects a mismatched extension even when the MIME type looks valid", () => {
    expect(validateUpload("photos", "image/jpeg", "malware.exe").ok).toBe(false);
  });

  it("checks File objects with isAcceptedFile", () => {
    const image = new File(["x"], "a.png", { type: "image/png" });
    const pdf = new File(["x"], "a.pdf", { type: "application/pdf" });
    expect(isAcceptedFile("photos", image)).toBe(true);
    expect(isAcceptedFile("photos", pdf)).toBe(false);
  });

  it("exposes accept strings without PDFs", () => {
    expect(IMAGE_ACCEPT).not.toContain("pdf");
  });
});