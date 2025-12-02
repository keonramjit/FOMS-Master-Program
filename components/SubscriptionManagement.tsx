import React, { useState, useEffect } from 'react';
import { SystemSettings, UserProfile } from '../types';
import { Shield, Layout, Plane, Users, Calendar, AlertTriangle, Map, Briefcase, ClipboardList, Tag, Save, BookOpen, GraduationCap, Lock, UserPlus, Trash2, Mail } from 'lucide-react';
import { fetchOrganizationUsers, createUserProfile, deleteUserProfile } from '../services/firebase';

interface SubscriptionManagementProps {
  features: SystemSettings;
  userProfile: UserProfile | null;
  onUpdateSettings?: (settings: Partial<SystemSettings>) => Promise<void>; // Optional for legacy
  onUpdateLicense: (settings: Partial<SystemSettings>) => Promise<void>;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ features, userProfile, onUpdateLicense }) => {
  const [versionInput, setVersionInput] = useState(features.systemVersion || 'V1.0.0');
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [newUser, setNewUser] = useState<Partial<UserProfile>>({ email: '', name: '', role: 'pilot', orgId: 'trans_guyana' });
  const [isAddingUser, setIsAddingUser] = useState(false);

  // DATABASE-DRIVEN ADMIN CHECK
  const isSuperAdmin = userProfile?.role === 'super_admin';

  useEffect(() => {
     if(features.systemVersion) setVersionInput(features.systemVersion);
     
     // Fetch team members if admin
     if (isSuperAdmin) {
         loadTeam();
     }
  }, [features.systemVersion, isSuperAdmin]);

  const loadTeam = async () => {
      const users = await fetchOrganizationUsers('trans_guyana'); // Hardcoded org for now
      setTeamMembers(users);
  };

  const handleUpdateVersion = async () => {
      await onUpdateLicense({ systemVersion: versionInput });
  };
  
  const handleToggle = async (key: keyof SystemSettings) => {
    if (isSuperAdmin) {
        await onUpdateLicense({ [key]: !features[key] });
    }
  };

  const handleAddUser = async () => {
      if (!newUser.email || !newUser.name) return;
      try {
          await createUserProfile(newUser as UserProfile);
          setNewUser({ email: '', name: '', role: 'pilot', orgId: 'trans_guyana' });
          setIsAddingUser(false);
          await loadTeam();
          alert("User profile created. They can now sign up/login with this email.");
      } catch (e) {
          alert("Failed to add user.");
      }
  };

  const handleDeleteUser = async (email: string) => {
      if (!confirm(`Are you sure you want to remove access for ${email}?`)) return;
      await deleteUserProfile(email);
      await loadTeam();
  };

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-8 pb-24 animate-in fade-in duration-300">
      <header className="mb-8 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${isSuperAdmin ? 'bg-red-600' : 'bg-blue-600'}`}>
            <Shield size={24} />
        </div>
        <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                {isSuperAdmin ? 'Super Admin Control' : 'Subscription Status'}
            </h1>
            <p className="text-slate-500 mt-1">
                {isSuperAdmin ? 'Manage system license and user access.' : 'View your active plan modules.'}
            </p>
        </div>
      </header>
      
      {/* Role-Based Alert */}
      {isSuperAdmin ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 flex gap-3 text-red-800 text-sm">
            <AlertTriangle className="shrink-0" size={20} />
            <div>
                <strong>Super Admin Mode Active:</strong> You have write access to all feature flags and user roles.
                <div className="mt-1 opacity-80">Logged in as: {userProfile?.email}</div>
            </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex gap-3 text-blue-800 text-sm">
            <Lock className="shrink-0" size={20} />
            <div>
                <strong>Standard License:</strong> Your organization's features are managed centrally.
                <div className="mt-1 opacity-80">Contact support to upgrade your plan.</div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: TEAM MANAGEMENT (Super Admin Only) */}
        {isSuperAdmin && (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Users size={16} /> Team Access
                    </h3>
                    <button 
                        onClick={() => setIsAddingUser(!isAddingUser)}
                        className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                    >
                        <UserPlus size={14} /> Add User
                    </button>
                </div>

                {isAddingUser && (
                    <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm animate-in slide-in-from-top-2">
                        <h4 className="font-bold text-slate-800 mb-3 text-sm">Grant New Access</h4>
                        <div className="space-y-3">
                            <input 
                                className="w-full text-sm border rounded p-2" 
                                placeholder="Full Name"
                                value={newUser.name}
                                onChange={e => setNewUser({...newUser, name: e.target.value})}
                            />
                            <input 
                                className="w-full text-sm border rounded p-2" 
                                placeholder="Email Address"
                                value={newUser.email}
                                onChange={e => setNewUser({...newUser, email: e.target.value})}
                            />
                            <select 
                                className="w-full text-sm border rounded p-2"
                                value={newUser.role}
                                onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                            >
                                <option value="pilot">Pilot (Read Own Data)</option>
                                <option value="dispatcher">Dispatcher (Manage Flights)</option>
                                <option value="admin">Admin (Full Access)</option>
                                <option value="observer">Observer (Read Only)</option>
                            </select>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setIsAddingUser(false)} className="text-xs font-bold text-slate-500 px-3 py-2">Cancel</button>
                                <button onClick={handleAddUser} className="text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Grant Access</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                            <tr>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {teamMembers.map(member => (
                                <tr key={member.email} className="group hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-900">{member.name}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                            <Mail size={10}/> {member.email}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${
                                            member.role === 'super_admin' ? 'bg-red-50 text-red-700 border-red-100' :
                                            member.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                            member.role === 'dispatcher' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                            'bg-blue-50 text-blue-700 border-blue-100'
                                        }`}>
                                            {member.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {member.role !== 'super_admin' && (
                                            <button 
                                                onClick={() => handleDeleteUser(member.email)}
                                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                title="Revoke Access"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* RIGHT COLUMN: MODULE TOGGLES (Admin = Edit, User = View) */}
        <div className="space-y-6">
            
            {/* System Configuration (Admins Only) */}
            {isSuperAdmin && (
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
            )}

            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">Core Modules</h3>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                    <ToggleRow 
                        label="Flight Planning" 
                        desc="Spreadsheet view for scheduling."
                        icon={<Calendar size={18} className="text-emerald-500"/>}
                        enabled={features.enableFlightPlanning}
                        readOnly={!isSuperAdmin}
                        onToggle={() => handleToggle('enableFlightPlanning')}
                    />
                    <ToggleRow 
                        label="Dispatch Management" 
                        desc="Manifest and W&B tools."
                        icon={<ClipboardList size={18} className="text-rose-500"/>}
                        enabled={features.enableDispatch}
                        readOnly={!isSuperAdmin}
                        onToggle={() => handleToggle('enableDispatch')}
                    />
                    <ToggleRow 
                        label="Voyage Reports" 
                        desc="Pilot logbook and reporting."
                        icon={<BookOpen size={18} className="text-teal-500"/>}
                        enabled={features.enableVoyageReports}
                        readOnly={!isSuperAdmin}
                        onToggle={() => handleToggle('enableVoyageReports')}
                    />
                    <ToggleRow 
                        label="Training Management" 
                        desc="Crew qualification tracking."
                        icon={<GraduationCap size={18} className="text-sky-500"/>}
                        enabled={features.enableTrainingManagement}
                        readOnly={!isSuperAdmin}
                        onToggle={() => handleToggle('enableTrainingManagement')}
                    />
                    <ToggleRow 
                        label="Crew Management" 
                        desc="Manage pilots and roster."
                        icon={<Users size={18} className="text-indigo-500"/>}
                        enabled={features.enableCrewManagement}
                        readOnly={!isSuperAdmin}
                        onToggle={() => handleToggle('enableCrewManagement')}
                    />
                    <ToggleRow 
                        label="Fleet Management" 
                        desc="Manage aircraft inventory."
                        icon={<Plane size={18} className="text-blue-500"/>}
                        enabled={features.enableFleetManagement}
                        readOnly={!isSuperAdmin}
                        onToggle={() => handleToggle('enableFleetManagement')}
                    />
                    <ToggleRow 
                        label="Route Management" 
                        desc="Route database and times."
                        icon={<Map size={18} className="text-amber-500"/>}
                        enabled={features.enableRouteManagement ?? true}
                        readOnly={!isSuperAdmin}
                        onToggle={() => handleToggle('enableRouteManagement')}
                    />
                    <ToggleRow 
                        label="Customer Management" 
                        desc="Client database."
                        icon={<Briefcase size={18} className="text-purple-500"/>}
                        enabled={features.enableCustomerDatabase ?? true}
                        readOnly={!isSuperAdmin}
                        onToggle={() => handleToggle('enableCustomerDatabase')}
                    />
                    <ToggleRow 
                        label="Reports & Analytics" 
                        desc="Dashboard analytics access."
                        icon={<Layout size={18} className="text-slate-500"/>}
                        enabled={features.enableReports}
                        readOnly={!isSuperAdmin}
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
                        desc="Tracking of A/B/C/D checks."
                        enabled={features.enableFleetChecks}
                        readOnly={!isSuperAdmin}
                        onToggle={() => handleToggle('enableFleetChecks')}
                    />
                    <ToggleRow 
                        label="Crew FDP Tracking" 
                        desc="Daily/weekly/monthly duty limits."
                        enabled={features.enableCrewFDP}
                        readOnly={!isSuperAdmin}
                        onToggle={() => handleToggle('enableCrewFDP')}
                    />
                    <ToggleRow 
                        label="Approved Strips" 
                        desc="Pilot airport qualifications."
                        enabled={features.enableCrewStrips}
                        readOnly={!isSuperAdmin}
                        onToggle={() => handleToggle('enableCrewStrips')}
                    />
                </div>
            </div>
        </div>
      </div>

    </div>
  );
};

const ToggleRow: React.FC<{ label: string; desc: string; icon?: React.ReactNode; enabled?: boolean; readOnly: boolean; onToggle: () => void }> = ({
    label, desc, icon, enabled, readOnly, onToggle
}) => (
    <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
        <div className="flex items-start gap-3">
            {icon && <div className="mt-1">{icon}</div>}
            <div>
                <div className="font-bold text-slate-900">{label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
            </div>
        </div>
        
        {readOnly ? (
            // READ ONLY BADGE
            <div className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${enabled ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                {enabled ? 'Active' : 'Disabled'}
            </div>
        ) : (
            // ADMIN TOGGLE
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
        )}
    </div>
);