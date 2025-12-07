
import React from 'react';
import { SettingsManager } from '../components/SettingsManager';
import { useAppData } from '../context/DataContext';

export const SettingsPage: React.FC = () => {
  const { 
    routes, customers, features,
    addRoute, updateRoute, deleteRoute,
    addCustomer, updateCustomer, deleteCustomer 
  } = useAppData();

  return (
    <SettingsManager 
        routes={routes} 
        customers={customers}
        onAddRoute={addRoute} 
        onUpdateRoute={updateRoute} 
        onDeleteRoute={deleteRoute} 
        onAddCustomer={addCustomer} 
        onUpdateCustomer={updateCustomer} 
        onDeleteCustomer={deleteCustomer} 
        features={features} 
    />
  );
};
