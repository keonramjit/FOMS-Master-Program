
import React from 'react';
import { 
  LayoutDashboard, 
  Plane, 
  Users, 
  PlaneTakeoff,
  X,
  Calendar,
  Shield,
  Map,
  Briefcase,
  ClipboardList,
  LogOut,
  ChevronLeft,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SystemSettings } from '../types';

interface SidebarProps {
  onLogout: () => void;
  userEmail?: string | null;
  isOpen: boolean;
  onClose: () => void;
  features: SystemSettings;
  isDesktopOpen: boolean;
  onDesktopToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onLogout, 
  userEmail,
  isOpen,
  onClose,
  features,
  isDesktopOpen,
  onDesktopToggle
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine if we are in "mini" mode (desktop only and closed)
  const isCollapsed = !isDesktopOpen;

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 h-full bg-slate-900 text-white flex flex-col z-30 shadow-2xl
        transition-all duration-300 ease-in-out
        w-64
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        ${isDesktopOpen ? 'lg:w-64' : 'lg:w-20'}
      `}>
        {/* Header */}
        <div className={`
            h-20 flex items-center border-b border-slate-700 relative transition-all duration-300
            ${isCollapsed ? 'justify-center px-0' : 'px-6 justify-between'}
        `}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/50">
               <PlaneTakeoff className="text-white" size={24} />
            </div>
            <div className={`transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
              <h1 className="font-bold text-lg leading-tight tracking-wide whitespace-nowrap">FOMS</h1>
              <p className="text-xs text-slate-400 font-medium tracking-wider whitespace-nowrap">FLIGHT OPS</p>
            </div>
          </div>
          
          {/* Mobile Close Button */}
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>

          {/* Desktop Toggle Button - Floating on Edge */}
          <button 
            onClick={onDesktopToggle}
            className={`
                hidden lg:flex absolute -right-3 top-8 bg-slate-800 text-slate-400 hover:text-white 
                w-6 h-6 rounded-full items-center justify-center border border-slate-600 shadow-md transition-colors z-50
                ${isCollapsed ? 'rotate-180' : ''}
            `}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <ChevronLeft size={14} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-2 mt-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={location.pathname === '/'} 
            onClick={() => handleNavigate('/')}
            collapsed={isCollapsed}
          />
          
          {features.enableFlightPlanning && (
            <NavItem 
                icon={<Calendar size={20} />} 
                label="Planning" 
                active={location.pathname === '/planning'} 
                onClick={() => handleNavigate('/planning')}
                collapsed={isCollapsed}
            />
          )}

          {features.enableDispatch && (
            <NavItem 
                icon={<ClipboardList size={20} />} 
                label="Dispatch" 
                active={location.pathname === '/dispatch'} 
                onClick={() => handleNavigate('/dispatch')}
                collapsed={isCollapsed}
            />
          )}

          {features.enableVoyageReports && (
            <NavItem 
                icon={<BookOpen size={20} />} 
                label="Voyage Report" 
                active={location.pathname === '/voyage'} 
                onClick={() => handleNavigate('/voyage')}
                collapsed={isCollapsed}
            />
          )}
          
          {features.enableCrewManagement && (
            <NavItem 
                icon={<Users size={20} />} 
                label="Crew" 
                active={location.pathname === '/crew'} 
                onClick={() => handleNavigate('/crew')}
                collapsed={isCollapsed}
            />
          )}

          {features.enableTrainingManagement && (
            <NavItem 
                icon={<GraduationCap size={20} />} 
                label="Training" 
                active={location.pathname === '/training'} 
                onClick={() => handleNavigate('/training')}
                collapsed={isCollapsed}
            />
          )}
          
          {features.enableFleetManagement && (
            <NavItem 
                icon={<Plane size={20} />} 
                label="Fleet" 
                active={location.pathname === '/fleet'} 
                onClick={() => handleNavigate('/fleet')}
                collapsed={isCollapsed}
            />
          )}

          {features.enableRouteManagement && (
            <NavItem 
                icon={<Map size={20} />} 
                label="Routes" 
                active={location.pathname === '/routes'} 
                onClick={() => handleNavigate('/routes')}
                collapsed={isCollapsed}
            />
          )}

          {features.enableCustomerDatabase && (
            <NavItem 
                icon={<Briefcase size={20} />} 
                label="Customers" 
                active={location.pathname === '/customers'} 
                onClick={() => handleNavigate('/customers')}
                collapsed={isCollapsed}
            />
          )}

          <div className="pt-4 mt-2 border-t border-slate-700/50">
            <NavItem 
                icon={<Shield size={20} />} 
                label="Admin" 
                active={location.pathname === '/admin'} 
                onClick={() => handleNavigate('/admin')}
                collapsed={isCollapsed}
            />
          </div>
        </nav>

        {/* User Footer */}
        <div className={`border-t border-slate-700 transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
            {!isCollapsed && (
                <div className="mb-3 px-2 text-[10px] font-mono text-slate-500 text-center tracking-widest opacity-60 whitespace-nowrap overflow-hidden">
                {features.systemVersion || 'V11282025|1030'}
                </div>
            )}
          
          <div className={`flex items-center gap-3 rounded-lg bg-slate-800/50 border border-slate-700 ${isCollapsed ? 'p-1.5 justify-center border-none bg-transparent' : 'p-3'}`}>
            <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold uppercase shrink-0 shadow-sm border border-slate-500" title={userEmail || 'User'}>
              {userEmail ? userEmail[0] : 'U'}
            </div>
            
            {!isCollapsed && (
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={userEmail || 'User'}>
                        {userEmail?.split('@')[0] || 'Ops User'}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <p className="text-xs text-slate-400">Online</p>
                    </div>
                </div>
            )}
          </div>

          <button 
            onClick={onLogout}
            className={`
                mt-2 flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors w-full
                ${isCollapsed ? 'p-2' : 'p-2 text-xs font-bold uppercase tracking-wide'}
            `}
            title="Log Out"
          >
              <LogOut size={16} /> 
              {!isCollapsed && "Log Out"}
          </button>
        </div>
      </aside>
    </>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; collapsed?: boolean }> = ({ 
    icon, label, active, onClick, collapsed 
}) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`
        flex items-center gap-3 rounded-lg transition-all duration-200 group relative
        ${collapsed ? 'justify-center px-2 py-3' : 'px-4 py-3 w-full'}
        ${active
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }
    `}
  >
    <div className="shrink-0">{icon}</div>
    
    {!collapsed && (
        <>
            <span className="font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-200">{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-glow" />}
        </>
    )}
  </button>
);
