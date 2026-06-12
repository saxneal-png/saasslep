'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/supabase';
import { parsearNominaCsv, normalizarRun } from '@/lib/csvParser';
import { 
  Establecimiento, 
  Contrato, 
  FinanciamientoContrato, 
  AlertaConciliacion,
  Funcionario
} from '@/lib/types';

export default function ProfesionalDashboard() {
  const [profesionalRun, setProfesionalRun] = useState('11.111.111-1');
  const [escuelasAsignadasRbd, setEscuelasAsignadasRbd] = useState<string[]>([]);
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [financiamientos, setFinanciamientos] = useState<FinanciamientoContrato[]>([]);
  const [alertas, setAlertas] = useState<AlertaConciliacion[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

  // CSV
  const [csvText, setCsvText] = useState('');
  const [importLogs, setImportLogs] = useState('');

  // Local filters
  const [searchEst, setSearchEst] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const run = localStorage.getItem('slep_sim_run') || '11.111.111-1';
      setProfesionalRun(run);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!profesionalRun) return;

      const rbds = await api.getTutelasPorProfesional(profesionalRun);
      setEscuelasAsignadasRbd(rbds);

      const allEsts = await api.getEstablecimientos();
      const filteredEsts = allEsts.filter(e => rbds.includes(e.rbd));
      setEstablecimientos(filteredEsts);

      const allConts = await api.getContratos();
      const filteredConts = allConts.filter(c => rbds.includes(c.rbd));
      setContratos(filteredConts);

      const allAlts = await api.getAlertas();
      const filteredAlts = allAlts.filter(a => rbds.includes(a.rbd));
      setAlertas(filteredAlts);

      const funcs = await api.getFuncionarios();
      setFuncionarios(funcs);

      const fins: FinanciamientoContrato[] = [];
      for (const c of filteredConts) {
        const f = await api.getFinanciamientosPorContrato(c.id);
        fins.push(...f);
      }
      setFinanciamientos(fins);
    }
    loadData();
  }, [profesionalRun]);

  const handleImportCsv = async () => {
    if (!csvText.trim()) {
      alert('Por favor ingrese o pegue el contenido CSV.');
      return;
    }
    try {
      const controlPrevioMock = [
        { run: '12.345.678-9', funcion: 'Docente de Aula', horas: 44 },
        { run: '15.432.987-K', funcion: 'Director de Escuela', horas: 38 }
      ];

      // We parse the csv
      const parsed = parsearNominaCsv(csvText, escuelasAsignadasRbd[0] || '10202', controlPrevioMock);

      // Verify that all rows in the CSV belong to schools under the professional's supervision
      const invalidRows = parsed.contratos.filter(c => !escuelasAsignadasRbd.includes(c.rbd));
      if (invalidRows.length > 0) {
        const badRbds = Array.from(new Set(invalidRows.map(c => c.rbd)));
        alert(`❌ Error de Permiso: No tiene autorización para subir nóminas de los establecimientos con RBD: ${badRbds.join(', ')}. Solo puede administrar las escuelas asignadas a su tutela.`);
        return;
      }

      // Save valid data
      for (const f of parsed.funcionarios) {
        await api.upsertFuncionario(f);
      }
      for (const c of parsed.contratos) {
        const cFins = parsed.financiamientos.filter(f => f.contrato_id === c.id);
        await api.upsertContratoCompleto(c, cFins);
      }
      for (const a of parsed.alertas) {
        await api.crearAlerta(a);
      }

      // Reload
      const allConts = await api.getContratos();
      const filteredConts = allConts.filter(c => escuelasAsignadasRbd.includes(c.rbd));
      setContratos(filteredConts);

      const allAlts = await api.getAlertas();
      const filteredAlts = allAlts.filter(a => escuelasAsignadasRbd.includes(a.rbd));
      setAlertas(filteredAlts);

      setImportLogs(`✅ Éxito: Se procesaron ${parsed.contratos.length} contratos para tus escuelas supervisadas.`);
    } catch (e: any) {
      setImportLogs(`❌ Error: ${e.message}`);
    }
  };

  const filteredEsts = establecimientos.filter(e => 
    e.nombre.toLowerCase().includes(searchEst.toLowerCase()) || e.rbd.includes(searchEst)
  );

  const totalRegular = financiamientos.filter(f => f.origen_fondo === 'Subvención Regular').reduce((sum, f) => sum + f.horas, 0);
  const totalSep = financiamientos.filter(f => f.origen_fondo === 'SEP').reduce((sum, f) => sum + f.horas, 0);
  const totalPie = financiamientos.filter(f => f.origen_fondo === 'PIE').reduce((sum, f) => sum + f.horas, 0);
  const totalRef = financiamientos.filter(f => f.origen_fondo === 'Reforzamiento').reduce((sum, f) => sum + f.horas, 0);
  const totalPro = financiamientos.filter(f => f.origen_fondo === 'Pro-retención').reduce((sum, f) => sum + f.horas, 0);
  const totalOtro = financiamientos.filter(f => f.origen_fondo === 'Otro').reduce((sum, f) => sum + f.horas, 0);
  const sumFinanciamientos = totalRegular + totalSep + totalPie + totalRef + totalPro + totalOtro;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slep-blue text-white shadow-md py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-2xl hover:opacity-80 transition-opacity">💼</Link>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold leading-none">Profesional SLEP (Supervisor Técnico)</p>
              <h1 className="text-lg font-bold tracking-tight mt-1">Bandeja de Tutela • RUN {profesionalRun}</h1>
            </div>
          </div>
          <Link href="/" className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors border border-white/10">
            Cerrar Sesión
          </Link>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        
        {/* Left column: Assigned schools heat status */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white rounded-xl shadow border border-slate-200/60 p-4 flex justify-between items-center bg-blue-50/20">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Escuelas Asignadas en Tutela</p>
              <p className="text-xl font-bold text-slep-blue mt-0.5">{escuelasAsignadasRbd.length} Establecimientos</p>
            </div>
            <div>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                Jurisdicción Limitada
              </span>
            </div>
          </div>

          {/* List of supervised schools */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Establecimientos bajo tu Supervisión</h2>
                <p className="text-xs text-slate-500 mt-1">Solo visualizas y cargas nóminas para las escuelas de tu grupo asignado.</p>
              </div>
              <input 
                type="text" 
                placeholder="Filtrar por RBD..." 
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                value={searchEst}
                onChange={(e) => setSearchEst(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="p-3 pl-6">RBD</th>
                    <th className="p-3">Nombre Establecimiento</th>
                    <th className="p-3 text-center">IVM (%)</th>
                    <th className="p-3 text-center">Contratos</th>
                    <th className="p-3 text-center">Alertas Pendientes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEsts.map(e => {
                    const estConts = contratos.filter(c => c.rbd === e.rbd);
                    const estAlts = alertas.filter(a => a.rbd === e.rbd && !a.resuelta);
                    return (
                      <tr key={e.rbd} className="hover:bg-slate-50">
                        <td className="p-3 pl-6 font-mono font-medium text-slate-500">{e.rbd}</td>
                        <td className="p-3 font-semibold text-slate-800">{e.nombre}</td>
                        <td className="p-3 text-center font-bold">{e.ivm}%</td>
                        <td className="p-3 text-center">{estConts.length}</td>
                        <td className="p-3 text-center">
                          {estAlts.length > 0 ? (
                            <span className="bg-slep-coral/20 text-red-800 font-bold px-2 py-0.5 rounded-full">
                              ⚠️ {estAlts.length} Alertas
                            </span>
                          ) : (
                            <span className="bg-slep-emerald/20 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                              ✓ Sin Alertas
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEsts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                        No tiene escuelas asignadas en la base de datos de tutela.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Local SIGE load and financial dashboard */}
        <div className="space-y-6">
          
          {/* CSV Import restricted */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 p-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>📥</span> Cargar Nómina SIGE (Autorizada)
            </h2>
            <p className="text-xs text-slate-500 mt-1">Sube planillas de tus escuelas. Si incluyes un RBD ajeno, se rechazará.</p>

            <textarea 
              rows={4}
              placeholder="RUN,Nombre,RBD,CalidadJuridica,Funcion,HorasTotales,SubvencionRegular..."
              className="w-full mt-4 p-2 border border-slate-300 rounded-lg text-xs font-mono"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />

            <div className="mt-2 flex justify-between gap-2">
              <button 
                onClick={() => {
                  const demoRbd = escuelasAsignadasRbd[0] || '10202';
                  setCsvText(
                    `RUN,Nombre,RBD,CalidadJuridica,Funcion,HorasTotales,SubvencionRegular,SEP,PIE\n12.345.678-9,María Loreto González Soto,${demoRbd},Titular,Docente de Aula,44,30,14,0\n15.432.987-k,Carlos Andrés Muñoz Riquelme,${demoRbd},Contrata,Docente de Aula,38,0,0,38`
                  );
                }}
                className="text-xs text-slep-blue font-semibold hover:underline"
              >
                Cargar Demo
              </button>

              <button 
                onClick={handleImportCsv}
                className="bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark px-4 py-1.5 rounded text-xs font-bold shadow"
              >
                Cargar SIGE
              </button>
            </div>

            {importLogs && (
              <pre className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded text-[9px] text-slate-600 whitespace-pre-wrap">
                {importLogs}
              </pre>
            )}
          </div>

          {/* Group Financial Dashboard */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 p-6">
            <h2 className="text-base font-bold text-slate-800">Finanzas Grupo Asignado</h2>
            <p className="text-xs text-slate-500 mt-1">Distribución de fondos para tus escuelas supervisadas.</p>
            
            <div className="mt-6 space-y-4">
              {[
                { name: 'Subvención Regular', hours: totalRegular, color: 'bg-blue-600' },
                { name: 'SEP', hours: totalSep, color: 'bg-amber-500' },
                { name: 'PIE', hours: totalPie, color: 'bg-purple-500' },
                { name: 'Otros', hours: totalRef + totalPro + totalOtro, color: 'bg-slate-500' },
              ].map(fund => {
                const percentage = sumFinanciamientos > 0 ? (fund.hours / sumFinanciamientos) * 100 : 0;
                return (
                  <div key={fund.name} className="space-y-1 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-600">{fund.name}</span>
                      <span>{fund.hours.toFixed(1)} hrs ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${fund.color}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active alerts for their assigned group */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 p-6">
            <h2 className="text-base font-bold text-slate-800">Alertas de Conciliación de Grupo</h2>
            
            <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {alertas.filter(a => !a.resuelta).map(a => (
                <div key={a.id} className="p-3 bg-red-50 border border-red-200 rounded text-[11px] text-red-950">
                  <p className="font-bold">{a.mensaje}</p>
                  <p className="text-slate-600 mt-0.5">{a.detalle}</p>
                  <span className="text-[9px] font-bold font-mono uppercase bg-red-100 text-red-800 px-1 py-0.2 rounded mt-1 inline-block">
                    RBD {a.rbd}
                  </span>
                </div>
              ))}
              {alertas.filter(a => !a.resuelta).length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">No hay alertas pendientes en tus establecimientos.</p>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
