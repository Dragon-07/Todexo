import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Todexo - Task Manager',
  description: 'A premium dark mode task manager.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} bg-gradient-abstract text-on-surface min-h-screen transition-colors duration-300`}>
        {children}
        {/* Usamos afterInteractive para que el script no estorbe la hidratación inicial y evite el error de consola */}
        <Script id="theme-handler" strategy="afterInteractive">
          {`
            try {
              const theme = localStorage.getItem('theme');
              const supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (theme === 'dark' || (!theme && supportDarkMode)) {
                document.documentElement.classList.add('dark');
              } else if (theme === 'light') {
                document.documentElement.classList.remove('dark');
              } else {
                document.documentElement.classList.add('dark');
              }
            } catch (e) {}
          `}
        </Script>
      </body>
    </html>
  );
}
