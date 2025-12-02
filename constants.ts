

import { Aircraft, CrewMember, Flight } from './types';

export const CREW_ROSTER: CrewMember[] = [
  { code: 'ADF', name: 'Andre Farinha' },
  { code: 'NAB', name: 'Noel Bhairopersad' },
  { code: 'CHM', name: 'Cleon Melville' },
  { code: 'PLR', name: 'Paul Ramdatt' },
  { code: 'PDR', name: 'Peter Dos Ramos' },
  { code: 'RRR', name: 'Remy Rodrigues' },
  { code: 'EMP', name: 'Errisson Peixoto' },
  { code: 'AFF', name: 'Al Fredericks' },
  { code: 'LAR', name: 'Loakesh Reid' },
  { code: 'MSS', name: 'Michael Shallim' },
  { code: 'MHH', name: 'Michael Hallim' },
  { code: 'MJY', name: 'Michael Yearwood' },
  { code: 'NMM', name: 'Nicholas Merai' },
  { code: 'KJG', name: 'Kairon Griffith' },
  { code: 'MAP', name: 'Michael Persaud' },
  { code: 'TAH', name: 'Triston Hall' },
  { code: 'RED', name: 'Rasheed Dey' },
  { code: 'FAA', name: 'Ferial Ally' },
  { code: 'RLG', name: 'Robert Griffith' },
  { code: 'JHR', name: 'Jessica Ramcharitar' },
  { code: 'RCS', name: 'Raul Seecharran' },
  { code: 'AER', name: 'Adrian Rebeiro' },
  { code: 'JTM', name: 'Jetindra Motilall' },
  { code: 'RRP', name: 'Rajkumar Persaud' },
  { code: 'UTO', name: 'Ulynie Obermuller' },
  { code: 'MDS', name: 'Matthew Sookhoo' },
  { code: 'TAJ', name: 'Teffern James' },
  { code: 'LSO', name: 'Leon Odit' },
  { code: 'SMB', name: 'Steven Balkarran' },
  { code: 'PAG', name: 'Phillip Gomes' },
  { code: 'KCG', name: 'Khemraj Goberdhan' },
  { code: 'KDH', name: 'Kaleem Hosein' },
  { code: 'ZER', name: 'Zaul Ramotar' },
  { code: 'BAH', name: 'Bibi Hahk' },
];

