import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useState, useEffect } from 'react';
import api from '../utils/api';

// Display label → lang code (must match AppContext map)
const LANGS = [
  { label: 'EN', code: 'en' },
  { label: 'हिं', code: 'hi' },
  { label: 'ਪੰ', code: 'pa' },
  { label: 'த', code: 'ta' },
  { label: 'తె', code: 'te' },
];

// Kisan Store label in all 5 languages
const STORE_LABEL = {
  en: 'Kisan Store',
  hi: 'किसान स्टोर',
  pa: 'ਕਿਸਾਨ ਸਟੋਰ',
  ta: 'கிசான் ஸ்டோர்',
  te: 'కిసాన్ స్టోర్',
};

export default function Layout() {
  const { farmer, lang, setLang, logout, tr } = useApp();
  const navigate = useNavigate();
  const [sideOpen, setSideOpen] = useState(false);

  // ── Navbar weather ticker state ──────────────────────────────────
  const [navWeather, setNavWeather] = useState(null);

  useEffect(() => {
    // Only fetch if farmer has a location set
    if (!farmer?.district) return;

    const params = new URLSearchParams({
      city: farmer.district,
      ...(farmer.state ? { state: farmer.state } : {}),
    });

    api.get(`/weather?${params}`)
      .then(data => {
        if (data?.current) {
          setNavWeather({
            temp: data.current.temp,
            icon: data.current.icon,
            condition: data.current.condition,
            alert: data.alerts?.[0]?.title || null,
          });
        }
      })
      .catch(() => {
        // Silently fail — ticker just won't show
      });
  // Re-fetch whenever the farmer's location changes
  }, [farmer?.district, farmer?.state]);

  // Nav items use tr() so labels switch instantly with language
  const NAV = [
    { path: '/',        icon: '🏠', labelKey: 'dashboard' },
    { path: '/crops',   icon: '🌱', labelKey: 'cropAdvisory' },
    { path: '/soil',    icon: '🪱', labelKey: 'soilHealth' },
    { path: '/pest',    icon: '🔍', labelKey: 'pestDetection', badge: 'AI' },
    { path: '/market',  icon: '📊', labelKey: 'marketPrices' },
    { path: '/weather', icon: '⛅', labelKey: 'weatherAlerts' },
    { path: '/chat',    icon: '💬', labelKey: 'aiChatbot' },
    { path: '/schemes', icon: '🏛️', labelKey: 'govtSchemes' },
    { path: '/feedback',icon: '📝', labelKey: 'feedback' },
  ];

  const storeLabel = STORE_LABEL[lang] || STORE_LABEL.en;

  return (
    <div className="bg-app min-h-screen flex flex-col">
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 glass border-b border-white/[0.06] px-4 h-14 flex items-center justify-between gap-3">

        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <button className="md:hidden text-2xl" onClick={() => setSideOpen(v => !v)}>☰</button>
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-4xl">🌾</span>
            <span className="font-display font-bold text-3xl text-gradient-green">KisanMitra</span>
          </div>
        </div>

        {/* Center: weather ticker — only shown when farmer location + weather are available */}
        {farmer?.district && (
          <div className="hidden lg:flex items-center gap-4 text-xm text-white/50 flex-1 justify-center">
            {/* Location */}
            <span>📍 {farmer.district}{farmer.state ? `, ${farmer.state}` : ''}</span>

            {/* Live weather — only rendered once fetched */}
            {navWeather && (
              <>
                <span className="h-3 w-px bg-white/10" />
                <span>
                  🌡️ {navWeather.temp}°C {navWeather.icon} {navWeather.condition}
                </span>
              </>
            )}

            {/* Active alert — only rendered if present */}
            {navWeather?.alert && (
              <>
                <span className="h-3 w-px bg-white/10" />
                <span className="text-amber-400 animate-pulse">⚠️ {navWeather.alert}</span>
              </>
            )}
          </div>
        )}

        {/* Right: Store button + lang + logout */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* ── 🛒 Kisan Store button — prominent in navbar ── */}
          {/* <NavLink
            to="/store"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isActive
                  ? 'text-amber-200 border-amber-400/50'
                  : 'text-amber-300 border-amber-500/30 hover:border-amber-400/50'
              }`
            }
            style={({ isActive }) => ({
              background: isActive
                ? 'linear-gradient(135deg,rgba(180,83,10,0.7) 0%,rgba(217,119,6,0.6) 100%)'
                : 'linear-gradient(135deg,rgba(146,64,14,0.45) 0%,rgba(180,83,10,0.35) 100%)',
              boxShadow: '0 2px 12px rgba(217,119,6,0.2)',
            })}
          >
            <span className="text-sm">🛒</span>
            <span className="hidden sm:inline">{storeLabel}</span>
          </NavLink> */}

          {/* Language switcher */}
          <div className="hidden sm:flex items-center gap-3">
            {LANGS.map(({ label, code }) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`text-sm px-4 py-1.5 rounded-full border-2 transition-all duration-300 ease-in-out
                  ${
                    lang === code
                      ? 'bg-green-600 border-green-500 text-white'
                      : 'border-white/30 text-white/40 hover:text-white hover:border-green-500'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>

          {farmer && (
            <button
              onClick={() => {
                logout();
                navigate('/auth');
              }}
              className="
                ml-2
                text-sm
                text-white/70
                hover:text-white
                border
                border-white/40
                hover:border-amber-400
                rounded-full
                px-4
                py-2
                transition-all
                duration-300
                sm:block
              "
            >
              Logout
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        {/* ── Sidebar ─────────────────────────────────────────────────── */}
     <aside className={`
  fixed md:sticky top-14 left-0 z-40
  h-[calc(100vh-56px)]
  w-56 glass border-r border-white/[0.06]
  p-3 flex flex-col gap-0.5
  overflow-y-auto

  /* 🔥 MOBILE ONLY FIX */
  pb-20 md:pb-3

  transition-transform duration-200
  ${sideOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
`}>

          {/* ── 🛒 Kisan Store — top of sidebar, eye-catching ── */}
          <NavLink
            to="/store"
            onClick={() => setSideOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-2 font-bold text-sm transition-all border ${
                isActive
                  ? 'text-amber-200 border-amber-400/50'
                  : 'text-amber-300 border-amber-500/25 hover:border-amber-400/40'
              }`
            }
            style={({ isActive }) => ({
              background: isActive
                ? 'linear-gradient(135deg,rgba(180,83,10,0.65) 0%,rgba(217,119,6,0.55) 100%)'
                : 'linear-gradient(135deg,rgba(146,64,14,0.4) 0%,rgba(180,83,10,0.3) 100%)',
            })}
          >
            <span className="text-xl">🛒</span>
            <span className="flex-1">{storeLabel}</span>
            <span className="text-[0.58rem] font-bold px-1.5 py-0.5 rounded"
              style={{ background:'rgba(245,158,11,0.25)', color:'#fcd34d', border:'1px solid rgba(245,158,11,0.3)' }}>
              NEW
            </span>
          </NavLink>

          {/* Divider */}
          <div className="h-px bg-white/[0.05] mb-2" />

          {/* Advisory group */}
          <div className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/25 px-2 pt-1 pb-1">
            {tr('advisory')}
          </div>
          {NAV.slice(0, 4).map(n => (
            <NavLink
              key={n.path}
              to={n.path}
              end={n.path === '/'}
              onClick={() => setSideOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="text-base w-5 text-center">{n.icon}</span>
              <span className="flex-1">{tr(n.labelKey)}</span>
              {n.badge && (
                <span className="text-[0.6rem] font-bold bg-green-600/70 text-green-100 px-1.5 py-0.5 rounded">
                  {n.badge}
                </span>
              )}
            </NavLink>
          ))}

          {/* Market & Weather group */}
          <div className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/25 px-2 pt-3 pb-1">
            {tr('marketWeather')}
          </div>
          {NAV.slice(4, 6).map(n => (
            <NavLink
              key={n.path}
              to={n.path}
              onClick={() => setSideOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="text-base w-5 text-center">{n.icon}</span>
              {tr(n.labelKey)}
            </NavLink>
          ))}

          {/* Support group */}
          <div className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/25 px-2 pt-3 pb-1">
            {tr('support')}
          </div>
          {NAV.slice(6).map(n => (
            <NavLink
              key={n.path}
              to={n.path}
              onClick={() => setSideOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="text-base w-5 text-center">{n.icon}</span>
              {tr(n.labelKey)}
            </NavLink>
          ))}

          {/* Mobile: lang switcher in sidebar */}
          <div className="sm:hidden pt-3 flex flex-wrap gap-1 px-1">
            {LANGS.map(({ label, code }) => (
              <button key={code} onClick={() => setLang(code)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                  lang === code ? 'bg-green-600 border-green-500 text-white' : 'border-white/10 text-white/40'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Farmer info at bottom */}
          <div className="mt-auto pt-4">
            {farmer ? (
              <div className="glass rounded-lg p-3 text-xs">
                <div className="font-semibold text-green-400">{farmer.name}</div>
                <div className="text-white/40 mt-0.5">{farmer.district}, {farmer.state}</div>
              </div>
            ) : (
              <button onClick={() => navigate('/auth')} className="w-full btn-ghost text-xs py-2">
                {tr('loginRegister')}
              </button>
            )}
          </div>
        </aside>

        {/* Mobile overlay */}
        {sideOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setSideOpen(false)}
          />
        )}

        {/* ── Main Content ─────────────────────────────────────────────── */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
