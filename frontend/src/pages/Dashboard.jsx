import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ShieldCheck } from 'lucide-react';
import api from '../services/api.js';

function BarList({ title, data }) {
  const max = Math.max(1, ...data.map(i => Number(i.value || 0)));

  return (
    <div className="panel fade-in-up">
      <h3>{title}</h3>

      <div className="bar-list">
        {data.length === 0 && <p className="muted">No data yet.</p>}

        {data.map(item => (
          <div key={item.label}>
            <div className="bar-row">
              <span>{item.label || 'Unknown'}</span>
              <b>{item.value}</b>
            </div>

            <div className="bar-track">
              <div style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(res => {
      console.log('Dashboard scope from backend:', res.data.scope);
      setData(res.data);
    });
  }, []);

  if (!data) return <p>Loading dashboard...</p>;

  const scope = data.scope || {};

  const scopeLabel = scope.isAdmin
    ? 'System-wide dashboard'
    : scope.role === 'Police Officer'
      ? `Showing cases reported to ${scope.assignment || 'your assigned station'}`
      : scope.role === 'Barangay Official'
        ? `Showing cases from ${scope.assignment || 'your assigned barangay'}`
        : 'Restricted dashboard';

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Public Safety Dashboard</h2>
        </div>

        <Link className="primary small" to="/cases/new">
          Create report
        </Link>
      </div>

      <div className="dashboard-scope-note fade-in-up">
        <ShieldCheck size={20} />

        <div>
          <b>{scopeLabel}</b>
          <small>
            Backend scope: {scope.role || 'Unknown role'} /{' '}
            {scope.assignment || 'No assignment saved'}
          </small>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span>Total Cases</span>
          <b>{data.totals.total || 0}</b>
        </div>

        <div className="stat">
          <span>Active Cases</span>
          <b>{data.totals.active || 0}</b>
        </div>

        <div className="stat">
          <span>Sightings</span>
          <b>{data.totals.sightings || 0}</b>
        </div>
      </div>

      <div className="grid-2">
        <BarList title="Cases by Barangay" data={data.byBarangay || []} />
        <BarList title="Cases by Urgency" data={data.byUrgency || []} />
      </div>

      <div className="grid-2">
        <div className="panel fade-in-up">
          <div className="section-title-row">
            <div>
              <h3>Urgent Active Cases</h3>
              <p className="muted">Critical and high-priority active cases.</p>
            </div>

            <BarChart3 size={22} />
          </div>

          <div className="list">
            {(data.urgentCases || []).length === 0 && (
              <p className="muted">No urgent active cases for this scope.</p>
            )}

            {(data.urgentCases || []).map(c => (
              <Link key={c.id} className="list-item" to={`/cases/${c.id}`}>
                <div>
                  <b>{c.name}</b>
                  <small>
                    {c.barangay || 'No barangay'} • Last seen:{' '}
                    {c.lastSeenDate || 'N/A'}
                  </small>
                </div>

                <span className={`tag ${c.urgency?.toLowerCase()}`}>
                  {c.urgency}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="panel fade-in-up">
          <h3>Recent Sightings</h3>

          <div className="list">
            {(data.recentSightings || []).length === 0 && (
              <p className="muted">No recent sightings for this scope.</p>
            )}

            {(data.recentSightings || []).map((s, i) => (
              <div className="list-item" key={i}>
                <div>
                  <b>{s.person}</b>
                  <small>
                    {s.description} • {s.barangay || 'Unknown'} • {s.dateTime}
                  </small>
                </div>

                <span className="tag">{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}