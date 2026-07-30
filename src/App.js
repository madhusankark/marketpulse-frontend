import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MarketProvider } from './context/MarketContext';
import Navbar from './components/Navbar';
import ProfitTicker from './components/ProfitTicker';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import StockDetail from './pages/StockDetail';
import Watchlists from './pages/Watchlists';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';
import Sectors from './pages/Sectors';
import Screener from './pages/Screener';
import Portfolio from './pages/Portfolio';
import Admin from './pages/Admin';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;
  return user && isAdmin ? children : <Navigate to="/dashboard" />;
}

function App() {
  return (
    <AuthProvider>
      <MarketProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="app">
            <Navbar />
            <ProfitTicker />
            <main className="main-content">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/search" element={<Search />} />
                <Route path="/stock/:symbol" element={<StockDetail />} />
                <Route path="/watchlists" element={<ProtectedRoute><Watchlists /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
                <Route path="/sectors" element={<Sectors />} />
                <Route path="/screener" element={<Screener />} />
                <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
                <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Routes>
            </main>
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0', fontFamily: 'Inter, sans-serif', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
                success: { iconTheme: { primary: '#16a34a', secondary: '#ffffff' } },
                error: { iconTheme: { primary: '#dc2626', secondary: '#ffffff' } }
              }}
            />
          </div>
        </Router>
      </MarketProvider>
    </AuthProvider>
  );
}

export default App;
