import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api from '../services/api.js';
import { ILIGAN_BARANGAYS } from '../data/iliganBarangays.js';
import { ILIGAN_POLICE_STATIONS } from '../data/iliganPoliceStations.js';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'Police Officer', assignedStation: '', assignedBarangay: ''
  });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/register', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to register');
    }
  };

  return (
    <div className="login-page">
      <section className="hero-card">
        <div className="pill">Staff Registration</div>
        <h1>Create your police or barangay staff account</h1>
        <p>Select your role and assignment so the system knows which station or barangay you belong to.</p>
      </section>

      <form className="auth-card" onSubmit={submit}>
        <h2>Create account</h2>
        <input placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        <input placeholder="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />

        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value, assignedStation: '', assignedBarangay: '' })}>
          <option>Police Officer</option>
          <option>Barangay Official</option>
        </select>

        {form.role === 'Police Officer' && (
          <select value={form.assignedStation} onChange={e => setForm({ ...form, assignedStation: e.target.value })} required>
            <option value="">Select assigned police station</option>
            {ILIGAN_POLICE_STATIONS.map(station => (
              <option key={station.name} value={station.name}>{station.name}</option>
            ))}
          </select>
        )}

        {form.role === 'Barangay Official' && (
          <select value={form.assignedBarangay} onChange={e => setForm({ ...form, assignedBarangay: e.target.value })} required>
            <option value="">Select assigned barangay</option>
            {ILIGAN_BARANGAYS.map(brgy => (
              <option key={brgy} value={brgy}>{brgy}</option>
            ))}
          </select>
        )}

        {error && <p className="error">{error}</p>}
        <button className="primary">Register</button>
        <Link className="link-btn" to="/login">Already have an account? Login</Link>
        <small>System Admin accounts are created from the Admin Users page.</small>
      </form>
    </div>
  );
}
