import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import farmerImg from '../assets/fm2.jpg';

const STATS = [
  { num:'86%', labelKey:'stat1', icon:'👨‍🌾' },
  { num:'+28%', labelKey:'stat2', icon:'📈' },
  { num:'5',  labelKey:'stat3', icon:'🗣️' },
  { num:'100+', labelKey:'stat4', icon:'🏪' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { tr } = useApp();

  const FEATURES = [
    { path:'/crops',   icon:'🌱', titleKey:'cropAdvisory',  descKey:'featCropDesc',    color:'from-green-900/50 to-emerald-900/30', border:'border-green-500/20' },
    { path:'/soil',    icon:'🪱', titleKey:'soilHealth',    descKey:'featSoilDesc',    color:'from-amber-900/40 to-yellow-900/20', border:'border-amber-500/20' },
    { path:'/pest',    icon:'🔍', titleKey:'pestDetection', descKey:'featPestDesc',    color:'from-red-900/40 to-rose-900/20',    border:'border-red-500/20',    badge:'AI' },
    { path:'/market',  icon:'📊', titleKey:'marketPrices',  descKey:'featMktDesc',     color:'from-blue-900/40 to-cyan-900/20',   border:'border-blue-500/20' },
    { path:'/weather', icon:'⛅', titleKey:'weatherAlerts', descKey:'featWeatherDesc', color:'from-sky-900/40 to-indigo-900/20',  border:'border-sky-500/20' },
    { path:'/chat',    icon:'💬', titleKey:'aiChatbot',     descKey:'featChatDesc',    color:'from-purple-900/40 to-violet-900/20',border:'border-purple-500/20' },
    { path:'/schemes', icon:'🏛️',titleKey:'govtSchemes',   descKey:'featSchemesDesc', color:'from-teal-900/40 to-green-900/20',  border:'border-teal-500/20' },
    { path:'/feedback',icon:'📝', titleKey:'feedback',      descKey:'featFeedbackDesc',color:'from-orange-900/40 to-amber-900/20',border:'border-orange-500/20' },
  ];

  return (
    <div className="space-y-8">
      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <div className="rounded-2xl p-8 relative overflow-hidden min-h-[220px]"
        style={{ background: 'linear-gradient(135deg, #0d1f0f 0%, #1a3a1c 50%, #0f2d1a 100%)' }}
      >
        {/* Background image — faded */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${farmerImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            opacity: 0.18,
          }}
        />
        {/* Left gradient overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #0d1f0ffa 0%, #0d1f0fe8 40%, #0d1f0f99 70%, #0d1f0f44 100%)' }}
        />
        {/* Right image panel — crisp */}
        <div className="absolute right-0 top-0 h-full w-1/2 pointer-events-none"
          style={{
            backgroundImage: `url(${farmerImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            opacity: 0.55,
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.85) 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.85) 100%)',
          }}
        />
        {/* Glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-green-500/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-emerald-500/8 blur-2xl" />
        </div>

        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.6 }} className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 glass-green rounded-full px-4 py-1.5 text-xs font-semibold text-green-400 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> {tr('heroTag')}
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black leading-tight mb-3">
            {tr('heroTitle1')}<br/>
            <span className="text-gradient-green">{tr('heroTitle2')}</span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-6 max-w-lg">{tr('heroDesc')}</p>
          <div className="flex gap-3 flex-wrap">
            <button className="btn-primary" onClick={() => navigate('/crops')}>{tr('getCropAdvisory')}</button>
            <button className="btn-ghost" onClick={() => navigate('/chat')}>{tr('talkToBot')}</button>
          </div>
        </motion.div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map((s, i) => (
          <motion.div key={s.labelKey} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
            transition={{ delay: i*0.08 }}
            className="card-gradient rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="font-mono text-2xl font-bold text-gradient-green">{s.num}</div>
            <div className="text-white/40 text-xs mt-1 leading-snug">{tr(s.labelKey)}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Kisan Store banner ───────────────────────────────────────── */}
      <motion.button
        initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
        whileHover={{ scale:1.015, boxShadow:'0 16px 48px rgba(217,119,6,0.2)' }}
        whileTap={{ scale:0.99 }}
        onClick={() => navigate('/store')}
        className="w-full rounded-2xl p-5 flex items-center gap-5 relative overflow-hidden text-left transition-all"
        style={{
          background: 'linear-gradient(135deg, rgba(92,32,5,0.7) 0%, rgba(120,53,15,0.6) 40%, rgba(146,64,14,0.5) 100%)',
          border: '1px solid rgba(245,158,11,0.3)',
        }}
      >
        {/* Glow */}
        <div className="absolute right-0 top-0 w-48 h-full pointer-events-none"
          style={{ background:'linear-gradient(to left,rgba(245,158,11,0.08),transparent)' }} />

        {/* Icon */}
        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
          style={{ background:'rgba(217,119,6,0.25)', border:'1px solid rgba(245,158,11,0.35)' }}>
          🛒
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-amber-300 text-lg">Kisan Store</span>
            <span className="text-[0.6rem] font-black px-2 py-0.5 rounded-full"
              style={{ background:'rgba(245,158,11,0.25)', color:'#fcd34d', border:'1px solid rgba(245,158,11,0.35)' }}>
              NEW
            </span>
          </div>
          <p className="text-amber-300/60 text-sm mt-0.5 leading-snug">
            Seeds · Fertilizers · Pesticides · Tools — delivered to your farm. Free shipping above ₹999.
          </p>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-amber-400/70 text-xs">🌾 Certified seeds</span>
            <span className="text-amber-400/70 text-xs">🧪 Quality fertilizers</span>
            <span className="text-amber-400/70 text-xs">⚙️ Farm tools</span>
          </div>
        </div>

        {/* Arrow */}
        <span className="text-amber-400/50 text-2xl flex-shrink-0 mr-2">→</span>
      </motion.button>

      {/* ── All Features grid ────────────────────────────────────────── */}
      <div>
        <h2 className="font-display text-xl font-bold text-white/80 mb-4">{tr('allFeatures')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map((f, i) => (
            <motion.button key={f.path}
              initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
              transition={{ delay: i*0.05 }}
              onClick={() => navigate(f.path)}
              className={`bg-gradient-to-br ${f.color} ${f.border} border rounded-xl p-5 text-left hover:scale-[1.02] hover:brightness-110 transition-all duration-200 relative`}
            >
              {f.badge && (
                <span className="absolute top-3 right-3 text-[0.6rem] font-bold bg-green-600 text-white px-1.5 py-0.5 rounded">
                  {f.badge}
                </span>
              )}
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-semibold text-white text-sm">{tr(f.titleKey)}</div>
              <div className="text-white/40 text-xs mt-1 leading-snug">{tr(f.descKey)}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Alert banner ─────────────────────────────────────────────── */}
      <div className="glass-gold rounded-xl p-4 flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <div className="font-semibold text-amber-400 text-sm">{tr('frostAdvisoryTitle')}</div>
          <div className="text-white/50 text-xs mt-0.5">{tr('frostAdvisoryDesc')}</div>
        </div>
      </div>
    </div>
  );
}