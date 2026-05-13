import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import { useApp } from '../context/AppContext';

const CATS = [['all','All'],['grain','Grains'],['oilseed','Oilseeds'],['vegetable','Vegetables'],['cash','Cash Crops']];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="glass rounded-lg p-3 text-xs border border-white/10 shadow-xl">
      <div className="font-semibold text-white mb-1">{d.commodity}</div>
      <div className="text-white/60">Modal: <span className="text-green-400 font-bold">₹{d.modal}</span></div>
      {d.msp && <div className="text-white/60">MSP: <span className="text-amber-400">₹{d.msp}</span></div>}
    </div>
  );
};

export default function MarketPrices() {
  const { farmer } = useApp();
  const [data, setData] = useState(null);
  const [cat, setCat] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Only use what the farmer has registered — no hardcoded defaults
  const farmerDistrict = farmer?.district || '';
  const farmerState    = farmer?.state    || '';

  const hasLocation = farmerDistrict && farmerState;

  useEffect(() => {
    if (!hasLocation) {
      setLoading(false);
      setError('Please complete your profile with district and state to see local mandi prices.');
      return;
    }

    setLoading(true);
    setError(null);

    api.get(`/market?category=${cat}&district=${encodeURIComponent(farmerDistrict)}&state=${encodeURIComponent(farmerState)}`)
      .then(res => {
        setData(res);
        setError(null);
      })
      .catch(err => setError(err?.message || 'Failed to load prices.'))
      .finally(() => setLoading(false));
  }, [cat, farmerDistrict, farmerState, hasLocation]);

  const chartData = data?.prices?.slice(0, 8).map(p => ({
    name:  p.commodity.split(' ')[0],
    modal: p.modal,
    msp:   p.msp || undefined,
  }));

  const mandiDisplay = data?.mandi || (hasLocation ? `${farmerDistrict} Agricultural Produce Market Committee` : '');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-gradient-green">📊 Market Prices</h1>
          {mandiDisplay && (
            <p className="text-white/40 text-sm mt-1">
              Live mandi rates · <span className="text-green-400/70">{mandiDisplay}</span>
            </p>
          )}
          {farmer && hasLocation && (
            <p className="text-white/25 text-xs mt-0.5">
              📍 Showing prices for your registered location: {farmerDistrict}, {farmerState}
            </p>
          )}
        </div>
      </div>

      {/* No location registered */}
      {!hasLocation && (
        <div className="card-gradient rounded-2xl p-6 text-center border border-amber-500/20">
          <p className="text-amber-300 text-sm">⚠️ {error || 'Update your profile with district and state to see local mandi prices.'}</p>
        </div>
      )}

      {/* Error state */}
      {error && hasLocation && (
        <div className="card-gradient rounded-2xl p-6 text-center border border-red-500/20">
          <p className="text-red-300 text-sm">❌ {error}</p>
        </div>
      )}

      {hasLocation && !error && (
        <>
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {CATS.map(([v, l]) => (
              <button key={v} onClick={() => setCat(v)}
                className={`text-xs px-4 py-1.5 rounded-full border transition-all font-medium
                  ${cat === v ? 'bg-green-600 border-green-500 text-white' : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Bar chart */}
          {chartData && (
            <div className="card-gradient rounded-2xl p-5">
              <h2 className="font-semibold text-white/60 text-sm mb-4">Price Overview (₹/Quintal)</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                    <XAxis dataKey="name" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'rgba(255,255,255,0.3)', fontSize:10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill:'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="modal" fill="url(#greenGrad)" radius={[4,4,0,0]} />
                    <Bar dataKey="msp"   fill="rgba(251,191,36,0.4)" radius={[4,4,0,0]} />
                    <defs>
                      <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#15803d" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 text-xs text-white/30 mt-1">
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-green-500 inline-block" /> Modal Price</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-amber-400/40 inline-block" /> MSP</span>
              </div>
            </div>
          )}

          {/* Price Table */}
          <div className="card-gradient rounded-2xl overflow-hidden">
            <table className="price-table w-full">
              <thead>
                <tr>
                  <th>Commodity</th>
                  <th>Modal Price</th>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Change</th>
                  <th>MSP 2024-25</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-white/30">Loading prices for {farmerDistrict}...</td></tr>
                ) : data?.prices?.map((p, i) => (
                  <motion.tr key={p.commodity} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.04 }}>
                    <td><span className="font-medium text-white">{p.commodity}</span></td>
                    <td><span className="font-mono font-bold text-white">₹{p.modal}</span></td>
                    <td className="text-white/50 font-mono">₹{p.min}</td>
                    <td className="text-white/50 font-mono">₹{p.max}</td>
                    <td>
                      <span className={`font-mono font-semibold ${p.trend==='up'?'text-green-400':p.trend==='down'?'text-red-400':'text-white/40'}`}>
                        {p.trend==='up'?'▲':p.trend==='down'?'▼':'—'} ₹{Math.abs(p.change)}
                      </span>
                    </td>
                    <td>
                      {p.msp ? (
                        <span className={`font-mono text-xs px-2 py-0.5 rounded ${p.modal >= p.msp ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                          ₹{p.msp}
                        </span>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Insights */}
          <div className="grid sm:grid-cols-3 gap-3">
            {data?.insights?.map((ins, i) => (
              <div key={i} className={`rounded-xl p-4 border text-sm
                ${ins.type==='success'?'glass-green border-green-500/20 text-green-300':ins.type==='warning'?'glass-gold border-amber-500/20 text-amber-300':'border-sky-500/20 bg-sky-900/20 text-sky-300'}`}>
                <span>{ins.type==='success'?'📈':ins.type==='warning'?'⚠️':'💡'}</span> {ins.text}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}