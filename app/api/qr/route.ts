import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  getAuthContext,
  hasPermission,
  isPlatformAdmin,
  listingWhereForContext,
} from '@/lib/auth/workspace';
import { z } from 'zod';

const schema = z.object({
  orderId: z.string(),
  propertyPageId: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(ctx, 'MANAGE_LISTINGS')) {
      return NextResponse.json({ error: 'Missing permission' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid fields' }, { status: 400 });
    }

    const order = await prisma.listing.findFirst({
      where: {
        id: parsed.data.orderId,
        ...(isPlatformAdmin(ctx) ? {} : listingWhereForContext(ctx)),
      },
      include: {
        propertyPages: {
          where: { published: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let propertyPageId = parsed.data.propertyPageId || null;
    if (!propertyPageId && order.propertyPages.length > 0) {
      propertyPageId = order.propertyPages[0].id;
    }

    const qrCode = await prisma.qRCode.create({
      data: {
        displayId: '',
        status: 'ACTIVE',
        createdByUserId: ctx.userId,
        assignments: {
          create: {
            orderId: order.id,
            propertyPageId,
            sendWeeklyStats: true,
          },
        },
      },
    });

    const displayId = `Q-${String(qrCode.seq).padStart(6, '0')}`;

    const updated = await prisma.qRCode.update({
      where: { id: qrCode.id },
      data: { displayId },
      include: {
        assignments: {
          where: { unassignedAt: null },
          include: {
            order: {
              include: {
                realtor: true,
              },
            },
            propertyPage: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('[QR CREATE]', e);
    return NextResponse.json({ error: 'Failed to create QR code' }, { status: 500 });
  }
}