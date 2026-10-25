import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart as PieIcon, 
  Sparkles, 
  PlusCircle, 
  LogOut, 
  Wallet,
  Menu,
  X,
  TrendingUp,
  Cpu,
  User as UserIcon
} from 'lucide-react';
import ProfileSettingsModal from './ProfileSettingsModal';

export default function Layout({ children, onOpenAddModal }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Transactions', path: '/transactions', icon: Receipt },
    { label: 'Budgets', path: '/budgets', icon: Wallet },
    { label: 'Smart Insights', path: '/insights', icon: Sparkles, badge: 'AI' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 p-0.5 shadow-glow group-hover:scale-105 transition-transform duration-200">
                  <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-brand-400" />
                  </div>
                </div>
                <div>
                  <span className="font-display font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                    Spend<span className="text-brand-400">Sense</span>
                  </span>
                  <div className="flex items-center gap-1.5 -mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Smart Analytics Active</span>
                  </div>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-1 ml-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                        isActive
                          ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right actions: Add Transaction CTA & Profile */}
            <div className="flex items-center gap-3">
              {onOpenAddModal && (
                <button
                  id="nav-add-btn"
                  onClick={onOpenAddModal}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow transition-all duration-200 active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Expense</span>
                </button>
              )}

              {/* User profile button */}
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="hidden lg:flex items-center gap-3 pl-3 border-l border-slate-800 hover:opacity-80 transition-opacity cursor-pointer text-left group"
                title="Account Profile & Security"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-brand-600 flex items-center justify-center font-bold text-xs text-white shadow-sm group-hover:scale-105 transition-transform">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-200 leading-none">{user?.name || 'Atharv'}</p>
                  <p className="text-[10px] text-brand-300 leading-none mt-1 font-medium">Profile & Security</p>
                </div>
              </button>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-[#0B0F19]/95 backdrop-blur-xl px-4 pt-2 pb-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive ? 'bg-brand-500/20 text-brand-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-500/30 text-brand-300">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            {/* Mobile Profile & Security Button */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setProfileModalOpen(true);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <UserIcon className="w-4 h-4 text-brand-400" />
              <span>Profile & Security Settings</span>
            </button>

            {onOpenAddModal && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAddModal();
                }}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Expense</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Profile & Security Settings Modal */}
      <ProfileSettingsModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-brand-400" />
            <span>SpendSense • Multinomial Naive Bayes + K-Means Archetypes</span>
          </div>
          <span>DWM & ML Mini Project — Team of 2</span>
        </div>
      </footer>
    </div>
  );
}
