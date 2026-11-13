import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthContext, hasPermission } from "@/lib/auth/workspace";
import { buildLeadWhere } from "@/lib/leads/query";

function csvCell(value: string | null | undefined): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function csvRow(values: Array<string | null | undefined>): string {
  return values.map(csvCell).join(",");
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(ctx, "VIEW_LEADS")) {
    return NextResponse.json({ error: "Missing permission" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const where = buildLeadWhere(ctx, {
    q: searchParams.get("q"),
    source: searchParams.get("source"),
  });

  const ids = (searchParams.get("ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length) where.id = { in: ids };

  const leads = await prisma.propertyInquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      order: {
        select: { propertyAddress: true, propertyFormattedAddress: true, slug: true },
      },
    },
  });

  const lines = [
    csvRow([
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Property Address",
      "Source",
      "Captured At",
      "Message",
    ]),
  ];

  for (const lead of leads) {
    const parts = lead.name.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ");
    const address =
      lead.order?.propertyFormattedAddress || lead.order?.propertyAddress || "";
    lines.push(
      csvRow([
        firstName,
        lastName,
        lead.email,
        lead.phone,
        address,
        lead.source,
        lead.createdAt.toISOString(),
        lead.message,
      ])
    );
  }

  const body = "\uFEFF" + lines.join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
