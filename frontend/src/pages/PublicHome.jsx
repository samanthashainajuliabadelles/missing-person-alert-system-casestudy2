import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ShieldCheck,
  MapPin,
  Phone,
  AlertTriangle,
  Clock,
  Building2
} from 'lucide-react';
import api from '../services/api.js';

export default function PublicHome() {
  const [cases, setCases] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    barangay: '',
    urgency: '',
    sort: 'newest'
  });

  const loadCases = async () => {
    try {
      const { data } = await api.get('/cases/public', {
        params: filters
      });

      setCases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Unable to load public cases:', err);
    }
  };

  useEffect(() => {
    const delay = setTimeout(loadCases, 250);
    return () => clearTimeout(delay);
  }, [filters]);

  const barangays = useMemo(() => {
    const unique = new Set();

    cases.forEach(item => {
      if (item.lastSeenBarangay) unique.add(item.lastSeenBarangay);
      if (item.barangay) unique.add(item.barangay);
    });

    return [...unique].sort();
  }, [cases]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="public-page improved-public-page">
      <header className="public-topbar">
        <Link className="brand-block" to="/">
          <div className="brand-logo">BM</div>

          <div>
            <h2>BantayMissing Iligan</h2>
            <p>Public missing person alert portal</p>
          </div>
        </Link>

        <Link className="public-login-btn" to="/login">
          Officer / Barangay Login
        </Link>
      </header>

      <section className="public-hero improved-public-hero fade-in-up">
        <div className="public-hero-content">
          <div className="public-kicker">
            <ShieldCheck size={16} />
            Guest Home Page
          </div>

          <h1>Search active missing person alerts in Iligan City</h1>

          <p>
            Guests can view public case details, search by name, check last-seen
            information, and see which police station the case was reported to.
          </p>

          <div className="public-hero-actions">
            <a href="#public-search" className="primary hero-action-btn">
              Search Records
            </a>

            <Link to="/login" className="secondary hero-action-btn">
              Officer Login
            </Link>
          </div>
        </div>

        <div className="public-hero-panel">
          <div className="mini-stat-card">
            <Search size={20} />
            <div>
              <b>Public Search</b>
              <span>Find active alerts by name or details</span>
            </div>
          </div>

          <div className="mini-stat-card">
            <AlertTriangle size={20} />
            <div>
              <b>Case Details</b>
              <span>View urgency and identifying information</span>
            </div>
          </div>

          <div className="mini-stat-card">
            <Building2 size={20} />
            <div>
              <b>Reported Station</b>
              <span>Know which station handles the case</span>
            </div>
          </div>

          <div className="mini-stat-card">
            <Phone size={20} />
            <div>
              <b>Emergency Contacts</b>
              <span>Quick access to police contact details</span>
            </div>
          </div>
        </div>
      </section>

      <section id="public-search" className="public-search-card fade-in-up">
        <div className="search-input-wrap">
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

          {barangays.map(barangay => (
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
          <option value="oldest">Oldest alerts</option>
          <option value="urgency">Highest urgency</option>
        </select>
      </section>

      <section className="public-results">
        <div className="public-results-head">
          <div>
            <p className="eyebrow">Active Public Alerts</p>
            <h2>{cases.length} record{cases.length === 1 ? '' : 's'} found</h2>
          </div>
        </div>

        {cases.length === 0 && (
          <div className="empty-state public-empty-state">
            <h3>No active public alerts found</h3>
            <p>Try searching another name, barangay, or urgency level.</p>
          </div>
        )}

        <div className="public-case-list">
          {cases.map(item => (
            <Link
              to={`/missing/${item.id}`}
              className="public-case-card fade-in-up"
              key={item.id}
            >
              <div className="case-avatar">
                {item.fullName
                  ? item.fullName
                      .split(' ')
                      .map(word => word[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'MP'}
              </div>

              <div className="case-main-info">
                <div className="case-title-row">
                  <h3>{item.fullName || 'Unnamed Person'}</h3>

                  <span
                    className={`urgency-pill urgency-${String(
                      item.urgency || 'medium'
                    ).toLowerCase()}`}
                  >
                    {item.urgency || 'Medium'}
                  </span>
                </div>

                <p className="case-description">
                  {item.description ||
                    item.clothing ||
                    'No description provided yet.'}
                </p>

                <div className="case-meta-grid">
                  <span>
                    <MapPin size={15} />
                    {item.lastSeenBarangay || item.barangay || 'Unknown area'}
                  </span>

                  <span>
                    <Building2 size={15} />
                    {item.reportedStation || item.policeStation || 'No station listed'}
                  </span>

                  <span>
                    <Clock size={15} />
                    {item.status || 'Active'}
                  </span>
                </div>
              </div>

              <div className="case-number">
                {item.caseNumber || item.referenceNumber || 'View details'}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}