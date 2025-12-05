
import React from 'react';
import { VoyageReportManager } from '../components/VoyageReportManager';
import { useAppData } from '../context/DataContext';

export const VoyagePage: React.FC = () => {
  const { flights, fleet, crew, currentDate, features, setCurrentDate } = useAppData();

  return (
    <VoyageReportManager 
        flights={flights} 
        fleet={fleet} 
        crew={crew} 
        currentDate={currentDate} 
        isEnabled={features.enableVoyageReports} 
        onDateChange={setCurrentDate} 
    />
  );
};
