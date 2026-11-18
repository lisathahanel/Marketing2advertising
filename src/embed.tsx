import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const mount = document.getElementById('m2a-app-root');
if (mount) {
  document.documentElement.classList.add('m2a-blogger-homepage');
  document.body.classList.add('m2a-blogger-homepage');
  createRoot(mount).render(<App />);
  (window as Window & { __M2A_APP_STARTED__?: boolean }).__M2A_APP_STARTED__ = true;
}
