import { Loader, type Library } from "@googlemaps/js-api-loader";

let loader: Loader | null = null;
let mapsPromise: Promise<any> | null = null;

export function getGoogleMapsApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}

function getLoader(): Loader | null {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return null;
  if (!loader) {
    loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["places", "marker"],
    });
  }
  return loader;
}

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (mapsPromise) return mapsPromise;

  const instance = getLoader();
  if (!instance) return Promise.resolve(null);

  mapsPromise = instance
    .importLibrary("maps")
    .then(() => (window as any).google?.maps ?? null);

  return mapsPromise;
}

export function importGoogleMapsLibrary(
  name: "places" | "marker" | "maps" | "core"
): Promise<any> {
  const instance = getLoader();
  if (!instance) return Promise.resolve(null);
  return instance.importLibrary(name as Library);
}
