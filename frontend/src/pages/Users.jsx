import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  Pencil,
  X,
  Search,
  UserPlus,
  ShieldCheck,
  MapPin,
  Building2,
  Trash2,
  Save,
  Users as UsersIcon,
  UserCog,
  BadgeCheck
} from 'lucide-react';
import api from '../services/api.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { ILIGAN_BARANGAYS } from '../data/iliganBarangays.js';
import { ILIGAN_POLICE_STATIONS } from '../data/iliganPoliceStations.js';

const emptyUser = {
  name: '',
  email: '',
  password: '',
  role: 'Police Officer',
  assignment: '',
  assignmentType: 'Police Station'
};

const normalizeRole = role =>
  role === 'System Admin' || role === 'Admin'
    ? 'Administrator'
    : role || 'Police Officer';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return 'U';

  return parts
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function roleClass(role = '') {
  return role.toLowerCase().replace(/\s+/g, '-');
}

export default function Users() {
  const { notify } = useToast();

  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    assignment: ''
  });

  const [form, setForm] = useState(emptyUser);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const assignmentOptions = useMemo(() => {
    let options = [];

    if (form.role === 'Barangay Official') {
      options = ILIGAN_BARANGAYS;
    } else if (form.role === 'Police Officer') {
      options = ILIGAN_POLICE_STATIONS
        .filter(station => station.type !== 'Emergency')
        .map(station => station.name);
    } else {
      options = ['System Administration'];
    }

    if (form.assignment && !options.includes(form.assignment)) {
      options = [form.assignment, ...options];
    }

    return options;
  }, [form.role, form.assignment]);

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter(user =>
      ['Administrator', 'System Admin', 'Admin'].includes(user.role)
    ).length;
    const police = users.filter(user => user.role === 'Police Officer').length;
    const barangay = users.filter(user => user.role === 'Barangay Official').length;

    return { total, admins, police, barangay };
  }, [users]);

  const load = async () => {
    try {
      setLoading(true);

      const { data } = await api.get('/users', {
        params: {
          ...filters,
          search: filters.search.trim()
        }
      });

      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      notify(err.response?.data?.message || 'Unable to load users.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(load, 250);
    return () => clearTimeout(delay);
  }, [filters]);

  const set = (key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };

      if (key === 'role') {
        next.assignment = '';

        next.assignmentType =
          value === 'Barangay Official'
            ? 'Barangay'
            : value === 'Police Officer'
              ? 'Police Station'
              : 'System';
      }

      if (key === 'assignment' && prev.role === 'Police Officer') {
        next.assignmentType = 'Police Station';
      }

      if (key === 'assignment' && prev.role === 'Barangay Official') {
        next.assignmentType = 'Barangay';
      }

      return next;
    });
  };

  const resetForm = () => {
    setForm(emptyUser);
    setEditingUser(null);
    setShowPassword(false);
  };

  const startEdit = user => {
    const normalizedRole = normalizeRole(user.role);

    setEditingUser(user);

    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: normalizedRole,
      assignment:
        normalizedRole === 'Administrator'
          ? 'System Administration'
          : user.assignment || '',
      assignmentType:
        normalizedRole === 'Administrator'
          ? 'System'
          : user.assignmentType ||
            (normalizedRole === 'Barangay Official'
              ? 'Barangay'
              : 'Police Station')
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const submitUser = async e => {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        assignment:
          form.role === 'Administrator'
            ? 'System Administration'
            : form.assignment,
        assignmentType:
          form.role === 'Administrator' ? 'System' : form.assignmentType
      };

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);

        notify('User account updated successfully.', 'success');

        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

        if (currentUser.id === editingUser.id) {
          notify(
            'You edited your own account. Please log out and log in again to refresh your session.',
            'info'
          );
        }
      } else {
        await api.post('/users', payload);
        notify('User account added successfully.', 'success');
      }

      resetForm();
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'Unable to save user.', 'error');
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;

    try {
      await api.delete(`/users/${deleteTarget.id}`);

      notify('User deleted successfully.', 'success');
      setDeleteTarget(null);
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'Unable to delete user.', 'error');
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      role: '',
      assignment: ''
    });
  };

  const hasFilters = filters.search || filters.role || filters.assignment;

  return (
    <div className="users-page modern-users-page">
      <div className="modern-page-hero users-hero fade-in-up">
        <div>
          <p className="eyebrow">System Admin</p>
          <h2>User Management</h2>
          <p>
            Create, update, filter, and manage accounts for police officers,
            barangay officials, and system administrators.
          </p>
        </div>

        <button
          type="button"
          className="primary modern-primary-action"
          onClick={() => {
            resetForm();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <UserPlus size={18} />
          Add New User
        </button>
      </div>

      <div className="users-stat-grid fade-in-up">
        <div className="users-stat-card">
          <div className="users-stat-icon">
            <UsersIcon size={21} />
          </div>
          <div>
            <span>Total Users</span>
            <b>{stats.total}</b>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon">
            <ShieldCheck size={21} />
          </div>
          <div>
            <span>Police Officers</span>
            <b>{stats.police}</b>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon">
            <MapPin size={21} />
          </div>
          <div>
            <span>Barangay Officials</span>
            <b>{stats.barangay}</b>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon">
            <UserCog size={21} />
          </div>
          <div>
            <span>Admins</span>
            <b>{stats.admins}</b>
          </div>
        </div>
      </div>

      <section className="panel modern-user-form-panel fade-in-up">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{editingUser ? 'Edit Account' : 'Create Account'}</p>
            <h3>
              {editingUser
                ? `Edit ${editingUser.name}`
                : 'Add Police Staff, Barangay Official, or Admin'}
            </h3>

            <p className="muted">
              Police officers are limited to their assigned station. Barangay
              officials are limited to their assigned barangay.
            </p>
          </div>

          {editingUser && (
            <button
              type="button"
              className="ghost-button user-cancel-edit-btn"
              onClick={resetForm}
            >
              <X size={16} />
              Cancel Edit
            </button>
          )}
        </div>

        <form className="modern-user-form" onSubmit={submitUser}>
          <label className="field">
            <span>Full Name</span>
            <input
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Enter full name"
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="Enter email"
            />
          </label>

          <label className="field password-field">
            <span>
              Password{' '}
              {editingUser && (
                <small className="muted">
                  leave blank to keep current password
                </small>
              )}
            </span>

            <div className="password-wrap">
              <input
                required={!editingUser}
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder={
                  editingUser ? 'New password optional' : 'Create password'
                }
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label className="field">
            <span>Role</span>

            <select
              value={form.role}
              onChange={e => set('role', e.target.value)}
            >
              <option>Police Officer</option>
              <option>Barangay Official</option>
              <option>Administrator</option>
            </select>
          </label>

          {form.role !== 'Administrator' && (
            <label className="field">
              <span>
                {form.role === 'Barangay Official'
                  ? 'Assigned Barangay'
                  : 'Assigned Police Station'}
              </span>

              <select
                required
                value={form.assignment}
                onChange={e => set('assignment', e.target.value)}
              >
                <option value="">Select assignment</option>

                {assignmentOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button className="primary user-save-btn" type="submit">
            <Save size={17} />
            {editingUser ? 'Save Changes' : 'Add User'}
          </button>
        </form>
      </section>

      <section className="panel modern-user-list-panel fade-in-up">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Registered Accounts</p>
            <h3>Registered Users</h3>

            <p className="muted">
              Filter police officers and barangay officials by role and assigned
              station/barangay.
            </p>
          </div>
        </div>

        <div className="modern-user-filters">
          <div className="modern-search-field">
            <Search size={18} />
            <input
              placeholder="Search name, email, role, assignment..."
              value={filters.search}
              onChange={e =>
                setFilters(prev => ({
                  ...prev,
                  search: e.target.value
                }))
              }
            />
          </div>

          <select
            value={filters.role}
            onChange={e =>
              setFilters(prev => ({
                ...prev,
                role: e.target.value
              }))
            }
          >
            <option value="">All roles</option>
            <option>Administrator</option>
            <option>Police Officer</option>
            <option>Barangay Official</option>
          </select>

          <input
            placeholder="Filter assignment/station/barangay"
            value={filters.assignment}
            onChange={e =>
              setFilters(prev => ({
                ...prev,
                assignment: e.target.value
              }))
            }
          />

          <button
            className="ghost-button clear-user-filter-btn"
            type="button"
            disabled={!hasFilters}
            onClick={clearFilters}
          >
            Clear
          </button>
        </div>

        {loading && (
          <div className="modern-loading-card">
            <UsersIcon size={18} />
            Loading users...
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="empty-state modern-empty-state">
            <h3>No users found</h3>
            <p>Try changing the filters or add a new user above.</p>
          </div>
        )}

        <div className="modern-user-grid">
          {users.map(user => {
            const displayRole = normalizeRole(user.role);
            const assignment =
              displayRole === 'Administrator'
                ? 'System Administration'
                : user.assignment || 'No assignment saved';

            return (
              <article className="modern-user-card" key={user.id}>
                <div className="modern-user-card-top">
                  <div className="modern-user-avatar">
                    {getInitials(user.name)}
                  </div>

                  <div className="modern-user-title">
                    <h4>{user.name}</h4>
                    <small>{user.email}</small>
                  </div>

                  <span className={`user-role-pill ${roleClass(displayRole)}`}>
                    {displayRole}
                  </span>
                </div>

                <div className="modern-user-meta">
                  <span>
                    {displayRole === 'Barangay Official' ? (
                      <MapPin size={15} />
                    ) : displayRole === 'Police Officer' ? (
                      <Building2 size={15} />
                    ) : (
                      <BadgeCheck size={15} />
                    )}
                    {assignment}
                  </span>

                  <span>
                    <ShieldCheck size={15} />
                    {user.assignmentType || (displayRole === 'Administrator' ? 'System' : 'Assigned User')}
                  </span>
                </div>

                <div className="modern-user-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => startEdit(user)}
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    type="button"
                    className="danger small"
                    onClick={() => setDeleteTarget(user)}
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this user?"
        message={`This will remove ${
          deleteTarget?.name || 'this account'
        } from the system. This action cannot be undone.`}
        confirmText="Delete User"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteUser}
      />
    </div>
  );
}
