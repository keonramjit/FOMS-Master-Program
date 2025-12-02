import React, { useState, useMemo, useEffect } from 'react';
import { CrewMember, SystemSettings, TrainingRecord, TrainingEvent, TrainingType } from '../types';
import { GraduationCap, Plus, Search, Calendar, CheckCircle2, AlertTriangle, XCircle, Clock, Save, X, Trash2, User } from 'lucide-react';
import { FeatureGate } from './FeatureGate';
import { subscribeToTrainingRecords, subscribeToTrainingEvents } from '../services/firebase';

interface TrainingManagerProps {
  crew: (CrewMember & { _docId?: string })[];
  features: SystemSettings;
  onAddRecord: (r: Omit<TrainingRecord, 'id'>) => Promise<void>;
  onUpdateRecord: (id: string, r: Partial<TrainingRecord>) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onAddEvent: (e: Omit<TrainingEvent, 'id'>) => Promise<void>;
  onUpdateEvent: (id: string, e: Partial<TrainingEvent>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

export const TrainingManager: React.FC<TrainingManagerProps> = ({ 
    crew, features,
    onAddRecord, onUpdateRecord, onDeleteRecord,
    onAddEvent, onUpdateEvent, onDeleteEvent 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'matrix' | 'schedule'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local State for Training Data (Optimization: Only fetch when component is active)
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [events, setEvents] = useState<TrainingEvent[]>([]);

  useEffect(() => {
      const unsubRecords = subscribeToTrainingRecords(setRecords);
      const unsubEvents = subscribeToTrainingEvents(setEvents);
      return () => {
          if (unsubRecords) unsubRecords();
          if (unsubEvents) unsubEvents();
      };
  }, []);
  
  // -- Modals --
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
  const [recordForm, setRecordForm] = useState<Partial<TrainingRecord>>({});

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState<Partial<TrainingEvent>>({});

  // -- Helpers --
  
  const getDaysUntilExpiry = (expiryDate: string) => {
      const today = new Date();
      const expiry = new Date(expiryDate);
      const diffTime = expiry.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  const getStatusColor = (expiryDate: string) => {
      const days = getDaysUntilExpiry(expiryDate);
      if (days < 0) return 'bg-rose-100 text-rose-700 border-rose-200';
      if (days < 60) return 'bg-amber-100 text-amber-700 border-amber-200';
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  const getRecordForCrew = (crewCode: string, type: TrainingType) => {
      return records.find(r => r.crewCode === crewCode && r.type === type);
  };

  // -- Handlers --

  const handleOpenRecordModal = (crewCode?: string, type?: TrainingType, existing?: TrainingRecord) => {
      if (existing) {
          setEditingRecord(existing);
          setRecordForm(existing);
      } else {
          setEditingRecord(null);
          setRecordForm({
              crewCode: crewCode || '',
              type: type || 'Medical',
              expiryDate: '',
              status: 'Valid'
          });
      }
      setIsRecordModalOpen(true);
  };

  const handleSaveRecord = async () => {
      if(!recordForm.crewCode || !recordForm.expiryDate || !recordForm.type) return;
      
      // Auto status update based on date
      const days = getDaysUntilExpiry(recordForm.expiryDate);
      let status: any = 'Valid';
      if(days < 0) status = 'Expired';
      else if(days < 60) status = 'Expiring';

      const payload = { ...recordForm, status };

      if(editingRecord) {
          await onUpdateRecord(editingRecord.id, payload);
      } else {
          await onAddRecord(payload as TrainingRecord);
      }
      setIsRecordModalOpen(false);
  };

  const handleOpenEventModal = () => {
      setEventForm({ 
          title: '', date: '', startTime: '', endTime: '', 
          instructor: '', location: '', trainees: [], type: 'CRM', status: 'Scheduled' 
      });
      setIsEventModalOpen(true);
  };

  const handleSaveEvent = async () => {
      if(!eventForm.title || !eventForm.date) return;
      await onAddEvent(eventForm as TrainingEvent);
      setIsEventModalOpen(false);
  };

  const pilots = crew.filter(c => !c.role?.includes('Cabin'));
  const trainingTypes: TrainingType[] = ['Medical', 'License', 'OPC', 'LPC', 'Dangerous Goods', 'CRM', 'SEP'];

  // -- Stats --
  const expiredCount = records.filter(r => getDaysUntilExpiry(r.expiryDate) < 0).length;
  const expiringCount = records.filter(r => {
      const d = getDaysUntilExpiry(r.expiryDate);
      return d >= 0 && d < 60;
  }).length;

  return (
    <FeatureGate isEnabled={features.enableTrainingManagement}>
        <div className="max-w-7xl mx-auto p-4 lg:p-8 pb-32 animate-in fade-in duration-300">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Training Management</h1>
                    <p className="text-slate-500 mt-1">Track crew qualifications, expiries, and schedule training events.</p>
                </div>
            </header>

            {/* Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 flex p-1">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                    <Clock size={18} /> Overview
                </button>
                <button 
                    onClick={() => setActiveTab('matrix')}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'matrix' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                    <User size={18} /> Crew Matrix
                </button>
                <button 
                    onClick={() => setActiveTab('schedule')}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'schedule' ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                    <Calendar size={18} /> Scheduling
                </button>
            </div>

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                                    <XCircle size={24} />
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-rose-600">{expiredCount}</div>
                                    <div className="text-sm font-bold text-slate-500 uppercase">Expired Items</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-amber-600">{expiringCount}</div>
                                    <div className="text-sm font-bold text-slate-500 uppercase">Expiring Soon</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                    <Calendar size={24} />
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-blue-600">{events.filter(e => e.status === 'Scheduled').length}</div>
                                    <div className="text-sm font-bold text-slate-500 uppercase">Scheduled Classes</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Expiry List */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800">Critical Expiries</h3>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-6 py-3">Crew Member</th>
                                    <th className="px-6 py-3">Training Type</th>
                                    <th className="px-6 py-3">Expiry Date</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {records
                                    .filter(r => getDaysUntilExpiry(r.expiryDate) < 60)
                                    .sort((a,b) => a.expiryDate.localeCompare(b.expiryDate))
                                    .map(r => {
                                        const cm = crew.find(c => c.code === r.crewCode);
                                        return (
                                            <tr key={r.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-3 font-bold text-slate-700">{cm?.name || r.crewCode}</td>
                                                <td className="px-6 py-3">{r.type}</td>
                                                <td className="px-6 py-3 font-mono">{r.expiryDate}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getStatusColor(r.expiryDate)}`}>
                                                        {getDaysUntilExpiry(r.expiryDate) < 0 ? 'Expired' : `${getDaysUntilExpiry(r.expiryDate)} Days`}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })
                                }
                                {records.filter(r => getDaysUntilExpiry(r.expiryDate) < 60).length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400">All training records are up to date.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: MATRIX */}
            {activeTab === 'matrix' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-800">Crew Qualification Matrix</h3>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1 text-xs text-slate-500 font-bold"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Valid</div>
                            <div className="flex items-center gap-1 text-xs text-slate-500 font-bold"><span className="w-2 h-2 bg-amber-500 rounded-full"></span> Warning</div>
                            <div className="flex items-center gap-1 text-xs text-slate-500 font-bold"><span className="w-2 h-2 bg-rose-500 rounded-full"></span> Expired</div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    <th className="px-4 py-3 sticky left-0 bg-slate-100 border-r border-slate-200 z-10 w-48">Crew Member</th>
                                    {trainingTypes.map(t => (
                                        <th key={t} className="px-4 py-3 text-center border-r border-slate-200 min-w-[100px]">{t}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pilots.map(p => (
                                    <tr key={p.code} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-bold text-slate-800 border-r border-slate-200 sticky left-0 bg-white hover:bg-slate-50 z-10">
                                            {p.name}
                                            <span className="block text-[10px] text-slate-400 font-mono font-normal">{p.code}</span>
                                        </td>
                                        {trainingTypes.map(t => {
                                            const rec = getRecordForCrew(p.code, t);
                                            const days = rec ? getDaysUntilExpiry(rec.expiryDate) : null;
                                            
                                            let bgClass = "bg-slate-50";
                                            if (days !== null) {
                                                if (days < 0) bgClass = "bg-rose-100 hover:bg-rose-200 text-rose-700 cursor-pointer";
                                                else if (days < 60) bgClass = "bg-amber-100 hover:bg-amber-200 text-amber-700 cursor-pointer";
                                                else bgClass = "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer";
                                            }

                                            return (
                                                <td 
                                                    key={t} 
                                                    className={`p-2 border-r border-slate-100 text-center relative group ${rec ? 'cursor-pointer' : ''}`}
                                                    onClick={() => handleOpenRecordModal(p.code, t, rec)}
                                                >
                                                    <div className={`w-full h-full py-1 rounded font-mono text-xs font-bold ${bgClass} transition-colors`}>
                                                        {rec ? rec.expiryDate.slice(5) : '--'}
                                                    </div>
                                                    {!rec && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleOpenRecordModal(p.code, t); }}
                                                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-100/80 text-blue-600 font-bold text-xs"
                                                        >
                                                            <Plus size={14}/> Add
                                                        </button>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: SCHEDULE */}
            {activeTab === 'schedule' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">Scheduled Training Events</h3>
                        <button 
                            onClick={handleOpenEventModal}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Plus size={16}/> Schedule Class
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map(ev => (
                            <div key={ev.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">{ev.type}</div>
                                        <h4 className="font-bold text-slate-900 text-lg">{ev.title}</h4>
                                    </div>
                                    <button onClick={() => onDeleteEvent(ev.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                                <div className="space-y-2 text-sm text-slate-600 mb-4">
                                    <div className="flex items-center gap-2"><Calendar size={14}/> {ev.date}</div>
                                    <div className="flex items-center gap-2"><Clock size={14}/> {ev.startTime} - {ev.endTime}</div>
                                    <div className="flex items-center gap-2"><User size={14}/> Instructor: {ev.instructor}</div>
                                </div>
                                <div className="border-t border-slate-100 pt-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Trainees</p>
                                    <div className="flex flex-wrap gap-2">
                                        {ev.trainees.map(code => (
                                            <span key={code} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200">{code}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {events.length === 0 && (
                            <div className="col-span-3 text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                <Calendar size={32} className="mx-auto mb-2 opacity-50"/>
                                <p>No training events scheduled.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* RECORD MODAL */}
            {isRecordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900">{editingRecord ? 'Update Record' : 'Add Record'}</h3>
                            <button onClick={() => setIsRecordModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Crew Member</label>
                                <select 
                                    className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50"
                                    value={recordForm.crewCode}
                                    onChange={e => setRecordForm({...recordForm, crewCode: e.target.value})}
                                    disabled={!!editingRecord}
                                >
                                    <option value="">Select Crew...</option>
                                    {crew.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Training Type</label>
                                <select 
                                    className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50"
                                    value={recordForm.type}
                                    onChange={e => setRecordForm({...recordForm, type: e.target.value as TrainingType})}
                                    disabled={!!editingRecord}
                                >
                                    {trainingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expiry Date</label>
                                <input 
                                    type="date"
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                    value={recordForm.expiryDate}
                                    onChange={e => setRecordForm({...recordForm, expiryDate: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Issue Date (Optional)</label>
                                <input 
                                    type="date"
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                    value={recordForm.issueDate || ''}
                                    onChange={e => setRecordForm({...recordForm, issueDate: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            {editingRecord && (
                                <button 
                                    onClick={() => { onDeleteRecord(editingRecord.id); setIsRecordModalOpen(false); }}
                                    className="px-4 py-2 text-rose-600 font-bold hover:bg-rose-50 rounded-lg text-sm mr-auto"
                                >
                                    Delete
                                </button>
                            )}
                            <button onClick={() => setIsRecordModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                            <button onClick={handleSaveRecord} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* EVENT MODAL */}
            {isEventModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900">Schedule Training</h3>
                            <button onClick={() => setIsEventModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Class Title</label>
                                    <input 
                                        className="w-full border rounded-lg px-3 py-2 text-sm"
                                        placeholder="e.g. Annual CRM Refresher"
                                        value={eventForm.title || ''}
                                        onChange={e => setEventForm({...eventForm, title: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                    <select 
                                        className="w-full border rounded-lg px-3 py-2 text-sm"
                                        value={eventForm.type}
                                        onChange={e => setEventForm({...eventForm, type: e.target.value as TrainingType})}
                                    >
                                        {trainingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={eventForm.date || ''} onChange={e => setEventForm({...eventForm, date: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Time</label>
                                    <input type="time" className="w-full border rounded-lg px-3 py-2 text-sm" value={eventForm.startTime || ''} onChange={e => setEventForm({...eventForm, startTime: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Time</label>
                                    <input type="time" className="w-full border rounded-lg px-3 py-2 text-sm" value={eventForm.endTime || ''} onChange={e => setEventForm({...eventForm, endTime: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instructor</label>
                                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={eventForm.instructor || ''} onChange={e => setEventForm({...eventForm, instructor: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
                                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={eventForm.location || ''} onChange={e => setEventForm({...eventForm, location: e.target.value})} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Trainees (Hold Ctrl/Cmd to select multiple)</label>
                                    <select 
                                        multiple 
                                        className="w-full border rounded-lg px-3 py-2 text-sm h-32"
                                        value={eventForm.trainees || []}
                                        onChange={e => {
                                            const selected = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
                                            setEventForm({...eventForm, trainees: selected});
                                        }}
                                    >
                                        {crew.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button onClick={() => setIsEventModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                            <button onClick={handleSaveEvent} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700">Schedule Event</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </FeatureGate>
  );
};