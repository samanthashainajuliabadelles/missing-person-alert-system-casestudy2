import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api.js';
import { ILIGAN_BARANGAYS, ILIGAN_CITY, ILIGAN_PROVINCE } from '../data/iliganBarangays.js';
import { ILIGAN_POLICE_STATIONS } from '../data/iliganPoliceStations.js';
import { useToast } from '../components/ToastProvider.jsx';

const API_BASE_URL = 'http://localhost:5000';

const empty = {
  firstName: '',
  lastName: '',
  age: '',
  gender: '',
  description: '',
  clothing: '',
  photoUrl: '',
  lastSeenDate: '',
  status: 'Active',
  urgencyLevel: 'High',

  guardianName: '',
  guardianContact: '',
  guardianAddress: '',

  locationName: '',
  locationAddress: '',
  lat: '',
  lng: '',

  barangayName: '',
  city: ILIGAN_CITY,
  province: ILIGAN_PROVINCE,

  agencyName: 'Iligan City Police Office Headquarters',
  agencyType: 'Police',
  agencyContact: '0917-712-7411 / 0998-598-7004',

  narrative: ''
};

export default function CaseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  const editing = Boolean(id);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBarangayOfficial = user.role === 'Barangay Official';
  const isPoliceOfficer = user.role === 'Police Officer';

  useEffect(() => {
    const loadCase = async () => {
      if (!editing) return;

      try {
        setLoading(true);

        const { data } = await api.get(`/cases/${id}`);

        setForm({
          ...empty,
          ...data,

          guardianName: data.guardian?.name || '',
          guardianContact: data.guardian?.contact || '',
          guardianAddress: data.guardian?.address || '',

          locationName: data.location?.name || '',
          locationAddress: data.location?.address || '',
          lat: data.location?.lat || '',
          lng: data.location?.lng || '',

          barangayName: data.barangay?.name || '',
          city: data.barangay?.city || ILIGAN_CITY,
          province: data.barangay?.province || ILIGAN_PROVINCE,

          agencyName: data.agency?.name || '',
          agencyType: data.agency?.type || '',
          agencyContact: data.agency?.contact || '',

          narrative: data.report?.narrative || ''
        });
      } catch (err) {
        notify(err.response?.data?.message || 'Unable to load case information.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadCase();
  }, [id, editing, notify]);

  const set = (key, value) => {
    setForm(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getSuggestedUrgency = () => {
    const age = Number(form.age || 0);
    const text = `${form.description} ${form.clothing} ${form.narrative}`.toLowerCase();

    let score = 0;

    if (age && age < 12) score += 3;
    if (age >= 60) score += 2;

    if (
      text.includes('pwd') ||
      text.includes('medical') ||
      text.includes('medicine') ||
      text.includes('mental') ||
      text.includes('autism')
    ) {
      score += 3;
    }

    if (
      text.includes('night') ||
      text.includes('midnight') ||
      text.includes('evening')
    ) {
      score += 1;
    }

    if (score >= 5) return 'Critical';
    if (score >= 3) return 'High';
    if (score >= 1) return 'Medium';

    return 'Low';
  };

  const suggestedUrgency = getSuggestedUrgency();

  const applySuggestedUrgency = () => {
    set('urgencyLevel', suggestedUrgency);
    notify(`Urgency suggestion applied: ${suggestedUrgency}.`, 'success');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setPhotoFile(null);
      setPhotoPreview('');
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (!allowedTypes.includes(file.type)) {
      notify('Only image files are allowed. Please upload JPG, PNG, WEBP, or GIF.', 'error');
      e.target.value = '';
      setPhotoFile(null);
      setPhotoPreview('');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify('Photo is too large. Maximum size is 5MB.', 'error');
      e.target.value = '';
      setPhotoFile(null);
      setPhotoPreview('');
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const getPhotoSrc = () => {
    if (photoPreview) return photoPreview;

    if (form.photoUrl?.startsWith('/uploads')) {
      return `${API_BASE_URL}${form.photoUrl}`;
    }

    return form.photoUrl;
  };

    const handlePoliceStationChange = stationName => {
      const selectedStation = ILIGAN_POLICE_STATIONS.find(
        station => station.name === stationName
      );

      if (!selectedStation) return;

      setForm(prev => ({
        ...prev,
        agencyName: selectedStation.name,
        agencyType: selectedStation.type,
        agencyContact: selectedStation.contact
      }));
    };

      useEffect(() => {
        if (editing) return;

        if (isBarangayOfficial && user.assignment) {
          setForm(prev => ({
            ...prev,
            barangayName: user.assignment
          }));
        }

        if (isPoliceOfficer && user.assignment) {
          const assignedStation = ILIGAN_POLICE_STATIONS.find(
            station => station.name === user.assignment
          );

          setForm(prev => ({
            ...prev,
            agencyName: user.assignment,
            agencyType: user.assignmentType || assignedStation?.type || 'Police Station',
            agencyContact: assignedStation?.contact || prev.agencyContact
          }));
        }
      }, [editing, isBarangayOfficial, isPoliceOfficer, user.assignment, user.assignmentType]);

  const submit = async (e) => {
    e.preventDefault();

    try {
      const payload = new FormData();

      Object.entries({
        ...form,
        city: ILIGAN_CITY,
        province: ILIGAN_PROVINCE
      }).forEach(([key, value]) => {
        payload.append(key, value ?? '');
      });

      if (photoFile) {
        payload.append('photo', photoFile);
      }

      if (editing) {
        await api.put(`/cases/${id}`, payload, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await api.post('/cases', payload, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      notify(editing ? 'Case updated successfully.' : 'Missing person report created.', 'success');
      navigate('/cases');
    } catch (err) {
      notify(err.response?.data?.message || 'Unable to save case.', 'error');
    }
  };

  if (loading) {
    return <p className="muted">Loading case form...</p>;
  }

  return (
    <form className="form-page" onSubmit={submit}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Case Report</p>
          <h2>{editing ? 'Edit Missing Person' : 'Create Missing Person Report'}</h2>
        </div>

        <button className="primary small" type="submit">
          Save
        </button>
      </div>

      <section className="panel form-section">
        <h3>Missing Person Information</h3>

        <div className="form-grid two">
          <label className="field">
            <span>First Name</span>
            <input
              required
              placeholder="Enter first name"
              value={form.firstName}
              onChange={e => set('firstName', e.target.value)}
            />
          </label>

          <label className="field">
            <span>Last Name</span>
            <input
              required
              placeholder="Enter last name"
              value={form.lastName}
              onChange={e => set('lastName', e.target.value)}
            />
          </label>

          <label className="field">
            <span>Age</span>
            <input
              required
              type="number"
              placeholder="Enter age"
              value={form.age}
              onChange={e => set('age', e.target.value)}
            />
          </label>

          <label className="field">
            <span>Gender</span>
            <select
              required
              value={form.gender}
              onChange={e => set('gender', e.target.value)}
            >
              <option value="">Select gender</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </label>

          <label className="field">
            <span>Urgency Level</span>
            <select
              value={form.urgencyLevel}
              onChange={e => set('urgencyLevel', e.target.value)}
            >
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </label>

          <label className="field">
            <span>Case Status</span>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
            >
              <option>Active</option>
              <option>Found</option>
              <option>Closed</option>
            </select>
          </label>

          <label className="field">
            <span>Last Seen Date and Time</span>
            <input
              required
              placeholder="Example: 2026-05-17 19:10"
              value={form.lastSeenDate}
              onChange={e => set('lastSeenDate', e.target.value)}
            />
          </label>

          <label className="field">
            <span>Upload Photo</span>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handlePhotoChange}
            />
            <small className="field-help">
              Accepted formats: JPG, PNG, WEBP, or GIF. Maximum size: 5MB.
            </small>
          </label>
        </div>

        {(photoPreview || form.photoUrl) && (
          <div className="photo-preview-box">
            <span>Photo Preview</span>
            <img
              src={getPhotoSrc()}
              alt="Missing person preview"
            />
          </div>
        )}

        <div className="urgency-suggestion">
          <div>
            <b>Suggested urgency: {suggestedUrgency}</b>
            <p>
              Based on age and keywords like medical needs, PWD, night, medicine,
              or mental health support.
            </p>
          </div>

          <button
            type="button"
            onClick={applySuggestedUrgency}
          >
            Apply
          </button>
        </div>

        <label className="field full">
          <span>Physical Description</span>
          <textarea
            placeholder="Describe appearance, height, hair, distinguishing marks, or other important details"
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />
        </label>

        <label className="field full">
          <span>Clothing When Last Seen</span>
          <textarea
            placeholder="Example: Gray hoodie, black pants, sling bag"
            value={form.clothing}
            onChange={e => set('clothing', e.target.value)}
          />
        </label>
      </section>

      <section className="panel form-section">
        <h3>Guardian and Report</h3>

        {editing && (
          <p className="muted">
            Guardian and original report details are locked while editing to preserve the original report record.
          </p>
        )}

        <div className="form-grid two">
          <label className="field">
            <span>Guardian Name</span>
            <input
              placeholder="Enter guardian or reporter name"
              value={form.guardianName}
              onChange={e => set('guardianName', e.target.value)}
              disabled={editing}
            />
          </label>

          <label className="field">
            <span>Guardian Contact Number</span>
            <input
              placeholder="Enter contact number"
              value={form.guardianContact}
              onChange={e => set('guardianContact', e.target.value)}
              disabled={editing}
            />
          </label>

          <label className="field full">
            <span>Guardian Address</span>
            <input
              placeholder="Enter guardian address"
              value={form.guardianAddress}
              onChange={e => set('guardianAddress', e.target.value)}
              disabled={editing}
            />
          </label>
        </div>

        <label className="field full">
          <span>Report Narrative</span>
          <textarea
            placeholder="Write the initial report details or circumstances of the case"
            value={form.narrative}
            onChange={e => set('narrative', e.target.value)}
            disabled={editing}
          />
        </label>
      </section>

      <section className="panel form-section">
        <h3>Last Seen Location</h3>

        {editing && (
          <p className="muted">
            Last seen location details are locked while editing. Add new locations through sightings.
          </p>
        )}

        <div className="form-grid two">
          <label className="field">
            <span>Location Name</span>
            <input
              placeholder="Example: Palao Public Market"
              value={form.locationName}
              onChange={e => set('locationName', e.target.value)}
              disabled={editing}
            />
          </label>

          <label className="field">
            <span>Location Address</span>
            <input
              placeholder="Enter street, landmark, or nearby area"
              value={form.locationAddress}
              onChange={e => set('locationAddress', e.target.value)}
              disabled={editing}
            />
          </label>

          <label className="field">
            <span>Barangay</span>
            <select
              value={form.barangayName}
              onChange={e => set('barangayName', e.target.value)}
              disabled={editing || isBarangayOfficial}
              required
            >
              <option value="">Select Iligan barangay</option>
              {ILIGAN_BARANGAYS.map(brgy => (
                <option key={brgy} value={brgy}>
                  {brgy}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>City / Municipality</span>
            <input
              value={form.city || ILIGAN_CITY}
              disabled
            />
          </label>

          <label className="field">
            <span>Province</span>
            <input
              value={form.province || ILIGAN_PROVINCE}
              disabled
            />
          </label>

          <label className="field">
            <span>Latitude</span>
            <input
              placeholder="Optional"
              value={form.lat}
              onChange={e => set('lat', e.target.value)}
              disabled={editing}
            />
          </label>

          <label className="field">
            <span>Longitude</span>
            <input
              placeholder="Optional"
              value={form.lng}
              onChange={e => set('lng', e.target.value)}
              disabled={editing}
            />
          </label>
        </div>
      </section>

      <section className="panel form-section">
        <h3>Police Station / Handling Agency</h3>

        {editing && (
          <p className="muted">
            Police station details are locked while editing because they are connected to the original case report.
          </p>
        )}

        <div className="form-grid two">
          <label className="field">
            <span>Reported To</span>
            <select
              value={form.agencyName}
              onChange={e => handlePoliceStationChange(e.target.value)}
              disabled={editing || isPoliceOfficer}
              required
            >
              <option value="">Select police station</option>

              {ILIGAN_POLICE_STATIONS.map(station => (
                <option key={station.name} value={station.name}>
                  {station.area
                    ? `${station.shortName} - ${station.area}`
                    : station.shortName}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Agency Type</span>
            <input
              value={form.agencyType}
              disabled
            />
          </label>

          <label className="field full">
            <span>Police Station Hotline / Contact</span>
            <input
              value={form.agencyContact}
              disabled
            />
          </label>
        </div>
      </section>
          </form>
        );
}