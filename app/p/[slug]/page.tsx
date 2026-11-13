import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import PropertyTemplateV1 from '@/components/property/templates/PropertyTemplateV1';
import PropertyTemplateV2 from '@/components/property/templates/PropertyTemplateV2';
import PropertyTemplateV3 from '@/components/property/templates/PropertyTemplateV3';
import PropertyTemplateV4 from '@/components/property/templates/PropertyTemplateV4';
import PropertyTemplateV5 from '@/components/property/templates/PropertyTemplateV5';
import PropertyTemplateV6 from '@/components/property/templates/PropertyTemplateV6';
import SimilarHomesLeadPopup from '@/components/property/SimilarHomesLeadPopup';
import HomeWorthWidget from '@/components/property/HomeWorthWidget';
import MortgageCalculatorTag from '@/components/property/MortgageCalculatorTag';

export const dynamic = 'force-dynamic';

async function getListing(slug: string) {
  return prisma.listing.findUnique({
    where: { slug },
    include: {
      realtor: true,
      photos: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      },
      videos: true,
      floorPlans: true,
      attachments: true,
      embeds: true,
      propertyPages: true,
    },
  });
}

async function baseUrl() {
  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto =
    hdrs.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'development' ? 'http' : 'https');
  return process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : '');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing || listing.status === 'DRAFT') return {};

  const title = listing.propertyFormattedAddress || listing.propertyAddress;
  const description = `View this property at ${title} — photos, floor plans, and more.`;
  const image = listing.photos[0]?.urlMls || listing.photos[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: `/p/${listing.slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PublicPropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListing(slug);

  if (!listing || listing.status === 'DRAFT') notFound();

  const url = await baseUrl();
  const template = listing.propertyPages?.find((page) => page.published)?.template ?? 1;
  const heroUrl = listing.photos[0]?.url || listing.photos[0]?.urlMls || undefined;
  const area = listing.propertyCity?.trim() || '';

  return (
    <div className="min-h-screen bg-white">
      {heroUrl ? <link rel="preload" as="image" href={heroUrl} /> : null}
      {template === 2 && <PropertyTemplateV2 order={listing} baseUrl={url} />}
      {template === 3 && <PropertyTemplateV3 order={listing} baseUrl={url} />}
      {template === 4 && <PropertyTemplateV4 order={listing} baseUrl={url} />}
      {template === 5 && <PropertyTemplateV5 order={listing} baseUrl={url} />}
      {template === 6 && <PropertyTemplateV6 order={listing} baseUrl={url} />}
      {![2, 3, 4, 5, 6].includes(template) && (
        <PropertyTemplateV1 order={listing} baseUrl={url} />
      )}
      <SimilarHomesLeadPopup
        orderId={listing.id}
        listPrice={listing.listPrice}
        area={area || 'this area'}
      />
      <MortgageCalculatorTag orderId={listing.id} template={String(template)} />
      <HomeWorthWidget orderId={listing.id} />
    </div>
  );
}