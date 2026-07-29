import { useState, useEffect } from 'react';
import { listingsApi } from '../../api/api';
import PageContainer from '../Common/PageContainer/PageContainer';
import Table from '../Common/Table/Table';
import '../../pages/Admin/Admin.css';

import { HostDetailsModal } from '../HostDetails/HostDetailsModal';

export default function AdminListings() {
  const [hosts, setHosts] = useState([]);
  const [kashrutOptions, setKashrutOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedHost, setSelectedHost] = useState(null);
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [kashrutFilter, setKashrutFilter] = useState('all');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        // Fetch both hosts list and kashrut option translations in parallel
        const [hostsRes, kashrutRes] = await Promise.all([
          listingsApi.searchHosts(),
          listingsApi.getKashrutOptions()
        ]);
        setHosts(hostsRes.data);
        kashrutOptions && setKashrutOptions(kashrutRes.data);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('שגיאה בטעינת הנתונים מהשרת.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter Logic
  const filteredHosts = hosts.filter(host => {
    const hostName = host.host_name || host.user?.full_name || '';
    const matchesSearch = 
      hostName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      host.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      host.neighborhood?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesKashrut = kashrutFilter === 'all' || host.kashrut_level === kashrutFilter;

    return matchesSearch && matchesKashrut;
  });

  const getKashrutLabel = (val) => {
    const option = kashrutOptions.find(opt => opt.value === val);
    return option ? option.label : val;
  };

  return (
    <PageContainer loading={loading} error={error}>
      <div className="admin-page-header">
        <h2 className="admin-page-title">ניהול דירות ומארחים</h2>
        <p className="admin-page-subtitle font-secondary">צפייה וניהול של הגדרות האירוח ופרטי המארחים במערכת</p>
      </div>

      {/* Search and Filters Bar */}
      <div className="search-filter-bar">
        <input 
          type="text" 
          placeholder="חיפוש לפי שם מארח, עיר או שכונה..." 
          className="admin-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="admin-select"
          value={kashrutFilter}
          onChange={(e) => setKashrutFilter(e.target.value)}
        >
          <option value="all">כל רמות הכשרות</option>
          {kashrutOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Hosts Table */}
      <Table 
        headers={['שם המארח', 'עיר / שכונה', 'רמת כשרות', 'אוריינטציה דתית', 'חלונות זמינות', 'אירוח חירום', 'פרטי מארח']}
        dataLength={filteredHosts.length}
        fallbackText="לא נמצאו מארחים או דירות העונים לסינון הנוכחי."
      >
        {filteredHosts.map(host => (
          <tr key={host.id}>
            <td className="text-semibold">{host.host_name || host.user?.full_name || 'מארח ללא שם'}</td>
            <td>
              {host.city} {host.neighborhood ? `(${host.neighborhood})` : ''}
            </td>
            <td>
              <span className={`badge kashrut-${host.kashrut_level}`}>
                {getKashrutLabel(host.kashrut_level)}
              </span>
            </td>
            <td>{host.religious_orientation || '-'}</td>
            <td className="truncate-cell" title={host.availability_windows}>
              {host.availability_windows || 'לא צוין'}
            </td>
            <td>
              <span className={`badge ${host.emergency_available ? 'urgent' : 'active'}`}>
                {host.emergency_available ? 'זמין לחירום' : 'אירוח רגיל'}
              </span>
            </td>
            <td>
              <button
                onClick={() => setSelectedHost(host)}
                className="btn-action"
                style={{ fontSize: '0.85rem', padding: '4px 8px', borderRadius: '4px', background: '#f3f4f6', cursor: 'pointer' }}
              >
                👁️ כרטיס מארח
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {selectedHost && (
        <HostDetailsModal
          isOpen={Boolean(selectedHost)}
          onClose={() => setSelectedHost(null)}
          host={selectedHost}
        />
      )}
    </PageContainer>
  );
}

