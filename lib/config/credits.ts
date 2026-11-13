import type { Permission } from "@prisma/client";

export const ALL_PERMISSIONS: Permission[] = [
  "MANAGE_LISTINGS",
  "GENERATE_MARKETING",
  "VIEW_LEADS",
  "VIEW_ANALYTICS",
  "PURCHASE_CREDITS",
];

export const ASSISTANT_DEFAULT_PERMISSIONS: Permission[] = [
  "MANAGE_LISTINGS",
  "GENERATE_MARKETING",
  "VIEW_LEADS",
  "VIEW_ANALYTICS",
];

export const PERMISSION_ORDER: Permission[] = [
  "MANAGE_LISTINGS",
  "GENERATE_MARKETING",
  "VIEW_LEADS",
  "VIEW_ANALYTICS",
  "PURCHASE_CREDITS",
];

export const PERMISSION_LABELS: Record<
  Permission,
  { label: string; description: string }
> = {
  MANAGE_LISTINGS: {
    label: "Manage listings",
    description: "Create, edit, and delete listings.",
  },
  GENERATE_MARKETING: {
    label: "Generate marketing assets",
    description: "Generate reels, flyers, and social posts.",
  },
  VIEW_LEADS: {
    label: "View leads",
    description: "See property inquiries and QR-code leads.",
  },
  VIEW_ANALYTICS: {
    label: "View analytics",
    description: "See page views and QR scan statistics.",
  },
  PURCHASE_CREDITS: {
    label: "Purchase credits",
    description: "Buy credits on behalf of the workspace.",
  },
};

export const WELCOME_CREDITS = 1;
export const LISTING_PACKAGE_PRICE_CENTS = 2900;
export const LISTING_PACKAGE_CURRENCY = "cad";
