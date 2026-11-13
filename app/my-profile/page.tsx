'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { User as UserIcon, UploadCloud, ArrowLeft } from 'lucide-react';

export default function MyProfilePage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const [name, setName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [hasOwnedWorkspace, setHasOwnedWorkspace] = useState<boolean | null>(null);
  const [nameError, setNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return;
    let cancelled = false;

    fetch('/api/realtors')
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (cancelled) return;
        setHasOwnedWorkspace(
          Array.isArray(list) &&
            list.some((workspace: any) => workspace.ownerUserId === userId)
        );
      })
      .catch(() => {
        if (!cancelled) setHasOwnedWorkspace(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setAvatarUrl((session.user as any).avatarUrl ?? null);
    }
  }, [session]);

  const onPickFile = () => fileInputRef.current?.click();

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(f.type)) {
      toast.error('Please upload JPEG, PNG, or WebP image');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error('File must be < 5MB');
      return;
    }
    setAvatarFile(f);
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
  };

  async function uploadAvatarIfNeeded(): Promise<string | null | undefined> {
    if (!avatarFile) return undefined;
    try {
      const res = await fetch('/api/user/avatar/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: avatarFile.name,
          fileType: avatarFile.type,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to get upload URL');
      }
      const { uploadUrl, fileUrl } = await res.json();
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': avatarFile.type,
        },
        body: avatarFile,
      });
      if (!put.ok) {
        const text = await put.text().catch(() => '');
        throw new Error(
          `Upload failed (${put.status}): ${text || put.statusText}`
        );
      }
      return fileUrl as string;
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message);
      return undefined;
    }
  }

  async function saveProfile() {
    if (!name.trim()) {
      setNameError('Display name is required');
      return;
    }
    setNameError('');
    try {
      setSavingProfile(true);
      const uploadedUrl = await uploadAvatarIfNeeded();

      const payload: any = {};
      if (name !== (session?.user?.name || '')) payload.name = name;
      if (uploadedUrl !== undefined) payload.avatarUrl = uploadedUrl; // null/undefined handled

      // If user picked a file but upload failed (undefined), stop here (error already shown)
      if (avatarFile && uploadedUrl === undefined) return;

      // Only show "Nothing to update" when no changes AND no picked file
      if (Object.keys(payload).length === 0 && !avatarFile) {
        toast.info('Nothing to update');
        return;
      }

      const res = await fetch('/api/user/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update profile');
      }
      const updated = await res.json();

      // Refresh session values immediately without logout
      await update({
        name: updated.name ?? null,
        avatarUrl: updated.avatarUrl ?? null,
      } as any);

      if (uploadedUrl) {
        setAvatarUrl(uploadedUrl);
        setAvatarFile(null);
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }

      toast.success('Profile updated');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    const passwordCheck = z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/\d/, 'Must include a number')
      .regex(/[^A-Za-z0-9]/, 'Must include a special character')
      .safeParse(newPassword);

    if (!passwordCheck.success) {
      setPasswordError(passwordCheck.error.issues[0].message);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }
    setPasswordError('');

    try {
      setSavingPassword(true);
      const res = await fetch('/api/user/update-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingPassword(false);
    }
  }

  if (status === 'loading') {
    return <div className="p-6">Loading...</div>;
  }

  if (!session?.user) return null;

  const displayAvatar = avatarPreview || avatarUrl || null;
  const userRole = (session.user as any)?.platformRole;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

  return (
    <div className="min-h-screen bg-surface-2">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href={isAdmin ? '/admin/dashboard' : '/portal'}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-brick-600"
          >
            <ArrowLeft className="h-4 w-4" /> {isAdmin ? 'Back to admin' : 'Back to portal'}
          </Link>
          <span className="text-sm font-semibold">My Profile</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold">My Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account details, profile photo, and password.
          </p>
        </div>

        <div className="grid gap-6">
          {!isAdmin && hasOwnedWorkspace === false && (
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="font-display text-[16px] font-semibold">
                Create your own realtor workspace
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A realtor workspace gives you your own listings, public property
                websites, marketing assets, credits, and team. You can create it
                now and still assist other realtors — switch between workspaces
                from the portal sidebar.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Your own listings and public property pages</li>
                <li>Reels, flyers, social posts, and QR codes</li>
                <li>Credits, billing, and assistant invitations</li>
                <li>A free welcome credit for your first listing</li>
              </ul>
              <Button asChild className="mt-4">
                <Link href="/create-workspace">Create my Realtor Workspace</Link>
              </Button>
            </section>
          )}

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="font-display text-[16px] font-semibold">
              Profile information
            </h2>
            <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-24 w-24">
                  {displayAvatar ? (
                    <AvatarImage src={displayAvatar} alt="Avatar" />
                  ) : (
                    <AvatarFallback>
                      <UserIcon className="h-8 w-8 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={onFileSelected}
                  />
                  <Button type="button" variant="outline" onClick={onPickFile}>
                    <UploadCloud className="mr-2 h-4 w-4" /> Choose image
                  </Button>
                </div>
              </div>

              <div className="grid flex-1 gap-4">
                <div>
                  <label htmlFor="profile-name" className="text-sm font-medium">
                    Display name
                  </label>
                  <Input
                    id="profile-name"
                    className="mt-1"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={Boolean(nameError)}
                  />
                  {nameError ? (
                    <p className="mt-1 text-xs text-destructive">{nameError}</p>
                  ) : null}
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveProfile} disabled={savingProfile}>
                    {savingProfile ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="font-display text-[16px] font-semibold">
              Change password
            </h2>
            <div className="mt-4 grid gap-4">
              <div>
                <label
                  htmlFor="profile-current-password"
                  className="text-sm font-medium"
                >
                  Current password
                </label>
                <Input
                  id="profile-current-password"
                  className="mt-1"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="profile-new-password"
                    className="text-sm font-medium"
                  >
                    New password
                  </label>
                  <Input
                    id="profile-new-password"
                    className="mt-1"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    aria-invalid={Boolean(passwordError)}
                  />
                  <ul className="mt-2 text-xs" aria-live="polite">
                    {[
                      {
                        label: 'At least 8 characters',
                        ok: newPassword.length >= 8,
                      },
                      {
                        label: 'One lowercase letter',
                        ok: /[a-z]/.test(newPassword),
                      },
                      {
                        label: 'One uppercase letter',
                        ok: /[A-Z]/.test(newPassword),
                      },
                      { label: 'One number', ok: /\d/.test(newPassword) },
                      {
                        label: 'One special character',
                        ok: /[^A-Za-z0-9]/.test(newPassword),
                      },
                    ].map((check) => (
                      <li
                        key={check.label}
                        className={check.ok ? 'text-green-600' : 'text-gray-500'}
                      >
                        {check.ok ? '✓' : '•'} {check.label}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <label
                    htmlFor="profile-confirm-password"
                    className="text-sm font-medium"
                  >
                    Confirm password
                  </label>
                  <Input
                    id="profile-confirm-password"
                    className="mt-1"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    aria-invalid={Boolean(passwordError)}
                  />
                </div>
              </div>
              {passwordError ? (
                <p className="text-xs text-destructive">{passwordError}</p>
              ) : null}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={savePassword}
                  disabled={savingPassword}
                >
                  {savingPassword ? 'Saving...' : 'Update password'}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Toaster richColors />
    </div>
  );
}