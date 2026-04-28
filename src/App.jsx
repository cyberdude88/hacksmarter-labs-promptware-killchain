import { SocProvider, useSoc } from './state/SocContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import InvestigationPage from './pages/InvestigationPage.jsx';
import DetectionPage from './pages/DetectionPage.jsx';
import ReplayPage from './pages/ReplayPage.jsx';
import ReportPage from './pages/ReportPage.jsx';

// App shell: provider + layout (sidebar | topbar + workspace).
export default function App() {
  return (
    <SocProvider>
      <Shell />
    </SocProvider>
  );
}

function Shell() {
  return (
    <div className="soc-app">
      <Sidebar />
      <div className="soc-main">
        <TopBar />
        <main className="workspace">
          <Workspace />
        </main>
      </div>
    </div>
  );
}

// Page router — keyed off state.currentPage.
function Workspace() {
  const { state } = useSoc();
  switch (state.currentPage) {
    case 'investigation': return <InvestigationPage />;
    case 'detection':     return <DetectionPage />;
    case 'replay':        return <ReplayPage />;
    case 'report':        return <ReportPage />;
    case 'alerts':
    default:              return <AlertsPage />;
  }
}
