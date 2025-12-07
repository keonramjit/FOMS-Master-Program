
import React from 'react';
import { FuelData, DispatchRecord } from '../../types';
import { Fuel } from 'lucide-react';
import { inputClass, labelClass } from './Shared';

interface DispatchFuelProps {
    fuel: FuelData;
    onUpdate: (data: Partial<DispatchRecord>) => void;
}

export const DispatchFuel: React.FC<DispatchFuelProps> = ({ fuel, onUpdate }) => {
    
    const updateFuel = (field: keyof FuelData, val: number) => {
        onUpdate({
            fuel: { ...fuel, [field]: val }
        });
    };

    const totalFuelReq = fuel.taxi + fuel.trip + fuel.contingency + fuel.alternate + fuel.holding;

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Fuel size={20} className="text-blue-600"/> Fuel Planning (Lbs)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Taxi Fuel</label>
                            <input type="number" className={inputClass} value={fuel.taxi} onChange={e => updateFuel('taxi', Number(e.target.value))} />
                        </div>
                        <div>
                            <label className={labelClass}>Trip Fuel</label>
                            <input type="number" className={`${inputClass} font-bold text-blue-900`} value={fuel.trip} onChange={e => updateFuel('trip', Number(e.target.value))} />
                        </div>
                        <div>
                            <label className={labelClass}>Contingency (5%)</label>
                            <input type="number" className={inputClass} value={fuel.contingency} onChange={e => updateFuel('contingency', Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Alternate</label>
                            <input type="number" className={inputClass} value={fuel.alternate} onChange={e => updateFuel('alternate', Number(e.target.value))} />
                        </div>
                        <div>
                            <label className={labelClass}>Holding (45 min)</label>
                            <input type="number" className={inputClass} value={fuel.holding} onChange={e => updateFuel('holding', Number(e.target.value))} />
                        </div>
                        <div>
                            <label className={labelClass}>Fuel Density (Lbs/Gal)</label>
                            <input type="number" step="0.1" className={inputClass} value={fuel.density} onChange={e => updateFuel('density', Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col justify-center">
                        <div className="text-center mb-6">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Minimum Required</p>
                            <p className="text-2xl font-black text-slate-700">{totalFuelReq} Lbs</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Total Fuel on Board</p>
                            <input 
                                type="number" 
                                className="w-full text-center text-3xl font-black text-blue-700 bg-transparent border-b-2 border-blue-200 focus:border-blue-500 outline-none pb-1"
                                value={fuel.totalFob} 
                                onChange={e => updateFuel('totalFob', Number(e.target.value))} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
