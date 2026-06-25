'use client';

import { copy } from '@/lib/dentflow';
import type { Lang, Message, Patient } from '@/types';

function csvValue(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function download(name: string, text: string, type: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function ReportsPanel({ lang, patients, messages }: { lang: Lang; patients: Patient[]; messages: Message[] }) {
  const t = copy[lang];
  const today = new Date().toISOString().slice(0, 10);

  function exportCsv() {
    const rows = [
      ['patient name', 'status', 'doctor', 'agent', 'patient card link', 'Canva link', 'notes', 'workspace', 'createdAt', 'updatedAt'],
      ...patients.map(patient => [
        patient.name,
        patient.status,
        patient.doctor || '',
        patient.agent || '',
        patient.cardLink || '',
        patient.canvaLink || '',
        patient.notes || '',
        patient.workspace,
        new Date(patient.createdAt).toISOString(),
        new Date(patient.updatedAt).toISOString()
      ])
    ];
    download(`DentFlow_Report_${today}.csv`, rows.map(row => row.map(csvValue).join(',')).join('\n'), 'text/csv;charset=utf-8');
  }

  function exportJson() {
    download(
      `DentFlow_Backup_${today}.json`,
      JSON.stringify({ patients, messages, exportedAt: new Date().toISOString() }, null, 2),
      'application/json'
    );
  }

  return (
    <section className="panel report-panel">
      <div className="panel-title">
        <h3>{t.reports}</h3>
      </div>
      <div className="report-actions">
        <button onClick={exportCsv}>{t.exportCsv}</button>
        <button onClick={exportJson}>{t.exportJson}</button>
      </div>
    </section>
  );
}
