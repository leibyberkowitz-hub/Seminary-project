import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from '../shared/ui.jsx';
import Home from './pages/Home.jsx';
import RollCall from './pages/RollCall.jsx';
import AttendanceLog from './pages/AttendanceLog.jsx';
import Pupils from './pages/Pupils.jsx';
import PupilDetail from './pages/PupilDetail.jsx';
import Courses from './pages/Courses.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import Exams from './pages/Exams.jsx';
import Applications from './pages/Applications.jsx';
import Diary from './pages/Diary.jsx';
import Tasks from './pages/Tasks.jsx';

const nav = [
  { title: 'Attendance', items: [
    { to: '/', label: 'Overview' },
    { to: '/rollcall', label: 'Daily Roll Call' },
    { to: '/log', label: 'Late / Missed Log' },
  ]},
  { title: 'Academic', items: [
    { to: '/pupils', label: 'Pupils' },
    { to: '/courses', label: 'Courses' },
    { to: '/exams', label: 'Exams' },
  ]},
  { title: 'Admissions', items: [
    { to: '/applications', label: 'Applications' },
  ]},
  { title: 'Scheduling', items: [
    { to: '/diary', label: 'Diary' },
    { to: '/tasks', label: 'Tasks' },
  ]},
];

export default function App() {
  return (
    <Layout appName="Attendance" accent="#2563eb" nav={nav}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rollcall" element={<RollCall />} />
        <Route path="/log" element={<AttendanceLog />} />
        <Route path="/pupils" element={<Pupils />} />
        <Route path="/pupils/:id" element={<PupilDetail />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/diary" element={<Diary />} />
        <Route path="/tasks" element={<Tasks />} />
      </Routes>
    </Layout>
  );
}
