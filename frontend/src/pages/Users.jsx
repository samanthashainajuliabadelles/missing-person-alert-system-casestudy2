import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Pencil, X } from 'lucide-react';
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

      return next;
    });
  };

  const resetForm = () => {
    setForm(emptyUser);
    setEditingUser(null);
    setShowPassword(false);
  };

  const startEdit = user => {
    const normalizedRole =
      user.role === 'System Admin' || user.role === 'Admin'
        ? 'Administrator'
        : user.role || 'Police Officer';

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

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">System Admin</p>
          <h2>User Management</h2>
        </div>
      </div>

      <section className="panel form-section fade-in-up">
        <div className="section-title-row">
          <div>
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
            <button type="button" className="ghost small" onClick={resetForm}>
              <X size={16} />
              Cancel Edit
            </button>
          )}
        </div>

        <form className="form-grid user-create-grid" onSubmit={submitUser}>
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

          <button className="primary" type="submit">
            {editingUser ? 'Save Changes' : 'Add User'}
          </button>
        </form>
      </section>

      <section className="panel fade-in-up">
        <div className="section-title-row">
          <div>
            <h3>Registered Users</h3>

            <p className="muted">
              Filter police officers and barangay officials by role and assigned
              station/barangay.
            </p>
          </div>
        </div>

        <div className="filters user-filters">
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
        </div>

        {loading && <p className="muted">Loading users...</p>}

        {!loading && users.length === 0 && (
          <div className="empty-state">
            <h3>No users found</h3>
            <p>Try changing the filters or add a new user above.</p>
          </div>
        )}

        <div className="user-list">
          {users.map(user => (
            <div className="user-row user-row-editable" key={user.id}>
              <div>
                <b>{user.name}</b>
                <small>{user.email}</small>
              </div>

              <span className="tag">{user.role}</span>

              <span>{user.assignment || 'System Administration'}</span>

              <div className="user-actions">
                <button
                  type="button"
                  className="ghost small"
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
                  Delete
                </button>
              </div>
            </div>
          ))}
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