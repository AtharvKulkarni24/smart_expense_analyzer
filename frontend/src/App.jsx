import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Insights from './pages/Insights';
import Login from './pages/Login';
import Register from './pages/Register';
import AddTransactionModal from './components/transactions/AddTransactionModal';
import CsvImportModal from './components/transactions/CsvImportModal';

// Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function MainApp() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  return (
    <Layout 
      onOpenAddModal={() => setIsAddModalOpen(true)}
      onOpenCsvModal={() => setIsCsvModalOpen(true)}
    >
      <Routes>
        <Route 
          path="/" 
          element={
            <Dashboard 
              key={`dash-${refreshTrigger}`}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenCsvModal={() => setIsCsvModalOpen(true)}
            />
          } 
        />
        <Route 
          path="/transactions" 
          element={
            <Transactions 
              key={`tx-${refreshTrigger}`}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenCsvModal={() => setIsCsvModalOpen(true)}
            />
          } 
        />
        <Route 
          path="/budgets" 
          element={<Budgets key={`bgt-${refreshTrigger}`} />} 
        />
        <Route 
          path="/insights" 
          element={<Insights key={`ins-${refreshTrigger}`} />} 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTransactionAdded={() => {
          triggerRefresh();
        }}
      />

      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportComplete={() => {
          triggerRefresh();
        }}
      />
    </Layout>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
