
import React from 'react';
import { SubscriptionManagement } from '../components/SubscriptionManagement';
import { useAppData } from '../context/DataContext';

export const AdminPage: React.FC = () => {
  const { features, userProfile, updateLicense } = useAppData();

  return (
    <SubscriptionManagement 
        features={features}
        userProfile={userProfile}
        onUpdateLicense={updateLicense}
    />
  );
};
