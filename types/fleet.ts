
export interface Aircraft {
  registration: string;
  type: string; // Dynamic string instead of hardcoded union
  status: 'Active' | 'Maintenance' | 'AOG';
  currentHours?: number;
  nextCheckHours?: number;
  maxTakeoffWeight?: number; // lbs
  maxLandingWeight?: number; // lbs (NEW)
  maxZeroFuelWeight?: number; // lbs (NEW)
  basicEmptyWeight?: number; // lbs
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
