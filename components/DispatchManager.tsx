
import React, { useState, useEffect } from 'react';
import { Flight, Aircraft, DispatchRecord, Passenger, CargoItem, DangerousGoods, FuelData, CrewMember, OpsPlanData, WnBData, NotocItem, SpecialLoadItem, NotocData, SystemSettings } from '../types';
import { subscribeToDispatch, saveDispatchRecord, updateFlight } from '../services/firebase';
import { ClipboardList, Scale, CheckCircle2, AlertTriangle, User, Briefcase, Plus, Trash2, Save, Plane, Fuel, FileCheck, Info, Gauge, Printer, CloudSun, Package, Edit2, X, ScrollText, MapPin, ArrowRight, Wind, Calendar, Clock, ArrowDown, Activity, Bomb, FileWarning, AlertOctagon } from 'lucide-react';
import { FeatureGate } from './FeatureGate';
import { CalendarWidget } from './CalendarWidget';

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

const Tab: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; warning?: boolean }> = ({ active, onClick, icon, label, warning }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${active ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'} ${warning ? 'text-red-500' : ''}`}>
        {icon} {label} {warning && <AlertTriangle size={14} className="text-red-500"/>}
    </button>
);

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4 font-bold text-slate-800 border-b border-slate-50 pb-2">
            {icon} {title}
        </div>
        {children}
    </div>
);

const OpsBox: React.FC<{ label: string, children?: React.ReactNode, className?: string, valueClassName?: string }> = ({ label, children, className = "", valueClassName = "" }) => (
    <div className={`p-4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center transition-all ${className}`}>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">{label}</span>
        <div className={`text-sm font-bold text-slate-800 w-full ${valueClassName}`}>{children}</div>
    </div>
);

