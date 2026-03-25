'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import clsx from 'clsx';

export default function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Initial check for theme
    const isDark = document.documentElement.classList.contains('dark');
    const savedTheme = localStorage.getItem('theme');
    const actualTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : (isDark ? 'dark' : 'light');
    
    setTheme(actualTheme);
    if (actualTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <button 
      onClick={toggleTheme}
      className={clsx(
        "p-3 rounded-2xl bg-surface-container-high/80 backdrop-blur-xl text-on-surface-variant hover:text-primary border border-surface-variant/50 transition-all active:scale-95 shadow-lg ambient-shadow z-[100] group",
        className
      )}
      title={theme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        {theme === 'dark' ? (
          <Sun size={22} className="text-orange-400 animate-in zoom-in spin-in-90 duration-500" />
        ) : (
          <Moon size={22} className="text-secondary animate-in zoom-in spin-in-90 duration-500" />
        )}
      </div>
    </button>
  );
}
