import React, { useState, useEffect } from 'react';
import { Flight, Aircraft, CrewMember, CustomerDefinition, SystemSettings } from '../types';
import { X, Save, Plane, Calendar, Clock, User, MapPin, ChevronDown, ArrowRightLeft, Timer, Hash, AlertTriangle, AlertCircle } from 'lucide-react';
import { fetchCrewTrainingRecords } from '../services/firebase';
import { z } from 'zod'; // Import Zod

interface FlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (flight: Omit<Flight, 'id'>) => Promise<void>;
  editingFlight?: Flight | null;
  fleet: (Aircraft & { _docId?: string })[];
  crew: (CrewMember & { _docId?: string })[];
  customers?: CustomerDefinition[];
  flights: Flight[];
  features: SystemSettings;
}

// --- ZOD VALIDATION SCHEMA ---
// This defines the rules for a "Perfect Flight Record"
const flightFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  flightNumber: z.string().regex(/^TGY\d{3,4}$/, "Flight # must be format TGY1234"),
  route: z.string().min(3, "Route code is required (e.g. OGL-KAI)"),
  aircraftRegistration: z.string().regex(/^8R-[A-Z]{3}$/, "Registration must be format 8R-XXX"),
  aircraftType: z.enum(['C208B', 'C208EX', '1900D']),
  etd: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  flightTime: z.number().min(0.1, "Flight time must be positive").max(10, "Flight time exceeds aircraft endurance"),
  commercialTime: z.string().optional(),
  pic: z.string().min(1, "Pilot in Command is required"),
  sic: z.string().optional(),
  customer: z.string().min(1, "Customer is required"),
  customerId: z.string().optional(),
  status: z.enum(['Scheduled', 'Delayed', 'Completed', 'Cancelled', 'Outbound', 'Inbound', 'On Ground']),
  notes: z.string().optional()
});

