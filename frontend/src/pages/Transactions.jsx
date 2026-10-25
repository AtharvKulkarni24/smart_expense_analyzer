import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  PlusCircle, 
  UploadCloud, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  X,
  FileSpreadsheet,
  Download,
  Edit2
} from 'lucide-react';
import { spendsenseApi, FIXED_CATEGORIES, getCategoryById } from '../services/api';
import EditTransactionModal from '../components/transactions/EditTransactionModal';

export default function Transactions({ onOpenAddModal, onOpenCsvModal }) {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalRecords: 0 });
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Edit Modal & Export State
  const [editingTx, setEditingTx] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchTransactions(1);
  }, [selectedCategory, startDate, endDate]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params = {
        limit: 1000,
        search: search.trim() || undefined,
        categoryId: selectedCategory || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const res = await spendsenseApi.getTransactions(params);
      const exportData = res.data?.transactions || transactions;

      if (!exportData || exportData.length === 0) {
        alert('No transactions found to export.');
        return;
      }

      // Generate CSV rows
      const headers = ['Date', 'Description', 'Category', 'Merchant', 'Amount (INR)', 'Source'];
      const csvRows = [headers.join(',')];

      exportData.forEach((tx) => {
        const catName = tx.category?.name || getCategoryById(tx.categoryId)?.name || 'Other';
        const desc = `"${(tx.description || '').replace(/"/g, '""')}"`;
        const merchant = `"${(tx.merchant || '').replace(/"/g, '""')}"`;
        const amt = Number(tx.amount || 0).toFixed(2);
        const date = tx.transactionDate || '';
        const source = tx.source || 'manual';

        csvRows.push([date, desc, `"${catName}"`, merchant, amt, source].join(','));
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
      const link = document.createElement('a');
      link.setAttribute('href', csvContent);
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `spendsense_transactions_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to export transactions. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        search: search.trim() || undefined,
        categoryId: selectedCategory || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const res = await spendsenseApi.getTransactions(params);
      if (res.success && res.data) {
        setTransactions(res.data.transactions);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setStartDate('');
    setEndDate('');
    fetchTransactions(1);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      const res = await spendsenseApi.deleteTransaction(id);
      if (res.success) {
        fetchTransactions(pagination.page);
      }
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const hasActiveFilters = search || selectedCategory || startDate || endDate;

  return (
    <div className="space-y-6">
      
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
            Transaction Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Search, filter, edit, and export recorded expenses with smart categorization
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Download transactions as CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          {/* Import CSV Button */}
          <button
            type="button"
            onClick={onOpenCsvModal}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            <span>Import CSV</span>
          </button>

          {/* Add Expense Button */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-glow transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search description, merchant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-brand-500"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 outline-none cursor-pointer focus:border-brand-500"
            >
              <option value="">All Categories</option>
              {FIXED_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 outline-none focus:border-brand-500"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 outline-none focus:border-brand-500"
            />
          </div>

        </form>

        {/* Filter Badges & Clear */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-slate-400">
            Showing <strong className="text-white">{transactions.length}</strong> of {pagination.totalRecords} records
          </span>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Description</th>
                <th className="px-4 py-3.5 font-semibold">Category</th>
                <th className="px-4 py-3.5 font-semibold">Merchant</th>
                <th className="px-4 py-3.5 font-semibold">Date</th>
                <th className="px-4 py-3.5 font-semibold">Source</th>
                <th className="px-5 py-3.5 font-semibold text-right">Amount</th>
                <th className="px-4 py-3.5 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Fetching transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 font-semibold text-sm">No transactions found</p>
                    <p className="text-slate-500 text-xs mt-1">Try adjusting your filters or record a new expense.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const cat = getCategoryById(tx.categoryId);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Description */}
                      <td className="px-5 py-3 font-semibold text-white whitespace-nowrap">
                        {tx.description}
                      </td>

                      {/* Category Pill */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span 
                          className="px-2.5 py-0.5 rounded-full font-medium text-[11px] inline-flex items-center gap-1.5"
                          style={{ backgroundColor: cat.bg, color: cat.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                          {cat.name}
                        </span>
                      </td>

                      {/* Merchant */}
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {tx.merchant || '—'}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {tx.transactionDate}
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                          {tx.source}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-3 font-bold text-white text-right whitespace-nowrap">
                        {formatCurrency(tx.amount)}
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingTx(tx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                            title="Edit expense"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900/60 border-t border-slate-800 text-xs text-slate-400">
          <span>
            Page <strong className="text-slate-200">{pagination.page}</strong> of <strong className="text-slate-200">{pagination.totalPages}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={!pagination.hasPrev}
              onClick={() => fetchTransactions(pagination.page - 1)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={!pagination.hasNext}
              onClick={() => fetchTransactions(pagination.page + 1)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        isOpen={!!editingTx}
        transaction={editingTx}
        onClose={() => setEditingTx(null)}
        onTransactionUpdated={() => fetchTransactions(pagination.page)}
      />

    </div>
  );
}
