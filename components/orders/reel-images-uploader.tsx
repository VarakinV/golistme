"use client";

import { MediaUploader } from "@/components/orders/media-uploader";

interface UploaderProps {
  orderId: string;
  onUploaded?: () => void;
  refreshToken?: number;
  canManage?: boolean;
}

export function ReelImagesUploader({
  orderId,
  onUploaded,
  refreshToken = 0,
  canManage = true,
}: UploaderProps) {
  return (
    <MediaUploader
      orderId={orderId}
      category="reels-sources"
      onUploaded={onUploaded}
      refreshToken={refreshToken}
      canManage={canManage}
      maxFiles={6}
      hint="Drag and drop up to 6 images. At least 3 images are required to generate reels and flyers."
    />
  );
}
