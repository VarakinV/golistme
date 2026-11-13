import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthContext, isPlatformAdmin } from '@/lib/auth/workspace';

export async function GET(_request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = isPlatformAdmin(ctx);
    const where = admin
      ? {}
      : {
          OR: [
            ...(ctx.workspaceId
              ? [
                  {
                    assignments: {
                      some: {
                        order: { realtorId: ctx.workspaceId },
                        unassignedAt: null,
                      },
                    },
                  },
                ]
              : []),
            // Keep QR codes visible to the person who created them even after
            // their listing was deleted, so a printed code can be reused.
            { createdByUserId: ctx.userId },
          ],
        };

    const qrCodes = await prisma.qRCode.findMany({
      where,
      include: {
        assignments: {
          where: { unassignedAt: null },
          include: {
            order: {
              include: {
                realtor: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            propertyPage: true,
          },
        },
        printables: {
          orderBy: { createdAt: 'asc' },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(qrCodes);
  } catch (e) {
    console.error('[QR LIST]', e);
    return NextResponse.json({ error: 'Failed to fetch QR codes' }, { status: 500 });
  }
}