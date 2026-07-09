// src/app/profesional/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api, dbLocal } from '@/lib/supabase';
import { Establecimiento, AlertaConciliacion, Contrato, Funcionario } from '@/lib/types';
import { parsearNominaCsv } from '@/lib/csvParser';

export default function ProfesionalSlepDashboard() {
  const router = useRouter();
  const [runAsesor, setRunAsesor] = useState<string>('');
  
  // Estados de datos territoriales
  const [escuelasAsignadas, setEscuelasAsignadas] = useState<Establecimiento[]>([]);
  const [alertasTerritoriales, setAlertasTerritoriales] = useState<AlertaConciliacion[]>([]);
  const [contratosTotales, setContratosTotales] = useState<Contrato[]>([]);
  const [funcionariosTotales, setFuncionariosTotales] = useState<Funcionario[]>([]);

  // Estados de UI e Ingesta masiva
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'escuelas' | 'alertas' | 'ingesta'>('escuelas');
  const [selectedRbdIngesta, setSelectedRbdIngesta] = useState<string>('');
  const [estamentoIngesta, setEstamentoIngesta] = useState<'Docente' | 'Asistente de la Educación'>('Docente');
  const [csvText, setCsvText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Recuperar sesión simulada
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRun = localStorage.getItem('slep_sim_run') || '11.111.111-1';
      setRunAsesor(storedRun);
    }
  }, []);

  // Carga paralela y optimizada de datos
  useEffect(() => {
    if (!runAsesor) return;

    async function loadAsesorData() {
      setLoading(true);
      
      // 1. Obtener listado de RBDs bajo tutela
      const rbdsTutela = await api.getTutelasPorProfesional(runAsesor);
      const todasLasEscuelas = await api.getEstablecimientos();
      const filtradas = todasLasEscuelas.filter(e => rbdsTutela.includes(e.rbd));
      setEscuelasAsignadas(filtradas);
      
      if (filtradas.length > 0) {
        setSelectedRbdIngesta(filtradas[0].rbd);
      }

      // 2. Obtener contratos globales y filtrar por territorio asignado
      const todosLosContratos = await api.getContratos();
      const contratosFiltrados = todosLosContratos.filter(c => rbdsTutela.includes(c.rbd));
      setContratosTotales(contratosFiltrados);

      // 3. Obtener funcionarios y alertas asociadas
      const todosLosFuncs = await api.getFuncionarios();
      setFuncionariosTotales(todosLosFuncs);

      const todasLasAlertas = await api.getAlertas();
      const alertasFiltradas = todasLasAlertas.filter(a => rbdsTutela.includes(a.rbd) && !a.resuelta);
      setAlertasTerritoriales(alertasFiltradas);

      setLoading(false);
    }

    loadAsesorData();
  }, [runAsesor]);

  // Cálculos consolidados del territorio usando useMemo para evitar congelamientos de la interfaz
  const metricasTerritorio = useMemo(() => {
    const totalContratos = contratosTotales.length;
    const totalHorasContratadas = contratosTotales.reduce((sum, c) => sum + c.horas_totales, 0);
    const alertasCriticas = alertasTerritoriales.filter(a => a.nivel_alerta === 'critica').length;
    
    return {
      totalContratos,
      totalHorasContratadas,
      alertasCriticas
    };
  }, [contratosTotales, alertasTerritoriales]);

  // Manejo de la ingesta masiva de archivos CSV SIGE
  const handleProcesarIngesta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRbdIngesta || !csvText.trim()) {
      alert('Por favor selecciona un establecimiento e ingresa contenido CSV válido.');
      return;
    }

    setIsProcessing(true);
    try {
      // Invocar al parser inteligente con soporte para sanitización de strings y codificaciones corruptas
      const { funcionarios, contratos, financiamientos, alertas } = parsearNominaCsv(
        csvText, 
        selectedRbdIngesta,
        undefined,
        estamentoIngesta
      );

      // Guardar de forma secuencial en Supabase/Local
      for (const f of funcionarios) {
        await api.upsertFuncionario(f);
      }

      for (const c of contratos) {
        const finesContrato = financiamientos.filter(f => f.contrato_id === c.id);
        await api.upsertContratoCompleto(c, finesContrato);
      }

      for (const a of alertas) {
        await api.crearAlerta(a);
      }

      alert(`🎉 Ingesta completada con éxito:\n- ${funcionarios.length} Funcionarios normalizados.\n- ${contratos.length} Contratos auditados.\n- ${alertas.length} Alertas normativas levantadas.`);
      setCsvText('');
      
      // Recargar datos actualizados
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert('❌ Ocurrió un error crítico durante el parseo de la nómina: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-slep-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-500">Cargando territorio UATP asignado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Encabezado del Asesor */}
      <header className="bg-slep-blue text-white px-8 py-5 shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slep-gold text-slep-blue font-black flex items-center justify-center text-sm shadow-inner">
            UA
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight">Unidad de Acompañamiento Técnico Pedagógico (UATP)</h1>
            <p className="text-xs text-slate-300 font-medium mt-0.5">Asesor Territorial Activo: <span className="text-white underline font-bold">{runAsesor}</span> • SLEP Valle Diguillín</p>
          </div>
        </div>
        <button 
          onClick={() => router.push('/')}
          className="bg-slep-blue-dark/60 hover:bg-slep-blue-dark text-slate-200 hover:text-white px-4 py-2 rounded-xl text-xs font-bold border border-white/10 transition-colors shadow-sm"
        >
          ← Salir al Acceso Central
        </button>
      </header>

      {/* Bloque de Métricas Rápidas */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-8 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Escuelas Asignadas</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{escuelasAsignadas.length} <span className="text-xs text-slate-500 font-normal">RBDs</span></p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volumen del Personal</p>
          <p className="text-2xl font-black text-slep-blue mt-1">{metricasTerritorio.totalContratos} <span className="text-xs text-slate-500 font-normal">Contratos ({metricasTerritorio.totalHorasContratadas} hrs)</span></p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Brechas Críticas de Aula</p>
          <p className={`text-2xl font-black mt-1 ${metricasTerritorio.alertasCriticas > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
            {metricasTerritorio.alertasCriticas} <span className="text-xs text-slate-500 font-normal">Infracciones Activas</span>
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 mt-6">
        <div className="border-b border-slate-200 flex gap-2">
          {[
            { id: 'escuelas', label: '🏫 Colegios Asignados', icon: '🏬' },
            { id: 'alertas', label: '🚨 Matriz de Alertas Territoriales', icon: '⚠️' },
            { id: 'ingesta', label: '📥 Ingesta Masiva SIGE (CSV)', icon: '💾' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'border-slep-blue text-slep-blue bg-white rounded-t-xl' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido Dinámico */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6">

        {/* PESTAÑA 1: LISTADO DE ESCUELAS */}
        {activeTab === 'escuelas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {escuelasAsignadas.map(esc => {
              const contsColegio = contratosTotales.filter(c => c.rbd === esc.rbd);
              const alertasColegio = alertasTerritoriales.filter(a => a.rbd === esc.rbd);

              return (
                <div key={esc.rbd} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded text-[11px]">RBD {esc.rbd}</span>
                      <span className="text-xs font-bold text-slep-blue-dark bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">{esc.regimen}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm mt-3 leading-snug">{esc.nombre}</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Comuna: {esc.comuna} • Vulnerabilidad IVM: <span className="font-bold text-slate-600">{esc.ivm}%</span></p>
                  </div>
                  
                  <div className="border-t border-slate-100 pt-4 mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                      <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Dotación</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{contsColegio.length} Contratos</span>
                    </div>
                    <div className={`p-2 rounded-lg border ${alertasColegio.length > 0 ? 'bg-rose-50/50 border-rose-100 text-rose-700' : 'bg-emerald-50/50 border-emerald-100 text-emerald-700'}`}>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Alertas</span>
                      <span className="font-bold mt-0.5 block">{alertasColegio.length} Pendientes</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {escuelasAsignadas.length === 0 && (
              <div className="col-span-3 text-center p-12 bg-white rounded-2xl border border-slate-200 text-slate-400 font-medium text-xs">
                No registras escuelas asignadas a tu rut en el catálogo de tutelas del Sostenedor.
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 2: MATRIZ DE ALERTAS */}
        {activeTab === 'alertas' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-4">RBD</th>
                    <th className="p-4">Funcionario</th>
                    <th className="p-4 text-center">Tipo de Alerta</th>
                    <th className="p-4">Infracción / Mensaje Técnico</th>
                    <th className="p-4 text-center">Severidad</th>
                    <th className="p-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alertasTerritoriales.map(alerta => (
                    <tr key={alerta.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4 font-bold text-slate-600 font-mono">{alerta.rbd}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{alerta.nombre_funcionario}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{alerta.run}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium text-[10px] border border-slate-200 uppercase">
                          {alerta.tipo.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="font-bold text-slate-700">{alerta.mensaje}</div>
                        <div className="text-[11px] text-slate-400 leading-normal mt-0.5">{alerta.detalle}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          alerta.nivel_alerta === 'critica' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {alerta.nivel_alerta.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={async () => {
                            if (confirm('¿Deseas marcar esta alerta como resuelta bajo justificación técnica administrativa?')) {
                              await api.resolverAlerta(alerta.id);
                              setAlertasTerritoriales(alertasTerritoriales.filter(a => a.id !== alerta.id));
                            }
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
                        >
                          Concluir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {alertasTerritoriales.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center p-12 text-slate-400 font-medium">No se registran alertas normativas sin resolver en tu territorio. ¡Felicitaciones!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: INGESTA MASIVA */}
        {activeTab === 'ingesta' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400">Parámetros de Carga</h3>
              
              <form onSubmit={handleProcesarIngesta} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Establecimiento Destino</label>
                  <select 
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                    value={selectedRbdIngesta}
                    onChange={(e) => setSelectedRbdIngesta(e.target.value)}
                  >
                    {escuelasAsignadas.map(e => (
                      <option key={e.rbd} value={e.rbd}>{e.nombre} (RBD {e.rbd})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Estamento Predominante</label>
                  <select 
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                    value={estamentoIngesta}
                    onChange={(e) => setEstamentoIngesta(e.target.value as any)}
                  >
                    <option value="Docente">Docente (Estatuto de la Carrera)</option>
                    <option value="Asistente de la Educación">Asistente de la Educación (Ley de Planta/Código)</option>
                  </select>
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-700 leading-normal">
                  📌 **Estructura Requerida del CSV:** El archivo debe contener los encabezados obligatorios: `RUN`, `Nombre`, `CalidadJuridica`, `Funcion`, `HorasTotales`. Opcionales para cruce financiero: `SEP`, `PIE`, `SubvencionRegular`.
                </div>

                <button 
                  type="submit" 
                  disabled={isProcessing}
                  className="w-full bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark font-black py-3 rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
                >
                  {isProcessing ? '⏳ Normalizando y Auditando...' : '📥 Ejecutar Ingesta Masiva'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400 mb-2">Contenido de la Planilla (Pegar CSV o JSON)</h3>
              <textarea
                required
                rows={14}
                placeholder="Pegar el contenido estructurado aquí..."
                className="w-full flex-1 p-4 border border-slate-300 rounded-xl font-mono text-[11px] focus:ring-1 focus:ring-slep-blue outline-none bg-slate-50/30"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
