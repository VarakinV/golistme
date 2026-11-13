'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RealtorForm } from '@/components/realtors/realtor-form';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Loader2,
  Pencil,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Realtor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  headshot?: string | null;
  companyName?: string | null;
  companyLogo?: string | null;
  facebookUrl?: string | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  twitterUrl?: string | null;
  pinterestUrl?: string | null;
  vimeoUrl?: string | null;
  tiktokUrl?: string | null;
}

export default function RealtorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [realtor, setRealtor] = useState<Realtor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const fetchRealtor = useCallback(async () => {
    try {
      const res = await fetch(`/api/realtors/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRealtor(data);
    } catch {
      toast.error('Failed to load realtor');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRealtor();
  }, [fetchRealtor]);

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-faint" />
        </div>
      </div>
    );
  }

  if (!realtor) {
    return (
      <div className="w-full">
        <div className="py-20 text-center text-muted-foreground">
          Realtor not found.{' '}
          <Link href="/admin/clients" className="text-brick-600 underline dark:text-brick-500">
            Back to clients
          </Link>
        </div>
      </div>
    );
  }

  const initials =
    ((realtor.firstName?.[0] || '') + (realtor.lastName?.[0] || '')).toUpperCase() || '?';

  return (
    <div className="w-full">
      <Toaster richColors position="top-right" />

      {/* Profile header */}
      <div className="mb-5">
        <Link
          href="/admin/clients"
          className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold text-muted-foreground hover:text-brick-600"
        >
          <ArrowLeft className="h-4 w-4" /> All clients
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="h-12 w-12">
            {realtor.headshot ? (
              <AvatarImage src={realtor.headshot} alt={realtor.firstName} />
            ) : (
              <AvatarFallback className="bg-brick-500 font-display text-sm font-semibold text-white">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="font-display truncate text-[22px] font-semibold leading-tight">
              {realtor.firstName} {realtor.lastName}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
              {realtor.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {realtor.email}
                </span>
              )}
              {realtor.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {realtor.phone}
                </span>
              )}
              {realtor.companyName && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> {realtor.companyName}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex h-8 items-center gap-2 rounded-full border border-border px-4 text-[13px] font-semibold hover:border-navy-600 hover:bg-surface-2"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
        </div>
      </div>

      {/* Edit Realtor Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Realtor</DialogTitle>
            <DialogDescription>
              Update {realtor.firstName}&apos;s information.
            </DialogDescription>
          </DialogHeader>
          <RealtorForm
            realtor={realtor}
            onSuccess={() => {
              setEditOpen(false);
              fetchRealtor();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}