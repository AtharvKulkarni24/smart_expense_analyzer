import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Lock, 
  KeyRound, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Receipt, 
  Wallet,
  Calendar
} from 'lucide-react';
import { spendsenseApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ProfileSettingsModal({ isOpen, onClose }) {
  const { user, login } = useAuth();
  
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'
  const [name, setName] = useState('');
  const [profileStats, setProfileStats] = useState(null);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(user?.name || '');
      setSuccessMsg('');
      setErrorMsg('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchProfileStats();
    }
  }, [isOpen, user]);

  const fetchProfileStats = async () => {
    try {
      const res = await spendsenseApi.getCurrentUser();
      if (res.success && res.data) {
        setProfileStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load profile details:', err);
    }
  };

  if (!isOpen) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg('Full name must be at least 2 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await spendsenseApi.updateProfile({ name: name.trim() });
      if (res.success) {
        setSuccessMsg('Profile updated successfully!');
        // Update user state if login/context provides helper
        if (res.data?.user && res.data?.token) {
          localStorage.setItem('spendsense_token', res.data.token);
          localStorage.setItem('spendsense_user', JSON.stringify(res.data.user));
        }
      } else {
        setErrorMsg(res.error?.message || 'Failed to update profile');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!currentPassword) {
      setErrorMsg('Please enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await spendsenseApi.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setSuccessMsg('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(res.error?.message || 'Failed to change password');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Current password is incorrect');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Active Member';
    try {
      return new Date(isoString).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return 'Active Member';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-lg rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 p-0.5 shadow-glow flex-shrink-0">
              <div className="w-full h-full bg-[#0B0F19] rounded-[14px] flex items-center justify-center font-bold text-sm text-white">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">{user?.name || 'My Profile'}</h3>
              <p className="text-xs text-slate-400">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Pills */}
        <div className="grid grid-cols-3 gap-2 px-6 py-3 bg-slate-900/60 border-b border-slate-800/80 text-xs text-center">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500">Expenses</span>
            <p className="font-bold text-white mt-0.5">{profileStats?.totalTransactions ?? '—'}</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500">Budgets</span>
            <p className="font-bold text-white mt-0.5">{profileStats?.totalBudgets ?? '—'}</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500">Member Since</span>
            <p className="font-bold text-slate-300 mt-0.5">{formatDate(profileStats?.createdAt)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6 pt-3">
          <button
            type="button"
            onClick={() => { setActiveTab('profile'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile Details</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('security'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`ml-6 pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'security'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Security & Password</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          
          {/* Notifications */}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tab 1: Profile Details */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-brand-500 outline-none transition-all"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-400 cursor-not-allowed"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-500">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Account identity email is verified and locked
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-glow transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Tab 2: Security & Password */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Enter existing password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-brand-500 outline-none transition-all"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  New Password (min 6 chars)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Choose strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-brand-500 outline-none transition-all"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-brand-500 outline-none transition-all"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-glow transition-all disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
