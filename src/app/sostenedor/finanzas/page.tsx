// src/app/sostenedor/finanzas/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation'; // ✅ Importación correcta
import { api } from '@/lib/supabase';
import { Establecimiento, PlanEstudioNorm, CursoDinamico, AsignacionAula } from '@/lib/types';

export default function FinanzasPlanesPage() {
  const router = useRouter();

  // Estados de datos maestros
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [planesEstudio, setPlanesEstudio] = useState<PlanEstudioNorm[]>([]);
  const [cursosGlobales, setCursosGlobales] = useState<CursoDinamico[]>([]);
  const [asignacionesGlobales, setAsignacionesGlobales] = useState<AsignacionAula[]>([]);

  // Estados de UI y Filtros
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRbd, setSelectedRbd] = useState<string>('');

  useEffect(() => {
    async function loadFinanzasData() {
      setLoading(true);
      
      const allEsts = await api.getEstablecimientos();
      setEstablecimientos(allEsts);

      const allPlanes = await api.getPlanesEstudio();
      setPlanesEstudio(allPlanes);

      const allCursos = await api.getTodosLosCursosDinamicos();
      setCursosGlobales(allCursos);

      const allAsigs = await api.getTodasLasAsignaciones();
      setAsignacionesGlobales(allAsigs);

      if (allEsts.length > 0) {
        setSelectedRbd(allEsts[0].rbd);
      }

      setLoading(false);
    }
    loadFinanzasData();
  }, []);

  // Selección de escuela activa
  const escuelaSeleccionada = useMemo(() => {
    return establecimientos.find(e => e.rbd === selectedRbd) || null;
  }, [establecimientos, selectedRbd]);

  // Auditoría en tiempo real de los cursos del RBD seleccionado usando useMemo
  const informeAuditoriaCursos = useMemo(() => {
    if (!selectedRbd) return [];

    const cursosEscuela = cursosGlobales.filter(c => c.rbd === selectedRbd);

    return {
      totalCursos: cursosEscuela.length,
      desglose: cursosEscuela.map(curso => {
        // Encontrar el decreto normativo aplicable al nivel y régimen de la escuela
        const decreto = planesEstudio.find(p => 
          p.nivel === curso.nivel && p.regimen === curso.regimen
        );

        // Filtrar asignaciones asociadas a este curso específico
        const asignacionesCurso = asignacionesGlobales.filter(a => a.curso === curso.nombre);
        const horasCargadasAula = asignacionesCurso.reduce((sum, a) => sum + a.horas, 0);

        // Validaciones normativas
        const horasObligatoriasDecreto = decreto ? decreto.horasObligatorias : 38;
        const descalcePlanComun = horasCargadasAula - horasObligatoriasDecreto;
        const cumpleDecretoTotal = Math.abs(descalcePlanComun) <= 0.01;

        return {
          cursoNombre: curso.nombre,
          nivel: curso.nivel,
          regimen: curso.regimen,
          horasDecreto: horasObligatoriasDecreto,
          horasCargadas: horasCargadasAula,
          descalce: descalcePlanComun,
          cumple: cumpleDecretoTotal
        };
      })
    };
  }, [selectedRbd, cursosGlobales, planesEstudio, asignacionesGlobales]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-500">Compilando auditoría de planes de estudio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Encabezado Técnico */}
      <header className="bg-slate-900 text-white px-8 py-5 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/sostenedor')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl text-xs transition-colors"
          >
            ← Volver
          </button>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight">Auditoría Técnico-Pedagógica de Planes de Estudio</h1>
            <p className="text-xs text-slate-400">Control de Horas Normativas Declaradas en Aula vs Decretos MINEDUC</p>
          </div>
        </div>
      </header>

      {/* Contenedor Operativo */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6 flex-1">
        
        {/* Selector de RBD */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm">Filtro de Supervisión por Establecimiento</h3>
            <p className="text-[11px] text-slate-400">Selecciona una escuela del territorio para auditar el cumplimiento del Plan de Estudios.</p>
          </div>

          <select
            className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 min-w-[300px]"
            value={selectedRbd}
            onChange={(e) => setSelectedRbd(e.target.value)}
          >
            {establecimientos.map(e => (
              <option key={e.rbd} value={e.rbd}>RBD {e.rbd} — {e.nombre}</option>
            ))}
          </select>
        </div>

        {/* Resumen Analítico de la Escuela */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 text-xs shadow-sm">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Establecimiento Seleccionado</span>
            <span className="font-bold text-slate-800 block mt-1">{escuelaSeleccionada?.nombre}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 text-xs shadow-sm">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cursos Aperturados</span>
            <span className="font-black text-slate-800 text-base block mt-0.5">{(informeAuditoriaCursos as any).totalCursos || 0} Cursos Habilitados</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 text-xs shadow-sm">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estado de Subvenciones</span>
            <span className="font-bold block mt-1 text-emerald-600 flex items-center gap-1">
              🟢 Sin Retención Financiera
            </span>
          </div>
        </div>

        {/* Matriz de Informe de Cumplimiento */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Estado de Cumplimiento Horario por Curso</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-4">Curso</th>
                  <th className="p-4">Nivel Regulatorio</th>
                  <th className="p-4 text-center">Régimen</th>
                  <th className="p-4 text-center">Hrs. Decreto Obligatorias</th>
                  <th className="p-4 text-center">Hrs. Distribuidas en Aula</th>
                  <th className="p-4 text-center">Descalce Mineduc</th>
                  <th className="p-4 text-center">Estado Técnico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(informeAuditoriaCursos as any).desglose?.map((row: any) => (
                  <tr key={row.cursoNombre} className={`hover:bg-slate-50/50 transition-colors ${!row.cumple ? 'bg-rose-50/10' : ''}`}>
                    <td className="p-4 font-black text-slate-800 text-sm">{row.cursoNombre}</td>
                    <td className="p-4 text-slate-500 font-medium">{row.nivel}</td>
                    <td className="p-4 text-center">
                      <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                        {row.regimen}
                      </span>
                    </td>
                    <td className="p-4 text-center text-slate-700 font-bold">{row.horasDecreto} hrs</td>
                    <td className="p-4 text-center text-slate-700 font-bold">{row.horasCargadas} hrs</td>
                    <td className={`p-4 text-center font-mono font-bold ${row.descalce === 0 ? 'text-slate-400' : row.descalce > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                      {row.descalce === 0 ? '0' : row.descalce > 0 ? `+${row.descalce}` : row.descalce} hrs
                    </td>
                    <td className="p-4 text-center">
                      {row.cumple ? (
                        <span className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px]">
                          ✅ Plan Cuadrado
                        </span>
                      ) : (
                        <span className="text-rose-600 font-black bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full text-[10px] animate-pulse">
                          ⚠️ {row.descalce > 0 ? 'Exceso de Horas' : 'Déficit Horario'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!informeAuditoriaCursos || (informeAuditoriaCursos as any).desglose?.length === 0) && (
                  <tr>
                    <td colSpan={7} className="text-center p-12 text-slate-400 font-medium">No se registran cursos activos declarados por Dirección para este establecimiento.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
