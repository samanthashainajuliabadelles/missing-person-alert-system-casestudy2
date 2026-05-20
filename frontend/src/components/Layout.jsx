import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { useToast } from './ToastProvider.jsx';

export default function Layout() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = ['Administrator', 'System Admin', 'Admin'].includes(user.role);

  const backup = async () => {
    try {
      const response = await api.get('/backup/download', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `missing-person-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify('JSON backup downloaded successfully.', 'success');
    } catch (err) {
      notify(err.response?.data?.message || 'Unable to download backup.', 'error');
    }
  };

  const logout = () => {
    localStorage.clear();
    notify('Logged out successfully.', 'success');
    navigate('/login');
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">BM</div>
          <div>
            <h1>BantayMissing Iligan</h1>
            <span>Community Alert Graph</span>
          </div>
        </div>
        <nav>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/cases">Cases</NavLink>
          <NavLink to="/cases/new">New Report</NavLink>
          {isAdmin && <NavLink to="/users">Users</NavLink>}
        </nav>
        <div className="user-card">
          <b>{user.name || 'Responder'}</b>
          <small>{user.role || 'User'}</small>
          {user.assignment && <small>{user.assignmentType || 'Assigned to'}: {user.assignment}</small>}
          <button className="ghost" onClick={backup}>Download JSON Backup</button>
          <button className="danger ghost" onClick={logout}>Logout</button>
        </div>
      </aside>
      <main className="content fade-in-up"><Outlet /></main>
    </div>
  );
}
