import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  Edit3, 
  Calendar,
  X,
  Save
} from 'lucide-react';
import { spendsenseApi, FIXED_CATEGORIES } from '../services/api';

export default function Budgets() {
  const [selectedMonth, setSelectedMonth] = useState('2026-03');
  const [budgetData, setBudgetData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Budget Modal
  const [editingCategory, setEditingCategory] = useState(null);
  const [newLimit, setNewLimit] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    loadBudgets();
  }, [selectedMonth]);

  const loadBudgets = async () => {
    setLoading(true);
    try {
      const res = await spendsenseApi.getBudgets(selectedMonth);
      if (res.success && res.data) {
        setBudgetData(res.data);
      }
    } catch (err) {
      console.error('Failed to load budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (cat) => {
    setEditingCategory(cat);
    setNewLimit(cat.limitAmount);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!editingCategory || isNaN(parseFloat(newLimit)) || parseFloat(newLimit) < 0) return;

    setSaveLoading(true);
    try {
      const res = await spendsenseApi.setBudget(editingCategory.categoryId, parseFloat(newLimit), selectedMonth);
      if (res.success) {
        setEditingCategory(null);
        loadBudgets();
      }
    } catch (err) {
      console.error('Failed to update budget limit:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (loading && !budgetData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
            Monthly Category Budgets
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Enforce spending discipline and track real-time utilization thresholds
          </p>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 outline-none cursor-pointer focus:border-brand-500"
          >
            <option value="2026-03">March 2026</option>
            <option value="2026-02">February 2026</option>
            <option value="2026-01">January 2026</option>
          </select>
        </div>
      </div>

      {/* Overview Card */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <span className="text-xs uppercase font-semibold text-slate-400">Total Monthly Budget</span>
            <p className="font-display font-extrabold text-2xl sm:text-3xl text-white mt-1">
              {formatCurrency(budgetData?.totalBudget)}
            </p>
          </div>

          <div>
            <span className="text-xs uppercase font-semibold text-slate-400">Total Spent So Far</span>
            <p className="font-display font-extrabold text-2xl sm:text-3xl text-brand-300 mt-1">
              {formatCurrency(budgetData?.totalSpent)}
            </p>
          </div>

          <div>
            <span className="text-xs uppercase font-semibold text-slate-400">Net Remaining</span>
            <p className="font-display font-extrabold text-2xl sm:text-3xl text-emerald-400 mt-1">
              {formatCurrency(Math.max(0, (budgetData?.totalBudget || 0) - (budgetData?.totalSpent || 0)))}
            </p>
          </div>
        </div>

        {/* Total Utilization Bar */}
        <div className="mt-5 pt-5 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300">Overall Budget Utilization</span>
            <span className={`${(budgetData?.overallUtilization || 0) >= 100 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {budgetData?.overallUtilization}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (budgetData?.overallUtilization || 0) >= 100
                  ? 'bg-rose-500'
                  : (budgetData?.overallUtilization || 0) >= 75
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, budgetData?.overallUtilization || 0)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Category Budget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgetData?.categories?.map((cat) => {
          const isExceeded = cat.status === 'exceeded';
          const isWarning = cat.status === 'warning';

          return (
            <div
              key={cat.categoryId}
              className={`glass-card p-5 rounded-2xl border transition-all duration-200 relative group ${
                isExceeded
                  ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 to-slate-900/80'
                  : isWarning
                  ? 'border-amber-500/30'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Category Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></span>
                  <h3 className="font-semibold text-sm text-white">{cat.categoryName}</h3>
                </div>

                <button
                  onClick={() => handleEditClick(cat)}
                  className="opacity-70 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                  title="Adjust budget limit"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Numbers */}
              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Spent</span>
                  <p className="font-display font-bold text-lg text-white">
                    {formatCurrency(cat.actualSpent)}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Cap Limit</span>
                  <p className="text-sm font-semibold text-slate-400">
                    {formatCurrency(cat.limitAmount)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isExceeded
                        ? 'bg-rose-500'
                        : isWarning
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, cat.utilizationPercentage)}%` }}
                  ></div>
                </div>

                {/* Status caption */}
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="text-slate-400 font-medium">
                    {isExceeded ? (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Over by {formatCurrency(cat.actualSpent - cat.limitAmount)}
                      </span>
                    ) : (
                      <span>{formatCurrency(cat.remaining)} left</span>
                    )}
                  </span>
                  <span className={`font-bold ${isExceeded ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-slate-400'}`}>
                    {cat.utilizationPercentage}%
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Edit Budget Limit Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-card rounded-2xl p-6 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-display font-bold text-base text-white">
                Set Budget: {editingCategory.categoryName}
              </h3>
              <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                  Monthly Limit (INR ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold text-sm">₹</span>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    required
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-brand-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Applies to {selectedMonth}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveLoading ? 'Saving...' : 'Save Limit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
