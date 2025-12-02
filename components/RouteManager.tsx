
import React, { useState } from 'react';
import { RouteDefinition, SystemSettings } from '../types';
import { Trash2, Plus, Edit2, Save, MapPin, Upload, FileSpreadsheet, Loader2, Search, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { FeatureGate } from './FeatureGate';

interface RouteManagerProps {
  routes: RouteDefinition[];
  onAddRoute: (route: Omit<RouteDefinition, 'id'>) => Promise<void>;
  onUpdateRoute: (id: string, route: Partial<RouteDefinition>) => Promise<void>;
  onDeleteRoute: (id: string) => Promise<void>;
  features: SystemSettings;
}

export const RouteManager: React.FC<RouteManagerProps> = ({
  routes,
  onAddRoute,
  onUpdateRoute,
  onDeleteRoute,
  features
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [routeSearch, setRouteSearch] = useState('');
  const [routeForm, setRouteForm] = useState<Partial<RouteDefinition>>({});
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Specific Time Input States (Strings for H:MM input)
  const [times208B, setTimes208B] = useState({ ft: '', buf: '', ct: '' });
  const [times208EX, setTimes208EX] = useState({ ft: '', buf: '', ct: '' });

  // -- Helpers --

  const decimalToHm = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '';
    const hrs = Math.floor(val);
    const mins = Math.round((val - hrs) * 60);
    const minsStr = mins.toString().padStart(2, '0');
    return `${hrs}:${minsStr}`;
  };

  const hmToDecimal = (str: string | undefined): number => {
    if (!str) return 0;
    if (str.includes(':')) {
        const [h, m] = str.split(':').map(Number);
        const hours = isNaN(h) ? 0 : h;
        const minutes = isNaN(m) ? 0 : m;
        return hours + (minutes / 60);
    }
    return parseFloat(str) || 0;
  };

  // -- Handlers --

  const handleEditRoute = (route: RouteDefinition) => {
    setRouteForm(route);
    setTimes208B({
        ft: decimalToHm(route.flightTimeC208B),
        buf: decimalToHm(route.bufferC208B),
        ct: decimalToHm(route.commercialTimeC208B)
    });
    setTimes208EX({
        ft: decimalToHm(route.flightTimeC208EX),
        buf: decimalToHm(route.bufferC208EX),
        ct: decimalToHm(route.commercialTimeC208EX)
    });
    setEditingId(route.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveRoute = async () => {
    if (!routeForm.code) return;
    
    const payload = { 
        ...routeForm, 
        // Ensure name is synced with 'to' if not provided explicitly, or just strictly stick to fields
        name: routeForm.to || routeForm.code, 
        // C208B
        flightTimeC208B: hmToDecimal(times208B.ft),
        bufferC208B: hmToDecimal(times208B.buf),
        commercialTimeC208B: hmToDecimal(times208B.ct),
        // C208EX
        flightTimeC208EX: hmToDecimal(times208EX.ft),
        bufferC208EX: hmToDecimal(times208EX.buf),
        commercialTimeC208EX: hmToDecimal(times208EX.ct),
        // Fallback for legacy
        flightTime: hmToDecimal(times208B.ft)
    };

    if (editingId) {
      await onUpdateRoute(editingId, payload);
      setEditingId(null);
    } else {
      await onAddRoute(payload as RouteDefinition);
    }
    resetForm();
  };

  const resetForm = () => {
    setRouteForm({});
    setTimes208B({ ft: '', buf: '', ct: '' });
    setTimes208EX({ ft: '', buf: '', ct: '' });
    setEditingId(null);
  };

  const handleDownloadTemplate = () => {
    const headers = "CODE,FROM,TO,DISTANCE (NM),FT 208B,BUF 208B,COMM 208B,FT 208EX,BUF 208EX,COMM 208EX";
    const sample = "OGL-KAI,OGL,KAI,125,1:00,0:15,1:15,0:55,0:10,1:05";
    const csvContent = "data:text/csv;charset=utf-8," + [headers, sample].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "tga_routes_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      await processCSV(text);
      setIsImporting(false);
      event.target.value = '';
    };
    reader.onerror = () => {
        alert("Failed to read file");
        setIsImporting(false);
    };
    reader.readAsText(file);
  };

  const processCSV = async (csvText: string) => {
    try {
        const lines = csvText.split('\n');
        let importedCount = 0;
        // Skip header (index 0)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // CSV Parse taking into account commas in quotes if needed, 
            // but for simplicity assuming standard comma separation as per template
            const parts = line.split(',');
            
            // Index Mapping based on: CODE, FROM, TO, DISTANCE, FT 208B, BUF 208B, COMM 208B, FT 208EX, BUF 208EX, COMM 208EX
            const code = parts[0]?.trim().toUpperCase();
            const from = parts[1]?.trim().toUpperCase();
            const to = parts[2]?.trim().toUpperCase(); // Or keep case sensitive for names if used as name
            
            if (!code) continue;
            
            const distance = parseFloat(parts[3]?.trim() || '0');
            
            // C208B
            const ft208b = hmToDecimal(parts[4]?.trim());
            const buf208b = hmToDecimal(parts[5]?.trim());
            const ct208b = hmToDecimal(parts[6]?.trim());
            
            // C208EX
            const ft208ex = hmToDecimal(parts[7]?.trim());
            const buf208ex = hmToDecimal(parts[8]?.trim());
            const ct208ex = hmToDecimal(parts[9]?.trim());
            
            // Check duplicates
            const exists = routes.some(r => r.code === code);
            if (!exists) {
                await onAddRoute({ 
                    name: to, // Use 'To' as the friendly name
                    code,
                    from,
                    to,
                    distance, 
                    flightTime: ft208b, 
                    flightTimeC208B: ft208b,
                    bufferC208B: buf208b,
                    commercialTimeC208B: ct208b,
                    flightTimeC208EX: ft208ex,
                    bufferC208EX: buf208ex,
                    commercialTimeC208EX: ct208ex
                });
                importedCount++;
            }
        }
        if (importedCount > 0) alert(`Successfully imported ${importedCount} new routes.`);
        else alert("No new routes found in the file.");
    } catch (error) {
        console.error("Import error:", error);
        alert("Error processing CSV file. Please check the format.");
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setRouteSearch(e.target.value);
      setCurrentPage(1); // Reset to first page
  };

  const filteredRoutes = routes.filter(r => {
    const term = routeSearch.toLowerCase();
    const matchesCode = r.code.toLowerCase().includes(term);
    const matchesTo = (r.to || '').toLowerCase().includes(term);
    const matchesFrom = (r.from || '').toLowerCase().includes(term);
    const matchesName = (r.name || '').toLowerCase().includes(term);
    return matchesCode || matchesTo || matchesFrom || matchesName;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredRoutes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRoutes = filteredRoutes.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
    }
  };

  const inputClass = "w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none font-medium placeholder:text-slate-400";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1";
  
  const thClass = "px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 whitespace-nowrap";
  const tdClass = "px-4 py-3 text-sm border-b border-slate-100 group-last:border-0 align-middle whitespace-nowrap";

  return (
    <FeatureGate isEnabled={features.enableRouteManagement ?? true}>
        <div className="max-w-7xl mx-auto p-4 lg:p-8 pb-32 animate-in fade-in duration-300">
            <header className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Route Management</h1>
                <p className="text-slate-500 mt-1">Manage flight routes, distances, and average durations per aircraft type.</p>
            </header>

            <div className="space-y-6">
                {/* Input Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 relative z-10 gap-4">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            {editingId ? (
                                <><div className="p-1.5 bg-blue-100 text-blue-600 rounded"><Edit2 size={16}/></div> Edit Route Details</>
                            ) : (
                                <><div className="p-1.5 bg-blue-100 text-blue-600 rounded"><Plus size={16}/></div> Add New Route</>
                            )}
                        </h3>
                        
                        {!editingId && (
                            <div className="flex items-center gap-3">
                                <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-100 rounded-lg transition-all">
                                    <FileSpreadsheet size={14} /> <span>Template</span>
                                </button>
                                <div className="relative">
                                    <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isImporting} />
                                    <button className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-lg shadow-sm transition-all ${isImporting ? 'opacity-70 cursor-wait' : ''}`}>
                                        {isImporting ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14} />}
                                        <span>{isImporting ? 'Importing...' : 'Import CSV'}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        {editingId && (
                            <button onClick={resetForm} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase">Cancel Edit</button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-start relative z-10">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Route Code</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input placeholder="e.g. OGL-KAI" className={`${inputClass} pl-10 uppercase font-mono font-bold tracking-wide text-slate-700`} value={routeForm.code || ''} onChange={e => setRouteForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className={labelClass}>From</label>
                                    <input placeholder="e.g. OGL" className={`${inputClass} uppercase`} value={routeForm.from || ''} onChange={e => setRouteForm(p => ({ ...p, from: e.target.value.toUpperCase() }))} />
                                </div>
                                <div>
                                    <label className={labelClass}>To</label>
                                    <input placeholder="e.g. KAI" className={`${inputClass} uppercase`} value={routeForm.to || ''} onChange={e => setRouteForm(p => ({ ...p, to: e.target.value.toUpperCase() }))} />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Distance (nm)</label>
                                <input placeholder="0" type="number" className={inputClass} value={routeForm.distance || ''} onChange={e => setRouteForm(p => ({ ...p, distance: Number(e.target.value) }))} />
                            </div>
                        </div>

                        {/* C208B Data */}
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-3">
                            <h4 className="text-xs font-bold text-emerald-800 uppercase border-b border-emerald-200 pb-2 mb-3">C208B Performance</h4>
                            <div>
                                <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">Flight Time</label>
                                <input placeholder="H:MM" className="w-full px-3 py-2 text-sm bg-white border border-emerald-200 rounded text-center font-mono focus:ring-2 focus:ring-emerald-500 outline-none" value={times208B.ft} onChange={e => setTimes208B(p => ({ ...p, ft: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">Comm Buffer</label>
                                <input placeholder="H:MM" className="w-full px-3 py-2 text-sm bg-white border border-emerald-200 rounded text-center font-mono focus:ring-2 focus:ring-emerald-500 outline-none" value={times208B.buf} onChange={e => setTimes208B(p => ({ ...p, buf: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">Commercial Time</label>
                                <input placeholder="H:MM" className="w-full px-3 py-2 text-sm bg-white border border-emerald-200 rounded text-center font-mono font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none" value={times208B.ct} onChange={e => setTimes208B(p => ({ ...p, ct: e.target.value }))} />
                            </div>
                        </div>

                        {/* C208EX Data */}
                        <div className="p-4 bg-sky-50 rounded-xl border border-sky-100 space-y-3">
                            <h4 className="text-xs font-bold text-sky-800 uppercase border-b border-sky-200 pb-2 mb-3">C208EX Performance</h4>
                            <div>
                                <label className="block text-[10px] font-bold text-sky-700 uppercase mb-1">Flight Time</label>
                                <input placeholder="H:MM" className="w-full px-3 py-2 text-sm bg-white border border-sky-200 rounded text-center font-mono focus:ring-2 focus:ring-sky-500 outline-none" value={times208EX.ft} onChange={e => setTimes208EX(p => ({ ...p, ft: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-sky-700 uppercase mb-1">Comm Buffer</label>
                                <input placeholder="H:MM" className="w-full px-3 py-2 text-sm bg-white border border-sky-200 rounded text-center font-mono focus:ring-2 focus:ring-sky-500 outline-none" value={times208EX.buf} onChange={e => setTimes208EX(p => ({ ...p, buf: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-sky-700 uppercase mb-1">Commercial Time</label>
                                <input placeholder="H:MM" className="w-full px-3 py-2 text-sm bg-white border border-sky-200 rounded text-center font-mono font-bold text-sky-900 focus:ring-2 focus:ring-sky-500 outline-none" value={times208EX.ct} onChange={e => setTimes208EX(p => ({ ...p, ct: e.target.value }))} />
                            </div>
                        </div>

                        {/* Action */}
                        <div className="flex flex-col justify-end h-full">
                            <button onClick={handleSaveRoute} className={`w-full h-12 rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 ${editingId ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200'}`}>
                                {editingId ? <><Save size={18} /> Update Route</> : <><Plus size={18} /> Add Route</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Search routes by code, from, or to..." value={routeSearch} onChange={handleSearchChange} className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm placeholder:text-slate-400" />
                </div>

                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className={thClass}>Code</th>
                                    <th className={thClass}>From</th>
                                    <th className={thClass}>To</th>
                                    <th className={thClass}>Distance (nm)</th>
                                    
                                    {/* C208B Group */}
                                    <th className={`${thClass} bg-emerald-50 text-emerald-700 border-l border-emerald-100`}>FT 208B</th>
                                    <th className={`${thClass} bg-emerald-50 text-emerald-700`}>Buf 208B</th>
                                    <th className={`${thClass} bg-emerald-50 text-emerald-700`}>Comm 208B</th>
                                    
                                    {/* C208EX Group */}
                                    <th className={`${thClass} bg-sky-50 text-sky-700 border-l border-sky-100`}>FT 208EX</th>
                                    <th className={`${thClass} bg-sky-50 text-sky-700`}>Buf 208EX</th>
                                    <th className={`${thClass} bg-sky-50 text-sky-700`}>Comm 208EX</th>
                                    
                                    <th className={`${thClass} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {paginatedRoutes.map(route => {
                                    // Fallback if from/to are undefined
                                    const fromDisplay = route.from || (route.code.includes('-') ? route.code.split('-')[0] : route.code);
                                    const toDisplay = route.to || (route.code.includes('-') ? route.code.split('-')[1] : '');

                                    return (
                                        <tr key={route.id} className="group hover:bg-slate-50 transition-colors">
                                            <td className={tdClass}>
                                                <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">{route.code}</span>
                                            </td>
                                            <td className={tdClass}><span className="font-bold text-slate-700">{fromDisplay}</span></td>
                                            <td className={tdClass}><span className="font-bold text-slate-700">{toDisplay}</span></td>
                                            <td className={tdClass}><span className="font-mono text-slate-600">{route.distance || '--'}</span></td>
                                            
                                            {/* C208B */}
                                            <td className={`${tdClass} border-l border-slate-100 bg-emerald-50/30`}>
                                                <span className="font-mono text-emerald-900">{decimalToHm(route.flightTimeC208B) || '--'}</span>
                                            </td>
                                            <td className={`${tdClass} bg-emerald-50/30`}>
                                                <span className="font-mono text-emerald-700 opacity-80">{decimalToHm(route.bufferC208B) || '--'}</span>
                                            </td>
                                            <td className={`${tdClass} bg-emerald-50/30`}>
                                                <span className="font-mono font-bold text-emerald-800">{decimalToHm(route.commercialTimeC208B) || '--'}</span>
                                            </td>

                                            {/* C208EX */}
                                            <td className={`${tdClass} border-l border-slate-100 bg-sky-50/30`}>
                                                <span className="font-mono text-sky-900">{decimalToHm(route.flightTimeC208EX) || '--'}</span>
                                            </td>
                                            <td className={`${tdClass} bg-sky-50/30`}>
                                                <span className="font-mono text-sky-700 opacity-80">{decimalToHm(route.bufferC208EX) || '--'}</span>
                                            </td>
                                            <td className={`${tdClass} bg-sky-50/30`}>
                                                <span className="font-mono font-bold text-sky-800">{decimalToHm(route.commercialTimeC208EX) || '--'}</span>
                                            </td>

                                            <td className={`${tdClass} text-right`}>
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => handleEditRoute(route)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors" title="Edit Route">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => onDeleteRoute(route.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Route">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {paginatedRoutes.length === 0 && (
                                    <tr>
                                        <td colSpan={11} className="px-6 py-16 text-center text-slate-400">
                                            <MapPin size={24} className="opacity-50 mx-auto mb-3" />
                                            <p>No Routes Found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Footer */}
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white border-t border-slate-200 gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 uppercase">Rows per page:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium py-1.5 px-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-6">
                            <span className="text-xs font-medium text-slate-500">
                                Showing <span className="font-bold text-slate-700">{filteredRoutes.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredRoutes.length)}</span> of <span className="font-bold text-slate-700">{filteredRoutes.length}</span>
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={20} className="text-slate-600" />
                                </button>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={20} className="text-slate-600" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </FeatureGate>
  );
};
