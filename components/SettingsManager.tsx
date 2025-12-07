
import React, { useState } from 'react';
import { RouteDefinition, CustomerDefinition, SystemSettings } from '../types';
import { Route as RouteIcon, Users as UsersIcon, Plane, Globe, Lock } from 'lucide-react';
import { FeatureGate } from './FeatureGate';
import { useAppData } from '../context/DataContext';
import { AircraftTypeManager } from './AircraftTypeManager';
import { RouteManager } from './RouteManager';
import { CustomerManager } from './CustomerManager';

interface SettingsManagerProps {
  routes: RouteDefinition[];
  customers: CustomerDefinition[];
  onAddRoute: (route: Omit<RouteDefinition, 'id'>) => Promise<void>;
  onUpdateRoute: (id: string, route: Partial<RouteDefinition>) => Promise<void>;
  onDeleteRoute: (id: string) => Promise<void>;
  onAddCustomer: (customer: Omit<CustomerDefinition, 'id'>) => Promise<void>;
  onUpdateCustomer: (id: string, customer: Partial<CustomerDefinition>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  features: SystemSettings;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  routes,
  customers,
  onAddRoute,
  onUpdateRoute,
  onDeleteRoute,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  features
}) => {
  const { locations, addLocation, updateLocation, deleteLocation } = useAppData();
  const [activeTab, setActiveTab] = useState<'routes' | 'customers' | 'aircraft'>('routes');

  return (
    <FeatureGate isEnabled={true}> 
        <div className="max-w-7xl mx-auto p-4 lg:p-8 pb-32 animate-in fade-in duration-300">
          <header className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">System Settings</h1>
            <p className="text-slate-500 mt-1">Configure operational data, routes, aircraft types, and client databases.</p>
          </header>

          {/* Settings Navigation Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 flex p-1">
            <button 
                onClick={() => setActiveTab('routes')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'routes' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
                <div className="flex items-center gap-2">
                    <RouteIcon size={18} />
                    Route Management
                    {!features.enableRouteManagement && <Lock size={12} className="opacity-50" />}
                </div>
            </button>
            <button 
                onClick={() => setActiveTab('customers')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'customers' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
                <div className="flex items-center gap-2">
                    <UsersIcon size={18} />
                    Customer Database
                    {!features.enableCustomerDatabase && <Lock size={12} className="opacity-50" />}
                </div>
            </button>
            <button 
                onClick={() => setActiveTab('aircraft')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'aircraft' ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
                <div className="flex items-center gap-2">
                    <Plane size={18} />
                    Aircraft Types
                </div>
            </button>
          </div>

          {/* Content Area */}
          <div className="space-y-8">
            
            {/* ROUTES TAB */}
            {activeTab === 'routes' && (
              <FeatureGate isEnabled={features.enableRouteManagement ?? true}>
                 <RouteManager 
                    routes={routes} 
                    locations={locations}
                    onAddRoute={onAddRoute} 
                    onUpdateRoute={onUpdateRoute} 
                    onDeleteRoute={onDeleteRoute}
                    onAddLocation={addLocation}
                    onUpdateLocation={updateLocation}
                    onDeleteLocation={deleteLocation}
                    features={features} 
                 />
              </FeatureGate>
            )}

            {/* CUSTOMERS TAB */}
            {activeTab === 'customers' && (
              <FeatureGate isEnabled={features.enableCustomerDatabase ?? true}>
                 <CustomerManager 
                    customers={customers} 
                    onAddCustomer={onAddCustomer} 
                    onUpdateCustomer={onUpdateCustomer} 
                    onDeleteCustomer={onDeleteCustomer} 
                    features={features} 
                 />
              </FeatureGate>
            )}

            {/* AIRCRAFT TYPES TAB */}
            {activeTab === 'aircraft' && (
                <AircraftTypeManager />
            )}
          </div>
        </div>
    </FeatureGate>
  );
};
