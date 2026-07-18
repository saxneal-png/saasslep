'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, dbLocal, supabase } from '@/lib/supabase';
import { validarCargaDocente, calcularDesgloseContrato } from '@/lib/rulesEngine';
import { exportarTablaAExcel, exportarTablaAPdf } from '@/lib/exportUtils';
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
  CARGOS_DOCENTES_LIST,
  ReemplazoDetalle,
  CalidadJuridica
} from '@/lib/types';

import { normalizarRun, normalizarRbd } from '@/lib/csvParser';
import { calcularCargaDocente } from '@/lib/rulesEngine';

const formatDecHours = (hours: number): string => {
  if (hours <= 0) return "0 h 0 m";
  const mins = Math.round(hours * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} h ${m} m`;
};

const esDocenteOTecnicoDiferencial = (cargoStr: string, calidadJuridicaStr: string): boolean => {
  const cargo = String(cargoStr || '').toUpperCase().trim();
  const calidad = String(calidadJuridicaStr || '').toUpperCase().trim();

  const normalize = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const cargoNorm = normalize(cargo);
  const calidadNorm = normalize(calidad);

  const isSupportProfessional = [
    'PSICOLO',
    'FONOAUDIO',
    'KINESIO',
    'TERAPEUTA',
    'ASISTENTE SOCIAL',
    'TRABAJADOR SOCIAL',
    'TRABAJADORA SOCIAL'
  ].some(keyword => cargoNorm.includes(keyword) || calidadNorm.includes(keyword));

  if (isSupportProfessional) return false;

  return [
    'DIFERENCIAL',
    'PSICOPEDA',
    'COORDINADOR PIE',
    'COORDINADORA PIE',
    'TECNICO'
  ].some(keyword => cargoNorm.includes(keyword) || calidadNorm.includes(keyword)) || cargoNorm.includes('PIE');
};

const esProfesionalApoyoPIE = (cargoStr: string, calidadJuridicaStr: string): boolean => {
  const cargo = String(cargoStr || '').toUpperCase().trim();
  const calidad = String(calidadJuridicaStr || '').toUpperCase().trim();

  const normalize = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const cargoNorm = normalize(cargo);
  const calidadNorm = normalize(calidad);

  return [
    'PSICOLO',
    'FONOAUDIO',
    'KINESIO',
    'TERAPEUTA',
    'ASISTENTE SOCIAL',
    'TRABAJADOR SOCIAL',
    'TRABAJADORA SOCIAL'
  ].some(keyword => cargoNorm.includes(keyword) || calidadNorm.includes(keyword));
};

const esEspecialistaPIEOApoyo = (cargoStr: string, calidadJuridicaStr: string): boolean => {
  return esDocenteOTecnicoDiferencial(cargoStr, calidadJuridicaStr) || esProfesionalApoyoPIE(cargoStr, calidadJuridicaStr);
};

export default function EscuelaDashboard() {
  const router = useRouter();
  const [selectedRbd, setSelectedRbd] = useState<string>('10202');
  const [colegio, setColegio] = useState<Establecimiento | null>(null);
  const [sortCriteria, setSortCriteria] = useState<string>('nombre-az');

  // Active School State
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [todosLosContratos, setTodosLosContratos] = useState<Contrato[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAula[]>([]);
  const [financiamientosEscuela, setFinanciamientosEscuela] = useState<FinanciamientoContrato[]>([]);
  const [alertas, setAlertas] = useState<AlertaConciliacion[]>([]);
  const [cargosPersonalizados, setCargosPersonalizados] = useState<CargoPersonalizado[]>([]);
  const [planesEstudio, setPlanesEstudio] = useState<PlanEstudioNorm[]>([]);

  // Navigation tab state: 'docentes' | 'asistentes' | 'cursos' | 'compendio' | 'especial'
  const [activeTab, setActiveTab] = useState<'docentes' | 'asistentes' | 'cursos' | 'compendio' | 'dotacion' | 'conciliacion' | 'especial'>('docentes');
  const [subTabDotacion, setSubTabDotacion] = useState<'docentes' | 'asistentes'>('docentes');
  const [tareasReemplazo, setTareasReemplazo] = useState<TareaReemplazo[]>([]);
  const [taskReemplazoRun, setTaskReemplazoRun] = useState<{[key: string]: string}>({});

  // PIE Program & Calculator States
  const [pieNeetCount, setPieNeetCount] = useState<number>(5);
  const [pieNeepCount, setPieNeepCount] = useState<number>(2);
  const [pieIsJecOverride, setPieIsJecOverride] = useState<'default' | 'Sí' | 'No'>('default');
  const [coursePieStudents, setCoursePieStudents] = useState<{[courseName: string]: { neet: number, neep: number }}>({});


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
  const [newCursoConcentracion, setNewCursoConcentracion] = useState<number>(0);

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
  const [reemplazosList, setReemplazosList] = useState<ReemplazoDetalle[]>([]);
  const [validatingReemplazoId, setValidatingReemplazoId] = useState<string | null>(null);
  const [fechaIngresoReal, setFechaIngresoReal] = useState('');

  // View/Edit Modal States
  const [showDocenteActionsDropdown, setShowDocenteActionsDropdown] = useState(false);
  const [showAsistenteActionsDropdown, setShowAsistenteActionsDropdown] = useState(false);
  const [openAddFuncionarioModal, setOpenAddFuncionarioModal] = useState<EstamentoType | null>(null);
  const [openCreateCargoModal, setOpenCreateCargoModal] = useState(false);
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
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const [editFuncNombre, setEditFuncNombre] = useState('');
  const [editFuncCargo, setEditFuncCargo] = useState('');
  const [editFuncEmail, setEditFuncEmail] = useState('');
  const [editFuncTitulo, setEditFuncTitulo] = useState('');
  const [editFuncTramo, setEditFuncTramo] = useState<string>('Sin Tramo');
  const [editFuncFechaSistema, setEditFuncFechaSistema] = useState<string>('');
  const [editFuncFechaEstablecimiento, setEditFuncFechaEstablecimiento] = useState<string>('');
  const [editContHoras, setEditContHoras] = useState(44);
  const [editContFins, setEditContFins] = useState<{ origen: OrigenFondo; calidad: CalidadJuridica; horas: number }[]>([]);
  const [editContHorasDirectivas, setEditContHorasDirectivas] = useState<number | undefined>(undefined);
  const [editContHorasAula, setEditContHorasAula] = useState<number | undefined>(undefined);
  const [editContHorasTecPed, setEditContHorasTecPed] = useState<number | undefined>(undefined);
  const [editContEsUniprofesional, setEditContEsUniprofesional] = useState<boolean>(false);
  const [editContCronoHours, setEditContCronoHours] = useState<{ id: string; tipo: string; horas: number }[]>([]);
  const [editContInputMode, setEditContInputMode] = useState<'aula-primero' | 'contrato-primero'>('contrato-primero');
  const [newEditCronoType, setNewEditCronoType] = useState<string>('Trabajo Colaborativo');
  const [newEditCronoHours, setNewEditCronoHours] = useState<number>(2);
  const [selectedSubvQualityIndex, setSelectedSubvQualityIndex] = useState<number>(0);

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

  // Synchronize bilateral hours config reactively using the rules engine
  useEffect(() => {
    if (!editingFuncionario) return;
    
    const mockCont: Contrato = {
      id: 'mock-id',
      funcionario_run: editingFuncionario.run,
      rbd: selectedRbd,
      calidad_juridica: 'A contrata',
      funcion_principal: editFuncCargo || 'Docente',
      estado: 'Activo',
      horas_totales: editContInputMode === 'aula-primero' ? 0 : editContHoras,
      horas_aula: editContInputMode === 'aula-primero' ? (editContHorasAula || 0) : undefined,
      es_uniprofesional: editContEsUniprofesional,
      horas_directivas: editContHorasDirectivas || 0,
      horas_tecnico_pedagogicas: editContHorasTecPed || 0
    };

    const tempCrono = editContCronoHours.map((h, i) => ({ id: `temp-${i}`, contrato_id: 'mock-id', tipo: h.tipo, horas: h.horas }));
    const desglose = calcularDesgloseContrato(mockCont, cursosDinamicos, [], tempCrono, undefined, editFuncCargo);

    if (editContInputMode === 'aula-primero') {
      if (editContHoras !== desglose.horasTotales) {
        setEditContHoras(desglose.horasTotales);
      }
    } else {
      if (editContHorasAula !== desglose.horasAula) {
        setEditContHorasAula(desglose.horasAula);
      }
    }
  }, [
    editContInputMode,
    editContHorasAula,
    editContHoras,
    editContHorasDirectivas,
    editContHorasTecPed,
    editContEsUniprofesional,
    editContCronoHours,
    editFuncCargo,
    editingFuncionario
  ]);

  // Sync school details when selectedRbd changes and establish background polling
  useEffect(() => {
    if (!selectedRbd) return;
    loadAllSchoolData();
    setItineranciaAlerta(null);

    const interval = setInterval(async () => {
      const updated = await api.pullCloudSync();
      if (updated) {
        loadAllSchoolData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedRbd]);

  // Realtime Supabase Channels Subscription for Escuela (filtered by RBD)
  useEffect(() => {
    if (!selectedRbd) return;

    const channel = supabase
      .channel(`escuela-realtime-${selectedRbd}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contratos', filter: `rbd=eq.${selectedRbd}` },
        (payload: any) => {
          console.log('🔥 Cambios en contratos recibidos por canal realtime:', payload);
          loadAllSchoolData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'asignaciones_aula' },
        (payload: any) => {
          console.log('🔥 Cambios en asignaciones recibidos por canal realtime:', payload);
          loadAllSchoolData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alertas_conciliacion', filter: `rbd=eq.${selectedRbd}` },
        (payload: any) => {
          console.log('🔥 Cambios en alertas recibidos por canal realtime:', payload);
          loadAllSchoolData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRbd]);

  async function loadAllSchoolData() {
    await api.pullCloudSync();
    const [
      est,
      conts,
      funcs,
      asigs,
      alts,
      dynCursos,
      customCargs,
      plans,
      tasks,
      reemps,
      allConts
    ] = await Promise.all([
      api.getEstablecimientoByRbd(selectedRbd),
      api.getContratos(selectedRbd),
      api.getFuncionarios(),
      api.getAsignacionesPorEstablecimiento(selectedRbd),
      api.getAlertas(selectedRbd),
      api.getCursosDinamicos(selectedRbd),
      api.getCargosPorEstablecimiento(selectedRbd),
      api.getPlanesEstudio(),
      api.getTareasReemplazo(),
      api.getReemplazosLicencias(),
      api.getContratos()
    ]);

    setColegio(est || null);
    setContratos(conts);
    setTodosLosContratos(allConts);
    setFuncionarios(funcs);
    setAsignaciones(asigs);
    setAlertas(alts);
    setCursosDinamicos(dynCursos);
    setCargosPersonalizados(customCargs);
    setPlanesEstudio(plans);
    setTareasReemplazo(tasks);
    setReemplazosList(reemps);

    // Load financiamientos for this school's contracts into React state for reactivity
    const contratoIds = conts.map(c => c.id);
    const fins = await api.getFinanciamientosPorContratos(contratoIds);
    setFinanciamientosEscuela(fins);

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
    const titularFunc = funcionarios.find(f => f.run === tarea.funcionario_titular_run);
    const titularNombre = titularFunc ? titularFunc.nombre : tarea.funcionario_titular_run;

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
        cargo: `Reemplazo de ${titularNombre}`
      });
    }

    // 2. Create the mirror replacement contract
    const newContId = `c-reemplazo-${tarea.id}-${cleanRun.replace(/[^a-zA-Z0-9]/g, '')}`;
    await api.upsertContratoCompleto({
      id: newContId,
      funcionario_run: cleanRun,
      rbd: selectedRbd,
      calidad_juridica: 'A contrata',
      funcion_principal: `Reemplazo Docente (${titularNombre})`,
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

  const handleConfirmIngresoReemplazo = async (reempId: string) => {
    if (!fechaIngresoReal) {
      alert('⚠️ Por favor especifique el día real de ingreso a trabajar.');
      return;
    }

    const reemps = await api.getReemplazosLicencias();
    const match = reemps.find(r => r.id === reempId);
    if (!match) return;

    // Update the replacement detail metadata with actual validation details
    const updatedReemp: ReemplazoDetalle = {
      ...match,
      validado_por_director: true,
      fecha_ingreso_real: fechaIngresoReal
    };

    // Save modified replacement record to Supabase
    await api.saveReemplazoLicencia(updatedReemp);

    // Make sure replacement contract status is activated or configured as Reemplazo in Supabase
    // Find the replacement's active or pending contract for this RBD
    const allConts = await api.getContratos(selectedRbd);
    const cleanRun = match.reemplazo_run;
    const target = allConts.find(c => c.funcionario_run === cleanRun && normalizarRbd(String(c.rbd)) === normalizarRbd(String(selectedRbd)) && (c.estado === 'Reemplazo' || c.estado === 'Pendiente_Aprobacion'));
    if (target) {
      target.estado = 'Reemplazo';
      target.fecha_inicio_licencia = fechaIngresoReal; // Record the day they started working
      await api.upsertContratoCompleto(target, []);
    } else {
      // If no contract found, create one on the fly
      const newContId = `c-reemp-validated-${Date.now()}-${cleanRun.replace(/[^a-zA-Z0-9]/g, '')}`;
      const newCont: Contrato = {
        id: newContId,
        funcionario_run: cleanRun,
        rbd: selectedRbd,
        calidad_juridica: 'Reemplazo',
        funcion_principal: 'Docente de Aula',
        estado: 'Reemplazo',
        horas_totales: match.horas,
        fecha_inicio_licencia: fechaIngresoReal
      };
      await api.upsertContratoCompleto(newCont, []);
    }

    // Mark matching pending tasks as resolved in database
    const allTasks = await api.getTareasReemplazo();
    const matchingTask = allTasks.find(t => 
      normalizarRbd(String(t.rbd)) === normalizarRbd(String(selectedRbd)) && 
      t.estado === 'Pendiente' && 
      (match.contrato_titular_id.includes(t.funcionario_titular_run) || t.funcionario_titular_run === match.contrato_titular_id || 
       allConts.find(c => c.id === match.contrato_titular_id)?.funcionario_run === t.funcionario_titular_run)
    );

    if (matchingTask) {
      await api.resolverTareaReemplazo(matchingTask.id, cleanRun);
    }

    // Refresh UI
    setValidatingReemplazoId(null);
    setFechaIngresoReal('');
    await loadAllSchoolData();
    alert('✅ El ingreso del reemplazante ha sido verificado y su calidad contractual ha sido activada en la nómina.');
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
        normalizarRbd(String(c.rbd)) !== normalizarRbd(String(selectedRbd))
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
      const schoolConts = contratos.filter(c => c.funcionario_run === run && normalizarRbd(String(c.rbd)) === normalizarRbd(String(selectedRbd)));
      for (const cont of schoolConts) {
        await api.deleteContrato(cont.id);
      }
      await loadAllSchoolData();
    }
  };

  // Bulk deletion logic
  const handleBulkDeleteDocentes = async () => {
    if (selectedDocentes.length === 0) return;
    if (confirm(`¿Desea desvincular a los ${selectedDocentes.length} docentes seleccionados?`)) {
      for (const run of selectedDocentes) {
        const schoolConts = contratos.filter(c => c.funcionario_run === run && normalizarRbd(String(c.rbd)) === normalizarRbd(String(selectedRbd)));
        for (const cont of schoolConts) {
          await api.deleteContrato(cont.id);
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
        const schoolConts = contratos.filter(c => c.funcionario_run === run && normalizarRbd(String(c.rbd)) === normalizarRbd(String(selectedRbd)));
        for (const cont of schoolConts) {
          await api.deleteContrato(cont.id);
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

    const esDe1a4Basico = selectedCursoNorm.includes('1°') || selectedCursoNorm.includes('2°') || selectedCursoNorm.includes('3°') || selectedCursoNorm.includes('4°');
    const nuevoCurso: CursoDinamico = {
      rbd: selectedRbd,
      nombre: fullCursoNombre,
      nivel: plan.nivel,
      regimen: plan.regimen,
      // @ts-ignore
      concentracion_prioritarios: esDe1a4Basico ? newCursoConcentracion : 0
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
    setEditFuncTramo(f.tramo || 'Sin Tramo');
    setEditFuncFechaSistema(f.fecha_ingreso_sistema || '');
    setEditFuncFechaEstablecimiento(f.fecha_ingreso_establecimiento || '');
    
    // Load ALL contracts for this funcionario in this RBD (not just the first)
    const relatedContsForFuncionario = contratos.filter(
      c => c.funcionario_run === f.run && normalizarRbd(String(c.rbd)) === normalizarRbd(String(selectedRbd))
    );
    const firstCont = relatedContsForFuncionario[0];
    if (firstCont) {
      // Use the first contract for the general fields
      setEditContHorasDirectivas(firstCont.horas_directivas);
      setEditContHorasAula(firstCont.horas_aula || 30);
      setEditContHorasTecPed(firstCont.horas_tecnico_pedagogicas);
      setEditContEsUniprofesional(!!firstCont.es_uniprofesional);
      setEditContInputMode('contrato-primero');

      // Fetch chronological hours
      api.getHorasCronologicasAdicionales(firstCont.id).then(cronoList => {
        setEditContCronoHours(cronoList.map(h => ({ id: h.id, tipo: h.tipo, horas: h.horas })));
      }).catch(() => {
        setEditContCronoHours([]);
      });

      // Load financiamientos from ALL contracts, tagging each with its calidad
      const allFinsNested = await Promise.all(
        relatedContsForFuncionario.map(c => 
          api.getFinanciamientosPorContrato(c.id).then(fins =>
            fins.map(fi => ({
              origen: fi.origen_fondo,
              calidad: c.calidad_juridica,
              horas: fi.horas
            }))
          )
        )
      );
      const allFins = allFinsNested.flat();
      setEditContFins(allFins);
      const totalHrs = allFins.reduce((s, fn) => s + fn.horas, 0);
      setEditContHoras(totalHrs);
    } else {
      setEditContHoras(0);
      setEditContHorasDirectivas(undefined);
      setEditContHorasAula(undefined);
      setEditContHorasTecPed(undefined);
      setEditContEsUniprofesional(false);
      setEditContCronoHours([]);
      setEditContFins([]);
    }
  };

  const handleSaveFuncionario = async () => {
    if (!editingFuncionario) return;

    const cleanRun = normalizarRun(editingFuncionario.run);

    // Calculate hours breakdown based on bilateral mode using centralized rules engine
    const mockContrato: Contrato = {
      id: 'mock-id',
      funcionario_run: cleanRun,
      rbd: selectedRbd,
      calidad_juridica: 'A contrata',
      funcion_principal: editFuncCargo || 'Docente',
      estado: 'Activo',
      horas_totales: editContInputMode === 'aula-primero' ? 0 : editContHoras,
      horas_aula: editContInputMode === 'aula-primero' ? (editContHorasAula || 0) : undefined,
      es_uniprofesional: editContEsUniprofesional,
      horas_directivas: editContHorasDirectivas || 0,
      horas_tecnico_pedagogicas: editContHorasTecPed || 0
    };
    
    const tempCrono = editContCronoHours.map((h, i) => ({ id: `temp-${i}`, contrato_id: 'mock-id', tipo: h.tipo, horas: h.horas }));
    const desglose = calcularDesgloseContrato(mockContrato, cursosDinamicos, [], tempCrono, undefined, editFuncCargo);

    let calculatedAula = desglose.horasAula;
    let calculatedColab = desglose.horasColaborativas;
    let calculatedTotal = desglose.horasTotales;

    // Proactively align editContFins sum with calculatedTotal
    const sumFins = editContFins.reduce((s, l) => s + l.horas, 0);
    if (sumFins !== calculatedTotal) {
      if (editContFins.length > 0) {
        editContFins[0].horas = parseFloat((calculatedTotal - editContFins.slice(1).reduce((s, l) => s + l.horas, 0)).toFixed(2));
        if (editContFins[0].horas < 0) {
          editContFins[0].horas = calculatedTotal;
          editContFins.splice(1);
        }
      } else {
        editContFins.push({ origen: 'Subvención Regular' as OrigenFondo, calidad: 'A contrata' as CalidadJuridica, horas: calculatedTotal });
      }
      setEditContHoras(calculatedTotal);
    }

    // --- VALIDATION: 44-hour SLEP-wide maximum ---
    const horasEnOtrosColegios = todosLosContratos
      .filter(c => normalizarRun(c.funcionario_run) === cleanRun && normalizarRbd(String(c.rbd)) !== normalizarRbd(String(selectedRbd)))
      .reduce((s, c) => s + c.horas_totales, 0);
    const totalHorasSLEP = parseFloat((calculatedTotal + horasEnOtrosColegios).toFixed(2));

    if (totalHorasSLEP > 44) {
      const msg = horasEnOtrosColegios > 0
        ? `⚠️ Límite SLEP superado\n\nEste funcionario tiene ${horasEnOtrosColegios} hrs en otros establecimientos del SLEP.\nAgregando ${calculatedTotal} hrs en este colegio = ${totalHorasSLEP} hrs totales.\n\nEl máximo permitido es 44 hrs en todo el SLEP.\n\nRevisa las horas asignadas y vuelve a intentar.`
        : `⚠️ Límite de contrato superado\n\nLa suma de horas en este establecimiento es ${calculatedTotal} hrs, lo que supera el máximo legal de 44 hrs en el SLEP.\n\nRevisa las horas asignadas y vuelve a intentar.`;
      alert(msg);
      return;
    }

    if (totalHorasSLEP === 44 && horasEnOtrosColegios > 0) {
      const confirmar = confirm(`ℹ️ Este funcionario llega exactamente a 44 hrs en el SLEP (${horasEnOtrosColegios} hrs en otros colegios + ${calculatedTotal} hrs aquí).\n\n¿Deseas continuar guardando?`);
      if (!confirmar) return;
    }

    try {
      await api.upsertFuncionario({
        ...editingFuncionario,
        nombre: editFuncNombre,
        cargo: editFuncCargo,
        email: editFuncEmail,
        titulo: editFuncTitulo,
        tramo: editFuncTramo as any,
        fecha_ingreso_sistema: editFuncFechaSistema || undefined,
        fecha_ingreso_establecimiento: editFuncFechaEstablecimiento || undefined
      });

      const relatedConts = contratos.filter(
        c => normalizarRun(c.funcionario_run) === cleanRun && normalizarRbd(String(c.rbd)) === normalizarRbd(String(selectedRbd))
      );

      // Determine qualities of the editContFins
      const calidadesUnicas = Array.from(new Set(editContFins.map(sl => sl.calidad)));
      const oldCont = relatedConts[0];

      // Delete contracts whose quality is no longer present (avoids deleting active contracts that are being soft-updated)
      const toDelete = relatedConts.filter(c => !calidadesUnicas.includes(c.calidad_juridica));
      for (const oldC of toDelete) {
        await api.deleteContrato(oldC.id);
      }

      // Save/Update contracts
      for (let cIdx = 0; cIdx < calidadesUnicas.length; cIdx++) {
        const cal = calidadesUnicas[cIdx];
        const linesForCal = editContFins.filter(l => l.calidad === cal);
        const totalHorasCal = linesForCal.reduce((sum, l) => sum + l.horas, 0);

        const existingMatch = relatedConts.find(c => c.calidad_juridica === cal);
        const contractId = existingMatch?.id || `c-school-edit-${cleanRun.replace(/[^a-zA-Z0-9]/g, '')}-${selectedRbd}-${cal.toLowerCase().replace(/[^a-z]/g, '')}-${cIdx}`;

        const nuevoContrato: Contrato = {
          id: contractId,
          funcionario_run: cleanRun,
          rbd: selectedRbd,
          calidad_juridica: cal,
          funcion_principal: editFuncCargo || existingMatch?.funcion_principal || oldCont?.funcion_principal || 'Docente de Aula',
          estado: existingMatch?.estado || oldCont?.estado || 'Activo',
          horas_totales: totalHorasCal,
          horas_aula: calidadesUnicas.length === 1 ? calculatedAula : parseFloat((totalHorasCal * 0.65).toFixed(2)),
          horas_colaborativas: calidadesUnicas.length === 1 ? calculatedColab : parseFloat((totalHorasCal * 0.35).toFixed(2)),
          es_uniprofesional: editContEsUniprofesional,
          horas_directivas: editContHorasDirectivas || 0,
          horas_tecnico_pedagogicas: editContHorasTecPed || 0,
          fecha_inicio_licencia: existingMatch?.fecha_inicio_licencia || oldCont?.fecha_inicio_licencia,
          fecha_termino_licencia: existingMatch?.fecha_termino_licencia || oldCont?.fecha_termino_licencia
        };

        const newFins = linesForCal.map((l) => ({
          id: `${nuevoContrato.id}-${l.origen}`,
          contrato_id: nuevoContrato.id,
          origen_fondo: l.origen,
          horas: l.horas
        }));

        const contractCrono = editContCronoHours.map((ch, chIdx) => ({
          id: `crono-${nuevoContrato.id}-${chIdx}`,
          contrato_id: nuevoContrato.id,
          tipo: ch.tipo,
          horas: ch.horas
        }));

        await api.upsertContratoCompleto(nuevoContrato, newFins, contractCrono);
      }

      setEditingFuncionario(null);
      await loadAllSchoolData();
      alert('✅ Funcionario y contrato actualizados exitosamente.');
    } catch (err: any) {
      console.error('❌ Error al guardar funcionario:', err);
      alert(`❌ Error al guardar: ${err?.message || 'Error desconocido'}. Revisa la consola del navegador para más detalles.`);
    }
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
    
    // 2. Save assignments: replace all assignments for editingCurso.nombre with editCursoAsignaciones in Supabase
    await api.deleteAsignacionesPorCurso(selectedRbd, editingCurso.nombre);
    for (const a of editCursoAsignaciones) {
      await api.saveAsignacion(a);
    }

    // 3. Save updated course PIE hours in Supabase
    await api.crearCursoDinamico({ ...editingCurso, horasPIE: editCursoPIE });
    
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

  // Mock Export files (xlsx / pdf) with column selector
  const triggerExport = (tab: string, format: 'xlsx' | 'pdf') => {
    let cols: { key: string; label: string; checked: boolean }[] = [];
    if (tab === 'docentes' || tab === 'asistentes') {
      cols = [
        { key: 'run', label: 'RUT / RUN', checked: true },
        { key: 'nombre', label: 'Nombre Completo', checked: true },
        { key: 'cargo', label: 'Cargo / Función', checked: true },
        { key: 'horas', label: 'Horas Totales', checked: true },
        { key: 'estado', label: 'Estado del Contrato', checked: true }
      ];
    } else if (tab === 'cursos') {
      cols = [
        { key: 'nombre', label: 'Curso', checked: true },
        { key: 'nivel', label: 'Nivel', checked: true },
        { key: 'regimen', label: 'Régimen Horario', checked: true },
        { key: 'horas', label: 'Horas Plan Estudio', checked: true }
      ];
    } else if (tab === 'compendio') {
      cols = [
        { key: 'indicador', label: 'Indicador / Métrica', checked: true },
        { key: 'valor', label: 'Valor Reportado', checked: true }
      ];
    } else if (tab === 'dotacion') {
      cols = [
        { key: 'run', label: 'RUT / RUN', checked: true },
        { key: 'nombre', label: 'Nombre Completo', checked: true },
        { key: 'estamento', label: 'Estamento', checked: true },
        { key: 'cargo', label: 'Cargo / Función', checked: true },
        { key: 'horas', label: 'Horas Contratadas', checked: true }
      ];
    } else if (tab === 'dotacion_docentes' || tab === 'dotacion_asistentes') {
      const isDoc = tab === 'dotacion_docentes';
      cols = [
        { key: 'run', label: 'RUT / RUN', checked: true },
        { key: 'nombre', label: 'Funcionario', checked: true },
        { key: 'cargo', label: 'Cargo / Función', checked: true },
        { key: 'titulo', label: 'Título Profesional', checked: true },
        { key: 'calidad', label: 'Calidad Jurídica', checked: true },
        { key: 'horas', label: 'Horas Contrato', checked: true },
        { key: 'aula', label: 'Aula', checked: true },
        { key: 'pie_titular', label: isDoc ? 'PIE Titular' : 'PIE Indefinido', checked: true },
        { key: 'pie_contrata', label: isDoc ? 'PIE Contrata' : 'PIE Plazo Fijo', checked: true },
        { key: 'sep_titular', label: isDoc ? 'SEP Titular' : 'SEP Indefinido', checked: true },
        { key: 'sep_contrata', label: isDoc ? 'SEP Contrata' : 'SEP Plazo Fijo', checked: true },
        { key: 'directivas', label: 'Directivas', checked: true },
        { key: 'tecnicas', label: 'Técnicas', checked: true },
        { key: 'otras_func', label: 'Otras Func.', checked: true },
        { key: 'vacantes', label: 'Vacantes', checked: true },
        { key: 'clases', label: 'Cursos / Clases Asignadas', checked: true }
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
    const checkedCols = exportModal.columns.filter(c => c.checked);
    const labels = checkedCols.map(c => c.label);
    const keys = checkedCols.map(c => c.key);

    let dataToExport: any[] = [];

    if (exportModal.tab === 'docentes') {
      dataToExport = schoolDocentes.map(f => {
        const c = contratos.find(x => normalizarRun(x.funcionario_run) === normalizarRun(f.run));
        return {
          run: f.run,
          nombre: f.nombre,
          cargo: f.cargo || 'No registrado',
          horas: c ? c.horas_totales : 0,
          estado: c ? c.estado : 'Inactivo'
        };
      });
    } else if (exportModal.tab === 'asistentes') {
      dataToExport = schoolAsistentes.map(f => {
        const c = contratos.find(x => normalizarRun(x.funcionario_run) === normalizarRun(f.run));
        return {
          run: f.run,
          nombre: f.nombre,
          cargo: f.cargo || 'No registrado',
          horas: c ? c.horas_totales : 0,
          estado: c ? c.estado : 'Inactivo'
        };
      });
    } else if (exportModal.tab === 'cursos') {
      dataToExport = cursosDinamicos.map(c => {
        const plan = planesEstudio.find(p => p.nivel === c.nivel && p.regimen === c.regimen);
        return {
          nombre: c.nombre,
          nivel: c.nivel,
          regimen: c.regimen,
          horas: plan ? plan.horasObligatorias : 0
        };
      });
    } else if (exportModal.tab === 'dotacion') {
      dataToExport = funcionarios.map(f => {
        const c = contratos.find(x => normalizarRun(x.funcionario_run) === normalizarRun(f.run));
        return {
          run: f.run,
          nombre: f.nombre,
          estamento: f.estamento || 'No registrado',
          cargo: f.cargo || 'No registrado',
          horas: c ? c.horas_totales : 0
        };
      });
    } else if (exportModal.tab === 'dotacion_docentes' || exportModal.tab === 'dotacion_asistentes') {
      const isDoc = exportModal.tab === 'dotacion_docentes';
      const targetEstamento = isDoc ? 'Docente' : 'Asistente de la Educación';

      const filteredConts = contratos.filter(c => {
        if (normalizarRbd(String(c.rbd)) !== normalizarRbd(String(selectedRbd))) return false;
        const f = funcionarios.find(func => func.run === c.funcionario_run);
        return f?.estamento === targetEstamento;
      });

      dataToExport = filteredConts.map(c => {
        const f = funcionarios.find(func => func.run === c.funcionario_run);
        const name = f ? f.nombre : 'No registrado';
        const rut = f ? f.run : c.funcionario_run;
        const cargo = f ? (f.cargo || 'No registrado') : 'No registrado';
        const titulo = f ? (f.titulo || 'No registrado') : 'No registrado';

        const cAsigs = asignaciones.filter(a => a.contrato_id === c.id);
        const pedagogicas = cAsigs.reduce((sum, a) => sum + a.horas, 0);

        const pieHrs = dbLocal.financiamientoContratos
          .filter(fc => fc.contrato_id === c.id && fc.origen_fondo === 'PIE')
          .reduce((sum, fc) => sum + fc.horas, 0);
        const sepHrs = dbLocal.financiamientoContratos
          .filter(fc => fc.contrato_id === c.id && fc.origen_fondo === 'SEP')
          .reduce((sum, fc) => sum + fc.horas, 0);

        const isTitularOrIndefinido = c.calidad_juridica === 'Titular' || c.calidad_juridica === 'Indefinido';
        const pieTit = isTitularOrIndefinido ? pieHrs : 0;
        const pieCon = !isTitularOrIndefinido ? pieHrs : 0;
        const sepTit = isTitularOrIndefinido ? sepHrs : 0;
        const sepCon = !isTitularOrIndefinido ? sepHrs : 0;

        const dirHrs = c.horas_directivas || 0;
        const tecHrs = c.horas_tecnico_pedagogicas || 0;
        const otrasFuncionesHrs = cargosPersonalizados
          .filter(cp => cp.funcionario_run === c.funcionario_run)
          .reduce((sum, cp) => sum + cp.horas, 0);

        const vacantesHrs = Math.max(0, c.horas_totales - pedagogicas - dirHrs - tecHrs - otrasFuncionesHrs);
        const coursesString = cAsigs.map(a => `${a.curso} (${a.asignatura})`).join(', ');

        return {
          run: rut,
          nombre: name,
          cargo: cargo,
          titulo: titulo,
          calidad: c.calidad_juridica || 'No registrada',
          horas: c.horas_totales,
          aula: pedagogicas,
          pie_titular: pieTit,
          pie_contrata: pieCon,
          sep_titular: sepTit,
          sep_contrata: sepCon,
          directivas: dirHrs,
          tecnicas: tecHrs,
          otras_func: otrasFuncionesHrs,
          vacantes: vacantesHrs,
          clases: coursesString || 'Ninguno'
        };
      });
    }

    if (exportModal.format === 'xlsx') {
      exportarTablaAExcel(dataToExport, `reporte_${exportModal.tab}`, labels, keys);
    } else {
      exportarTablaAPdf(dataToExport, labels, keys, `Reporte ${exportModal.tab.toUpperCase()} - ${colegio?.nombre || 'Establecimiento'}`);
    }

    setExportModal({ ...exportModal, isOpen: false });
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

  const schoolDocentesRaw = funcionarios.filter(f => f.estamento === 'Docente' && contratos.some(c => c.funcionario_run === f.run));
  const schoolAsistentesRaw = funcionarios.filter(f => f.estamento === 'Asistente de la Educación' && contratos.some(c => c.funcionario_run === f.run));

  const sortFuncs = (list: Funcionario[]) => {
    return [...list].sort((a, b) => {
      if (sortCriteria === 'nombre-az') {
        return a.nombre.localeCompare(b.nombre);
      }
      if (sortCriteria === 'nombre-za') {
        return b.nombre.localeCompare(a.nombre);
      }
      if (sortCriteria === 'horas-max' || sortCriteria === 'horas-min') {
        const runA = normalizarRun(a.run);
        const runB = normalizarRun(b.run);
        const horasA = contratos
          .filter(c => normalizarRun(c.funcionario_run) === runA)
          .reduce((sum, c) => sum + (Number(c.horas_totales) || 0), 0);
        const horasB = contratos
          .filter(c => normalizarRun(c.funcionario_run) === runB)
          .reduce((sum, c) => sum + (Number(c.horas_totales) || 0), 0);
        return sortCriteria === 'horas-max' ? horasB - horasA : horasA - horasB;
      }
      return 0;
    });
  };

  const schoolDocentes = sortFuncs(schoolDocentesRaw);
  const schoolAsistentes = sortFuncs(schoolAsistentesRaw);

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
  // Reads from financiamientosEscuela React state (not dbLocal) for proper reactivity
  const getFinsSum = (estamento: EstamentoType, origen: OrigenFondo) => {
    return contratos.filter(c => getEstamento(c) === estamento).reduce((sum, c) => {
      const fins = financiamientosEscuela.filter(f => f.contrato_id === c.id);
      return sum + fins.filter(f => f.origen_fondo === origen).reduce((s, f) => s + f.horas, 0);
    }, 0);
  };

  const getFinsOtrasSum = (estamento: EstamentoType) => {
    return contratos.filter(c => getEstamento(c) === estamento).reduce((sum, c) => {
      const fins = financiamientosEscuela.filter(f => f.contrato_id === c.id);
      return sum + fins.filter(f => 
        f.origen_fondo !== 'Subvención Regular' && 
        f.origen_fondo !== 'SEP' && 
        f.origen_fondo !== 'PIE' && 
        f.origen_fondo !== 'Pro-retención' && 
        f.origen_fondo !== 'Liceos Bicentenarios'
      ).reduce((s, f) => s + f.horas, 0);
    }, 0);
  };

  // Segmented funding helpers to split by Titular vs Contrata and Indefinido vs Plazo Fijo
  const getFinsSumByQuality = (
    estamento: EstamentoType,
    origen: OrigenFondo,
    isTitularOrIndefinido: boolean
  ) => {
    return contratos.filter(c => {
      const isDoc = getEstamento(c) === 'Docente';
      const isMatchingEstamento = isDoc ? estamento === 'Docente' : estamento === 'Asistente de la Educación';
      if (!isMatchingEstamento) return false;
      
      if (isDoc) {
        return isTitularOrIndefinido ? c.calidad_juridica === 'Titular' : c.calidad_juridica !== 'Titular';
      } else {
        return isTitularOrIndefinido ? c.calidad_juridica === 'Indefinido' : c.calidad_juridica !== 'Indefinido';
      }
    }).reduce((sum, c) => {
      const fins = financiamientosEscuela.filter(f => f.contrato_id === c.id);
      return sum + fins.filter(f => f.origen_fondo === origen).reduce((s, f) => s + f.horas, 0);
    }, 0);
  };

  const getFinsOtrasSumByQuality = (
    estamento: EstamentoType,
    isTitularOrIndefinido: boolean
  ) => {
    return contratos.filter(c => {
      const isDoc = getEstamento(c) === 'Docente';
      const isMatchingEstamento = isDoc ? estamento === 'Docente' : estamento === 'Asistente de la Educación';
      if (!isMatchingEstamento) return false;
      
      if (isDoc) {
        return isTitularOrIndefinido ? c.calidad_juridica === 'Titular' : c.calidad_juridica !== 'Titular';
      } else {
        return isTitularOrIndefinido ? c.calidad_juridica === 'Indefinido' : c.calidad_juridica !== 'Indefinido';
      }
    }).reduce((sum, c) => {
      const fins = financiamientosEscuela.filter(f => f.contrato_id === c.id);
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
                {isSupervisorMode ? 'Acceso Asesor Delegado' : isSostenedorMode ? 'Sostenedor (Gestión de Escuela)' : 'Director / UTP de Escuela'}
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
                Volver a Asesor 🔙
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
              <p className="text-xl font-bold text-slep-blue">{funcionarios.filter(f => f.estamento === 'Docente' && contratos.some(c => c.funcionario_run === f.run)).length}</p>
            </div>
            <div className="border-l border-slate-200 pl-6">
              <p className="text-slate-400 font-bold uppercase">Asistentes activos</p>
              <p className="text-xl font-bold text-slep-blue">{funcionarios.filter(f => f.estamento === 'Asistente de la Educación' && contratos.some(c => c.funcionario_run === f.run)).length}</p>
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

          <button 
            onClick={() => setActiveTab('especial')}
            className={`flex-1 py-3 text-center rounded-lg font-bold text-xs transition-all ${
              activeTab === 'especial' 
                ? 'bg-slep-blue text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            🧩 Ed. Especial (PIE)
          </button>
        </div>

        {/* Tab contents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Area based on active tab */}
          <div className="lg:col-span-3 space-y-6">
            
            {activeTab === 'docentes' && (
              <div className="space-y-6 w-full">
                
                {/* Tareas de Reemplazo Pendientes Panel */}
                {(() => {
                  const pendingTasks = tareasReemplazo.filter(t => {
                    if (t.rbd !== selectedRbd || t.estado !== 'Pendiente') return false;
                    // Check if there is already a validated replacement for this license
                    const hasValidatedReemp = reemplazosList.some(r => 
                      normalizarRbd(String(r.rbd)) === normalizarRbd(String(selectedRbd)) && 
                      r.validado_por_director && 
                      (r.contrato_titular_id.includes(t.funcionario_titular_run) || 
                       r.contrato_titular_id === t.id ||
                       dbLocal.contratos.find(c => c.id === r.contrato_titular_id)?.funcionario_run === t.funcionario_titular_run)
                    );
                    return !hasValidatedReemp;
                  });
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
                                  {funcionarios.find(f => f.run === t.funcionario_titular_run)?.nombre || t.funcionario_titular_run}
                                </button>
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">RUN: {t.funcionario_titular_run} | Horas a Cubrir: <span className="font-bold text-slep-blue">{t.horas_a_cubrir} hrs</span></p>
                            </div>
                            {(() => {
                              // Check if there is a validated replacement already accepted for this license
                              const reempMatch = reemplazosList.find(r => 
                                normalizarRbd(String(r.rbd)) === normalizarRbd(String(selectedRbd)) && 
                                r.validado_por_director && 
                                (r.contrato_titular_id.includes(t.funcionario_titular_run) || 
                                 r.contrato_titular_id === t.id ||
                                 dbLocal.contratos.find(c => c.id === r.contrato_titular_id)?.funcionario_run === t.funcionario_titular_run)
                              );

                              if (reempMatch) {
                                return (
                                  <div className="bg-emerald-100 text-emerald-800 border border-emerald-300 rounded px-3 py-1.5 font-bold flex items-center gap-1.5">
                                    <span>✓ Cubierto:</span>
                                    <span>{funcionarios.find(f => f.run === reempMatch.reemplazo_run)?.nombre || reempMatch.reemplazo_run} (Ingreso Confirmado)</span>
                                  </div>
                                );
                              }

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

                {/* Confirmación de Ingreso de Reemplazos Asignados */}
                {(() => {
                  const unvalidatedReemps = reemplazosList.filter(r => normalizarRbd(String(r.rbd)) === normalizarRbd(String(selectedRbd)) && !r.validado_por_director);
                  if (unvalidatedReemps.length === 0) return null;
                  return (
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-5 animate-fadeIn">
                      <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide">
                        🤝 Validar Ingreso de Reemplazantes ({unvalidatedReemps.length})
                      </h4>
                      <p className="text-[11px] text-slate-650 mt-1">
                        Los siguientes reemplazantes han sido asignados por Gestión de Personas. Confirme que se han presentado a trabajar e ingrese su fecha de ingreso real para activarlos en la nómina oficial:
                      </p>
                      <div className="mt-3 space-y-3">
                        {unvalidatedReemps.map(r => {
                          const isChecking = validatingReemplazoId === r.id;
                          return (
                            <div key={r.id} className="bg-white border rounded-lg p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                              <div>
                                <p className="font-bold text-slate-800">
                                  Docente Reemplazante:{' '}
                                  <button
                                    onClick={() => {
                                      const reempFunc = funcionarios.find(f => f.run === r.reemplazo_run);
                                      if (reempFunc) setEditingFuncionario(reempFunc);
                                    }}
                                    className="underline hover:text-slep-blue text-left font-bold"
                                    title="Ver Ficha Oficial"
                                  >
                                    {funcionarios.find(f => f.run === r.reemplazo_run)?.nombre || r.reemplazo_run}
                                  </button>
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  RUN: {r.reemplazo_run} | Carga: <span className="font-bold text-slep-blue">{r.horas} hrs</span> | Periodo Teórico: {r.fecha_inicio} al {r.fecha_termino}
                                </p>
                              </div>
                              <div>
                                {isChecking ? (
                                  <div className="flex items-center gap-2">
                                    <div>
                                      <label className="block text-[9px] text-slate-400 font-bold uppercase">Fecha de Ingreso Real</label>
                                      <input
                                        type="date"
                                        className="p-1 border rounded text-xs bg-white text-slate-800"
                                        value={fechaIngresoReal}
                                        onChange={(e) => setFechaIngresoReal(e.target.value)}
                                      />
                                    </div>
                                    <div className="flex gap-1 pt-3">
                                      <button
                                        onClick={() => setValidatingReemplazoId(null)}
                                        className="px-2 py-1 bg-white border text-slate-650 rounded font-bold hover:bg-slate-50 text-[10px]"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={() => handleConfirmIngresoReemplazo(r.id)}
                                        className="px-2.5 py-1 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 text-[10px]"
                                      >
                                        Confirmar Ingreso ✓
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setValidatingReemplazoId(r.id);
                                      setFechaIngresoReal(r.fecha_inicio);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded shadow text-[11px]"
                                  >
                                    Confirmar Presentación e Ingreso ✍️
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
                  <div className="flex items-center gap-2 relative">
                    {selectedDocentes.length > 0 && (
                      <button 
                        onClick={handleBulkDeleteDocentes}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        🗑️ Desvincular Seleccionados ({selectedDocentes.length})
                      </button>
                    )}
                    <select
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-bold"
                      value={sortCriteria}
                      onChange={(e) => setSortCriteria(e.target.value)}
                    >
                      <option value="nombre-az">🔤 Ordenar: Nombre (A-Z)</option>
                      <option value="nombre-za">🔤 Ordenar: Nombre (Z-A)</option>
                      <option value="horas-max">⏳ Ordenar: Mayor Carga Horaria</option>
                      <option value="horas-min">⏳ Ordenar: Menor Carga Horaria</option>
                    </select>
                    <button
                      onClick={() => setShowDocenteActionsDropdown(!showDocenteActionsDropdown)}
                      className="bg-slep-blue hover:bg-slep-blue-hover text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      ➕ Agregar / Asignar ▾
                    </button>
                    <button
                      onClick={() => triggerExport('docentes', 'xlsx')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      📊 Excel
                    </button>
                    <button
                      onClick={() => triggerExport('docentes', 'pdf')}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      📄 PDF
                    </button>
                    {showDocenteActionsDropdown && (
                      <div className="absolute right-0 top-full mt-1 w-60 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 text-xs text-slate-700">
                        <button
                          onClick={() => {
                            setShowDocenteActionsDropdown(false);
                            setNewEstamento('Docente');
                            setNewCargo('DOCENTE DE AULA');
                            setOpenAddFuncionarioModal('Docente');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 font-semibold flex items-center gap-2 cursor-pointer"
                        >
                          <span>👤</span> Agregar Docente Individual
                        </button>
                        <button
                          onClick={() => {
                            setShowDocenteActionsDropdown(false);
                            setCustomCargoDocente('');
                            setCustomCargoNombre('');
                            setOpenCreateCargoModal(true);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 font-semibold flex items-center gap-2 cursor-pointer"
                        >
                          <span>🎖️</span> Crear Cargo Especial Asignado
                        </button>
                      </div>
                    )}
                  </div>
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
                                const teacherConts = contratos.filter(c => c.funcionario_run === f.run);
                                const calidades = Array.from(new Set(teacherConts.map(c => c.calidad_juridica).filter(Boolean)));
                                const esReemplazo = teacherConts.some(c => c.estado === 'Reemplazo' || c.calidad_juridica?.toLowerCase().includes('reemplazo') || c.vinculo_titular_id);
                                const esLicencia = teacherConts.some(c => c.estado === 'Licencia Médica');
                                if (calidades.length === 0 && !esReemplazo && !esLicencia) return null;
                                return (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {calidades.map(cal => (
                                      <span key={cal} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[8px] font-extrabold border border-slate-205 uppercase tracking-wide">
                                        {cal}
                                      </span>
                                    ))}
                                    {esReemplazo && (
                                      <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[8px] font-black border border-blue-200 uppercase tracking-wide">
                                        🔄 Reemplazo
                                      </span>
                                    )}
                                    {esLicencia && (
                                      <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black border border-amber-200 uppercase tracking-wide">
                                        💊 Licencia
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                              {(() => {
                                if (hasCont && hasCont.estado === 'Activo') {
                                  const teacherAsigs = asignaciones.filter(a => a.contrato_id === hasCont.id);
                                  const leyCalculo = colegio ? validarCargaDocente(hasCont, colegio, teacherAsigs, cargosPersonalizados, cursosDinamicos) : null;
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
                                    {hasCont.estado === 'Licencia Médica' && (() => {
                                      const isCoveredAndValidated = reemplazosList.some(r => 
                                        normalizarRbd(String(r.rbd)) === normalizarRbd(String(selectedRbd)) && 
                                        r.validado_por_director && 
                                        (r.contrato_titular_id.includes(f.run) || 
                                         r.contrato_titular_id === hasCont.id)
                                      );
                                      return (
                                        <>
                                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Licencia Médica 🩺</span>
                                          {isCoveredAndValidated ? (
                                            <span className="bg-green-600 text-white px-2.5 py-0.5 rounded text-[8px] font-black border border-green-700 uppercase tracking-wide">✓ Cubierto</span>
                                          ) : tareasReemplazo.some(t => t.funcionario_titular_run === f.run && t.estado === 'Pendiente') ? (
                                            <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded text-[8px] font-black border border-red-300 animate-pulse uppercase tracking-wide">⚠️ Sin Reemplazo</span>
                                          ) : (
                                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded text-[8px] font-black border border-emerald-300 uppercase tracking-wide">✓ Cubierto</span>
                                          )}
                                        </>
                                      );
                                    })()}
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
                                    {(() => {
                                      const matchedReemp = reemplazosList.find(r => 
                                        normalizarRbd(String(r.rbd)) === normalizarRbd(String(selectedRbd)) && 
                                        r.validado_por_director && 
                                        (r.contrato_titular_id.includes(f.run) || r.contrato_titular_id === hasCont.id)
                                      );
                                      const hasReempContract = contratos.find(c => c.vinculo_titular_id === hasCont.id);
                                      const hasReplacement = !!matchedReemp || !!hasReempContract;

                                      if (hasReplacement) {
                                        const rplFunc = hasReempContract ? funcionarios.find(func => func.run === hasReempContract.funcionario_run) : null;
                                        const rplName = rplFunc ? rplFunc.nombre : (matchedReemp ? (funcionarios.find(func => func.run === matchedReemp.reemplazo_run)?.nombre || matchedReemp.reemplazo_run) : hasReempContract?.funcionario_run || 'Asignado');
                                        const rplRun = hasReempContract ? hasReempContract.funcionario_run : (matchedReemp ? matchedReemp.reemplazo_run : '');
                                        return (
                                          <div className="text-slate-600 font-medium text-[10px] text-center">
                                            👤 Reemplazo: <strong>{rplName}</strong> ({rplRun})
                                          </div>
                                        );
                                      } else {
                                        return (
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
                                        );
                                      }
                                    })()}
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

              {/* Ley 20.903 compliance alerts */}
              <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
                <h3 className="text-sm font-bold text-slate-800">Semáforo de Ley 20.903</h3>
                <p className="text-xs text-slate-500 mt-1">Monitoreo automático de la proporción de horas lectivas de aula por contrato.</p>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {(() => {
                    const docentesAlertados = contratos
                      .filter(c => normalizarRbd(String(c.rbd)) === normalizarRbd(String(selectedRbd)) && funcionarios.find(func => func.run === c.funcionario_run)?.estamento === 'Docente')
                      .filter(c => {
                        const teacherAsigs = asignaciones.filter(a => a.contrato_id === c.id);
                        const metrics = colegio ? validarCargaDocente(c, colegio, teacherAsigs, cargosPersonalizados, cursosDinamicos) : null;
                        return metrics ? !metrics.cumpleLey20903 : false;
                      });

                    if (docentesAlertados.length === 0) {
                      return (
                        <div className="col-span-full bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 font-semibold text-center flex items-center justify-center gap-2">
                          <span>✅</span> Todos los docentes del establecimiento cumplen con la proporción de la Ley 20.903.
                        </div>
                      );
                    }

                    return docentesAlertados.map(c => {
                      const f = funcionarios.find(func => func.run === c.funcionario_run);
                      const teacherAsigs = asignaciones.filter(a => a.contrato_id === c.id);
                      const metrics = colegio ? validarCargaDocente(c, colegio, teacherAsigs, cargosPersonalizados, cursosDinamicos) : null;
                      if (!metrics) return null;
                      
                      return (
                        <div key={c.id} className="p-2.5 rounded border flex justify-between items-center bg-red-50 border-red-200 text-red-950">
                          <div>
                            <span className="font-bold">{f ? f.nombre : c.funcionario_run}</span>
                            <p className="text-[10px] text-slate-500 mt-0.5">Lectivas: <span className="font-bold text-red-650">{metrics.horasLectivasAsignadas} hrs</span> / Max legal: {metrics.horasLectivasMaximas} hrs ({c.horas_totales} hrs totales)</p>
                          </div>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-slep-coral/20 text-red-800 uppercase tracking-wider animate-pulse">
                            ⚠️ Excedido
                          </span>
                        </div>
                      );
                    });
                  })()}
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
                  <div className="flex items-center gap-2 relative">
                    {selectedAsistentes.length > 0 && (
                      <button 
                        onClick={handleBulkDeleteAsistentes}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        🗑️ Desvincular Seleccionados ({selectedAsistentes.length})
                      </button>
                    )}
                    <select
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-bold"
                      value={sortCriteria}
                      onChange={(e) => setSortCriteria(e.target.value)}
                    >
                      <option value="nombre-az">🔤 Ordenar: Nombre (A-Z)</option>
                      <option value="nombre-za">🔤 Ordenar: Nombre (Z-A)</option>
                      <option value="horas-max">⏳ Ordenar: Mayor Carga Horaria</option>
                      <option value="horas-min">⏳ Ordenar: Menor Carga Horaria</option>
                    </select>
                    <button
                      onClick={() => setShowAsistenteActionsDropdown(!showAsistenteActionsDropdown)}
                      className="bg-slep-blue hover:bg-slep-blue-hover text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      ➕ Agregar / Asignar ▾
                    </button>
                    <button
                      onClick={() => triggerExport('asistentes', 'xlsx')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      📊 Excel
                    </button>
                    <button
                      onClick={() => triggerExport('asistentes', 'pdf')}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      📄 PDF
                    </button>
                    {showAsistenteActionsDropdown && (
                      <div className="absolute right-0 top-full mt-1 w-60 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 text-xs text-slate-700">
                        <button
                          onClick={() => {
                            setShowAsistenteActionsDropdown(false);
                            setNewEstamento('Asistente de la Educación');
                            setNewCargo('Auxiliar de Servicios');
                            setOpenAddFuncionarioModal('Asistente de la Educación');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 font-semibold flex items-center gap-2 cursor-pointer"
                        >
                          <span>👤</span> Agregar Asistente Individual
                        </button>
                        <button
                          onClick={() => {
                            setShowAsistenteActionsDropdown(false);
                            setCustomCargoDocente('');
                            setCustomCargoNombre('');
                            setOpenCreateCargoModal(true);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 font-semibold flex items-center gap-2 cursor-pointer"
                        >
                          <span>🎖️</span> Crear Cargo Especial Asignado
                        </button>
                      </div>
                    )}
                  </div>
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
                                    {(() => {
                                      const matchedReemp = reemplazosList.find(r => 
                                        normalizarRbd(String(r.rbd)) === normalizarRbd(String(selectedRbd)) && 
                                        r.validado_por_director && 
                                        (r.contrato_titular_id.includes(f.run) || r.contrato_titular_id === hasCont.id)
                                      );
                                      const hasReempContract = contratos.find(c => c.vinculo_titular_id === hasCont.id);
                                      const hasReplacement = !!matchedReemp || !!hasReempContract;

                                      if (hasReplacement) {
                                        const rplFunc = hasReempContract ? funcionarios.find(func => func.run === hasReempContract.funcionario_run) : null;
                                        const rplName = rplFunc ? rplFunc.nombre : (matchedReemp ? (funcionarios.find(func => func.run === matchedReemp.reemplazo_run)?.nombre || matchedReemp.reemplazo_run) : hasReempContract?.funcionario_run || 'Asignado');
                                        const rplRun = hasReempContract ? hasReempContract.funcionario_run : (matchedReemp ? matchedReemp.reemplazo_run : '');
                                        return (
                                          <div className="text-slate-600 font-medium text-[10px] text-center">
                                            👤 Reemplazo: <strong>{rplName}</strong> ({rplRun})
                                          </div>
                                        );
                                      } else {
                                        return (
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
                                        );
                                      }
                                    })()}
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
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-800">Planificador de Carga Horaria y Cursos</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => triggerExport('cursos', 'xlsx')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        📊 Excel
                      </button>
                      <button
                        onClick={() => triggerExport('cursos', 'pdf')}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        📄 PDF
                      </button>
                    </div>
                  </div>
                  
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
                              {c.concentracion_prioritarios !== undefined && Number(c.concentracion_prioritarios) >= 80 && (
                                <span className="text-[8px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded uppercase mt-0.5" title={`Alta concentración de alumnos prioritarios (${c.concentracion_prioritarios}%). Ley 20.903: Carga lectiva máxima del 60%.`}>
                                  ✨ Ratio 60/40
                                </span>
                              )}
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

                    {(selectedCursoNorm.includes('1°') || selectedCursoNorm.includes('2°') || selectedCursoNorm.includes('3°') || selectedCursoNorm.includes('4°')) && (
                      <div>
                        <label className="block font-bold text-slate-500 mb-1">Concentración Alumnos Prioritarios (%)</label>
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          className="w-full p-2 bg-white border rounded font-bold"
                          value={newCursoConcentracion}
                          onChange={(e) => setNewCursoConcentracion(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                        />
                      </div>
                    )}

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

              </div>
            )}

            {activeTab === 'compendio' && (
              <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6 space-y-6">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Compendio e Información Completa del Establecimiento</h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Consolidado interactivo de matrícula, dotaciones docentes, horas de plan de estudio, y financiamiento SEP/PIE.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => triggerExport('compendio', 'xlsx')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      📊 Excel
                    </button>
                    <button
                      onClick={() => triggerExport('compendio', 'pdf')}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      📄 PDF
                    </button>
                  </div>
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
                    <thead className="bg-slate-50 font-bold border-b text-[11px]">
                      <tr>
                        <th className="p-3 pl-4 text-slate-800" rowSpan={2}>Indicador / Resumen</th>
                        <th className="p-2 text-center text-slate-700 border-b border-r border-slate-200" colSpan={2}>Profesores (Docentes)</th>
                        <th className="p-2 text-center text-slate-700 border-b border-r border-slate-200" colSpan={2}>Asistentes de la Educación</th>
                        <th className="p-3 text-center text-slate-800" rowSpan={2}>Total Contratado</th>
                      </tr>
                      <tr className="bg-slate-50/80 text-[10px] text-slate-500 font-semibold border-b">
                        <th className="p-2 text-center border-r border-slate-200">Titular</th>
                        <th className="p-2 text-center border-r border-slate-200 font-medium">A Contrata</th>
                        <th className="p-2 text-center border-r border-slate-200">Indefinido</th>
                        <th className="p-2 text-center border-r border-slate-200 font-medium">Plazo Fijo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Total Personas</td>
                        <td className="p-3 text-center font-bold text-slep-blue">
                          {funcionarios.filter(f => f.estamento === 'Docente' && contratos.some(c => c.funcionario_run === f.run && c.calidad_juridica === 'Titular')).length}
                        </td>
                        <td className="p-3 text-center font-medium text-slate-600">
                          {funcionarios.filter(f => f.estamento === 'Docente' && contratos.some(c => c.funcionario_run === f.run && c.calidad_juridica !== 'Titular')).length}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-600">
                          {funcionarios.filter(f => f.estamento === 'Asistente de la Educación' && contratos.some(c => c.funcionario_run === f.run && c.calidad_juridica === 'Indefinido')).length}
                        </td>
                        <td className="p-3 text-center font-medium text-slate-500">
                          {funcionarios.filter(f => f.estamento === 'Asistente de la Educación' && contratos.some(c => c.funcionario_run === f.run && c.calidad_juridica !== 'Indefinido')).length}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {contratos.length}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Total Horas Contrato</td>
                        <td className="p-3 text-center font-semibold text-slep-blue">
                          {contratos.filter(c => getEstamento(c) === 'Docente' && c.calidad_juridica === 'Titular').reduce((sum, c) => sum + c.horas_totales, 0)} hrs
                        </td>
                        <td className="p-3 text-center font-medium text-slate-600">
                          {contratos.filter(c => getEstamento(c) === 'Docente' && c.calidad_juridica !== 'Titular').reduce((sum, c) => sum + c.horas_totales, 0)} hrs
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-600">
                          {contratos.filter(c => getEstamento(c) === 'Asistente de la Educación' && c.calidad_juridica === 'Indefinido').reduce((sum, c) => sum + c.horas_totales, 0)} hrs
                        </td>
                        <td className="p-3 text-center font-medium text-slate-500">
                          {contratos.filter(c => getEstamento(c) === 'Asistente de la Educación' && c.calidad_juridica !== 'Indefinido').reduce((sum, c) => sum + c.horas_totales, 0)} hrs
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {contratos.reduce((sum, c) => sum + c.horas_totales, 0)} hrs
                        </td>
                      </tr>
                      {(() => {
                        const docConts = contratos.filter(c => getEstamento(c) === 'Docente');
                        const docTitConts = docConts.filter(c => c.calidad_juridica === 'Titular');
                        const docConConts = docConts.filter(c => c.calidad_juridica !== 'Titular');

                        const asisConts = contratos.filter(c => getEstamento(c) === 'Asistente de la Educación');
                        const asisIndConts = asisConts.filter(c => c.calidad_juridica === 'Indefinido');
                        const asisPfConts = asisConts.filter(c => c.calidad_juridica !== 'Indefinido');

                        const docTitTotalHrs = docTitConts.reduce((sum, c) => sum + c.horas_totales, 0);
                        const docConTotalHrs = docConConts.reduce((sum, c) => sum + c.horas_totales, 0);
                        const asisIndTotalHrs = asisIndConts.reduce((sum, c) => sum + c.horas_totales, 0);
                        const asisPfTotalHrs = asisPfConts.reduce((sum, c) => sum + c.horas_totales, 0);

                        const docTitPedagogicas = asignaciones.filter(a => docTitConts.some(c => c.id === a.contrato_id)).reduce((sum, a) => sum + a.horas, 0);
                        const docConPedagogicas = asignaciones.filter(a => docConConts.some(c => c.id === a.contrato_id)).reduce((sum, a) => sum + a.horas, 0);
                        const asisIndPedagogicas = 0;
                        const asisPfPedagogicas = 0;
                        const totalPedagogicas = docTitPedagogicas + docConPedagogicas;

                        const docTitNoPedagogicas = Math.max(0, docTitTotalHrs - docTitPedagogicas);
                        const docConNoPedagogicas = Math.max(0, docConTotalHrs - docConPedagogicas);
                        const asisIndNoPedagogicas = asisIndTotalHrs;
                        const asisPfNoPedagogicas = asisPfTotalHrs;
                        const totalNoPedagogicas = docTitNoPedagogicas + docConNoPedagogicas + asisIndNoPedagogicas + asisPfNoPedagogicas;

                        return (
                          <>
                            <tr className="bg-slate-50/40">
                              <td className="p-3 pl-4 font-semibold text-slate-900">Horas Pedagógicas (Aula)</td>
                              <td className="p-3 text-center text-slate-650 font-semibold">{docTitPedagogicas} hrs</td>
                              <td className="p-3 text-center text-slate-650 font-semibold">{docConPedagogicas} hrs</td>
                              <td className="p-3 text-center text-slate-650 font-semibold">{asisIndPedagogicas} hrs</td>
                              <td className="p-3 text-center text-slate-650 font-semibold">{asisPfPedagogicas} hrs</td>
                              <td className="p-3 text-center font-bold text-slep-blue">{totalPedagogicas} hrs</td>
                            </tr>
                            <tr className="bg-slate-50/40">
                              <td className="p-3 pl-4 font-semibold text-slate-900">Horas No Pedagógicas (Planif./Cargos)</td>
                              <td className="p-3 text-center text-slate-650 font-semibold">{docTitNoPedagogicas.toFixed(1)} hrs</td>
                              <td className="p-3 text-center text-slate-650 font-semibold">{docConNoPedagogicas.toFixed(1)} hrs</td>
                              <td className="p-3 text-center text-slate-650 font-semibold">{asisIndNoPedagogicas} hrs</td>
                              <td className="p-3 text-center text-slate-650 font-semibold">{asisPfNoPedagogicas} hrs</td>
                              <td className="p-3 text-center font-bold text-slate-800">{totalNoPedagogicas.toFixed(1)} hrs</td>
                            </tr>
                          </>
                        );
                      })()}
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Horas Subvención Regular</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Docente', 'Subvención Regular', true)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Docente', 'Subvención Regular', false)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Asistente de la Educación', 'Subvención Regular', true)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Asistente de la Educación', 'Subvención Regular', false)} hrs</td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {getFinsSum('Docente', 'Subvención Regular') + getFinsSum('Asistente de la Educación', 'Subvención Regular')} hrs
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Horas SEP</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Docente', 'SEP', true)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Docente', 'SEP', false)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Asistente de la Educación', 'SEP', true)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Asistente de la Educación', 'SEP', false)} hrs</td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {getFinsSum('Docente', 'SEP') + getFinsSum('Asistente de la Educación', 'SEP')} hrs
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Horas PIE</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Docente', 'PIE', true)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Docente', 'PIE', false)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Asistente de la Educación', 'PIE', true)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Asistente de la Educación', 'PIE', false)} hrs</td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {getFinsSum('Docente', 'PIE') + getFinsSum('Asistente de la Educación', 'PIE')} hrs
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Horas Proretención</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Docente', 'Pro-retención', true)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Docente', 'Pro-retención', false)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Asistente de la Educación', 'Pro-retención', true)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Asistente de la Educación', 'Pro-retención', false)} hrs</td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {getFinsSum('Docente', 'Pro-retención') + getFinsSum('Asistente de la Educación', 'Pro-retención')} hrs
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Horas Liceos Bicentenarios</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Docente', 'Liceos Bicentenarios', true)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Docente', 'Liceos Bicentenarios', false)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Asistente de la Educación', 'Liceos Bicentenarios', true)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsSumByQuality('Asistente de la Educación', 'Liceos Bicentenarios', false)} hrs</td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {getFinsSum('Docente', 'Liceos Bicentenarios') + getFinsSum('Asistente de la Educación', 'Liceos Bicentenarios')} hrs
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-4 font-semibold text-slate-900">Otras Horas/Fondos</td>
                        <td className="p-3 text-center font-medium">{getFinsOtrasSumByQuality('Docente', true)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsOtrasSumByQuality('Docente', false)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsOtrasSumByQuality('Asistente de la Educación', true)} hrs</td>
                        <td className="p-3 text-center font-medium">{getFinsOtrasSumByQuality('Asistente de la Educación', false)} hrs</td>
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
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Dotación Completa de Personal</h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Listado consolidado de docentes y asistentes con sus cargas horarias y cursos asignados.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => triggerExport(subTabDotacion === 'docentes' ? 'dotacion_docentes' : 'dotacion_asistentes', 'xlsx')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer transition-all"
                    >
                      📊 Excel ({subTabDotacion === 'docentes' ? 'Docentes' : 'Asistentes'})
                    </button>
                    <button
                      onClick={() => triggerExport(subTabDotacion === 'docentes' ? 'dotacion_docentes' : 'dotacion_asistentes', 'pdf')}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer transition-all"
                    >
                      📄 PDF ({subTabDotacion === 'docentes' ? 'Docentes' : 'Asistentes'})
                    </button>
                  </div>
                </div>

                {/* Sub-tabs selector */}
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => setSubTabDotacion('docentes')}
                    className={`py-2.5 px-5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                      subTabDotacion === 'docentes'
                        ? 'border-slep-blue text-slep-blue'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    🍎 Docentes (Profesores)
                  </button>
                  <button
                    onClick={() => setSubTabDotacion('asistentes')}
                    className={`py-2.5 px-5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                      subTabDotacion === 'asistentes'
                        ? 'border-slep-blue text-slep-blue'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    👥 Asistentes de la Educación
                  </button>
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
                      { label: '💼 Directivas', value: horasDirectivas },
                      { label: '⚙️ Téc. Pedagógicas', value: horasTecnicoPedagogicas },
                      { label: '📊 Coord. UTP', value: horasCoordinacionesUTP },
                      { label: '🔍 Apoyo UTP', value: horasApoyoUTP },
                      { label: '🧑‍🏫 Aula / Otras', value: horasDocenciaAulaOtras }
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center py-0.5">
                        <span className="font-semibold text-slate-600">{item.label}</span>
                        <span className="font-bold text-slate-800">{item.value} hrs</span>
                      </div>
                    ))}
                  </div>

                  {/* Column 3: Financiamientos */}
                  <div className="space-y-2 text-[11px]">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider border-b pb-1">Financiamiento General</h4>
                    {[
                      { label: 'Subv. Regular', value: getFinsSum('Docente', 'Subvención Regular') + getFinsSum('Asistente de la Educación', 'Subvención Regular') },
                      { label: 'Horas SEP', value: getFinsSum('Docente', 'SEP') + getFinsSum('Asistente de la Educación', 'SEP') },
                      { label: 'Horas PIE', value: getFinsSum('Docente', 'PIE') + getFinsSum('Asistente de la Educación', 'PIE') },
                      { label: 'Horas Proretención', value: getFinsSum('Docente', 'Pro-retención') + getFinsSum('Asistente de la Educación', 'Pro-retención') },
                      { label: 'Liceos Bic.', value: getFinsSum('Docente', 'Liceos Bicentenarios') + getFinsSum('Asistente de la Educación', 'Liceos Bicentenarios') }
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
                        <th className="p-3">Cargo / Función</th>
                        <th className="p-3">Título Profesional</th>
                        <th className="p-3 text-center">Calidad Jurídica</th>
                        <th className="p-3 text-center">Horas Contrato</th>
                        <th className="p-3 text-center">Aula</th>
                        <th className="p-3 text-center">{subTabDotacion === 'docentes' ? 'PIE Titular' : 'PIE Indefinido'}</th>
                        <th className="p-3 text-center">{subTabDotacion === 'docentes' ? 'PIE Contrata' : 'PIE Plazo Fijo'}</th>
                        <th className="p-3 text-center">{subTabDotacion === 'docentes' ? 'SEP Titular' : 'SEP Indefinido'}</th>
                        <th className="p-3 text-center">{subTabDotacion === 'docentes' ? 'SEP Contrata' : 'SEP Plazo Fijo'}</th>
                        <th className="p-3 text-center">Directivas</th>
                        <th className="p-3 text-center">Técnicas</th>
                        <th className="p-3 text-center">Otras Func.</th>
                        <th className="p-3 text-center text-amber-700">Vacantes</th>
                        <th className="p-3">Cursos / Clases Asignadas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const targetEst = subTabDotacion === 'docentes' ? 'Docente' : 'Asistente de la Educación';
                        const schoolConts = contratos.filter(c => {
                          if (normalizarRbd(String(c.rbd)) !== normalizarRbd(String(selectedRbd))) return false;
                          const f = funcionarios.find(func => func.run === c.funcionario_run);
                          return f?.estamento === targetEst;
                        });

                        const sortedConts = [...schoolConts].sort((a, b) => {
                          const fA = funcionarios.find(func => func.run === a.funcionario_run);
                          const fB = funcionarios.find(func => func.run === b.funcionario_run);
                          return (fA?.nombre || '').localeCompare(fB?.nombre || '');
                        });

                        if (sortedConts.length === 0) {
                          return (
                            <tr>
                              <td colSpan={15} className="p-8 text-center text-slate-400 italic">
                                No se registran contratos en el estamento de {subTabDotacion === 'docentes' ? 'Docentes' : 'Asistentes de la Educación'} para este colegio.
                              </td>
                            </tr>
                          );
                        }

                        return sortedConts.map(c => {
                          const f = funcionarios.find(func => func.run === c.funcionario_run);
                          if (!f) return null;
                          const cAsigs = asignaciones.filter(a => a.contrato_id === c.id);
                          const pedagogicas = cAsigs.reduce((sum, a) => sum + a.horas, 0);

                          const pieHrs = financiamientosEscuela
                            .filter(fc => fc.contrato_id === c.id && fc.origen_fondo === 'PIE')
                            .reduce((sum, fc) => sum + fc.horas, 0);
                          const sepHrs = financiamientosEscuela
                            .filter(fc => fc.contrato_id === c.id && fc.origen_fondo === 'SEP')
                            .reduce((sum, fc) => sum + fc.horas, 0);
                          const dirHrs = c.horas_directivas || 0;
                          const tecHrs = c.horas_tecnico_pedagogicas || 0;
                          const otrasFuncionesHrs = cargosPersonalizados
                            .filter(cp => cp.funcionario_run === c.funcionario_run)
                            .reduce((sum, cp) => sum + cp.horas, 0);

                          const vacantesHrs = Math.max(0, c.horas_totales - pedagogicas - dirHrs - tecHrs - otrasFuncionesHrs);
                          const coursesString = cAsigs.map(a => `${a.curso} (${a.asignatura})`).join(', ');
                          const isDirector = f.cargo?.toUpperCase() === 'DIRECTOR';

                          const isTitularOrIndefinido = c.calidad_juridica === 'Titular' || c.calidad_juridica === 'Indefinido';
                          const pieTit = isTitularOrIndefinido ? pieHrs : 0;
                          const pieCon = !isTitularOrIndefinido ? pieHrs : 0;
                          const sepTit = isTitularOrIndefinido ? sepHrs : 0;
                          const sepCon = !isTitularOrIndefinido ? sepHrs : 0;

                          return (
                            <tr key={c.id} className={`hover:bg-slate-50 ${isDirector ? 'bg-rose-50/20 font-bold' : ''}`}>
                              <td className="p-3 pl-4">
                                <button
                                  onClick={() => handleOpenEditFuncionario(f)}
                                  className={`text-slep-blue hover:underline text-left cursor-pointer ${isDirector ? 'font-black text-rose-700' : 'font-bold'}`}
                                >
                                  {f.nombre} {isDirector && <span className="ml-1 bg-rose-100 text-rose-800 text-[9px] px-1.5 py-0.5 rounded uppercase font-black">Director</span>}
                                </button>
                                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{f.run}</p>
                              </td>
                              <td className="p-3 text-slate-700 font-medium">{f.cargo || '--'}</td>
                              <td className="p-3 text-slate-500 font-medium">{f.titulo || 'No registrado'}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isTitularOrIndefinido
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-250/60'
                                    : 'bg-amber-100 text-amber-800 border border-amber-250/60'
                                }`}>
                                  {c.calidad_juridica || (subTabDotacion === 'docentes' ? 'A contrata' : 'Plazo fijo')}
                                </span>
                              </td>
                              <td className="p-3 text-center font-bold text-slate-800">{c.horas_totales} hrs</td>
                              <td className="p-3 text-center font-bold text-slep-blue">{pedagogicas} hrs</td>
                              <td className="p-3 text-center">
                                {pieTit > 0 ? <span className="text-blue-600 font-bold">{pieTit} hrs</span> : <span className="text-slate-400">0 hrs</span>}
                              </td>
                              <td className="p-3 text-center">
                                {pieCon > 0 ? <span className="text-blue-600 font-bold">{pieCon} hrs</span> : <span className="text-slate-400">0 hrs</span>}
                              </td>
                              <td className="p-3 text-center">
                                {sepTit > 0 ? <span className="text-emerald-600 font-bold">{sepTit} hrs</span> : <span className="text-slate-400">0 hrs</span>}
                              </td>
                              <td className="p-3 text-center">
                                {sepCon > 0 ? <span className="text-emerald-600 font-bold">{sepCon} hrs</span> : <span className="text-slate-400">0 hrs</span>}
                              </td>
                              <td className="p-3 text-center text-slate-500">{dirHrs} hrs</td>
                              <td className="p-3 text-center text-slate-500">{tecHrs} hrs</td>
                              <td className="p-3 text-center text-purple-650">{otrasFuncionesHrs} hrs</td>
                              <td className="p-3 text-center">
                                {vacantesHrs > 0.05 ? (
                                  <span className="bg-amber-100 text-amber-800 font-mono font-bold px-2 py-0.5 rounded border border-amber-250/60">
                                    {vacantesHrs.toFixed(1)} hrs
                                  </span>
                                ) : (
                                  <span className="text-slate-400">0 hrs</span>
                                )}
                              </td>
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

            {activeTab === 'especial' && (
              <div className="space-y-6">
                
                {/* Intro Card */}
                <div className="bg-gradient-to-r from-slep-blue to-blue-800 text-white rounded-2xl p-6 shadow border border-blue-900">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">🧩 Programa de Integración Escolar (PIE) - Decreto 170/2009</h2>
                      <p className="text-xs text-blue-100 mt-1 font-medium">
                        Herramienta de gestión y cálculo de horas de apoyo cronológicas y pedagógicas para NEET (Transitorias) y NEEP (Permanentes) según normativa del Ministerio de Educación de Chile.
                      </p>
                    </div>
                    <div className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/20 text-xs font-mono backdrop-blur-sm">
                      <p>Establecimiento: <span className="font-bold text-yellow-350">{colegio?.nombre}</span></p>
                      <p className="mt-0.5">RBD: <span className="font-bold text-yellow-350">{selectedRbd}</span></p>
                      <p className="mt-0.5">Régimen: <span className="font-bold text-yellow-350">{colegio?.regimen}</span></p>
                    </div>
                  </div>
                </div>

                {/* Grid for Calculator and PIE Team */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Calculator Panel */}
                  <div className="bg-white rounded-xl shadow border border-slate-200/60 overflow-hidden flex flex-col justify-between">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="text-sm font-bold text-slate-800">🧮 Calculadora de Requerimientos PIE (Por Curso)</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Calcula las horas cronológicas y pedagógicas necesarias según matrícula NEE.</p>
                    </div>
                    
                    <div className="p-6 space-y-4 flex-1">
                      
                      {/* NEET Count */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-bold text-slate-700">Estudiantes con NEET (Necesidad Educativa Transitoria)</label>
                          <span className="text-xs font-black text-slep-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{pieNeetCount} alumnos</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="15"
                          value={pieNeetCount}
                          onChange={(e) => setPieNeetCount(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slep-blue"
                        />
                        <p className="text-[10px] text-slate-400 mt-1 italic">Norma general: Máximo 5 por curso.</p>
                      </div>

                      {/* NEEP Count */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-bold text-slate-700">Estudiantes con NEEP (Necesidad Educativa Permanente)</label>
                          <span className="text-xs font-black text-emerald-705 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{pieNeepCount} alumnos</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          value={pieNeepCount}
                          onChange={(e) => setPieNeepCount(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                        <p className="text-[10px] text-slate-400 mt-1 italic">Norma general: Máximo 2 por curso.</p>
                      </div>

                    </div>

                    {/* Calculation Output */}
                    {(() => {
                      const isJec = colegio?.regimen === 'JEC';
                      const baseHours = (pieNeetCount > 0 || pieNeepCount > 0) ? (isJec ? 10 : 7) : 0;
                      const incrementHours = pieNeepCount * 3;
                      const totalPieHours = baseHours + incrementHours;
                      const teacherMinPedag = totalPieHours > 0 ? (isJec ? 8 : 6) : 0;
                      const assistantProportional = totalPieHours > 0 ? parseFloat(((isJec ? 5.3 : 3.3) * (pieNeetCount / 5)).toFixed(1)) : 0;

                      return (
                        <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-xl space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-center">
                              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Horas Cronológicas Totales</p>
                              <p className="text-2xl font-black text-slate-800 mt-1">{totalPieHours} hrs</p>
                              <p className="text-[9px] text-slate-400 mt-1">({baseHours} base + {incrementHours} permanentes)</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-center">
                              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Docente Especialista (Mínimo)</p>
                              <p className="text-2xl font-black text-slep-blue mt-1">{teacherMinPedag} hrs</p>
                              <p className="text-[9px] text-slate-400 mt-1">Pedagógicas de apoyo directo</p>
                            </div>
                          </div>

                          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-xs text-blue-905">
                            <h4 className="font-bold flex items-center gap-1 mb-1">
                              ℹ️ Desglose Normativo y Proporciones
                            </h4>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                              <li>El docente de educación especial debe realizar al menos <strong>{isJec ? '8' : '6'} horas pedagógicas</strong> en el aula.</li>
                              <li>Tiempo proporcional para profesionales asistentes (Psicólogo, Fonoaudiólogo, etc.): <strong>{assistantProportional} hrs</strong> cronológicas (calculado sobre {isJec ? '5.3' : '3.3'} hrs por grupo de 5 NEET).</li>
                              <li>Total curso: <strong>{totalPieHours} horas cronológicas</strong> semanales destinadas al trabajo colaborativo, co-enseñanza y atención directa de estudiantes PIE.</li>
                            </ul>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* PIE Professionals Team */}
                  <div className="bg-white rounded-xl shadow border border-slate-200/60 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">🧑‍🏫 Equipo y Recursos PIE del Establecimiento</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Profesionales y docentes con financiamiento o dedicación PIE.</p>
                      </div>
                      <span className="bg-slep-blue/10 text-slep-blue font-bold px-2 py-0.5 rounded text-[10px]">
                        Dotación Especialista
                      </span>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto max-h-[360px] text-xs">
                      {(() => {
                        const pieFuncs = funcionarios.filter(f => {
                          const hasPieContract = contratos.some(c => 
                            c.funcionario_run === f.run && 
                            normalizarRbd(String(c.rbd)) === normalizarRbd(String(selectedRbd)) && 
                            (c.horas_totales > 0)
                          );
                          const relatedCont = contratos.find(c => 
                            c.funcionario_run === f.run && 
                            normalizarRbd(String(c.rbd)) === normalizarRbd(String(selectedRbd))
                          );
                          const isSpecialistCargo = relatedCont ? esEspecialistaPIEOApoyo(f.cargo || relatedCont.funcion_principal, relatedCont.calidad_juridica) : false;
                          
                          return hasPieContract && isSpecialistCargo;
                        });

                        if (pieFuncs.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                              <p className="italic text-center">No se encontraron docentes diferenciales o asistentes de apoyo asignados a este RBD en la base de datos de personal.</p>
                              <p className="text-[10px] mt-2 text-slate-450 text-center">Para ver profesionales aquí, asegúrese de registrarlos con cargos como "DOCENTE DIFERENCIAL", "COORDINADOR/A PIE", "Psicólogo" u otros.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {pieFuncs.map(f => {
                              const contrs = contratos.filter(c => c.funcionario_run === f.run && normalizarRbd(String(c.rbd)) === normalizarRbd(String(selectedRbd)));
                              const totHrs = contrs.reduce((sum, c) => sum + c.horas_totales, 0);
                              const contrsIds = contrs.map(c => c.id);
                              const assignedHrs = asignaciones
                                .filter(a => contrsIds.includes(a.contrato_id))
                                .reduce((sum, a) => sum + a.horas, 0);
                              const remainingHrs = Math.max(0, totHrs - assignedHrs);

                              return (
                                <div key={f.run} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-all gap-2">
                                  <div>
                                    <p className="font-bold text-slate-800">{f.nombre}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">{f.cargo} • {f.estamento}</p>
                                    <p className="text-[9px] font-mono text-slate-400">{f.run}</p>
                                  </div>
                                  <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                                    <span className="bg-slate-100 text-slate-650 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                      Contrato: {totHrs} hrs
                                    </span>
                                    <span className="bg-blue-50 text-slep-blue font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-100">
                                      Asignado: {assignedHrs} hrs
                                    </span>
                                    {remainingHrs > 0 ? (
                                      <span className="bg-amber-100 text-amber-800 font-mono text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-200">
                                        Libres: {remainingHrs.toFixed(1)} hrs
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-100 text-emerald-800 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-250">
                                        ✓ Completo
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                </div>

                {/* Course Allocations Matrix */}
                <div className="bg-white rounded-xl shadow border border-slate-200/60 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-800">🏫 Matriz de Cobertura y Asignación de Horas PIE por Curso</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Ingresa la matrícula NEE de cada curso para evaluar el cumplimiento de la cobertura horaria de apoyos.</p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    {cursosDinamicos.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 italic text-xs">
                        No hay cursos creados en este establecimiento. Vaya a la pestaña de "Cursos y Carga Horaria" para agregar cursos.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 uppercase font-black">
                            <th className="p-4 pl-6">Curso</th>
                            <th className="p-4 text-center">Régimen</th>
                            <th className="p-4 text-center w-28">Estudiantes NEET</th>
                            <th className="p-4 text-center w-28">Estudiantes NEEP</th>
                            <th className="p-4 text-center">Hrs PIE Requeridas (Norma)</th>
                            <th className="p-4 text-center">Hrs PIE Asignadas (Docentes)</th>
                            <th className="p-4 text-center pr-6">Cumplimiento</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {cursosDinamicos.map(curso => {
                            const inputState = coursePieStudents[curso.nombre] || { neet: 0, neep: 0 };
                            
                            // 1. Calculate Required
                            const courseIsJec = curso.regimen === 'JEC';
                            const baseHours = (inputState.neet > 0 || inputState.neep > 0) ? (courseIsJec ? 10 : 7) : 0;
                            const incrementHours = inputState.neep * 3;
                            const requiredHours = baseHours + incrementHours;

                            // 2. Calculate Assigned (Docentes diferenciales assigned to this course)
                            const courseAsigs = asignaciones.filter(a => a.curso === curso.nombre);
                            const assignedPIEHours = courseAsigs.reduce((sum, a) => {
                              const contract = contratos.find(c => c.id === a.contrato_id);
                              if (!contract) return sum;
                              const teacher = funcionarios.find(f => f.run === contract.funcionario_run);
                              const isPieStaff = teacher ? esEspecialistaPIEOApoyo(teacher.cargo || contract.funcion_principal, contract.calidad_juridica) : false;
                              return isPieStaff ? sum + a.horas : sum;
                            }, 0);

                            const isSatisfied = assignedPIEHours >= requiredHours;

                            return (
                              <tr key={curso.nombre} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 pl-6 font-bold text-slate-800">
                                  {curso.nombre}
                                  <p className="text-[9px] text-slate-400 font-medium font-mono mt-0.5">{curso.nivel}</p>
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    courseIsJec ? 'bg-indigo-50 text-indigo-750 border border-indigo-200' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {curso.regimen}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const newVal = Math.max(0, inputState.neet - 1);
                                        setCoursePieStudents(prev => ({
                                          ...prev,
                                          [curso.nombre]: { ...inputState, neet: newVal }
                                        }));
                                      }}
                                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-250 font-black text-slate-650 flex items-center justify-center"
                                    >
                                      -
                                    </button>
                                    <span className="w-6 font-bold font-mono text-slate-800 text-center">{inputState.neet}</span>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const newVal = Math.min(15, inputState.neet + 1);
                                        setCoursePieStudents(prev => ({
                                          ...prev,
                                          [curso.nombre]: { ...inputState, neet: newVal }
                                        }));
                                      }}
                                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-250 font-black text-slate-650 flex items-center justify-center"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const newVal = Math.max(0, inputState.neep - 1);
                                        setCoursePieStudents(prev => ({
                                          ...prev,
                                          [curso.nombre]: { ...inputState, neep: newVal }
                                        }));
                                      }}
                                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-250 font-black text-slate-650 flex items-center justify-center"
                                    >
                                      -
                                    </button>
                                    <span className="w-6 font-bold font-mono text-slate-800 text-center">{inputState.neep}</span>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const newVal = Math.min(5, inputState.neep + 1);
                                        setCoursePieStudents(prev => ({
                                          ...prev,
                                          [curso.nombre]: { ...inputState, neep: newVal }
                                        }));
                                      }}
                                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-250 font-black text-slate-650 flex items-center justify-center"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="p-4 text-center font-mono font-bold text-slate-805">
                                  {requiredHours > 0 ? `${requiredHours} hrs` : '0 hrs'}
                                </td>
                                <td className="p-4 text-center font-mono font-bold text-emerald-600 bg-emerald-50/20">
                                  {assignedPIEHours > 0 ? `${assignedPIEHours} hrs` : '0 hrs'}
                                </td>
                                <td className="p-4 pr-6 text-center">
                                  {requiredHours === 0 ? (
                                    <span className="text-[10px] text-slate-400 font-medium italic">Sin apoyos requeridos</span>
                                  ) : isSatisfied ? (
                                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-250 font-bold px-2 py-0.5 rounded text-[10px]">
                                      {`✓ Cubierto (${assignedPIEHours} >= ${requiredHours})`}
                                    </span>
                                  ) : (
                                    <span className="bg-rose-100 text-rose-800 border border-rose-200 font-bold px-2 py-0.5 rounded text-[10px]">
                                      {`⚠️ Faltan ${requiredHours - assignedPIEHours} hrs`}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Section for PIE hours assignment */}
                <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-800">🧑‍🏫 Asignación de Docentes y Horas PIE por Curso</h3>
                      <p className="text-xs text-slate-500 mt-1">Asocia docentes de la dotación PIE para cubrir las horas exigidas por curso. Soporta múltiples docentes por curso.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cursosDinamicos.map(c => {
                      const dec = planesEstudio.find(p => p.nivel === c.nivel && p.regimen === c.regimen);
                      
                      const inputState = coursePieStudents[c.nombre] || { neet: 0, neep: 0 };
                      const courseIsJec = c.regimen === 'JEC';
                      const baseHours = (inputState.neet > 0 || inputState.neep > 0) ? (courseIsJec ? 10 : 7) : 0;
                      const incrementHours = inputState.neep * 3;
                      const hrsRequeridas = (inputState.neet > 0 || inputState.neep > 0)
                        ? (baseHours + incrementHours)
                        : (c.horasPIE !== undefined ? c.horasPIE : (dec ? dec.horasPIEReglamentarias : 10));
                      
                      // Active contracts of PIE specialists in this school - Group 1: Docentes y Técnicos
                      const eligibleDocentesPie = contratos.filter(cont => {
                        if (cont.rbd !== selectedRbd) return false;
                        const func = funcionarios.find(f => f.run === cont.funcionario_run);
                        if (!func) return false;
                        return esDocenteOTecnicoDiferencial(func.cargo || cont.funcion_principal, cont.calidad_juridica);
                      });
                      const docIds = eligibleDocentesPie.map(cont => cont.id);

                      // Active contracts of PIE specialists in this school - Group 2: Profesionales de Apoyo
                      const eligibleProfesionalesPie = contratos.filter(cont => {
                        if (cont.rbd !== selectedRbd) return false;
                        const func = funcionarios.find(f => f.run === cont.funcionario_run);
                        if (!func) return false;
                        return esProfesionalApoyoPIE(func.cargo || cont.funcion_principal, cont.calidad_juridica);
                      });
                      const profIds = eligibleProfesionalesPie.map(cont => cont.id);

                      // Current assignments
                      const currentDocAsigs = asignaciones.filter(
                        a => a.curso === c.nombre && docIds.includes(a.contrato_id)
                      );
                      const currentProfAsigs = asignaciones.filter(
                        a => a.curso === c.nombre && profIds.includes(a.contrato_id)
                      );

                      const totalAsignadoCurso = currentDocAsigs.reduce((sum, a) => sum + a.horas, 0) + currentProfAsigs.reduce((sum, a) => sum + a.horas, 0);
                      const delta = totalAsignadoCurso - hrsRequeridas;
                      const cubierto = Math.abs(delta) < 0.05 || totalAsignadoCurso >= hrsRequeridas;

                      return (
                        <div key={c.nombre} className="border border-slate-200/60 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="bg-slate-200/80 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase">Curso</span>
                                <h4 className="text-sm font-bold text-slate-800 mt-1">{c.nombre}</h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">{c.nivel}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Horas Exigidas PIE</span>
                                <strong className="text-sm text-slate-700">{hrsRequeridas} hrs</strong>
                              </div>
                            </div>

                            {/* Section 1: Docentes y Técnicos Diferenciales */}
                            <div className="mt-3 space-y-2">
                              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Docentes y Técnicos Diferenciales PIE:</span>
                              {currentDocAsigs.length > 0 ? (
                                <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs">
                                  {currentDocAsigs.map(a => {
                                    const cont = contratos.find(co => co.id === a.contrato_id);
                                    const func = funcionarios.find(f => f.run === cont?.funcionario_run);
                                    return (
                                      <div key={a.id} className="p-2 flex justify-between items-center hover:bg-slate-50/30">
                                        <div className="flex flex-col min-w-0 pr-2">
                                          <span className="font-semibold text-slate-850 truncate">
                                            {func ? func.nombre : 'Docente Desconocido'}
                                          </span>
                                          <span className="text-[9px] text-slate-400">
                                            {func ? func.cargo : 'Docente PIE'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          <span className="font-bold text-slep-blue bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[9px]">
                                            {a.horas} hrs
                                          </span>
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              if (confirm(`¿Está seguro de remover a este docente?`)) {
                                                await api.deleteAsignacion(a.id);
                                                await loadAllSchoolData();
                                              }
                                            }}
                                            className="text-red-500 hover:text-red-700 font-bold p-0.5 cursor-pointer transition-colors text-[10px]"
                                            title="Remover asignación"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-400 italic bg-white p-2 rounded-lg border border-slate-200 text-center">
                                  Ningún docente/técnico asignado aún.
                                </p>
                              )}
                            </div>

                            {/* Section 2: Profesionales de Apoyo */}
                            <div className="mt-3 space-y-2">
                              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Profesionales de Apoyo PIE (Psicólogos, Fonoaudiólogos, etc.):</span>
                              {currentProfAsigs.length > 0 ? (
                                <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs">
                                  {currentProfAsigs.map(a => {
                                    const cont = contratos.find(co => co.id === a.contrato_id);
                                    const func = funcionarios.find(f => f.run === cont?.funcionario_run);
                                    return (
                                      <div key={a.id} className="p-2 flex justify-between items-center hover:bg-slate-50/30">
                                        <div className="flex flex-col min-w-0 pr-2">
                                          <span className="font-semibold text-slate-850 truncate">
                                            {func ? func.nombre : 'Profesional Desconocido'}
                                          </span>
                                          <span className="text-[9px] text-slate-400">
                                            {func ? func.cargo : 'Profesional de Apoyo'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 text-[9px]">
                                            {a.horas} hrs
                                          </span>
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              if (confirm(`¿Está seguro de remover a este profesional?`)) {
                                                await api.deleteAsignacion(a.id);
                                                await loadAllSchoolData();
                                              }
                                            }}
                                            className="text-red-500 hover:text-red-700 font-bold p-0.5 cursor-pointer transition-colors text-[10px]"
                                            title="Remover asignación"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-400 italic bg-white p-2 rounded-lg border border-slate-200 text-center">
                                  Ningún profesional de apoyo asignado aún.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-200/60 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">Total asignado curso:</span>
                              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                cubierto 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {totalAsignadoCurso} / {hrsRequeridas} hrs
                              </span>
                            </div>

                            {/* Form 1: Add Docente/Técnico Diferencial */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end pt-1">
                              <div className="sm:col-span-2">
                                <label className="block text-[8px] font-bold text-slate-500 mb-0.5 uppercase">Asignar Docente/Técnico PIE</label>
                                <select
                                  id={`select-pie-docente-${c.nombre}`}
                                  className="w-full p-1.5 border rounded text-xs bg-white text-slate-700 focus:outline-slep-blue cursor-pointer"
                                  defaultValue=""
                                >
                                  <option value="">-- Seleccionar Docente/Técnico --</option>
                                  {eligibleDocentesPie.map(cont => {
                                    const func = funcionarios.find(f => f.run === cont.funcionario_run);
                                    const totalContHrs = cont.horas_totales;
                                    const assignedHrs = asignaciones
                                      .filter(as => as.contrato_id === cont.id)
                                      .reduce((sum, as) => sum + as.horas, 0);
                                    const dispHrs = totalContHrs - assignedHrs;

                                    return (
                                      <option 
                                        key={cont.id} 
                                        value={cont.id}
                                        disabled={dispHrs <= 0}
                                      >
                                        {func ? func.nombre.split(' ')[0] + ' ' + (func.nombre.split(' ')[2] || '') : cont.funcionario_run} ({func?.cargo}) - ({dispHrs.toFixed(1)} hrs disp.)
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                              <div className="flex gap-1">
                                <div className="w-12">
                                  <input
                                    type="number"
                                    id={`input-pie-horas-${c.nombre}`}
                                    min="1"
                                    step="1"
                                    defaultValue="2"
                                    className="w-full p-1.5 border rounded text-xs text-center font-bold"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const selectEl = document.getElementById(`select-pie-docente-${c.nombre}`) as HTMLSelectElement;
                                    const horasEl = document.getElementById(`input-pie-horas-${c.nombre}`) as HTMLInputElement;
                                    if (!selectEl || !horasEl) return;
                                    const cId = selectEl.value;
                                    const hrs = parseFloat(horasEl.value) || 0;

                                    if (!cId) {
                                      alert('Seleccione un docente.');
                                      return;
                                    }
                                    if (hrs <= 0) {
                                      alert('Horas debe ser mayor a 0.');
                                      return;
                                    }

                                    const selectedCont = eligibleDocentesPie.find(cont => cont.id === cId);
                                    if (!selectedCont) return;

                                    const totalContHrs = selectedCont.horas_totales;
                                    const assignedHrs = asignaciones
                                      .filter(as => as.contrato_id === selectedCont.id)
                                      .reduce((sum, as) => sum + as.horas, 0);
                                    const dispHrs = totalContHrs - assignedHrs;

                                    if (hrs > dispHrs + 0.01) {
                                      alert(`El docente solo cuenta con ${dispHrs.toFixed(1)} hrs disponibles.`);
                                      return;
                                    }

                                    const newAsig: AsignacionAula = {
                                      id: `asig-pie-${Date.now()}-${Math.random()}`,
                                      contrato_id: cId,
                                      curso: c.nombre,
                                      asignatura: 'Apoyo PIE',
                                      horas: hrs
                                    };

                                    await api.saveAsignacion(newAsig);
                                    await loadAllSchoolData();

                                    selectEl.value = "";
                                    horasEl.value = "2";
                                  }}
                                  className="flex-1 bg-slep-blue hover:bg-slep-blue-hover text-white font-bold rounded text-xs transition-colors cursor-pointer text-center flex items-center justify-center py-1.5"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Form 2: Add Profesional Apoyo */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end pt-1">
                              <div className="sm:col-span-2">
                                <label className="block text-[8px] font-bold text-slate-500 mb-0.5 uppercase">Asignar Profesional Apoyo</label>
                                <select
                                  id={`select-pie-profesional-${c.nombre}`}
                                  className="w-full p-1.5 border rounded text-xs bg-white text-slate-700 focus:outline-slep-blue cursor-pointer"
                                  defaultValue=""
                                >
                                  <option value="">-- Seleccionar Profesional --</option>
                                  {eligibleProfesionalesPie.map(cont => {
                                    const func = funcionarios.find(f => f.run === cont.funcionario_run);
                                    const totalContHrs = cont.horas_totales;
                                    const assignedHrs = asignaciones
                                      .filter(as => as.contrato_id === cont.id)
                                      .reduce((sum, as) => sum + as.horas, 0);
                                    const dispHrs = totalContHrs - assignedHrs;

                                    return (
                                      <option 
                                        key={cont.id} 
                                        value={cont.id}
                                        disabled={dispHrs <= 0}
                                      >
                                        {func ? func.nombre.split(' ')[0] + ' ' + (func.nombre.split(' ')[2] || '') : cont.funcionario_run} ({func?.cargo}) - ({dispHrs.toFixed(1)} hrs disp.)
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                              <div className="flex gap-1">
                                <div className="w-12">
                                  <input
                                    type="number"
                                    id={`input-pie-prof-horas-${c.nombre}`}
                                    min="1"
                                    step="1"
                                    defaultValue="2"
                                    className="w-full p-1.5 border rounded text-xs text-center font-bold"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const selectEl = document.getElementById(`select-pie-profesional-${c.nombre}`) as HTMLSelectElement;
                                    const horasEl = document.getElementById(`input-pie-prof-horas-${c.nombre}`) as HTMLInputElement;
                                    if (!selectEl || !horasEl) return;
                                    const cId = selectEl.value;
                                    const hrs = parseFloat(horasEl.value) || 0;

                                    if (!cId) {
                                      alert('Seleccione un profesional.');
                                      return;
                                    }
                                    if (hrs <= 0) {
                                      alert('Horas debe ser mayor a 0.');
                                      return;
                                    }

                                    const selectedCont = eligibleProfesionalesPie.find(cont => cont.id === cId);
                                    if (!selectedCont) return;

                                    const totalContHrs = selectedCont.horas_totales;
                                    const assignedHrs = asignaciones
                                      .filter(as => as.contrato_id === selectedCont.id)
                                      .reduce((sum, as) => sum + as.horas, 0);
                                    const dispHrs = totalContHrs - assignedHrs;

                                    if (hrs > dispHrs + 0.01) {
                                      alert(`El profesional solo cuenta con ${dispHrs.toFixed(1)} hrs disponibles.`);
                                      return;
                                    }

                                    const func = funcionarios.find(f => f.run === selectedCont.funcionario_run);
                                    const newAsig: AsignacionAula = {
                                      id: `asig-pie-prof-${Date.now()}-${Math.random()}`,
                                      contrato_id: cId,
                                      curso: c.nombre,
                                      asignatura: func ? func.cargo || 'Profesional Apoyo' : 'Profesional Apoyo',
                                      horas: hrs
                                    };

                                    await api.saveAsignacion(newAsig);
                                    await loadAllSchoolData();

                                    selectEl.value = "";
                                    horasEl.value = "2";
                                  }}
                                  className="flex-1 bg-purple-600 hover:bg-purple-750 text-white font-bold rounded text-xs transition-colors cursor-pointer text-center flex items-center justify-center py-1.5"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

          </div>

        {/* Modals for individual adds and cargo assignments */}
        {openAddFuncionarioModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                <div>
                  <h3 className="text-base font-bold text-slate-800">➕ Agregar Funcionario Individual</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Estamento: <span className="font-bold text-slep-blue">{openAddFuncionarioModal}</span></p>
                </div>
                <button 
                  onClick={() => setOpenAddFuncionarioModal(null)}
                  className="text-slate-400 hover:text-slate-600 bg-slate-200/50 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer font-bold w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Form */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  await handleCreateFuncionario(e);
                  setOpenAddFuncionarioModal(null);
                }} 
                className="p-6 space-y-4 text-xs"
              >
                <div>
                  <label className="block text-slate-655 font-bold mb-1 uppercase tracking-wider text-[10px]">RUN (Cédula de Identidad)</label>
                  <input 
                    type="text" 
                    placeholder="12.345.678-9" 
                    className="w-full p-2.5 border rounded bg-white text-slate-800 font-mono text-sm"
                    value={newRun}
                    onChange={(e) => setNewRun(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-655 font-bold mb-1 uppercase tracking-wider text-[10px]">Nombre Completo</label>
                  <input 
                    type="text" 
                    placeholder="Ej: María José Riquelme" 
                    className="w-full p-2.5 border rounded bg-white text-slate-800 text-sm"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-655 font-bold mb-1 uppercase tracking-wider text-[10px]">Correo Electrónico</label>
                  <input 
                    type="email" 
                    placeholder="correo@slep.cl" 
                    className="w-full p-2.5 border rounded bg-white text-slate-800 text-sm"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-655 font-bold mb-1 uppercase tracking-wider text-[10px]">Estamento</label>
                  <select 
                    className="w-full p-2.5 border rounded bg-white text-slate-800 text-sm"
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
                  <label className="block text-slate-655 font-bold mb-1 uppercase tracking-wider text-[10px]">Función / Cargo</label>
                  {newEstamento === 'Docente' ? (
                    <div className="space-y-2">
                      <select 
                        className="w-full p-2.5 border rounded bg-white text-slate-800 text-sm"
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
                          className="w-full p-2.5 border rounded bg-white text-slate-800 text-sm"
                          value={newCargo}
                          onChange={(e) => setNewCargo(e.target.value)}
                        />
                      )}
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="Ej: Auxiliar de Servicios, Psicóloga, etc." 
                      className="w-full p-2.5 border rounded bg-white text-slate-800 text-sm"
                      value={newCargo}
                      onChange={(e) => setNewCargo(e.target.value)}
                    />
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setOpenAddFuncionarioModal(null)}
                    className="flex-1 bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold py-2.5 rounded shadow cursor-pointer text-xs"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-slep-blue text-white font-bold py-2.5 rounded shadow hover:bg-slep-blue-hover cursor-pointer text-xs"
                  >
                    Agregar Funcionario
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {openCreateCargoModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                <div>
                  <h3 className="text-base font-bold text-slate-800">🎖️ Cargos Especiales Asignados</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Asigne roles financiados por subvenciones o visualice la lista actual.</p>
                </div>
                <button 
                  onClick={() => setOpenCreateCargoModal(false)}
                  className="text-slate-400 hover:text-slate-600 bg-slate-200/50 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer font-bold w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6 text-xs">
                {/* Form */}
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await handleCreateCargoPersonalizado(e);
                  }} 
                  className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs"
                >
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Crear nuevo Cargo Especial</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-500 mb-1">Nombre del Cargo</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Encargado Convivencia" 
                        className="w-full p-2 border rounded bg-white text-slate-800 text-xs"
                        value={customCargoNombre}
                        onChange={(e) => setCustomCargoNombre(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-500 mb-1">Asociar Subvención</label>
                      <select
                        className="w-full p-2 bg-white border rounded text-slate-800 text-xs"
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
                      <label className="block font-bold text-slate-500 mb-1">Funcionario Asignado</label>
                      <select
                        className="w-full p-2 bg-white border rounded text-slate-800 text-xs"
                        value={customCargoDocente}
                        onChange={(e) => setCustomCargoDocente(e.target.value)}
                        required
                      >
                        <option value="">-- Seleccionar Funcionario --</option>
                        {contratos.map(c => {
                          const f = funcionarios.find(func => func.run === c.funcionario_run);
                          return <option key={c.id} value={c.funcionario_run}>{f ? f.nombre : c.funcionario_run} ({f?.estamento})</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-500 mb-1">Horas Cargo</label>
                      <input 
                        type="number"
                        placeholder="10"
                        className="w-full p-2 border rounded bg-white text-slate-800 text-xs font-bold"
                        value={customCargoHoras}
                        onChange={(e) => setCustomCargoHoras(parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-slep-blue hover:bg-slep-blue-hover text-white font-bold py-2 rounded shadow transition-all cursor-pointer text-xs"
                  >
                    Asignar Cargo Especial
                  </button>
                </form>

                {/* List of custom roles */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 text-xs uppercase tracking-wider">Cargos Especiales Asignados</h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {cargosPersonalizados.map(c => {
                      const f = funcionarios.find(func => func.run === c.funcionario_run);
                      return (
                        <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{c.nombre}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {f ? f.nombre : c.funcionario_run} • <strong>{c.horas} hrs ({c.origen_fondo})</strong>
                            </p>
                          </div>
                          <button 
                            onClick={() => handleRemoveCargo(c.id)} 
                            className="text-red-500 hover:text-red-700 font-bold cursor-pointer text-xs"
                          >
                            Eliminar
                          </button>
                        </div>
                      );
                    })}
                    {cargosPersonalizados.length === 0 && (
                      <p className="text-center py-6 text-slate-400 italic bg-slate-50 border rounded-lg text-xs">No hay cargos especiales asignados creados.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        </div>

        {editingFuncionario && (() => {
          const relatedCont = contratos.find(c => c.funcionario_run === editingFuncionario.run);
          const teacherAsigs = asignaciones.filter(a => a.contrato_id === relatedCont?.id);
          const tempCont = relatedCont ? {
            ...relatedCont,
            horas_totales: editContHoras,
            horas_aula: editContInputMode === 'aula-primero' ? editContHorasAula : undefined,
            horas_directivas: editContHorasDirectivas || 0,
            horas_tecnico_pedagogicas: editContHorasTecPed || 0
          } : undefined;
          const leyCalculo = colegio && tempCont ? validarCargaDocente(tempCont, colegio, teacherAsigs, cargosPersonalizados, cursosDinamicos) : null;

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

                  {/* Docente Career and Dates (Tramo, Dates, Bienios) */}
                  {editingFuncionario.estamento === 'Docente' && (
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Tramo de Desarrollo</label>
                        <select 
                          className="w-full p-2 border rounded bg-white font-semibold text-slate-800 focus:outline-slep-blue text-xs cursor-pointer"
                          value={editFuncTramo}
                          onChange={(e) => setEditFuncTramo(e.target.value)}
                        >
                          <option value="Sin Tramo">Sin Tramo</option>
                          <option value="Acceso">Acceso</option>
                          <option value="Inicial">Inicial</option>
                          <option value="Temprano">Temprano</option>
                          <option value="Avanzado">Avanzado</option>
                          <option value="Experto I">Experto I</option>
                          <option value="Experto II">Experto II</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Ingreso Sistema Escolar</label>
                        <input 
                          type="date" 
                          className="w-full p-2 border rounded font-semibold text-slate-850 focus:outline-slep-blue text-xs cursor-text"
                          value={editFuncFechaSistema}
                          onChange={(e) => setEditFuncFechaSistema(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Ingreso Establecimiento</label>
                        <input 
                          type="date" 
                          className="w-full p-2 border rounded font-semibold text-slate-850 focus:outline-slep-blue text-xs cursor-text"
                          value={editFuncFechaEstablecimiento}
                          onChange={(e) => setEditFuncFechaEstablecimiento(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col justify-end pb-1 text-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Bienios Proyectados</span>
                        {editFuncFechaSistema ? (
                          <span className="bg-blue-50 text-slep-blue border border-blue-200 font-bold px-2 py-1.5 rounded-lg text-xs">
                            {(() => {
                              const entryDate = new Date(editFuncFechaSistema);
                              const today = new Date();
                              const diffTime = Math.max(0, today.getTime() - entryDate.getTime());
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              const yearsOfService = parseFloat((diffDays / 365.25).toFixed(1));
                              const bienios = Math.floor(yearsOfService / 2);
                              return `${bienios} Bienios (${yearsOfService} años)`;
                            })()}
                          </span>
                        ) : (
                          <span className="text-slate-450 italic text-[11px]">Ingrese fecha sistema</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Financing detail and edit sources */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-bold text-slate-800">Financiamiento por Subvenciones (Horas Contrato)</span>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const totalEdit = editContFins.reduce((s, fn) => s + fn.horas, 0);
                          const horasOtrosRbd = todosLosContratos
                            .filter(c => c.funcionario_run === editingFuncionario?.run && normalizarRbd(String(c.rbd)) !== normalizarRbd(String(selectedRbd)))
                            .reduce((s, c) => s + c.horas_totales, 0);
                          const totalSLEP = totalEdit + horasOtrosRbd;
                          const excede = totalSLEP > 44;
                          const exacto = totalSLEP === 44;
                          return (
                            <>
                              {horasOtrosRbd > 0 && (
                                <span className="text-[10px] text-slate-500 font-medium">+{horasOtrosRbd} hrs otros colegios</span>
                              )}
                              <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                                excede ? 'bg-red-600 text-white animate-pulse' :
                                exacto ? 'bg-amber-500 text-white' :
                                'bg-slep-blue text-white'
                              }`}>
                                {excede ? '⚠️ ' : exacto ? '⚡ ' : ''}Total SLEP: {totalSLEP}/44 hrs
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    {editContFins.reduce((s, fn) => s + fn.horas, 0) > 44 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[11px] text-red-800 font-semibold flex items-start gap-2">
                        <span className="text-base leading-none">🚫</span>
                        <span>La suma de horas supera el máximo de <strong>44 hrs</strong> permitidas en el SLEP. Reduce las horas antes de guardar.</span>
                      </div>
                    )}
                    {editContFins.reduce((s, fn) => s + fn.horas, 0) + todosLosContratos.filter(c => c.funcionario_run === editingFuncionario?.run && normalizarRbd(String(c.rbd)) !== normalizarRbd(String(selectedRbd))).reduce((s, c) => s + c.horas_totales, 0) > 44 && editContFins.reduce((s, fn) => s + fn.horas, 0) <= 44 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-[11px] text-orange-800 font-semibold flex items-start gap-2">
                        <span className="text-base leading-none">⚠️</span>
                        <span>Sumando las horas de este colegio con las de otros establecimientos SLEP se superan las <strong>44 hrs</strong> máximas permitidas.</span>
                      </div>
                    )}
                    
                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                      {editContFins.map((f, idx) => (
                        <div key={idx} className="flex gap-2 items-center text-[11px]">
                          <select 
                            className="flex-1 p-1.5 bg-white border rounded font-bold text-slate-700"
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

                          <select 
                            className="w-28 p-1.5 bg-white border rounded font-semibold text-slate-700"
                            value={f.calidad}
                            onChange={(e) => {
                              const newFins = [...editContFins];
                              newFins[idx].calidad = e.target.value as CalidadJuridica;
                              setEditContFins(newFins);
                            }}
                          >
                            <option value="Titular">Titular</option>
                            <option value="A contrata">A contrata</option>
                            <option value="Plazo fijo">Plazo fijo</option>
                            <option value="Indefinido">Indefinido</option>
                            <option value="Reemplazo">Reemplazo</option>
                            <option value="Reemplazo SEP">Reemplazo SEP</option>
                            <option value="Reemplazo PIE">Reemplazo PIE</option>
                            <option value="Habilitación especial">Habilitación especial</option>
                          </select>

                          <input 
                            type="number"
                            className="w-16 p-1.5 bg-white border rounded text-center font-bold text-slate-800"
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
                            className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2 py-1.5 rounded-lg font-bold cursor-pointer"
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
                        const newFins = [...editContFins, { origen: 'Subvención Regular' as OrigenFondo, calidad: 'A contrata' as CalidadJuridica, horas: 10 }];
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
                  {(editingFuncionario.estamento === 'Docente' || teacherAsigs.length > 0) && (
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

                  {/* Additional Chronological Hours Panel */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-4">
                    <div className="bg-white p-3 rounded-lg border text-xs space-y-2 shadow-sm">
                      <p className="font-bold text-slate-700 text-[10px] uppercase">💼 Horas Cronológicas Adicionales</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        <select
                          value={newEditCronoType}
                          onChange={(e) => setNewEditCronoType(e.target.value)}
                          className="p-1 border rounded bg-slate-50 font-semibold text-slate-700 cursor-pointer text-xs"
                        >
                          <option value="Trabajo Colaborativo">Trabajo Colaborativo</option>
                          <option value="Técnicas">Técnicas</option>
                          <option value="Apoyo UTP">Apoyo UTP</option>
                          <option value="Taller Extracurricular">Taller Extracurricular</option>
                          <option value="Reforzamiento Pedagógico">Reforzamiento Pedagógico</option>
                        </select>

                        {/* Subvención / Calidad selection */}
                        <select
                          value={selectedSubvQualityIndex}
                          onChange={(e) => setSelectedSubvQualityIndex(Number(e.target.value))}
                          className="p-1 border rounded bg-slate-50 font-semibold text-slate-700 cursor-pointer text-xs max-w-[200px]"
                        >
                          {editContFins.map((fin, idx) => (
                            <option key={idx} value={idx}>
                              {fin.origen} - {fin.calidad}
                            </option>
                          ))}
                          {editContFins.length === 0 && (
                            <option value="0">Subvención Regular - A contrata</option>
                          )}
                        </select>
                        
                        <input
                          type="number"
                          min={1}
                          max={44}
                          placeholder="Horas"
                          className="w-16 p-1 border rounded text-center font-bold text-xs"
                          value={newEditCronoHours}
                          onChange={(e) => setNewEditCronoHours(Number(e.target.value) || 0)}
                        />

                        <button
                          type="button"
                          onClick={() => {
                            if (newEditCronoHours <= 0) return;
                            const selectedFin = editContFins[selectedSubvQualityIndex] || editContFins[0] || { origen: 'Subvención Regular', calidad: 'A contrata' };
                            const itemTipo = `${newEditCronoType} (${selectedFin.origen} - ${selectedFin.calidad})`;
                            setEditContCronoHours([
                              ...editContCronoHours,
                              { id: `crono-edit-${Date.now()}`, tipo: itemTipo, horas: newEditCronoHours }
                            ]);
                            setNewEditCronoHours(2);
                          }}
                          className="bg-slep-blue text-white px-3 py-1 rounded font-black hover:bg-slep-blue-hover cursor-pointer text-xs"
                        >
                          ➕ Agregar
                        </button>
                      </div>

                      {editContCronoHours.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {editContCronoHours.map(item => (
                            <span key={item.id} className="bg-amber-100/70 border border-amber-300 text-amber-900 px-2 py-0.5 rounded-md flex items-center gap-1.5 font-semibold text-[10px]">
                              {item.tipo}: <strong>{item.horas} hrs</strong>
                              <button
                                type="button"
                                onClick={() => setEditContCronoHours(editContCronoHours.filter(h => h.id !== item.id))}
                                className="text-red-600 hover:text-red-800 font-extrabold cursor-pointer"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">No se han registrado horas cronológicas adicionales.</p>
                      )}
                    </div>
                  </div>

                  {/* Ley 20.903 indicators */}
                  {editingFuncionario.estamento === 'Docente' && (() => {
                    const relatedCont = contratos.find(c => c.funcionario_run === editingFuncionario.run);
                    const teacherAsigs = asignaciones.filter(a => a.contrato_id === relatedCont?.id);
                    
                    const tempContForIndicators: Contrato = {
                      id: relatedCont?.id || 'indicator-temp',
                      funcionario_run: editingFuncionario.run,
                      rbd: selectedRbd,
                      calidad_juridica: relatedCont?.calidad_juridica || 'A contrata',
                      funcion_principal: editFuncCargo || relatedCont?.funcion_principal || 'Docente',
                      estado: 'Activo',
                      horas_totales: editContHoras,
                      horas_aula: editContInputMode === 'aula-primero' ? editContHorasAula : undefined,
                      es_uniprofesional: editContEsUniprofesional,
                      horas_directivas: editContHorasDirectivas || 0,
                      horas_tecnico_pedagogicas: editContHorasTecPed || 0
                    };

                    const tempCrono = editContCronoHours.map((h, i) => ({ id: `temp-${i}`, contrato_id: tempContForIndicators.id, tipo: h.tipo, horas: h.horas }));
                    const desglose = calcularDesgloseContrato(tempContForIndicators, cursosDinamicos, teacherAsigs, tempCrono, undefined, editFuncCargo);

                    const pedagogicasAsignadas = teacherAsigs.reduce((sum, a) => sum + a.horas, 0); 
                    const dirHrs = editContHorasDirectivas || 0;
                    const tecHrs = editContHorasTecPed || 0;
                    const otrasFuncionesHrs = cargosPersonalizados
                      .filter(cp => cp.funcionario_run === editingFuncionario.run)
                      .reduce((sum, cp) => sum + cp.horas, 0);
                    
                    const ratio = desglose.esExcepcion ? 0.60 : 0.65;
                    const factorLectivasHC = desglose.duracionMinutos / 60;

                    // MINEDUC calculation for required contract hours, recreation and non‑teaching hours
                    const C_req = Math.round((pedagogicasAsignadas * factorLectivasHC) / ratio);
                    const minutosRecreo = Math.round(C_req * (180 / 44));
                    const recreoCrono = parseFloat((minutosRecreo / 60).toFixed(2));
                    const hnlCrono = Math.max(0, C_req - (pedagogicasAsignadas * factorLectivasHC) - recreoCrono);
                    // Update legacy variables for UI compatibility
                    const recreoAsignadoCrono = recreoCrono;
                    const noLectivasTotalesRequeridas = hnlCrono;
                    const totalHorasUsadas = parseFloat((C_req + desglose.horasCronologicasAdicionales + dirHrs + tecHrs + otrasFuncionesHrs).toFixed(2));
                    const vacantesHrs = Math.max(0, editContHoras - totalHorasUsadas);
                    const cumpleLey = desglose.horasAula >= pedagogicasAsignadas;

                    return (
                      <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b pb-2 border-slate-100">
                          <span className="font-bold text-slate-800">Proporcionalidad Horaria Aula / Ley 20.903</span>
                          {desglose.esExcepcion ? (
                            <span className="bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider border border-amber-200 animate-pulse">
                              Carga Horaria Mixta Activa (IVM {'>'} 80% en Primer Ciclo) 🌟
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-650 font-bold px-2 py-0.5 rounded text-[9px]">
                              Estándar 65/35 (Proporción General)
                            </span>
                          )}
                        </div>

                        {/* Consolidated Resumen */}
                        <div className="border border-slate-200/60 rounded-xl p-3 bg-blue-50/10 space-y-2">
                          <p className="font-bold text-slate-700 text-[11px] border-b pb-1">📊 Resumen de Jornada y Conciliación</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
                            <div className="bg-white p-2 rounded border">
                              <span className="block text-[8px] uppercase text-slate-400 font-semibold">Total Aula (Ped)</span>
                              <strong className="text-indigo-700">{pedagogicasAsignadas} hrs</strong>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <span className="block text-[8px] uppercase text-slate-400 font-semibold">Aula Disp. (Ped)</span>
                              <strong className="text-indigo-650">{desglose.horasAula} hrs</strong>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <span className="block text-[8px] uppercase text-slate-400 font-semibold">Recreo (Crono)</span>
                              <strong className="text-pink-700">{formatDecHours(recreoAsignadoCrono)}</strong>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <span className="block text-[8px] uppercase text-slate-400 font-semibold">Planif. / HNL</span>
                              <strong className="text-slate-700">{formatDecHours(noLectivasTotalesRequeridas)}</strong>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <span className="block text-[8px] uppercase text-slate-400 font-semibold">Horas Usadas</span>
                              <strong className="text-slate-800">{formatDecHours(totalHorasUsadas)} / {formatDecHours(editContHoras)}</strong>
                            </div>
                            <div className={`p-2 rounded border font-bold ${vacantesHrs > 0.05 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                              <span className="block text-[8px] uppercase text-slate-455 font-semibold">Horas Vacantes</span>
                              <strong>{formatDecHours(vacantesHrs)}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Other hours distribution block */}
                        <div className="bg-slate-50 border rounded-lg p-3 text-xs space-y-1">
                          <p className="font-bold text-slate-700">⚙️ Distribución de Horas Directivas y de Administración</p>
                          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-650 mt-1">
                            <div>
                              <span className="font-semibold block">Horas Directivas:</span>
                              <strong className="text-slate-800">{dirHrs} hrs</strong>
                            </div>
                            <div>
                              <span className="font-semibold block">Horas Técnicas UTP:</span>
                              <strong className="text-slate-800">{tecHrs} hrs</strong>
                            </div>
                            <div>
                              <span className="font-semibold block">Cargos Especiales:</span>
                              <strong className="text-slate-800">{otrasFuncionesHrs} hrs</strong>
                            </div>
                          </div>
                        </div>

                        <div className={`p-3 rounded-lg border text-[11px] font-semibold flex items-center justify-between ${
                          cumpleLey ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
                        }`}>
                          <span>
                            {cumpleLey 
                              ? '✓ Cumple con la proporción legal de aula y planificación.' 
                              : `⚠️ Exceso detectado: Las horas de clase asignadas (${pedagogicasAsignadas} hrs) superan el máximo de aula permitido por el contrato (${desglose.horasAula} hrs).`}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cumpleLey ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {cumpleLey ? 'CUMPLE' : 'EXCEDIDO'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

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
                  {/* Configurable PIE Hours (Read-only representation of the PIE Module) */}
                  <div className="bg-slate-50 p-4 rounded-xl border flex flex-col justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-700 font-black">Horas de Apoyo / Co-docencia PIE:</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Calculado dinámicamente y asignado en el módulo Educación Especial (PIE).</p>
                      
                      {(() => {
                        const inputState = coursePieStudents[editingCurso.nombre] || { neet: 0, neep: 0 };
                        const courseIsJec = editingCurso.regimen === 'JEC';
                        const baseHours = (inputState.neet > 0 || inputState.neep > 0) ? (courseIsJec ? 10 : 7) : 0;
                        const incrementHours = inputState.neep * 3;
                        const projectedPieHours = baseHours + incrementHours;
                        
                        // Active assignments for this course in the PIE module
                        const coursePieAsigs = asignaciones.filter(a => a.curso === editingCurso.nombre && a.asignatura === 'Apoyo PIE');
                        const totalAsignado = coursePieAsigs.reduce((sum, a) => sum + a.horas, 0);

                        return (
                          <div className="mt-2 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="bg-indigo-50 text-slep-blue font-bold px-2 py-0.5 rounded text-[10px] border border-indigo-150">
                                Horas Exigidas PIE: {projectedPieHours} hrs
                              </span>
                              <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${totalAsignado >= projectedPieHours && projectedPieHours > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                                Total Asignado: {totalAsignado} hrs
                              </span>
                            </div>
                            
                            <div className="mt-1">
                              <p className="text-[10px] font-bold text-slate-500">Docentes PIE Asignados:</p>
                              {coursePieAsigs.length > 0 ? (
                                <ul className="list-disc pl-4 text-[10px] text-slate-650 mt-0.5">
                                  {coursePieAsigs.map(a => {
                                    const cont = contratos.find(co => co.id === a.contrato_id);
                                    const func = funcionarios.find(f => f.run === cont?.funcionario_run);
                                    return (
                                      <li key={a.id}>
                                        {func ? func.nombre : 'Docente'} • <strong className="text-slate-800">{a.horas} hrs</strong>
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <p className="text-[10px] text-slate-400 italic mt-0.5">Ningún docente PIE asignado en este curso.</p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
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

                {/* Validador de Proporción Ley 20.903 */}
                {(() => {
                  const isFirstCycle = ['1° Básico', '2° Básico', '3° Básico', '4° Básico', '1°', '2°', '3°', '4°']
                    .some(x => editingCurso.nombre.includes(x)) &&
                    (editingCurso.nombre.toLowerCase().includes('bás') || editingCurso.nombre.toLowerCase().includes('bas') || editingCurso.nombre.toLowerCase().includes('primaria')) &&
                    !editingCurso.nombre.toLowerCase().includes('med');

                  if (!isFirstCycle) return null;

                  // Find unique contracts assigned to this course
                  const assignedContRuns = Array.from(new Set(editCursoAsignaciones.map(a => {
                    const cont = contratos.find(c => c.id === a.contrato_id);
                    return cont ? cont.funcionario_run : null;
                  }).filter(Boolean)));

                  const overloadingTeachers = assignedContRuns.map(run => {
                    const cont = contratos.find(c => c.funcionario_run === run);
                    if (!cont) return null;
                    const func = funcionarios.find(f => f.run === run);
                    if (!func || func.estamento !== 'Docente') return null;

                    // Get other assignments excluding this course
                    const otherCourseAsigs = asignaciones.filter(a => a.contrato_id === cont.id && a.curso !== editingCurso.nombre);
                    // Add the current modal assignments for this contract
                    const thisCourseAsigs = editCursoAsignaciones.filter(a => a.contrato_id === cont.id);
                    const tempAsigs = [...otherCourseAsigs, ...thisCourseAsigs];

                    const metrics = colegio ? validarCargaDocente(cont, colegio, tempAsigs, cargosPersonalizados, cursosDinamicos) : null;
                    if (metrics && !metrics.cumpleLey20903) {
                      return {
                        nombre: func.nombre,
                        maxLect: metrics.horasLectivasMaximas,
                        asigLect: metrics.horasLectivasAsignadas,
                        exceso: parseFloat((metrics.horasLectivasAsignadas - metrics.horasLectivasMaximas).toFixed(1)),
                        ratio: metrics.proporcionLectiva
                      };
                    }
                    return null;
                  }).filter(Boolean);

                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-slate-800 flex items-center gap-1">
                          ⚖️ Validador de Proporcionalidad Docente (Primer Ciclo Básico)
                        </h4>
                        {(colegio && colegio.ivm > 80) || (editingCurso && (editingCurso.concentracion_prioritarios || 0) >= 80) ? (
                          <span className="bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded text-[9px] uppercase border border-amber-250 animate-pulse">
                            Excepción 60/40 Activa {(editingCurso && (editingCurso.concentracion_prioritarios || 0) >= 80) ? `(Concentración ${editingCurso.concentracion_prioritarios}%)` : `(IVM ${colegio?.ivm}%)`} 🌟
                          </span>
                        ) : (
                          <span className="bg-slate-200 text-slate-650 font-bold px-2 py-0.5 rounded text-[9px]">
                            Estándar 65/35 Activo (IVM {colegio ? colegio.ivm : 0}%)
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Cualquier docente asignado a este curso tendrá sus horas calculadas proporcionalmente bajo el ratio de este curso para las horas dictadas aquí.
                      </p>
                      
                      {overloadingTeachers.length > 0 ? (
                        <div className="mt-2 space-y-1.5">
                          {overloadingTeachers.map((t: any, idx) => (
                            <div key={idx} className="bg-red-50 border border-red-200 text-red-900 px-3 py-2 rounded-lg flex justify-between items-center animate-bounce">
                              <span>
                                ⚠️ El docente <strong>{t.nombre}</strong> excede su jornada lectiva máxima. (Ratio aplicado: {t.ratio}%)
                              </span>
                              <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-[10px]">
                                Asignadas: {t.asigLect} / {t.maxLect} hrs (+{t.exceso} hrs de exceso)
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-2 rounded-lg text-[10px] font-semibold">
                          ✓ Todos los docentes asignados cumplen con la proporción legal de docencia de aula.
                        </div>
                      )}
                    </div>
                  );
                })()}

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

      </main>
    </div>
  );
}
