// components/DatabaseMigration/context/MigrationContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiResponse, WaveJsonData, PortfolioHours, WaveMetrics } from '../types';

// Define interfaces for your form and wave planning data
interface FormData {
  applicationName: string;
  description: string;
  businessCriticality: string;
  cotsSoftware: string;
  complexityCategory: string;
  databaseEngine: string;
  disasterRecovery: string;
  dbSize: string;
  migrationConsiderations: string;
}

// Define the shape of your context
interface MigrationContextType {
  // API Response state
  result: ApiResponse | null;
  setResult: React.Dispatch<React.SetStateAction<ApiResponse | null>>;
  
  // Active tab state
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  
  // Form data state
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  
  // Wave planning data state
  waveJsonData: WaveJsonData | null;
  setWaveJsonData: React.Dispatch<React.SetStateAction<WaveJsonData | null>>;

  isStrategyGenerated: boolean;
  setIsStrategyGenerated: React.Dispatch<React.SetStateAction<boolean>>;
  
}

// Initial values for your forms
const initialFormData: FormData = {
  applicationName: '',
  description: '',
  businessCriticality: '',
  cotsSoftware: '',
  complexityCategory: '',
  databaseEngine: '',
  disasterRecovery: 'N',
  dbSize: '',
  migrationConsiderations: ''
};

// const initialWaveFormData: WaveFormData = {
//   duration: 3,
//   developers: 6,
//   developerCharge: 138.0,
//   showTimeline: false
// };

// Create the context
const MigrationContext = createContext<MigrationContextType | undefined>(undefined);

// Create the provider component
export const MigrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State for API response
  const [result, setResult] = useState<ApiResponse | null>(null);
  
  // State for active tab
  const [activeTabId, setActiveTabId] = useState('userInput');
  
  // State for form data
  const [formData, setFormData] = useState<FormData>(initialFormData);
  
  // State for wave planning data
  const [waveJsonData, setWaveJsonData] = useState<WaveJsonData | null>(null);
  const [isStrategyGenerated, setIsStrategyGenerated] = useState(false);

  useEffect(() => {
    if (result?.wave_json) {
      setWaveJsonData(result.wave_json);
    }
  }, [result]);

  const handleSetResult = (newResult: ApiResponse | null) => {
    setResult(newResult);
    setIsStrategyGenerated(!!newResult?.migration_strategy);
  };

  const value = {
    result,
    setResult,
    activeTabId,
    setActiveTabId,
    formData,
    setFormData,
    waveJsonData,
    setWaveJsonData,
    isStrategyGenerated,
    setIsStrategyGenerated,
  };
 

  return (
    <MigrationContext.Provider value={value}>
      {children}
    </MigrationContext.Provider>
  );
};

// Custom hook to use the context
export const useMigrationContext = () => {
  const context = useContext(MigrationContext);
  if (!context) {
    throw new Error('useMigrationContext must be used within a MigrationProvider');
  }
  return context;
};

export default MigrationContext;
