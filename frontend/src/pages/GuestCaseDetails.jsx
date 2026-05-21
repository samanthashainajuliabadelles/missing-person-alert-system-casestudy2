import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarClock,
  Copy,
  MapPin,
  Phone,
  ShieldCheck,
  Shirt,
  UserRound
} from 'lucide-react';
import api from '../services/api.js';

const API_BASE_URL = 'http://localhost:5000';

const getImageSrc = photoUrl =>
  photoUrl?.startsWith('/uploads') ? `${API_BASE_URL}${photoUrl}` : photoUrl || '';

export default function GuestCaseDetails() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

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

  const copyAlert = async () => {
    if (!alertText) return;

    try {
      await navigator.clipboard.writeText(alertText);
      setCopied(true);

      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (loading) {
    return (
      <div className="guest-page modern-public-detail-page">
        <div className="modern-loading-card">
          <ShieldCheck size={18} />
          Loading case details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="guest-page modern-public-detail-page">
        <div className="empty-state public-detail-empty">
          <h3>{error}</h3>
          <Link className="primary small" to="/">
            Back to public search
          </Link>
        </div>
      </div>
    );
  }

  if (!caseData) return null;

  const photoSrc = getImageSrc(caseData.photoUrl);
  const fullName = `${caseData.firstName || ''} ${caseData.lastName || ''}`.trim();

  return (
    <div className="guest-page modern-public-detail-page">
      <header className="guest-nav public-detail-nav fade-in-up">
        <Link className="ghost-button" to="/">
          <ArrowLeft size={17} />
          Back to Public Search
        </Link>

        <Link className="primary small" to="/login">
          Officer / Barangay Login
        </Link>
      </header>

      <section className="public-detail-hero fade-in-up">
        <div className="public-detail-photo-wrap">
          <div className={`public-detail-photo ${photoSrc ? 'has-photo' : ''}`}>
            {photoSrc ? (
              <img src={photoSrc} alt={fullName} />
            ) : (
              <span>
                {caseData.firstName?.[0]}
                {caseData.lastName?.[0]}
              </span>
            )}
          </div>
        </div>

        <div className="public-detail-hero-content">
          <p className="eyebrow">Public Missing Person Alert</p>

          <div className="public-detail-title-row">
            <div>
              <h1>{fullName || 'Unnamed Person'}</h1>
              <p>
                This is a public alert page. Please report possible sightings to
                the listed contact or assigned police station.
              </p>
            </div>

            <div className="public-detail-tags">
              <span className={`tag ${caseData.urgencyLevel?.toLowerCase()}`}>
                {caseData.urgencyLevel}
              </span>
              <span className={`tag status-${caseData.status?.toLowerCase()}`}>
                {caseData.status}
              </span>
            </div>
          </div>

          <div className="public-detail-quick-grid">
            <div>
              <UserRound size={18} />
              <span>Age / Gender</span>
              <b>{caseData.age || 'N/A'} • {caseData.gender || 'N/A'}</b>
            </div>

            <div>
              <CalendarClock size={18} />
              <span>Last Seen</span>
              <b>{caseData.lastSeenDate || 'N/A'}</b>
            </div>

            <div>
              <MapPin size={18} />
              <span>Location</span>
              <b>
                {caseData.location?.name || 'Unknown'} —{' '}
                {caseData.barangay?.name || 'Unknown barangay'}
              </b>
            </div>

            <div>
              <Building2 size={18} />
              <span>Reported To</span>
              <b>{caseData.agency?.name || 'Nearest police station'}</b>
            </div>
          </div>
        </div>
      </section>

      <section className="public-detail-alert-card fade-in-up">
        <div>
          <div className="public-detail-alert-heading">
            <AlertTriangle size={21} />
            <h3>Where to Report a Sighting</h3>
          </div>

          <p>{alertText}</p>
        </div>

        <button type="button" className="ghost-button" onClick={copyAlert}>
          <Copy size={17} />
          {copied ? 'Copied' : 'Copy Alert'}
        </button>
      </section>

      <div className="public-detail-grid">
        <section className="panel public-detail-info-card fade-in-up">
          <div className="section-title-row">
            <div>
              <h3>Missing Person Details</h3>
              <p className="muted">Publicly available identifying information.</p>
            </div>
          </div>

          <div className="public-detail-info-list">
            <div>
              <Shirt size={17} />
              <span>Clothing</span>
              <p>{caseData.clothing || 'No clothing details provided.'}</p>
            </div>

            <div>
              <UserRound size={17} />
              <span>Description</span>
              <p>{caseData.description || 'No description provided.'}</p>
            </div>

            <div>
              <MapPin size={17} />
              <span>Last Seen Area</span>
              <p>
                {caseData.location?.name || 'Unknown'} —{' '}
                {caseData.barangay?.name || 'Unknown barangay'}
              </p>
            </div>
          </div>
        </section>

        <section className="panel public-detail-contact-card fade-in-up">
          <div className="section-title-row">
            <div>
              <h3>Contact and Assigned Station</h3>
              <p className="muted">Use these details to report information safely.</p>
            </div>
          </div>

          <div className="public-contact-list">
            <div>
              <Phone size={18} />
              <span>Primary Contact</span>
              <b>{caseData.guardian?.contact || caseData.agency?.contact || '911'}</b>
              <small>{caseData.guardian?.name || 'Guardian not publicly listed'}</small>
            </div>

            <div>
              <Building2 size={18} />
              <span>Reported To</span>
              <b>{caseData.agency?.name || 'Nearest police station'}</b>
              <small>{caseData.agency?.contact || '911'}</small>
            </div>

            <div>
              <ShieldCheck size={18} />
              <span>Case Number</span>
              <b>{caseData.report?.caseNumber || 'Not available'}</b>
              <small>Reference this number when reporting a sighting.</small>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
