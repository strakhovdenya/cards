// DEL_RALPH: dead code since feat:auth replaced ClientApp with AuthenticatedApp in page.tsx (973e2c4); hydration handling moved to ThemeProvider.tsx useServerInsertedHTML
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
