
export interface AircraftComponent {
  id: string;
  name: string; // e.g. "Port Engine", "Nose Gear"
  type: 'Engine' | 'Propeller' | 'Landing Gear' | 'Airframe' | 'Component';
  serialNumber: string;
  currentHours: number;
  totalCycles?: number;
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
  type: string; // Dynamic string instead of hardcoded union
  status: 'Active' | 'Maintenance' | 'AOG';
  
  // Weights
  maxTakeoffWeight?: number; // lbs
  maxLandingWeight?: number; // lbs
  maxZeroFuelWeight?: number; // lbs
  basicEmptyWeight?: number; // lbs

  // Technical Records
  airframeTotalTime?: number; // Master counter
  components?: AircraftComponent[];
  maintenanceProgram?: MaintenanceCheck[];
  maintenanceStatus?: Record<string, MaintenanceStatus>; // Keyed by MaintenanceCheck.id

  // Legacy fields (kept for backward compatibility during migration)
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

export interface SystemSettings {
  enableFleetManagement: boolean;
  enableCrewManagement: boolean;
  enableFlightPlanning: boolean;
  enableDispatch: boolean;
  enableVoyageReports: boolean;
  enableTrainingManagement: boolean;
  enableReports: boolean;
  
  // Feature Flags / Sub-modules
  enableFleetChecks?: boolean;
  enableCrewFDP?: boolean;
  enableCrewStrips?: boolean;
  enableRouteManagement?: boolean;
  enableCustomerDatabase?: boolean;

  systemVersion?: string;
}

export interface License {
  plan: 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'suspended';
  modules: SystemSettings;
}

export interface Organization {
  id: string;
  name: string;
  license: License;
}

export interface UserProfile {
  email: string;
  role: 'super_admin' | 'admin' | 'dispatcher' | 'pilot' | 'observer';
  name: string;
  orgId?: string; // Links them to an organization license
}

export interface CustomerDefinition {
  id: string;
  name: string;
  customerId?: string; // e.g. 2750
  contactPerson?: string;
  email?: string;
  phone?: string;
}
