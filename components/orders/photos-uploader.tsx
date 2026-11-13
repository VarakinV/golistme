'use client';

import { MediaUploader } from '@/components/orders/media-uploader';

interface UploaderProps {
  orderId: string;
  onUploaded?: () => void;
  canManage?: boolean;
}

export function PhotosUploader({ orderId, onUploaded, canManage = true }: UploaderProps) {
  return (
    <MediaUploader
      orderId={orderId}
      category="photos"
      onUploaded={onUploaded}
      canManage={canManage}
    />
  );
}
