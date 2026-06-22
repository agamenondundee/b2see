import { useEffect, useState } from 'react';
import { api } from '../api';

interface DocBrief { id: string; documentId: string; title: string; nextReviewDate: string | null }
interface DashboardData {
  reviews: { due: DocBrief[]; overdue: DocBrief[] };
  soa: { applicable: number; excluded: number; byStatus: Record<string, number> };
  nonconformities: { open: number; overdue: number };
  risks: { total: number; byStatus: Record<string, number> };
  coverageGaps: number;
  recentActivity: { id: string; createdAt: string; actorLabel: string; action: string; entityType: string; summary: string }[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<DashboardData>('/api/dashboard').then(setData).catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="cards">
        <div className="card warn"><div className="num">{data.reviews.overdue.length}</div><div className="label">Reviews overdue</div></div>
        <div className="card"><div className="num">{data.reviews.due.length}</div><div className="label">Reviews due soon</div></div>
        <div className="card"><div className="num">{data.soa.applicable}</div><div className="label">Applicable controls</div></div>
        <div className="card warn"><div className="num">{data.coverageGaps}</div><div className="label">Coverage gaps</div></div>
        <div className="card warn"><div className="num">{data.nonconformities.open}</div><div className="label">Open nonconformities</div></div>
        <div className="card"><div className="num">{data.risks.total}</div><div className="label">Risks</div></div>
      </div>

      <div className="panel">
        <h3>Statement of Applicability implementation</h3>
        <p>
          {Object.entries(data.soa.byStatus).map(([k, v]) => (
            <span key={k} className="badge" style={{ marginRight: 8 }}>{k}: {v}</span>
          ))}
        </p>
      </div>

      <div className="panel">
        <h3>Documents overdue for review</h3>
        {data.reviews.overdue.length === 0 ? <p className="muted">None.</p> : (
          <table>
            <thead><tr><th>Reference</th><th>Title</th><th>Review by</th></tr></thead>
            <tbody>{data.reviews.overdue.map((d) => (
              <tr key={d.id}><td>{d.documentId}</td><td>{d.title}</td><td>{d.nextReviewDate?.slice(0, 10)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h3>Recent activity</h3>
        <table>
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead>
          <tbody>{data.recentActivity.map((a) => (
            <tr key={a.id}>
              <td className="muted">{a.createdAt.slice(0, 16).replace('T', ' ')}</td>
              <td>{a.actorLabel}</td>
              <td>{a.action} {a.entityType}</td>
              <td>{a.summary}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
