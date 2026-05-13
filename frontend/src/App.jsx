import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CropAdvisory from './pages/CropAdvisory';
import SoilHealth from './pages/SoilHealth';
import PestDetection from './pages/PestDetection';
import MarketPrices from './pages/MarketPrices';
import WeatherAlerts from './pages/WeatherAlerts';
import Chatbot from './pages/Chatbot';
import GovSchemes from './pages/GovSchemes';
import Feedback from './pages/Feedback';
import Auth from './pages/Auth';
import KisanStore from './pages/KisanStore';   // ← new

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#0a1f0b', color: '#e8f5e9', border: '1px solid rgba(74,222,128,0.2)', fontFamily: 'DM Sans' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#0a1f0b' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#0a1f0b' } },
          }}
        />
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<Layout />}>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/crops"      element={<CropAdvisory />} />
            <Route path="/soil"       element={<SoilHealth />} />
            <Route path="/pest"       element={<PestDetection />} />
            <Route path="/market"     element={<MarketPrices />} />
            <Route path="/weather"    element={<WeatherAlerts />} />
            <Route path="/chat"       element={<Chatbot />} />
            <Route path="/schemes"    element={<GovSchemes />} />
            <Route path="/feedback"   element={<Feedback />} />
            <Route path="/store"      element={<KisanStore />} />   ← new
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}