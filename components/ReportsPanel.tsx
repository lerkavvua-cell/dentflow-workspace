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
  const reportRows = patients
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((patient, index) => `${index + 1}. ${patient.name} — ${t[patient.status]}`);

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

  function exportPdf() {
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>DentFlow report ${today}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #151827; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { color: #687086; margin: 0 0 24px; }
            ol { padding-left: 24px; font-size: 15px; line-height: 1.8; }
            li { margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <h1>DentFlow</h1>
          <p>${t.reportPreview} · ${today}</p>
          <ol>${patients
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(patient => `<li>${patient.name} — ${t[patient.status]}</li>`)
            .join('')}</ol>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank', 'width=820,height=920');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <section className="panel report-panel">
      <div className="panel-title">
        <h3>{t.reports}</h3>
      </div>
      <div className="report-actions">
        <button onClick={exportPdf}>{t.exportPdf}</button>
        <button onClick={exportCsv}>{t.exportCsv}</button>
        <button onClick={exportJson}>{t.exportJson}</button>
      </div>
      <div className="report-list">
        <h4>{t.reportPreview}</h4>
        {reportRows.length === 0 && <p className="muted">{t.noPatients}</p>}
        <ol>
          {patients
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(patient => (
              <li key={patient.id}>
                <strong>{patient.name}</strong>
                <span>{t[patient.status]}</span>
              </li>
            ))}
        </ol>
      </div>
    </section>
  );
}
