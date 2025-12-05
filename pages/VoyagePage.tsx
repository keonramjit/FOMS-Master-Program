
import React from 'react';
import { VoyageReportManager } from '../components/VoyageReportManager';
import { Flight, Aircraft, CrewMember } from '../types';

interface VoyagePageProps {
  flights: Flight[];
  fleet: Aircraft[];
  crew: (CrewMember & { _docId?: string })[];
  currentDate: string;
  isEnabled: boolean;
  onDateChange: (date: string) => void;
}

export const VoyagePage: React.FC<VoyagePageProps> = (props) => {
  return <VoyageReportManager {...props} />;
};
