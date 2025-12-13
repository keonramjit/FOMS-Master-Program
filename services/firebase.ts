import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  getDoc, 
  setDoc, 
  writeBatch,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  increment,
  serverTimestamp
} from "firebase/firestore";
import { Flight, CrewMember, Aircraft, RouteDefinition, CustomerDefinition, SystemSettings, DispatchRecord, TrainingRecord, TrainingEvent, Organization, License, UserProfile, LocationDefinition, AircraftType } from "../types";
import { TechLogEntry, TechLogTimeData, TechLogMaintenanceData } from "../types/techlog";

const firebaseConfig = {
  apiKey: "AIzaSyC3fhxJINKe8oiizZqxbuT8wb8eTNxofDY",
  authDomain: "tga-flight-operations--kkr.firebaseapp.com",
  projectId: "tga-flight-operations--kkr",
  storageBucket: "tga-flight-operations--kkr.firebasestorage.app",
  messagingSenderId: "207585061016",
  appId: "1:207585061016:web:1a7d5ced8c72f69a2848ed",
  measurementId: "G-BLWQEYDVSX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore
let db: any;
try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    });
} catch (e) {
    console.warn("Persistence fallback", e);
    db = getFirestore(app);
}

// ... Helpers ...
const sanitizeData = <T extends Record<string, any>>(data: T): T => {
  const result = { ...data };
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });
  return result;
};

// ... Auth ...
export const loginUser = async (email: string, pass: string) => {
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (error: any) {
    console.error("Login error:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
  }
};

export const subscribeToAuth = (callback: (user: any | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

// ... User Profiles ...
export const getUserProfile = async (email: string): Promise<UserProfile | null> => {
  if (!email) return null;
  try {
    const docRef = doc(db, "users", email);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (e) {
    console.error("Error fetching user profile:", e);
    return null;
  }
};

export const createUserProfile = async (userProfile: UserProfile) => {
  if (!userProfile.email) return;
  try {
    const docRef = doc(db, "users", userProfile.email);
    await setDoc(docRef, sanitizeData(userProfile));
  } catch (e) {
    console.error("Error creating user profile:", e);
    throw e;
  }
};

export const fetchOrganizationUsers = async (orgId: string): Promise<UserProfile[]> => {
  try {
    const q = query(collection(db, "users"), where("orgId", "==", orgId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
  } catch (e) {
    console.error("Error fetching users:", e);
    return [];
  }
};

export const deleteUserProfile = async (email: string) => {
    try {
        await deleteDoc(doc(db, "users", email));
    } catch (e) {
        console.error("Error deleting user:", e);
        throw e;
    }
};

// ... Org ...
export const subscribeToOrganization = (orgId: string, callback: (org: Organization | null) => void) => {
  const docRef = doc(db, "organizations", orgId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...(docSnap.data() as any) } as Organization);
    } else {
      callback(null);
      seedOrganization();
    }
  }, (error) => {
    console.error("Organization snapshot error", error);
  });
};

export const updateOrganizationLicense = async (orgId: string, license: Partial<License>) => {
  try {
    const docRef = doc(db, "organizations", orgId);
    const updates: any = {};
    if (license.status) updates['license.status'] = license.status;
    if (license.plan) updates['license.plan'] = license.plan;
    if (license.modules) updates['license.modules'] = license.modules;

    await updateDoc(docRef, updates);
  } catch (e) {
    console.error("Error updating license:", e);
    throw e;
  }
};

export const seedOrganization = async () => {
  const orgId = "trans_guyana";
  const defaultModules: SystemSettings = {
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
    enableCustomerDatabase: true,
    systemVersion: 'V1.0.0'
  };

  const orgData: Organization = {
    id: orgId,
    name: "Trans Guyana Airways",
    license: {
      plan: 'pro',
      status: 'active',
      modules: defaultModules
    }
  };

  try {
    const docRef = doc(db, "organizations", orgId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, orgData);
    }
  } catch (e) {
    console.error("Error seeding organization:", e);
  }
};

// --- Aircraft Types Collection ---

export const subscribeToAircraftTypes = (callback: (types: AircraftType[]) => void) => {
  const q = query(collection(db, "aircraft_types"));
  // Return just the raw data, no side effects
  return onSnapshot(q, (snapshot) => {
    const types = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as AircraftType[];
    callback(types);
  }, (error) => {
    console.error("Aircraft Types snapshot error:", error);
  });
};

export const seedAircraftTypes = async () => {
    const defaultTypes: Omit<AircraftType, 'id'>[] = [
        { code: 'C208B', name: 'Cessna Grand Caravan', icao: 'C208', displayOrder: 1 },
        { code: 'C208EX', name: 'Cessna Grand Caravan EX', icao: 'C208', displayOrder: 2 },
        { code: '1900D', name: 'Beechcraft 1900D', icao: 'B190', displayOrder: 3 },
        { code: 'BN2', name: 'Britten-Norman Islander', icao: 'BN2P', displayOrder: 4 },
        { code: 'SC7', name: 'Short SC.7 Skyvan', icao: 'SH7', displayOrder: 5 }
    ];
    
    try {
        const q = query(collection(db, "aircraft_types"));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            const batch = writeBatch(db);
            defaultTypes.forEach(t => {
                const ref = doc(collection(db, "aircraft_types"));
                batch.set(ref, sanitizeData(t));
            });
            await batch.commit();
            console.log("Seeded default aircraft types.");
        } else {
            console.log("Aircraft types already exist, skipping seed.");
        }
    } catch (e) {
        console.error("Error seeding aircraft types:", e);
    }
};

