
import React from 'react';
import { CrewManager } from '../components/CrewManager';
import { CrewMember, Flight, RouteDefinition, SystemSettings } from '../types';

interface CrewPageProps {
  crewRoster: (CrewMember & { _docId?: string })[];
  flights: Flight[];
  routes: RouteDefinition[];
  onAdd: (member: CrewMember) => void;
  onUpdate: (docId: string, member: Partial<CrewMember>) => void;
  features: SystemSettings;
}

export const CrewPage: React.FC<CrewPageProps> = (props) => {
  return <CrewManager {...props} />;
};
