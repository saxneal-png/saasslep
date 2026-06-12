'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/supabase';
import { normalizarRun } from '@/lib/csvParser';
import { 
  Establecimiento, 
  Funcionario, 
  Contrato, 
  FinanciamientoContrato, 
  AlertaConciliacion 
} from '@/lib/types';

export default function SostenedorDashboard() {
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [financiamientos, setFinanciamientos] = useState<FinanciamientoContrato[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [alertas, setAlertas] = useState<AlertaConciliacion[]>([]);

  // Search and filter states
  const [searchEst, setSearchEst] = useState('');
  const [selectedComuna, setSelectedComuna] = useState('Todas');
  const [searchRun, setSearchRun] = useState('');
  const [searchRunResult, setSearchRunResult] = useState<{
    funcionario: Funcionario;
    contratos: (Contrato & { escuelaNombre: string; financiamientos: FinanciamientoContrato[] })[];
    totalHoras: number;
  } | null>(null);

  // Stats
  const [totalHorasSistemas, setTotalHorasSistemas] = useState(0);

  useEffect(() => {
    async function loadData() {
      const ests = await api.getEstablecimientos();
      const conts = await api.getContratos();
      const funcs = await api.getFuncionarios();
      const alts = await api.getAlertas();
      
      // Load all financiamientos
      const fins: FinanciamientoContrato[] = [];
      for (const c of conts) {
        const f = await api.getFinanciamientosPorContrato(c.id);
        fins.push(...f);
      }

      setEstablecimientos(ests);
      setContratos(conts);
      setFuncionarios(funcs);
      setFinanciamientos(fins);
      setAlertas(alts);

      // Total hours calculation
      const sum = conts.reduce((acc, c) => acc + c.horas_totales, 0);
      setTotalHorasSistemas(sum);
    }
    loadData();
  }, []);

  // Filter establishments
  const comunas = ['Todas', ...Array.from(new Set(establecimientos.map(e => e.comuna)))];
  
  const filteredEstablecimientos = establecimientos.filter(e => {
    const matchesSearch = e.nombre.toLowerCase().includes(searchEst.toLowerCase()) || e.rbd.includes(searchEst);
    const matchesComuna = selectedComuna === 'Todas' || e.comuna === selectedComuna;
    return matchesSearch && matchesComuna;
  });

  // RUN Master Search Handler
  const handleSearchRun = () => {
    const cleanRun = normalizarRun(searchRun);
    if (!cleanRun) {
      setSearchRunResult(null);
      return;
    }

    const funcObj = funcionarios.find(f => normalizarRun(f.run) === cleanRun);
    if (!funcObj) {
      setSearchRunResult(null);
      alert('Funcionario no encontrado en la base de datos central.');
      return;
    }

    const funcContratos = contratos.filter(c => normalizarRun(c.funcionario_run) === cleanRun).map(c => {
      const escuela = establecimientos.find(e => e.rbd === c.rbd);
      const fins = financiamientos.filter(f => f.contrato_id === c.id);
      return {
        ...c,
        escuelaNombre: escuela ? escuela.nombre : `RBD ${c.rbd}`,
        financiamientos: fins
      };
    });

    const totalHoras = funcContratos.reduce((sum, c) => sum + c.horas_totales, 0);

    setSearchRunResult({
      funcionario: funcObj,
      contratos: funcContratos,
      totalHoras
    });
  };

  // Financial Distribution calculations
  const totalRegular = financiamientos.filter(f => f.origen_fondo === 'Subvención Regular').reduce((sum, f) => sum + f.horas, 0);
  const totalSep = financiamientos.filter(f => f.origen_fondo === 'SEP').reduce((sum, f) => sum + f.horas, 0);
  const totalPie = financiamientos.filter(f => f.origen_fondo === 'PIE').reduce((sum, f) => sum + f.horas, 0);
  const totalRef = financiamientos.filter(f => f.origen_fondo === 'Reforzamiento').reduce((sum, f) => sum + f.horas, 0);
  const totalPro = financiamientos.filter(f => f.origen_fondo === 'Pro-retención').reduce((sum, f) => sum + f.horas, 0);
  const totalOtro = financiamientos.filter(f => f.origen_fondo === 'Otro').reduce((sum, f) => sum + f.horas, 0);
  
  const sumFinanciamientos = totalRegular + totalSep + totalPie + totalRef + totalPro + totalOtro;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <header className="bg-slep-blue text-white shadow-md py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <span className="text-2xl">🏛️</span>
            </Link>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold leading-none">Panel Territorial</p>
              <h1 className="text-lg font-bold tracking-tight mt-1">Sostenedor UATP • Valle Diguillín</h1>
            </div>
          </div>
          <Link href="/" className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors border border-white/10">
            Volver al Inicio
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        
        {/* Left column: Heatmap territorial & list */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Header section with fast statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow p-4 border border-slate-200/60">
              <p className="text-xs text-slate-500 uppercase font-semibold">Total Escuelas</p>
              <p className="text-2xl font-bold text-slep-blue mt-1">131</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 border border-slate-200/60">
              <p className="text-xs text-slate-500 uppercase font-semibold">Total Docentes Activos</p>
              <p className="text-2xl font-bold text-slep-blue mt-1">{funcionarios.length + 3892}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 border border-slate-200/60">
              <p className="text-xs text-slate-500 uppercase font-semibold">Alertas Globales</p>
              <p className="text-2xl font-bold text-slep-coral mt-1">
                {alertas.filter(a => !a.resuelta).length}
              </p>
            </div>
          </div>

          {/* Escuelas List / Heatmap */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Mapa Territorial de Establecimientos</h2>
                <p className="text-xs text-slate-500 mt-1">Monitoreo de dotación, vulnerabilidad (IVM) y estado de conciliación.</p>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Buscar RBD o Nombre..." 
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slep-blue"
                  value={searchEst}
                  onChange={(e) => setSearchEst(e.target.value)}
                />
                <select
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slep-blue bg-white"
                  value={selectedComuna}
                  onChange={(e) => setSelectedComuna(e.target.value)}
                >
                  {comunas.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List with Heatmap-like badges */}
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 pl-6">RBD</th>
                    <th className="p-3">Establecimiento</th>
                    <th className="p-3">Comuna</th>
                    <th className="p-3 text-center">IVM (%)</th>
                    <th className="p-3 text-center">Contratos</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredEstablecimientos.map(e => {
                    const estContratos = contratos.filter(c => c.rbd === e.rbd);
                    const estAlerts = alertas.filter(a => a.rbd === e.rbd && !a.resuelta);
                    
                    // IVM Heatmap color
                    let ivmBadge = 'bg-slate-100 text-slate-700';
                    if (e.ivm > 80) ivmBadge = 'bg-red-50 text-red-700 border border-red-200';
                    else if (e.ivm > 70) ivmBadge = 'bg-amber-50 text-amber-700 border border-amber-200';
                    else ivmBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-200';

                    return (
                      <tr key={e.rbd} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 pl-6 font-mono font-medium text-slate-600">{e.rbd}</td>
                        <td className="p-3 font-semibold text-slate-800">{e.nombre}</td>
                        <td className="p-3 text-slate-600">{e.comuna}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${ivmBadge}`}>
                            {e.ivm.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-700">
                          {estContratos.length}
                        </td>
                        <td className="p-3 text-center">
                          {estAlerts.length > 0 ? (
                            <span className="bg-slep-coral/25 text-red-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                              ⚠️ {estAlerts.length} Alerta{estAlerts.length > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="bg-slep-emerald/20 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                              ✓ Conciliado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEstablecimientos.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-slate-500">
                        No se encontraron establecimientos con los filtros ingresados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Master Search RUN & Financial Stats */}
        <div className="space-y-6">
          
          {/* Master Search RUN */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 p-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>🔍</span> Buscador Maestro de Funcionarios
            </h2>
            <p className="text-xs text-slate-500 mt-1">Busca itinerancias territoriales y detecta sobrecarga de horas.</p>
            
            <div className="mt-4 flex gap-2">
              <input 
                type="text" 
                placeholder="Ingresar RUN (ej: 15.432.987-K)..." 
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slep-blue"
                value={searchRun}
                onChange={(e) => setSearchRun(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchRun()}
              />
              <button 
                onClick={handleSearchRun}
                className="bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark px-4 py-2 rounded-lg text-sm font-bold shadow transition-all duration-200"
              >
                Buscar
              </button>
            </div>

            {/* RUN result details */}
            {searchRunResult && (
              <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-4">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Nombre Funcionario</p>
                  <p className="text-base font-bold text-slate-800">{searchRunResult.funcionario.nombre}</p>
                  <p className="text-xs font-mono text-slate-500">{searchRunResult.funcionario.run}</p>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <p className="text-xs text-slate-400 font-bold uppercase mb-2">Contratos Registrados ({searchRunResult.contratos.length})</p>
                  <div className="space-y-2">
                    {searchRunResult.contratos.map(c => (
                      <div key={c.id} className="bg-white p-2.5 rounded border border-slate-200 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-700">{c.escuelaNombre}</p>
                          <p className="text-[10px] text-slate-500">{c.funcion_principal} • {c.calidad_juridica}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slep-blue text-sm">{c.horas_totales.toFixed(1)} hrs</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            c.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800' :
                            c.estado === 'Licencia Médica' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {c.estado}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Total Carga Territorial</p>
                    <p className="text-lg font-extrabold text-slate-800">{searchRunResult.totalHoras.toFixed(1)} hrs</p>
                  </div>
                  <div>
                    {searchRunResult.totalHoras > 44 ? (
                      <span className="bg-slep-coral/20 text-red-700 text-xs font-bold px-2 py-1 rounded border border-red-200">
                        ⚠️ Sobrecarga (&gt;44h)
                      </span>
                    ) : searchRunResult.contratos.length > 1 ? (
                      <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded border border-blue-200">
                        🔄 Itinerante OK
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded border border-emerald-200">
                        ✓ Regular
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Financial Distribution Dashboard */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 p-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>📊</span> Financiamiento Consolidado por Fondo
            </h2>
            <p className="text-xs text-slate-500 mt-1">Horas financiadas según origen presupuestario.</p>

            <div className="mt-6 space-y-4">
              
              {/* Progress bars for each fund */}
              {[
                { name: 'Subvención Regular', hours: totalRegular, color: 'bg-blue-600' },
                { name: 'SEP', hours: totalSep, color: 'bg-amber-500' },
                { name: 'PIE', hours: totalPie, color: 'bg-purple-500' },
                { name: 'Reforzamiento', hours: totalRef, color: 'bg-emerald-500' },
                { name: 'Pro-retención', hours: totalPro, color: 'bg-teal-500' },
                { name: 'Otro', hours: totalOtro, color: 'bg-slate-500' },
              ].map(fund => {
                const percentage = sumFinanciamientos > 0 ? (fund.hours / sumFinanciamientos) * 100 : 0;
                
                return (
                  <div key={fund.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600">{fund.name}</span>
                      <span className="text-slate-800">{fund.hours.toFixed(1)} hrs ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${fund.color}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}

              <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-700">Total Horas Registradas:</span>
                <span className="text-base font-extrabold text-slep-blue">{totalHorasSistemas.toFixed(1)} hrs</span>
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
