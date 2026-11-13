import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { resolveListingStatusUpdate } from '@/lib/listings/status';
import { deleteListingCompletely } from '@/lib/listings/delete';
import {
  getAuthContext,
  hasPermission,
  listingWhereForContext,
  WorkspaceAccessError,
} from '@/lib/auth/workspace';

const REALTOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  headshot: true,
  companyName: true,
  companyLogo: true,
} as const;

async function loadListingForCaller(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) throw new WorkspaceAccessError('Unauthorized', 401);

  const listing = await prisma.listing.findFirst({
    where: { id, ...listingWhereForContext(ctx) },
    include: { realtor: { select: REALTOR_SELECT } },
  });
  if (!listing) throw new WorkspaceAccessError('Order not found', 404);

  return { ctx, listing };
}

function errorResponse(e: unknown, fallback: string) {
  if (e instanceof WorkspaceAccessError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { listing } = await loadListingForCaller(id);
    return NextResponse.json(listing);
  } catch (e) {
    return errorResponse(e, 'Failed to fetch order');
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { ctx, listing: current } = await loadListingForCaller(id);
    if (!hasPermission(ctx, 'MANAGE_LISTINGS')) {
      return NextResponse.json({ error: 'Missing permission' }, { status: 403 });
    }

    const body = await req.json();

    const statusUpdate =
      body.status != null ? resolveListingStatusUpdate(current.status, body.status) : null;
    if (statusUpdate && !statusUpdate.ok) {
      return NextResponse.json({ error: statusUpdate.error }, { status: 400 });
    }

    // Only allow updates to property data and status for now
    const updated = await prisma.listing.update({
      where: { id },
      data: {
        propertyAddress: body.propertyAddress,
        propertyFormattedAddress: body.propertyFormattedAddress ?? null,
        propertyLat: body.propertyLat == null || body.propertyLat === '' ? null : Number(body.propertyLat),
        propertyLng: body.propertyLng == null || body.propertyLng === '' ? null : Number(body.propertyLng),
        propertyCity: body.propertyCity ?? null,
        propertyProvince: body.propertyProvince ?? null,
        propertyPostalCode: body.propertyPostalCode ?? null,
        propertyCountry: body.propertyCountry ?? null,
        propertyPlaceId: body.propertyPlaceId ?? null,
        propertyAddressOverride: body.propertyAddressOverride ?? null,
        propertyCityOverride: body.propertyCityOverride ?? null,
        propertyPostalCodeOverride: body.propertyPostalCodeOverride ?? null,
        propertySize: body.propertySize == null || body.propertySize === '' ? null : Number(body.propertySize),
        yearBuilt: body.yearBuilt == null || body.yearBuilt === '' ? null : Number(body.yearBuilt),
        mlsNumber: body.mlsNumber ?? null,
        listPrice: body.listPrice == null || body.listPrice === '' ? null : Number(body.listPrice),
        bedrooms: body.bedrooms == null || body.bedrooms === '' ? null : String(body.bedrooms),
        bathrooms: body.bathrooms == null || body.bathrooms === '' ? null : String(body.bathrooms),
        featuresText: body.featuresText ?? null,
        description: body.description ?? null,
        ...(statusUpdate?.ok
          ? { status: statusUpdate.status, ...statusUpdate.timestamps }
          : {}),
      },
      include: { realtor: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, headshot: true, companyName: true, companyLogo: true } } },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return errorResponse(e, 'Failed to update order');
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { ctx, listing: current } = await loadListingForCaller(id);
    if (!hasPermission(ctx, 'MANAGE_LISTINGS')) {
      return NextResponse.json({ error: 'Missing permission' }, { status: 403 });
    }

    const body: any = await req.json();
    const data: any = {};

    const statusUpdate =
      body.status != null ? resolveListingStatusUpdate(current.status, body.status) : null;
    if (statusUpdate && !statusUpdate.ok) {
      return NextResponse.json({ error: statusUpdate.error }, { status: 400 });
    }

    if ('propertyAddress' in body) data.propertyAddress = body.propertyAddress;
    if ('propertyFormattedAddress' in body)
      data.propertyFormattedAddress = body.propertyFormattedAddress ?? null;
    if ('propertyLat' in body)
      data.propertyLat =
        body.propertyLat == null || body.propertyLat === ''
          ? null
          : Number(body.propertyLat);
    if ('propertyLng' in body)
      data.propertyLng =
        body.propertyLng == null || body.propertyLng === ''
          ? null
          : Number(body.propertyLng);
    if ('propertyCity' in body) data.propertyCity = body.propertyCity ?? null;
    if ('propertyProvince' in body)
      data.propertyProvince = body.propertyProvince ?? null;
    if ('propertyPostalCode' in body)
      data.propertyPostalCode = body.propertyPostalCode ?? null;
    if ('propertyCountry' in body)
      data.propertyCountry = body.propertyCountry ?? null;
    if ('propertyPlaceId' in body)
      data.propertyPlaceId = body.propertyPlaceId ?? null;
    if ('propertyAddressOverride' in body)
      data.propertyAddressOverride = body.propertyAddressOverride ?? null;
    if ('propertyCityOverride' in body)
      data.propertyCityOverride = body.propertyCityOverride ?? null;
    if ('propertyPostalCodeOverride' in body)
      data.propertyPostalCodeOverride = body.propertyPostalCodeOverride ?? null;
    if ('propertySize' in body)
      data.propertySize =
        body.propertySize == null || body.propertySize === ''
          ? null
          : Number(body.propertySize);
    if ('yearBuilt' in body)
      data.yearBuilt =
        body.yearBuilt == null || body.yearBuilt === ''
          ? null
          : Number(body.yearBuilt);
    if ('mlsNumber' in body) data.mlsNumber = body.mlsNumber ?? null;
    if ('listPrice' in body)
      data.listPrice =
        body.listPrice == null || body.listPrice === ''
          ? null
          : Number(body.listPrice);
    if ('bedrooms' in body)
      data.bedrooms =
        body.bedrooms == null || body.bedrooms === ''
          ? null
          : Number(body.bedrooms);
    if ('bathrooms' in body)
      data.bathrooms =
        body.bathrooms == null || body.bathrooms === ''
          ? null
          : Number(body.bathrooms);
    if ('featuresText' in body) data.featuresText = body.featuresText ?? null;
    if ('description' in body) data.description = body.description ?? null;
    if ('status' in body) {
      if (!statusUpdate?.ok) {
        return NextResponse.json({ error: 'Invalid status update' }, { status: 400 });
      }
      data.status = statusUpdate.status;
      Object.assign(data, statusUpdate.timestamps);
    }

    const updated = await prisma.listing.update({
      where: { id },
      data,
      include: { realtor: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, headshot: true, companyName: true, companyLogo: true } } },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return errorResponse(e, 'Failed to update order');
  }
}


export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { ctx } = await loadListingForCaller(id);
    if (!hasPermission(ctx, 'MANAGE_LISTINGS')) {
      return NextResponse.json({ error: 'Missing permission' }, { status: 403 });
    }

    // Remove the listing and all of its assets. QR codes and printables stay.
    await deleteListingCompletely(id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, 'Failed to delete order');
  }
}
