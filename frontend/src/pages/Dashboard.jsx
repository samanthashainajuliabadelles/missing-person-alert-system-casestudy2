import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Clock,
  FileText,
  MapPin,
  PieChart,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import api from '../services/api.js';

const CHART_COLORS = [
  '#1f5c92',
  '#38bdf8',
  '#14b8a6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#64748b',
  '#22c55e'
];

function DonutChart({ title, subtitle, data, icon: Icon }) {
  const [tooltip, setTooltip] = useState(null);

  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);

  const segments = useMemo(() => {
    if (!total) return [];

    let current = 0;

    return data.map((item, index) => {
      const value = Number(item.value || 0);
      const percent = value / total;
      const start = current;
      const end = current + percent;
      current = end;

      return {
        ...item,
        value,
        percent,
        percentText: `${Math.round(percent * 100)}%`,
        color: CHART_COLORS[index % CHART_COLORS.length],
        dashArray: `${percent * 100} ${100 - percent * 100}`,
        dashOffset: 25 - start * 100
      };
    });
  }, [data, total]);

  const showTooltip = (event, item) => {
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      label: item.label || 'Unknown',
      value: item.value,
      percentText: item.percentText,
      color: item.color
    });
  };

  const moveTooltip = event => {
    setTooltip(prev =>
      prev
        ? {
            ...prev,
            x: event.clientX,
            y: event.clientY
          }
        : null
    );
  };

  const hideTooltip = () => {
    setTooltip(null);
  };

  return (
    <div className="panel dashboard-chart-card fade-in-up">
      <div className="dashboard-chart-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>

        <div className="dashboard-chart-icon">
          {Icon ? <Icon size={22} /> : <PieChart size={22} />}
        </div>
      </div>

      {total === 0 ? (
        <div className="empty-donut-state">
          <PieChart size={34} />
          <p>No data yet.</p>
        </div>
      ) : (
        <div className="donut-layout">
          <div className="donut-wrap">
            <svg viewBox="0 0 42 42" className="donut-svg">
              <circle className="donut-bg" cx="21" cy="21" r="15.915" />

              {segments.map((segment, index) => (
                <circle
                  key={`${segment.label}-${index}`}
                  className="donut-segment donut-segment-hoverable"
                  cx="21"
                  cy="21"
                  r="15.915"
                  stroke={segment.color}
                  strokeDasharray={segment.dashArray}
                  strokeDashoffset={segment.dashOffset}
                  onMouseEnter={event => showTooltip(event, segment)}
                  onMouseMove={moveTooltip}
                  onMouseLeave={hideTooltip}
                />
              ))}
            </svg>

            <div className="donut-center">
              <b>{total}</b>
              <span>Total</span>
            </div>
          </div>

          <div className="donut-legend">
            {segments.map((item, index) => (
              <div
                className="donut-legend-item"
                key={`${item.label}-${index}`}
                onMouseEnter={event => showTooltip(event, item)}
                onMouseMove={moveTooltip}
                onMouseLeave={hideTooltip}
              >
                <div>
                  <i style={{ background: item.color }} />
                  <span>{item.label || 'Unknown'}</span>
                </div>

                <strong>
                  {item.value}
                  <small>{item.percentText}</small>
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {tooltip && (
        <div
          className="donut-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y
          }}
        >
          <div>
            <i style={{ background: tooltip.color }} />
            <b>{tooltip.label}</b>
          </div>

          <span>
            {tooltip.value} case{tooltip.value === 1 ? '' : 's'} •{' '}
            {tooltip.percentText}
          </span>
        </div>
      )}
    </div>
  );
}

function DashboardStat({ label, value, icon: Icon }) {
  return (
    <div className="stat modern-dashboard-stat">
      <div className="dashboard-stat-icon">
        <Icon size={22} />
      </div>

      <div>
        <span>{label}</span>
        <b>{value || 0}</b>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(res => {
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
    <div className="modern-dashboard-page">
      <div className="modern-page-hero dashboard-hero">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Public Safety Dashboard</h2>
          <p>
            Monitor missing person reports, urgent cases, sightings, and case
            distribution based on your current access.
          </p>
        </div>

        <Link className="primary small modern-primary-action" to="/cases/new">
          Create Report
        </Link>
      </div>

      <div className="dashboard-scope-note modern-dashboard-scope fade-in-up">
        <ShieldCheck size={20} />

        <div>
          <b>{scopeLabel}</b>
          <small>
            Current access: {scope.role || 'Unknown role'} /{' '}
            {scope.assignment || 'No assignment saved'}
          </small>
        </div>
      </div>

      <div className="stats dashboard-stat-grid">
        <DashboardStat
          label="Total Cases"
          value={data.totals.total}
          icon={FileText}
        />

        <DashboardStat
          label="Active Cases"
          value={data.totals.active}
          icon={AlertTriangle}
        />

        <DashboardStat
          label="Sightings"
          value={data.totals.sightings}
          icon={MapPin}
        />
      </div>

      <div className="grid-2 dashboard-chart-grid">
        <DonutChart
          title="Cases by Barangay"
          subtitle="Distribution based on your current access scope."
          data={data.byBarangay || []}
          icon={MapPin}
        />

        <DonutChart
          title="Cases by Urgency"
          subtitle="Critical, high, medium, and low case distribution."
          data={data.byUrgency || []}
          icon={TrendingUp}
        />
      </div>

      <div className="grid-2 dashboard-lower-grid">
        <div className="panel dashboard-list-panel fade-in-up">
          <div className="section-title-row">
            <div>
              <h3>Urgent Active Cases</h3>
              <p className="muted">Critical and high-priority active cases.</p>
            </div>

            <div className="dashboard-chart-icon">
              <BarChart3 size={22} />
            </div>
          </div>

          <div className="list dashboard-list">
            {(data.urgentCases || []).length === 0 && (
              <p className="muted">No urgent active cases for this scope.</p>
            )}

            {(data.urgentCases || []).map(c => (
              <Link key={c.id} className="list-item dashboard-list-item" to={`/cases/${c.id}`}>
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

        <div className="panel dashboard-list-panel fade-in-up">
          <div className="section-title-row">
            <div>
              <h3>Recent Sightings</h3>
              <p className="muted">Latest sighting reports connected to cases.</p>
            </div>

            <div className="dashboard-chart-icon">
              <Clock size={22} />
            </div>
          </div>

          <div className="list dashboard-list">
            {(data.recentSightings || []).length === 0 && (
              <p className="muted">No recent sightings for this scope.</p>
            )}

            {(data.recentSightings || []).map((s, i) => (
              <div className="list-item dashboard-list-item" key={i}>
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