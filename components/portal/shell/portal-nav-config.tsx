import {
  Clapperboard,
  ClipboardList,
  Contact,
  QrCode,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface PortalNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: 'main' | 'manage';
}

export const PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { href: '/portal', label: 'Portal', icon: Clapperboard, section: 'main' },
  { href: '/portal/orders', label: 'My Listings', icon: ClipboardList, section: 'main' },
  { href: '/portal/qr-codes', label: 'My QR Codes', icon: QrCode, section: 'main' },
  { href: '/portal/leads', label: 'Leads', icon: Contact, section: 'main' },
  { href: '/portal/team', label: 'My Team', icon: Users, section: 'manage' },
];

export function isPortalNavActive(
  pathname: string,
  href: string
): boolean {
  if (href === '/portal') {
    return pathname === '/portal';
  }
  return pathname === href || pathname.startsWith(href + '/');
}

export interface PortalRouteMeta {
  title: string;
  subtitle: string;
}

const ROUTE_META: { prefix: string; meta: PortalRouteMeta }[] = [
  { prefix: '/portal/orders', meta: { title: 'My Listings', subtitle: 'View and manage your listings' } },
  { prefix: '/portal/qr-codes', meta: { title: 'My QR Codes', subtitle: 'Manage QR codes for your property listings' } },
  { prefix: '/portal/leads', meta: { title: 'Leads', subtitle: 'View and contact people interested in your listings' } },
  { prefix: '/portal/team', meta: { title: 'My Team', subtitle: 'Invite and manage workspace assistants' } },
  { prefix: '/portal', meta: { title: 'Customer Portal', subtitle: 'Access your listings and marketing tools' } },
];

export function getPortalRouteMeta(pathname: string): PortalRouteMeta {
  const matches = ROUTE_META.filter(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/')
  );
  if (matches.length === 0) {
    return { title: 'Portal', subtitle: 'GoList.me client portal' };
  }
  return matches.reduce((best, cur) =>
    cur.prefix.length > best.prefix.length ? cur : best
  ).meta;
}