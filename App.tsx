
import React, { Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { StatsCards } from './components/StatsCards';
import { FlightTable } from './components/FlightTable';
import { CalendarWidget } from './components/CalendarWidget';
import { FlightModal } from './components/FlightModal';
import { DigitalClock } from './components/DigitalClock';
import { LoginScreen } from './components/LoginScreen';
import { Loader2, Menu, PlaneTakeoff } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppData } from './context/DataContext';

// Code Splitting - Lazy Load Major Components
const CrewManager = React.lazy(() => import('./components/CrewManager').then(module => ({ default: module.CrewManager })));
const FleetManager = React.lazy(() => import('./components/FleetManager').then(module => ({ default: module.FleetManager })));
const FlightPlanning = React.lazy(() => import('./components/FlightPlanning').then(module => ({ default: module.FlightPlanning })));
const RouteManager = React.lazy(() => import('./components/RouteManager').then(module => ({ default: module.RouteManager })));
const CustomerManager = React.lazy(() => import('./components/CustomerManager').then(module => ({ default: module.CustomerManager })));
const DispatchManager = React.lazy(() => import('./components/DispatchManager').then(module => ({ default: module.DispatchManager })));
const VoyageReportManager = React.lazy(() => import('./components/VoyageReportManager').then(module => ({ default: module.VoyageReportManager })));
const TrainingManager = React.lazy(() => import('./components/TrainingManager').then(module => ({ default: module.TrainingManager })));
const SubscriptionManagement = React.lazy(() => import('./components/SubscriptionManagement').then(module => ({ default: module.SubscriptionManagement })));
const AircraftTypeManager = React.lazy(() => import('./components/AircraftTypeManager').then(module => ({ default: module.AircraftTypeManager })));

const App: React.FC = () => {
  // --- THE FIX: USE CONTEXT INSTEAD OF LOCAL STATE ---
  const { 
    user, 
    userProfile, // Added userProfile to destructuring
    authLoading, 
    logout, 
    isDemoMode, 
    setIsDemoMode,
    currentDate,
    setCurrentDate,
    features,
    updateLicense,
    // Data
    flights,
    crew,
    fleet,
    routes,
    locations,
    customers,
    aircraftTypes,
    // Derived
    stats,
    filteredFlights,
    // Actions
    addFlight, updateFlight, deleteFlight,
    addCrew, updateCrew,
    addAircraft, updateAircraft,
    addRoute, updateRoute, deleteRoute,
    addLocation, updateLocation, deleteLocation,
    addCustomer, updateCustomer, deleteCustomer,
    addAircraftType, updateAircraftType, deleteAircraftType,
    // Sub-module APIs
    apiAddTrainingRecord, apiUpdateTrainingRecord, apiDeleteTrainingRecord,
    apiAddTrainingEvent, apiUpdateTrainingEvent, apiDeleteTrainingEvent
  } = useAppData();

  const [currentView, setCurrentView] = React.useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = React.useState(true);
  
  const [isFlightModalOpen, setIsFlightModalOpen] = React.useState(false);
  const [editingFlight, setEditingFlight] = React.useState<any | null>(null);

  // Handlers for Flight Modal
  const handleEditFlight = (flight: any) => {
      setEditingFlight(flight);
      setIsFlightModalOpen(true);
  };

  const handleSaveFlight = async (data: any) => {
      if (editingFlight) {
          await updateFlight(editingFlight.id, data);
      } else {
          await addFlight(data);
      }
      setIsFlightModalOpen(false);
      setEditingFlight(null);
  };

  const handleStatusUpdate = async (id: string, status: any) => {
      await updateFlight(id, { status });
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
  if (!user && !isDemoMode) return <LoginScreen onDemoLogin={() => setIsDemoMode(true)} />;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        onLogout={logout}
        userEmail={user?.email}
        userRole={userProfile?.role} // Passed role to Sidebar
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
                {currentView === 'access' ? (
                    <SubscriptionManagement 
                        features={features}
                        userProfile={userProfile} 
                        onUpdateLicense={async (s) => await updateLicense(s)}
                    />
                ) : currentView === 'crew' && features.enableCrewManagement ? (
                    <CrewManager crewRoster={crew} flights={flights} routes={routes} onAdd={addCrew} onUpdate={updateCrew} features={features} />
                ) : currentView === 'fleet' && features.enableFleetManagement ? (
                    <FleetManager fleet={fleet} flights={flights} aircraftTypes={aircraftTypes} onAdd={addAircraft} onUpdate={updateAircraft} features={features} />
                ) : currentView === 'planning' && features.enableFlightPlanning ? (
                    <FlightPlanning 
                      currentDate={currentDate} 
                      onDateChange={setCurrentDate} 
                      flights={flights} 
                      fleet={fleet} 
                      crew={crew} 
                      routes={routes} 
                      customers={customers}
                      aircraftTypes={aircraftTypes} 
                      onAddFlight={addFlight} 
                      onUpdateFlight={updateFlight} 
                      onDeleteFlight={deleteFlight} 
                    />
                ) : currentView === 'dispatch' ? (
                    <DispatchManager flights={flights} fleet={fleet} crew={crew} currentDate={currentDate} isEnabled={features.enableDispatch} onDateChange={setCurrentDate} features={features} />
                ) : currentView === 'voyage' ? (
                    <VoyageReportManager flights={flights} fleet={fleet} crew={crew} currentDate={currentDate} isEnabled={features.enableVoyageReports} onDateChange={setCurrentDate} />
                ) : currentView === 'training' ? (
                    <TrainingManager crew={crew} features={features} onAddRecord={apiAddTrainingRecord} onUpdateRecord={apiUpdateTrainingRecord} onDeleteRecord={apiDeleteTrainingRecord} onAddEvent={apiAddTrainingEvent} onUpdateEvent={apiUpdateTrainingEvent} onDeleteEvent={apiDeleteTrainingEvent} />
                ) : currentView === 'routes' ? (
                    <RouteManager 
                      routes={routes} 
                      locations={locations}
                      onAddRoute={addRoute} 
                      onUpdateRoute={updateRoute} 
                      onDeleteRoute={deleteRoute} 
                      onAddLocation={addLocation}
                      onUpdateLocation={updateLocation}
                      onDeleteLocation={deleteLocation}
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

      <FlightModal 
        isOpen={isFlightModalOpen} 
        onClose={() => setIsFlightModalOpen(false)} 
        onSave={handleSaveFlight} 
        editingFlight={editingFlight} 
        fleet={fleet} 
        crew={crew} 
        customers={customers} 
        flights={flights} 
        features={features} 
      />
    </div>
  );
};

export default App;
