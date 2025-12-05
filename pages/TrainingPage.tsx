
import React from 'react';
import { TrainingManager } from '../components/TrainingManager';
import { useAppData } from '../context/DataContext';

export const TrainingPage: React.FC = () => {
  const { 
    crew, features,
    apiAddTrainingRecord, apiUpdateTrainingRecord, apiDeleteTrainingRecord,
    apiAddTrainingEvent, apiUpdateTrainingEvent, apiDeleteTrainingEvent
  } = useAppData();

  return (
    <TrainingManager 
        crew={crew} 
        features={features} 
        onAddRecord={apiAddTrainingRecord} 
        onUpdateRecord={apiUpdateTrainingRecord} 
        onDeleteRecord={apiDeleteTrainingRecord} 
        onAddEvent={apiAddTrainingEvent} 
        onUpdateEvent={apiUpdateTrainingEvent} 
        onDeleteEvent={apiDeleteTrainingEvent} 
    />
  );
};