export const DispatchManager: React.FC<DispatchManagerProps> = ({ flights, fleet, crew, currentDate, isEnabled, onDateChange, features }) => {
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [dispatchData, setDispatchData] = useState<Partial<DispatchRecord>>({
    status: 'Draft',
    passengers: [],
    cargoItems: [],
    dangerousGoods: { hasDG: false },
    fuel: { taxi: 50, trip: 600, contingency: 100, alternate: 200, holding: 150, totalFob: 1100, density: 6.7 },
    basicEmptyWeight: 0,
    filedRoute: '',
    cruisingAltitude: '085',
    tas: 165,
    endurance: '03:00',
    opsPlan: {
        typeOfOperation: 'VFR',
        flightType: 'Schedule',
        weatherDest: '',
        weatherAlt: '',
        additionalWx: '',
        remarks: ''
    },
    wnb: INITIAL_WNB,
    notoc: {
        dangerousGoods: [],
        specialLoads: []
    }
  });

  const [editingPaxId, setEditingPaxId] = useState<string | null>(null);
  const [newPax, setNewPax] = useState<Partial<Passenger>>({ 
      lastName: '', firstName: '', isInfant: false,
      departure: '', arrival: '', gender: 'M', nationality: 'Guyanese',
      weight: 175, seatNumber: '', freeBagWeight: 20, excessBagWeight: 0,
      bagTag: '', ticketNumber: '', passportNumber: '', receiptNumber: ''
  });

  const [newCargo, setNewCargo] = useState<Partial<CargoItem>>({ 
      consignor: '', consignee: '', destination: '', 
      description: '', pieces: 1, weight: 0 
  });

  const [newNotocItem, setNewNotocItem] = useState<Partial<NotocItem>>({
      stationOfUnloading: '', airWaybillNumber: '', properShippingName: '', classDivision: '', 
      unNumber: '', subRisk: '', noOfPackages: 1, netQuantity: '', packingInst: '', 
      packingGroup: '', code: '', cao: false, ergCode: '', location: ''
  });
  
  // Updated for Other Special Load
  const [newSpecialLoad, setNewSpecialLoad] = useState<Partial<SpecialLoadItem>>({
      stationOfUnloading: '', airWaybillNumber: '', description: '', 
      noOfPackages: 1, quantity: '', supplementaryInfo: '', 
      code: '', uldId: '', loadingPosition: ''
  });

  const dispatchableFlights = flights
    .filter(f => f.date === currentDate && ['Scheduled', 'Delayed', 'Outbound', 'On Ground'].includes(f.status))
    .sort((a, b) => (a.etd || '').localeCompare(b.etd || ''));

  useEffect(() => {
    if (selectedFlight) {
        setLoading(true);
        const aircraft = fleet.find(a => a.registration === selectedFlight.aircraftRegistration);
        
        const unsubscribe = subscribeToDispatch(selectedFlight.id, (data) => {
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
                        remarks: ''
                    },
                    wnb: INITIAL_WNB,
                    notoc: {
                        dangerousGoods: [],
                        specialLoads: []
                    }
                });
            }
            const routeParts = selectedFlight.route.includes('-') ? selectedFlight.route.split('-') : [selectedFlight.route, ''];
            setNewPax({
                lastName: '', firstName: '', isInfant: false,
                departure: routeParts[0],
                arrival: routeParts[1],
                gender: 'M', nationality: 'Guyanese',
                weight: 175, seatNumber: '', freeBagWeight: 20, excessBagWeight: 0,
                bagTag: '', ticketNumber: '', passportNumber: '', receiptNumber: ''
            });
            setEditingPaxId(null);
            setNewCargo(prev => ({ ...prev, destination: routeParts[1] }));
            setNewNotocItem({ 
                stationOfUnloading: '', airWaybillNumber: '', properShippingName: '', classDivision: '', 
                unNumber: '', subRisk: '', noOfPackages: 1, netQuantity: '', packingInst: '', 
                packingGroup: '', code: '', cao: false, ergCode: '', location: '' 
            });
            setNewSpecialLoad({ 
                stationOfUnloading: '', airWaybillNumber: '', description: '', 
                noOfPackages: 1, quantity: '', supplementaryInfo: '', 
                code: '', uldId: '', loadingPosition: '' 
            });
            
            setLoading(false);
        });
        return unsubscribe;
    } else {
        setDispatchData({});
    }
  }, [selectedFlight, fleet]);

  const currentAircraft = fleet.find(a => a.registration === selectedFlight?.aircraftRegistration);
  
  // Fleet Safety Logic
  const fleetSafetyEnabled = features.enableFleetChecks;
  const isGrounded = currentAircraft?.status === 'Maintenance' || currentAircraft?.status === 'AOG';
  const isDispatchBlocked = fleetSafetyEnabled && isGrounded;
  
  const totalPaxWeight = (dispatchData.passengers || []).reduce((acc, p) => acc + (p.weight || 0) + (p.freeBagWeight || 0) + (p.excessBagWeight || 0), 0);
  const totalCargoWeight = (dispatchData.cargoItems || []).reduce((acc, c) => acc + (c.weight || 0), 0);
  const payload = totalPaxWeight + totalCargoWeight;
  const zeroFuelWeight = (dispatchData.basicEmptyWeight || 0) + payload;
  
  const calcFuel = dispatchData.fuel || { taxi: 0, trip: 0, contingency: 0, alternate: 0, holding: 0, totalFob: 0, density: 6.7 };
  const totalFuelReq = calcFuel.taxi + calcFuel.trip + calcFuel.contingency + calcFuel.alternate + calcFuel.holding;
  const fob = calcFuel.totalFob || totalFuelReq;
  
  const takeoffWeight = zeroFuelWeight + fob;
  const landingWeight = takeoffWeight - (calcFuel.trip || 0);

  const mtow = currentAircraft?.maxTakeoffWeight || 8750;
  const mlw = currentAircraft?.maxLandingWeight || 8500;
  const mzfw = currentAircraft?.maxZeroFuelWeight || 7500;

  const isOverweight = takeoffWeight > mtow || landingWeight > mlw || zeroFuelWeight > mzfw;
  const isReleased = dispatchData.status === 'Released';

  const getCrewName = (code: string) => {
      const c = crew.find(member => member.code === code);
      return c ? c.name : code;
  };

  const handleEditPax = (pax: Passenger) => {
    setNewPax(pax);
    setEditingPaxId(pax.id);
  };

  const handleCancelEdit = () => {
    setEditingPaxId(null);
    const routeParts = selectedFlight?.route.split('-') || ['', ''];
    setNewPax({
        lastName: '', firstName: '', isInfant: false,
        departure: routeParts[0],
        arrival: routeParts[1],
        gender: 'M', nationality: 'Guyanese',
        weight: 175, seatNumber: '', freeBagWeight: 20, excessBagWeight: 0,
        bagTag: '', ticketNumber: '', passportNumber: '', receiptNumber: ''
    });
  };

  const handleSavePax = () => {
    if (!newPax.lastName || !newPax.firstName) return;

    if (editingPaxId) {
        setDispatchData(prev => ({
            ...prev,
            passengers: prev.passengers?.map(p => 
                p.id === editingPaxId ? { ...newPax, id: editingPaxId } as Passenger : p
            )
        }));
        setEditingPaxId(null);
    } else {
        setDispatchData(prev => ({
            ...prev,
            passengers: [...(prev.passengers || []), { ...newPax, id: Date.now().toString() } as Passenger]
        }));
    }
    
    setNewPax(prev => ({ 
        ...prev, 
        lastName: '', firstName: '', isInfant: false,
        seatNumber: '', bagTag: '', passportNumber: '', ticketNumber: '', receiptNumber: '',
        weight: 175, freeBagWeight: 20, excessBagWeight: 0
    }));
  };

  const handleDeletePax = (id: string) => {
    if (editingPaxId === id) handleCancelEdit();
    setDispatchData(prev => ({...prev, passengers: prev.passengers?.filter(x => x.id !== id)}));
  };

  const handleAddCargo = () => {
    if (!newCargo.destination) return;
    setDispatchData(prev => ({
        ...prev,
        cargoItems: [...(prev.cargoItems || []), { ...newCargo, id: Date.now().toString() } as CargoItem]
    }));
    setNewCargo(prev => ({ 
        ...prev, 
        consignor: '', consignee: '', 
        description: '', pieces: 1, weight: 0 
    }));
  };

  const handleAddNotocItem = () => {
      if (!newNotocItem.unNumber || !newNotocItem.properShippingName) return;
      setDispatchData(prev => {
          const currentNotoc = prev.notoc || { dangerousGoods: [], specialLoads: [] };
          return {
              ...prev,
              notoc: {
                  ...currentNotoc,
                  dangerousGoods: [...currentNotoc.dangerousGoods, { ...newNotocItem, id: Date.now().toString() } as NotocItem]
              }
          };
      });
      setNewNotocItem({ 
          stationOfUnloading: '', airWaybillNumber: '', properShippingName: '', classDivision: '', 
          unNumber: '', subRisk: '', noOfPackages: 1, netQuantity: '', packingInst: '', 
          packingGroup: '', code: '', cao: false, ergCode: '', location: '' 
      });
  };

  const handleDeleteNotocItem = (id: string) => {
      setDispatchData(prev => {
          const currentNotoc = prev.notoc || { dangerousGoods: [], specialLoads: [] };
          return {
              ...prev,
              notoc: {
                  ...currentNotoc,
                  dangerousGoods: currentNotoc.dangerousGoods.filter(item => item.id !== id)
              }
          };
      });
  };

  const handleAddSpecialLoad = () => {
      if (!newSpecialLoad.description) return;
      setDispatchData(prev => {
          const currentNotoc = prev.notoc || { dangerousGoods: [], specialLoads: [] };
          return {
              ...prev,
              notoc: {
                  ...currentNotoc,
                  specialLoads: [...currentNotoc.specialLoads, { ...newSpecialLoad, id: Date.now().toString() } as SpecialLoadItem]
              }
          };
      });
      setNewSpecialLoad({ 
          stationOfUnloading: '', airWaybillNumber: '', description: '', 
          noOfPackages: 1, quantity: '', supplementaryInfo: '', 
          code: '', uldId: '', loadingPosition: '' 
      });
  };

  const handleDeleteSpecialLoad = (id: string) => {
      setDispatchData(prev => {
          const currentNotoc = prev.notoc || { dangerousGoods: [], specialLoads: [] };
          return {
              ...prev,
              notoc: {
                  ...currentNotoc,
                  specialLoads: currentNotoc.specialLoads.filter(item => item.id !== id)
              }
          };
      });
  };

  const updateFuel = (field: keyof FuelData, val: number) => {
    setDispatchData(prev => {
        const newFuel = { ...prev.fuel, [field]: val } as FuelData;
        return { ...prev, fuel: newFuel };
    });
  };

  const updateOpsPlan = (field: keyof OpsPlanData, val: string) => {
      setDispatchData(prev => {
          const currentOpsPlan = prev.opsPlan || {
              typeOfOperation: 'VFR',
              flightType: 'Schedule',
              weatherDest: '',
              weatherAlt: '',
              additionalWx: '',
              remarks: ''
          };
          return {
              ...prev,
              opsPlan: { ...currentOpsPlan, [field]: val }
          };
      });
  };

  const updateWnB = (field: keyof WnBData, val: number) => {
      setDispatchData(prev => {
          const currentWnb = prev.wnb || INITIAL_WNB;
          return {
              ...prev,
              wnb: { ...currentWnb, [field]: val }
          };
      });
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
    if (isOverweight && !confirm("Aircraft is OVERWEIGHT. Release anyway?")) return;

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

  const inputClass = "w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 placeholder-slate-400 font-medium transition-all shadow-sm";
  const labelClass = "block mb-1.5 text-xs font-bold text-slate-600 uppercase tracking-tight ml-1";

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
                            <Tab active={activeTab === 'weight'} onClick={() => setActiveTab('weight')} icon={<Scale size={16}/>} label="W&B" warning={isOverweight} />
                            <Tab active={activeTab === 'opsplan'} onClick={() => setActiveTab('opsplan')} icon={<ScrollText size={16}/>} label="Ops Plan" />
                            <Tab active={activeTab === 'notoc'} onClick={() => setActiveTab('notoc')} icon={<Bomb size={16}/>} label="NOTOC" warning={dispatchData.notoc?.dangerousGoods?.length ? true : false} />
                            <Tab active={activeTab === 'weather'} onClick={() => setActiveTab('weather')} icon={<CloudSun size={16}/>} label="Wx" />
                            <Tab active={activeTab === 'release'} onClick={() => setActiveTab('release')} icon={<FileCheck size={16}/>} label="Release" />
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                            {/* ... (Overview, Payload, Fuel, Weight, OpsPlan tabs omitted for brevity) ... */}
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
                                <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2">
                                    {/* Passenger Manifest */}
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <User size={18} className="text-blue-500"/> Passenger Manifest
                                            </h3>
                                            <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                                                {dispatchData.passengers?.length || 0} PAX
                                            </span>
                                        </div>
                                        
                                        {/* Pax Input */}
                                        <div className="p-5 border-b border-slate-200 space-y-4 bg-slate-50/50">
                                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                                                <div className="md:col-span-2">
                                                    <label className={labelClass}>Last Name</label>
                                                    <input placeholder="Smith" className={inputClass} value={newPax.lastName} onChange={e => setNewPax(p => ({...p, lastName: e.target.value.toUpperCase()}))} />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className={labelClass}>First Name</label>
                                                    <input placeholder="John" className={inputClass} value={newPax.firstName} onChange={e => setNewPax(p => ({...p, firstName: e.target.value.toUpperCase()}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Weight (Lbs)</label>
                                                    <input type="number" className={inputClass} value={newPax.weight} onChange={e => setNewPax(p => ({...p, weight: Number(e.target.value)}))} />
                                                </div>
                                                <div className="flex items-center pb-2 pl-2">
                                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                                        <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" checked={newPax.isInfant} onChange={e => setNewPax(p => ({...p, isInfant: e.target.checked}))} />
                                                        <span className="text-xs font-bold text-slate-700">Infant?</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                                                <div>
                                                    <label className={labelClass}>Seat</label>
                                                    <input placeholder="1A" className={inputClass} value={newPax.seatNumber} onChange={e => setNewPax(p => ({...p, seatNumber: e.target.value.toUpperCase()}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Passport #</label>
                                                    <input placeholder="P123456" className={inputClass} value={newPax.passportNumber} onChange={e => setNewPax(p => ({...p, passportNumber: e.target.value.toUpperCase()}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Bag Tag</label>
                                                    <input placeholder="TAG123" className={inputClass} value={newPax.bagTag} onChange={e => setNewPax(p => ({...p, bagTag: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Ticket #</label>
                                                    <input placeholder="TK001" className={inputClass} value={newPax.ticketNumber} onChange={e => setNewPax(p => ({...p, ticketNumber: e.target.value}))} />
                                                </div>
                                                <div className="md:col-span-2 flex gap-2">
                                                    {editingPaxId ? (
                                                        <>
                                                            <button onClick={handleCancelEdit} className="flex-1 bg-slate-200 text-slate-700 rounded-lg h-[42px] font-bold hover:bg-slate-300 transition-all">Cancel</button>
                                                            <button onClick={handleSavePax} className="flex-1 bg-blue-600 text-white rounded-lg h-[42px] font-bold hover:bg-blue-700 shadow-md flex items-center justify-center gap-2 transition-all">
                                                                <Save size={18}/> Update
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button onClick={handleSavePax} className="w-full bg-blue-600 text-white rounded-lg h-[42px] font-bold hover:bg-blue-700 shadow-md flex items-center justify-center gap-2 transition-all">
                                                            <Plus size={18}/> Add Pax
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-100 text-slate-600 font-bold text-xs uppercase">
                                                <tr>
                                                    <th className="px-6 py-3">Name</th>
                                                    <th className="px-6 py-3">Weight</th>
                                                    <th className="px-6 py-3">Seat</th>
                                                    <th className="px-6 py-3">Passport</th>
                                                    <th className="px-6 py-3 text-center">Infant</th>
                                                    <th className="px-6 py-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {dispatchData.passengers?.map((p) => (
                                                    <tr key={p.id} className="hover:bg-slate-50 group">
                                                        <td className="px-6 py-3 font-bold text-slate-800">{p.lastName}, {p.firstName}</td>
                                                        <td className="px-6 py-3 font-mono">{p.weight} Lbs</td>
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
                                                {(!dispatchData.passengers || dispatchData.passengers.length === 0) && (
                                                    <tr><td colSpan={6} className="text-center py-8 text-slate-400 italic">No passengers added.</td></tr>
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
                                                {dispatchData.cargoItems?.length || 0} Items
                                            </span>
                                        </div>
                                        
                                        <div className="p-5 border-b border-slate-200 space-y-4 bg-slate-50/50">
                                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                                                <div className="md:col-span-2">
                                                    <label className={labelClass}>Consignor</label>
                                                    <input placeholder="Sender Name" className={inputClass} value={newCargo.consignor} onChange={e => setNewCargo(p => ({...p, consignor: e.target.value}))} />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className={labelClass}>Consignee</label>
                                                    <input placeholder="Receiver Name" className={inputClass} value={newCargo.consignee} onChange={e => setNewCargo(p => ({...p, consignee: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Weight (Lbs)</label>
                                                    <input type="number" className={inputClass} value={newCargo.weight || ''} onChange={e => setNewCargo(p => ({...p, weight: Number(e.target.value)}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Pieces</label>
                                                    <input type="number" className={inputClass} value={newCargo.pieces} onChange={e => setNewCargo(p => ({...p, pieces: Number(e.target.value)}))} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                                                <div className="md:col-span-4">
                                                    <label className={labelClass}>Description / Notes</label>
                                                    <input placeholder="e.g. Machine Parts, Perishables" className={inputClass} value={newCargo.description} onChange={e => setNewCargo(p => ({...p, description: e.target.value}))} />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <button onClick={handleAddCargo} className="w-full bg-amber-500 text-white rounded-lg h-[42px] font-bold hover:bg-amber-600 shadow-md flex items-center justify-center gap-2 transition-all">
                                                        <Plus size={18}/> Add Cargo
                                                    </button>
                                                </div>
                                            </div>
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
                                                {dispatchData.cargoItems?.map((c) => (
                                                    <tr key={c.id} className="hover:bg-slate-50 group">
                                                        <td className="px-6 py-3 font-bold text-slate-800">{c.consignor}</td>
                                                        <td className="px-6 py-3 text-slate-600">{c.consignee}</td>
                                                        <td className="px-6 py-3 font-mono font-bold">{c.weight} Lbs</td>
                                                        <td className="px-6 py-3 font-mono">{c.pieces}</td>
                                                        <td className="px-6 py-3 italic text-slate-500">{c.description}</td>
                                                        <td className="px-6 py-3 text-right">
                                                            <button onClick={() => setDispatchData(prev => ({...prev, cargoItems: prev.cargoItems?.filter(x => x.id !== c.id)}))} className="p-1.5 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Trash2 size={16}/>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(!dispatchData.cargoItems || dispatchData.cargoItems.length === 0) && (
                                                    <tr><td colSpan={6} className="text-center py-8 text-slate-400 italic">No cargo added.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-800 p-4 rounded-xl text-white">
                                        <div className="text-center border-r border-slate-700">
                                            <div className="text-xs text-slate-400 uppercase font-bold">Total Pax Weight</div>
                                            <div className="text-xl font-black">{totalPaxWeight} Lbs</div>
                                        </div>
                                        <div className="text-center border-r border-slate-700">
                                            <div className="text-xs text-slate-400 uppercase font-bold">Total Cargo Weight</div>
                                            <div className="text-xl font-black">{totalCargoWeight} Lbs</div>
                                        </div>
                                        <div className="text-center border-r border-slate-700">
                                            <div className="text-xs text-slate-400 uppercase font-bold">Total Payload</div>
                                            <div className="text-xl font-black text-blue-400">{payload} Lbs</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs text-slate-400 uppercase font-bold">Zero Fuel Weight</div>
                                            <div className="text-xl font-black text-emerald-400">{zeroFuelWeight} Lbs</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {activeTab === 'fuel' && (
                                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                            <Fuel size={20} className="text-blue-600"/> Fuel Planning (Lbs)
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className={labelClass}>Taxi Fuel</label>
                                                    <input type="number" className={inputClass} value={dispatchData.fuel?.taxi} onChange={e => updateFuel('taxi', Number(e.target.value))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Trip Fuel</label>
                                                    <input type="number" className={`${inputClass} font-bold text-blue-900`} value={dispatchData.fuel?.trip} onChange={e => updateFuel('trip', Number(e.target.value))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Contingency (5%)</label>
                                                    <input type="number" className={inputClass} value={dispatchData.fuel?.contingency} onChange={e => updateFuel('contingency', Number(e.target.value))} />
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className={labelClass}>Alternate</label>
                                                    <input type="number" className={inputClass} value={dispatchData.fuel?.alternate} onChange={e => updateFuel('alternate', Number(e.target.value))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Holding (45 min)</label>
                                                    <input type="number" className={inputClass} value={dispatchData.fuel?.holding} onChange={e => updateFuel('holding', Number(e.target.value))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Fuel Density (Lbs/Gal)</label>
                                                    <input type="number" step="0.1" className={inputClass} value={dispatchData.fuel?.density} onChange={e => updateFuel('density', Number(e.target.value))} />
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
                                                        value={dispatchData.fuel?.totalFob} 
                                                        onChange={e => updateFuel('totalFob', Number(e.target.value))} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'weight' && (
                                <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 pb-12">
                                    <WnBSheet 
                                        data={dispatchData.wnb || INITIAL_WNB} 
                                        onChange={updateWnB} 
                                        paxData={dispatchData.passengers || []}
                                        basicEmptyWeight={dispatchData.basicEmptyWeight || 0}
                                        fuelWeight={dispatchData.fuel?.totalFob || 0}
                                        tripFuel={dispatchData.fuel?.trip || 0}
                                        taxiFuel={dispatchData.fuel?.taxi || 0}
                                        crewWeight={dispatchData.wnb?.crewWeight || 0}
                                        limits={{ mtow, mlw, mzfw }}
                                        flight={selectedFlight}
                                        crew={crew.find(c => c.code === selectedFlight?.pic)}
                                    />
                                </div>
                            )}

                            {activeTab === 'opsplan' && (
                                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                            <ScrollText size={20} className="text-blue-600"/> Operational Flight Plan
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className={labelClass}>Type of Operation</label>
                                                <select 
                                                    className={inputClass}
                                                    value={dispatchData.opsPlan?.typeOfOperation}
                                                    onChange={e => updateOpsPlan('typeOfOperation', e.target.value)}
                                                >
                                                    <option value="VFR">VFR - Visual Flight Rules</option>
                                                    <option value="IFR">IFR - Instrument Flight Rules</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Flight Type</label>
                                                <select 
                                                    className={inputClass}
                                                    value={dispatchData.opsPlan?.flightType}
                                                    onChange={e => updateOpsPlan('flightType', e.target.value)}
                                                >
                                                    <option value="Schedule">Schedule</option>
                                                    <option value="Non-Schedule">Non-Schedule / Charter</option>
                                                    <option value="General Aviation">General Aviation</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-4 border-t border-slate-100 pt-4">
                                            <h4 className="text-sm font-bold text-slate-700">Weather Briefing</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className={labelClass}>Destination METAR/TAF</label>
                                                    <textarea 
                                                        rows={3} 
                                                        className={inputClass} 
                                                        placeholder="Paste weather report..."
                                                        value={dispatchData.opsPlan?.weatherDest}
                                                        onChange={e => updateOpsPlan('weatherDest', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Alternate METAR/TAF</label>
                                                    <textarea 
                                                        rows={3} 
                                                        className={inputClass} 
                                                        placeholder="Paste weather report..."
                                                        value={dispatchData.opsPlan?.weatherAlt}
                                                        onChange={e => updateOpsPlan('weatherAlt', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 border-t border-slate-100 pt-4">
                                            <label className={labelClass}>General Remarks / NOTAMs</label>
                                            <textarea 
                                                rows={4} 
                                                className={inputClass} 
                                                placeholder="Enter operational notes, NOTAMs, or specific instructions..."
                                                value={dispatchData.opsPlan?.remarks}
                                                onChange={e => updateOpsPlan('remarks', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 8: NOTOC */}
                            {activeTab === 'notoc' && (
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
                                            {/* ... Input Form ... */}
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
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                                                <div>
                                                    <label className={labelClass}>DG Class</label>
                                                    <input placeholder="Class" className={inputClass} value={newNotocItem.classDivision} onChange={e => setNewNotocItem(p => ({...p, classDivision: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Sub Risk</label>
                                                    <input placeholder="Sub Risk" className={inputClass} value={newNotocItem.subRisk} onChange={e => setNewNotocItem(p => ({...p, subRisk: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Packing Inst.</label>
                                                    <input placeholder="Pkg Inst" className={inputClass} value={newNotocItem.packingInst} onChange={e => setNewNotocItem(p => ({...p, packingInst: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Packing Group</label>
                                                    <input placeholder="PG" className={`${inputClass} uppercase`} value={newNotocItem.packingGroup} onChange={e => setNewNotocItem(p => ({...p, packingGroup: e.target.value.toUpperCase()}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Code</label>
                                                    <input placeholder="Code" className={`${inputClass} uppercase`} value={newNotocItem.code} onChange={e => setNewNotocItem(p => ({...p, code: e.target.value.toUpperCase()}))} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                                                <div>
                                                    <label className={labelClass}>No. Packages</label>
                                                    <input type="number" placeholder="#" className={inputClass} value={newNotocItem.noOfPackages} onChange={e => setNewNotocItem(p => ({...p, noOfPackages: Number(e.target.value)}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Net Qty / Pkg</label>
                                                    <input placeholder="Qty" className={inputClass} value={newNotocItem.netQuantity} onChange={e => setNewNotocItem(p => ({...p, netQuantity: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>ERG Code</label>
                                                    <input placeholder="ERG" className={`${inputClass} uppercase`} value={newNotocItem.ergCode} onChange={e => setNewNotocItem(p => ({...p, ergCode: e.target.value.toUpperCase()}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Position</label>
                                                    <input placeholder="Pos" className={`${inputClass} uppercase`} value={newNotocItem.location} onChange={e => setNewNotocItem(p => ({...p, location: e.target.value.toUpperCase()}))} />
                                                </div>
                                                <div className="flex items-center pb-2">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" className="w-5 h-5 text-rose-600 rounded" checked={newNotocItem.cao || false} onChange={e => setNewNotocItem(p => ({...p, cao: e.target.checked}))} />
                                                        <span className="text-xs font-bold text-slate-700">CAO (X)</span>
                                                    </label>
                                                </div>
                                                <button onClick={handleAddNotocItem} className="bg-rose-600 text-white rounded-lg h-[40px] font-bold hover:bg-rose-700 shadow-md flex items-center justify-center gap-2 transition-all">
                                                    <Plus size={18}/> Add Item
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
                                                        <th rowSpan={2} className="px-2 py-3 border-r border-slate-600">Sub Risk</th>
                                                        <th rowSpan={2} className="px-2 py-3 border-r border-slate-600">Pkgs</th>
                                                        <th rowSpan={2} className="px-2 py-3 border-r border-slate-600">Net Qty</th>
                                                        <th rowSpan={2} className="px-2 py-3 border-r border-slate-600">Pkg Inst</th>
                                                        <th rowSpan={2} className="px-2 py-3 border-r border-slate-600">PG</th>
                                                        <th rowSpan={2} className="px-2 py-3 border-r border-slate-600">Code</th>
                                                        <th rowSpan={2} className="px-2 py-3 border-r border-slate-600 text-center">CAO</th>
                                                        <th colSpan={2} className="px-2 py-1 text-center border-b border-slate-600">Loaded</th>
                                                        <th rowSpan={2} className="px-2 py-3 text-center">Action</th>
                                                    </tr>
                                                    <tr>
                                                        <th className="px-2 py-2 border-r border-slate-600 text-center">ERG</th>
                                                        <th className="px-2 py-2 text-center">Pos</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {dispatchData.notoc?.dangerousGoods?.map((item, idx) => (
                                                        <tr key={item.id} className={`hover:bg-rose-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                                            <td className="px-2 py-3 font-mono text-slate-700">{item.stationOfUnloading}</td>
                                                            <td className="px-2 py-3 font-mono text-slate-700">{item.airWaybillNumber}</td>
                                                            <td className="px-2 py-3 font-bold text-slate-900">{item.properShippingName}</td>
                                                            <td className="px-2 py-3 font-bold text-center text-slate-900">{item.classDivision}</td>
                                                            <td className="px-2 py-3 font-mono text-center text-slate-700">{item.unNumber}</td>
                                                            <td className="px-2 py-3 text-center text-slate-700">{item.subRisk}</td>
                                                            <td className="px-2 py-3 text-center font-bold text-slate-900">{item.noOfPackages}</td>
                                                            <td className="px-2 py-3 text-center text-slate-700">{item.netQuantity}</td>
                                                            <td className="px-2 py-3 text-center text-slate-700">{item.packingInst}</td>
                                                            <td className="px-2 py-3 text-center text-slate-700">{item.packingGroup}</td>
                                                            <td className="px-2 py-3 text-center text-slate-700">{item.code}</td>
                                                            <td className="px-2 py-3 text-center font-bold text-rose-600">{item.cao ? 'X' : ''}</td>
                                                            <td className="px-2 py-3 text-center font-mono text-slate-700">{item.ergCode}</td>
                                                            <td className="px-2 py-3 text-center font-mono font-bold text-slate-900">{item.location}</td>
                                                            <td className="px-2 py-3 text-center">
                                                                <button onClick={() => handleDeleteNotocItem(item.id)} className="text-slate-300 hover:text-rose-500 p-1 rounded hover:bg-rose-50 transition-colors">
                                                                    <Trash2 size={14}/>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!dispatchData.notoc?.dangerousGoods || dispatchData.notoc.dangerousGoods.length === 0) && (
                                                        <tr>
                                                            <td colSpan={15} className="text-center py-8 text-slate-400 italic">No Dangerous Goods declared.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Other Special Load Notification Section */}
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                                            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                                <Package size={18} className="text-indigo-600"/> Other Special Load
                                            </h3>
                                            <span className="text-xs font-bold text-indigo-600 uppercase bg-white px-2 py-1 rounded border border-indigo-200">IATA Standard Format</span>
                                        </div>
                                        
                                        <div className="p-5 border-b border-slate-200 space-y-4 bg-slate-50/50">
                                            {/* ... Input Form ... */}
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                                <div>
                                                    <label className={labelClass}>Station of Unloading</label>
                                                    <input placeholder="Station" className={`${inputClass} uppercase`} value={newSpecialLoad.stationOfUnloading} onChange={e => setNewSpecialLoad(p => ({...p, stationOfUnloading: e.target.value.toUpperCase()}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Air Waybill Number</label>
                                                    <input placeholder="AWB No." className={inputClass} value={newSpecialLoad.airWaybillNumber} onChange={e => setNewSpecialLoad(p => ({...p, airWaybillNumber: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>ULD ID</label>
                                                    <input placeholder="ULD" className={`${inputClass} uppercase`} value={newSpecialLoad.uldId} onChange={e => setNewSpecialLoad(p => ({...p, uldId: e.target.value.toUpperCase()}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Position</label>
                                                    <input placeholder="Pos" className={`${inputClass} uppercase`} value={newSpecialLoad.loadingPosition} onChange={e => setNewSpecialLoad(p => ({...p, loadingPosition: e.target.value.toUpperCase()}))} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                                <div className="md:col-span-3">
                                                    <label className={labelClass}>Contents and Description</label>
                                                    <input placeholder="e.g. Human Remains, Live Animals" className={inputClass} value={newSpecialLoad.description} onChange={e => setNewSpecialLoad(p => ({...p, description: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Code (See reverse)</label>
                                                    <input placeholder="Code" className={`${inputClass} uppercase`} value={newSpecialLoad.code} onChange={e => setNewSpecialLoad(p => ({...p, code: e.target.value.toUpperCase()}))} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                                <div>
                                                    <label className={labelClass}>No. of Packing</label>
                                                    <input type="number" placeholder="#" className={inputClass} value={newSpecialLoad.noOfPackages} onChange={e => setNewSpecialLoad(p => ({...p, noOfPackages: Number(e.target.value)}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Qty</label>
                                                    <input placeholder="Qty/Wgt" className={inputClass} value={newSpecialLoad.quantity} onChange={e => setNewSpecialLoad(p => ({...p, quantity: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Supplementary Info</label>
                                                    <input placeholder="Info..." className={inputClass} value={newSpecialLoad.supplementaryInfo} onChange={e => setNewSpecialLoad(p => ({...p, supplementaryInfo: e.target.value}))} />
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
                                                        <th className="px-3 py-3 border-r border-slate-600">Station</th>
                                                        <th className="px-3 py-3 border-r border-slate-600">AWB</th>
                                                        <th className="px-3 py-3 border-r border-slate-600 w-1/3">Contents and Description</th>
                                                        <th className="px-3 py-3 border-r border-slate-600 text-center">No. Packing</th>
                                                        <th className="px-3 py-3 border-r border-slate-600 text-center">Qty</th>
                                                        <th className="px-3 py-3 border-r border-slate-600">Supplementary Info</th>
                                                        <th className="px-3 py-3 border-r border-slate-600 text-center">Code</th>
                                                        <th className="px-3 py-3 border-r border-slate-600 text-center">ULD ID</th>
                                                        <th className="px-3 py-3 border-r border-slate-600 text-center">Pos</th>
                                                        <th className="px-3 py-3 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {dispatchData.notoc?.specialLoads?.map((item, idx) => (
                                                        <tr key={item.id} className={`hover:bg-indigo-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                                            <td className="px-3 py-3 font-mono font-medium text-slate-700">{item.stationOfUnloading || '-'}</td>
                                                            <td className="px-3 py-3 font-mono text-slate-700">{item.airWaybillNumber || '-'}</td>
                                                            <td className="px-3 py-3 font-bold text-slate-900">{item.description}</td>
                                                            <td className="px-3 py-3 text-center font-bold text-slate-900">{item.noOfPackages}</td>
                                                            <td className="px-3 py-3 text-center font-mono text-slate-700">{item.quantity}</td>
                                                            <td className="px-3 py-3 italic text-slate-600">{item.supplementaryInfo}</td>
                                                            <td className="px-3 py-3 text-center font-mono font-bold text-indigo-700">{item.code}</td>
                                                            <td className="px-3 py-3 text-center font-mono text-slate-700">{item.uldId}</td>
                                                            <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">{item.loadingPosition}</td>
                                                            <td className="px-3 py-3 text-center">
                                                                <button onClick={() => handleDeleteSpecialLoad(item.id)} className="text-slate-300 hover:text-indigo-600 p-1.5 rounded hover:bg-indigo-50 transition-colors">
                                                                    <Trash2 size={14}/>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!dispatchData.notoc?.specialLoads || dispatchData.notoc.specialLoads.length === 0) && (
                                                        <tr>
                                                            <td colSpan={10} className="text-center py-8 text-slate-400 italic">No Special Loads recorded.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Captain's Acceptance Placeholder */}
                                    <div className="border-t-2 border-slate-200 pt-8 mt-8 flex justify-between items-end">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Prepared By</p>
                                            <div className="font-script text-2xl text-blue-900">Dispatcher</div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Captain's Acceptance of NOTOC</p>
                                            <div className="h-10 w-64 border-b border-slate-300"></div>
                                        </div>
                                    </div>

                                </div>
                            )}

                            {/* TAB 6: WEATHER */}
                            {activeTab === 'weather' && (
                                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
                                    <Card title="Weather Briefing" icon={<CloudSun className="text-blue-500"/>}>
                                        <div className="text-center py-12 text-slate-400">
                                            <Wind size={48} className="mx-auto mb-4 opacity-20"/>
                                            <p>Weather integration pending API connection.</p>
                                            <p className="text-sm">Please use Ops Plan tab to enter manual METAR/TAF.</p>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* TAB 7: RELEASE */}
                            {activeTab === 'release' && (
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
                                                onClick={handleReleaseFlight}
                                                disabled={isDispatchBlocked}
                                                className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all transform flex items-center justify-center gap-2 ${
                                                    isDispatchBlocked 
                                                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:scale-[1.02] active:scale-[0.98]'
                                                }`}
                                            >
                                                {isDispatchBlocked ? <AlertOctagon size={20} /> : <FileCheck size={20} />}
                                                {isDispatchBlocked ? 'DISPATCH BLOCKED' : `RELEASE FLIGHT ${selectedFlight.flightNumber}`}
                                            </button>
                                            {isDispatchBlocked && (
                                                <p className="text-xs text-red-600 font-bold">Check fleet status before proceeding.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
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

const WnBSheet: React.FC<{
    data: WnBData;
    onChange: (field: keyof WnBData, val: number) => void;
    paxData: Passenger[];
    basicEmptyWeight: number;
    fuelWeight: number;
    tripFuel: number;
    taxiFuel: number;
    crewWeight: number;
    limits: { mtow: number, mlw: number, mzfw: number };
    flight?: Flight | null;
    crew?: any;
}> = ({ data, onChange, paxData, basicEmptyWeight, fuelWeight, tripFuel, taxiFuel, crewWeight, limits, flight, crew }) => {
    
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
        data.seat2 + data.seat3_5 + data.seat6_8 + data.seat9_11 + data.seat12_14 +
        data.zone1 + data.zone2 + data.zone3 + data.zone4 + data.zone5 + data.zone6 +
        data.podA + data.podB + data.podC + data.podD;

    const zeroFuelWeight = basicEmptyWeight + crewWeight + totalLoad;
    const rampWeight = zeroFuelWeight + fuelWeight;
    const takeoffWeight = rampWeight - taxiFuel;
    const landingWeight = takeoffWeight - tripFuel;

    const EntryRow = ({ label, field, arm }: { label: string, field: keyof WnBData, arm: number }) => (
        <tr className="border-b border-slate-200 hover:bg-slate-50">
            <td className="py-2 pl-4 text-sm font-bold text-slate-700">{label}</td>
            <td className="p-2">
                <input 
                    type="number" 
                    value={data[field] || ''} 
                    onChange={e => onChange(field, Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono text-sm text-right focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </td>
            <td className="p-2 text-right font-mono text-sm text-slate-600">{arm.toFixed(1)}</td>
            <td className="p-2 text-right font-mono text-sm font-bold text-slate-800">{calcMoment(data[field], arm).toFixed(2)}</td>
        </tr>
    );

    return (
        <div className="bg-white shadow-lg border border-slate-300 w-full max-w-5xl mx-auto text-sm print:shadow-none print:border-none">
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
                                <td className="p-2 text-right">{crewWeight}</td>
                                <td className="p-2 text-right">{arms.crew}</td>
                                <td className="p-2 text-right">{calcMoment(crewWeight, arms.crew).toFixed(2)}</td>
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
                            <div className="flex justify-between p-3 bg-blue-50"><span className="text-sm text-blue-800 font-bold">+ Fuel Load</span><span className="text-sm font-mono font-bold text-blue-900">{fuelWeight}</span></div>
                            <div className="flex justify-between p-3 bg-slate-100 border-t border-slate-200"><span className="text-sm text-slate-800 font-black">Ramp Weight</span><span className="text-sm font-mono font-black text-slate-900">{rampWeight}</span></div>
                            <div className="flex justify-between p-3"><span className="text-sm text-slate-500 font-medium">- Taxi Fuel</span><span className="text-sm font-mono text-slate-500">{taxiFuel}</span></div>
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
                        <div className="border-b border-slate-400 pb-1 mt-4"><p className="font-script text-xl text-blue-900 ml-2">{crew ? crew.name : ''}</p></div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Captain's Signature</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
