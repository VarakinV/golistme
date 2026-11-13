import { NextRequest, NextResponse } from 'next/server';
import {
  requireListingPermission,
  WorkspaceAccessError,
} from '@/lib/auth/workspace';
import { getOrderMediaPresignedUrl, isS3Available } from '@/lib/utils/s3';
import { validateUpload, type UploadCategory } from '@/lib/media/validation';

const CATEGORIES: UploadCategory[] = [
  'photos',
  'videos',
  'floorplans',
  'attachments',
  'reels-sources',
];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isS3Available()) {
      return NextResponse.json({ error: 'S3 not configured' }, { status: 503 });
    }

    const { id } = await params;
    await requireListingPermission(id, 'MANAGE_LISTINGS');

    const { category, fileName, fileType } = await req.json();
    if (!category || !fileName || !fileType) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const validation = validateUpload(category, fileType, String(fileName));
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = await getOrderMediaPresignedUrl(id, category, fileName, fileType);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to create presigned URL' }, { status: 500 });
  }
}
