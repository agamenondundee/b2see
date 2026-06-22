import { useEffect, useState } from 'react';
import { api } from '../api';

interface Control {
  id: string; controlReference: string; title: string; theme: string;
  controlTypes: string[]; properties: string[]; concepts: string[];
  documents: { id: string; documentId: string }[];
  soaEntry: { applicable: boolean | null; implementationStatus: string } | null;
}
interface Gap { clauseNumber: string; title: string; mandatoryDocuments: string[] }

const THEMES = ['', 'Organizational', 'People', 'Physical', 'Technological'];

export default function Framework() {
  const [controls, setControls] = useState<Control[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [theme, setTheme] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<Gap[]>('/api/framework/coverage-gaps').then(setGaps).catch((e) => setError((e as Error).message));
  }, []);
  useEffect(() => {
    const q = theme ? `?theme=${theme}` : '';
    api<Control[]>(`/api/controls${q}`).then(setControls).catch((e) => setError((e as Error).message));
  }, [theme]);

  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h2>ISO/IEC 27001:2022 framework</h2>

      <div className="panel">
        <h3>Coverage gaps</h3>
        <p className="muted">Clauses that require documented information but have no linked document.</p>
        {gaps.length === 0 ? <p>No coverage gaps.</p> : (
          <table>
            <thead><tr><th>Clause</th><th>Title</th><th>Mandatory documented information</th></tr></thead>
            <tbody>{gaps.map((g) => (
              <tr key={g.clauseNumber}><td>{g.clauseNumber}</td><td>{g.title}</td><td>{g.mandatoryDocuments.join('; ')}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <div className="toolbar">
          <h3 style={{ margin: 0 }}>Annex A controls</h3>
          <select aria-label="Filter by theme" value={theme} onChange={(e) => setTheme(e.target.value)} style={{ width: 200 }}>
            {THEMES.map((t) => <option key={t} value={t}>{t || 'All themes'}</option>)}
          </select>
        </div>
        <table>
          <thead><tr><th>Reference</th><th>Title</th><th>Theme</th><th>Type</th><th>Applicable</th><th>Documents</th></tr></thead>
          <tbody>
            {controls.map((c) => (
              <tr key={c.id}>
                <td>{c.controlReference}</td>
                <td>{c.title}</td>
                <td>{c.theme}</td>
                <td className="muted">{c.controlTypes.join(', ')}</td>
                <td>{c.soaEntry?.applicable === null || c.soaEntry === null ? '-' : c.soaEntry.applicable ? 'Yes' : 'No'}</td>
                <td>{c.documents.map((d) => d.documentId).join(', ') || <span className="muted">none</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
