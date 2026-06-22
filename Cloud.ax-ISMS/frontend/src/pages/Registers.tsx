import { useEffect, useState, type FormEvent } from 'react';
import { api, downloadFile } from '../api';
import { useAuth, hasRole } from '../auth';

interface FieldDef { name: string; label: string; type?: 'text' | 'number' | 'date' | 'select'; options?: string[] }
interface RegisterDef { key: string; label: string; fields: FieldDef[] }

const REGISTERS: RegisterDef[] = [
  { key: 'risk', label: 'Risk register', fields: [
    { name: 'riskId', label: 'Risk ID' }, { name: 'description', label: 'Description' },
    { name: 'likelihood', label: 'Likelihood', type: 'number' }, { name: 'impact', label: 'Impact', type: 'number' },
    { name: 'treatmentOption', label: 'Treatment', type: 'select', options: ['Modify', 'Retain', 'Avoid', 'Share'] },
    { name: 'riskOwner', label: 'Owner' }, { name: 'status', label: 'Status' }, { name: 'reviewDate', label: 'Review date', type: 'date' },
  ] },
  { key: 'asset', label: 'Asset register', fields: [
    { name: 'assetId', label: 'Asset ID' }, { name: 'name', label: 'Name' }, { name: 'assetType', label: 'Type' },
    { name: 'owner', label: 'Owner' }, { name: 'classification', label: 'Classification' }, { name: 'status', label: 'Status' },
  ] },
  { key: 'supplier', label: 'Supplier register', fields: [
    { name: 'supplierId', label: 'Supplier ID' }, { name: 'name', label: 'Name' }, { name: 'serviceProvided', label: 'Service' },
    { name: 'dataLocation', label: 'Data location' }, { name: 'riskRating', label: 'Risk rating' }, { name: 'reviewDate', label: 'Review date', type: 'date' },
  ] },
  { key: 'nonconformity', label: 'Nonconformity register', fields: [
    { name: 'ncId', label: 'NC ID' }, { name: 'source', label: 'Source' }, { name: 'description', label: 'Description' },
    { name: 'clauseOrControl', label: 'Clause or control' }, { name: 'owner', label: 'Owner' },
    { name: 'dueDate', label: 'Due date', type: 'date' }, { name: 'status', label: 'Status' },
  ] },
  { key: 'internal-audit', label: 'Internal audit register', fields: [
    { name: 'auditId', label: 'Audit ID' }, { name: 'scope', label: 'Scope' }, { name: 'auditDate', label: 'Date', type: 'date' },
    { name: 'auditor', label: 'Auditor' }, { name: 'status', label: 'Status' },
  ] },
  { key: 'management-review', label: 'Management review log', fields: [
    { name: 'reviewId', label: 'Review ID' }, { name: 'reviewDate', label: 'Date', type: 'date' }, { name: 'attendees', label: 'Attendees' },
    { name: 'decisions', label: 'Decisions' },
  ] },
  { key: 'competence', label: 'Competence and training', fields: [
    { name: 'person', label: 'Person' }, { name: 'role', label: 'Role' }, { name: 'trainingCompleted', label: 'Training' },
    { name: 'completedDate', label: 'Completed', type: 'date' },
  ] },
  { key: 'legal', label: 'Legal and regulatory', fields: [
    { name: 'requirement', label: 'Requirement' }, { name: 'source', label: 'Source' }, { name: 'owner', label: 'Owner' },
    { name: 'reviewDate', label: 'Review date', type: 'date' },
  ] },
  { key: 'context', label: 'Context and interested parties', fields: [
    { name: 'category', label: 'Category' }, { name: 'description', label: 'Description' }, { name: 'partyOrIssue', label: 'Party or issue' },
    { name: 'requirements', label: 'Requirements' },
  ] },
];

export default function Registers() {
  const { user } = useAuth();
  const canEdit = hasRole(user, 'ISMS Manager');
  const [active, setActive] = useState(REGISTERS[0]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api<Record<string, unknown>[]>(`/api/registers/${active.key}`).then(setRows).catch((e) => setError((e as Error).message));
  }
  useEffect(() => { setAdding(false); setForm({}); load(); }, [active.key]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError('');
    const body: Record<string, unknown> = {};
    for (const f of active.fields) {
      const v = form[f.name];
      if (v === undefined || v === '') continue;
      body[f.name] = f.type === 'number' ? Number(v) : v;
    }
    try {
      await api(`/api/registers/${active.key}`, { method: 'POST', body: JSON.stringify(body) });
      setAdding(false); setForm({}); load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(id: string) {
    setError('');
    try { await api(`/api/registers/${active.key}/${id}`, { method: 'DELETE' }); load(); } catch (err) { setError((err as Error).message); }
  }

  function cell(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
    return String(value);
  }

  return (
    <div>
      <h2>Registers</h2>
      <div className="toolbar">
        <select aria-label="Select register" value={active.key} onChange={(e) => setActive(REGISTERS.find((r) => r.key === e.target.value)!)} style={{ width: 280 }}>
          {REGISTERS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <button className="secondary" onClick={() => downloadFile(`/api/registers/${active.key}/export.xlsx`)}>Export</button>
        {canEdit && <button onClick={() => setAdding((v) => !v)}>{adding ? 'Cancel' : 'Add entry'}</button>}
      </div>

      {error && <p className="error">{error}</p>}

      {adding && (
        <form className="panel" onSubmit={add}>
          <div className="cards">
            {active.fields.map((f) => (
              <div key={f.name}>
                <label htmlFor={f.name}>{f.label}</label>
                {f.type === 'select' ? (
                  <select id={f.name} value={form[f.name] ?? ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                    <option value=""></option>
                    {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input id={f.name} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                    value={form[f.name] ?? ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
          <button type="submit">Save entry</button>
        </form>
      )}

      <div className="panel">
        <table>
          <thead><tr>{active.fields.map((f) => <th key={f.name}>{f.label}</th>)}{canEdit && <th></th>}</tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id as string}>
                {active.fields.map((f) => <td key={f.name}>{cell(row[f.name])}</td>)}
                {canEdit && <td><button className="secondary" onClick={() => remove(row.id as string)}>Delete</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted">No entries.</p>}
      </div>
    </div>
  );
}