export const addAircraftType = async (type: Omit<AircraftType, 'id'>) => {
    try {
        await addDoc(collection(db, "aircraft_types"), sanitizeData(type));
    } catch (e) {
        console.error("Error adding aircraft type:", e);
        throw e;
    }
};

export const updateAircraftType = async (id: string, type: Partial<AircraftType>) => {
    try {
        const docRef = doc(db, "aircraft_types", id);
        await updateDoc(docRef, sanitizeData(type));
    } catch (e) {
        console.error("Error updating aircraft type:", e);
        throw e;
    }
};

export const deleteAircraftType = async (id: string) => {
    try {
        await deleteDoc(doc(db, "aircraft_types", id));
    } catch (e) {
        console.error("Error deleting aircraft type:", e);
        throw e;
    }
};

// ... Flights ...
export const subscribeToFlights = (date: string, callback: (flights: Flight[]) => void) => {
  const q = query(collection(db, "flights"), where("date", "==", date));
  return onSnapshot(q, (snapshot) => {
    const flights = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as Flight[];
    callback(flights);
  }, (error) => {
    console.error("Flights snapshot error:", error);
  });
};

export const fetchFlightHistory = async (startDate: string, endDate: string): Promise<Flight[]> => {
  try {
    const q = query(collection(db, "flights"), where("date", ">=", startDate), where("date", "<=", endDate));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as Flight[];
  } catch (e) {
    console.error("Error fetching flight history:", e);
    return [];
  }
};

export const fetchAircraftHistory = async (registration: string): Promise<Flight[]> => {
  try {
    const q = query(collection(db, "flights"), where("aircraftRegistration", "==", registration), orderBy("date", "desc"), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as Flight[];
  } catch (e) {
    console.error("Error fetching aircraft history:", e);
    return [];
  }
};

export const addFlight = async (flight: Omit<Flight, 'id'>) => {
  try {
    await addDoc(collection(db, "flights"), sanitizeData(flight));
  } catch (e) {
    console.error("Error adding flight: ", e);
    throw e;
  }
};

export const updateFlight = async (id: string, updates: Partial<Flight>) => {
  try {
    const docRef = doc(db, "flights", id);
    await updateDoc(docRef, sanitizeData(updates));
  } catch (e) {
    console.error("Error updating flight: ", e);
    throw e;
  }
};

export const deleteFlight = async (id: string) => {
  try {
    await deleteDoc(doc(db, "flights", id));
  } catch (e) {
    console.error("Error deleting flight: ", e);
    throw e;
  }
};

export const syncFlightSchedule = async (
  adds: Omit<Flight, 'id'>[],
  updates: { id: string; data: Partial<Flight> }[],
  deletes: string[]
) => {
  const batch = writeBatch(db);
  const flightsRef = collection(db, "flights");

  adds.forEach(flight => {
    const newDocRef = doc(flightsRef);
    batch.set(newDocRef, sanitizeData(flight));
  });

  updates.forEach(({ id, data }) => {
    const docRef = doc(db, "flights", id);
    batch.update(docRef, sanitizeData(data));
  });

  deletes.forEach(id => {
    const docRef = doc(db, "flights", id);
    batch.delete(docRef);
  });

  try {
    await batch.commit();
  } catch (e) {
    console.error("Error executing batch sync:", e);
    throw e;
  }
};

// ... Dispatch ...
export const subscribeToDispatch = (flightId: string, callback: (dispatch: DispatchRecord | null) => void) => {
    if (!flightId) return () => {};
    const docRef = doc(db, "dispatch", flightId);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...(docSnap.data() as any) } as DispatchRecord);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Dispatch snapshot error:", error);
    });
};

