import { createRoot } from 'react-dom/client';
import EmailToolsScreen from './EmailToolsScreen';
import '../index.css';

const root = document.getElementById('email-tools-root');
if (!root) {
  throw new Error('Email Extractor root element was not found.');
}

createRoot(root).render(
  <div className="m2a-app min-h-screen bg-[#05070D] font-sans text-slate-100">
    <EmailToolsScreen />
  </div>,
);
