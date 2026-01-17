import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import ProjectListView from './pages/ProjectListView';
import ProjectDetailView from './pages/ProjectDetailView';
import Dashboard from './pages/Dashboard'; // Keeping the old dashboard for reference if needed

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<ProjectListView />} />
          <Route path="projects/:id" element={<ProjectDetailView />} />
          <Route path="settings" element={<div className="p-6">Settings Page (Coming Soon)</div>} />
          {/* Legacy route */}
          <Route path="legacy-dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
