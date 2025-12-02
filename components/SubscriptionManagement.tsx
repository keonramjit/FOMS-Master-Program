
import React from 'react';
import { SystemSettings, UserProfile } from '../types';
import { Shield, Layout, Plane, Users, Calendar, AlertTriangle, Map, Briefcase, ClipboardList, BookOpen, GraduationCap, Check, Lock, Building } from 'lucide-react';

interface SubscriptionManagementProps {
  features: SystemSettings;
  userProfile?: UserProfile | null;
  onUpdateLicense: (settings: Partial<SystemSettings>) => Promise<void>;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ features, userProfile, onUpdateLicense }) => {
  const isSuperAdmin = userProfile?.role === 'super_admin';

  const handleToggle = async (key: keyof SystemSettings) => {
    if (isSuperAdmin) {
        await onUpdateLicense({ [key]: !features[key] });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-8 pb-32 animate-in fade-in duration-300">
      
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                {isSuperAdmin ? <Shield size={28} /> : <Building size={28} />}
            </div>
            <div>
                <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                    {isSuperAdmin ? 'License Management' : 'Organization Plan'}
                </h1>
                <p className="text-slate-500 mt-1 font-medium">
                    {isSuperAdmin 
                        ? 'Super Admin Control Panel - Feature Provisioning' 
                        : 'View your active subscription and enabled modules.'}
                </p>
            </div>
        </div>
        
        {!isSuperAdmin && (
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Plan</span>
                    <span className="text-lg font-black text-blue-600">PRO TIER</span>
                </div>
                <div className="h-8 w-px bg-slate-100 mx-1"></div>
                <button className="text-xs font-bold bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                    Manage Billing
                </button>
            </div>
        )}
      </header>

      {isSuperAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex gap-3 text-amber-800 text-sm shadow-sm">
            <AlertTriangle className="shrink-0 text-amber-600" size={20} />
            <div>
                <strong className="block mb-1 text-amber-900">Admin Mode Active</strong>
                Changes made here will instantly update the feature set for this organization. Disabling a module will lock it for all users immediately.
            </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Core Modules */}
        <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Layout size={14}/> Core Modules
            </h3>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                <FeatureRow 
                    label="Flight Planning" 
                    desc="Spreadsheet-style scheduling engine"
                    icon={<Calendar size={18} className="text-emerald-500"/>}
                    enabled={features.enableFlightPlanning}
                    isAdmin={isSuperAdmin}
                    onToggle={() => handleToggle('enableFlightPlanning')}
                />
                <FeatureRow 
                    label="Dispatch" 
                    desc="Weight & Balance, Manifests"
                    icon={<ClipboardList size={18} className="text-rose-500"/>}
                    enabled={features.enableDispatch}
                    isAdmin={isSuperAdmin}
                    onToggle={() => handleToggle('enableDispatch')}
                />
                <FeatureRow 
                    label="Voyage Reports" 
                    desc="Pilot logbooks and journey logs"
                    icon={<BookOpen size={18} className="text-teal-500"/>}
                    enabled={features.enableVoyageReports}
                    isAdmin={isSuperAdmin}
                    onToggle={() => handleToggle('enableVoyageReports')}
                />
                <FeatureRow 
                    label="Training" 
                    desc="Crew qualification tracking"
                    icon={<GraduationCap size={18} className="text-sky-500"/>}
                    enabled={features.enableTrainingManagement}
                    isAdmin={isSuperAdmin}
                    onToggle={() => handleToggle('enableTrainingManagement')}
                />
                <FeatureRow 
                    label="Crew Management" 
                    desc="Pilot roster and roles"
                    icon={<Users size={18} className="text-indigo-500"/>}
                    enabled={features.enableCrewManagement}
                    isAdmin={isSuperAdmin}
                    onToggle={() => handleToggle('enableCrewManagement')}
                />
                <FeatureRow 
                    label="Fleet Management" 
                    desc="Aircraft inventory and status"
                    icon={<Plane size={18} className="text-blue-500"/>}
                    enabled={features.enableFleetManagement}
                    isAdmin={isSuperAdmin}
                    onToggle={() => handleToggle('enableFleetManagement')}
                />
            </div>
        </div>

        {/* Advanced & Data Modules */}
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Briefcase size={14}/> Databases
                </h3>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                    <FeatureRow 
                        label="Route Database" 
                        desc="Manage airports and waypoints"
                        icon={<Map size={18} className="text-amber-500"/>}
                        enabled={features.enableRouteManagement ?? true}
                        isAdmin={isSuperAdmin}
                        onToggle={() => handleToggle('enableRouteManagement')}
                    />
                    <FeatureRow 
                        label="Customer Database" 
                        desc="Client CRM and billing codes"
                        icon={<Briefcase size={18} className="text-purple-500"/>}
                        enabled={features.enableCustomerDatabase ?? true}
                        isAdmin={isSuperAdmin}
                        onToggle={() => handleToggle('enableCustomerDatabase')}
                    />
                    <FeatureRow 
                        label="Analytics & Reports" 
                        desc="Operational dashboards"
                        icon={<Layout size={18} className="text-slate-500"/>}
                        enabled={features.enableReports}
                        isAdmin={isSuperAdmin}
                        onToggle={() => handleToggle('enableReports')}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Shield size={14}/> Premium Add-ons
                </h3>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                    <FeatureRow 
                        label="Maintenance Checks" 
                        desc="Track A/B/C/D check cycles"
                        enabled={features.enableFleetChecks}
                        isAdmin={isSuperAdmin}
                        onToggle={() => handleToggle('enableFleetChecks')}
                    />
                    <FeatureRow 
                        label="Crew FDP Tracking" 
                        desc="Flight duty period limitations"
                        enabled={features.enableCrewFDP}
                        isAdmin={isSuperAdmin}
                        onToggle={() => handleToggle('enableCrewFDP')}
                    />
                    <FeatureRow 
                        label="Approved Strips" 
                        desc="Pilot route qualification logic"
                        enabled={features.enableCrewStrips}
                        isAdmin={isSuperAdmin}
                        onToggle={() => handleToggle('enableCrewStrips')}
                    />
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

const FeatureRow: React.FC<{ 
    label: string; 
    desc: string; 
    icon?: React.ReactNode; 
    enabled?: boolean; 
    isAdmin: boolean; 
    onToggle: () => void 
}> = ({ label, desc, icon, enabled, isAdmin, onToggle }) => (
    <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
        <div className="flex items-start gap-4">
            <div className={`mt-1 p-2 rounded-lg ${enabled ? 'bg-slate-100' : 'bg-slate-50 opacity-50'}`}>
                {icon || <Shield size={18} className={enabled ? "text-slate-600" : "text-slate-400"} />}
            </div>
            <div>
                <div className={`font-bold text-sm ${enabled ? 'text-slate-900' : 'text-slate-500'}`}>{label}</div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">{desc}</div>
            </div>
        </div>
        
        {isAdmin ? (
            <button 
                onClick={onToggle}
                className={`
                    relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
                    ${enabled ? 'bg-blue-600' : 'bg-slate-200'}
                `}
            >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        ) : (
            <div>
                {enabled ? (
                    <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-emerald-200">
                        <Check size={12} strokeWidth={3} /> Active
                    </span>
                ) : (
                    <button className="flex items-center gap-1.5 bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-slate-200 hover:bg-slate-200 transition-colors">
                        <Lock size={10} /> Not Included
                    </button>
                )}
            </div>
        )}
    </div>
);
