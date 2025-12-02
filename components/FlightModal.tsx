import React, { useState, useEffect } from 'react';
import { Flight, Aircraft, CrewMember, CustomerDefinition, TrainingRecord } from '../types';
import { X, Save, Plane, Calendar, Clock, User, MapPin, ChevronDown, ArrowRightLeft, Timer, Hash, AlertTriangle } from 'lucide-react';
import { fetchCrewTrainingRecords } from '../services/firebase';

interface FlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (flight: Omit<Flight, 'id'>) => Promise<void>;
  editingFlight?: Flight | null;
  fleet: (Aircraft & { _docId: string })[];
  crew: (CrewMember & { _docId: string })[];
  customers?: CustomerDefinition[];
  flights: Flight[];
}

export const FlightModal: React.FC<FlightModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingFlight, 
  fleet, 
  crew,
  customers = [],
  flights
}) => {
  const [formData, setFormData] = useState<Partial<Flight>>({
    flightNumber: '',
    date: '', 
    route: '',
    aircraftRegistration: '',
    aircraftType: 'C208B',
    etd: '',
    flightTime: 0,
    commercialTime: '',
    pic: '',
    sic: '',
    customer: '',
    customerId: '',
    status: 'Scheduled',
    notes: ''
  });

  // Return Flight State
  const [createReturn, setCreateReturn] = useState(false);
  const [turnaroundMin, setTurnaroundMin] = useState(30);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingFlight) {
      setFormData(editingFlight);
      setCreateReturn(false); // Disable return creation when editing existing
      // Validate pilot on load if editing
      if (editingFlight.pic) validatePilot(editingFlight.pic, editingFlight.date, editingFlight.flightTime || 0);
    } else {
        // Use local time for default date
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
      setFormData({
        flightNumber: '',
        date: todayStr,
        route: '',
        aircraftRegistration: '',
        aircraftType: 'C208B',
        etd: '08:00',
        flightTime: 0,
        commercialTime: '',
        pic: '',
        sic: '',
        customer: '',
        customerId: '',
        status: 'Scheduled',
        notes: ''
      });
      setCreateReturn(false);
      setWarnings([]);
    }
  }, [editingFlight, isOpen]);

  if (!isOpen) return null;

  // --- Logic Helpers ---

  const handleCustomerSelect = (name: string) => {
      const selected = customers.find(c => c.name === name);
      setFormData(prev => ({
          ...prev,
          customer: name,
          customerId: selected ? selected.customerId : (prev.customerId || '')
      }));
  };

  const generateReturnRoute = (route: string) => {
    if (!route.includes('-')) return route;
    const [a, b] = route.split('-');
    return `${b}-${a}`;
  };

  const generateReturnFlightNumber = (num: string) => {
    // Try to increment number (TGY100 -> TGY101)
    const match = num.match(/(\d+)$/);
    if (match) {
        const val = parseInt(match[0], 10);
        const prefix = num.slice(0, match.index);
        return `${prefix}${val + 1}`;
    }
    return num;
  };

  const calculateReturnETD = (etd: string, durationHrs: number, turnMin: number) => {
    if (!etd) return '';
    const [h, m] = etd.split(':').map(Number);
    const totalMinutes = (h * 60) + m + (durationHrs * 60) + turnMin;
    
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = Math.floor(totalMinutes % 60);
    
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  // --- Smart Dispatch Validation ---
  const validatePilot = async (crewCode: string, date: string, flightDuration: number) => {
    const newWarnings: string[] = [];
    if (!crewCode || !date) {
        setWarnings([]);
        return;
    }

    // 1. FDP Check (Flight Duty Period)
    // Filter flights for this pilot on this date
    // Exclude current flight if editing to avoid double counting
    const pilotDailyFlights = flights.filter(f => 
        f.date === date && 
        (f.pic === crewCode || f.sic === crewCode) && 
        (editingFlight ? f.id !== editingFlight.id : true)
    );
    
    const previousHours = pilotDailyFlights.reduce((acc, f) => acc + (f.flightTime || 0), 0);
    const potentialTotal = previousHours + flightDuration;

    if (potentialTotal > 8) {
        newWarnings.push(`FDP Alert: Pilot has flown ${previousHours.toFixed(1)}h today. Adding this flight (${flightDuration}h) exceeds 8h limit (Total: ${potentialTotal.toFixed(1)}h).`);
    }

    // 2. Training/Expiry Check
    try {
        const records = await fetchCrewTrainingRecords(crewCode);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
        
        const relevantTypes = ['Medical', 'License'];
        
        records.forEach(r => {
            if (relevantTypes.includes(r.type)) {
                const expiry = new Date(r.expiryDate);
                if (expiry < today) {
                    newWarnings.push(`Expired Document: ${r.type} expired on ${r.expiryDate}`);
                }
            }
        });
    } catch (e) {
        console.error("Validation error", e);
    }

    setWarnings(newWarnings);
  };

  const handlePicChange = (crewCode: string) => {
      setFormData(prev => ({ ...prev, pic: crewCode }));
      // Trigger validation
      validatePilot(crewCode, formData.date || '', formData.flightTime || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const selectedAircraft = fleet.find(f => f.registration === formData.aircraftRegistration);
      
      const { id, ...cleanData } = formData as any;
      
      // 1. Prepare Outbound Flight
      const outboundFlight: Omit<Flight, 'id'> = {
        ...cleanData,
        aircraftType: selectedAircraft ? selectedAircraft.type : formData.aircraftType,
        flightTime: isNaN(Number(formData.flightTime)) ? 0 : Number(formData.flightTime),
        flightNumber: formData.flightNumber?.toUpperCase() || 'TBA',
        route: formData.route?.toUpperCase() || ''
      };

      // Save Outbound
      await onSave(outboundFlight);

      // 2. Prepare Return Flight (if enabled)
      if (createReturn && !editingFlight) {
        const returnFlight: Omit<Flight, 'id'> = {
            ...outboundFlight,
            flightNumber: generateReturnFlightNumber(outboundFlight.flightNumber),
            route: generateReturnRoute(outboundFlight.route),
            etd: calculateReturnETD(outboundFlight.etd, outboundFlight.flightTime || 0, turnaroundMin),
            status: 'Scheduled', // Always reset status for new return leg
            notes: `Return leg of ${outboundFlight.flightNumber}`,
            commercialTime: '' // Reset C/Time for new leg
        };
        await onSave(returnFlight);
      }

      onClose();
    } catch (error) {
      console.error("Error saving flight:", error);
    } finally {
      setLoading(false);
    }
  };

  const pilots = crew.filter(c => !c.role?.includes('Cabin Crew'));

  // Shared Styles
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2";
  const inputWrapperClass = "relative";
  const iconClass = "absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none";
  const inputClass = "w-full pl-11 pr-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 shadow-sm";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="font-bold text-xl text-slate-900 flex items-center gap-2.5">
              <div className="bg-blue-50 p-2 rounded-lg">
                <Plane className="text-blue-600" size={20} />
              </div>
              {editingFlight ? 'Edit Flight Details' : 'Schedule New Flight'}
            </h2>
            <p className="text-slate-500 text-sm mt-1 ml-11">
              {editingFlight ? `Update details for flight ${editingFlight.flightNumber}` : 'Enter the details for the new operation'}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar bg-white">
          <form id="flight-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Section: Operational Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className={labelClass}>Date</label>
                <div className={inputWrapperClass}>
                  <Calendar className={iconClass} size={18} />
                  <input 
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => {
                        const newDate = e.target.value;
                        setFormData(prev => ({ ...prev, date: newDate }));
                        if(formData.pic) validatePilot(formData.pic, newDate, formData.flightTime || 0);
                    }}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Flight No.</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. TGY1234"
                  value={formData.flightNumber}
                  onChange={e => setFormData(prev => ({ ...prev, flightNumber: e.target.value }))}
                  className={`${inputClass} !pl-4 font-bold uppercase tracking-wide`}
                />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <div className={inputWrapperClass}>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className={selectClass}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>
            </div>

            {/* Section: Route & Aircraft */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="sm:col-span-1">
                <label className={labelClass}>Route</label>
                <div className={inputWrapperClass}>
                  <MapPin className={iconClass} size={18} />
                  <input 
                    type="text"
                    required
                    placeholder="OGL-KAI"
                    value={formData.route}
                    onChange={e => setFormData(prev => ({ ...prev, route: e.target.value }))}
                    className={`${inputClass} font-mono uppercase`}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Aircraft Assignment</label>
                <div className={inputWrapperClass}>
                    <select 
                        value={formData.aircraftRegistration}
                        onChange={e => setFormData(prev => ({ ...prev, aircraftRegistration: e.target.value }))}
                        className={selectClass}
                    >
                        <option value="">Select Aircraft from Fleet...</option>
                        <optgroup label="1900D">
                        {fleet.filter(f => f.type === '1900D').map(f => (
                            <option key={f._docId} value={f.registration}>{f.registration} (1900D) - {f.status}</option>
                        ))}
                        </optgroup>
                        <optgroup label="C208EX">
                        {fleet.filter(f => f.type === 'C208EX').map(f => (
                            <option key={f._docId} value={f.registration}>{f.registration} (C208EX) - {f.status}</option>
                        ))}
                        </optgroup>
                        <optgroup label="C208B">
                        {fleet.filter(f => f.type === 'C208B').map(f => (
                            <option key={f._docId} value={f.registration}>{f.registration} (C208B) - {f.status}</option>
                        ))}
                        </optgroup>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>
            </div>

            {/* Section: Timing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className={labelClass}>ETD (Local)</label>
                <div className={inputWrapperClass}>
                  <Clock className={iconClass} size={18} />
                  <input 
                    type="time"
                    required
                    value={formData.etd}
                    onChange={e => setFormData(prev => ({ ...prev, etd: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Flight Time (Hrs)</label>
                <input 
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.flightTime || ''}
                    onChange={e => {
                        const time = parseFloat(e.target.value);
                        setFormData(prev => ({ ...prev, flightTime: time }));
                        if(formData.pic) validatePilot(formData.pic, formData.date || '', time);
                    }}
                    className={`${inputClass} !pl-4`}
                    placeholder="e.g. 1.5"
                />
              </div>
              <div>
                <label className={labelClass}>C/Time (H:MM)</label>
                <input 
                    type="text"
                    value={formData.commercialTime || ''}
                    onChange={e => setFormData(prev => ({ ...prev, commercialTime: e.target.value }))}
                    className={`${inputClass} !pl-4`}
                    placeholder="e.g. 1:45"
                />
              </div>
            </div>

            {/* Return Flight Toggle (New Feature) */}
            {!editingFlight && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 transition-all">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${createReturn ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                <ArrowRightLeft size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Round Trip</h3>
                                <p className="text-xs text-slate-500">Automatically create return flight</p>
                            </div>
                        </div>
                        <div className="flex items-center">
                           <button
                             type="button"
                             onClick={() => setCreateReturn(!createReturn)}
                             className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${createReturn ? 'bg-indigo-600' : 'bg-slate-300'}`}
                           >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${createReturn ? 'translate-x-5' : 'translate-x-0'}`} />
                           </button>
                        </div>
                    </div>

                    {createReturn && (
                        <div className="mt-4 pt-4 border-t border-indigo-100 animate-in slide-in-from-top-2">
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Turnaround (Mins)</label>
                                    <div className="relative">
                                        <Timer className={iconClass} size={18} />
                                        <input 
                                            type="number"
                                            value={turnaroundMin}
                                            onChange={(e) => setTurnaroundMin(Number(e.target.value))}
                                            className={inputClass}
                                            min="15"
                                            step="5"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Return Preview</label>
                                    <div className="text-xs font-mono bg-white border border-indigo-100 rounded-lg p-3 text-indigo-700">
                                        <div className="flex justify-between">
                                            <span>{generateReturnRoute(formData.route || '---')}</span>
                                            <span className="font-bold">{generateReturnFlightNumber(formData.flightNumber || '---')}</span>
                                        </div>
                                        <div className="mt-1 font-bold">
                                            ETD: {calculateReturnETD(formData.etd || '', formData.flightTime || 0, turnaroundMin)}
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            )}

            {/* Section: Crew */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <User size={16} className="text-blue-500"/> Crew Assignment
                </h3>
                
                {/* Warnings Alert Box */}
                {warnings.length > 0 && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 animate-in slide-in-from-top-2">
                        <div className="flex gap-3">
                            <AlertTriangle className="text-red-600 shrink-0" size={20} />
                            <div>
                                <h4 className="text-xs font-bold text-red-800 uppercase mb-1">Safety Checks Failed</h4>
                                <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                                    {warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label className={labelClass}>Pilot in Command (PIC)</label>
                    <div className={inputWrapperClass}>
                        <select 
                            value={formData.pic}
                            onChange={e => handlePicChange(e.target.value)}
                            className={selectClass}
                        >
                            <option value="">Select Pilot...</option>
                            {pilots.map(p => (
                            <option key={p._docId} value={p.code}>{p.code} - {p.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Second in Command (SIC)</label>
                    <div className={inputWrapperClass}>
                        <select 
                            value={formData.sic}
                            onChange={e => setFormData(prev => ({ ...prev, sic: e.target.value }))}
                            className={selectClass}
                        >
                            <option value="">None</option>
                            {pilots.map(p => (
                            <option key={p._docId} value={p.code}>{p.code} - {p.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>
                </div>
            </div>

            {/* Section: Additional Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label className={labelClass}>Customer / Client</label>
                    <div className={inputWrapperClass}>
                        <select
                            value={formData.customer}
                            onChange={(e) => handleCustomerSelect(e.target.value)}
                            className={selectClass}
                        >
                            <option value="">Select Customer...</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Customer ID</label>
                    <div className={inputWrapperClass}>
                        <Hash className={iconClass} size={18} />
                        <input 
                            type="text"
                            value={formData.customerId}
                            onChange={e => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                            className={inputClass}
                            placeholder="ID"
                        />
                    </div>
                </div>
            </div>
            <div>
                <label className={labelClass}>Internal Notes</label>
                <textarea 
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 shadow-sm"
                  placeholder="Additional operational details..."
                />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex justify-between gap-4 sticky bottom-0 z-10">
          
          <div>
            {/* Delete button removed */}
          </div>

          <div className="flex gap-3">
            <button 
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-all shadow-sm"
            >
                Cancel
            </button>
            <button 
                type="submit"
                form="flight-form"
                disabled={loading}
                className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
                {loading ? 'Saving...' : <><Save size={18} /> {createReturn ? 'Save Round Trip' : 'Save Flight'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};