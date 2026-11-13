import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthContext, hasPermission, isPlatformAdmin } from '@/lib/auth/workspace';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const canViewLeads = hasPermission(ctx, 'VIEW_LEADS');
    const canViewAnalytics = hasPermission(ctx, 'VIEW_ANALYTICS');
    if (!canViewLeads && !canViewAnalytics) {
      return NextResponse.json({ error: 'Missing permission' }, { status: 403 });
    }
    const isAdmin = isPlatformAdmin(ctx);
    const realtorId = ctx.workspaceId;
    const currentUserId = ctx.userId;

    const qrCode = await prisma.qRCode.findUnique({
      where: { id },
      include: {
        assignments: {
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
            scans: {
              orderBy: { scannedAt: 'desc' },
            },
            leads: {
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    if (!qrCode) {
      return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
    }

    if (!isAdmin) {
      const hasAccess = qrCode.assignments.some(
        (a) => a.order.realtorId === realtorId
      );
      if (!hasAccess && qrCode.createdByUserId !== currentUserId) {
        return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
      }
    }

    const assignmentStats = qrCode.assignments.map((assignment) => {
      const totalScans = canViewAnalytics ? assignment.scans.length : 0;
      const totalLeads = canViewLeads ? assignment.leads.length : 0;

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recentScans = canViewAnalytics
        ? assignment.scans.filter((s) => s.scannedAt >= sevenDaysAgo).length
        : 0;
      const recentLeads = canViewLeads
        ? assignment.leads.filter((l) => l.createdAt >= sevenDaysAgo).length
        : 0;

      return {
        id: assignment.id,
        assignedAt: assignment.assignedAt,
        unassignedAt: assignment.unassignedAt,
        sendWeeklyStats: assignment.sendWeeklyStats,
        order: {
          id: assignment.order.id,
          propertyAddress: assignment.order.propertyFormattedAddress || assignment.order.propertyAddress,
          realtor: assignment.order.realtor,
        },
        propertyPage: assignment.propertyPage,
        totalScans,
        totalLeads,
        recentScans,
        recentLeads,
        scans: canViewAnalytics
          ? assignment.scans.map((s) => ({
              id: s.id,
              scannedAt: s.scannedAt,
              userAgent: s.userAgent,
            }))
          : [],
        leads: canViewLeads
          ? assignment.leads.map((l) => ({
              id: l.id,
              name: l.name,
              email: l.email,
              phone: l.phone,
              createdAt: l.createdAt,
            }))
          : [],
      };
    });

    return NextResponse.json({
      qrCode: {
        id: qrCode.id,
        displayId: qrCode.displayId,
        status: qrCode.status,
        createdAt: qrCode.createdAt,
      },
      view: { leads: canViewLeads, analytics: canViewAnalytics },
      assignments: assignmentStats,
    });
  } catch (e) {
    console.error('[QR STATS]', e);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
