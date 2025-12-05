
export interface CrewMember {
  code: string;
  name: string;
  role?: 'B1900 Captain' | 'B1900 First Officer' | 'C208 Captain' | 'C208 Shuttle' | 'Cabin Crew' | string;
  allowedAirports?: string[]; // Array of Route Codes or IDs
}

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
