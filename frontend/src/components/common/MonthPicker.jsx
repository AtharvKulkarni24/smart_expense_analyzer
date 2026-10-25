import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

/**
 * Generates an array of months (e.g. past 18 months through next 2 months).
 * Guarantees that any currently selected month is included in the options.
 */
function generateMonthOptions(selectedMonth) {
  const options = [];
  const now = new Date();
  
  // We can base reference on either today or the year 2026 if today is in 2026
  const refYear = now.getFullYear();
  const refMonth = now.getMonth(); // 0-indexed

  // Generate 2 months into future and 18 months into the past
  for (let i = 2; i >= -18; i--) {
    const d = new Date(refYear, refMonth + i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const val = `${yyyy}-${mm}`;
    
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value: val, label });
  }

  // Ensure selectedMonth is in options even if it's older
  if (selectedMonth && !options.some(opt => opt.value === selectedMonth)) {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value: selectedMonth, label });
    // Sort descending by value (YYYY-MM)
    options.sort((a, b) => b.value.localeCompare(a.value));
  }

  return options;
}

/**
 * Helper to step backward (-1) or forward (+1) by month
 */
function getAdjacentMonth(currentVal, offset) {
  if (!currentVal || !currentVal.includes('-')) {
    const now = new Date();
    currentVal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const [yyyy, mm] = currentVal.split('-').map(Number);
  const d = new Date(yyyy, (mm - 1) + offset, 1);
  const nextYyyy = d.getFullYear();
  const nextMm = String(d.getMonth() + 1).padStart(2, '0');
  return `${nextYyyy}-${nextMm}`;
}

export default function MonthPicker({ selectedMonth, onChange, className = '' }) {
  const options = generateMonthOptions(selectedMonth);

  const handlePrev = () => {
    onChange(getAdjacentMonth(selectedMonth, -1));
  };

  const handleNext = () => {
    onChange(getAdjacentMonth(selectedMonth, 1));
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Previous Month Arrow */}
      <button
        type="button"
        onClick={handlePrev}
        title="Previous Month"
        className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-white hover:border-brand-500/50 hover:bg-slate-800 transition-all flex items-center justify-center shadow-sm"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Month Dropdown Container */}
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3 text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => onChange(e.target.value)}
          className="pl-8 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-200 outline-none cursor-pointer hover:border-brand-500/50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all appearance-none shadow-sm"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Next Month Arrow */}
      <button
        type="button"
        onClick={handleNext}
        title="Next Month"
        className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-white hover:border-brand-500/50 hover:bg-slate-800 transition-all flex items-center justify-center shadow-sm"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
