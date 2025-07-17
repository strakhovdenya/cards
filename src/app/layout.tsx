import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CustomThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'German Word Cards',
  description: 'Мобильное приложение для изучения немецких слов по карточкам',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1976d2',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <CustomThemeProvider>{children}</CustomThemeProvider>
      </body>
    </html>
  );
}
