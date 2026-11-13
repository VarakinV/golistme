import { NextRequest, NextResponse } from 'next/server';
import { requireListingPermission, WorkspaceAccessError } from '@/lib/auth/workspace';
import { prisma } from '@/lib/db/prisma';
import { RemotionProvider } from '@/lib/video/remotion-provider';
import { resolvePropertyAddress } from '@/lib/video/remotion-queue';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; reelId: string }> }) {
  try {
    const { id, reelId } = await params;
    await requireListingPermission(id, 'GENERATE_MARKETING');

    const reel = await prisma.orderReel.findUnique({ where: { id: reelId } });
    if (!reel || reel.orderId !== id) return NextResponse.json({ error: 'Reel not found' }, { status: 404 });

    const order = await prisma.listing.findUnique({
      where: { id },
      include: {
        realtor: {
          select: { id: true, firstName: true, lastName: true, phone: true, headshot: true, companyLogo: true },
        },
      },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const sources = await prisma.orderReelSourceImage.findMany({
      where: { orderId: id },
      orderBy: { sortOrder: 'asc' },
    });
    if (sources.length < 3) return NextResponse.json({ error: 'Need at least 3 images' }, { status: 400 });

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // no body
    }
    let musicTrackId = reel.musicTrackId;
    if (typeof body?.musicTrackId === 'string') {
      musicTrackId = body.musicTrackId.trim() || null;
    }
    if (musicTrackId !== reel.musicTrackId) {
      await prisma.orderReel.update({ where: { id: reelId }, data: { musicTrackId } });
    }

    const hdrs = req.headers;
    const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
    const proto = hdrs.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'development' ? 'http' : 'https');
    const fallbackBase = process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : '');

    const explicitWebhook = process.env.REMOTION_WEBHOOK_URL?.trim();
    const token = process.env.REMOTION_WEBHOOK_TOKEN;
    let webhookUrl: string | undefined;
    if (explicitWebhook) {
      const hasPath = /\/api\/integrations\/remotion(\?|$)/i.test(explicitWebhook);
      webhookUrl = hasPath ? explicitWebhook : `${explicitWebhook.replace(/\/$/, '')}/api/integrations/remotion`;
      if (token) webhookUrl += (webhookUrl.includes('?') ? '&' : '?') + `token=${token}`;
    } else {
      const base = (fallbackBase || '').replace(/\/$/, '');
      webhookUrl = base ? `${base}/api/integrations/remotion${token ? `?token=${token}` : ''}` : undefined;
    }

    const images = sources.map((s) => s.url);

    let musicTrackUrl: string | undefined;
    if (musicTrackId) {
      const track = await prisma.videoMusicTrack.findUnique({
        where: { id: musicTrackId },
        select: { fileUrl: true },
      });
      musicTrackUrl = track?.fileUrl || undefined;
    }

    const { address, street, city, postalCode: postal, province } = resolvePropertyAddress(order);

    const rinfo = order.realtor as any;
    const meta = {
      orderId: id,
      address,
      street,
      city,
      postalCode: postal,
      province,
      bedrooms: order.bedrooms || 0,
      bathrooms: order.bathrooms || 0,
      sqft: order.propertySize || 0,
      realtorPhone: rinfo?.phone || '',
      realtorHeadshot: rinfo?.headshot || '',
      realtorLogo: rinfo?.companyLogo || '',
      realtorName: `${rinfo?.firstName || ''} ${rinfo?.lastName || ''}`.trim(),
      musicTrackUrl,
    };

    try {
      const { renderId } = await new RemotionProvider().render({
        images,
        variantKey: reel.variantKey as any,
        webhookUrl: webhookUrl || '',
        meta,
      });
      await prisma.orderReel.update({
        where: { id: reelId },
        data: { renderId, provider: 'remotion', status: 'RENDERING', url: null, thumbnail: null, error: null },
      });
      return NextResponse.json({ ok: true, renderId });
    } catch (err: any) {
      await prisma.orderReel.update({
        where: { id: reelId },
        data: { status: 'FAILED', error: String(err?.message || err) },
      });
      return NextResponse.json(
        { error: 'Failed to submit render', details: String(err?.message || err) },
        { status: 400 }
      );
    }
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: 'Retry failed' }, { status: 500 });
  }
}