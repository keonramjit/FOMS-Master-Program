
import React from 'react';
import { RouteManager } from '../components/RouteManager';
import { RouteDefinition, LocationDefinition, SystemSettings } from '../types';

interface RoutePageProps {
  routes: RouteDefinition[];
  locations?: LocationDefinition[];
  onAddRoute: (route: Omit<RouteDefinition, 'id'>) => Promise<void>;
  onUpdateRoute: (id: string, route: Partial<RouteDefinition>) => Promise<void>;
  onDeleteRoute: (id: string) => Promise<void>;
  onAddLocation?: (location: Omit<LocationDefinition, 'id'>) => Promise<void>;
  onUpdateLocation?: (id: string, location: Partial<LocationDefinition>) => Promise<void>;
  onDeleteLocation?: (id: string) => Promise<void>;
  features: SystemSettings;
}

export const RoutePage: React.FC<RoutePageProps> = (props) => {
  return <RouteManager {...props} />;
};
