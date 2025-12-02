
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Flight, FlightStatus } from '../types';
import { getCrewName } from '../constants';
import { Edit2, MapPin, AlertCircle, ChevronDown, Check } from 'lucide-react';

interface FlightTableProps {
  flights: Flight[];
  onEdit?: (flight: Flight) => void;
  readOnly?: boolean;
  onStatusUpdate?: (id: string, status: FlightStatus) => void;
}

export const FlightTable: React.FC<FlightTableProps> = ({ flights, onEdit, readOnly = false, onStatusUpdate }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4">Flight #</th>
              <th className="px-6 py-4">Route</th>
              <th className="px-6 py-4">Aircraft</th>
              <th className="px-6 py-4">ETD</th>
              <th className="px-6 py-4">Crew (PIC/SIC)</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Customer/Notes</th>
              {!readOnly && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {flights.length === 0 ? (
                <tr>
                    <td colSpan={readOnly ? 7 : 8} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                            <AlertCircle size={32} className="mb-2 opacity-50" />
                            <p className="font-medium">No flights scheduled for this day.</p>
                            {!readOnly && <p className="text-sm mt-1">Import a schedule or add a new flight to get started.</p>}
                        </div>
                    </td>
                </tr>
            ) : (
                flights.map((flight) => (
                <tr 
                    key={flight.id} 
                    className={`${!readOnly ? 'hover:bg-slate-50 cursor-pointer' : 'hover:bg-slate-50/50'} transition-colors group`}
                    onClick={() => {
                        if (!readOnly && onEdit) {
                            onEdit(flight);
                        }
                    }}
                >
                    <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 block">{flight.flightNumber}</span>
                    </td>
                    
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-lg w-fit shadow-sm">
                            <MapPin size={12} className="text-blue-500" />
                            <span className="text-xs font-mono font-bold text-blue-700">
                                {flight.route}
                            </span>
                        </div>
                    </td>
                    
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">{flight.aircraftType}</span>
                            <span className="text-xs text-slate-500 font-mono">{flight.aircraftRegistration || 'TBA'}</span>
                        </div>
                    </td>
                    
                    <td className="px-6 py-4">
                        <span className="font-mono text-sm text-slate-900 font-medium">{flight.etd}</span>
                    </td>
                    
                    <td className="px-6 py-4">
                        <div className="flex gap-2">
                            {flight.pic ? (
                                <div className="group/tooltip relative cursor-help">
                                    <span className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700 shadow-sm block text-center min-w-[36px]">
                                        {flight.pic}
                                    </span>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">
                                        {getCrewName(flight.pic)}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-xs text-slate-300 italic">--</span>
                            )}
                            
                            {flight.sic && (
                                <div className="group/tooltip relative cursor-help">
                                    <span className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-500 block text-center min-w-[36px]">
                                        {flight.sic}
                                    </span>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">
                                        {getCrewName(flight.sic)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </td>
                    
                    <td className="px-6 py-4 relative">
                        <FlightStatusBadge 
                            status={flight.status} 
                            onUpdate={onStatusUpdate ? (s) => onStatusUpdate(flight.id, s) : undefined} 
                        />
                    </td>
                    
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            {flight.notes && (
                                <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 text-[10px] rounded mb-1 w-fit font-medium">
                                    {flight.notes}
                                </span>
                            )}
                            <span className="text-sm text-slate-600 truncate max-w-[180px]" title={flight.customer}>
                                {flight.customer || <span className="opacity-30 italic">No Customer</span>}
                            </span>
                        </div>
                    </td>

                    {!readOnly && (
                        <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onEdit) onEdit(flight);
                                    }}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit Flight"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </div>
                        </td>
                    )}
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface StatusBadgeProps {
    status: Flight['status'];
    onUpdate?: (status: FlightStatus) => void;
}

const FlightStatusBadge: React.FC<StatusBadgeProps> = ({ status, onUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside or scroll
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                buttonRef.current && 
                !buttonRef.current.contains(event.target as Node) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        const handleScroll = () => {
             if (isOpen) setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, true);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    const getStatusStyles = (s: string) => {
        switch (s) {
            case 'Outbound': return "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200";
            case 'Inbound': return "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200";
            case 'On Ground': return "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200";
            case 'Completed': return "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200";
            case 'Delayed': return "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200";
            case 'Cancelled': return "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200";
            default: return "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"; // Scheduled
        }
    };
    
    // Helper for dropdown item styles (lighter backgrounds)
    const getDropdownItemStyles = (s: string) => {
        switch (s) {
            case 'Outbound': return "text-blue-700 hover:bg-blue-50";
            case 'Inbound': return "text-indigo-700 hover:bg-indigo-50";
            case 'On Ground': return "text-emerald-700 hover:bg-emerald-50";
            case 'Completed': return "text-slate-600 hover:bg-slate-100";
            case 'Delayed': return "text-amber-700 hover:bg-amber-50";
            case 'Cancelled': return "text-rose-700 hover:bg-rose-50";
            default: return "text-slate-700 hover:bg-slate-50";
        }
    };

    const styles = getStatusStyles(status);
    const availableStatuses: FlightStatus[] = ['Scheduled', 'Outbound', 'Inbound', 'On Ground', 'Completed', 'Delayed', 'Cancelled'];

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY + 4, // 4px gap
                left: rect.left + window.scrollX
            });
        }
        setIsOpen(!isOpen);
    };

    const handleSelect = (s: FlightStatus) => {
        if (onUpdate) onUpdate(s);
        setIsOpen(false);
    };

    if (!onUpdate) {
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wide select-none ${styles}`}>
                {status}
            </span>
        );
    }

    return (
        <>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wide flex items-center gap-1 transition-colors ${styles}`}
            >
                {status}
                <ChevronDown size={10} strokeWidth={3} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>

            {isOpen && createPortal(
                <div 
                    ref={dropdownRef}
                    className="fixed z-[9999] w-40 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5"
                    style={{ top: position.top, left: position.left }}
                >
                    <div className="p-1 max-h-60 overflow-y-auto">
                        {availableStatuses.map(s => (
                            <button
                                key={s}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(s);
                                }}
                                className={`
                                    w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wide rounded-md flex items-center justify-between
                                    transition-colors
                                    ${getDropdownItemStyles(s)}
                                    ${s === status ? 'bg-slate-50' : ''}
                                `}
                            >
                                <span className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusStyles(s).split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500')}`}></span>
                                    {s}
                                </span>
                                {s === status && <Check size={12} className="opacity-60"/>}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
