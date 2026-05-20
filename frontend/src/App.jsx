import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Cases from './pages/Cases.jsx';
import CaseForm from './pages/CaseForm.jsx';
import CaseDetails from './pages/CaseDetails.jsx';
import GuestLanding from './pages/GuestLanding.jsx';
import GuestCaseDetails from './pages/GuestCaseDetails.jsx';
import Users from './pages/Users.jsx';

function RequireAuth({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" state={{ from: location }} replace />;
}

function RequireAdmin({ children }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const adminRoles = ['Administrator', 'System Admin', 'Admin'];
  return adminRoles.includes(user.role) ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GuestLanding />} />
      <Route path="/missing/:id" element={<GuestCaseDetails />} />
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="cases" element={<Cases />} />
        <Route path="cases/new" element={<CaseForm />} />
        <Route path="cases/:id" element={<CaseDetails />} />
        <Route path="cases/:id/edit" element={<CaseForm />} />
        <Route path="users" element={<RequireAdmin><Users /></RequireAdmin>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
