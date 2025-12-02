
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarWidgetProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ selectedDate, onDateSelect }) => {
  // Helper to parse "YYYY-MM-DD" as local midnight
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Helper to format Date as "YYYY-MM-DD" using local time components
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [currentMonth, setCurrentMonth] = useState(() => parseLocalDate(selectedDate));
  const [isOpen, setIsOpen] = useState(false);

  // Sync current month view if selectedDate changes externally (optional but good UX)
  useEffect(() => {
    setCurrentMonth(parseLocalDate(selectedDate));
  }, [selectedDate]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handlePrevDay = () => {
    const d = parseLocalDate(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateSelect(formatDate(d));
  };

  const handleNextDay = () => {
    const d = parseLocalDate(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateSelect(formatDate(d));
  };

  // Generate calendar grid
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = [];

  // Empty slots for previous month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
  }

  // Days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dateStr = formatDate(d);
    const isSelected = dateStr === selectedDate;
    
    // Check if "Today" (Local) matches this cell
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && 
                    d.getMonth() === today.getMonth() && 
                    d.getFullYear() === today.getFullYear();

    days.push(
      <button
        key={i}
        onClick={() => {
          onDateSelect(dateStr);
          setIsOpen(false);
        }}
        className={`h-8 w-8 rounded-full text-xs font-medium flex items-center justify-center transition-all
          ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'}
          ${isToday && !isSelected ? 'text-blue-600 font-bold bg-blue-50' : ''}
        `}
      >
        {i}
      </button>
    );
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const displayDate = parseLocalDate(selectedDate);

  return (
    <div className="relative">
      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
        <button onClick={handlePrevDay} className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500 transition-colors">
          <ChevronLeft size={16} />
        </button>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-white rounded-md transition-colors min-w-[140px] justify-center text-slate-700 font-semibold text-sm"
        >
          <CalendarIcon size={16} className="text-blue-600" />
          <span>{displayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </button>

        <button onClick={handleNextDay} className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white rounded-xl shadow-xl border border-slate-100 p-4 w-72 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded text-slate-600">
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-slate-800 text-sm">
              {monthNames[month]} {year}
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded text-slate-600">
              <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['S','M','T','W','T','F','S'].map(d => (
              <div key={d} className="text-[10px] font-bold text-slate-400">{d}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 place-items-center">
            {days}
          </div>
        </div>
      )}
    </div>
  );
};
