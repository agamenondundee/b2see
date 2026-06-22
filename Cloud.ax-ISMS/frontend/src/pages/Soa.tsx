import { useEffect, useState } from 'react';
import { api, downloadFile } from '../api';
import { useAuth, hasRole } from '../auth';

interface SoaEntry {
  id: string;
  control: { controlReference: string; title: string; theme: string };
  applicable: boolean | null;
  justification: string;
  implementationStatus: string;
  controlOwner: string;
  documents: { documentId: string }[];
}
interface SoaResponse {
  entries: SoaEntry[];
  summary: { applicable: number; excluded: number; undecided: number; byStatus: Record<string, number> };
}

const STATUSES = ['NotStarted', 'InProgress', 'Implemented', 'Verified'];

export default function Soa() {
  const { user } = useAuth();
  const canEdit = hasRole(user, 'ISMS Manager');
  const [data, setData] = useState<SoaResponse | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<SoaEntry>>>({});
  const [error, setError] = useState('');

  function load() {
    api<SoaResponse>('/api/soa').then(setData).catch((e) => setError((e as Error).message));
  }
  useEffect(load, []);

  function set(id: string, field: keyof SoaEntry, value: unknown) {
    setEdits((e) => ({ ...e, [id]: { ...e[id], [field]: value } }));
  }

  async function save(entry: SoaEntry) {
    const change = edits[entry.id];
    if (!change) return;
    setError('');
    try {
      await api(`/api/soa/${entry.id}`, { method: 'PATCH', body: JSON.stringify(change) });
      setEdits((e) => { const next = { ...e }; delete next[entry.id]; return next; });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h2>Statement of Applicability</h2>
      <div className="toolbar">
        <button className="secondary" onClick={() => downloadFile('/api/soa/export.xlsx')}>Export spreadsheet</button>
        <button className="secondary" onClick={() => downloadFile('/api/soa/export.pdf')}>Export PDF</button>
        <span className="badge">Applicable: {data.summary.applicable}</span>
        <span className="badge">Excluded: {data.summary.excluded}</span>
        <span className="badge">Undecided: {data.summary.undecided}</span>
      </div>
      <div className="panel">
        <table>
          <thead><tr><th>Control</th><th>Applicable</th><th>Justification</th><th>Status</th><th>Owner</th><th>Docs</th>{canEdit && <th></th>}</tr></thead>
          <tbody>
            {data.entries.map((e) => {
              const edit = edits[e.id] ?? {};
              const applicable = edit.applicable !== undefined ? edit.applicable : e.applicable;
              return (
                <tr key={e.id}>
                  <td title={e.control.title}>{e.control.controlReference}</td>
                  <td>
                    <select disabled={!canEdit} value={applicable === null ? '' : applicable ? 'yes' : 'no'}
                      onChange={(ev) => set(e.id, 'applicable', ev.target.value === '' ? null : ev.target.value === 'yes')} style={{ width: 110 }}>
                      <option value="">Undecided</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </td>
                  <td>
                    <input disabled={!canEdit} defaultValue={e.justification} onChange={(ev) => set(e.id, 'justification', ev.target.value)} />
                  </td>
                  <td>
                    <select disabled={!canEdit} defaultValue={e.implementationStatus} onChange={(ev) => set(e.id, 'implementationStatus', ev.target.value)} style={{ width: 130 }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><input disabled={!canEdit} defaultValue={e.controlOwner} onChange={(ev) => set(e.id, 'controlOwner', ev.target.value)} style={{ width: 120 }} /></td>
                  <td className="muted">{e.documents.map((d) => d.documentId).join(', ')}</td>
                  {canEdit && <td><button disabled={!edits[e.id]} onClick={() => save(e)}>Save</button></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
