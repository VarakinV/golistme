import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

import {
  requireListingPermission,
  hasPermission,
  WorkspaceAccessError,
} from '@/lib/auth/workspace';
import { prisma } from '@/lib/db/prisma';
import { isS3Available } from '@/lib/utils/s3';


export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isS3Available()) return NextResponse.json({ error: 'S3 not configured' }, { status: 503 });

    const { id } = await params;
    const ctx = await requireListingPermission(id, 'GENERATE_MARKETING');
    if (!hasPermission(ctx, 'GENERATE_MARKETING')) {
      return NextResponse.json({ error: 'Missing permission' }, { status: 403 });
    }

    const order = await prisma.listing.findUnique({
      where: { id },
      include: {
        realtor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            headshot: true,
            companyLogo: true,
          },
        },
      },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Validate sources 3..6 (reuse reel sources)
    const sources = await prisma.orderReelSourceImage.findMany({ where: { orderId: id }, orderBy: { sortOrder: 'asc' } });
    if (sources.length < 3) return NextResponse.json({ error: 'At least 3 images required' }, { status: 400 });
    if (sources.length > 6) return NextResponse.json({ error: 'Max 6 images allowed' }, { status: 400 });

    // Validate required fields for flyers
    const missing: string[] = [];
    const r = order.realtor as any;
    if (!r?.headshot) missing.push('Realtor headshot');
    if (!r?.companyLogo) missing.push('Brokerage logo');
    if (!r?.firstName || !r?.lastName) missing.push('Realtor name');
    if (!r?.phone) missing.push('Realtor phone');
    if (!r?.email) missing.push('Realtor email');
    if (!order.bedrooms) missing.push('Bedrooms');
    if (!order.bathrooms) missing.push('Bathrooms');
    if (!order.propertySize) missing.push('Size (sq ft)');
    if (!order.propertyAddress && !order.propertyFormattedAddress) missing.push('Property address');

    if (missing.length) return NextResponse.json({ error: 'Missing fields', missing }, { status: 400 });


    const variants: Array<'f1' | 'f2' | 'f3'> = ['f1', 'f2', 'f3'];

    // Create DB rows as QUEUED
    const created = await prisma.$transaction(
      variants.map((vk) =>
        prisma.orderFlyer.create({
          data: { orderId: id, variantKey: vk, status: 'QUEUED' },
        })
      )
    );
    // Do not render here; just create placeholders so the client can trigger
    // per-variant renders via the retry endpoint, staggered to be Hobby-safe.

    return NextResponse.json({ ok: true, created: created.map((c) => c.id) });
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to generate flyers' }, { status: 500 });
  }
}

