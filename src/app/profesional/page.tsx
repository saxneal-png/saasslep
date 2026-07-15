'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, dbLocal, supabase } from '@/lib/supabase';

import { 
  Establecimiento, 
  Contrato, 
  FinanciamientoContrato, 
  AlertaConciliacion,
  AsignacionAula,
  Funcionario,
  RegistroRemuneracion
} from '@/lib/types';
import { parsearNominaCsv, parsearRemuneracionesCsv, parsearArchivoExcelOJson } from '@/lib/csvParser';
import { conciliarFuncionario, calcularCargaDocente } from '@/lib/rulesEngine';

export default function ProfesionalDashboard() {
  const router = useRouter();
  const [profesionalRun, setProfesionalRun] = useState('11.111.111-1');
  const [escuelasAsignadasRbd, setEscuelasAsignadasRbd] = useState<string[]>([]);
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [financiamientos, setFinanciamientos] = useState<FinanciamientoContrato[]>([]);
  const [alertas, setAlertas] = useState<AlertaConciliacion[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAula[]>([]);

  // Drag-and-drop
  const [dragActive, setDragActive] = useState(false);
  const [importLogs, setImportLogs] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Asistentes Drag-and-drop
  const [dragActiveAsis, setDragActiveAsis] = useState(false);
  const [importLogsAsis, setImportLogsAsis] = useState('');
  const fileInputRefAsis = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'compendio' | 'dotacion' | 'finanzas' | 'conciliacion'>('dashboard');
  const [funcionarios, setFuncionarios] = useState<any[]>([]);

  // Local filters
  const [searchEst, setSearchEst] = useState('');
  const [selectedDotacionRbd, setSelectedDotacionRbd] = useState<string>('');
  
  // Finanzas states
  const [remuneraciones, setRemuneraciones] = useState<RegistroRemuneracion[]>([]);
  const [uploadRemunLogs, setUploadRemunLogs] = useState('');
  const remunFileInputRef = useRef<HTMLInputElement>(null);
  const [filtroDiscrepancias, setFiltroDiscrepancias] = useState(false);
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
        { key: 'establecimiento', label: 'Establecimiento', checked: true }
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
    } else if (tab === 'dotacion') {
      cols = [
        { key: 'run', label: 'RUT / RUN', checked: true },
        { key: 'nombre', label: 'Nombre Completo', checked: true },
        { key: 'estamento', label: 'Estamento', checked: true },
        { key: 'cargo', label: 'Función Principal', checked: true },
        { key: 'horas', label: 'Horas Totales', checked: true },
        { key: 'estado', label: 'Estado', checked: true }
      ];
    } else if (tab === 'finanzas') {
      cols = [
        { key: 'run', label: 'Funcionario / RUN', checked: true },
        { key: 'estamento', label: 'Estamento', checked: true },
        { key: 'contratadas', label: 'Horas Contratadas', checked: true },
        { key: 'aula', label: 'Horas en Aula', checked: true },
        { key: 'pagadas', label: 'Horas Pagadas', checked: true },
        { key: 'auditoria', label: 'Estado de Auditoría / Descalce', checked: true }
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
    alert(`📥 Descargando reporte de la pestaña "${exportModal.tab.toUpperCase()}" (Supervisión Técnica) en formato ${exportModal.format.toUpperCase()}...\n\nColumnas seleccionadas:\n- ${activeCols.join('\n- ')}`);
    setExportModal({ ...exportModal, isOpen: false });
  };



  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let interval: any;
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('slep_sim_role');
      if (role !== 'profesional_slep') {
        if (role === 'sostenedor_maestro') {
          router.push('/sostenedor');
        } else if (role === 'director_escuela') {
          router.push('/escuela');
        } else {
          router.push('/');
        }
      } else {
        setAuthorized(true);
        const run = localStorage.getItem('slep_sim_run') || '11.111.111-1';
        setProfesionalRun(run);

        interval = setInterval(async () => {
          const updated = await api.pullCloudSync();
          if (updated) {
            // Trigger state reload by calling the loadData logic
            const runVal = localStorage.getItem('slep_sim_run') || '11.111.111-1';
            setProfesionalRun('');
            setTimeout(() => setProfesionalRun(runVal), 50);
          }
        }, 5000);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  async function loadData() {
    if (!profesionalRun) return;

    await api.pullCloudSync();
    const rbds = await api.getTutelasPorProfesional(profesionalRun);
    setEscuelasAsignadasRbd(rbds);

    const [allEsts, allConts, funcs, allAlts, rems] = await Promise.all([
      api.getEstablecimientos(),
      api.getContratos(),
      api.getFuncionarios(),
      api.getAlertas(),
      api.getRemuneraciones()
    ]);

    const filteredEsts = allEsts.filter(e => rbds.includes(e.rbd));
    setEstablecimientos(filteredEsts);

    const filteredConts = allConts.filter(c => rbds.includes(c.rbd));
    setContratos(filteredConts);

    setFuncionarios(funcs);

    const filteredAlts = allAlts.filter(a => rbds.includes(a.rbd));
    setAlertas(filteredAlts);

    const finsArrays = await Promise.all(
      filteredConts.map(c => api.getFinanciamientosPorContrato(c.id))
    );
    const fins = finsArrays.flat();
    setFinanciamientos(fins);

    const allAsigs = dbLocal.asignacionesAula;
    setAsignaciones(allAsigs);
    setRemuneraciones(rems);
  }

  // Realtime Supabase Channels Subscription for Asesor (filtered by assigned RBDs in callback)
  useEffect(() => {
    if (!profesionalRun || escuelasAsignadasRbd.length === 0) return;

    const channel = supabase
      .channel(`asesor-realtime-${profesionalRun}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contratos' },
        (payload: any) => {
          console.log('🔥 Cambios en contratos recibidos por canal realtime (Asesor):', payload);
          const record = payload.eventType === 'DELETE' ? payload.old : payload.new;
          if (record && escuelasAsignadasRbd.includes(record.rbd)) {
            loadData();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'asignaciones_aula' },
        (payload: any) => {
          console.log('🔥 Cambios en asignaciones recibidos por canal realtime (Asesor):', payload);
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alertas_conciliacion' },
        (payload: any) => {
          console.log('🔥 Cambios en alertas recibidos por canal realtime (Asesor):', payload);
          const record = payload.eventType === 'DELETE' ? payload.old : payload.new;
          if (record && escuelasAsignadasRbd.includes(record.rbd)) {
            loadData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profesionalRun, escuelasAsignadasRbd]);

  useEffect(() => {
    loadData();
  }, [profesionalRun]);

  useEffect(() => {
    if (escuelasAsignadasRbd.length > 0 && !selectedDotacionRbd) {
      setSelectedDotacionRbd(escuelasAsignadasRbd[0]);
    }
  }, [escuelasAsignadasRbd, selectedDotacionRbd]);

  // Handle click on delegate school administration
  const handleAdministrarEscuela = (rbd: string) => {
    if (typeof window !== 'undefined') {
      // Set the simulated school and tell school page we are in supervisor/delegated mode
      localStorage.setItem('slep_sim_rbd', rbd);
      localStorage.setItem('slep_sim_role', 'director_escuela'); // Temporarily assume role to access page
      localStorage.setItem('slep_supervisor_mode', 'true'); // Flag to return to supervisor panel
      router.push('/escuela');
    }
  };

  // Drag-and-drop files
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

        const parsed = parsearArchivoExcelOJson(
          buffer,
          file.name,
          escuelasAsignadasRbd[0] || '10202',
          controlPrevioMock,
          targetEstamento,
          schoolMap
        );

        if (parsed.establecimientos && parsed.establecimientos.length > 0) {
          for (const est of parsed.establecimientos) {
            if (est.comuna) {
              await api.addComuna(est.comuna);
            }
            await api.upsertEstablecimiento(est);
          }
        }

        const invalidRows = parsed.contratos.filter(c => !escuelasAsignadasRbd.includes(c.rbd));
        if (invalidRows.length > 0) {
          const badRbds = Array.from(new Set(invalidRows.map(c => c.rbd)));
          alert(`❌ Error de Permiso: No tiene autorización para subir nóminas de los establecimientos con RBD: ${badRbds.join(', ')}. Solo puede administrar las escuelas asignadas a su tutela.`);
          return;
        }

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

        const allConts = await api.getContratos();
        const filteredConts = allConts.filter(c => escuelasAsignadasRbd.includes(c.rbd));
        setContratos(filteredConts);

        const allAlts = await api.getAlertas();
        const filteredAlts = allAlts.filter(a => escuelasAsignadasRbd.includes(a.rbd));
        setAlertas(filteredAlts);

        setImportLogs(`✅ Éxito: Se procesaron ${parsed.contratos.length} registros (${targetEstamento})${parsed.establecimientos?.length ? `, ${parsed.establecimientos.length} establecimientos` : ''} para tus escuelas supervisadas.`);
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

        const parsed = parsearArchivoExcelOJson(
          buffer,
          file.name,
          escuelasAsignadasRbd[0] || '10202',
          controlPrevioMock,
          targetEstamento,
          schoolMap
        );

        if (parsed.establecimientos && parsed.establecimientos.length > 0) {
          for (const est of parsed.establecimientos) {
            if (est.comuna) {
              await api.addComuna(est.comuna);
            }
            await api.upsertEstablecimiento(est);
          }
        }

        const invalidRows = parsed.contratos.filter(c => !escuelasAsignadasRbd.includes(c.rbd));
        if (invalidRows.length > 0) {
          const badRbds = Array.from(new Set(invalidRows.map(c => c.rbd)));
          alert(`❌ Error de Permiso: No tiene autorización para subir nóminas de los establecimientos con RBD: ${badRbds.join(', ')}.`);
          return;
        }

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

        const allConts = await api.getContratos();
        const filteredConts = allConts.filter(c => escuelasAsignadasRbd.includes(c.rbd));
        setContratos(filteredConts);

        const allAlts = await api.getAlertas();
        const filteredAlts = allAlts.filter(a => escuelasAsignadasRbd.includes(a.rbd));
        setAlertas(filteredAlts);

        setImportLogsAsis(`✅ Éxito: Se procesaron ${parsed.contratos.length} registros (${targetEstamento})${parsed.establecimientos?.length ? `, ${parsed.establecimientos.length} establecimientos` : ''} para tus escuelas supervisadas.`);
      } catch (err: any) {
        setImportLogsAsis(`❌ Error al procesar archivo: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
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

  // Territory-wide supervised hours calculations
  const getEstamentoSupervised = (c: Contrato) => {
    const f = funcionarios.find(func => func.run === c.funcionario_run);
    if (f?.estamento) return f.estamento;
    if (c.legislacion_laboral === 'Asistentes de la educación') return 'Asistente de la Educación';
    if (c.legislacion_laboral === 'Estatuto docente') return 'Docente';
    return 'Docente';
  };

  const supervisedConts = contratos.filter(c => escuelasAsignadasRbd.includes(c.rbd));
  const asistenteSupervised = supervisedConts.filter(c => getEstamentoSupervised(c) === 'Asistente de la Educación');
  const docenteSupervised = supervisedConts.filter(c => getEstamentoSupervised(c) === 'Docente');

  const totalAsistentesSupervised = asistenteSupervised.reduce((sum, c) => sum + c.horas_totales, 0);
  const totalDocentesSupervised = docenteSupervised.reduce((sum, c) => sum + c.horas_totales, 0);

  // Docente hours by function territory-wide
  let horasDirectivasSup = 0;
  let horasTecPedSup = 0;
  let horasCoordUTPSup = 0;
  let horasApoyoUTPSup = 0;
  let horasAulaOtrasSup = 0;

  docenteSupervised.forEach(c => {
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
      horasDirectivasSup += c.horas_totales;
    } else if (isCoordinacionUTP) {
      horasCoordUTPSup += c.horas_totales;
    } else if (isApoyoUTP) {
      horasApoyoUTPSup += c.horas_totales;
    } else if (isTecnicoPedagogica) {
      horasTecPedSup += c.horas_totales;
    } else {
      horasAulaOtrasSup += c.horas_totales;
    }
  });

  // Docente hours by funding source territory-wide
  let regularSup = 0;
  let sepSup = 0;
  let pieSup = 0;
  let proRetencionSup = 0;
  let liceoBicSup = 0;
  let otrasFondoSup = 0;

  docenteSupervised.forEach(c => {
    const fins = financiamientos.filter(f => f.contrato_id === c.id);
    if (fins.length === 0) {
      regularSup += c.horas_totales;
      return;
    }
    fins.forEach(f => {
      if (f.origen_fondo === 'Subvención Regular') {
        regularSup += f.horas;
      } else if (f.origen_fondo === 'SEP') {
        sepSup += f.horas;
      } else if (f.origen_fondo === 'PIE') {
        pieSup += f.horas;
      } else if (f.origen_fondo === 'Pro-retención') {
        proRetencionSup += f.horas;
      } else if (f.origen_fondo === 'Liceos Bicentenarios') {
        liceoBicSup += f.horas;
      } else {
        otrasFondoSup += f.horas;
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
                🎛️ Tablero de Supervisión
              </button>
              <button
                onClick={() => { setActiveTab('compendio'); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'compendio' ? 'bg-slep-blue text-white shadow' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                📊 Compendio Escuelas
              </button>
              <button
                onClick={() => { setActiveTab('dotacion'); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'dotacion' ? 'bg-slep-blue text-white shadow' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                📋 Dotaciones de Personal
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
              <button
                onClick={() => { setActiveTab('finanzas'); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'finanzas' ? 'bg-slep-blue text-white shadow' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                💵 Conciliación Remuneraciones
              </button>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Asesor SLEP</p>
          <p className="text-[9px] text-slate-500 font-mono mt-0.5 truncate" title={profesionalRun}>{profesionalRun}</p>
          <Link href="/" className="mt-2 block w-full bg-white/10 hover:bg-white/20 text-white font-bold py-1.5 rounded text-[10px] transition-colors border border-white/10">
            Cerrar Sesión
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <header className="bg-white border-b py-4 px-6 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-base font-bold text-slate-800">Bandeja de Tutela Delegada</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Control y asistencia técnica a escuelas supervisadas</p>
          </div>
        </header>

        {activeTab === 'compendio' && (
        <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 flex flex-col gap-6 w-full animate-fadeIn">
          <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Compendio Técnico de Escuelas Asignadas</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium font-mono text-blue-700">Asesor: {profesionalRun}</p>
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

            {/* Supervised Hours Distribution Grid Summary */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 border border-slate-100 rounded-xl p-4 bg-slate-50/50">
              {/* Column 1: Estamentos */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider border-b pb-1">Tutela: Estamentos</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 text-xs mb-0.5">
                      <span>🍎 Docentes Totales</span>
                      <span>{totalDocentesSupervised} hrs ({((totalDocentesSupervised / (totalDocentesSupervised + totalAsistentesSupervised || 1)) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-slep-blue h-2 rounded-full transition-all" style={{ width: `${(totalDocentesSupervised / (totalDocentesSupervised + totalAsistentesSupervised || 1)) * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 text-xs mb-0.5">
                      <span>👥 Asistentes Totales</span>
                      <span>{totalAsistentesSupervised} hrs ({((totalAsistentesSupervised / (totalDocentesSupervised + totalAsistentesSupervised || 1)) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${(totalAsistentesSupervised / (totalDocentesSupervised + totalAsistentesSupervised || 1)) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Funciones */}
              <div className="space-y-2 text-[11px]">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider border-b pb-1">Tutela: Funciones Docentes</h4>
                {[
                  { label: '💼 Directivas', value: horasDirectivasSup, color: 'bg-rose-500' },
                  { label: '⚙️ Téc. Pedagógicas', value: horasTecPedSup, color: 'bg-emerald-500' },
                  { label: '📊 Coord. UTP', value: horasCoordUTPSup, color: 'bg-amber-500' },
                  { label: '🔍 Apoyo UTP', value: horasApoyoUTPSup, color: 'bg-indigo-500' },
                  { label: '🧑‍🏫 Aula / Otras', value: horasAulaOtrasSup, color: 'bg-slate-450' }
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-0.5">
                    <span className="font-semibold text-slate-600">{item.label}</span>
                    <span className="font-bold text-slate-800">{item.value} hrs</span>
                  </div>
                ))}
              </div>

              {/* Column 3: Financiamientos */}
              <div className="space-y-2 text-[11px]">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider border-b pb-1">Tutela: Financiamiento Docente</h4>
                {[
                  { label: 'Subv. Regular', value: regularSup },
                  { label: 'Horas SEP', value: sepSup },
                  { label: 'Horas PIE', value: pieSup },
                  { label: 'Horas Proretención', value: proRetencionSup },
                  { label: 'Liceos Bic.', value: liceoBicSup },
                  { label: 'Otras Horas/Fondos', value: otrasFondoSup }
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
                placeholder="Filtrar escuelas por RBD o Nombre..." 
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
                  {filteredEsts.map(e => {
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
                        <td className="p-3 font-semibold text-slate-800">{e.nombre}</td>
                        <td className="p-3 text-center font-bold text-slate-700">{e.ivm}%</td>
                        <td className="p-3 text-center font-semibold text-slep-blue">{docenteCount}</td>
                        <td className="p-3 text-center font-semibold text-slate-600">{asistenteCount}</td>
                        <td className="p-3 text-center font-bold text-slate-700">{totalHrs} hrs</td>
                        <td className="p-3 text-center font-semibold text-slep-blue">{pedagogicasHrs} hrs</td>
                        <td className="p-3 text-center font-semibold text-slate-500">{noPedagogicasHrs} hrs</td>
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
        <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          {/* Left Column: Supervised schools list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-5 flex justify-between items-center bg-blue-50/20">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Supervisando de forma activa</p>
                <p className="text-lg font-bold text-slep-blue mt-0.5">{escuelasAsignadasRbd.length} Colegios Asignados</p>
              </div>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Facultades de Edición Completas
              </span>
            </div>

            <div className="bg-white rounded-xl shadow border border-slate-200/60 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Establecimientos a su Cargo</h2>
                  <p className="text-xs text-slate-500 mt-1">Haga clic en &quot;Administrar Escuela&quot; para heredar atribuciones de Director.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => triggerExport('dashboard', 'xlsx')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    📊 Excel
                  </button>
                  <button
                    onClick={() => triggerExport('dashboard', 'pdf')}
                    className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    📄 PDF
                  </button>
                  <input 
                    type="text" 
                    placeholder="RBD..." 
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    value={searchEst}
                    onChange={(e) => setSearchEst(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="p-3 pl-6">RBD</th>
                      <th className="p-3">Establecimiento</th>
                      <th className="p-3 text-center">Prioritarios %</th>
                      <th className="p-3 text-center">Alertas</th>
                      <th className="p-3 text-center">Gestión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEsts.map(e => {
                      const estAlts = alertas.filter(a => a.rbd === e.rbd && !a.resuelta);
                      return (
                        <tr key={e.rbd} className="hover:bg-slate-50">
                          <td className="p-3 pl-6 font-mono font-medium text-slate-500">{e.rbd}</td>
                          <td className="p-3 font-semibold text-slate-800">{e.nombre}</td>
                          <td className="p-3 text-center font-bold">{e.ivm}%</td>
                          <td className="p-3 text-center">
                            {estAlts.length > 0 ? (
                              <span className="bg-slep-coral/20 text-red-800 font-bold px-2 py-0.5 rounded-full">
                                ⚠️ {estAlts.length} Alertas
                              </span>
                            ) : (
                              <span className="bg-slep-emerald/20 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                ✓ Conciliado
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleAdministrarEscuela(e.rbd)}
                              className="bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark font-extrabold px-3 py-1 rounded shadow text-[10px]"
                            >
                              Administrar Escuela 🛠️
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

          {/* Right Column */}
          <div className="space-y-6">
            {/* Restricted Drag-and-drop file upload for Docentes */}
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>📥</span> Cargar Nómina Docentes (Drag & Drop)
              </h2>
              <p className="text-xs text-slate-500 mt-1">Cargue el archivo de personal docente (.csv, .json, .xlsx, .xls) de sus escuelas asignadas.</p>

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
              </div>

              {importLogs && (
                <pre className="mt-3 p-2 bg-slate-100 border rounded text-[9px] text-slate-600 whitespace-pre-wrap">
                  {importLogs}
                </pre>
              )}
            </div>

            {/* Restricted Drag-and-drop file upload for Asistentes */}
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>📥</span> Cargar Nómina Asistentes (Drag & Drop)
              </h2>
              <p className="text-xs text-slate-500 mt-1">Cargue el archivo de asistentes (.csv, .json, .xlsx, .xls) de sus escuelas asignadas.</p>

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
              </div>

              {importLogsAsis && (
                <pre className="mt-3 p-2 bg-slate-100 border rounded text-[9px] text-slate-600 whitespace-pre-wrap">
                  {importLogsAsis}
                </pre>
              )}
            </div>

            {/* Financial details */}
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
               <h2 className="text-base font-bold text-slate-800">Presupuesto consolidado del asesor</h2>
              <div className="mt-4 space-y-3">
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
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                        <div className={`h-1.5 rounded-full ${fund.color}`} style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      )}

      {activeTab === 'dotacion' && (
        <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 flex flex-col gap-6 w-full animate-fadeIn">
          <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Visualización de Dotación Completa</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Consulte la nómina completa de docentes y asistentes por establecimiento con desglose de horas.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => triggerExport('dotacion', 'xlsx')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer animate-fadeIn"
                >
                  📊 Excel
                </button>
                <button
                  onClick={() => triggerExport('dotacion', 'pdf')}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer animate-fadeIn"
                >
                  📄 PDF
                </button>
                <label className="text-xs font-bold text-slate-600">Establecimiento:</label>
                <select
                  value={selectedDotacionRbd}
                  onChange={(e) => setSelectedDotacionRbd(e.target.value)}
                  className="p-2 border rounded-lg bg-white text-xs font-bold text-slate-800 shadow-sm"
                >
                  {establecimientos.map(est => (
                    <option key={est.rbd} value={est.rbd}>
                      {est.nombre} (RBD {est.rbd})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedDotacionRbd ? (() => {
              const schoolConts = contratos.filter(c => c.rbd === selectedDotacionRbd);
              
              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs bg-slate-50 p-3 rounded-lg border">
                    <span className="font-bold text-slate-700">RBD Seleccionado: {selectedDotacionRbd}</span>
                    <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">
                      {schoolConts.length} Funcionarios Contratados
                    </span>
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
                        {schoolConts.map(c => {
                          const f = funcionarios.find(func => func.run === c.funcionario_run);
                          if (!f) return null;
                          const cAsigs = asignaciones.filter(a => a.contrato_id === c.id);
                          const pedagogicas = cAsigs.reduce((sum, a) => sum + a.horas, 0);
                          const noPedagogicas = Math.max(0, c.horas_totales - pedagogicas);
                          const coursesString = cAsigs.map(a => `${a.curso} (${a.asignatura})`).join(', ');

                          return (
                            <tr key={c.id} className="hover:bg-slate-50">
                              <td className="p-3 pl-4">
                                <span className="font-bold text-slate-800">{f.nombre}</span>
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
                        })}
                        {schoolConts.length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-4 text-center text-slate-400 italic">
                              No hay funcionarios registrados en este establecimiento.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })() : (
              <p className="text-center text-slate-400 italic py-6">Seleccione un establecimiento para ver su dotación.</p>
            )}
          </div>
        </main>
      )}

      {activeTab === 'finanzas' && (
        <main className="p-6 md:p-8 flex-1 flex flex-col gap-6 w-full animate-fadeIn">
          <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>💵</span> Auditoría y Conciliación de Remuneraciones
                </h2>
                <p className="text-xs text-slate-500 mt-1">Conciliación de haberes y horas contratadas vs horas pagadas para personal de sus establecimientos bajo tutela.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => remunFileInputRef.current?.click()}
                  className="bg-slep-blue hover:bg-slep-blue-hover text-white text-xs font-bold px-3 py-2 rounded shadow transition-all cursor-pointer"
                >
                  📥 Cargar Libro Remuneraciones
                </button>
                <input
                  ref={remunFileInputRef}
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const reader = new FileReader();
                      reader.onload = async (evt) => {
                        try {
                          const text = evt.target?.result as string;
                          const parsed = parsearRemuneracionesCsv(text);
                          await api.cargarRemuneraciones(parsed);
                          setRemuneraciones(parsed);
                          setUploadRemunLogs(`✅ Éxito: Se procesaron ${parsed.length} registros de remuneraciones.`);
                        } catch (err: any) {
                          setUploadRemunLogs(`❌ Error al procesar archivo: ${err.message}`);
                        }
                      };
                      reader.readAsText(e.target.files[0], 'UTF-8');
                    }
                  }}
                />
              </div>
            </div>

            {uploadRemunLogs && (
              <div className="mt-3 p-3 bg-slate-50 border rounded-lg text-xs font-bold text-slate-700">
                {uploadRemunLogs}
              </div>
            )}

            {(() => {
              const rbdContratos = contratos.filter(c => escuelasAsignadasRbd.includes(c.rbd));
              const rbdContratosRuns = new Set(rbdContratos.map(c => c.funcionario_run));
              
              const relevantRemun = remuneraciones.filter(r => rbdContratosRuns.has(r.funcionario_run));
              const totalRemunerado = relevantRemun.reduce((sum, r) => sum + r.total_haberes, 0);
              const totalHrsPagadas = relevantRemun.reduce((sum, r) => sum + r.horas_pagadas, 0);
              const totalHrsContrato = rbdContratos.reduce((sum, c) => sum + c.horas_totales, 0);
              
              const relevantFuncionarios = funcionarios.filter(f => rbdContratosRuns.has(f.run));
              const alertsCount = relevantFuncionarios.filter(f => {
                const conc = conciliarFuncionario(f.run, contratos, asignaciones, remuneraciones);
                return conc.discrepancia;
              }).length;

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="p-4 border rounded-xl bg-slate-50/50">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Establecimientos Tutelados</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{escuelasAsignadasRbd.length}</p>
                  </div>
                  <div className="p-4 border rounded-xl bg-slate-50/50">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Horas Contrato</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{totalHrsContrato} hrs</p>
                  </div>
                  <div className="p-4 border rounded-xl bg-slate-50/50">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Horas Liquidadas</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{totalHrsPagadas} hrs</p>
                  </div>
                  <div className="p-4 border rounded-xl bg-red-50 border-red-100">
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Docentes con Discrepancia</p>
                    <p className="text-2xl font-black text-red-700 mt-1">{alertsCount}</p>
                  </div>
                </div>
              );
            })()}

            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Listado de Personal bajo Tutela</h3>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-655 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtroDiscrepancias}
                    onChange={(e) => setFiltroDiscrepancias(e.target.checked)}
                    className="rounded border-slate-300 text-slep-blue focus:ring-slep-blue"
                  />
                  <span>Mostrar solo con discrepancia</span>
                </label>
              </div>

              <div className="border rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                      <th className="p-3 pl-4">Docente / Funcionario</th>
                      <th className="p-3">Horas Contrato</th>
                      <th className="p-3">Horas Liquidadas</th>
                      <th className="p-3">Monto Remunerado</th>
                      <th className="p-3">Estado Auditoría</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {(() => {
                      const rbdContratos = contratos.filter(c => escuelasAsignadasRbd.includes(c.rbd));
                      const rbdContratosRuns = new Set(rbdContratos.map(c => c.funcionario_run));
                      const relevantFuncionarios = funcionarios.filter(f => rbdContratosRuns.has(f.run));

                      return relevantFuncionarios
                        .map(f => {
                          const fConts = contratos.filter(c => c.funcionario_run === f.run && escuelasAsignadasRbd.includes(c.rbd));
                          const fRemun = remuneraciones.find(r => r.funcionario_run === f.run);
                          const conc = conciliarFuncionario(f.run, contratos, asignaciones, remuneraciones);
                          return {
                            funcionario: f,
                            contratos: fConts,
                            remun: fRemun,
                            conc
                          };
                        })
                        .filter(x => !filtroDiscrepancias || x.conc.discrepancia)
                        .map(x => {
                          const totalHrs = x.contratos.reduce((sum, c) => sum + c.horas_totales, 0);
                          const conc = x.conc;

                          return (
                            <tr key={x.funcionario.run} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3 pl-4">
                                <p className="font-bold text-slate-800">{x.funcionario.nombre}</p>
                                <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">{x.funcionario.run}</p>
                              </td>
                              <td className="p-3 font-mono">{totalHrs} hrs</td>
                              <td className="p-3 font-mono">{x.remun ? `${x.remun.horas_pagadas} hrs` : '--'}</td>
                              <td className="p-3 font-mono text-emerald-600">
                                {x.remun ? `$${x.remun.total_haberes.toLocaleString('es-CL')}` : '--'}
                              </td>
                              <td className="p-3">
                                {conc.discrepancia ? (
                                  <span className="inline-block bg-slep-coral/20 text-red-950 border border-slep-coral/40 px-2.5 py-1 rounded font-semibold text-[10.5px]">
                                    ⚠️ {conc.mensaje}
                                  </span>
                                ) : (
                                  <span className="inline-block bg-slep-emerald/20 text-emerald-950 border border-slep-emerald/40 px-2.5 py-1 rounded font-semibold text-[10.5px]">
                                    ✓ Conciliado Correctamente
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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
                const rbdContratos = contratos.filter(c => escuelasAsignadasRbd.includes(c.rbd));
                const rbdContratosRuns = new Set(rbdContratos.map(c => c.funcionario_run));
                
                const docDocs = funcionarios.filter(f => f.estamento === 'Docente' && rbdContratosRuns.has(f.run));
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

      </div>
    </div>
  );
}
