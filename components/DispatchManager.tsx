
import React, { useState, useEffect } from 'react';
import { Flight, Aircraft, DispatchRecord, Passenger, CargoItem, DangerousGoods, FuelData, CrewMember, OpsPlanData, WnBData, NotocItem, SpecialLoadItem, NotocData } from '../types';
import { subscribeToDispatch, saveDispatchRecord, updateFlight } from '../services/firebase';
import { ClipboardList, Scale, CheckCircle2, AlertTriangle, User, Briefcase, Plus, Trash2, Save, Plane, Fuel, FileCheck, Info, Gauge, Printer, CloudSun, Package, Edit2, X, ScrollText, MapPin, ArrowRight, Wind, Calendar, Clock, ArrowDown, Activity, Bomb, FileWarning } from 'lucide-react';
import { FeatureGate } from './FeatureGate';
import { CalendarWidget } from './CalendarWidget';

interface DispatchManagerProps {
  flights: Flight[];
  fleet: Aircraft[];
  crew: (CrewMember & { _docId?: string })[];
  currentDate: string;
  isEnabled: boolean;
  onDateChange: (date: string) => void;
}

type TabType = 'overview' | 'payload' | 'fuel' | 'weight' | 'weather' | 'opsplan' | 'notoc' | 'release';

const INITIAL_WNB: WnBData = {
    seat2: 0, seat3_5: 0, seat6_8: 0, seat9_11: 0, seat12_14: 0,
    zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0, zone6: 0,
    podA: 0, podB: 0, podC: 0, podD: 0,
    crewWeight: 0, extraEquipment: 0
};

// Helper Components moved outside to avoid re-renders
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

