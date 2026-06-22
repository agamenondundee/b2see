import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth, hasRole } from '../auth';

interface DocRow {
  id: string;
  documentId: string;
  title: string;
  documentType: string;
  classification: string;
  status: string;
  nextReviewDate: string | null;
  owner?: { displayName?: string };
  currentVersion?: { versionNumber?: string };
}

interface Config {
  documentTypes: string[];
  classificationScheme: string[];
  defaultReviewFrequencyMonths: number;
  reviewFrequenciesMonths: number[];
}

export default function Documents() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DocRow[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', documentType: '', classification: '' });

  function load() {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    api<DocRow[]>(`/api/documents${query}`).then(setRows).catch((e) => setError((e as Error).message));
  }

  useEffect(() => {
    api<Config>('/api/config').then((c) => {
      setConfig(c);
      setForm((f) => ({ ...f, documentType: c.documentTypes[0] ?? '', classification: c.classificationScheme[0] ?? '' }));
    });
  }, []);
  useEffect(load, [status]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/api/documents', { method: 'POST', body: JSON.stringify(form) });
      setCreating(false);
      setForm((f) => ({ ...f, title: '' }));
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const canCreate = hasRole(user, 'Document Owner', 'ISMS Manager');

  return (
    <div>
      <h2>Documents</h2>
      <div className="toolbar">
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 200 }}>
          <option value="">All statuses</option>
          {['Draft', 'InReview', 'Approved', 'Published', 'UnderRevision', 'Retired'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {canCreate && <button onClick={() => setCreating((v) => !v)}>{creating ? 'Cancel' : 'New document'}</button>}
      </div>

      {error && <p className="error">{error}</p>}

      {creating && config && (
        <form className="panel" onSubmit={create}>
          <label htmlFor="t">Title</label>
          <input id="t" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="row">
            <div style={{ flex: 1 }}>
              <label htmlFor="ty">Type</label>
              <select id="ty" value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })}>
                {config.documentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="cl">Classification</label>
              <select id="cl" value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })}>
                {config.classificationScheme.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <p><button type="submit">Create</button></p>
        </form>
      )}

      <div className="panel">
        <table>
          <thead><tr><th>Reference</th><th>Title</th><th>Type</th><th>Class</th><th>Status</th><th>Version</th><th>Review by</th></tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td><Link to={`/documents/${d.id}`}>{d.documentId}</Link></td>
                <td>{d.title}</td>
                <td>{d.documentType}</td>
                <td>{d.classification}</td>
                <td><span className="badge">{d.status}</span></td>
                <td>{d.currentVersion?.versionNumber ?? '-'}</td>
                <td>{d.nextReviewDate?.slice(0, 10) ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted">No documents.</p>}
      </div>
    </div>
  );
}
