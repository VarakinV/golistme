import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

import { requireListingPermission, WorkspaceAccessError } from '@/lib/auth/workspace';
import { prisma } from '@/lib/db/prisma';
import { isS3Available, uploadBufferToS3WithPath } from '@/lib/utils/s3';
import { renderSocialPost } from '@/lib/social/generator';

function getBaseUrlFromHeaders(req: NextRequest): string {
  const hdrs = req.headers;
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'development' ? 'http' : 'https');
  const fallbackBase = process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : '');
  return (fallbackBase || '').replace(/\/$/, '');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; postId: string }> }) {
  try {
    const { id, postId } = await params;
    await requireListingPermission(id, 'GENERATE_MARKETING');
    if (!isS3Available()) return NextResponse.json({ error: 'S3 not configured' }, { status: 503 });

    const post = await prisma.orderSocialPost.findUnique({ where: { id: postId } });
    if (!post || post.orderId !== id) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    const order = await prisma.listing.findUnique({
      where: { id },
      include: {
        realtor: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            headshot: true,
            companyLogo: true,
            companyName: true,
          },
        },
      },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const sources = await prisma.orderReelSourceImage.findMany({ where: { orderId: id }, orderBy: { sortOrder: 'asc' } });
    if (sources.length < 1) return NextResponse.json({ error: 'At least 1 image required' }, { status: 400 });

    const template = await prisma.socialPostTemplate.findUnique({ where: { variantKey: post.variantKey } });
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    const r = order.realtor as any;
    const street = order.propertyAddressOverride || order.propertyAddress || '';
    const city = order.propertyCityOverride || order.propertyCity || '';
    const postal = order.propertyPostalCodeOverride || order.propertyPostalCode || '';
    const province = order.propertyProvince || '';
    const formatted = order.propertyFormattedAddress;
    const hasOverrides = !!(order.propertyAddressOverride || order.propertyCityOverride || order.propertyPostalCodeOverride);
    const fullAddress = hasOverrides
      ? [street, [city, province].filter(Boolean).join(' '), postal].filter(Boolean).join(', ').replace(/,\s*,/g, ', ').trim()
      : (formatted || [street, [city, province].filter(Boolean).join(' '), postal].filter(Boolean).join(', ').replace(/,\s*,/g, ', ').trim());
    const shortAddress = [street, city].filter(Boolean).join(', ').trim();

    const base = getBaseUrlFromHeaders(req);
    const qrUrl = `${base}/property/${id}/v1`;

    try {
      await prisma.orderSocialPost.update({
        where: { id: postId },
        data: { status: 'RENDERING', error: null, url: null },
      });

      const { png, width, height } = await renderSocialPost({
        variantKey: post.variantKey,
        label: template.label,
        images: sources.slice(0, 6).map((s) => s.url),
        property: {
          address: shortAddress,
          city,
          province,
          postalCode: postal,
          bedrooms: order.bedrooms,
          bathrooms: order.bathrooms,
          sqft: order.propertySize,
          listPrice: order.listPrice,
          mlsNumber: order.mlsNumber,
        },
        realtor: {
          name: `${r?.firstName || ''} ${r?.lastName || ''}`.trim(),
          phone: r?.phone || null,
          email: r?.email || null,
          companyName: r?.companyName || null,
          headshotUrl: r?.headshot || null,
          logoUrl: r?.companyLogo || null,
        },
        qrUrl,
      });

      const fileName = `${post.variantKey}-${Date.now()}.png`;
      const { fileUrl } = await uploadBufferToS3WithPath(`orders/${id}/social-posts`, fileName, png, 'image/png');

      await prisma.orderSocialPost.update({
        where: { id: postId },
        data: { status: 'COMPLETE', url: fileUrl, width, height, error: null },
      });
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      await prisma.orderSocialPost.update({
        where: { id: postId },
        data: { status: 'FAILED', error: String(err?.message || err) },
      });
      return NextResponse.json({ error: 'Render failed', details: String(err?.message || err) }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: 'Render request failed' }, { status: 500 });
  }
}
