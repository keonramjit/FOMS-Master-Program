import React, { useState, useEffect } from 'react';

export const DigitalClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time components manually for 12-hour format with padding
  const hours = (time.getHours() % 12 || 12).toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const period = time.getHours() >= 12 ? 'PM' : 'AM';

  return (
    <div className="bg-slate-900 px-5 py-3 rounded-xl border-2 border-slate-700 shadow-xl flex flex-col items-center justify-center min-w-[220px] relative overflow-hidden">
      
      {/* Screen Shine/Glass Reflection */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      
      <div className="flex items-baseline gap-2 relative z-10">
        {/* Time Display */}
        <div className="text-4xl font-black text-amber-500 font-mono tracking-widest leading-none drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
          {hours}:{minutes}<span className="text-3xl opacity-80">:{seconds}</span>
        </div>
        
        {/* AM/PM */}
        <div className="text-sm font-bold text-amber-700 font-mono uppercase tracking-widest self-end mb-1">
          {period}
        </div>
      </div>
      
      {/* Label */}
      <div className="flex items-center gap-2 mt-2 border-t border-slate-800 pt-1 w-full justify-center">
         <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_5px_rgba(245,158,11,0.8)]"></span>
         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Local Time</span>
      </div>
    </div>
  );
};
