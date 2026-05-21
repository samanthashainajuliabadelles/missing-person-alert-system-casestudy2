import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import api from '../services/api.js';
import { ILIGAN_BARANGAYS, ILIGAN_CITY, ILIGAN_PROVINCE } from '../data/iliganBarangays.js';
import { useToast } from '../components/ToastProvider.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const API_BASE_URL = 'http://localhost:5000';

const getImageSrc = (photoUrl) => {
  if (!photoUrl) return '';

  if (photoUrl.startsWith('/uploads')) {
    return `${API_BASE_URL}${photoUrl}`;
  }

  return photoUrl;
};

const getReportedStation = (caseData) => {
  return caseData.agency?.name || 'No police station recorded';
};

const getReportedStationContact = (caseData) => {
  return caseData.agency?.contact || 'Contact nearest police station or call 911';
};

const sanitizeFileName = (value = 'missing-person-alert') => {
  return String(value)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '-')
    .trim()
    .toLowerCase();
};

const buildPublicAlertText = (caseData) => {
  const fullName = `${caseData.firstName || ''} ${caseData.lastName || ''}`.trim();

  const ageGender = [
    caseData.age ? `${caseData.age} years old` : '',
    caseData.gender || ''
  ]
    .filter(Boolean)
    .join(', ');

  const lastSeen = `${caseData.lastSeenDate || 'Date not provided'} at ${caseData.location?.name || 'Unknown location'}, ${caseData.barangay?.name || 'Unknown barangay'}, Iligan City`;

  const clothing = caseData.clothing || caseData.description || 'No clothing or description provided.';

  const guardianContact =
    caseData.guardian?.name && caseData.guardian?.contact
      ? `${caseData.guardian.name} at ${caseData.guardian.contact}`
      : caseData.guardian?.contact || 'the reporting guardian';

  const policeStation = getReportedStation(caseData);
  const policeContact = getReportedStationContact(caseData);

  return `Please help locate ${fullName}${ageGender ? `, ${ageGender}` : ''}. Last seen on ${lastSeen}. Clothing/description: ${clothing}. If seen, contact ${guardianContact}. You may also report to ${policeStation} at ${policeContact}. Do not approach suspicious situations alone; report sightings immediately.`;
};

const getPoliceStationLabel = (caseData) => {
  return caseData.agency?.name || 'Nearest Police Station / Barangay Safety Office';
};

const getPoliceStationContact = (caseData) => {
  return caseData.agency?.contact || 'Contact your nearest police station';
};

const sightingEmpty = {
  witnessName: '',
  witnessContact: '',
  dateTime: '',
  description: '',
  confidence: 'Medium',
  status: 'Unverified',
  locationName: '',
  locationAddress: '',
  barangayName: '',
  city: ILIGAN_CITY,
  province: ILIGAN_PROVINCE,
  vehiclePlate: '',
  vehicleType: '',
  vehicleColor: '',
  vehicleDescription: '',
  cctvCode: '',
  cctvLocation: ''
};

