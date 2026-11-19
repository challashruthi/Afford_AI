import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import RideComparisonPage from './pages/RideComparisonPage';
import FavouritesPage from './pages/FavouritesPage';
import FareAnalyticsPage from './pages/FareAnalyticsPage';
import ModelEvaluationPage from './pages/ModelEvaluationPage';
import ErrorBoundary from './components/ErrorBoundary';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('jwt_token');
  if (!token || token === 'null' || token === 'undefined' || !token.trim()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Global session-expiry redirector (must be inside <Router>)
function GlobalSessionHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = () => {
      // Don't redirect if already on login or register page
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register' && path !== '/') {
        navigate('/login', { replace: true });
      }
    };
    window.addEventListener('auth:session-expired', handler);
    return () => window.removeEventListener('auth:session-expired', handler);
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <Router>
      <ErrorBoundary title="Application Error" message="An unexpected error occurred while loading this view.">
        <GlobalSessionHandler />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route 
            path="/onboarding" 
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/comparison" 
            element={
              <ProtectedRoute>
                <RideComparisonPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/favourites" 
            element={
              <ProtectedRoute>
                <FavouritesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute>
                <FareAnalyticsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/model-evaluation" 
            element={
              <ProtectedRoute>
                <ModelEvaluationPage />
              </ProtectedRoute>
            } 
          />
          {/* Route Aliases for quick access & compatibility */}
          <Route path="/fare-analytics" element={<Navigate to="/analytics" replace />} />
          <Route path="/evaluation" element={<Navigate to="/model-evaluation" replace />} />
          <Route path="/favourite-locations" element={<Navigate to="/favourites" replace />} />
          <Route path="/compare" element={<Navigate to="/comparison" replace />} />
          <Route path="/rides" element={<Navigate to="/comparison" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}
