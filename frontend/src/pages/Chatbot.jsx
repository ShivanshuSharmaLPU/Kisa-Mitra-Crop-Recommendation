import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { useApp } from '../context/AppContext';

// Quick chips per language
const CHIPS_BY_LANG = {
  en: ['🌾 Wheat fertilizer', '🐛 Pests this season', '💰 Today mandi prices', '🌧️ Rain alert', '🏛️ PM-KISAN help', '🧪 Low OC soil fix'],
  hi: ['🌾 गेहूं खाद सलाह', '🐛 इस मौसम के कीट', '💰 आज मंडी भाव', '🌧️ बारिश अलर्ट', '🏛️ PM-KISAN सहायता', '🧪 मिट्टी सुधार'],
  pa: ['🌾 ਕਣਕ ਖਾਦ ਸਲਾਹ', '🐛 ਇਸ ਮੌਸਮ ਦੇ ਕੀੜੇ', '💰 ਅੱਜ ਮੰਡੀ ਭਾਅ', '🌧️ ਮੀਂਹ ਅਲਰਟ', '🏛️ PM-KISAN ਮਦਦ', '🧪 ਮਿੱਟੀ ਸੁਧਾਰ'],
  ta: ['🌾 கோதுமை உரம்', '🐛 இந்த பருவ பூச்சிகள்', '💰 இன்றைய சந்தை', '🌧️ மழை எச்சரிக்கை', '🏛️ PM-KISAN உதவி', '🧪 மண் சரிசெய்'],
  te: ['🌾 గోధుమ ఎరువు', '🐛 ఈ సీజన్ తెగుళ్ళు', '💰 నేటి మండీ ధర', '🌧️ వర్షం హెచ్చరిక', '🏛️ PM-KISAN సహాయం', '🧪 నేల మెరుగు'],
};

const PLACEHOLDER_BY_LANG = {
  en: 'Ask about crops, pests, prices... (Hindi/English)',
  hi: 'फसल, कीट, भाव के बारे में पूछें...',
  pa: 'ਫਸਲ, ਕੀੜੇ, ਭਾਅ ਬਾਰੇ ਪੁੱਛੋ...',
  ta: 'பயிர், பூச்சி, விலை பற்றி கேளுங்கள்...',
  te: 'పంట, తెగుళ్ళు, ధర గురించి అడగండి...',
};

const WELCOME_BY_LANG = {
  en: "Namaste! 🌾 I'm KisanBot, your AI farm assistant.\n\nAsk me anything about crops, fertilizers, pests, market prices, weather, or government schemes — in Hindi or English!",
  hi: "नमस्ते! 🌾 मैं KisanBot हूँ, आपका AI कृषि सहायक।\n\nफसल, खाद, कीट, बाज़ार भाव, मौसम, या सरकारी योजनाओं के बारे में कुछ भी पूछें!",
  pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! 🌾 ਮੈਂ KisanBot ਹਾਂ, ਤੁਹਾਡਾ AI ਖੇਤੀ ਸਹਾਇਕ।\n\nਫਸਲ, ਖਾਦ, ਕੀੜੇ, ਬਾਜ਼ਾਰ ਭਾਅ, ਮੌਸਮ ਜਾਂ ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ!",
  ta: "வணக்கம்! 🌾 நான் KisanBot, உங்கள் AI விவசாய உதவியாளர்.\n\nபயிர்கள், உரங்கள், பூச்சிகள், சந்தை விலைகள், வானிலை அல்லது அரசு திட்டங்கள் பற்றி கேளுங்கள்!",
  te: "నమస్కారం! 🌾 నేను KisanBot, మీ AI వ్యవసాయ సహాయకుడిని.\n\nపంటలు, ఎరువులు, తెగుళ్ళు, మార్కెట్ ధరలు, వాతావరణం లేదా ప్రభుత్వ పథకాల గురించి అడగండి!",
};

const TITLE_BY_LANG = {
  en: '💬 AI Chatbot',
  hi: '💬 AI चैटबॉट',
  pa: '💬 AI ਚੈਟਬੋਟ',
  ta: '💬 AI சாட்பாட்',
  te: '💬 AI చాట్‌బాట్',
};

const SUB_BY_LANG = {
  en: 'Ask KisanBot in Hindi or English — instant agricultural advice',
  hi: 'KisanBot से हिंदी या अंग्रेजी में पूछें — तुरंत कृषि सलाह',
  pa: 'KisanBot ਨੂੰ ਪੰਜਾਬੀ ਜਾਂ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਪੁੱਛੋ',
  ta: 'KisanBot-ஐ தமிழ் அல்லது ஆங்கிலத்தில் கேளுங்கள்',
  te: 'KisanBot ని తెలుగు లేదా ఆంగ్లంలో అడగండి',
};

