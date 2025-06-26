// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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

  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }
    return children;
  };

  const routes = [
    { path: '/', element: <MenuPage /> },
    { path: '/orders', element: <OrdersPage /> },
    { path: '/inventory', element: <InventoryPage /> },
    { path: '/customer', element: <CustomerPage /> },
    { path: '/report', element: <ReportPage /> },
    { path: '/settings', element: <SettingsPage /> }
  ];

  if (isLoading) return null; // hoặc loading spinner

  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        {isAuthenticated && <Sidebar onLogout={handleLogout} />}
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/login" element={
              isAuthenticated ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />
            } />
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<ProtectedRoute>{route.element}</ProtectedRoute>}
              />
            ))}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
        <PaymentSuccessTTS />
      </div>
      <ChatBot />
    </Router>
  );
};

export default App;
