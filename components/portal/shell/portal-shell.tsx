'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  LogOut,
  Menu,
  Settings,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import LoginSuccessToaster from '@/components/portal/LoginSuccessToaster';
import {
  PORTAL_NAV_ITEMS,
  getPortalRouteMeta,
  isPortalNavActive,
} from './portal-nav-config';
import { CreateListingButton } from '@/components/portal/create-listing-button';
import { FeedbackDialogHost } from '@/components/portal/feedback-dialog';

const SIDEBAR_COLLAPSED_KEY = 'portal-sidebar-collapsed';

function initialsOf(name?: string | null, email?: string | null) {
  const n = (name || '').trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  }
  return (email?.[0] || 'U').toUpperCase();
}

export function PortalShell({
  children,
  user,
  isAdmin,
  workspaces = [],
  activeWorkspaceId = null,
  activeWorkspaceLabel = '',
  activeIsAssistant = false,
  canManageListings = true,
  canViewLeads = true,
}: {
  children: React.ReactNode;
  user: any;
  isAdmin: boolean;
  workspaces?: {
    id: string;
    label: string;
    name: string;
    role: 'OWNER' | 'ASSISTANT';
  }[];
  activeWorkspaceId?: string | null;
  activeWorkspaceLabel?: string;
  activeIsAssistant?: boolean;
  canManageListings?: boolean;
  canViewLeads?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  async function switchWorkspace(workspaceId: string) {
    if (workspaceId === activeWorkspaceId || switching) return;
    setSwitching(true);
    try {
      const res = await fetch('/api/workspace/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to switch workspace');

      setMobileOpen(false);
      toast.success('Workspace switched');
      router.push('/portal');
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Failed to switch workspace');
    } finally {
      setSwitching(false);
    }
  }

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
    } catch {}
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function toggleCollapse() {
    setCollapsed((v) => {
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, v ? '0' : '1');
      } catch {}
      return !v;
    });
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-faint" />
      </div>
    );
  }

  const name = user?.name || user?.email || 'Client';
  const initials = initialsOf(user?.name, user?.email);
  const { title, subtitle } = getPortalRouteMeta(pathname);

  return (
    <div className="min-h-screen">
      <LoginSuccessToaster />
      <FeedbackDialogHost ownerName={activeWorkspaceLabel} />
      {/* Mobile backdrop */}
      <div
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-[rgba(9,13,28,0.55)] transition-opacity duration-200 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Sidebar */}
      <aside
        aria-label="Portal navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-white/[0.06] bg-[linear-gradient(180deg,#131d3b_0%,#0f1730_100%)] text-[#c9cfe6] transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen
            ? 'translate-x-0 shadow-[var(--shadow-pop)]'
            : '-translate-x-full lg:shadow-none'
        } ${collapsed ? 'lg:w-20' : ''}`}
      >
        {/* Brand */}
        <div
          className={`flex shrink-0 items-center gap-3 border-b border-white/[0.08] px-4 pb-4 pt-5 ${
            collapsed ? 'lg:justify-center lg:px-2' : ''
          }`}
        >
          <svg
            viewBox="0 0 40 48"
            className="h-[41px] w-[34px] shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path d="M20 2C10.6 2 3 9.3 3 18.4 3 30.6 20 46 20 46s17-15.4 17-27.6C37 9.3 29.4 2 20 2z" fill="#cb4154" />
            <circle cx="20" cy="18.5" r="11" fill="#ffffff" />
            <g transform="translate(20,18.5)">
              <path d="M-3.6 -3.6 -2.6 -5.6H2.6L3.6 -3.6" fill="#cb4154" />
              <rect x="-7" y="-3.6" width="14" height="8.6" rx="1.6" fill="#cb4154" />
              <circle cx="0" cy="0.5" r="3" fill="#ffffff" />
              <circle cx="0" cy="0.5" r="1.4" fill="#cb4154" />
              <rect x="4.3" y="-2.3" width="1.6" height="1.1" rx="0.5" fill="#ffffff" />
            </g>
          </svg>
          <div className={`min-w-0 whitespace-nowrap ${collapsed ? 'lg:hidden' : ''}`}>
            <div className="font-display text-[15px] font-semibold leading-tight text-white">
              GoList.me
            </div>
            <div className="text-[11.5px] text-[#8791b8]">Client portal</div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-1.5 text-[#c9cfe6] hover:bg-white/[0.08] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-4 [scrollbar-width:thin]">
          {(['main', 'manage'] as const).map((section) => {
            const items = PORTAL_NAV_ITEMS.filter(
              (it) =>
                (it.section ?? 'main') === section &&
                (canViewLeads || it.href !== '/portal/leads')
            );
            if (!items.length) return null;

            return (
              <div key={section} className={section === 'manage' ? 'mt-4' : ''}>
                {section === 'manage' && (
                  <div
                    className={`px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#7f88ad] ${
                      collapsed ? 'lg:hidden' : ''
                    }`}
                  >
                    Manage
                  </div>
                )}
                {section === 'manage' && workspaces.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        disabled={switching}
                        title="Workspaces"
                        className={`mb-0.5 flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] font-medium text-[#c9cfe6] transition-colors hover:bg-white/[0.06] hover:text-white ${
                          collapsed ? 'lg:justify-center lg:px-0' : ''
                        } ${switching ? 'opacity-60' : ''}`}
                      >
                        <Building2 className="h-[18px] w-[18px] shrink-0 text-[#9aa2c6]" />
                        <span
                          className={`flex-1 truncate text-left ${
                            collapsed ? 'lg:hidden' : ''
                          }`}
                        >
                          Workspaces
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 ${collapsed ? 'lg:hidden' : ''}`}
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-60">
                      <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
                      {workspaces.map((workspace) => (
                        <DropdownMenuItem
                          key={workspace.id}
                          onSelect={() => switchWorkspace(workspace.id)}
                          disabled={switching}
                        >
                          <Building2 className="h-4 w-4" />
                          <span className="flex-1 truncate">
                            {workspace.label}
                          </span>
                          {workspace.id === activeWorkspaceId && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <ul>
                  {items.map((it) => {
                    const active = isPortalNavActive(pathname, it.href);
                    const Icon = it.icon;
                    return (
                      <li key={it.href} className="my-0.5">
                        <Link
                          href={it.href}
                          onClick={() => setMobileOpen(false)}
                          title={it.label}
                          aria-current={active ? 'page' : undefined}
                          className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
                            active
                              ? 'bg-brick-500 text-white'
                              : 'text-[#c9cfe6] hover:bg-white/[0.06] hover:text-white'
                          } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
                        >
                          <Icon
                            className={`h-[18px] w-[18px] shrink-0 ${
                              active ? 'text-white' : 'text-[#9aa2c6]'
                            }`}
                          />
                          <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>
                            {it.label}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Create listing CTA */}
        <div className={`shrink-0 border-t border-white/[0.08] p-3 ${collapsed ? 'lg:p-3.5' : ''}`}>
          <CreateListingButton
            canManage={canManageListings}
            label="+ Create Listing"
            compact={collapsed}
            className="w-full"
          />
        </div>

        {/* Footer user */}
        <div
          className={`flex shrink-0 items-center gap-2.5 border-t border-white/[0.08] p-3 ${
            collapsed ? 'lg:flex-col lg:p-3.5' : ''
          }`}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Open user menu"
                className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brick-500"
              >
                <Avatar className="h-[34px] w-[34px]">
                  {user?.avatarUrl || user?.image ? (
                    <AvatarImage
                      src={user?.avatarUrl || user?.image}
                      alt={name}
                    />
                  ) : (
                    <AvatarFallback className="bg-brick-500 font-display text-[12.5px] font-semibold text-white">
                      {initials}
                    </AvatarFallback>
                  )}
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start">
              <DropdownMenuLabel>{name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => (window.location.href = '/my-profile')}
              >
                <UserRound className="h-4 w-4" /> My Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  signOut({ redirect: true, callbackUrl: '/login' });
                }}
              >
                <LogOut className="h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <div className="truncate text-[12.5px] font-semibold text-[#e7eaf7]">
              {name}
            </div>
            <div className="text-[11px] text-[#8791b8]">Client</div>
          </div>
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`ml-auto hidden h-[30px] w-[30px] items-center justify-center rounded-lg border border-white/[0.14] text-[#c9cfe6] hover:bg-white/[0.08] lg:flex ${
              collapsed ? 'lg:ml-0' : ''
            }`}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform duration-300 ${
                collapsed ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div
        className={`min-h-screen transition-[margin] duration-200 ${
          collapsed ? 'lg:ml-20' : 'lg:ml-[264px]'
        }`}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3.5 border-b border-border bg-card px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex items-center justify-center rounded-lg p-1.5 text-foreground hover:bg-surface-2 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-display text-[17px] font-semibold leading-tight">
              {title}
            </h1>
            <p className="hidden truncate text-[12px] text-muted-foreground sm:block">
              {subtitle}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            {isAdmin && (
              <a
                href="/admin/dashboard"
                className="inline-flex h-9 items-center rounded-full border border-border px-3.5 text-[12.5px] font-semibold text-muted-foreground hover:border-navy-600 hover:text-foreground"
              >
                Admin
              </a>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open user menu"
                  className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brick-500"
                >
                  <Avatar className="h-[34px] w-[34px]">
                    {user?.avatarUrl || user?.image ? (
                      <AvatarImage
                        src={user?.avatarUrl || user?.image}
                        alt={name}
                      />
                    ) : (
                      <AvatarFallback className="bg-navy-700 font-display text-[12.5px] font-semibold text-white">
                        {initials}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span
                    aria-hidden
                    className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-card bg-navy-700 text-white shadow-sm dark:bg-navy-600"
                  >
                    <Settings className="h-2.5 w-2.5" strokeWidth={2.5} />
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => (window.location.href = '/my-profile')}
                >
                  <UserRound className="h-4 w-4" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    signOut({ redirect: true, callbackUrl: '/login' });
                  }}
                >
                  <LogOut className="h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {activeIsAssistant && activeWorkspaceLabel ? (
          <div className="sticky top-[68px] z-20 border-b border-yellow-300 bg-yellow-100 px-4 py-2 text-[13px] font-medium text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-100 sm:px-6">
            You are in {activeWorkspaceLabel}'s workspace.
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-[1600px] px-4 pb-16 pt-5 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
