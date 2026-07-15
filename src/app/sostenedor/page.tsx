'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, dbLocal, supabase } from '@/lib/supabase';
import { parsearNominaCsv, normalizarRun, parsearRemuneracionesCsv, parsearArchivoExcelOJson, descargarPlantillaExcel } from '@/lib/csvParser';
import { 
  Establecimiento, 
  Funcionario, 
  Contrato, 
  FinanciamientoContrato, 
  AlertaConciliacion,
  ProfesionalEscuelaAsignada,
  Supervisor,
  PlanEstudioNorm,
  AsignacionAula,
  CargoPersonalizado,
  OrigenFondo,
  RegistroRemuneracion,
  CursoDinamico,
  AsignaturaDinamica
} from '@/lib/types';
import { validarCargaDocente, conciliarFuncionario, calcularCargaDocente } from '@/lib/rulesEngine';

export default function SostenedorDashboard() {
  const router = useRouter();
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [financiamientos, setFinanciamientos] = useState<FinanciamientoContrato[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [alertas, setAlertas] = useState<AlertaConciliacion[]>([]);
  const [tutelas, setTutelas] = useState<ProfesionalEscuelaAsignada[]>([]);
  
  // Custom states for CRUDs
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [planesEstudio, setPlanesEstudio] = useState<PlanEstudioNorm[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAula[]>([]);
  const [cargosPersonalizados, setCargosPersonalizados] = useState<CargoPersonalizado[]>([]);
  const [comunasList, setComunasList] = useState<string[]>([]);
  const [newComunaName, setNewComunaName] = useState('');

  // Editing Funcionario modal state
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const [editFuncNombre, setEditFuncNombre] = useState('');
  const [editFuncCargo, setEditFuncCargo] = useState('');
  const [editFuncEmail, setEditFuncEmail] = useState('');
  const [editFuncTitulo, setEditFuncTitulo] = useState('');
  const [editContHoras, setEditContHoras] = useState(0);
  const [editContFins, setEditContFins] = useState<{ origen: OrigenFondo; horas: number }[]>([]);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'compendio' | 'resumenes' | 'conciliacion'>('dashboard');
  const [todosLosCursos, setTodosLosCursos] = useState<CursoDinamico[]>([]);
  const [todasLasAsignaturas, setTodasLasAsignaturas] = useState<AsignaturaDinamica[]>([]);
  const [resumenSubTab, setResumenSubTab] = useState<'territorio' | 'asignaturas' | 'disponibilidad' | 'alertas'>('territorio');
  const [resumenSelectedAsignatura, setResumenSelectedAsignatura] = useState('Todas');
  const [resumenSelectedComunas, setResumenSelectedComunas] = useState<string[]>([]);
  const [authorized, setAuthorized] = useState(false);
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

  const triggerExport = (tab: string, format: 'xlsx' | 'pdf') => {
    let cols: { key: string; label: string; checked: boolean }[] = [];
    if (tab === 'dashboard') {
      cols = [
        { key: 'rbd', label: 'RBD', checked: true },
        { key: 'establecimiento', label: 'Establecimiento', checked: true },
        { key: 'matricula', label: 'Matrícula', checked: true },
        { key: 'prioritarios', label: 'Prioritarios %', checked: true },
        { key: 'comuna', label: 'Comuna', checked: true }
      ];
    } else if (tab === 'compendio') {
      cols = [
        { key: 'rbd', label: 'RBD', checked: true },
        { key: 'establecimiento', label: 'Establecimiento', checked: true },
        { key: 'matricula', label: 'Matrícula', checked: true },
        { key: 'docentes', label: 'Cantidad Docentes', checked: true },
        { key: 'asistentes', label: 'Cantidad Asistentes', checked: true },
        { key: 'horas_docentes', label: 'Horas Docentes', checked: true },
        { key: 'horas_asistentes', label: 'Horas Asistentes', checked: true },
        { key: 'horas_aula', label: 'Horas Plan Regular', checked: true },
        { key: 'horas_sep', label: 'Horas SEP', checked: true },
        { key: 'horas_pie', label: 'Horas PIE', checked: true }
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
    const activeCols = exportModal.columns.filter(c => c.checked).map(c => c.label);
    alert(`📥 Descargando reporte de la pestaña "${exportModal.tab.toUpperCase()}" (Consola Sostenedor) en formato ${exportModal.format.toUpperCase()}...\n\nColumnas seleccionadas:\n- ${activeCols.join('\n- ')}`);
    setExportModal({ ...exportModal, isOpen: false });
  };


  // CRUD Active forms
  const [newSupRun, setNewSupRun] = useState('');
  const [newSupNombre, setNewSupNombre] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');
  
  const [newEscRbd, setNewEscRbd] = useState('');
  const [newEscNombre, setNewEscNombre] = useState('');
  const [newEscIvm, setNewEscIvm] = useState(80);
  const [newEscComuna, setNewEscComuna] = useState('Bulnes');

  // Tutorship
  const [selectedProfRun, setSelectedProfRun] = useState('');
  const [assignRbd, setAssignRbd] = useState('');

  // Drag-and-drop & file states
  const [dragActive, setDragActive] = useState(false);
  const [importLogs, setImportLogs] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Asistentes drag-and-drop & file states
  const [dragActiveAsis, setDragActiveAsis] = useState(false);
  const [importLogsAsis, setImportLogsAsis] = useState('');
  const fileInputRefAsis = useRef<HTMLInputElement>(null);

  // JSON Mineduc plan drag-and-drop
  const [dragActivePlan, setDragActivePlan] = useState(false);
  const [planImportLogs, setPlanImportLogs] = useState('');
  const planFileInputRef = useRef<HTMLInputElement>(null);

  // Establecimientos drag-and-drop & file states
  const [dragActiveEst, setDragActiveEst] = useState(false);
  const [uploadEstLogs, setUploadEstLogs] = useState('');
  const estFileInputRef = useRef<HTMLInputElement>(null);

  // Confirmation state for Excel/CSV ingestion
  const [pendingIngest, setPendingIngest] = useState<{
    funcionarios: Funcionario[];
    contratos: Contrato[];
    financiamientos: FinanciamientoContrato[];
    alertas: AlertaConciliacion[];
    establecimientos: Establecimiento[];
    schoolsList: string[];
    selectedSchools: string[];
    targetEstamento: string;
    isAsistente: boolean;
  } | null>(null);
  const [ingestProgress, setIngestProgress] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Search and filters
  const [selectedBulkRbd, setSelectedBulkRbd] = useState<string[]>([]);
  const [searchEst, setSearchEst] = useState('');
  const [selectedComuna, setSelectedComuna] = useState('Todas');
  const [searchRun, setSearchRun] = useState('');
  const [searchRunResult, setSearchRunResult] = useState<{
    funcionario: Funcionario;
    contratos: (Contrato & { escuelaNombre: string; financiamientos: FinanciamientoContrato[] })[];
    totalHoras: number;
  } | null>(null);

  useEffect(() => {
    let interval: any;
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('slep_sim_role');
      if (role !== 'sostenedor_maestro') {
        if (role === 'profesional_slep') {
          router.push('/profesional');
        } else if (role === 'director_escuela') {
          router.push('/escuela');
        } else {
          router.push('/');
        }
      } else {
        setAuthorized(true);
        loadAllData();

        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        if (tabParam === 'compendio' || tabParam === 'dashboard' || tabParam === 'resumenes' || tabParam === 'conciliacion') {
          setActiveTab(tabParam as any);
        }

        interval = setInterval(async () => {
          const updated = await api.pullCloudSync();
          if (updated) {
            loadAllData();
          }
        }, 5000);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Realtime Supabase Channels Subscription for Sostenedor (global, no filters)
  useEffect(() => {
    if (!authorized) return;

    const channel = supabase
      .channel('sostenedor-global-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contratos' },
        (payload: any) => {
          console.log('🔥 Cambios en contratos recibidos por canal realtime (Sostenedor):', payload);
          loadAllData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'asignaciones_aula' },
        (payload: any) => {
          console.log('🔥 Cambios en asignaciones recibidos por canal realtime (Sostenedor):', payload);
          loadAllData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alertas_conciliacion' },
        (payload: any) => {
          console.log('🔥 Cambios en alertas recibidos por canal realtime (Sostenedor):', payload);
          loadAllData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authorized]);

  async function loadAllData() {
    await api.pullCloudSync();
    
    const [
      ests,
      conts,
      funcs,
      alts,
      tuts,
      sups,
      plans,
      coms
    ] = await Promise.all([
      api.getEstablecimientos(),
      api.getContratos(),
      api.getFuncionarios(),
      api.getAlertas(),
      api.getTodasLasTutelas(),
      api.getSupervisores(),
      api.getPlanesEstudio(),
      api.getComunas()
    ]);

    // Fetch dyn elements
    const asigs = dbLocal.asignacionesAula;
    const cargs = dbLocal.cargosPersonalizados;

    const finsArrays = await Promise.all(
      conts.map(c => api.getFinanciamientosPorContrato(c.id))
    );
    const fins = finsArrays.flat();

    setEstablecimientos(ests);
    setContratos(conts);
    setFuncionarios(funcs);
    setFinanciamientos(fins);
    setAlertas(alts);
    setTutelas(tuts);
    setSupervisores(sups);
    setPlanesEstudio(plans);
    
    setAsignaciones(asigs);
    setCargosPersonalizados(cargs);
    setComunasList(coms);
    setResumenSelectedComunas(coms);

    if (sups.length > 0) {
      setSelectedProfRun(sups[0].run);
    }
    if (ests.length > 0) {
      setAssignRbd(ests[0].rbd);
    }
  }

  // Profile modal action handlers for Sostenedor
  const handleOpenEditFuncionario = async (f: Funcionario) => {
    setEditingFuncionario(f);
    setEditFuncNombre(f.nombre);
    setEditFuncCargo(f.cargo || '');
    setEditFuncEmail(f.email || '');
    setEditFuncTitulo(f.titulo || '');
    
    const relatedCont = contratos.find(c => c.funcionario_run === f.run);
    if (relatedCont) {
      setEditContHoras(relatedCont.horas_totales);
      const fins = await api.getFinanciamientosPorContrato(relatedCont.id);
      setEditContFins(fins.map(fi => ({ origen: fi.origen_fondo, horas: fi.horas })));
    } else {
      setEditContHoras(0);
      setEditContFins([]);
    }
  };

  const handleSaveFuncionario = async () => {
    if (!editingFuncionario) return;
    
    // 1. Update master funcionario
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
        funcion_principal: editFuncCargo
      };

      const cleanFins: FinanciamientoContrato[] = editContFins.map((f, index) => ({
        id: `f-${relatedCont.id}-${f.origen}-${index}`,
        contrato_id: relatedCont.id,
        origen_fondo: f.origen,
        horas: f.horas
      }));

      await api.upsertContratoCompleto(updatedCont, cleanFins);
    }

    setEditingFuncionario(null);
    await loadAllData();
    alert('✅ Funcionario y contrato actualizados exitosamente.');
  };

  const handleCreateComuna = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComunaName.trim()) {
      alert('Ingrese un nombre de comuna válido.');
      return;
    }
    await api.addComuna(newComunaName.trim());
    setNewComunaName('');
    await loadAllData();
    alert('✅ Comuna agregada exitosamente.');
  };

  const handleDeleteComuna = async (comuna: string) => {
    if (confirm(`¿Está seguro de eliminar la comuna "${comuna}"?`)) {
      await api.deleteComuna(comuna);
      await loadAllData();
      alert('✅ Comuna eliminada.');
    }
  };

  // Asesor CRUD Actions
  const handleCreateSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupRun || !newSupNombre || !newSupEmail) {
      alert('Faltan campos');
      return;
    }
    const cleanRun = normalizarRun(newSupRun);
    await api.upsertSupervisor({
      run: cleanRun,
      nombre: newSupNombre,
      email: newSupEmail
    });
    setNewSupRun('');
    setNewSupNombre('');
    setNewSupEmail('');
    await loadAllData();
    alert('✅ Asesor creado/actualizado.');
  };

  const handleDeleteSupervisor = async (run: string) => {
    if (confirm('¿Está seguro de eliminar este asesor?')) {
      await api.deleteSupervisor(run);
      await loadAllData();
    }
  };

  // School CRUD Actions
  const handleCreateEscuela = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEscRbd || !newEscNombre) {
      alert('Faltan campos');
      return;
    }
    await api.upsertEstablecimiento({
      rbd: newEscRbd,
      nombre: newEscNombre,
      ivm: parseFloat(newEscIvm.toString()) || 80,
      comuna: newEscComuna,
      regimen: 'JEC'
    });
    setNewEscRbd('');
    setNewEscNombre('');
    await loadAllData();
    alert('✅ Escuela creada/actualizada.');
  };

  const handleDeleteEscuela = async (rbd: string) => {
    if (confirm('¿Está seguro de eliminar esta escuela?')) {
      await api.deleteEstablecimiento(rbd);
      await loadAllData();
    }
  };

  const handleBulkDeleteEscuelas = async () => {
    if (selectedBulkRbd.length === 0) return;
    if (confirm(`¿Está seguro de eliminar de manera masiva los ${selectedBulkRbd.length} establecimientos seleccionados y todos sus contratos asociados?`)) {
      for (const rbd of selectedBulkRbd) {
        await api.deleteEstablecimiento(rbd);
      }
      setSelectedBulkRbd([]);
      await loadAllData();
      alert('✅ Establecimientos eliminados correctamente.');
    }
  };

  const handleManageSchool = (rbd: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('slep_sim_rbd', rbd);
      localStorage.setItem('slep_sim_role', 'director_escuela');
      localStorage.setItem('slep_sostenedor_mode', 'true');
      router.push('/escuela');
    }
  };

  // Assign school to supervisor
  const handleAssignSchool = async () => {
    if (!selectedProfRun || !assignRbd) return;
    await api.asignarEscuelaAProfesional(selectedProfRun, assignRbd);
    await loadAllData();
    alert('✅ Tutela asignada.');
  };

  const handleRemoveSchool = async (profRun: string, rbd: string) => {
    await api.removerEscuelaDeProfesional(profRun, rbd);
    await loadAllData();
  };

  // Drag-and-drop CSV Nominas
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processNominaFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processNominaFile(e.target.files[0]);
    }
  };

  const processNominaFile = (file: File) => {
    const isAsistente = file.name.toLowerCase().includes('asis') || file.name.toLowerCase().includes('asistente');
    const targetEstamento = isAsistente ? 'Asistente de la Educación' : 'Docente';

    const reader = new FileReader();
    reader.onload = async (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      try {
        const controlPrevioMock = [
          { run: '12345678-9', funcion: 'Docente de Aula', horas: 44 },
          { run: '15432987-K', funcion: 'Director de Escuela', horas: 38 }
        ];

        const schoolMap: Record<string, string> = {};
        establecimientos.forEach(e => {
          schoolMap[e.nombre.toLowerCase().trim()] = e.rbd;
        });

        const { funcionarios: newFuncs, contratos: newConts, financiamientos: newFins, alertas: newAlts, establecimientos: newEsts } = parsearArchivoExcelOJson(
          buffer,
          file.name,
          '10201',
          controlPrevioMock,
          targetEstamento,
          schoolMap
        );

        const fileSchools = Array.from(new Set([
          ...newConts.map(c => c.rbd),
          ...(newEsts || []).map(e => e.rbd)
        ])).filter(Boolean);

        setPendingIngest({
          funcionarios: newFuncs,
          contratos: newConts,
          financiamientos: newFins,
          alertas: newAlts,
          establecimientos: newEsts || [],
          schoolsList: fileSchools,
          selectedSchools: fileSchools,
          targetEstamento,
          isAsistente: false
        });
        setShowConfirmModal(true);
        setImportLogs('');
      } catch (err: any) {
        setImportLogs(`❌ Error al procesar archivo: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragAsis = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveAsis(true);
    } else if (e.type === "dragleave") {
      setDragActiveAsis(false);
    }
  };

  const handleDropAsis = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveAsis(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAsistenteFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChangeAsis = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processAsistenteFile(e.target.files[0]);
    }
  };

  const processAsistenteFile = (file: File) => {
    const targetEstamento = 'Asistente de la Educación';

    const reader = new FileReader();
    reader.onload = async (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      try {
        const controlPrevioMock: any[] = [];
        const schoolMap: Record<string, string> = {};
        establecimientos.forEach(e => {
          schoolMap[e.nombre.toLowerCase().trim()] = e.rbd;
        });

        const { funcionarios: newFuncs, contratos: newConts, financiamientos: newFins, alertas: newAlts, establecimientos: newEsts } = parsearArchivoExcelOJson(
          buffer,
          file.name,
          '10201',
          controlPrevioMock,
          targetEstamento,
          schoolMap
        );

        const fileSchools = Array.from(new Set([
          ...newConts.map(c => c.rbd),
          ...(newEsts || []).map(e => e.rbd)
        ])).filter(Boolean);

        setPendingIngest({
          funcionarios: newFuncs,
          contratos: newConts,
          financiamientos: newFins,
          alertas: newAlts,
          establecimientos: newEsts || [],
          schoolsList: fileSchools,
          selectedSchools: fileSchools,
          targetEstamento,
          isAsistente: true
        });
        setShowConfirmModal(true);
        setImportLogsAsis('');
      } catch (err: any) {
        setImportLogsAsis(`❌ Error al procesar archivo: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragEst = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveEst(true);
    } else if (e.type === "dragleave") {
      setDragActiveEst(false);
    }
  };

  const handleDropEst = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveEst(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processEstablecimientosFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChangeEst = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processEstablecimientosFile(e.target.files[0]);
    }
  };

  const processEstablecimientosFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      try {
        const { establecimientos: newEsts } = parsearArchivoExcelOJson(
          buffer,
          file.name,
          '10201',
          undefined,
          undefined,
          {},
          true  // forceEstablecimientos: parse first sheet directly regardless of tab name
        );

        if (!newEsts || newEsts.length === 0) {
          throw new Error('No se encontraron establecimientos válidos en el archivo. Verifique la pestaña "Establecimientos" o los encabezados.');
        }

        // Extract unique communes and insert them first to satisfy database constraints
        const uniqueComunas = Array.from(new Set(newEsts.map(e => e.comuna).filter(Boolean)));
        if (uniqueComunas.length > 0) {
          await api.upsertComunasBulk(uniqueComunas);
        }

        // Save directly to DB
        await api.upsertEstablecimientosBulk(newEsts);

        // Refresh state
        const updated = await api.getEstablecimientos();
        const updatedComs = await api.getComunas();
        setEstablecimientos(updated);
        setComunasList(updatedComs);
        setResumenSelectedComunas(updatedComs);
        
        setUploadEstLogs(`✅ Éxito: Se cargaron ${newEsts.length} establecimientos correctamente.`);
      } catch (err: any) {
        setUploadEstLogs(`❌ Error al procesar archivo: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmIngest = async () => {
    if (!pendingIngest) return;
    const { funcionarios, contratos, financiamientos, alertas, selectedSchools, targetEstamento, isAsistente } = pendingIngest;
    
    setIngestProgress(5);
    try {
      // 1. Fetch pre-existing schools to validate foreign key constraints
      const existingEsts = await api.getEstablecimientos();
      const existingRbds = new Set(existingEsts.map(e => String(e.rbd).trim()));
      const cleanSelectedSchools = selectedSchools.map(s => String(s).trim());

      const filteredConts = contratos.filter(c => {
        const cRbd = String(c.rbd).trim();
        return cleanSelectedSchools.includes(cRbd) && existingRbds.has(cRbd);
      });
      const totalContsForSelected = contratos.filter(c => cleanSelectedSchools.includes(String(c.rbd).trim())).length;
      const discardedContsCount = totalContsForSelected - filteredConts.length;

      const filteredFuncsRuns = Array.from(new Set(filteredConts.map(c => c.funcionario_run)));
      const filteredFuncs = funcionarios.filter(f => filteredFuncsRuns.includes(f.run) || f.estamento === targetEstamento);
      const filteredFins = financiamientos.filter(f => {
        const parentCont = contratos.find(c => c.id === f.contrato_id);
        if (!parentCont) return false;
        const pRbd = String(parentCont.rbd).trim();
        return cleanSelectedSchools.includes(pRbd) && existingRbds.has(pRbd);
      });
      const filteredAlts = alertas.filter(a => {
        const aRbd = String(a.rbd).trim();
        return cleanSelectedSchools.includes(aRbd) && existingRbds.has(aRbd);
      });

      // 2. Create Funcionarios in Bulk (UPSERT ON CONFLICT target run)
      setIngestProgress(40);
      if (filteredFuncs.length > 0) {
        await (api as any).upsertFuncionariosBulk(filteredFuncs);
      }

      // 3. Create Contratos & Financiamientos in Bulk
      setIngestProgress(75);
      if (filteredConts.length > 0) {
        await (api as any).upsertContratosCompletoBulk(filteredConts, filteredFins);
      }

      // 4. Create Alertas
      setIngestProgress(90);
      if (filteredAlts.length > 0) {
        await (api as any).crearAlertasBulk(filteredAlts);
      }

      setIngestProgress(100);
      await loadAllData();
      
      let successMsg = `✅ Éxito: Se procesaron y confirmaron ${filteredConts.length} contratos de dotación.`;
      if (discardedContsCount > 0) {
        successMsg += ` (⚠️ Se omitieron ${discardedContsCount} filas porque sus RBD no existen en el catálogo de colegios).`;
      }

      if (isAsistente) {
        setImportLogsAsis(successMsg);
      } else {
        setImportLogs(successMsg);
      }
    } catch (err: any) {
      const errMsg = `❌ Error en confirmación de ingesta: ${err.message}`;
      if (isAsistente) {
        setImportLogsAsis(errMsg);
      } else {
        setImportLogs(errMsg);
      }
    } finally {
      setIngestProgress(null);
      setShowConfirmModal(false);
      setPendingIngest(null);
    }
  };

  // Drag-and-drop Plan Estudio JSON
  const handleDragPlan = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActivePlan(true);
    } else if (e.type === "dragleave") {
      setDragActivePlan(false);
    }
  };

  const handleDropPlan = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivePlan(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPlanFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChangePlan = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processPlanFile(e.target.files[0]);
    }
  };

  const processPlanFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const rawJson = JSON.parse(text);
        
        const mapPlanes = (input: any): PlanEstudioNorm[] => {
          const result: PlanEstudioNorm[] = [];
          const list = Array.isArray(input) ? input : (input.planes_de_estudio || input.planes || []);
          
          for (const item of list) {
            const rawNivel: string = item.nivel || '';
            const nivel = rawNivel
              .replace(/básico/gi, 'Básico')
              .replace(/medio/gi, 'Medio');
            
            if (!nivel) continue;

            if (item.plan_comun_formacion_general) {
              const branches: ('humanistico_cientifico' | 'tecnico_profesional' | 'artistico')[] = ['humanistico_cientifico', 'tecnico_profesional', 'artistico'];
              for (const branch of branches) {
                const branchData = item.planes_diferenciados?.[branch];
                if (!branchData) continue;

                const diffHrs = branchData.horas_formacion_diferenciada || 18;
                const asignaturasBase: { nombre: string; horasSugeridas: number }[] = [];

                if (Array.isArray(item.plan_comun_formacion_general)) {
                  item.plan_comun_formacion_general.forEach((a: any) => {
                    asignaturasBase.push({ nombre: a.nombre, horasSugeridas: a.horas_semanales || 2 });
                  });
                }
                if (Array.isArray(item.plan_comun_electivo)) {
                  item.plan_comun_electivo.forEach((a: any) => {
                    asignaturasBase.push({ nombre: a.nombre, horasSugeridas: a.horas_semanales || 2 });
                  });
                }
                asignaturasBase.push({ nombre: `Formación Diferenciada (${branch.replace('_', ' ').toUpperCase()})`, horasSugeridas: diffHrs });

                result.push({
                  nivel: `${nivel} (${branch.replace('_', ' ').toUpperCase()})`,
                  regimen: 'JEC',
                  horasObligatorias: branchData.tiempo_minimo_total?.con_jec || 42,
                  horasPIEReglamentarias: 10,
                  asignaturasBase
                });

                result.push({
                  nivel: `${nivel} (${branch.replace('_', ' ').toUpperCase()})`,
                  regimen: 'No JEC',
                  horasObligatorias: branchData.tiempo_minimo_total?.sin_jec || 38,
                  horasPIEReglamentarias: 8,
                  asignaturasBase
                });
              }
            } else {
              const asignaturasJec: { nombre: string; horasSugeridas: number }[] = [];
              const asignaturasNoJec: { nombre: string; horasSugeridas: number }[] = [];

              if (Array.isArray(item.asignaturas)) {
                item.asignaturas.forEach((asig: any) => {
                  const hrsJec = asig.horas_semanales_con_jec !== undefined ? asig.horas_semanales_con_jec : asig.horas_semanales || 0;
                  const hrsNoJec = asig.horas_semanales_sin_jec !== undefined ? asig.horas_semanales_sin_jec : asig.horas_semanales || 0;
                  if (hrsJec > 0) asignaturasJec.push({ nombre: asig.nombre, horasSugeridas: hrsJec });
                  if (hrsNoJec > 0) asignaturasNoJec.push({ nombre: asig.nombre, horasSugeridas: hrsNoJec });
                });
              }

              const totalJec = item.tiempo_minimo_total?.con_jec !== undefined 
                ? item.tiempo_minimo_total.con_jec 
                : (item.tiempo_minimo_total?.con_jec || 38);
              result.push({
                nivel,
                regimen: 'JEC',
                horasObligatorias: totalJec,
                horasPIEReglamentarias: 10,
                asignaturasBase: asignaturasJec
              });

              const totalNoJec = item.tiempo_minimo_total?.sin_jec !== undefined ? item.tiempo_minimo_total.sin_jec : 33;
              result.push({
                nivel,
                regimen: 'No JEC',
                horasObligatorias: totalNoJec,
                horasPIEReglamentarias: 8,
                asignaturasBase: asignaturasNoJec
              });
            }
          }
          return result;
        };

        const planesMapeados = mapPlanes(rawJson);
        if (planesMapeados.length > 0) {
          await api.guardarPlanesEstudio(planesMapeados);
          await loadAllData();
          setPlanImportLogs(`✅ Planes de estudio cargados: Se crearon ${planesMapeados.length} variantes de decretos.`);
        } else {
          setPlanImportLogs('❌ Error: Formato de JSON inválido o lista vacía.');
        }
      } catch (err: any) {
        setPlanImportLogs(`❌ Error al procesar JSON: ${err.message}`);
      }
    };
    reader.readAsText(file, 'UTF-8');
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
      alert('Funcionario no encontrado.');
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

  const comunas = ['Todas', ...comunasList];
  const filteredEstablecimientos = establecimientos.filter(e => {
    const matchesSearch = e.nombre.toLowerCase().includes(searchEst.toLowerCase()) || e.rbd.includes(searchEst);
    const matchesComuna = selectedComuna === 'Todas' || e.comuna === selectedComuna;
    return matchesSearch && matchesComuna;
  });

  const printFuncionarioDetail = (funcionario: Funcionario, contrato: Contrato | undefined, financiamientos: { origen: OrigenFondo; horas: number }[], leyCalculo: any) => {
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

  // Territory-wide hours calculations
  const getEstamentoTerritorial = (c: Contrato) => {
    const f = funcionarios.find(func => func.run === c.funcionario_run);
    if (f?.estamento) return f.estamento;
    if (c.legislacion_laboral === 'Asistentes de la educación') return 'Asistente de la Educación';
    if (c.legislacion_laboral === 'Estatuto docente') return 'Docente';
    return 'Docente';
  };

  const asistenteContsTerr = contratos.filter(c => getEstamentoTerritorial(c) === 'Asistente de la Educación');
  const docenteContsTerr = contratos.filter(c => getEstamentoTerritorial(c) === 'Docente');

  const totalAsistentesTerr = asistenteContsTerr.reduce((sum, c) => sum + c.horas_totales, 0);
  const totalDocentesTerr = docenteContsTerr.reduce((sum, c) => sum + c.horas_totales, 0);

  // Docente hours by function territory-wide
  let horasDirectivasTerr = 0;
  let horasTecPedTerr = 0;
  let horasCoordUTPTerr = 0;
  let horasApoyoUTPTerr = 0;
  let horasAulaOtrasTerr = 0;

  docenteContsTerr.forEach(c => {
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
      horasDirectivasTerr += c.horas_totales;
    } else if (isCoordinacionUTP) {
      horasCoordUTPTerr += c.horas_totales;
    } else if (isApoyoUTP) {
      horasApoyoUTPTerr += c.horas_totales;
    } else if (isTecnicoPedagogica) {
      horasTecPedTerr += c.horas_totales;
    } else {
      horasAulaOtrasTerr += c.horas_totales;
    }
  });

  // Docente hours by funding source territory-wide
  let regularTerr = 0;
  let sepTerr = 0;
  let pieTerr = 0;
  let proRetencionTerr = 0;
  let liceoBicTerr = 0;
  let otrasFondoTerr = 0;

  docenteContsTerr.forEach(c => {
    const fins = financiamientos.filter(f => f.contrato_id === c.id);
    if (fins.length === 0) {
      regularTerr += c.horas_totales;
      return;
    }
    fins.forEach(f => {
      if (f.origen_fondo === 'Subvención Regular') {
        regularTerr += f.horas;
      } else if (f.origen_fondo === 'SEP') {
        sepTerr += f.horas;
      } else if (f.origen_fondo === 'PIE') {
        pieTerr += f.horas;
      } else if (f.origen_fondo === 'Pro-retención') {
        proRetencionTerr += f.horas;
      } else if (f.origen_fondo === 'Liceos Bicentenarios') {
        liceoBicTerr += f.horas;
      } else {
        otrasFondoTerr += f.horas;
      }
    });
  });

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-600 font-bold">
        🔒 Acceso Restringido. Redirigiendo...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slep-blue-dark text-white flex flex-col z-40 shadow-xl shrink-0">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <Image src="/logo.png" alt="Logo SLEP" width={110} height={45} className="object-contain" />
        </div>
        
        <div className="p-4 flex-1 space-y-6">
          <div>
            <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Unidad UATP</p>
            <nav className="space-y-1">
              <button
                onClick={() => { setActiveTab('dashboard'); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'dashboard' ? 'bg-slep-blue text-white shadow' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                🎛️ Tablero de Gobernanza
              </button>
              <button
                onClick={() => { setActiveTab('compendio'); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'compendio' ? 'bg-slep-blue text-white shadow' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                📊 Compendio Territorial
              </button>
              <button
                onClick={() => { setActiveTab('resumenes'); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'resumenes' ? 'bg-slep-blue text-white shadow' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                📈 Resúmenes Consolidados
              </button>
              <button
                onClick={() => { setActiveTab('conciliacion'); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'conciliacion' ? 'bg-slep-blue text-white shadow' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                ⚖️ Conciliación de Horas
              </button>
            </nav>
          </div>

          <div>
            <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Gestión de Personas</p>
            <nav className="space-y-1">
              <Link
                href="/sostenedor/rrhh"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left text-slate-300 hover:bg-white/5 block"
              >
                💼 Fichas, Licencias & Reemplazos
              </Link>
            </nav>
          </div>

          <div>
            <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Finanzas SLEP</p>
            <nav className="space-y-1">
              <Link
                href="/sostenedor/finanzas"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left text-slate-300 hover:bg-white/5 block"
              >
                💵 Conciliación Remuneraciones
              </Link>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Sostenedor Maestro</p>
          <Link href="/" className="mt-2 block w-full bg-white/10 hover:bg-white/20 text-white font-bold py-1.5 rounded text-[10px] transition-colors border border-white/10">
            Cerrar Sesión
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <header className="bg-white border-b py-4 px-6 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-base font-bold text-slate-800">Consola de Gobernanza Territorial</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Gestión unificada SLEP del Sostenedor</p>
          </div>
        </header>

        {activeTab === 'compendio' && (
        <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 flex flex-col gap-6 w-full">
          <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Compendio y Reporte Territorial de Establecimientos</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Consolidado general de dotaciones, horas de planes de estudio y financiamiento (Regular/SEP/PIE).</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => triggerExport('compendio', 'xlsx')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded shadow transition-all cursor-pointer"
                >
                  📊 Excel (XLSX)
                </button>
                <button 
                  onClick={() => triggerExport('compendio', 'pdf')}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded shadow transition-all cursor-pointer"
                >
                  📄 Exportar PDF
                </button>
                <button 
                  onClick={() => window.print()}
                  className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded shadow transition-all cursor-pointer"
                >
                  🖨️ Imprimir
                </button>
              </div>
            </div>

            {/* Territory-wide Hours Distribution Grid Summary */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 border border-slate-100 rounded-xl p-4 bg-slate-50/50">
              {/* Column 1: Estamentos */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider border-b pb-1">Territorio: Estamentos</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 text-xs mb-0.5">
                      <span>🍎 Docentes Totales</span>
                      <span>{totalDocentesTerr} hrs ({((totalDocentesTerr / (totalDocentesTerr + totalAsistentesTerr || 1)) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-slep-blue h-2 rounded-full transition-all" style={{ width: `${(totalDocentesTerr / (totalDocentesTerr + totalAsistentesTerr || 1)) * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 text-xs mb-0.5">
                      <span>👥 Asistentes Totales</span>
                      <span>{totalAsistentesTerr} hrs ({((totalAsistentesTerr / (totalDocentesTerr + totalAsistentesTerr || 1)) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${(totalAsistentesTerr / (totalDocentesTerr + totalAsistentesTerr || 1)) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Funciones */}
              <div className="space-y-2 text-[11px]">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider border-b pb-1">Territorio: Funciones Docentes</h4>
                {[
                  { label: '💼 Directivas', value: horasDirectivasTerr, color: 'bg-rose-500' },
                  { label: '⚙️ Téc. Pedagógicas', value: horasTecPedTerr, color: 'bg-emerald-500' },
                  { label: '📊 Coord. UTP', value: horasCoordUTPTerr, color: 'bg-amber-500' },
                  { label: '🔍 Apoyo UTP', value: horasApoyoUTPTerr, color: 'bg-indigo-500' },
                  { label: '🧑‍🏫 Aula / Otras', value: horasAulaOtrasTerr, color: 'bg-slate-450' }
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-0.5">
                    <span className="font-semibold text-slate-600">{item.label}</span>
                    <span className="font-bold text-slate-800">{item.value} hrs</span>
                  </div>
                ))}
              </div>

              {/* Column 3: Financiamientos */}
              <div className="space-y-2 text-[11px]">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider border-b pb-1">Territorio: Financiamiento Docente</h4>
                {[
                  { label: 'Subv. Regular', value: regularTerr },
                  { label: 'Horas SEP', value: sepTerr },
                  { label: 'Horas PIE', value: pieTerr },
                  { label: 'Horas Proretención', value: proRetencionTerr },
                  { label: 'Liceos Bic.', value: liceoBicTerr },
                  { label: 'Otras Horas/Fondos', value: otrasFondoTerr }
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-0.5">
                    <span className="font-semibold text-slate-600">💰 {item.label}</span>
                    <span className="font-bold text-slate-800">{item.value} hrs</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex gap-2 w-full max-w-md">
              <input 
                type="text" 
                placeholder="Filtrar por RBD o Nombre..." 
                className="w-full px-3 py-1.5 border rounded-lg text-xs"
                value={searchEst}
                onChange={(e) => setSearchEst(e.target.value)}
              />
            </div>

            <div className="mt-6 overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 font-bold text-slate-600 border-b">
                  <tr>
                    <th className="p-3 pl-4">RBD</th>
                    <th className="p-3">Establecimiento</th>
                    <th className="p-3">Comuna</th>
                    <th className="p-3 text-center">Prioritarios %</th>
                    <th className="p-3 text-center">Docentes</th>
                    <th className="p-3 text-center">Asistentes</th>
                    <th className="p-3 text-center">Horas Contrato</th>
                    <th className="p-3 text-center text-slep-blue">Pedagógicas</th>
                    <th className="p-3 text-center text-slate-500">No Pedagógicas</th>
                    <th className="p-3 text-center">Regular</th>
                    <th className="p-3 text-center">SEP</th>
                    <th className="p-3 text-center">PIE</th>
                    <th className="p-3 text-center">Alertas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEstablecimientos.map(e => {
                    const escConts = contratos.filter(c => c.rbd === e.rbd);
                    const escContsIds = escConts.map(c => c.id);
                    const escFins = financiamientos.filter(f => escContsIds.includes(f.contrato_id));
                    
                    const docenteCount = new Set(escConts.map(c => c.funcionario_run).filter(run => {
                      const f = funcionarios.find(func => func.run === run);
                      return f?.estamento === 'Docente';
                    })).size;

                    const asistenteCount = new Set(escConts.map(c => c.funcionario_run).filter(run => {
                      const f = funcionarios.find(func => func.run === run);
                      return f?.estamento === 'Asistente de la Educación';
                    })).size;

                    const totalHrs = escConts.reduce((sum, c) => sum + c.horas_totales, 0);
                    const escAsigs = asignaciones.filter(a => escContsIds.includes(a.contrato_id));
                    const pedagogicasHrs = escAsigs.reduce((sum, a) => sum + a.horas, 0);
                    const noPedagogicasHrs = Math.max(0, totalHrs - pedagogicasHrs);

                    const regularHrs = escFins.filter(f => f.origen_fondo === 'Subvención Regular').reduce((sum, f) => sum + f.horas, 0);
                    const sepHrs = escFins.filter(f => f.origen_fondo === 'SEP').reduce((sum, f) => sum + f.horas, 0);
                    const pieHrs = escFins.filter(f => f.origen_fondo === 'PIE').reduce((sum, f) => sum + f.horas, 0);
                    const activeAlts = alertas.filter(a => a.rbd === e.rbd && !a.resuelta).length;

                    return (
                      <tr key={e.rbd} className="hover:bg-slate-50">
                        <td className="p-3 pl-4 font-mono font-bold text-slate-500">{e.rbd}</td>
                        <td className="p-3 font-semibold text-slate-800">
                          <button
                            onClick={() => handleManageSchool(e.rbd)}
                            className="text-slep-blue hover:text-slep-blue-hover hover:underline font-semibold text-left cursor-pointer"
                            title="Ver y Gestionar Escuela"
                          >
                            🏫 {e.nombre}
                          </button>
                        </td>
                        <td className="p-3 text-slate-600">{e.comuna}</td>
                        <td className="p-3 text-center font-bold text-slate-700">{e.ivm}%</td>
                        <td className="p-3 text-center font-semibold text-slep-blue">{docenteCount}</td>
                        <td className="p-3 text-center font-semibold text-slate-600">{asistenteCount}</td>
                        <td className="p-3 text-center font-bold text-slate-700">{totalHrs} hrs</td>
                        <td className="p-3 text-center font-bold text-slep-blue">{pedagogicasHrs} hrs</td>
                        <td className="p-3 text-center font-bold text-slate-500">{noPedagogicasHrs.toFixed(1)} hrs</td>
                        <td className="p-3 text-center text-slate-600">{regularHrs} hrs</td>
                        <td className="p-3 text-center text-slate-600">{sepHrs} hrs</td>
                        <td className="p-3 text-center text-slate-600">{pieHrs} hrs</td>
                        <td className="p-3 text-center">
                          {activeAlts > 0 ? (
                            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                              ⚠️ {activeAlts} Alertas
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                              ✓ Conciliado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {activeTab === 'dashboard' && (
        <main className="p-4 md:p-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          
          {/* Left / Center content: School and Supervisor CRUDs & Heatmap */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Heatmap & Escuelas List */}
            <div className="bg-white rounded-xl shadow border border-slate-200/60 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Mapa de Establecimientos del Territorio ({establecimientos.length})</h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Control territorial y auditoría de tutela.</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => triggerExport('dashboard', 'xlsx')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow flex items-center gap-1 cursor-pointer"
                  >
                    📊 Excel
                  </button>
                  <button
                    onClick={() => triggerExport('dashboard', 'pdf')}
                    className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow flex items-center gap-1 cursor-pointer"
                  >
                    📄 PDF
                  </button>
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
                  {selectedBulkRbd.length > 0 && (
                    <button
                      onClick={handleBulkDeleteEscuelas}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow flex items-center gap-1 cursor-pointer"
                    >
                      🗑️ Eliminar Seleccionadas ({selectedBulkRbd.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-600 uppercase border-b">
                    <tr>
                      <th className="p-3 pl-6 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredEstablecimientos.length > 0 && filteredEstablecimientos.every(e => selectedBulkRbd.includes(e.rbd))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const allFilteredRbds = filteredEstablecimientos.map(es => es.rbd);
                              setSelectedBulkRbd(prev => Array.from(new Set([...prev, ...allFilteredRbds])));
                            } else {
                              const allFilteredRbds = filteredEstablecimientos.map(es => es.rbd);
                              setSelectedBulkRbd(prev => prev.filter(r => !allFilteredRbds.includes(r)));
                            }
                          }}
                        />
                      </th>
                      <th className="p-3">RBD</th>
                      <th className="p-3">Establecimiento</th>
                      <th className="p-3 text-center">Prioritarios %</th>
                      <th className="p-3">Comuna</th>
                      <th className="p-3">Supervisión SLEP</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEstablecimientos.map(e => {
                      const supervisorList = tutelas.filter(t => t.establecimiento_rbd === e.rbd);
                      return (
                        <tr key={e.rbd} className="hover:bg-slate-50">
                          <td className="p-3 pl-6 text-center">
                            <input
                              type="checkbox"
                              checked={selectedBulkRbd.includes(e.rbd)}
                              onChange={(el) => {
                                if (el.target.checked) {
                                  setSelectedBulkRbd(prev => [...prev, e.rbd]);
                                } else {
                                  setSelectedBulkRbd(prev => prev.filter(r => r !== e.rbd));
                                }
                              }}
                            />
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-500">{e.rbd}</td>
                          <td className="p-3 font-semibold text-slate-800">
                            <button
                              onClick={() => handleManageSchool(e.rbd)}
                              className="text-slep-blue hover:text-slep-blue-hover hover:underline font-semibold text-left cursor-pointer"
                              title="Ver y Gestionar Escuela"
                            >
                              🏫 {e.nombre}
                            </button>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">{e.ivm}%</td>
                          <td className="p-3 text-slate-600">{e.comuna}</td>
                          <td className="p-3 text-slate-700">
                            {supervisorList.length > 0 ? (
                              <div className="space-y-0.5">
                                {supervisorList.map(t => {
                                  const sup = supervisores.find(s => s.run === t.profesional_run);
                                  return (
                                    <span key={t.profesional_run} className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-1 text-[10px] font-bold">
                                      👤 {sup ? sup.nombre : t.profesional_run}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Sin Asignar</span>
                            )}
                          </td>
                          <td className="p-3 text-center flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleManageSchool(e.rbd)}
                              className="text-slep-blue hover:text-slep-blue-hover font-bold text-xs bg-blue-50 border border-blue-200 px-2.5 py-1 rounded shadow cursor-pointer"
                            >
                              ⚙️ Gestionar
                            </button>
                            <button
                              onClick={() => handleDeleteEscuela(e.rbd)}
                              className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 border border-red-200 px-2.5 py-1 rounded shadow cursor-pointer"
                            >
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

            {/* School CRUD creation and Comuna Management */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* School CRUD creation */}
              <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6 lg:col-span-2">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span>🏫</span> Agregar Nuevo Establecimiento (Escuela)
                </h3>
                <form onSubmit={handleCreateEscuela} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border">
                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-500 mb-1">Nombre Escuela</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded"
                      value={newEscNombre}
                      onChange={(e) => setNewEscNombre(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">RBD Único</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded"
                      value={newEscRbd}
                      onChange={(e) => setNewEscRbd(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Comuna</label>
                    <select 
                      className="w-full p-2 bg-white border rounded"
                      value={newEscComuna}
                      onChange={(e) => setNewEscComuna(e.target.value)}
                    >
                      {comunasList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Prioritarios %</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border rounded font-bold"
                      value={newEscIvm}
                      onChange={(e) => setNewEscIvm(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="md:col-span-4 flex items-end justify-end">
                    <button type="submit" className="bg-slep-blue text-white font-bold py-2 px-6 rounded text-xs shadow cursor-pointer">
                      Agregar RBD
                    </button>
                  </div>
                </form>
              </div>

              {/* Comuna Management */}
              <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span>📍</span> Registrar Comunas del Territorio
                </h3>
                <form onSubmit={handleCreateComuna} className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border">
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Nombre Nueva Comuna</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Coihueco"
                      className="w-full p-2 border rounded font-semibold text-slate-800"
                      value={newComunaName}
                      onChange={(e) => setNewComunaName(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="w-full bg-slep-blue text-white font-bold py-2 rounded text-xs shadow cursor-pointer">
                    Registrar Comuna
                  </button>
                </form>
                
                <div className="mt-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Comunas Registradas:</span>
                  <div className="flex flex-wrap gap-1 mt-1 max-h-[80px] overflow-y-auto">
                    {comunasList.map(c => (
                      <span key={c} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1">
                        {c}
                        <button 
                          type="button"
                          onClick={() => handleDeleteComuna(c)}
                          className="text-red-500 hover:text-red-700 font-bold ml-0.5 px-0.5"
                          title="Eliminar Comuna"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Supervisor CRUD */}
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span>👥</span> Gestión de Asesores (Profesionales SLEP)
              </h3>

              <form onSubmit={handleCreateSupervisor} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border mb-4">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">RUN Asesor</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={newSupRun}
                    onChange={(e) => setNewSupRun(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={newSupNombre}
                    onChange={(e) => setNewSupNombre(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Email Institucional</label>
                  <input 
                    type="email" 
                    className="w-full p-2 border rounded"
                    value={newSupEmail}
                    onChange={(e) => setNewSupEmail(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full bg-slep-blue text-white font-bold py-2 rounded text-xs shadow">
                    Guardar Asesor
                  </button>
                </div>
              </form>

              <div className="border rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 font-bold text-slate-600">
                    <tr>
                      <th className="p-3">Asesor</th>
                      <th className="p-3">Email</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supervisores.map(s => (
                      <tr key={s.run}>
                        <td className="p-3 font-semibold text-slate-800">{s.nombre} ({s.run})</td>
                        <td className="p-3 text-slate-600">{s.email}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteSupervisor(s.run)}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tutela assignments */}
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span>🔗</span> Asignación de Tutela de Asesores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl text-xs border">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Asesor</label>
                  <select
                    className="w-full p-2 bg-white border rounded"
                    value={selectedProfRun}
                    onChange={(e) => setSelectedProfRun(e.target.value)}
                  >
                    {supervisores.map(s => (
                      <option key={s.run} value={s.run}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Establecimiento</label>
                  <select
                    className="w-full p-2 bg-white border rounded"
                    value={assignRbd}
                    onChange={(e) => setAssignRbd(e.target.value)}
                  >
                    {establecimientos.map(e => (
                      <option key={e.rbd} value={e.rbd}>{e.nombre} (RBD {e.rbd})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={handleAssignSchool} className="w-full bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark font-extrabold py-2 rounded text-xs shadow">
                    Vincular Tutela
                  </button>
                </div>
              </div>

              <div className="mt-4 border rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 font-bold text-slate-600">
                    <tr>
                      <th className="p-3">Asesor</th>
                      <th className="p-3">Escuela Supervisada</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tutelas.map(t => {
                      const esc = establecimientos.find(e => e.rbd === t.establecimiento_rbd);
                      const sup = supervisores.find(s => s.run === t.profesional_run);
                      return (
                        <tr key={`${t.profesional_run}-${t.establecimiento_rbd}`}>
                          <td className="p-3 font-semibold text-slate-800">{sup ? sup.nombre : t.profesional_run}</td>
                          <td className="p-3 text-slate-700">{esc ? esc.nombre : `RBD ${t.establecimiento_rbd}`}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleRemoveSchool(t.profesional_run, t.establecimiento_rbd)}
                              className="text-red-500 hover:text-red-700 font-bold"
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

          {/* Right Column: Files drag and drop and central statistics */}
          <div className="space-y-6">
            
            {/* Descargar Plantillas Excel */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-lg border border-slate-700/50 p-6 text-white">
              <h2 className="text-sm font-bold flex items-center gap-2 text-emerald-400">
                <span>📊</span> Plantillas Excel de Carga
              </h2>
              <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                Descarga las planillas oficiales pre-estructuradas con los formatos, columnas y guías requeridas para nutrir la base de datos del SLEP.
              </p>
              
              <div className="mt-4 space-y-2.5">
                <button 
                  onClick={() => descargarPlantillaExcel(1)}
                  className="w-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg p-2.5 text-left text-xs transition-all flex items-center justify-between hover:border-emerald-500/30 group cursor-pointer"
                >
                  <div>
                    <p className="font-bold text-slate-100 group-hover:text-emerald-400 text-xs">Planilla 1: Maestros y Configuración</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Establecimientos, Planes, Cursos, Asignaturas</p>
                  </div>
                  <span className="text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform text-xs">⬇️</span>
                </button>

                <button 
                  onClick={() => descargarPlantillaExcel(2)}
                  className="w-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg p-2.5 text-left text-xs transition-all flex items-center justify-between hover:border-emerald-500/30 group cursor-pointer"
                >
                  <div>
                    <p className="font-bold text-slate-100 group-hover:text-emerald-400 text-xs">Planilla 2: Dotación y Contratos</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Funcionarios, Contratos, Cargas Horarias en Aula</p>
                  </div>
                  <span className="text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform text-xs">⬇️</span>
                </button>

                <button 
                  onClick={() => descargarPlantillaExcel(3)}
                  className="w-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg p-2.5 text-left text-xs transition-all flex items-center justify-between hover:border-emerald-500/30 group cursor-pointer"
                >
                  <div>
                    <p className="font-bold text-slate-100 group-hover:text-emerald-400 text-xs">Planilla 3: Remuneraciones y Reemplazos</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Asistencias, Total Haberes, Licencias Médicas</p>
                  </div>
                  <span className="text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform text-xs">⬇️</span>
                </button>
              </div>
            </div>

            {/* Drag-and-Drop Uploader for CSV/JSON Docentes */}
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>📥</span> Cargar Nómina Docentes (Profesores)
              </h2>
              <p className="text-xs text-slate-500 mt-1">Sube el archivo físico `.csv`, `.json` o Excel (`.xlsx`, `.xls`) con la nómina de docentes.</p>

              <div 
                onDragEnter={handleDrag} 
                onDragOver={handleDrag} 
                onDragLeave={handleDrag} 
                onDrop={handleDrop}
                className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragActive ? 'border-slep-blue bg-blue-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".csv,.json,.xlsx,.xls"
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <span className="text-2xl block mb-2">👨‍🏫</span>
                <p className="text-xs font-bold text-slate-700">Arrastra nómina de Docentes o haz clic</p>
                <p className="text-[10px] text-slate-500 mt-1">Soporta formatos .CSV, .JSON y Excel (.xlsx, .xls)</p>
              </div>

              {importLogs && (
                <pre className="mt-3 p-2.5 bg-slate-100 border rounded text-[9px] text-slate-600 whitespace-pre-wrap">
                  {importLogs}
                </pre>
              )}
            </div>

            {/* Drag-and-Drop Uploader for CSV/JSON Asistentes */}
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>📥</span> Cargar Nómina Asistentes de la Educación
              </h2>
              <p className="text-xs text-slate-500 mt-1">Sube el archivo físico `.csv`, `.json` o Excel (`.xlsx`, `.xls`) con asistentes, psicólogos, administrativos, etc.</p>

              <div 
                onDragEnter={handleDragAsis} 
                onDragOver={handleDragAsis} 
                onDragLeave={handleDragAsis} 
                onDrop={handleDropAsis}
                className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragActiveAsis ? 'border-slep-blue bg-blue-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                }`}
                onClick={() => fileInputRefAsis.current?.click()}
              >
                <input 
                  ref={fileInputRefAsis}
                  type="file" 
                  accept=".csv,.json,.xlsx,.xls"
                  className="hidden" 
                  onChange={handleFileChangeAsis}
                />
                <span className="text-2xl block mb-2">🤝</span>
                <p className="text-xs font-bold text-slate-700">Arrastra nómina de Asistentes o haz clic</p>
                <p className="text-[10px] text-slate-500 mt-1">Soporta formatos .CSV, .JSON y Excel (.xlsx, .xls)</p>
              </div>

              {importLogsAsis && (
                <pre className="mt-3 p-2.5 bg-slate-100 border rounded text-[9px] text-slate-600 whitespace-pre-wrap">
                  {importLogsAsis}
                </pre>
              )}
            </div>

            {/* Drag-and-Drop Uploader for Establecimientos */}
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>🏢</span> Cargar Establecimientos (Colegios)
              </h2>
              <p className="text-xs text-slate-500 mt-1">Sube la planilla Excel (`.xlsx`, `.xls`) o CSV con la base de colegios (RBD, Establecimiento, Comuna).</p>

              <div 
                onDragEnter={handleDragEst} 
                onDragOver={handleDragEst} 
                onDragLeave={handleDragEst} 
                onDrop={handleDropEst}
                className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragActiveEst ? 'border-slep-blue bg-blue-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                }`}
                onClick={() => estFileInputRef.current?.click()}
              >
                <input 
                  ref={estFileInputRef}
                  type="file" 
                  accept=".csv,.xlsx,.xls"
                  className="hidden" 
                  onChange={handleFileChangeEst}
                />
                <span className="text-2xl block mb-2">🏫</span>
                <p className="text-xs font-bold text-slate-700">Arrastra planilla de Establecimientos o haz clic</p>
                <p className="text-[10px] text-slate-500 mt-1">Soporta formatos .CSV y Excel (.xlsx, .xls)</p>
              </div>

              {uploadEstLogs && (
                <pre className="mt-3 p-2.5 bg-slate-100 border rounded text-[9px] text-slate-600 whitespace-pre-wrap">
                  {uploadEstLogs}
                </pre>
              )}
            </div>

            {/* Sostenedor Curricular Governance: PlanEstudio JSON uploader */}
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>📜</span> Cargar Planes de Estudio MINEDUC (JSON)
              </h2>
              <p className="text-xs text-slate-500 mt-1">Carga decretos oficiales para todo el territorio. Control central exclusivo.</p>

              <div 
                onDragEnter={handleDragPlan} 
                onDragOver={handleDragPlan} 
                onDragLeave={handleDragPlan} 
                onDrop={handleDropPlan}
                className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragActivePlan ? 'border-slep-blue bg-blue-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                }`}
                onClick={() => planFileInputRef.current?.click()}
              >
                <input 
                  ref={planFileInputRef}
                  type="file" 
                  accept=".json"
                  className="hidden" 
                  onChange={handleFileChangePlan}
                />
                <span className="text-2xl block mb-2">⚙️</span>
                <p className="text-xs font-bold text-slate-700">Arrastra el JSON de planes oficiales o haz clic</p>
              </div>

              {planImportLogs && (
                <pre className="mt-3 p-2.5 bg-slate-100 border rounded text-[9px] text-slate-600 whitespace-pre-wrap">
                  {planImportLogs}
                </pre>
              )}
            </div>

            {/* RUN Search */}
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>🔍</span> Buscador Central de RUN
              </h2>
              
              <div className="mt-3 flex gap-2">
                <input 
                  type="text" 
                  placeholder="RUT..." 
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-xs"
                  value={searchRun}
                  onChange={(e) => setSearchRun(e.target.value)}
                />
                <button onClick={handleSearchRun} className="bg-slep-blue text-white px-3 py-1 rounded text-xs font-bold shadow">
                  Buscar
                </button>
              </div>

              {searchRunResult && (
                <div className="mt-4 bg-slate-50 p-3 rounded-lg border text-xs space-y-2">
                  <button 
                    onClick={() => handleOpenEditFuncionario(searchRunResult.funcionario)}
                    className="font-bold text-slep-blue hover:underline text-left font-bold cursor-pointer"
                  >
                    👤 {searchRunResult.funcionario.nombre}
                  </button>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Estamento: {searchRunResult.funcionario.estamento || 'Docente'}</p>
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

          </div>

          {/* Modal: View / Edit / Print Funcionario */}
          {editingFuncionario && (() => {
            const relatedCont = contratos.find(c => c.funcionario_run === editingFuncionario.run);
            const teacherAsigs = asignaciones.filter(a => a.contrato_id === relatedCont?.id);
            const leyCalculo = relatedCont && relatedCont.rbd ? (() => {
              const esc = establecimientos.find(e => e.rbd === relatedCont.rbd);
              return esc ? validarCargaDocente(relatedCont, esc, teacherAsigs, cargosPersonalizados) : null;
            })() : null;

            return (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
                  {/* Modal Header */}
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Expediente de Personal (Vista Sostenedor)</p>
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
                        <input 
                          type="text" 
                          className="w-full p-2 border rounded font-semibold text-slate-800 focus:outline-slep-blue"
                          value={editFuncCargo}
                          onChange={(e) => setEditFuncCargo(e.target.value)}
                        />
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

                    {/* Course Assignments List */}
                    {editingFuncionario.estamento === 'Docente' && teacherAsigs.length > 0 && (
                      <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                        <p className="font-bold text-slate-800 border-b pb-1 text-[11px]">Carga Horaria en Aula (Cursos y Asignaturas)</p>
                        <div className="space-y-1">
                          {teacherAsigs.map((a, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border text-[11px]">
                              <div>
                                <span className="font-bold text-slate-800">{a.curso}</span>
                                <span className="text-slate-400 mx-1.5">•</span>
                                <span className="text-slate-600 font-semibold">{a.asignatura}</span>
                              </div>
                              <span className="font-mono font-bold text-slep-blue bg-blue-50 px-2 py-0.5 rounded">{a.horas} hrs</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-2 rounded-b-2xl">
                    <button 
                      onClick={() => printFuncionarioDetail(editingFuncionario, relatedCont, editContFins, leyCalculo)}
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

        </main>
      )}

      {activeTab === 'resumenes' && (
        <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 flex flex-col gap-6 w-full text-xs">
          {(() => {
            const totalEstablecimientos = establecimientos.length;
            const totalContratosDocentes = contratos.filter(c => {
              const f = funcionarios.find(fn => fn.run === c.funcionario_run);
              return f && f.estamento === 'Docente';
            });
            const totalHorasContratadasDocentes = totalContratosDocentes.reduce((sum, c) => sum + c.horas_totales, 0);

            const totalContratosAsistentes = contratos.filter(c => {
              const f = funcionarios.find(fn => fn.run === c.funcionario_run);
              return f && f.estamento === 'Asistente de la Educación';
            });
            const totalHorasContratadasAsistentes = totalContratosAsistentes.reduce((sum, c) => sum + c.horas_totales, 0);

            const totalHorasAsignadas = asignaciones.reduce((sum, a) => sum + a.horas, 0);

            // Funding Sources Breakdown
            const totalHorasSEP = financiamientos.filter(f => f.origen_fondo === 'SEP').reduce((sum, f) => sum + f.horas, 0);
            const totalHorasPIE = financiamientos.filter(f => f.origen_fondo === 'PIE').reduce((sum, f) => sum + f.horas, 0);
            const totalHorasRegular = financiamientos.filter(f => f.origen_fondo === 'Subvención Regular').reduce((sum, f) => sum + f.horas, 0);
            const totalHorasProretencion = financiamientos.filter(f => f.origen_fondo === 'Pro-retención').reduce((sum, f) => sum + f.horas, 0);
            const totalHorasOtros = financiamientos.filter(f => !['SEP', 'PIE', 'Subvención Regular', 'Pro-retención'].includes(f.origen_fondo)).reduce((sum, f) => sum + f.horas, 0);

            // Comunas Breakdown
            const comunasSummary = comunasList.map(comName => {
              const comunaEsts = establecimientos.filter(e => e.comuna === comName);
              const rbds = comunaEsts.map(e => e.rbd);
              
              const comunaConts = contratos.filter(c => rbds.includes(c.rbd));
              const comunaContIds = comunaConts.map(c => c.id);
              
              const horasContratoDocente = comunaConts.filter(c => {
                const f = funcionarios.find(fn => fn.run === c.funcionario_run);
                return f && f.estamento === 'Docente';
              }).reduce((sum, c) => sum + c.horas_totales, 0);

              const horasContratoAsistente = comunaConts.filter(c => {
                const f = funcionarios.find(fn => fn.run === c.funcionario_run);
                return f && f.estamento === 'Asistente de la Educación';
              }).reduce((sum, c) => sum + c.horas_totales, 0);
              
              const comunaAsigs = asignaciones.filter(a => comunaContIds.includes(a.contrato_id));
              const totalAsigHours = comunaAsigs.reduce((sum, a) => sum + a.horas, 0);
              
              const comunaFins = financiamientos.filter(f => comunaContIds.includes(f.contrato_id));
              const sepHours = comunaFins.filter(f => f.origen_fondo === 'SEP').reduce((sum, f) => sum + f.horas, 0);
              const pieHours = comunaFins.filter(f => f.origen_fondo === 'PIE').reduce((sum, f) => sum + f.horas, 0);
              const regularHours = comunaFins.filter(f => f.origen_fondo === 'Subvención Regular').reduce((sum, f) => sum + f.horas, 0);
              const otherHours = comunaFins.filter(f => !['SEP', 'PIE', 'Subvención Regular'].includes(f.origen_fondo)).reduce((sum, f) => sum + f.horas, 0);

              return {
                comuna: comName,
                establecimientos: comunaEsts.length,
                horasDocentes: horasContratoDocente,
                horasAsistentes: horasContratoAsistente,
                horasAsignadas: totalAsigHours,
                sepHours,
                pieHours,
                regularHours,
                otherHours
              };
            });

            // Subject-wise breakdown (Horas por Asignatura) - filtered by selected comunas
            const filteredAsignaciones = asignaciones.filter(a => {
              const cont = contratos.find(c => c.id === a.contrato_id);
              if (!cont) return false;
              const est = establecimientos.find(e => e.rbd === cont.rbd);
              if (!est || !est.comuna) return false;
              return resumenSelectedComunas.includes(est.comuna);
            });

            const subjectsMap: { [key: string]: number } = {};
            filteredAsignaciones.forEach(a => {
              subjectsMap[a.asignatura] = (subjectsMap[a.asignatura] || 0) + a.horas;
            });
            const subjectsSorted = Object.entries(subjectsMap)
              .map(([nombre, horas]) => ({ nombre, horas }))
              .sort((a, b) => b.horas - a.horas);

            // Spare Hours (Docentes con horas de contrato sobrantes)
            const teachersWithSpare = funcionarios
              .filter(f => f.estamento === 'Docente')
              .map(f => {
                const teacherConts = contratos.filter(c => c.funcionario_run === f.run);
                const contractIds = teacherConts.map(c => c.id);
                const totalCont = teacherConts.reduce((sum, c) => sum + c.horas_totales, 0);
                
                const totalAsig = asignaciones.filter(a => contractIds.includes(a.contrato_id)).reduce((sum, a) => sum + a.horas, 0);
                const totalCargs = cargosPersonalizados.filter(cg => cg.funcionario_run === f.run).reduce((sum, cg) => sum + cg.horas, 0);
                
                const spareHours = totalCont - (totalAsig + totalCargs);
                const mainRbd = teacherConts.length > 0 ? teacherConts[0].rbd : 'Desconocido';
                const school = establecimientos.find(e => e.rbd === mainRbd);
                const schoolName = school ? school.nombre : `RBD ${mainRbd}`;
                const schoolComuna = school ? school.comuna : '';
                
                return {
                  run: f.run,
                  nombre: f.nombre,
                  escuela: schoolName,
                  comuna: schoolComuna,
                  horasContrato: totalCont,
                  horasAsignadas: totalAsig,
                  horasCargos: totalCargs,
                  horasSobrantes: spareHours > 0 ? Number(spareHours.toFixed(1)) : 0
                };
              })
              .filter(t => t.horasSobrantes > 0.1 && t.comuna && resumenSelectedComunas.includes(t.comuna))
              .sort((a, b) => b.horasSobrantes - a.horasSobrantes);

            const totalSobrantesTerritorio = teachersWithSpare.reduce((sum, t) => sum + t.horasSobrantes, 0);

            // Course study plan overflow alerts
            const courseAlerts = todosLosCursos.map(curso => {
              const plan = planesEstudio.find(p => p.nivel === curso.nivel && p.regimen === curso.regimen);
              const limit = plan ? plan.horasObligatorias : 38;
              
              const school = establecimientos.find(e => e.rbd === curso.rbd);
              
              const schoolConts = contratos.filter(c => c.rbd === curso.rbd);
              const schoolContIds = schoolConts.map(c => c.id);
              const courseAsigs = asignaciones.filter(a => schoolContIds.includes(a.contrato_id) && a.curso === curso.nombre);
              const assignedHours = courseAsigs.reduce((sum, a) => sum + a.horas, 0);
              
              const delta = assignedHours - limit;
              return {
                rbd: curso.rbd,
                escuela: school ? school.nombre : `RBD ${curso.rbd}`,
                comuna: school ? school.comuna : '',
                curso: curso.nombre,
                nivel: curso.nivel,
                regimen: curso.regimen,
                limitePlan: limit,
                horasAsignadas: assignedHours,
                diferencia: delta,
                esExceso: delta > 0.1
              };
            }).filter(c => c.esExceso && c.comuna && resumenSelectedComunas.includes(c.comuna));

            return (
              <div className="space-y-6">
                {/* Header */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">📊 Panel de Resúmenes y Análisis Consolidado</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Reportes agregados territoriales por comunas, asignaturas y auditorías horarias.</p>
                  </div>
                  
                  {/* Local Tabs Selection */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border self-start md:self-center">
                    <button
                      onClick={() => setResumenSubTab('territorio')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        resumenSubTab === 'territorio' ? 'bg-white text-slep-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      🗺️ Territorio & Comunas
                    </button>
                    <button
                      onClick={() => setResumenSubTab('asignaturas')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        resumenSubTab === 'asignaturas' ? 'bg-white text-slep-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      📚 Por Asignatura
                    </button>
                    <button
                      onClick={() => setResumenSubTab('disponibilidad')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        resumenSubTab === 'disponibilidad' ? 'bg-white text-slep-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      ⏳ Horas Disponibles
                    </button>
                    <button
                      onClick={() => setResumenSubTab('alertas')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        resumenSubTab === 'alertas' ? 'bg-white text-slep-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      🚨 Alertas de Exceso ({courseAlerts.length})
                    </button>
                  </div>
                </div>

                {/* Checkboxes Filter for Comunas */}
                {['asignaturas', 'disponibilidad', 'alertas'].includes(resumenSubTab) && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <span>📍</span> Filtrar por Comuna(s)
                      </p>
                      <div className="flex gap-3 text-[10px] font-bold text-slep-blue">
                        <button 
                          onClick={() => setResumenSelectedComunas(comunasList)}
                          className="hover:underline cursor-pointer bg-transparent border-0 p-0 text-xs text-slep-blue font-bold"
                        >
                          Seleccionar todas
                        </button>
                        <span className="text-slate-300">|</span>
                        <button 
                          onClick={() => setResumenSelectedComunas([])}
                          className="hover:underline cursor-pointer bg-transparent border-0 p-0 text-xs text-slep-blue font-bold"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {comunasList.map(com => (
                        <label key={com} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                          <input 
                            type="checkbox"
                            checked={resumenSelectedComunas.includes(com)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setResumenSelectedComunas([...resumenSelectedComunas, com]);
                              } else {
                                setResumenSelectedComunas(resumenSelectedComunas.filter(x => x !== com));
                              }
                            }}
                            className="rounded border-slate-300 text-slep-blue focus:ring-slep-blue w-3.5 h-3.5"
                          />
                          <span>{com}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab Content: Territorio & Comunas */}
                {resumenSubTab === 'territorio' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Establecimientos</span>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-xl font-black text-slate-800">{totalEstablecimientos}</span>
                          <span className="text-xs text-slate-400">escuelas</span>
                        </div>
                      </div>
                      <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Total Horas Docentes</span>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-xl font-black text-slep-blue">{totalHorasContratadasDocentes}</span>
                          <span className="text-xs text-slate-400">horas contratas</span>
                        </div>
                      </div>
                      <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Total Horas Asistentes</span>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-xl font-black text-purple-650">{totalHorasContratadasAsistentes}</span>
                          <span className="text-xs text-slate-400">horas contratas</span>
                        </div>
                      </div>
                      <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Carga en Aula</span>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-xl font-black text-emerald-600">{totalHorasAsignadas}</span>
                          <span className="text-xs text-slate-400">({((totalHorasAsignadas / ((totalHorasContratadasDocentes + totalHorasContratadasAsistentes) || 1)) * 100).toFixed(0)}% de carga)</span>
                        </div>
                      </div>
                      <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Horas Sobrantes (UATP)</span>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-xl font-black text-amber-600">{totalSobrantesTerritorio.toFixed(1)}</span>
                          <span className="text-xs text-slate-400">disponibles</span>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown by Funding Source */}
                    <div className="bg-white border rounded-xl p-6 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Financiamientos Consolidados del Territorio</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                          <p className="text-[9px] uppercase font-bold text-blue-500">Subvención Regular</p>
                          <p className="text-base font-black text-blue-900 mt-1">{totalHorasRegular} hrs</p>
                        </div>
                        <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                          <p className="text-[9px] uppercase font-bold text-orange-500">SEP</p>
                          <p className="text-base font-black text-orange-900 mt-1">{totalHorasSEP} hrs</p>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                          <p className="text-[9px] uppercase font-bold text-emerald-500">PIE</p>
                          <p className="text-base font-black text-emerald-900 mt-1">{totalHorasPIE} hrs</p>
                        </div>
                        <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                          <p className="text-[9px] uppercase font-bold text-purple-500">Proretención</p>
                          <p className="text-base font-black text-purple-900 mt-1">{totalHorasProretencion} hrs</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-[9px] uppercase font-bold text-slate-500">Otros Fondos</p>
                          <p className="text-base font-black text-slate-900 mt-1">{totalHorasOtros} hrs</p>
                        </div>
                      </div>
                    </div>

                    {/* Comunas Table */}
                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                      <div className="p-4 border-b bg-slate-50">
                        <h3 className="font-bold text-slate-800">Desglose de Horas por Comuna</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                              <th className="p-4">Comuna</th>
                              <th className="p-4 text-center">Escuelas</th>
                              <th className="p-4 text-blue-800">Horas Docente</th>
                              <th className="p-4 text-purple-800">Horas Asistente</th>
                              <th className="p-4">Horas Aula</th>
                              <th className="p-4 text-blue-600">Regular</th>
                              <th className="p-4 text-orange-600">SEP</th>
                              <th className="p-4 text-emerald-600">PIE</th>
                              <th className="p-4 text-slate-500">Otros</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {comunasSummary.map(c => (
                              <tr key={c.comuna} className="hover:bg-slate-50/50">
                                <td className="p-4 font-bold text-slate-800">{c.comuna}</td>
                                <td className="p-4 text-center font-bold text-slate-500">{c.establecimientos}</td>
                                <td className="p-4 font-mono font-bold text-blue-800">{c.horasDocentes} hrs</td>
                                <td className="p-4 font-mono font-bold text-purple-800">{c.horasAsistentes} hrs</td>
                                <td className="p-4 font-mono font-bold text-emerald-600">{c.horasAsignadas} hrs</td>
                                <td className="p-4 font-mono text-blue-600">{c.regularHours} hrs</td>
                                <td className="p-4 font-mono text-orange-600">{c.sepHours} hrs</td>
                                <td className="p-4 font-mono text-emerald-600">{c.pieHours} hrs</td>
                                <td className="p-4 font-mono text-slate-500">{c.otherHours} hrs</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content: Por Asignatura */}
                {resumenSubTab === 'asignaturas' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">Filtro de Asignación por Asignatura</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Seleccione una asignatura para auditar en qué establecimientos y por qué docentes se ejecuta.</p>
                      </div>
                      <select
                        value={resumenSelectedAsignatura}
                        onChange={(e) => setResumenSelectedAsignatura(e.target.value)}
                        className="px-3 py-2 border rounded-xl text-xs bg-slate-50 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slep-blue cursor-pointer"
                      >
                        <option value="Todas">-- Todas las Asignaturas (Consolidado) --</option>
                        {subjectsSorted.map(s => (
                          <option key={s.nombre} value={s.nombre}>{s.nombre} ({s.horas} hrs)</option>
                        ))}
                      </select>
                    </div>

                    {resumenSelectedAsignatura === 'Todas' ? (
                      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b bg-slate-50">
                          <h3 className="font-bold text-slate-850">Carga Horaria Semanal Ejecutada por Asignatura</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">Suma total de horas de aula asignadas en el territorio.</p>
                        </div>
                        <div className="p-6">
                          {subjectsSorted.length === 0 ? (
                            <p className="text-slate-400 italic text-center py-8">No hay asignaciones de aula registradas en el sistema.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                {subjectsSorted.slice(0, Math.ceil(subjectsSorted.length / 2)).map((s, idx) => (
                                  <div key={idx} className="flex flex-col gap-1 border-b pb-2">
                                    <div className="flex justify-between font-bold text-slate-700">
                                      <span>{s.nombre}</span>
                                      <span className="font-mono font-black text-slep-blue">{s.horas} hrs</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                                      <div 
                                        className="bg-slep-blue h-1.5 rounded-full" 
                                        style={{ width: `${Math.min(100, (s.horas / (totalHorasAsignadas || 1)) * 100 * 3)}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="space-y-3">
                                {subjectsSorted.slice(Math.ceil(subjectsSorted.length / 2)).map((s, idx) => (
                                  <div key={idx} className="flex flex-col gap-1 border-b pb-2">
                                    <div className="flex justify-between font-bold text-slate-700">
                                      <span>{s.nombre}</span>
                                      <span className="font-mono font-black text-slep-blue">{s.horas} hrs</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                                      <div 
                                        className="bg-slep-blue h-1.5 rounded-full" 
                                        style={{ width: `${Math.min(100, (s.horas / (totalHorasAsignadas || 1)) * 100 * 3)}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-200">
                        {(() => {
                          const targetAsigs = filteredAsignaciones.filter(a => a.asignatura === resumenSelectedAsignatura);
                          const totalSubjectHours = targetAsigs.reduce((sum, a) => sum + a.horas, 0);
                          
                          const detailList = targetAsigs.map(a => {
                            const cont = contratos.find(c => c.id === a.contrato_id);
                            const school = cont ? establecimientos.find(e => e.rbd === cont.rbd) : null;
                            const teacher = cont ? funcionarios.find(f => f.run === cont.funcionario_run) : null;
                            return {
                              rbd: cont ? cont.rbd : 'N/A',
                              escuela: school ? school.nombre : 'N/A',
                              curso: a.curso,
                              docente: teacher ? teacher.nombre : 'Sin Asignar',
                              run: cont ? cont.funcionario_run : '',
                              horas: a.horas
                            };
                          }).sort((a, b) => b.horas - a.horas);

                          return (
                            <>
                              <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                                <div>
                                  <h3 className="font-bold text-slate-800">Detalle de Ejecución: {resumenSelectedAsignatura}</h3>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Listado de asignaciones de aula para esta asignatura específica.</p>
                                </div>
                                <span className="bg-blue-100 text-blue-800 font-mono font-bold px-3 py-1 rounded text-xs">
                                  Total Horas: {totalSubjectHours} hrs
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                {detailList.length === 0 ? (
                                  <p className="text-slate-400 italic text-center py-8">No hay horas asignadas para esta asignatura.</p>
                                ) : (
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                                        <th className="p-3 pl-6">Establecimiento</th>
                                        <th className="p-3">Curso</th>
                                        <th className="p-3">Docente Asignado</th>
                                        <th className="p-3 text-right pr-6">Horas Ejecutadas</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                      {detailList.map((d, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                          <td className="p-3 pl-6">
                                            <p className="font-bold text-slate-800">{d.escuela}</p>
                                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">RBD {d.rbd}</p>
                                          </td>
                                          <td className="p-3">
                                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border">{d.curso}</span>
                                          </td>
                                          <td className="p-3">
                                            <p className="font-bold text-slate-700">{d.docente}</p>
                                            <p className="text-[9px] text-slate-400 mt-0.5">{d.run}</p>
                                          </td>
                                          <td className="p-3 text-right pr-6 font-mono font-bold text-slep-blue">
                                            {d.horas} hrs
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Content: Horas Disponibles */}
                {resumenSubTab === 'disponibilidad' && (
                  <div className="bg-white border rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-200">
                    <div className="p-4 border-b bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-800">Docentes con Horas Sobrantes de Contrato</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Docentes con contratos vigentes cuyas asignaciones en aula y cargos no cubren su carga contratada.</p>
                      </div>
                      <span className="bg-amber-100 text-amber-800 text-[10px] uppercase font-bold px-2.5 py-1 rounded-full">
                        Total Disponibilidad: {totalSobrantesTerritorio.toFixed(1)} hrs
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      {teachersWithSpare.length === 0 ? (
                        <p className="text-slate-400 italic text-center py-12">✓ Todos los docentes tienen asignada su carga horaria contractual completa.</p>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                              <th className="p-4">Funcionario</th>
                              <th className="p-4">Establecimiento Principal</th>
                              <th className="p-4">Horas Contrato</th>
                              <th className="p-4">Horas Asignadas</th>
                              <th className="p-4">Horas Cargos</th>
                              <th className="p-4 text-amber-600">Horas Sobrantes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {teachersWithSpare.map(t => (
                              <tr key={t.run} className="hover:bg-slate-50/50">
                                <td className="p-4">
                                  <p className="font-bold text-slate-800">{t.nombre}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{t.run}</p>
                                </td>
                                <td className="p-4 text-slate-500 font-bold">{t.escuela}</td>
                                <td className="p-4 font-mono font-bold">{t.horasContrato} hrs</td>
                                <td className="p-4 font-mono">{t.horasAsignadas} hrs</td>
                                <td className="p-4 font-mono">{t.horasCargos} hrs</td>
                                <td className="p-4">
                                  <span className="bg-amber-50 text-amber-700 font-mono font-bold px-2 py-0.5 rounded border border-amber-200">
                                    +{t.horasSobrantes} hrs
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab Content: Alertas de Exceso */}
                {resumenSubTab === 'alertas' && (
                  <div className="bg-white border rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-200">
                    <div className="p-4 border-b bg-slate-50">
                      <h3 className="font-bold text-slate-800">Cursos Excedidos de Horas (vs Plan de Estudio)</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Auditoría automática de sobre-asignación: cursos que superan las horas obligatorias definidas por el MINEDUC.</p>
                    </div>
                    <div className="overflow-x-auto">
                      {courseAlerts.length === 0 ? (
                        <p className="text-emerald-600 font-bold text-center py-12">✓ Todos los cursos cumplen con el límite de horas del plan de estudio.</p>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                              <th className="p-4">Establecimiento</th>
                              <th className="p-4">Curso</th>
                              <th className="p-4">Nivel / Régimen</th>
                              <th className="p-4 text-center">Límite Plan</th>
                              <th className="p-4 text-center">Horas Asignadas</th>
                              <th className="p-4 text-red-600 text-right">Exceso</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {courseAlerts.map((c, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="p-4 font-bold text-slate-800">{c.escuela}</td>
                                <td className="p-4">
                                  <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold border border-red-100">{c.curso}</span>
                                </td>
                                <td className="p-4 text-slate-500">{c.nivel} ({c.regimen})</td>
                                <td className="p-4 text-center font-mono font-bold text-slate-500">{c.limitePlan} hrs</td>
                                <td className="p-4 text-center font-mono font-bold text-red-600">{c.horasAsignadas} hrs</td>
                                <td className="p-4 text-right">
                                  <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded font-black">
                                    +{c.diferencia.toFixed(1)} hrs
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </main>
      )}

      {activeTab === 'conciliacion' && (
        <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 flex flex-col gap-6 w-full text-xs">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">⚖️ Conciliación de Carga Horaria Docente (Ley 20.903)</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Listado de docentes con horas de contrato vacantes (horas sin destinar a aula ni a planificación proporcional).
            </p>
          </div>

          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              {(() => {
                const docDocs = funcionarios.filter(f => f.estamento === 'Docente');
                const listWithVacantes = docDocs.map(f => {
                  const carga = calcularCargaDocente(f, contratos, establecimientos, asignaciones);
                  return {
                    funcionario: f,
                    ...carga
                  };
                }).filter(x => x.horasNoDestinadas > 0.05)
                  .sort((a, b) => b.horasNoDestinadas - a.horasNoDestinadas);

                if (listWithVacantes.length === 0) {
                  return (
                    <div className="p-12 text-center text-slate-400 italic">
                      ✓ Todos los docentes tienen su jornada horaria conciliada y asignada al 100%.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                        <th className="p-4 pl-6">Funcionario</th>
                        <th className="p-4">Total Contrato</th>
                        <th className="p-4">Horas Aula (Lectivas)</th>
                        <th className="p-4">Prop. No Lectiva (Planificación)</th>
                        <th className="p-4 text-amber-700">Horas Vacantes (Sin Asignar)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {listWithVacantes.map(x => (
                        <tr 
                          key={x.funcionario.run} 
                          className="bg-amber-50/40 border-l-4 border-l-amber-500 hover:bg-amber-100/50 transition-colors"
                        >
                          <td className="p-4 pl-6">
                            <p className="font-bold text-slate-800">{x.funcionario.nombre}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{x.funcionario.run}</p>
                          </td>
                          <td className="p-4 font-mono font-bold">{x.horasContrato} hrs</td>
                          <td className="p-4 font-mono text-emerald-600">{x.horasAula} hrs</td>
                          <td className="p-4 font-mono text-blue-600">{x.horasNoLectivas} hrs</td>
                          <td className="p-4">
                            <span className="bg-amber-100 text-amber-800 font-mono font-black px-2.5 py-1 rounded border border-amber-200">
                              {x.horasNoDestinadas} hrs vacantes
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </main>
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

      {/* Ingestion Confirmation & Schools Selection Modal */}
      {showConfirmModal && pendingIngest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>⚖️</span> Confirmar Ingesta de Datos (Excel / CSV)
                </h3>
                <p className="text-xs text-slate-500 mt-1">Valide la dotación detectada y seleccione los establecimientos a importar.</p>
              </div>
              <button 
                onClick={() => {
                  if (ingestProgress === null) {
                    setShowConfirmModal(false);
                    setPendingIngest(null);
                  }
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
                disabled={ingestProgress !== null}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Funcionarios Detectados</span>
                  <span className="text-base font-bold text-slate-800">{pendingIngest.funcionarios.length}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Contratos Detectados</span>
                  <span className="text-base font-bold text-slate-800">{pendingIngest.contratos.length}</span>
                </div>
              </div>

              {/* Comunas Selector */}
              {(() => {
                const uniqueComunas = Array.from(new Set(
                  pendingIngest.schoolsList.map(rbd => {
                    const est = establecimientos.find(e => e.rbd === rbd) || pendingIngest.establecimientos.find(e => e.rbd === rbd);
                    return est?.comuna;
                  }).filter(Boolean)
                ));

                if (uniqueComunas.length <= 1) return null;

                return (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-500">Selección rápida por Comuna:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {uniqueComunas.map(comuna => {
                        const rbdListForComuna = pendingIngest.schoolsList.filter(rbd => {
                          const est = establecimientos.find(e => e.rbd === rbd) || pendingIngest.establecimientos.find(e => e.rbd === rbd);
                          return est?.comuna === comuna;
                        });

                        const isAllSelected = rbdListForComuna.every(rbd => pendingIngest.selectedSchools.includes(rbd));
                        const isSomeSelected = rbdListForComuna.some(rbd => pendingIngest.selectedSchools.includes(rbd)) && !isAllSelected;

                        return (
                          <button
                            key={comuna}
                            type="button"
                            disabled={ingestProgress !== null}
                            onClick={() => {
                              let updated = [...pendingIngest.selectedSchools];
                              if (isAllSelected) {
                                updated = updated.filter(rbd => !rbdListForComuna.includes(rbd));
                              } else {
                                updated = Array.from(new Set([...updated, ...rbdListForComuna]));
                              }
                              setPendingIngest(prev => prev ? { ...prev, selectedSchools: updated } : null);
                            }}
                            className={`px-2.5 py-1 text-[10px] rounded-md font-bold transition-all border cursor-pointer ${
                              isAllSelected 
                                ? 'bg-slep-blue text-white border-slep-blue' 
                                : isSomeSelected
                                ? 'bg-blue-50 text-slep-blue border-blue-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            📍 {comuna} ({rbdListForComuna.length})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Seleccionar Establecimientos a Importar</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setPendingIngest(prev => prev ? { ...prev, selectedSchools: prev.schoolsList } : null)}
                      className="text-[10px] text-slep-blue font-bold hover:underline cursor-pointer"
                      disabled={ingestProgress !== null}
                    >
                      Todos
                    </button>
                    <span className="text-slate-300 text-[10px]">|</span>
                    <button 
                      onClick={() => setPendingIngest(prev => prev ? { ...prev, selectedSchools: [] } : null)}
                      className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer"
                      disabled={ingestProgress !== null}
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 p-2 bg-slate-50">
                  {pendingIngest.schoolsList.map(rbd => {
                    const estObj = establecimientos.find(e => e.rbd === rbd) || pendingIngest.establecimientos.find(e => e.rbd === rbd);
                    const name = (estObj && estObj.nombre) ? estObj.nombre : `Colegio / RBD ${rbd}`;
                    const isChecked = pendingIngest.selectedSchools.includes(rbd);
                    
                    const schoolFuncs = pendingIngest.funcionarios.filter(f => 
                      pendingIngest.contratos.some(c => c.funcionario_run === f.run && c.rbd === rbd)
                    ).length;
                    const schoolConts = pendingIngest.contratos.filter(c => c.rbd === rbd).length;
                    
                    return (
                      <label 
                        key={rbd} 
                        className="flex items-start gap-3 p-2 hover:bg-slate-100/50 cursor-pointer text-xs transition-colors rounded"
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          disabled={ingestProgress !== null}
                          onChange={(e) => {
                            const updated = e.target.checked 
                              ? [...pendingIngest.selectedSchools, rbd]
                              : pendingIngest.selectedSchools.filter(s => s !== rbd);
                            setPendingIngest(prev => prev ? { ...prev, selectedSchools: updated } : null);
                          }}
                          className="mt-0.5 rounded text-slep-blue focus:ring-slep-blue"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block">{name}</span>
                          <div className="flex gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>RBD: <span className="font-mono">{rbd}</span></span>
                            <span>•</span>
                            <span>{schoolFuncs} {schoolFuncs === 1 ? 'Funcionario' : 'Funcionarios'}</span>
                            <span>•</span>
                            <span>{schoolConts} {schoolConts === 1 ? 'Contrato' : 'Contratos'}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                  {pendingIngest.schoolsList.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      No se detectaron establecimientos específicos o contratos en la hoja activa.
                    </div>
                  )}
                </div>
              </div>

              {ingestProgress !== null && (
                <div className="bg-blue-50/50 border border-blue-200/50 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-bold">Procesando ingesta...</span>
                    <span className="font-mono text-slep-blue font-black">{ingestProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-slep-blue h-2 rounded-full transition-all duration-300" style={{ width: `${ingestProgress}%` }}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center leading-none">Por favor, no cierre esta ventana hasta finalizar.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex gap-3">
              <button 
                type="button"
                disabled={ingestProgress !== null}
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingIngest(null);
                }}
                className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-lg text-xs cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button 
                type="button"
                disabled={ingestProgress !== null || pendingIngest.selectedSchools.length === 0}
                onClick={handleConfirmIngest}
                className="flex-1 bg-slep-blue hover:bg-slep-blue-hover text-white font-bold py-2.5 rounded-lg text-xs cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                Confirmar e Iniciar Ingesta
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
