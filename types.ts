
export interface CrewMember {
  code: string;
  name: string;
  role?: 'B1900 Captain' | 'B1900 First Officer' | 'C208 Captain' | 'C208 Shuttle' | 'Cabin Crew' | string;
  allowedAirports?: string[]; // Array of Route Codes or IDs
}

export interface Aircraft {
  registration: string;
  type: 'C208B' | 'C208EX' | '1900D';
  status: 'Active' | 'Maintenance' | 'AOG';
  currentHours?: number;
  nextCheckHours?: number;
  maxTakeoffWeight?: number; // lbs
  maxLandingWeight?: number; // lbs (NEW)
  maxZeroFuelWeight?: number; // lbs (NEW)
  basicEmptyWeight?: number; // lbs
}

export type FlightStatus = 'Scheduled' | 'Delayed' | 'Completed' | 'Cancelled' | 'Outbound' | 'Inbound' | 'On Ground';

export interface Flight {
  id: string;
  order?: number; // Visual sorting index
  parentId?: string; // ID of the parent flight if this is a segment
  flightNumber: string;
  route: string;
  aircraftRegistration: string;
  aircraftType: string;
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

export interface RouteDefinition {
  id: string;
  code: string; // e.g., OGL-KAI
  name?: string; // Legacy field
  from?: string; // e.g. OGL
  to?: string;   // e.g. Kaieteur Falls or KAI
  distance?: number;
  flightTime?: number; // Legacy/Default (C208B)
  
  // Specifics
  flightTimeC208B?: number;
  bufferC208B?: number;
  commercialTimeC208B?: number;
  
  flightTimeC208EX?: number;
  bufferC208EX?: number;
  commercialTimeC208EX?: number;
  
  flightTime1900D?: number;
  buffer1900D?: number;
  commercialTime1900D?: number;
}

export interface LocationDefinition {
  id: string;
  name: string; // e.g. Kaieteur Falls
  code: string; // e.g. KAI
}

export interface CustomerDefinition {
  id: string;
  name: string;
  customerId?: string; // e.g. 2750
  contactPerson?: string;
  email?: string;
  phone?: string;
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

// System Settings are now License Modules
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

// SaaS / Organization Types
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

// --- Dispatch Types ---

export interface Passenger {
    id: string;
    lastName: string;
    firstName: string;
    weight: number;
    isInfant?: boolean;
    gender?: 'M' | 'F' | 'X';
    seatNumber?: string;
    nationality?: string;
    passportNumber?: string;
    bagTag?: string;
    ticketNumber?: string;
    receiptNumber?: string;
    freeBagWeight?: number;
    excessBagWeight?: number;
    departure?: string;
    arrival?: string;
}

export interface CargoItem {
    id: string;
    consignor: string;
    consignee: string;
    destination: string; // Airport Code
    weight: number;
    description: string;
    pieces: number;
}

export interface DangerousGoods {
    hasDG: boolean;
    unNumber?: string;
    classDiv?: string;
    packingGroup?: string;
    properShippingName?: string;
    netQty?: string;
}

export interface FuelData {
    taxi: number;
    trip: number;
    contingency: number;
    alternate: number;
    holding: number;
    totalFob: number; // Fuel on Board
    density?: number; // Lbs/Gal (e.g. 6.7)
}

export interface OpsPlanData {
    typeOfOperation?: 'VFR' | 'IFR';
    flightType?: 'Schedule' | 'Non-Schedule' | 'General Aviation';
    weatherDest?: string;
    weatherAlt?: string;
    additionalWx?: string;
    remarks?: string;
    
    // Ops FPL specific fields
    arrivalTime?: string;
    depAerodrome?: string;
    destAerodrome?: string;
    altAerodrome1?: string;
    altAerodrome2?: string;
}

export interface NotocItem {
    id: string;
    stationOfUnloading?: string;
    airWaybillNumber?: string;
    properShippingName: string;
    classDivision: string; // DG Class
    unNumber: string;
    subRisk?: string;
    noOfPackages: number;
    netQuantity: string;
    packingInst?: string; // "lacking list" / Packing Inst
    packingGroup?: string;
    code?: string;
    cao?: boolean; // CAO (X)
    ergCode?: string;
    location?: string; // Position
}

export interface SpecialLoadItem {
    id: string;
    stationOfUnloading?: string;
    airWaybillNumber?: string;
    description: string; // Contents and description
    noOfPackages?: number; // Number of Packing
    quantity?: string; // Qty
    supplementaryInfo?: string; // Supplementary Information
    code?: string; // Code (see reverse)
    uldId?: string; // ULD ID
    loadingPosition?: string; // Position
}

export interface NotocData {
    dangerousGoods: NotocItem[];
    specialLoads: SpecialLoadItem[];
}

export interface WnBData {
    // Specific to C208B for now (Seat rows + Pods)
    seat2: number;
    seat3_5: number;
    seat6_8: number;
    seat9_11: number;
    seat12_14: number;
    
    zone1: number;
    zone2: number;
    zone3: number;
    zone4: number;
    zone5: number;
    zone6: number;

    podA: number;
    podB: number;
    podC: number;
    podD: number;

    crewWeight: number; // Pilot + Co-Pilot
    extraEquipment?: number;
}

export interface DispatchRecord {
    id: string; // Usually matches flightId
    flightId: string;
    status: 'Draft' | 'Released' | 'Filed';
    
    // Components
    passengers: Passenger[];
    cargoItems: CargoItem[];
    dangerousGoods: DangerousGoods;
    fuel: FuelData;
    wnb: WnBData;
    opsPlan?: OpsPlanData;
    
    notoc?: NotocData;

    // Calculated / Snapshot Values at Release
    zeroFuelWeight?: number;
    takeoffWeight?: number;
    landingWeight?: number;
    basicEmptyWeight?: number;
    
    // Flight Plan Info
    filedRoute?: string;
    cruisingAltitude?: string;
    tas?: number;
    endurance?: string; // HH:MM
    pob?: number; // Persons on Board

    releasedBy?: string;
    releasedAt?: string;
}

// --- Training Types ---

export type TrainingType = 'Medical' | 'License' | 'OPC' | 'LPC' | 'Dangerous Goods' | 'CRM' | 'SEP';

export interface TrainingRecord {
    id: string;
    crewCode: string; // e.g. ADF
    type: TrainingType;
    issueDate?: string;
    expiryDate: string;
    status: 'Valid' | 'Expiring' | 'Expired';
    documentUrl?: string; // Link to uploaded PDF
}

export interface TrainingEvent {
    id: string;
    title: string; // e.g. "Annual CRM Refresh"
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    instructor: string;
    trainees: string[]; // Array of Crew Codes
    type: TrainingType;
    status: 'Scheduled' | 'Completed' | 'Cancelled';
}

// --- Voyage Report Types ---

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
