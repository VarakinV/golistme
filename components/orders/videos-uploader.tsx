'use client';

import { MediaUploader } from '@/components/orders/media-uploader';

interface Props {
  orderId: string;
  onUploaded?: () => void;
  canManage?: boolean;
}

export function VideosUploader({ orderId, onUploaded, canManage = true }: Props) {
  return (
    <MediaUploader
      orderId={orderId}
      category="videos"
      onUploaded={onUploaded}
      canManage={canManage}
    />
  );
}