export const saveDispatchRecord = async (flightId: string, dispatchData: Omit<DispatchRecord, 'id' | 'flightId'>) => {
    try {
        const docRef = doc(db, "dispatch", flightId);
        await setDoc(docRef, sanitizeData({ ...dispatchData, flightId }), { merge: true });
    } catch (e) {
        console.error("Error saving dispatch: ", e);
        throw e;
    }
};

// ... Crew ...
export const subscribeToCrew = (callback: (crew: (CrewMember & { _docId: string })[]) => void) => {
  const q = query(collection(db, "crew"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    const crew = snapshot.docs.map(doc => ({
      _docId: doc.id, 
      ...(doc.data() as any)
    })) as (CrewMember & { _docId: string })[];
    callback(crew);
  }, (error) => {
    console.error("Crew snapshot error:", error);
  });
};

export const addCrewMember = async (crew: CrewMember) => {
  try {
    await addDoc(collection(db, "crew"), sanitizeData(crew));
  } catch (e) {
    console.error("Error adding crew: ", e);
    throw e;
  }
};

export const updateCrewMember = async (docId: string, updates: Partial<CrewMember>) => {
  try {
    const docRef = doc(db, "crew", docId);
    await updateDoc(docRef, sanitizeData(updates));
  } catch (e) {
    console.error("Error updating crew: ", e);
    throw e;
  }
};

export const deleteCrewMember = async (docId: string) => {
  try {
    await deleteDoc(doc(db, "crew", docId));
  } catch (e) {
    console.error("Error deleting crew: ", e);
    throw e;
  }
};

// ... Fleet ...
export const subscribeToFleet = (callback: (fleet: (Aircraft & { _docId: string })[]) => void) => {
  const q = query(collection(db, "fleet"), orderBy("registration"));
  return onSnapshot(q, (snapshot) => {
    const fleet = snapshot.docs.map(doc => ({
      _docId: doc.id, 
      ...(doc.data() as any)
    })) as (Aircraft & { _docId: string })[];
    callback(fleet);
  }, (error) => {
    console.error("Fleet snapshot error:", error);
  });
};

export const addAircraft = async (aircraft: Aircraft) => {
  try {
    await addDoc(collection(db, "fleet"), sanitizeData(aircraft));
  } catch (e) {
    console.error("Error adding aircraft: ", e);
    throw e;
  }
};

export const updateAircraft = async (docId: string, updates: Partial<Aircraft>) => {
  try {
    const docRef = doc(db, "fleet", docId);
    await updateDoc(docRef, sanitizeData(updates));
  } catch (e) {
    console.error("Error updating aircraft: ", e);
    throw e;
  }
};

export const deleteAircraft = async (docId: string) => {
  try {
    await deleteDoc(doc(db, "fleet", docId));
  } catch (e) {
    console.error("Error deleting aircraft: ", e);
    throw e;
  }
};

