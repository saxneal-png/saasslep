'use client';

import React, { useState } from 'react';
import { NavbarContextual, UserRoleContext } from '@/components/ui/NavbarContextual';
import { ListaDinamicaDocentes, DocenteItem } from '@/components/ui/ListaDinamicaDocentes';
import { ShieldAlert, Users, Award, BookOpen } from 'lucide-react';

const DOCENTES_DEMO: DocenteItem[] = [
  {
    rut: '12.345.678-5',
    nombres: 'María Paz',
    apellidos: 'González López',
    rbd: '101',
    escuelaNombre: 'Liceo Polivalente Manuel Bulnes',
    horasContrato: 44,
    horasPedagogicasAsignadas: 38,
    tramoCarrera: 'Avanzado',
    tipoContrato: 'Planta',
    asignaturaPrincipal: 'Lengua y Literatura'
  },
  {
    rut: '11.111.111-1',
    nombres: 'Carlos Eduardo',
    apellidos: 'Rojas Sepúlveda',
    rbd: '101',
    escuelaNombre: 'Liceo Polivalente Manuel Bulnes',
    horasContrato: 44,
    horasPedagogicasAsignadas: 39, // Sobreasignado
    tramoCarrera: 'Inicial',
    tipoContrato: 'Contrata',
    asignaturaPrincipal: 'Matemática'
  },
  {
    rut: '9.876.543-2',
    nombres: 'Patricia Elena',
    apellidos: 'Silva Morales',
    rbd: '102',
    escuelaNombre: 'Escuela E-250 San Ignacio',
    horasContrato: 30,
    horasPedagogicasAsignadas: 15, // Vacante
    tramoCarrera: 'Experto I',
    tipoContrato: 'Contrata',
    asignaturaPrincipal: 'Ciencias Naturales'
  },
  {
    rut: '14.567.890-K',
    nombres: 'Fernando',
    apellidos: 'Muñoz Alarcón',
    rbd: '103',
    escuelaNombre: 'Liceo Arturo Prat Chacón',
    horasContrato: 44,
    horasPedagogicasAsignadas: 38,
    tramoCarrera: 'Experto II',
    tipoContrato: 'Planta',
    asignaturaPrincipal: 'Historia y Geografía'
  },
  {
    rut: '15.678.901-2',
    nombres: 'Daniela Andrea',
    apellidos: 'Vargas Castro',
    rbd: '102',
    escuelaNombre: 'Escuela E-250 San Ignacio',
    horasContrato: 20,
    horasPedagogicasAsignadas: 17,
    tramoCarrera: 'Temprano',
    tipoContrato: 'Contrata',
    asignaturaPrincipal: 'Inglés'
  }
];

export default function RrhhDotacionPage() {
  const [rol, setRol] = useState<UserRoleContext>('sostenedor');
  const [pestaña, setPestaña] = useState<string>('rrhh');
  const [selectedDocente, setSelectedDocente] = useState<DocenteItem | null>(null);

  const alertasCount = DOCENTES_DEMO.filter(d => d.horasPedagogicasAsignadas > (d.horasContrato * 0.86)).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navegación Multinivel Encadenada por Rol */}
      <NavbarContextual
        rolActivo={rol}
        pestañaActiva={pestaña}
        onCambiarPestaña={setPestaña}
        onCambiarRol={setRol}
        alertasRiesgoCount={alertasCount}
      />

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Banner Macro / Resumen Rápido */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200/90 shadow-sm bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
              Fase 4: Modernización UX/UI & Listas Dinámicas
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">Gestión de Dotación y Planta Docente</h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Panel unificado con filtros multidimensionales, semáforo de cumplimiento 65/35 y vistas alternables para UATP y Equipos Directivos.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-xs">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-lg text-amber-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-slate-400">Total Docentes</span>
                <span className="text-base font-bold text-white">{DOCENTES_DEMO.length}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-lg text-emerald-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-slate-400">Cumplimiento 65/35</span>
                <span className="text-base font-bold text-emerald-400">80% Ok</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-lg text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-slate-400">Semáforo Rojo</span>
                <span className="text-base font-bold text-rose-400">{alertasCount} Docente(s)</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-lg text-blue-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-slate-400">Escuelas SLEP</span>
                <span className="text-base font-bold text-white">3 RBDs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Componente de Listas Dinámicas */}
        <ListaDinamicaDocentes
          docentes={DOCENTES_DEMO}
          onSelectDocente={(docente) => setSelectedDocente(docente)}
          onExportarCSV={() => alert('Generando reporte CSV de la lista filtrada...')}
        />

        {/* Modal de Detalle de Docente */}
        {selectedDocente && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="glass-panel bg-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900">Ficha del Docente</h3>
                <button
                  onClick={() => setSelectedDocente(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold px-2 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p><strong className="text-slate-700">Nombre:</strong> {selectedDocente.nombres} {selectedDocente.apellidos}</p>
                <p><strong className="text-slate-700">RUT:</strong> {selectedDocente.rut}</p>
                <p><strong className="text-slate-700">Escuela (RBD):</strong> {selectedDocente.escuelaNombre} ({selectedDocente.rbd})</p>
                <p><strong className="text-slate-700">Contrato:</strong> {selectedDocente.horasContrato} hrs ({selectedDocente.tipoContrato})</p>
                <p><strong className="text-slate-700">Tramo Carrera:</strong> {selectedDocente.tramoCarrera}</p>
                <p><strong className="text-slate-700">Asignatura Principal:</strong> {selectedDocente.asignaturaPrincipal || 'N/A'}</p>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  onClick={() => setSelectedDocente(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
