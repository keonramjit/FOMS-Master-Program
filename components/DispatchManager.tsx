
import React, { useState, useEffect } from 'react';
import { Flight, Aircraft, DispatchRecord, CrewMember, SystemSettings, WnBData } from '../types';
import { subscribeToDispatch, saveDispatchRecord, updateFlight } from '../services/firebase';
import { ClipboardList, Save, Plane, Printer, Info, Briefcase, Fuel, Scale, ScrollText, Bomb, CloudSun, FileCheck, User, Clock, ArrowRight, Wind } from 'lucide-react';
import { FeatureGate } from './FeatureGate';
import { CalendarWidget } from './CalendarWidget';
import { Tab, Card } from './dispatch/Shared';
import { DispatchPayload } from './dispatch/DispatchPayload';
import { DispatchFuel } from './dispatch/DispatchFuel';
import { DispatchWnB } from './dispatch/DispatchWnB';
import { DispatchOpsPlan } from './dispatch/DispatchOpsPlan';
import { DispatchNotoc } from './dispatch/DispatchNotoc';
import { DispatchRelease } from './dispatch/DispatchRelease';

interface DispatchManagerProps {
  flights: Flight[];
  fleet: Aircraft[];
  crew: (CrewMember & { _docId?: string })[];
  currentDate: string;
  isEnabled: boolean;
  onDateChange: (date: string) => void;
  features: SystemSettings;
}

type TabType = 'overview' | 'payload' | 'fuel' | 'weight' | 'weather' | 'opsplan' | 'notoc' | 'release';

const INITIAL_WNB: WnBData = {
    seat2: 0, seat3_5: 0, seat6_8: 0, seat9_11: 0, seat12_14: 0,
    zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0, zone6: 0,
    podA: 0, podB: 0, podC: 0, podD: 0,
    crewWeight: 0, extraEquipment: 0
};

