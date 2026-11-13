'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, importGoogleMapsLibrary } from '@/lib/google-maps/loader';

declare global {
  interface Window {
    google?: any;
  }
}

export default function PlacesAddressInput({
  name = 'propertyAddress',
  defaultValue = '',
  defaultFormattedAddress,
  defaultLat,
  defaultLng,
  defaultCity,
  defaultProvince,
  defaultPostalCode,
  defaultCountry,
  defaultPlaceId,
  placeholder = 'Search address',
  className = 'field',
  onValueChange,
  onResolved,
}: {
  name?: string;
  defaultValue?: string;
  defaultFormattedAddress?: string | null;
  defaultLat?: number | null;
  defaultLng?: number | null;
  defaultCity?: string | null;
  defaultProvince?: string | null;
  defaultPostalCode?: string | null;
  defaultCountry?: string | null;
  defaultPlaceId?: string | null;
  placeholder?: string;
  className?: string;
  onValueChange?: (value: string) => void;
  onResolved?: (data: {
    formatted: string;
    street?: string;
    lat: number | null;
    lng: number | null;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    placeId?: string;
  }) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const streetRef = useRef<HTMLInputElement | null>(null);
  const formattedRef = useRef<HTMLInputElement | null>(null);
  const latRef = useRef<HTMLInputElement | null>(null);
  const lngRef = useRef<HTMLInputElement | null>(null);
  const cityRef = useRef<HTMLInputElement | null>(null);
  const provinceRef = useRef<HTMLInputElement | null>(null);
  const postalRef = useRef<HTMLInputElement | null>(null);
  const countryRef = useRef<HTMLInputElement | null>(null);
  const placeIdRef = useRef<HTMLInputElement | null>(null);
  const [autocompleteReady, setAutocompleteReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let element: any = null;
    let handleSelect: ((event: any) => void) | null = null;
    let form: HTMLFormElement | null = null;
    let handleSubmit: (() => void) | null = null;

    async function init() {
      try {
        const maps = await loadGoogleMaps();
        if (!maps || cancelled || !containerRef.current) return;

        const { PlaceAutocompleteElement } =
          await importGoogleMapsLibrary('places');
        if (!PlaceAutocompleteElement || cancelled || !containerRef.current)
          return;

        const autocomplete = new PlaceAutocompleteElement();
        autocomplete.placeholder = placeholder;
        autocomplete.style.width = '100%';
        autocomplete.style.display = 'block';
        autocomplete.style.setProperty('background-color', 'var(--card)');
        autocomplete.style.setProperty('border', '1px solid var(--border)');
        autocomplete.style.setProperty('border-radius', '0.625rem');
        autocomplete.style.setProperty('color-scheme', 'light dark');
        autocomplete.style.fontFamily = 'inherit';
        autocomplete.style.fontSize = '0.875rem';
        autocomplete.style.color = 'var(--foreground)';

        handleSelect = async (event: any) => {
          const place = event?.placePrediction?.toPlace?.();
          if (!place) return;

          await place.fetchFields({
            fields: [
              'formattedAddress',
              'location',
              'addressComponents',
              'id',
              'displayName',
            ],
          });

          const display =
            typeof place.displayName === 'string'
              ? place.displayName
              : place.displayName?.text || '';
          const formatted = place.formattedAddress || display;
          const lat = place.location?.lat?.() ?? null;
          const lng = place.location?.lng?.() ?? null;
          const components = place.addressComponents || [];
          const get = (type: string) =>
            components.find((component: any) => component.types?.includes(type))
              ?.longText || '';
          const city = get('locality') || get('postal_town') || '';
          const province = get('administrative_area_level_1') || '';
          const postalCode = get('postal_code') || '';
          const country = get('country') || '';
          const placeId = place.id || '';
          const streetNumber = get('street_number');
          const route = get('route');
          const street =
            [streetNumber, route].filter(Boolean).join(' ').trim() ||
            formatted.split(',')[0]?.trim() ||
            '';

          autocomplete.value = street || formatted || '';
          if (streetRef.current) streetRef.current.value = street || formatted || '';
          onValueChange?.(street || formatted || '');
          if (formattedRef.current) formattedRef.current.value = formatted || '';
          if (latRef.current) latRef.current.value = lat != null ? String(lat) : '';
          if (lngRef.current) lngRef.current.value = lng != null ? String(lng) : '';
          if (cityRef.current) cityRef.current.value = city;
          if (provinceRef.current) provinceRef.current.value = province;
          if (postalRef.current) postalRef.current.value = postalCode;
          if (countryRef.current) countryRef.current.value = country;
          if (placeIdRef.current) placeIdRef.current.value = placeId;
          onResolved?.({
            formatted,
            street,
            lat,
            lng,
            city,
            province,
            postalCode,
            country,
            placeId,
          });
        };

        autocomplete.addEventListener('gmp-select', handleSelect);
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(autocomplete);
        if (defaultValue) autocomplete.value = defaultValue;

        form = autocomplete.closest('form');
        if (form) {
          handleSubmit = () => {
            if (streetRef.current && autocomplete.value) {
              streetRef.current.value = autocomplete.value;
            }
          };
          form.addEventListener('submit', handleSubmit, true);
        }

        element = autocomplete;
        setAutocompleteReady(true);
      } catch (error) {
        console.error("Google Places Autocomplete failed to load", error);
      }
    }

    void init();

    return () => {
      cancelled = true;
      if (form && handleSubmit) form.removeEventListener('submit', handleSubmit, true);
      if (element && handleSelect) element.removeEventListener('gmp-select', handleSelect);
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <input
        type="hidden"
        name={name}
        ref={streetRef}
        defaultValue={defaultValue}
      />

      {!autocompleteReady && (
        <input
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={className}
          onChange={(event) => {
            if (streetRef.current) streetRef.current.value = event.target.value;
            onValueChange?.(event.target.value);
          }}
        />
      )}

      <div ref={containerRef} className={autocompleteReady ? 'w-full' : 'hidden'} />

      <input
        type="hidden"
        name="propertyFormattedAddress"
        ref={formattedRef}
        defaultValue={defaultFormattedAddress ?? defaultValue}
      />
      <input
        type="hidden"
        name="propertyLat"
        ref={latRef}
        defaultValue={defaultLat != null ? String(defaultLat) : undefined}
      />
      <input
        type="hidden"
        name="propertyLng"
        ref={lngRef}
        defaultValue={defaultLng != null ? String(defaultLng) : undefined}
      />
      <input
        type="hidden"
        name="propertyCity"
        ref={cityRef}
        defaultValue={defaultCity ?? undefined}
      />
      <input
        type="hidden"
        name="propertyProvince"
        ref={provinceRef}
        defaultValue={defaultProvince ?? undefined}
      />
      <input
        type="hidden"
        name="propertyPostalCode"
        ref={postalRef}
        defaultValue={defaultPostalCode ?? undefined}
      />
      <input
        type="hidden"
        name="propertyCountry"
        ref={countryRef}
        defaultValue={defaultCountry ?? undefined}
      />
      <input
        type="hidden"
        name="propertyPlaceId"
        ref={placeIdRef}
        defaultValue={defaultPlaceId ?? undefined}
      />
    </div>
  );
}
