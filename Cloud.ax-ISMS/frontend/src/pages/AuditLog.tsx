import { useEffect, useState } from 'react';
import { api } from '../api';

interface Entry { id: string; createdAt: string; actorLabel: string; action: string; entityType: string; entityId: string | null; summary: string; sourceIp: string | null }

export default function AuditLog() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [q, setQ] = useState('');
  const [entityType, setEntityType] = useState('');
  const [error, setError] = useState('');

  function load() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (entityType) params.set('entityType', entityType);
    api<Entry[]>(`/api/audit?${params.toString()}`).then(setEntries).catch((e) => setError((e as Error).message));
  }
  useEffect(load, []);

  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h2>Audit log</h2>
      <p className="muted">Append only record of every action. Entries cannot be edited or deleted.</p>
      <div className="toolbar">
        <input placeholder="Search" aria-label="Search audit log" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
        <select aria-label="Filter by entity" value={entityType} onChange={(e) => setEntityType(e.target.value)} style={{ width: 180 }}>
          <option value="">All entities</option>
          {['Document', 'Version', 'SoaEntry', 'User', 'EvidencePack'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={load}>Apply</button>
      </div>
      <div className="panel">
        <table>
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Entity</th><th>Detail</th><th>IP</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="muted">{e.createdAt.slice(0, 19).replace('T', ' ')}</td>
                <td>{e.actorLabel}</td>
                <td>{e.action}</td>
                <td>{e.entityType}</td>
                <td>{e.summary}</td>
                <td className="muted">{e.sourceIp ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && <p className="muted">No entries.</p>}
      </div>
    </div>
  );
}
