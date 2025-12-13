
export * from './types/flight';
export * from './types/crew';
export * from './types/fleet';
export * from './types/dispatch';
export * from './types/aircraftType';

export interface SystemSettings {
  enableFleetManagement: boolean;
  enableCrewManagement: boolean;
  enableFlightPlanning: boolean;
  enableDispatch: boolean;
  enableVoyageReports: boolean;
  enableTrainingManagement: boolean;
  enableReports: boolean;
  enableFleetChecks: boolean;
  enableCrewFDP: boolean;
  enableCrewStrips: boolean;
  enableRouteManagement?: boolean;
  enableCustomerDatabase?: boolean;
  systemVersion?: string;
}

export interface UserProfile {
  email: string;
  name: string;
  role: string;
  orgId?: string;
}

export interface License {
  plan: string;
  status: string;
  modules: SystemSettings;
}

export interface Organization {
  id: string;
  name: string;
  license: License;
}
