import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, AlertCircle, Calendar, Tag, DollarSign, Store } from 'lucide-react';
import { FIXED_CATEGORIES, spendsenseApi } from '../../services/api';

export default function AddTransactionModal({ isOpen, onClose, onTransactionAdded }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  
  // ML Suggestion State
  const [mlSuggestion, setMlSuggestion] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debounced ML Category Prediction
  useEffect(() => {
    if (!description.trim() || description.trim().length < 3) {
      setMlSuggestion(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsPredicting(true);
      try {
        const res = await spendsenseApi.suggestCategory(description);
        if (res.success && res.data) {
          setMlSuggestion(res.data);
          // If category isn't manually chosen yet, pre-suggest it
          if (!categoryId) {
            setCategoryId(res.data.categoryId);
          }
        }
      } catch (e) {
        console.error('Failed to predict category:', e);
      } finally {
        setIsPredicting(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [description]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a transaction description');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        description: description.trim(),
        amount: parsedAmount,
        categoryId: categoryId ? Number(categoryId) : 10,
        merchant: merchant.trim() || undefined,
        transactionDate,
        source: 'manual',
      };

      const res = await spendsenseApi.addTransaction(payload);
      if (res.success) {
        // Reset form
        setDescription('');
        setAmount('');
        setCategoryId('');
        setMerchant('');
        setMlSuggestion(null);
        onTransactionAdded && onTransactionAdded(res.data);
        onClose();
      } else {
        setError(res.error?.message || 'Failed to add transaction');
      }
    } catch (err) {
      setError('Failed to record transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyMlSuggestion = () => {
    if (mlSuggestion) {
      setCategoryId(mlSuggestion.categoryId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-card rounded-2xl p-6 border border-slate-700/80 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Record New Expense</h3>
              <p className="text-xs text-slate-400">ML automatically predicts category from description</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          
          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Description <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                id="txn-desc-input"
                type="text"
                placeholder="e.g., Starbucks Frappuccino, Uber to College, Blinkit Milk..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm text-white placeholder-slate-500 outline-none transition-all"
              />
              {isPredicting && (
                <div className="absolute right-3 top-2.5">
                  <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Live ML Prediction Pill */}
            {mlSuggestion && (
              <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-brand-950/60 to-indigo-950/60 border border-brand-500/30 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
                  <span className="text-slate-300">
                    Suggested Category: <strong className="text-brand-300">{mlSuggestion.categoryName}</strong>
                    <span className="text-[10px] text-emerald-400 font-semibold ml-1.5 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Auto Match</span>
                  </span>
                </div>
                {Number(categoryId) !== mlSuggestion.categoryId ? (
                  <button
                    type="button"
                    onClick={applyMlSuggestion}
                    className="px-2 py-1 rounded bg-brand-600 hover:bg-brand-500 text-white font-medium text-[11px] transition-colors"
                  >
                    Apply
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <Check className="w-3 h-3" /> Selected
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Amount & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Amount (INR ₹) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold text-sm">₹</span>
                <input
                  id="txn-amount-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Category
              </label>
              <div className="relative">
                <select
                  id="txn-category-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm text-white outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select category...</option>
                  {FIXED_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <Tag className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Merchant & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Merchant */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Merchant / Payee
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g., Starbucks, Uber, MSEB"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <Store className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Transaction Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm text-white outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-txn-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
