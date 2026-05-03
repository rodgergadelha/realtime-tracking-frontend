export interface Location {
  driverId: string;
  lat: number;
  lng: number;
  timestamp?: string;
}

export interface LocationUpdate {
  driverId: string;
  lat: number;
  lng: number;
}