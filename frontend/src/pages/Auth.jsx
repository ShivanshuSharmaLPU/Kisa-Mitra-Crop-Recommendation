import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { STATES, getCitiesForState } from '../utils/indiaCities';
import toast from 'react-hot-toast';

export default function Auth() {

  const [mode, setMode] = useState('login');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    state: '',
    district: '',
  });

  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationLoaded, setLocationLoaded] = useState(false);

  const { login, register, tr } = useApp();
  const navigate = useNavigate();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));


  // 🌍 Detect user location automatically
  const detectLocation = async () => {

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {

        const { latitude, longitude } = position.coords;

        try {

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );

          const data = await res.json();

          const state = data?.address?.state;

          const city =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.village ||
            data?.address?.county ||
            data?.address?.state_district;

          if (!state) return;

          const stateCities = getCitiesForState(state);

          setCities(stateCities);

          // fill district only if it exists in dropdown
          const matchedCity = stateCities.find(
            c => c.toLowerCase() === (city || '').toLowerCase()
          );

          setForm(p => ({
            ...p,
            state: state || '',
            district: matchedCity || ''
          }));

          setLocationLoaded(true);

        } catch (err) {
          console.log("Location detect error");
        }

      },
      () => {
        console.log("Location permission denied");
      }
    );
  };


  // 🚀 Auto detect when component loads
  useEffect(() => {
    detectLocation();
  }, []);


  // When state changes manually → update cities list
  useEffect(() => {

    if (!form.state) {
      setCities([]);
      return;
    }

    const stateCities = getCitiesForState(form.state);
    setCities(stateCities);

    // reset district ONLY if location was not auto-filled
    if (locationLoaded === false) {
      setForm(p => ({
        ...p,
        district: ''
      }));
    }

  }, [form.state]);


  const validate = () => {

    if (!form.phone.trim()) {
      toast.error('Phone number is required');
      return false;
    }

    if (!form.password.trim()) {
      toast.error('Password is required');
      return false;
    }

    if (mode === 'register') {

      if (!form.name.trim()) {
        toast.error('Full name is required');
        return false;
      }

      if (!form.state) {
        toast.error('Please select a state');
        return false;
      }

      if (!form.district) {
        toast.error('Please select a city/district');
        return false;
      }

    }

    return true;
  };


  const submit = async () => {

    if (!validate()) return;

    setLoading(true);

    try {

      if (mode === 'login')
        await login(form.phone, form.password);
      else
        await register(form);

      toast.success(
        mode === 'login'
          ? tr('welcomeBack')
          : tr('accountCreated')
      );

      navigate('/');

    } catch (e) {

      toast.error(e.message || tr('checkDetails'));

    } finally {

      setLoading(false);

    }
  };


  const selectClass =
    'w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50 focus:bg-white/[0.08] transition-all disabled:opacity-40 disabled:cursor-not-allowed';


  return (

    <div className="bg-app min-h-screen flex items-center justify-center p-4">

      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🌾</div>
          <h1 className="font-display text-3xl font-black text-gradient-green">KisanMitra</h1>
          <p className="text-white/40 text-sm mt-1">
            Smart Crop Advisory for Every Farmer
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-gradient rounded-2xl p-6"
        >

          {/* Mode toggle */}
          <div className="flex gap-1 mb-5 bg-white/[0.04] rounded-lg p-1">

            {['login', 'register'].map(m => (

              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-green-600 text-white'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {m === 'login' ? tr('login') : tr('register')}
              </button>

            ))}

          </div>


          <div className="space-y-3">

            {mode === 'register' && (
              <div>
                <label className="text-xs text-white/40 mb-1 block">
                  {tr('fullName')}
                </label>
                <input
                  className="input-dark"
                  placeholder="Sukhwinder Singh"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="text-xs text-white/40 mb-1 block">
                {tr('phoneNumber')}
              </label>
              <input
                className="input-dark"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">
                {tr('password')}
              </label>
              <input
                type="password"
                className="input-dark"
                placeholder="Enter password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
            </div>


            {mode === 'register' && (

              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className="text-xs text-white/40 mb-1 block">
                    {tr('state')}
                  </label>

                  <select
                    className={selectClass}
                    value={form.state}
                    onChange={e => set('state', e.target.value)}
                  >
                    <option value="" className="bg-gray-900">
                      {tr('selectState')}
                    </option>

                    {STATES.map(s => (
                      <option key={s} value={s} className="bg-gray-900">
                        {s}
                      </option>
                    ))}

                  </select>

                </div>


                <div>
                  <label className="text-xs text-white/40 mb-1 block">
                    {tr('district')}
                  </label>

                  <select
                    className={selectClass}
                    value={form.district}
                    onChange={e => set('district', e.target.value)}
                    disabled={!form.state}
                  >
                    <option value="" className="bg-gray-900">
                      {tr('selectDistrict')}
                    </option>

                    {cities.map(c => (
                      <option key={c} value={c} className="bg-gray-900">
                        {c}
                      </option>
                    ))}

                  </select>

                </div>

              </div>

            )}

          </div>


          <button
            className="btn-primary w-full mt-5 flex items-center justify-center gap-2"
            onClick={submit}
            disabled={loading}
          >

            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            )}

            {loading
              ? tr('pleaseWait')
              : mode === 'login'
              ? tr('loginBtn')
              : tr('registerBtn')
            }

          </button>


          <button
            className="w-full mt-3 text-xs text-white/30 hover:text-white/50 transition-colors"
            onClick={() => navigate('/')}
          >
            {tr('continueWithout')}
          </button>

        </motion.div>

      </div>

    </div>

  );
}