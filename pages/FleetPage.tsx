
import React from 'react';
import { FleetManager } from '../components/FleetManager';
import { Aircraft, Flight, SystemSettings } from '../types';

interface FleetPageProps {
  fleet: (Aircraft & { _docId?: string })[];
  flights: Flight[];
  onAdd: (aircraft: Aircraft) => void;
  onUpdate: (docId: string, updates: Partial<Aircraft>) => void;
  features: SystemSettings;
}

export const FleetPage: React.FC<FleetPageProps> = (props) => {
  return <FleetManager {...props} />;
};
