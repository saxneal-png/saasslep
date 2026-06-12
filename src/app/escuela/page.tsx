'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, dbLocal } from '@/lib/supabase';
import { validarCargaDocente } from '@/lib/rulesEngine';
import { 
  Establecimiento, 
  Contrato, 
  AsignacionAula, 
  AlertaConciliacion, 
  Funcionario,
  CursoDinamico,
  AsignaturaDinamica,
  CargoPersonalizado,
  OrigenFondo,
  EstamentoType,
  PlanEstudioNorm
} from '@/lib/types';

import { normalizarRun } from '@/lib/csvParser';

export default function EscuelaDashboard() {
  const router = useRouter();
  const [selectedRbd, setSelectedRbd] = useState<string>('10202');
  const [colegio, setColegio] = useState<Establecimiento | null>(null);

  // Active School State
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAula[]>([]);
  const [alertas, setAlertas] = useState<AlertaConciliacion[]>([]);
  const [cargosPersonalizados, setCargosPersonalizados] = useState<CargoPersonalizado[]>([]);
  const [planesEstudio, setPlanesEstudio] = useState<PlanEstudioNorm[]>([]);

  // Navigation tab state: 'docentes' | 'asistentes' | 'cursos'
  const [activeTab, setActiveTab] = useState<'docentes' | 'asistentes' | 'cursos'>('docentes');

  // Supervisor delegated mode
  const [isSupervisorMode, setIsSupervisorMode] = useState(false);

  // Individual Funcionario CRUD state
  const [newRun, setNewRun] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCargo, setNewCargo] = useState('Docente de Aula');
  const [newEstamento, setNewEstamento] = useState<EstamentoType>('Docente');

  // Courses and matrix
  const [cursosDinamicos, setCursosDinamicos] = useState<CursoDinamico[]>([]);
  const [selectedCursoPlan, setSelectedCursoPlan] = useState('');
  const [selectedAsignatura, setSelectedAsignatura] = useState('');
  const [selectedDocenteRun, setSelectedDocenteRun] = useState('');
  const [asignacionHoras, setAsignacionHoras] = useState(6);
  const [customAsigNombre, setCustomAsigNombre] = useState('');
  const [customAsigHoras, setCustomAsigHoras] = useState(4);
  const [selectedCursoForAsig, setSelectedCursoForAsig] = useState('');

  // Normalized Courses database to choose from
  const NOMENCLATURA_CURSOS = [
    "1° Básico A", "1° Básico B", "2° Básico A", "2° Básico B",
    "3° Básico A", "3° Básico B", "4° Básico A", "4° Básico B",
    "5° Básico A", "5° Básico B", "6° Básico A", "6° Básico B",
    "7° Básico A", "7° Básico B", "8° Básico A", "8° Básico B",
    "1° Medio A", "1° Medio B", "2° Medio A", "2° Medio B",
    "3° Medio A", "3° Medio B", "4° Medio A", "4° Medio B"
  ];
  const [selectedCursoNorm, setSelectedCursoNorm] = useState(NOMENCLATURA_CURSOS[0]);
  const [selectedCursoNivel, setSelectedCursoNivel] = useState('1° a 4° Básico');
  const [selectedCursoRegimen, setSelectedCursoRegimen] = useState<'JEC' | 'No JEC'>('JEC');

  // Custom Local Roles
  const [customCargoNombre, setCustomCargoNombre] = useState('');
  const [customCargoHoras, setCustomCargoHoras] = useState(10);
  const [customCargoDocente, setCustomCargoDocente] = useState('');
  const [customCargoFondo, setCustomCargoFondo] = useState<OrigenFondo>('SEP');

  const [itineranciaAlerta, setItineranciaAlerta] = useState<string | null>(null);

  // Sync role parameters from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rbd = localStorage.getItem('slep_sim_rbd') || '10202';
      setSelectedRbd(rbd);
      
      const supMode = localStorage.getItem('slep_supervisor_mode') === 'true';
      setIsSupervisorMode(supMode);
    }
  }, []);

  // Sync school details when selectedRbd changes
  useEffect(() => {
    if (!selectedRbd) return;
    loadAllSchoolData();
    setItineranciaAlerta(null);
  }, [selectedRbd]);

  async function loadAllSchoolData() {
    const est = await api.getEstablecimientoByRbd(selectedRbd);
    setColegio(est || null);

    const conts = await api.getContratos(selectedRbd);
    const funcs = await api.getFuncionarios();
    const asigs = await api.getAsignacionesPorEstablecimiento(selectedRbd);
    const alts = await api.getAlertas(selectedRbd);
    const dynCursos = await api.getCursosDinamicos(selectedRbd);
    const customCargs = await api.getCargosPorEstablecimiento(selectedRbd);
    const plans = await api.getPlanesEstudio();

    setContratos(conts);
    setFuncionarios(funcs);
    setAsignaciones(asigs);
    setAlertas(alts);
    setCursosDinamicos(dynCursos);
    setCargosPersonalizados(customCargs);
    setPlanesEstudio(plans);

    if (dynCursos.length > 0) {
      setSelectedCursoForAsig(dynCursos[0].nombre);
      setSelectedCursoPlan(dynCursos[0].nombre);
    }
  }

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
        
        setItineranciaAlerta(`⚠️ Alerta de Itinerancia: El funcionario registra contratos activos en otras escuelas: ${details}. Evite sobre-asignar su carga horaria legal.`);
      } else {
        setItineranciaAlerta(null);
      }
    }
    checkItinerancy();
  }, [selectedDocenteRun, selectedRbd]);

  // Create individual Staff member (Docente or Asistente)
  const handleCreateFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRun || !newNombre || !newEmail) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }

    const run = normalizarRun(newRun);
    
    // Create Funcionario Profile
    await api.upsertFuncionario({
      run,
      nombre: newNombre,
      email: newEmail,
      estamento: newEstamento,
      cargo: newCargo
    });

    // Create default contract for them in this school (e.g. 44 hours Contrata)
    const newContId = `c-${selectedRbd}-${run.replace(/[^a-zA-Z0-9]/g, '')}`;
    await api.upsertContratoCompleto({
      id: newContId,
      funcionario_run: run,
      rbd: selectedRbd,
      calidad_juridica: 'Contrata',
      funcion_principal: newCargo,
      estado: 'Activo',
      horas_totales: 44
    }, [
      {
        id: `f-${newContId}-Regular`,
        contrato_id: newContId,
        origen_fondo: 'Subvención Regular',
        horas: 44
      }
    ]);

    setNewRun('');
    setNewNombre('');
    setNewEmail('');
    await loadAllSchoolData();
    alert(`✅ ${newEstamento} creado exitosamente y asignado a esta escuela con contrato de 44 hrs.`);
  };

  const handleDeleteFuncionario = async (run: string) => {
    if (confirm('¿Desea desvincular a este funcionario de este establecimiento?')) {
      const relatedCont = contratos.find(c => c.funcionario_run === run);
      if (relatedCont) {
        dbLocal.contratos = dbLocal.contratos.filter(c => c.id !== relatedCont.id);
        dbLocal.financiamientoContratos = dbLocal.financiamientoContratos.filter(f => f.contrato_id !== relatedCont.id);
        dbLocal.asignacionesAula = dbLocal.asignacionesAula.filter(a => a.contrato_id !== relatedCont.id);
      }
      await loadAllSchoolData();
    }
  };

  // Create course selecting from strict normalized list
  const handleCreateCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cursosDinamicos.some(c => c.nombre === selectedCursoNorm)) {
      alert('El curso ya se encuentra creado en este establecimiento.');
      return;
    }

    const nuevoCurso: CursoDinamico = {
      rbd: selectedRbd,
      nombre: selectedCursoNorm,
      nivel: selectedCursoNivel,
      regimen: selectedCursoRegimen
    };

    await api.crearCursoDinamico(nuevoCurso);
    await loadAllSchoolData();
    setSelectedCursoForAsig(nuevoCurso.nombre);
    setSelectedCursoPlan(nuevoCurso.nombre);
    alert('✅ Curso normalizado creado con éxito.');
  };

  // Create Custom Roles (SEP/PIE etc. bound)
  const handleCreateCargoPersonalizado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCargoNombre.trim() || !customCargoDocente) {
      alert('Complete los campos para el cargo.');
      return;
    }

    const nuevoCargo: CargoPersonalizado = {
      id: `cargo-${Date.now()}`,
      rbd: selectedRbd,
      nombre: customCargoNombre.trim(),
      horas: parseFloat(customCargoHoras.toString()) || 10,
      funcionario_run: customCargoDocente,
      origen_fondo: customCargoFondo
    };

    await api.crearCargoPersonalizado(nuevoCargo);
    setCustomCargoNombre('');
    await loadAllSchoolData();
    alert('✅ Cargo personalizado asignado.');
  };

  const handleRemoveCargo = async (id: string) => {
    await api.removerCargoPersonalizado(id);
    await loadAllSchoolData();
  };

  // Create Custom Extra-curricular Workshop
  const handleCreateAsignatura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCursoForAsig || !customAsigNombre.trim()) {
      alert('Faltan datos.');
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
    await loadAllSchoolData();
    alert('✅ Taller SEP creado con éxito.');
  };

  // Assign hours in matrix
  const handleAddAsignacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocenteRun || !selectedCursoPlan || !selectedAsignatura) {
      alert('Complete los campos de la asignación.');
      return;
    }

    const contratoDocente = contratos.find(c => c.funcionario_run === selectedDocenteRun);
    if (!contratoDocente) return;

    const nuevaAsig: AsignacionAula = {
      id: `asig-${Date.now()}`,
      contrato_id: contratoDocente.id,
      curso: selectedCursoPlan,
      asignatura: selectedAsignatura,
      horas: parseFloat(asignacionHoras.toString())
    };

    await api.saveAsignacion(nuevaAsig);
    await loadAllSchoolData();
  };

  const handleDeleteAsignacion = async (id: string) => {
    await api.deleteAsignacion(id);
    await loadAllSchoolData();
  };

  // Toggle Licence & Replacement mirrors
  const handleToggleLicencia = async (contratoId: string, enLicencia: boolean) => {
    const nuevoEstado = enLicencia ? 'Licencia Médica' : 'Activo';
    await api.updateContratoEstado(contratoId, nuevoEstado);
    await loadAllSchoolData();
  };

  const handleAddReemplazo = async (titularContrato: Contrato, runReemplazante: string) => {
    const cleanRun = runReemplazante.trim();
    if (!cleanRun) return;

    await api.upsertFuncionario({
      run: cleanRun,
      nombre: 'Reemplazante Asignado',
      estamento: 'Docente',
      cargo: 'Reemplazo'
    });

    const replacementId = `reemp-${Date.now()}`;
    await api.upsertContratoCompleto({
      id: replacementId,
      funcionario_run: cleanRun,
      rbd: selectedRbd,
      calidad_juridica: 'Contrata',
      funcion_principal: 'Reemplazo Docente',
      estado: 'Reemplazo',
      horas_totales: titularContrato.horas_totales,
      vinculo_titular_id: titularContrato.id
    }, [
      {
        id: `fin-reemp-${replacementId}`,
        contrato_id: replacementId,
        origen_fondo: 'Subvención Regular',
        horas: titularContrato.horas_totales
      }
    ]);

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

    await loadAllSchoolData();
    alert('✅ Reemplazo creado con éxito.');
  };

  // Exit supervisor delegated mode
  const handleExitSupervisorMode = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('slep_sim_role', 'profesional_slep');
      localStorage.removeItem('slep_supervisor_mode');
      router.push('/profesional');
    }
  };

  // Mock Export files (xlsx / pdf)
  const handleExportDotacion = (format: 'xlsx' | 'pdf') => {
    alert(`📥 Descargando Dotación de Personal Completa (${colegio?.nombre}) en formato ${format.toUpperCase()}...`);
  };

  // Curricular plans for matrix selector
  const activeCourse = cursosDinamicos.find(c => c.nombre === selectedCursoPlan);
  const planMineduc = activeCourse ? planesEstudio.find(p => p.nivel === activeCourse.nivel && p.regimen === activeCourse.regimen) : null;
  const [dynAsigs, setDynAsigs] = useState<AsignaturaDinamica[]>([]);

  useEffect(() => {
    if (!selectedCursoPlan) return;
    async function loadAsigs() {
      const list = await api.getAsignaturasDinamicas(selectedRbd, selectedCursoPlan);
      setDynAsigs(list);
      
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
            <Image src="/logo.png" alt="Logo SLEP" width={110} height={45} className="brightness-0 invert object-contain" />
            <div className="border-l border-white/20 pl-3">
              <p className="text-[9px] uppercase tracking-wider text-slate-300 font-semibold leading-none">
                {isSupervisorMode ? 'Acceso Supervisor Delegado' : 'Director / UTP de Escuela'}
              </p>
              <h1 className="text-sm font-bold tracking-tight mt-0.5">{colegio ? colegio.nombre : 'Establecimiento'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-white/10 px-3 py-1.5 rounded text-xs font-mono font-bold">RBD: {selectedRbd}</span>
            {isSupervisorMode ? (
              <button 
                onClick={handleExitSupervisorMode}
                className="bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark font-extrabold px-4 py-2 rounded-lg text-xs shadow transition-all duration-200"
              >
                Volver a Supervisor 🔙
              </button>
            ) : (
              <Link href="/" className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors border border-white/10">
                Cerrar Sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 flex flex-col gap-6 w-full">
        
        {/* Upper Dashboard with export buttons */}
        <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="flex gap-6 text-center text-xs">
            <div>
              <p className="text-slate-400 font-bold uppercase">Docentes activos</p>
              <p className="text-xl font-bold text-slep-blue">{funcionarios.filter(f => f.estamento === 'Docente').length}</p>
            </div>
            <div className="border-l border-slate-200 pl-6">
              <p className="text-slate-400 font-bold uppercase">Asistentes activos</p>
              <p className="text-xl font-bold text-slep-blue">{funcionarios.filter(f => f.estamento === 'Asistente de la Educación').length}</p>
            </div>
            <div className="border-l border-slate-200 pl-6">
              <p className="text-slate-400 font-bold uppercase">Cursos Creados</p>
              <p className="text-xl font-bold text-slep-blue">{cursosDinamicos.length}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => handleExportDotacion('xlsx')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded text-xs shadow flex items-center gap-1"
            >
              📊 Exportar Excel (.xlsx)
            </button>
            <button 
              onClick={() => window.print()}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded text-xs shadow flex items-center gap-1"
            >
              📄 Imprimir PDF
            </button>
          </div>
        </div>

        {/* Tab Buttons Navigation */}
        <div className="flex border-b border-slate-200 gap-1 bg-white p-1.5 rounded-xl border">
          <button 
            onClick={() => setActiveTab('docentes')}
            className={`flex-1 py-3 text-center rounded-lg font-bold text-xs transition-all ${
              activeTab === 'docentes' 
                ? 'bg-slep-blue text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            🍎 Nómina Docente
          </button>
          <button 
            onClick={() => setActiveTab('asistentes')}
            className={`flex-1 py-3 text-center rounded-lg font-bold text-xs transition-all ${
              activeTab === 'asistentes' 
                ? 'bg-slep-blue text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            👥 Asistentes de la Educación
          </button>
          <button 
            onClick={() => setActiveTab('cursos')}
            className={`flex-1 py-3 text-center rounded-lg font-bold text-xs transition-all ${
              activeTab === 'cursos' 
                ? 'bg-slep-blue text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            🏫 Cursos y Carga Horaria
          </button>
        </div>

        {/* Tab contents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Area based on active tab */}
          <div className="lg:col-span-2 space-y-6">
            
            {activeTab === 'docentes' && (
              <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
                <h3 className="text-base font-bold text-slate-800">Docentes del Establecimiento</h3>
                <p className="text-xs text-slate-500 mt-1">Gestión individual e inmediata de la dotación docente.</p>
                
                <div className="mt-4 border border-slate-100 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 font-bold text-slate-600">
                      <tr>
                        <th className="p-3 pl-4">Nombre</th>
                        <th className="p-3">RUT</th>
                        <th className="p-3">Cargo</th>
                        <th className="p-3 text-center">Contrato</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {funcionarios.filter(f => f.estamento === 'Docente').map(f => {
                        const hasCont = contratos.find(c => c.funcionario_run === f.run);
                        return (
                          <tr key={f.run} className="hover:bg-slate-50">
                            <td className="p-3 pl-4 font-bold text-slate-800">{f.nombre}</td>
                            <td className="p-3 font-mono text-slate-500">{f.run}</td>
                            <td className="p-3 text-slate-700">{f.cargo || 'Docente'}</td>
                            <td className="p-3 text-center font-semibold text-slep-blue">
                              {hasCont ? `${hasCont.horas_totales} hrs (${hasCont.estado})` : 'Sin Contrato'}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteFuncionario(f.run)}
                                className="text-red-500 hover:text-red-700 font-bold"
                              >
                                Desvincular
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'asistentes' && (
              <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
                <h3 className="text-base font-bold text-slate-800">Asistentes de la Educación</h3>
                <p className="text-xs text-slate-500 mt-1">Gestión individual de profesionales técnicos, psicólogos, administrativos y auxiliares.</p>

                <div className="mt-4 border border-slate-100 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 font-bold text-slate-600">
                      <tr>
                        <th className="p-3 pl-4">Nombre</th>
                        <th className="p-3">RUT</th>
                        <th className="p-3">Función/Cargo</th>
                        <th className="p-3 text-center">Horas</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {funcionarios.filter(f => f.estamento === 'Asistente de la Educación').map(f => {
                        const hasCont = contratos.find(c => c.funcionario_run === f.run);
                        return (
                          <tr key={f.run} className="hover:bg-slate-50">
                            <td className="p-3 pl-4 font-bold text-slate-800">{f.nombre}</td>
                            <td className="p-3 font-mono text-slate-500">{f.run}</td>
                            <td className="p-3 text-slate-700">{f.cargo || 'Asistente'}</td>
                            <td className="p-3 text-center font-semibold text-slep-blue">
                              {hasCont ? `${hasCont.horas_totales} hrs` : 'Sin Contrato'}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteFuncionario(f.run)}
                                className="text-red-500 hover:text-red-700 font-bold"
                              >
                                Desvincular
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'cursos' && (
              <div className="space-y-6">
                
                {/* Course list, custom cargo loader, PIE Checker, and assignment matrix */}
                <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
                  <h3 className="text-base font-bold text-slate-800">Planificador de Carga Horaria y Cursos</h3>
                  
                  {/* Select normalized course names only */}
                  <form onSubmit={handleCreateCurso} className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border text-xs">
                    <div className="md:col-span-2">
                      <label className="block font-bold text-slate-500 mb-1">Nombre Normalizado MINEDUC</label>
                      <select
                        className="w-full p-2 bg-white border rounded"
                        value={selectedCursoNorm}
                        onChange={(e) => setSelectedCursoNorm(e.target.value)}
                      >
                        {NOMENCLATURA_CURSOS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 mb-1">Régimen</label>
                      <select
                        className="w-full p-2 bg-white border rounded"
                        value={selectedCursoRegimen}
                        onChange={(e) => {
                          setSelectedCursoRegimen(e.target.value as any);
                          if (selectedCursoNorm.includes('Medio')) setSelectedCursoNivel('5° a 8° Básico');
                          else setSelectedCursoNivel('1° a 4° Básico');
                        }}
                      >
                        <option value="JEC">JEC (38 hrs)</option>
                        <option value="No JEC">No JEC (33 hrs)</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button type="submit" className="w-full bg-slep-blue text-white font-bold py-2 rounded text-xs shadow">
                        Crear Curso
                      </button>
                    </div>
                  </form>

                  {/* Create Custom Roles (SEP/PIE etc. bound) */}
                  <form onSubmit={handleCreateCargoPersonalizado} className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border text-xs">
                    <div>
                      <label className="block font-bold text-slate-500 mb-1">Cargo Personalizado Escuela</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Encargado Convivencia" 
                        className="w-full p-2 border rounded"
                        value={customCargoNombre}
                        onChange={(e) => setCustomCargoNombre(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-500 mb-1">Asociar Subvención</label>
                      <select
                        className="w-full p-2 bg-white border rounded"
                        value={customCargoFondo}
                        onChange={(e) => setCustomCargoFondo(e.target.value as any)}
                      >
                        <option value="SEP">SEP (Ley SEP)</option>
                        <option value="PIE">PIE (Programa Integración)</option>
                        <option value="Subvención Regular">Subvención Regular</option>
                        <option value="Pro-retención">Pro-retención</option>
                        <option value="Reforzamiento">Reforzamiento</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-500 mb-1">Docente Asignado</label>
                      <select
                        className="w-full p-2 bg-white border rounded"
                        value={customCargoDocente}
                        onChange={(e) => setCustomCargoDocente(e.target.value)}
                      >
                        <option value="">-- Seleccionar --</option>
                        {contratos.map(c => {
                          const f = funcionarios.find(func => func.run === c.funcionario_run);
                          return <option key={c.id} value={c.funcionario_run}>{f ? f.nombre : c.funcionario_run}</option>;
                        })}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button type="submit" className="w-full bg-slep-blue text-white font-bold py-2 rounded text-xs shadow">
                        Asignar Cargo
                      </button>
                    </div>
                  </form>

                  {/* Create extra-curricular SEP workshops */}
                  <form onSubmit={handleCreateAsignatura} className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border text-xs">
                    <div>
                      <label className="block font-bold text-slate-500 mb-1">Curso Asignado</label>
                      <select
                        className="w-full p-2 bg-white border rounded"
                        value={selectedCursoForAsig}
                        onChange={(e) => setSelectedCursoForAsig(e.target.value)}
                      >
                        {cursosDinamicos.map(c => (
                          <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-bold text-slate-500 mb-1">Nombre Taller Extra-programático (SEP)</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Taller de Música SEP" 
                        className="w-full p-2 border rounded"
                        value={customAsigNombre}
                        onChange={(e) => setCustomAsigNombre(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <button type="submit" className="w-full bg-slep-blue text-white font-bold py-2 rounded text-xs shadow">
                        Crear Taller SEP
                      </button>
                    </div>
                  </form>
                </div>

                {/* Intelligent PIE validation Module */}
                <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
                  <h3 className="text-base font-bold text-slate-800">Módulo PIE Inteligente (Decretos MINEDUC)</h3>
                  <p className="text-xs text-slate-500 mt-1">Coteja que las horas asignadas a co-docencia PIE por curso cuadren con el decreto oficial.</p>
                  
                  <div className="mt-4 space-y-3">
                    {cursosDinamicos.map(c => {
                      const dec = planesEstudio.find(p => p.nivel === c.nivel && p.regimen === c.regimen);
                      const hrsRequeridas = dec ? dec.horasPIEReglamentarias : 10;
                      
                      // Calculate actual co-teaching hours assigned in PIE under this course
                      const activeContractsPie = contratos.filter(cont => {
                        const fins = dbLocal.financiamientoContratos.filter(f => f.contrato_id === cont.id);
                        return fins.some(f => f.origen_fondo === 'PIE');
                      });
                      const contractIdsPie = activeContractsPie.map(cont => cont.id);
                      
                      const hrsAsignadasPie = asignaciones
                        .filter(a => a.curso === c.nombre && contractIdsPie.includes(a.contrato_id))
                        .reduce((sum, a) => sum + a.horas, 0);

                      const delta = hrsAsignadasPie - hrsRequeridas;
                      const matches = Math.abs(delta) < 0.05;

                      return (
                        <div key={c.nombre} className={`p-3 rounded-lg border text-xs flex justify-between items-center ${
                          matches ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-red-50 border-red-200 text-red-950'
                        }`}>
                          <div>
                            <span className="font-bold">{c.nombre}</span>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Exigido Decreto: {hrsRequeridas} hrs • Asignado Co-docencia: <strong>{hrsAsignadasPie} hrs</strong>
                            </p>
                          </div>
                          <div>
                            {matches ? (
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                                ✓ PIE Cuadrado
                              </span>
                            ) : (
                              <span className="bg-slep-coral/20 text-red-800 font-bold px-2 py-0.5 rounded text-[10px]">
                                ⚠️ Descalce PIE: {delta > 0 ? `+${delta}` : delta} hrs
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Matrix Hours */}
                <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
                  <h3 className="text-base font-bold text-slate-800">Matriz Horaria Interactiva</h3>
                  <form onSubmit={handleAddAsignacion} className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border text-xs">
                    <div>
                      <label className="block font-bold text-slate-500 mb-1">Curso</label>
                      <select 
                        className="w-full p-2 bg-white border rounded"
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
                        className="w-full p-2 bg-white border rounded"
                        value={selectedAsignatura}
                        onChange={(e) => setSelectedAsignatura(e.target.value)}
                      >
                        {planMineduc?.asignaturasBase.map(a => (
                          <option key={a.nombre} value={a.nombre}>{a.nombre}</option>
                        ))}
                        {dynAsigs.map(a => (
                          <option key={a.nombre} value={a.nombre}>{a.nombre} (Custom SEP)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 mb-1">Docente</label>
                      <select 
                        className="w-full p-2 bg-white border rounded"
                        value={selectedDocenteRun}
                        onChange={(e) => setSelectedDocenteRun(e.target.value)}
                      >
                        <option value="">-- Seleccionar --</option>
                        {contratos.map(c => {
                          const f = funcionarios.find(func => func.run === c.funcionario_run);
                          return <option key={c.id} value={c.funcionario_run}>{f ? f.nombre : c.funcionario_run}</option>;
                        })}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button type="submit" className="w-full bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark font-extrabold py-2 rounded text-xs shadow">
                        Asignar
                      </button>
                    </div>
                  </form>

                  {itineranciaAlerta && (
                    <div className="mt-3 bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-2.5 rounded font-medium">
                      {itineranciaAlerta}
                    </div>
                  )}

                  <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 font-bold">
                        <tr>
                          <th className="p-3 pl-4">Curso</th>
                          <th className="p-3">Asignatura</th>
                          <th className="p-3">Docente</th>
                          <th className="p-3 text-center">Horas</th>
                          <th className="p-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {asignaciones.map(a => {
                          const c = contratos.find(cont => cont.id === a.contrato_id);
                          const f = c ? funcionarios.find(func => func.run === c.funcionario_run) : null;
                          return (
                            <tr key={a.id}>
                              <td className="p-3 pl-4 font-bold text-slate-800">{a.curso}</td>
                              <td className="p-3 text-slate-700">{a.asignatura}</td>
                              <td className="p-3 font-semibold">{f ? f.nombre : 'Sin Asignar'}</td>
                              <td className="p-3 text-center font-bold">{a.horas} hrs</td>
                              <td className="p-3 text-center">
                                <button onClick={() => handleDeleteAsignacion(a.id)} className="text-red-500 hover:text-red-700 font-bold">
                                  Eliminar
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
            )}

          </div>

          {/* Right Column: Creation forms (Docente/Asistente) & Custom roles list */}
          <div className="space-y-6">
            
            {/* Form to create individual Staff profile (Tab 1 / Tab 2 context) */}
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>➕</span> Agregar Funcionario Individual
              </h3>
              
              <form onSubmit={handleCreateFuncionario} className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">RUN (Cédula de Identidad)</label>
                  <input 
                    type="text" 
                    placeholder="12.345.678-9" 
                    className="w-full p-2 border rounded"
                    value={newRun}
                    onChange={(e) => setNewRun(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    placeholder="Ej: María José Riquelme" 
                    className="w-full p-2 border rounded"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    placeholder="correo@slep.cl" 
                    className="w-full p-2 border rounded"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Estamento</label>
                  <select 
                    className="w-full p-2 border rounded bg-white"
                    value={newEstamento}
                    onChange={(e) => {
                      setNewEstamento(e.target.value as any);
                      if (e.target.value === 'Docente') setNewCargo('Docente de Aula');
                      else setNewCargo('Auxiliar de Servicios');
                    }}
                  >
                    <option value="Docente">Docente / Profesor</option>
                    <option value="Asistente de la Educación">Asistente de la Educación</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Función / Cargo</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Docente de Matemática, Psicóloga, etc." 
                    className="w-full p-2 border rounded"
                    value={newCargo}
                    onChange={(e) => setNewCargo(e.target.value)}
                  />
                </div>

                <button type="submit" className="w-full bg-slep-blue text-white font-bold py-2.5 rounded shadow">
                  Agregar Funcionario
                </button>
              </form>
            </div>

            {/* Custom Roles list */}
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
              <h3 className="text-sm font-bold text-slate-800">Cargos Especiales Asignados</h3>
              <p className="text-xs text-slate-500 mt-1">Lista de roles escolares financiados por subvenciones.</p>

              <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-1 text-xs">
                {cargosPersonalizados.map(c => {
                  const f = funcionarios.find(func => func.run === c.funcionario_run);
                  return (
                    <div key={c.id} className="p-3 bg-slate-50 border rounded flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800">{c.nombre}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {f ? f.nombre : c.funcionario_run} • <strong>{c.horas} hrs ({c.origen_fondo})</strong>
                        </p>
                      </div>
                      <button onClick={() => handleRemoveCargo(c.id)} className="text-red-500 hover:text-red-700 font-bold">
                        Eliminar
                      </button>
                    </div>
                  );
                })}
                {cargosPersonalizados.length === 0 && (
                  <p className="text-center py-4 text-slate-400 italic">No hay cargos personalizados creados.</p>
                )}
              </div>
            </div>

            {/* Ley 20.903 compliance alerts */}
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
              <h3 className="text-sm font-bold text-slate-800">Semáforo de Ley 20.903</h3>
              
              <div className="mt-4 space-y-2 text-xs">
                {contratos.map(c => {
                  const f = funcionarios.find(func => func.run === c.funcionario_run);
                  const teacherAsigs = asignaciones.filter(a => a.contrato_id === c.id);
                  const metrics = colegio ? validarCargaDocente(c, colegio, teacherAsigs) : null;
                  
                  if (!metrics) return null;
                  const isOk = metrics.cumpleLey20903;
                  
                  return (
                    <div key={c.id} className={`p-2.5 rounded border flex justify-between items-center ${
                      isOk ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-red-50 border-red-200 text-red-950'
                    }`}>
                      <div>
                        <span className="font-bold">{f ? f.nombre : c.funcionario_run}</span>
                        <p className="text-[10px] text-slate-500">Lectivas: {metrics.horasLectivasAsignadas} / {metrics.horasLectivasMaximas} hrs</p>
                      </div>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        isOk ? 'bg-emerald-100 text-emerald-800' : 'bg-slep-coral/20 text-red-800'
                      }`}>
                        {isOk ? 'OK' : 'Excedido'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
