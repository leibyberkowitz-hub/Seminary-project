import React, { useEffect, useState } from 'react';
import { api } from '../../shared/api.js';
import { DataTable, PageHead, RecordForm, ChildTable } from '../../shared/ui.jsx';

const examFields = [
  { key: 'name', label: 'Exam Name' },
  { key: 'subject', label: 'Subject' },
  { key: 'course_id', label: 'Course', type: 'ref', entity: 'courses' },
  { key: 'exam_date', label: 'Exam Date', type: 'date' },
  { key: 'max_score', label: 'Max Score', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];
const resultFields = [
  { key: 'exam_id', label: 'Exam', type: 'ref', entity: 'exams' },
  { key: 'pupil_id', label: 'Pupil', type: 'ref', entity: 'pupils' },
  { key: 'score', label: 'Score', type: 'number' },
  { key: 'grade', label: 'Grade' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Exams() {
  const [creating, setCreating] = useState(false);
  const [addingResult, setAddingResult] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (selected) api(`/exams/${selected.id}`).then(setDetail).catch(() => {});
    else setDetail(null);
  }, [selected, refreshKey]);

  return (
    <div>
      <PageHead title="Exams">
        <button className="btn secondary" onClick={() => setAddingResult(true)}>+ Record Result</button>
        <button className="btn" onClick={() => setCreating(true)}>+ New Exam</button>
      </PageHead>
      <DataTable
        entity="exams" refreshKey={refreshKey} defaultSort="exam_date" defaultDir="desc"
        onRowClick={setSelected}
        columns={[
          { key: 'name', label: 'Exam' },
          { key: 'subject', label: 'Subject' },
          { key: 'course_id', label: 'Course', ref: true },
          { key: 'exam_date', label: 'Date', type: 'date' },
          { key: 'max_score', label: 'Max Score' },
        ]}
        filters={[{ key: 'course_id', label: 'Course', entity: 'courses' }]}
      />
      {detail && (
        <ChildTable title={`Results — ${detail.name}`} rows={detail._children?.results} columns={[
          { key: 'pupil_id', label: 'Pupil', ref: true },
          { key: 'score', label: 'Score' },
          { key: 'grade', label: 'Grade' },
          { key: 'notes', label: 'Notes' },
        ]} />
      )}
      {creating && (
        <RecordForm entity="exams" title="Exam" fields={examFields}
          onClose={() => setCreating(false)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
      {addingResult && (
        <RecordForm entity="exam_results" title="Exam Result" fields={resultFields}
          onClose={() => setAddingResult(false)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}
