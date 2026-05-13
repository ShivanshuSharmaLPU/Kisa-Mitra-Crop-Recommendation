import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';

// ─── Store Labels in 5 languages ─────────────────────────────────────────────
const SL = {
  title:       { en:'🛒 Kisan Store', hi:'🛒 किसान स्टोर', pa:'🛒 ਕਿਸਾਨ ਸਟੋਰ', ta:'🛒 கிசான் ஸ்டோர்', te:'🛒 కిసాన్ స్టోర్' },
  subtitle:    { en:'Quality agricultural inputs delivered to your farm', hi:'गुणवत्तापूर्ण कृषि सामग्री आपके खेत तक', pa:'ਉੱਚ ਗੁਣਵੱਤਾ ਵਾਲੀ ਖੇਤੀ ਸਮੱਗਰੀ ਤੁਹਾਡੇ ਖੇਤ ਤੱਕ', ta:'தரமான வேளாண் பொருட்கள் உங்கள் பண்ணைக்கு', te:'నాణ్యమైన వ్యవసాయ సరుకులు మీ పొలానికి' },
  search:      { en:'Search seeds, fertilizers, tools...', hi:'बीज, खाद, उपकरण खोजें...', pa:'ਬੀਜ, ਖਾਦ, ਔਜ਼ਾਰ ਖੋਜੋ...', ta:'விதைகள், உரம், கருவிகள் தேடுங்கள்...', te:'విత్తనాలు, ఎరువులు, పనిముట్లు వెతకండి...' },
  addCart:     { en:'Add to Cart', hi:'कार्ट में जोड़ें', pa:'ਕਾਰਟ ਵਿੱਚ ਸ਼ਾਮਲ ਕਰੋ', ta:'கார்ட்டில் சேர்', te:'కార్ట్‌కు జోడించు' },
  buyNow:      { en:'Buy Now', hi:'अभी खरीदें', pa:'ਹੁਣੇ ਖਰੀਦੋ', ta:'இப்போது வாங்கு', te:'ఇప్పుడు కొనండి' },
  inCart:      { en:'In Cart', hi:'कार्ट में है', pa:'ਕਾਰਟ ਵਿੱਚ', ta:'கார்ட்டில் உள்ளது', te:'కార్ట్‌లో ఉంది' },
  cart:        { en:'Cart', hi:'कार्ट', pa:'ਕਾਰਟ', ta:'கார்ட்', te:'కార్ట్' },
  emptyCart:   { en:'Your cart is empty', hi:'आपका कार्ट खाली है', pa:'ਤੁਹਾਡਾ ਕਾਰਟ ਖਾਲੀ ਹੈ', ta:'உங்கள் கார்ட் காலியாக உள்ளது', te:'మీ కార్ట్ ఖాళీగా ఉంది' },
  total:       { en:'Total', hi:'कुल', pa:'ਕੁੱਲ', ta:'மொத்தம்', te:'మొత్తం' },
  checkout:    { en:'Proceed to Checkout', hi:'चेकआउट करें', pa:'ਚੈੱਕਆਉਟ ਕਰੋ', ta:'செக்அவுட் செய்', te:'చెక్అవుట్ చేయండి' },
  all:         { en:'All', hi:'सभी', pa:'ਸਭ', ta:'அனைத்தும்', te:'అన్నీ' },
  seeds:       { en:'Seeds', hi:'बीज', pa:'ਬੀਜ', ta:'விதைகள்', te:'విత్తనాలు' },
  fertilizers: { en:'Fertilizers', hi:'खाद', pa:'ਖਾਦ', ta:'உரங்கள்', te:'ఎరువులు' },
  pesticides:  { en:'Pesticides', hi:'कीटनाशक', pa:'ਕੀਟਨਾਸ਼ਕ', ta:'பூச்சிக்கொல்லி', te:'పురుగుమందులు' },
  tools:       { en:'Tools', hi:'उपकरण', pa:'ਔਜ਼ਾਰ', ta:'கருவிகள்', te:'పనిముట్లు' },
  soil:        { en:'Soil Care', hi:'मिट्टी देखभाल', pa:'ਮਿੱਟੀ ਦੇਖਭਾਲ', ta:'மண் பராமரிப்பு', te:'నేల సంరక్షణ' },
  perKg:       { en:'/kg', hi:'/किग्रा', pa:'/ਕਿਲੋ', ta:'/கிலோ', te:'/కిలో' },
  perBag:      { en:'/bag', hi:'/बोरी', pa:'/ਬੋਰੀ', ta:'/பை', te:'/సంచి' },
  perLitre:    { en:'/L', hi:'/लीटर', pa:'/ਲੀਟਰ', ta:'/லி', te:'/లీ' },
  perPiece:    { en:'/pc', hi:'/नग', pa:'/ਨੱਗ', ta:'/பிஸ்', te:'/పీస్' },
  certified:   { en:'Certified', hi:'प्रमाणित', pa:'ਪ੍ਰਮਾਣਿਤ', ta:'சான்றளிக்கப்பட்ட', te:'ధృవీకరించబడిన' },
  bestseller:  { en:'Best Seller', hi:'बेस्ट सेलर', pa:'ਬੈਸਟ ਸੈਲਰ', ta:'சிறந்த விற்பனை', te:'బెస్ట్ సెల్లర్' },
  organic:     { en:'Organic', hi:'जैविक', pa:'ਜੈਵਿਕ', ta:'இயற்கை', te:'సేంద్రీయ' },
  offer:       { en:'% OFF', hi:'% छूट', pa:'% ਛੋਟ', ta:'% தள்ளுபடி', te:'% తగ్గింపు' },
  items:       { en:'items', hi:'उत्पाद', pa:'ਉਤਪਾਦ', ta:'பொருட்கள்', te:'వస్తువులు' },
  orderNote:   { en:'Orders dispatched within 24–48 hrs. Free delivery above ₹999.', hi:'24–48 घंटे में डिस्पैच। ₹999 से ऊपर मुफ्त डिलीवरी।', pa:'24–48 ਘੰਟੇ ਵਿੱਚ ਡਿਸਪੈਚ। ₹999 ਤੋਂ ਉੱਪਰ ਮੁਫ਼ਤ ਡਿਲੀਵਰੀ।', ta:'24–48 மணி நேரத்தில் அனுப்பப்படும். ₹999-க்கு மேல் இலவச டெலிவரி.', te:'24–48 గంటల్లో పంపబడుతుంది. ₹999 పైన ఉచిత డెలివరీ.' },
  rating:      { en:'Rating', hi:'रेटिंग', pa:'ਰੇਟਿੰਗ', ta:'மதிப்பீடு', te:'రేటింగ్' },
  reviews:     { en:'reviews', hi:'समीक्षाएं', pa:'ਸਮੀਖਿਆਵਾਂ', ta:'மதிப்புரைகள்', te:'సమీక్షలు' },
  remove:      { en:'Remove', hi:'हटाएं', pa:'ਹਟਾਓ', ta:'நீக்கு', te:'తొలగించు' },
};

const sl = (key, lang) => SL[key]?.[lang] || SL[key]?.en || '';

// ─── Main KisanStore Page ─────────────────────────────────────────────────────
export default function KisanStore() {
  const { lang } = useApp();

  // ✅ Redirect added here
  useEffect(() => {
    window.location.href = "https://kisan-store.vercel.app";
  }, []);

  return null; // 👈 No UI needed
}