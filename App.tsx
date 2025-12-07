
import React, { useState, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { FlightModal } from './components/FlightModal';
import { LoginScreen } from './components/LoginScreen';
import { Loader2, Menu, PlaneTakeoff } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DataProvider, useAppData } from './context/DataContext';
import { Flight } from './types';

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
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));

const AppContent: React.FC = () => {
  const { 
    user, userProfile, authLoading, isDemoMode, setIsDemoMode, logout, features, 
    addFlight, updateFlight, fleet, crew, customers, flights
  } = useAppData();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  
  // Modal State
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);

  const handleSaveFlight = async (flightData: Omit<Flight, 'id'>) => {
    if (editingFlight) await updateFlight(editingFlight.id, flightData);
    else await addFlight(flightData);
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
  if (!user && !isDemoMode) return <LoginScreen onDemoLogin={() => setIsDemoMode(true)} />;

  return (
    <Router>
      <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
        <Sidebar 
          onLogout={logout}
          userEmail={user?.email}
          userRole={userProfile?.role}
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
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/planning" element={features.enableFlightPlanning ? <PlanningPage /> : <Navigate to="/" />} />
                  <Route path="/dispatch" element={features.enableDispatch ? <DispatchPage /> : <Navigate to="/" />} />
                  <Route path="/crew" element={features.enableCrewManagement ? <CrewPage /> : <Navigate to="/" />} />
                  <Route path="/fleet" element={features.enableFleetManagement ? <FleetPage /> : <Navigate to="/" />} />
                  <Route path="/voyage" element={features.enableVoyageReports ? <VoyagePage /> : <Navigate to="/" />} />
                  <Route path="/training" element={features.enableTrainingManagement ? <TrainingPage /> : <Navigate to="/" />} />
                  <Route path="/routes" element={features.enableRouteManagement ? <RoutePage /> : <Navigate to="/" />} />
                  <Route path="/customers" element={features.enableCustomerDatabase ? <CustomerPage /> : <Navigate to="/" />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/admin" element={<AdminPage />} />
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
          crew={crew} 
          customers={customers} 
          flights={flights} 
          features={features} 
        />
      </div>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;
