import {createRoot} from 'react-dom/client';

// Mark the app as running so later third-party script failures (such as ads)
// cannot incorrectly replace the working app with the startup error screen.
(window as Window & { __M2A_APP_STARTED__?: boolean }).__M2A_APP_STARTED__ = true;
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
