'use client';

import { MediaUploader } from '@/components/orders/media-uploader';

interface Props {
  orderId: string;
  onUploaded?: () => void;
  canManage?: boolean;
}

export function AttachmentsUploader({ orderId, onUploaded, canManage = true }: Props) {
  return (
    <MediaUploader
      orderId={orderId}
      category="attachments"
      onUploaded={onUploaded}
      canManage={canManage}
    />
  );
}
