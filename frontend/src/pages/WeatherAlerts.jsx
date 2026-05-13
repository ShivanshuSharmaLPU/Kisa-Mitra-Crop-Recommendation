import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { useApp } from '../context/AppContext';

const SEV = {
  warning: 'border-amber-500/30 bg-amber-900/20 text-amber-300',
  watch:   'border-sky-500/30 bg-sky-900/20 text-sky-300',
  advisory:'border-purple-500/30 bg-purple-900/20 text-purple-300',
};
const PRIO = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-white/40' };

export default function WeatherAlerts() {
  const { farmer, tr } = useApp();

  // Location state: only seed from logged-in farmer profile — no hardcoded fallback
  const [locationInput, setLocationInput] = useState(farmer?.district || '');
  const [activeLocation, setActiveLocation] = useState(farmer?.district || '');
  const [activeState, setActiveState] = useState(farmer?.state || '');

  // Auto-update when farmer profile loads asynchronously (token-based login)
  useEffect(() => {
    if (farmer?.district) {
      setLocationInput(farmer.district);
      setActiveLocation(farmer.district);
    }
    if (farmer?.state) {
      setActiveState(farmer.state);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmer?.district, farmer?.state]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // ── Fetch weather whenever location changes ──────────────────────
  const fetchWeather = useCallback(async () => {
    // Guard: do not fetch if no location is set
    if (!activeLocation) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ city: activeLocation, state: activeState });
      const result = await api.get(`/weather?${params}`);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load weather data');
    } finally {
      setLoading(false);
    }
  }, [activeLocation, activeState]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  // Auto-retry once on error after 4 seconds
  useEffect(() => {
    if (error && retryCount === 0) {
      const t = setTimeout(() => {
        setRetryCount(1);
        fetchWeather();
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [error, retryCount, fetchWeather]);

  const handleLocationUpdate = () => {
    const parts = locationInput.split(',').map(s => s.trim());
    setActiveLocation(parts[0] || '');
    if (parts[1]) setActiveState(parts[1]);
  };

  // ── No location set (user hasn't configured profile yet) ─────────
  if (!activeLocation && !loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-gradient-green">{tr('weatherTitle')}</h1>
        </div>
        <div className="card-gradient rounded-2xl p-10 text-center space-y-4">
          <div className="text-5xl">📍</div>
          <p className="text-white/70 font-semibold text-lg">No Location Set</p>
          <p className="text-white/35 text-sm max-w-xs mx-auto leading-relaxed">
            Please update your profile with your district and state to view weather data and farm advisories.
          </p>
          <div className="pt-2 flex gap-2 justify-center">
            <input
              className="input-dark text-sm py-1.5 w-52"
              placeholder="District, State (e.g. Anand, Gujarat)"
              value={locationInput}
              onChange={e => setLocationInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLocationUpdate()}
            />
            <button
              className="btn-primary text-xs px-3 py-1.5"
              onClick={handleLocationUpdate}
              disabled={!locationInput.trim()}
            >
              {tr('updateLocation') || 'Search'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ─────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-gradient-green">{tr('weatherTitle')}</h1>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="text-5xl animate-bounce">⛅</div>
            <p className="text-white/40 text-sm">{tr('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────
  if (error && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-gradient-green">{tr('weatherTitle')}</h1>
        </div>
        <div className="card-gradient rounded-2xl p-8 text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <p className="text-red-400 font-semibold">{tr('errorWeather')}</p>
          <p className="text-white/40 text-sm">{error}</p>
          <button
            className="btn-primary"
            onClick={() => { setRetryCount(0); fetchWeather(); }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + location bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold text-gradient-green">{tr('weatherTitle')}</h1>
          <p className="text-white/40 text-sm mt-1">
            📍 {data?.location || activeLocation} · {data?.source || tr('source')}
            {data?.error && <span className="text-amber-400 ml-2">(Demo data)</span>}
          </p>
        </div>

        {/* Location search */}
        <div className="flex gap-2 shrink-0">
          <input
            className="input-dark text-sm py-1.5 w-48"
            placeholder={tr('searchLocation') || 'District, State'}
            value={locationInput}
            onChange={e => setLocationInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLocationUpdate()}
          />
          <button
            className="btn-primary text-xs px-3 py-1.5"
            onClick={handleLocationUpdate}
            disabled={loading || !locationInput.trim()}
          >
            {loading ? '⏳' : tr('updateLocation')}
          </button>
        </div>
      </div>

      {/* Current weather */}
      {data?.current && (
        <motion.div
          key={data.location}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-900/80 to-blue-950/60 border border-sky-500/15 rounded-2xl p-6"
        >
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-6xl">{data.current.icon}</div>
            <div>
              <div className="font-mono text-5xl font-bold text-white">
                {data.current.temp}°<span className="text-2xl text-white/40">C</span>
              </div>
              <div className="text-white/50 mt-1">{data.current.condition}</div>
            </div>
            <div className="ml-auto flex gap-6 text-sm flex-wrap">
              {[
                [`💧 ${tr('humidity')}`,   `${data.current.humidity}%`],
                [`💨 ${tr('wind')}`,       `${data.current.wind} km/h`],
                [`👁️ ${tr('visibility')}`, `${data.current.visibility} km`],
                [`🌡️ ${tr('feelsLike')}`,  `${data.current.feelsLike}°C`],
              ].map(([k, v]) => (
                <div key={k} className="text-center">
                  <div className="text-white/30 text-xs">{k}</div>
                  <div className="font-mono font-bold text-white mt-0.5">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* 7-day forecast */}
      {data?.forecast?.length > 0 && (
        <div className="card-gradient rounded-2xl p-5">
          <h2 className="font-semibold text-white/60 text-sm mb-4">{tr('forecast7')}</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {data.forecast.map((d, i) => (
              <motion.div
                key={d.day}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`weather-day ${i === 0 ? 'today' : ''}`}
              >
                <div className="text-[0.65rem] font-semibold text-white/40">{d.day}</div>
                <div className="text-2xl my-1.5">{d.icon}</div>
                <div className="font-bold text-white text-sm">{d.high}°</div>
                <div className="text-white/30 text-xs">{d.low}°</div>
                <div className={`text-[0.65rem] mt-1 font-mono ${d.rain > 50 ? 'text-sky-400' : 'text-white/25'}`}>
                  {d.rain}%
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Active alerts */}
      {data?.alerts?.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-white/60 text-sm">{tr('activeAlerts')}</h2>
          {data.alerts.map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`border rounded-xl p-4 ${SEV[alert.severity] || SEV.advisory}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">
                  {alert.type === 'frost' ? '❄️' : alert.type === 'rain' ? '🌧️' : '💨'}
                </span>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{alert.title}</div>
                  <div className="text-xs opacity-80 mt-1 leading-relaxed">{alert.message}</div>
                  <div className="flex gap-1 flex-wrap mt-2">
                    {alert.crops?.map(c => (
                      <span key={c} className="text-[0.6rem] border border-current/30 px-2 py-0.5 rounded-full opacity-70">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Farm advisories */}
      {data?.farmAdvisories?.length > 0 && (
        <div className="card-gradient rounded-2xl p-5">
          <h2 className="font-semibold text-white/60 text-sm mb-4">{tr('farmCalendar')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.farmAdvisories.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.07 }}
                className="glass rounded-xl p-3 flex gap-3 items-start border-l-2"
                style={{
                  borderColor:
                    a.priority === 'high'   ? '#ef4444' :
                    a.priority === 'medium' ? '#f59e0b' :
                    'rgba(255,255,255,0.15)',
                }}
              >
                <span className="text-lg">{a.icon}</span>
                <div>
                  <div className={`text-[0.65rem] font-bold mb-0.5 ${PRIO[a.priority]}`}>
                    {a.date?.toUpperCase()}
                  </div>
                  <div className="text-white/60 text-xs leading-snug">{a.action}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}