import { NavLink, Route, Routes } from 'react-router-dom';
import { useAuth, hasRole } from './auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';
import Framework from './pages/Framework';
import Soa from './pages/Soa';
import Registers from './pages/Registers';
import AuditLog from './pages/AuditLog';

export default function App() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="main">Loading...</div>;
  if (!user) return <Login />;

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Cloud.ax ISMS</h1>
        <div className="org">Information Security Management System</div>
        <nav aria-label="Primary">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/documents">Documents</NavLink>
          <NavLink to="/framework">Framework</NavLink>
          <NavLink to="/soa">Statement of Applicability</NavLink>
          <NavLink to="/registers">Registers</NavLink>
          {hasRole(user, 'ISMS Manager') && <NavLink to="/audit">Audit log</NavLink>}
        </nav>
        <div className="who">
          Signed in as {user.displayName}
          <br />
          {user.roles.join(', ')}
          <br />
          <br />
          <button className="secondary" onClick={() => void logout()}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/documents/:id" element={<DocumentDetail />} />
          <Route path="/framework" element={<Framework />} />
          <Route path="/soa" element={<Soa />} />
          <Route path="/registers" element={<Registers />} />
          <Route path="/audit" element={<AuditLog />} />
        </Routes>
      </main>
    </div>
  );
}
