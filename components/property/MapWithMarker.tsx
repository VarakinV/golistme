'use client';

import { useEffect, useRef, useState } from 'react';
import {
  importGoogleMapsLibrary,
  loadGoogleMaps,
} from '@/lib/google-maps/loader';

type Props = {
  lat?: number | null;
  lng?: number | null;
  zoom?: number;
  className?: string;
};

// Lightweight Google Map with a single advanced marker.
// Uses the JS API when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is available, otherwise
// falls back to an iframe embed.
export default function MapWithMarker({
  lat,
  lng,
  zoom = 15,
  className,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lat == null || lng == null) return;

    let cancelled = false;
    let marker: any = null;
    let map: any = null;

    async function initMap() {
      try {
        const maps = await loadGoogleMaps();
        if (!maps || cancelled || !mapRef.current) return;

        const { AdvancedMarkerElement } =
          await importGoogleMapsLibrary('marker');
        if (!AdvancedMarkerElement || cancelled || !mapRef.current) return;

        const mapId =
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

        map = new maps.Map(mapRef.current, {
          center: { lat: Number(lat), lng: Number(lng) },
          zoom,
          mapId,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        marker = new AdvancedMarkerElement({
          position: { lat: Number(lat), lng: Number(lng) },
          map,
        });
      } catch (initError) {
        console.error('Google Map failed to initialize', initError);
        if (!cancelled) setError('Failed to initialize Google Maps');
      }
    }

    void initMap();

    return () => {
      cancelled = true;
      if (marker) marker.map = null;
      if (map) map = null;
    };
  }, [lat, lng, zoom]);

  if (lat == null || lng == null) return null;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || error) {
    const src = `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
    return (
      <div className={className}>
        <iframe
          src={src}
          className="w-full h-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    );
  }

  return <div ref={mapRef} className={className || 'w-full h-full'} />;
}
