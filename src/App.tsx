import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConversionProvider } from './contexts/ConversionContext';
import AppLayout from './components/layout/AppLayout';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import './App.css';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <ConversionProvider>
          <Routes>
            <Route path="/" element={<AppLayout />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
          </Routes>
        </ConversionProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;