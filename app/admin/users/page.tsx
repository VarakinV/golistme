import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeleteUserButton } from '@/components/admin/delete-user-button';
import { Toaster } from '@/components/ui/sonner';
import { PageHead } from '@/components/admin/ui/page-head';
import { TableShell } from '@/components/admin/ui/table-shell';
import { StatusPill } from '@/components/admin/ui/status-pill';

export const dynamic = 'force-dynamic';

const PLATFORM_ROLES = ['USER', 'ADMIN'] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; platformRole?: string; status?: string }>;
}) {
  const session = await auth();
  const me = session?.user as any | null;

  if (!me || me.platformRole !== 'SUPERADMIN') {
    return (
      <div className="w-full">
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Access denied. This page is available to Superadmin only.
        </div>
      </div>
    );
  }

  const { page: pageParam, q: qParam, platformRole: roleParam, status: statusParam } =
    await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const perPage = 20;
  const q = (qParam || '').trim();
  const platformRoleFilter =
    roleParam === 'USER' || roleParam === 'ADMIN' ? roleParam : undefined;
  const statusFilter =
    statusParam === 'ACTIVE' || statusParam === 'SUSPENDED' ? statusParam : undefined;

  const where = {
    ...(platformRoleFilter ? { platformRole: platformRoleFilter as 'USER' | 'ADMIN' } : {}),
    ...(statusFilter ? { status: statusFilter as 'ACTIVE' | 'SUSPENDED' } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const total = await prisma.user.count({ where });
  const users = await prisma.user.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    skip: (page - 1) * perPage,
    take: perPage,
    select: {
      id: true,
      name: true,
      email: true,
      platformRole: true,
      status: true,
      createdAt: true,
      memberships: {
        select: { workspace: { select: { id: true, name: true, slug: true } } },
      },
    },
  });
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  async function updatePlatformRoleAction(formData: FormData) {
    'use server';
    const session = await auth();
    const current = session?.user as any | null;
    if (!current || current.platformRole !== 'SUPERADMIN') throw new Error('Unauthorized');

    const userId = String(formData.get('userId') || '');
    const platformRole = String(formData.get('platformRole') || '');

    if (!userId || !PLATFORM_ROLES.includes(platformRole as (typeof PLATFORM_ROLES)[number])) {
      throw new Error('Invalid payload');
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { platformRole: true },
    });
    if (!target) throw new Error('User not found');
    if (target.platformRole === 'SUPERADMIN') throw new Error('Cannot modify SUPERADMIN');

    await prisma.user.update({
      where: { id: userId },
      data: { platformRole: platformRole as 'USER' | 'ADMIN' },
    });
    revalidatePath('/admin/users');
  }

  async function toggleStatusAction(formData: FormData) {
    'use server';
    const session = await auth();
    const current = session?.user as any | null;
    if (!current || current.platformRole !== 'SUPERADMIN') throw new Error('Unauthorized');

    const userId = String(formData.get('userId') || '');
    if (!userId) throw new Error('Invalid payload');

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { platformRole: true, status: true },
    });
    if (!target) throw new Error('User not found');
    if (target.platformRole === 'SUPERADMIN') throw new Error('Cannot modify SUPERADMIN');

    await prisma.user.update({
      where: { id: userId },
      data: { status: target.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' },
    });
    revalidatePath('/admin/users');
  }

  const queryStr = (p: number) =>
    `/admin/users?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ''}${
      platformRoleFilter ? `&platformRole=${platformRoleFilter}` : ''
    }${statusFilter ? `&status=${statusFilter}` : ''}`;

  return (
    <div className="w-full">
      <PageHead title="Users" subtitle="Manage platform users and workspaces" />

      <TableShell
        toolbar={
          <div className="mb-3.5 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-[15px] font-semibold">Platform users</h2>
            <form className="ml-auto flex w-full items-center gap-2 sm:w-auto" action="/admin/users">
              <input
                name="q"
                defaultValue={q}
                placeholder="Search name or email"
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              />
              <select
                name="platformRole"
                defaultValue={platformRoleFilter ?? ''}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="">All roles</option>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <select
                name="status"
                defaultValue={statusFilter ?? ''}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
              <Button type="submit" size="sm" variant="outline">
                Filter
              </Button>
            </form>
          </div>
        }
      >
        <table className="w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Platform role</th>
              <th>Workspaces</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-b-0 hover:bg-surface-2">
                <td data-label="Name" className="td-primary">
                  <div className="font-medium">{u.name || '—'}</div>
                  <div className="text-xs text-faint">
                    {new Date(u.createdAt).toLocaleString()}
                  </div>
                </td>
                <td data-label="Email">{u.email}</td>
                <td data-label="Platform role">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill
                      status={u.platformRole === 'SUPERADMIN' ? 'ACTIVE' : 'PENDING'}
                      label={u.platformRole}
                    />
                    {u.platformRole !== 'SUPERADMIN' && (
                      <form action={updatePlatformRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={u.id} />
                        <Select name="platformRole" defaultValue={u.platformRole}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">USER</SelectItem>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="submit" variant="outline" size="sm">
                          Save
                        </Button>
                      </form>
                    )}
                  </div>
                </td>
                <td data-label="Workspaces">
                  {u.memberships.length === 0 ? (
                    <span className="text-xs text-faint">None</span>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {u.memberships.map((m) => (
                        <li key={m.workspace.id}>
                          <Link className="underline" href={`/admin/clients/${m.workspace.id}`}>
                            {m.workspace.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td data-label="Status">
                  <StatusPill
                    status={u.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'}
                    label={u.status}
                  />
                </td>
                <td data-label="Actions">
                  <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                    {u.platformRole !== 'SUPERADMIN' && (
                      <form action={toggleStatusAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <Button type="submit" size="sm" variant="secondary">
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </Button>
                      </form>
                    )}
                    <DeleteUserButton userId={u.id} userLabel={u.name || u.email} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages} ({total} users)
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Button variant="outline" asChild size="sm">
              <Link href={queryStr(page - 1)}>Previous</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          {page < totalPages ? (
            <Button variant="outline" asChild size="sm">
              <Link href={queryStr(page + 1)}>Next</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      </div>
      <Toaster richColors />
    </div>
  );
}
