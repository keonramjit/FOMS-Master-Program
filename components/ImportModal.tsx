

import React, { useState, useEffect } from 'react';
import { Flight } from '../types';
import { X, Check, AlertTriangle, Save, Trash2, MapPin, Plane, Clock, User } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (flights: Flight[]) => void;
  scannedFlights: Flight[];
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onConfirm, scannedFlights }) => {
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => {
    setFlights(scannedFlights);
  }, [scannedFlights]);

  if (!isOpen) return null;

  const handleUpdate = (id: string, field: keyof Flight, value: string) => {
    setFlights(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const handleDelete = (id: string) => {
    setFlights(prev => prev.filter(f => f.id !== id));
  };

  const inputClass = "w-full bg-slate-50 text-slate-900 border border-transparent hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded px-2.5 py-1.5 text-sm font-medium transition-all placeholder:text-slate-400";
  const headerClass = "px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider bg-slate-100/80";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-slate-900/5">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white z-10 relative">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded text-white shadow-md shadow-blue-200">
                <Check size={18} strokeWidth={3} />
              </div>
              Review Scanned Schedule
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              AI has detected <strong>{flights.length}</strong> flights. Please verify details before importing.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-50/50 p-2 sm:p-6 custom-scrollbar">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[1000px]">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className={headerClass}>Flight #</th>
                    <th className={headerClass}>Route</th>
                    <th className={headerClass}>Aircraft Type</th>
                    <th className={headerClass}>Registration</th>
                    <th className={headerClass}>ETD</th>
                    <th className={headerClass}>C/Time</th>
                    <th className={headerClass}>Crew (PIC / SIC)</th>
                    <th className={headerClass}>Customer</th>
                    <th className={`${headerClass} w-10`}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {flights.map((flight) => (
                    <tr key={flight.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <input 
                          value={flight.flightNumber}
                          onChange={(e) => handleUpdate(flight.id, 'flightNumber', e.target.value)}
                          className={`${inputClass} font-bold text-slate-800`}
                          placeholder="TBA"
                        />
                      </td>
                      <td className="p-3">
                        <div className="relative">
                            <input 
                              value={flight.route}
                              onChange={(e) => handleUpdate(flight.id, 'route', e.target.value)}
                              className={`${inputClass} font-mono pl-7 uppercase text-blue-700 bg-blue-50/50 focus:bg-white`}
                              placeholder="ROUTE"
                            />
                            <MapPin size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                        </div>
                      </td>
                      <td className="p-3">
                        <select 
                          value={flight.aircraftType}
                          onChange={(e) => handleUpdate(flight.id, 'aircraftType', e.target.value)}
                          className={`${inputClass} cursor-pointer appearance-none`}
                        >
                          <option value="C208B">C208B</option>
                          <option value="C208EX">C208EX</option>
                          <option value="1900D">1900D</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <div className="relative">
                            <input 
                              value={flight.aircraftRegistration}
                              onChange={(e) => handleUpdate(flight.id, 'aircraftRegistration', e.target.value)}
                              className={`${inputClass} uppercase pl-7`}
                              placeholder="REG"
                            />
                            <Plane size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="relative">
                            <input 
                              type="time"
                              value={flight.etd}
                              onChange={(e) => handleUpdate(flight.id, 'etd', e.target.value)}
                              className={`${inputClass} pl-7`}
                            />
                            <Clock size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </td>
                      <td className="p-3">
                         <input 
                          value={flight.commercialTime || ''}
                          onChange={(e) => handleUpdate(flight.id, 'commercialTime', e.target.value)}
                          className={`${inputClass} w-20 text-center font-mono`}
                          placeholder="H:MM"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <input 
                            value={flight.pic}
                            onChange={(e) => handleUpdate(flight.id, 'pic', e.target.value)}
                            className={`${inputClass} w-16 text-center font-bold !px-1`}
                            placeholder="PIC"
                          />
                           <input 
                            value={flight.sic}
                            onChange={(e) => handleUpdate(flight.id, 'sic', e.target.value)}
                            className={`${inputClass} w-16 text-center !px-1`}
                            placeholder="SIC"
                          />
                        </div>
                      </td>
                      <td className="p-3">
                         <input 
                          value={flight.customer}
                          onChange={(e) => handleUpdate(flight.id, 'customer', e.target.value)}
                          className={inputClass}
                          placeholder="Customer Name"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => handleDelete(flight.id)}
                          className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"
                          title="Remove Flight"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-4 flex gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-800">
            <AlertTriangle size={20} className="shrink-0 text-amber-600" />
            <div>
                <p className="font-bold">Please Verify Schedule</p>
                <p className="opacity-90">Check that dates, times, and registrations are correct before confirming. Codes have been inferred from the image.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 z-10">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(flights)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 text-sm transform active:scale-95"
          >
            <Save size={18} />
            <span className="hidden sm:inline">Confirm & Import Schedule</span>
            <span className="sm:hidden">Confirm</span>
          </button>
        </div>

      </div>
    </div>
  );
};