// ... Routes ...
export const fetchRoutes = async (): Promise<RouteDefinition[]> => {
  try {
    const q = query(collection(db, "routes"), orderBy("code"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as RouteDefinition[];
  } catch (e) {
    console.error("Error fetching routes:", e);
    return [];
  }
};

export const addRoute = async (route: Omit<RouteDefinition, 'id'>) => {
  try {
    await addDoc(collection(db, "routes"), sanitizeData(route));
  } catch (e) {
    console.error("Error adding route: ", e);
    throw e;
  }
};

export const updateRoute = async (id: string, updates: Partial<RouteDefinition>) => {
  try {
    const docRef = doc(db, "routes", id);
    await updateDoc(docRef, sanitizeData(updates));
  } catch (e) {
    console.error("Error updating route: ", e);
    throw e;
  }
};

export const deleteRoute = async (id: string) => {
  try {
    await deleteDoc(doc(db, "routes", id));
  } catch (e) {
    console.error("Error deleting route: ", e);
    throw e;
  }
};

// ... Locations ...
export const fetchLocations = async (): Promise<LocationDefinition[]> => {
  try {
    const q = query(collection(db, "locations"), orderBy("code"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as LocationDefinition[];
  } catch (e) {
    console.error("Error fetching locations:", e);
    return [];
  }
};

export const addLocation = async (location: Omit<LocationDefinition, 'id'>) => {
  try {
    await addDoc(collection(db, "locations"), sanitizeData(location));
  } catch (e) {
    console.error("Error adding location: ", e);
    throw e;
  }
};

export const updateLocation = async (id: string, updates: Partial<LocationDefinition>) => {
  try {
    const docRef = doc(db, "locations", id);
    await updateDoc(docRef, sanitizeData(updates));
  } catch (e) {
    console.error("Error updating location: ", e);
    throw e;
  }
};

export const deleteLocation = async (id: string) => {
  try {
    await deleteDoc(doc(db, "locations", id));
  } catch (e) {
    console.error("Error deleting location: ", e);
    throw e;
  }
};

// ... Customers ...
export const fetchCustomers = async (): Promise<CustomerDefinition[]> => {
  try {
    const q = query(collection(db, "customers"), orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as CustomerDefinition[];
  } catch (e) {
    console.error("Error fetching customers:", e);
    return [];
  }
};

export const addCustomer = async (customer: Omit<CustomerDefinition, 'id'>) => {
  try {
    await addDoc(collection(db, "customers"), sanitizeData(customer));
  } catch (e) {
    console.error("Error adding customer: ", e);
    throw e;
  }
};

export const updateCustomer = async (id: string, updates: Partial<CustomerDefinition>) => {
  try {
    const docRef = doc(db, "customers", id);
    await updateDoc(docRef, sanitizeData(updates));
  } catch (e) {
    console.error("Error updating customer: ", e);
    throw e;
  }
};

export const deleteCustomer = async (id: string) => {
  try {
    await deleteDoc(doc(db, "customers", id));
  } catch (e) {
    console.error("Error deleting customer: ", e);
    throw e;
  }
};

// ... Training ...
export const subscribeToTrainingRecords = (callback: (records: TrainingRecord[]) => void) => {
  const q = query(collection(db, "training_records"));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as TrainingRecord[];
    callback(data);
  }, (e) => console.error("Training records error", e));
};

export const addTrainingRecord = async (record: Omit<TrainingRecord, 'id'>) => {
  try {
    await addDoc(collection(db, "training_records"), sanitizeData(record));
  } catch (e) {
    console.error("Error adding training record", e);
    throw e;
  }
};

export const fetchCrewTrainingRecords = async (crewCode: string): Promise<TrainingRecord[]> => {
  try {
    const q = query(collection(db, "training_records"), where("crewCode", "==", crewCode));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as TrainingRecord[];
  } catch (e) {
    console.error("Error fetching crew training records:", e);
    return [];
  }
};

export const updateTrainingRecord = async (id: string, updates: Partial<TrainingRecord>) => {
  try {
    const docRef = doc(db, "training_records", id);
    await updateDoc(docRef, sanitizeData(updates));
  } catch (e) {
    console.error("Error updating training record", e);
    throw e;
  }
};

export const deleteTrainingRecord = async (id: string) => {
  try {
    await deleteDoc(doc(db, "training_records", id));
  } catch (e) {
    console.error("Error deleting training record", e);
    throw e;
  }
};

export const subscribeToTrainingEvents = (callback: (events: TrainingEvent[]) => void) => {
  const q = query(collection(db, "training_events"), orderBy("date"));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as TrainingEvent[];
    callback(data);
  }, (e) => console.error("Training events error", e));
};

export const addTrainingEvent = async (event: Omit<TrainingEvent, 'id'>) => {
  try {
    await addDoc(collection(db, "training_events"), sanitizeData(event));
  } catch (e) {
    console.error("Error adding training event", e);
    throw e;
  }
};

export const updateTrainingEvent = async (id: string, updates: Partial<TrainingEvent>) => {
  try {
    const docRef = doc(db, "training_events", id);
    await updateDoc(docRef, sanitizeData(updates));
  } catch (e) {
    console.error("Error updating training event", e);
    throw e;
  }
};

export const deleteTrainingEvent = async (id: string) => {
  try {
    await deleteDoc(doc(db, "training_events", id));
  } catch (e) {
    console.error("Error deleting training event", e);
    throw e;
  }
};

// --- TECH LOG & MAINTENANCE SERVICES ---

export const subscribeToTechLogs = (callback: (logs: TechLogEntry[]) => void) => {
    // Increased limit to 300 to cover approx 3-5 days of full operations history
    const q = query(collection(db, "tech_logs"), orderBy("date", "desc"), limit(300));
    return onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as TechLogEntry[];
        callback(logs);
    }, (error) => console.error("Tech Log Snapshot Error", error));
};

