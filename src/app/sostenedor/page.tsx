'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/supabase';
import { parsearNominaCsv, normalizarRun } from '@/lib/csvParser';
import { PLANES_MINEDUC } from '@/lib/rulesEngine';
import { 
  Establecimiento, 
  Funcionario, 
  Contrato, 
  FinanciamientoContrato, 
  AlertaConciliacion,
  ProfesionalEscuelaAsignada
} from '@/lib/types';

export default function SostenedorDashboard() {
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [financiamientos, setFinanciamientos] = useState<FinanciamientoContrato[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [alertas, setAlertas] = useState<AlertaConciliacion[]>([]);
  
  // Tutorship/Tutela State
  const [tutelas, setTutelas] = useState<ProfesionalEscuelaAsignada[]>([]);
  const [selectedProfRun, setSelectedProfRun] = useState('11.111.111-1');
  const [assignRbd, setAssignRbd] = useState('');

  // CSV State
  const [csvText, setCsvText] = useState('');
  const [importLogs, setImportLogs] = useState('');

  // Search and filters
  const [searchEst, setSearchEst] = useState('');
  const [selectedComuna, setSelectedComuna] = useState('Todas');
  const [searchRun, setSearchRun] = useState('');
  const [searchRunResult, setSearchRunResult] = useState<{
    funcionario: Funcionario;
    contratos: (Contrato & { escuelaNombre: string; financiamientos: FinanciamientoContrato[] })[];
    totalHoras: number;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      const ests = await api.getEstablecimientos();
      const conts = await api.getContratos();
      const funcs = await api.getFuncionarios();
      const alts = await api.getAlertas();
      const tuts = await api.getTodasLasTutelas();
      
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
      setTutelas(tuts);

      if (ests.length > 0) {
        setAssignRbd(ests[0].rbd);
      }
    }
    loadData();
  }, []);

  const handleAssignSchool = async () => {
    if (!selectedProfRun || !assignRbd) return;
    await api.asignarEscuelaAProfesional(selectedProfRun, assignRbd);
    const updated = await api.getTodasLasTutelas();
    setTutelas(updated);
    alert('✅ Escuela asignada exitosamente al Profesional SLEP.');
  };

  const handleRemoveSchool = async (profRun: string, rbd: string) => {
    await api.removerEscuelaDeProfesional(profRun, rbd);
    const updated = await api.getTodasLasTutelas();
    setTutelas(updated);
  };

  const handleGlobalImportCsv = async () => {
    if (!csvText.trim()) {
      alert('Por favor ingrese o pegue el contenido CSV.');
      return;
    }
    try {
      const controlPrevioMock = [
        { run: '12.345.678-9', funcion: 'Docente de Aula', horas: 44 },
        { run: '15.432.987-K', funcion: 'Director de Escuela', horas: 38 }
      ];

      const { funcionarios: newFuncs, contratos: newConts, financiamientos: newFins, alertas: newAlts } = parsearNominaCsv(
        csvText,
        '10201', // Default global fallbacks
        controlPrevioMock
      );

      for (const f of newFuncs) {
        await api.upsertFuncionario(f);
      }
      for (const c of newConts) {
        const cFins = newFins.filter(f => f.contrato_id === c.id);
        await api.upsertContratoCompleto(c, cFins);
      }
      for (const a of newAlts) {
        await api.crearAlerta(a);
      }

      const updatedConts = await api.getContratos();
      const updatedFuncs = await api.getFuncionarios();
      const updatedAlts = await api.getAlertas();

      setContratos(updatedConts);
      setFuncionarios(updatedFuncs);
      setAlertas(updatedAlts);

      setImportLogs(`✅ Éxito global: Se procesaron ${newConts.length} contratos y se generaron ${newAlts.length} alertas.`);
    } catch (e: any) {
      setImportLogs(`❌ Error: ${e.message}`);
    }
  };

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

  const comunas = ['Todas', ...Array.from(new Set(establecimientos.map(e => e.comuna)))];

  const filteredEstablecimientos = establecimientos.filter(e => {
    const matchesSearch = e.nombre.toLowerCase().includes(searchEst.toLowerCase()) || e.rbd.includes(searchEst);
    const matchesComuna = selectedComuna === 'Todas' || e.comuna === selectedComuna;
    return matchesSearch && matchesComuna;
  });

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
            <Link href="/" className="text-2xl hover:opacity-80 transition-opacity">👑</Link>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold leading-none">Sostenedor Maestro (SLEP General)</p>
              <h1 className="text-lg font-bold tracking-tight mt-1">Consola Territorial Completa</h1>
            </div>
          </div>
          <Link href="/" className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors border border-white/10">
            Cerrar Sesión
          </Link>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        
        {/* Left Column: Heatmap and supervisor assignments */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Heatmap/List of schools */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-800">Establecimientos del Territorio (131)</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Control global de dotación y alertas críticas.</p>
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="RBD o Escuela..." 
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  value={searchEst}
                  onChange={(e) => setSearchEst(e.target.value)}
                />
                <select
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  value={selectedComuna}
                  onChange={(e) => setSelectedComuna(e.target.value)}
                >
                  {comunas.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="max-h-[350px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 font-bold uppercase text-slate-600 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 pl-6">RBD</th>
                    <th className="p-3">Establecimiento</th>
                    <th className="p-3 text-center">IVM</th>
                    <th className="p-3 text-center">Contratos</th>
                    <th className="p-3 text-center">Supervisor Asignado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEstablecimientos.map(e => {
                    const estConts = contratos.filter(c => c.rbd === e.rbd);
                    const supervisorList = tutelas.filter(t => t.establecimiento_rbd === e.rbd);
                    
                    return (
                      <tr key={e.rbd} className="hover:bg-slate-50">
                        <td className="p-3 pl-6 font-mono font-medium text-slate-500">{e.rbd}</td>
                        <td className="p-3 font-semibold text-slate-800">{e.nombre}</td>
                        <td className="p-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${e.ivm > 80 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {e.ivm}%
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-600">{estConts.length}</td>
                        <td className="p-3 text-center">
                          {supervisorList.length > 0 ? (
                            <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                              👤 {supervisorList.map(s => s.profesional_run === '11.111.111-1' ? 'Supervisor 1' : 'Supervisor 2').join(', ')}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold italic">Sin asignar</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supervisor assignments module (Profesionales SLEP) */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 p-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>🔗</span> Asignación de Tutela Escolar (Profesionales SLEP)
            </h2>
            <p className="text-xs text-slate-500 mt-1">Conecta a los supervisores técnicos con los colegios específicos que auditarán.</p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Profesional / Supervisor</label>
                <select
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  value={selectedProfRun}
                  onChange={(e) => setSelectedProfRun(e.target.value)}
                >
                  <option value="11.111.111-1">Supervisor 1 (11.111.111-1)</option>
                  <option value="22.222.222-2">Supervisor 2 (22.222.222-2)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Escuela a Asignar</label>
                <select
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  value={assignRbd}
                  onChange={(e) => setAssignRbd(e.target.value)}
                >
                  {establecimientos.slice(0, 15).map(e => (
                    <option key={e.rbd} value={e.rbd}>{e.nombre} (RBD {e.rbd})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAssignSchool}
                  className="w-full bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark font-bold py-2 rounded-lg text-xs shadow"
                >
                  Vincular Tutela
                </button>
              </div>
            </div>

            {/* List of active tutelas */}
            <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 font-bold text-slate-600">
                  <tr>
                    <th className="p-3">Supervisor</th>
                    <th className="p-3">Escuela Asignada</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tutelas.map(t => {
                    const esc = establecimientos.find(e => e.rbd === t.establecimiento_rbd);
                    return (
                      <tr key={`${t.profesional_run}-${t.establecimiento_rbd}`}>
                        <td className="p-3 font-semibold text-slate-800">
                          {t.profesional_run === '11.111.111-1' ? 'Supervisor 1' : 'Supervisor 2'} ({t.profesional_run})
                        </td>
                        <td className="p-3 text-slate-700">{esc ? esc.nombre : `RBD ${t.establecimiento_rbd}`}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleRemoveSchool(t.profesional_run, t.establecimiento_rbd)}
                            className="text-red-500 hover:text-red-700 font-semibold"
                          >
                            Eliminar Vínculo
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Global Ingestion & Search RUN & Financial consolidado */}
        <div className="space-y-6">
          
          {/* CSV Global Ingest */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 p-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>📥</span> Carga Global de Nóminas SIGE
            </h2>
            <p className="text-xs text-slate-500 mt-1">Carga planillas consolidadas para todo el territorio del Valle Diguillín.</p>

            <textarea 
              rows={4}
              placeholder="Pegue aquí el CSV con el formato regular..."
              className="w-full mt-4 p-2 border border-slate-300 rounded-lg text-xs font-mono"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />

            <div className="mt-2 flex justify-between gap-2">
              <button 
                onClick={() => setCsvText(
                  `RUN,Nombre,RBD,CalidadJuridica,Funcion,HorasTotales,SubvencionRegular,SEP,PIE\n12.345.678-9,María Loreto González Soto,10201,Titular,Docente de Aula,44,30,14,0\n15.432.987-k,Carlos Andrés Muñoz Riquelme,10202,Contrata,Docente de Aula,38,0,0,38`
                )}
                className="text-xs text-slep-blue font-semibold hover:underline"
              >
                Cargar Demo
              </button>

              <button 
                onClick={handleGlobalImportCsv}
                className="bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark px-4 py-1 rounded text-xs font-bold shadow"
              >
                Importar Masivo
              </button>
            </div>

            {importLogs && (
              <pre className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded text-[9px] text-slate-600 whitespace-pre-wrap">
                {importLogs}
              </pre>
            )}
          </div>

          {/* RUN Search */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 p-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>🔍</span> Buscador Central de RUN
            </h2>
            
            <div className="mt-3 flex gap-2">
              <input 
                type="text" 
                placeholder="RUT..." 
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                value={searchRun}
                onChange={(e) => setSearchRun(e.target.value)}
              />
              <button 
                onClick={handleSearchRun}
                className="bg-slep-blue text-white px-3 py-1 rounded text-xs font-bold"
              >
                Buscar
              </button>
            </div>

            {searchRunResult && (
              <div className="mt-4 bg-slate-50 p-3 rounded-lg border text-xs space-y-2">
                <p className="font-bold text-slate-800">{searchRunResult.funcionario.nombre}</p>
                <div className="space-y-1">
                  {searchRunResult.contratos.map(c => (
                    <div key={c.id} className="flex justify-between border-b pb-1 text-[10px]">
                      <span>{c.escuelaNombre}</span>
                      <span className="font-bold text-slep-blue">{c.horas_totales} hrs ({c.estado})</span>
                    </div>
                  ))}
                </div>
                <p className="font-bold text-slate-700 text-right">Total: {searchRunResult.totalHoras} hrs</p>
              </div>
            )}
          </div>

          {/* Financial Consolidated */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 p-6">
            <h2 className="text-base font-bold text-slate-800">Consolidado Presupuestario</h2>
            
            <div className="mt-4 space-y-3">
              {[
                { name: 'Regular', hours: totalRegular, color: 'bg-blue-600' },
                { name: 'SEP', hours: totalSep, color: 'bg-amber-500' },
                { name: 'PIE', hours: totalPie, color: 'bg-purple-500' },
                { name: 'Otros', hours: totalRef + totalPro + totalOtro, color: 'bg-slate-500' },
              ].map(f => {
                const pct = sumFinanciamientos > 0 ? (f.hours / sumFinanciamientos) * 100 : 0;
                return (
                  <div key={f.name} className="text-xs space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-600">{f.name}</span>
                      <span className="text-slate-800">{f.hours.toFixed(1)} hrs ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${f.color}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
