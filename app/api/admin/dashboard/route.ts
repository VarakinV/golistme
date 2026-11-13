import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

function getMonthRange(year: number, monthIndex: number) {
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));
  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const me = session?.user as any | null;
    if (!me?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me.platformRole !== "ADMIN" && me.platformRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const search = req.nextUrl.searchParams;
    const yearParam = search.get("year");
    const now = new Date();
    const year = yearParam ? Number(yearParam) : now.getUTCFullYear();
    const { start: monthStart, end: monthEnd } = getMonthRange(
      now.getUTCFullYear(),
      now.getUTCMonth()
    );

    const [totalAllTime, totalThisMonth, listingRows, paymentRows] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.$queryRaw<{ month: number; count: number }[]>`
        SELECT EXTRACT(MONTH FROM "createdAt")::int AS month, COUNT(*)::int AS count
        FROM "Listing"
        WHERE EXTRACT(YEAR FROM "createdAt") = ${year}
        GROUP BY 1
      `,
      prisma.$queryRaw<{ month: number; sum: string | number; count: number }[]>`
        SELECT EXTRACT(MONTH FROM "createdAt")::int AS month,
               COALESCE(SUM("amountCents"), 0) AS sum,
               COUNT(*)::int AS count
        FROM "Payment"
        WHERE status = 'SUCCEEDED'
          AND EXTRACT(YEAR FROM "createdAt") = ${year}
        GROUP BY 1
      `,
    ]);

    const byMonthCounts = Array.from({ length: 12 }, () => 0);
    for (const row of listingRows) {
      byMonthCounts[row.month - 1] = Number(row.count);
    }

    const aovByMonthSeries = Array.from({ length: 12 }, () => 0);
    for (const row of paymentRows) {
      const count = Number(row.count);
      if (count > 0) {
        aovByMonthSeries[row.month - 1] = Math.round(Number(row.sum) / count);
      }
    }

    const grouped = await prisma.listing.groupBy({
      by: ["realtorId"],
      where: { createdAt: { gte: monthStart, lt: monthEnd } },
      _count: { _all: true },
    });

    const realtorIds = grouped.map((g) => g.realtorId);
    const realtors = realtorIds.length
      ? await prisma.realtorWorkspace.findMany({
          where: { id: { in: realtorIds } },
          select: { id: true, name: true, firstName: true, lastName: true, headshot: true },
        })
      : [];
    const realtorMap = new Map(realtors.map((r) => [r.id, r] as const));
    const topRealtors = grouped
      .map((g) => ({
        count: g._count?._all ?? 0,
        realtor: realtorMap.get(g.realtorId),
      }))
      .filter((x) => x.realtor)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const lastOrders = await prisma.listing.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        propertyAddress: true,
        createdAt: true,
        status: true,
        realtor: { select: { name: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({
      totals: { month: totalThisMonth, allTime: totalAllTime },
      byMonth: { year, series: byMonthCounts },
      aovByMonth: { year, series: aovByMonthSeries },
      topRealtors,
      lastOrders,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load dashboard stats" }, { status: 500 });
  }
}