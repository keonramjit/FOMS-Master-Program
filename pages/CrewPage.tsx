
import React from 'react';
import { CrewManager } from '../components/CrewManager';
import { useAppData } from '../context/DataContext';

export const CrewPage: React.FC = () => {
  const { crew, flights, routes, addCrew, updateCrew, features } = useAppData();

  return (
    <CrewManager 
        crewRoster={crew} 
        flights={flights} 
        routes={routes} 
        onAdd={addCrew} 
        onUpdate={updateCrew} 
        features={features} 
    />
  );
};
