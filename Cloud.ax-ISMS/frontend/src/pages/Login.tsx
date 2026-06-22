import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { api } from '../api';

const ALL_ROLES = ['Administrator', 'ISMS Manager', 'Document Owner', 'Reviewer', 'Approver', 'Reader'];

export default function Login() {
  const { oidcConfigured, devLoginAllowed, refresh } = useAuth();
  const [email, setEmail] = useState('admin@example.org');
  const [displayName, setDisplayName] = useState('ISMS Administrator');
  const [roles, setRoles] = useState<string[]>(['Administrator']);
  const [error, setError] = useState('');

  function toggleRole(role: string) {
    setRoles((current) => (current.includes(role) ? current.filter((r) => r !== role) : [...current, role]));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/auth/dev-login', { method: 'POST', body: JSON.stringify({ email, displayName, roles }) });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="main" style={{ maxWidth: 460, margin: '60px auto' }}>
      <h2>Cloud.ax ISMS</h2>
      <div className="panel">
        {oidcConfigured && (
          <p>
            <a href="/auth/login"><button type="button">Sign in with your organisation</button></a>
          </p>
        )}
        {devLoginAllowed && (
          <form onSubmit={submit}>
            <p className="muted">Local development sign in. This is disabled once an identity provider is configured and in production.</p>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label htmlFor="name">Display name</label>
            <input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            <fieldset style={{ border: 'none', padding: 0, margin: '8px 0' }}>
              <legend style={{ fontSize: 13 }}>Roles</legend>
              {ALL_ROLES.map((role) => (
                <label key={role} style={{ display: 'inline-flex', gap: 6, width: 'auto', marginRight: 12 }}>
                  <input type="checkbox" style={{ width: 'auto' }} checked={roles.includes(role)} onChange={() => toggleRole(role)} />
                  {role}
                </label>
              ))}
            </fieldset>
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={roles.length === 0}>Sign in</button>
          </form>
        )}
        {!oidcConfigured && !devLoginAllowed && <p>Sign in is not available. Configure the identity provider.</p>}
      </div>
    </div>
  );
}
