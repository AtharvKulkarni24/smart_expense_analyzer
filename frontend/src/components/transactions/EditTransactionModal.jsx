import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, AlertCircle, Calendar, Tag, Store, Save } from 'lucide-react';
import { FIXED_CATEGORIES, spendsenseApi } from '../../services/api';

export default function EditTransactionModal({ isOpen, transaction, onClose, onTransactionUpdated }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate form fields when transaction changes
  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description || '');
      setAmount(transaction.amount !== undefined ? String(transaction.amount) : '');
      setCategoryId(transaction.categoryId ? String(transaction.categoryId) : '10');
      setMerchant(transaction.merchant || '');
      setTransactionDate(transaction.transactionDate || new Date().toISOString().split('T')[0]);
      setError('');
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please provide a valid positive amount.');
      return;
    }

    if (!description.trim()) {
      setError('Description cannot be empty.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        description: description.trim(),
        amount: parsedAmount,
        categoryId: Number(categoryId),
        merchant: merchant.trim() || null,
        transactionDate,
      };

      const res = await spendsenseApi.updateTransaction(transaction.id, payload);
      if (res.success) {
        onTransactionUpdated && onTransactionUpdated(res.data);
        onClose();
      } else {
        setError(res.error?.message || 'Failed to update transaction');
      }
    } catch (err) {
      setError('Failed to update transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-lg rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden p-6 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-display font-bold text-lg text-white">Edit Expense</h3>
            <p className="text-xs text-slate-400">Update details or correct category classification</p>
          </div>
          <button 
            type="button"
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

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          
          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Description <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Starbucks Coffee, Grocery shopping..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
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
                Category <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm text-white outline-none transition-all appearance-none cursor-pointer"
                >
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
                  placeholder="e.g., Starbucks, Amazon, Zomato"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                  <Store className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Date <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm text-white outline-none transition-all cursor-pointer"
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-glow transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Expense</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
