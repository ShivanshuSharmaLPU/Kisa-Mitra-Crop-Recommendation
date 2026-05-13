import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';

const COLOR_MAP = {
  green:  'from-green-900/50 to-emerald-900/30 border-green-500/20',
  blue:   'from-blue-900/50 to-cyan-900/30 border-blue-500/20',
  brown:  'from-amber-900/50 to-yellow-900/30 border-amber-500/20',
  orange: 'from-orange-900/50 to-red-900/30 border-orange-500/20',
  cyan:   'from-cyan-900/50 to-sky-900/30 border-cyan-500/20',
  purple: 'from-purple-900/50 to-violet-900/30 border-purple-500/20',
};

export default function GovSchemes() {
  const [schemes, setSchemes] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => { api.get('/schemes').then(r => setSchemes(r.schemes || [])); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-gradient-green">🏛️ Government Schemes</h1>
        <p className="text-white/40 text-sm mt-1">Benefits you're entitled to as a small/marginal farmer in India</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schemes.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.08 }}
            className={`scheme-card bg-gradient-to-br ${COLOR_MAP[s.color] || COLOR_MAP.green} cursor-pointer`}
            onClick={() => setSelected(selected?.id===s.id ? null : s)}>
            <div className="text-3xl flex-shrink-0">{s.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-white text-sm">{s.name}</div>
                  <div className="text-xs text-white/40 mt-0.5">{s.category}</div>
                </div>
                <div className="text-xs font-bold text-green-400 bg-green-900/50 border border-green-500/20 px-2 py-1 rounded-lg whitespace-nowrap flex-shrink-0">{s.amount}</div>
              </div>
              <div className="text-white/50 text-xs mt-2 leading-relaxed">{s.description}</div>

              {selected?.id === s.id && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} className="mt-3 space-y-2">
                  <div className="glass rounded-lg p-3 text-xs">
                    <div className="font-semibold text-white/60 mb-1">✅ Eligibility</div>
                    <div className="text-white/40">{s.eligibility}</div>
                  </div>
                  <div className="glass rounded-lg p-3 text-xs">
                    <div className="font-semibold text-white/60 mb-1">📄 Required Documents</div>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {s.documents?.map(d => <span key={d} className="border border-white/10 text-white/40 px-2 py-0.5 rounded-full">{d}</span>)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={s.portal} target="_blank" rel="noreferrer" className="btn-primary text-xs py-2 flex-1 justify-center" onClick={e => e.stopPropagation()}>
                      🌐 Apply Online
                    </a>
                    {/* <div className="glass rounded-lg px-3 py-2 text-xs text-white/40 flex items-center">📞 {s.helpline}</div> */}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-green rounded-xl p-4 text-sm text-green-300/70">
        💡 <strong>Tip:</strong> Carry your Aadhaar Card and land records (Khasra/Khatauni) when visiting the Gram Panchayat or Agriculture Department office for scheme enrollment.
      </div>
    </div>
  );
}
