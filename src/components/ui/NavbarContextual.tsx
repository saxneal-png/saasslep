'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  DollarSign, 
  Users, 
  ShieldAlert, 
  FileText, 
  School, 
  Calendar, 
  UserCheck, 
  BookOpen, 
  Clock, 
  CalendarDays, 
  FileSignature,
  Building2,
  GraduationCap,
  User,
  HeartHandshake
} from 'lucide-react';

export type UserRoleContext = 'sostenedor' | 'escuela' | 'profesional';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeColor?: 'red' | 'emerald' | 'amber' | 'blue';
}

export interface NavbarContextualProps {
  rolActivo: UserRoleContext;
  pestañaActiva: string;
  onCambiarPestaña: (tabId: string) => void;
  onCambiarRol?: (nuevoRol: UserRoleContext) => void;
  alertasRiesgoCount?: number;
}

export const TABS_POR_ROL: Record<UserRoleContext, TabItem[]> = {
  sostenedor: [
    { id: 'macro', label: 'Dashboard Macro', icon: LayoutDashboard },
    { id: 'finanzas', label: 'Finanzas & Subvención', icon: DollarSign },
    { id: 'rrhh', label: 'RRHH & Dotación', icon: Users },
    { id: 'uatp', label: 'Auditoría UATP', icon: ShieldAlert, badgeColor: 'red' },
    { id: 'resoluciones', label: 'Resoluciones', icon: FileText }
  ],
  escuela: [
    { id: 'rbd', label: 'Resumen RBD', icon: School },
    { id: 'horarios', label: 'Matriz de Horarios', icon: Calendar },
    { id: 'planta', label: 'Planta Docente', icon: UserCheck },
    { id: 'cursos', label: 'Cursos & Carga', icon: BookOpen },
    { id: 'pie_sep', label: 'Programas PIE/SEP', icon: HeartHandshake }
  ],
  profesional: [
    { id: 'jornada', label: 'Mi Jornada (65/35)', icon: Clock },
    { id: 'horario_semanal', label: 'Mi Horario Semanal', icon: CalendarDays },
    { id: 'anexos', label: 'Anexos de Contrato', icon: FileSignature }
  ]
};

export const ROL_INFO: Record<UserRoleContext, { nombre: string; icon: any; colorBg: string; colorText: string }> = {
  sostenedor: { nombre: 'Vista Sostenedor SLEP', icon: Building2, colorBg: 'bg-blue-900', colorText: 'text-blue-100' },
  escuela: { nombre: 'Vista Establecimiento / UTP', icon: GraduationCap, colorBg: 'bg-emerald-900', colorText: 'text-emerald-100' },
  profesional: { nombre: 'Vista Docente / Profesional', icon: User, colorBg: 'bg-amber-900', colorText: 'text-amber-100' }
};

export function NavbarContextual({
  rolActivo,
  pestañaActiva,
  onCambiarPestaña,
  onCambiarRol,
  alertasRiesgoCount = 0
}: NavbarContextualProps) {
  const tabs = TABS_POR_ROL[rolActivo] || TABS_POR_ROL.sostenedor;
  const rolConfig = ROL_INFO[rolActivo];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 border-b border-slate-200/80 shadow-xs transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Selector de Rol / Identificador */}
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs ${rolConfig.colorBg} ${rolConfig.colorText}`}>
              <rolConfig.icon className="w-4 h-4" />
              <span>{rolConfig.nombre}</span>
            </div>

            {onCambiarRol && (
              <div className="hidden sm:flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => onCambiarRol('sostenedor')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${rolActivo === 'sostenedor' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Sostenedor
                </button>
                <button
                  onClick={() => onCambiarRol('escuela')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${rolActivo === 'escuela' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Escuela
                </button>
                <button
                  onClick={() => onCambiarRol('profesional')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${rolActivo === 'profesional' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Docente
                </button>
              </div>
            )}
          </div>

          {/* Estado Global / Semáforo Badge */}
          {alertasRiesgoCount > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-xs font-medium animate-pulse">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>{alertasRiesgoCount} Docente(s) en Semáforo Rojo</span>
            </div>
          )}
        </div>

        {/* Pestañas de Navegación Contextual Encadenada */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar pt-1 pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = pestañaActiva === tab.id;
            const badgeValue = tab.id === 'uatp' && alertasRiesgoCount > 0 ? alertasRiesgoCount : tab.badge;

            return (
              <button
                key={tab.id}
                onClick={() => onCambiarPestaña(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>

                {badgeValue !== undefined && (
                  <span
                    className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tab.badgeColor === 'red' || (tab.id === 'uatp' && alertasRiesgoCount > 0)
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {badgeValue}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
