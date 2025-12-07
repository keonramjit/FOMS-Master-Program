
import React from 'react';
import { OpsPlanData, Flight, FuelData, DispatchRecord } from '../../types';

interface DispatchOpsPlanProps {
    opsPlan: OpsPlanData;
    fuel: FuelData;
    flight: Flight;
    onUpdate: (data: Partial<DispatchRecord>) => void;
}

export const DispatchOpsPlan: React.FC<DispatchOpsPlanProps> = ({ opsPlan, fuel, flight, onUpdate }) => {
    
    const updateOpsPlan = (field: keyof OpsPlanData, val: string) => {
        onUpdate({
            opsPlan: { ...opsPlan, [field]: val }
        });
    };

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 pb-12">
            <div className="bg-white shadow-lg border border-slate-300 w-full text-xs text-slate-900 print:border-none print:shadow-none">
                {/* Header Block */}
                <div className="flex border-b-2 border-slate-800">
                    <div className="flex-1 p-2 border-r border-slate-300">
                        <div className="font-bold text-slate-500 uppercase text-[10px]">Date of Flight</div>
                        <div className="font-bold text-lg">{flight.date}</div>
                    </div>
                    <div className="flex-1 p-2 border-r border-slate-300">
                        <div className="font-bold text-slate-500 uppercase text-[10px]">Acft Registration</div>
                        <div className="font-bold text-lg">{flight.aircraftRegistration}</div>
                    </div>
                    <div className="flex-1 p-2 border-r border-slate-300">
                        <div className="font-bold text-slate-500 uppercase text-[10px]">Acft Type</div>
                        <div className="font-bold text-lg">{flight.aircraftType}</div>
                    </div>
                    <div className="flex-1 p-2 bg-slate-50">
                        <div className="font-bold text-slate-500 uppercase text-[10px]">Flight No.</div>
                        <div className="font-bold text-lg">{flight.flightNumber}</div>
                    </div>
                </div>

                {/* Crew & Time Block */}
                <div className="flex border-b border-slate-300">
                    <div className="flex-[2] border-r border-slate-300">
                        <div className="flex border-b border-slate-300">
                            <div className="w-24 p-2 font-bold bg-slate-50 border-r border-slate-200">PILOT:</div>
                            <div className="p-2 font-bold">{flight.pic}</div>
                        </div>
                        <div className="flex border-b border-slate-300">
                            <div className="w-24 p-2 font-bold bg-slate-50 border-r border-slate-200">COPILOT:</div>
                            <div className="p-2 font-bold">{flight.sic || 'NIL'}</div>
                        </div>
                        <div className="flex">
                            <div className="w-24 p-2 font-bold bg-slate-50 border-r border-slate-200">CABIN CREW:</div>
                            <div className="p-2 font-bold">NIL</div>
                        </div>
                    </div>
                    <div className="flex-1 border-r border-slate-300">
                        <div className="flex border-b border-slate-300 h-1/2 items-center">
                            <div className="px-2 font-bold bg-slate-50 h-full flex items-center border-r border-slate-200 w-24">DEPARTURE:</div>
                            <div className="px-2 font-mono font-bold text-lg">{flight.etd}</div>
                        </div>
                        <div className="flex h-1/2 items-center">
                            <div className="px-2 font-bold bg-slate-50 h-full flex items-center border-r border-slate-200 w-24">ARRIVAL:</div>
                            <input 
                                type="time" 
                                className="px-2 font-mono font-bold text-lg outline-none bg-transparent w-full" 
                                value={opsPlan.arrivalTime || ''} 
                                onChange={(e) => updateOpsPlan('arrivalTime', e.target.value)} 
                            />
                        </div>
                    </div>
                </div>

                {/* Route Block */}
                <div className="grid grid-cols-2 border-b border-slate-300">
                    <div className="border-r border-slate-300 p-2">
                        <table className="w-full text-center border-collapse border border-slate-300">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="border border-slate-300 p-1">FROM</th>
                                    <th className="border border-slate-300 p-1">TO</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-slate-300 p-1">
                                        <input 
                                            className="w-full text-center font-bold uppercase outline-none bg-transparent" 
                                            value={opsPlan.depAerodrome} 
                                            onChange={(e) => updateOpsPlan('depAerodrome', e.target.value.toUpperCase())}
                                        />
                                    </td>
                                    <td className="border border-slate-300 p-1">
                                        <input 
                                            className="w-full text-center font-bold uppercase outline-none bg-transparent" 
                                            value={opsPlan.destAerodrome} 
                                            onChange={(e) => updateOpsPlan('destAerodrome', e.target.value.toUpperCase())}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-1 h-6"></td>
                                    <td className="border border-slate-300 p-1 h-6"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="p-2 space-y-2">
                        <div className="flex items-center">
                            <span className="w-32 font-bold text-[10px] uppercase">Destination Aerodrome</span>
                            <input className="border-b border-slate-400 outline-none flex-1 font-mono uppercase bg-transparent" placeholder="DEST" value={opsPlan.destAerodrome} onChange={(e) => updateOpsPlan('destAerodrome', e.target.value)} />
                        </div>
                        <div className="flex items-center">
                            <span className="w-32 font-bold text-[10px] uppercase">Alternate Aerodrome</span>
                            <div className="flex-1 flex gap-2">
                                <div className="flex-1 border border-slate-300 p-1 bg-slate-50 text-center font-bold">
                                    First: <input className="w-12 bg-transparent outline-none uppercase" value={opsPlan.altAerodrome1} onChange={(e) => updateOpsPlan('altAerodrome1', e.target.value)} />
                                </div>
                                <div className="flex-1 border border-slate-300 p-1 bg-slate-50 text-center font-bold">
                                    Second: <input className="w-12 bg-transparent outline-none uppercase" value={opsPlan.altAerodrome2} onChange={(e) => updateOpsPlan('altAerodrome2', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fuel & Ops Type */}
                <div className="flex border-b border-slate-300">
                    <div className="w-48 border-r border-slate-300 p-2 space-y-1">
                        <div className="flex justify-between border-b border-slate-200 pb-1">
                            <span className="font-bold">Gals:</span>
                            <span className="font-mono">{(fuel.totalFob && fuel.density) ? (fuel.totalFob / fuel.density).toFixed(1) : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-bold">Pounds:</span>
                            <span className="font-mono">{fuel.totalFob || 0}</span>
                        </div>
                    </div>
                    <div className="flex-1 border-r border-slate-300 p-2">
                        <div className="font-bold text-[10px] uppercase mb-1">Type of Operation</div>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="opType" checked={opsPlan.typeOfOperation === 'IFR'} onChange={() => updateOpsPlan('typeOfOperation', 'IFR')} /> I.F.R.</label>
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="opType" checked={opsPlan.typeOfOperation === 'VFR'} onChange={() => updateOpsPlan('typeOfOperation', 'VFR')} /> V.F.R.</label>
                        </div>
                    </div>
                    <div className="flex-1 p-2">
                        <div className="font-bold text-[10px] uppercase mb-1">Type of Flight</div>
                        <div className="flex flex-col gap-1">
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="fltType" checked={opsPlan.flightType === 'Schedule'} onChange={() => updateOpsPlan('flightType', 'Schedule')} /> Schedule</label>
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="fltType" checked={opsPlan.flightType === 'Non-Schedule'} onChange={() => updateOpsPlan('flightType', 'Non-Schedule')} /> Non-Schedule</label>
                        </div>
                    </div>
                </div>

                {/* Weather */}
                <div className="border-b border-slate-300">
                    <div className="bg-slate-100 p-1 text-center font-bold text-[10px] border-b border-slate-300">LATEST AVAILABLE WEATHER REPORTS & FORECASTS</div>
                    <div className="flex border-b border-slate-300">
                        <div className="w-24 p-2 font-bold bg-slate-50 border-r border-slate-200 flex items-center">Destination:</div>
                        <textarea className="flex-1 p-2 outline-none resize-none h-16 bg-white" placeholder="METAR/TAF..." value={opsPlan.weatherDest} onChange={(e) => updateOpsPlan('weatherDest', e.target.value)}></textarea>
                    </div>
                    <div className="flex border-b border-slate-300">
                        <div className="w-24 p-2 font-bold bg-slate-50 border-r border-slate-200 flex items-center">Alternate:</div>
                        <textarea className="flex-1 p-2 outline-none resize-none h-16 bg-white" placeholder="METAR/TAF..." value={opsPlan.weatherAlt} onChange={(e) => updateOpsPlan('weatherAlt', e.target.value)}></textarea>
                    </div>
                    <div className="flex">
                        <div className="w-24 p-2 font-bold bg-slate-50 border-r border-slate-200 flex items-center">Add. Info:</div>
                        <textarea className="flex-1 p-2 outline-none resize-none h-12 bg-white" placeholder="NOTAMs / Remarks..." value={opsPlan.additionalWx} onChange={(e) => updateOpsPlan('additionalWx', e.target.value)}></textarea>
                    </div>
                </div>

                {/* Remarks */}
                <div className="border-b border-slate-300 min-h-[100px] p-2">
                    <div className="font-bold text-[10px] uppercase text-center mb-1">REMARKS</div>
                    <textarea className="w-full h-24 outline-none resize-none bg-white font-mono text-xs" placeholder="Operational Remarks..." value={opsPlan.remarks} onChange={(e) => updateOpsPlan('remarks', e.target.value)}></textarea>
                </div>

                {/* Signatures */}
                <div className="flex h-20">
                    <div className="flex-1 border-r border-slate-300 relative">
                        <div className="absolute top-1 left-2 text-[10px] font-bold text-slate-500">PREPARED BY</div>
                        <div className="absolute bottom-2 left-4 w-48 border-b border-slate-400"></div>
                        <div className="absolute bottom-0 left-4 text-[8px] text-slate-400 font-bold uppercase">Signature</div>
                    </div>
                    <div className="flex-1 relative">
                        <div className="absolute top-1 right-2 text-[10px] font-bold text-slate-500">CAPTAIN'S ACCEPTANCE</div>
                        <div className="absolute bottom-2 right-4 w-48 border-b border-slate-400"></div>
                        <div className="absolute bottom-0 right-4 text-[8px] text-slate-400 font-bold uppercase">Signature</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
