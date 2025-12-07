
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const Tab: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; warning?: boolean }> = ({ active, onClick, icon, label, warning }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${active ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'} ${warning ? 'text-red-500' : ''}`}>
        {icon} {label} {warning && <AlertTriangle size={14} className="text-red-500"/>}
    </button>
);

export const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4 font-bold text-slate-800 border-b border-slate-50 pb-2">
            {icon} {title}
        </div>
        {children}
    </div>
);

export const OpsBox: React.FC<{ label: string, children?: React.ReactNode, className?: string, valueClassName?: string }> = ({ label, children, className = "", valueClassName = "" }) => (
    <div className={`p-4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center transition-all ${className}`}>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">{label}</span>
        <div className={`text-sm font-bold text-slate-800 w-full ${valueClassName}`}>{children}</div>
    </div>
);

export const inputClass = "w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 placeholder-slate-400 font-medium transition-all shadow-sm";
export const labelClass = "block mb-1.5 text-xs font-bold text-slate-600 uppercase tracking-tight ml-1";
export const compactInputClass = "w-full bg-white border border-slate-300 text-slate-900 text-xs rounded h-8 px-2 focus:ring-2 focus:ring-blue-500 outline-none";
export const compactLabelClass = "block mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-tight";
