import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ShieldCheck,
  MapPin,
  Phone,
  AlertTriangle,
  Clock,
  Building2,
  ArrowRight
} from 'lucide-react';
import api from '../services/api.js';
import { ILIGAN_BARANGAYS } from '../data/iliganBarangays.js';

const API_BASE_URL = 'http://localhost:5000';

const getImageSrc = photoUrl =>
  photoUrl?.startsWith('/uploads') ? `${API_BASE_URL}${photoUrl}` : photoUrl || '';

export default function GuestLanding() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: '',
    barangay: '',
    urgency: '',
    sort: 'newest'
  });

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        const { data } = await api.get('/cases/public', {
          params: {
            ...filters,
            search: filters.search.trim(),
            status: 'Active'
          }
        });

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

  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

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

        <Link className="primary small" to="/login">
          Officer / Barangay Login
        </Link>
      </header>

      <section className="guest-hero better-guest-hero fade-in-up">
        <div className="guest-hero-content">
          <div className="public-kicker">
            <ShieldCheck size={16} />
            Guest Home Page
          </div>

          <h2>Search active missing person alerts in Iligan City</h2>

          <p>
            View public case details, search by name, check last-seen information,
            and identify the police station handling each missing person report.
          </p>

          <div className="public-hero-actions">
            <a href="#guest-search" className="primary hero-action-btn">
              Search Records
            </a>

            <Link to="/login" className="secondary hero-action-btn">
              Officer Login
            </Link>
          </div>
        </div>

        <div className="better-hero-side-card">
          <div className="hero-side-header">
            <div className="hero-side-icon">
              <Search size={26} />
            </div>

            <div>
              <span>Public Alert Portal</span>
              <b>Quick Case Lookup</b>
            </div>
          </div>

          <div className="hero-side-stats">
            <div>
              <b>Search</b>
              <span>Find cases by name, barangay, clothing, location, or case number.</span>
            </div>

            <div>
              <b>Verify</b>
              <span>Check last-seen area, urgency level, and report status.</span>
            </div>

            <div>
              <b>Contact</b>
              <span>See the assigned police station and emergency contact information.</span>
            </div>
          </div>

          <div className="hero-feature-list">
            <div>
              <Search size={18} />
              <span>Public search</span>
            </div>

            <div>
              <AlertTriangle size={18} />
              <span>Case details</span>
            </div>

            <div>
              <Building2 size={18} />
              <span>Reported station</span>
            </div>

            <div>
              <Phone size={18} />
              <span>Emergency contacts</span>
            </div>
          </div>
        </div>
      </section>

      <section id="guest-search" className="panel guest-search-panel fade-in-up">
        <div className="filters public-filters">
          <div className="search-input-wrap guest-search-input-wrap">
            <Search size={19} />

            <input
              placeholder="Search by name, clothing, location, or case number..."
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
            />
          </div>

          <select
            value={filters.barangay}
            onChange={e => updateFilter('barangay', e.target.value)}
          >
            <option value="">All barangays</option>

            {ILIGAN_BARANGAYS.map(barangay => (
              <option key={barangay} value={barangay}>
                {barangay}
              </option>
            ))}
          </select>

          <select
            value={filters.urgency}
            onChange={e => updateFilter('urgency', e.target.value)}
          >
            <option value="">All urgency</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>

          <select
            value={filters.sort}
            onChange={e => updateFilter('sort', e.target.value)}
          >
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

      {!loading && cases.length > 0 && (
        <section className="guest-results-head fade-in-up">
          <div>
            <p className="eyebrow">Active Public Alerts</p>
            <h2>
              {cases.length} record{cases.length === 1 ? '' : 's'} found
            </h2>
          </div>
        </section>
      )}

      <div className="case-grid public-case-grid">
        {cases.map((c, index) => {
          const photoSrc = getImageSrc(c.photoUrl);

          return (
            <Link
              className="public-grid-card fade-in-up"
              style={{ animationDelay: `${index * 45}ms` }}
              key={c.id}
              to={`/missing/${c.id}`}
            >
              <div className="public-grid-card-top">
                <div className={`case-avatar ${photoSrc ? 'photo-avatar' : ''}`}>
                  {photoSrc ? (
                    <img src={photoSrc} alt={`${c.firstName} ${c.lastName}`} />
                  ) : (
                    <>
                      {c.firstName?.[0]}
                      {c.lastName?.[0]}
                    </>
                  )}
                </div>

                <div className="public-grid-title-wrap">
                  <h3>
                    {c.firstName} {c.lastName}
                  </h3>

                  <p className="case-description">
                    {c.clothing || c.description || 'No public description provided.'}
                  </p>
                </div>

                <span className={`urgency-pill urgency-${String(c.urgencyLevel || 'medium').toLowerCase()}`}>
                  {c.urgencyLevel || 'Medium'}
                </span>
              </div>

              <div className="public-grid-meta">
                <span>
                  <MapPin size={15} />
                  {c.barangay?.name || 'Unknown barangay'}
                </span>

                <span>
                  <Building2 size={15} />
                  Reported to {c.agency?.name || 'nearest police station'}
                </span>

                <span>
                  <Clock size={15} />
                  {c.status || 'Active'}
                </span>
              </div>

              <div className="public-grid-footer">
                <span className="case-number">{c.report?.caseNumber || 'No case number'}</span>

                <span className="view-case-link">
                  View details
                  <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
