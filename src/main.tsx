import {createRoot} from 'react-dom/client';

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Mark startup complete only after the app entry and its imports loaded successfully.
(window as Window & { __M2A_APP_STARTED__?: boolean }).__M2A_APP_STARTED__ = true;
