/**
 * Utility to validate whether given latitude & longitude fall within Gujarat's geographic boundaries.
 * Approx Gujarat Bounding Box:
 * Latitude:  20.1° N to 24.7° N
 * Longitude: 68.1° E to 74.5° E
 */
export const GUJARAT_BOUNDS = {
  minLat: 20.1,
  maxLat: 24.7,
  minLon: 68.1,
  maxLon: 74.5,
};

export function isInsideGujarat(lat, lon) {
  if (lat == null || lon == null) return false;
  return (
    lat >= GUJARAT_BOUNDS.minLat &&
    lat <= GUJARAT_BOUNDS.maxLat &&
    lon >= GUJARAT_BOUNDS.minLon &&
    lon <= GUJARAT_BOUNDS.maxLon
  );
}
