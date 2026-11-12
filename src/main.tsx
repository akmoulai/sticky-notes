import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createMockNotesApi } from './api/mockNotesApi';
import { Board } from './components/Board/Board';
import './styles/app.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

const api = createMockNotesApi({ storage: localStorage, delayMs: 300 });

createRoot(container).render(
  <StrictMode>
    <Board api={api} />
  </StrictMode>,
);
