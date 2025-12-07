
import React, { useState } from 'react';
import { Passenger, CargoItem, DispatchRecord } from '../../types';
import { User, Package, Edit2, Trash2 } from 'lucide-react';
import { compactInputClass, compactLabelClass } from './Shared';

interface DispatchPayloadProps {
    passengers: Passenger[];
    cargoItems: CargoItem[];
    basicEmptyWeight: number;
    onUpdate: (data: Partial<DispatchRecord>) => void;
    routeParts: string[];
}

export const DispatchPayload: React.FC<DispatchPayloadProps> = ({ passengers, cargoItems, basicEmptyWeight, onUpdate, routeParts }) => {
    const [editingPaxId, setEditingPaxId] = useState<string | null>(null);
    const [newPax, setNewPax] = useState<Partial<Passenger>>({ 
        lastName: '', firstName: '', isInfant: false,
        departure: routeParts[0], arrival: routeParts[1], gender: 'M', nationality: 'Guyanese',
        weight: 175, seatNumber: '', freeBagWeight: 20, excessBagWeight: 0,
        bagTag: '', ticketNumber: '', passportNumber: '', receiptNumber: ''
    });

    const [newCargo, setNewCargo] = useState<Partial<CargoItem>>({ 
        consignor: '', consignee: '', destination: routeParts[1], 
        description: '', pieces: 1, weight: 0 
    });

    // Calculations
    const totalPaxWeight = passengers.reduce((acc, p) => acc + (p.weight || 0) + (p.freeBagWeight || 0) + (p.excessBagWeight || 0), 0);
    const totalFreeBagWeight = passengers.reduce((acc, p) => acc + (p.freeBagWeight || 0), 0);
    const totalExcessBagWeight = passengers.reduce((acc, p) => acc + (p.excessBagWeight || 0), 0);
    const totalCargoWeight = cargoItems.reduce((acc, c) => acc + (c.weight || 0), 0);
    const payload = totalPaxWeight + totalCargoWeight;

    // Handlers
    const handleEditPax = (pax: Passenger) => {
        setNewPax(pax);
        setEditingPaxId(pax.id);
    };

    const handleCancelEdit = () => {
        setEditingPaxId(null);
        setNewPax({
            lastName: '', firstName: '', isInfant: false,
            departure: routeParts[0], arrival: routeParts[1],
            gender: 'M', nationality: 'Guyanese',
            weight: 175, seatNumber: '', freeBagWeight: 20, excessBagWeight: 0,
            bagTag: '', ticketNumber: '', passportNumber: '', receiptNumber: ''
        });
    };

    const handleSavePax = () => {
        if (!newPax.lastName || !newPax.firstName) return;

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
        
        setNewPax(prev => ({ 
            ...prev, 
            lastName: '', firstName: '', isInfant: false,
            seatNumber: '', bagTag: '', passportNumber: '', ticketNumber: '', receiptNumber: '',
            weight: 175, freeBagWeight: 20, excessBagWeight: 0
        }));
    };

    const handleDeletePax = (id: string) => {
        if (editingPaxId === id) handleCancelEdit();
        onUpdate({ passengers: passengers.filter(x => x.id !== id) });
    };

    const handleAddCargo = () => {
        if (!newCargo.destination) return;
        onUpdate({ cargoItems: [...cargoItems, { ...newCargo, id: Date.now().toString() } as CargoItem] });
        setNewCargo(prev => ({ 
            ...prev, 
            consignor: '', consignee: '', 
            description: '', pieces: 1, weight: 0 
        }));
    };

    const handleDeleteCargo = (id: string) => {
        onUpdate({ cargoItems: cargoItems.filter(x => x.id !== id) });
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2">
            
            {/* Passenger Manifest */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <User size={18} className="text-blue-500"/> Passenger Manifest
                    </h3>
                    <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                        {passengers.length} PAX
                    </span>
                </div>
                
                <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex items-end gap-2 overflow-x-auto">
                    <div className="min-w-[100px] flex-1">
                        <label className={compactLabelClass}>Last Name</label>
                        <input placeholder="SMITH" className={compactInputClass} value={newPax.lastName} onChange={e => setNewPax(p => ({...p, lastName: e.target.value.toUpperCase()}))} />
                    </div>
                    <div className="min-w-[100px] flex-1">
                        <label className={compactLabelClass}>First Name</label>
                        <input placeholder="JOHN" className={compactInputClass} value={newPax.firstName} onChange={e => setNewPax(p => ({...p, firstName: e.target.value.toUpperCase()}))} />
                    </div>
                    <div className="w-16">
                        <label className={compactLabelClass}>Wgt</label>
                        <input type="number" className={compactInputClass} value={newPax.weight} onChange={e => setNewPax(p => ({...p, weight: Number(e.target.value)}))} />
                    </div>
                    <div className="w-16">
                        <label className={compactLabelClass}>Free Bag</label>
                        <input type="number" className={compactInputClass} value={newPax.freeBagWeight} onChange={e => setNewPax(p => ({...p, freeBagWeight: Number(e.target.value)}))} />
                    </div>
                    <div className="w-16">
                        <label className={compactLabelClass}>Exc. Bag</label>
                        <input type="number" className={compactInputClass} value={newPax.excessBagWeight} onChange={e => setNewPax(p => ({...p, excessBagWeight: Number(e.target.value)}))} />
                    </div>
                    <div className="w-16">
                        <label className={compactLabelClass}>Seat</label>
                        <input placeholder="1A" className={compactInputClass} value={newPax.seatNumber} onChange={e => setNewPax(p => ({...p, seatNumber: e.target.value.toUpperCase()}))} />
                    </div>
                    <div className="w-20">
                        <label className={compactLabelClass}>Passport</label>
                        <input placeholder="P123" className={compactInputClass} value={newPax.passportNumber} onChange={e => setNewPax(p => ({...p, passportNumber: e.target.value.toUpperCase()}))} />
                    </div>
                    <div className="w-20">
                        <label className={compactLabelClass}>Bag Tag</label>
                        <input placeholder="TAG" className={compactInputClass} value={newPax.bagTag} onChange={e => setNewPax(p => ({...p, bagTag: e.target.value}))} />
                    </div>
                    <div className="w-20">
                        <label className={compactLabelClass}>Ticket</label>
                        <input placeholder="TKT" className={compactInputClass} value={newPax.ticketNumber} onChange={e => setNewPax(p => ({...p, ticketNumber: e.target.value}))} />
                    </div>
                    <div className="flex items-center pb-2 pl-1">
                        <label className="flex items-center gap-1 cursor-pointer select-none">
                            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={newPax.isInfant} onChange={e => setNewPax(p => ({...p, isInfant: e.target.checked}))} />
                            <span className="text-[10px] font-bold text-slate-700">INF</span>
                        </label>
                    </div>
                    <div>
                        {editingPaxId ? (
                            <div className="flex gap-1">
                                <button onClick={handleCancelEdit} className="h-8 px-2 bg-slate-200 text-slate-700 rounded text-xs font-bold">Cancel</button>
                                <button onClick={handleSavePax} className="h-8 px-2 bg-blue-600 text-white rounded text-xs font-bold">Update</button>
                            </div>
                        ) : (
                            <button onClick={handleSavePax} className="h-8 px-3 bg-blue-600 text-white rounded text-xs font-bold whitespace-nowrap shadow-sm hover:bg-blue-700">Add Pax</button>
                        )}
                    </div>
                </div>

                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold text-xs uppercase">
                        <tr>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Weight</th>
                            <th className="px-6 py-3">Free Bag</th>
                            <th className="px-6 py-3">Exc Bag</th>
                            <th className="px-6 py-3">Seat</th>
                            <th className="px-6 py-3">Passport</th>
                            <th className="px-6 py-3 text-center">Infant</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {passengers.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50 group">
                                <td className="px-6 py-3 font-bold text-slate-800">{p.lastName}, {p.firstName}</td>
                                <td className="px-6 py-3 font-mono">{p.weight} Lbs</td>
                                <td className="px-6 py-3 font-mono">{p.freeBagWeight || 0} Lbs</td>
                                <td className="px-6 py-3 font-mono">{p.excessBagWeight || 0} Lbs</td>
                                <td className="px-6 py-3 font-mono">{p.seatNumber || '-'}</td>
                                <td className="px-6 py-3 font-mono">{p.passportNumber || '-'}</td>
                                <td className="px-6 py-3 text-center font-bold text-blue-600">{p.isInfant ? 'YES' : '-'}</td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditPax(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDeletePax(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {passengers.length === 0 && (
                            <tr><td colSpan={8} className="text-center py-8 text-slate-400 italic">No passengers added.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Cargo Manifest */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Package size={18} className="text-amber-600"/> Cargo Manifest
                    </h3>
                    <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                        {cargoItems.length} Items
                    </span>
                </div>
                
                <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex items-end gap-2 overflow-x-auto">
                    <div className="flex-1 min-w-[120px]">
                        <label className={compactLabelClass}>Consignor</label>
                        <input placeholder="Sender Name" className={compactInputClass} value={newCargo.consignor} onChange={e => setNewCargo(p => ({...p, consignor: e.target.value}))} />
                    </div>
                    <div className="flex-1 min-w-[120px]">
                        <label className={compactLabelClass}>Consignee</label>
                        <input placeholder="Receiver Name" className={compactInputClass} value={newCargo.consignee} onChange={e => setNewCargo(p => ({...p, consignee: e.target.value}))} />
                    </div>
                    <div className="w-20">
                        <label className={compactLabelClass}>Weight</label>
                        <input type="number" className={compactInputClass} value={newCargo.weight || ''} onChange={e => setNewCargo(p => ({...p, weight: Number(e.target.value)}))} />
                    </div>
                    <div className="w-16">
                        <label className={compactLabelClass}>Pieces</label>
                        <input type="number" className={compactInputClass} value={newCargo.pieces} onChange={e => setNewCargo(p => ({...p, pieces: Number(e.target.value)}))} />
                    </div>
                    <div className="flex-[1.5] min-w-[150px]">
                        <label className={compactLabelClass}>Description</label>
                        <input placeholder="Description" className={compactInputClass} value={newCargo.description} onChange={e => setNewCargo(p => ({...p, description: e.target.value}))} />
                    </div>
                    <button onClick={handleAddCargo} className="h-8 px-3 bg-amber-500 text-white rounded text-xs font-bold whitespace-nowrap shadow-sm hover:bg-amber-600">Add Cargo</button>
                </div>

                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold text-xs uppercase">
                        <tr>
                            <th className="px-6 py-3">Consignor</th>
                            <th className="px-6 py-3">Consignee</th>
                            <th className="px-6 py-3">Weight</th>
                            <th className="px-6 py-3">Pieces</th>
                            <th className="px-6 py-3">Description</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {cargoItems.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50 group">
                                <td className="px-6 py-3 font-bold text-slate-800">{c.consignor}</td>
                                <td className="px-6 py-3 text-slate-600">{c.consignee}</td>
                                <td className="px-6 py-3 font-mono font-bold">{c.weight} Lbs</td>
                                <td className="px-6 py-3 font-mono">{c.pieces}</td>
                                <td className="px-6 py-3 italic text-slate-500">{c.description}</td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={() => handleDeleteCargo(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {cargoItems.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-8 text-slate-400 italic">No cargo added.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Weight Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-800 p-4 rounded-xl text-white shadow-lg">
                <div className="text-center border-r border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pax Weight</div>
                    <div className="text-lg font-black">{totalPaxWeight} Lbs</div>
                </div>
                <div className="text-center border-r border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Free Bags</div>
                    <div className="text-lg font-black text-blue-300">{totalFreeBagWeight} Lbs</div>
                </div>
                <div className="text-center border-r border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Excess Bags</div>
                    <div className="text-lg font-black text-amber-300">{totalExcessBagWeight} Lbs</div>
                </div>
                <div className="text-center border-r border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cargo Weight</div>
                    <div className="text-lg font-black">{totalCargoWeight} Lbs</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Payload</div>
                    <div className="text-xl font-black text-emerald-400">{payload} Lbs</div>
                </div>
            </div>
        </div>
    );
};
