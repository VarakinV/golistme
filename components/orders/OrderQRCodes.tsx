'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  QrCode,
  Plus,
  TrendingUp,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { QrDeleteButton } from '@/components/qr/QrDeleteButton';
import { QRCodeStatsDialog } from '@/components/qr/QRCodeStatsDialog';
import { requestPermission, showErrorDialog } from '@/lib/ui/feedback';

interface QRCode {
  id: string;
  displayId: string;
  status: 'UNASSIGNED' | 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  assignments: {
    id: string;
    sendWeeklyStats: boolean;
    order: {
      id: string;
      propertyAddress: string;
    };
  }[];
  printables: {
    id: string;
    variantKey: string;
    status: string;
    pngUrl?: string | null;
    pdfUrl?: string | null;
  }[];
}

interface OrderQRCodesProps {
  orderId: string;
  canManage?: boolean;
  canViewStats?: boolean;
}

export function OrderQRCodes({
  orderId,
  canManage = true,
  canViewStats = true,
}: OrderQRCodesProps) {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedQR, setSelectedQR] = useState<QRCode | null>(null);
  const [showStats, setShowStats] = useState(false);

  async function loadQRCodes(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/qr/list');
      if (res.ok) {
        const data = await res.json();
        const orderQRCodes = data.filter((qr: QRCode) =>
          qr.assignments.some((a) => a.order.id === orderId)
        );
        setQrCodes(orderQRCodes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadQRCodes();
  }, [orderId]);

  async function handleGenerate() {
    if (!canManage) {
      requestPermission('generate or delete QR codes');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      if (res.ok) {
        const qrCode = await res.json();

        const printRes = await fetch(`/api/qr/${qrCode.id}/printables`, {
          method: 'POST',
        });

        await loadQRCodes(true);

        if (printRes.ok) {
          const printData = await printRes.json().catch(() => ({}));
          const hasFailure = Array.isArray(printData.printables)
            ? printData.printables.some(
                (printable: { status?: string }) => printable.status === 'FAILED'
              )
            : false;
          if (hasFailure) {
            showErrorDialog(
              `QR code ${qrCode.displayId} was created, but some print files failed. Try generating the QR code again.`,
              'Some print files failed'
            );
          } else {
            toast.success(`QR code ${qrCode.displayId} and print files are ready`);
          }
        } else {
          const data = await printRes.json().catch(() => ({}));
          showErrorDialog(
            data.error ||
              `QR code ${qrCode.displayId} was created, but its print files could not be generated. Try again.`,
            'Print files not ready'
          );
        }
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) requestPermission('generate or delete QR codes');
        else
          showErrorDialog(
            data.error || 'The QR code could not be created.',
            'Could not create QR code'
          );
      }
    } catch (e) {
      console.error(e);
      showErrorDialog(
        'The QR code could not be created. Please try again.',
        'Could not create QR code'
      );
    } finally {
      setGenerating(false);
    }
  }

  function handleShowStats(qr: QRCode) {
    setSelectedQR(qr);
    setShowStats(true);
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">QR Codes for this Order</h3>
          <p className="text-sm text-muted-foreground">
            Generate QR codes that link to the property lead capture page
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={canManage && generating}>
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Generate QR Code
            </>
          )}
        </Button>
      </div>

      {generating && <QrCardSkeleton />}

      {qrCodes.length === 0 ? (
        generating ? null : (
          <div className="text-center py-12 text-muted-foreground">
            <QrCode className="h-12 w-12 mx-auto mb-3 text-faint" />
            <p>
              {canManage
                ? 'No QR codes yet. Generate one to get started.'
                : 'You do not have permission to create QR codes.'}
            </p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {qrCodes.map((qr) => (
            <div key={qr.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-semibold">{qr.displayId}</span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        qr.status === 'ACTIVE'
                          ? 'bg-[#e4f4ea] dark:bg-[#123322] text-[#1c7a41] dark:text-[#7fe0a3]'
                          : qr.status === 'UNASSIGNED'
                          ? 'bg-yellow-100 text-[#9a6a12] dark:text-[#f0c674]'
                          : 'bg-surface-2 text-foreground'
                      }`}
                    >
                      {qr.status}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    <a
                      href={`/q/${qr.displayId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-navy-700 dark:text-[#9db5f2] hover:underline"
                    >
                      /q/{qr.displayId}
                    </a>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(qr.createdAt).toLocaleDateString()}
                  </div>

                  {(qr.printables?.length ?? 0) > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-medium mb-2">Print Artifacts:</div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {qr.printables?.map((p) => {
                          const variantLabel = p.variantKey
                            .split('-')
                            .map((word) => {
                              if (word === 'qr') return 'QR Code';
                              return word.charAt(0).toUpperCase() + word.slice(1);
                            })
                            .join(' ');

                          return (
                            <div
                              key={p.id}
                              className="border rounded-lg p-3 bg-surface-2 hover:bg-surface-2 transition-colors"
                            >
                              {p.status === 'COMPLETE' && p.pngUrl && (
                                <div className="mb-2 flex justify-center">
                                  <img
                                    src={p.pngUrl}
                                    alt={variantLabel}
                                    className="max-w-full h-auto max-h-20 object-contain rounded border border-border"
                                  />
                                </div>
                              )}
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">
                                    {variantLabel}
                                  </div>
                                  <div className="mt-1">
                                    {p.status === 'COMPLETE' ? (
                                      <div className="flex items-center gap-1 text-xs text-[#1c7a41] dark:text-[#7fe0a3]">
                                        <CheckCircle className="h-3 w-3" />
                                        <span>Ready</span>
                                      </div>
                                    ) : p.status === 'FAILED' ? (
                                      <div className="flex items-center gap-1 text-xs text-[#c23434] dark:text-[#f09a9a]">
                                        <XCircle className="h-3 w-3" />
                                        <span>Failed</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>{p.status}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {p.status === 'COMPLETE' && (
                                <div className="flex gap-2 mt-3">
                                  {p.pngUrl && (
                                    <Button
                                      asChild
                                      size="sm"
                                      className="h-9 flex-1 px-4 text-[12.5px]"
                                    >
                                      <a
                                        href={`/api/qr/${qr.id}/printables/${p.id}/download?format=png`}
                                        download
                                        title="Download PNG"
                                      >
                                        <ImageIcon className="h-4 w-4" />
                                        <span>PNG</span>
                                      </a>
                                    </Button>
                                  )}
                                  {p.pdfUrl && (
                                    <Button
                                      asChild
                                      size="sm"
                                      className="h-9 flex-1 px-4 text-[12.5px]"
                                    >
                                      <a
                                        href={`/api/qr/${qr.id}/printables/${p.id}/download?format=pdf`}
                                        download
                                        title="Download PDF"
                                      >
                                        <FileText className="h-4 w-4" />
                                        <span>PDF</span>
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      canViewStats
                        ? handleShowStats(qr)
                        : requestPermission('view QR statistics')
                    }
                    title="Show Stats"
                  >
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                  <QrDeleteButton
                    qrCodeId={qr.id}
                    label={qr.displayId}
                    canDelete={canManage}
                    onDeleted={loadQRCodes}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedQR && showStats && (
        <QRCodeStatsDialog
          qrCodeId={selectedQR.id}
          displayId={selectedQR.displayId}
          onClose={() => {
            setShowStats(false);
            setSelectedQR(null);
          }}
        />
      )}
    </div>
  );
}

function QrCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-6 w-24 rounded bg-muted" />
          <div className="mt-3 h-4 w-32 rounded bg-muted" />
          <div className="mt-2 h-3 w-24 rounded bg-muted" />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-lg border bg-surface-2 p-3">
                <div className="mx-auto h-20 w-20 rounded bg-muted" />
                <div className="mt-3 h-4 w-24 rounded bg-muted" />
                <div className="mt-2 h-3 w-16 rounded bg-muted" />
                <div className="mt-3 flex gap-2">
                  <div className="h-9 flex-1 rounded-full bg-muted" />
                  <div className="h-9 flex-1 rounded-full bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