export const updateTechLog = async (id: string, updates: Partial<TechLogEntry>) => {
    try {
        const docRef = doc(db, "tech_logs", id);
        await updateDoc(docRef, sanitizeData(updates));
    } catch (e) {
        console.error("Error updating tech log:", e);
        throw e;
    }
};

// Triggered when Voyage Report is saved
export const syncVoyageToTechLog = async (flight: Flight) => {
    if (!flight.id) return;
    
    // Check if Tech Log already exists for this flight
    const q = query(collection(db, "tech_logs"), where("flightId", "==", flight.id));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
        // Update existing if it is still a draft (don't overwrite verified logs)
        const logDoc = snap.docs[0];
        const logData = logDoc.data() as TechLogEntry;
        if (logData.status === 'Draft') {
            await updateDoc(logDoc.ref, {
               "times.out": flight.outTime || '',
               "times.off": flight.offTime || '',
               "times.on": flight.onTime || '',
               "times.in": flight.inTime || '',
               "times.flightTime": flight.actualFlightTime || 0,
               "times.blockTime": flight.actualBlockTime || 0
            });
        }
        return;
    }

    // Create New Draft
    const newLog: Omit<TechLogEntry, 'id'> = {
        flightId: flight.id,
        flightNumber: flight.flightNumber,
        aircraftRegistration: flight.aircraftRegistration,
        date: flight.date,
        status: 'Draft',
        times: {
            out: flight.outTime || '',
            off: flight.offTime || '',
            on: flight.onTime || '',
            in: flight.inTime || '',
            flightTime: flight.actualFlightTime || 0,
            blockTime: flight.actualBlockTime || 0
        },
        maintenance: {
            fuelUplift: 0,
            oilUplift: 0,
            defects: [],
            actionTaken: []
        }
    };
    
    await addDoc(collection(db, "tech_logs"), sanitizeData(newLog));
};

export const commitTechLog = async (log: TechLogEntry, aircraft: Aircraft & { _docId?: string }) => {
    if (!aircraft._docId) throw new Error("Invalid Aircraft ID");
    
    const batch = writeBatch(db);
    
    // 1. Lock Tech Log
    const logRef = doc(db, "tech_logs", log.id);
    batch.update(logRef, { 
        status: 'Verified',
        verifiedAt: new Date().toISOString(),
        verifiedBy: auth.currentUser?.email || 'System'
    });

    // 2. Update Aircraft Totals
    const aircraftRef = doc(db, "fleet", aircraft._docId);
    
    // Calculate new total time
    const flightHours = log.times.flightTime || 0;
    
    // Prepare component updates
    const updatedComponents = (aircraft.components || []).map(comp => {
        // Logic: All installed components accrue flight time
        // In a real app, you might filter by 'installed' status or type
        return {
            ...comp,
            currentHours: (comp.currentHours || 0) + flightHours
        };
    });

    batch.update(aircraftRef, {
        airframeTotalTime: increment(flightHours),
        currentHours: increment(flightHours), // Legacy sync
        components: updatedComponents
    });

    await batch.commit();
};