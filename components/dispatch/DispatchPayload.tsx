
import React, { useState } from 'react';
import { Passenger, CargoItem, DispatchRecord } from '../../types';
import { User, Package, Edit2, Trash2, Users, Box, Plus, Baby, Luggage, Weight } from 'lucide-react';

interface DispatchPayloadProps {
    passengers: Passenger[];
    cargoItems: CargoItem[];
    basicEmptyWeight: number;
    onUpdate: (data: Partial<DispatchRecord>) => void;
    routeParts: string[];
}

export const DispatchPayload: React.FC<DispatchPayloadProps> = ({ passengers, cargoItems, basicEmptyWeight, onUpdate, routeParts }) => {
    const [activeSubTab, setActiveSubTab] = useState<'passengers' | 'cargo'>('passengers');
    const [editingPaxId, setEditingPaxId] = useState<string | null>(null);
    
    // Passenger Form State
    const [newPax, setNewPax] = useState<Partial<Passenger>>({ 
        lastName: '', firstName: '', isInfant: false,
        departure: routeParts[0], arrival: routeParts[1], 
        gender: 'M', nationality: '', receiptNumber: '',
        weight: 0, seatNumber: '', freeBagWeight: 0, excessBagWeight: 0,
        bagTag: '', ticketNumber: '', passportNumber: ''
    });

    // Cargo Form State
    const [newCargo, setNewCargo] = useState<Partial<CargoItem>>({ 
        origin: routeParts[0], destination: routeParts[1],
        consignor: '', consignee: '', 
        description: '', pieces: 1, weight: 0 
    });

    // Calculations
    const totalPaxWeight = passengers.reduce((acc, p) => acc + (p.weight || 0) + (p.freeBagWeight || 0) + (p.excessBagWeight || 0), 0);
    const totalFreeBagWeight = passengers.reduce((acc, p) => acc + (p.freeBagWeight || 0), 0);
    const totalExcessBagWeight = passengers.reduce((acc, p) => acc + (p.excessBagWeight || 0), 0);
    const totalCargoWeight = cargoItems.reduce((acc, c) => acc + (c.weight || 0), 0);
    const payload = totalPaxWeight + totalCargoWeight;

    // --- Handlers ---

    const handleSavePax = () => {
        if (!newPax.lastName) return;

        let updatedPassengers;
        if (editingPaxId) {
            updatedPassengers = passengers.map(p => 
                p.id === editingPaxId ? { ...newPax, id: editingPaxId } as Passenger : p
            );
            setEditingPaxId(null);
        } else {
            updatedPassengers = [...passengers, { ...newPax, id: Date.now().toString() } as Passenger];
        }
        
        onUpdate({ passengers: updatedPassengers });
        
        // Reset form but keep routing for convenience
        setNewPax({ 
            lastName: '', firstName: '', isInfant: false,
            departure: routeParts[0], arrival: routeParts[1],
            gender: 'M', nationality: '', receiptNumber: '',
            weight: 0, seatNumber: '', freeBagWeight: 0, excessBagWeight: 0,
            bagTag: '', ticketNumber: '', passportNumber: ''
        });
    };

    const handleEditPax = (pax: Passenger) => {
        setNewPax(pax);
        setEditingPaxId(pax.id);
    };

    const handleDeletePax = (id: string) => {
        if (editingPaxId === id) {
            setEditingPaxId(null);
            setNewPax({ 
                lastName: '', firstName: '', isInfant: false,
                departure: routeParts[0], arrival: routeParts[1],
                gender: 'M', nationality: '', receiptNumber: '',
                weight: 0, seatNumber: '', freeBagWeight: 0, excessBagWeight: 0,
                bagTag: '', ticketNumber: '', passportNumber: ''
            });
        }
        onUpdate({ passengers: passengers.filter(x => x.id !== id) });
    };

    const handleAddCargo = () => {
        if (!newCargo.consignor && !newCargo.description) return;
        onUpdate({ cargoItems: [...cargoItems, { ...newCargo, id: Date.now().toString() } as CargoItem] });
        setNewCargo({ 
            origin: routeParts[0], destination: routeParts[1],
            consignor: '', consignee: '', 
            description: '', pieces: 1, weight: 0 
        });
    };

    const handleDeleteCargo = (id: string) => {
        onUpdate({ cargoItems: cargoItems.filter(x => x.id !== id) });
    };

    // --- Styles ---
    const inputBase = "h-8 bg-white border border-slate-300 rounded-md px-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 uppercase";
    const headerCell = "px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 border-r last:border-r-0 border-slate-200 text-left";
    const bodyCell = "px-3 py-2 text-xs font-bold text-slate-700 border-b border-slate-100 border-r last:border-r-0 border-slate-100 uppercase align-middle";

    return (
        <div className="max-w-[1400px] mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-2 pb-12">
            
            {/* Header / Navigation */}
            <div className="flex items-center justify-between bg-white rounded-xl p-1.5 shadow-sm border border-slate-200">
                <div className="flex gap-1">
                    <button 
                        onClick={() => setActiveSubTab('passengers')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'passengers' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Users size={16} /> Passenger Manifest
                        <span className="bg-white/20 px-1.5 rounded text-[10px]">{passengers.length}</span>
                    </button>
                    <button 
                        onClick={() => setActiveSubTab('cargo')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'cargo' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Box size={16} /> Cargo Manifest
                        <span className="bg-white/20 px-1.5 rounded text-[10px]">{cargoItems.length}</span>
                    </button>
                </div>
            </div>

            {/* PASSENGER MANIFEST CONTENT */}
            {activeSubTab === 'passengers' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Input Row - Styled as a cohesive strip */}
                    <div className="p-3 bg-slate-100 border-b border-slate-200 grid grid-cols-[1fr_1fr_60px_60px_70px_60px_60px_60px_50px_40px_80px] gap-2 items-center">
                        <input className={inputBase} placeholder="LAST NAME" value={newPax.lastName} onChange={e => setNewPax(p => ({...p, lastName: e.target.value.toUpperCase()}))} />
                        <input className={inputBase} placeholder="FIRST NAME" value={newPax.firstName} onChange={e => setNewPax(p => ({...p, firstName: e.target.value.toUpperCase()}))} />
                        
                        <select className={inputBase} value={newPax.gender} onChange={e => setNewPax(p => ({...p, gender: e.target.value as any}))}>
                            <option value="M">M</option>
                            <option value="F">F</option>
                            <option value="X">X</option>
                        </select>

                        <input className={inputBase} placeholder="NAT" maxLength={3} value={newPax.nationality} onChange={e => setNewPax(p => ({...p, nationality: e.target.value.toUpperCase()}))} />
                        <input className={inputBase} placeholder="REC #" value={newPax.receiptNumber} onChange={e => setNewPax(p => ({...p, receiptNumber: e.target.value}))} />
                        
                        <input type="number" className={`${inputBase} text-center`} placeholder="WGT" value={newPax.weight} onChange={e => setNewPax(p => ({...p, weight: Number(e.target.value)}))} />
                        <input type="number" className={`${inputBase} text-center`} placeholder="FREE" value={newPax.freeBagWeight} onChange={e => setNewPax(p => ({...p, freeBagWeight: Number(e.target.value)}))} />
                        <input type="number" className={`${inputBase} text-center`} placeholder="EXC" value={newPax.excessBagWeight} onChange={e => setNewPax(p => ({...p, excessBagWeight: Number(e.target.value)}))} />
                        
                        <input className={`${inputBase} text-center`} placeholder="SEAT" value={newPax.seatNumber} onChange={e => setNewPax(p => ({...p, seatNumber: e.target.value.toUpperCase()}))} />
                        
                        <div className="flex items-center justify-center h-8 bg-white border border-slate-300 rounded-md">
                            <label className="cursor-pointer flex items-center justify-center w-full h-full" title="Infant">
                                <input type="checkbox" className="hidden peer" checked={newPax.isInfant} onChange={e => setNewPax(p => ({...p, isInfant: e.target.checked}))} />
                                <Baby size={16} className={`transition-colors ${newPax.isInfant ? 'text-blue-600' : 'text-slate-300'}`} />
                            </label>
                        </div>

                        <button onClick={handleSavePax} className={`h-8 rounded-md font-bold text-xs uppercase shadow-sm transition-all ${editingPaxId ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                            {editingPaxId ? 'Update' : 'Add'}
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className={headerCell}>Passenger Name</th>
                                    <th className={headerCell}>Sex</th>
                                    <th className={headerCell}>Nat</th>
                                    <th className={headerCell}>Rec #</th>
                                    <th className={`${headerCell} text-center`}>Pax Wgt</th>
                                    <th className={`${headerCell} text-center`}>Free Bag</th>
                                    <th className={`${headerCell} text-center`}>Exc Bag</th>
                                    <th className={`${headerCell} text-center`}>Seat</th>
                                    <th className={`${headerCell} text-center`}>Infant</th>
                                    <th className={`${headerCell} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {passengers.map((p, idx) => (
                                    <tr key={p.id} className={`hover:bg-blue-50/50 group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                        <td className={bodyCell}>{p.lastName}, {p.firstName}</td>
                                        <td className={bodyCell}>{p.gender}</td>
                                        <td className={bodyCell}>{p.nationality || '-'}</td>
                                        <td className={`${bodyCell} font-mono text-slate-500`}>{p.receiptNumber || '-'}</td>
                                        <td className={`${bodyCell} text-center font-bold text-slate-900`}>{p.weight}</td>
                                        <td className={`${bodyCell} text-center text-slate-600`}>{p.freeBagWeight || 0}</td>
                                        <td className={`${bodyCell} text-center text-amber-600`}>{p.excessBagWeight || 0}</td>
                                        <td className={`${bodyCell} text-center`}>{p.seatNumber || '-'}</td>
                                        <td className={`${bodyCell} text-center`}>
                                            {p.isInfant && <Baby size={14} className="mx-auto text-blue-500" />}
                                        </td>
                                        <td className={`${bodyCell} text-right`}>
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditPax(p)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14}/></button>
                                                <button onClick={() => handleDeletePax(p.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {passengers.length === 0 && (
                                    <tr><td colSpan={10} className="text-center py-8 text-slate-400 italic text-xs">No passengers listed. Use the top row to add.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CARGO MANIFEST CONTENT */}
            {activeSubTab === 'cargo' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-99 duration-200">
                    {/* Input Row */}
                    <div className="p-3 bg-slate-100 border-b border-slate-200 grid grid-cols-[60px_60px_1fr_1fr_60px_70px_1.5fr_80px] gap-2 items-center">
                        <input className={`${inputBase} text-center`} placeholder="FROM" value={newCargo.origin} onChange={e => setNewCargo(p => ({...p, origin: e.target.value.toUpperCase()}))} />
                        <input className={`${inputBase} text-center`} placeholder="TO" value={newCargo.destination} onChange={e => setNewCargo(p => ({...p, destination: e.target.value.toUpperCase()}))} />
                        <input className={inputBase} placeholder="CONSIGNOR" value={newCargo.consignor} onChange={e => setNewCargo(p => ({...p, consignor: e.target.value}))} />
                        <input className={inputBase} placeholder="CONSIGNEE" value={newCargo.consignee} onChange={e => setNewCargo(p => ({...p, consignee: e.target.value}))} />
                        <input type="number" className={`${inputBase} text-center`} placeholder="PCS" value={newCargo.pieces} onChange={e => setNewCargo(p => ({...p, pieces: Number(e.target.value)}))} />
                        <input type="number" className={`${inputBase} text-center`} placeholder="WGT" value={newCargo.weight} onChange={e => setNewCargo(p => ({...p, weight: Number(e.target.value)}))} />
                        <input className={inputBase} placeholder="DESCRIPTION / AWB" value={newCargo.description} onChange={e => setNewCargo(p => ({...p, description: e.target.value}))} />
                        <button onClick={handleAddCargo} className="h-8 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-bold text-xs uppercase shadow-sm transition-all flex items-center justify-center gap-1">
                            <Plus size={14}/> Add
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className={headerCell}>From</th>
                                    <th className={headerCell}>To</th>
                                    <th className={headerCell}>Consignor</th>
                                    <th className={headerCell}>Consignee</th>
                                    <th className={`${headerCell} text-center`}>Pieces</th>
                                    <th className={`${headerCell} text-center`}>Weight</th>
                                    <th className={headerCell}>Description</th>
                                    <th className={`${headerCell} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cargoItems.map((c, idx) => (
                                    <tr key={c.id} className={`hover:bg-amber-50/50 group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                        <td className={`${bodyCell} font-mono text-slate-500`}>{c.origin || '?'}</td>
                                        <td className={`${bodyCell} font-mono text-slate-500`}>{c.destination}</td>
                                        <td className={bodyCell}>{c.consignor}</td>
                                        <td className={bodyCell}>{c.consignee}</td>
                                        <td className={`${bodyCell} text-center`}>{c.pieces}</td>
                                        <td className={`${bodyCell} text-center font-bold text-slate-900`}>{c.weight}</td>
                                        <td className={`${bodyCell} italic text-slate-500 normal-case`}>{c.description}</td>
                                        <td className={`${bodyCell} text-right`}>
                                            <button onClick={() => handleDeleteCargo(c.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={14}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {cargoItems.length === 0 && (
                                    <tr><td colSpan={8} className="text-center py-8 text-slate-400 italic text-xs">No cargo items listed.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* Unified Totals Footer */}
            <div className="bg-slate-900 rounded-xl p-4 text-white shadow-lg border border-slate-700 flex flex-wrap gap-4 justify-around items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg"><Users size={20} className="text-slate-400"/></div>
                    <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pax Count</div>
                        <div className="text-xl font-black">{passengers.length}</div>
                    </div>
                </div>
                <div className="w-px h-8 bg-slate-700 hidden sm:block"></div>
                
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg"><Weight size={20} className="text-blue-400"/></div>
                    <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pax Weight</div>
                        <div className="text-xl font-black text-blue-400">{totalPaxWeight} <span className="text-xs font-medium text-slate-500">LBS</span></div>
                    </div>
                </div>
                <div className="w-px h-8 bg-slate-700 hidden sm:block"></div>

                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg"><Luggage size={20} className="text-amber-400"/></div>
                    <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bags</div>
                        <div className="text-xl font-black text-amber-400">{totalFreeBagWeight + totalExcessBagWeight} <span className="text-xs font-medium text-slate-500">LBS</span></div>
                    </div>
                </div>
                <div className="w-px h-8 bg-slate-700 hidden sm:block"></div>

                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg"><Box size={20} className="text-slate-400"/></div>
                    <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cargo</div>
                        <div className="text-xl font-black">{totalCargoWeight} <span className="text-xs font-medium text-slate-500">LBS</span></div>
                    </div>
                </div>
                <div className="w-px h-8 bg-slate-700 hidden sm:block"></div>

                <div className="flex items-center gap-3 bg-emerald-900/30 px-4 py-1 rounded-lg border border-emerald-900/50">
                    <div>
                        <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider text-right">Total Payload</div>
                        <div className="text-2xl font-black text-white">{payload} <span className="text-sm font-medium text-emerald-400">LBS</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
