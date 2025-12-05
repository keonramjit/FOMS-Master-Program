
import React from 'react';
import { FlightPlanning } from '../components/FlightPlanning';
import { useAppData } from '../context/DataContext';

export const PlanningPage: React.FC = () => {
  const { 
    currentDate, setCurrentDate, flights, fleet, crew, routes, customers,
    addFlight, updateFlight, deleteFlight 
  } = useAppData();

  return (
    <FlightPlanning
      currentDate={currentDate}
      onDateChange={setCurrentDate}
      flights={flights}
      fleet={fleet}
      crew={crew}
      routes={routes}
      customers={customers}
      onAddFlight={addFlight}
      onUpdateFlight={updateFlight}
      onDeleteFlight={deleteFlight}
    />
  );
};
