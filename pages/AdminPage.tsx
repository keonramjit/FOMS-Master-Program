
import React from 'react';
import { SubscriptionManagement } from '../components/SubscriptionManagement';
import { SystemSettings, UserProfile } from '../types';

interface AdminPageProps {
  features: SystemSettings;
  userProfile: UserProfile | null;
  onUpdateLicense: (settings: Partial<SystemSettings>) => Promise<void>;
}

export const AdminPage: React.FC<AdminPageProps> = (props) => {
  return <SubscriptionManagement {...props} />;
};
