
export interface AircraftComponent {
  id: string;
  name: string; // e.g. "Port Engine", "Nose Gear"
  type: 'Engine' | 'Propeller' | 'Landing Gear' | 'Airframe' | 'Component';
  serialNumber: string;
  currentHours: number;
  hourlyLimit?: number; // TBO or Life Limit
  installDate?: string;
}

export interface MaintenanceCheck {
  id: string;
  name: string; // e.g. "A-Check", "100hr Inspection"
  intervalHours: number;
  toleranceHours?: number;
}

export interface MaintenanceStatus {
  lastPerformedHours: number;
  lastPerformedDate: string;
}

export interface Aircraft {
  registration: string;
  type: string;
  status: 'Active' | 'Maintenance' | 'AOG';
  
  // Weights
  maxTakeoffWeight?: number; 
  maxLandingWeight?: number; 
  maxZeroFuelWeight?: number; 
  basicEmptyWeight?: number; 

  // Technical Records
  airframeTotalTime?: number; // Master counter
  components?: AircraftComponent[];
  maintenanceProgram?: MaintenanceCheck[];
  maintenanceStatus?: Record<string, MaintenanceStatus>; 

  // Legacy fields
  currentHours?: number; 
  nextCheckHours?: number;
}

export interface OperationsStats {
  totalFlights: number;
  activeCrew: number;
  flightHours: number;
  outbound: number;
  inbound: number;
  onGround: number;
  scheduled: number;
  delayed: number;
  completed: number;
  cancelled: number;
}
