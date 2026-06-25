'use client';

import { copy } from '@/lib/dentflow';
import type { Lang, Patient } from '@/types';

export default function Dashboard({
  lang,
  patients,
  onSelectPatient
}: {
  lang: Lang;
  patients: Patient[];
  onSelectPatient: (id: string) => void;
}) {
  const t = copy[lang];
  const today = new Date().toISOString().slice(0, 10);
  const createdToday = patients.filter(item => new Date(item.createdAt).toISOString().slice(0, 10) === today).length;
  const waiting = patients.filter(item => item.status === 'review' || item.status === 'correction').length;
  const approved = patients.filter(item => item.status === 'approved').length;
  const sent = patients.filter(item => item.status === 'sent').length;
  const attention = patients.filter(item => item.status === 'review' || item.status === 'correction').slice(0, 8);

  return (
    <section className="dashboard">
      <div className="stats-grid">
        <Stat label={t.newPatients} value={createdToday} />
        <Stat label={t.waiting} value={waiting} />
        <Stat label={t.approved} value={approved} />
        <Stat label={t.sent} value={sent} />
      </div>

      <section className="panel">
        <div className="panel-title">
          <h3>{t.attention}</h3>
        </div>
        <div className="patient-list compact">
          {attention.length === 0 && <p className="muted">{t.noPatients}</p>}
          {attention.map(patient => (
            <button key={patient.id} onClick={() => onSelectPatient(patient.id)}>
              <strong>{patient.name}</strong>
              <span>{t[patient.status]} · {patient.workspace}</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