export const FLEET_INVENTORY: Aircraft[] = [
  // C208B (Emerald Theme in UI) - MTOW approx 8750 lbs
  { registration: '8R-GHW', type: 'C208B', status: 'Active', currentHours: 14205, nextCheckHours: 14300, maxTakeoffWeight: 8750, maxLandingWeight: 8500, maxZeroFuelWeight: 7500, basicEmptyWeight: 4900 },
  { registration: '8R-GHR', type: 'C208B', status: 'Active', currentHours: 12150, nextCheckHours: 12200, maxTakeoffWeight: 8750, maxLandingWeight: 8500, maxZeroFuelWeight: 7500, basicEmptyWeight: 4850 },
  { registration: '8R-GHT', type: 'C208B', status: 'Active', currentHours: 9800, nextCheckHours: 10000, maxTakeoffWeight: 8750, maxLandingWeight: 8500, maxZeroFuelWeight: 7500, basicEmptyWeight: 4920 },
  { registration: '8R-GAB', type: 'C208B', status: 'Active', currentHours: 5400, nextCheckHours: 5500, maxTakeoffWeight: 8750, maxLandingWeight: 8500, maxZeroFuelWeight: 7500, basicEmptyWeight: 4880 },
  { registration: '8R-GAD', type: 'C208B', status: 'Active', currentHours: 6200, nextCheckHours: 6300, maxTakeoffWeight: 8750, maxLandingWeight: 8500, maxZeroFuelWeight: 7500, basicEmptyWeight: 4910 },
  { registration: '8R-GAE', type: 'C208B', status: 'Maintenance', currentHours: 15000, nextCheckHours: 15000, maxTakeoffWeight: 8750, maxLandingWeight: 8500, maxZeroFuelWeight: 7500, basicEmptyWeight: 4900 },
  { registration: '8R-GCC', type: 'C208B', status: 'Active', currentHours: 4100, nextCheckHours: 4200, maxTakeoffWeight: 8750, maxLandingWeight: 8500, maxZeroFuelWeight: 7500, basicEmptyWeight: 4890 },
  { registration: '8R-GAH', type: 'C208B', status: 'Active', currentHours: 3200, nextCheckHours: 3300, maxTakeoffWeight: 8750, maxLandingWeight: 8500, maxZeroFuelWeight: 7500, basicEmptyWeight: 4905 },
  { registration: '8R-GAI', type: 'C208B', status: 'Active', currentHours: 2800, nextCheckHours: 2900, maxTakeoffWeight: 8750, maxLandingWeight: 8500, maxZeroFuelWeight: 7500, basicEmptyWeight: 4895 },
  
  // C208EX (Sky Theme in UI) - MTOW approx 8807 lbs
  { registration: '8R-GAI', type: 'C208EX', status: 'Active', currentHours: 1200, nextCheckHours: 1300, maxTakeoffWeight: 8807, maxLandingWeight: 8500, maxZeroFuelWeight: 7600, basicEmptyWeight: 5100 }, 
  { registration: '8R-GHV', type: 'C208EX', status: 'Active', currentHours: 950, nextCheckHours: 1000, maxTakeoffWeight: 8807, maxLandingWeight: 8500, maxZeroFuelWeight: 7600, basicEmptyWeight: 5050 },
  
  // 1900D (Indigo Theme in UI) - MTOW approx 17120 lbs
  { registration: '8R-GAQ', type: '1900D', status: 'Active', currentHours: 21050, nextCheckHours: 21200, maxTakeoffWeight: 17120, maxLandingWeight: 16600, maxZeroFuelWeight: 15000, basicEmptyWeight: 10500 },
  { registration: '8R-EAR', type: '1900D', status: 'AOG', currentHours: 19800, nextCheckHours: 19850, maxTakeoffWeight: 17120, maxLandingWeight: 16600, maxZeroFuelWeight: 15000, basicEmptyWeight: 10600 },
  { registration: '8R-GHU', type: '1900D', status: 'Active', currentHours: 20100, nextCheckHours: 20300, maxTakeoffWeight: 17120, maxLandingWeight: 16600, maxZeroFuelWeight: 15000, basicEmptyWeight: 10550 },
];

// Helper to find full name from code
export const getCrewName = (code: string): string => {
  const crew = CREW_ROSTER.find((c) => c.code === code);
  return crew ? crew.name : code;
};

// Helper to find aircraft details from short code (e.g., 'G' -> '8R-GAI' or similar)
// This is a heuristic based on the last letter often being the identifier in daily ops
export const guessAircraftFromCode = (code: string, typeHint?: string): string => {
  if (!code || code.length > 2) return code; // Return original if it looks like a full reg or is empty
  
  const letter = code.trim().toUpperCase();
  // Try to match last letter of registration
  const match = FLEET_INVENTORY.find(a => 
    a.registration.endsWith(letter) && 
    (!typeHint || a.type.includes(typeHint))
  );
  
  return match ? match.registration : code;
};

// Initial Mock Data
export const INITIAL_FLIGHTS: Flight[] = [
  {
    id: '1',
    flightNumber: 'TGY7411',
    route: 'OGL-KKN',
    aircraftRegistration: '8R-GAC',
    aircraftType: 'C208B',
    etd: '07:15',
    pic: 'JHR',
    sic: '',
    customer: 'Intolink Logistics',
    status: 'Completed',
    notes: '#2750',
    date: new Date().toISOString().split('T')[0]
  },
  {
    id: '2',
    flightNumber: 'TGY1012',
    route: 'OGL-PTK',
    aircraftRegistration: '8R-GAQ',
    aircraftType: '1900D',
    etd: '07:15',
    pic: 'UTO',
    sic: '',
    customer: 'Waiting for cargo',
    status: 'Delayed',
    date: new Date().toISOString().split('T')[0]
  },
];