'use client';

import { MediaUploader } from '@/components/orders/media-uploader';

interface Props {
  orderId: string;
  onUploaded?: () => void;
  canManage?: boolean;
}

export function FloorplansUploader({ orderId, onUploaded, canManage = true }: Props) {
  return (
    <MediaUploader
      orderId={orderId}
      category="floorplans"
      onUploaded={onUploaded}
      canManage={canManage}
    />
  );
}
