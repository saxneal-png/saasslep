'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, dbLocal } from '@/lib/supabase';
import { parsearNominaCsv, normalizarRun, parsearRemuneracionesCsv } from '@/lib/csvParser';
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
  RegistroRemuneracion
} from '@/lib/types';
import { validarCargaDocente, conciliarFuncionario } from '@/lib/rulesEngine';

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
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'compendio'>('dashboard');
  const [authorized, setAuthorized] = useState(false);

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
        if (tabParam === 'compendio' || tabParam === 'dashboard') {
          setActiveTab(tabParam as any);
        }
      }
    }
  }, []);

  async function loadAllData() {
    const ests = await api.getEstablecimientos();
    const conts = await api.getContratos();
    const funcs = await api.getFuncionarios();
    const alts = await api.getAlertas();
    const tuts = await api.getTodasLasTutelas();
    const sups = await api.getSupervisores();
    const plans = await api.getPlanesEstudio();
    
    // Fetch dyn elements
    const asigs = dbLocal.asignacionesAula;
    const cargs = dbLocal.cargosPersonalizados;
    const coms = await api.getComunas();
    
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
    setSupervisores(sups);
    setPlanesEstudio(plans);
    
    setAsignaciones(asigs);
    setCargosPersonalizados(cargs);
    setComunasList(coms);

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

  // Supervisor CRUD Actions
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
    alert('✅ Supervisor creado/actualizado.');
  };

  const handleDeleteSupervisor = async (run: string) => {
    if (confirm('¿Está seguro de eliminar este supervisor?')) {
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
    // Read first 1000 characters to detect scheme (DOC_RUN vs ASISTENTE_RUN)
    const tempReader = new FileReader();
    tempReader.onload = (e) => {
      const headerSample = e.target?.result as string;
      const isAsistente = headerSample.includes('ASISTENTE_RUN') || headerSample.includes('asistente_run');
      const encoding = isAsistente ? 'UTF-8' : 'ISO-8859-1';

      const mainReader = new FileReader();
      mainReader.onload = async (event) => {
        const text = event.target?.result as string;
        try {
          const controlPrevioMock = [
            { run: '12.345.678-9', funcion: 'Docente de Aula', horas: 44 },
            { run: '15.432.987-K', funcion: 'Director de Escuela', horas: 38 }
          ];

          const { funcionarios: newFuncs, contratos: newConts, financiamientos: newFins, alertas: newAlts } = parsearNominaCsv(
            text,
            '10201',
            controlPrevioMock,
            isAsistente ? 'Asistente de la Educación' : 'Docente'
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

          await loadAllData();
          setImportLogs(`✅ Éxito: Se procesaron ${newConts.length} registros (${isAsistente ? 'Asistentes' : 'Docentes'}) y se generaron ${newAlts.length} alertas.`);
        } catch (err: any) {
          setImportLogs(`❌ Error al procesar archivo: ${err.message}`);
        }
      };
      mainReader.readAsText(file, encoding);
    };
    tempReader.readAsText(file.slice(0, 1000), 'UTF-8');
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
    const tempReader = new FileReader();
    tempReader.onload = (e) => {
      const headerSample = e.target?.result as string;
      const isAsistente = headerSample.includes('ASISTENTE_RUN') || headerSample.includes('asistente_run');
      const encoding = isAsistente ? 'UTF-8' : 'ISO-8859-1';

      const mainReader = new FileReader();
      mainReader.onload = async (event) => {
        const text = event.target?.result as string;
        try {
          const controlPrevioMock: any[] = [];
          const { funcionarios: newFuncs, contratos: newConts, financiamientos: newFins, alertas: newAlts } = parsearNominaCsv(
            text,
            '10201',
            controlPrevioMock,
            isAsistente ? 'Asistente de la Educación' : 'Docente'
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

          await loadAllData();
          setImportLogsAsis(`✅ Éxito: Se procesaron ${newConts.length} registros (${isAsistente ? 'Asistentes' : 'Docentes'}) y se generaron ${newAlts.length} alertas.`);
        } catch (err: any) {
          setImportLogsAsis(`❌ Error al procesar archivo: ${err.message}`);
        }
      };
      mainReader.readAsText(file, encoding);
    };
    tempReader.readAsText(file.slice(0, 1000), 'UTF-8');
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
                  onClick={() => alert('📥 Exportando compendio completo a Excel (XLSX)...')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded shadow transition-all cursor-pointer"
                >
                  📥 Excel (XLSX)
                </button>
                <button 
                  onClick={() => alert('📥 Generando documento PDF del compendio territorial...')}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded shadow transition-all cursor-pointer"
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
                  <h2 className="text-base font-bold text-slate-800">Mapa de Establecimientos del Territorio (131)</h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Control territorial y auditoría de tutela.</p>
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

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-600 uppercase border-b">
                    <tr>
                      <th className="p-3 pl-6">RBD</th>
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
                          <td className="p-3 pl-6 font-mono font-bold text-slate-500">{e.rbd}</td>
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
                <span>👥</span> Gestión de Supervisores (Profesionales SLEP)
              </h3>

              <form onSubmit={handleCreateSupervisor} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border mb-4">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">RUN Supervisor</label>
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
                    Guardar Supervisor
                  </button>
                </div>
              </form>

              <div className="border rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 font-bold text-slate-600">
                    <tr>
                      <th className="p-3">Supervisor</th>
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
                <span>🔗</span> Asignación de Tutela de Supervisores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl text-xs border">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Supervisor</label>
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
                      <th className="p-3">Supervisor</th>
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
            
            {/* Drag-and-Drop Uploader for CSV/JSON Docentes */}
            <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>📥</span> Cargar Nómina Docentes (Profesores)
              </h2>
              <p className="text-xs text-slate-500 mt-1">Sube el archivo físico `.csv` o `.json` con la nómina de docentes.</p>

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
                  accept=".csv,.json"
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <span className="text-2xl block mb-2">👨‍🏫</span>
                <p className="text-xs font-bold text-slate-700">Arrastra nómina de Docentes o haz clic</p>
                <p className="text-[10px] text-slate-500 mt-1">Soporta formatos .CSV y .JSON únicamente</p>
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
              <p className="text-xs text-slate-500 mt-1">Sube el archivo físico `.csv` o `.json` con asistentes, psicólogos, administrativos, etc.</p>

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
                  accept=".csv,.json"
                  className="hidden" 
                  onChange={handleFileChangeAsis}
                />
                <span className="text-2xl block mb-2">🤝</span>
                <p className="text-xs font-bold text-slate-700">Arrastra nómina de Asistentes o haz clic</p>
                <p className="text-[10px] text-slate-500 mt-1">Soporta formatos .CSV and .JSON únicamente</p>
              </div>

              {importLogsAsis && (
                <pre className="mt-3 p-2.5 bg-slate-100 border rounded text-[9px] text-slate-600 whitespace-pre-wrap">
                  {importLogsAsis}
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



      </div>
    </div>
  );
}
