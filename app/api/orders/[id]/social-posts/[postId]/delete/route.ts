import { NextRequest, NextResponse } from 'next/server';

import { requireListingPermission, WorkspaceAccessError } from '@/lib/auth/workspace';
import { prisma } from '@/lib/db/prisma';
import { deleteFromS3, isS3Available } from '@/lib/utils/s3';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; postId: string }> }) {
  try {
    const { id, postId } = await params;
    await requireListingPermission(id, 'GENERATE_MARKETING');

    const post = await prisma.orderSocialPost.findUnique({ where: { id: postId } });
    if (!post || post.orderId !== id) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    if (isS3Available() && post.url) {
      try {
        const host = new URL(post.url).hostname || '';
        if (host.includes('s3.amazonaws.com') || host.includes('.s3.')) await deleteFromS3(post.url);
      } catch {}
    }

    await prisma.orderSocialPost.delete({ where: { id: postId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
