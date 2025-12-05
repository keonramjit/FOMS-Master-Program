
import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { FlightModal } from './components/FlightModal';
import { LoginScreen } from './components/LoginScreen';
import { Flight, OperationsStats, CrewMember, Aircraft, RouteDefinition, CustomerDefinition, FlightStatus, SystemSettings, UserProfile, LocationDefinition } from './types';
import { Loader2, Menu, PlaneTakeoff } from 'lucide-react';
import { INITIAL_FLIGHTS, CREW_ROSTER, FLEET_INVENTORY } from './constants';
import { 
  subscribeToFlights, 
  addFlight, 
  updateFlight, 
  deleteFlight, 
  subscribeToCrew, 
  addCrewMember, 
  updateCrewMember, 
  subscribeToFleet, 
  addAircraft, 
  updateAircraft, 
  subscribeToAuth, 
  logoutUser, 
  fetchRoutes,
  addRoute, 
  updateRoute, 
  deleteRoute, 
  fetchCustomers,
  addCustomer, 
  updateCustomer, 
  deleteCustomer, 
  fetchLocations,
  addLocation,
  updateLocation,
  deleteLocation,
  subscribeToOrganization,
  updateOrganizationLicense,
  getUserProfile,
  createUserProfile,
  addTrainingRecord,
  updateTrainingRecord,
  deleteTrainingRecord,
  addTrainingEvent,
  updateTrainingEvent,
  deleteTrainingEvent
} from './services/firebase';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy Load Pages
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const PlanningPage = React.lazy(() => import('./pages/PlanningPage').then(module => ({ default: module.PlanningPage })));
const DispatchPage = React.lazy(() => import('./pages/DispatchPage').then(module => ({ default: module.DispatchPage })));
const CrewPage = React.lazy(() => import('./pages/CrewPage').then(module => ({ default: module.CrewPage })));
const FleetPage = React.lazy(() => import('./pages/FleetPage').then(module => ({ default: module.FleetPage })));
const VoyagePage = React.lazy(() => import('./pages/VoyagePage').then(module => ({ default: module.VoyagePage })));
const TrainingPage = React.lazy(() => import('./pages/TrainingPage').then(module => ({ default: module.TrainingPage })));
const RoutePage = React.lazy(() => import('./pages/RoutePage').then(module => ({ default: module.RoutePage })));
const CustomerPage = React.lazy(() => import('./pages/CustomerPage').then(module => ({ default: module.CustomerPage })));
const AdminPage = React.lazy(() => import('./pages/AdminPage').then(module => ({ default: module.AdminPage })));

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // App State
  const [currentDate, setCurrentDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  
  // Data State
  const [flights, setFlights] = useState<Flight[]>([]);
  const [crewRoster, setCrewRoster] = useState<(CrewMember & { _docId: string })[]>([]);
  const [fleet, setFleet] = useState<(Aircraft & { _docId: string })[]>([]);
  const [routes, setRoutes] = useState<RouteDefinition[]>([]);
  const [locations, setLocations] = useState<LocationDefinition[]>([]);
  const [customers, setCustomers] = useState<CustomerDefinition[]>([]);
  
  // System Settings / Features
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

  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [, setError] = useState<string | null>(null);

  // 1. Listen for Auth Changes AND Fetch Profile
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

  // 2. Subscribe to Data & Organization Settings
  useEffect(() => {
    if (isDemoMode) {
        setFlights(INITIAL_FLIGHTS);
        setCrewRoster(CREW_ROSTER.map((c, i) => ({ ...c, _docId: `demo-crew-${i}` })));
        setFleet(FLEET_INVENTORY.map((f, i) => ({ ...f, _docId: `demo-fleet-${i}` })));
        setRoutes([]);
        setLocations([]);
        setCustomers([]);
        return;
    }

    if (!user) return;

    // SAAS LOGIC: Subscribe to Organization License
    const orgId = userProfile?.orgId || 'trans_guyana';
    
    const unsubscribeOrg = subscribeToOrganization(orgId, (org) => {
        if (org && org.license && org.license.modules) {
            setFeatures(prev => ({ ...prev, ...org.license.modules }));
        }
    });

    const unsubscribeCrew = subscribeToCrew((data) => {
      setCrewRoster(data);
    });

    const unsubscribeFleet = subscribeToFleet((data) => {
      setFleet(data);
    });

    const loadStaticData = async () => {
        const r = await fetchRoutes();
        setRoutes(r);
        const l = await fetchLocations();
        setLocations(l);
        const c = await fetchCustomers();
        setCustomers(c);
    };
    loadStaticData();

    return () => {
      if (unsubscribeOrg) unsubscribeOrg();
      if (unsubscribeCrew) unsubscribeCrew();
      if (unsubscribeFleet) unsubscribeFleet();
    };
  }, [user, userProfile?.orgId, isDemoMode]);

  // 3. Flight Subscription
  useEffect(() => {
    if (!user || isDemoMode) return;
    const unsubscribeFlights = subscribeToFlights(currentDate, (data) => {
      setFlights(data);
    });
    return () => {
      if (unsubscribeFlights) unsubscribeFlights();
    };
  }, [user, currentDate, isDemoMode]);

  // Stats Logic
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

  // Handlers
  const handleStatusUpdate = async (id: string, newStatus: FlightStatus) => {
    try {
      if (isDemoMode) setFlights(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
      else await updateFlight(id, { status: newStatus });
    } catch (e) {
      console.error(e);
      setError("Failed to update status.");
    }
  };

  const handleSaveFlight = async (flightData: Omit<Flight, 'id'>) => {
    try {
      if (isDemoMode) {
          const newFlight = { ...flightData, id: `demo-${Date.now()}` } as Flight;
          if (editingFlight) setFlights(prev => prev.map(f => f.id === editingFlight.id ? { ...f, ...flightData } : f));
          else setFlights(prev => [...prev, newFlight]);
      } else {
          if (editingFlight) await updateFlight(editingFlight.id, flightData);
          else await addFlight(flightData);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to save flight.");
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
  if (!user && !isDemoMode) return <LoginScreen onDemoLogin={() => setIsDemoMode(true)} />;

  return (
    <Router>
      <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
        <Sidebar 
          onLogout={logoutUser}
          userEmail={user?.email}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          features={features}
          isDesktopOpen={isDesktopSidebarOpen}
          onDesktopToggle={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
        />

        <main className={`flex-1 overflow-y-auto relative w-full transition-all duration-300 ${isDesktopSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          {/* Mobile Header */}
          <div className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md sticky top-0 z-20">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0"><PlaneTakeoff className="text-white" size={18} /></div>
                  <h1 className="font-bold text-sm tracking-wide">FOMS FLIGHT OPS</h1>
              </div>
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-800 rounded-lg"><Menu size={24} /></button>
          </div>

          <Suspense fallback={<div className="h-full flex items-center justify-center text-slate-400 gap-3"><Loader2 size={40} className="animate-spin text-blue-500" /></div>}>
              <ErrorBoundary>
                <Routes>
                  {/* Dashboard */}
                  <Route path="/" element={
                    <DashboardPage 
                      currentDate={currentDate}
                      onDateChange={setCurrentDate}
                      stats={stats}
                      filteredFlights={filteredFlights}
                      onStatusUpdate={handleStatusUpdate}
                    />
                  } />

                  {/* Flight Planning */}
                  <Route path="/planning" element={
                    features.enableFlightPlanning ? (
                      <PlanningPage 
                        currentDate={currentDate} 
                        onDateChange={setCurrentDate} 
                        flights={flights} 
                        fleet={fleet} 
                        crew={crewRoster} 
                        routes={routes} 
                        customers={customers} 
                        onAddFlight={addFlight} 
                        onUpdateFlight={updateFlight} 
                        onDeleteFlight={deleteFlight} 
                      />
                    ) : <Navigate to="/" />
                  } />

                  {/* Dispatch */}
                  <Route path="/dispatch" element={
                    features.enableDispatch ? (
                      <DispatchPage 
                        flights={flights} 
                        fleet={fleet} 
                        crew={crewRoster} 
                        currentDate={currentDate} 
                        isEnabled={features.enableDispatch} 
                        onDateChange={setCurrentDate} 
                        features={features} 
                      />
                    ) : <Navigate to="/" />
                  } />

                  {/* Crew */}
                  <Route path="/crew" element={
                    features.enableCrewManagement ? (
                      <CrewPage 
                        crewRoster={crewRoster} 
                        flights={flights} 
                        routes={routes} 
                        onAdd={addCrewMember} 
                        onUpdate={updateCrewMember} 
                        features={features} 
                      />
                    ) : <Navigate to="/" />
                  } />

                  {/* Fleet */}
                  <Route path="/fleet" element={
                    features.enableFleetManagement ? (
                      <FleetPage 
                        fleet={fleet} 
                        flights={flights} 
                        onAdd={addAircraft} 
                        onUpdate={updateAircraft} 
                        features={features} 
                      />
                    ) : <Navigate to="/" />
                  } />

                  {/* Voyage Reports */}
                  <Route path="/voyage" element={
                    features.enableVoyageReports ? (
                      <VoyagePage 
                        flights={flights} 
                        fleet={fleet} 
                        crew={crewRoster} 
                        currentDate={currentDate} 
                        isEnabled={features.enableVoyageReports} 
                        onDateChange={setCurrentDate} 
                      />
                    ) : <Navigate to="/" />
                  } />

                  {/* Training */}
                  <Route path="/training" element={
                    features.enableTrainingManagement ? (
                      <TrainingPage 
                        crew={crewRoster} 
                        features={features} 
                        onAddRecord={addTrainingRecord} 
                        onUpdateRecord={updateTrainingRecord} 
                        onDeleteRecord={deleteTrainingRecord} 
                        onAddEvent={addTrainingEvent} 
                        onUpdateEvent={updateTrainingEvent} 
                        onDeleteEvent={deleteTrainingEvent} 
                      />
                    ) : <Navigate to="/" />
                  } />

                  {/* Routes */}
                  <Route path="/routes" element={
                    features.enableRouteManagement ? (
                      <RoutePage 
                        routes={routes} 
                        locations={locations}
                        onAddRoute={addRoute} 
                        onUpdateRoute={updateRoute} 
                        onDeleteRoute={deleteRoute} 
                        onAddLocation={async (l) => {
                            if(isDemoMode) setLocations(prev => [...prev, { ...l, id: `demo-${Date.now()}` }]);
                            else await addLocation(l);
                        }}
                        onUpdateLocation={async (id, l) => {
                            if(isDemoMode) setLocations(prev => prev.map(x => x.id === id ? { ...x, ...l } : x));
                            else await updateLocation(id, l);
                        }}
                        onDeleteLocation={async (id) => {
                            if(isDemoMode) setLocations(prev => prev.filter(x => x.id !== id));
                            else await deleteLocation(id);
                        }}
                        features={features} 
                      />
                    ) : <Navigate to="/" />
                  } />

                  {/* Customers */}
                  <Route path="/customers" element={
                    features.enableCustomerDatabase ? (
                      <CustomerPage 
                        customers={customers} 
                        onAddCustomer={addCustomer} 
                        onUpdateCustomer={updateCustomer} 
                        onDeleteCustomer={deleteCustomer} 
                        features={features} 
                      />
                    ) : <Navigate to="/" />
                  } />

                  {/* Admin */}
                  <Route path="/admin" element={
                    <AdminPage 
                        features={features}
                        userProfile={userProfile}
                        onUpdateLicense={async (s) => {
                            const orgId = userProfile?.orgId || 'trans_guyana';
                            await updateOrganizationLicense(orgId, { modules: { ...features, ...s } });
                        }}
                    />
                  } />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ErrorBoundary>
          </Suspense>
        </main>

        <FlightModal 
          isOpen={isFlightModalOpen} 
          onClose={() => setIsFlightModalOpen(false)} 
          onSave={handleSaveFlight} 
          editingFlight={editingFlight} 
          fleet={fleet} 
          crew={crewRoster} 
          customers={customers} 
          flights={flights} 
          features={features} 
        />
      </div>
    </Router>
  );
};

export default App;
