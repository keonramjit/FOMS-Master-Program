
import React, { useMemo } from 'react';
import { OpsPlanData, Flight, FuelData, DispatchRecord } from '../../types';
import { Plane, Calendar, Hash, MapPin, Clock, Cloud, FileText, ArrowRight, Wind, UserCheck, PenTool, Droplets } from 'lucide-react';

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

    // Calculate ETA based on ETD + Commercial Time (or Flight Time)
    const eta = useMemo(() => {
        if (!flight.etd) return '--:--';
        
        const [h, m] = flight.etd.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return '--:--';

        let durationMinutes = 0;
        
        // Prioritize Commercial Time format "H:MM"
        if (flight.commercialTime && flight.commercialTime.includes(':')) {
            const [ch, cm] = flight.commercialTime.split(':').map(Number);
            durationMinutes = (ch * 60) + cm;
        } 
        // Fallback to Flight Time (decimal hours)
        else if (flight.flightTime) {
            durationMinutes = Math.round(flight.flightTime * 60);
        }

        const totalMinutes = (h * 60) + m + durationMinutes;
        const arrH = Math.floor(totalMinutes / 60) % 24;
        const arrM = totalMinutes % 60;

        return `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;
    }, [flight.etd, flight.commercialTime, flight.flightTime]);

    const fuelGallons = fuel.totalFob ? (fuel.totalFob / 6.7).toFixed(1) : '0.0';

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 pb-12">
            {/* Main Card */}
            <div className="bg-white shadow-xl rounded-2xl border border-slate-200 overflow-hidden">
                
                {/* Header - Flight Info */}
                <div className="bg-blue-950 text-white p-5 border-b-4 border-blue-600">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                                <Plane size={24} className="text-blue-300 transform -rotate-45" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                                    {flight.flightNumber}
                                </h2>
                                <div className="flex items-center gap-3 text-blue-200 text-xs font-medium uppercase tracking-wider">
                                    <span className="flex items-center gap-1"><Calendar size={12}/> {flight.date}</span>
                                    <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                                    <span>{flight.aircraftRegistration} ({flight.aircraftType})</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-6 bg-blue-900/50 px-6 py-3 rounded-lg border border-blue-800">
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">PIC</div>
                                <div className="font-bold">{flight.pic || '---'}</div>
                            </div>
                            <div className="w-px h-8 bg-blue-800"></div>
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">SIC</div>
                                <div className="font-bold">{flight.sic || '---'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Operations Body */}
                <div className="p-8 space-y-10">
                    
                    {/* CENTER STAGE: ROUTE & TIME */}
                    <div className="relative py-6">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-20 right-20 h-0.5 bg-slate-200 -z-10 hidden md:block transform -translate-y-4"></div>
                        
                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-0">
                            
                            {/* DEPARTURE */}
                            <div className="text-center group">
                                <div className="bg-white px-4 relative z-10">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Departure</label>
                                    <input 
                                        className="text-5xl font-black text-slate-900 w-32 text-center uppercase bg-transparent outline-none placeholder:text-slate-200 focus:text-blue-700 transition-colors"
                                        value={opsPlan.depAerodrome}
                                        onChange={e => updateOpsPlan('depAerodrome', e.target.value.toUpperCase())}
                                        placeholder="DEP"
                                    />
                                </div>
                                <div className="mt-2 inline-flex flex-col items-center">
                                    <div className="text-xs font-bold text-slate-500 uppercase bg-slate-100 px-3 py-1 rounded-full mb-1">STD</div>
                                    <div className="text-2xl font-mono font-bold text-slate-700">{flight.etd}</div>
                                </div>
                            </div>

                            {/* CENTER ICON */}
                            <div className="bg-blue-50 p-4 rounded-full border-4 border-white shadow-lg z-10 transform transition-transform hover:scale-110 hover:rotate-12 duration-500">
                                <Plane size={32} className="text-blue-600 fill-blue-600" />
                            </div>

                            {/* ARRIVAL */}
                            <div className="text-center group">
                                <div className="bg-white px-4 relative z-10">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Destination</label>
                                    <input 
                                        className="text-5xl font-black text-slate-900 w-32 text-center uppercase bg-transparent outline-none placeholder:text-slate-200 focus:text-blue-700 transition-colors"
                                        value={opsPlan.destAerodrome}
                                        onChange={e => updateOpsPlan('destAerodrome', e.target.value.toUpperCase())}
                                        placeholder="ARR"
                                    />
                                </div>
                                <div className="mt-2 inline-flex flex-col items-center">
                                    <div className="text-xs font-bold text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full mb-1">ETA</div>
                                    <div className="text-2xl font-mono font-bold text-blue-700">{eta}</div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Secondary Info Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: Alternates & Types */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase pl-1">Alternate 1</label>
                                <div className="relative">
                                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input 
                                        className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 font-bold uppercase text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 shadow-sm"
                                        value={opsPlan.altAerodrome1}
                                        onChange={e => updateOpsPlan('altAerodrome1', e.target.value.toUpperCase())}
                                        placeholder="----"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase pl-1">Alternate 2</label>
                                <div className="relative">
                                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input 
                                        className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 font-bold uppercase text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 shadow-sm"
                                        value={opsPlan.altAerodrome2}
                                        onChange={e => updateOpsPlan('altAerodrome2', e.target.value.toUpperCase())}
                                        placeholder="----"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase pl-1">Operation Type</label>
                                <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                                    {['VFR', 'IFR'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => updateOpsPlan('typeOfOperation', type)}
                                            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                                                opsPlan.typeOfOperation === type 
                                                ? 'bg-blue-600 text-white shadow-sm' 
                                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase pl-1">Category</label>
                                <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                                    {['Schedule', 'Non-Sched'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => updateOpsPlan('flightType', type)}
                                            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                                                opsPlan.flightType === type 
                                                ? 'bg-indigo-600 text-white shadow-sm' 
                                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right: Fuel Card */}
                        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg border border-blue-500 relative overflow-hidden flex flex-col justify-center">
                            <div className="absolute top-0 right-0 p-10 bg-white/5 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                            
                            <div className="flex items-center gap-2 mb-6 relative z-10">
                                <div className="bg-white/20 p-2 rounded-lg">
                                    <Droplets size={20} className="text-blue-100" />
                                </div>
                                <span className="font-bold text-blue-100 uppercase tracking-wider text-sm">Fuel on Board</span>
                            </div>

                            <div className="flex justify-between items-end relative z-10">
                                <div>
                                    <div className="text-5xl font-black tracking-tighter text-white">
                                        {fuel.totalFob}
                                    </div>
                                    <div className="text-blue-200 text-xs font-bold uppercase tracking-widest mt-1">Pounds (LBS)</div>
                                </div>
                                <div className="h-12 w-px bg-blue-400/50 mx-4"></div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold tracking-tight text-white/90">
                                        {fuelGallons}
                                    </div>
                                    <div className="text-blue-200 text-xs font-bold uppercase tracking-widest mt-1">Gallons (GAL)</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Weather Section */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Cloud size={18} className="text-blue-500"/> Weather Briefing
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="relative group">
                                <span className="absolute top-3 left-3 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 z-10 group-focus-within:border-blue-300 transition-colors">DESTINATION METAR/TAF</span>
                                <textarea 
                                    className="w-full bg-white border border-slate-200 rounded-xl p-4 pt-10 text-sm font-mono text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none h-32 shadow-sm"
                                    placeholder="Enter METAR/TAF data..."
                                    value={opsPlan.weatherDest}
                                    onChange={e => updateOpsPlan('weatherDest', e.target.value)}
                                />
                            </div>
                            <div className="relative group">
                                <span className="absolute top-3 left-3 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 z-10 group-focus-within:bg-blue-50 group-focus-within:text-blue-600 transition-colors">ALTERNATE METAR/TAF</span>
                                <textarea 
                                    className="w-full bg-white border border-slate-200 rounded-xl p-4 pt-10 text-sm font-mono text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none h-32 shadow-sm"
                                    placeholder="Enter Alternate Weather..."
                                    value={opsPlan.weatherAlt}
                                    onChange={e => updateOpsPlan('weatherAlt', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Remarks Section */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <FileText size={18} className="text-slate-500"/> Dispatch Remarks
                        </h4>
                        <textarea 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-24 shadow-inner"
                            placeholder="Operational notes, NOTAMs, ATC restrictions..."
                            value={opsPlan.remarks}
                            onChange={e => updateOpsPlan('remarks', e.target.value)}
                        />
                    </div>

                    {/* Professional Signature Block */}
                    <div className="pt-8 mt-4 border-t border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            
                            {/* Dispatcher Sig */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                        <UserCheck size={14}/> Dispatcher Release
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">{new Date().toLocaleDateString()}</span>
                                </div>
                                <div className="h-28 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center text-slate-400 group hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer relative">
                                    <span className="text-xs font-bold uppercase tracking-widest opacity-50 group-hover:opacity-100 transition-opacity">Dispatcher Sign Here</span>
                                </div>
                                <div className="text-xs text-slate-500 font-medium">
                                    I certify that the flight has been planned in accordance with regulations.
                                </div>
                            </div>

                            {/* Captain Sig */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                        <PenTool size={14}/> Captain Acceptance
                                    </span>
                                </div>
                                <div className="h-28 border-2 border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center text-slate-300 group hover:border-slate-400 transition-colors cursor-pointer">
                                    <span className="text-xs font-bold uppercase tracking-widest opacity-50 group-hover:opacity-100 transition-opacity">Captain Sign Here</span>
                                </div>
                                <div className="text-xs text-slate-500 font-medium">
                                    I accept this operational flight plan and the load sheet data provided.
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
