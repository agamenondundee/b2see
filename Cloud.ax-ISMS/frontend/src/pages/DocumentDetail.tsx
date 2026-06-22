import { useEffect, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api, downloadFile } from '../api';
import { useAuth, hasRole } from '../auth';

interface Version { id: string; versionNumber: string; status: string; changeSummary: string; fileName: string | null; createdAt: string; publishedAt: string | null }
interface DocDetail {
  id: string; documentId: string; title: string; documentType: string; classification: string; status: string;
  nextReviewDate: string | null; reviewFrequencyMonths: number;
  owner?: { displayName?: string }; author?: { displayName?: string }; approver?: { displayName?: string };
  currentVersion?: Version | null; versions: Version[];
  clauses: { id: string; clauseNumber: string; title: string }[];
  controls: { id: string; controlReference: string; title: string }[];
}

const ACTIONS: Record<string, { label: string; roles: string[] }> = {
  submit: { label: 'Submit for review', roles: ['Document Owner', 'ISMS Manager'] },
  review: { label: 'Complete review', roles: ['Reviewer', 'ISMS Manager'] },
  publish: { label: 'Approve and publish', roles: ['Approver', 'ISMS Manager'] },
  startRevision: { label: 'Start revision', roles: ['Document Owner', 'ISMS Manager'] },
  retire: { label: 'Retire', roles: ['ISMS Manager'] },
};

const ALLOWED_FROM: Record<string, string[]> = {
  submit: ['Draft', 'UnderRevision'],
  review: ['InReview'],
  publish: ['Approved'],
  startRevision: ['Published'],
  retire: ['Published', 'Approved', 'UnderRevision'],
};

export default function DocumentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [doc, setDoc] = useState<DocDetail | null>(null);
  const [error, setError] = useState('');

  function load() {
    api<DocDetail>(`/api/documents/${id}`).then(setDoc).catch((e) => setError((e as Error).message));
  }
  useEffect(load, [id]);

  async function transition(action: string) {
    setError('');
    try {
      await api(`/api/documents/${id}/transition`, { method: 'POST', body: JSON.stringify({ action }) });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function upload(versionId: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const data = new FormData();
    data.append('file', file);
    try {
      const res = await fetch(`/api/documents/${id}/versions/${versionId}/file`, { method: 'POST', credentials: 'include', body: data });
      if (!res.ok) throw new Error('Upload failed.');
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!doc) return <p>Loading...</p>;

  const activeVersion = doc.versions.find((v) => ['Draft', 'InReview', 'Approved'].includes(v.status));

  return (
    <div>
      <h2>{doc.documentId} {doc.title}</h2>
      <div className="panel">
        <p>
          <span className="badge">{doc.status}</span>{' '}
          <span className="muted">{doc.documentType} | {doc.classification} | reviewed every {doc.reviewFrequencyMonths} months</span>
        </p>
        <p className="muted">
          Owner: {doc.owner?.displayName ?? '-'} | Author: {doc.author?.displayName ?? '-'} | Approver: {doc.approver?.displayName ?? '-'}
          {doc.nextReviewDate && <> | Next review: {doc.nextReviewDate.slice(0, 10)}</>}
        </p>
        <div className="toolbar">
          {Object.entries(ACTIONS).map(([action, def]) =>
            ALLOWED_FROM[action].includes(doc.status) && hasRole(user, ...def.roles) ? (
              <button key={action} className="secondary" onClick={() => transition(action)}>{def.label}</button>
            ) : null,
          )}
        </div>
      </div>

      <div className="panel">
        <h3>Versions</h3>
        <table>
          <thead><tr><th>Version</th><th>Status</th><th>Change summary</th><th>File</th><th>Published</th></tr></thead>
          <tbody>
            {doc.versions.map((v) => (
              <tr key={v.id}>
                <td>{v.versionNumber}</td>
                <td><span className="badge">{v.status}</span></td>
                <td>{v.changeSummary || '-'}</td>
                <td>
                  {v.fileName ? (
                    <button className="secondary" onClick={() => downloadFile(`/api/documents/${doc.id}/versions/${v.id}/file`)}>Download</button>
                  ) : <span className="muted">none</span>}
                </td>
                <td>{v.publishedAt?.slice(0, 10) ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {activeVersion && hasRole(user, 'Document Owner', 'ISMS Manager') && (
          <p>
            <label htmlFor="up">Upload file to version {activeVersion.versionNumber}</label>
            <input id="up" type="file" onChange={(e) => upload(activeVersion.id, e)} />
          </p>
        )}
      </div>

      <div className="panel">
        <h3>Mapped clauses and controls</h3>
        <p><strong>Clauses:</strong> {doc.clauses.map((c) => c.clauseNumber).join(', ') || 'none'}</p>
        <p><strong>Annex A controls:</strong> {doc.controls.map((c) => c.controlReference).join(', ') || 'none'}</p>
      </div>
    </div>
  );
}
