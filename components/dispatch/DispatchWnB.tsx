
import React from 'react';
import { WnBData, Passenger, FuelData, Flight, CrewMember, DispatchRecord } from '../../types';
import { Activity } from 'lucide-react';

interface DispatchWnBProps {
    wnb: WnBData;
    fuel: FuelData;
    passengers: Passenger[];
    basicEmptyWeight: number;
    flight: Flight | null;
    crew: (CrewMember & { _docId?: string })[];
    limits: { mtow: number, mlw: number, mzfw: number };
    onUpdate: (data: Partial<DispatchRecord>) => void;
}

export const DispatchWnB: React.FC<DispatchWnBProps> = ({ wnb, fuel, passengers, basicEmptyWeight, flight, crew, limits, onUpdate }) => {
    
    const pilot = crew.find(c => c.code === flight?.pic);

    const updateWnB = (field: keyof WnBData, val: number) => {
        onUpdate({
            wnb: { ...wnb, [field]: val }
        });
    };

    // Calculate totals
    const arms = {
        crew: 135.5,
        seat2: 135.5,
        seat3_5: 173.9,
        seat6_8: 209.9,
        seat9_11: 245.9,
        seat12_14: 281.9,
        zone1: 172,
        zone2: 217.8,
        zone3: 264.4,
        zone4: 294.5,
        zone5: 319.5,
        zone6: 344,
        podA: 132.4,
        podB: 182.1,
        podC: 233.4,
        podD: 287.6,
        fuel: 200 
    };

    const calcMoment = (weight: number, arm: number) => (weight * arm) / 1000;
    const totalLoad = 
        wnb.seat2 + wnb.seat3_5 + wnb.seat6_8 + wnb.seat9_11 + wnb.seat12_14 +
        wnb.zone1 + wnb.zone2 + wnb.zone3 + wnb.zone4 + wnb.zone5 + wnb.zone6 +
        wnb.podA + wnb.podB + wnb.podC + wnb.podD;

    const zeroFuelWeight = basicEmptyWeight + wnb.crewWeight + totalLoad;
    const rampWeight = zeroFuelWeight + fuel.totalFob;
    const takeoffWeight = rampWeight - fuel.taxi;
    const landingWeight = takeoffWeight - fuel.trip;

    const EntryRow = ({ label, field, arm }: { label: string, field: keyof WnBData, arm: number }) => (
        <tr className="border-b border-slate-200 hover:bg-slate-50">
            <td className="py-2 pl-4 text-sm font-bold text-slate-700">{label}</td>
            <td className="p-2">
                <input 
                    type="number" 
                    value={wnb[field] || ''} 
                    onChange={e => updateWnB(field, Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono text-sm text-right focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </td>
            <td className="p-2 text-right font-mono text-sm text-slate-600">{arm.toFixed(1)}</td>
            <td className="p-2 text-right font-mono text-sm font-bold text-slate-800">{calcMoment(wnb[field], arm).toFixed(2)}</td>
        </tr>
    );

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 pb-12">
            <div className="bg-white shadow-lg border border-slate-300 w-full text-sm print:shadow-none print:border-none">
                <div className="border-b-2 border-slate-800 p-4 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-4">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2c/Trans_Guyana_Airways_Logo.png" alt="TGA" className="h-10 opacity-80" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                        <div>
                            <h1 className="text-xl font-black text-slate-900 uppercase">Weight & Balance Load Sheet</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cessna 208B Grand Caravan</p>
                        </div>
                    </div>
                    <div className="text-right text-xs font-bold text-slate-600 space-y-1">
                        <div className="bg-white px-3 py-1 border border-slate-300 rounded-md">REG: {flight?.aircraftRegistration || '8R-___'}</div>
                        <div className="bg-white px-3 py-1 border border-slate-300 rounded-md">FLT: {flight?.flightNumber || 'TGY____'}</div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row">
                    <div className="flex-1 p-6 border-r border-slate-200">
                        <table className="w-full">
                            <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-500 border-y border-slate-300">
                                <tr>
                                    <th className="py-2 pl-4 text-left">Load Item</th>
                                    <th className="py-2 w-24 text-right">Weight</th>
                                    <th className="py-2 w-20 text-right">Arm</th>
                                    <th className="py-2 w-24 text-right pr-4">Moment</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                                    <td className="py-2 pl-4">Basic Empty Weight</td>
                                    <td className="p-2 text-right">{basicEmptyWeight}</td>
                                    <td className="p-2 text-right">-</td>
                                    <td className="p-2 text-right">-</td>
                                </tr>
                                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                                    <td className="py-2 pl-4">Crew (Standard)</td>
                                    <td className="p-2 text-right">{wnb.crewWeight}</td>
                                    <td className="p-2 text-right">{arms.crew}</td>
                                    <td className="p-2 text-right">{calcMoment(wnb.crewWeight, arms.crew).toFixed(2)}</td>
                                </tr>
                                <EntryRow label="Seat 2" field="seat2" arm={arms.seat2} />
                                <EntryRow label="Seat 3, 4, 5" field="seat3_5" arm={arms.seat3_5} />
                                <EntryRow label="Seat 6, 7, 8" field="seat6_8" arm={arms.seat6_8} />
                                <EntryRow label="Seat 9, 10, 11" field="seat9_11" arm={arms.seat9_11} />
                                <EntryRow label="Seat 12, 13, 14" field="seat12_14" arm={arms.seat12_14} />
                                <tr><td colSpan={4} className="bg-slate-100 h-1"></td></tr>
                                <EntryRow label="Zone 1 (Cabin)" field="zone1" arm={arms.zone1} />
                                <EntryRow label="Zone 2" field="zone2" arm={arms.zone2} />
                                <EntryRow label="Zone 3" field="zone3" arm={arms.zone3} />
                                <EntryRow label="Zone 4" field="zone4" arm={arms.zone4} />
                                <EntryRow label="Zone 5" field="zone5" arm={arms.zone5} />
                                <EntryRow label="Zone 6" field="zone6" arm={arms.zone6} />
                                <tr><td colSpan={4} className="bg-slate-100 h-1"></td></tr>
                                <EntryRow label="Pod A" field="podA" arm={arms.podA} />
                                <EntryRow label="Pod B" field="podB" arm={arms.podB} />
                                <EntryRow label="Pod C" field="podC" arm={arms.podC} />
                                <EntryRow label="Pod D" field="podD" arm={arms.podD} />
                            </tbody>
                        </table>
                    </div>

                    <div className="w-full lg:w-96 bg-slate-50 p-6 flex flex-col gap-6">
                        <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                            <div className="bg-slate-800 text-white text-xs font-bold uppercase py-2 px-3 text-center tracking-wider">Weight Summary</div>
                            <div className="divide-y divide-slate-100">
                                <div className="flex justify-between p-3"><span className="text-sm text-slate-600 font-bold">Zero Fuel Weight</span><span className={`text-sm font-mono font-bold ${zeroFuelWeight > limits.mzfw ? 'text-red-600' : 'text-slate-900'}`}>{zeroFuelWeight}</span></div>
                                <div className="flex justify-between p-3 bg-blue-50"><span className="text-sm text-blue-800 font-bold">+ Fuel Load</span><span className="text-sm font-mono font-bold text-blue-900">{fuel.totalFob}</span></div>
                                <div className="flex justify-between p-3 bg-slate-100 border-t border-slate-200"><span className="text-sm text-slate-800 font-black">Ramp Weight</span><span className="text-sm font-mono font-black text-slate-900">{rampWeight}</span></div>
                                <div className="flex justify-between p-3"><span className="text-sm text-slate-500 font-medium">- Taxi Fuel</span><span className="text-sm font-mono text-slate-500">{fuel.taxi}</span></div>
                                <div className="flex justify-between p-3 border-t-2 border-slate-200"><span className="text-sm text-slate-800 font-black uppercase">Takeoff Weight</span><div className="text-right"><span className={`block text-lg font-mono font-black ${takeoffWeight > limits.mtow ? 'text-red-600' : 'text-emerald-600'}`}>{takeoffWeight}</span><span className="text-[10px] text-slate-400 font-bold">MAX: {limits.mtow}</span></div></div>
                                <div className="flex justify-between p-3 border-t border-slate-100"><span className="text-sm text-slate-600 font-bold">Landing Weight</span><div className="text-right"><span className={`block text-sm font-mono font-bold ${landingWeight > limits.mlw ? 'text-red-600' : 'text-slate-700'}`}>{landingWeight}</span><span className="text-[10px] text-slate-400 font-bold">MAX: {limits.mlw}</span></div></div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-slate-300 min-h-[200px] relative overflow-hidden">
                            <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 pointer-events-none">
                                {[...Array(36)].map((_, i) => (<div key={i} className="border-r border-b border-slate-100"></div>))}
                            </div>
                            <div className="z-10 text-center">
                                <Activity size={48} className="mx-auto mb-2 opacity-50" />
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">C.G. Envelope</p>
                                <p className="text-[10px] mt-1">Visualization Placeholder</p>
                            </div>
                            <div className="absolute top-[40%] left-[60%] w-3 h-3 bg-red-500 rounded-full shadow-sm z-20 border-2 border-white"></div>
                        </div>

                        <div className="mt-auto space-y-4">
                            <div className="border-b border-slate-400 pb-1"><p className="font-script text-xl text-blue-900 ml-2">Dispatcher</p></div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Loaded By</p>
                            <div className="border-b border-slate-400 pb-1 mt-4"><p className="font-script text-xl text-blue-900 ml-2">{pilot ? pilot.name : ''}</p></div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Captain's Signature</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
