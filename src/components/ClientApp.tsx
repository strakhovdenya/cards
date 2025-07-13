'use client';

import { useState, useEffect } from 'react';
import { ThemeProvider } from '../app/providers/ThemeProvider';
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
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

export default ClientApp;
