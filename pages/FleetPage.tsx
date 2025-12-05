
import React from 'react';
import { FleetManager } from '../components/FleetManager';
import { useAppData } from '../context/DataContext';

export const FleetPage: React.FC = () => {
  const { fleet, flights, addAircraft, updateAircraft, features } = useAppData();

  return (
    <FleetManager 
        fleet={fleet} 
        flights={flights} 
        onAdd={addAircraft} 
        onUpdate={updateAircraft} 
        features={features} 
    />
  );
};
