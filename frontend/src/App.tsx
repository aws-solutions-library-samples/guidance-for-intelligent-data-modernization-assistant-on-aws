import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import AppLayout from './components/Layout/AppLayout';
import PersonalBot from './components/PersonalBot/PersonalBot';
import DataAnalytics from './components/DataAnalytics/DataAnalytics';
import DatabaseMigration from './components/DatabaseMigration/DatabaseMigration';
import ModernDataStrategy from './components/ModernDataStrategy/ModernDataStrategy';
// Apply Cloudscape light mode
applyMode(Mode.Light);

function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/bot" element={<PersonalBot />} />
          <Route path="/analytics" element={<DataAnalytics />} />
          <Route path="/database" element={<DatabaseMigration />} />
          <Route path="/" element={<Navigate to="/bot" replace />} />
          <Route path="/strategy" element={<ModernDataStrategy />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}

export default App; 