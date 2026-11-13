export type UploadCategory =
  | "photos"
  | "videos"
  | "floorplans"
  | "attachments"
  | "reels-sources";

const IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"];

const VIDEO_MIME = ["video/mp4", "video/quicktime", "video/webm"];
const VIDEO_EXT = ["mp4", "mov", "webm"];

const PDF_MIME = ["application/pdf"];
const PDF_EXT = ["pdf"];

export const IMAGE_ACCEPT = `${IMAGE_EXT.map((e) => `.${e}`).join(",")},${IMAGE_MIME.join(",")}`;
export const VIDEO_ACCEPT = `${VIDEO_EXT.map((e) => `.${e}`).join(",")},${VIDEO_MIME.join(",")}`;
export const PDF_ACCEPT = `.pdf,application/pdf`;

export const IMAGE_HELP = "JPG, PNG, WebP, GIF, or HEIC images";
export const VIDEO_HELP = "MP4, MOV, or WebM videos";
export const PDF_HELP = "PDF files";

function extensionOf(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  if (index < 0) return "";
  return fileName.slice(index + 1).toLowerCase();
}

type Rules = { mime: string[]; ext: string[]; help: string };

function rulesFor(category: UploadCategory): Rules {
  if (category === "photos" || category === "floorplans" || category === "reels-sources") {
    return { mime: IMAGE_MIME, ext: IMAGE_EXT, help: IMAGE_HELP };
  }
  if (category === "videos") {
    return { mime: VIDEO_MIME, ext: VIDEO_EXT, help: VIDEO_HELP };
  }
  return { mime: PDF_MIME, ext: PDF_EXT, help: PDF_HELP };
}

export type UploadValidation =
  | { ok: true }
  | { ok: false; error: string };

export function validateUpload(
  category: UploadCategory,
  fileType: string | null | undefined,
  fileName: string
): UploadValidation {
  const rules = rulesFor(category);
  const type = (fileType || "").toLowerCase().trim();
  const ext = extensionOf(fileName);

  const typeOk = type ? rules.mime.includes(type) : true;
  const extOk = rules.ext.includes(ext);

  if (typeOk && extOk) return { ok: true };

  const singular =
    category === "videos"
      ? "video"
      : category === "attachments"
        ? "PDF"
        : "image";
  return {
    ok: false,
    error: `"${fileName}" is not a supported ${singular}. Only ${rules.help} are allowed.`,
  };
}

export function isAcceptedFile(category: UploadCategory, file: File): boolean {
  return validateUpload(category, file.type, file.name).ok;
}
