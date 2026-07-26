import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardStats } from '../../../store/statsSlice';
import useHostSearch from '../../../hooks/useHostSearch';
import { getShabbatInfo } from '../../../utils/shabbat';

import HomeGuestHero from '../../../components/HomeGuest/HomeGuestHero';
import HomeGuestStats from '../../../components/HomeGuest/HomeGuestStats';
import HomeGuestAiAgent from '../../../components/HomeGuest/HomeGuestAiAgent';
import HomeGuestFeaturedHosts from '../../../components/HomeGuest/HomeGuestFeaturedHosts';

import './HomeGuest.css';

export default function HomeGuest() {
  const dispatch = useDispatch();

  // 1. Fetch dashboard stats from Redux
  const { data: stats, status } = useSelector((state) => state.stats);

  // 2. Personal requests count from Redux
  const myPendingRequests = useSelector((state) => state.requests?.badgeCount || 0);

  // 3. Dynamic Shabbat candle lighting & Hebrew date info
  const [shabbatInfo, setShabbatInfo] = useState(null);

  // 4. Fetch hosts dynamically from backend via useHostSearch hook (returns hosts sorted by AI match)
  const { hosts, loading: hostsLoading } = useHostSearch();

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchDashboardStats());
    }
  }, [status, dispatch]);

  useEffect(() => {
    async function loadShabbatTimes() {
      try {
        const info = await getShabbatInfo('ירושלים');
        setShabbatInfo(info);
      } catch (err) {
        console.error('Failed to load Shabbat info:', err);
      }
    }
    loadShabbatTimes();
  }, []);

  return (
    <div className="guest-home-container">
      {/* Dynamic Hero Section */}
      <HomeGuestHero 
        shabbatInfo={shabbatInfo} 
        availableHostsCount={stats?.availableHosts} 
      />

      {/* Dynamic Redux Dashboard Stats */}
      <HomeGuestStats 
        stats={stats} 
        status={status} 
        myPendingRequests={myPendingRequests} 
      />

      {/* AI Assistant Section */}
      <HomeGuestAiAgent />

      {/* Dynamic Top 4 Featured Hosts */}
      <HomeGuestFeaturedHosts 
        hosts={hosts} 
        loading={hostsLoading} 
      />

      {/* How It Works Section */}
      <section className="gh-how-it-works">
        <h3>איך זה עובד?</h3>
        <div className="gh-steps-container">
          <div className="gh-step">
            <div className="gh-step-number">01</div>
            <h4>חפש מארח</h4>
            <p>AI מחשב ציון התאמה לכל מארח לפי הפרופיל שלך.</p>
          </div>
          <div className="gh-step">
            <div className="gh-step-number">02</div>
            <h4>שלח בקשה</h4>
            <p>בחר מארח או פרסם בקשה בלוח ותן למארחים לבוא אליך.</p>
          </div>
          <div className="gh-step">
            <div className="gh-step-number">03</div>
            <h4>קבל שיבוץ</h4>
            <p>קישור WhatsApp + שאלות chat-i icebreaker פנימי.</p>
          </div>
        </div>
      </section>
    </div>
  );
}