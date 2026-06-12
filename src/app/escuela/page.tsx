'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/supabase';
import { PLANES_MINEDUC, validarCargaDocente } from '@/lib/rulesEngine';
import { 
  Establecimiento, 
  Contrato, 
  AsignacionAula, 
  AlertaConciliacion, 
  Funcionario,
  CursoDinamico,
  AsignaturaDinamica
} from '@/lib/types';

export default function EscuelaDashboard() {
  const [selectedRbd, setSelectedRbd] = useState<string>('10202'); // Mock default
  const [colegio, setColegio] = useState<Establecimiento | null>(null);

  // Active School State
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAula[]>([]);
  const [alertas, setAlertas] = useState<AlertaConciliacion[]>([]);

  // Dynamic Courses & Subjects
  const [cursosDinamicos, setCursosDinamicos] = useState<CursoDinamico[]>([]);
  const [customCursoNombre, setCustomCursoNombre] = useState('');
  const [customCursoNivel, setCustomCursoNivel] = useState('1° a 4° Básico');
  const [customCursoRegimen, setCustomCursoRegimen] = useState<'JEC' | 'No JEC'>('JEC');

  // Custom Extra-curricular Workshops (SEP) or subjects
  const [customAsigNombre, setCustomAsigNombre] = useState('');
  const [customAsigHoras, setCustomAsigHoras] = useState(4);
  const [selectedCursoForAsig, setSelectedCursoForAsig] = useState('');

  // Course & Hours planner state
  const [selectedCursoPlan, setSelectedCursoPlan] = useState('');
  const [selectedAsignatura, setSelectedAsignatura] = useState('');
  const [selectedDocenteRun, setSelectedDocenteRun] = useState('');
  const [asignacionHoras, setAsignacionHoras] = useState(6);
  
  // Itinerancy warning state
  const [itineranciaAlerta, setItineranciaAlerta] = useState<string | null>(null);

  // Sync role parameters from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rbd = localStorage.getItem('slep_sim_rbd') || '10202';
      setSelectedRbd(rbd);
    }
  }, []);

  // Sync school details when selectedRbd changes
  useEffect(() => {
    if (!selectedRbd) return;
    
    async function loadSchoolData() {
      const est = await api.getEstablecimientoByRbd(selectedRbd);
      setColegio(est || null);

      const conts = await api.getContratos(selectedRbd);
      const funcs = await api.getFuncionarios();
      const asigs = await api.getAsignacionesPorEstablecimiento(selectedRbd);
      const alts = await api.getAlertas(selectedRbd);
      const dynCursos = await api.getCursosDinamicos(selectedRbd);

      setContratos(conts);
      setFuncionarios(funcs);
      setAsignaciones(asigs);
      setAlertas(alts);
      setCursosDinamicos(dynCursos);

      // Default course selection
      if (dynCursos.length > 0) {
        setSelectedCursoForAsig(dynCursos[0].nombre);
        setSelectedCursoPlan(dynCursos[0].nombre);
      }
    }
    loadSchoolData();
    setItineranciaAlerta(null);
  }, [selectedRbd]);

  // Check for multi-school active contracts when selected teacher changes (itinerancy alert)
  useEffect(() => {
    if (!selectedDocenteRun) {
      setItineranciaAlerta(null);
      return;
    }
    
    async function checkItinerancy() {
      const allConts = await api.getContratos();
      const otherConts = allConts.filter(c => 
        c.funcionario_run === selectedDocenteRun && 
        c.rbd !== selectedRbd
      );

      if (otherConts.length > 0) {
        const ests = await api.getEstablecimientos();
        const details = otherConts.map(c => {
          const est = ests.find(e => e.rbd === c.rbd);
          return `RBD ${c.rbd} (${est ? est.nombre : 'Otra Escuela'}) con ${c.horas_totales} hrs`;
        }).join(', ');
        
        setItineranciaAlerta(`⚠️ Alerta de Itinerancia: El docente registra contratos activos en otras escuelas: ${details}. Evite sobre-asignar su carga horaria legal.`);
      } else {
        setItineranciaAlerta(null);
      }
    }
    checkItinerancy();
  }, [selectedDocenteRun, selectedRbd]);

  // Dynamic Course Creation
  const handleCreateCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCursoNombre.trim()) {
      alert('Ingrese un nombre de curso.');
      return;
    }

    const nuevoCurso: CursoDinamico = {
      rbd: selectedRbd,
      nombre: customCursoNombre.trim(),
      nivel: customCursoNivel,
      regimen: customCursoRegimen
    };

    await api.crearCursoDinamico(nuevoCurso);
    const updated = await api.getCursosDinamicos(selectedRbd);
    setCursosDinamicos(updated);
    setCustomCursoNombre('');
    setSelectedCursoForAsig(nuevoCurso.nombre);
    setSelectedCursoPlan(nuevoCurso.nombre);
    alert('✅ Curso creado exitosamente.');
  };

  // Dynamic Subject/Workshop Creation
  const handleCreateAsignatura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCursoForAsig || !customAsigNombre.trim()) {
      alert('Faltan datos para crear la asignatura o taller.');
      return;
    }

    const nuevaAsig: AsignaturaDinamica = {
      rbd: selectedRbd,
      cursoNombre: selectedCursoForAsig,
      nombre: customAsigNombre.trim(),
      horasSugeridas: parseFloat(customAsigHoras.toString()) || 4
    };

    await api.crearAsignaturaDinamica(nuevaAsig);
    setCustomAsigNombre('');
    alert('✅ Asignatura/Taller SEP creado con éxito.');
  };

  // Assign hours
  const handleAddAsignacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocenteRun || !selectedCursoPlan || !selectedAsignatura) {
      alert('Debe seleccionar docente, curso y asignatura.');
      return;
    }

    const contratoDocente = contratos.find(c => c.funcionario_run === selectedDocenteRun);
    if (!contratoDocente) {
      alert('El docente no tiene un contrato registrado para esta escuela.');
      return;
    }

    const nuevaAsig: AsignacionAula = {
      id: `asig-${Date.now()}`,
      contrato_id: contratoDocente.id,
      curso: selectedCursoPlan,
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
    const nuevoEstado = enLicencia ? 'Licencia Médica' : 'Activo';
    await api.updateContratoEstado(contratoId, nuevoEstado);
    const updatedConts = await api.getContratos(selectedRbd);
    setContratos(updatedConts);
  };

  // Add replacement contract
  const handleAddReemplazo = async (titularContrato: Contrato, runReemplazante: string) => {
    const cleanRun = runReemplazante.trim();
    if (!cleanRun) return;

    await api.upsertFuncionario({
      run: cleanRun,
      nombre: 'Reemplazante Asignado'
    });

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

    await api.upsertContratoCompleto(nuevoContrato, [
      {
        id: `fin-reemp-${replacementId}`,
        contrato_id: replacementId,
        origen_fondo: 'Subvención Regular',
        horas: titularContrato.horas_totales
      }
    ]);

    // Copy classroom load
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

    const updatedConts = await api.getContratos(selectedRbd);
    const updatedAsigs = await api.getAsignacionesPorEstablecimiento(selectedRbd);
    const updatedFuncs = await api.getFuncionarios();
    
    setContratos(updatedConts);
    setAsignaciones(updatedAsigs);
    setFuncionarios(updatedFuncs);

    alert('✅ Reemplazo espejo creado con éxito.');
  };

  // Get available subjects for the selected course
  const activeCourse = cursosDinamicos.find(c => c.nombre === selectedCursoPlan);
  const planMineduc = activeCourse ? PLANES_MINEDUC.find(p => p.nivel === activeCourse.nivel && p.regimen === activeCourse.regimen) : null;
  const [dynAsigs, setDynAsigs] = useState<AsignaturaDinamica[]>([]);

  useEffect(() => {
    if (!selectedCursoPlan) return;
    async function loadAsigs() {
      const list = await api.getAsignaturasDinamicas(selectedRbd, selectedCursoPlan);
      setDynAsigs(list);
      
      // Select first subject by default
      if (planMineduc && planMineduc.asignaturasBase.length > 0) {
        setSelectedAsignatura(planMineduc.asignaturasBase[0].nombre);
      } else if (list.length > 0) {
        setSelectedAsignatura(list[0].nombre);
      }
    }
    loadAsigs();
  }, [selectedCursoPlan, selectedRbd, planMineduc]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slep-blue text-white shadow-md py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-2xl hover:opacity-80 transition-opacity">🎒</Link>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold leading-none">Director / UTP de Escuela</p>
              <h1 className="text-lg font-bold tracking-tight mt-1">Gestión Interna del Establecimiento</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-white/10 px-3 py-1.5 rounded text-xs font-mono font-bold">
              RBD: {selectedRbd}
            </span>
            <Link href="/" className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors border border-white/10">
              Cerrar Sesión
            </Link>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        
        {/* Left Column: School details and Course/Subject creation */}
        <div className="space-y-6 lg:col-span-1">
          
          {colegio && (
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-slep-blue/5 rounded-bl-full"></div>
              <h2 className="text-lg font-bold text-slate-800">{colegio.nombre}</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-slate-400 block uppercase">Comuna</span>
                  <span className="text-slate-700">{colegio.comuna}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase">IVM</span>
                  <span className={`px-1.5 py-0.2 rounded ${colegio.ivm > 80 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {colegio.ivm}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Create Dynamic Course Form */}
          <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>🏫</span> Crear Curso Escolar
            </h3>
            
            <form onSubmit={handleCreateCurso} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Nombre del Curso</label>
                <input 
                  type="text" 
                  placeholder="Ej: 3° Básico A, 1° Medio B" 
                  className="w-full p-2 border border-slate-300 rounded"
                  value={customCursoNombre}
                  onChange={(e) => setCustomCursoNombre(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Nivel Educativo</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  value={customCursoNivel}
                  onChange={(e) => setCustomCursoNivel(e.target.value)}
                >
                  <option value="1° a 4° Básico">1° a 4° Básico</option>
                  <option value="5° a 8° Básico">5° a 8° Básico</option>
                  <option value="Educación Parvularia (Pre-Kínder y Kínder)">Educación Parvularia</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Régimen JEC</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  value={customCursoRegimen}
                  onChange={(e) => setCustomCursoRegimen(e.target.value as any)}
                >
                  <option value="JEC">JEC (38 hrs)</option>
                  <option value="No JEC">No JEC (33 hrs)</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full bg-slep-blue text-white py-2 rounded font-bold shadow"
              >
                Crear Curso
              </button>
            </form>
          </div>

          {/* Create Custom Subjects / Extra-curricular workshops (SEP) */}
          <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>🎨</span> Talleres SEP o Asignaturas Propias
            </h3>

            <form onSubmit={handleCreateAsignatura} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Seleccionar Curso</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  value={selectedCursoForAsig}
                  onChange={(e) => setSelectedCursoForAsig(e.target.value)}
                >
                  {cursosDinamicos.map(c => (
                    <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                  ))}
                  {cursosDinamicos.length === 0 && (
                    <option value="">-- Cree un curso primero --</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Nombre Taller / Asignatura</label>
                <input 
                  type="text" 
                  placeholder="Ej: Taller de Robótica SEP" 
                  className="w-full p-2 border border-slate-300 rounded"
                  value={customAsigNombre}
                  onChange={(e) => setCustomAsigNombre(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Horas Semanales</label>
                <input 
                  type="number" 
                  className="w-full p-2 border border-slate-300 rounded font-bold"
                  value={customAsigHoras}
                  onChange={(e) => setCustomAsigHoras(parseFloat(e.target.value) || 0)}
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-slep-blue text-white py-2 rounded font-bold shadow"
              >
                Crear Taller/Asignatura
              </button>
            </form>
          </div>

        </div>

        {/* Center/Right Column: Interactive matrix, Ley 20903, replacement mirroring */}
        <div className="lg:col-span-2 space-y-6">

          {/* Asignación Curricular Matrix */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 p-6">
            <h3 className="text-base font-bold text-slate-800">Planificador de Asignaciones Curriculares</h3>
            <p className="text-xs text-slate-500 mt-1">Arrastra y vincula docentes a los cursos e itinerarios creados.</p>

            <form onSubmit={handleAddAsignacion} className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs border">
              <div>
                <label className="block font-bold text-slate-500 mb-1">Curso Destino</label>
                <select 
                  className="w-full p-2 bg-white border border-slate-300 rounded"
                  value={selectedCursoPlan}
                  onChange={(e) => setSelectedCursoPlan(e.target.value)}
                >
                  <option value="">-- Seleccionar --</option>
                  {cursosDinamicos.map(c => (
                    <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Asignatura / Taller</label>
                <select 
                  className="w-full p-2 bg-white border border-slate-300 rounded"
                  value={selectedAsignatura}
                  onChange={(e) => setSelectedAsignatura(e.target.value)}
                >
                  {planMineduc?.asignaturasBase.map(a => (
                    <option key={a.nombre} value={a.nombre}>{a.nombre}</option>
                  ))}
                  {dynAsigs.map(a => (
                    <option key={a.nombre} value={a.nombre}>{a.nombre} (Custom SEP)</option>
                  ))}
                  {!planMineduc && dynAsigs.length === 0 && (
                    <option value="">-- Ninguna --</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Docente</label>
                <select 
                  className="w-full p-2 bg-white border border-slate-300 rounded"
                  value={selectedDocenteRun}
                  onChange={(e) => setSelectedDocenteRun(e.target.value)}
                >
                  <option value="">-- Seleccionar --</option>
                  {contratos.map(c => {
                    const func = funcionarios.find(f => f.run === c.funcionario_run);
                    return (
                      <option key={c.id} value={c.funcionario_run}>
                        {func ? func.nombre : c.funcionario_run} ({c.horas_totales} hrs)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Horas Semanales</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full p-2 bg-white border border-slate-300 rounded font-bold"
                  value={asignacionHoras}
                  onChange={(e) => setAsignacionHoras(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="md:col-span-4 flex justify-between items-center border-t pt-2 mt-2">
                <span className="text-[11px] text-slate-500 font-medium italic">
                  * Las asignaciones SEP se cargan directamente a los fondos de la Ley de Subvención Escolar Preferencial.
                </span>
                <button 
                  type="submit"
                  className="bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark font-extrabold px-6 py-2 rounded text-xs shadow"
                >
                  Asignar Carga
                </button>
              </div>
            </form>

            {itineranciaAlerta && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-2.5 rounded font-medium">
                {itineranciaAlerta}
              </div>
            )}

            {/* Matrix list */}
            <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3 pl-4">Curso</th>
                    <th className="p-3">Asignatura / Taller</th>
                    <th className="p-3">Docente a Cargo</th>
                    <th className="p-3 text-center">Horas Asignadas</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {asignaciones.map(a => {
                    const c = contratos.find(contract => contract.id === a.contrato_id);
                    const func = c ? funcionarios.find(f => f.run === c.funcionario_run) : null;
                    return (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="p-3 pl-4 font-bold text-slate-800">{a.curso}</td>
                        <td className="p-3 text-slate-700">{a.asignatura}</td>
                        <td className="p-3 text-slate-800">
                          {func ? func.nombre : a.contrato_id} {c?.estado === 'Licencia Médica' && '🛑 (Licencia)'}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">{a.horas} hrs</td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => handleDeleteAsignacion(a.id)}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {asignaciones.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                        No hay asignaciones cargadas en la matriz. Cree un curso y asigne horas arriba.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ley 20.903 & Licenses Panel */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 p-6">
            <h3 className="text-base font-bold text-slate-800">Consolidado Docente y Ley 20.903</h3>
            <p className="text-xs text-slate-500 mt-1">Estatus del cumplimiento lectivo/no lectivo legal.</p>

            <div className="mt-4 space-y-4">
              {contratos.map(c => {
                const func = funcionarios.find(f => f.run === c.funcionario_run);
                const teacherAsigs = asignaciones.filter(a => a.contrato_id === c.id);
                const metrics = colegio ? validarCargaDocente(c, colegio, teacherAsigs) : null;

                if (!metrics) return null;

                let alertColor = 'border-slep-emerald bg-emerald-50 text-emerald-950';
                let indicatorName = 'Cumplimiento OK';

                if (c.estado === 'Licencia Médica') {
                  alertColor = 'border-amber-400 bg-amber-50 text-amber-950';
                  indicatorName = 'Horas Congeladas (Licencia)';
                } else if (!metrics.cumpleLey20903) {
                  alertColor = 'border-slep-coral bg-red-50 text-red-950';
                  indicatorName = 'Horas Lectivas Excedidas';
                } else if (metrics.horasDisponibles > 0.05) {
                  alertColor = 'border-slep-warning bg-amber-50 text-amber-950';
                  indicatorName = `${metrics.horasDisponibles} hrs disponibles`;
                }

                return (
                  <div key={c.id} className={`p-4 rounded-xl border-l-4 shadow-sm text-xs relative ${alertColor}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          {func ? func.nombre : c.funcionario_run} 
                          <span className="text-[10px] text-slate-500 font-mono ml-2">({c.calidad_juridica})</span>
                        </h4>
                        <p className="mt-1 text-slate-600">
                          Contrato: {c.horas_totales} hrs • Aula Asignada: <strong>{metrics.horasLectivasAsignadas} hrs</strong> (Máx legal: {metrics.horasLectivasMaximas} hrs).
                        </p>
                        <p className="text-[9px] text-slate-500 mt-1 font-bold">
                          Ley Especial IVM: {metrics.leyEspecialAplicada ? 'SI (Proporción 60/40)' : 'NO (Proporción 65/35)'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-bold block">{indicatorName}</span>
                        
                        {c.estado === 'Licencia Médica' ? (
                          <button 
                            onClick={() => {
                              const rRun = prompt('RUN del Reemplazante (ej: 18.901.234-5):');
                              if (rRun) handleAddReemplazo(c, rRun);
                            }}
                            className="mt-2 bg-slep-blue text-white font-bold px-2 py-0.5 rounded text-[10px]"
                          >
                            Crear Reemplazo Espejo
                          </button>
                        ) : (
                          <div className="mt-2 flex items-center gap-1 justify-end">
                            <span className="text-[10px] text-slate-500">¿Licencia?</span>
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
