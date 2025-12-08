import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  Flight, CrewMember, Aircraft, RouteDefinition, CustomerDefinition, 
  SystemSettings, UserProfile, LocationDefinition, OperationsStats, FlightStatus, AircraftType 
} from '../types';
import { INITIAL_FLIGHTS, CREW_ROSTER, FLEET_INVENTORY } from '../constants';
import { 
  subscribeToAuth, logoutUser, getUserProfile, createUserProfile,
  subscribeToOrganization, subscribeToCrew, subscribeToFleet, subscribeToFlights,
  fetchRoutes, fetchLocations, fetchCustomers, subscribeToAircraftTypes,
  addFlight as apiAddFlight, updateFlight as apiUpdateFlight, deleteFlight as apiDeleteFlight,
  addCrewMember as apiAddCrew, updateCrewMember as apiUpdateCrew,
  addAircraft as apiAddAircraft, updateAircraft as apiUpdateAircraft,
  addRoute as apiAddRoute, updateRoute as apiUpdateRoute, deleteRoute as apiDeleteRoute,
  addLocation as apiAddLocation, updateLocation as apiUpdateLocation, deleteLocation as apiDeleteLocation,
  addCustomer as apiAddCustomer, updateCustomer as apiUpdateCustomer, deleteCustomer as apiDeleteCustomer,
  updateOrganizationLicense,
  addTrainingRecord as apiAddTrainingRecord, updateTrainingRecord as apiUpdateTrainingRecord, deleteTrainingRecord as apiDeleteTrainingRecord,
  addTrainingEvent as apiAddTrainingEvent, updateTrainingEvent as apiUpdateTrainingEvent, deleteTrainingEvent as apiDeleteTrainingEvent,
  addAircraftType as apiAddAircraftType, updateAircraftType as apiUpdateAircraftType, deleteAircraftType as apiDeleteAircraftType
} from '../services/firebase';

interface DataContextType {
  // Auth
  user: any | null;
  userProfile: UserProfile | null;
  authLoading: boolean;
  logout: () => void;

  // System
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  features: SystemSettings;
  updateLicense: (settings: Partial<SystemSettings>) => Promise<void>;
  
  // Date
  currentDate: string;
  setCurrentDate: (date: string) => void;

  // Data
  flights: Flight[];
  crew: (CrewMember & { _docId?: string })[];
  fleet: (Aircraft & { _docId?: string })[];
  routes: RouteDefinition[];
  locations: LocationDefinition[];
  customers: CustomerDefinition[];
  aircraftTypes: AircraftType[];
  
  // Derived
  stats: OperationsStats;
  filteredFlights: Flight[];

  // Actions (Wrapped with Demo Mode logic)
  addFlight: (data: Omit<Flight, 'id'>) => Promise<void>;
  updateFlight: (id: string, data: Partial<Flight>) => Promise<void>;
  deleteFlight: (id: string) => Promise<void>;
  
  addCrew: (data: CrewMember) => Promise<void>;
  updateCrew: (id: string, data: Partial<CrewMember>) => Promise<void>;
  
  addAircraft: (data: Aircraft) => Promise<void>;
  updateAircraft: (id: string, data: Partial<Aircraft>) => Promise<void>;
  
  addRoute: (data: Omit<RouteDefinition, 'id'>) => Promise<void>;
  updateRoute: (id: string, data: Partial<RouteDefinition>) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;

