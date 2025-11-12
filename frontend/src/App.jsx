// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MenuPage from './pages/MenuPage';
import InventoryPage from './pages/InventoryPage';
import OrdersPage from './pages/OrdersPage';
import LoginPage from './pages/LoginPage';
import CustomerPage from './pages/CustomerPage';
import ReportPage from './pages/ReportPage';
import SettingsPage from './pages/SettingsPage';
import PaymentSuccessTTS from './components/PaymentSuccessTTS'; // hoặc đúng path của bạn
import ChatBot from './components/ChatBot';
import CustomerDisplayPage from './pages/CustomerDisplayPage';

// Kiểm tra xem đang chạy trong môi trường Electron hay không
const isElectron = window && window.process && window.process.type;

// Chọn Router phù hợp dựa vào môi trường
const Router = isElectron ? HashRouter : BrowserRouter;

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  if (isLoading) return null; // hoặc loading spinner

  const ProtectedLayout = () => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar onLogout={handleLogout} />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
        <PaymentSuccessTTS />
      </div>
    );
  };

  const LoginRoute = isAuthenticated
    ? <Navigate to="/" replace />
    : <LoginPage onLogin={handleLogin} />;

  const AppRoutes = () => {
    const location = useLocation();
    const showChatBot = location.pathname !== '/customer-display';

    return (
      <>
        <Routes>
          <Route path="/login" element={LoginRoute} />
          <Route path="/customer-display" element={<CustomerDisplayPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<MenuPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/customer" element={<CustomerPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {showChatBot && <ChatBot />}
      </>
    );
  };

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
};

export default App;
