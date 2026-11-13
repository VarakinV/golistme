'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function DownloadLinkButton({
  url,
  label = 'Download',
  fileName,
  className,
  fullWidth = true,
}: {
  url: string;
  label?: string;
  fileName?: string;
  className?: string;
  fullWidth?: boolean;
}) {
  function onClick() {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    if (fileName) a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={`${
        fullWidth ? 'w-full' : ''
      } justify-center whitespace-nowrap ${className || ''}`}
      disabled={!url}
    >
      <Download className="h-4 w-4" />
      <span className="ml-1">{label}</span>
    </Button>
  );
}