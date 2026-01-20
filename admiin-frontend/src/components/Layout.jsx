// Layout component copied from main frontend for admin UI base
import React from 'react';

const Layout = ({ children }) => (
  <div className="layout">
    {/* Add admin-specific header/sidebar here if needed */}
    {children}
  </div>
);

export default Layout;
