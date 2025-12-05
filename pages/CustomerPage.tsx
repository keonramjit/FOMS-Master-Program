
import React from 'react';
import { CustomerManager } from '../components/CustomerManager';
import { CustomerDefinition, SystemSettings } from '../types';

interface CustomerPageProps {
  customers: CustomerDefinition[];
  onAddCustomer: (customer: Omit<CustomerDefinition, 'id'>) => Promise<void>;
  onUpdateCustomer: (id: string, customer: Partial<CustomerDefinition>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  features: SystemSettings;
}

export const CustomerPage: React.FC<CustomerPageProps> = (props) => {
  return <CustomerManager {...props} />;
};
