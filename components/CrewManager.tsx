import React, { useState, useEffect } from 'react';
import { CrewMember, Flight, RouteDefinition, SystemSettings } from '../types';
import { Plus, Search, Edit2, User, Shield, Briefcase, X, Save, BarChart, FileCheck, Users, AlertTriangle, CheckSquare, Square, Map, Clock, Lock, Loader2 } from 'lucide-react';
import { FeatureGate } from './FeatureGate';
import { fetchFlightHistory } from '../services/firebase';

interface CrewManagerProps {
  crewRoster: (CrewMember & { _docId?: string })[];
  flights: Flight[];
  routes: RouteDefinition[];
  onAdd: (member: CrewMember) => void;
  onUpdate: (docId: string, member: Partial<CrewMember>) => void;
  features: SystemSettings;
}

type TabView = 'overview' | 'fdp' | 'strips';

export const CrewManager: React.FC<CrewManagerProps> = ({ crewRoster, flights, routes, onAdd, onUpdate, features }) => {
  const [activeTab, setActiveTab] = useState<TabView>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Historical Data for FDP
  const [historyFlights, setHistoryFlights] = useState<Flight[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStripsModalOpen, setIsStripsModalOpen] = useState(false);
  
  // Selection State
  const [editingMember, setEditingMember] = useState<(CrewMember & { _docId?: string }) | null>(null);
  
  // Form States
  const [formData, setFormData] = useState<Partial<CrewMember>>({
    code: '',
    name: '',
    role: 'C208 Captain'
  });

  // State for Approved Strips Multi-Select
  const [selectedStrips, setSelectedStrips] = useState<Set<string>>(new Set());

  // Load Historical Data when FDP tab is active
  useEffect(() => {
    if (activeTab === 'fdp' && features.enableCrewFDP) {
      const loadHistory = async () => {
        setIsLoadingHistory(true);
        // Range: Last 30 days to Today
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        const todayStr = today.toISOString().split('T')[0];
        const startStr = thirtyDaysAgo.toISOString().split('T')[0];

        try {
            const data = await fetchFlightHistory(startStr, todayStr);
            setHistoryFlights(data);
        } catch (e) {
            console.error("Failed to load flight history", e);
        } finally {
            setIsLoadingHistory(false);
        }
      };
      loadHistory();
    }
  }, [activeTab, features.enableCrewFDP]);

  // Filter Logic
  const filteredCrew = crewRoster.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Handlers ---

  const handleOpenModal = (member?: (CrewMember & { _docId?: string })) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        code: member.code,
        name: member.name,
        role: member.role
      });
    } else {
      setEditingMember(null);
      setFormData({ code: '', name: '', role: 'C208 Captain' });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.code || !formData.name) return;

    if (editingMember && editingMember._docId) {
      onUpdate(editingMember._docId, formData);
    } else {
      if (crewRoster.some(c => c.code === formData.code)) {
        alert("Crew code already exists!");
        return;
      }
      onAdd(formData as CrewMember);
    }
    setIsModalOpen(false);
  };

  const handleOpenStripsModal = (member: (CrewMember & { _docId?: string })) => {
    setEditingMember(member);
    // Initialize set with existing allowed airports or empty
    setSelectedStrips(new Set(member.allowedAirports || []));
    setIsStripsModalOpen(true);
  };

  const toggleStrip = (stripCode: string) => {
    const newSet = new Set(selectedStrips);
    if (newSet.has(stripCode)) {
        newSet.delete(stripCode);
    } else {
        newSet.add(stripCode);
    }
    setSelectedStrips(newSet);
  };

  const handleSaveStrips = () => {
    if (editingMember && editingMember._docId) {
        onUpdate(editingMember._docId, { allowedAirports: Array.from(selectedStrips) });
        setIsStripsModalOpen(false);
    }
  };

  // --- FDP Calculation Helpers ---

  const calculateFDP = (memberCode: string) => {
    // Determine which dataset to use (history if loaded, else fallback to current flights for basic display)
    const dataset = historyFlights.length > 0 ? historyFlights : flights;
    
    const today = new Date();
    // Reset times to compare dates properly
    const todayStr = today.toISOString().split('T')[0];
    
    // Weekly (Last 7 days)
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    // Monthly (Current Month)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    let daily = 0;
    let weekly = 0;
    let monthly = 0;

    dataset.forEach(f => {
        if (!f.flightTime) return;
        // Check participation
        if (f.pic === memberCode || f.sic === memberCode) {
            const fDate = new Date(f.date);
            
            // Daily
            if (f.date === todayStr) {
                daily += f.flightTime;
            }
            
            // Weekly
            if (fDate >= weekAgo && fDate <= today) {
                weekly += f.flightTime;
            }
            
            // Monthly
            if (fDate >= startOfMonth && fDate <= today) {
                monthly += f.flightTime;
            }
        }
    });

    return { daily, weekly, monthly };
  };

  // --- Style Helpers ---

  const getRoleStyle = (role?: string) => {
    if (!role) return { badge: 'bg-slate-100 text-slate-600', border: 'border-l-slate-300' };
    if (role.includes('B1900')) return { badge: 'bg-indigo-100 text-indigo-700', border: 'border-l-indigo-500' };
    if (role.includes('C208')) return { badge: 'bg-sky-100 text-sky-700', border: 'border-l-sky-500' };
    if (role === 'Cabin Crew') return { badge: 'bg-rose-100 text-rose-700', border: 'border-l-rose-500' };
    return { badge: 'bg-slate-100 text-slate-600', border: 'border-l-slate-300' };
  };

  const getFDPBarColor = (current: number, max: number) => {
    const pct = current / max;
    if (pct >= 1) return 'bg-red-500';
    if (pct >= 0.8) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // Stats for Overview
  const stats = {
    total: crewRoster.length,
    captains: crewRoster.filter(c => c.role?.includes('Captain') || (!c.role)).length,
    firstOfficers: crewRoster.filter(c => c.role?.includes('First Officer') || c.role?.includes('Shuttle')).length
  };

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 pb-24 animate-in fade-in duration-300">
      
      {/* Header */}
      <header className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Crew Management</h1>
          <p className="text-slate-500 mt-1">Manage pilots, flight duty periods, and qualifications.</p>
      </header>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 flex p-1">
        <button 
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
            <Users size={18} />
            Crew Overview
        </button>
        <button 
            onClick={() => setActiveTab('fdp')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'fdp' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
            <div className="flex items-center gap-2">
                <BarChart size={18} />
                Crew FDP
                {!features.enableCrewFDP && <Lock size={12} className="opacity-50" />}
            </div>
        </button>
        <button 
            onClick={() => setActiveTab('strips')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'strips' ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
            <div className="flex items-center gap-2">
                <FileCheck size={18} />
                Approved Strips
                {!features.enableCrewStrips && <Lock size={12} className="opacity-50" />}
            </div>
        </button>
      </div>

      {/* --- OVERVIEW TAB --- */}
      {activeTab === 'overview' && (
          <div className="animate-in slide-in-from-bottom-2 duration-300">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Total Crew" value={stats.total} icon={<User className="text-blue-600" size={24} />} bg="bg-blue-50" />
                <StatCard title="Captains" value={stats.captains} icon={<Shield className="text-indigo-600" size={24} />} bg="bg-indigo-50" />
                <StatCard title="First Officers" value={stats.firstOfficers} icon={<Briefcase className="text-emerald-600" size={24} />} bg="bg-emerald-50" />
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        <Search className="text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search crew..." 
                            className="bg-transparent border-none focus:ring-0 text-sm flex-1 text-slate-900 placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all text-sm shadow-sm"
                    >
                        <Plus size={16} /> Add Crew
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Code</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {filteredCrew.map((crew) => {
                        const styles = getRoleStyle(crew.role);
                        return (
                            <tr key={crew.code} className={`hover:bg-slate-50/80 transition-colors border-l-4 ${styles.border}`}>
                                <td className="px-6 py-4 font-semibold text-slate-900">{crew.name}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border border-transparent ${styles.badge}`}>
                                        {crew.role || 'Pilot'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">
                                        {crew.code}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleOpenModal(crew)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
                </div>
            </div>
          </div>
      )}

      {/* --- FDP TAB --- */}
      {activeTab === 'fdp' && (
        <FeatureGate isEnabled={features.enableCrewFDP}>
            <div className="animate-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Clock className="text-indigo-600" size={20} />
                            Flight Duty Period Tracking
                        </h3>
                        {isLoadingHistory ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 animate-pulse">
                                <Loader2 size={14} className="animate-spin" />
                                Loading last 30 days...
                            </div>
                        ) : (
                            <div className="flex gap-4 text-xs font-medium text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Safe</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Caution (80%)</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Limit Reached</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <th className="px-6 py-4 w-1/4">Pilot</th>
                                    <th className="px-6 py-4 w-1/4">Daily (Max 8h)</th>
                                    <th className="px-6 py-4 w-1/4">Weekly (Max 40h)</th>
                                    <th className="px-6 py-4 w-1/4">Monthly (Max 100h)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCrew.filter(c => !c.role?.includes('Cabin')).map(pilot => {
                                    const fdp = calculateFDP(pilot.code);
                                    return (
                                        <tr key={pilot.code} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{pilot.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">{pilot.code}</div>
                                            </td>
                                            
                                            {/* Daily Bar */}
                                            <td className="px-6 py-4">
                                                <div className="flex justify-between text-xs mb-1 font-medium text-slate-700">
                                                    <span>{fdp.daily.toFixed(1)}h</span>
                                                    <span className="text-slate-400">8h</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div className={`h-full rounded-full ${getFDPBarColor(fdp.daily, 8)}`} style={{ width: `${Math.min(100, (fdp.daily/8)*100)}%` }}></div>
                                                </div>
                                            </td>

                                            {/* Weekly Bar */}
                                            <td className="px-6 py-4">
                                                <div className="flex justify-between text-xs mb-1 font-medium text-slate-700">
                                                    <span>{fdp.weekly.toFixed(1)}h</span>
                                                    <span className="text-slate-400">40h</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div className={`h-full rounded-full ${getFDPBarColor(fdp.weekly, 40)}`} style={{ width: `${Math.min(100, (fdp.weekly/40)*100)}%` }}></div>
                                                </div>
                                            </td>

                                            {/* Monthly Bar */}
                                            <td className="px-6 py-4">
                                                <div className="flex justify-between text-xs mb-1 font-medium text-slate-700">
                                                    <span>{fdp.monthly.toFixed(1)}h</span>
                                                    <span className="text-slate-400">100h</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div className={`h-full rounded-full ${getFDPBarColor(fdp.monthly, 100)}`} style={{ width: `${Math.min(100, (fdp.monthly/100)*100)}%` }}></div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </FeatureGate>
      )}

      {/* --- APPROVED STRIPS TAB --- */}
      {activeTab === 'strips' && (
        <FeatureGate isEnabled={features.enableCrewStrips}>
            {/* ... Existing Strips Content ... */}
            <div className="animate-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Map className="text-emerald-600" size={20} />
                            Pilot Qualifications & Strips
                        </h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <th className="px-6 py-4">Pilot</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Approved Strips</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCrew.filter(c => !c.role?.includes('Cabin')).map(pilot => {
                                    const count = pilot.allowedAirports?.length || 0;
                                    const styles = getRoleStyle(pilot.role);
                                    return (
                                        <tr key={pilot.code} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{pilot.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">{pilot.code}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${styles.badge}`}>
                                                    {pilot.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {count > 0 ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold">
                                                        <FileCheck size={14} />
                                                        {count} Airports Approved
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic flex items-center gap-1">
                                                        <AlertTriangle size={12} /> Pending Approval
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleOpenStripsModal(pilot)}
                                                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
                                                >
                                                    Edit Strips
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </FeatureGate>
      )}

      {/* --- ADD/EDIT CREW MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* ... Existing Modal Content ... */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-slate-900">
                        {editingMember ? 'Edit Crew Member' : 'Add Crew Member'}
                    </h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Full Name</label>
                        <input 
                            value={formData.name}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="e.g. Andre Farinha"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Crew Code</label>
                            <input 
                                value={formData.code}
                                onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                maxLength={3}
                                disabled={!!editingMember} 
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono uppercase disabled:bg-slate-50 disabled:text-slate-500"
                                placeholder="e.g. ADF"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Role</label>
                            <select 
                                value={formData.role}
                                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none"
                            >
                                <optgroup label="B1900 Fleet">
                                    <option value="B1900 Captain">B1900 Captain</option>
                                    <option value="B1900 First Officer">B1900 First Officer</option>
                                </optgroup>
                                <optgroup label="C208 Fleet">
                                    <option value="C208 Captain">C208 Captain</option>
                                    <option value="C208 Shuttle">C208 Shuttle</option>
                                </optgroup>
                                <optgroup label="Other">
                                    <option value="Cabin Crew">Cabin Crew</option>
                                </optgroup>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2"><Save size={16} /> Save Member</button>
                </div>
            </div>
        </div>
      )}

      {/* --- APPROVED STRIPS MODAL --- */}
      {isStripsModalOpen && editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             {/* ... Existing Modal Content ... */}
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                             Manage Approved Strips
                        </h2>
                        <p className="text-sm text-slate-500">
                            Updating qualifications for <strong className="text-slate-800">{editingMember.name}</strong> ({editingMember.code})
                        </p>
                    </div>
                    <button onClick={() => setIsStripsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto bg-slate-50 custom-scrollbar flex-1">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {routes.map(route => {
                            const isSelected = selectedStrips.has(route.code);
                            // Determine display name (Use Airport name if available, else route code destination)
                            const label = route.name || route.code;
                            
                            return (
                                <button 
                                    key={route.id}
                                    onClick={() => toggleStrip(route.code)}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200
                                        ${isSelected 
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' 
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:shadow-sm'
                                        }
                                    `}
                                >
                                    {isSelected ? (
                                        <CheckSquare size={20} className="shrink-0" />
                                    ) : (
                                        <Square size={20} className="shrink-0 opacity-50" />
                                    )}
                                    <div className="min-w-0">
                                        <div className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                            {label}
                                        </div>
                                        <div className={`text-[10px] font-mono opacity-80 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                            {route.code}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-between items-center z-10">
                    <div className="text-xs font-bold text-slate-500 uppercase">
                        {selectedStrips.size} Airports Selected
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsStripsModalOpen(false)} className="px-5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-50 rounded-lg">
                            Cancel
                        </button>
                        <button onClick={handleSaveStrips} className="px-6 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2">
                            <Save size={18} /> Save Approvals
                        </button>
                    </div>
                </div>
             </div>
        </div>
      )}

    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; bg: string }> = ({ title, value, icon, bg }) => (
    <div className={`p-6 rounded-2xl border border-slate-100 flex items-center gap-4 ${bg}`}>
        <div className="p-3 bg-white rounded-xl shadow-sm">
            {icon}
        </div>
        <div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-sm font-medium text-slate-500">{title}</div>
        </div>
    </div>
);