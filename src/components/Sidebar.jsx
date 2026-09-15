import React from 'react';
import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Package, FileText, Settings, LogOut, History } from 'lucide-react';
import { LayoutDashboard, Package, FileText, Settings as SettingsIcon, LogOut, History } from 'lucide-react';
import { supabase } from '../services/supabase';

export const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});

  useEffect(() => {
    fetchSettings();
    
    const handleSettingsUpdate = () => {
      fetchSettings();
    };
    
    window.addEventListener('settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate);
    };
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('settings').select('logo_url, company_name').limit(1).single();
      if (data) setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings in sidebar:', error);
    }
  };

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
    { to: '/settings', icon: <SettingsIcon size={20} />, label: 'Settings' },
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
        className="p-4 md:p-6 border-b flex flex-col items-start gap-4" 
        style={{ 
          fontFamily: 'var(--font-serif)', 
          borderColor: 'var(--bg-sidebar-hover)',
          color: 'var(--accent-primary)'
        }}
      >
        Stock Billing
        {settings.logo_url && (
          <img 
            src={settings.logo_url} 
            alt="Company Logo" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '48px', 
              objectFit: 'contain',
              borderRadius: '6px'
            }} 
          />
        )}
        <div 
          className="text-2xl font-bold"
          style={{ 
            fontFamily: 'var(--font-serif)', 
            color: 'var(--accent-primary)'
          }}
        >
          {settings.company_name || 'Stock Billing'}
        </div>
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
