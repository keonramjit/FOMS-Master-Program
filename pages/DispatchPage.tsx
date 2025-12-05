
import React from 'react';
import { DispatchManager } from '../components/DispatchManager';
import { useAppData } from '../context/DataContext';

export const DispatchPage: React.FC = () => {
  const { flights, fleet, crew, currentDate, features, setCurrentDate } = useAppData();

  return (
    <DispatchManager 
        flights={flights} 
        fleet={fleet} 
        crew={crew} 
        currentDate={currentDate} 
        isEnabled={features.enableDispatch} 
        onDateChange={setCurrentDate} 
        features={features} 
    />
  );
};
