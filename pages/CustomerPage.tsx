
import React from 'react';
import { CustomerManager } from '../components/CustomerManager';
import { useAppData } from '../context/DataContext';

export const CustomerPage: React.FC = () => {
  const { customers, features, addCustomer, updateCustomer, deleteCustomer } = useAppData();

  return (
    <CustomerManager 
        customers={customers} 
        onAddCustomer={addCustomer} 
        onUpdateCustomer={updateCustomer} 
        onDeleteCustomer={deleteCustomer} 
        features={features} 
    />
  );
};
