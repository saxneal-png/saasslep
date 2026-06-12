'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, dbLocal } from '@/lib/supabase';
import { parsearNominaCsv, normalizarRun } from '@/lib/csvParser';
import { PLANES_MINEDUC, validarCargaDocente, calcularLey20903 } from '@/lib/rulesEngine';
import { 
  Establecimiento, 
  Contrato, 
  AsignacionAula, 
  AlertaConciliacion, 
  Funcionario,
  FinanciamientoContrato
} from '@/lib/types';

export default function EscuelaDashboard() {
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [selectedRbd, setSelectedRbd] = useState<string>('');
  const [colegio, setColegio] = useState<Establecimiento | null>(null);

  // Active School State
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAula[]>([]);
  const [alertas, setAlertas] = useState<AlertaConciliacion[]>([]);

  // CSV Load State
  const [csvText, setCsvText] = useState('');
  const [importLogs, setImportLogs] = useState<string>('');

  // Course & Hours planner state
  const [selectedNivel, setSelectedNivel] = useState('1° a 4° Básico');
  const [selectedRegimen, setSelectedRegimen] = useState<'JEC' | 'No JEC'>('JEC');
  const [cursoNombre, setCursoNombre] = useState('3° Básico A');
  const [selectedAsignatura, setSelectedAsignatura] = useState('Matemática');
  const [selectedDocenteRun, setSelectedDocenteRun] = useState('');
  const [asignacionHoras, setAsignacionHoras] = useState(6);
  
  // Itinerancy warning state
  const [itineranciaAlerta, setItineranciaAlerta] = useState<string | null>(null);

  // Load basic schools
  useEffect(() => {
    async function loadSchools() {
      const list = await api.getEstablecimientos();
      setEstablecimientos(list);
      // Select the first one by default
      if (list.length > 0) {
        setSelectedRbd(list[0].rbd);
      }
    }
    loadSchools();
  }, []);

  // Sync details when selectedRbd changes
  useEffect(() => {
    if (!selectedRbd) return;
    
    async function loadSchoolData() {
      const est = await api.getEstablecimientoByRbd(selectedRbd);
      setColegio(est || null);

      const conts = await api.getContratos(selectedRbd);
      const funcs = await api.getFuncionarios();
      const asigs = await api.getAsignacionesPorEstablecimiento(selectedRbd);
      const alts = await api.getAlertas(selectedRbd);

      setContratos(conts);
      setFuncionarios(funcs);
      setAsignaciones(asigs);
      setAlertas(alts);
    }
    loadSchoolData();
    setImportLogs('');
    setCsvText('');
    setItineranciaAlerta(null);
  }, [selectedRbd]);

  // Check for multi-school active contracts when selected teacher changes
  useEffect(() => {
    if (!selectedDocenteRun) {
      setItineranciaAlerta(null);
      return;
    }
    
    // Check if teacher has contracts in other schools
    const allContratos = dbLocal.contratos; // Read directly from db
    const otherContratos = allContratos.filter(c => 
      normalizarRun(c.funcionario_run) === normalizarRun(selectedDocenteRun) && 
      c.rbd !== selectedRbd
    );

    if (otherContratos.length > 0) {
      const details = otherContratos.map(c => {
        const est = establecimientos.find(e => e.rbd === c.rbd);
        return `RBD ${c.rbd} (${est ? est.nombre : 'Otra Escuela'}) con ${c.horas_totales} hrs`;
      }).join(', ');
      
      setItineranciaAlerta(`⚠️ Alerta de Itinerancia: El funcionario registra contratos activos en otras escuelas del sistema: ${details}. Evite sobre-asignar su carga horaria legal.`);
    } else {
      setItineranciaAlerta(null);
    }
  }, [selectedDocenteRun, selectedRbd, establecimientos]);

  // CSV Import simulation
  const handleImportCsv = async () => {
    if (!csvText.trim()) {
      alert('Por favor ingrese o pegue el contenido CSV.');
      return;
    }

    try {
      // Mock internal control previa list for comparison
      const controlPrevioMock = [
        { run: '12.345.678-9', funcion: 'Docente de Aula', horas: 44 },
        { run: '15.432.987-K', funcion: 'Director de Escuela', horas: 38 }
      ];

      const { funcionarios: newFuncs, contratos: newConts, financiamientos: newFins, alertas: newAlts } = parsearNominaCsv(
        csvText, 
        selectedRbd,
        controlPrevioMock
      );

      // Save to DB
      for (const f of newFuncs) {
        await api.upsertFuncionario(f);
      }

      for (const c of newConts) {
        // filter financiamientos belonging to this contract
        const cFins = newFins.filter(f => f.contrato_id === c.id);
        await api.upsertContratoCompleto(c, cFins);
      }

      for (const a of newAlts) {
        await api.crearAlerta(a);
      }

      // Reload
      const updatedConts = await api.getContratos(selectedRbd);
      const updatedFuncs = await api.getFuncionarios();
      const updatedAlts = await api.getAlertas(selectedRbd);

      setContratos(updatedConts);
      setFuncionarios(updatedFuncs);
      setAlertas(updatedAlts);

      setImportLogs(`✅ Éxito: Se procesaron ${newConts.length} contratos y se generaron ${newAlts.length} alertas de conciliación.`);
    } catch (error: any) {
      setImportLogs(`❌ Error de procesamiento: ${error.message}`);
    }
  };

  // Assign hours
  const handleAddAsignacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocenteRun) {
      alert('Debe seleccionar un docente.');
      return;
    }

    const contratoDocente = contratos.find(c => normalizarRun(c.funcionario_run) === normalizarRun(selectedDocenteRun));
    if (!contratoDocente) {
      alert('El docente no tiene un contrato registrado para esta escuela.');
      return;
    }

    const nuevaAsig: AsignacionAula = {
      id: `asig-${Date.now()}`,
      contrato_id: contratoDocente.id,
      curso: cursoNombre,
      asignatura: selectedAsignatura,
      horas: parseFloat(asignacionHoras.toString())
    };

    await api.saveAsignacion(nuevaAsig);
    const updatedAsigs = await api.getAsignacionesPorEstablecimiento(selectedRbd);
    setAsignaciones(updatedAsigs);
  };

  const handleDeleteAsignacion = async (id: string) => {
    await api.deleteAsignacion(id);
    const updatedAsigs = await api.getAsignacionesPorEstablecimiento(selectedRbd);
    setAsignaciones(updatedAsigs);
  };

  // Toggle Contract status (Licence / Active)
  const handleToggleLicencia = async (contratoId: string, enLicencia: boolean) => {
    const contrato = contratos.find(c => c.id === contratoId);
    if (!contrato) return;

    const nuevoEstado = enLicencia ? 'Licencia Médica' : 'Activo';
    await api.updateContratoEstado(contratoId, nuevoEstado);

    // Reload
    const updatedConts = await api.getContratos(selectedRbd);
    setContratos(updatedConts);
  };

  // Add replacement contract
  const handleAddReemplazo = async (titularContrato: Contrato, runReemplazante: string) => {
    const cleanRun = normalizarRun(runReemplazante);
    if (!cleanRun) {
      alert('RUN inválido');
      return;
    }

    // Check if funcionario exists, else create mock
    const allFuncs = await api.getFuncionarios();
    if (!allFuncs.some(f => normalizarRun(f.run) === cleanRun)) {
      await api.upsertFuncionario({
        run: cleanRun,
        nombre: 'Reemplazante Asignado'
      });
    }

    const replacementId = `reemp-${Date.now()}`;
    const nuevoContrato: Contrato = {
      id: replacementId,
      funcionario_run: cleanRun,
      rbd: selectedRbd,
      calidad_juridica: 'Contrata',
      funcion_principal: 'Reemplazo Docente',
      estado: 'Reemplazo',
      horas_totales: titularContrato.horas_totales,
      vinculo_titular_id: titularContrato.id
    };

    const financiamientoEspejo: FinanciamientoContrato = {
      id: `fin-reemp-${replacementId}`,
      contrato_id: replacementId,
      origen_fondo: 'Subvención Regular',
      horas: titularContrato.horas_totales
    };

    await api.upsertContratoCompleto(nuevoContrato, [financiamientoEspejo]);
    
    // Copy active classroom allocations to replacement
    const titularAsigs = asignaciones.filter(a => a.contrato_id === titularContrato.id);
    for (const a of titularAsigs) {
      await api.saveAsignacion({
        id: `asig-reemp-${Date.now()}-${Math.random()}`,
        contrato_id: replacementId,
        curso: a.curso,
        asignatura: a.asignatura,
        horas: a.horas
      });
    }

    // Reload
    const updatedConts = await api.getContratos(selectedRbd);
    const updatedAsigs = await api.getAsignacionesPorEstablecimiento(selectedRbd);
    const updatedFuncs = await api.getFuncionarios();
    
    setContratos(updatedConts);
    setAsignaciones(updatedAsigs);
    setFuncionarios(updatedFuncs);

    alert('✅ Contrato de reemplazo creado en espejo de forma exitosa.');
  };

  // Curricular studies for the matrix selector
  const planEstudioSeleccionado = PLANES_MINEDUC.find(p => p.nivel === selectedNivel && p.regimen === selectedRegimen);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slep-blue text-white shadow-md py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <span className="text-2xl">🎒</span>
            </Link>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold leading-none">Panel Escuela</p>
              <h1 className="text-lg font-bold tracking-tight mt-1">Planificador y Conciliador Escolar</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="bg-slep-blue-dark border border-white/20 text-white font-medium px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-white"
              value={selectedRbd}
              onChange={(e) => setSelectedRbd(e.target.value)}
            >
              {establecimientos.map(e => (
                <option key={e.rbd} value={e.rbd}>{e.nombre} (RBD {e.rbd})</option>
              ))}
            </select>
            <Link href="/" className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors border border-white/10">
              Inicio
            </Link>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        
        {/* Left Column: Data ingestion and alerts */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* School Details */}
          {colegio && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200/60 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-slep-blue/5 rounded-bl-full"></div>
              <h2 className="text-xl font-bold text-slate-800">{colegio.nombre}</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold uppercase block">RBD</span>
                  <span className="font-mono text-slate-700 text-sm font-semibold">{colegio.rbd}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase block">Comuna</span>
                  <span className="text-slate-700 text-sm font-semibold">{colegio.comuna}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase block">Vulnerabilidad (IVM)</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-xs ${colegio.ivm > 80 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {colegio.ivm}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase block">Régimen</span>
                  <span className="text-slate-700 text-sm font-semibold">{colegio.regimen}</span>
                </div>
              </div>
            </div>
          )}

          {/* Ingestion CSV Component */}
          <div className="bg-white rounded-xl shadow-md border border-slate-200/60 p-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>📥</span> Ingesta de Nómina SIGE (CSV)
            </h3>
            <p className="text-xs text-slate-500 mt-1">Carga el CSV exportado del SIGE para conciliar subvenciones.</p>
            
            <textarea 
              rows={4}
              placeholder="Paste CSV: RUN,Nombre,RBD,CalidadJuridica,Funcion,HorasTotales,SubvencionRegular,SEP,PIE"
              className="w-full mt-4 p-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slep-blue"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />

            <div className="mt-2 flex gap-2 justify-between">
              <button 
                onClick={() => setCsvText(
                  `RUN,Nombre,RBD,CalidadJuridica,Funcion,HorasTotales,SubvencionRegular,SEP,PIE\n12.345.678-9,María Loreto González Soto,${selectedRbd},Titular,Docente de Aula,44,30,14,0\n15.432.987-k,Carlos Andrés Muñoz Riquelme,${selectedRbd},Contrata,Docente de Aula,38,0,0,38\n21.234.567-8,Nuevo Docente Prueba,${selectedRbd},Contrata,Docente de Aula,30,15,10,5`
                )}
                className="text-xs text-slep-blue font-semibold hover:underline"
              >
                Cargar Plantilla Demo
              </button>

              <button 
                onClick={handleImportCsv}
                className="bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark px-4 py-1.5 rounded-lg text-xs font-bold shadow"
              >
                Procesar y Conciliar
              </button>
            </div>

            {importLogs && (
              <pre className="mt-4 p-2 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-600 whitespace-pre-wrap">
                {importLogs}
              </pre>
            )}
          </div>

          {/* Discrepancies Alerts */}
          <div className="bg-white rounded-xl shadow-md border border-slate-200/60 p-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>⚠️</span> Alertas de Conciliación
            </h3>
            
            <div className="mt-4 space-y-3 max-h-[200px] overflow-y-auto pr-1">
              {alertas.filter(a => !a.resuelta).map(a => (
                <div 
                  key={a.id} 
                  className={`p-3 rounded-lg border text-xs relative ${
                    a.nivel_alerta === 'critica' 
                      ? 'bg-red-50 border-red-200 text-red-900' 
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <p className="font-bold">{a.mensaje}</p>
                  <p className="mt-1 text-slate-600 leading-normal">{a.detalle}</p>
                  <p className="mt-1 font-semibold text-[10px] font-mono">{a.nombre_funcionario} ({a.run})</p>
                  <button 
                    onClick={() => api.resolverAlerta(a.id).then(() => api.getAlertas(selectedRbd).then(setAlertas))}
                    className="absolute top-2 right-2 text-[10px] bg-white border border-slate-300 hover:bg-slate-50 px-2 py-0.5 rounded"
                  >
                    Resolver
                  </button>
                </div>
              ))}
              {alertas.filter(a => !a.resuelta).length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">No hay alertas de conciliación pendientes.</p>
              )}
            </div>
          </div>

        </div>

        {/* Center/Right Columns: Planner, Matriz Horaria & Ley 20.903 */}
        <div className="lg:col-span-2 space-y-6">

          {/* Matriz Horaria Interactive Planner */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 p-6">
            <h3 className="text-lg font-bold text-slate-800">Matriz Horaria e Asignación Curricular</h3>
            <p className="text-xs text-slate-500 mt-1">Precarga los decretos oficiales del MINEDUC y asigna docentes.</p>

            <form onSubmit={handleAddAsignacion} className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nivel MINEDUC</label>
                <select 
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  value={selectedNivel}
                  onChange={(e) => setSelectedNivel(e.target.value)}
                >
                  <option value="1° a 4° Básico">1° a 4° Básico</option>
                  <option value="5° a 8° Básico">5° a 8° Básico</option>
                  <option value="Educación Parvularia (Pre-Kínder y Kínder)">Educación Parvularia</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Curso</label>
                <input 
                  type="text"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  value={cursoNombre}
                  onChange={(e) => setCursoNombre(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Asignatura</label>
                <select 
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  value={selectedAsignatura}
                  onChange={(e) => setSelectedAsignatura(e.target.value)}
                >
                  {planEstudioSeleccionado?.asignaturasBase.map(a => (
                    <option key={a.nombre} value={a.nombre}>{a.nombre} ({a.horasSugeridas}h)</option>
                  )) || <option value="Otros">General</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Horas Semanales</label>
                <input 
                  type="number"
                  step="0.1"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  value={asignacionHoras}
                  onChange={(e) => setAsignacionHoras(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Seleccionar Docente Activo</label>
                <select 
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  value={selectedDocenteRun}
                  onChange={(e) => setSelectedDocenteRun(e.target.value)}
                >
                  <option value="">-- Seleccionar Funcionario --</option>
                  {contratos.map(c => {
                    const func = funcionarios.find(f => normalizarRun(f.run) === normalizarRun(c.funcionario_run));
                    return (
                      <option key={c.id} value={c.funcionario_run}>
                        {func ? func.nombre : c.funcionario_run} ({c.horas_totales} hrs • {c.estado})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-end">
                <button 
                  type="submit"
                  className="w-full bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark font-bold py-2 rounded-lg text-xs shadow"
                >
                  Asignar Carga
                </button>
              </div>
            </form>

            {/* Itinerancy warning alert in-place */}
            {itineranciaAlerta && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-2.5 rounded-lg font-medium">
                {itineranciaAlerta}
              </div>
            )}

            {/* Asignadas Matrix Table */}
            <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="p-3 pl-4">Curso</th>
                    <th className="p-3">Asignatura</th>
                    <th className="p-3">Docente</th>
                    <th className="p-3 text-center">Horas Asignadas</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {asignaciones.map(a => {
                    const c = contratos.find(contract => contract.id === a.contrato_id);
                    const func = c ? funcionarios.find(f => normalizarRun(f.run) === normalizarRun(c.funcionario_run)) : null;
                    
                    return (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="p-3 pl-4 font-bold text-slate-800">{a.curso}</td>
                        <td className="p-3 text-slate-700">{a.asignatura}</td>
                        <td className="p-3 text-slate-800">
                          {func ? func.nombre : 'Sin Asignar'} {c?.estado === 'Licencia Médica' && '🛑 (En Licencia)'}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">{a.horas.toFixed(1)} hrs</td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => handleDeleteAsignacion(a.id)}
                            className="text-red-500 hover:text-red-700 font-semibold"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {asignaciones.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-500">
                        No hay asignaciones en aula registradas para este establecimiento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Docentes Carga & Ley 20.903 Tracker */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 p-6">
            <h3 className="text-lg font-bold text-slate-800">Cumplimiento Ley 20.903 (Proporción Lectiva/No Lectiva)</h3>
            <p className="text-xs text-slate-500 mt-1">Estatus del semáforo legal por funcionario.</p>

            <div className="mt-6 space-y-4">
              {contratos.map(c => {
                const func = funcionarios.find(f => normalizarRun(f.run) === normalizarRun(c.funcionario_run));
                const teacherAsigs = asignaciones.filter(a => a.contrato_id === c.id);
                const metrics = colegio ? validarCargaDocente(c, colegio, teacherAsigs) : null;

                if (!metrics) return null;

                // Traffic Light Colors
                let alertColor = 'border-slep-emerald bg-emerald-50 text-emerald-950';
                let indicatorName = 'Cumplimiento OK';

                if (c.estado === 'Licencia Médica') {
                  alertColor = 'border-amber-400 bg-amber-50 text-amber-950';
                  indicatorName = 'Horas Congeladas (Licencia)';
                } else if (!metrics.cumpleLey20903) {
                  alertColor = 'border-slep-coral bg-red-50 text-red-950';
                  indicatorName = 'Infracción Ley 20.903 (Lectivas Excedidas)';
                } else if (metrics.horasDisponibles > 0.05) {
                  alertColor = 'border-slep-warning bg-amber-50 text-amber-950';
                  indicatorName = `Advertencia: ${metrics.horasDisponibles.toFixed(1)} hrs Disponibles`;
                }

                return (
                  <div key={c.id} className={`p-4 rounded-xl border-l-4 shadow-sm relative ${alertColor}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          {func ? func.nombre : c.funcionario_run} 
                          <span className="text-xs text-slate-500 font-mono ml-2 font-normal">({c.calidad_juridica})</span>
                        </h4>
                        <p className="text-xs mt-1 text-slate-600">
                          Contrato: {c.horas_totales} hrs • Aula Asignada: <strong>{metrics.horasLectivasAsignadas.toFixed(1)} hrs</strong> (Límite: {metrics.horasLectivasMaximas.toFixed(1)} hrs).
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">
                          Proporción Legal Aplicada: {metrics.proporcionLectiva}/{metrics.proporcionNoLectiva} {metrics.leyEspecialAplicada && '⭐ (Ley Especial IVM > 80%)'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold block">{indicatorName}</span>
                        
                        {/* Replacement creation action in licence cases */}
                        {c.estado === 'Licencia Médica' ? (
                          <button 
                            onClick={() => {
                              const rRun = prompt('Ingrese RUN del docente de reemplazo (ej: 18.901.234-5):');
                              if (rRun) handleAddReemplazo(c, rRun);
                            }}
                            className="mt-2 text-xs bg-slep-blue text-white font-bold px-2 py-1 rounded shadow"
                          >
                            Crear Reemplazo Espejo
                          </button>
                        ) : (
                          <div className="mt-2 flex items-center gap-1 justify-end">
                            <span className="text-[10px] text-slate-500">¿Licencia Médica?</span>
                            <input 
                              type="checkbox" 
                              checked={false}
                              onChange={(e) => handleToggleLicencia(c.id, e.target.checked)}
                            />
                          </div>
                        )}
                      </div>
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