export const DispatchManager: React.FC<DispatchManagerProps> = ({ flights, fleet, crew, currentDate, isEnabled, onDateChange }) => {
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // -- DISPATCH DATA STATE --
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

  // -- INPUT STATES --
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

  // NOTOC Input States
  const [newNotocItem, setNewNotocItem] = useState<Partial<NotocItem>>({
      unNumber: '', properShippingName: '', classDivision: '', packingGroup: '',
      noOfPackages: 1, netQuantity: '', location: ''
  });
  const [newSpecialLoad, setNewSpecialLoad] = useState<Partial<SpecialLoadItem>>({
      description: '', weight: 0, loadingPosition: '', instructions: ''
  });

  // Filter flights for active dispatch
  const dispatchableFlights = flights
    .filter(f => f.date === currentDate && ['Scheduled', 'Delayed', 'Outbound', 'On Ground'].includes(f.status))
    .sort((a, b) => (a.etd || '').localeCompare(b.etd || ''));

  // Subscribe to dispatch record
  useEffect(() => {
    if (selectedFlight) {
        setLoading(true);
        const aircraft = fleet.find(a => a.registration === selectedFlight.aircraftRegistration);
        
        const unsubscribe = subscribeToDispatch(selectedFlight.id, (data) => {
            if (data) {
                // Merge with defaults if missing
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
                // Initialize default
                const routeParts = selectedFlight.route.includes('-') ? selectedFlight.route.split('-') : [selectedFlight.route, ''];
                
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
            // Reset inputs
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
            setNewNotocItem({ unNumber: '', properShippingName: '', classDivision: '', packingGroup: '', noOfPackages: 1, netQuantity: '', location: '' });
            setNewSpecialLoad({ description: '', weight: 0, loadingPosition: '', instructions: '' });
            
            setLoading(false);
        });
        return unsubscribe;
    } else {
        setDispatchData({});
    }
  }, [selectedFlight, fleet]);

  // -- CALCULATIONS --
  const currentAircraft = fleet.find(a => a.registration === selectedFlight?.aircraftRegistration);
  
  // Weights
  const totalPaxWeight = (dispatchData.passengers || []).reduce((acc, p) => acc + (p.weight || 0) + (p.freeBagWeight || 0) + (p.excessBagWeight || 0), 0);
  const totalCargoWeight = (dispatchData.cargoItems || []).reduce((acc, c) => acc + (c.weight || 0), 0);
  const payload = totalPaxWeight + totalCargoWeight;
  const zeroFuelWeight = (dispatchData.basicEmptyWeight || 0) + payload;
  
  // Fuel Calc
  const calcFuel = dispatchData.fuel || { taxi: 0, trip: 0, contingency: 0, alternate: 0, holding: 0, totalFob: 0, density: 6.7 };
  const totalFuelReq = calcFuel.taxi + calcFuel.trip + calcFuel.contingency + calcFuel.alternate + calcFuel.holding;
  const fob = calcFuel.totalFob || totalFuelReq;
  
  const takeoffWeight = zeroFuelWeight + fob;
  const landingWeight = takeoffWeight - (calcFuel.trip || 0);

  // Limits
  const mtow = currentAircraft?.maxTakeoffWeight || 8750;
  const mlw = currentAircraft?.maxLandingWeight || 8500;
  const mzfw = currentAircraft?.maxZeroFuelWeight || 7500;

  const isOverweight = takeoffWeight > mtow || landingWeight > mlw || zeroFuelWeight > mzfw;
  const isReleased = dispatchData.status === 'Released';

  // -- HELPERS --
  const getCrewName = (code: string) => {
      const c = crew.find(member => member.code === code);
      return c ? c.name : code;
  };

  // -- HANDLERS --

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
    
    // Reset but keep context fields for quicker entry
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
      setNewNotocItem({ unNumber: '', properShippingName: '', classDivision: '', packingGroup: '', noOfPackages: 1, netQuantity: '', location: '' });
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
      setNewSpecialLoad({ description: '', weight: 0, loadingPosition: '', instructions: '' });
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
            // Lazy load PDF generation only when requested
            const { generateDispatchPack } = await import('../services/pdfService');
            generateDispatchPack(selectedFlight, { ...dispatchData, takeoffWeight, zeroFuelWeight, landingWeight } as DispatchRecord, currentAircraft);
          } catch (e) {
            console.error("Failed to load PDF service", e);
            alert("PDF generation unavailable offline or failed to load.");
          }
      }
  };

  // Reused input styles
  const inputClass = "w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 placeholder-slate-400 font-medium transition-all shadow-sm";
  const labelClass = "block mb-1.5 text-xs font-bold text-slate-600 uppercase tracking-tight ml-1";

  return (
    <FeatureGate isEnabled={isEnabled}>
        <div className="flex h-full bg-slate-50 relative overflow-hidden">
            {/* Sidebar */}
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
                                    {/* Selection Indicator Strip */}
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

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                {selectedFlight ? (
                    <>
                        {/* Header */}
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

                        {/* Workflow Tabs */}
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

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                            
                            {/* TAB 1: OVERVIEW */}
                            {activeTab === 'overview' && (
                                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
                                    <Card title="Flight Context" icon={<Plane className="text-blue-500" />}>
                                        <div className="space-y-3">
                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-slate-500">Route</span>
                                                <span className="font-bold">{selectedFlight.route}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-slate-500">STD (Local)</span>
                                                <span className="font-bold">{selectedFlight.etd}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-slate-500">Customer</span>
                                                <span className="font-bold">{selectedFlight.customer}</span>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card title="Aircraft Status" icon={<Gauge className={currentAircraft?.status === 'Active' ? 'text-emerald-500' : 'text-amber-500'} />}>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                                <span className="text-slate-500">Registration</span>
                                                <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded">{selectedFlight.aircraftRegistration}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                                <span className="text-slate-500">Serviceability</span>
                                                {currentAircraft?.status === 'Active' ? (
                                                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 size={12}/> SERVICEABLE</span>
                                                ) : (
                                                    <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1"><AlertTriangle size={12}/> CHECK STATUS</span>
                                                )}
                                            </div>
                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-slate-500">Hours Remaining</span>
                                                <span className="font-bold">{(currentAircraft?.nextCheckHours || 0) - (currentAircraft?.currentHours || 0)} Hrs</span>
                                            </div>
                                        </div>
                                    </Card>
                                    
                                    <div className="md:col-span-2 bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                                        <Info className="text-blue-500 mt-0.5" size={20} />
                                        <div className="text-sm text-blue-800">
                                            <strong>Dispatcher Note:</strong> Verify all crew documents and aircraft maintenance releases before proceeding to payload entry.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 8: NOTOC */}
                            {activeTab === 'notoc' && (
                                <div className="max-w-[1300px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 pb-12">
                                    
                                    {/* Dangerous Goods Section */}
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="p-4 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
                                            <h3 className="font-bold text-rose-800 flex items-center gap-2">
                                                <Bomb size={18} className="text-rose-600"/> Dangerous Goods (NOTOC)
                                            </h3>
                                            <span className="text-xs font-bold text-rose-600 uppercase bg-white px-2 py-1 rounded border border-rose-200">IATA Standard Format</span>
                                        </div>
                                        
                                        <div className="p-5 border-b border-slate-200 space-y-4 bg-slate-50/50">
                                            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
                                                <div>
                                                    <label className={labelClass}>UN Number</label>
                                                    <input placeholder="UN1234" className={inputClass} value={newNotocItem.unNumber} onChange={e => setNewNotocItem(p => ({...p, unNumber: e.target.value.toUpperCase()}))} />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className={labelClass}>Proper Shipping Name</label>
                                                    <input placeholder="e.g. Paint" className={inputClass} value={newNotocItem.properShippingName} onChange={e => setNewNotocItem(p => ({...p, properShippingName: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Class / Div</label>
                                                    <input placeholder="e.g. 3" className={inputClass} value={newNotocItem.classDivision} onChange={e => setNewNotocItem(p => ({...p, classDivision: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Pack Group</label>
                                                    <input placeholder="e.g. II" className={inputClass} value={newNotocItem.packingGroup} onChange={e => setNewNotocItem(p => ({...p, packingGroup: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Net Qty</label>
                                                    <input placeholder="e.g. 5 L" className={inputClass} value={newNotocItem.netQuantity} onChange={e => setNewNotocItem(p => ({...p, netQuantity: e.target.value}))} />
                                                </div>
                                                <button onClick={handleAddNotocItem} className="bg-rose-600 text-white rounded-lg h-[42px] font-bold hover:bg-rose-700 shadow-md flex items-center justify-center gap-2 transition-all">
                                                    <Plus size={18}/> Add
                                                </button>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left min-w-[800px]">
                                                <thead className="bg-slate-800 text-white border-b border-slate-700 uppercase tracking-wider text-[11px] font-bold">
                                                    <tr>
                                                        <th className="px-6 py-3">UN Number</th>
                                                        <th className="px-6 py-3">Proper Shipping Name</th>
                                                        <th className="px-6 py-3">Class</th>
                                                        <th className="px-6 py-3">PG</th>
                                                        <th className="px-6 py-3">Qty</th>
                                                        <th className="px-6 py-3 text-center w-16">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {dispatchData.notoc?.dangerousGoods?.map((item, idx) => (
                                                        <tr key={item.id} className={`hover:bg-rose-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                                            <td className="px-6 py-4 font-mono font-bold text-slate-800">{item.unNumber}</td>
                                                            <td className="px-6 py-4 font-bold text-slate-700">{item.properShippingName}</td>
                                                            <td className="px-6 py-4">{item.classDivision}</td>
                                                            <td className="px-6 py-4">{item.packingGroup}</td>
                                                            <td className="px-6 py-4 font-mono">{item.netQuantity}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <button onClick={() => handleDeleteNotocItem(item.id)} className="text-slate-300 hover:text-rose-500 p-1.5 rounded hover:bg-rose-50 transition-colors">
                                                                    <Trash2 size={16}/>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!dispatchData.notoc?.dangerousGoods || dispatchData.notoc.dangerousGoods.length === 0) && (
                                                        <tr>
                                                            <td colSpan={6} className="text-center py-8 text-slate-400 italic">No Dangerous Goods declared.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Special Load Notification Section */}
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="p-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
                                            <h3 className="font-bold text-amber-800 flex items-center gap-2">
                                                <FileWarning size={18} className="text-amber-600"/> Special Load Notification
                                            </h3>
                                            <span className="text-xs font-bold text-amber-600 uppercase bg-white px-2 py-1 rounded border border-amber-200">Non-Standard Cargo</span>
                                        </div>
                                        
                                        <div className="p-5 border-b border-slate-200 space-y-4 bg-slate-50/50">
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                                                <div className="md:col-span-2">
                                                    <label className={labelClass}>Description</label>
                                                    <input placeholder="e.g. Aircraft Engine, Human Remains" className={inputClass} value={newSpecialLoad.description} onChange={e => setNewSpecialLoad(p => ({...p, description: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Weight (Lbs)</label>
                                                    <input type="number" className={inputClass} value={newSpecialLoad.weight || ''} onChange={e => setNewSpecialLoad(p => ({...p, weight: Number(e.target.value)}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Instructions</label>
                                                    <input placeholder="e.g. Upright only" className={inputClass} value={newSpecialLoad.instructions} onChange={e => setNewSpecialLoad(p => ({...p, instructions: e.target.value}))} />
                                                </div>
                                                <button onClick={handleAddSpecialLoad} className="bg-amber-500 text-white rounded-lg h-[42px] font-bold hover:bg-amber-600 shadow-md flex items-center justify-center gap-2 transition-all">
                                                    <Plus size={18}/> Add
                                                </button>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left min-w-[800px]">
                                                <thead className="bg-slate-800 text-white border-b border-slate-700 uppercase tracking-wider text-[11px] font-bold">
                                                    <tr>
                                                        <th className="px-6 py-3">Description</th>
                                                        <th className="px-6 py-3 text-right">Weight (Lbs)</th>
                                                        <th className="px-6 py-3">Instructions</th>
                                                        <th className="px-6 py-3 text-center w-16">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {dispatchData.notoc?.specialLoads?.map((item, idx) => (
                                                        <tr key={item.id} className={`hover:bg-amber-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                                            <td className="px-6 py-4 font-bold text-slate-800">{item.description}</td>
                                                            <td className="px-6 py-4 text-right font-mono">{item.weight}</td>
                                                            <td className="px-6 py-4 italic text-slate-600">{item.instructions}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <button onClick={() => handleDeleteSpecialLoad(item.id)} className="text-slate-300 hover:text-amber-600 p-1.5 rounded hover:bg-amber-50 transition-colors">
                                                                    <Trash2 size={16}/>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!dispatchData.notoc?.specialLoads || dispatchData.notoc.specialLoads.length === 0) && (
                                                        <tr>
                                                            <td colSpan={4} className="text-center py-8 text-slate-400 italic">No Special Loads recorded.</td>
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

                            {/* TAB 2: PAYLOAD - PASSENGER & CARGO MANIFEST */}
                            {activeTab === 'payload' && (
                                <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2">
                                    {/* Passenger Input & Table */}
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <User size={18} className="text-blue-600"/> Passenger Manifest
                                            </h3>
                                            {editingPaxId && (
                                                <div className="flex items-center gap-2">
                                                     <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">EDITING MODE</span>
                                                     <button onClick={handleCancelEdit} className="text-xs text-slate-500 hover:text-slate-800 underline">Cancel</button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className={`p-5 border-b border-slate-200 space-y-4 transition-colors ${editingPaxId ? 'bg-amber-50/50' : 'bg-blue-50'}`}>
                                             {/* Pax Input Fields */}
                                             <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                                <div>
                                                    <label className={labelClass}>Last Name</label>
                                                    <input placeholder="Enter Last Name" className={inputClass} value={newPax.lastName || ''} onChange={e => setNewPax(p => ({...p, lastName: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>First Name</label>
                                                    <input placeholder="Enter First Name" className={inputClass} value={newPax.firstName || ''} onChange={e => setNewPax(p => ({...p, firstName: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Gender</label>
                                                    <select className={inputClass} value={newPax.gender || 'M'} onChange={e => setNewPax(p => ({...p, gender: e.target.value as any}))}>
                                                        <option value="M">Male</option>
                                                        <option value="F">Female</option>
                                                        <option value="X">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Nationality</label>
                                                    <input placeholder="e.g. Guyanese" className={inputClass} value={newPax.nationality || ''} onChange={e => setNewPax(p => ({...p, nationality: e.target.value}))} />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className={labelClass}>Passport Number</label>
                                                    <input placeholder="Passport Number" className={inputClass} value={newPax.passportNumber || ''} onChange={e => setNewPax(p => ({...p, passportNumber: e.target.value}))} />
                                                </div>
                                             </div>
                                             
                                             <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                                 <div>
                                                    <label className={labelClass}>Departing</label>
                                                    <input placeholder="DPT (e.g. OGL)" className={`${inputClass} uppercase`} value={newPax.departure || ''} onChange={e => setNewPax(p => ({...p, departure: e.target.value.toUpperCase()}))} />
                                                 </div>
                                                 <div>
                                                    <label className={labelClass}>Arriving</label>
                                                    <input placeholder="ARR (e.g. KAI)" className={`${inputClass} uppercase`} value={newPax.arrival || ''} onChange={e => setNewPax(p => ({...p, arrival: e.target.value.toUpperCase()}))} />
                                                 </div>
                                                 <div>
                                                    <label className={labelClass}>Seat No.</label>
                                                    <input placeholder="SEAT" className={`${inputClass} uppercase`} value={newPax.seatNumber || ''} onChange={e => setNewPax(p => ({...p, seatNumber: e.target.value.toUpperCase()}))} />
                                                 </div>
                                                 <div>
                                                    <label className={labelClass}>Ticket Number</label>
                                                    <input placeholder="Ticket #" className={inputClass} value={newPax.ticketNumber || ''} onChange={e => setNewPax(p => ({...p, ticketNumber: e.target.value}))} />
                                                 </div>
                                                 <div>
                                                    <label className={labelClass}>Receipt #</label>
                                                    <input placeholder="Rec #" className={inputClass} value={newPax.receiptNumber || ''} onChange={e => setNewPax(p => ({...p, receiptNumber: e.target.value}))} />
                                                 </div>
                                                 <div className="flex items-end">
                                                    <label className={`flex items-center gap-3 w-full h-[42px] px-3 border border-slate-300 rounded-lg bg-white cursor-pointer hover:bg-slate-50 transition-colors shadow-sm`}>
                                                        <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" checked={!!newPax.isInfant} onChange={e => setNewPax(p => ({...p, isInfant: e.target.checked}))} />
                                                        <span className="text-sm font-bold text-slate-700 uppercase">Infant?</span>
                                                    </label>
                                                 </div>
                                             </div>

                                             <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end pt-2">
                                                  <div>
                                                      <label className={labelClass}>Body WGT (Lbs)</label>
                                                      <input type="number" className={inputClass} value={newPax.weight ?? ''} onChange={e => setNewPax(p => ({...p, weight: Number(e.target.value)}))} />
                                                  </div>
                                                  <div>
                                                      <label className={labelClass}>Free Bag (Lbs)</label>
                                                      <input type="number" className={inputClass} value={newPax.freeBagWeight ?? ''} onChange={e => setNewPax(p => ({...p, freeBagWeight: Number(e.target.value)}))} />
                                                  </div>
                                                  <div>
                                                      <label className={labelClass}>Excess Bag (Lbs)</label>
                                                      <input type="number" className={inputClass} value={newPax.excessBagWeight ?? ''} onChange={e => setNewPax(p => ({...p, excessBagWeight: Number(e.target.value)}))} />
                                                  </div>
                                                  <div>
                                                      <label className={labelClass}>Bag Tag #</label>
                                                      <input type="text" className={inputClass} value={newPax.bagTag || ''} onChange={e => setNewPax(p => ({...p, bagTag: e.target.value}))} />
                                                  </div>
                                                  
                                                  <div className="flex gap-2">
                                                      {editingPaxId ? (
                                                          <>
                                                            <button onClick={handleSavePax} className="flex-1 bg-amber-600 text-white rounded-lg h-[42px] font-bold hover:bg-amber-700 shadow-lg shadow-amber-200 flex items-center justify-center gap-2 transition-all transform active:scale-95">
                                                                <Save size={18}/> Update
                                                            </button>
                                                            <button onClick={handleCancelEdit} className="bg-slate-100 text-slate-500 rounded-lg h-[42px] px-3 font-bold hover:bg-slate-200 transition-all">
                                                                <X size={18}/>
                                                            </button>
                                                          </>
                                                      ) : (
                                                          <button onClick={handleSavePax} className="flex-1 bg-blue-600 text-white rounded-lg h-[42px] font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all transform active:scale-95">
                                                              <Plus size={18}/> Add Pax
                                                          </button>
                                                      )}
                                                  </div>
                                             </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left min-w-[1200px]">
                                                <thead>
                                                    <tr className="bg-slate-800 text-white border-b border-slate-700 uppercase tracking-wider text-[11px] font-bold">
                                                        <th className="px-4 py-3">Last Name</th>
                                                        <th className="px-4 py-3">First Name</th>
                                                        <th className="px-4 py-3 w-10 text-center">Inf</th>
                                                        <th className="px-4 py-3 w-12 text-center">Gen</th>
                                                        <th className="px-4 py-3">Nation</th>
                                                        <th className="px-4 py-3">Passport</th>
                                                        <th className="px-4 py-3 text-center">Route</th>
                                                        <th className="px-4 py-3 text-center">Seat</th>
                                                        <th className="px-4 py-3 text-right">Body</th>
                                                        <th className="px-4 py-3 text-right">Free</th>
                                                        <th className="px-4 py-3 text-right">Excess</th>
                                                        <th className="px-4 py-3">Bag Tag</th>
                                                        <th className="px-4 py-3">Ticket</th>
                                                        <th className="px-4 py-3">Receipt</th>
                                                        <th className="px-4 py-3 text-center w-20">Edit</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {dispatchData.passengers?.map((p, idx) => (
                                                        <tr key={p.id} className={`transition-colors group ${editingPaxId === p.id ? 'bg-amber-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50`}>
                                                            <td className="px-4 py-3 font-bold text-slate-900">{p.lastName}</td>
                                                            <td className="px-4 py-3 text-slate-700">{p.firstName}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                {p.isInfant && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">INF</span>}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.gender === 'F' ? 'bg-pink-100 text-pink-700' : p.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}>
                                                                    {p.gender}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-600">{p.nationality}</td>
                                                            <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">{p.passportNumber || '--'}</td>
                                                            <td className="px-4 py-3 text-center font-bold text-slate-700 text-[11px] bg-slate-100/50">
                                                                {p.departure}-{p.arrival}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {p.seatNumber ? (
                                                                    <span className="font-mono font-bold bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 text-[10px]">{p.seatNumber}</span>
                                                                ) : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{p.weight}</td>
                                                            <td className="px-4 py-3 text-right font-mono font-medium text-slate-600">{p.freeBagWeight}</td>
                                                            <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">{p.excessBagWeight > 0 ? p.excessBagWeight : '-'}</td>
                                                            <td className="px-4 py-3 font-mono text-slate-500 text-[10px]">{p.bagTag || '-'}</td>
                                                            <td className="px-4 py-3 font-mono text-slate-500 text-[10px]">{p.ticketNumber || '-'}</td>
                                                            <td className="px-4 py-3 font-mono text-slate-500 text-[10px]">{p.receiptNumber || '-'}</td>
                                                            <td className="px-4 py-3 text-center flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => handleEditPax(p)} className="text-blue-500 hover:bg-blue-100 p-1.5 rounded transition-colors" title="Edit">
                                                                    <Edit2 size={14}/>
                                                                </button>
                                                                <button onClick={() => handleDeletePax(p.id)} className="text-red-500 hover:bg-red-100 p-1.5 rounded transition-colors" title="Delete">
                                                                    <Trash2 size={14}/>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {dispatchData.passengers?.length === 0 && (
                                                        <tr>
                                                            <td colSpan={15} className="text-center py-12 text-slate-400 italic bg-slate-50/30">
                                                                No passengers added to manifest.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                                {(dispatchData.passengers?.length || 0) > 0 && (
                                                    <tfoot className="bg-slate-100 border-t border-slate-200 font-bold text-slate-800">
                                                        <tr>
                                                            <td colSpan={8} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-500">Total Pax Weights</td>
                                                            <td className="px-4 py-3 text-right font-mono text-sm">
                                                                {dispatchData.passengers?.reduce((acc, p) => acc + (p.weight || 0), 0)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-mono text-sm">
                                                                {dispatchData.passengers?.reduce((acc, p) => acc + (p.freeBagWeight || 0), 0)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-mono text-sm text-amber-700">
                                                                {dispatchData.passengers?.reduce((acc, p) => acc + (p.excessBagWeight || 0), 0)}
                                                            </td>
                                                            <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-blue-600">
                                                                Total: {totalPaxWeight} LBS
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>
                                    </div>

                                    {/* Cargo and Totals */}
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <Package size={18} className="text-amber-500"/> Cargo Manifest
                                            </h3>
                                        </div>
                                        
                                        <div className="p-5 bg-amber-50 border-b border-slate-200 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div>
                                                    <label className={labelClass}>Name of Consignor</label>
                                                    <input placeholder="Consignor" className={inputClass} value={newCargo.consignor} onChange={e => setNewCargo(p => ({...p, consignor: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Name of Consignee</label>
                                                    <input placeholder="Consignee" className={inputClass} value={newCargo.consignee} onChange={e => setNewCargo(p => ({...p, consignee: e.target.value}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Destination</label>
                                                    <input placeholder="DEST (e.g. KAI)" className={`${inputClass} uppercase`} value={newCargo.destination} onChange={e => setNewCargo(p => ({...p, destination: e.target.value.toUpperCase()}))} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Comments / Desc</label>
                                                    <input placeholder="Description" className={inputClass} value={newCargo.description} onChange={e => setNewCargo(p => ({...p, description: e.target.value}))} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                                <div>
                                                     <label className={labelClass}>No. Pieces</label>
                                                     <input type="number" className={inputClass} value={newCargo.pieces} onChange={e => setNewCargo(p => ({...p, pieces: Number(e.target.value)}))} />
                                                </div>
                                                <div>
                                                     <label className={labelClass}>Weight (Lbs)</label>
                                                     <input type="number" className={inputClass} value={newCargo.weight} onChange={e => setNewCargo(p => ({...p, weight: Number(e.target.value)}))} />
                                                </div>
                                                <div className="md:col-span-2 text-right">
                                                    <button onClick={handleAddCargo} className="bg-amber-500 text-white rounded-lg px-6 h-[42px] font-bold hover:bg-amber-600 shadow-lg shadow-amber-200 flex items-center justify-center gap-2 w-full md:w-auto ml-auto transition-all transform active:scale-95">
                                                        <Plus size={18}/> Add Cargo
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left min-w-[800px]">
                                                <thead className="bg-slate-800 text-white border-b border-slate-700 uppercase tracking-wider text-[11px] font-bold">
                                                    <tr>
                                                        <th className="px-6 py-3">Consignor</th>
                                                        <th className="px-6 py-3">Consignee</th>
                                                        <th className="px-6 py-3">Destination</th>
                                                        <th className="px-6 py-3">No. Pieces</th>
                                                        <th className="px-6 py-3">Comments</th>
                                                        <th className="px-6 py-3 text-right">Weight (Lbs)</th>
                                                        <th className="px-6 py-3 text-center w-16">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {dispatchData.cargoItems?.map((c, idx) => (
                                                        <tr key={c.id} className={`transition-colors group hover:bg-amber-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                                            <td className="px-6 py-4 text-slate-800 font-bold">{c.consignor}</td>
                                                            <td className="px-6 py-4 text-slate-700 font-medium">{c.consignee}</td>
                                                            <td className="px-6 py-4 font-bold text-slate-800 uppercase font-mono">{c.destination}</td>
                                                            <td className="px-6 py-4 text-slate-600 font-mono">{c.pieces}</td>
                                                            <td className="px-6 py-4 text-slate-500 italic">{c.description}</td>
                                                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">{c.weight}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <button onClick={() => setDispatchData(prev => ({...prev, cargoItems: prev.cargoItems?.filter(x => x.id !== c.id)}))} className="text-slate-300 group-hover:text-red-500 transition-colors p-1.5 rounded hover:bg-red-50">
                                                                    <Trash2 size={16}/>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {dispatchData.cargoItems?.length === 0 && (
                                                        <tr>
                                                            <td colSpan={7} className="text-center py-12 text-slate-400 italic bg-slate-50/30">
                                                                No cargo added.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                                {(dispatchData.cargoItems?.length || 0) > 0 && (
                                                    <tfoot className="bg-slate-100 font-bold text-slate-800 border-t border-slate-200">
                                                        <tr>
                                                            <td colSpan={5} className="px-6 py-3 text-right uppercase text-xs tracking-wider text-slate-500">Total Cargo Weight</td>
                                                            <td className="px-6 py-3 text-right text-sm font-mono text-amber-700">{totalCargoWeight} LBS</td>
                                                            <td></td>
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: FUEL */}
                            {activeTab === 'fuel' && (
                                <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Fuel size={18} className="text-indigo-500"/> Fuel Planning</h3>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <label className="block text-xs font-bold text-slate-500 uppercase">Trip Fuel</label>
                                                <input type="number" value={dispatchData.fuel?.trip} onChange={e => updateFuel('trip', Number(e.target.value))} className="w-full border rounded px-3 py-2 font-mono"/>
                                                
                                                <label className="block text-xs font-bold text-slate-500 uppercase">Contingency</label>
                                                <input type="number" value={dispatchData.fuel?.contingency} onChange={e => updateFuel('contingency', Number(e.target.value))} className="w-full border rounded px-3 py-2 font-mono"/>
                                                
                                                <label className="block text-xs font-bold text-slate-500 uppercase">Alternate</label>
                                                <input type="number" value={dispatchData.fuel?.alternate} onChange={e => updateFuel('alternate', Number(e.target.value))} className="w-full border rounded px-3 py-2 font-mono"/>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="block text-xs font-bold text-slate-500 uppercase">Taxi Fuel</label>
                                                <input type="number" value={dispatchData.fuel?.taxi} onChange={e => updateFuel('taxi', Number(e.target.value))} className="w-full border rounded px-3 py-2 font-mono"/>
                                                
                                                <label className="block text-xs font-bold text-slate-500 uppercase">Final Reserve / Hold</label>
                                                <input type="number" value={dispatchData.fuel?.holding} onChange={e => updateFuel('holding', Number(e.target.value))} className="w-full border rounded px-3 py-2 font-mono"/>
                                                
                                                <div className="mt-6 pt-4 border-t border-slate-100">
                                                    <label className="block text-xs font-bold text-indigo-600 uppercase mb-1">Total FOB (Actual)</label>
                                                    <input type="number" value={fob} onChange={e => updateFuel('totalFob', Number(e.target.value))} className="w-full border-2 border-indigo-100 bg-indigo-50 rounded px-3 py-2 font-bold text-indigo-900"/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: WEIGHT & BALANCE */}
                            {activeTab === 'weight' && (
                                <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2">
                                    <WnBSheet 
                                        data={dispatchData.wnb || INITIAL_WNB} 
                                        onChange={updateWnB}
                                        paxData={dispatchData.passengers || []}
                                        basicEmptyWeight={dispatchData.basicEmptyWeight || 0}
                                        fuelWeight={fob}
                                        tripFuel={dispatchData.fuel?.trip || 0}
                                        taxiFuel={dispatchData.fuel?.taxi || 0}
                                        crewWeight={190 * 2} // default approximation if not set
                                        limits={{ mtow, mlw, mzfw }}
                                        flight={selectedFlight}
                                        crew={crew.find(c => c.code === selectedFlight.pic)}
                                    />
                                </div>
                            )}

                            {/* TAB 5: OPS PLAN */}
                            {activeTab === 'opsplan' && (
                                <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 pb-10">
                                    <div className="bg-white border border-slate-300 shadow-sm p-8 min-h-[800px] relative">
                                        {/* Paper Texture Effect */}
                                        <div className="absolute inset-0 bg-slate-50 opacity-10 pointer-events-none pattern-grid-lg"></div>

                                        {/* Header Block */}
                                        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                                            <div>
                                                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Operational Flight Plan</h2>
                                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Trans Guyana Airways Limited</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-4xl font-black text-slate-200">OFP</div>
                                            </div>
                                        </div>

                                        {/* Flight Details Grid */}
                                        <div className="grid grid-cols-4 gap-4 mb-8">
                                            <OpsBox label="Date of Flight">{selectedFlight.date}</OpsBox>
                                            <OpsBox label="Aircraft Type">{selectedFlight.aircraftType}</OpsBox>
                                            <OpsBox label="Registration" valueClassName="text-lg">{selectedFlight.aircraftRegistration}</OpsBox>
                                            <OpsBox label="Flight Number">{selectedFlight.flightNumber}</OpsBox>
                                        </div>

                                        {/* Crew Grid */}
                                        <div className="grid grid-cols-3 gap-4 mb-8">
                                            <OpsBox label="Pilot In Command" className="col-span-1">{getCrewName(selectedFlight.pic)}</OpsBox>
                                            <OpsBox label="Second In Command" className="col-span-1">{selectedFlight.sic ? getCrewName(selectedFlight.sic) : 'NIL'}</OpsBox>
                                            <OpsBox label="Cabin Crew" className="col-span-1">NIL</OpsBox>
                                        </div>

                                        {/* Times Grid */}
                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <OpsBox label="Departure Time (ETD)" valueClassName="text-2xl">{selectedFlight.etd}</OpsBox>
                                            <OpsBox label="Arrival Time (ETA)" className="bg-slate-50/50">
                                                <span className="text-slate-300 italic">calculated in flight</span>
                                            </OpsBox>
                                        </div>

                                        {/* Route Visual */}
                                        <div className="border border-slate-200 rounded-xl p-6 mb-8 bg-slate-50/30">
                                            <div className="flex items-center justify-between px-10 relative">
                                                {/* Connecting Line */}
                                                <div className="absolute left-16 right-16 top-1/2 h-0.5 bg-slate-200 -z-10"></div>
                                                
                                                <div className="flex flex-col items-center bg-white px-4 z-10">
                                                    <span className="text-xs font-bold text-slate-400 mb-1">FROM</span>
                                                    <span className="text-3xl font-black text-slate-800">{selectedFlight.route.split('-')[0]}</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <Plane size={24} className="text-blue-500 transform rotate-90"/>
                                                </div>
                                                <div className="flex flex-col items-center bg-white px-4 z-10">
                                                    <span className="text-xs font-bold text-slate-400 mb-1">TO</span>
                                                    <span className="text-3xl font-black text-slate-800">{selectedFlight.route.split('-')[1]}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Operational Data */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                            <div className="space-y-4">
                                                <div className="p-4 border border-slate-200 rounded-lg">
                                                    <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Destination Aerodrome</span>
                                                    <input 
                                                        className="w-full font-bold text-lg outline-none" 
                                                        value={dispatchData.opsPlan?.weatherDest} 
                                                        placeholder="Enter Destination..."
                                                    />
                                                </div>
                                                <div className="p-4 border border-slate-200 rounded-lg">
                                                    <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Alternate Aerodrome</span>
                                                    <input 
                                                        className="w-full font-bold text-lg outline-none" 
                                                        value={dispatchData.opsPlan?.weatherAlt} 
                                                        placeholder="Enter Alternate..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex gap-4">
                                                    <OpsBox label="Fuel (Gals)" valueClassName="text-xl">{(fob / 6.7).toFixed(1)}</OpsBox>
                                                    <OpsBox label="Fuel (Lbs)" valueClassName="text-xl">{fob}</OpsBox>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-3 border border-slate-200 rounded-lg">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Operation Type</span>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => updateOpsPlan('typeOfOperation', 'IFR')}
                                                                className={`flex-1 py-1 text-xs font-bold rounded ${dispatchData.opsPlan?.typeOfOperation === 'IFR' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}
                                                            >
                                                                IFR
                                                            </button>
                                                            <button 
                                                                onClick={() => updateOpsPlan('typeOfOperation', 'VFR')}
                                                                className={`flex-1 py-1 text-xs font-bold rounded ${dispatchData.opsPlan?.typeOfOperation === 'VFR' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                                                            >
                                                                VFR
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 border border-slate-200 rounded-lg">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Flight Type</span>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => updateOpsPlan('flightType', 'Schedule')}
                                                                className={`flex-1 py-1 text-xs font-bold rounded ${dispatchData.opsPlan?.flightType === 'Schedule' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                                                            >
                                                                SCH
                                                            </button>
                                                            <button 
                                                                onClick={() => updateOpsPlan('flightType', 'Non-Schedule')}
                                                                className={`flex-1 py-1 text-xs font-bold rounded ${dispatchData.opsPlan?.flightType === 'Non-Schedule' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}
                                                            >
                                                                NS
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Weather & Remarks */}
                                        <div className="space-y-6 mb-12">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Weather Reports & Forecasts (METAR / TAF)</label>
                                                <textarea 
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Paste METAR/TAF data here..."
                                                    value={dispatchData.opsPlan?.additionalWx}
                                                    onChange={(e) => updateOpsPlan('additionalWx', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Remarks / NOTAMS</label>
                                                <textarea 
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-sm min-h-[80px] outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Enter operational remarks..."
                                                    value={dispatchData.opsPlan?.remarks}
                                                    onChange={(e) => updateOpsPlan('remarks', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Signature Footer */}
                                        <div className="flex justify-between items-end pt-8 border-t-2 border-slate-100">
                                            <div className="w-1/3 border-b border-slate-400 pb-2">
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Prepared By</span>
                                                <span className="font-script text-2xl text-blue-900">Dispatcher</span>
                                            </div>
                                            <div className="w-1/3 border-b border-slate-400 pb-2 text-right">
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Captain's Acceptance</span>
                                            </div>
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
                                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                                            <FileCheck size={40} />
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
                                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                            >
                                                <FileCheck size={20} />
                                                RELEASE FLIGHT {selectedFlight.flightNumber}
                                            </button>
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

// -- W&B Sheet Component --
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
    
    // Simple Moment Calculation (Arm * Weight / 1000)
    // Arms for C208B (Approximate)
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
        fuel: 200 // Approx center of fuel tank
    };

    const calcMoment = (weight: number, arm: number) => (weight * arm) / 1000;

    // Derived Weights (Auto-Summing Pax into Zones if needed, but here we use manual overrides for flexibility as per sheet)
    // In a real app, we might map passengers to specific seats automatically.
    
    const totalLoad = 
        data.seat2 + data.seat3_5 + data.seat6_8 + data.seat9_11 + data.seat12_14 +
        data.zone1 + data.zone2 + data.zone3 + data.zone4 + data.zone5 + data.zone6 +
        data.podA + data.podB + data.podC + data.podD;

    const zeroFuelWeight = basicEmptyWeight + crewWeight + totalLoad;
    const rampWeight = zeroFuelWeight + fuelWeight;
    const takeoffWeight = rampWeight - taxiFuel; // Subtract Taxi
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
            {/* Header */}
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
                {/* LEFT COLUMN: INPUTS */}
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
                            
                            {/* Passenger Rows */}
                            <EntryRow label="Seat 2" field="seat2" arm={arms.seat2} />
                            <EntryRow label="Seat 3, 4, 5" field="seat3_5" arm={arms.seat3_5} />
                            <EntryRow label="Seat 6, 7, 8" field="seat6_8" arm={arms.seat6_8} />
                            <EntryRow label="Seat 9, 10, 11" field="seat9_11" arm={arms.seat9_11} />
                            <EntryRow label="Seat 12, 13, 14" field="seat12_14" arm={arms.seat12_14} />
                            
                            {/* Separator */}
                            <tr><td colSpan={4} className="bg-slate-100 h-1"></td></tr>

                            {/* Cargo Zones */}
                            <EntryRow label="Zone 1 (Cabin)" field="zone1" arm={arms.zone1} />
                            <EntryRow label="Zone 2" field="zone2" arm={arms.zone2} />
                            <EntryRow label="Zone 3" field="zone3" arm={arms.zone3} />
                            <EntryRow label="Zone 4" field="zone4" arm={arms.zone4} />
                            <EntryRow label="Zone 5" field="zone5" arm={arms.zone5} />
                            <EntryRow label="Zone 6" field="zone6" arm={arms.zone6} />

                            {/* Separator */}
                            <tr><td colSpan={4} className="bg-slate-100 h-1"></td></tr>

                            {/* Pods */}
                            <EntryRow label="Pod A" field="podA" arm={arms.podA} />
                            <EntryRow label="Pod B" field="podB" arm={arms.podB} />
                            <EntryRow label="Pod C" field="podC" arm={arms.podC} />
                            <EntryRow label="Pod D" field="podD" arm={arms.podD} />
                        </tbody>
                    </table>
                </div>

                {/* RIGHT COLUMN: SUMMARY & ENVELOPE */}
                <div className="w-full lg:w-96 bg-slate-50 p-6 flex flex-col gap-6">
                    
                    {/* Totals Summary */}
                    <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-slate-800 text-white text-xs font-bold uppercase py-2 px-3 text-center tracking-wider">
                            Weight Summary
                        </div>
                        <div className="divide-y divide-slate-100">
                            <div className="flex justify-between p-3">
                                <span className="text-sm text-slate-600 font-bold">Zero Fuel Weight</span>
                                <span className={`text-sm font-mono font-bold ${zeroFuelWeight > limits.mzfw ? 'text-red-600' : 'text-slate-900'}`}>
                                    {zeroFuelWeight}
                                </span>
                            </div>
                            <div className="flex justify-between p-3 bg-blue-50">
                                <span className="text-sm text-blue-800 font-bold">+ Fuel Load</span>
                                <span className="text-sm font-mono font-bold text-blue-900">{fuelWeight}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-slate-100 border-t border-slate-200">
                                <span className="text-sm text-slate-800 font-black">Ramp Weight</span>
                                <span className="text-sm font-mono font-black text-slate-900">{rampWeight}</span>
                            </div>
                            <div className="flex justify-between p-3">
                                <span className="text-sm text-slate-500 font-medium">- Taxi Fuel</span>
                                <span className="text-sm font-mono text-slate-500">{taxiFuel}</span>
                            </div>
                            <div className="flex justify-between p-3 border-t-2 border-slate-200">
                                <span className="text-sm text-slate-800 font-black uppercase">Takeoff Weight</span>
                                <div className="text-right">
                                    <span className={`block text-lg font-mono font-black ${takeoffWeight > limits.mtow ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {takeoffWeight}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold">MAX: {limits.mtow}</span>
                                </div>
                            </div>
                            <div className="flex justify-between p-3 border-t border-slate-100">
                                <span className="text-sm text-slate-600 font-bold">Landing Weight</span>
                                <div className="text-right">
                                    <span className={`block text-sm font-mono font-bold ${landingWeight > limits.mlw ? 'text-red-600' : 'text-slate-700'}`}>
                                        {landingWeight}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold">MAX: {limits.mlw}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CG Graph Placeholder */}
                    <div className="bg-white border border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-slate-300 min-h-[200px] relative overflow-hidden">
                        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 pointer-events-none">
                            {[...Array(36)].map((_, i) => (
                                <div key={i} className="border-r border-b border-slate-100"></div>
                            ))}
                        </div>
                        <div className="z-10 text-center">
                            <Activity size={48} className="mx-auto mb-2 opacity-50" />
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">C.G. Envelope</p>
                            <p className="text-[10px] mt-1">Visualization Placeholder</p>
                        </div>
                        {/* Fake Plot Point */}
                        <div className="absolute top-[40%] left-[60%] w-3 h-3 bg-red-500 rounded-full shadow-sm z-20 border-2 border-white"></div>
                    </div>

                    {/* Signatures */}
                    <div className="mt-auto space-y-4">
                        <div className="border-b border-slate-400 pb-1">
                            <p className="font-script text-xl text-blue-900 ml-2">Dispatcher</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Loaded By</p>
                        
                        <div className="border-b border-slate-400 pb-1 mt-4">
                             <p className="font-script text-xl text-blue-900 ml-2">{crew ? crew.name : ''}</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Captain's Signature</p>
                    </div>

                </div>
            </div>
        </div>
    );
};
