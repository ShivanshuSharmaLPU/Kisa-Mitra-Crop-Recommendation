import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import toast from 'react-hot-toast';

const FEATURES = ['Crop Advisory', 'Soil Health', 'Pest Detection', 'Market Prices', 'Weather Alerts', 'AI Chatbot', 'Govt Schemes'];

export default function Feedback() {
  // 1. Changed feature: '' to features: []
  const [form, setForm] = useState({ rating: 0, features: [], comment: '', phone: '' });
  const [submitted, setSubmitted] = useState(false);
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.rating) { toast.error('Please select a rating'); return; }
    setLoading(true);
    try {
      await api.post('/feedback', form);
      setSubmitted(true);
      toast.success('Thank you for your feedback! 🙏');
    } catch {
      toast.error('Submission failed. Please try again.');
    } finally { setLoading(false); }
  };

  if (submitted) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring' }} className="text-6xl">🙏</motion.div>
      <h2 className="font-display text-2xl font-bold text-gradient-green">Thank You!</h2>
      <p className="text-white/40 text-center max-w-sm">Your feedback helps us improve advisory accuracy for millions of farmers across India.</p>
      <button className="btn-ghost mt-4" onClick={() => { setSubmitted(false); setForm({ rating:0, features:[], comment:'', phone:'' }); }}>Submit Another</button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-gradient-green">📝 Your Feedback</h1>
        <p className="text-white/40 text-sm mt-1">Help us improve KisanMitra for all farmers</p>
      </div>

      <div className="card-gradient rounded-2xl p-6 space-y-5">
        {/* Star Rating */}
        <div>
          <label className="text-sm font-medium text-white/70 mb-3 block">How helpful was today's advisory?</label>
          <div className="flex gap-3">
            {[1,2,3,4,5].map(n => (
              <button key={n} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                onClick={() => setForm(p => ({ ...p, rating: n }))}
                className={`text-3xl transition-all duration-100 ${n <= (hover || form.rating) ? 'scale-125 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'opacity-25'}`}>
                ⭐
              </button>
            ))}
          </div>
          {form.rating > 0 && (
            <div className="text-xs text-amber-400 mt-2">
              {['','Very Poor','Poor','Average','Good','Excellent! 🌟'][form.rating]}
            </div>
          )}
        </div>

        {/* Most useful feature - UPDATED FOR MULTIPLE SELECTION */}
        <div>
          <label className="text-sm font-medium text-white/70 mb-2 block">Most useful features?</label>
          <div className="flex flex-wrap gap-2">
            {FEATURES.map(f => (
              <button 
                key={f} 
                onClick={() => {
                  setForm(p => ({ 
                    ...p, 
                    // If feature exists, remove it. If not, add it to the array.
                    features: p.features.includes(f) 
                      ? p.features.filter(item => item !== f) 
                      : [...p.features, f] 
                  }));
                }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all
                  ${form.features.includes(f) ? 'bg-green-600 border-green-500 text-white' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="text-sm font-medium text-white/70 mb-2 block">Your suggestions / सुझाव</label>
          <textarea className="input-dark resize-none" rows={4} placeholder="Tell us how to improve KisanMitra..."
            value={form.comment} onChange={e => setForm(p => ({ ...p, comment: e.target.value }))} />
        </div>

        {/* Phone (optional) */}
        <div>
          <label className="text-sm font-medium text-white/70 mb-2 block">Phone (optional — for follow-up)</label>
          <input className="input-dark" placeholder="+91 XXXXX XXXXX" value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
        </div>

        <button className="btn-primary w-full" onClick={submit} disabled={loading}>
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" /> : '📤'}
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>

      {/* <div className="glass rounded-xl p-4 text-xs text-white/30 text-center">
        Your feedback is completely anonymous and helps improve AI accuracy for all farmers. No personal data is shared with third parties.
      </div> */}
    </div>
  );
}
