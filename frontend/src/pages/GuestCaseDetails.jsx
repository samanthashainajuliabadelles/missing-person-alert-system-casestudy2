import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api.js';

const API_BASE_URL = 'http://localhost:5000';
const getImageSrc = (photoUrl) => photoUrl?.startsWith('/uploads') ? `${API_BASE_URL}${photoUrl}` : photoUrl || '';

export default function GuestCaseDetails() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/cases/public/${id}`);
        setCaseData(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load public case details.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const alertText = useMemo(() => {
    if (!caseData) return '';
    const fullName = `${caseData.firstName || ''} ${caseData.lastName || ''}`.trim();
    return `Please help locate ${fullName}. Last seen at ${caseData.location?.name || 'unknown location'}, ${caseData.barangay?.name || 'unknown barangay'}. If seen, contact ${caseData.guardian?.contact || caseData.agency?.contact || '911'} or report to ${caseData.agency?.name || 'the nearest police station'}.`;
  }, [caseData]);

  if (loading) return <div className="guest-page"><p className="muted">Loading case details...</p></div>;
  if (error) return <div className="guest-page"><div className="empty-state"><h3>{error}</h3><Link className="primary small" to="/">Back to public search</Link></div></div>;
  if (!caseData) return null;

  const photoSrc = getImageSrc(caseData.photoUrl);

  return (
    <div className="guest-page">
      <header className="guest-nav fade-in-up">
        <Link className="ghost-button" to="/">← Back to Public Search</Link>
        <Link className="primary small" to="/login">Officer / Barangay Login</Link>
      </header>

      <section className="public-detail-card fade-in-up">
        <div className="public-profile">
          <div className={`avatar big-avatar ${photoSrc ? 'photo-avatar' : ''}`}>
            {photoSrc ? <img src={photoSrc} alt={`${caseData.firstName} ${caseData.lastName}`} /> : <>{caseData.firstName?.[0]}{caseData.lastName?.[0]}</>}
          </div>
          <div>
            <p className="eyebrow">Public Missing Person Alert</p>
            <h2>{caseData.firstName} {caseData.lastName}</h2>
            <div className="chips">
              <span className={`tag ${caseData.urgencyLevel?.toLowerCase()}`}>{caseData.urgencyLevel}</span>
              <span className="tag">{caseData.status}</span>
              <span className="tag">{caseData.report?.caseNumber}</span>
            </div>
          </div>
        </div>

        <div className="grid-2 public-info-grid">
          <div className="panel">
            <h3>Missing Person Details</h3>
            <dl>
              <dt>Age</dt><dd>{caseData.age || 'N/A'}</dd>
              <dt>Gender</dt><dd>{caseData.gender || 'N/A'}</dd>
              <dt>Last seen</dt><dd>{caseData.lastSeenDate || 'N/A'}</dd>
              <dt>Location</dt><dd>{caseData.location?.name || 'Unknown'} — {caseData.barangay?.name || 'Unknown barangay'}</dd>
              <dt>Clothing</dt><dd>{caseData.clothing || 'No clothing details provided.'}</dd>
              <dt>Description</dt><dd>{caseData.description || 'No description provided.'}</dd>
            </dl>
          </div>

          <div className="panel alert-box">
            <h3>Where to Report a Sighting</h3>
            <p>{alertText}</p>
            <dl>
              <dt>Guardian</dt><dd>{caseData.guardian?.name || 'Not publicly listed'}</dd>
              <dt>Contact</dt><dd>{caseData.guardian?.contact || caseData.agency?.contact || '911'}</dd>
              <dt>Reported to</dt><dd>{caseData.agency?.name || 'Nearest police station'}</dd>
              <dt>Station contact</dt><dd>{caseData.agency?.contact || '911'}</dd>
            </dl>
          </div>
        </div>
      </section>
    </div>
  );
}
