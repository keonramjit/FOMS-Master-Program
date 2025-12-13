
export interface TechLogTimeData {
    out: string;
    off: string;
    on: string;
    in: string;
    flightTime: number; // Decimal
    blockTime: number; // Decimal
}

export interface TechLogMaintenanceData {
    fuelUplift: number; // Lbs/Litres
    oilUplift: number; // Quarts
    defects: string[];
    actionTaken: string[];
    releasedBy?: string; // Signature/Name
}

export interface TechLogEntry {
    id: string;
    flightId: string;
    flightNumber: string;
    aircraftRegistration: string;
    date: string;
    
    times: TechLogTimeData;
    maintenance: TechLogMaintenanceData;
    
    status: 'Draft' | 'Verified';
    verifiedAt?: string;
    verifiedBy?: string;
}
