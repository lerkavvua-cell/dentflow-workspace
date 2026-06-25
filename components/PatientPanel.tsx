'use client';

import { copy, statusKeys } from '@/lib/dentflow';
import type { Lang, Patient, PatientStatus } from '@/types';

export default function PatientPanel({
  lang,
  patient,
  onSave
}: {
  lang: Lang;
  patient?: Patient;
  onSave: (id: string, patch: Partial<Patient>) => void;
}) {
  const t = copy[lang];

  return (
    <aside className="patient-panel">
      <section className="panel">
        <div className="panel-title">
          <h3>{t.patientPanel}</h3>
        </div>
        {!patient && <p className="muted">{t.selectPatient}</p>}
        {patient && (
          <div className="patient-form">
            <div className={`patient-status-card ${patient.status}`}>
              <span>{t.status}</span>
              <strong>{t[patient.status]}</strong>
            </div>
            <input value={patient.name || ''} onChange={event => onSave(patient.id, { name: event.target.value })} placeholder={t.patientName} />
            <input value={patient.doctor || ''} onChange={event => onSave(patient.id, { doctor: event.target.value })} placeholder={t.doctor} />
            <input value={patient.agent || ''} onChange={event => onSave(patient.id, { agent: event.target.value })} placeholder={t.agent} />
            <input value={patient.cardLink || ''} onChange={event => onSave(patient.id, { cardLink: event.target.value })} placeholder={t.patientCard} />
            <input value={patient.canvaLink || ''} onChange={event => onSave(patient.id, { canvaLink: event.target.value })} placeholder={t.canvaLink} />
            <textarea value={patient.notes || ''} onChange={event => onSave(patient.id, { notes: event.target.value })} placeholder={t.notes} />
            <select value={patient.status} onChange={event => onSave(patient.id, { status: event.target.value as PatientStatus })}>
              {statusKeys.map(status => (
                <option key={status} value={status}>
                  {t[status]}
                </option>
              ))}
            </select>
            <div className="workflow-actions">
              <button type="button" onClick={() => onSave(patient.id, { status: 'approved' })}>
                Менеджер подтвердил
              </button>
              <button type="button" onClick={() => onSave(patient.id, { status: 'correction' })}>
                На коррекцию
              </button>
              <button type="button" onClick={() => onSave(patient.id, { status: 'sent' })}>
                Я отправила
              </button>
              <button type="button" onClick={() => onSave(patient.id, { status: 'archived' })}>
                В архив
              </button>
            </div>
          </div>
        )}
      </section>
      <section className="panel">
        <div className="panel-title">
          <h3>{t.workflow}</h3>
        </div>
        <p className="muted">{t.workflowText}</p>
      </section>
    </aside>
  );
}
