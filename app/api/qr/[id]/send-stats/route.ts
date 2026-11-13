import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthContext, hasPermission, isPlatformAdmin } from '@/lib/auth/workspace';
import { z } from 'zod';

const schema = z.object({
  sendWeeklyStats: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(ctx, 'MANAGE_LISTINGS')) {
      return NextResponse.json({ error: 'Missing permission' }, { status: 403 });
    }

    const { id } = await params;
    const isAdmin = isPlatformAdmin(ctx);
    const realtorId = ctx.workspaceId;

    const assignment = await prisma.qRAssignment.findUnique({
      where: { id },
      include: {
        qrCode: true,
        order: true,
      },
    });

    if (!assignment || assignment.unassignedAt !== null) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    if (!isAdmin) {
      if (assignment.order.realtorId !== realtorId) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid fields' }, { status: 400 });
    }

    const updated = await prisma.qRAssignment.update({
      where: { id },
      data: { sendWeeklyStats: parsed.data.sendWeeklyStats },
      include: {
        order: {
          include: {
            realtor: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('[QR SEND STATS]', e);
    return NextResponse.json({ error: 'Failed to update send stats' }, { status: 500 });
  }
}