export default function CaseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  const posterRef = useRef(null);

  const [caseData, setCaseData] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [network, setNetwork] = useState({ nodes: [], edges: [] });
  const [alert, setAlert] = useState(null);
  const [sighting, setSighting] = useState(sightingEmpty);
  const [duplicates, setDuplicates] = useState([]);
  const [movementPath, setMovementPath] = useState([]);
  const [relatedCases, setRelatedCases] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteBody, setNoteBody] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeBonusTab, setActiveBonusTab] = useState('path');

  const load = async () => {
    try {
      const c = await api.get(`/cases/${id}`);
      setCaseData(c.data);
    } catch (err) {
      notify(err.response?.data?.message || 'Unable to load case details.', 'error');
      return;
    }

    try {
      const s = await api.get(`/cases/${id}/sightings`);
      setSightings(Array.isArray(s.data) ? s.data : []);
    } catch {
      setSightings([]);
      notify('Unable to load sightings.', 'error');
    }

    try {
      const n = await api.get(`/cases/${id}/network`);
      setNetwork(n.data || { nodes: [], edges: [] });
    } catch {
      setNetwork({ nodes: [], edges: [] });
      notify('Unable to load graph network.', 'error');
    }

    try {
      const d = await api.get(`/cases/${id}/duplicates`);
      setDuplicates(Array.isArray(d.data) ? d.data : []);
    } catch {
      setDuplicates([]);
    }

    try {
      const pathRes = await api.get(`/cases/${id}/movement-path`);

      if (Array.isArray(pathRes.data)) {
        setMovementPath(pathRes.data);
      } else if (Array.isArray(pathRes.data?.path)) {
        setMovementPath(pathRes.data.path);
      } else {
        setMovementPath([]);
      }
    } catch {
      setMovementPath([]);
      notify('Unable to load movement path.', 'error');
    }

    try {
      const related = await api.get(`/cases/${id}/related`);
      setRelatedCases(Array.isArray(related.data) ? related.data : []);
    } catch {
      setRelatedCases([]);
    }

    try {
      const notesRes = await api.get(`/cases/${id}/notes`);
      setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
    } catch {
      setNotes([]);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const addSighting = async (e) => {
    e.preventDefault();

    try {
      await api.post(`/cases/${id}/sightings`, {
        ...sighting,
        city: ILIGAN_CITY,
        province: ILIGAN_PROVINCE
      });

      setSighting(sightingEmpty);
      notify('Sighting saved and connected to this case.', 'success');
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'Unable to save sighting.', 'error');
    }
  };

  const updateSightingStatus = async (sightingId, status) => {
    try {
      await api.patch(`/cases/${id}/sightings/${sightingId}/status`, { status });
      notify(`Sighting marked as ${status}.`, 'success');
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'Unable to update sighting status.', 'error');
    }
  };

  const generateAlert = async () => {
    try {
      const { data } = await api.get(`/cases/${id}/alert`);
      setAlert(data);
      notify('Community alert generated.', 'success');
    } catch (err) {
      notify(err.response?.data?.message || 'Unable to generate alert.', 'error');
    }
  };

  const copyAlert = async () => {
    if (!alert || !caseData) return;

    const publicText = buildPublicAlertText(caseData);

    await navigator.clipboard.writeText(`MISSING PERSON ALERT\n\n${publicText}`);
    notify('Alert text copied to clipboard.', 'success');
  };

  const downloadPosterImage = async () => {
    try {
      if (!posterRef.current || !caseData) return;

      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const caseNumber = caseData.report?.caseNumber || `missing-person-${caseData.id || 'case'}`;
      const fileName = `${sanitizeFileName(caseNumber)}-poster.png`;

      const link = document.createElement('a');
      link.download = fileName;
      link.href = canvas.toDataURL('image/png');
      link.click();

      notify(`Poster image saved as ${fileName}.`, 'success');
    } catch (err) {
      console.error(err);
      notify('Unable to save poster as image.', 'error');
    }
  };

  const addNote = async (e) => {
    e.preventDefault();

    if (!noteBody.trim()) {
      return notify('Please write a note first.', 'info');
    }

    try {
      await api.post(`/cases/${id}/notes`, {
        content: noteBody.trim(),
        author: 'System User'
      });

      setNoteBody('');
      notify('Case note added.', 'success');
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'Unable to add case note.', 'error');
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/cases/${id}`);
      notify('Case deleted.', 'success');
      navigate('/cases');
    } catch (err) {
      notify(err.response?.data?.message || 'Unable to delete case.', 'error');
    }
  };

  const printAlert = () => {
    if (!posterRef.current) {
      notify('Poster is not ready to print.', 'error');
      return;
    }

    const posterHTML = posterRef.current.outerHTML;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(node => node.outerHTML)
      .join('\n');

    iframeDoc.open();
    iframeDoc.write(`
      <!doctype html>
      <html>
        <head>
          <base href="${window.location.origin}/" />
          <title>Missing Person Poster</title>
          ${styles}

          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }

            * {
              box-sizing: border-box !important;
            }

            html,
            body {
              width: 210mm !important;
              min-height: 297mm !important;
              max-height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              overflow: hidden !important;
            }

            body {
              display: flex !important;
              align-items: flex-start !important;
              justify-content: center !important;
              font-family: Arial, sans-serif !important;
            }

            .printable-alert,
            .poster-export {
              width: 194mm !important;
              height: 281mm !important;
              max-width: 194mm !important;
              max-height: 281mm !important;
              margin: 0 auto !important;
              padding: 9mm !important;
              border: 1px solid #dddddd !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              background: white !important;
              overflow: hidden !important;
              page-break-before: avoid !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              break-before: avoid !important;
              break-after: avoid !important;
              break-inside: avoid !important;
            }

            .poster-header {
              padding-bottom: 8px !important;
              margin-bottom: 8px !important;
            }

            .poster-label {
              font-size: 11px !important;
            }

            .poster-header h1 {
              font-size: 28px !important;
              line-height: 1 !important;
              margin: 0 !important;
            }

            .poster-case {
              padding: 8px 10px !important;
            }

            .poster-main,
            .improved-poster-main {
              display: grid !important;
              grid-template-columns: 190px 1fr !important;
              gap: 12px !important;
              margin-top: 10px !important;
            }

            .poster-photo,
            .improved-poster-photo {
              width: 100% !important;
              height: 230px !important;
              object-fit: cover !important;
            }

            .poster-info h2 {
              font-size: 24px !important;
              line-height: 1.05 !important;
              margin: 0 0 8px !important;
            }

            .poster-detail-grid,
            .poster-detail-grid-no-urgency {
              display: grid !important;
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 6px !important;
            }

            .poster-detail-grid div,
            .poster-section,
            .poster-contact-box {
              padding: 7px !important;
              border-radius: 8px !important;
            }

            .poster-detail-grid span,
            .poster-section span,
            .poster-contact-box span {
              font-size: 9px !important;
            }

            .poster-detail-grid b {
              font-size: 11px !important;
              line-height: 1.2 !important;
            }

            .poster-section {
              margin-top: 7px !important;
            }

            .poster-section p {
              font-size: 11px !important;
              line-height: 1.35 !important;
              margin: 4px 0 0 !important;
            }

            .poster-contact-grid {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 7px !important;
              margin-top: 8px !important;
            }

            .poster-contact-box b {
              font-size: 14px !important;
              line-height: 1.15 !important;
            }

            .poster-contact-box strong {
              font-size: 10px !important;
            }

            .poster-message {
              margin-top: 8px !important;
              padding: 8px !important;
            }

            .poster-message p {
              font-size: 10.5px !important;
              line-height: 1.3 !important;
              margin: 0 !important;
            }

            .poster-warning {
              margin-top: 7px !important;
              padding: 7px !important;
              font-size: 10.5px !important;
              line-height: 1.25 !important;
            }

            .no-print,
            .actions {
              display: none !important;
            }
          </style>
        </head>

        <body>
          ${posterHTML}
        </body>
      </html>
    `);
    iframeDoc.close();

    const printPoster = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 800);
    };

    const images = iframeDoc.images;

    if (!images.length) {
      setTimeout(printPoster, 300);
      return;
    }

    let loadedImages = 0;

    Array.from(images).forEach(image => {
      const done = () => {
        loadedImages += 1;

        if (loadedImages === images.length) {
          setTimeout(printPoster, 300);
        }
      };

      if (image.complete) {
        done();
      } else {
        image.onload = done;
        image.onerror = done;
      }
    });
  };

  const verifiedSightings = useMemo(
    () => sightings.filter(s => s.status === 'Verified').length,
    [sightings]
  );

  const casePhoto = getImageSrc(caseData?.photoUrl);

  if (!caseData) {
    return <p>Loading case...</p>;
  }

  return (
    <div className="case-details-page modern-case-details-page">
      <div className="page-head modern-details-head">
        <div>
          <Link className="back-link no-print" to="/cases">
            ← Back to Cases
          </Link>

          <p className="eyebrow">{caseData.report?.caseNumber}</p>
          <h2>{caseData.firstName} {caseData.lastName}</h2>
        </div>

        <div className="actions no-print">
          <Link className="small" to={`/cases/${id}/edit`}>
            Edit
          </Link>

          <button
            className="small danger"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="bonus-strip modern-bonus-strip">
        <div>
          <b>{duplicates.length}</b>
          <span>Possible duplicates</span>
        </div>

        <div>
          <b>{movementPath.length}</b>
          <span>Movement points</span>
        </div>

        <div>
          <b>{relatedCases.length}</b>
          <span>Related cases</span>
        </div>

        <div>
          <b>{verifiedSightings}</b>
          <span>Verified sightings</span>
        </div>
      </div>

      <div className="detail-grid modern-detail-grid">
        <section className="panel profile-panel improved-profile">
          <div className="profile-top">
            <div className="profile-photo-wrap">
              <div className="big-avatar profile-photo">
                {casePhoto ? (
                  <img
                    src={casePhoto}
                    alt={`${caseData.firstName} ${caseData.lastName}`}
                  />
                ) : (
                  <>
                    {caseData.firstName?.[0]}
                    {caseData.lastName?.[0]}
                  </>
                )}
              </div>
            </div>

            <div className="profile-main-info">
              <div className="profile-title-row">
                <div>
                  <p className="profile-label">Missing Person</p>
                  <h3>{caseData.firstName} {caseData.lastName}</h3>
                </div>

                <div className="profile-tags">
                  <span className={`tag status-${caseData.status?.toLowerCase()}`}>
                    {caseData.status}
                  </span>

                  <span className={`tag ${caseData.urgencyLevel?.toLowerCase()}`}>
                    {caseData.urgencyLevel}
                  </span>
                </div>
              </div>

              <p className="profile-description">
                {caseData.description || 'No physical description provided.'}
              </p>

              <div className="quick-info-grid">
                <div className="quick-info-card">
                  <span>Age / Gender</span>
                  <b>{caseData.age || 'N/A'} • {caseData.gender || 'N/A'}</b>
                </div>

                <div className="quick-info-card">
                  <span>Last Seen</span>
                  <b>{caseData.lastSeenDate || 'No date provided'}</b>
                </div>

                <div className="quick-info-card">
                  <span>Location</span>
                  <b>{caseData.location?.name || 'Unknown location'}</b>
                  <small>{caseData.barangay?.name || 'Unknown barangay'}, Iligan City</small>
                </div>

                <div className="quick-info-card">
                  <span>Guardian</span>
                  <b>{caseData.guardian?.name || 'Unknown guardian'}</b>
                  <small>{caseData.guardian?.contact || 'No contact provided'}</small>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-details-box">
            <div>
              <span>Clothing When Last Seen</span>
              <p>{caseData.clothing || 'No clothing details provided.'}</p>
            </div>

            <div>
              <span>Reported To</span>
              <p>{getReportedStation(caseData)}</p>
              <small className="agency-hotline">
                Hotline: {getReportedStationContact(caseData)}
              </small>
            </div>
          </div>

          <button className="generate-alert-btn" onClick={generateAlert}>
            Generate Community Alert
          </button>
        </section>

        <section className="panel connection-panel">
          <div className="section-title-row">
            <div>
              <h3>Case Connection Map</h3>
              <p className="muted">
                A simple view of how this case is connected to people, places, reports, sightings, and evidence.
              </p>
            </div>

            <span className="mini-badge">Graph-based view</span>
          </div>

          <div className="connection-center">
            <div className="person-node">
              <span className="node-icon">👤</span>
              <div>
                <small>Missing Person</small>
                <b>{caseData.firstName} {caseData.lastName}</b>
              </div>
            </div>
          </div>

          <div className="connection-grid">
            <div className="connection-card guardian-card">
              <div className="connection-icon">👪</div>
              <div>
                <small>Reported by</small>
                <b>{caseData.guardian?.name || 'No guardian recorded'}</b>
                <p>{caseData.guardian?.contact || 'No contact provided'}</p>
              </div>
            </div>

            <div className="connection-card report-card">
              <div className="connection-icon">📄</div>
              <div>
                <small>Case report</small>
                <b>{caseData.report?.caseNumber || 'No case number'}</b>
                <p>Status: {caseData.status || 'Unknown'}</p>
              </div>
            </div>

            <div className="connection-card location-card">
              <div className="connection-icon">📍</div>
              <div>
                <small>Last seen at</small>
                <b>{caseData.location?.name || 'Unknown location'}</b>
                <p>{caseData.barangay?.name || 'Unknown barangay'}, Iligan City</p>
              </div>
            </div>

            <div className="connection-card agency-card">
              <div className="connection-icon">🚓</div>
              <div>
                <small>Reported to</small>
                <b>{getReportedStation(caseData)}</b>
                <p>Hotline: {getReportedStationContact(caseData)}</p>
              </div>
            </div>
          </div>

          <div className="connection-summary">
            <div>
              <b>{sightings.length}</b>
              <span>Sightings reported</span>
            </div>

            <div>
              <b>{verifiedSightings}</b>
              <span>Verified sightings</span>
            </div>

            <div>
              <b>{network.nodes.length}</b>
              <span>Connected records</span>
            </div>

            <div>
              <b>{network.edges.length}</b>
              <span>Case links</span>
            </div>
          </div>
        </section>
      </div>

      {alert && (
        <section className="panel alert-box">
          <div ref={posterRef} className="printable-alert poster-export">
            <div className="poster-header">
              <div>
                <p className="poster-label">Community Safety Notice</p>
                <h1>MISSING PERSON ALERT</h1>
              </div>

              <div className="poster-case">
                <span>Case No.</span>
                <b>{alert.caseNumber || caseData.report?.caseNumber || 'N/A'}</b>
              </div>
            </div>

            <div className="poster-main improved-poster-main">
              <div className="poster-photo-wrap improved-poster-photo-wrap">
                {casePhoto ? (
                  <img
                    src={casePhoto}
                    alt={`${caseData.firstName} ${caseData.lastName}`}
                    className="poster-photo improved-poster-photo"
                  />
                ) : (
                  <div className="poster-photo empty-photo improved-poster-photo">
                    <span>
                      {caseData.firstName?.[0]}
                      {caseData.lastName?.[0]}
                    </span>
                  </div>
                )}
              </div>

              <div className="poster-info">
                <h2>{`${caseData.firstName || ''} ${caseData.lastName || ''}`.trim()}</h2>

                <div className="poster-detail-grid poster-detail-grid-no-urgency">
                  <div>
                    <span>Age</span>
                    <b>{caseData.age || 'N/A'}</b>
                  </div>

                  <div>
                    <span>Gender</span>
                    <b>{caseData.gender || 'N/A'}</b>
                  </div>

                  <div>
                    <span>Status</span>
                    <b>{caseData.status || 'N/A'}</b>
                  </div>
                </div>

                <div className="poster-section">
                  <span>Last Seen</span>
                  <p>
                    {caseData.lastSeenDate || 'Date not provided'} at{' '}
                    {`${caseData.location?.name || 'Unknown location'}, ${caseData.barangay?.name || 'Unknown barangay'}, Iligan City`}
                  </p>
                </div>

                <div className="poster-section">
                  <span>Clothing / Description</span>
                  <p>
                    {caseData.clothing ||
                      caseData.description ||
                      'No clothing or description provided.'}
                  </p>
                </div>

                <div className="poster-contact-grid">
                  <div className="poster-contact-box">
                    <span>Primary Contact</span>
                    <strong>{caseData.guardian?.name || 'Reporting Guardian'}</strong>
                    <b>
                      {caseData.guardian?.contact || 'Contact local authorities'}
                    </b>
                  </div>

                  <div className="poster-contact-box secondary-contact-box">
                    <span>Report Also To</span>
                    <strong>{getReportedStation(caseData)}</strong>
                    <b>{getReportedStationContact(caseData)}</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="poster-message">
              <p>{buildPublicAlertText(caseData)}</p>
            </div>

            <div className="poster-warning">
              Do not approach suspicious situations alone. Report sightings immediately to the guardian,
              police station, barangay office, or local safety authorities.
            </div>
          </div>

          <div className="actions no-print">
            <button onClick={copyAlert}>Copy alert text</button>
            <button className="ghost-button" onClick={downloadPosterImage}>
              Save as Image
            </button>
            <button className="ghost-button" onClick={printAlert}>
              Print Poster
            </button>
          </div>
        </section>
      )}

      <section className="panel bonus-panel modern-tabs-panel">
        <div className="tab-row">
          <button
            className={activeBonusTab === 'path' ? 'tab active' : 'tab'}
            onClick={() => setActiveBonusTab('path')}
          >
            Movement Path
          </button>

          <button
            className={activeBonusTab === 'duplicates' ? 'tab active' : 'tab'}
            onClick={() => setActiveBonusTab('duplicates')}
          >
            Duplicates
          </button>

          <button
            className={activeBonusTab === 'related' ? 'tab active' : 'tab'}
            onClick={() => setActiveBonusTab('related')}
          >
            Related Cases
          </button>

          <button
            className={activeBonusTab === 'notes' ? 'tab active' : 'tab'}
            onClick={() => setActiveBonusTab('notes')}
          >
            Case Notes
          </button>
        </div>

        {activeBonusTab === 'path' && (
          <div className="path-list">
            {movementPath.map((point, index) => (
              <div className="path-item" key={`${point.type}-${index}`}>
                <div className="path-dot">{index + 1}</div>

                <div>
                  <b>{point.type}: {point.location || point.address || 'Unknown location'}</b>
                  <p>
                    {point.barangay || 'Unknown barangay'} • {point.dateTime || 'No date provided'} • {point.status}
                  </p>
                  {point.description && <small>{point.description}</small>}
                </div>
              </div>
            ))}

            {movementPath.length === 0 && (
              <p className="muted">
                No movement data yet. Add sightings to build the movement path.
              </p>
            )}
          </div>
        )}

        {activeBonusTab === 'duplicates' && (
          <div className="list bonus-list">
            {duplicates.map(item => (
              <Link to={`/cases/${item.id}`} className="list-item" key={item.id}>
                <div>
                  <b>{item.firstName} {item.lastName}</b>
                  <small>{item.report?.caseNumber} • {item.barangay?.name}</small>
                </div>

                <span className="tag high">
                  {item.duplicateScore || item.score || 0} match score
                </span>
              </Link>
            ))}

            {duplicates.length === 0 && (
              <p className="muted">No possible duplicate reports detected.</p>
            )}
          </div>
        )}

        {activeBonusTab === 'related' && (
          <div className="list bonus-list">
            {relatedCases.map(item => (
              <Link to={`/cases/${item.id}`} className="list-item" key={item.id}>
                <div>
                  <b>{item.firstName} {item.lastName}</b>
                  <small>{item.reasons?.join(' • ')}</small>
                </div>

                <span className="tag">Related</span>
              </Link>
            ))}

            {relatedCases.length === 0 && (
              <p className="muted">
                No related cases found through shared barangays, sightings, or vehicles.
              </p>
            )}
          </div>
        )}

        {activeBonusTab === 'notes' && (
          <div className="notes-grid">
            <form onSubmit={addNote} className="note-form">
              <textarea
                placeholder="Add investigation note, follow-up action, or barangay update..."
                value={noteBody}
                onChange={e => setNoteBody(e.target.value)}
              />

              <button className="primary">Add Note</button>
            </form>

            <div className="note-list">
              {notes.map(note => (
                <div className="note-card" key={note.id}>
                  <b>{note.author || 'System User'}</b>
                  <p>{note.content || note.body}</p>
                  <small>{String(note.createdAt || '')}</small>
                </div>
              ))}

              {notes.length === 0 && (
                <p className="muted">No notes added yet.</p>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="grid-2">
        <section className="panel">
          <h3>Sighting Timeline</h3>

          <div className="timeline">
            {sightings.map(s => (
              <div className="timeline-item" key={s.id}>
                <b>{s.dateTime || 'No date provided'}</b>
                <p>{s.description}</p>
                <small>
                  {s.location?.name || 'Unknown location'}, {s.barangay?.name || 'Unknown barangay'} • Witness: {s.witness?.name || 'Unknown'}
                </small>

                <div className="sighting-actions">
                  <span className={`tag ${s.status === 'Verified' ? 'low' : s.status === 'False alarm' ? 'critical' : 'medium'}`}>
                    {s.status}
                  </span>

                  <select
                    value={s.status}
                    onChange={e => updateSightingStatus(s.id, e.target.value)}
                  >
                    <option>Unverified</option>
                    <option>Under Review</option>
                    <option>Verified</option>
                    <option>False alarm</option>
                  </select>
                </div>
              </div>
            ))}

            {sightings.length === 0 && (
              <p className="muted">No sightings yet.</p>
            )}
          </div>
        </section>

        <form className="panel mini-form" onSubmit={addSighting}>
          <h3>Add Sighting</h3>

          <input
            placeholder="Witness name"
            value={sighting.witnessName}
            onChange={e => setSighting({ ...sighting, witnessName: e.target.value })}
          />

          <input
            placeholder="Witness contact"
            value={sighting.witnessContact}
            onChange={e => setSighting({ ...sighting, witnessContact: e.target.value })}
          />

          <input
            placeholder="Date/time seen"
            value={sighting.dateTime}
            onChange={e => setSighting({ ...sighting, dateTime: e.target.value })}
          />

          <textarea
            required
            placeholder="Sighting description"
            value={sighting.description}
            onChange={e => setSighting({ ...sighting, description: e.target.value })}
          />

          <div className="form-grid two">
            <select
              value={sighting.confidence}
              onChange={e => setSighting({ ...sighting, confidence: e.target.value })}
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <select
              value={sighting.status}
              onChange={e => setSighting({ ...sighting, status: e.target.value })}
            >
              <option>Unverified</option>
              <option>Under Review</option>
              <option>Verified</option>
              <option>False alarm</option>
            </select>
          </div>

          <input
            placeholder="Location name"
            value={sighting.locationName}
            onChange={e => setSighting({ ...sighting, locationName: e.target.value })}
          />

          <input
            placeholder="Location address"
            value={sighting.locationAddress}
            onChange={e => setSighting({ ...sighting, locationAddress: e.target.value })}
          />

          <div className="form-grid two">
            <select
              required
              value={sighting.barangayName}
              onChange={e => setSighting({ ...sighting, barangayName: e.target.value })}
            >
              <option value="">Select Iligan barangay</option>
              {ILIGAN_BARANGAYS.map(brgy => (
                <option key={brgy} value={brgy}>
                  {brgy}
                </option>
              ))}
            </select>

            <input
              placeholder="City"
              value={ILIGAN_CITY}
              disabled
            />
          </div>

          <div className="form-grid two">
            <input
              placeholder="Vehicle plate optional"
              value={sighting.vehiclePlate}
              onChange={e => setSighting({ ...sighting, vehiclePlate: e.target.value })}
            />

            <input
              placeholder="Vehicle details optional"
              value={sighting.vehicleDescription}
              onChange={e => setSighting({ ...sighting, vehicleDescription: e.target.value })}
            />
          </div>

          <input
            placeholder="CCTV code/location optional"
            value={sighting.cctvCode}
            onChange={e => setSighting({ ...sighting, cctvCode: e.target.value })}
          />

          <button className="primary">Save Sighting</button>
        </form>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this case?"
        message="This will permanently delete this missing person case, including its related report details and sightings. This action cannot be undone."
        confirmText="Delete Case"
        danger
        onCancel={() => setDeleteOpen(false)}
        onConfirm={remove}
      />
    </div>
  );
}