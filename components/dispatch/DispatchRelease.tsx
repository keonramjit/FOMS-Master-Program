
import React from 'react';
import { Flight, Aircraft, DispatchRecord, SystemSettings } from '../../types';
import { FileCheck, AlertOctagon } from 'lucide-react';

interface DispatchReleaseProps {
    flight: Flight;
    dispatchData: Partial<DispatchRecord>;
    currentAircraft?: Aircraft;
    features: SystemSettings;
    onRelease: () => void;
}

export const DispatchRelease: React.FC<DispatchReleaseProps> = ({ flight, dispatchData, currentAircraft, features, onRelease }) => {
    
    // Recalculate basic safety checks
    const totalPaxWeight = (dispatchData.passengers || []).reduce((acc, p) => acc + (p.weight || 0) + (p.freeBagWeight || 0) + (p.excessBagWeight || 0), 0);
    const totalCargoWeight = (dispatchData.cargoItems || []).reduce((acc, c) => acc + (c.weight || 0), 0);
    const payload = totalPaxWeight + totalCargoWeight;
    const zeroFuelWeight = (dispatchData.basicEmptyWeight || 0) + payload;
    const calcFuel = dispatchData.fuel || { taxi: 0, trip: 0, contingency: 0, alternate: 0, holding: 0, totalFob: 0, density: 6.7 };
    const fob = calcFuel.totalFob || 0;
    const takeoffWeight = zeroFuelWeight + fob;
    
    const mtow = currentAircraft?.maxTakeoffWeight || 8750;
    const isOverweight = takeoffWeight > mtow;
    
    const fleetSafetyEnabled = features.enableFleetChecks;
    const isGrounded = currentAircraft?.status === 'Maintenance' || currentAircraft?.status === 'AOG';
    const isDispatchBlocked = fleetSafetyEnabled && isGrounded;

    return (
        <div className="max-w-xl mx-auto mt-10 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isDispatchBlocked ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600'}`}>
                    {isDispatchBlocked ? <AlertOctagon size={40} /> : <FileCheck size={40} />}
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready for Release?</h2>
                <p className="text-slate-500 mb-8">
                    By releasing this flight, you confirm that all weight, fuel, and operational data has been verified and meets regulatory requirements.
                </p>
                
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl text-left text-sm space-y-2 border border-slate-100">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Takeoff Weight</span>
                            <span className={`font-bold font-mono ${isOverweight ? 'text-red-600' : 'text-slate-700'}`}>{takeoffWeight} LBS</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Fuel on Board</span>
                            <span className="font-bold font-mono text-slate-700">{fob} LBS</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">POB</span>
                            <span className="font-bold font-mono text-slate-700">{(dispatchData.passengers?.length || 0) + 2}</span>
                        </div>
                    </div>

                    <button 
                        onClick={onRelease}
                        disabled={isDispatchBlocked}
                        className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all transform flex items-center justify-center gap-2 ${
                            isDispatchBlocked 
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                    >
                        {isDispatchBlocked ? <AlertOctagon size={20} /> : <FileCheck size={20} />}
                        {isDispatchBlocked ? 'DISPATCH BLOCKED' : `RELEASE FLIGHT ${flight.flightNumber}`}
                    </button>
                    {isDispatchBlocked && (
                        <p className="text-xs text-red-600 font-bold">Check fleet status before proceeding.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
