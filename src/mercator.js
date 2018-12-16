/*
 * The circumference of the world in meters at the given latitude.
 */
export function circumferenceAtLatitude (latitude) {
  const circumference = 2 * Math.PI * 6378137;
  return circumference * Math.cos(latitude * Math.PI / 180);
}

export function mercatorXfromLng (lng) {
  return (180 + lng) / 360;
}

export function mercatorYfromLat (lat) {
  return (180 - (180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)))) / 360;
}

export function mercatorZfromAltitude (altitude, lat) {
  return altitude / circumferenceAtLatitude(lat);
}
