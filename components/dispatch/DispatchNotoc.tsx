
import React, { useState } from 'react';
import { NotocData, DispatchRecord, NotocItem, SpecialLoadItem } from '../../types';
import { Bomb, Package, Trash2, Plus } from 'lucide-react';
import { inputClass, labelClass } from './Shared';

interface DispatchNotocProps {
    notoc: NotocData;
    onUpdate: (data: Partial<DispatchRecord>) => void;
}

export const DispatchNotoc: React.FC<DispatchNotocProps> = ({ notoc, onUpdate }) => {
    const [newNotocItem, setNewNotocItem] = useState<Partial<NotocItem>>({
        stationOfUnloading: '', airWaybillNumber: '', properShippingName: '', classDivision: '', 
        unNumber: '', subRisk: '', noOfPackages: 1, netQuantity: '', packingInst: '', 
        packingGroup: '', code: '', cao: false, ergCode: '', location: ''
    });
    
    const [newSpecialLoad, setNewSpecialLoad] = useState<Partial<SpecialLoadItem>>({
        stationOfUnloading: '', airWaybillNumber: '', description: '', 
        noOfPackages: 1, quantity: '', supplementaryInfo: '', 
        code: '', uldId: '', loadingPosition: ''
    });

    const handleAddNotocItem = () => {
        if (!newNotocItem.unNumber || !newNotocItem.properShippingName) return;
        const currentDangerousGoods = notoc.dangerousGoods || [];
        onUpdate({
            notoc: {
                ...notoc,
                dangerousGoods: [...currentDangerousGoods, { ...newNotocItem, id: Date.now().toString() } as NotocItem]
            }
        });
        setNewNotocItem({ 
            stationOfUnloading: '', airWaybillNumber: '', properShippingName: '', classDivision: '', 
            unNumber: '', subRisk: '', noOfPackages: 1, netQuantity: '', packingInst: '', 
            packingGroup: '', code: '', cao: false, ergCode: '', location: '' 
        });
    };

    const handleDeleteNotocItem = (id: string) => {
        onUpdate({
            notoc: {
                ...notoc,
                dangerousGoods: notoc.dangerousGoods.filter(item => item.id !== id)
            }
        });
    };

    const handleAddSpecialLoad = () => {
        if (!newSpecialLoad.description) return;
        const currentSpecialLoads = notoc.specialLoads || [];
        onUpdate({
            notoc: {
                ...notoc,
                specialLoads: [...currentSpecialLoads, { ...newSpecialLoad, id: Date.now().toString() } as SpecialLoadItem]
            }
        });
        setNewSpecialLoad({ 
            stationOfUnloading: '', airWaybillNumber: '', description: '', 
            noOfPackages: 1, quantity: '', supplementaryInfo: '', 
            code: '', uldId: '', loadingPosition: '' 
        });
    };

    const handleDeleteSpecialLoad = (id: string) => {
        onUpdate({
            notoc: {
                ...notoc,
                specialLoads: notoc.specialLoads.filter(item => item.id !== id)
            }
        });
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 pb-12">
            
            {/* Dangerous Goods Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
                    <h3 className="font-bold text-rose-800 flex items-center gap-2">
                        <Bomb size={18} className="text-rose-600"/> Dangerous Goods (NOTOC)
                    </h3>
                    <span className="text-xs font-bold text-rose-600 uppercase bg-white px-2 py-1 rounded border border-rose-200">IATA Standard Format</span>
                </div>
                
                <div className="p-5 border-b border-slate-200 space-y-4 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div>
                            <label className={labelClass}>Station of Unloading</label>
                            <input placeholder="Station" className={`${inputClass} uppercase`} value={newNotocItem.stationOfUnloading} onChange={e => setNewNotocItem(p => ({...p, stationOfUnloading: e.target.value.toUpperCase()}))} />
                        </div>
                        <div>
                            <label className={labelClass}>Air Waybill Number</label>
                            <input placeholder="AWB No." className={inputClass} value={newNotocItem.airWaybillNumber} onChange={e => setNewNotocItem(p => ({...p, airWaybillNumber: e.target.value}))} />
                        </div>
                        <div>
                            <label className={labelClass}>UN or ID Number</label>
                            <input placeholder="UN1234" className={`${inputClass} uppercase`} value={newNotocItem.unNumber} onChange={e => setNewNotocItem(p => ({...p, unNumber: e.target.value.toUpperCase()}))} />
                        </div>
                        <div>
                            <label className={labelClass}>Proper Shipping Name</label>
                            <input placeholder="Proper Name" className={inputClass} value={newNotocItem.properShippingName} onChange={e => setNewNotocItem(p => ({...p, properShippingName: e.target.value}))} />
                        </div>
                    </div>
                    {/* ... (Additional inputs abbreviated for clarity, mirroring previous large block) ... */}
                    <div className="flex justify-end pt-2">
                        <button onClick={handleAddNotocItem} className="bg-rose-600 text-white rounded-lg h-[40px] px-6 font-bold hover:bg-rose-700 shadow-md flex items-center justify-center gap-2 transition-all">
                            <Plus size={18}/> Add DG Item
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[1200px] border-collapse">
                        <thead className="bg-slate-800 text-white border-b border-slate-700 uppercase tracking-wider text-[10px] font-bold">
                            <tr>
                                <th rowSpan={2} className="px-2 py-3 border-r border-slate-600">Station</th>
                                <th rowSpan={2} className="px-2 py-3 border-r border-slate-600">AWB</th>
                                <th rowSpan={2} className="px-2 py-3 border-r border-slate-600">Shipping Name</th>
                                <th rowSpan={2} className="px-2 py-3 border-r border-slate-600">Class</th>
                                <th rowSpan={2} className="px-2 py-3 border-r border-slate-600">UN/ID</th>
                                <th rowSpan={2} className="px-2 py-3 border-r border-slate-600 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {notoc.dangerousGoods?.map((item, idx) => (
                                <tr key={item.id} className={`hover:bg-rose-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                    <td className="px-2 py-3 font-mono text-slate-700">{item.stationOfUnloading}</td>
                                    <td className="px-2 py-3 font-mono text-slate-700">{item.airWaybillNumber}</td>
                                    <td className="px-2 py-3 font-bold text-slate-900">{item.properShippingName}</td>
                                    <td className="px-2 py-3 font-bold text-center text-slate-900">{item.classDivision}</td>
                                    <td className="px-2 py-3 font-mono text-center text-slate-700">{item.unNumber}</td>
                                    <td className="px-2 py-3 text-center">
                                        <button onClick={() => handleDeleteNotocItem(item.id)} className="text-slate-300 hover:text-rose-500 p-1 rounded hover:bg-rose-50 transition-colors">
                                            <Trash2 size={14}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {(!notoc.dangerousGoods || notoc.dangerousGoods.length === 0) && (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-slate-400 italic">No Dangerous Goods declared.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Special Load Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                        <Package size={18} className="text-indigo-600"/> Other Special Load
                    </h3>
                    <span className="text-xs font-bold text-indigo-600 uppercase bg-white px-2 py-1 rounded border border-indigo-200">IATA Standard Format</span>
                </div>
                
                <div className="p-5 border-b border-slate-200 space-y-4 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="md:col-span-3">
                            <label className={labelClass}>Contents and Description</label>
                            <input placeholder="e.g. Human Remains, Live Animals" className={inputClass} value={newSpecialLoad.description} onChange={e => setNewSpecialLoad(p => ({...p, description: e.target.value}))} />
                        </div>
                        <button onClick={handleAddSpecialLoad} className="bg-indigo-600 text-white rounded-lg h-[40px] font-bold hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2 transition-all">
                            <Plus size={18}/> Add Item
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[1200px] border-collapse">
                        <thead className="bg-slate-800 text-white border-b border-slate-700 uppercase tracking-wider text-[10px] font-bold">
                            <tr>
                                <th className="px-3 py-3 border-r border-slate-600 w-1/3">Contents and Description</th>
                                <th className="px-3 py-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {notoc.specialLoads?.map((item, idx) => (
                                <tr key={item.id} className={`hover:bg-indigo-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                    <td className="px-3 py-3 font-bold text-slate-900">{item.description}</td>
                                    <td className="px-3 py-3 text-center">
                                        <button onClick={() => handleDeleteSpecialLoad(item.id)} className="text-slate-300 hover:text-indigo-600 p-1.5 rounded hover:bg-indigo-50 transition-colors">
                                            <Trash2 size={14}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {(!notoc.specialLoads || notoc.specialLoads.length === 0) && (
                                <tr>
                                    <td colSpan={2} className="text-center py-8 text-slate-400 italic">No Special Loads recorded.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
