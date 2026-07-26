'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/supabase';

interface AppLogoProps {
  width?: number;
  height?: number;
  className?: string;
  fallbackText?: string;
  lightTheme?: boolean;
}

export default function AppLogo({
  width = 120,
  height = 45,
  className = 'object-contain',
  fallbackText = 'PLATAFORMA SLEP',
  lightTheme = false
}: AppLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLogo = async () => {
    try {
      const custom = await api.getCustomLogo();
      setLogoUrl(custom);
    } catch {
      setLogoUrl(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogo();

    const handleUpdate = () => {
      loadLogo();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('logoUpdated', handleUpdate);
      window.addEventListener('storage', handleUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('logoUpdated', handleUpdate);
        window.removeEventListener('storage', handleUpdate);
      }
    };
  }, []);

  if (loading) {
    return <div className="h-9 w-28 bg-white/10 animate-pulse rounded" />;
  }

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Logo Institucional"
        style={{ maxWidth: width, maxHeight: height }}
        className={`object-contain ${className}`}
      />
    );
  }

  return (
    <div className={`flex items-center gap-2 font-black text-xs uppercase tracking-wider ${lightTheme ? 'text-slate-800' : 'text-white'}`}>
      <span className={`px-2 py-1 rounded-lg text-sm font-bold shadow-sm ${lightTheme ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white/15 text-white border border-white/20'}`}>
        🏛️
      </span>
      <span className="font-extrabold">{fallbackText}</span>
    </div>
  );
}
