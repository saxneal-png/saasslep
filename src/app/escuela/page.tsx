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
  PlanEstudioNorm,
  FinanciamientoContrato,
  TareaReemplazo,
  CARGOS_DOCENTES_LIST
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

  // Navigation tab state: 'docentes' | 'asistentes' | 'cursos' | 'compendio'
  const [activeTab, setActiveTab] = useState<'docentes' | 'asistentes' | 'cursos' | 'compendio' | 'dotacion'>('docentes');
  const [tareasReemplazo, setTareasReemplazo] = useState<TareaReemplazo[]>([]);
  const [taskReemplazoRun, setTaskReemplazoRun] = useState<{[key: string]: string}>({});


  // Supervisor delegated mode
  const [isSupervisorMode, setIsSupervisorMode] = useState(false);
  const [isSostenedorMode, setIsSostenedorMode] = useState(false);

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

  // Base Levels database to choose from
  const NOMENCLATURA_CURSOS = [
    "1° Básico", "2° Básico", "3° Básico", "4° Básico",
    "5° Básico", "6° Básico", "7° Básico", "8° Básico",
    "1° Medio", "2° Medio", "3° Medio", "4° Medio"
  ];
  const [selectedCursoNorm, setSelectedCursoNorm] = useState(NOMENCLATURA_CURSOS[0]);
  const [cursoSufijo, setCursoSufijo] = useState('A');
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);

  // Massive delete selections
  const [selectedDocentes, setSelectedDocentes] = useState<string[]>([]);
  const [selectedAsistentes, setSelectedAsistentes] = useState<string[]>([]);

  // Custom Local Roles
  const [customCargoNombre, setCustomCargoNombre] = useState('');
  const [customCargoHoras, setCustomCargoHoras] = useState(10);
  const [customCargoDocente, setCustomCargoDocente] = useState('');
  const [customCargoFondo, setCustomCargoFondo] = useState<OrigenFondo>('SEP');

  const [itineranciaAlerta, setItineranciaAlerta] = useState<string | null>(null);
  const [reemplazoRunMap, setReemplazoRunMap] = useState<{[key: string]: string}>({});

  // View/Edit Modal States
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const [editFuncNombre, setEditFuncNombre] = useState('');
  const [editFuncCargo, setEditFuncCargo] = useState('');
  const [editFuncEmail, setEditFuncEmail] = useState('');
  const [editFuncTitulo, setEditFuncTitulo] = useState('');
  const [editContHoras, setEditContHoras] = useState(44);
  const [editContFins, setEditContFins] = useState<{ origen: OrigenFondo; horas: number }[]>([]);
  const [editContHorasDirectivas, setEditContHorasDirectivas] = useState<number | undefined>(undefined);
  const [editContHorasAula, setEditContHorasAula] = useState<number | undefined>(undefined);
  const [editContHorasTecPed, setEditContHorasTecPed] = useState<number | undefined>(undefined);

  const [editingCurso, setEditingCurso] = useState<CursoDinamico | null>(null);
  const [editCursoAsignaturas, setEditCursoAsignaturas] = useState<AsignaturaDinamica[]>([]);
  const [editCursoAsignaciones, setEditCursoAsignaciones] = useState<AsignacionAula[]>([]);
  const [editCursoPIE, setEditCursoPIE] = useState<number>(10);

  const [authorized, setAuthorized] = useState(false);

  // Sync role parameters from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('slep_sim_role');
      const rbd = localStorage.getItem('slep_sim_rbd') || '10202';
      setSelectedRbd(rbd);
      
      const supMode = localStorage.getItem('slep_supervisor_mode') === 'true';
      setIsSupervisorMode(supMode);

      const sostMode = localStorage.getItem('slep_sostenedor_mode') === 'true';
      setIsSostenedorMode(sostMode);

      if (role === 'director_escuela' || supMode || sostMode || role === 'sostenedor_maestro' || role === 'profesional_slep') {
        setAuthorized(true);
      } else {
        router.push('/');
      }
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

    const tasks = await api.getTareasReemplazo();
    setTareasReemplazo(tasks);

    if (dynCursos.length > 0) {
      setSelectedCursoForAsig(dynCursos[0].nombre);
      setSelectedCursoPlan(dynCursos[0].nombre);
    }
  }

  const handleResolveReemplazo = async (tarea: TareaReemplazo, reemplazoRun: string) => {
    if (!reemplazoRun) {
      alert('⚠️ Por favor seleccione o ingrese un RUT de reemplazo.');
      return;
    }
    const cleanRun = normalizarRun(reemplazoRun);

    // 1. Check if replacement funcionario profile exists; if not, create a default profile
    const existingFunc = funcionarios.find(f => f.run === cleanRun);
    if (!existingFunc) {
      const nomPlaceholder = prompt("Ingrese el nombre completo para el nuevo docente de reemplazo:");
      if (!nomPlaceholder) {
        alert("⚠️ Operación cancelada. El docente de reemplazo debe tener un nombre.");
        return;
      }
      await api.upsertFuncionario({
        run: cleanRun,
        nombre: nomPlaceholder.toUpperCase(),
        estamento: 'Docente',
        cargo: `Reemplazo de ${tarea.funcionario_titular_nombre}`
      });
    }

    // 2. Create the mirror replacement contract
    const newContId = `c-reemplazo-${tarea.id}-${cleanRun.replace(/[^a-zA-Z0-9]/g, '')}`;
    await api.upsertContratoCompleto({
      id: newContId,
      funcionario_run: cleanRun,
      rbd: selectedRbd,
      calidad_juridica: 'A contrata',
      funcion_principal: `Reemplazo Docente (${tarea.funcionario_titular_nombre})`,
      estado: 'Pendiente_Aprobacion',
      horas_totales: tarea.horas_a_cubrir,
      vinculo_titular_id: `c-${selectedRbd}-${tarea.funcionario_titular_run.replace(/[^a-zA-Z0-9]/g, '')}`
    }, [
      {
        id: `f-${newContId}-Regular`,
        contrato_id: newContId,
        origen_fondo: 'Subvención Regular',
        horas: tarea.horas_a_cubrir
      }
    ]);

    // 3. Reload school data
    await loadAllSchoolData();
    alert('✅ Propuesta de reemplazo enviada con éxito. Pendiente de aprobación por RR.HH. Central.');
  };

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
      calidad_juridica: 'A contrata',
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

  // Bulk deletion logic
  const handleBulkDeleteDocentes = async () => {
    if (selectedDocentes.length === 0) return;
    if (confirm(`¿Desea desvincular a los ${selectedDocentes.length} docentes seleccionados?`)) {
      for (const run of selectedDocentes) {
        const relatedCont = contratos.find(c => c.funcionario_run === run);
        if (relatedCont) {
          dbLocal.contratos = dbLocal.contratos.filter(c => c.id !== relatedCont.id);
          dbLocal.financiamientoContratos = dbLocal.financiamientoContratos.filter(f => f.contrato_id !== relatedCont.id);
          dbLocal.asignacionesAula = dbLocal.asignacionesAula.filter(a => a.contrato_id !== relatedCont.id);
        }
      }
      setSelectedDocentes([]);
      await loadAllSchoolData();
      alert('✅ Docentes desvinculados exitosamente.');
    }
  };

  const handleBulkDeleteAsistentes = async () => {
    if (selectedAsistentes.length === 0) return;
    if (confirm(`¿Desea desvincular a los ${selectedAsistentes.length} asistentes seleccionados?`)) {
      for (const run of selectedAsistentes) {
        const relatedCont = contratos.find(c => c.funcionario_run === run);
        if (relatedCont) {
          dbLocal.contratos = dbLocal.contratos.filter(c => c.id !== relatedCont.id);
          dbLocal.financiamientoContratos = dbLocal.financiamientoContratos.filter(f => f.contrato_id !== relatedCont.id);
          dbLocal.asignacionesAula = dbLocal.asignacionesAula.filter(a => a.contrato_id !== relatedCont.id);
        }
      }
      setSelectedAsistentes([]);
      await loadAllSchoolData();
      alert('✅ Asistentes desvinculados exitosamente.');
    }
  };

  // Create course selecting from strict normalized list
  const handleCreateCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCursoNombre = `${selectedCursoNorm} ${cursoSufijo}`.trim();
    if (cursosDinamicos.some(c => c.nombre === fullCursoNombre)) {
      alert('El curso ya se encuentra creado en este establecimiento.');
      return;
    }

    const plan = planesEstudio[selectedPlanIndex];
    if (!plan) {
      alert('Seleccione un plan de estudio válido.');
      return;
    }

    const nuevoCurso: CursoDinamico = {
      rbd: selectedRbd,
      nombre: fullCursoNombre,
      nivel: plan.nivel,
      regimen: plan.regimen
    };

    await api.crearCursoDinamico(nuevoCurso);
    
    // Auto-populate subjects from selected study plan
    if (plan.asignaturasBase) {
      for (const asig of plan.asignaturasBase) {
        await api.crearAsignaturaDinamica({
          rbd: selectedRbd,
          cursoNombre: fullCursoNombre,
          nombre: asig.nombre,
          horasSugeridas: asig.horasSugeridas
        });
      }
    }

    await loadAllSchoolData();
    setSelectedCursoForAsig(nuevoCurso.nombre);
    setSelectedCursoPlan(nuevoCurso.nombre);
    alert('✅ Curso y plan de estudio asociado creados con éxito.');
  };

  const handleDeleteCurso = async (nombre: string) => {
    if (confirm(`¿Está seguro de eliminar el curso "${nombre}"? Se borrarán sus asignaturas y carga horaria asociada.`)) {
      // @ts-ignore
      await api.eliminarCursoDinamico(selectedRbd, nombre);
      await loadAllSchoolData();
      alert('✅ Curso eliminado correctamente.');
    }
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
    
    // Si se desmarca la licencia, buscar y eliminar contratos de reemplazo asociados a este contrato titular
    if (!enLicencia) {
      const allContratos = await api.getContratos(selectedRbd);
      const replacements = allContratos.filter(c => c.vinculo_titular_id === contratoId);
      for (const r of replacements) {
        if (api.deleteContrato) {
          await api.deleteContrato(r.id);
        }
      }
    }
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
      calidad_juridica: 'A contrata',
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

  // Modal handlers
  const handleOpenEditFuncionario = async (f: Funcionario) => {
    setEditingFuncionario(f);
    setEditFuncNombre(f.nombre);
    setEditFuncCargo(f.cargo || '');
    setEditFuncEmail(f.email || '');
    setEditFuncTitulo(f.titulo || '');
    
    const relatedCont = contratos.find(c => c.funcionario_run === f.run);
    if (relatedCont) {
      setEditContHoras(relatedCont.horas_totales);
      setEditContHorasDirectivas(relatedCont.horas_directivas);
      setEditContHorasAula(relatedCont.horas_aula);
      setEditContHorasTecPed(relatedCont.horas_tecnico_pedagogicas);
      const fins = await api.getFinanciamientosPorContrato(relatedCont.id);
      setEditContFins(fins.map(fi => ({ origen: fi.origen_fondo, horas: fi.horas })));
    } else {
      setEditContHoras(0);
      setEditContHorasDirectivas(undefined);
      setEditContHorasAula(undefined);
      setEditContHorasTecPed(undefined);
      setEditContFins([]);
    }
  };
 
  const handleSaveFuncionario = async () => {
    if (!editingFuncionario) return;
    
    // 1. Update funcionario info
    await api.upsertFuncionario({
      ...editingFuncionario,
      nombre: editFuncNombre,
      cargo: editFuncCargo,
      email: editFuncEmail,
      titulo: editFuncTitulo
    });
 
    // 2. Update contract and finance sources
    const relatedCont = contratos.find(c => c.funcionario_run === editingFuncionario.run);
    if (relatedCont) {
      const updatedCont = {
        ...relatedCont,
        horas_totales: editContHoras,
        funcion_principal: editFuncCargo,
        horas_directivas: editContHorasDirectivas,
        horas_aula: editContHorasAula,
        horas_tecnico_pedagogicas: editContHorasTecPed
      };
 
      // Recalculate financing list
      const cleanFins: FinanciamientoContrato[] = editContFins.map((f, index) => ({
        id: `f-${relatedCont.id}-${f.origen}-${index}`,
        contrato_id: relatedCont.id,
        origen_fondo: f.origen,
        horas: f.horas
      }));
 
      await api.upsertContratoCompleto(updatedCont, cleanFins);
    }
 
    setEditingFuncionario(null);
    await loadAllSchoolData();
    alert('✅ Funcionario y contrato actualizados exitosamente.');
  };

  const handleOpenEditCurso = async (c: CursoDinamico) => {
    setEditingCurso(c);
    setEditCursoPIE(c.horasPIE !== undefined ? c.horasPIE : 10);
    const list = await api.getAsignaturasDinamicas(selectedRbd, c.nombre);
    setEditCursoAsignaturas(list);
    
    // Get assignments for this course
    const allAsigs = await api.getAsignacionesPorEstablecimiento(selectedRbd);
    const courseAsigs = allAsigs.filter(a => a.curso === c.nombre);
    setEditCursoAsignaciones(courseAsigs);
  };

  const handleSaveCursoAsignaturas = async () => {
    if (!editingCurso) return;
    
    // 1. Save updated subjects
    for (const asig of editCursoAsignaturas) {
      await api.crearAsignaturaDinamica(asig);
    }
    
    // 2. Save assignments: replace all assignments for editingCurso.nombre with editCursoAsignaciones
    const otherCoursesAsigs = dbLocal.asignacionesAula.filter(a => {
      // Find contract of this assignment
      const cont = dbLocal.contratos.find(c => c.id === a.contrato_id);
      // If it belongs to this school and is for this course, remove it
      return !(cont && cont.rbd === selectedRbd && a.curso === editingCurso.nombre);
    });
    
    dbLocal.asignacionesAula = [...otherCoursesAsigs, ...editCursoAsignaciones];

    // 3. Save updated course PIE hours
    const updatedCursos = dbLocal.cursosDinamicos.map(cur => {
      if (cur.rbd === selectedRbd && cur.nombre === editingCurso.nombre) {
        return { ...cur, horasPIE: editCursoPIE };
      }
      return cur;
    });
    dbLocal.cursosDinamicos = updatedCursos;
    
    setEditingCurso(null);
    await loadAllSchoolData();
    alert('✅ Curso, asignaturas y docentes asignados actualizados exitosamente.');
  };

  // Exit supervisor delegated mode
  const handleExitSupervisorMode = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('slep_sim_role', 'profesional_slep');
      localStorage.removeItem('slep_supervisor_mode');
      router.push('/profesional');
    }
  };

  const handleExitSostenedorMode = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('slep_sim_role', 'sostenedor_maestro');
      localStorage.removeItem('slep_sostenedor_mode');
      router.push('/sostenedor');
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

  const schoolDocentes = funcionarios.filter(f => f.estamento === 'Docente' && contratos.some(c => c.funcionario_run === f.run));
  const schoolAsistentes = funcionarios.filter(f => f.estamento === 'Asistente de la Educación' && contratos.some(c => c.funcionario_run === f.run));

  const printFuncionarioDetail = (funcionario: Funcionario, contrato: Contrato | undefined, financiamientos: { origen: OrigenFondo; horas: number }[], leyCalculo: any, teacherAsigs: AsignacionAula[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Ficha de Funcionario - ${funcionario.nombre}</title>
          <style>
            body { font-family: 'Outfit', 'Inter', sans-serif; color: #1e293b; padding: 40px; }
            .header { border-bottom: 3px solid #003366; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 24px; font-weight: 800; color: #003366; }
            .title { font-size: 28px; font-weight: bold; margin: 10px 0 5px 0; }
            .meta { font-size: 14px; color: #64748b; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; background: #f8fafc; }
            .card h3 { margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; color: #0f172a; }
            .field { margin-bottom: 12px; }
            .label { font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; }
            .value { font-size: 15px; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            th { background: #f1f5f9; font-weight: bold; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">Servicio Local de Educación Pública</div>
              <div class="title">Ficha Oficial del Funcionario</div>
              <div class="meta">Sistema de Simulación y Dotaciones Docentes</div>
            </div>
            <div style="text-align: right;">
              <div class="value">RBD: ${contrato?.rbd || 'N/A'}</div>
              <div class="meta">Fecha de Emisión: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <h3>Datos Personales</h3>
              <div class="field">
                <div class="label">Nombre Completo</div>
                <div class="value">${funcionario.nombre}</div>
              </div>
              <div class="field">
                <div class="label">RUN (Cédula de Identidad)</div>
                <div class="value">${funcionario.run}</div>
              </div>
              <div class="field">
                <div class="label">Correo Electrónico</div>
                <div class="value">${funcionario.email || 'No registrado'}</div>
              </div>
              <div class="field">
                <div class="label">Título Profesional / Grado</div>
                <div class="value">${funcionario.titulo || 'No especificado'}</div>
              </div>
            </div>

            <div class="card">
              <h3>Detalle del Contrato</h3>
              <div class="field">
                <div class="label">Estamento</div>
                <div class="value">${funcionario.estamento || 'Docente'}</div>
              </div>
              <div class="field">
                <div class="label">Función / Cargo Activo</div>
                <div class="value">${funcionario.cargo || 'Docente de Aula'}</div>
              </div>
              <div class="field">
                <div class="label">Calidad Jurídica</div>
                <div class="value">${contrato?.calidad_juridica || 'A contrata'}</div>
              </div>
              <div class="field">
                <div class="label">Estado de Licencia / Reemplazo</div>
                <div class="value">${contrato?.estado || 'Activo'}</div>
              </div>
              ${contrato?.horas_directivas !== undefined ? `
              <div class="field">
                <div class="label">Horas Directivas</div>
                <div class="value">${contrato.horas_directivas} hrs</div>
              </div>` : ''}
              ${contrato?.horas_aula !== undefined ? `
              <div class="field">
                <div class="label">Horas Aula</div>
                <div class="value">${contrato.horas_aula} hrs</div>
              </div>` : ''}
              ${contrato?.horas_tecnico_pedagogicas !== undefined ? `
              <div class="field">
                <div class="label">Horas Técnico Pedagógicas</div>
                <div class="value">${contrato.horas_tecnico_pedagogicas} hrs</div>
              </div>` : ''}
            </div>
          </div>

          <div class="card" style="margin-bottom: 30px;">
            <h3>Distribución del Financiamiento (Subvenciones)</h3>
            <table>
              <thead>
                <tr>
                  <th>Origen de Fondos</th>
                  <th>Horas Contratadas por Subvención</th>
                </tr>
              </thead>
              <tbody>
                ${financiamientos.map(f => `
                  <tr>
                    <td><strong>${f.origen}</strong></td>
                    <td>${f.horas} hrs</td>
                  </tr>
                `).join('')}
                <tr style="background: #f8fafc; font-weight: bold;">
                  <td>Total Horas Contrato</td>
                  <td>${contrato?.horas_totales || 0} hrs</td>
                </tr>
              </tbody>
            </table>
          </div>

          ${funcionario.estamento === 'Docente' ? `
          <div class="card" style="margin-bottom: 30px;">
            <h3>Clases y Cursos Asignados (Horas de Aula)</h3>
            <table>
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Asignatura</th>
                  <th>Horas Aula Asignadas</th>
                </tr>
              </thead>
              <tbody>
                ${teacherAsigs.map(a => `
                  <tr>
                    <td><strong>${a.curso}</strong></td>
                    <td>${a.asignatura}</td>
                    <td>${a.horas} hrs</td>
                  </tr>
                `).join('')}
                ${teacherAsigs.length === 0 ? `
                  <tr>
                    <td colspan="3" style="text-align: center; color: #94a3b8; font-style: italic;">No registra asignaciones de clases.</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${funcionario.estamento === 'Docente' && leyCalculo ? `
          <div class="card">
            <h3>Cálculo de Proporción Horaria (Ley 20.903)</h3>
            <div class="field" style="margin-bottom: 20px;">
              <div class="label">Régimen Legal Aplicado</div>
              <div class="value">
                Proporción ${leyCalculo.proporcionLectiva}/${leyCalculo.proporcionNoLectiva} 
                ${leyCalculo.leyEspecialAplicada ? '<span style="color:#d97706; font-weight:bold;">(Ley Especial Concentración Prioritaria > 80%)</span>' : '(Proporción Estándar)'}
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
              <div style="border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px;">
                <div class="label">Max. Lectivas (Aula)</div>
                <div class="value" style="color: #b91c1c;">${leyCalculo.horasLectivasMaximas} hrs</div>
              </div>
              <div style="border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px;">
                <div class="label">Min. No Lectivas</div>
                <div class="value" style="color: #047857;">${leyCalculo.horasNoLectivasMinimas} hrs</div>
              </div>
              <div style="border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px;">
                <div class="label">Lectivas Asignadas</div>
                <div class="value" style="color: #1e3a8a;">${leyCalculo.horasLectivasAsignadas} hrs</div>
              </div>
            </div>
            <div style="margin-top: 15px; padding: 10px; border-radius: 6px; background: ${leyCalculo.cumpleLey20903 ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${leyCalculo.cumpleLey20903 ? '#a7f3d0' : '#fca5a5'}; text-align: center; font-weight: bold; font-size: 13px;">
              Cumplimiento Ley 20.903: ${leyCalculo.cumpleLey20903 ? 'CUMPLE CON LA REGLAMENTACIÓN VIGENTE' : 'SOBREPASADO: EXCESO DE HORAS LECTIVAS'}
            </div>
          </div>
          ` : ''}

          <div class="footer">
            <p>Servicio Local de Educación Pública - SLEP Valle Diguillín</p>
            <p>Documento de uso interno del sistema de dotaciones. Los datos reflejados en esta ficha forman parte de las simulaciones y planificaciones escolares del RBD ${contrato?.rbd || ''}.</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printCursoDetail = (
    curso: CursoDinamico, 
    asignaturas: AsignaturaDinamica[], 
    asignacionesList: AsignacionAula[], 
    funcs: Funcionario[], 
    conts: Contrato[]
  ) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const basePlan = planesEstudio.find(p => p.nivel === curso.nivel && p.regimen === curso.regimen);
    const totalHorasMineduc = basePlan?.horasObligatorias || 38;
    const totalHorasAsignadas = asignacionesList.reduce((sum, a) => sum + a.horas, 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Plan de Estudio y Carga Horaria - ${curso.nombre}</title>
          <style>
            body { font-family: 'Outfit', 'Inter', sans-serif; color: #1e293b; padding: 40px; }
            .header { border-bottom: 3px solid #003366; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 24px; font-weight: 800; color: #003366; }
            .title { font-size: 28px; font-weight: bold; margin: 10px 0 5px 0; }
            .meta { font-size: 14px; color: #64748b; }
            .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; background: #f8fafc; }
            .card h3 { margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; color: #0f172a; }
            .field { margin-bottom: 12px; }
            .label { font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; }
            .value { font-size: 15px; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            th { background: #f1f5f9; font-weight: bold; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">Servicio Local de Educación Pública</div>
              <div class="title">Planificación del Curso: ${curso.nombre}</div>
              <div class="meta">Matriz de Distribución Horaria de Asignaturas y Docentes</div>
            </div>
            <div style="text-align: right;">
              <div class="value">RBD: ${curso.rbd}</div>
              <div class="meta">Fecha de Emisión: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <h3>Plan de Estudio del Curso</h3>
              <table>
                <thead>
                  <tr>
                    <th>Asignatura</th>
                    <th>Horas Sugeridas</th>
                    <th>Docente que la Imparte</th>
                    <th>Horas Asignadas</th>
                  </tr>
                </thead>
                <tbody>
                  ${asignaturas.map(asig => {
                    const asigAssign = asignacionesList.find(a => a.asignatura === asig.nombre);
                    const docenteCont = asigAssign ? conts.find(c => c.id === asigAssign.contrato_id) : null;
                    const docente = docenteCont ? funcs.find(f => f.run === docenteCont.funcionario_run) : null;
                    return `
                      <tr>
                        <td><strong>${asig.nombre}</strong></td>
                        <td>${asig.horasSugeridas} hrs</td>
                        <td>${docente ? docente.nombre : '<em style="color:#ef4444;">Sin Asignar</em>'}</td>
                        <td>${asigAssign ? `<strong>${asigAssign.horas} hrs</strong>` : '--'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div>
              <div class="card" style="margin-bottom: 20px;">
                <h3>Resumen General</h3>
                <div class="field">
                  <div class="label">Nivel de Enseñanza</div>
                  <div class="value">${curso.nivel}</div>
                </div>
                <div class="field">
                  <div class="label">Régimen Horario</div>
                  <div class="value">${curso.regimen}</div>
                </div>
                <div class="field">
                  <div class="label">Horas Exigidas Plan MINEDUC</div>
                  <div class="value">${totalHorasMineduc} hrs</div>
                </div>
                <div class="field">
                  <div class="label">Total Horas Asignadas Aula</div>
                  <div class="value" style="font-size: 20px; color: ${totalHorasAsignadas > totalHorasMineduc ? '#ef4444' : '#1e3a8a'};">
                    ${totalHorasAsignadas} / ${totalHorasMineduc} hrs
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Servicio Local de Educación Pública - SLEP Valle Diguillín</p>
            <p>Este reporte resume la asignación de la dotación y horas de docencia aula correspondientes al curso simulado.</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Segmented Hours Calculations
  const getEstamento = (c: Contrato) => {
    const f = funcionarios.find(func => func.run === c.funcionario_run);
    if (f?.estamento) return f.estamento;
    if (c.legislacion_laboral === 'Asistentes de la educación') return 'Asistente de la Educación';
    if (c.legislacion_laboral === 'Estatuto docente') return 'Docente';
    return 'Docente';
  };

  const asistenteContratos = contratos.filter(c => getEstamento(c) === 'Asistente de la Educación');
  const docenteContratos = contratos.filter(c => getEstamento(c) === 'Docente');

  const totalHorasAsistentes = asistenteContratos.reduce((sum, c) => sum + c.horas_totales, 0);
  const totalHorasDocentes = docenteContratos.reduce((sum, c) => sum + c.horas_totales, 0);

  // Docente Hours by Function
  let horasDirectivas = 0;
  let horasTecnicoPedagogicas = 0;
  let horasCoordinacionesUTP = 0;
  let horasApoyoUTP = 0;
  let horasDocenciaAulaOtras = 0;

  docenteContratos.forEach(c => {
    const funcLower = (c.funcion_principal || '').toLowerCase();
    const isDirectiva = funcLower.includes('director') || funcLower.includes('rector') || funcLower.includes('directiva') || funcLower.includes('subdirector') || funcLower.includes('inspector');
    const isCoordinacionUTP = funcLower.includes('utp') && (funcLower.includes('coordinad') || funcLower.includes('jefe'));
    const isApoyoUTP = funcLower.includes('utp') && !isCoordinacionUTP;
    const isTecnicoPedagogica = !isDirectiva && !isCoordinacionUTP && !isApoyoUTP && (
      funcLower.includes('técnico') || funcLower.includes('tecnico') || 
      funcLower.includes('pedagóg') || funcLower.includes('pedagog') || 
      funcLower.includes('curricular') || funcLower.includes('evaluad') || 
      funcLower.includes('orientad')
    );

    if (isDirectiva) {
      horasDirectivas += c.horas_totales;
    } else if (isCoordinacionUTP) {
      horasCoordinacionesUTP += c.horas_totales;
    } else if (isApoyoUTP) {
      horasApoyoUTP += c.horas_totales;
    } else if (isTecnicoPedagogica) {
      horasTecnicoPedagogicas += c.horas_totales;
    } else {
      horasDocenciaAulaOtras += c.horas_totales;
    }
  });

  // Funding helper for both Docente and Asistente
  const getFinsSum = (estamento: EstamentoType, origen: OrigenFondo) => {
    return contratos.filter(c => getEstamento(c) === estamento).reduce((sum, c) => {
      const fins = dbLocal.financiamientoContratos.filter(f => f.contrato_id === c.id);
      return sum + fins.filter(f => f.origen_fondo === origen).reduce((s, f) => s + f.horas, 0);
    }, 0);
  };

  const getFinsOtrasSum = (estamento: EstamentoType) => {
    return contratos.filter(c => getEstamento(c) === estamento).reduce((sum, c) => {
      const fins = dbLocal.financiamientoContratos.filter(f => f.contrato_id === c.id);
      return sum + fins.filter(f => 
        f.origen_fondo !== 'Subvención Regular' && 
        f.origen_fondo !== 'SEP' && 
        f.origen_fondo !== 'PIE' && 
        f.origen_fondo !== 'Pro-retención' && 
        f.origen_fondo !== 'Liceos Bicentenarios'
      ).reduce((s, f) => s + f.horas, 0);
    }, 0);
  };

  // Docente Hours by Funding Source
  const horasSEP = getFinsSum('Docente', 'SEP');
  const horasPIE = getFinsSum('Docente', 'PIE');
  const horasSubvencionRegular = getFinsSum('Docente', 'Subvención Regular');
  const horasProretencion = getFinsSum('Docente', 'Pro-retención');
  const horasLiceosBicentenarios = getFinsSum('Docente', 'Liceos Bicentenarios');
  const horasOtrasFondo = getFinsOtrasSum('Docente');

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-600 font-bold">
        🔒 Acceso Restringido. Redirigiendo...
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      
      {/* Header */}
      <header className="bg-slep-blue text-white shadow-md py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo SLEP" width={110} height={45} className="object-contain" />
            <div className="border-l border-white/20 pl-3">
              <p className="text-[9px] uppercase tracking-wider text-slate-300 font-semibold leading-none">
                {isSupervisorMode ? 'Acceso Supervisor Delegado' : isSostenedorMode ? 'Sostenedor (Gestión de Escuela)' : 'Director / UTP de Escuela'}
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
            ) : isSostenedorMode ? (
              <button 
                onClick={handleExitSostenedorMode}
                className="bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark font-extrabold px-4 py-2 rounded-lg text-xs shadow transition-all duration-200"
              >
                Volver a Sostenedor 🔙
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
            <div className="border-l border-slate-200 pl-6">
              <p className="text-slate-400 font-bold uppercase">Hrs Req. Plan Estudio</p>
              <p className="text-xl font-bold text-slep-blue">
                {(() => {
                  let totalReq = 0;
                  for (const c of cursosDinamicos) {
                    const plan = planesEstudio.find(p => p.nivel === c.nivel && p.regimen === c.regimen);
                    totalReq += plan ? plan.horasObligatorias : 38;
                  }
                  return totalReq;
                })()} hrs
              </p>
            </div>
            <div className="border-l border-slate-200 pl-6">
              <p className="text-slate-400 font-bold uppercase">Total Hrs Contratadas</p>
              <p className="text-xl font-bold text-slep-blue">
                {contratos.reduce((sum, c) => sum + c.horas_totales, 0)} hrs
              </p>
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
          <button 
            onClick={() => setActiveTab('compendio')}
            className={`flex-1 py-3 text-center rounded-lg font-bold text-xs transition-all ${
              activeTab === 'compendio' 
                ? 'bg-slep-blue text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            📊 Compendio Escolar
          </button>
          <button 
            onClick={() => setActiveTab('dotacion')}
            className={`flex-1 py-3 text-center rounded-lg font-bold text-xs transition-all ${
              activeTab === 'dotacion' 
                ? 'bg-slep-blue text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            📋 Dotación Completa
          </button>
        </div>

        {/* Tab contents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Area based on active tab */}
          <div className="lg:col-span-2 space-y-6">
            
            {activeTab === 'docentes' && (
              <div className="space-y-6 w-full">
                
                {/* Tareas de Reemplazo Pendientes Panel */}
                {(() => {
                  const pendingTasks = tareasReemplazo.filter(t => t.rbd === selectedRbd && t.estado === 'Pendiente');
                  if (pendingTasks.length === 0) return null;
                  return (
                    <div className="bg-red-50/50 border border-slep-coral/30 rounded-xl p-5 animate-fadeIn">
                      <h4 className="text-xs font-bold text-red-800 flex items-center gap-1.5 uppercase tracking-wide">
                        ⚠️ Tareas de Reemplazo Pendientes ({pendingTasks.length})
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Sostenedor/RR.HH. ha reportado Licencias Médicas para esta escuela. Asigne un docente de reemplazo para cubrir las horas correspondientes:
                      </p>
                      <div className="mt-3 space-y-3">
                        {pendingTasks.map(t => (
                          <div key={t.id} className="bg-white border rounded-lg p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                            <div>
                              <p className="font-bold text-slate-800">
                                Docente Licenciado:{' '}
                                <button 
                                  onClick={() => {
                                    const titularFunc = funcionarios.find(f => f.run === t.funcionario_titular_run);
                                    if (titularFunc) setEditingFuncionario(titularFunc);
                                  }}
                                  className="underline hover:text-slep-blue text-left font-bold"
                                  title="Ver Ficha Oficial"
                                >
                                  {t.funcionario_titular_nombre}
                                </button>
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">RUN: {t.funcionario_titular_run} | Horas a Cubrir: <span className="font-bold text-slep-blue">{t.horas_a_cubrir} hrs</span></p>
                            </div>
                            {(() => {
                              const propContrato = contratos.find(c => 
                                c.estado === 'Pendiente_Aprobacion' && 
                                (c.vinculo_titular_id?.includes(t.funcionario_titular_run) || c.vinculo_titular_id === t.funcionario_titular_run)
                              );
                              if (propContrato) {
                                const propFunc = funcionarios.find(f => f.run === propContrato.funcionario_run);
                                return (
                                  <div className="bg-amber-50 text-amber-800 border border-amber-200/80 rounded px-3 py-1.5 font-bold flex items-center gap-1">
                                    <span>⏳ Propuesta Enviada:</span>
                                    <span>{propFunc ? propFunc.nombre : propContrato.funcionario_run} (Esperando Aprobación RR.HH.)</span>
                                  </div>
                                );
                              }
                              return (
                                <div className="flex flex-wrap items-center gap-2">
                                  <select
                                    value={taskReemplazoRun[t.id] || ''}
                                    onChange={(e) => setTaskReemplazoRun({...taskReemplazoRun, [t.id]: e.target.value})}
                                    className="p-1.5 border rounded bg-white font-medium text-slate-700"
                                  >
                                    <option value="">-- Seleccionar Docente --</option>
                                    {funcionarios
                                      .filter(f => f.estamento === 'Docente')
                                      .map(f => (
                                        <option key={f.run} value={f.run}>
                                          {f.nombre} ({f.run})
                                        </option>
                                      ))
                                    }
                                  </select>
                                  <span className="text-slate-400">o</span>
                                  <input
                                    type="text"
                                    placeholder="RUT Reemplazo Manual"
                                    value={taskReemplazoRun[t.id] || ''}
                                    onChange={(e) => setTaskReemplazoRun({...taskReemplazoRun, [t.id]: e.target.value})}
                                    className="p-1.5 border rounded font-mono w-32"
                                  />
                                  <button
                                    onClick={() => handleResolveReemplazo(t, taskReemplazoRun[t.id] || '')}
                                    className="bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark font-extrabold px-3 py-1.5 rounded shadow text-[11px]"
                                  >
                                    Proponer Reemplazo 🤝
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Docentes del Establecimiento</h3>
                    <p className="text-xs text-slate-500 mt-1">Gestión individual e inmediata de la dotación docente.</p>
                  </div>
                  {selectedDocentes.length > 0 && (
                    <button 
                      onClick={handleBulkDeleteDocentes}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1.5"
                    >
                      🗑️ Desvincular Seleccionados ({selectedDocentes.length})
                    </button>
                  )}
                </div>
                
                <div className="mt-4 border border-slate-100 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 font-bold text-slate-600">
                      <tr>
                        <th className="p-3 text-center w-12">
                          <input 
                            type="checkbox"
                            checked={schoolDocentes.length > 0 && selectedDocentes.length === schoolDocentes.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDocentes(schoolDocentes.map(d => d.run));
                              } else {
                                setSelectedDocentes([]);
                              }
                            }}
                          />
                        </th>
                        <th className="p-3 pl-2">Nombre</th>
                        <th className="p-3">RUT</th>
                        <th className="p-3">Cargo</th>
                        <th className="p-3 text-center">Contrato</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schoolDocentes.map(f => {
                        const hasCont = contratos.find(c => c.funcionario_run === f.run);
                        return (
                          <tr key={f.run} className="hover:bg-slate-50">
                            <td className="p-3 text-center">
                              <input 
                                type="checkbox"
                                checked={selectedDocentes.includes(f.run)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDocentes([...selectedDocentes, f.run]);
                                  } else {
                                    setSelectedDocentes(selectedDocentes.filter(run => run !== f.run));
                                  }
                                }}
                              />
                            </td>
                            <td className="p-3 pl-4 font-bold text-slate-800">
                              <button 
                                onClick={() => handleOpenEditFuncionario(f)}
                                className="text-slep-blue hover:underline text-left font-bold"
                              >
                                👤 {f.nombre}
                              </button>
                              {(() => {
                                if (hasCont && hasCont.estado === 'Activo') {
                                  const teacherAsigs = asignaciones.filter(a => a.contrato_id === hasCont.id);
                                  const leyCalculo = colegio ? validarCargaDocente(hasCont, colegio, teacherAsigs, cargosPersonalizados) : null;
                                  if (leyCalculo && !leyCalculo.cumpleLey20903) {
                                    return (
                                      <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[9px] font-black border border-rose-300 ml-2 animate-pulse whitespace-nowrap" title={`Exceso detectado en proporción de aula. Se asignan ${leyCalculo.horasLectivasAsignadas} hrs vs max legal de ${leyCalculo.horasLectivasMaximas} hrs.`}>
                                        ⚠️ Sobrecarga Ley 20.903
                                      </span>
                                    );
                                  }
                                }
                                return null;
                              })()}
                            </td>
                            <td className="p-3 font-mono text-slate-500">{f.run}</td>
                            <td className="p-3 text-slate-700">{f.cargo || 'Docente'}</td>
                            <td className="p-3 text-center">
                              {hasCont ? (
                                <div className="space-y-1">
                                  <div className="font-bold text-slate-700">{hasCont.horas_totales} hrs</div>
                                  <div className="flex flex-col items-center gap-1 mt-1">
                                    {hasCont.estado === 'Activo' && (
                                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Activo</span>
                                    )}
                                    {hasCont.estado === 'Licencia Médica' && (
                                      <>
                                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Licencia Médica 🩺</span>
                                        {tareasReemplazo.some(t => t.funcionario_titular_run === f.run && t.estado === 'Pendiente') ? (
                                          <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded text-[8px] font-black border border-red-300 animate-pulse uppercase tracking-wide">⚠️ Sin Reemplazo</span>
                                        ) : (
                                          <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded text-[8px] font-black border border-emerald-300 uppercase tracking-wide">✓ Cubierto</span>
                                        )}
                                      </>
                                    )}
                                    {hasCont.estado === 'Reemplazo' && (
                                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Reemplazo</span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400">Sin Contrato</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleDeleteFuncionario(f.run)}
                                    className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded font-bold border border-red-200"
                                  >
                                    Desvincular
                                  </button>
                                  {hasCont && hasCont.estado === 'Activo' && (
                                    <button
                                      onClick={() => handleToggleLicencia(hasCont.id, true)}
                                      className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold border border-amber-200"
                                    >
                                      🩺 Reg. Licencia
                                    </button>
                                  )}
                                  {hasCont && hasCont.estado === 'Licencia Médica' && (
                                    <button
                                      onClick={() => handleToggleLicencia(hasCont.id, false)}
                                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold border border-emerald-200"
                                    >
                                      ✔️ Desmarcar Licencia
                                    </button>
                                  )}
                                </div>

                                {hasCont && hasCont.estado === 'Licencia Médica' && (
                                  <div className="mt-2 bg-slate-50 p-2 rounded border border-slate-200 inline-block text-left w-full max-w-xs">
                                    {contratos.some(c => c.vinculo_titular_id === hasCont.id) ? (
                                      (() => {
                                        const rpl = contratos.find(c => c.vinculo_titular_id === hasCont.id);
                                        const rplFunc = rpl ? funcionarios.find(func => func.run === rpl.funcionario_run) : null;
                                        return (
                                          <div className="text-slate-600 font-medium text-[10px] text-center">
                                            👤 Reemplazo: <strong>{rplFunc ? rplFunc.nombre : rpl?.funcionario_run}</strong> ({rpl?.funcionario_run})
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      <div className="flex items-center justify-between gap-1.5">
                                        <input 
                                          type="text" 
                                          placeholder="RUT Reemplazo (Ej: 11.222.333-4)"
                                          className="p-1 border rounded bg-white w-2/3 text-[10px]"
                                          value={reemplazoRunMap[hasCont.id] || ''}
                                          onChange={(e) => setReemplazoRunMap({...reemplazoRunMap, [hasCont.id]: e.target.value})}
                                        />
                                        <button 
                                          onClick={() => {
                                            handleAddReemplazo(hasCont, reemplazoRunMap[hasCont.id] || '');
                                            setReemplazoRunMap({...reemplazoRunMap, [hasCont.id]: ''});
                                          }}
                                          className="bg-slep-blue text-white px-2 py-1 rounded font-bold hover:bg-slep-blue-hover text-[10px]"
                                        >
                                          Asignar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
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

            {activeTab === 'asistentes' && (
              <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Asistentes de la Educación</h3>
                    <p className="text-xs text-slate-500 mt-1">Gestión individual de profesionales técnicos, psicólogos, administrativos y auxiliares.</p>
                  </div>
                  {selectedAsistentes.length > 0 && (
                    <button 
                      onClick={handleBulkDeleteAsistentes}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1.5"
                    >
                      🗑️ Desvincular Seleccionados ({selectedAsistentes.length})
                    </button>
                  )}
                </div>

                <div className="mt-4 border border-slate-100 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 font-bold text-slate-600">
                      <tr>
                        <th className="p-3 text-center w-12">
                          <input 
                            type="checkbox"
                            checked={schoolAsistentes.length > 0 && selectedAsistentes.length === schoolAsistentes.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAsistentes(schoolAsistentes.map(d => d.run));
                              } else {
                                setSelectedAsistentes([]);
                              }
                            }}
                          />
                        </th>
                        <th className="p-3 pl-2">Nombre</th>
                        <th className="p-3">RUT</th>
                        <th className="p-3">Función/Cargo</th>
                        <th className="p-3 text-center">Horas</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schoolAsistentes.map(f => {
                        const hasCont = contratos.find(c => c.funcionario_run === f.run);
                        return (
                          <tr key={f.run} className="hover:bg-slate-50">
                            <td className="p-3 text-center">
                              <input 
                                type="checkbox"
                                checked={selectedAsistentes.includes(f.run)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAsistentes([...selectedAsistentes, f.run]);
                                  } else {
                                    setSelectedAsistentes(selectedAsistentes.filter(run => run !== f.run));
                                  }
                                }}
                              />
                            </td>
                            <td className="p-3 pl-2 font-bold text-slate-800">
                               <button 
                                 onClick={() => handleOpenEditFuncionario(f)}
                                 className="text-slep-blue hover:underline text-left font-bold"
                               >
                                 👥 {f.nombre}
                               </button>
                             </td>
                            <td className="p-3 font-mono text-slate-500">{f.run}</td>
                            <td className="p-3 text-slate-700">{f.cargo || 'Asistente'}</td>
                            <td className="p-3 text-center">
                              {hasCont ? (
                                <div className="space-y-1">
                                  <div className="font-bold text-slate-700">{hasCont.horas_totales} hrs</div>
                                  <div>
                                    {hasCont.estado === 'Activo' && (
                                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Activo</span>
                                    )}
                                    {hasCont.estado === 'Licencia Médica' && (
                                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Licencia Médica 🩺</span>
                                    )}
                                    {hasCont.estado === 'Reemplazo' && (
                                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Reemplazo</span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400">Sin Contrato</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleDeleteFuncionario(f.run)}
                                    className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded font-bold border border-red-200"
                                  >
                                    Desvincular
                                  </button>
                                  {hasCont && hasCont.estado === 'Activo' && (
                                    <button
                                      onClick={() => handleToggleLicencia(hasCont.id, true)}
                                      className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold border border-amber-200"
                                    >
                                      🩺 Reg. Licencia
                                    </button>
                                  )}
                                  {hasCont && hasCont.estado === 'Licencia Médica' && (
                                    <button
                                      onClick={() => handleToggleLicencia(hasCont.id, false)}
                                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold border border-emerald-200"
                                    >
                                      ✔️ Desmarcar Licencia
                                    </button>
                                  )}
                                </div>

                                {hasCont && hasCont.estado === 'Licencia Médica' && (
                                  <div className="mt-2 bg-slate-50 p-2 rounded border border-slate-200 inline-block text-left w-full max-w-xs">
                                    {contratos.some(c => c.vinculo_titular_id === hasCont.id) ? (
                                      (() => {
                                        const rpl = contratos.find(c => c.vinculo_titular_id === hasCont.id);
                                        const rplFunc = rpl ? funcionarios.find(func => func.run === rpl.funcionario_run) : null;
                                        return (
                                          <div className="text-slate-600 font-medium text-[10px] text-center">
                                            👤 Reemplazo: <strong>{rplFunc ? rplFunc.nombre : rpl?.funcionario_run}</strong> ({rpl?.funcionario_run})
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      <div className="flex items-center justify-between gap-1.5">
                                        <input 
                                          type="text" 
                                          placeholder="RUT Reemplazo (Ej: 11.222.333-4)"
                                          className="p-1 border rounded bg-white w-2/3 text-[10px]"
                                          value={reemplazoRunMap[hasCont.id] || ''}
                                          onChange={(e) => setReemplazoRunMap({...reemplazoRunMap, [hasCont.id]: e.target.value})}
                                        />
                                        <button 
                                          onClick={() => {
                                            handleAddReemplazo(hasCont, reemplazoRunMap[hasCont.id] || '');
                                            setReemplazoRunMap({...reemplazoRunMap, [hasCont.id]: ''});
                                          }}
                                          className="bg-slep-blue text-white px-2 py-1 rounded font-bold hover:bg-slep-blue-hover text-[10px]"
                                        >
                                          Asignar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
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
                  <h3 className="text-base font-bold text-slate-800 mb-4">Planificador de Carga Horaria y Cursos</h3>
                  
                  {/* Cursos Registrados */}
                  <div className="mb-6 pb-6 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-3">Cursos Registrados (Haz clic para ver, editar e imprimir asignaturas y docentes)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {cursosDinamicos.map(c => {
                        const basePlan = planesEstudio.find(p => p.nivel === c.nivel && p.regimen === c.regimen);
                        const assignedHrs = asignaciones.filter(a => a.curso === c.nombre).reduce((sum, a) => sum + a.horas, 0);
                        const baseOblig = basePlan?.horasObligatorias || 38;
                        const horasInsuficientes = assignedHrs < baseOblig;
                        return (
                          <div key={c.nombre} className="relative group">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCurso(c)}
                              className={`w-full p-3.5 border rounded-xl text-xs font-bold text-center transition-all shadow-sm flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                horasInsuficientes 
                                  ? 'bg-rose-50/70 border-rose-300 hover:bg-rose-100' 
                                  : 'bg-slate-50 hover:bg-slep-blue hover:text-white border-slate-200 hover:border-slep-blue'
                              }`}
                            >
                              <span className="text-xl group-hover:scale-110 transition-transform">🏫</span>
                              <span className={`transition-colors ${horasInsuficientes ? 'text-rose-800' : 'text-slate-800 group-hover:text-white'}`}>{c.nombre}</span>
                              <span className={`text-[9px] font-normal ${horasInsuficientes ? 'text-rose-600' : 'text-slate-400 group-hover:text-white/80'}`}>{c.nivel}</span>
                              {horasInsuficientes ? (
                                <span className="text-[8px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded tracking-wide animate-pulse uppercase mt-1">
                                  ⚠️ Faltan {baseOblig - assignedHrs} hrs
                                </span>
                              ) : (
                                <span className="text-[8px] bg-green-700 text-white font-bold px-1.5 py-0.5 rounded tracking-wide uppercase mt-1">
                                  ✓ {assignedHrs} hrs
                                </span>
                              )}
                              {c.profesor_jefe_run && (
                                <span className="text-[9px] text-emerald-600 group-hover:text-amber-200 font-bold">
                                  🧑‍🏫 {(() => {
                                    const f = funcionarios.find(func => func.run === c.profesor_jefe_run);
                                    return f ? f.nombre.split(' ')[0] + ' ' + (f.nombre.split(' ')[2] || '') : 'Jefe';
                                  })()}
                                </span>
                              )}
                            </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCurso(c.nombre);
                            }}
                            className="absolute top-1 right-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black border border-red-300 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer z-10"
                            title="Eliminar Curso"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                      {cursosDinamicos.length === 0 && (
                        <p className="col-span-full py-4 text-center text-slate-400 italic">No hay cursos creados aún.</p>
                      )}
                    </div>
                  </div>

                  {/* Select normalized course names and study plan */}
                  <form onSubmit={handleCreateCurso} className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border text-xs">
                    <div>
                      <label className="block font-bold text-slate-500 mb-1">Curso Base</label>
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
                      <label className="block font-bold text-slate-500 mb-1">Letra / Sufijo (Ej: A, B, HC, TP)</label>
                      <input 
                        type="text"
                        placeholder="Ej: A"
                        className="w-full p-2 bg-white border rounded font-bold"
                        value={cursoSufijo}
                        onChange={(e) => setCursoSufijo(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 mb-1">Asociar Plan de Estudio</label>
                      <select
                        className="w-full p-2 bg-white border rounded"
                        value={selectedPlanIndex}
                        onChange={(e) => setSelectedPlanIndex(Number(e.target.value))}
                      >
                        {planesEstudio.map((p, idx) => {
                          // Filter to avoid confusion: check if selectedCursoNorm matches plan level
                          // Selected base course is like: '1° Básico', '2° Medio', etc.
                          // Plan levels are like: '1° a 4° Básico', '5° a 8° Básico', 'Educación Parvularia (Pre-Kínder y Kínder)', '1° y 2° Medio', '3° y 4° Medio'
                          const isBasic = selectedCursoNorm.includes('Básico');
                          const isMed = selectedCursoNorm.includes('Medio');
                          const isPlanBasic = p.nivel.includes('Básico');
                          const isPlanMed = p.nivel.includes('Medio');

                          // Custom parsing helper to see if specific number matches
                          const baseNumMatch = selectedCursoNorm.match(/\d+/);
                          const baseNum = baseNumMatch ? parseInt(baseNumMatch[0], 10) : 1;

                          let matches = false;
                          if (isBasic && isPlanBasic) {
                            if (p.nivel.includes('1° a 4°') && baseNum <= 4) matches = true;
                            if (p.nivel.includes('5° a 8°') && baseNum >= 5) matches = true;
                            if (!p.nivel.includes('1° a 4°') && !p.nivel.includes('5° a 8°')) matches = true; // fallback
                          } else if (isMed && isPlanMed) {
                            if (p.nivel.includes('1° y 2°') && baseNum <= 2) matches = true;
                            if (p.nivel.includes('3° y 4°') && baseNum >= 3) matches = true;
                            if (!p.nivel.includes('1° y 2°') && !p.nivel.includes('3° y 4°')) matches = true; // fallback
                          }
                          
                          if (!matches) return null;

                          return (
                            <option key={idx} value={idx}>
                              {p.nivel} ({p.regimen}) - {p.horasObligatorias} hrs
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button type="submit" className="w-full bg-slep-blue text-white font-bold py-2 rounded text-xs shadow">
                        Crear Curso
                      </button>
                    </div>
                  </form>

                  {/* Create Custom Roles (SEP/PIE etc. bound) */}
                  <form onSubmit={handleCreateCargoPersonalizado} className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border text-xs">
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
                    <div>
                      <label className="block font-bold text-slate-500 mb-1">Horas Cargo</label>
                      <input 
                        type="number"
                        placeholder="10"
                        className="w-full p-2 border rounded font-bold"
                        value={customCargoHoras}
                        onChange={(e) => setCustomCargoHoras(parseFloat(e.target.value) || 0)}
                      />
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
                        {contratos.filter(c => {
                          const f = funcionarios.find(func => func.run === c.funcionario_run);
                          return f?.estamento === 'Docente' || c.legislacion_laboral === 'Estatuto docente';
                        }).map(c => {
                          const f = funcionarios.find(func => func.run === c.funcionario_run);
                          return <option key={c.id} value={c.funcionario_run}>{f ? f.nombre : c.funcionario_run} ({c.horas_totales} hrs)</option>;
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

            {activeTab === 'compendio' && (
              <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Compendio e Información Completa del Establecimiento</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Consolidado interactivo de matrícula, dotaciones docentes, horas de plan de estudio, y financiamiento SEP/PIE.</p>
                </div>

                {/* Dashboard Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-blue-700">Régimen Horario</p>
                    <p className="text-lg font-black text-blue-900 mt-1">
                      {cursosDinamicos.length > 0
                        ? Array.from(new Set(cursosDinamicos.map(c => c.regimen))).join(' / ')
                        : 'JEC'}
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-amber-700">Prioritarios %</p>
                    <p className="text-lg font-black text-amber-900 mt-1">{colegio?.ivm || 80}%</p>
                  </div>
                  <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-purple-700">Financiamiento SEP</p>
                    <p className="text-lg font-black text-purple-900 mt-1">
                      {contratos.reduce((sum, c) => {
                        const fins = dbLocal.financiamientoContratos.filter(f => f.contrato_id === c.id);
                        return sum + fins.filter(f => f.origen_fondo === 'SEP').reduce((s, f) => s + f.horas, 0);
                      }, 0)} hrs
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-emerald-700">Financiamiento PIE</p>
                    <p className="text-lg font-black text-emerald-900 mt-1">
                      {contratos.reduce((sum, c) => {
                        const fins = dbLocal.financiamientoContratos.filter(f => f.contrato_id === c.id);
                        return sum + fins.filter(f => f.origen_fondo === 'PIE').reduce((s, f) => s + f.horas, 0);
                      }, 0)} hrs
                    </p>
                  </div>
                </div>

                {/* Director / UTP Information Card */}
                <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/50">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Equipo Directivo / UTP Registrado</h4>
                  <div className="space-y-2.5 text-xs">
                    {(() => {
                      const dirCon = contratos.find(c => c.funcion_principal.toLowerCase().includes('director'));
                      const dirFunc = dirCon ? funcionarios.find(f => f.run === dirCon.funcionario_run) : null;
                      
                      const utpCon = contratos.find(c => c.funcion_principal.toLowerCase().includes('utp') || c.funcion_principal.toLowerCase().includes('jefe de utp') || c.funcion_principal.toLowerCase().includes('director_academico') || c.funcion_principal.toLowerCase().includes('coordinador utp'));
                      const utpFunc = utpCon ? funcionarios.find(f => f.run === utpCon.funcionario_run) : null;

                      return (
                        <>
                          <div className="flex justify-between items-center bg-white p-2.5 rounded border">
                            <div>
                              <span className="font-bold text-slate-800">{dirFunc ? dirFunc.nombre : 'Director No Registrado en Ingesta'}</span>
                              <span className="text-[10px] text-slate-400 font-bold ml-2">Director</span>
                            </div>
                            <span className="font-mono text-slate-500 font-semibold">{dirCon ? `${dirCon.horas_totales} hrs` : '--'}</span>
                          </div>
                          <div className="flex justify-between items-center bg-white p-2.5 rounded border">
                            <div>
                              <span className="font-bold text-slate-800">{utpFunc ? utpFunc.nombre : 'Jefe de UTP No Registrado en Ingesta'}</span>
                              <span className="text-[10px] text-slate-400 font-bold ml-2">Jefe de UTP / Coordinación</span>
                            </div>
                            <span className="font-mono text-slate-500 font-semibold">{utpCon ? `${utpCon.horas_totales} hrs` : '--'}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Detailed Summary Table */}
                <div className="border rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 font-bold border-b">
                      <tr>
                        <th className="p-3 pl-4">Indicador / Resumen</th>
                        <th className="p-3 text-center">Profesores (Docentes)</th>
                        <th className="p-3 text-center">Asistentes de la Educación</th>
                        <th className="p-3 text-center">Total Contratado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Total Personas</td>
                        <td className="p-3 text-center font-bold text-slep-blue">
                          {funcionarios.filter(f => f.estamento === 'Docente' && contratos.some(c => c.funcionario_run === f.run)).length}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-600">
                          {funcionarios.filter(f => f.estamento === 'Asistente de la Educación' && contratos.some(c => c.funcionario_run === f.run)).length}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {contratos.length}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Total Horas Contrato</td>
                        <td className="p-3 text-center font-semibold">
                          {contratos.filter(c => {
                            const f = funcionarios.find(func => func.run === c.funcionario_run);
                            return f?.estamento === 'Docente';
                          }).reduce((sum, c) => sum + c.horas_totales, 0)} hrs
                        </td>
                        <td className="p-3 text-center font-semibold">
                          {contratos.filter(c => {
                            const f = funcionarios.find(func => func.run === c.funcionario_run);
                            return f?.estamento === 'Asistente de la Educación';
                          }).reduce((sum, c) => sum + c.horas_totales, 0)} hrs
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {contratos.reduce((sum, c) => sum + c.horas_totales, 0)} hrs
                        </td>
                      </tr>
                      {(() => {
                        const docConts = contratos.filter(c => {
                          const f = funcionarios.find(func => func.run === c.funcionario_run);
                          return f?.estamento === 'Docente';
                        });
                        const docContsIds = docConts.map(c => c.id);
                        const docPedagogicas = asignaciones.filter(a => docContsIds.includes(a.contrato_id)).reduce((sum, a) => sum + a.horas, 0);
                        const docTotalHrs = docConts.reduce((sum, c) => sum + c.horas_totales, 0);
                        const docNoPedagogicas = Math.max(0, docTotalHrs - docPedagogicas);

                        const asisConts = contratos.filter(c => {
                          const f = funcionarios.find(func => func.run === c.funcionario_run);
                          return f?.estamento === 'Asistente de la Educación';
                        });
                        const asisTotalHrs = asisConts.reduce((sum, c) => sum + c.horas_totales, 0);
                        const asisPedagogicas = 0;
                        const asisNoPedagogicas = asisTotalHrs;

                        const totalPedagogicas = docPedagogicas;
                        const totalNoPedagogicas = docNoPedagogicas + asisNoPedagogicas;

                        return (
                          <>
                            <tr className="bg-slate-50/40">
                              <td className="p-3 pl-4 font-semibold text-slate-900">Horas Pedagógicas (Aula)</td>
                              <td className="p-3 text-center text-slate-600 font-semibold">{docPedagogicas} hrs</td>
                              <td className="p-3 text-center text-slate-600 font-semibold">{asisPedagogicas} hrs</td>
                              <td className="p-3 text-center font-bold text-slep-blue">{totalPedagogicas} hrs</td>
                            </tr>
                            <tr className="bg-slate-50/40">
                              <td className="p-3 pl-4 font-semibold text-slate-900">Horas No Pedagógicas (Planif./Cargos)</td>
                              <td className="p-3 text-center text-slate-600 font-semibold">{docNoPedagogicas.toFixed(1)} hrs</td>
                              <td className="p-3 text-center text-slate-600 font-semibold">{asisNoPedagogicas} hrs</td>
                              <td className="p-3 text-center font-bold text-slate-800">{totalNoPedagogicas.toFixed(1)} hrs</td>
                            </tr>
                          </>
                        );
                      })()}
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Horas Subvención Regular</td>
                        <td className="p-3 text-center font-medium">{getFinsSum('Docente', 'Subvención Regular')} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSum('Asistente de la Educación', 'Subvención Regular')} hrs</td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {getFinsSum('Docente', 'Subvención Regular') + getFinsSum('Asistente de la Educación', 'Subvención Regular')} hrs
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Horas SEP</td>
                        <td className="p-3 text-center font-medium">{getFinsSum('Docente', 'SEP')} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSum('Asistente de la Educación', 'SEP')} hrs</td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {getFinsSum('Docente', 'SEP') + getFinsSum('Asistente de la Educación', 'SEP')} hrs
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Horas PIE</td>
                        <td className="p-3 text-center font-medium">{getFinsSum('Docente', 'PIE')} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSum('Asistente de la Educación', 'PIE')} hrs</td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {getFinsSum('Docente', 'PIE') + getFinsSum('Asistente de la Educación', 'PIE')} hrs
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Horas Proretención</td>
                        <td className="p-3 text-center font-medium">{getFinsSum('Docente', 'Pro-retención')} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSum('Asistente de la Educación', 'Pro-retención')} hrs</td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {getFinsSum('Docente', 'Pro-retención') + getFinsSum('Asistente de la Educación', 'Pro-retención')} hrs
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Horas Liceos Bicentenarios</td>
                        <td className="p-3 text-center font-medium">{getFinsSum('Docente', 'Liceos Bicentenarios')} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSum('Asistente de la Educación', 'Liceos Bicentenarios')} hrs</td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {getFinsSum('Docente', 'Liceos Bicentenarios') + getFinsSum('Asistente de la Educación', 'Liceos Bicentenarios')} hrs
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Otras Horas/Fondos</td>
                        <td className="p-3 text-center font-medium">{getFinsOtrasSum('Docente')} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsOtrasSum('Asistente de la Educación')} hrs</td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {getFinsOtrasSum('Docente') + getFinsOtrasSum('Asistente de la Educación')} hrs
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Study Plan detail */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase">Resumen por Cursos y Planes de Estudio</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cursosDinamicos.map(c => {
                      const basePlan = planesEstudio.find(p => p.nivel === c.nivel && p.regimen === c.regimen);
                      const assignedHrs = asignaciones.filter(a => a.curso === c.nombre).reduce((sum, a) => sum + a.horas, 0);
                      const baseOblig = basePlan?.horasObligatorias || 38;

                      return (
                        <div key={c.nombre} className="border p-3 rounded-lg text-xs">
                          <div className="flex justify-between font-bold text-slate-800 mb-1">
                            <button 
                              onClick={() => handleOpenEditCurso(c)}
                              className="text-slep-blue hover:underline font-bold text-left"
                            >
                              🏫 {c.nombre}
                            </button>
                            <span>{assignedHrs} / {baseOblig} hrs</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
                            <div 
                              className={`h-1.5 rounded-full ${assignedHrs > baseOblig ? 'bg-red-500' : 'bg-slep-blue'}`} 
                              style={{ width: `${Math.min(100, (assignedHrs / baseOblig) * 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-[10px] text-slate-400">Plan asociado: {c.nivel} ({c.regimen})</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dotacion' && (
              <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Dotación Completa de Personal</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Listado consolidado de docentes y asistentes con sus cargas horarias y cursos asignados.</p>
                </div>

                {/* Visual Hours Distribution Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                  {/* Column 1: Estamentos */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider border-b pb-1">Estamentos</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between font-bold text-slate-700 text-xs mb-0.5">
                          <span>🍎 Docentes</span>
                          <span>{totalHorasDocentes} hrs ({((totalHorasDocentes / (totalHorasDocentes + totalHorasAsistentes || 1)) * 100).toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-slep-blue h-2 rounded-full transition-all" style={{ width: `${(totalHorasDocentes / (totalHorasDocentes + totalHorasAsistentes || 1)) * 100}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between font-bold text-slate-700 text-xs mb-0.5">
                          <span>👥 Asistentes</span>
                          <span>{totalHorasAsistentes} hrs ({((totalHorasAsistentes / (totalHorasDocentes + totalHorasAsistentes || 1)) * 100).toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${(totalHorasAsistentes / (totalHorasDocentes + totalHorasAsistentes || 1)) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Funciones */}
                  <div className="space-y-2 text-[11px]">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider border-b pb-1">Funciones Docentes</h4>
                    {[
                      { label: '💼 Directivas', value: horasDirectivas, color: 'bg-rose-500' },
                      { label: '⚙️ Téc. Pedagógicas', value: horasTecnicoPedagogicas, color: 'bg-emerald-500' },
                      { label: '📊 Coord. UTP', value: horasCoordinacionesUTP, color: 'bg-amber-500' },
                      { label: '🔍 Apoyo UTP', value: horasApoyoUTP, color: 'bg-indigo-500' },
                      { label: '🧑‍🏫 Aula / Otras', value: horasDocenciaAulaOtras, color: 'bg-slate-405' }
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center py-0.5">
                        <span className="font-semibold text-slate-600">{item.label}</span>
                        <span className="font-bold text-slate-800">{item.value} hrs</span>
                      </div>
                    ))}
                  </div>

                  {/* Column 3: Financiamientos */}
                  <div className="space-y-2 text-[11px]">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider border-b pb-1">Financiamiento Docente</h4>
                    {[
                      { label: 'Subv. Regular', value: horasSubvencionRegular },
                      { label: 'Horas SEP', value: horasSEP },
                      { label: 'Horas PIE', value: horasPIE },
                      { label: 'Horas Proretención', value: horasProretencion },
                      { label: 'Liceos Bic.', value: horasLiceosBicentenarios },
                      { label: 'Otras Horas/Fondos', value: horasOtrasFondo }
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center py-0.5">
                        <span className="font-semibold text-slate-600">💰 {item.label}</span>
                        <span className="font-bold text-slate-800">{item.value} hrs</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 font-bold text-slate-600 border-b">
                      <tr>
                        <th className="p-3 pl-4">Funcionario</th>
                        <th className="p-3">Estamento</th>
                        <th className="p-3">Cargo / Función</th>
                        <th className="p-3">Título Profesional</th>
                        <th className="p-3 text-center">Horas Contrato</th>
                        <th className="p-3 text-center">Horas Aula</th>
                        <th className="p-3 text-center">Horas No Pedag.</th>
                        <th className="p-3">Cursos / Clases Asignadas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const schoolConts = contratos.filter(c => c.rbd === selectedRbd);
                        return schoolConts.map(c => {
                          const f = funcionarios.find(func => func.run === c.funcionario_run);
                          if (!f) return null;
                          const cAsigs = asignaciones.filter(a => a.contrato_id === c.id);
                          const pedagogicas = cAsigs.reduce((sum, a) => sum + a.horas, 0);
                          const noPedagogicas = Math.max(0, c.horas_totales - pedagogicas);
                          const coursesString = cAsigs.map(a => `${a.curso} (${a.asignatura})`).join(', ');

                          return (
                            <tr key={c.id} className="hover:bg-slate-50">
                              <td className="p-3 pl-4">
                                <button
                                  onClick={() => handleOpenEditFuncionario(f)}
                                  className="text-slep-blue font-bold hover:underline text-left cursor-pointer"
                                >
                                  {f.nombre}
                                </button>
                                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{f.run}</p>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  f.estamento === 'Docente' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {f.estamento}
                                </span>
                              </td>
                              <td className="p-3 text-slate-700 font-medium">{f.cargo || '--'}</td>
                              <td className="p-3 text-slate-500 font-medium">{f.titulo || 'No registrado'}</td>
                              <td className="p-3 text-center font-bold text-slate-800">{c.horas_totales} hrs</td>
                              <td className="p-3 text-center font-bold text-slep-blue">{pedagogicas} hrs</td>
                              <td className="p-3 text-center font-bold text-slate-500">{noPedagogicas.toFixed(1)} hrs</td>
                              <td className="p-3 text-slate-600 max-w-[200px] truncate" title={coursesString}>
                                {coursesString || <span className="text-slate-400 italic">Ninguno</span>}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
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
                      if (e.target.value === 'Docente') setNewCargo('DOCENTE DE AULA');
                      else setNewCargo('Auxiliar de Servicios');
                    }}
                  >
                    <option value="Docente">Docente / Profesor</option>
                    <option value="Asistente de la Educación">Asistente de la Educación</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Función / Cargo</label>
                  {newEstamento === 'Docente' ? (
                    <div className="space-y-2">
                      <select 
                        className="w-full p-2 border rounded bg-white"
                        value={CARGOS_DOCENTES_LIST.includes(newCargo as any) ? newCargo : 'OTRO'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'OTRO') {
                            setNewCargo('');
                          } else {
                            setNewCargo(val);
                          }
                        }}
                      >
                        {CARGOS_DOCENTES_LIST.map(cargoOption => (
                          <option key={cargoOption} value={cargoOption}>{cargoOption}</option>
                        ))}
                      </select>
                      
                      {(!CARGOS_DOCENTES_LIST.includes(newCargo as any) || newCargo === 'OTRO') && (
                        <input 
                          type="text" 
                          placeholder="Especifique otro cargo docente..." 
                          className="w-full p-2 border rounded"
                          value={newCargo}
                          onChange={(e) => setNewCargo(e.target.value)}
                        />
                      )}
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="Ej: Auxiliar de Servicios, Psicóloga, etc." 
                      className="w-full p-2 border rounded"
                      value={newCargo}
                      onChange={(e) => setNewCargo(e.target.value)}
                    />
                  )}
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
                  const metrics = colegio ? validarCargaDocente(c, colegio, teacherAsigs, cargosPersonalizados) : null;
                  
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

        {/* Modal: View / Edit / Print Funcionario */}
        {editingFuncionario && (() => {
          const relatedCont = contratos.find(c => c.funcionario_run === editingFuncionario.run);
          const teacherAsigs = asignaciones.filter(a => a.contrato_id === relatedCont?.id);
          const leyCalculo = colegio && relatedCont ? validarCargaDocente(relatedCont, colegio, teacherAsigs, cargosPersonalizados) : null;

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Expediente de Personal</p>
                    <h3 className="text-lg font-bold text-slate-800">{editFuncNombre || editingFuncionario.nombre}</h3>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">RUN: {editingFuncionario.run}</p>
                  </div>
                  <button 
                    onClick={() => setEditingFuncionario(null)}
                    className="text-slate-400 hover:text-slate-600 bg-slate-200/50 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer font-bold w-8 h-8 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6 flex-1 text-xs">
                  
                  {/* Form fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 font-bold mb-1">Nombre Completo</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded font-semibold text-slate-800 focus:outline-slep-blue"
                        value={editFuncNombre}
                        onChange={(e) => setEditFuncNombre(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-bold mb-1">Correo Electrónico</label>
                      <input 
                        type="email" 
                        className="w-full p-2 border rounded font-semibold text-slate-800 focus:outline-slep-blue"
                        value={editFuncEmail}
                        onChange={(e) => setEditFuncEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-bold mb-1">Título Profesional / Grado</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Profesor de Educación General Básica"
                        className="w-full p-2 border rounded font-semibold text-slate-800 focus:outline-slep-blue"
                        value={editFuncTitulo}
                        onChange={(e) => setEditFuncTitulo(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-bold mb-1">Cargo / Función</label>
                      {editingFuncionario.estamento === 'Docente' ? (
                        <div className="space-y-2">
                          <select 
                            className="w-full p-2 border rounded bg-white font-semibold text-slate-800 focus:outline-slep-blue"
                            value={CARGOS_DOCENTES_LIST.includes(editFuncCargo as any) ? editFuncCargo : 'OTRO'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'OTRO') {
                                setEditFuncCargo('');
                              } else {
                                setEditFuncCargo(val);
                              }
                            }}
                          >
                            {CARGOS_DOCENTES_LIST.map(cargoOption => (
                              <option key={cargoOption} value={cargoOption}>{cargoOption}</option>
                            ))}
                          </select>
                          
                          {(!CARGOS_DOCENTES_LIST.includes(editFuncCargo as any) || editFuncCargo === 'OTRO') && (
                            <input 
                              type="text" 
                              placeholder="Especifique otro cargo docente..."
                              className="w-full p-2 border rounded font-semibold text-slate-800 focus:outline-slep-blue"
                              value={editFuncCargo}
                              onChange={(e) => setEditFuncCargo(e.target.value)}
                            />
                          )}
                        </div>
                      ) : (
                        <input 
                          type="text" 
                          className="w-full p-2 border rounded font-semibold text-slate-800 focus:outline-slep-blue"
                          value={editFuncCargo}
                          onChange={(e) => setEditFuncCargo(e.target.value)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Financing detail and edit sources */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-bold text-slate-800">Financiamiento por Subvenciones (Horas Contrato)</span>
                      <span className="bg-slep-blue text-white font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                        Total Contrato: {editContHoras} hrs
                      </span>
                    </div>
                    
                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                      {editContFins.map((f, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <select 
                            className="flex-1 p-2 bg-white border rounded font-bold text-slate-700"
                            value={f.origen}
                            onChange={(e) => {
                              const newFins = [...editContFins];
                              newFins[idx].origen = e.target.value as OrigenFondo;
                              setEditContFins(newFins);
                            }}
                          >
                            <option value="Subvención Regular">Subvención Regular</option>
                            <option value="SEP">SEP (Ley SEP)</option>
                            <option value="PIE">PIE (Integración)</option>
                            <option value="Reforzamiento">Reforzamiento</option>
                            <option value="Pro-retención">Pro-retención</option>
                            <option value="Otro">Otro</option>
                          </select>
                          <input 
                            type="number"
                            className="w-24 p-2 bg-white border rounded text-center font-bold text-slate-800"
                            value={f.horas}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const newFins = [...editContFins];
                              newFins[idx].horas = val;
                              setEditContFins(newFins);
                              const sum = newFins.reduce((s, fn) => s + fn.horas, 0);
                              setEditContHoras(sum);
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const newFins = editContFins.filter((_, i) => i !== idx);
                              setEditContFins(newFins);
                              const sum = newFins.reduce((s, fn) => s + fn.horas, 0);
                              setEditContHoras(sum);
                            }}
                            className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2 py-2 rounded-lg font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {editContFins.length === 0 && (
                        <p className="text-center py-2 text-slate-400 italic text-[11px]">No registra financiamientos asociados.</p>
                      )}
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        const newFins = [...editContFins, { origen: 'Subvención Regular' as OrigenFondo, horas: 10 }];
                        setEditContFins(newFins);
                        const sum = newFins.reduce((s, fn) => s + fn.horas, 0);
                        setEditContHoras(sum);
                      }}
                      className="bg-white hover:bg-slate-50 text-slep-blue font-bold px-3 py-1.5 rounded-lg border border-slate-200 flex items-center justify-center gap-1 w-full text-[10px] transition-colors cursor-pointer"
                    >
                      ➕ Agregar Nueva Fuente de Financiamiento
                    </button>
                  </div>

                  {/* Clases y Cursos Asignados (Horas Lectivas) */}
                  {editingFuncionario.estamento === 'Docente' && (
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                      <span className="font-bold text-slate-800 block">Clases y Cursos Asignados (Horas Lectivas)</span>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {teacherAsigs.map((asig) => (
                          <div key={asig.id} className="flex justify-between items-center bg-white border border-slate-100 px-3 py-2 rounded-lg text-xs shadow-sm">
                            <span className="font-bold text-slate-700">🏫 {asig.curso} • <span className="font-normal text-slate-500">{asig.asignatura}</span></span>
                            <span className="bg-slep-blue/10 text-slep-blue font-bold px-2 py-0.5 rounded text-[10px]">{asig.horas} hrs</span>
                          </div>
                        ))}
                        {teacherAsigs.length === 0 && (
                          <p className="text-center py-2 text-slate-400 italic text-[11px]">No tiene clases asignadas en el planificador de cursos.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Desglose de Horas en Contrato / Nómina (Ingesta) */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <span className="font-bold text-slate-800">Desglose de Horas Declarado en Nómina (Ingesta)</span>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Horas Directivas</label>
                        <input 
                          type="number"
                          placeholder="Sin valor"
                          className="w-full p-2 bg-white border rounded font-semibold text-slate-800 focus:outline-slep-blue text-center"
                          value={editContHorasDirectivas !== undefined ? editContHorasDirectivas : ''}
                          onChange={(e) => setEditContHorasDirectivas(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Horas Aula</label>
                        <input 
                          type="number"
                          placeholder="Sin valor"
                          className="w-full p-2 bg-white border rounded font-semibold text-slate-800 focus:outline-slep-blue text-center"
                          value={editContHorasAula !== undefined ? editContHorasAula : ''}
                          onChange={(e) => setEditContHorasAula(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Horas Téc. Pedagógicas</label>
                        <input 
                          type="number"
                          placeholder="Sin valor"
                          className="w-full p-2 bg-white border rounded font-semibold text-slate-800 focus:outline-slep-blue text-center"
                          value={editContHorasTecPed !== undefined ? editContHorasTecPed : ''}
                          onChange={(e) => setEditContHorasTecPed(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ley 20.903 indicators */}
                  {editingFuncionario.estamento === 'Docente' && leyCalculo && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">Proporcionalidad Horaria Aula / Ley 20.903</span>
                        {leyCalculo.leyEspecialAplicada ? (
                          <span className="bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider border border-amber-200">
                            Concentración {'>'} 80% (60/40 Ratio) 🌟
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-[9px]">
                            Estándar (65/35 Ratio)
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2.5 text-center">
                        <div className="bg-slate-50 border p-2 rounded-lg">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Lectivas Aula Max.</p>
                          <p className="text-sm font-black text-slate-800 mt-0.5">{leyCalculo.horasLectivasMaximas} hrs</p>
                        </div>
                        <div className="bg-slate-50 border p-2 rounded-lg">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">No Lectivas Min.</p>
                          <p className="text-sm font-black text-slate-800 mt-0.5">{leyCalculo.horasNoLectivasMinimas} hrs</p>
                        </div>
                        <div className="bg-slate-50 border p-2 rounded-lg">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Lectivas Aula Asig.</p>
                          <p className="text-sm font-black text-slate-800 mt-0.5">{leyCalculo.horasLectivasAsignadas} hrs</p>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg border text-[11px] font-semibold flex items-center justify-between ${
                        leyCalculo.cumpleLey20903 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
                      }`}>
                        <span>
                          {leyCalculo.cumpleLey20903 
                            ? '✓ Cumple con la reglamentación legal de docencia de aula.' 
                            : `⚠️ Exceso detectado: Se asignan ${leyCalculo.horasLectivasAsignadas} hrs de aula frente al máximo legal de ${leyCalculo.horasLectivasMaximas} hrs.`}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          leyCalculo.cumpleLey20903 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {leyCalculo.cumpleLey20903 ? 'CUMPLE' : 'EXCEDIDO'}
                        </span>
                      </div>
                    </div>
                  )}

                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-2 rounded-b-2xl">
                  <button 
                    onClick={() => printFuncionarioDetail(editingFuncionario, relatedCont, editContFins, leyCalculo, teacherAsigs)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    🖨️ Imprimir Ficha
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingFuncionario(null)}
                      className="bg-white hover:bg-slate-100 text-slate-600 font-bold px-4 py-2.5 rounded-xl border transition-all cursor-pointer"
                    >
                      Cerrar
                    </button>
                    <button 
                      onClick={handleSaveFuncionario}
                      className="bg-slep-blue hover:bg-slep-blue-hover text-white font-bold px-6 py-2.5 rounded-xl shadow transition-all cursor-pointer"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Modal: View / Edit / Print Curso */}
        {editingCurso && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Plan de Estudio y Carga de Docentes</p>
                  <h3 className="text-lg font-bold text-slate-800">Planificador del Curso: {editingCurso.nombre}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{editingCurso.nivel} ({editingCurso.regimen})</p>
                </div>
                <button 
                  onClick={() => setEditingCurso(null)}
                  className="text-slate-400 hover:text-slate-600 bg-slate-200/50 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer font-bold w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4 flex-1 text-xs">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Configurable PIE Hours */}
                  <div className="bg-slate-50 p-4 rounded-xl border flex justify-between items-center gap-4 text-xs">
                    <div>
                      <span className="font-bold text-slate-700 font-black">Horas de Apoyo / Co-docencia PIE:</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Carga horaria semanal de apoyo SEP/PIE para este curso.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editCursoPIE}
                        onChange={(e) => setEditCursoPIE(parseFloat(e.target.value) || 0)}
                        className="w-20 p-2 bg-white border rounded text-center font-bold text-slate-800 focus:outline-slep-blue"
                      />
                      <span className="font-semibold text-slate-600">hrs</span>
                    </div>
                  </div>

                  {/* Profesor Jefe Selection */}
                  <div className="bg-slate-50 p-4 rounded-xl border flex justify-between items-center gap-4 text-xs">
                    <div>
                      <span className="font-bold text-slate-700 font-black">Profesor Jefe del Curso:</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Seleccione el docente responsable de la jefatura.</p>
                    </div>
                    <div className="flex-1 max-w-[150px]">
                      <select
                        value={editingCurso.profesor_jefe_run || ''}
                        onChange={async (e) => {
                          const run = e.target.value;
                          const updatedCurso = {
                            ...editingCurso,
                            profesor_jefe_run: run || undefined
                          };
                          setEditingCurso(updatedCurso);
                          await api.crearCursoDinamico(updatedCurso);
                          await loadAllSchoolData();
                        }}
                        className="w-full p-2 bg-white border rounded font-semibold text-slate-700 focus:outline-slep-blue cursor-pointer"
                      >
                        <option value="">-- Sin Asignar --</option>
                        {contratos.filter(c => {
                          const f = funcionarios.find(func => func.run === c.funcionario_run);
                          return f?.estamento === 'Docente' || c.legislacion_laboral === 'Estatuto docente';
                        }).map(c => {
                          const f = funcionarios.find(func => func.run === c.funcionario_run);
                          return (
                            <option key={c.id} value={c.funcionario_run}>
                              {f ? f.nombre : c.funcionario_run}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Table of Subjects */}
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-100">
                      <tr>
                        <th className="p-3 pl-4">Asignatura</th>
                        <th className="p-3 w-32 text-center">Horas Plan Mineduc</th>
                        <th className="p-3">Docente que la Imparte</th>
                        <th className="p-3 w-32 text-center">Horas Aula Asignadas</th>
                        <th className="p-3 w-16 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editCursoAsignaturas.map((asig, index) => {
                        const asigAssignIndex = editCursoAsignaciones.findIndex(a => a.asignatura === asig.nombre);
                        const currentAssign = asigAssignIndex >= 0 ? editCursoAsignaciones[asigAssignIndex] : null;

                        return (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="p-3 pl-4 font-semibold text-slate-800">
                              <input 
                                type="text" 
                                className="bg-transparent hover:bg-slate-100 focus:bg-white p-1 border border-transparent hover:border-slate-200 rounded font-semibold w-full"
                                value={asig.nombre}
                                onChange={(e) => {
                                  const newAsigs = [...editCursoAsignaturas];
                                  const oldName = newAsigs[index].nombre;
                                  newAsigs[index].nombre = e.target.value;
                                  setEditCursoAsignaturas(newAsigs);

                                  if (currentAssign) {
                                    const newAsignaciones = [...editCursoAsignaciones];
                                    const aIdx = newAsignaciones.findIndex(a => a.asignatura === oldName);
                                    if (aIdx >= 0) {
                                      newAsignaciones[aIdx].asignatura = e.target.value;
                                      setEditCursoAsignaciones(newAsignaciones);
                                    }
                                  }
                                }}
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input 
                                type="number" 
                                className="w-16 p-1 border rounded text-center bg-slate-50/50 font-bold"
                                value={asig.horasSugeridas}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const newAsigs = [...editCursoAsignaturas];
                                  newAsigs[index].horasSugeridas = val;
                                  setEditCursoAsignaturas(newAsigs);
                                }}
                              />
                            </td>
                            <td className="p-3">
                              <select 
                                className="w-full p-1 border rounded bg-white font-semibold text-slate-700 focus:outline-slep-blue"
                                value={currentAssign ? currentAssign.contrato_id : ''}
                                onChange={(e) => {
                                  const cId = e.target.value;
                                  if (cId === '') {
                                    const newAsignaciones = editCursoAsignaciones.filter(a => a.asignatura !== asig.nombre);
                                    setEditCursoAsignaciones(newAsignaciones);
                                  } else {
                                    const newAsignaciones = [...editCursoAsignaciones];
                                    if (currentAssign) {
                                      const aIdx = newAsignaciones.findIndex(a => a.asignatura === asig.nombre);
                                      if (aIdx >= 0) {
                                        newAsignaciones[aIdx].contrato_id = cId;
                                      }
                                    } else {
                                      newAsignaciones.push({
                                        id: `asig-edit-${Date.now()}-${Math.random()}`,
                                        contrato_id: cId,
                                        curso: editingCurso.nombre,
                                        asignatura: asig.nombre,
                                        horas: asig.horasSugeridas
                                      });
                                    }
                                    setEditCursoAsignaciones(newAsignaciones);
                                  }
                                }}
                              >
                                <option value="">-- Sin Asignar / Vacante --</option>
                                {contratos.filter(c => {
                                  const f = funcionarios.find(func => func.run === c.funcionario_run);
                                  return f?.estamento === 'Docente' || c.legislacion_laboral === 'Estatuto docente';
                                }).map(c => {
                                  const f = funcionarios.find(func => func.run === c.funcionario_run);
                                  return (
                                    <option key={c.id} value={c.id}>
                                      {f ? f.nombre : c.funcionario_run} ({c.horas_totales} hrs - {c.funcion_principal})
                                    </option>
                                  );
                                })}
                              </select>
                            </td>
                            <td className="p-3 text-center">
                              <input 
                                type="number"
                                disabled={!currentAssign}
                                className="w-16 p-1 border rounded text-center font-bold bg-white disabled:bg-slate-50 disabled:text-slate-400"
                                value={currentAssign ? currentAssign.horas : ''}
                                placeholder={asig.horasSugeridas.toString()}
                                onChange={(e) => {
                                  if (!currentAssign) return;
                                  const val = parseFloat(e.target.value) || 0;
                                  const newAsignaciones = [...editCursoAsignaciones];
                                  const aIdx = newAsignaciones.findIndex(a => a.asignatura === asig.nombre);
                                  if (aIdx >= 0) {
                                    newAsignaciones[aIdx].horas = val;
                                    setEditCursoAsignaciones(newAsignaciones);
                                  }
                                }}
                              />
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => {
                                  const newAsigs = editCursoAsignaturas.filter((_, i) => i !== index);
                                  setEditCursoAsignaturas(newAsigs);
                                  const newAsignaciones = editCursoAsignaciones.filter(a => a.asignatura !== asig.nombre);
                                  setEditCursoAsignaciones(newAsignaciones);
                                }}
                                className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2 justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <button 
                    type="button"
                    onClick={() => {
                      const newAsig: AsignaturaDinamica = {
                        rbd: selectedRbd,
                        cursoNombre: editingCurso.nombre,
                        nombre: 'Nueva Asignatura / Taller',
                        horasSugeridas: 4
                      };
                      setEditCursoAsignaturas([...editCursoAsignaturas, newAsig]);
                    }}
                    className="bg-white hover:bg-slate-100 text-slep-blue font-bold px-4 py-2 border rounded-lg transition-all cursor-pointer"
                  >
                    ➕ Agregar Asignatura o Taller
                  </button>
                  
                  <div className="text-right">
                    <span className="text-slate-400 font-bold block uppercase text-[10px]">Total Horas Asignadas</span>
                    <span className="text-lg font-black text-slep-blue">
                      {editCursoAsignaciones.reduce((sum, a) => sum + a.horas, 0)} hrs
                    </span>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-2 rounded-b-2xl">
                <button 
                  onClick={() => printCursoDetail(editingCurso, editCursoAsignaturas, editCursoAsignaciones, funcionarios, contratos)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  🖨️ Imprimir Plan de Curso
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingCurso(null)}
                    className="bg-white hover:bg-slate-100 text-slate-600 font-bold px-4 py-2.5 rounded-xl border transition-all cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button 
                    onClick={handleSaveCursoAsignaturas}
                    className="bg-slep-blue hover:bg-slep-blue-hover text-white font-bold px-6 py-2.5 rounded-xl shadow transition-all cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
