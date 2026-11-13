import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthContext, hasPermission, isPlatformAdmin, listingWhereForContext } from '@/lib/auth/workspace';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  realtorId: z.string().min(1).optional(),
  propertyAddress: z.string().min(1),
  propertyFormattedAddress: z.string().optional().nullable(),
  propertyLat: z.number().optional().nullable(),
  propertyLng: z.number().optional().nullable(),
  propertyCity: z.string().optional().nullable(),
  propertyProvince: z.string().optional().nullable(),
  propertyPostalCode: z.string().optional().nullable(),
  propertyCountry: z.string().optional().nullable(),
  propertyPlaceId: z.string().optional().nullable(),
  propertySize: z.number().int().optional().nullable(),
  yearBuilt: z.number().int().optional().nullable(),
  mlsNumber: z.string().optional().nullable(),
  listPrice: z.number().int().optional().nullable(),
  bedrooms: z.preprocess(
    (value) => (value == null || value === '' ? null : String(value)),
    z.string().nullable()
  ),
  bathrooms: z.preprocess(
    (value) => (value == null || value === '' ? null : String(value)),
    z.string().nullable()
  ),
  description: z.string().optional().nullable(),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 200);
}

async function generateUniqueSlug(clientName: string, propertyAddress: string) {
  const base = `${slugify(clientName)}-${slugify(propertyAddress)}`;
  let candidate = base;
  let n = 0;
  while (true) {
    const existing = await prisma.listing.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (n > 10) throw new Error('Failed to generate unique slug');
  }
}

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isPlatformAdmin(ctx) && !ctx.workspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orders = await prisma.listing.findMany({
      where: listingWhereForContext(ctx),
      include: { realtor: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (ctx.emailVerified === false && !isPlatformAdmin(ctx)) {
      return NextResponse.json({ error: 'Email verification required' }, { status: 403 });
    }
    if (!hasPermission(ctx, 'MANAGE_LISTINGS')) {
      return NextResponse.json({ error: 'Missing permission' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse({
      ...body,
      propertyLat: body.propertyLat == null || body.propertyLat === '' ? null : Number(body.propertyLat),
      propertyLng: body.propertyLng == null || body.propertyLng === '' ? null : Number(body.propertyLng),
      propertySize: body.propertySize == null || body.propertySize === '' ? null : Number(body.propertySize),
      yearBuilt: body.yearBuilt == null || body.yearBuilt === '' ? null : Number(body.yearBuilt),
      listPrice: body.listPrice == null || body.listPrice === '' ? null : Number(body.listPrice),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid fields', details: parsed.error.flatten() }, { status: 400 });
    }

    // Resolve the workspace on the server. Never trust a stale JWT for this.
    const platformAdmin = isPlatformAdmin(ctx);
    const targetWorkspaceId = platformAdmin ? parsed.data.realtorId : ctx.workspaceId;

    if (!targetWorkspaceId) {
      return NextResponse.json(
        {
          error: platformAdmin
            ? 'realtorId is required'
            : 'No active workspace is available for this account',
        },
        { status: 400 }
      );
    }

    const realtor = await prisma.realtorWorkspace.findFirst({
      where: {
        id: targetWorkspaceId,
        ...(platformAdmin
          ? {}
          : { memberships: { some: { userId: ctx.userId, status: 'ACTIVE' } } }),
      },
    });
    if (!realtor) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    const clientName = [realtor.firstName, realtor.lastName].filter(Boolean).join(' ') || realtor.name;
    const slug = await generateUniqueSlug(clientName, parsed.data.propertyAddress);

    const [order] = await prisma.$transaction([
      prisma.listing.create({
        data: {
          realtorId: targetWorkspaceId,
          slug,
          status: 'DRAFT',
          propertyAddress: parsed.data.propertyAddress,
          propertyFormattedAddress: parsed.data.propertyFormattedAddress ?? null,
          propertyLat: parsed.data.propertyLat ?? null,
          propertyLng: parsed.data.propertyLng ?? null,
          propertyCity: parsed.data.propertyCity ?? null,
          propertyProvince: parsed.data.propertyProvince ?? null,
          propertyPostalCode: parsed.data.propertyPostalCode ?? null,
          propertyCountry: parsed.data.propertyCountry ?? null,
          propertyPlaceId: parsed.data.propertyPlaceId ?? null,
          propertySize: parsed.data.propertySize ?? null,
          yearBuilt: parsed.data.yearBuilt ?? null,
          mlsNumber: parsed.data.mlsNumber ?? null,
          listPrice: parsed.data.listPrice ?? null,
          bedrooms: parsed.data.bedrooms == null ? null : String(parsed.data.bedrooms),
          bathrooms: parsed.data.bathrooms == null ? null : String(parsed.data.bathrooms),
          description: parsed.data.description ?? null,
        },
        include: { realtor: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);

    // Automatically create three PropertyPage variants for this order
    await prisma.propertyPage.createMany({
      data: [
        { orderId: order.id, template: 1, urlPath: `/property/${order.id}/v1`, published: true },
        { orderId: order.id, template: 2, urlPath: `/property/${order.id}/v2`, published: true },
        { orderId: order.id, template: 3, urlPath: `/property/${order.id}/v3`, published: true },
      ],
      skipDuplicates: true,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