export const FlightModal: React.FC<FlightModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingFlight, 
  fleet, 
  crew, 
  customers = [],
  flights,
  features
}) => {
  const [formData, setFormData] = useState<Partial<Flight>>({
    flightNumber: '', date: '', route: '', aircraftRegistration: '', aircraftType: 'C208B', etd: '', flightTime: 0, commercialTime: '', pic: '', sic: '', customer: '', customerId: '', status: 'Scheduled', notes: ''
  });

  const [createReturn, setCreateReturn] = useState(false);
  const [turnaroundMin, setTurnaroundMin] = useState(30);
  
  // Safety & Validation State
  const [warnings, setWarnings] = useState<string[]>([]); // Pilot Safety Warnings (Smart Dispatch)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({}); // Data Format Errors (Zod)
  
  const [loading, setLoading] = useState(false);

  // --- EXISTING LOGIC (Smart Dispatch) ---
  const validatePilot = async (crewCode: string, date: string, flightDuration: number) => {
      const newWarnings: string[] = [];
      if (!crewCode || !date) {
          setWarnings([]);
          return;
      }

      // 1. FDP Check
      if (features.enableCrewFDP) {
          const pilotDailyFlights = flights.filter(f => 
              f.date === date && 
              (f.pic === crewCode || f.sic === crewCode) && 
              (editingFlight ? f.id !== editingFlight.id : true)
          );
          const previousHours = pilotDailyFlights.reduce((acc, f) => acc + (f.flightTime || 0), 0);
          const potentialTotal = previousHours + flightDuration;

          if (potentialTotal > 8) {
              newWarnings.push(`FDP Alert: Pilot has flown ${previousHours.toFixed(1)}h today. Adding this flight (${flightDuration}h) exceeds 8h limit.`);
          }
      }

      // 2. Training/License Check
      if (features.enableTrainingManagement) {
          try {
              const records = await fetchCrewTrainingRecords(crewCode);
              const today = new Date();
              today.setHours(0, 0, 0, 0); 
              
              const relevantTypes = ['Medical', 'License'];
              records.forEach(r => {
                  if (relevantTypes.includes(r.type)) {
                      const expiry = new Date(r.expiryDate);
                      if (expiry < today) {
                          newWarnings.push(`EXPIRED: ${doc.type} (${doc.expiryDate})`);
                      }
                  }
              });
          } catch (e) {
              console.error("Validation error", e);
          }
      }
      setWarnings(newWarnings);
  };

  useEffect(() => {
    if (editingFlight) {
      setFormData(editingFlight);
      setCreateReturn(false);
      if (editingFlight.pic) validatePilot(editingFlight.pic, editingFlight.date, editingFlight.flightTime || 0);
    } else {
        const d = new Date();
        const todayStr = d.toISOString().split('T')[0];
        setFormData({
            flightNumber: '', date: todayStr, route: '', aircraftRegistration: '', aircraftType: 'C208B', etd: '08:00', flightTime: 0, commercialTime: '', pic: '', sic: '', customer: '', customerId: '', status: 'Scheduled', notes: ''
        });
        setCreateReturn(false);
        setWarnings([]);
    }
    setValidationErrors({}); // Clear errors on open
  }, [editingFlight, isOpen]);

  const handlePicChange = (crewCode: string) => {
      setFormData(prev => ({ ...prev, pic: crewCode }));
      validatePilot(crewCode, formData.date || '', formData.flightTime || 0);
  };

  const handleCustomerSelect = (name: string) => {
      const selected = customers.find(c => c.name === name);
      setFormData(prev => ({
          ...prev,
          customer: name,
          customerId: selected ? selected.customerId : (prev.customerId || '')
      }));
  };

  // --- RETURN FLIGHT HELPERS ---
  const generateReturnRoute = (route: string) => {
    if (!route.includes('-')) return route;
    const [a, b] = route.split('-');
    return `${b}-${a}`;
  };

  const generateReturnFlightNumber = (num: string) => {
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

  // --- SUBMIT HANDLER (Now with Zod Validation) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validate Data Structure
    const validationResult = flightFormSchema.safeParse(formData);

    if (!validationResult.success) {
        // Convert Zod errors to a simple object for UI
        const formattedErrors: Record<string, string> = {};
        validationResult.error.issues.forEach(issue => {
            formattedErrors[issue.path[0]] = issue.message;
        });
        setValidationErrors(formattedErrors);
        return; // STOP HERE if invalid
    }

    // 2. Proceed if Valid
    setValidationErrors({});
    setLoading(true);
    
    try {
      const selectedAircraft = fleet.find(f => f.registration === formData.aircraftRegistration);
      const { id, ...cleanData } = formData as any;
      
      const outboundFlight: Omit<Flight, 'id'> = {
        ...cleanData,
        aircraftType: selectedAircraft ? selectedAircraft.type : formData.aircraftType,
        flightNumber: formData.flightNumber?.toUpperCase() || 'TBA',
        route: formData.route?.toUpperCase() || ''
      };

      await onSave(outboundFlight);

      if (createReturn && !editingFlight) {
        const returnFlight: Omit<Flight, 'id'> = {
            ...outboundFlight,
            flightNumber: generateReturnFlightNumber(outboundFlight.flightNumber),
            route: generateReturnRoute(outboundFlight.route),
            etd: calculateReturnETD(outboundFlight.etd, outboundFlight.flightTime || 0, turnaroundMin),
            status: 'Scheduled',
            notes: `Return leg of ${outboundFlight.flightNumber}`,
            commercialTime: '' 
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
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2";
  const inputWrapperClass = "relative";
  const iconClass = "absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none";
  const inputClass = "w-full pl-11 pr-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 shadow-sm";
  // Helper to conditionally add error border
  const getInputClass = (field: string) => `${inputClass} ${validationErrors[field] ? 'border-red-500 ring-1 ring-red-200' : ''}`;
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
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
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar bg-white">
          <form id="flight-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Operational Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className={labelClass}>Date</label>
                <div className={inputWrapperClass}>
                  <Calendar className={iconClass} size={18} />
                  <input 
                    type="date"
                    value={formData.date}
                    onChange={e => {
                        const newDate = e.target.value;
                        setFormData(prev => ({ ...prev, date: newDate }));
                        if(formData.pic) validatePilot(formData.pic, newDate, formData.flightTime || 0);
                    }}
                    className={getInputClass('date')}
                  />
                </div>
                {validationErrors.date && <p className="text-[10px] text-red-500 font-bold mt-1">{validationErrors.date}</p>}
              </div>
              <div>
                <label className={labelClass}>Flight No.</label>
                <input 
                  type="text"
                  placeholder="e.g. TGY1234"
                  value={formData.flightNumber}
                  onChange={e => setFormData(prev => ({ ...prev, flightNumber: e.target.value }))}
                  className={`${getInputClass('flightNumber')} !pl-4 font-bold uppercase tracking-wide`}
                />
                {validationErrors.flightNumber && <p className="text-[10px] text-red-500 font-bold mt-1">{validationErrors.flightNumber}</p>}
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

            {/* Route & Aircraft */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="sm:col-span-1">
                <label className={labelClass}>Route</label>
                <div className={inputWrapperClass}>
                  <MapPin className={iconClass} size={18} />
                  <input 
                    type="text"
                    placeholder="OGL-KAI"
                    value={formData.route}
                    onChange={e => setFormData(prev => ({ ...prev, route: e.target.value.toUpperCase() }))}
                    className={`${getInputClass('route')} font-mono uppercase`}
                  />
                </div>
                {validationErrors.route && <p className="text-[10px] text-red-500 font-bold mt-1">{validationErrors.route}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Aircraft Assignment</label>
                <div className={inputWrapperClass}>
                    <select 
                        value={formData.aircraftRegistration}
                        onChange={e => setFormData(prev => ({ ...prev, aircraftRegistration: e.target.value }))}
                        className={getInputClass('aircraftRegistration')}
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
                {validationErrors.aircraftRegistration && <p className="text-[10px] text-red-500 font-bold mt-1">{validationErrors.aircraftRegistration}</p>}
              </div>
            </div>

            {/* Timing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className={labelClass}>ETD (Local)</label>
                <div className={inputWrapperClass}>
                  <Clock className={iconClass} size={18} />
                  <input 
                    type="time"
                    value={formData.etd}
                    onChange={e => setFormData(prev => ({ ...prev, etd: e.target.value }))}
                    className={getInputClass('etd')}
                  />
                </div>
                {validationErrors.etd && <p className="text-[10px] text-red-500 font-bold mt-1">{validationErrors.etd}</p>}
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
                    className={`${getInputClass('flightTime')} !pl-4`}
                    placeholder="e.g. 1.5"
                />
                {validationErrors.flightTime && <p className="text-[10px] text-red-500 font-bold mt-1">{validationErrors.flightTime}</p>}
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

            {/* Return Flight Toggle */}
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
                           <button type="button" onClick={() => setCreateReturn(!createReturn)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${createReturn ? 'bg-indigo-600' : 'bg-slate-300'}`}>
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
                                        <input type="number" value={turnaroundMin} onChange={(e) => setTurnaroundMin(Number(e.target.value))} className={inputClass} min="15" step="5" />
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

            {/* Crew Assignment */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <User size={16} className="text-blue-500"/> Crew Assignment
                </h3>
                
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
                                className={`${getInputClass('pic')} ${warnings.length > 0 ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                            >
                                <option value="">Select Pilot...</option>
                                {pilots.map(p => (
                                    <option key={p._docId} value={p.code}>{p.code} - {p.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                        {validationErrors.pic && <p className="text-[10px] text-red-500 font-bold mt-1">{validationErrors.pic}</p>}
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

            {/* Additional Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label className={labelClass}>Customer / Client</label>
                    <div className={inputWrapperClass}>
                        <select
                            value={formData.customer}
                            onChange={(e) => handleCustomerSelect(e.target.value)}
                            className={getInputClass('customer')}
                        >
                            <option value="">Select Customer...</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                    {validationErrors.customer && <p className="text-[10px] text-red-500 font-bold mt-1">{validationErrors.customer}</p>}
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

        <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex justify-between gap-4 sticky bottom-0 z-10">
          <div>
             {Object.keys(validationErrors).length > 0 && (
                 <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                     <AlertCircle size={16} />
                     <span className="text-xs font-bold">Please fix errors before saving.</span>
                 </div>
             )}
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