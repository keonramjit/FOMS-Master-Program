
import React, { useState } from 'react';
import { Aircraft, AircraftComponent, MaintenanceCheck } from '../../types';
import { calculateMaintenanceStatus } from '../../utils/calculations';
import { 
    Gauge, Activity, ClipboardList, Settings, Plus, Save, Trash2, 
    CheckCircle2, AlertTriangle, AlertOctagon, RotateCcw, PenTool 
} from 'lucide-react';

interface AirworthinessTrackerProps {
    aircraft: Aircraft & { _docId?: string };
    onUpdate: (docId: string, updates: Partial<Aircraft>) => void;
    onBack: () => void;
}

export const AirworthinessTracker: React.FC<AirworthinessTrackerProps> = ({ aircraft, onUpdate, onBack }) => {
    const [activeTab, setActiveTab] = useState<'status' | 'maintenance' | 'config'>('status');
    const [isUpdating, setIsUpdating] = useState(false);

    // Component Form State
    const [compForm, setCompForm] = useState<Partial<AircraftComponent>>({ type: 'Engine', name: '', serialNumber: '', currentHours: 0 });
    // Maintenance Check Form State
    const [checkForm, setCheckForm] = useState<Partial<MaintenanceCheck>>({ name: '', intervalHours: 100 });

    const totalHours = aircraft.airframeTotalTime || aircraft.currentHours || 0;

    // --- Handlers ---

    const handleUpdateComponent = (compId: string, hours: number) => {
        const updatedComponents = (aircraft.components || []).map(c => 
            c.id === compId ? { ...c, currentHours: hours } : c
        );
        onUpdate(aircraft._docId!, { components: updatedComponents });
    };

    const handleSignOffCheck = (checkId: string) => {
        if (!confirm("Confirm completing this maintenance check at current aircraft hours?")) return;
        
        const newStatus = {
            ...(aircraft.maintenanceStatus || {}),
            [checkId]: {
                lastPerformedHours: totalHours,
                lastPerformedDate: new Date().toISOString().split('T')[0]
            }
        };
        onUpdate(aircraft._docId!, { maintenanceStatus: newStatus });
    };

    const handleAddComponent = () => {
        if (!compForm.name || !compForm.serialNumber) return;
        const newComp: AircraftComponent = {
            id: Date.now().toString(),
            name: compForm.name,
            type: compForm.type as any,
            serialNumber: compForm.serialNumber,
            currentHours: Number(compForm.currentHours)
        };
        const updated = [...(aircraft.components || []), newComp];
        onUpdate(aircraft._docId!, { components: updated });
        setCompForm({ type: 'Engine', name: '', serialNumber: '', currentHours: 0 });
    };

    const handleDeleteComponent = (id: string) => {
        if (!confirm("Delete component?")) return;
        const updated = (aircraft.components || []).filter(c => c.id !== id);
        onUpdate(aircraft._docId!, { components: updated });
    };

    const handleAddCheck = () => {
        if (!checkForm.name || !checkForm.intervalHours) return;
        const newCheck: MaintenanceCheck = {
            id: Date.now().toString(),
            name: checkForm.name,
            intervalHours: Number(checkForm.intervalHours),
            toleranceHours: 0
        };
        const updated = [...(aircraft.maintenanceProgram || []), newCheck];
        onUpdate(aircraft._docId!, { maintenanceProgram: updated });
        setCheckForm({ name: '', intervalHours: 100 });
    };

    const handleDeleteCheck = (id: string) => {
        if (!confirm("Delete maintenance check rule?")) return;
        const updated = (aircraft.maintenanceProgram || []).filter(c => c.id !== id);
        onUpdate(aircraft._docId!, { maintenanceProgram: updated });
    };

    // Update Airframe Total Logic
    const handleUpdateAirframe = (val: number) => {
        onUpdate(aircraft._docId!, { airframeTotalTime: val, currentHours: val });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <RotateCcw size={20} className="transform rotate-180" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            {aircraft.registration}
                            <span className="text-sm font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">{aircraft.type}</span>
                        </h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Technical Records & Airworthiness</p>
                    </div>
                </div>

                <div className="flex items-center gap-6 bg-slate-50 px-6 py-2 rounded-xl border border-slate-200">
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Airframe Total Time</span>
                        <div className="flex items-baseline justify-end gap-1">
                            {isUpdating ? (
                                <input 
                                    type="number" 
                                    className="w-24 text-right font-black text-xl bg-white border border-blue-300 rounded px-1 outline-none text-blue-600"
                                    defaultValue={totalHours}
                                    onBlur={(e) => { handleUpdateAirframe(Number(e.target.value)); setIsUpdating(false); }}
                                    autoFocus
                                />
                            ) : (
                                <span className="text-2xl font-black text-slate-800" onClick={() => setIsUpdating(true)}>{totalHours.toLocaleString()}</span>
                            )}
                            <span className="text-xs font-bold text-slate-500">HRS</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Status</span>
                        <span className={`text-sm font-bold uppercase px-2 py-0.5 rounded ${aircraft.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {aircraft.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="bg-white border-b border-slate-200 px-6 flex gap-6">
                <TabButton active={activeTab === 'status'} onClick={() => setActiveTab('status')} icon={<Gauge size={18}/>} label="Component Status" />
                <TabButton active={activeTab === 'maintenance'} onClick={() => setActiveTab('maintenance')} icon={<Activity size={18}/>} label="Maintenance Program" />
                <TabButton active={activeTab === 'config'} onClick={() => setActiveTab('config')} icon={<Settings size={18}/>} label="Configuration" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-6xl mx-auto space-y-8">
                    
                    {/* --- COMPONENT STATUS TAB --- */}
                    {activeTab === 'status' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2">
                            {(aircraft.components || []).length === 0 && (
                                <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                    <ClipboardList size={40} className="mx-auto mb-3 opacity-20"/>
                                    <p className="font-bold">No components tracked.</p>
                                    <p className="text-xs">Go to Configuration to add engines or propellers.</p>
                                </div>
                            )}
                            
                            {(aircraft.components || []).map(comp => (
                                <div key={comp.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow relative group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Activity size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">{comp.name}</h3>
                                                <p className="text-xs font-bold text-slate-400 uppercase">{comp.type}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Serial #</span>
                                            <span className="font-mono font-bold text-slate-600 text-sm">{comp.serialNumber}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                                            <span>Time Since New</span>
                                            <span>Last Update</span>
                                        </div>
                                        <div className="relative group/input">
                                            <input 
                                                type="number" 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 font-mono font-bold text-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                defaultValue={comp.currentHours}
                                                onBlur={(e) => handleUpdateComponent(comp.id, Number(e.target.value))}
                                            />
                                            <PenTool size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none"/>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* --- MAINTENANCE PROGRAM TAB --- */}
                    {activeTab === 'maintenance' && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-2">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Check Name</th>
                                            <th className="px-6 py-4">Interval</th>
                                            <th className="px-6 py-4">Last Performed</th>
                                            <th className="px-6 py-4">Next Due</th>
                                            <th className="px-6 py-4">Remaining</th>
                                            <th className="px-6 py-4 w-40">Status</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(aircraft.maintenanceProgram || []).map(check => {
                                            const last = (aircraft.maintenanceStatus || {})[check.id] || { lastPerformedHours: 0, lastPerformedDate: '-' };
                                            const status = calculateMaintenanceStatus(totalHours, check.intervalHours, last.lastPerformedHours);
                                            
                                            let statusColor = "bg-emerald-100 text-emerald-700";
                                            let Icon = CheckCircle2;
                                            if (status.status === 'Warning') { statusColor = "bg-amber-100 text-amber-700"; Icon = AlertTriangle; }
                                            if (status.status === 'Critical') { statusColor = "bg-rose-100 text-rose-700"; Icon = AlertOctagon; }

                                            return (
                                                <tr key={check.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-800">{check.name}</td>
                                                    <td className="px-6 py-4 font-mono text-slate-600">{check.intervalHours} HRS</td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-mono font-bold text-slate-700">{last.lastPerformedHours.toLocaleString()}</div>
                                                        <div className="text-[10px] text-slate-400">{last.lastPerformedDate}</div>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{status.nextDue.toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        <div className={`font-mono font-black ${status.status === 'Critical' ? 'text-rose-600' : 'text-slate-700'}`}>
                                                            {status.remaining} HRS
                                                        </div>
                                                        <div className="w-24 bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                                                            <div className={`h-full rounded-full ${status.status === 'Critical' ? 'bg-rose-500' : status.status === 'Warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${status.percentageUsed}%` }}></div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase w-fit ${statusColor}`}>
                                                            <Icon size={14} /> {status.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button 
                                                            onClick={() => handleSignOffCheck(check.id)}
                                                            className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                                                        >
                                                            Sign Off
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {(aircraft.maintenanceProgram || []).length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="text-center py-8 text-slate-400">No maintenance checks defined.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --- CONFIGURATION TAB --- */}
                    {activeTab === 'config' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-2">
                            
                            {/* Component Builder */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Settings size={18} className="text-slate-400"/> Component Configuration
                                </h3>
                                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Type</label>
                                        <select className="w-full p-2 rounded border border-slate-200 text-sm" value={compForm.type} onChange={e => setCompForm({...compForm, type: e.target.value as any})}>
                                            <option value="Engine">Engine</option>
                                            <option value="Propeller">Propeller</option>
                                            <option value="Landing Gear">Landing Gear</option>
                                            <option value="Airframe">Airframe</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Name</label>
                                            <input className="w-full p-2 rounded border border-slate-200 text-sm" placeholder="e.g. Port Engine" value={compForm.name} onChange={e => setCompForm({...compForm, name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Serial #</label>
                                            <input className="w-full p-2 rounded border border-slate-200 text-sm" placeholder="S/N 12345" value={compForm.serialNumber} onChange={e => setCompForm({...compForm, serialNumber: e.target.value})} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Current Hours (TSN)</label>
                                        <input type="number" className="w-full p-2 rounded border border-slate-200 text-sm" value={compForm.currentHours} onChange={e => setCompForm({...compForm, currentHours: Number(e.target.value)})} />
                                    </div>
                                    <button onClick={handleAddComponent} className="w-full bg-slate-800 text-white font-bold py-2 rounded-lg text-sm hover:bg-slate-700 flex items-center justify-center gap-2">
                                        <Plus size={16}/> Add Component
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Existing Components</p>
                                    {(aircraft.components || []).map(c => (
                                        <div key={c.id} className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded-lg">
                                            <span className="text-sm font-bold text-slate-700">{c.name} ({c.type})</span>
                                            <button onClick={() => handleDeleteComponent(c.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Maintenance Cycle Builder */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <RotateCcw size={18} className="text-slate-400"/> Maintenance Cycles
                                </h3>
                                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Check Name</label>
                                        <input className="w-full p-2 rounded border border-slate-200 text-sm" placeholder="e.g. A-Check" value={checkForm.name} onChange={e => setCheckForm({...checkForm, name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Interval (Hours)</label>
                                        <input type="number" className="w-full p-2 rounded border border-slate-200 text-sm" placeholder="100" value={checkForm.intervalHours} onChange={e => setCheckForm({...checkForm, intervalHours: Number(e.target.value)})} />
                                    </div>
                                    <button onClick={handleAddCheck} className="w-full bg-slate-800 text-white font-bold py-2 rounded-lg text-sm hover:bg-slate-700 flex items-center justify-center gap-2">
                                        <Plus size={16}/> Add Cycle Rule
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Defined Checks</p>
                                    {(aircraft.maintenanceProgram || []).map(c => (
                                        <div key={c.id} className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded-lg">
                                            <span className="text-sm font-bold text-slate-700">{c.name} @ {c.intervalHours}h</span>
                                            <button onClick={() => handleDeleteCheck(c.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 py-4 border-b-2 text-sm font-bold transition-all ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
    >
        {icon} {label}
    </button>
);
