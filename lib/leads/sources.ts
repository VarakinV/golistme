export const LEAD_SOURCES = [
  "WEBSITE",
  "QR_CODE",
  "BOOK_SHOWING",
  "MORTGAGE_CALCULATOR",
  "HOME_WORTH",
  "SIMILAR_HOMES",
] as const;

export type LeadSourceValue = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSourceValue, string> = {
  WEBSITE: "Contact form",
  QR_CODE: "QR code",
  BOOK_SHOWING: "Book a showing",
  MORTGAGE_CALCULATOR: "Mortgage calculator",
  HOME_WORTH: "Home value request",
  SIMILAR_HOMES: "Similar homes request",
};

export function leadSourceLabel(value: string): string {
  return LEAD_SOURCE_LABELS[value as LeadSourceValue] ?? value.replace(/_/g, " ");
}

export function splitLeadName(name: string): { firstName: string; lastName: string } {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

export const LEADS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export function normalizeLeadsPaging(pageRaw?: string | null, perPageRaw?: string | null) {
  const page = Math.max(1, Number.parseInt(pageRaw || "1", 10) || 1);
  const parsedPerPage = Number.parseInt(perPageRaw || "20", 10) || 20;
  const perPage = LEADS_PER_PAGE_OPTIONS.includes(parsedPerPage) ? parsedPerPage : 20;
  return { page, perPage };
}
