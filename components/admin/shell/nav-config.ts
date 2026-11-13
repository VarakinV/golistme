import {
  LayoutDashboard,
  Megaphone,
  Package,
  QrCode,
  ShieldCheck,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  superadminOnly?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Core',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/clients', label: 'Clients', icon: Users },
      { href: '/admin/orders', label: 'Listings', icon: Package },
      { href: '/admin/qr-codes', label: 'QR codes', icon: QrCode },
    ],
  },
  {
    title: 'Manage',
    items: [
      { href: '/admin/templates', label: 'Video templates', icon: Video },
      { href: '/admin/social-templates', label: 'Social media templates', icon: Megaphone },
      { href: '/admin/users', label: 'Users', icon: ShieldCheck, superadminOnly: true },
    ],
  },
];

export interface RouteMeta {
  title: string;
  subtitle: string;
}

/** Longest-prefix route metadata for the topbar page heading. */
const ROUTE_META: { prefix: string; meta: RouteMeta }[] = [
  { prefix: '/admin/dashboard', meta: { title: 'Admin dashboard', subtitle: 'Overview of your business and recent activity' } },
  { prefix: '/admin/clients/users', meta: { title: 'Clients', subtitle: 'Workspace members' } },
  { prefix: '/admin/clients', meta: { title: 'Clients', subtitle: 'Manage your realtor workspaces' } },
  { prefix: '/admin/orders/new', meta: { title: 'Listings', subtitle: 'Create a new listing' } },
  { prefix: '/admin/orders', meta: { title: 'Listings', subtitle: 'All listings across your business' } },
  { prefix: '/admin/users', meta: { title: 'Users', subtitle: 'Manage platform accounts' } },
  { prefix: '/admin/qr-codes', meta: { title: 'QR codes', subtitle: 'QR codes linked to your listings' } },
  { prefix: '/admin/templates', meta: { title: 'Video templates', subtitle: 'Remotion reel templates' } },
  { prefix: '/admin/social-templates', meta: { title: 'Social media templates', subtitle: 'Prompt templates for social posts' } },
];

export function getRouteMeta(pathname: string): RouteMeta {
  const matches = ROUTE_META.filter(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/') || pathname.startsWith(r.prefix)
  );
  if (matches.length === 0) {
    return { title: 'Admin', subtitle: 'GoList.me admin portal' };
  }
  // Prefer the most specific (longest) prefix match
  return matches.reduce((best, cur) =>
    cur.prefix.length > best.prefix.length ? cur : best
  ).meta;
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(href + '/');
}