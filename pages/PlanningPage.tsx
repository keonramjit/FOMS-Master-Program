
import React from 'react';
import { FlightPlanning } from '../components/FlightPlanning';
import { Flight, Aircraft, CrewMember, RouteDefinition, CustomerDefinition } from '../types';

interface PlanningPageProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  flights: Flight[];
  fleet: (Aircraft & { _docId?: string })[];
  crew: (CrewMember & { _docId?: string })[];
  routes: RouteDefinition[];
  customers: CustomerDefinition[];
  onAddFlight: (flight: Omit<Flight, 'id'>) => Promise<void>;
  onUpdateFlight: (id: string, updates: Partial<Flight>) => Promise<void>;
  onDeleteFlight: (id: string) => Promise<void>;
}

export const PlanningPage: React.FC<PlanningPageProps> = (props) => {
  return <FlightPlanning {...props} />;
};
