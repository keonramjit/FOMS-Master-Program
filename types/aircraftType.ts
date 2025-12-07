
export interface AircraftType {
    id: string;
    code: string; // e.g. "C208B"
    name: string; // e.g. "Cessna Grand Caravan"
    icao?: string; // e.g. "C208"
    displayOrder: number; // Mandatory for sorting
}
