
import React from 'react';
import { DispatchManager } from '../components/DispatchManager';
import { Flight, Aircraft, CrewMember, SystemSettings } from '../types';

interface DispatchPageProps {
  flights: Flight[];
  fleet: Aircraft[];
  crew: (CrewMember & { _docId?: string })[];
  currentDate: string;
  isEnabled: boolean;
  onDateChange: (date: string) => void;
  features: SystemSettings;
}

export const DispatchPage: React.FC<DispatchPageProps> = (props) => {
  return <DispatchManager {...props} />;
};
