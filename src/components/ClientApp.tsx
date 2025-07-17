'use client';

import { useState, useEffect } from 'react';
import { CustomThemeProvider } from './ThemeProvider';
import { App } from './App';

function ClientApp() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <CustomThemeProvider>
      <App />
    </CustomThemeProvider>
  );
}

export default ClientApp;
