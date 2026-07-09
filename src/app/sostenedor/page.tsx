// src/app/sostenedor/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/supabase';
import { Establecimiento, AlertaConciliacion, Supervisor, ProfesionalEscuelaAsignada } from '@/lib/types';

// Dentro de SostenedorDashboard
const [nuevaEscuela, setNuevaEscuela] = useState<Establecimiento>({ rbd: '', nombre: '', ivm: 0, comuna: '', regimen: 'JEC' });

const handleAgregarEscuela = async () => {
  await api.upsertEstablecimiento(nuevaEscuela);
  setEstablecimientos([...establecimientos, nuevaEscuela]);
  alert('Escuela agregada');
};
export default function SostenedorDashboard() {
  const router = useRouter();

  // Estados de datos centralizados
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [alertasGlobales, setAlertasGlobales] = useState<AlertaConciliacion[]>([]);
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [tutelas, setTutelas] = useState<ProfesionalEscuelaAsignada[]>([]);

  // Estados de UI
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'establecimientos' | 'tutelas' | 'alertas'>('establecimientos');

  // Estados de control de asignación de Tutelas
  const [selectedAsesorRun, setSelectedAsesorRun] = useState<string>('');
  const [selectedRbdTutela, setSelectedRbdTutela] = useState<string>('');

  useEffect(() => {
    async function loadSostenedorData() {
      setLoading(true);
      
      const allEsts = await api.getEstablecimientos();
      setEstablecimientos(allEsts);

      const allAlerts = await api.getAlertas();
      setAlertasGlobales(allAlerts.filter(a => !a.resuelta));

      const allSups = await api.getSupervisores();
      setSupervisores(allSups);

      const allTutelas = await api.getTodasLasTutelas();
      setTutelas(allTutelas);

      if (allSups.length > 0) setSelectedAsesorRun(allSups[0].run);
      if (allEsts.length > 0) setSelectedRbdTutela(allEsts[0].rbd);

      setLoading(false);
    }

    loadSostenedorData();
  }, []);

  // useMemo para consolidar métricas del territorio sin ralentizar la UI
  const metricasMacro = useMemo(() => {
    const totalRbd = establecimientos.length;
    const alertasCriticas = alertasGlobales.filter(a => a.nivel_alerta === 'critica').length;
    const comunasActivas = new Set(establecimientos.map(e => e.comuna)).size;

    return {
      totalRbd,
      alertasCriticas,
      comunasActivas
    };
  }, [establecimientos, alertasGlobales]);

  const handleAsignarTutela = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsesorRun || !selectedRbdTutela) return;

    // Verificar si ya existe la tutela
    const existe = tutelas.some(t => t.profesional_run === selectedAsesorRun && t.establecimiento_rbd === selectedRbdTutela);
    if (existe) {
      alert('⚠️ Este asesor ya tiene asignada la tutela de este establecimiento.');
      return;
    }

    await api.asignarEscuelaAProfesional(selectedAsesorRun, selectedRbdTutela);
    setTutelas([...tutelas, { profesional_run: selectedAsesorRun, establecimiento_rbd: selectedRbdTutela }]);
    alert('✅ Tutela territorial vinculada con éxito.');
  };

  const handleRemoverTutela = async (run: string, rbd: string) => {
    if (confirm('¿Deseas desvincular la tutela de este establecimiento para el asesor seleccionado?')) {
      await api.removerEscuelaDeProfesional(run, rbd);
      setTutelas(tutelas.filter(t => !(t.profesional_run === run && t.establecimiento_rbd === rbd)));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-500">Iniciando Consola de Control de Sostenedor Maestro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar Nivel Sostenedor */}
      <header className="bg-slate-950 text-white px-8 py-5 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <span className="bg-slep-gold text-slate-950 text-xs font-black px-3 py-1 rounded-md uppercase tracking-wider shadow-sm">
            Nivel Central SLEP
          </span>
          <div>
            <h1 className="font-black text-xl tracking-tight">Consola de Control del Sostenedor</h1>
            <p className="text-xs text-slate-400 font-medium">Administración Global Territorial • Servicio Local Valle Diguillín</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.push('/sostenedor/rrhh')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-colors shadow-sm"
          >
            📋 Libro Remuneraciones
          </button>
          <button 
            onClick={() => router.push('/sostenedor/finanzas')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-colors shadow-sm"
          >
            📈 Auditoría de Planes
          </button>
          <button 
            onClick={() => router.push('/')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-700 transition-colors shadow-sm"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Tarjetas de Indicadores Provinciales */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-8 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cobertura Territorial</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{metricasMacro.totalRbd} <span className="text-xs text-slate-400 font-normal">Escuelas en {metricasMacro.comunasActivas} Comunas</span></p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Asesores Técnicos de Aula</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{supervisores.length} <span className="text-xs text-slate-400 font-normal">Profesionales UATP</span></p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descalces Críticos Consolidados</p>
          <p className={`text-2xl font-black mt-1 ${metricasMacro.alertasCriticas > 0 ? 'text-rose-600 font-black' : 'text-emerald-600'}`}>
            {metricasMacro.alertasCriticas} <span className="text-xs text-slate-400 font-normal">Infracciones a la Ley</span>
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 mt-6">
        <div className="border-b border-slate-200 flex gap-2">
          {[
            { id: 'establecimientos', label: '🏫 Catálogo del Territorio', icon: '🏢' },
            { id: 'tutelas', label: '⚖️ Matriz de Tutelas (UATP)', icon: '🗺️' },
            { id: 'alertas', label: '🚨 Panel de Control de Infracciones', icon: '🛑' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'border-slate-900 text-slate-900 bg-white rounded-t-xl' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Área de Visualización */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6">

        {/* PESTAÑA 1: CATÁLOGO DE ESTABLECIMIENTOS */}
        {activeTab === 'establecimientos' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Directorio e Índices de Vulnerabilidad (RBD)</h3>
            </div>
            <div className="overflow-y-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                    <th className="p-4">RBD</th>
                    <th className="p-4">Nombre del Establecimiento</th>
                    <th className="p-4">Comuna</th>
                    <th className="p-4 text-center">Jornada</th>
                    <th className="p-4 text-center">Índice IVM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {establecimientos.map(est => (
                    <tr key={est.rbd} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-bold text-slate-600 font-mono">{est.rbd}</td>
                      <td className="p-4 font-black text-slate-800">{est.nombre}</td>
                      <td className="p-4 text-slate-600 font-medium">{est.comuna}</td>
                      <td className="p-4 text-center">
                        <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded font-bold text-[10px]">
                          {est.regimen}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          est.ivm > 80 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-600'
                        }`}>
                          {est.ivm}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: MATRIZ DE TUTELAS */}
        {activeTab === 'tutelas' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulario Vincular */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400 mb-4">Vincular Tutela</h3>
              <form onSubmit={handleAsignarTutela} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Asesor de Acompañamiento</label>
                  <select
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                    value={selectedAsesorRun}
                    onChange={(e) => setSelectedAsesorRun(e.target.value)}
                  >
                    {supervisores.map(sup => (
                      <option key={sup.run} value={sup.run}>{sup.nombre} ({sup.run})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Establecimiento Mandatario</label>
                  <select
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                    value={selectedRbdTutela}
                    onChange={(e) => setSelectedRbdTutela(e.target.value)}
                  >
                    {establecimientos.map(e => (
                      <option key={e.rbd} value={e.rbd}>{e.nombre} (RBD {e.rbd})</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-sm"
                >
                  ➕ Asignar Responsabilidad Territorial
                </button>
              </form>
            </div>

            {/* Listado de Tutelas */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400 mb-4">Mapa de Responsabilidades Vigentes</h3>
              <div className="space-y-2 max-y-[450px] overflow-y-auto">
                {tutelas.map((t, idx) => {
                  const asesor = supervisores.find(s => s.run === t.profesional_run);
                  const colegio = establecimientos.find(e => e.rbd === t.establecimiento_rbd);

                  return (
                    <div key={idx} className="border border-slate-200 p-3.5 rounded-xl flex items-center justify-between text-xs bg-slate-50/50 hover:border-slate-300 transition-colors">
                      <div>
                        <div className="font-bold text-slate-800">🏫 {colegio?.nombre || `RBD ${t.establecimiento_rbd}`}</div>
                        <div className="text-slate-500 mt-0.5">Asesor Asignado: <span className="font-medium text-slate-700">{asesor?.nombre || t.profesional_run}</span></div>
                      </div>
                      <button
                        onClick={() => handleRemoverTutela(t.profesional_run, t.establecimiento_rbd)}
                        className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors font-bold"
                      >
                        Desvincular
                      </button>
                    </div>
                  );
                })}
                {tutelas.length === 0 && (
                  <div className="text-center p-8 text-slate-400 font-medium">No se registran tutelas configuradas en el sistema.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: CONSOLIDADO DE ALERTAS */}
        {activeTab === 'alertas' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Matriz Macro de Brechas Legales Sin Resolver</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-4">RBD</th>
                    <th className="p-4">Funcionario</th>
                    <th className="p-4">Infracción Detectada</th>
                    <th className="p-4 text-center">Criticidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alertasGlobales.map(al => (
                    <tr key={al.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-600">{al.rbd}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{al.nombre_funcionario}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{al.run}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-black text-slate-700">{al.mensaje}</div>
                        <div className="text-slate-400 text-[11px] leading-normal mt-0.5">{al.detalle}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          al.nivel_alerta === 'critica' ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {al.nivel_alerta.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {alertasGlobales.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center p-12 text-slate-400 font-medium">No existen descalces normativos reportados a nivel provincial.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
