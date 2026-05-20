import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import { ILIGAN_BARANGAYS } from '../data/iliganBarangays.js';

const API_BASE_URL = 'http://localhost:5000';

const getImageSrc = photoUrl => {
  if (!photoUrl) return '';

  if (photoUrl.startsWith('/uploads')) {
    return `${API_BASE_URL}${photoUrl}`;
  }

  return photoUrl;
};

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
    const delay = setTimeout(() => {
      load();
    }, 300);

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

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Records</p>
          <h2>Missing Person Cases</h2>
        </div>

        <Link className="primary small" to="/cases/new">
          New Report
        </Link>
      </div>

      {(isBarangayOfficial || isPoliceOfficer) && (
        <div className="access-note">
          {isBarangayOfficial
            ? `You are viewing and managing cases only from ${user.assignment}.`
            : `You are viewing and managing cases only reported to ${user.assignment}.`}
          <small>
            This restriction is also enforced by the backend for security.
          </small>
        </div>
      )}

      <div className="filters">
        <input
          placeholder="Search name, clothing, location, case number..."
          value={filters.search}
          onChange={e => handleChange('search', e.target.value)}
        />

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

        <button
          className="ghost"
          type="button"
          onClick={clearFilters}
          disabled={!hasFilters}
        >
          Clear
        </button>
      </div>

      {loading && <p className="muted">Loading cases...</p>}

      {!loading && cases.length === 0 && (
        <div className="empty-state">
          <h3>No cases found</h3>
          <p>
            Try changing the search keyword, status, urgency, or sorting option.
          </p>
        </div>
      )}

      <div className="case-grid">
        {cases.map(c => {
          const photoSrc = getImageSrc(c.photoUrl);

          return (
            <Link className="case-card" key={c.id} to={`/cases/${c.id}`}>
              <div className={`avatar ${photoSrc ? 'photo-avatar' : ''}`}>
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt={`${c.firstName} ${c.lastName}`}
                    onError={e => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <>
                    {c.firstName?.[0]}
                    {c.lastName?.[0]}
                  </>
                )}
              </div>

              <div className="case-body">
                <div className="case-top">
                  <h3>
                    {c.firstName} {c.lastName}
                  </h3>

                  <span className={`tag ${c.urgencyLevel?.toLowerCase()}`}>
                    {c.urgencyLevel}
                  </span>
                </div>

                <p>{c.clothing || c.description || 'No description provided.'}</p>

                <small>
                  {c.barangay?.name || 'Unknown barangay'} •{' '}
                  {c.agency?.name || 'Unknown station'}
                </small>

                <div className="case-foot">
                  <span>{c.status}</span>
                  <span>{c.report?.caseNumber}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}