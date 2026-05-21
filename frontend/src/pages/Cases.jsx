import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Clock,
  Filter,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X
} from 'lucide-react';
import api from '../services/api.js';
import { ILIGAN_BARANGAYS } from '../data/iliganBarangays.js';

const API_BASE_URL = 'http://localhost:5000';

const getImageSrc = photoUrl => {
  if (!photoUrl) return '';
  if (photoUrl.startsWith('/uploads')) return `${API_BASE_URL}${photoUrl}`;
  return photoUrl;
};

const getInitials = item => {
  const first = item.firstName?.[0] || '';
  const last = item.lastName?.[0] || '';
  return `${first}${last}`.toUpperCase() || 'MP';
};

const urgencyRank = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4
};

function StatPill({ label, value, icon }) {
  return (
    <div className="case-stat-card">
      <div className="case-stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <b>{value}</b>
      </div>
    </div>
  );
}

export default function Cases() {
  const user = useMemo(
    () => JSON.parse(localStorage.getItem('user') || '{}'),
    []
  );

  const isBarangayOfficial = user.role === 'Barangay Official';
  const isPoliceOfficer = user.role === 'Police Officer';

  const [cases, setCases] = useState([]);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    urgency: '',
    barangay: isBarangayOfficial ? user.assignment || '' : '',
    sort: 'newest'
  });

  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);

      const cleanFilters = {
        search: filters.search.trim(),
        status: filters.status,
        urgency: filters.urgency,
        barangay: filters.barangay,
        sort: filters.sort
      };

      const { data } = await api.get('/cases', {
        params: cleanFilters
      });

      setCases(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load cases:', error);
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(load, 300);
    return () => clearTimeout(delay);
  }, [filters]);

  const handleChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      urgency: '',
      barangay: isBarangayOfficial ? user.assignment || '' : '',
      sort: 'newest'
    });
  };

  const hasFilters =
    filters.search ||
    filters.status ||
    filters.urgency ||
    (!isBarangayOfficial && filters.barangay) ||
    filters.sort !== 'newest';

  const activeCount = cases.filter(item => item.status === 'Active').length;
  const criticalCount = cases.filter(item => item.urgencyLevel === 'Critical').length;
  const foundCount = cases.filter(item => item.status === 'Found').length;

  const sortedCases = useMemo(() => {
    const copy = [...cases];

    if (filters.sort === 'az') {
      copy.sort((a, b) =>
        `${a.firstName || ''} ${a.lastName || ''}`.localeCompare(
          `${b.firstName || ''} ${b.lastName || ''}`
        )
      );
    }

    if (filters.sort === 'za') {
      copy.sort((a, b) =>
        `${b.firstName || ''} ${b.lastName || ''}`.localeCompare(
          `${a.firstName || ''} ${a.lastName || ''}`
        )
      );
    }

    if (filters.sort === 'urgencyHigh') {
      copy.sort(
        (a, b) =>
          (urgencyRank[a.urgencyLevel] || 99) -
          (urgencyRank[b.urgencyLevel] || 99)
      );
    }

    if (filters.sort === 'urgencyLow') {
      copy.sort(
        (a, b) =>
          (urgencyRank[b.urgencyLevel] || 99) -
          (urgencyRank[a.urgencyLevel] || 99)
      );
    }

    return copy;
  }, [cases, filters.sort]);

  return (
    <div className="modern-cases-page">
      <div className="modern-page-hero">
        <div>
          <p className="eyebrow">Records</p>
          <h2>Missing Person Cases</h2>
          <p>
            Search, filter, review, and manage missing person reports connected
            to barangays and police stations.
          </p>
        </div>

        <Link className="primary modern-primary-action" to="/cases/new">
          <Plus size={18} />
          New Report
        </Link>
      </div>

      {(isBarangayOfficial || isPoliceOfficer) && (
        <div className="access-note modern-access-note">
          <ShieldCheck size={19} />

          <div>
            <b>
              {isBarangayOfficial
                ? `Scoped to Barangay ${user.assignment}`
                : `Scoped to ${user.assignment}`}
            </b>
            <small>
              You can only view and manage cases within your assigned
              barangay/station. This restriction is also enforced by the backend.
            </small>
          </div>
        </div>
      )}

      <div className="case-stats-grid">
        <StatPill
          label="Visible cases"
          value={cases.length}
          icon={<UserRound size={20} />}
        />

        <StatPill
          label="Active"
          value={activeCount}
          icon={<Clock size={20} />}
        />

        <StatPill
          label="Critical"
          value={criticalCount}
          icon={<AlertTriangle size={20} />}
        />

        <StatPill
          label="Found"
          value={foundCount}
          icon={<ShieldCheck size={20} />}
        />
      </div>

      <section className="modern-filter-panel">
        <div className="modern-filter-title">
          <div>
            <Filter size={18} />
            <b>Filter records</b>
          </div>

          {hasFilters && (
            <button className="clear-filter-btn" type="button" onClick={clearFilters}>
              <X size={15} />
              Clear
            </button>
          )}
        </div>

        <div className="modern-case-filters">
          <label className="modern-search-field">
            <Search size={18} />
            <input
              placeholder="Search name, clothing, location, case number..."
              value={filters.search}
              onChange={e => handleChange('search', e.target.value)}
            />
          </label>

          <select
            value={filters.barangay}
            onChange={e => handleChange('barangay', e.target.value)}
            disabled={isBarangayOfficial}
          >
            <option value="">All barangays</option>

            {ILIGAN_BARANGAYS.map(barangay => (
              <option key={barangay} value={barangay}>
                {barangay}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={e => handleChange('status', e.target.value)}
          >
            <option value="">All status</option>
            <option value="Active">Active</option>
            <option value="Found">Found</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={filters.urgency}
            onChange={e => handleChange('urgency', e.target.value)}
          >
            <option value="">All urgency</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={filters.sort}
            onChange={e => handleChange('sort', e.target.value)}
          >
            <option value="newest">Newest added</option>
            <option value="edited">Recently edited</option>
            <option value="oldest">Oldest added</option>
            <option value="az">Name A-Z</option>
            <option value="za">Name Z-A</option>
            <option value="urgencyHigh">Urgency: Critical to Low</option>
            <option value="urgencyLow">Urgency: Low to Critical</option>
          </select>
        </div>
      </section>

      {loading && (
        <div className="modern-loading-card">
          <SlidersHorizontal size={18} />
          Loading cases...
        </div>
      )}

      {!loading && cases.length === 0 && (
        <div className="empty-state modern-empty-state">
          <h3>No cases found</h3>
          <p>
            Try changing the search keyword, status, urgency, barangay, or
            sorting option.
          </p>
        </div>
      )}

      <div className="modern-case-grid">
        {sortedCases.map((c, index) => {
          const photoSrc = getImageSrc(c.photoUrl);

          return (
            <Link
              className="modern-case-card fade-in-up"
              style={{ animationDelay: `${index * 35}ms` }}
              key={c.id}
              to={`/cases/${c.id}`}
            >
              <div className="modern-case-card-top">
                <div className={`modern-case-avatar ${photoSrc ? 'photo-avatar' : ''}`}>
                  {photoSrc ? (
                    <img
                      src={photoSrc}
                      alt={`${c.firstName} ${c.lastName}`}
                      onError={e => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    getInitials(c)
                  )}
                </div>

                <span className={`tag ${c.urgencyLevel?.toLowerCase()}`}>
                  {c.urgencyLevel || 'Unlisted'}
                </span>
              </div>

              <div className="modern-case-main">
                <h3>
                  {c.firstName} {c.lastName}
                </h3>

                <p>{c.clothing || c.description || 'No description provided.'}</p>
              </div>

              <div className="modern-case-meta">
                <span>
                  <MapPin size={15} />
                  {c.barangay?.name || 'Unknown barangay'}
                </span>

                <span>
                  <Building2 size={15} />
                  {c.agency?.name || 'Unknown station'}
                </span>

                <span>
                  <Clock size={15} />
                  {c.status || 'Unknown status'}
                </span>
              </div>

              <div className="modern-case-footer">
                <span>{c.report?.caseNumber || 'No case number'}</span>

                <b>
                  View details
                  <ArrowRight size={16} />
                </b>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
