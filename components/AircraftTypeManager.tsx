
import React, { useState } from 'react';
import { useAppData } from '../context/DataContext';
import { AircraftType } from '../types';
import { seedAircraftTypes } from '../services/firebase';
import { Plane, Trash2, Plus, Edit2, X, Loader2, List, Hash, Globe, RefreshCw, AlertTriangle, CheckCircle2, AlertOctagon } from 'lucide-react';

export const AircraftTypeManager: React.FC = () => {
  const { aircraftTypes, addAircraftType, updateAircraftType, deleteAircraftType } = useAppData();
  
  const [form, setForm] = useState({
    code: '',
    name: '',
    icao: '',
    displayOrder: 0
  });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sort by displayOrder for display
  const sortedTypes = [...aircraftTypes].sort((a, b) => a.displayOrder - b.displayOrder);

  const resetForm = () => {
    setForm({ code: '', name: '', icao: '', displayOrder: 0 });
    setEditingId(null);
    setIsSubmitting(false);
    setErrorMsg(null);
  };

  const handleEdit = (type: AircraftType) => {
    setForm({
      code: type.code,
      name: type.name,
      icao: type.icao || '',
      displayOrder: type.displayOrder
    });
    setEditingId(type.id);
    setErrorMsg(null);
    setSuccessMsg(null);
    setConfirmDeleteId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const payload = {
        code: form.code.toUpperCase(),
        name: form.name,
        icao: form.icao.toUpperCase(),
        displayOrder: Number(form.displayOrder)
      };

      if (editingId) {
        await updateAircraftType(editingId, payload);
        setSuccessMsg("Aircraft Type updated successfully.");
      } else {
        if (aircraftTypes.some(t => t.code === payload.code)) {
            setErrorMsg('Aircraft Type code already exists');
            setIsSubmitting(false);
            return;
        }
        await addAircraftType(payload);
        setSuccessMsg("Aircraft Type created successfully.");
      }
      resetForm();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      console.error("Error saving aircraft type:", error);
      if (error.code === 'permission-denied') {
        setErrorMsg('Permission Denied: You do not have access to manage aircraft types.');
      } else {
        setErrorMsg('Operation failed. Please check your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDelete = (id: string) => {
      setConfirmDeleteId(id);
      // Auto-cancel after 4 seconds
      setTimeout(() => {
          setConfirmDeleteId(current => current === id ? null : current);
      }, 4000);
  };

  const confirmDelete = async (id: string) => {
    setConfirmDeleteId(null);
    setDeletingId(id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await deleteAircraftType(id);
      setSuccessMsg("Aircraft Type deleted successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      console.error("Error deleting aircraft type:", error);
      if (error.code === 'permission-denied') {
        setErrorMsg('Permission Denied: Your account role (Dispatcher) does not have delete privileges for this resource. Contact Admin.');
      } else {
        setErrorMsg(`Failed to delete: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleSeed = async () => {
      setIsSubmitting(true);
      setErrorMsg(null);
      try {
        await seedAircraftTypes();
        setSuccessMsg("Default types initialized.");
      } catch(e: any) {
        console.error("Seed error", e);
        if (e.code === 'permission-denied') {
            setErrorMsg('Permission Denied: Cannot initialize types.');
        }
      } finally {
        setIsSubmitting(false);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
  };

  const inputClass = "w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none font-medium placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Editor Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
            {isSubmitting && (
                <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
            )}
            
            <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${editingId ? 'bg-indigo-50/50' : 'bg-white'}`}>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    {editingId ? (
                        <><div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Edit2 size={18}/></div> Edit Aircraft Type</>
                    ) : (
                        <><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Plus size={18}/></div> Add New Aircraft Type</>
                    )}
                </h3>
                {editingId && (
                    <button 
                        onClick={resetForm} 
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        type="button"
                    >
                        <X size={14} /> Cancel Editing
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="p-6">
                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-in slide-in-from-top-2 shadow-sm">
                        <AlertTriangle size={20} className="shrink-0" />
                        <span className="text-sm font-semibold">{errorMsg}</span>
                    </div>
                )}
                {successMsg && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700 animate-in slide-in-from-top-2 shadow-sm">
                        <CheckCircle2 size={20} className="shrink-0" />
                        <span className="text-sm font-semibold">{successMsg}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                    <div className="md:col-span-2">
                        <label className={labelClass}>Sort Order</label>
                        <div className="relative">
                            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="number" 
                                className={`${inputClass} pl-9`}
                                placeholder="1"
                                value={form.displayOrder}
                                onChange={e => setForm(p => ({ ...p, displayOrder: parseInt(e.target.value) || 0 }))}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                    
                    <div className="md:col-span-2">
                        <label className={labelClass}>Internal Code</label>
                        <div className="relative">
                            <Plane size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                className={`${inputClass} pl-9 font-bold uppercase`}
                                placeholder="C208B"
                                value={form.code}
                                onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className={labelClass}>ICAO Code</label>
                        <div className="relative">
                            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                className={`${inputClass} pl-9 font-mono uppercase`}
                                placeholder="C208"
                                value={form.icao}
                                onChange={e => setForm(p => ({ ...p, icao: e.target.value.toUpperCase() }))}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="md:col-span-4">
                        <label className={labelClass}>Full Description</label>
                        <input 
                            type="text" 
                            className={inputClass}
                            placeholder="Cessna 208B Grand Caravan"
                            value={form.name}
                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="md:col-span-2 pt-[22px]">
                        <button 
                            type="submit"
                            disabled={isSubmitting || !form.code || !form.name}
                            className={`w-full h-[42px] rounded-xl text-sm font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${editingId ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (editingId ? 'Update' : 'Create Type')}
                        </button>
                    </div>
                </div>
            </form>
        </div>

        {/* List View */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <List size={16} className="text-slate-400" />
                    <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Defined Aircraft Types</h4>
                </div>
                {sortedTypes.length === 0 && (
                    <button 
                        onClick={handleSeed} 
                        className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                        type="button"
                    >
                        <RefreshCw size={12}/> Initialize Default Types
                    </button>
                )}
            </div>
            
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-20 text-center">Order</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-32">Code</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-32">ICAO</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Description</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                    {sortedTypes.map(type => (
                        <tr key={type.id} className={`group transition-colors ${editingId === type.id ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                            <td className="px-6 py-4 text-center">
                                <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">{type.displayOrder}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="font-bold text-slate-800 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs border border-blue-100">{type.code}</span>
                            </td>
                            <td className="px-6 py-4 font-mono text-sm text-slate-600">
                                {type.icao || <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-700 text-sm">
                                {type.name}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button 
                                        onClick={() => handleEdit(type)}
                                        disabled={isSubmitting || deletingId !== null}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30"
                                        title="Edit Type"
                                        type="button"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    
                                    {confirmDeleteId === type.id ? (
                                        <button 
                                            onClick={() => confirmDelete(type.id)}
                                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-red-700 flex items-center gap-1 animate-in fade-in zoom-in duration-200"
                                            title="Confirm Delete"
                                            type="button"
                                        >
                                            <AlertOctagon size={14} /> Confirm
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => requestDelete(type.id)}
                                            disabled={isSubmitting || deletingId !== null}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 relative"
                                            title="Delete Type"
                                            type="button"
                                        >
                                            {deletingId === type.id ? (
                                                <Loader2 size={16} className="animate-spin text-red-500" />
                                            ) : (
                                                <Trash2 size={16} />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {sortedTypes.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                                <Plane size={32} className="opacity-20 mx-auto mb-3" />
                                <p className="font-medium">No Aircraft Types Found</p>
                                <p className="text-xs mt-1">Add a type above or initialize defaults.</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};
