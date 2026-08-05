import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import PredictionReport from './pages/PredictionReport';
import GeoChat from './pages/GeoChat';

/* ── Premium Loading Screen ── */
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(34,211,238,0.08) 0%, transparent 60%), var(--bg-primary)',
      gap: '20px',
    }}>
      {/* Logo */}
      <div style={{
        width: '56px', height: '56px', borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(34,211,238,0.12), rgba(59,130,246,0.12))',
        border: '1px solid rgba(34,211,238,0.20)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'glow-pulse 2s ease-in-out infinite',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="url(#loadGrad)" strokeWidth="1.5"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="url(#loadGrad)" strokeWidth="1.5"/>
          <defs>
            <linearGradient id="loadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22D3EE"/><stop offset="100%" stopColor="#8B5CF6"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Spinner ring */}
      <div style={{ position: 'relative', width: '36px', height: '36px' }}>
        <svg width="36" height="36" viewBox="0 0 36 36" style={{ animation: 'spin-slow 1s linear infinite' }}>
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(34,211,238,0.12)" strokeWidth="2"/>
          <circle cx="18" cy="18" r="15" fill="none" stroke="url(#spinGrad)" strokeWidth="2"
            strokeDasharray="30 66" strokeLinecap="round"/>
          <defs>
            <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22D3EE"/><stop offset="100%" stopColor="#8B5CF6"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500', letterSpacing: '0.02em' }}>
        Loading GeoNexus AI…
      </p>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" />;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return <Navigate to={user ? '/dashboard' : '/login'} />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"     element={<Login />} />
      <Route path="/register"  element={<Register />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/profile"   element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/report"    element={<PrivateRoute><PredictionReport /></PrivateRoute>} />
      <Route path="/chat"      element={<PrivateRoute><GeoChat /></PrivateRoute>} />
      <Route path="/"          element={<HomeRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}