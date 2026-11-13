import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { deleteFromS3, getMlsPhotoUrl } from '@/lib/utils/s3';
import {
  requireListingAccess,
  requireListingPermission,
  listingWhereForContext,
  WorkspaceAccessError,
} from '@/lib/auth/workspace';

function errorResponse(e: unknown, fallback: string) {
  if (e instanceof WorkspaceAccessError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await requireListingAccess(id);
    const photos = await prisma.photo.findMany({
      where: { orderId: id, order: listingWhereForContext(ctx) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(photos);
  } catch (e) {
    return errorResponse(e, 'Failed to fetch photos');
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireListingPermission(id, 'MANAGE_LISTINGS');

    const body = await req.json();
    if (!Array.isArray(body)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const last = await prisma.photo.findFirst({
      where: { orderId: id },
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
      select: { sortOrder: true },
    });
    const base = (last?.sortOrder ?? -1) + 1;

    const created = await prisma.photo.createMany({
      data: body.map((p, idx) => ({
        orderId: id,
        url: p.url,
        urlMls: p.urlMls ?? null,
        filename: p.filename,
        sortOrder: base + idx,
      })),
    });

    const baseUrl = req.nextUrl.origin;
    try {
      fetch(`${baseUrl}/api/orders/${id}/media/photos/ensure-mls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlyMissing: true }),
      }).catch(() => {});
    } catch {}

    return NextResponse.json({ count: created.count }, { status: 201 });
  } catch (e) {
    return errorResponse(e, 'Failed to save photos');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await requireListingPermission(id, 'MANAGE_LISTINGS');

    const body = await req.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    if (!ids.length) return NextResponse.json({ error: 'No ids provided' }, { status: 400 });

    const items = await prisma.photo.findMany({
      where: { id: { in: ids }, orderId: id, order: listingWhereForContext(ctx) },
    });
    if (!items.length) return NextResponse.json({ ok: true, deleted: 0 });

    await prisma.photo.deleteMany({
      where: { id: { in: items.map((p) => p.id) }, orderId: id },
    });

    await Promise.all(
      items.map(async (p) => {
        // Delete the original, the stored MLS copy, and the deterministic MLS
        // path even when urlMls is still null (generation may be in flight).
        const urls = new Set<string>([p.url, getMlsPhotoUrl(id, p.filename)]);
        if (p.urlMls) urls.add(p.urlMls);

        for (const url of urls) {
          try {
            await deleteFromS3(url);
          } catch {}
        }
      })
    );

    return NextResponse.json({ ok: true, deleted: items.length });
  } catch (e) {
    return errorResponse(e, 'Failed to delete photos');
  }
}