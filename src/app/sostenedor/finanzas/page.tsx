// src/app/sostenedor/finanzas/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation'; // <-- Agregado 'next/'
import { api } from '@/lib/supabase';
import { Establecimiento, PlanEstudioNorm, CursoDinamico, AsignacionAula } from '@/lib/types';

export default function FinanzasPlanesPage() {
  const router = useRouter();

  // Estados de datos maestros
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [planesEstudio, setPlanesEstudio] = useState<PlanEstudioNorm[]>([]);
  const [cursosGlobales, setCursosGlobales] = useState<CursoDinamico[]>([]);
  const [asignacionesGlobales, setAsignacionesGlobales] = useState<AsignacionAula[]>([]);
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, dbLocal } from '@/lib/supabase';
import { 
  Establecimiento, 
  Contrato, 
  AsignacionAula, 
  Funcionario,
  RegistroRemuneracion
} from '@/lib/types';
import { parsearRemuneracionesCsv } from '@/lib/csvParser';
import { conciliarFuncionario } from '@/lib/rulesEngine';

export default function FinanzasPage() {
  const router = useRouter();
  
  // Guard & session
  const [authorized, setAuthorized] = useState(false);
  
  // Data lists
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAula[]>([]);
  const [remuneraciones, setRemuneraciones] = useState<RegistroRemuneracion[]>([]);
  
  // View logs and files
  const [uploadRemunLogs, setUploadRemunLogs] = useState('');
  const remunFileInputRef = useRef<HTMLInputElement>(null);
  const [filtroDiscrepancias, setFiltroDiscrepancias] = useState(false);
  const [exportModal, setExportModal] = useState<{
    isOpen: boolean;
    format: 'xlsx' | 'pdf';
    tab: string;
    columns: { key: string; label: string; checked: boolean }[];
  }>({
    isOpen: false,
    format: 'xlsx',
    tab: '',
    columns: []
  });

  const triggerExport = (tab: string, format: 'xlsx' | 'pdf') => {
    let cols: { key: string; label: string; checked: boolean }[] = [];
    if (tab === 'conciliacion') {
      cols = [
        { key: 'run', label: 'Funcionario / RUN', checked: true },
        { key: 'estamento', label: 'Estamento', checked: true },
        { key: 'contratadas', label: 'Horas Contratadas', checked: true },
        { key: 'aula', label: 'Horas en Aula', checked: true },
        { key: 'pagadas', label: 'Horas Pagadas', checked: true },
        { key: 'auditoria', label: 'Estado de Auditoría / Descalce', checked: true }
      ];
    }
    setExportModal({
      isOpen: true,
      format,
      tab,
      columns: cols
    });
  };

  const handleExecuteExport = () => {
    const activeCols = exportModal.columns.filter(c => c.checked).map(c => c.label);
    alert(`📥 Descargando reporte de la pestaña "${exportModal.tab.toUpperCase()}" (Finanzas SLEP) en formato ${exportModal.format.toUpperCase()}...\n\nColumnas seleccionadas:\n- ${activeCols.join('\n- ')}`);
    setExportModal({ ...exportModal, isOpen: false });
  };


  useEffect(() => {
    let interval: any;
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('slep_sim_role');
      if (role !== 'sostenedor_maestro') {
        if (role === 'profesional_slep') {
          router.push('/profesional');
        } else if (role === 'director_escuela') {
          router.push('/escuela');
        } else {
          router.push('/');
        }
      } else {
        setAuthorized(true);
        loadAllData();

        interval = setInterval(async () => {
          const updated = await api.pullCloudSync();
          if (updated) {
            loadAllData();
          }
        }, 5000);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  async function loadAllData() {
    await api.pullCloudSync();
    const conts = await api.getContratos();
    const funcs = await api.getFuncionarios();
    const asigs = dbLocal.asignacionesAula;
    const rems = await api.getRemuneraciones();
    
    setContratos(conts);
    setFuncionarios(funcs);
    setAsignaciones(asigs);
    setRemuneraciones(rems);
  }

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-600 font-bold">
        🔒 Acceso Restringido. Redirigiendo...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slep-blue-dark text-white flex flex-col z-40 shadow-xl shrink-0">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <Image src="/logo.png" alt="Logo SLEP" width={110} height={45} className="object-contain" />
        </div>
        
        <div className="p-4 flex-1 space-y-6">
          <div>
            <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Unidad UATP</p>
            <nav className="space-y-1">
              <Link
                href="/sostenedor?tab=dashboard"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left text-slate-300 hover:bg-white/5 block"
              >
                🎛️ Tablero de Gobernanza
              </Link>
              <Link
                href="/sostenedor?tab=compendio"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left text-slate-300 hover:bg-white/5 block"
              >
                📊 Compendio Territorial
              </Link>
            </nav>
          </div>

          <div>
            <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Gestión de Personas</p>
            <nav className="space-y-1">
              <Link
                href="/sostenedor/rrhh"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left text-slate-300 hover:bg-white/5 block"
              >
                💼 Fichas, Licencias & Reemplazos
              </Link>
            </nav>
          </div>

          <div>
            <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Finanzas SLEP</p>
            <nav className="space-y-1">
              <Link
                href="/sostenedor/finanzas"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left bg-slep-blue text-white shadow block"
              >
                💵 Conciliación Remuneraciones
              </Link>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Sostenedor Maestro</p>
          <Link href="/" className="mt-2 block w-full bg-white/10 hover:bg-white/20 text-white font-bold py-1.5 rounded text-[10px] transition-colors border border-white/10">
            Cerrar Sesión
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <header className="bg-white border-b py-4 px-6 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-base font-bold text-slate-800">💵 Finanzas SLEP</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Auditoría y conciliación cruzada de remuneraciones del Servicio Local</p>
          </div>
        </header>

        <main className="p-6 md:p-8 flex-1 flex flex-col gap-6 w-full animate-fadeIn">
          <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>💵</span> Conciliación de Remuneraciones
                </h2>
                <p className="text-xs text-slate-500 mt-1">Cargue el libro de remuneraciones de la SLEP (CSV o JSON) para conciliar automáticamente con la dotación en RR.HH. y las horas aula.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => remunFileInputRef.current?.click()}
                  className="bg-slep-blue hover:bg-slep-blue-hover text-white text-xs font-bold px-3 py-2 rounded shadow transition-all cursor-pointer"
                >
                  📥 Cargar Libro Remuneraciones
                </button>
                <input
                  ref={remunFileInputRef}
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const reader = new FileReader();
                      reader.onload = async (evt) => {
                        try {
                          const text = evt.target?.result as string;
                          const parsed = parsearRemuneracionesCsv(text);
                          await api.cargarRemuneraciones(parsed);
                          setRemuneraciones(parsed);
                          
                          // Automated Medical License Audits
                          let alertsCreated = 0;
                          for (const rem of parsed) {
                            if (rem.dias_licencia_medica && rem.dias_licencia_medica > 0) {
                              // Find corresponding contract
                              const conts = await api.getContratos();
                              const userConts = conts.filter(c => c.funcionario_run === rem.funcionario_run);
                              if (userConts.length > 0) {
                                // Check if any of their contracts is in 'Licencia Médica' status
                                const tieneLicenciaRegistrada = userConts.some(c => c.estado === 'Licencia Médica');
                                if (!tieneLicenciaRegistrada) {
                                  // Auto-generate a Coral critical alert
                                  const funcionario = funcionarios.find(f => f.run === rem.funcionario_run);
                                  const nombre = funcionario ? funcionario.nombre : 'Funcionario';
                                  const mainCont = userConts[0];
                                  
                                  await api.crearAlerta({
                                    id: `al-licencia-no-registrada-${rem.id}`,
                                    run: rem.funcionario_run,
                                    nombre_funcionario: nombre,
                                    rbd: mainCont.rbd,
                                    tipo: 'descalce_horas',
                                    nivel_alerta: 'critica',
                                    mensaje: 'Licencia Médica no registrada en RR.HH.',
                                    detalle: `El libro de remuneraciones registra ${rem.dias_licencia_medica} días de licencia médica, pero el estado del contrato en RR.HH. figura como "${mainCont.estado}" en lugar de "Licencia Médica".`,
                                    resuelta: false
                                  });
                                  alertsCreated++;
                                }
                              }
                            }
                          }

                          let successMsg = `✅ Éxito: Se procesaron ${parsed.length} registros del libro de remuneraciones.`;
                          if (alertsCreated > 0) {
                            successMsg += ` Se generaron ${alertsCreated} alertas críticas de licencia médica no registrada en RR.HH.`;
                          }
                          setUploadRemunLogs(successMsg);
                          loadAllData();
                        } catch (err: any) {
                          setUploadRemunLogs(`❌ Error al procesar archivo: ${err.message}`);
                        }
                      };
                      reader.readAsText(e.target.files[0], 'UTF-8');
                    }
                  }}
                />
              </div>
            </div>

            {uploadRemunLogs && (
              <div className="mt-3 p-3 bg-slate-50 border rounded-lg text-xs font-bold text-slate-700">
                {uploadRemunLogs}
              </div>
            )}

            {(() => {
              const totalRemunerado = remuneraciones.reduce((sum, r) => sum + r.total_haberes, 0);
              const totalHrsPagadas = remuneraciones.reduce((sum, r) => sum + r.horas_pagadas, 0);
              const totalHrsContrato = contratos.reduce((sum, c) => sum + c.horas_totales, 0);
              
              const alertsCount = funcionarios.filter(f => {
                const conc = conciliarFuncionario(f.run, contratos, asignaciones, remuneraciones);
                return conc.discrepancia;
              }).length;

              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 shadow-sm">
                    <p className="text-slate-505 text-[10px] uppercase font-bold">Total Liquidado</p>
                    <p className="text-lg font-extrabold text-slate-800 mt-1">${totalRemunerado.toLocaleString('es-CL')}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 shadow-sm">
                    <p className="text-slate-555 text-[10px] uppercase font-bold">Horas Pagadas (Libro)</p>
                    <p className="text-lg font-extrabold text-slate-800 mt-1">{totalHrsPagadas.toFixed(1)} hrs</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 shadow-sm">
                    <p className="text-slate-555 text-[10px] uppercase font-bold">Horas Contratadas (RR.HH.)</p>
                    <p className="text-lg font-extrabold text-slep-blue mt-1">{totalHrsContrato.toFixed(1)} hrs</p>
                  </div>
                  <div className="bg-red-50 border border-slep-coral/30 rounded-xl p-4 shadow-sm">
                    <p className="text-red-700 text-[10px] uppercase font-bold">Alertas de Descalce</p>
                    <p className="text-lg font-extrabold text-red-600 mt-1">⚠️ {alertsCount} Funcionarios</p>
                  </div>
                </div>
              );
            })()}

            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-700">Detalle de Conciliación por Funcionario</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => triggerExport('conciliacion', 'xlsx')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      📊 Excel
                    </button>
                    <button
                      onClick={() => triggerExport('conciliacion', 'pdf')}
                      className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      📄 PDF
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtroDiscrepancias}
                    onChange={(e) => setFiltroDiscrepancias(e.target.checked)}
                    className="rounded text-slep-blue"
                  />
                  <span>Mostrar sólo descalces y discrepancias</span>
                </label>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-600 border-b">
                    <tr>
                      <th className="p-3 pl-4">Funcionario / RUN</th>
                      <th className="p-3">Estamento</th>
                      <th className="p-3 text-center">Horas Contratadas</th>
                      <th className="p-3 text-center">Horas en Aula</th>
                      <th className="p-3 text-center">Horas Pagadas</th>
                      <th className="p-3">Estado de Auditoría / Descalce</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {funcionarios.filter(f => {
                      if (!filtroDiscrepancias) return true;
                      const conc = conciliarFuncionario(f.run, contratos, asignaciones, remuneraciones);
                      return conc.discrepancia;
                    }).map(f => {
                      const conc = conciliarFuncionario(f.run, contratos, asignaciones, remuneraciones);
                      return (
                        <tr key={f.run} className="hover:bg-slate-50">
                          <td className="p-3 pl-4">
                            <span className="font-bold text-slate-800">{f.nombre}</span>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{f.run}</p>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              f.estamento === 'Docente' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {f.estamento || 'P01 Administrativo'}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">{conc.contratadas} hrs</td>
                          <td className="p-3 text-center font-bold text-slep-blue">{conc.aula} hrs</td>
                          <td className="p-3 text-center font-bold text-slate-600">{conc.pagadas} hrs</td>
                          <td className="p-3">
                            {conc.discrepancia ? (
                              <span className="inline-block bg-slep-coral/20 text-red-950 border border-slep-coral/40 px-2.5 py-1 rounded font-semibold text-[10.5px]">
                                ⚠️ {conc.mensaje}
                              </span>
                            ) : (
                              <span className="inline-block bg-slep-emerald/20 text-emerald-950 border border-slep-emerald/40 px-2.5 py-1 rounded font-semibold text-[10.5px]">
                                ✓ Conciliado Correctamente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Export Column Selection Modal */}
      {exportModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-800">📥 Exportar Reporte ({exportModal.format.toUpperCase()})</h3>
                <p className="text-xs text-slate-500 mt-0.5">Seleccione las columnas que desea incluir en el archivo exportado.</p>
              </div>
              <button 
                onClick={() => setExportModal({ ...exportModal, isOpen: false })}
                className="text-slate-400 hover:text-slate-600 bg-slate-200/50 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer font-bold w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Columns Selection */}
            <div className="p-6 space-y-4">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Columnas Disponibles</p>
              <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-1">
                {exportModal.columns.map((col, idx) => (
                  <label key={col.key} className="flex items-center gap-3 p-2 border rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs transition-colors">
                    <input 
                      type="checkbox" 
                      checked={col.checked}
                      onChange={(e) => {
                        const updated = [...exportModal.columns];
                        updated[idx].checked = e.target.checked;
                        setExportModal({ ...exportModal, columns: updated });
                      }}
                      className="rounded border-slate-300 text-slep-blue focus:ring-slep-blue"
                    />
                    <span className="font-semibold text-slate-700">{col.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <button 
                  type="button"
                  onClick={() => setExportModal({ ...exportModal, isOpen: false })}
                  className="flex-1 bg-white border border-slate-200 text-slate-655 hover:bg-slate-50 font-bold py-2.5 rounded-lg shadow cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleExecuteExport}
                  className="flex-1 bg-slep-blue hover:bg-slep-blue-hover text-white font-bold py-2.5 rounded-lg shadow cursor-pointer text-xs"
                >
                  Confirmar Exportación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
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
