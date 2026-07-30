import { useState, useEffect } from 'react';
import { adminApi } from '../../api/api';
import { HomeIcon, UsersIcon, CheckCircleIcon, MyRequestsIcon } from '../Common/Icons';
import PageContainer from '../Common/PageContainer/PageContainer';
import { MetricCard } from './MetricCard';
import { useTranslation } from 'react-i18next';
import '../../pages/Admin/Admin.css';
import { useAdminAction } from '../../hooks/useAdminAction';

function DonutChart({ data, title, t }) {
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div className="classic-chart-card">
      <h3 className="classic-chart-title">{title}</h3>
      <div className="donut-chart-wrapper">
        <div className="donut-svg-container">
          <svg viewBox="0 0 100 100" className="donut-svg">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="var(--border-light, #e2e8f0)"
              strokeWidth="10"
            />
            {total > 0 &&
              data.map((item, idx) => {
                if (!item.value) return null;
                const percent = item.value / total;
                const strokeLength = percent * circumference;
                const strokeOffset = -cumulativePercent * circumference;
                cumulativePercent += percent;

                return (
                  <circle
                    key={idx}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth="10"
                    strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                    strokeDashoffset={strokeOffset}
                    transform="rotate(-90 50 50)"
                    className="donut-segment"
                  />
                );
              })}
            <text x="50" y="47" textAnchor="middle" className="donut-center-total">
              {total}
            </text>
            <text x="50" y="62" textAnchor="middle" className="donut-center-label">
              {t('admin/dashboard:total')}
            </text>
          </svg>
        </div>

        <div className="donut-legend">
          {data.map((item, idx) => {
            const pct = total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0;
            return (
              <div key={idx} className="legend-item">
                <span className="legend-color-dot" style={{ '--dot-color': item.color }} />
                <span className="legend-label">{item.label}</span>
                <span className="legend-value">{item.value || 0} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ColumnChart({ data, title, barColor = '#2563eb', emptyText }) {
  const hasData = data && data.length > 0;
  const maxVal = hasData ? Math.max(...data.map(d => d.count), 1) : 1;
  const yMax = Math.ceil(maxVal * 1.25) || 4;
  const gridTicks = [
    yMax,
    Math.round(yMax * 0.75),
    Math.round(yMax * 0.5),
    Math.round(yMax * 0.25),
    0
  ];

  return (
    <div className="admin-card classic-breakdown-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">{title}</h3>
      </div>

      {!hasData ? (
        <p className="empty-stats-text">{emptyText}</p>
      ) : (
        <div className="classic-column-chart-container">
          <div className="chart-y-axis">
            {gridTicks.map((tick, idx) => (
              <span key={idx} className="y-axis-tick">{tick}</span>
            ))}
          </div>

          <div className="chart-main-area">
            <div className="chart-grid-lines">
              <div className="grid-line" />
              <div className="grid-line" />
              <div className="grid-line" />
              <div className="grid-line" />
              <div className="grid-line baseline" />
            </div>

            <div className="chart-columns-flex">
              {data.map((item, idx) => {
                const label = item.city || item.level || item.label;
                const heightPct = yMax > 0 ? (item.count / yMax) * 100 : 0;
                return (
                  <div key={idx} className="chart-column-group">
                    <div className="chart-bar-wrapper">
                      {item.count > 0 && (
                        <span className="chart-bar-tooltip">{item.count}</span>
                      )}
                      <div
                        className="chart-bar-fill"
                        style={{
                          '--bar-height': `${heightPct}%`,
                          '--bar-color': item.count > 0 ? barColor : 'transparent',
                          '--bar-border': item.count > 0 ? `1px solid ${barColor}` : 'none'
                        }}
                      />
                    </div>
                    <span className="chart-x-label" title={label}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation(['admin/dashboard']);
  const [stats, setStats] = useState(null);
  const { loading, error, executeAction } = useAdminAction();

  useEffect(() => {
    executeAction(
      () => adminApi.getStats(),
      (res) => setStats(res.data),
      null,
      t('admin/dashboard:error_loading')
    );
  }, [executeAction, t]);

  // Prepare Donut Chart Datasets
  const userData = [
    { label: t('admin/dashboard:chart_labels.hosts'), value: stats?.total_hosts || 0, color: '#2563eb' },
    { label: t('admin/dashboard:chart_labels.guests'), value: Math.max(0, (stats?.total_guests || 0) - (stats?.total_soldiers || 0)), color: '#059669' },
    { label: t('admin/dashboard:chart_labels.soldiers'), value: stats?.total_soldiers || 0, color: '#d97706' },
  ];

  const postData = [
    { label: t('admin/dashboard:chart_labels.open_requests'), value: stats?.open_posts || 0, color: '#3b82f6' },
    { label: t('admin/dashboard:chart_labels.urgent_requests'), value: stats?.urgent_posts || 0, color: '#dc2626' },
    { label: t('admin/dashboard:chart_labels.matched_requests'), value: Math.max(0, (stats?.total_posts || 0) - (stats?.open_posts || 0)), color: '#10b981' },
  ];

  const matchData = [
    { label: t('admin/dashboard:chart_labels.active_matches'), value: stats?.active_matches || 0, color: '#059669' },
    { label: t('admin/dashboard:chart_labels.pending_matches'), value: stats?.pending_matches || 0, color: '#f59e0b' },
  ];

  const hostGuestRatio = stats?.total_hosts && stats?.total_hosts > 0 
    ? (stats.total_guests / stats.total_hosts).toFixed(1) 
    : 0;

  return (
    <PageContainer loading={loading} error={error}>
      <div className="admin-page-header">
        <h2 className="admin-page-title">{t('admin/dashboard:title')}</h2>
        <p className="admin-page-subtitle">{t('admin/dashboard:subtitle')}</p>
      </div>

      {/* Top Metric Cards */}
      <div className="admin-metrics-grid">
        <MetricCard title={t('admin/dashboard:metrics.registered_hosts')} value={stats?.total_hosts || 0} colorClass="blue" icon={HomeIcon} />
        <MetricCard title={t('admin/dashboard:metrics.registered_guests')} value={stats?.total_guests || 0} colorClass="purple" icon={UsersIcon} />
        <MetricCard title={t('admin/dashboard:metrics.soldiers')} value={stats?.total_soldiers || 0} colorClass="amber" icon={UsersIcon} />
        <MetricCard title={t('admin/dashboard:metrics.active_matches')} value={stats?.active_matches || 0} colorClass="green" icon={CheckCircleIcon} />
        <MetricCard title={t('admin/dashboard:metrics.match_rate')} value={`${stats?.match_rate_percentage || 0}%`} colorClass="teal" icon={CheckCircleIcon} />
        <MetricCard title={t('admin/dashboard:metrics.open_posts')} value={stats?.open_posts || 0} colorClass="orange" icon={MyRequestsIcon} />
        <MetricCard title={t('admin/dashboard:metrics.suspended_users')} value={stats?.total_suspended || 0} colorClass="amber" icon={UsersIcon} />
        <MetricCard title={t('admin/dashboard:metrics.banned_users')} value={stats?.total_banned || 0} colorClass="red" icon={UsersIcon} />
      </div>

      {/* Visual Donut Charts Grid */}
      <div className="classic-charts-grid">
        <DonutChart title={t('admin/dashboard:charts.users_distribution')} data={userData} t={t} />
        <DonutChart title={t('admin/dashboard:charts.requests_status')} data={postData} t={t} />
        <DonutChart title={t('admin/dashboard:charts.matches_status')} data={matchData} t={t} />
      </div>

      {/* Analytics & Detailed Breakdown Rows */}
      <div className="admin-dashboard-analytics-grid">
        {/* City Breakdown Widget */}
        <ColumnChart
          title={t('admin/dashboard:charts.top_cities')}
          data={stats?.cities_breakdown}
          barColor="#2563eb"
          emptyText={t('admin/dashboard:charts.empty_cities')}
        />

        {/* Kashrut Breakdown Widget */}
        <ColumnChart
          title={t('admin/dashboard:charts.kashrut_levels')}
          data={stats?.kashrut_breakdown}
          barColor="#059669"
          emptyText={t('admin/dashboard:charts.empty_kashrut')}
        />
      </div>
    </PageContainer>
  );
}
