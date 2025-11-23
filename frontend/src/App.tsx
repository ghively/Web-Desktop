import { WindowManagerProvider } from './context/WindowManager';
import { Desktop } from './components/Desktop';

function App() {
  return (
    <WindowManagerProvider>
      <Desktop />
    </WindowManagerProvider>
  );
}

export default App;