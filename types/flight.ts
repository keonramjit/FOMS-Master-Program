
export type FlightStatus = 'Scheduled' | 'Delayed' | 'Completed' | 'Cancelled' | 'Outbound' | 'Inbound' | 'On Ground';

export interface Flight {
  id: string;
  order?: number; // Visual sorting index
  parentId?: string; // ID of the parent flight if this is a segment
  flightNumber: string;
  route: string;
  aircraftRegistration: string;
  aircraftType: string; // Dynamic string
  etd: string; // Estimated Time of Departure (HH:mm)
  flightTime?: number; // Planned Duration in hours
  commercialTime?: string; // Planned Commercial Time (HH:mm)
  pic: string; // Pilot in Command Code
  sic: string; // Second in Command Code (optional)
  customer: string;
  customerId?: string; // Added for Flight Planning View
  status: FlightStatus;
  notes?: string;
  date: string; // ISO String YYYY-MM-DD

  // --- Journey Log Actuals (New) ---
  outTime?: string;  // HH:MM
  offTime?: string;  // HH:MM
  onTime?: string;   // HH:MM
  inTime?: string;   // HH:MM
  actualBlockTime?: number;  // Decimal Hours (In - Out)
  actualFlightTime?: number; // Decimal Hours (On - Off)
  voyageReportStatus?: 'Pending' | 'Filed'; // Tracking status
}

export interface RoutePerformance {
  flightTime: number;      // Decimal hours
  buffer: number;          // Decimal hours
  commercialTime: number;  // Decimal hours
}

export interface RouteDefinition {
  id: string;
  code: string; // e.g., OGL-KAI
  name?: string; // Legacy field
  from?: string; // e.g. OGL
  to?: string;   // e.g. Kaieteur Falls or KAI
  distance?: number;
  flightTime?: number; // Fallback/Average Flight Time
  
  // Dynamic performance map keyed by AircraftType.code (e.g. 'C208B', '1900D')
  performances?: Record<string, RoutePerformance>;
}

export interface LocationDefinition {
  id: string;
  name: string; // e.g. Kaieteur Falls
  code: string; // e.g. KAI
}

export interface VoyageEntry {
    id: string;
    flightId?: string; // Link to actual flight if exists
    flightNumber: string;
    aircraftReg: string;
    from: string;
    to: string;
    outTime: string; // HH:MM
    offTime: string;
    onTime: string;
    inTime: string;
    blockTime: number; // Decimal
    flightTime: number; // Decimal
    dayLandings: number;
    nightLandings: number;
    approaches: {
        ils: number;
        rnav: number;
        loc: number;
        vor: number;
        visual: number;
    };
}

export interface VoyageReport {
    id: string; // Usually Date + PilotCode
    date: string;
    crewCode: string;
    entries: VoyageEntry[];
    status: 'Open' | 'Submitted' | 'Approved';
    submissionDate?: string;
    approvedBy?: string;
}
