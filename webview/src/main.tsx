import { createRoot } from 'react-dom/client';
import Shell from './shell/Shell';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<Shell />);
}
