import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const Layout = () => {
  return (
    <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible" style={{ background: 'var(--bg-main)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full relative transition-colors duration-300 print:overflow-visible">
        <Outlet />
      </main>
    </div>
  );
};