export default function Chatbot() {
  const { lang } = useApp();
  const chips = CHIPS_BY_LANG[lang] || CHIPS_BY_LANG.en;
  const placeholder = PLACEHOLDER_BY_LANG[lang] || PLACEHOLDER_BY_LANG.en;
  const title = TITLE_BY_LANG[lang] || TITLE_BY_LANG.en;
  const sub = SUB_BY_LANG[lang] || SUB_BY_LANG.en;
  const welcomeText = WELCOME_BY_LANG[lang] || WELCOME_BY_LANG.en;

  const [messages, setMessages] = useState([
    { id: 1, role: 'bot', text: welcomeText, ts: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const prevLang = useRef(lang);
  const bottomRef = useRef(null);

  // Update welcome message when language changes
  useEffect(() => {
    if (prevLang.current !== lang) {
      prevLang.current = lang;
      setMessages(prev => {
        const first = prev[0];
        if (first && first.role === 'bot' && first.id === 1) {
          return [{ ...first, text: WELCOME_BY_LANG[lang] || WELCOME_BY_LANG.en }, ...prev.slice(1)];
        }
        return prev;
      });
    }
  }, [lang]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const LANG_CODE = { en: 'en', hi: 'hi', pa: 'pa', ta: 'ta', te: 'te' };

  // Build API history from current messages (skip the welcome message id=1)
  const buildHistory = (currentMessages) => {
    return currentMessages
      .filter(m => m.id !== 1)
      .map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.text,
      }));
  };

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput('');

    const userMsg = { id: Date.now(), role: 'user', text: msg, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = buildHistory(messages);

      const r = await api.post('/chat', {
        message: msg,
        language: LANG_CODE[lang] || 'en',
        history,
      });

      const botMsg = { id: Date.now() + 1, role: 'bot', text: r.response, ts: new Date() };
      setMessages(prev => [...prev, botMsg]);

    } catch (err) {
      const errMsgs = {
        en: '⚠️ Sorry, I could not respond. Please try again.',
        hi: '⚠️ क्षमा करें, जवाब नहीं मिला। कृपया पुनः प्रयास करें।',
        pa: '⚠️ ਮਾਫ਼ ਕਰੋ, ਜਵਾਬ ਨਹੀਂ ਮਿਲਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
        ta: '⚠️ மன்னிக்கவும், பதில் கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்.',
        te: '⚠️ క్షమించండి, స్పందన రాలేదు. మళ్ళీ ప్రయత్నించండి.',
      };
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: errMsgs[lang] || errMsgs.en,
        ts: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const voiceLangMap = { en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN', ta: 'ta-IN', te: 'te-IN' };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice not supported in this browser. Try Chrome.');
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = voiceLangMap[lang] || 'hi-IN';
    r.onstart = () => setRecording(true);
    r.onend = () => setRecording(false);
    r.onresult = e => {
      const t = e.results[0][0].transcript;
      setInput(t);
      send(t);
    };
    r.start();
  };

  // Clear conversation
  const clearChat = () => {
    setMessages([{ id: 1, role: 'bot', text: welcomeText, ts: new Date() }]);
  };

  const fmt = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div>
        <h1 className="font-display text-3xl font-bold text-gradient-green">{title}</h1>
        <p className="text-white/40 text-sm mt-1">{sub}</p>
      </div>

      <div className="card-gradient rounded-2xl overflow-hidden flex flex-col" style={{ height: '560px' }}>

        {/* ── Navbar with Clear button on right ── */}
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
          {/* Bot avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center text-base flex-shrink-0">
            🤖
          </div>

          {/* Bot name + status — flex-1 pushes clear button to right */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-white">KisanBot</div>
            <div className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              Online · AI Powered ·{' '}
              {lang === 'hi' ? 'हिंदी + English'
                : lang === 'pa' ? 'ਪੰਜਾਬੀ + English'
                : lang === 'ta' ? 'தமிழ் + English'
                : lang === 'te' ? 'తెలుగు + English'
                : 'Hindi + English'}
            </div>
          </div>

          {/* Clear button — right side of navbar */}
          {messages.length > 1 && (
            <button
              onClick={clearChat}
              title="Clear conversation"
              className="flex-shrink-0 flex items-center gap-1 text-xs text-white/30 hover:text-red-400 transition-all px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-red-400/40 hover:bg-red-400/5"
            >
              🗑️ <span>Clear</span>
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0
                  ${msg.role === 'bot' ? 'bg-green-900/60 border border-green-500/30' : 'bg-amber-700/60 border border-amber-500/30'}`}>
                  {msg.role === 'bot' ? '🤖' : '👤'}
                </div>
                <div className="max-w-[78%]">
                  <div className={`px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line
                    ${msg.role === 'bot' ? 'chat-bot-bubble text-white/80' : 'chat-user-bubble text-white'}`}>
                    {msg.text}
                  </div>
                  <div className={`text-[0.6rem] text-white/20 mt-0.5 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    {fmt(msg.ts)}
                  </div>
                </div>
              </motion.div>
            ))}

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center">
                <div className="w-7 h-7 rounded-full bg-green-900/60 border border-green-500/30 flex items-center justify-center text-sm">🤖</div>
                <div className="chat-bot-bubble px-4 py-2.5">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-green-400/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Quick chips */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-white/[0.04] scrollbar-none">
          {chips.map(c => (
            <button
              key={c}
              onClick={() => send(c)}
              disabled={loading}
              className="text-xs whitespace-nowrap glass-green text-green-400 border border-green-500/20 px-3 py-1 rounded-full hover:bg-green-600/20 transition-all flex-shrink-0 disabled:opacity-40"
            >
              {c}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex border-t border-white/[0.06] bg-white/[0.02]">
       <button
  onClick={toggleVoice}
  className={`
    px-4 flex items-center justify-center
    transition-all duration-300
    ${
      recording
        ? 'text-red-400 scale-110 animate-pulse'
        : 'text-green-400 hover:text-green-300'
    }
  `}
  title="Voice input"
>
  <span className="text-2xl drop-shadow-md">🎤</span>
</button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && send()}
            placeholder={placeholder}
            disabled={loading}
            className="flex-1 bg-transparent text-white/80 text-sm py-3.5 outline-none placeholder:text-white/20 disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="px-4 text-xl disabled:opacity-20 text-green-400 hover:text-green-300 transition-colors"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}