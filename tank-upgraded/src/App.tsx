import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TankOverview from './pages/TankOverview';
import Heatmap from './pages/Heatmap';
import ReportBuilder from './pages/ReportBuilder';
import Planner from './pages/Planner';
import CSVUpload from './pages/CSVUpload';
import Inspections from './pages/Inspections';
import ActivityPage from './pages/Activity';
import NewAsset from './pages/NewAsset';
import NewInspection from './pages/NewInspection';
import AlertsPage from './pages/AlertsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loggedIn, initializing } = useAuth();
  if (initializing) return null;
  return loggedIn ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        {/* Assets */}
        <Route path="assets" element={<TankOverview />} />
        <Route path="assets/new" element={<NewAsset />} />
        <Route path="assets/:tankId" element={<TankOverview />} />

        {/* Legacy tanks routes */}
        <Route path="tanks" element={<TankOverview />} />
        <Route path="tanks/:tankId" element={<TankOverview />} />

        {/* Inspections */}
        <Route path="inspections" element={<Inspections />} />
        <Route path="inspections/new" element={<NewInspection />} />

        {/* Heatmap / Visualizations */}
        <Route path="heatmap" element={<Heatmap />} />
        <Route path="heatmap/:tankId" element={<Heatmap />} />

        {/* Reports / Analysis / Compliance */}
        <Route path="report" element={<ReportBuilder />} />
        <Route path="reports/:tankId" element={<ReportBuilder />} />
        <Route path="analysis" element={<ReportBuilder />} />
        <Route path="compliance" element={<ReportBuilder />} />
        <Route path="templates" element={<ReportBuilder />} />

        {/* Planner / Calendar */}
        <Route path="planner" element={<Planner />} />
        <Route path="calendar" element={<Planner />} />

        {/* Data / Upload */}
        <Route path="upload" element={<CSVUpload />} />
        <Route path="ingestion" element={<CSVUpload />} />

        {/* Activity */}
        <Route path="activity" element={<ActivityPage />} />

        {/* Alerts / Admin */}
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="admin" element={<Dashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
