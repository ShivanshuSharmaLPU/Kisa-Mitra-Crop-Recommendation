import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useState, useEffect } from 'react';
import api from '../utils/api';

const LANGS = [
  { label: 'EN', code: 'en' },
  { label: 'हिं', code: 'hi' },
  { label: 'ਪੰ', code: 'pa' },
  { label: 'த', code: 'ta' },
  { label: 'తె', code: 'te' },
];

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

  const [navWeather, setNavWeather] = useState(null);

  useEffect(() => {
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
      .catch(() => {});
  }, [farmer?.district, farmer?.state]);

  const NAV = [
    { path: '/', icon: '🏠', labelKey: 'dashboard' },
    { path: '/crops', icon: '🌱', labelKey: 'cropAdvisory' },
    { path: '/soil', icon: '🪱', labelKey: 'soilHealth' },
    { path: '/pest', icon: '🔍', labelKey: 'pestDetection', badge: 'AI' },
    { path: '/market', icon: '📊', labelKey: 'marketPrices' },
    { path: '/weather', icon: '⛅', labelKey: 'weatherAlerts' },
    { path: '/chat', icon: '💬', labelKey: 'aiChatbot' },
    { path: '/schemes', icon: '🏛️', labelKey: 'govtSchemes' },
    { path: '/feedback', icon: '📝', labelKey: 'feedback' },
  ];

  const storeLabel = STORE_LABEL[lang] || STORE_LABEL.en;

  return (
    <div className="bg-app min-h-screen flex flex-col">

      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-50 glass border-b border-white/[0.06] px-4 h-14 flex items-center justify-between gap-3">

        <div className="flex items-center gap-4 flex-shrink-0">
          <button className="md:hidden text-2xl" onClick={() => setSideOpen(v => !v)}>☰</button>

          <div className="flex items-center gap-1 cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-4xl">🌾</span>
            <span className="font-display font-bold text-3xl text-gradient-green">
              KisanMitra
            </span>
          </div>
        </div>

        {farmer?.district && (
          <div className="hidden lg:flex items-center gap-4 text-xm text-white/50 flex-1 justify-center">
            <span>📍 {farmer.district}{farmer.state ? `, ${farmer.state}` : ''}</span>

            {navWeather && (
              <>
                <span className="h-3 w-px bg-white/10" />
                <span>🌡️ {navWeather.temp}°C {navWeather.icon} {navWeather.condition}</span>
              </>
            )}

            {navWeather?.alert && (
              <>
                <span className="h-3 w-px bg-white/10" />
                <span className="text-amber-400 animate-pulse">⚠️ {navWeather.alert}</span>
              </>
            )}
          </div>
        )}
      </header>

      <div className="flex flex-1">

        {/* ── Sidebar ── */}
        <aside className={`
          fixed md:sticky top-14 left-0 z-40
          h-[calc(100vh-56px)]
          w-56 glass border-r border-white/[0.06]
          p-3 flex flex-col gap-0.5
          overflow-y-auto
          pb-20 md:pb-3
          transition-transform duration-200
          ${sideOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>

          {/* Store */}
          <NavLink
            to="/store"
            onClick={() => setSideOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-2 font-bold text-sm transition-all border ${
                isActive
                  ? 'text-amber-200 border-amber-400/50'
                  : 'text-amber-300 border-amber-500/25'
              }`
            }
          >
            <span className="text-xl">🛒</span>
            <span className="flex-1">{storeLabel}</span>
            <span className="text-[0.58rem] font-bold px-1.5 py-0.5 rounded bg-amber-500/20">
              NEW
            </span>
          </NavLink>

          <div className="h-px bg-white/[0.05] mb-2" />

          {NAV.map(n => (
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
                <span className="text-[0.6rem] bg-green-600/70 px-1.5 py-0.5 rounded">
                  {n.badge}
                </span>
              )}
            </NavLink>
          ))}

          {/* Language */}
          <div className="sm:hidden pt-3 flex flex-wrap gap-1 px-1">
            {LANGS.map(({ label, code }) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  lang === code
                    ? 'bg-green-600 text-white'
                    : 'border-white/10 text-white/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── FIXED BOTTOM SECTION ── */}
          <div className="pt-4 border-t border-white/10 mt-4">
            {farmer ? (
              <div className="glass rounded-lg p-3 text-xs">
                <div className="font-semibold text-green-400">{farmer.name}</div>
                <div className="text-white/40 mt-0.5">
                  {farmer.district}, {farmer.state}
                </div>

                <button
                  onClick={() => {
                    logout();
                    navigate('/auth');
                  }}
                  className="mt-3 w-full text-xs py-1.5 rounded border border-white/20 hover:border-amber-400 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="w-full btn-ghost text-xs py-2"
              >
                {tr('loginRegister')}
              </button>
            )}
          </div>
        </aside>

        {/* Overlay */}
        {sideOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setSideOpen(false)}
          />
        )}

        {/* Main */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0">
          <Outlet />
        </main>

      </div>
    </div>
  );
}