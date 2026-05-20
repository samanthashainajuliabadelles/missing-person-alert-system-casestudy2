import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api.js';

const API_BASE_URL = 'http://localhost:5000';
const getImageSrc = (photoUrl) => photoUrl?.startsWith('/uploads') ? `${API_BASE_URL}${photoUrl}` : photoUrl;

export default function PublicCaseDetails() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/public/cases/${id}`)
      .then(({ data }) => setCaseData(data))
      .catch(err => setError(err.response?.data?.message || 'Unable to load case.'));
  }, [id]);

  if (error) return <div className="public-page"><main className="public-main"><p className="error">{error}</p><Link className="primary small" to="/">Back to public search</Link></main></div>;
  if (!caseData) return <div className="public-page"><main className="public-main"><p>Loading case...</p></main></div>;

  const photo = getImageSrc(caseData.photoUrl);

  return (
    <div className="public-page">
      <main className="public-main">
        <Link className="back-link" to="/">← Back to public search</Link>
        <section className="panel public-detail-card">
          <div className="public-detail-photo">
            {photo ? <img src={photo} alt={`${caseData.firstName} ${caseData.lastName}`} /> : <span>{caseData.firstName?.[0]}{caseData.lastName?.[0]}</span>}
          </div>
          <div>
            <p className="eyebrow">{caseData.report?.caseNumber}</p>
            <h1>{caseData.firstName} {caseData.lastName}</h1>
            <div className="chips"><span className="tag">{caseData.status}</span></div>
            <p>{caseData.description || 'No physical description provided.'}</p>
            <dl>
              <dt>Age / Gender</dt><dd>{caseData.age} • {caseData.gender}</dd>
              <dt>Last seen</dt><dd>{caseData.lastSeenDate}</dd>
              <dt>Location</dt><dd>{caseData.location?.name}, {caseData.barangay?.name}, Iligan City</dd>
              <dt>Clothing</dt><dd>{caseData.clothing || 'No clothing details provided.'}</dd>
              <dt>Report to</dt><dd>{caseData.agency?.name || 'Nearest police station'}</dd>
              <dt>Hotline</dt><dd>{caseData.agency?.contact || '911'}</dd>
            </dl>
            <div className="public-warning">Do not approach suspicious situations alone. Report sightings immediately to the nearest police station, barangay office, or 911.</div>
          </div>
        </section>
      </main>
    </div>
  );
}
