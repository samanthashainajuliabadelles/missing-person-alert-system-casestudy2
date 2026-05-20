import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import { ILIGAN_BARANGAYS } from '../data/iliganBarangays.js';

const API_BASE_URL = 'http://localhost:5000';
const getImageSrc = (photoUrl) => photoUrl?.startsWith('/uploads') ? `${API_BASE_URL}${photoUrl}` : photoUrl || '';

export default function GuestLanding() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', barangay: '', urgency: '', sort: 'newest' });

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/cases/public', { params: { ...filters, search: filters.search.trim(), status: 'Active' } });
        setCases(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Unable to load public cases:', err);
        setCases([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [filters]);

  const set = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  return (
    <div className="guest-page">
      <header className="guest-nav fade-in-up">
        <div className="brand guest-brand">
          <div className="brand-mark">BM</div>
          <div>
            <h1>BantayMissing Iligan</h1>
            <span>Public missing person alert portal</span>
          </div>
        </div>
        <Link className="primary small" to="/login">Officer / Barangay Login</Link>
      </header>

      <section className="guest-hero fade-in-up">
        <div>
          <p className="eyebrow">Guest Home Page</p>
          <h2>Search active missing person alerts in Iligan City</h2>
          <p>
            Guests can view public case details, search by name, check last-seen information, and see where the case was reported.
            Login is separated for police officers, barangay officials, and system administrators.
          </p>
          <div className="hero-grid compact">
            <span>Public search</span><span>Case details</span><span>Reported station</span><span>Emergency contacts</span>
          </div>
        </div>
      </section>

      <section className="panel guest-search-panel fade-in-up">
        <div className="filters public-filters">
          <input
            placeholder="Search by name, clothing, location, or case number..."
            value={filters.search}
            onChange={e => set('search', e.target.value)}
          />
          <select value={filters.barangay} onChange={e => set('barangay', e.target.value)}>
            <option value="">All barangays</option>
            {ILIGAN_BARANGAYS.map(barangay => <option key={barangay} value={barangay}>{barangay}</option>)}
          </select>
          <select value={filters.urgency} onChange={e => set('urgency', e.target.value)}>
            <option value="">All urgency</option>
            <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
          </select>
          <select value={filters.sort} onChange={e => set('sort', e.target.value)}>
            <option value="newest">Newest alerts</option>
            <option value="az">Name A-Z</option>
            <option value="za">Name Z-A</option>
            <option value="urgencyHigh">Most urgent first</option>
          </select>
        </div>
      </section>

      {loading && <p className="muted guest-loading">Loading public alerts...</p>}
      {!loading && cases.length === 0 && (
        <div className="empty-state fade-in-up">
          <h3>No active public alerts found</h3>
          <p>Try a different name, barangay, or urgency filter.</p>
        </div>
      )}

      <div className="case-grid public-case-grid">
        {cases.map((c, index) => {
          const photoSrc = getImageSrc(c.photoUrl);
          return (
            <Link className="case-card public-case-card fade-in-up" style={{ animationDelay: `${index * 45}ms` }} key={c.id} to={`/missing/${c.id}`}>
              <div className={`avatar ${photoSrc ? 'photo-avatar' : ''}`}>
                {photoSrc ? <img src={photoSrc} alt={`${c.firstName} ${c.lastName}`} /> : <>{c.firstName?.[0]}{c.lastName?.[0]}</>}
              </div>
              <div className="case-body">
                <div className="case-top">
                  <h3>{c.firstName} {c.lastName}</h3>
                  <span className={`tag ${c.urgencyLevel?.toLowerCase()}`}>{c.urgencyLevel}</span>
                </div>
                <p>{c.clothing || c.description || 'No public description provided.'}</p>
                <small>{c.barangay?.name || 'Unknown barangay'} • Reported to {c.agency?.name || 'nearest police station'}</small>
                <div className="case-foot"><span>{c.status}</span><span>{c.report?.caseNumber}</span></div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
