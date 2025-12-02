import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
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
  QuerySnapshot,
  DocumentData
} from "firebase/firestore";
import { Flight, CrewMember, Aircraft, RouteDefinition, CustomerDefinition, SystemSettings, DispatchRecord, TrainingRecord, TrainingEvent, Organization, License, UserProfile, LocationDefinition } from "../types";

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

// Initialize Firestore with Offline Persistence
let db: any;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e: any) {
  console.warn("Firestore offline persistence could not be enabled:", e.message);
  db = getFirestore(app);
}

// --- Helpers ---

const sanitizeData = <T extends Record<string, any>>(data: T): T => {
  const result = { ...data };
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });
  return result;
};

// --- Authentication ---

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

// --- User Profiles ---

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
  if (!auth.currentUser) return [];
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

// --- Organization & Licensing (SaaS) ---

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

// --- Flights Collection ---

export const subscribeToFlights = (date: string, callback: (flights: Flight[]) => void) => {
  if (!auth.currentUser) return () => {};
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
  if (!auth.currentUser) return [];
  try {
    const q = query(
      collection(db, "flights"), 
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );
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
  if (!auth.currentUser) return [];
  try {
    const q = query(
      collection(db, "flights"),
      where("aircraftRegistration", "==", registration),
      orderBy("date", "desc"),
      limit(50)
    );
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
    const flightRef = doc(db, "flights", id);
    await updateDoc(flightRef, sanitizeData(updates));
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

// --- Dispatch Collection ---

export const subscribeToDispatch = (flightId: string, callback: (dispatch: DispatchRecord | null) => void) => {
    if (!auth.currentUser || !flightId) return () => {};
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

// --- Crew Collection ---

export const subscribeToCrew = (callback: (crew: (CrewMember & { _docId: string })[]) => void) => {
  if (!auth.currentUser) return () => {};
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
    const crewRef = doc(db, "crew", docId);
    await updateDoc(crewRef, sanitizeData(updates));
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

// --- Fleet Collection ---

export const subscribeToFleet = (callback: (fleet: (Aircraft & { _docId: string })[]) => void) => {
  if (!auth.currentUser) return () => {};
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
    const aircraftRef = doc(db, "fleet", docId);
    await updateDoc(aircraftRef, sanitizeData(updates));
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

// --- Routes Collection ---

export const fetchRoutes = async (): Promise<RouteDefinition[]> => {
  if (!auth.currentUser) return [];
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

// --- Locations Collection ---

export const fetchLocations = async (): Promise<LocationDefinition[]> => {
  if (!auth.currentUser) return [];
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

// --- Customers Collection ---

export const fetchCustomers = async (): Promise<CustomerDefinition[]> => {
  if (!auth.currentUser) return [];
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

// --- Training Collections ---

export const subscribeToTrainingRecords = (callback: (records: TrainingRecord[]) => void) => {
  if (!auth.currentUser) return () => {};
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
  if (!auth.currentUser) return [];
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
  if (!auth.currentUser) return () => {};
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