export const DispatchManager: React.FC<DispatchManagerProps> = ({ flights, fleet, crew, currentDate, isEnabled, onDateChange, features }) => {
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isSaving, setIsSaving] = useState(false);
  
  const [dispatchData, setDispatchData] = useState<Partial<DispatchRecord>>({});

  // Calculations for Release & Summary
  const currentAircraft = fleet.find(a => a.registration === selectedFlight?.aircraftRegistration);
  
  const totalPaxWeight = (dispatchData.passengers || []).reduce((acc, p) => acc + (p.weight || 0) + (p.freeBagWeight || 0) + (p.excessBagWeight || 0), 0);
  const totalCargoWeight = (dispatchData.cargoItems || []).reduce((acc, c) => acc + (c.weight || 0), 0);
  const payload = totalPaxWeight + totalCargoWeight;
  const zeroFuelWeight = (dispatchData.basicEmptyWeight || 0) + payload;
  const calcFuel = dispatchData.fuel || { taxi: 0, trip: 0, contingency: 0, alternate: 0, holding: 0, totalFob: 0 };
  const totalFuelReq = calcFuel.taxi + calcFuel.trip + calcFuel.contingency + calcFuel.alternate + calcFuel.holding;
  const fob = calcFuel.totalFob || totalFuelReq;
  const takeoffWeight = zeroFuelWeight + fob;
  const landingWeight = takeoffWeight - (calcFuel.trip || 0);
  const isReleased = dispatchData.status === 'Released';
  const isOverweight = currentAircraft && (takeoffWeight > (currentAircraft.maxTakeoffWeight || 99999));

  const dispatchableFlights = flights
    .filter(f => f.date === currentDate && ['Scheduled', 'Delayed', 'Outbound', 'On Ground'].includes(f.status))
    .sort((a, b) => (a.etd || '').localeCompare(b.etd || ''));

  useEffect(() => {
    if (selectedFlight) {
        const aircraft = fleet.find(a => a.registration === selectedFlight.aircraftRegistration);
        
        const unsubscribe = subscribeToDispatch(selectedFlight.id, (data) => {
            const routeParts = selectedFlight.route.includes('-') ? selectedFlight.route.split('-') : [selectedFlight.route, ''];
            
            if (data) {
                setDispatchData({
                    ...data,
                    opsPlan: {
                        typeOfOperation: 'VFR',
                        flightType: 'Schedule',
                        weatherDest: '',
                        weatherAlt: '',
                        additionalWx: '',
                        remarks: '',
                        depAerodrome: routeParts[0] || '',
                        destAerodrome: routeParts[1] || '',
                        arrivalTime: '',
                        altAerodrome1: '',
                        altAerodrome2: '',
                        ...(data.opsPlan || {})
                    },
                    wnb: { ...INITIAL_WNB, ...(data.wnb || {}) },
                    notoc: {
                        dangerousGoods: [],
                        specialLoads: [],
                        ...(data.notoc || {})
                    }
                });
            } else {
                setDispatchData({
                    status: 'Draft',
                    passengers: [],
                    cargoItems: [],
                    dangerousGoods: { hasDG: false },
                    fuel: { taxi: 50, trip: 600, contingency: 50, alternate: 200, holding: 150, totalFob: 1050, density: 6.7 },
                    basicEmptyWeight: aircraft?.basicEmptyWeight || 5000,
                    filedRoute: selectedFlight.route,
                    cruisingAltitude: '085',
                    tas: aircraft?.type === '1900D' ? 270 : 165,
                    endurance: '03:00',
                    opsPlan: {
                        typeOfOperation: 'VFR',
                        flightType: 'Schedule',
                        weatherDest: '',
                        weatherAlt: '',
                        additionalWx: '',
                        remarks: '',
                        depAerodrome: routeParts[0] || '',
                        destAerodrome: routeParts[1] || '',
                        arrivalTime: '',
                        altAerodrome1: '',
                        altAerodrome2: ''
                    },
                    wnb: INITIAL_WNB,
                    notoc: {
                        dangerousGoods: [],
                        specialLoads: []
                    }
                });
            }
        });
        return unsubscribe;
    } else {
        setDispatchData({});
    }
  }, [selectedFlight, fleet]);

  const handleUpdate = (data: Partial<DispatchRecord>) => {
      setDispatchData(prev => ({ ...prev, ...data }));
  };

  const handleSaveDraft = async () => {
    if (!selectedFlight) return;
    setIsSaving(true);
    try {
        await saveDispatchRecord(selectedFlight.id, {
            ...dispatchData,
            zeroFuelWeight,
            takeoffWeight,
            landingWeight,
            pob: (dispatchData.passengers?.length || 0) + 2,
            status: dispatchData.status || 'Draft'
        } as DispatchRecord);
    } catch (e) {
        console.error("Error saving draft", e);
        alert("Failed to save changes.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleReleaseFlight = async () => {
    if (!selectedFlight) return;
    try {
        await saveDispatchRecord(selectedFlight.id, {
            ...dispatchData,
            zeroFuelWeight,
            takeoffWeight,
            landingWeight,
            pob: (dispatchData.passengers?.length || 0) + 2, 
            status: 'Released',
            releasedBy: 'Admin', 
            releasedAt: new Date().toISOString()
        } as DispatchRecord);
        
        if (selectedFlight.status === 'Scheduled') {
            await updateFlight(selectedFlight.id, { status: 'Outbound' });
        }
        alert("Flight Released Successfully!");
    } catch (e) {
        alert("Error releasing flight.");
    }
  };

  const handlePrint = async () => {
      if(selectedFlight && dispatchData) {
          try {
            const { generateDispatchPack } = await import('../services/pdfService');
            generateDispatchPack(selectedFlight, { ...dispatchData, takeoffWeight, zeroFuelWeight, landingWeight } as DispatchRecord, currentAircraft);
          } catch (e) {
            console.error("Failed to load PDF service", e);
            alert("PDF generation unavailable offline or failed to load.");
          }
      }
  };

  return (
    <FeatureGate isEnabled={isEnabled}>
        <div className="flex h-full bg-slate-50 relative overflow-hidden">
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col z-10 shadow-xl shadow-slate-200/50">
                <div className="p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
                            <Plane size={16} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900 leading-tight">Dispatch Queue</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Flights</p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <CalendarWidget selectedDate={currentDate} onDateSelect={onDateChange} />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
                    {dispatchableFlights.length === 0 ? (
                        <div className="text-center py-10 px-4 text-slate-400">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Plane size={20} className="opacity-30" />
                            </div>
                            <p className="text-sm font-medium">No flights scheduled for dispatch.</p>
                        </div>
                    ) : (
                        dispatchableFlights.map(flight => {
                            const isSelected = selectedFlight?.id === flight.id;
                            const routeParts = flight.route.split('-');
                            
                            return (
                                <button
                                    key={flight.id}
                                    onClick={() => { setSelectedFlight(flight); setActiveTab('overview'); }}
                                    className={`
                                        w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden
                                        ${isSelected 
                                            ? 'bg-white border-blue-500 ring-1 ring-blue-500 shadow-md z-10' 
                                            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                                        }
                                    `}
                                >
                                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}

                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <span className={`block text-sm font-black tracking-tight ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                                                {flight.flightNumber}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {flight.aircraftType}
                                            </span>
                                        </div>
                                        <div className={`text-xs font-mono font-bold px-2 py-1 rounded-md flex items-center gap-1.5 ${isSelected ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                            <Clock size={12} />
                                            {flight.etd}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{routeParts[0]}</span>
                                            <ArrowRight size={10} className="text-slate-400" />
                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{routeParts[1]}</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                            {flight.aircraftRegistration}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                        <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                                            flight.status === 'Outbound' ? 'text-blue-600' : 
                                            flight.status === 'Delayed' ? 'text-amber-600' : 
                                            'text-slate-500'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                flight.status === 'Outbound' ? 'bg-blue-500 animate-pulse' : 
                                                flight.status === 'Delayed' ? 'bg-amber-500' : 
                                                'bg-slate-400'
                                            }`}></span>
                                            {flight.status}
                                        </div>
                                        {flight.pic && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                <User size={10} />
                                                {flight.pic}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                {selectedFlight ? (
                    <>
                        <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex justify-between items-center">
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <ClipboardList className="text-blue-600" size={24} />
                                    Dispatch Workspace
                                </h1>
                                <div className="flex gap-4 text-sm text-slate-500 mt-1 font-mono">
                                    <span>FLT: {selectedFlight.flightNumber}</span>
                                    <span>REG: {selectedFlight.aircraftRegistration}</span>
                                    <span>PIC: {selectedFlight.pic}</span>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {isReleased && (
                                    <button onClick={handlePrint} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 flex items-center gap-2">
                                        <Printer size={16} /> Documents
                                    </button>
                                )}

                                <button 
                                    onClick={handleSaveDraft}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all"
                                >
                                    <Save size={16} className={isSaving ? 'animate-spin' : ''} />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                                
                                <div className={`px-4 py-2 rounded-lg font-bold border ${isReleased ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                    STATUS: {isReleased ? 'RELEASED' : 'DRAFT'}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border-b border-slate-200 flex overflow-x-auto">
                            <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Info size={16}/>} label="Overview" />
                            <Tab active={activeTab === 'payload'} onClick={() => setActiveTab('payload')} icon={<Briefcase size={16}/>} label="Payload" />
                            <Tab active={activeTab === 'fuel'} onClick={() => setActiveTab('fuel')} icon={<Fuel size={16}/>} label="Fuel" />
                            <Tab active={activeTab === 'weight'} onClick={() => setActiveTab('weight')} icon={<Scale size={16}/>} label="W&B" warning={!!isOverweight} />
                            <Tab active={activeTab === 'opsplan'} onClick={() => setActiveTab('opsplan')} icon={<ScrollText size={16}/>} label="Ops FPL" />
                            <Tab active={activeTab === 'notoc'} onClick={() => setActiveTab('notoc')} icon={<Bomb size={16}/>} label="NOTOC" warning={dispatchData.notoc?.dangerousGoods?.length ? true : false} />
                            <Tab active={activeTab === 'weather'} onClick={() => setActiveTab('weather')} icon={<CloudSun size={16}/>} label="Wx" />
                            <Tab active={activeTab === 'release'} onClick={() => setActiveTab('release')} icon={<FileCheck size={16}/>} label="Release" />
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                            
                            {activeTab === 'overview' && (
                                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
                                    <Card title="Flight Context" icon={<Plane className="text-blue-500" />}>
                                        <div className="space-y-3">
                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-slate-500">Route</span>
                                                <span className="font-bold text-slate-900">{selectedFlight.route}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-slate-500">STD (Local)</span>
                                                <span className="font-bold text-slate-900">{selectedFlight.etd}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-slate-500">Customer</span>
                                                <span className="font-bold text-slate-900">{selectedFlight.customer}</span>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {activeTab === 'payload' && (
                                <DispatchPayload 
                                    passengers={dispatchData.passengers || []} 
                                    cargoItems={dispatchData.cargoItems || []} 
                                    basicEmptyWeight={dispatchData.basicEmptyWeight || 0}
                                    onUpdate={handleUpdate}
                                    routeParts={selectedFlight.route.split('-')}
                                />
                            )}
                            
                            {activeTab === 'fuel' && (
                                <DispatchFuel 
                                    fuel={dispatchData.fuel || { taxi: 50, trip: 600, contingency: 100, alternate: 200, holding: 150, totalFob: 1100, density: 6.7 }} 
                                    onUpdate={handleUpdate}
                                />
                            )}

                            {activeTab === 'weight' && (
                                <DispatchWnB 
                                    wnb={dispatchData.wnb || INITIAL_WNB} 
                                    fuel={dispatchData.fuel || { taxi: 0, trip: 0, contingency: 0, alternate: 0, holding: 0, totalFob: 0, density: 6.7 }}
                                    passengers={dispatchData.passengers || []}
                                    basicEmptyWeight={dispatchData.basicEmptyWeight || 0}
                                    flight={selectedFlight}
                                    crew={crew}
                                    limits={{ mtow: currentAircraft?.maxTakeoffWeight || 8750, mlw: currentAircraft?.maxLandingWeight || 8500, mzfw: currentAircraft?.maxZeroFuelWeight || 7500 }}
                                    onUpdate={handleUpdate}
                                />
                            )}

                            {activeTab === 'opsplan' && (
                                <DispatchOpsPlan 
                                    opsPlan={dispatchData.opsPlan || {}}
                                    fuel={dispatchData.fuel || { taxi: 0, trip: 0, contingency: 0, alternate: 0, holding: 0, totalFob: 0, density: 6.7 }}
                                    flight={selectedFlight}
                                    onUpdate={handleUpdate}
                                />
                            )}

                            {activeTab === 'notoc' && (
                                <DispatchNotoc 
                                    notoc={dispatchData.notoc || { dangerousGoods: [], specialLoads: [] }}
                                    onUpdate={handleUpdate}
                                />
                            )}

                            {activeTab === 'weather' && (
                                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Wind size={40} className="text-blue-500" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Weather Radar Coming Soon</h2>
                                        <p className="text-slate-500">
                                            Windy.com integration is currently in development.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'release' && (
                                <DispatchRelease 
                                    flight={selectedFlight}
                                    dispatchData={dispatchData}
                                    currentAircraft={currentAircraft}
                                    features={features}
                                    onRelease={handleReleaseFlight}
                                />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <Plane size={48} className="opacity-20" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-600">No Flight Selected</h2>
                        <p className="max-w-xs text-center mt-2">Select a flight from the sidebar to begin dispatch procedures.</p>
                    </div>
                )}
            </div>
        </div>
    </FeatureGate>
  );
};
