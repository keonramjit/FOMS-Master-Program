
import React from 'react';
import { RouteManager } from '../components/RouteManager';
import { useAppData } from '../context/DataContext';

export const RoutePage: React.FC = () => {
  const { 
    routes, locations, features,
    addRoute, updateRoute, deleteRoute,
    addLocation, updateLocation, deleteLocation 
  } = useAppData();

  return (
    <RouteManager 
        routes={routes} 
        locations={locations}
        onAddRoute={addRoute} 
        onUpdateRoute={updateRoute} 
        onDeleteRoute={deleteRoute} 
        onAddLocation={addLocation}
        onUpdateLocation={updateLocation}
        onDeleteLocation={deleteLocation}
        features={features} 
    />
  );
};
