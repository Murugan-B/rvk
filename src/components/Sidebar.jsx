import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Package, FileText, Settings, LogOut, History } from 'lucide-react';

export const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/inventory', icon: <Package size={20} />, label: 'Inventory' },
    { to: '/billing', icon: <FileText size={20} />, label: 'Billing' },
    { to: '/billing-history', icon: <History size={20} />, label: 'Billing History' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <div 
      className="w-64 flex flex-col h-full shrink-0 print:hidden" 
      style={{ 
        background: 'var(--bg-sidebar)', 
        color: 'var(--text-inverse)', 
        fontFamily: 'var(--font-sans)',
        borderRight: '1px solid var(--bg-sidebar-hover)',
        transition: 'background 0.3s ease'
      }}
    >
      <div 
        className="p-4 md:p-6 text-2xl font-bold border-b" 
        style={{ 
          fontFamily: 'var(--font-serif)', 
          borderColor: 'var(--bg-sidebar-hover)',
          color: 'var(--accent-primary)'
        }}
      >
        Stock Billing
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 p-3 rounded-lg transition-all duration-150 ${
                isActive ? 'shadow-sm' : 'hover:bg-slate-800'
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? 'var(--bg-sidebar-hover)' : 'transparent',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-light)',
            })}
          >
            {item.icon}
            <span className="font-medium tracking-wide text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t" style={{ borderColor: 'var(--bg-sidebar-hover)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 p-3 w-full rounded-lg transition-all duration-150 hover:bg-slate-800"
          style={{ color: '#F87171' }}
        >
          <LogOut size={20} />
          <span className="font-medium tracking-wide text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
};
