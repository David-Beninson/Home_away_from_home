import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Menu,
  X,
  House,
  Search,
  FileText,
  ClipboardList,
  MessageSquare,
  LayoutDashboard,
  Users,
  Building,
  Inbox,
  User,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { logout } from '../../../store/authSlice';
import { fetchMyChats } from '../../../store/chatSlice';
import { Logo, LogOutIcon } from '../Icons';
import { getUserInitials } from '../../../utils/user';
import NotificationBell from "../NotificationBell/NotificationBell";
import './Navbar.css';
import { BRAND_TITLE, BRAND_SUBTITLE } from '../../../config/brand';

export default function Navbar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // States & Selectors
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const user = useSelector((state) => state.auth.user);
  const userRole = user?.user_type || null;
  const userName = user?.full_name || '';

  const badgeCount = useSelector((state) => state.requests.badgeCount);
  const unreadChatsCount = useSelector((state) => state.chat.unreadTotalCount);

  useEffect(() => {
    if (user) {
      dispatch(fetchMyChats());
    }
  }, [user, dispatch]);

  const linksConfig = [
    { path: '/', label: 'בית', roles: ['guest', 'host'], icon: <House className="nav-icon" /> },
    { path: '/find-host', label: 'מצא מארח', roles: ['guest'], icon: <Search className="nav-icon" /> },
    { path: '/my-requests', label: 'הבקשות שלי', roles: ['guest'], hasBadge: true, icon: <FileText className="nav-icon" /> },
    { path: '/requests-board', label: 'לוח בקשות', roles: ['host'], hasBadge: true, icon: <ClipboardList className="nav-icon" /> },
    { path: '/chats', label: 'צ׳אטים', roles: ['guest', 'host'], hasChatBadge: true, icon: <MessageSquare className="nav-icon" /> },
    { path: '/admin', end: true, label: 'לוח בקרה', roles: ['admin'], hasBadge: true, icon: <LayoutDashboard className="nav-icon" /> },
    { path: '/admin/users', label: 'ניהול משתמשים', roles: ['admin'], icon: <Users className="nav-icon" /> },
    { path: '/admin/verifications', label: 'אימותים וסינון', roles: ['admin'], icon: <ShieldCheck className="nav-icon" /> },
    { path: '/admin/listings', label: 'דירות ומארחים', roles: ['admin'], icon: <Building className="nav-icon" /> },
    { path: '/admin/bookings', label: 'בקשות', roles: ['admin'], icon: <Inbox className="nav-icon" /> },
    { path: '/admin/alerts', label: 'התראות', roles: ['admin'], icon: <AlertTriangle className="nav-icon" /> },
    { path: '/profile', label: 'פרופיל', roles: ['guest', 'host'], icon: <User className="nav-icon" /> }
  ];

  const allowedLinks = linksConfig.filter(link => link.roles.includes(userRole));

  function roots() {
    return allowedLinks.map((link) => (
      <li key={link.path}>
        <NavLink
          to={link.path}
          end={link.end}
          onClick={() => setIsMobileMenuOpen(false)}
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          {link.icon}
          <span>{link.label}</span>
          {link.hasBadge && badgeCount > 0 && <span className="requests-badge">{badgeCount}</span>}
          {link.hasChatBadge && unreadChatsCount > 0 && <span className="requests-badge bg-primary text-white">{unreadChatsCount}</span>}
        </NavLink>
      </li>
    ));
  }

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    dispatch(logout());
    navigate('/login');
  };

  const getInitials = () => getUserInitials(user);

  const firstName = userName ? userName.split(' ')[0] : '';

  return (
    <nav className="navbar">
      <div className="navbar-right">
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-expanded={isMobileMenuOpen}
          aria-label="תפריט ניווט"
        >
          <Menu size={24} />
        </button>
        <div 
          className="brand-container"
          onClick={() => navigate('/')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/'); }}
          role="button"
          tabIndex={0}
          aria-label="העבר לדף הבית"
        >
          <div className="logo-icon-container">
            <Logo size={32} className="logo-icon" />
          </div>
          <div className="logo-text">
            <span className="logo-title">{BRAND_TITLE}</span>
            <span className="logo-subtitle">{BRAND_SUBTITLE}</span>
          </div>
        </div>
      </div>

      <div className={`navbar-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>
      <div className={`navbar-links-container ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <div className="logo-text">
            <span className="logo-title">{BRAND_TITLE}</span>
          </div>
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <ul className="navbar-links">
          {roots()}
        </ul>
      </div>

      <div className="navbar-left">
        <NotificationBell />
        <div className="profile-dropdown-container" ref={dropdownRef}>
          <div
            className="profile-circle"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {getInitials()}
          </div>

          {isDropdownOpen && (
            <div className="profile-dropdown-menu">
              <div className="dropdown-header">
                <div className="dropdown-large-initial">{getInitials()}</div>
                <span>שלום {firstName}!</span>
              </div>

              <div className="dropdown-divider"></div>

              <button className="dropdown-item" onClick={() => { setIsDropdownOpen(false); navigate('/profile'); }}>
                <User className="dropdown-icon" /> הפרופיל שלי
              </button>

              <button className="dropdown-item" onClick={() => setIsDark(!isDark)}>
                {isDark ? '☀️' : '🌙'}
                <span className="dropdown-text-space">
                  {isDark ? 'מצב בהיר' : 'מצב כהה'}
                </span>
              </button>

              <div className="dropdown-divider"></div>

              <button className="dropdown-item logout-item" onClick={handleLogout}>
                <LogOutIcon className="dropdown-icon" />
                התנתקות
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}