
import React, { useState } from 'react';
import { RouteDefinition, CustomerDefinition, SystemSettings } from '../types';
import { Route as RouteIcon, Users as UsersIcon, Trash2, Plus, Edit2, Save, X, Plane, ArrowRight, MapPin, Hash, Clock, Navigation, Upload, Download, FileSpreadsheet, Loader2, Search, Lock } from 'lucide-react';
import { FeatureGate } from './FeatureGate';
import { decimalToHm, hmToDecimal } from '../utils/calculations';

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
  const [activeTab, setActiveTab] = useState<'routes' | 'customers'>('routes');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Search States
  const [routeSearch, setRouteSearch] = useState('');

  // Form States
  const [routeForm, setRouteForm] = useState<Partial<RouteDefinition>>({});
  const [routeTimeInput, setRouteTimeInput] = useState<string>(''); // Handle H:MM input
  const [customerForm, setCustomerForm] = useState<Partial<CustomerDefinition>>({});

  // -- Filter Logic --
  const filteredRoutes = routes.filter(r => {
    const term = routeSearch.toLowerCase();
    const matchesCode = r.code.toLowerCase().includes(term);
    const matchesName = (r.name || '').toLowerCase().includes(term);
    return matchesCode || matchesName;
  });

  // -- Handlers for Route --

  const handleEditRoute = (route: RouteDefinition) => {
    setRouteForm(route);
    setRouteTimeInput(decimalToHm(route.flightTime));
    setEditingId(route.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveRoute = async () => {
    if (!routeForm.code) return;
    
    // Process time input
    const finalFlightTime = hmToDecimal(routeTimeInput);
    const payload = { ...routeForm, flightTime: finalFlightTime };

    if (editingId) {
      await onUpdateRoute(editingId, payload);
      setEditingId(null);
    } else {
      await onAddRoute(payload as RouteDefinition);
    }
    setRouteForm({});
    setRouteTimeInput('');
  };

  const cancelRouteEdit = () => {
    setRouteForm({});
    setRouteTimeInput('');
    setEditingId(null);
  };

  // -- CSV Import/Export Logic --

  const handleDownloadTemplate = () => {
    const headers = "Airport Name,Route Code,Distance (nm),Avg Time (H:MM)";
    const sample = "Kaieteur Falls,OGL-KAI,125,1:12";
    const csvContent = "data:text/csv;charset=utf-8," + [headers, sample].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "tga_routes_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      await processCSV(text);
      setIsImporting(false);
      // Reset input value to allow same file selection again if needed
      event.target.value = '';
    };
    
    reader.onerror = () => {
        alert("Failed to read file");
        setIsImporting(false);
    };

    reader.readAsText(file);
  };

  const processCSV = async (csvText: string) => {
    try {
        const lines = csvText.split('\n');
        let importedCount = 0;
        
        // Skip header (index 0), start from 1
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Basic CSV split - standard format expected
            const parts = line.split(',');
            
            // Expected: Name, Code, Distance, Time
            const name = parts[0]?.trim();
            const code = parts[1]?.trim().toUpperCase();
            
            if (!code) continue;

            const distance = parseFloat(parts[2]?.trim() || '0');
            
            // Handle Time parsing using helper to support H:MM or Decimal
            const rawTime = parts[3]?.trim() || '0';
            const flightTime = hmToDecimal(rawTime);
            
            // Check for duplicates based on code to avoid spamming
            const exists = routes.some(r => r.code === code);
            if (!exists) {
                await onAddRoute({ 
                    name: name.replace(/['"]+/g, ''), // Basic sanitation
                    code, 
                    distance, 
                    flightTime 
                });
                importedCount++;
            }
        }

        if (importedCount > 0) {
            alert(`Successfully imported ${importedCount} new routes.`);
        } else {
            alert("No new routes found in the file.");
        }
    } catch (error) {
        console.error("Import error:", error);
        alert("Error processing CSV file. Please check the format.");
    }
  };

  // -- Handlers for Customer --

  const handleEditCustomer = (customer: CustomerDefinition) => {
    setCustomerForm(customer);
    setEditingId(customer.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveCustomer = async () => {
    if (!customerForm.name) return;
    if (editingId) {
      await onUpdateCustomer(editingId, customerForm);
      setEditingId(null);
    } else {
      await onAddCustomer(customerForm as CustomerDefinition);
    }
    setCustomerForm({});
  };

  const cancelCustomerEdit = () => {
    setCustomerForm({});
    setEditingId(null);
  };

  // Helper to format route code (e.g. OGL-KAI -> OGL -> KAI)
  const formatRouteDisplay = (code: string) => {
    if (code.includes('-')) {
      const parts = code.split('-');
      return (
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">{parts[0]}</span>
          <ArrowRight size={12} className="text-slate-400" />
          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">{parts[1]}</span>
        </div>
      );
    }
    return <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">{code}</span>;
  };

  // Helper for initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Helper for duration display (Decimal Hours -> H:MM)
  // Used in Table View
  const formatDurationDisplay = (val?: number) => {
    if (val === undefined || val === null) return '--';
    return decimalToHm(val);
  };

  // Shared Styles
  const inputClass = "w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none font-medium placeholder:text-slate-400";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1";
  
  // Updated Table Styles
  const thClass = "px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 first:pl-8 last:pr-8";
  const tdClass = "px-6 py-4 text-sm border-b border-slate-100 group-last:border-0 first:pl-8 last:pr-8 align-middle";

  return (
    <FeatureGate isEnabled={features.enableCustomerDatabase ?? true}>
        {/* ... (Existing JSX Content) ... */}
        {/* Using `features.enableRouteManagement ?? true` for backwards compatibility until refactor complete */}
        
        {/* ... (Same JSX as before, just removed local helper functions) ... */}
        
        <div className="max-w-6xl mx-auto p-4 lg:p-8 animate-in fade-in duration-300 pb-32">
          <header className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">System Settings</h1>
            <p className="text-slate-500 mt-1">Configure operational data, routes, and client databases.</p>
          </header>

          {/* Settings Navigation Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 flex p-1">
            <button 
                onClick={() => { setActiveTab('routes'); setEditingId(null); setRouteForm({}); setRouteTimeInput(''); }}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'routes' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
                <div className="flex items-center gap-2">
                    <RouteIcon size={18} />
                    Route Management
                    {!features.enableRouteManagement && <Lock size={12} className="opacity-50" />}
                </div>
            </button>
            <button 
                onClick={() => { setActiveTab('customers'); setEditingId(null); setCustomerForm({}); }}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'customers' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
                <div className="flex items-center gap-2">
                    <UsersIcon size={18} />
                    Customer Database
                    {!features.enableCustomerDatabase && <Lock size={12} className="opacity-50" />}
                </div>
            </button>
          </div>

          {/* Content Area */}
          <div className="space-y-8">
            
            {/* ROUTES TAB */}
            {activeTab === 'routes' && (
              <FeatureGate isEnabled={features.enableRouteManagement ?? true}>
                <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-6">
                    {/* ... (Existing Route Content) ... */}
                    {/* Input Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full opacity-50 pointer-events-none"></div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 relative z-10 gap-4">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                {editingId ? (
                                    <><div className="p-1.5 bg-blue-100 text-blue-600 rounded"><Edit2 size={16}/></div> Edit Route Details</>
                                ) : (
                                    <><div className="p-1.5 bg-blue-100 text-blue-600 rounded"><Plus size={16}/></div> Add New Route</>
                                )}
                            </h3>
                            
                            {!editingId && (
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={handleDownloadTemplate}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-100 rounded-lg transition-all"
                                        title="Download CSV Template"
                                    >
                                        <FileSpreadsheet size={14} />
                                        <span>Template</span>
                                    </button>
                                    
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            accept=".csv"
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            disabled={isImporting}
                                        />
                                        <button 
                                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-lg shadow-sm transition-all ${isImporting ? 'opacity-70 cursor-wait' : ''}`}
                                        >
                                            {isImporting ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14} />}
                                            <span>{isImporting ? 'Importing...' : 'Import CSV'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {editingId && (
                                <button onClick={cancelRouteEdit} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase">Cancel Edit</button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end relative z-10">
                            <div className="md:col-span-3">
                                <label className={labelClass}>Airport Name</label>
                                <input 
                                    placeholder="e.g. Kaieteur Falls" 
                                    className={inputClass}
                                    value={routeForm.name || ''}
                                    onChange={e => setRouteForm(p => ({ ...p, name: e.target.value }))}
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className={labelClass}>Airport Code (Route)</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        placeholder="e.g. OGL-KAI" 
                                        className={`${inputClass} pl-10 uppercase font-mono font-bold tracking-wide text-slate-700`}
                                        value={routeForm.code || ''}
                                        onChange={e => setRouteForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelClass}>Distance (nm)</label>
                                <input 
                                    placeholder="0" 
                                    type="number"
                                    className={inputClass}
                                    value={routeForm.distance || ''}
                                    onChange={e => setRouteForm(p => ({ ...p, distance: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelClass}>Avg Time (H:MM)</label>
                                <input 
                                    placeholder="e.g. 1:35" 
                                    type="text"
                                    className={inputClass}
                                    value={routeTimeInput}
                                    onChange={e => setRouteTimeInput(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <button 
                                    onClick={handleSaveRoute} 
                                    className={`w-full h-[46px] rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 ${editingId ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200'}`}
                                >
                                    {editingId ? <><Save size={18} /> Update</> : <><Plus size={18} /> Add</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar for Routes */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text"
                            placeholder="Search routes by airport name or code..."
                            value={routeSearch}
                            onChange={(e) => setRouteSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm placeholder:text-slate-400"
                        />
                    </div>

                    {/* Table Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr>
                                        <th className={thClass}>Airport Name</th>
                                        <th className={thClass}>Route Code</th>
                                        <th className={thClass}>Distance</th>
                                        <th className={thClass}>Flight Time</th>
                                        <th className={`${thClass} text-right`}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {filteredRoutes.map(route => (
                                        <tr key={route.id} className="group hover:bg-blue-50/50 transition-colors">
                                            <td className={tdClass}>
                                                <span className="font-semibold text-slate-800">{route.name || <span className="text-slate-400 italic">--</span>}</span>
                                            </td>
                                            <td className={tdClass}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                                                        <Navigation size={14} className="transform rotate-45" />
                                                    </div>
                                                    {formatRouteDisplay(route.code)}
                                                </div>
                                            </td>
                                            <td className={tdClass}>
                                                <span className="font-mono font-bold text-slate-700">{route.distance || '--'}</span> <span className="text-xs text-slate-400 font-bold uppercase ml-1">nm</span>
                                            </td>
                                            <td className={tdClass}>
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} className="text-slate-400" />
                                                    <span className="font-mono font-bold text-slate-700">{formatDurationDisplay(route.flightTime)}</span>
                                                </div>
                                            </td>
                                            <td className={`${tdClass} text-right`}>
                                                <div className="flex items-center justify-end gap-1">
                                                    <button 
                                                        onClick={() => handleEditRoute(route)} 
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                        title="Edit Route"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => onDeleteRoute(route.id)} 
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Route"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredRoutes.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-400">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                                        <MapPin size={24} className="opacity-50" />
                                                    </div>
                                                    <p className="font-medium text-slate-600">No Routes Found</p>
                                                    {routes.length > 0 ? (
                                                         <p className="text-xs mt-1">Try adjusting your search terms.</p>
                                                    ) : (
                                                        <p className="text-xs mt-1">Add a new route above to get started.</p>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {filteredRoutes.length > 0 && (
                            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs text-slate-500 font-medium text-right">
                                Showing {filteredRoutes.length} of {routes.length} Routes
                            </div>
                        )}
                    </div>
                </div>
              </FeatureGate>
            )}

            {/* CUSTOMERS TAB */}
            {activeTab === 'customers' && (
              <FeatureGate isEnabled={features.enableCustomerDatabase ?? true}>
                <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-6">
                    {/* ... (Existing Customer Content) ... */}
                    {/* Input Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-transparent rounded-bl-full opacity-50 pointer-events-none"></div>

                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                {editingId ? (
                                    <><div className="p-1.5 bg-indigo-100 text-indigo-600 rounded"><Edit2 size={16}/></div> Edit Customer</>
                                ) : (
                                    <><div className="p-1.5 bg-indigo-100 text-indigo-600 rounded"><Plus size={16}/></div> Add New Customer</>
                                )}
                            </h3>
                            {editingId && (
                                <button onClick={cancelCustomerEdit} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase">Cancel Edit</button>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end relative z-10">
                            <div className="md:col-span-6">
                                <label className={labelClass}>Customer Name</label>
                                <input 
                                    placeholder="Company or Individual Name" 
                                    className={inputClass}
                                    value={customerForm.name || ''}
                                    onChange={e => setCustomerForm(p => ({ ...p, name: e.target.value }))}
                                />
                            </div>
                            <div className="md:col-span-4">
                                <label className={labelClass}>Customer ID</label>
                                <div className="relative">
                                    <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        placeholder="e.g. 2750" 
                                        className={`${inputClass} pl-10 font-mono`}
                                        value={customerForm.customerId || ''}
                                        onChange={e => setCustomerForm(p => ({ ...p, customerId: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <button 
                                    onClick={handleSaveCustomer} 
                                    className={`w-full h-[46px] rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 ${editingId ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200'}`}
                                >
                                    {editingId ? <><Save size={18} /> Update</> : <><Plus size={18} /> Add</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className={thClass}>Customer Name</th>
                                    <th className={thClass}>Customer ID</th>
                                    <th className={`${thClass} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map(customer => (
                                    <tr key={customer.id} className="group hover:bg-indigo-50/50 transition-colors bg-white">
                                        <td className={tdClass}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-sm group-hover:bg-indigo-100 transition-colors">
                                                    {getInitials(customer.name)}
                                                </div>
                                                <span className="font-bold text-slate-800 text-sm">
                                                    {customer.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={tdClass}>
                                            {customer.customerId ? (
                                                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 shadow-sm">
                                                    #{customer.customerId}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs italic">No ID</span>
                                            )}
                                        </td>
                                        <td className={`${tdClass} text-right`}>
                                            <div className="flex items-center justify-end gap-1">
                                                <button 
                                                    onClick={() => handleEditCustomer(customer)} 
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => onDeleteCustomer(customer.id)} 
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {customers.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                                    <UsersIcon size={24} className="opacity-50" />
                                                </div>
                                                <p className="font-medium text-slate-600">No Customers Found</p>
                                                <p className="text-xs mt-1">Add a client to the database to get started.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {customers.length > 0 && (
                            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs text-slate-500 font-medium text-right">
                                Total Clients: {customers.length}
                            </div>
                        )}
                    </div>
                </div>
              </FeatureGate>
            )}
          </div>
        </div>
    </FeatureGate>
  );
};
