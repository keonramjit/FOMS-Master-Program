import { initializeApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where,
  setDoc,
  getDoc,
  getDocs,
  limit,
  writeBatch,
  QuerySnapshot,
  DocumentData,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { Flight, CrewMember, Aircraft, RouteDefinition, CustomerDefinition, SystemSettings, DispatchRecord, TrainingRecord, TrainingEvent, UserProfile, Organization } from "../types";

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

export const auth = firebaseAuth.getAuth(app);

// Initialize Firestore with Offline Persistence
let db;
try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    });
} catch (e) {
    console.warn("Firestore offline persistence failed to initialize. Falling back to default.", e);
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

// --- Authentication & User Profiles ---

export const loginUser = async (email: string, pass: string) => {
  try {
    await firebaseAuth.signInWithEmailAndPassword(auth, email, pass);
  } catch (error: any) {
    console.error("Login error:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await firebaseAuth.signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
  }
};

export const subscribeToAuth = (callback: (user: any | null) => void) => {
  return firebaseAuth.onAuthStateChanged(auth, (user: any) => {
    callback(user);
  });
};

export const getUserProfile = async (email: string): Promise<UserProfile | null> => {
    if (!email) return null;
    try {
        const docRef = doc(db, "users", email);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return snap.data() as UserProfile;
        }
        return null;
    } catch (e) {
        console.error("Error fetching user profile:", e);
        return null;
    }
};

export const createUserProfile = async (profile: UserProfile) => {
    try {
        await setDoc(doc(db, "users", profile.email), sanitizeData(profile));
    } catch (e) {
        console.error("Error creating user profile:", e);
        throw e;
    }
};

// --- Organization / SaaS Logic (THE MISSING PIECE) ---

export const subscribeToOrganization = (orgId: string, callback: (org: Organization | null) => void) => {
  if (!auth.currentUser || !orgId) return () => {};
  
  const docRef = doc(db, "organizations", orgId);
  
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...(docSnap.data() as any) } as Organization);
    } else {
      // If org doesn't exist, create default for TGA
      seedOrganization(orgId);
    }
  }, (error) => console.error("Org snapshot error:", error));
};

export const updateOrganizationLicense = async (orgId: string, modules: SystemSettings) => {
    try {
        const docRef = doc(db, "organizations", orgId);
        // We merge into the license.modules path
        await setDoc(docRef, { license: { modules } }, { merge: true });
    } catch(e) {
        console.error("Error updating license:", e);
        throw e;
    }
};

const seedOrganization = async (orgId: string) => {
    const defaultOrg: Organization = {
        id: orgId,
        name: 'Trans Guyana Airways',
        license: {
            plan: 'pro',
            status: 'active',
            modules: {
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
            }
        }
    };
    await setDoc(doc(db, "organizations", orgId), defaultOrg);
};

// --- Flights Collection ---

export const subscribeToFlights = (date: string, callback: (flights: Flight[]) => void) => {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, "flights"), where("date", "==", date));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
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
    }, (error) => console.error("Dispatch snapshot error:", error));
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
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const crew = snapshot.docs.map(doc => ({
      _docId: doc.id, 
      ...(doc.data() as any)
    })) as (CrewMember & { _docId: string })[];
    callback(crew);
  }, (error) => console.error("Crew snapshot error:", error));
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
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const fleet = snapshot.docs.map(doc => ({
      _docId: doc.id, 
      ...(doc.data() as any)
    })) as (Aircraft & { _docId: string })[];
    callback(fleet);
  }, (error) => console.error("Fleet snapshot error:", error));
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
  const q = query(collection(db, "routes"), orderBy("code"));
  try {
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

// --- Customers Collection ---

export const fetchCustomers = async (): Promise<CustomerDefinition[]> => {
  if (!auth.currentUser) return [];
  const q = query(collection(db, "customers"), orderBy("name"));
  try {
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
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
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
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
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