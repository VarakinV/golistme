import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { deleteFromS3 } from '@/lib/utils/s3';
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
    const floorPlans = await prisma.floorPlan.findMany({
      where: { orderId: id, order: listingWhereForContext(ctx) },
    });
    return NextResponse.json(floorPlans);
  } catch (e) {
    return errorResponse(e, 'Failed to fetch floor plans');
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireListingPermission(id, 'MANAGE_LISTINGS');

    const body = await req.json();
    if (!Array.isArray(body)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const created = await prisma.floorPlan.createMany({
      data: body.map((p) => ({ orderId: id, url: p.url, filename: p.filename })),
    });

    return NextResponse.json({ count: created.count }, { status: 201 });
  } catch (e) {
    return errorResponse(e, 'Failed to save floor plans');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await requireListingPermission(id, 'MANAGE_LISTINGS');

    const body = await req.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    if (!ids.length) return NextResponse.json({ error: 'No ids provided' }, { status: 400 });

    const items = await prisma.floorPlan.findMany({
      where: { id: { in: ids }, orderId: id, order: listingWhereForContext(ctx) },
    });
    if (!items.length) return NextResponse.json({ ok: true, deleted: 0 });

    await prisma.floorPlan.deleteMany({
      where: { id: { in: items.map((p) => p.id) }, orderId: id },
    });

    await Promise.all(items.map(async (p) => { try { await deleteFromS3(p.url); } catch {} }));

    return NextResponse.json({ ok: true, deleted: items.length });
  } catch (e) {
    return errorResponse(e, 'Failed to delete floor plans');
  }
}