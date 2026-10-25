import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Receipt, 
  Wallet, 
  CreditCard, 
  Sparkles, 
  ArrowUpRight, 
  PlusCircle, 
  UploadCloud,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { spendsenseApi, getCategoryById } from '../services/api';

export default function Dashboard({ onOpenAddModal, onOpenCsvModal }) {
  const [selectedMonth, setSelectedMonth] = useState('2026-03');
  const [summary, setSummary] = useState(null);
  const [spendingPattern, setSpendingPattern] = useState(null);
  const [unusualExpenses, setUnusualExpenses] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [budgets, setBudgets] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [selectedMonth]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sumRes, patRes, txRes, bgtRes, unRes] = await Promise.all([
        spendsenseApi.getSummary(selectedMonth),
        spendsenseApi.getSpendingPatterns(selectedMonth),
        spendsenseApi.getTransactions({ limit: 5 }),
        spendsenseApi.getBudgets(selectedMonth),
        spendsenseApi.getUnusualExpenses(selectedMonth),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (patRes.success) setSpendingPattern(patRes.data);
      if (txRes.success) setRecentTransactions(txRes.data.transactions);
      if (bgtRes.success) setBudgets(bgtRes.data);
      if (unRes.success) setUnusualExpenses(unRes.data.flaggedTransactions || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Loading your financial intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Greeting & Month Picker */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time analytics and ML-discovered spending archetypes
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 outline-none cursor-pointer focus:border-brand-500"
          >
            <option value="2026-03">March 2026</option>
            <option value="2026-02">February 2026</option>
            <option value="2026-01">January 2026</option>
          </select>

          {/* Quick Actions */}
          <button
            onClick={onOpenCsvModal}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Import Statement CSV"
          >
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-glow transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Spend */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Spent</span>
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-display font-extrabold text-2xl text-white">
              {formatCurrency(summary?.totalExpenditure)}
            </h3>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>Incurred this month</span>
            </p>
          </div>
        </div>

        {/* Transactions Count */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Transactions</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-display font-extrabold text-2xl text-white">
              {summary?.transactionCount || 0}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Recorded across all channels
            </p>
          </div>
        </div>

        {/* Average Transaction */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg / Expense</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-display font-extrabold text-2xl text-white">
              {formatCurrency(summary?.averageTransactionAmount)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Normalized per transaction
            </p>
          </div>
        </div>

        {/* Overall Budget Utilization */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Budget Spent</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display font-extrabold text-2xl text-white">
                {budgets?.overallUtilization || 0}%
              </h3>
              <span className="text-[11px] text-slate-400">
                of {formatCurrency(budgets?.totalBudget)}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (budgets?.overallUtilization || 0) >= 100
                    ? 'bg-rose-500'
                    : (budgets?.overallUtilization || 0) >= 75
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, budgets?.overallUtilization || 0)}%` }}
              ></div>
            </div>
          </div>
        </div>

      </div>

      {/* ML Spending Archetype Banner (K-Means Persona) */}
      {spendingPattern && (
        <div className="relative overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-950/70 via-indigo-950/40 to-slate-900 p-6 shadow-glow">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[11px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-brand-400" />
                  K-Means Persona Discovered
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {spendingPattern.algorithm}
                </span>
              </div>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
                {spendingPattern.profileLabel}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {spendingPattern.summary}
              </p>
              {spendingPattern.recommendation && (
                <p className="text-xs text-brand-300/90 font-medium flex items-center gap-1.5 pt-1">
                  <span>💡 Insight:</span>
                  <span>{spendingPattern.recommendation}</span>
                </p>
              )}
            </div>

            {/* Persona Contributing Categories */}
            <div className="flex-shrink-0 flex sm:flex-col gap-2 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Dominant Categories
              </span>
              <div className="flex flex-wrap gap-2">
                {spendingPattern.topContributingCategories?.map((cat, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                    <span className="text-slate-200 font-medium">{cat.name}</span>
                    <span className="text-brand-300 font-bold">{Math.round(cat.proportion * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visualizations Section: Trend & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Spending Trend (AreaChart) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-base text-white">Spending Timeline</h3>
              <p className="text-xs text-slate-400">Daily expense pattern throughout {selectedMonth}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
              INR (₹)
            </span>
          </div>

          <div className="h-64 w-full">
            {summary?.dailySpendingTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.dailySpendingTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="displayDate" 
                    stroke="#475569" 
                    fontSize={11} 
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={11} 
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`₹${value}`, 'Amount']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#818cf8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#spendGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No recorded daily data for this month
              </div>
            )}
          </div>
        </div>

        {/* Category Share Distribution (Donut Chart) */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-white">Category Allocation</h3>
            <p className="text-xs text-slate-400">Share of total monthly expenditure</p>
          </div>

          <div className="h-52 w-full my-2 flex items-center justify-center">
            {summary?.categoryBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="amount"
                  >
                    {summary.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val, name, props) => [`${formatCurrency(val)} (${props.payload.percentage}%)`, props.payload.name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500">No category breakdown</div>
            )}
          </div>

          {/* Mini Legend */}
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {summary?.categoryBreakdown?.slice(0, 4).map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                  <span className="text-slate-300 font-medium">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{cat.percentage}%</span>
                  <span className="text-slate-200 font-semibold">{formatCurrency(cat.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Anomaly & Recent Transactions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Outlier Alert Banner (IQR detection) */}
        {unusualExpenses.length > 0 && (
          <div className="lg:col-span-1 p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Unusual Expense Flagged</span>
              </div>
              <h4 className="font-display font-bold text-lg text-white mt-2">
                {unusualExpenses[0].description}
              </h4>
              <p className="text-2xl font-extrabold text-amber-300 mt-1">
                {formatCurrency(unusualExpenses[0].amount)}
              </p>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {unusualExpenses[0].reason}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-400/90 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                {unusualExpenses[0].badge}
              </span>
              <a href="/insights" className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1">
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Recent Transactions List */}
        <div className={`${unusualExpenses.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'} glass-card p-6 rounded-2xl border border-slate-800`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-base text-white">Recent Transactions</h3>
              <p className="text-xs text-slate-400">Latest recorded expenses</p>
            </div>
            <a href="/transactions" className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1">
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="divide-y divide-slate-800/80">
            {recentTransactions.map((tx) => {
              const cat = getCategoryById(tx.categoryId);
              return (
                <div key={tx.id} className="py-3 flex items-center justify-between hover:bg-slate-800/20 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs"
                      style={{ backgroundColor: cat.bg, color: cat.color }}
                    >
                      {cat.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400">{tx.transactionDate}</span>
                        {tx.merchant && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-[11px] text-slate-400">{tx.merchant}</span>
                          </>
                        )}
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {tx.source}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-white">-{formatCurrency(tx.amount)}</p>
                    <span 
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1"
                      style={{ backgroundColor: cat.bg, color: cat.color }}
                    >
                      {cat.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
