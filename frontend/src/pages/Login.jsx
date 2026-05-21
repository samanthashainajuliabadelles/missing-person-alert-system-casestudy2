import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Search, Building2, Users } from 'lucide-react';
import api from '../services/api.js';
import { useToast } from '../components/ToastProvider.jsx';
import { ILIGAN_BARANGAYS } from '../data/iliganBarangays.js';
import { ILIGAN_POLICE_STATIONS } from '../data/iliganPoliceStations.js';

const initialForm = {
  name: '',
  email: 'admin@bantaymissing.ph',
  password: 'admin123',
  role: 'Police Officer',
  assignment: '',
  assignmentType: 'Police Station'
};

export default function Login() {
  const navigate = useNavigate();
  const { notify } = useToast();

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const assignmentOptions = useMemo(() => {
    if (form.role === 'Barangay Official') {
      return ILIGAN_BARANGAYS;
    }

    return ILIGAN_POLICE_STATIONS
      .filter(station => station.type !== 'Emergency')
      .map(station => station.name);
  }, [form.role]);

  const updateForm = (key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };

      if (key === 'role') {
        next.assignment = '';
        next.assignmentType =
          value === 'Barangay Official' ? 'Barangay' : 'Police Station';
      }

      return next;
    });
  };

  const switchMode = () => {
    setError('');
    setMode(prev => (prev === 'login' ? 'register' : 'login'));

    setForm(prev => ({
      ...initialForm,
      email: prev.email || initialForm.email,
      password: prev.password || initialForm.password,
      role: 'Police Officer',
      assignment: '',
      assignmentType: 'Police Station'
    }));
  };

  const submit = async e => {
    e.preventDefault();
    setError('');

    try {
      const url = mode === 'login' ? '/auth/login' : '/auth/register';

      const payload =
        mode === 'login'
          ? {
              email: form.email,
              password: form.password
            }
          : form;

      const { data } = await api.post(url, payload);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      notify(
        mode === 'login'
          ? 'Login successful.'
          : 'Account registered successfully.',
        'success'
      );

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to continue');
    }
  };

  return (
    <div className="login-page improved-auth-page">
      <section className="hero-card improved-hero-card fade-in-up">
        <div className="hero-top-row">
          <div className="pill">Iligan City Missing Person Alert System</div>

          <Link className="guest-link-top" to="/">
            View Guest Home Page
          </Link>
        </div>

        <h1>Missing Person and Community Alert Graph System</h1>

        <p>
          A public safety platform for missing person alerts, police station
          reporting, barangay coordination, and system administrator monitoring.
        </p>

        <div className="hero-feature-grid">
          <div className="hero-feature-card">
            <Search size={22} />
            <div>
              <b>Guest Search</b>
              <span>Public visitors can search active missing person records.</span>
            </div>
          </div>

          <div className="hero-feature-card">
            <Building2 size={22} />
            <div>
              <b>Police Reports</b>
              <span>Police officers can manage reported cases by station.</span>
            </div>
          </div>

          <div className="hero-feature-card">
            <Users size={22} />
            <div>
              <b>Barangay Coordination</b>
              <span>Barangay officials can help verify and coordinate alerts.</span>
            </div>
          </div>

          <div className="hero-feature-card">
            <ShieldCheck size={22} />
            <div>
              <b>Admin Control</b>
              <span>Admins can manage users, roles, and system access.</span>
            </div>
          </div>
        </div>
      </section>

      <form className="auth-card improved-auth-card fade-in-up" onSubmit={submit}>
        <div className="auth-header">
          <div>
            <p className="auth-kicker">
              {mode === 'login' ? 'Officer Access' : 'Account Registration'}
            </p>

            <h2>
              {mode === 'login'
                ? 'Login to your account'
                : 'Create officer/barangay account'}
            </h2>
          </div>
        </div>

        {mode === 'register' && (
          <label className="field">
            <span>Full Name</span>
            <input
              required
              placeholder="Enter full name"
              value={form.name}
              onChange={e => updateForm('name', e.target.value)}
            />
          </label>
        )}

        <label className="field">
          <span>Email</span>
          <input
            required
            placeholder="Enter email address"
            type="email"
            value={form.email}
            onChange={e => updateForm('email', e.target.value)}
          />
        </label>

        <label className="field">
          <span>Password</span>

          <div className="password-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => updateForm('password', e.target.value)}
              required
              placeholder="Enter password"
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {mode === 'register' && (
          <>
            <label className="field">
              <span>Role</span>
              <select
                value={form.role}
                onChange={e => updateForm('role', e.target.value)}
              >
                <option>Police Officer</option>
                <option>Barangay Official</option>
              </select>
            </label>

            <label className="field">
              <span>
                {form.role === 'Barangay Official'
                  ? 'Assigned Barangay'
                  : 'Assigned Police Station'}
              </span>

              <select
                required
                value={form.assignment}
                onChange={e => updateForm('assignment', e.target.value)}
              >
                <option value="">
                  Select assigned{' '}
                  {form.role === 'Barangay Official'
                    ? 'barangay'
                    : 'police station'}
                </option>

                {assignmentOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {error && <p className="error">{error}</p>}

        <button className="primary auth-submit">
          {mode === 'login' ? 'Sign in' : 'Register'}
        </button>

        <button type="button" className="link-btn auth-switch" onClick={switchMode}>
          {mode === 'login'
            ? 'Need an account? Register as police/barangay official'
            : 'Already have an account? Login'}
        </button>

        <div className="seed-login-box demo-login-box">
          <b>Demo Login Accounts</b>

          <div>
            <span>Admin:</span>
            <code>admin@bantaymissing.ph</code>
            <small>/ admin123</small>
          </div>

          <div>
            <span>Police Station 4 Staff:</span>
            <code>ps4@bantaymissing.ph</code>
            <small>/ ps4123</small>
          </div>

          <div>
            <span>Police Station 5 Staff:</span>
            <code>ps5@bantaymissing.ph</code>
            <small>/ ps5123</small>
          </div>

          <div>
            <span>Barangay Tubod Official:</span>
            <code>tubod@bantaymissing.ph</code>
            <small>/ tubod123</small>
          </div>

          <div>
            <span>Barangay Palao Official:</span>
            <code>palao@bantaymissing.ph</code>
            <small>/ palao123</small>
          </div>
        </div>
      </form>
    </div>
  );
}