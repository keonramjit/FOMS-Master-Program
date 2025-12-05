
import React from 'react';
import { TrainingManager } from '../components/TrainingManager';
import { CrewMember, SystemSettings, TrainingRecord, TrainingEvent } from '../types';

interface TrainingPageProps {
  crew: (CrewMember & { _docId?: string })[];
  features: SystemSettings;
  onAddRecord: (r: Omit<TrainingRecord, 'id'>) => Promise<void>;
  onUpdateRecord: (id: string, r: Partial<TrainingRecord>) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onAddEvent: (e: Omit<TrainingEvent, 'id'>) => Promise<void>;
  onUpdateEvent: (id: string, e: Partial<TrainingEvent>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

export const TrainingPage: React.FC<TrainingPageProps> = (props) => {
  return <TrainingManager {...props} />;
};
