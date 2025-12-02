
import React, { useState, useEffect } from 'react';
import { SystemSettings } from '../types';
import { Shield, ToggleLeft, ToggleRight, Layout, Plane, Users, Calendar, AlertTriangle, Map, Briefcase, ClipboardList, Tag, Save, BookOpen, GraduationCap } from 'lucide-react';

interface AccessControlProps {
  features: SystemSettings;
  onUpdateSettings: (settings: Partial<SystemSettings>) => Promise<void>;
}

export const AccessControl: React.FC<AccessControlProps> = ({ features, onUpdateSettings }) => {
  const [versionInput, setVersionInput] = useState(features.systemVersion || 'V11282025|1030');

  useEffect(() => {
     if(features.systemVersion) setVersionInput(features.systemVersion);
  }, [features.systemVersion]);

  const handleUpdateVersion = async () => {
      await onUpdateSettings({ systemVersion: versionInput });
  };
  
  const handleToggle = async (key: keyof SystemSettings) => {
    await onUpdateSettings({ [key]: !features[key] });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 pb-24 animate-in fade-in duration-300">
      <header className="mb-8 flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <Shield size={24} />
        </div>
        <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Admin Access Control</h1>
            <p className="text-slate-500 mt-1">Simulate SuperAdmin capabilities and toggle feature flags.</p>
        </div>
      </header>
      
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex gap-3 text-amber-800 text-sm">
        <AlertTriangle className="shrink-0" size={20} />
        <p>
            <strong>Warning:</strong> Disabling modules here will instantly lock them for all users in the system. Use this to test the "Pro Plan" gating features.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* System Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
             <Tag size={16} /> System Configuration
           </h3>
           <div className="flex items-end gap-4">
             <div className="flex-1">
               <label className="block text-xs font-bold text-slate-700 mb-1">System Version Tag</label>
               <input 
                 type="text" 
                 value={versionInput} 
                 onChange={(e) => setVersionInput(e.target.value)}
                 className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                 placeholder="e.g. V1.0.0"
               />
             </div>
             <button 
               onClick={handleUpdateVersion}
               className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 flex items-center gap-2 text-sm shadow-md"
             >
               <Save size={16} /> Update Version
             </button>
           </div>
        </div>

        {/* Core Modules */}
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">Core Modules</h3>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                <ToggleRow 
                    label="Flight Planning" 
                    desc="Enable/Disable the spreadsheet planning view."
                    icon={<Calendar size={18} className="text-emerald-500"/>}
                    enabled={features.enableFlightPlanning}
                    onToggle={() => handleToggle('enableFlightPlanning')}
                />
                <ToggleRow 
                    label="Dispatch Management" 
                    desc="Enable/Disable Manifest and W&B tools."
                    icon={<ClipboardList size={18} className="text-rose-500"/>}
                    enabled={features.enableDispatch}
                    onToggle={() => handleToggle('enableDispatch')}
                />
                <ToggleRow 
                    label="Voyage Reports" 
                    desc="Enable/Disable pilot logbook and voyage reporting."
                    icon={<BookOpen size={18} className="text-teal-500"/>}
                    enabled={features.enableVoyageReports}
                    onToggle={() => handleToggle('enableVoyageReports')}
                />
                <ToggleRow 
                    label="Training Management" 
                    desc="Enable/Disable crew qualification tracking."
                    icon={<GraduationCap size={18} className="text-sky-500"/>}
                    enabled={features.enableTrainingManagement}
                    onToggle={() => handleToggle('enableTrainingManagement')}
                />
                <ToggleRow 
                    label="Crew Management" 
                    desc="Enable/Disable the entire crew module."
                    icon={<Users size={18} className="text-indigo-500"/>}
                    enabled={features.enableCrewManagement}
                    onToggle={() => handleToggle('enableCrewManagement')}
                />
                <ToggleRow 
                    label="Fleet Management" 
                    desc="Enable/Disable the entire fleet module."
                    icon={<Plane size={18} className="text-blue-500"/>}
                    enabled={features.enableFleetManagement}
                    onToggle={() => handleToggle('enableFleetManagement')}
                />
                <ToggleRow 
                    label="Route Management" 
                    desc="Enable/Disable the route database module."
                    icon={<Map size={18} className="text-amber-500"/>}
                    enabled={features.enableRouteManagement ?? true}
                    onToggle={() => handleToggle('enableRouteManagement')}
                />
                <ToggleRow 
                    label="Customer Management" 
                    desc="Enable/Disable the customer database module."
                    icon={<Briefcase size={18} className="text-purple-500"/>}
                    enabled={features.enableCustomerDatabase ?? true}
                    onToggle={() => handleToggle('enableCustomerDatabase')}
                />
                <ToggleRow 
                    label="Reports & Analytics" 
                    desc="Show/Hide the Reports button on dashboard."
                    icon={<Layout size={18} className="text-slate-500"/>}
                    enabled={features.enableReports}
                    onToggle={() => handleToggle('enableReports')}
                />
            </div>
        </div>

        {/* Sub Features */}
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">Pro Features (Sub-Modules)</h3>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                <ToggleRow 
                    label="Maintenance Checks" 
                    desc="Allow tracking of A/B/C/D checks in Fleet."
                    enabled={features.enableFleetChecks}
                    onToggle={() => handleToggle('enableFleetChecks')}
                />
                <ToggleRow 
                    label="Crew FDP Tracking" 
                    desc="Calculate daily/weekly/monthly duty limits."
                    enabled={features.enableCrewFDP}
                    onToggle={() => handleToggle('enableCrewFDP')}
                />
                <ToggleRow 
                    label="Approved Strips" 
                    desc="Manage pilot airport qualifications."
                    enabled={features.enableCrewStrips}
                    onToggle={() => handleToggle('enableCrewStrips')}
                />
            </div>
        </div>
      </div>

    </div>
  );
};

const ToggleRow: React.FC<{ label: string; desc: string; icon?: React.ReactNode; enabled: boolean; onToggle: () => void }> = ({
    label, desc, icon, enabled, onToggle
}) => (
    <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
        <div className="flex items-start gap-3">
            {icon && <div className="mt-1">{icon}</div>}
            <div>
                <div className="font-bold text-slate-900">{label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
            </div>
        </div>
        <button 
            onClick={onToggle}
            className={`
                relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
                ${enabled ? 'bg-blue-600' : 'bg-slate-200'}
            `}
        >
            <span
                className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${enabled ? 'translate-x-5' : 'translate-x-0'}
                `}
            />
        </button>
    </div>
);
