import React from 'react';
import { Lock } from 'lucide-react';

interface FeatureGateProps {
  isEnabled: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ isEnabled, children, fallback }) => {
  if (isEnabled) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default "Pro Plan" Lock Screen
  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 group">
      {/* Blurred Content Placeholder */}
      <div className="absolute inset-0 p-8 filter blur-md opacity-50 select-none pointer-events-none">
         <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
         <div className="h-64 bg-slate-200 rounded w-full"></div>
         <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
         </div>
      </div>

      {/* Lock Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/30 mb-4 transform group-hover:scale-110 transition-transform duration-300">
            <Lock size={32} strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-wide">
            Feature Locked
        </h3>
        <p className="text-slate-500 max-w-sm mt-2 mb-6 font-medium">
            This feature is available on the <strong>FOMS PRO</strong> plan. Upgrade your subscription to access advanced tools.
        </p>
        <button className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-lg shadow-lg hover:bg-slate-800 transition-all text-sm">
            Upgrade to PRO
        </button>
      </div>
    </div>
  );
};