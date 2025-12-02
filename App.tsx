import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { StatsCards } from './components/StatsCards';
import { FlightTable } from './components/FlightTable';
import { CalendarWidget } from './components/CalendarWidget';
import { FlightModal } from './components/FlightModal';
import { DigitalClock } from './components/DigitalClock';
import { LoginScreen } from './components/LoginScreen';
import { Flight, OperationsStats, CrewMember, Aircraft, RouteDefinition, CustomerDefinition, FlightStatus, SystemSettings, UserProfile, LocationDefinition } from './types';
import { Loader2, AlertCircle, Menu, PlaneTakeoff, Activity } from 'lucide-react';
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

const CrewManager = React.lazy(() => import('./components/CrewManager').then(module => ({ default: module.CrewManager })));
const FleetManager = React.lazy(() => import('./components/FleetManager').then(module => ({ default: module.FleetManager })));
const FlightPlanning = React.lazy(() => import('./components/FlightPlanning').then(module => ({ default: module.FlightPlanning })));
const RouteManager = React.lazy(() => import('./components/RouteManager').then(module => ({ default: module.RouteManager })));
const CustomerManager = React.lazy(() => import('./components/CustomerManager').then(module => ({ default: module.CustomerManager })));
const DispatchManager = React.lazy(() => import('./components/DispatchManager').then(module => ({ default: module.DispatchManager })));
const VoyageReportManager = React.lazy(() => import('./components/VoyageReportManager').then(module => ({ default: module.VoyageReportManager })));
const TrainingManager = React.lazy(() => import('./components/TrainingManager').then(module => ({ default: module.TrainingManager })));
const SubscriptionManagement = React.lazy(() => import('./components/SubscriptionManagement').then(module => ({ default: module.SubscriptionManagement })));

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [currentView, setCurrentView] = useState('dashboard');
  
  const [currentDate, setCurrentDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  
  const [flights, setFlights] = useState<Flight[]>([]);
  const [crewRoster, setCrewRoster] = useState<(CrewMember & { _docId: string })[]>([]);
  const [fleet, setFleet] = useState<(Aircraft & { _docId: string })[]>([]);
  const [routes, setRoutes] = useState<RouteDefinition[]>([]);
  const [locations, setLocations] = useState<LocationDefinition[]>([]);
  const [customers, setCustomers] = useState<CustomerDefinition[]>([]);
  
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
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user || isDemoMode) return;
    const unsubscribeFlights = subscribeToFlights(currentDate, (data) => {
      setFlights(data);
    });
    return () => {
      if (unsubscribeFlights) unsubscribeFlights();
    };
  }, [user, currentDate, isDemoMode]);

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
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        onLogout={logoutUser}
        userEmail={user?.email}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        features={features}
        isDesktopOpen={isDesktopSidebarOpen}
        onDesktopToggle={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
      />

      <main className={`flex-1 overflow-y-auto relative w-full transition-all duration-300 ${isDesktopSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <div className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md sticky top-0 z-20">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0"><PlaneTakeoff className="text-white" size={18} /></div>
                <h1 className="font-bold text-sm tracking-wide">FOMS FLIGHT OPS</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-800 rounded-lg"><Menu size={24} /></button>
        </div>

        <Suspense fallback={<div className="h-full flex items-center justify-center text-slate-400 gap-3"><Loader2 size={40} className="animate-spin text-blue-500" /></div>}>
            <ErrorBoundary>
                {currentView === 'access' ? (
                    <SubscriptionManagement 
                        features={features}
                        userProfile={userProfile}
                        onUpdateLicense={async (s) => {
                            const orgId = userProfile?.orgId || 'trans_guyana';
                            await updateOrganizationLicense(orgId, { ...features, ...s });
                        }}
                    />
                ) : currentView === 'crew' && features.enableCrewManagement ? (
                    <CrewManager crewRoster={crewRoster} flights={flights} routes={routes} onAdd={addCrewMember} onUpdate={updateCrewMember} features={features} />
                ) : currentView === 'fleet' && features.enableFleetManagement ? (
                    <FleetManager fleet={fleet} flights={flights} onAdd={addAircraft} onUpdate={updateAircraft} features={features} />
                ) : currentView === 'planning' && features.enableFlightPlanning ? (
                    <FlightPlanning currentDate={currentDate} onDateChange={setCurrentDate} flights={flights} fleet={fleet} crew={crewRoster} routes={routes} customers={customers} onAddFlight={addFlight} onUpdateFlight={updateFlight} onDeleteFlight={deleteFlight} />
                ) : currentView === 'dispatch' ? (
                    <DispatchManager flights={flights} fleet={fleet} crew={crewRoster} currentDate={currentDate} isEnabled={features.enableDispatch} onDateChange={setCurrentDate} />
                ) : currentView === 'voyage' ? (
                    <VoyageReportManager flights={flights} crew={crewRoster} currentDate={currentDate} isEnabled={features.enableVoyageReports} onDateChange={setCurrentDate} />
                ) : currentView === 'training' ? (
                    <TrainingManager crew={crewRoster} features={features} onAddRecord={addTrainingRecord} onUpdateRecord={updateTrainingRecord} onDeleteRecord={deleteTrainingRecord} onAddEvent={addTrainingEvent} onUpdateEvent={updateTrainingEvent} onDeleteEvent={deleteTrainingEvent} />
                ) : currentView === 'routes' ? (
                    <RouteManager 
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
                ) : currentView === 'customers' ? (
                    <CustomerManager customers={customers} onAddCustomer={addCustomer} onUpdateCustomer={updateCustomer} onDeleteCustomer={deleteCustomer} features={features} />
                ) : (
                    <div className="relative min-h-full bg-slate-50">
                        <div className="absolute top-0 left-0 w-full h-80 bg-slate-900 overflow-hidden"><div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-slate-900 z-10"/></div>
                        <div className="relative z-20 max-w-7xl mx-auto px-4 lg:px-8 pt-8 pb-24">
                            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 text-white">
                                <div className="animate-in slide-in-from-left-2 duration-500"><h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">Daily Operations<br/>Dashboard</h1></div>
                                <div className="hidden lg:block animate-in slide-in-from-right-2 duration-500"><DigitalClock /></div>
                            </header>
                            <div className="bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl shadow-slate-900/5 border border-white/20 mb-10 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex bg-slate-100/80 p-1.5 rounded-xl"><button className="px-6 py-2.5 bg-white rounded-lg shadow-sm text-slate-900 font-bold text-sm">Flight Board</button></div>
                                <div className="w-full md:w-auto flex justify-end"><CalendarWidget selectedDate={currentDate} onDateSelect={setCurrentDate} /></div>
                            </div>
                            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200"><StatsCards stats={stats} /></div>
                            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                                <div className="flex items-center justify-between px-2 mb-4"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Live Schedule</h3></div>
                                <FlightTable flights={filteredFlights} readOnly={true} onStatusUpdate={handleStatusUpdate} />
                            </div>
                        </div>
                    </div>
                )}
            </ErrorBoundary>
        </Suspense>
      </main>

      <FlightModal isOpen={isFlightModalOpen} onClose={() => setIsFlightModalOpen(false)} onSave={handleSaveFlight} editingFlight={editingFlight} fleet={fleet} crew={crewRoster} customers={customers} flights={flights} features={features} />
    </div>
  );
};

export default App;