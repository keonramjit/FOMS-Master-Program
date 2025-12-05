
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
