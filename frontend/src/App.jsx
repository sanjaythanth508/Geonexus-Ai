import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import Profile from './pages/Profile';
import PredictionReport from './pages/PredictionReport';
import GeoChat from './pages/GeoChat';
import NodesList from './pages/NodesList';
import NodeDetail from './pages/NodeDetail';
import AnalysisMap from './pages/AnalysisMap';
import AnalysisRun from './pages/AnalysisRun';
import AnalysisResult from './pages/AnalysisResult';
import SuggestionReport from './pages/SuggestionReport';
import SuggestionMap from './pages/SuggestionMap';
import CompareHub from './pages/CompareHub';
import CompareTwoPoints from './pages/CompareTwoPoints';
import CompareTwoIndustries from './pages/CompareTwoIndustries';
import CompareGeneral from './pages/CompareGeneral';

/* ── Premium Loading Screen (Green Theme) ── */
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(97,135,100,0.12) 0%, transparent 60%), var(--bg-primary)',
      gap: '20px',
    }}>
      {/* Logo */}
      <div style={{
        width: '56px', height: '56px', borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(97,135,100,0.15), rgba(43,87,72,0.15))',
        border: '1px solid rgba(97,135,100,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'glow-pulse 2s ease-in-out infinite',
      }}>
        <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="var(--c-green-700)" strokeWidth="2.5"/>
          <ellipse cx="24" cy="24" rx="9" ry="20" stroke="var(--c-green-700)" strokeWidth="2"/>
          <line x1="4" y1="24" x2="44" y2="24" stroke="var(--c-green-700)" strokeWidth="2"/>
        </svg>
      </div>

      {/* Spinner ring */}
      <div style={{ position: 'relative', width: '36px', height: '36px' }}>
        <svg width="36" height="36" viewBox="0 0 36 36" style={{ animation: 'spin-slow 1s linear infinite' }}>
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(97,135,100,0.15)" strokeWidth="2"/>
          <circle cx="18" cy="18" r="15" fill="none" stroke="url(#spinGrad)" strokeWidth="2"
            strokeDasharray="30 66" strokeLinecap="round"/>
          <defs>
            <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#618764"/><stop offset="100%" stopColor="#2B5748"/>
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
  return <Navigate to={user ? '/home' : '/login'} />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"         element={<Login />} />
      <Route path="/register"      element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      {/* New home page - post login landing */}
      <Route path="/home"          element={<PrivateRoute><Home /></PrivateRoute>} />
      {/* Redirect legacy /dashboard to /home */}
      <Route path="/dashboard"     element={<Navigate to="/home" replace />} />
      <Route path="/profile"       element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/report"        element={<PrivateRoute><PredictionReport /></PrivateRoute>} />
      <Route path="/chat"          element={<PrivateRoute><GeoChat /></PrivateRoute>} />
      {/* Deployed nodes */}
      <Route path="/nodes"         element={<PrivateRoute><NodesList /></PrivateRoute>} />
      <Route path="/nodes/:id"     element={<PrivateRoute><NodeDetail /></PrivateRoute>} />
      {/* New analysis flow */}
      <Route path="/analysis"      element={<PrivateRoute><AnalysisMap /></PrivateRoute>} />
      <Route path="/analysis/run"  element={<PrivateRoute><AnalysisRun /></PrivateRoute>} />
      <Route path="/analysis/result" element={<PrivateRoute><AnalysisResult /></PrivateRoute>} />
      <Route path="/analysis/suggestion" element={<PrivateRoute><SuggestionReport /></PrivateRoute>} />
      <Route path="/analysis/suggestion-map" element={<PrivateRoute><SuggestionMap /></PrivateRoute>} />
      {/* Compare feature */}
      <Route path="/compare" element={<PrivateRoute><CompareHub /></PrivateRoute>} />
      <Route path="/compare/two-points" element={<PrivateRoute><CompareTwoPoints /></PrivateRoute>} />
      <Route path="/compare/two-industries" element={<PrivateRoute><CompareTwoIndustries /></PrivateRoute>} />
      <Route path="/compare/general" element={<PrivateRoute><CompareGeneral /></PrivateRoute>} />
      <Route path="/" element={<HomeRedirect />} />
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