  addLocation: (data: Omit<LocationDefinition, 'id'>) => Promise<void>;
  updateLocation: (id: string, data: Partial<LocationDefinition>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;

  addCustomer: (data: Omit<CustomerDefinition, 'id'>) => Promise<void>;
  updateCustomer: (id: string, data: Partial<CustomerDefinition>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  addAircraftType: (data: Omit<AircraftType, 'id'>) => Promise<void>;
  updateAircraftType: (id: string, data: Partial<AircraftType>) => Promise<void>;
  deleteAircraftType: (id: string) => Promise<void>;

  // Passthroughs for sub-modules that handle their own specialized CRUD
  apiAddTrainingRecord: typeof apiAddTrainingRecord;
  apiUpdateTrainingRecord: typeof apiUpdateTrainingRecord;
  apiDeleteTrainingRecord: typeof apiDeleteTrainingRecord;
  apiAddTrainingEvent: typeof apiAddTrainingEvent;
  apiUpdateTrainingEvent: typeof apiUpdateTrainingEvent;
  apiDeleteTrainingEvent: typeof apiDeleteTrainingEvent;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- STATE ---
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const [currentDate, setCurrentDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [flights, setFlights] = useState<Flight[]>([]);
  const [crew, setCrew] = useState<(CrewMember & { _docId?: string })[]>([]);
  const [fleet, setFleet] = useState<(Aircraft & { _docId?: string })[]>([]);
  const [routes, setRoutes] = useState<RouteDefinition[]>([]);
  const [locations, setLocations] = useState<LocationDefinition[]>([]);
  const [customers, setCustomers] = useState<CustomerDefinition[]>([]);
  const [aircraftTypes, setAircraftTypes] = useState<AircraftType[]>([]);

  const [features, setFeatures] = useState<SystemSettings>({
    enableFleetManagement: true,
    enableCrewManagement: true,
    enableFlightPlanning: true,
    enableDispatch: true,
    enableVoyageReports: true,
    enableTrainingManagement: true,
    enableReports: true,
    enableFleetChecks: true,
    enableCrewFDP: true,
    enableCrewStrips: true,
    enableRouteManagement: true,
    enableCustomerDatabase: true
  });

  // --- SUBSCRIPTIONS ---

  // 1. Auth
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
          const profile = await getUserProfile(currentUser.email);
          if (profile) {
              setUserProfile(profile);
          } else {
              const newProfile: UserProfile = {
                  email: currentUser.email,
                  name: currentUser.displayName || 'New User',
                  role: 'dispatcher',
                  orgId: 'trans_guyana'
              };
              await createUserProfile(newProfile);
              setUserProfile(newProfile);
          }
      } else {
          setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // 2. Data & Org
  useEffect(() => {
    if (isDemoMode) {
        setFlights(INITIAL_FLIGHTS);
        setCrew(CREW_ROSTER.map((c, i) => ({ ...c, _docId: `demo-crew-${i}` })));
        setFleet(FLEET_INVENTORY.map((f, i) => ({ ...f, _docId: `demo-fleet-${i}` })));
        setRoutes([]);
        setLocations([]);
        setCustomers([]);
        setAircraftTypes([
            { id: '1', code: 'C208B', name: 'Cessna Grand Caravan', icao: 'C208', displayOrder: 1 },
            { id: '2', code: 'C208EX', name: 'Cessna Grand Caravan EX', icao: 'C208', displayOrder: 2 },
            { id: '3', code: '1900D', name: 'Beechcraft 1900D', icao: 'B190', displayOrder: 3 }
        ]);
        return;
    }

    if (!user) return;

    const orgId = userProfile?.orgId || 'trans_guyana';
    
    const unsubscribeOrg = subscribeToOrganization(orgId, (org) => {
        if (org && org.license && org.license.modules) {
            setFeatures(prev => ({ ...prev, ...org.license.modules }));
        }
    });

    const unsubscribeCrew = subscribeToCrew(setCrew);
    const unsubscribeFleet = subscribeToFleet(setFleet);
    const unsubscribeTypes = subscribeToAircraftTypes(setAircraftTypes);

    const loadStaticData = async () => {
        setRoutes(await fetchRoutes());
        setLocations(await fetchLocations());
        setCustomers(await fetchCustomers());
    };
    loadStaticData();

    return () => {
      if (unsubscribeOrg) unsubscribeOrg();
      if (unsubscribeCrew) unsubscribeCrew();
      if (unsubscribeFleet) unsubscribeFleet();
      if (unsubscribeTypes) unsubscribeTypes();
    };
  }, [user, userProfile?.orgId, isDemoMode]);

  // 3. Flights (Depend on Date)
  useEffect(() => {
    if (!user || isDemoMode) return;
    const unsubscribeFlights = subscribeToFlights(currentDate, setFlights);
    return () => {
      if (unsubscribeFlights) unsubscribeFlights();
    };
  }, [user, currentDate, isDemoMode]);

  // --- DERIVED STATE ---

  const stats: OperationsStats = useMemo(() => {
    const todaysFlights = flights.filter(f => f.date === currentDate);
    const hours = todaysFlights.reduce((acc, f) => acc + (f.flightTime || 0), 0);
    return {
      totalFlights: todaysFlights.length,
      activeCrew: new Set(todaysFlights.flatMap(f => [f.pic, f.sic].filter(Boolean))).size,
      flightHours: hours, 
      outbound: todaysFlights.filter(f => f.status === 'Outbound').length,
      inbound: todaysFlights.filter(f => f.status === 'Inbound').length,
      onGround: todaysFlights.filter(f => f.status === 'On Ground').length,
      scheduled: todaysFlights.filter(f => f.status === 'Scheduled').length,
      delayed: todaysFlights.filter(f => f.status === 'Delayed').length,
      cancelled: todaysFlights.filter(f => f.status === 'Cancelled').length,
      completed: todaysFlights.filter(f => f.status === 'Completed').length,
    };
  }, [flights, currentDate]);

  const filteredFlights = useMemo(() => 
    flights
      .filter(f => f.date === currentDate)
      .sort((a, b) => (a.etd || '').localeCompare(b.etd || '')), 
  [flights, currentDate]);

  // --- ACTIONS ---

  const addFlight = async (data: Omit<Flight, 'id'>) => {
    if (isDemoMode) {
      setFlights(prev => [...prev, { ...data, id: `demo-${Date.now()}` } as Flight]);
    } else {
      await apiAddFlight(data);
    }
  };

  const updateFlight = async (id: string, data: Partial<Flight>) => {
    if (isDemoMode) {
      setFlights(prev => prev.map(f => f.id === id ? { ...f, ...data } : f));
    } else {
      await apiUpdateFlight(id, data);
    }
  };

  const deleteFlight = async (id: string) => {
    if (isDemoMode) {
      setFlights(prev => prev.filter(f => f.id !== id));
    } else {
      await apiDeleteFlight(id);
    }
  };

  const addCrew = async (data: CrewMember) => {
      if(isDemoMode) setCrew(prev => [...prev, { ...data, _docId: `demo-${Date.now()}` }]);
      else await apiAddCrew(data);
  };

  const updateCrew = async (id: string, data: Partial<CrewMember>) => {
      if(isDemoMode) setCrew(prev => prev.map(c => c._docId === id ? { ...c, ...data } : c));
      else await apiUpdateCrew(id, data);
  };

  const addAircraft = async (data: Aircraft) => {
      if(isDemoMode) setFleet(prev => [...prev, { ...data, _docId: `demo-${Date.now()}` }]);
      else await apiAddAircraft(data);
  };

  const updateAircraft = async (id: string, data: Partial<Aircraft>) => {
      if(isDemoMode) setFleet(prev => prev.map(f => f._docId === id ? { ...f, ...data } : f));
      else await apiUpdateAircraft(id, data);
  };

  const addRoute = async (data: Omit<RouteDefinition, 'id'>) => {
      if(isDemoMode) setRoutes(prev => [...prev, { ...data, id: `demo-${Date.now()}` }]);
      else { await apiAddRoute(data); setRoutes(await fetchRoutes()); }
  };

  const updateRoute = async (id: string, data: Partial<RouteDefinition>) => {
      if(isDemoMode) setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
      else { await apiUpdateRoute(id, data); setRoutes(await fetchRoutes()); }
  };

  const deleteRoute = async (id: string) => {
      if(isDemoMode) setRoutes(prev => prev.filter(r => r.id !== id));
      else { await apiDeleteRoute(id); setRoutes(await fetchRoutes()); }
  };

  const addLocation = async (data: Omit<LocationDefinition, 'id'>) => {
      if(isDemoMode) setLocations(prev => [...prev, { ...data, id: `demo-${Date.now()}` }]);
      else { await apiAddLocation(data); setLocations(await fetchLocations()); }
  };

  const updateLocation = async (id: string, data: Partial<LocationDefinition>) => {
      if(isDemoMode) setLocations(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
      else { await apiUpdateLocation(id, data); setLocations(await fetchLocations()); }
  };

  const deleteLocation = async (id: string) => {
      if(isDemoMode) setLocations(prev => prev.filter(l => l.id !== id));
      else { await apiDeleteLocation(id); setLocations(await fetchLocations()); }
  };

  const addCustomer = async (data: Omit<CustomerDefinition, 'id'>) => {
      if(isDemoMode) setCustomers(prev => [...prev, { ...data, id: `demo-${Date.now()}` }]);
      else { await apiAddCustomer(data); setCustomers(await fetchCustomers()); }
  };

  const updateCustomer = async (id: string, data: Partial<CustomerDefinition>) => {
      if(isDemoMode) setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
      else { await apiUpdateCustomer(id, data); setCustomers(await fetchCustomers()); }
  };

  const deleteCustomer = async (id: string) => {
      if(isDemoMode) setCustomers(prev => prev.filter(c => c.id !== id));
      else { await apiDeleteCustomer(id); setCustomers(await fetchCustomers()); }
  };

  const updateLicense = async (settings: Partial<SystemSettings>) => {
      if (userProfile && userProfile.orgId) {
          await updateOrganizationLicense(userProfile.orgId, { modules: { ...features, ...settings } });
      }
  };

  const addAircraftType = async (data: Omit<AircraftType, 'id'>) => {
      if(isDemoMode) setAircraftTypes(prev => [...prev, { ...data, id: `demo-${Date.now()}` }]);
      else await apiAddAircraftType(data);
  };

  const updateAircraftType = async (id: string, data: Partial<AircraftType>) => {
      if(isDemoMode) setAircraftTypes(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
      else await apiUpdateAircraftType(id, data);
  };

  const deleteAircraftType = async (id: string) => {
      if(isDemoMode) setAircraftTypes(prev => prev.filter(t => t.id !== id));
      else await apiDeleteAircraftType(id);
  };

  return (
    <DataContext.Provider value={{
      user, userProfile, authLoading, logout: logoutUser,
      isDemoMode, setIsDemoMode, features, updateLicense,
      currentDate, setCurrentDate,
      flights, crew, fleet, routes, locations, customers, aircraftTypes,
      stats, filteredFlights,
      addFlight, updateFlight, deleteFlight,
      addCrew, updateCrew,
      addAircraft, updateAircraft,
      addRoute, updateRoute, deleteRoute,
      addLocation, updateLocation, deleteLocation,
      addCustomer, updateCustomer, deleteCustomer,
      addAircraftType, updateAircraftType, deleteAircraftType,
      apiAddTrainingRecord, apiUpdateTrainingRecord, apiDeleteTrainingRecord,
      apiAddTrainingEvent, apiUpdateTrainingEvent, apiDeleteTrainingEvent
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within a DataProvider');
  }
  return context;
};