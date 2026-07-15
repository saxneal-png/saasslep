'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, dbLocal, supabase } from '@/lib/supabase';
import { 
  Funcionario, 
  Contrato, 
  GrupoEstamento, 
  TareaReemplazo, 
  OrigenFondo,
  CalidadJuridica,
  CARGOS_DOCENTES_LIST,
  ReemplazoDetalle,
  Establecimiento
} from '@/lib/types';
import { normalizarRun } from '@/lib/csvParser';
import { calcularHaberBaseEUS, validarCargaDocente } from '@/lib/rulesEngine';

export default function RRHHPage() {
  const router = useRouter();
  
  // Lists
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [tareas, setTareas] = useState<TareaReemplazo[]>([]);
  const [comunas, setComunas] = useState<string[]>([]);
  const [escuelas, setEscuelas] = useState<Establecimiento[]>([]);

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstamento, setFilterEstamento] = useState<'all' | 'P01' | 'P02'>('all');

  // New Staff State
  const [run, setRun] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [estamento, setEstamento] = useState<GrupoEstamento>('P02_Educacion');
  
  // P01 Fields
  const [calidadP01, setCalidadP01] = useState<'Planta' | 'Contrata'>('Contrata');
  const [escalafonP01, setEscalafonP01] = useState<'Directivo' | 'Profesional' | 'Técnico' | 'Administrativo' | 'Auxiliar'>('Administrativo');
  const [gradoEUS, setGradoEUS] = useState<number>(12);

  // P02 Fields
  const [rbd, setRbd] = useState('');
  const [calidadP02, setCalidadP02] = useState<CalidadJuridica>('A contrata');
  const [funcionPrincipal, setFuncionPrincipal] = useState('DOCENTE DE AULA');
  const [horasContrato, setHorasContrato] = useState(44);
  const [titulo, setTitulo] = useState('');

  // Licencias Medicas State
  const [selectedLicenciaRun, setSelectedLicenciaRun] = useState('');
  const [licenciaDias, setLicenciaDias] = useState(15);
  const [fechaInicioLicencia, setFechaInicioLicencia] = useState('');
  const [fechaTerminoLicencia, setFechaTerminoLicencia] = useState('');
  const [searchLicenciaFilter, setSearchLicenciaFilter] = useState('');
  
  // Viewing Ficha Modal
  const [viewingFuncionario, setViewingFuncionario] = useState<Funcionario | null>(null);

  // Dynamic financing lines for contracting form (supports combination of funds and qualities)
  const [subventionLines, setSubventionLines] = useState<{ origen_fondo: OrigenFondo; calidad_juridica: CalidadJuridica; horas: number }[]>([
    { origen_fondo: 'Subvención Regular', calidad_juridica: 'Titular', horas: 30 },
    { origen_fondo: 'SEP', calidad_juridica: 'A contrata', horas: 14 }
  ]);

  // Replacement Form State
  const [addingReemplazoContratoId, setAddingReemplazoContratoId] = useState<string | null>(null);
  const [reemplazoRun, setReemplazoRun] = useState('');
  const [reemplazoHoras, setReemplazoHoras] = useState(44);
  const [reemplazoFInicio, setReemplazoFInicio] = useState('');
  const [reemplazoFTermino, setReemplazoFTermino] = useState('');
  const [reemplazosList, setReemplazosList] = useState<ReemplazoDetalle[]>([]);

  // Manual replacement inputs (new teachers)
  const [reemplazoEsManual, setReemplazoEsManual] = useState(false);
  const [reemplazoManualRun, setReemplazoManualRun] = useState('');
  const [reemplazoManualNombre, setReemplazoManualNombre] = useState('');
  const [reemplazoManualEmail, setReemplazoManualEmail] = useState('');

  // Substitute Pool Form State
  const [newPoolRun, setNewPoolRun] = useState('');
  const [newPoolNombre, setNewPoolNombre] = useState('');
  const [newPoolEmail, setNewPoolEmail] = useState('');
  const [newPoolTelefono, setNewPoolTelefono] = useState('');
  const [newPoolTitulo, setNewPoolTitulo] = useState('');

  // Bulk deletion & Tab state
  const [selectedFuncs, setSelectedFuncs] = useState<string[]>([]);
  const [rrhhTab, setRrhhTab] = useState<'fichas' | 'licencias' | 'banco'>('fichas');
  const [csvBulkInput, setCsvBulkInput] = useState('');
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
    if (tab === 'fichas') {
      cols = [
        { key: 'run', label: 'RUT / RUN', checked: true },
        { key: 'nombre', label: 'Nombre Completo', checked: true },
        { key: 'estamento', label: 'Estamento', checked: true },
        { key: 'cargo', label: 'Función Principal', checked: true },
        { key: 'rbd', label: 'RBD Escuela', checked: true },
        { key: 'horas', label: 'Horas Totales', checked: true },
        { key: 'estado', label: 'Estado', checked: true }
      ];
    } else if (tab === 'licencias') {
      cols = [
        { key: 'nombre', label: 'Funcionario Licenciado', checked: true },
        { key: 'run', label: 'RUT / RUN', checked: true },
        { key: 'horas', label: 'Horas a Cubrir', checked: true },
        { key: 'rbd', label: 'RBD Escuela', checked: true },
        { key: 'cobertura', label: 'Horas Reemplazo Cubiertas', checked: true }
      ];
    } else if (tab === 'banco') {
      cols = [
        { key: 'run', label: 'RUT / RUN', checked: true },
        { key: 'nombre', label: 'Nombre Completo', checked: true },
        { key: 'titulo', label: 'Título / Especialidad', checked: true },
        { key: 'email', label: 'Correo de Contacto', checked: true },
        { key: 'telefono', label: 'Teléfono', checked: true }
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
    alert(`📥 Descargando reporte de la pestaña "${exportModal.tab.toUpperCase()}" (Gestión de Personas SLEP) en formato ${exportModal.format.toUpperCase()}...\n\nColumnas seleccionadas:\n- ${activeCols.join('\n- ')}`);
    setExportModal({ ...exportModal, isOpen: false });
  };

  const [authorized, setAuthorized] = useState(false);

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
        loadData();

        interval = setInterval(async () => {
          const updated = await api.pullCloudSync();
          if (updated) {
            loadData();
          }
        }, 5000);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  async function loadData() {
    await api.pullCloudSync();
    const [funcs, conts, tasks, coms, ests, reemps] = await Promise.all([
      api.getFuncionarios(),
      api.getContratos(),
      api.getTareasReemplazo(),
      api.getComunas(),
      api.getEstablecimientos(),
      api.getReemplazosLicencias()
    ]);
    setFuncionarios(funcs);
    setContratos(conts);
    setTareas(tasks);
    setComunas(coms);
    setEscuelas(ests);
    setReemplazosList(reemps);
    if (ests.length > 0) {
      setRbd(ests[0].rbd);
    }
  }

  // Handle staff creation
  const handleContratar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!run || !nombre) {
      alert('⚠️ Ingrese RUN y Nombre completo.');
      return;
    }
    const cleanRun = normalizarRun(run);

    if (funcionarios.some(f => f.run === cleanRun)) {
      alert('⚠️ Este funcionario ya se encuentra registrado.');
      return;
    }

    const nuevoFuncionario: Funcionario = {
      run: cleanRun,
      nombre: nombre.toUpperCase(),
      email,
      telefono,
      grupo_estamento: estamento,
      titulo: estamento === 'P02_Educacion' ? titulo : undefined,
      calidad_juridica_p01: estamento === 'P01_Administrativo' ? calidadP01 : undefined,
      escalafon_p01: estamento === 'P01_Administrativo' ? escalafonP01 : undefined,
      grado_eus: estamento === 'P01_Administrativo' ? gradoEUS : undefined,
      estamento: estamento === 'P02_Educacion' ? 'Docente' : undefined
    };

    // Save funcionario
    dbLocal.funcionarios = [...dbLocal.funcionarios, nuevoFuncionario];

    // If P02, create a contract linked to the selected school
    if (estamento === 'P02_Educacion') {
      if (subventionLines.length > 0) {
        // Create multiple contracts if there are different Calidades/Subventions, or group by Calidad
        // Let's create one contract per unique Calidad Jurídica for this teacher at this school, with the sum of hours
        const calidadesUnicas = Array.from(new Set(subventionLines.map(sl => sl.calidad_juridica)));
        
        calidadesUnicas.forEach((cal, cIdx) => {
          const linesForCal = subventionLines.filter(l => l.calidad_juridica === cal);
          const totalHorasCal = linesForCal.reduce((sum, l) => sum + l.horas, 0);
          
          const nuevoContrato: Contrato = {
            id: `rrhh-cont-${cleanRun.replace(/[^a-zA-Z0-9]/g, '')}-${rbd}-${cal.toLowerCase().replace(/[^a-z]/g, '')}-${cIdx}`,
            funcionario_run: cleanRun,
            rbd,
            calidad_juridica: cal,
            funcion_principal: funcionPrincipal,
            estado: 'Activo',
            horas_totales: totalHorasCal
          };
          dbLocal.contratos = [...dbLocal.contratos, nuevoContrato];

          // Associate financing records to this contract
          const newFins = linesForCal.map((l, lIdx) => ({
            id: `fin-${nuevoContrato.id}-${lIdx}`,
            contrato_id: nuevoContrato.id,
            origen_fondo: l.origen_fondo,
            horas: l.horas
          }));
          dbLocal.financiamientoContratos = [...dbLocal.financiamientoContratos, ...newFins];
        });
      } else {
        const nuevoContrato: Contrato = {
          id: `rrhh-cont-${cleanRun.replace(/[^a-zA-Z0-9]/g, '')}-${rbd}`,
          funcionario_run: cleanRun,
          rbd,
          calidad_juridica: calidadP02,
          funcion_principal: funcionPrincipal,
          estado: 'Activo',
          horas_totales: horasContrato
        };
        dbLocal.contratos = [...dbLocal.contratos, nuevoContrato];

        dbLocal.financiamientoContratos = [
          ...dbLocal.financiamientoContratos,
          {
            id: `fin-${nuevoContrato.id}-1`,
            contrato_id: nuevoContrato.id,
            origen_fondo: 'Subvención Regular' as OrigenFondo,
            horas: horasContrato
          }
        ];
      }
    } else {
      // P01 Central Office Contract
      const nuevoContrato: Contrato = {
        id: `rrhh-cont-p01-${cleanRun.replace(/[^a-zA-Z0-9]/g, '')}-central`,
        funcionario_run: cleanRun,
        rbd: '99999', // Central Level code
        calidad_juridica: calidadP01 === 'Planta' ? 'Titular' : 'A contrata',
        funcion_principal: escalafonP01,
        estado: 'Activo',
        horas_totales: 44
      };
      dbLocal.contratos = [...dbLocal.contratos, nuevoContrato];
    }

    setRun('');
    setNombre('');
    setEmail('');
    setTelefono('');
    setTitulo('');
    await loadData();
    alert('✅ Contratación tramitada con éxito.');
  };

  // Submit license medical
  const handleTramitarLicencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicenciaRun) {
      alert('⚠️ Seleccione un funcionario.');
      return;
    }

    // Find active P02 contract for this run
    const funcConts = contratos.filter(c => c.funcionario_run === selectedLicenciaRun && c.rbd !== '99999');
    if (funcConts.length === 0) {
      alert('⚠️ Este funcionario no tiene contratos de educación activos.');
      return;
    }

    const func = funcionarios.find(f => f.run === selectedLicenciaRun);

    const start = fechaInicioLicencia || new Date().toISOString().split('T')[0];
    let end = fechaTerminoLicencia;
    if (!end) {
      const startDate = new Date(start + 'T12:00:00');
      startDate.setDate(startDate.getDate() + (licenciaDias || 15));
      end = startDate.toISOString().split('T')[0];
    }

    // Update contract status to 'Licencia Médica' and set dates in Supabase
    for (const c of funcConts) {
      await api.updateContratoEstado(c.id, 'Licencia Médica', null, start, end);
    }

    // Dispatch pending replacement tasks for all school contracts of this teacher
    for (const c of funcConts) {
      const nuevaTarea: TareaReemplazo = {
        id: `reemplazo-task-${Date.now()}-${c.id}`,
        rbd: c.rbd,
        funcionario_titular_run: selectedLicenciaRun,
        horas_a_cubrir: c.horas_totales,
        estado: 'Pendiente'
      };
      (nuevaTarea as any).motivo = 'Licencia Médica';
      (nuevaTarea as any).fecha_inicio = start;
      (nuevaTarea as any).fecha_termino = end;

      await api.crearTareaReemplazo(nuevaTarea);
    }

    setSelectedLicenciaRun('');
    setFechaInicioLicencia('');
    setFechaTerminoLicencia('');
    setLicenciaDias(15);
    await loadData();
    alert('✅ Licencia médica registrada. Se ha notificado al Director de la escuela para la designación de reemplazo.');
  };

  const handleAddReemplazo = async (contratoId: string) => {
    let finalRun = '';
    let finalNombre = '';

    if (reemplazoEsManual) {
      if (!reemplazoManualRun || !reemplazoManualNombre) {
        alert('⚠️ Ingrese el RUN y Nombre Completo del reemplazante.');
        return;
      }
      finalRun = normalizarRun(reemplazoManualRun);
      finalNombre = reemplazoManualNombre.toUpperCase();
    } else {
      if (!reemplazoRun) {
        alert('⚠️ Seleccione un reemplazante de la lista.');
        return;
      }
      finalRun = reemplazoRun;
      const reempFunc = funcionarios.find(f => f.run === finalRun);
      finalNombre = reempFunc ? reempFunc.nombre : finalRun;
    }

    if (reemplazoHoras <= 0) {
      alert('⚠️ Ingrese un número válido de horas.');
      return;
    }
    if (!reemplazoFInicio || !reemplazoFTermino) {
      alert('⚠️ Ingrese las fechas de inicio y término del reemplazo.');
      return;
    }

    const titularContrato = contratos.find(c => c.id === contratoId);
    if (!titularContrato) return;

    // Check if teacher exists in dbLocal, if not, create on the fly!
    const exists = funcionarios.some(f => f.run === finalRun);
    if (!exists) {
      const nuevoFunc: Funcionario = {
        run: finalRun,
        nombre: finalNombre,
        email: reemplazoManualEmail || `${finalRun.replace(/[^a-zA-Z0-9]/g, '')}@slepvallediguillin.cl`,
        estamento: 'Docente',
        cargo: 'Docente de Aula'
      };
      dbLocal.funcionarios = [...dbLocal.funcionarios, nuevoFunc];

      // Also create a placeholder replacement contract
      const nuevoCont: Contrato = {
        id: `reemp-cont-${finalRun.replace(/[^a-zA-Z0-9]/g, '')}-${titularContrato.rbd}`,
        funcionario_run: finalRun,
        rbd: titularContrato.rbd,
        calidad_juridica: 'Reemplazo',
        funcion_principal: titularContrato.funcion_principal,
        estado: 'Reemplazo',
        horas_totales: reemplazoHoras,
        vinculo_titular_id: titularContrato.id
      };
      dbLocal.contratos = [...dbLocal.contratos, nuevoCont];
    }

    const nuevoReemplazo: ReemplazoDetalle = {
      id: `reemp-${Date.now()}`,
      contrato_titular_id: contratoId,
      reemplazo_run: finalRun,
      rbd: titularContrato.rbd,
      horas: reemplazoHoras,
      fecha_inicio: reemplazoFInicio,
      fecha_termino: reemplazoFTermino
    };

    await api.saveReemplazoLicencia(nuevoReemplazo);
    
    // Reset state
    setAddingReemplazoContratoId(null);
    setReemplazoRun('');
    setReemplazoHoras(44);
    setReemplazoFInicio('');
    setReemplazoFTermino('');
    setReemplazoEsManual(false);
    setReemplazoManualRun('');
    setReemplazoManualNombre('');
    setReemplazoManualEmail('');
    await loadData();
    alert('✅ Reemplazante agregado exitosamente.');
  };

  const handleAddToPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoolRun || !newPoolNombre) {
      alert('⚠️ Ingrese RUN y Nombre del postulante.');
      return;
    }
    const cleanRun = normalizarRun(newPoolRun);
    if (funcionarios.some(f => f.run === cleanRun)) {
      alert('⚠️ Este RUN ya se encuentra registrado en el sistema.');
      return;
    }

    const nuevoPostulante: Funcionario = {
      run: cleanRun,
      nombre: newPoolNombre.toUpperCase(),
      email: newPoolEmail,
      telefono: newPoolTelefono,
      titulo: newPoolTitulo,
      cargo: 'Postulante Reemplazo',
      estamento: 'Docente',
      grupo_estamento: 'P02_Educacion'
    };

    await api.upsertFuncionario(nuevoPostulante);
    
    setNewPoolRun('');
    setNewPoolNombre('');
    setNewPoolEmail('');
    setNewPoolTelefono('');
    setNewPoolTitulo('');
    await loadData();
    alert('✅ Postulante agregado exitosamente al Banco de Reemplazos.');
  };

  const handleBulkIngestPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvBulkInput.trim()) {
      alert('⚠️ Ingrese texto CSV para procesar.');
      return;
    }

    const lines = csvBulkInput.split('\n');
    let addedCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const parts = trimmed.split(',');
      if (parts.length < 2) continue; // Must have at least RUN and Name

      const rawRun = parts[0].trim();
      const rawName = parts[1].trim();
      if (!rawRun || !rawName) continue;

      const cleanRun = normalizarRun(rawRun);
      if (funcionarios.some(f => f.run === cleanRun)) continue; // Skip existing

      const title = parts[2] ? parts[2].trim() : '';
      const email = parts[3] ? parts[3].trim() : '';
      const phone = parts[4] ? parts[4].trim() : '';

      const nuevoPostulante: Funcionario = {
        run: cleanRun,
        nombre: rawName.toUpperCase(),
        email: email || undefined,
        telefono: phone || undefined,
        titulo: title || undefined,
        cargo: 'Postulante Reemplazo',
        estamento: 'Docente',
        grupo_estamento: 'P02_Educacion'
      };

      await api.upsertFuncionario(nuevoPostulante);
      addedCount++;
    }

    setCsvBulkInput('');
    await loadData();
    alert(`✅ Ingesta finalizada. Se registraron ${addedCount} postulantes en el Banco de Reemplazos.`);
  };

  const handleDeleteReemplazo = async (id: string) => {
    if (confirm('¿Está seguro de eliminar este reemplazo?')) {
      const targetReemp = reemplazosList.find(r => r.id === id);
      await api.deleteReemplazoLicencia(id);

      if (targetReemp) {
        const otherReemps = dbLocal.reemplazosLicencias.filter(r => r.contrato_titular_id === targetReemp.contrato_titular_id);
        if (otherReemps.length === 0) {
          const cont = dbLocal.contratos.find(c => c.id === targetReemp.contrato_titular_id);
          if (cont) {
            const tasks = dbLocal.tareasReemplazo;
            const tIdx = tasks.findIndex(t => t.funcionario_titular_run === cont.funcionario_run && t.rbd === cont.rbd);
            if (tIdx >= 0) {
              tasks[tIdx].estado = 'Pendiente';
              dbLocal.tareasReemplazo = tasks;
            }
          }
        }
      }

      await loadData();
    }
  };

  const handleAprobarReemplazo = async (contratoId: string) => {
    const allConts = await api.getContratos();
    const updatedConts = allConts.map(c => {
      if (c.id === contratoId) {
        return { ...c, estado: 'Reemplazo' as const };
      }
      return c;
    });
    dbLocal.contratos = updatedConts;

    const targetCont = allConts.find(c => c.id === contratoId);
    if (targetCont) {
      const tasks = await api.getTareasReemplazo();
      const matchingTask = tasks.find(t => 
        t.rbd === targetCont.rbd && 
        t.estado === 'Pendiente' && 
        (targetCont.vinculo_titular_id?.includes(t.funcionario_titular_run) || t.funcionario_titular_run === targetCont.vinculo_titular_id)
      );
      if (matchingTask) {
        await api.resolverTareaReemplazo(matchingTask.id, targetCont.funcionario_run);
      }
    }

    await loadData();
    alert('✅ Contrato de reemplazo aprobado y activado en el sistema.');
  };

  const handleMassDelete = async () => {
    if (selectedFuncs.length === 0) return;
    if (confirm(`¿Está seguro de que desea eliminar masivamente a los ${selectedFuncs.length} funcionarios seleccionados y sus contratos correspondientes?`)) {
      await (api as any).deleteFuncionariosBulk(selectedFuncs);
      setSelectedFuncs([]);
      await loadData();
      alert('✅ Funcionarios y sus contratos eliminados exitosamente.');
    }
  };

  // Filter staff
  const [filterRbd, setFilterRbd] = useState<string>('all');

  const filteredFuncionarios = funcionarios.filter(f => {
    const matchesSearch = f.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || f.run.includes(searchTerm);
    const esP02 = f.grupo_estamento === 'P02_Educacion' || f.estamento === 'Docente' || f.estamento === 'Asistente de la Educación';
    const esP01 = f.grupo_estamento === 'P01_Administrativo';

    // Filter by school/RBD: only show funcionarios with at least one contract in the selected school
    const matchesRbd = filterRbd === 'all' || contratos.some(c => c.funcionario_run === f.run && c.rbd === filterRbd);

    if (!matchesRbd) return false;
    if (filterEstamento === 'P01') return matchesSearch && esP01;
    if (filterEstamento === 'P02') return matchesSearch && esP02;
    return matchesSearch;
  });

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-600 font-bold">
        🔒 Acceso Restringido. Redirigiendo...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slep-blue-dark text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <Image src="/logo.png" alt="Logo SLEP" width={110} height={45} className="object-contain" />
        </div>
        
        <div className="p-4 flex-1 space-y-6 text-xs">
          <div>
            <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Unidad UATP</p>
            <nav className="space-y-1">
              <Link
                href="/sostenedor?tab=dashboard"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 block font-bold"
              >
                🎛️ Tablero de Gobernanza
              </Link>
              <Link
                href="/sostenedor?tab=compendio"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 block font-bold"
              >
                📊 Compendio Territorial
              </Link>
              <Link
                href="/sostenedor?tab=resumenes"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 block font-bold"
              >
                📈 Resúmenes Consolidados
              </Link>
              <Link
                href="/sostenedor?tab=conciliacion"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 block font-bold"
              >
                ⚖️ Conciliación de Horas
              </Link>
            </nav>
          </div>

          <div>
            <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Gestión de Personas</p>
            <nav className="space-y-1">
              <Link
                href="/sostenedor/rrhh"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slep-blue text-white shadow block font-bold"
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
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 block font-bold"
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
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-slep-blue text-white py-4 px-8 flex justify-between items-center shadow-sm sticky top-0 z-10">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold leading-none">Gestión de Personas</p>
            <h1 className="text-base font-bold tracking-tight mt-1">Maestro de Personal SLEP P01 y P02</h1>
          </div>
          <span className="bg-white/10 px-3 py-1.5 rounded text-xs font-mono font-bold">Consola Centralizada</span>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Sub-tabs Navigation */}
          <div className="flex border-b border-slate-200 gap-1 bg-white p-1 rounded-xl border">
            <button 
              onClick={() => { setRrhhTab('fichas'); setSelectedFuncs([]); }}
              className={`flex-1 py-3 text-center rounded-lg font-bold text-xs transition-all cursor-pointer ${
                rrhhTab === 'fichas' 
                  ? 'bg-slep-blue text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              👤 Fichas de Funcionarios (P01 / P02)
            </button>
            <button 
              onClick={() => { setRrhhTab('licencias'); setSelectedFuncs([]); }}
              className={`flex-1 py-3 text-center rounded-lg font-bold text-xs transition-all cursor-pointer ${
                rrhhTab === 'licencias' 
                  ? 'bg-slep-blue text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              🏥 Licencias y Reemplazos
            </button>
            <button 
              onClick={() => { setRrhhTab('banco'); setSelectedFuncs([]); }}
              className={`flex-1 py-3 text-center rounded-lg font-bold text-xs transition-all cursor-pointer ${
                rrhhTab === 'banco' 
                  ? 'bg-slep-blue text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              📁 Banco de Reemplazos
            </button>
          </div>

          {rrhhTab === 'fichas' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Contracting Form */}
              <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6 space-y-4">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>📝</span> Tramitar Nueva Contratación
                </h2>
                
                <form onSubmit={handleContratar} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">RUN Funcionario</label>
                    <input 
                      type="text" 
                      placeholder="12.345.678-9"
                      className="w-full p-2 border rounded font-semibold text-slate-800"
                      value={run}
                      onChange={(e) => setRun(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Nombre Completo</label>
                    <input 
                      type="text" 
                      placeholder="Ej: MARÍA LUZ PINTO GONZÁLEZ"
                      className="w-full p-2 border rounded font-semibold text-slate-800"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Clasificación Estamento</label>
                    <select
                      className="w-full p-2 bg-white border rounded font-bold text-slate-700 cursor-pointer"
                      value={estamento}
                      onChange={(e) => setEstamento(e.target.value as GrupoEstamento)}
                    >
                      <option value="P02_Educacion">P02 (Educación - Escuelas)</option>
                      <option value="P01_Administrativo">P01 (Estatuto Administrativo - Nivel Central)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Email</label>
                    <input 
                      type="email" 
                      placeholder="correo@slep.cl"
                      className="w-full p-2 border rounded text-slate-800"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Conditional Fields based on Estamento Selection */}
                  {estamento === 'P01_Administrativo' ? (
                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 col-span-full grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Calidad Jurídica P01</label>
                        <select 
                          className="w-full p-1.5 bg-white border rounded font-semibold text-slate-800 cursor-pointer"
                          value={calidadP01}
                          onChange={(e) => setCalidadP01(e.target.value as any)}
                        >
                          <option value="Planta">Planta</option>
                          <option value="Contrata">Contrata</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Escalafón Administrativo</label>
                        <select 
                          className="w-full p-1.5 bg-white border rounded font-semibold text-slate-800 cursor-pointer"
                          value={escalafonP01}
                          onChange={(e) => setEscalafonP01(e.target.value as any)}
                        >
                          <option value="Directivo">Directivo</option>
                          <option value="Profesional">Profesional</option>
                          <option value="Técnico">Técnico</option>
                          <option value="Administrativo">Administrativo</option>
                          <option value="Auxiliar">Auxiliar</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Grado EUS (1 - 24)</label>
                        <input 
                          type="number"
                          min={1}
                          max={24}
                          className="w-full p-1.5 bg-white border rounded font-black text-slate-800 text-center"
                          value={gradoEUS}
                          onChange={(e) => setGradoEUS(parseInt(e.target.value) || 12)}
                        />
                      </div>
                      <div className="col-span-full pt-1">
                        <p className="font-bold text-blue-900 text-right">
                          Haber Base EUS Indexado: <span className="text-sm font-black text-slep-blue font-mono">${calcularHaberBaseEUS(gradoEUS).toLocaleString('es-CL')} CLP</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50/40 p-4 rounded-lg border border-amber-100 col-span-full space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Destinación Establecimiento</label>
                          <select 
                            className="w-full p-1.5 bg-white border rounded font-semibold text-slate-800 cursor-pointer"
                            value={rbd}
                            onChange={(e) => setRbd(e.target.value)}
                          >
                            {escuelas.map(e => (
                              <option key={e.rbd} value={e.rbd}>{e.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-slate-600 font-bold mb-1">Título Profesional / Especialidad</label>
                          <input 
                            type="text"
                            placeholder="Ej: Profesor de Lenguaje y Comunicación"
                            className="w-full p-1.5 bg-white border rounded text-slate-800 font-semibold"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Función Principal</label>
                          <div className="space-y-2">
                            <select 
                              className="w-full p-1.5 bg-white border rounded font-semibold text-slate-800 cursor-pointer"
                              value={CARGOS_DOCENTES_LIST.includes(funcionPrincipal as any) ? funcionPrincipal : 'OTRO'}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'OTRO') {
                                  setFuncionPrincipal('');
                                } else {
                                  setFuncionPrincipal(val);
                                }
                              }}
                            >
                              {CARGOS_DOCENTES_LIST.map(cargoOption => (
                                <option key={cargoOption} value={cargoOption}>{cargoOption}</option>
                              ))}
                            </select>
                            
                            {(!CARGOS_DOCENTES_LIST.includes(funcionPrincipal as any) || funcionPrincipal === 'OTRO') && (
                              <input 
                                type="text" 
                                placeholder="Especifique otra función docente..." 
                                className="w-full p-1.5 bg-white border rounded text-slate-800"
                                value={funcionPrincipal}
                                onChange={(e) => setFuncionPrincipal(e.target.value)}
                              />
                            )}
                          </div>
                        </div>

                        <div className="md:col-span-2 bg-white p-3 rounded-lg border border-amber-200 space-y-2">
                          <p className="font-bold text-slate-700 text-[11px] flex items-center justify-between border-b pb-1">
                            <span>Distribución por Calidad Jurídica y Fondos</span>
                            <span className="text-slep-blue font-extrabold text-[10px]">
                              Total: {subventionLines.reduce((sum, l) => sum + l.horas, 0)} Horas
                            </span>
                          </p>
                          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                            {subventionLines.map((line, idx) => (
                              <div key={idx} className="flex gap-2 items-center text-[10px]">
                                <select
                                  value={line.origen_fondo}
                                  onChange={(e) => {
                                    const next = [...subventionLines];
                                    next[idx].origen_fondo = e.target.value as OrigenFondo;
                                    setSubventionLines(next);
                                  }}
                                  className="p-1 border rounded bg-slate-50 font-semibold"
                                >
                                  <option value="Subvención Regular">Subvención Regular</option>
                                  <option value="SEP">SEP</option>
                                  <option value="PIE">PIE</option>
                                  <option value="Reforzamiento">Reforzamiento</option>
                                  <option value="Pro-retención">Pro-retención</option>
                                  <option value="Liceos Bicentenarios">Liceos Bicentenarios</option>
                                  <option value="Otro">Otro</option>
                                </select>

                                <select
                                  value={line.calidad_juridica}
                                  onChange={(e) => {
                                    const next = [...subventionLines];
                                    next[idx].calidad_juridica = e.target.value as CalidadJuridica;
                                    setSubventionLines(next);
                                  }}
                                  className="p-1 border rounded bg-slate-50 font-semibold"
                                >
                                  <option value="Titular">Titular</option>
                                  <option value="A contrata">A contrata</option>
                                  <option value="Plazo fijo">Plazo fijo</option>
                                  <option value="Indefinido">Indefinido</option>
                                  <option value="Reemplazo">Reemplazo</option>
                                  <option value="Habilitación especial">Habilitación especial</option>
                                </select>

                                <input
                                  type="number"
                                  placeholder="Horas"
                                  className="w-16 p-1 border rounded text-center font-bold"
                                  value={line.horas}
                                  onChange={(e) => {
                                    const next = [...subventionLines];
                                    next[idx].horas = parseInt(e.target.value) || 0;
                                    setSubventionLines(next);
                                  }}
                                />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubventionLines(subventionLines.filter((_, lIdx) => lIdx !== idx));
                                  }}
                                  className="text-red-500 hover:text-red-700 font-bold ml-1"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSubventionLines([...subventionLines, { origen_fondo: 'Subvención Regular', calidad_juridica: 'A contrata', horas: 10 }]);
                            }}
                            className="text-[10px] text-slep-blue font-bold hover:underline flex items-center gap-1"
                          >
                            ➕ Agregar Línea de Financiamiento/Calidad
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="col-span-full flex justify-end pt-2">
                    <button 
                      type="submit" 
                      className="bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark font-extrabold px-6 py-2.5 rounded-lg shadow cursor-pointer text-xs"
                    >
                      💾 Registrar Contratación
                  </button>
                  </div>
                </form>
              </div>

              {/* Staff table list (Fichas) */}
              <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6 space-y-4 animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Maestro Consolidado de Personal</h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Lista de fichas vigentes del personal del servicio local (Alimentada por ingestas escolares y RR.HH. central).</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedFuncs.length > 0 && (
                      <button
                        onClick={handleMassDelete}
                        className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow transition-colors cursor-pointer mr-2 flex items-center gap-1"
                      >
                        🗑️ Eliminar Selección ({selectedFuncs.length})
                      </button>
                    )}
                    <button
                      onClick={() => triggerExport('fichas', 'xlsx')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow flex items-center gap-1 cursor-pointer"
                    >
                      📊 Excel
                    </button>
                    <button
                      onClick={() => triggerExport('fichas', 'pdf')}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow flex items-center gap-1 cursor-pointer"
                    >
                      📄 PDF
                    </button>
                    <input 
                      type="text" 
                      placeholder="Buscar por Nombre o RUN..." 
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-bold"
                      value={filterEstamento}
                      onChange={(e) => setFilterEstamento(e.target.value as any)}
                    >
                      <option value="all">Todos los Estamentos</option>
                      <option value="P01">Solo P01 (Administrativo)</option>
                      <option value="P02">Solo P02 (Educación)</option>
                    </select>
                    <select
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-bold"
                      value={filterRbd}
                      onChange={(e) => setFilterRbd(e.target.value)}
                    >
                      <option value="all">🏫 Todos los Establecimientos</option>
                      {escuelas.map(e => (
                        <option key={e.rbd} value={e.rbd}>{e.nombre || `RBD ${e.rbd}`} (RBD {e.rbd})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 font-bold text-slate-600 uppercase border-b">
                      <tr>
                        <th className="p-3 pl-4 w-10 text-center">
                          <input 
                            type="checkbox" 
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFuncs(filteredFuncionarios.map(f => f.run));
                              } else {
                                setSelectedFuncs([]);
                              }
                            }}
                            checked={selectedFuncs.length === filteredFuncionarios.length && filteredFuncionarios.length > 0}
                          />
                        </th>
                        <th className="p-3">Funcionario</th>
                        <th className="p-3">Estamento</th>
                        <th className="p-3">Detalle EUS / Especialidad</th>
                        <th className="p-3">Ubicación / RBD</th>
                        <th className="p-3 text-center">Horas Contrato</th>
                        <th className="p-3 text-right">Haber Estimado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredFuncionarios.map(f => {
                        const cont = contratos.find(c => c.funcionario_run === f.run);
                        const isP01 = f.grupo_estamento === 'P01_Administrativo';
                        const haberEst = isP01 ? calcularHaberBaseEUS(f.grado_eus || 12) : (cont ? cont.horas_totales * 18500 * 4 : 0);

                        return (
                          <tr key={f.run} className="hover:bg-slate-50">
                            <td className="p-3 pl-4 text-center">
                              <input 
                                type="checkbox"
                                checked={selectedFuncs.includes(f.run)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFuncs([...selectedFuncs, f.run]);
                                  } else {
                                    setSelectedFuncs(selectedFuncs.filter(run => run !== f.run));
                                  }
                                }}
                              />
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => setViewingFuncionario(f)}
                                className="font-bold text-slate-800 underline hover:text-slep-blue text-left"
                              >
                                {f.nombre}
                              </button>
                              {(() => {
                                if (cont) {
                                  if (cont.estado === 'Licencia Médica') {
                                    const reemps = reemplazosList.filter(r => r.contrato_titular_id === cont.id);
                                    const totalCubierto = reemps.reduce((acc, curr) => acc + curr.horas, 0);
                                    if (totalCubierto < cont.horas_totales) {
                                      return (
                                        <span className="bg-rose-105 text-rose-700 px-2 py-0.5 rounded text-[9px] font-black border border-rose-300 ml-2 animate-pulse whitespace-nowrap" title={`Licencia médica sin cobertura total (${totalCubierto}/${cont.horas_totales} hrs cubiertas).`}>
                                          ⚠️ Licencia sin Cobertura
                                        </span>
                                      );
                                    }
                                  } else if (cont.estado === 'Activo') {
                                    const esc = escuelas.find(e => e.rbd === cont.rbd);
                                    const asigs = dbLocal.asignacionesAula.filter(a => a.contrato_id === cont.id);
                                    const leyCalculo = esc ? validarCargaDocente(cont, esc, asigs, []) : null;
                                    if (leyCalculo && !leyCalculo.cumpleLey20903) {
                                      return (
                                        <span className="bg-rose-105 text-rose-700 px-2 py-0.5 rounded text-[9px] font-black border border-rose-300 ml-2 animate-pulse whitespace-nowrap" title={`Exceso detectado en proporción de aula (Ley 20.903).`}>
                                          ⚠️ Sobrecarga Ley 20.903
                                        </span>
                                      );
                                    }
                                  }
                                }
                                return null;
                              })()}
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{f.run}</p>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isP01 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isP01 ? 'P01 Administrativo' : 'P02 Educación'}
                              </span>
                            </td>
                            <td className="p-3">
                              {isP01 ? (
                                <div className="text-[10px] text-slate-600 font-medium">
                                  <p>Escalafón: <span className="font-bold">{f.escalafon_p01}</span></p>
                                  <p>EUS Grado: <span className="font-bold">{f.grado_eus}</span> ({f.calidad_juridica_p01})</p>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-600">
                                  <p>Título: <span className="font-semibold text-slate-800">{f.titulo || 'No registrado'}</span></p>
                                  <p>Cargo: <span className="font-semibold">{f.cargo || cont?.funcion_principal || f.estamento || 'Funcionario'}</span></p>
                                </div>
                              )}
                            </td>
                            <td className="p-3 font-semibold text-slate-700">
                              {isP01 ? (
                                <span>🏛️ Nivel Central</span>
                              ) : (
                                <span>🏫 RBD {cont?.rbd || 'Desconocido'}</span>
                              )}
                            </td>
                            <td className="p-3 text-center font-bold text-slate-800">
                              {cont ? `${cont.horas_totales} hrs` : '--'}
                            </td>
                            <td className="p-3 text-right font-bold font-mono text-slate-700">
                              ${haberEst.toLocaleString('es-CL')}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredFuncionarios.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-400 italic">
                            No hay funcionarios contratados bajo este filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {rrhhTab === 'licencias' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Direct notifications from school directors (Alerts) */}
              {(() => {
                const pendingLicencias = contratos.filter(c => {
                  if (c.estado !== 'Licencia Médica') return false;
                  const reemps = reemplazosList.filter(r => r.contrato_titular_id === c.id || r.contrato_titular_id === c.funcionario_run);
                  const totalCubierto = reemps.reduce((acc, curr) => acc + curr.horas, 0);
                  const cubiertoCompletamente = totalCubierto >= c.horas_totales;
                  return !cubiertoCompletamente;
                });
                if (pendingLicencias.length === 0) return null;
                return (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900 space-y-3 shadow-sm">
                    <p className="font-black flex items-center gap-1.5 text-red-800 uppercase tracking-wide">
                      <span>🚨</span> Alertas de Licencias Médicas Activas Notificadas por Directores de Escuela:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {pendingLicencias.map(c => {
                        const f = funcionarios.find(func => func.run === c.funcionario_run);
                        return (
                          <div key={c.id} className="bg-white border border-red-100 p-3 rounded-lg flex justify-between items-center shadow-sm">
                            <div>
                              <button
                                onClick={() => f && setViewingFuncionario(f)}
                                className="font-bold text-slate-800 underline hover:text-slep-blue text-left"
                              >
                                {f ? f.nombre : c.funcionario_run}
                              </button>
                              <p className="text-[10px] text-slate-400 mt-0.5">RBD: {c.rbd} • Contrato: {c.horas_totales} hrs</p>
                            </div>
                            <span className="bg-red-150 text-red-700 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-wide animate-pulse">
                              Licencia Médica 🩺
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Tramitar Licencia Form */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow border border-slate-200/60 p-6 space-y-4">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>🏥</span> Tramitar Licencia Médica (P02)
                  </h2>
                  
                  <form onSubmit={handleTramitarLicencia} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-500 font-bold mb-1">Buscar Funcionario (Nombre o RUN)</label>
                      <input 
                        type="text" 
                        placeholder="Escriba nombre o RUN para filtrar..."
                        className="w-full p-2 border rounded text-xs mb-2 text-slate-800"
                        value={searchLicenciaFilter}
                        onChange={(e) => setSearchLicenciaFilter(e.target.value)}
                      />
                      <label className="block text-slate-500 font-bold mb-1">Funcionario Docente / Asistente</label>
                      <select 
                        value={selectedLicenciaRun} 
                        onChange={(e) => setSelectedLicenciaRun(e.target.value)}
                        className="w-full p-2 bg-white border rounded font-semibold text-slate-700 cursor-pointer"
                      >
                        <option value="">Seleccione personal...</option>
                        {(() => {
                          const filtered = funcionarios.filter(f => {
                            const matchEstamento = f.grupo_estamento === 'P02_Educacion' || !f.grupo_estamento;
                            if (!matchEstamento) return false;
                            if (!searchLicenciaFilter) return true;
                            const query = searchLicenciaFilter.toLowerCase();
                            return f.nombre.toLowerCase().includes(query) || f.run.toLowerCase().includes(query);
                          });
                          return filtered.map(f => (
                            <option key={f.run} value={f.run}>{f.nombre} ({f.run})</option>
                          ));
                        })()}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Fecha Inicio</label>
                        <input 
                          type="date"
                          className="w-full p-1.5 border rounded text-slate-800 text-xs font-semibold"
                          value={fechaInicioLicencia}
                          onChange={(e) => setFechaInicioLicencia(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Fecha Término</label>
                        <input 
                          type="date"
                          className="w-full p-1.5 border rounded text-slate-800 text-xs font-semibold"
                          value={fechaTerminoLicencia}
                          onChange={(e) => setFechaTerminoLicencia(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold mb-1">O especifique Duración (Días)</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded font-bold text-slate-800 text-center"
                        value={licenciaDias}
                        onChange={(e) => setLicenciaDias(parseInt(e.target.value) || 15)}
                        min={1}
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full bg-slep-blue hover:bg-slep-blue-hover text-white font-bold py-2 rounded shadow cursor-pointer text-xs transition-colors"
                    >
                      Registrar Licencia y Alerta de Reemplazo
                    </button>
                  </form>
                </div>

                {/* Right Column: Unified replacement statistics */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow border border-slate-200/60 p-6 space-y-4">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>📋</span> Resumen de Cobertura de Reemplazos
                  </h2>
                  <p className="text-xs text-slate-500">Indicadores territoriales de licencias médicas y asignación de personal sustituto en establecimientos.</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 shadow-sm text-center">
                      <p className="text-slate-500 text-[10px] uppercase font-bold">Licencias Activas</p>
                      <p className="text-2xl font-extrabold text-slate-800 mt-1">{contratos.filter(c => c.estado === 'Licencia Médica').length}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 shadow-sm text-center">
                      <p className="text-amber-700 text-[10px] uppercase font-bold">Buscando Reemplazo</p>
                      <p className="text-2xl font-extrabold text-amber-600 mt-1">
                        {contratos.filter(c => 
                          c.estado === 'Licencia Médica' && 
                          reemplazosList.filter(r => r.contrato_titular_id === c.id).length === 0
                        ).length}
                      </p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 shadow-sm text-center">
                      <p className="text-green-700 text-[10px] uppercase font-bold">Reemplazos Asignados</p>
                      <p className="text-2xl font-extrabold text-green-600 mt-1">{reemplazosList.length}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border rounded-xl p-4 space-y-2 text-xs">
                    <p className="font-bold text-slate-700">📌 Directiva de Gestión Territorial</p>
                    <p className="text-slate-500 leading-relaxed text-[11px]">
                      El sistema supervisa de manera automática los descalces horarias en el aula. Utilice el botón de <span className="font-bold text-slep-blue">➕ Agregar Reemplazante</span> en la nómina de licencias médicas activa que figura a continuación para asignar personal de reemplazo.
                    </p>
                  </div>
                </div>

              </div>

              {/* Sección: Personal en Licencia Médica Activa y Cobertura de Reemplazos */}
              {(() => {
                const activeLicencias = contratos.filter(c => c.estado === 'Licencia Médica');
                return (
                  <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6 space-y-4 animate-fadeIn">
                    <div className="pb-2 border-b flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span>🏥</span> Personal en Licencia y Cobertura de Reemplazo
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Personal con licencias vigentes y estado de cobertura/reemplazo en el territorio.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-red-100 text-red-800 font-bold px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-mono">
                          {activeLicencias.length} En Licencia
                        </span>
                        <button
                          onClick={() => triggerExport('licencias', 'xlsx')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow flex items-center gap-1 cursor-pointer"
                        >
                          📊 Excel
                        </button>
                        <button
                          onClick={() => triggerExport('licencias', 'pdf')}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow flex items-center gap-1 cursor-pointer"
                        >
                          📄 PDF
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 font-bold text-slate-600 border-b">
                          <tr>
                            <th className="p-3 pl-4">Funcionario Licenciado</th>
                            <th className="p-3">Establecimiento</th>
                            <th className="p-3">Periodo de Reposo</th>
                            <th className="p-3">Horas / Cobertura</th>
                            <th className="p-3">Reemplazos Asignados</th>
                            <th className="p-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeLicencias.map(c => {
                            const f = funcionarios.find(func => func.run === c.funcionario_run);
                            const esc = escuelas.find(e => e.rbd === c.rbd);
                            const reemps = reemplazosList.filter(r => r.contrato_titular_id === c.id);
                            const totalCubierto = reemps.reduce((acc, curr) => acc + curr.horas, 0);
                            const cubiertoCompletamente = totalCubierto >= c.horas_totales;
                            const task = tareas.find(t => t.funcionario_titular_run === c.funcionario_run && t.rbd === c.rbd);

                            return (
                              <tr key={c.id} className="hover:bg-slate-50/50 align-top">
                                <td className="p-3 pl-4">
                                  <button
                                    onClick={() => f && setViewingFuncionario(f)}
                                    className="font-bold text-slate-800 underline hover:text-slep-blue text-left"
                                  >
                                    {f ? f.nombre : c.funcionario_run}
                                  </button>
                                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{c.funcionario_run}</p>
                                </td>
                                <td className="p-3">
                                  <p className="font-semibold text-slate-700">RBD {c.rbd}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{esc ? esc.nombre : 'Colegio'}</p>
                                </td>
                                <td className="p-3 font-medium text-slate-600">
                                  <div className="space-y-1">
                                    <p>📅 Inicio: <span className="font-bold text-slate-750">{c.fecha_inicio_licencia || 'No especificada'}</span></p>
                                    <p>📅 Término: <span className="font-bold text-slate-750">{c.fecha_termino_licencia || 'No especificada'}</span></p>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="space-y-1">
                                    <p>Contrato: <span className="font-bold">{c.horas_totales} hrs</span></p>
                                    <p>Cubierto: <span className={`font-bold ${cubiertoCompletamente ? 'text-green-600' : 'text-amber-600'}`}>{totalCubierto} hrs</span></p>
                                    <div className="mt-1">
                                      {cubiertoCompletamente ? (
                                        <span className="inline-block bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-[8px] font-bold border border-green-200">
                                          ✓ Cubierto
                                        </span>
                                      ) : task && task.estado === 'Pendiente' ? (
                                        <span className="inline-block bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[8px] font-bold border border-amber-200 animate-pulse">
                                          🔍 Reemplazo Pendiente
                                        </span>
                                      ) : (
                                        <span className="inline-block bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-[8px] font-bold border border-rose-200">
                                          ⚠️ Cobertura Incompleta
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="space-y-2 max-w-xs">
                                    {reemps.map(r => (
                                      <div key={r.id} className="bg-slate-50 border p-2 rounded-lg text-[10px] flex justify-between items-start">
                                        <div>
                                          <p className="font-bold text-slate-800">
                                            {funcionarios.find(f => f.run === r.reemplazo_run)?.nombre || r.reemplazo_run}
                                          </p>
                                          <p className="text-[9px] text-slate-500 mt-0.5">Horas: <span className="font-semibold text-slep-blue">{r.horas} hrs</span></p>
                                          <p className="text-[9px] text-slate-500">Periodo: {r.fecha_inicio} al {r.fecha_termino}</p>
                                        </div>
                                        <button
                                          onClick={() => handleDeleteReemplazo(r.id)}
                                          className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer"
                                          title="Eliminar Reemplazante"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}

                                    {reemps.length === 0 && (
                                      <p className="italic text-[10px] text-slate-400">Sin reemplazos asignados</p>
                                    )}

                                    {addingReemplazoContratoId === c.id ? (
                                       <div className="bg-amber-50/50 border border-amber-200 p-3 rounded-lg space-y-2 mt-2">
                                         <p className="font-bold text-[10px] text-amber-800 flex items-center justify-between">
                                           <span>Agregar Reemplazo</span>
                                           <label className="flex items-center gap-1 font-semibold text-[9px] cursor-pointer text-slate-600">
                                             <input 
                                               type="checkbox"
                                               checked={reemplazoEsManual}
                                               onChange={(e) => setReemplazoEsManual(e.target.checked)}
                                             />
                                             <span>Manual/Externo ✏️</span>
                                           </label>
                                         </p>
                                         {reemplazoEsManual ? (
                                           <div className="space-y-2">
                                             <div>
                                               <label className="block text-[9px] text-slate-500 font-bold">RUN Docente</label>
                                               <input
                                                 type="text"
                                                 placeholder="Ej: 19.876.543-2"
                                                 className="w-full p-1 border rounded text-[10px] bg-white text-slate-800"
                                                 value={reemplazoManualRun}
                                                 onChange={(e) => setReemplazoManualRun(e.target.value)}
                                               />
                                             </div>
                                             <div>
                                               <label className="block text-[9px] text-slate-500 font-bold">Nombre Completo</label>
                                               <input
                                                 type="text"
                                                 placeholder="Ej: MARCOS UGALDE TAPIA"
                                                 className="w-full p-1 border rounded text-[10px] bg-white text-slate-800"
                                                 value={reemplazoManualNombre}
                                                 onChange={(e) => setReemplazoManualNombre(e.target.value)}
                                               />
                                             </div>
                                             <div>
                                               <label className="block text-[9px] text-slate-500 font-bold">Correo Electrónico (Opcional)</label>
                                               <input
                          type="email"
                                                 placeholder="correo@reemplazo.cl"
                                                 className="w-full p-1 border rounded text-[10px] bg-white text-slate-800"
                                                 value={reemplazoManualEmail}
                                                 onChange={(e) => setReemplazoManualEmail(e.target.value)}
                                               />
                                             </div>
                                           </div>
                                         ) : (
                                            <div>
                                              <label className="block text-[9px] text-slate-500 font-bold">
                                                Docente Reemplazante (Filtrados por título "{f?.titulo || 'Sin título'}"):
                                              </label>
                                              <select
                                                value={reemplazoRun}
                                                onChange={(e) => setReemplazoRun(e.target.value)}
                                                className="w-full p-1 border rounded text-[10px] bg-white cursor-pointer"
                                              >
                                                <option value="">Seleccione...</option>
                                                
                                                {/* Coincidencias exactas o parciales por Título */}
                                                <optgroup label="Coinciden en Título/Especialidad">
                                                  {funcionarios.filter(func => {
                                                    if (func.run === c.funcionario_run) return false;
                                                    const titularTitle = (f?.titulo || '').toLowerCase().trim();
                                                    const candTitle = (func.titulo || '').toLowerCase().trim();
                                                    return titularTitle && candTitle && (candTitle.includes(titularTitle) || titularTitle.includes(candTitle));
                                                  }).map(func => (
                                                    <option key={func.run} value={func.run}>
                                                      {func.nombre} ({func.titulo || 'Sin Título'}) — {func.cargo === 'Postulante Reemplazo' ? 'Banco' : 'Docente'}
                                                    </option>
                                                  ))}
                                                </optgroup>

                                                {/* Otros candidatos */}
                                                <optgroup label="Otros Candidatos Disponibles">
                                                  {funcionarios.filter(func => {
                                                    if (func.run === c.funcionario_run) return false;
                                                    const titularTitle = (f?.titulo || '').toLowerCase().trim();
                                                    const candTitle = (func.titulo || '').toLowerCase().trim();
                                                    const isMatch = titularTitle && candTitle && (candTitle.includes(titularTitle) || titularTitle.includes(candTitle));
                                                    return !isMatch;
                                                  }).map(func => (
                                                    <option key={func.run} value={func.run}>
                                                      {func.nombre} ({func.titulo || 'Sin Título'}) — {func.cargo === 'Postulante Reemplazo' ? 'Banco' : 'Docente'}
                                                    </option>
                                                  ))}
                                                </optgroup>
                                              </select>
                                            </div>
                                         )}
                                        <div className="grid grid-cols-2 gap-1.5">
                                          <div>
                                            <label className="block text-[9px] text-slate-500 font-bold">Horas</label>
                                            <input
                                              type="number"
                                              className="w-full p-1 border rounded text-[10px] text-center"
                                              value={reemplazoHoras}
                                              onChange={(e) => setReemplazoHoras(parseInt(e.target.value) || 0)}
                                              max={c.horas_totales - totalCubierto}
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[9px] text-slate-500 font-bold">Max Disp</label>
                                            <p className="text-[10px] pt-1.5 font-bold text-slate-650">{c.horas_totales - totalCubierto} hrs</p>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                          <div>
                                            <label className="block text-[9px] text-slate-500 font-bold">Inicio</label>
                                            <input
                                              type="date"
                                              className="w-full p-1 border rounded text-[9px]"
                                              value={reemplazoFInicio}
                                              onChange={(e) => setReemplazoFInicio(e.target.value)}
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[9px] text-slate-500 font-bold">Término</label>
                                            <input
                                              type="date"
                                              className="w-full p-1 border rounded text-[9px]"
                                              value={reemplazoFTermino}
                                              onChange={(e) => setReemplazoFTermino(e.target.value)}
                                            />
                                          </div>
                                        </div>
                                        <div className="flex justify-end gap-1.5 pt-1">
                                          <button
                                            onClick={() => setAddingReemplazoContratoId(null)}
                                            className="px-2 py-1 bg-white border rounded text-[9px] font-bold text-slate-600"
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            onClick={() => handleAddReemplazo(c.id)}
                                            className="px-2 py-1 bg-slep-blue text-white rounded text-[9px] font-bold"
                                          >
                                            Guardar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setAddingReemplazoContratoId(c.id);
                                          setReemplazoRun('');
                                          setReemplazoHoras(c.horas_totales - totalCubierto);
                                          setReemplazoFInicio(c.fecha_inicio_licencia || '');
                                          setReemplazoFTermino(c.fecha_termino_licencia || '');
                                        }}
                                        className="text-[10px] text-slep-blue hover:underline font-bold flex items-center gap-1 mt-1.5 cursor-pointer text-left"
                                      >
                                        ➕ Agregar Reemplazante
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={async () => {
                                      if (confirm('¿Desea finalizar el estado de Licencia de este contrato?')) {
                                        const updated = dbLocal.contratos.map(x => {
                                          if (x.id === c.id) {
                                            return { ...x, estado: 'Activo' as const, fecha_inicio_licencia: undefined, fecha_termino_licencia: undefined };
                                          }
                                          return x;
                                        });
                                        dbLocal.contratos = updated;
                                        await loadData();
                                      }
                                    }}
                                    className="bg-slate-100 hover:bg-slate-200 border text-slate-700 px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    Finalizar Licencia ✓
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {activeLicencias.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                                No hay funcionarios en estado de Licencia Médica activa.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}


              {/* Bandeja de Aprobación de Reemplazos */}
              {(() => {
                const propuestas = contratos.filter(c => c.estado === 'Pendiente_Aprobacion');
                if (propuestas.length === 0) return null;
                return (
                  <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6 space-y-4 animate-fadeIn">
                    <div className="pb-2 border-b flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-red-700 flex items-center gap-2">
                          <span>🤝</span> Propuestas de Reemplazo Pendientes de Aprobación Central (RR.HH.)
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Directores de establecimientos han asignado candidatos. Revise la propuesta de contrato espejo para proceder a visar.</p>
                      </div>
                      <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider">
                        {propuestas.length} Pendientes
                      </span>
                    </div>

                    <div className="overflow-x-auto text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 font-bold text-slate-600 border-b">
                          <tr>
                            <th className="p-3 pl-4">Candidato Propuesto</th>
                            <th className="p-3">Escuela RBD</th>
                            <th className="p-3">Función Principal / Horas</th>
                            <th className="p-3">Docente Titular Reemplazado</th>
                            <th className="p-3 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {propuestas.map(p => {
                            const candidateFunc = funcionarios.find(f => f.run === p.funcionario_run);
                            return (
                              <tr key={p.id} className="hover:bg-slate-50">
                                <td className="p-3 pl-4">
                                  <button
                                    onClick={() => candidateFunc && setViewingFuncionario(candidateFunc)}
                                    className="font-bold text-slate-800 underline hover:text-slep-blue text-left"
                                  >
                                    {candidateFunc ? candidateFunc.nombre : 'Candidato Reemplazo'}
                                  </button>
                                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{p.funcionario_run}</p>
                                </td>
                                <td className="p-3 font-semibold text-slate-700">
                                  🏫 RBD {p.rbd}
                                </td>
                                <td className="p-3 font-medium text-slate-600">
                                  {p.funcion_principal} • <span className="font-bold text-slep-blue">{p.horas_totales} hrs</span>
                                </td>
                                <td className="p-3 text-slate-500">
                                  {(() => {
                                    const titularRun = p.vinculo_titular_id ? p.vinculo_titular_id.replace('c-' + p.rbd + '-', '') : '';
                                    const titularFunc = funcionarios.find(f => f.run === titularRun);
                                    if (titularFunc) {
                                      return (
                                        <button
                                          onClick={() => setViewingFuncionario(titularFunc)}
                                          className="font-semibold text-slate-800 underline hover:text-slep-blue text-left"
                                        >
                                          👤 {titularFunc.nombre}
                                        </button>
                                      );
                                    }
                                    return <span>👤 RUN: {titularRun || 'N/A'}</span>;
                                  })()}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => handleAprobarReemplazo(p.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-1.5 rounded shadow text-xs transition-colors cursor-pointer"
                                  >
                                    Aceptar y Contratar ✍️
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {rrhhTab === 'banco' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Ingesta Masiva and Individual Registration Forms */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column 1: Form to Add Pool Candidate Individual */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow border border-slate-200/60 p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>📁</span> Registrar Postulante Individual
                  </h3>
                  <p className="text-[11px] text-slate-500">Registre un candidato externo individual disponible para cubrir reemplazos temporales.</p>
                  
                  <form onSubmit={handleAddToPool} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-500 font-bold mb-1">RUN Postulante</label>
                      <input 
                        type="text" 
                        placeholder="Ej: 18.765.432-1"
                        className="w-full p-2 border rounded font-semibold text-slate-800"
                        value={newPoolRun}
                        onChange={(e) => setNewPoolRun(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-bold mb-1">Nombre Completo</label>
                      <input 
                        type="text" 
                        placeholder="Ej: MARÍA ESTHER JARA TAPIA"
                        className="w-full p-2 border rounded font-semibold text-slate-800"
                        value={newPoolNombre}
                        onChange={(e) => setNewPoolNombre(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-bold mb-1">Título / Especialidad</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Profesora de Educación General Básica"
                        className="w-full p-2 border rounded text-slate-800"
                        value={newPoolTitulo}
                        onChange={(e) => setNewPoolTitulo(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Email</label>
                        <input 
                          type="email" 
                          placeholder="correo@ejemplo.com"
                          className="w-full p-2 border rounded text-slate-800"
                          value={newPoolEmail}
                          onChange={(e) => setNewPoolEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Teléfono</label>
                        <input 
                          type="text" 
                          placeholder="+569..."
                          className="w-full p-2 border rounded text-slate-800"
                          value={newPoolTelefono}
                          onChange={(e) => setNewPoolTelefono(e.target.value)}
                        />
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      className="w-full bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark font-extrabold py-2 rounded shadow cursor-pointer text-xs transition-colors"
                    >
                      💾 Registrar en el Banco
                    </button>
                  </form>
                </div>

                {/* Left Column 2: Ingesta Masiva de Postulantes CSV form */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow border border-slate-200/60 p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>📥</span> Ingesta Masiva de Postulantes
                  </h3>
                  <p className="text-[11px] text-slate-500">Copie y pegue filas en formato CSV para ingresar candidatos en lote.</p>
                  
                  <form onSubmit={handleBulkIngestPool} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-500 font-bold mb-1">Listado CSV (Formato: RUN, Nombre, Título, Email, Teléfono)</label>
                      <textarea
                        rows={8}
                        className="w-full p-2 border rounded font-mono text-[10px] text-slate-800 bg-slate-50"
                        placeholder="Ejemplo:&#10;18.765.432-1, MARIA TAPIA, Docente Matematica, mtapia@correo.com, +56912345678&#10;19.543.210-K, PEDRO SOTO, Profesor Ingles, psoto@correo.com, +56987654321"
                        value={csvBulkInput}
                        onChange={(e) => setCsvBulkInput(e.target.value)}
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full bg-slep-blue hover:bg-slep-blue-hover text-white font-bold py-2 rounded shadow cursor-pointer text-xs transition-colors"
                    >
                      🚀 Ingestar Postulantes en Lote
                    </button>
                  </form>
                </div>

                {/* Right Column: List of candidates in substitute pool */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow border border-slate-200/60 p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>👥</span> Resumen de Disponibilidad
                  </h3>
                  <p className="text-xs text-slate-500">Visualización de postulantes en el Banco de Reemplazos.</p>
                  
                  {(() => {
                    const poolCandidates = funcionarios.filter(f => f.cargo === 'Postulante Reemplazo');
                    const disponibles = poolCandidates.filter(c => !reemplazosList.some(r => r.reemplazo_run === c.run));
                    const asignados = poolCandidates.filter(c => reemplazosList.some(r => r.reemplazo_run === c.run));
                    return (
                      <div className="space-y-3 pt-2 text-xs">
                        <div className="bg-slate-50 border p-3 rounded-lg flex justify-between">
                          <span className="font-semibold text-slate-700">Total Postulantes Registrados:</span>
                          <span className="font-black text-slate-900">{poolCandidates.length}</span>
                        </div>
                        <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex justify-between text-green-900">
                          <span className="font-semibold">Candidatos Disponibles:</span>
                          <span className="font-black">{disponibles.length}</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex justify-between text-blue-900">
                          <span className="font-semibold">Candidatos Asignados en Reemplazo:</span>
                          <span className="font-black">{asignados.length}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>

              {/* Candidates detailed list table */}
              <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6 space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>📋</span> Nómina Completa del Banco de Reemplazos Activos en el Territorio
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => triggerExport('banco', 'xlsx')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      📊 Excel
                    </button>
                    <button
                      onClick={() => triggerExport('banco', 'pdf')}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      📄 PDF
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-600 border-b">
                      <tr>
                        <th className="p-3 pl-4">Postulante</th>
                        <th className="p-3">Título / Especialidad</th>
                        <th className="p-3">Contacto</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const poolCandidates = funcionarios.filter(f => f.cargo === 'Postulante Reemplazo');
                        if (poolCandidates.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                                No hay postulantes registrados en el banco de reemplazos. Registre candidatos individuales o use la ingesta masiva.
                              </td>
                            </tr>
                          );
                        }
                        return poolCandidates.map(cand => {
                          const isAssigned = reemplazosList.some(r => r.reemplazo_run === cand.run);
                          return (
                            <tr key={cand.run} className="hover:bg-slate-50/50">
                              <td className="p-3 pl-4">
                                <button
                                  onClick={() => setViewingFuncionario(cand)}
                                  className="font-bold text-slate-800 underline hover:text-slep-blue text-left"
                                >
                                  {cand.nombre}
                                </button>
                                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{cand.run}</p>
                              </td>
                              <td className="p-3 font-medium text-slate-700">
                                {cand.titulo || 'Docente'}
                              </td>
                              <td className="p-3 text-slate-650">
                                <p>{cand.email || 'Sin correo'}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{cand.telefono || 'Sin teléfono'}</p>
                              </td>
                              <td className="p-3 text-center">
                                {isAssigned ? (
                                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                    Asignado ✓
                                  </span>
                                ) : (
                                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                    Disponible 🔍
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={async () => {
                                    if (confirm(`¿Desea eliminar a ${cand.nombre} del banco de reemplazos?`)) {
                                      dbLocal.funcionarios = dbLocal.funcionarios.filter(x => x.run !== cand.run);
                                      await loadData();
                                    }
                                  }}
                                  className="text-red-655 hover:text-red-800 font-bold cursor-pointer"
                                >
                                  Eliminar
                                </button>
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
          )}

        </div>
      </main>

      {/* viewingFuncionario detailed Ficha modal */}
      {viewingFuncionario && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Ficha Oficial del Funcionario</p>
                <h3 className="text-lg font-black text-slate-800">{viewingFuncionario.nombre}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{viewingFuncionario.run}</p>
              </div>
              <button 
                onClick={() => setViewingFuncionario(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-xs text-slate-700">
              {/* Personal Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px]">Correo Electrónico</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{viewingFuncionario.email || 'No registrado'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px]">Teléfono</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{viewingFuncionario.telefono || 'No registrado'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px]">Estamento / Clasificación</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {viewingFuncionario.grupo_estamento === 'P01_Administrativo' ? 'P01 - Estatuto Administrativo (Nivel Central)' : 'P02 - Educación (Establecimientos)'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px]">Cargo / Título</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {viewingFuncionario.cargo || 'Docente'} {viewingFuncionario.titulo ? `(${viewingFuncionario.titulo})` : ''}
                  </p>
                </div>
              </div>

              {/* Contracts Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 border-b pb-1 flex items-center gap-1.5">
                  <span>📄</span> Contratos y Relación de Cargas Horarias
                </h4>

                {(() => {
                  const relatedConts = contratos.filter(c => c.funcionario_run === viewingFuncionario.run);
                  if (relatedConts.length === 0) {
                    return <p className="italic text-slate-400">No tiene contratos vigentes registrados.</p>;
                  }
                  return (
                    <div className="space-y-4">
                      {relatedConts.map(c => {
                        const asigs = dbLocal.asignacionesAula.filter(a => a.contrato_id === c.id);
                        const fins = dbLocal.financiamientoContratos.filter(f => f.contrato_id === c.id);
                        const esc = escuelas.find(e => e.rbd === c.rbd);
                        return (
                          <div key={c.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white hover:shadow-sm transition-shadow">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-slate-800 text-sm">
                                  {c.rbd === '99999' ? '🏛️ Nivel Central (SLEP)' : `🏫 Establecimiento: ${esc ? esc.nombre : `RBD ${c.rbd}`}`}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Calidad: {c.calidad_juridica} • Función: {c.funcion_principal} • Estado: <span className={`font-bold uppercase ${
                                    c.estado === 'Licencia Médica' ? 'text-red-600' : c.estado === 'Reemplazo' ? 'text-blue-600' : 'text-green-600'
                                  }`}>{c.estado}</span>
                                </p>
                              </div>
                              <span className="bg-slep-blue/10 text-slep-blue font-black px-2 py-0.5 rounded text-[10px]">
                                {c.horas_totales} Horas
                              </span>
                            </div>

                            {/* Funding sources */}
                            {fins.length > 0 && (
                              <div className="pt-2 border-t border-slate-100">
                                <p className="text-[9px] uppercase font-bold text-slate-400">Financiamiento por Fondos</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {fins.map(f => (
                                    <span key={f.id} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200">
                                      {f.origen_fondo}: <span className="font-bold text-slep-blue">{f.horas} hrs</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Course assignments */}
                            {c.rbd !== '99999' && (
                              <div className="pt-2 border-t border-slate-100">
                                <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Cursos y Asignaturas Asignadas</p>
                                {asigs.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                                    {asigs.map(a => (
                                      <div key={a.id} className="bg-slate-50 p-2 rounded border border-slate-150 flex justify-between items-center text-[10px]">
                                        <div>
                                          <span className="font-bold text-slate-700">{a.curso}</span>
                                          <span className="text-slate-400 mx-1">•</span>
                                          <span className="text-slate-600 font-medium">{a.asignatura}</span>
                                        </div>
                                        <span className="font-bold text-slate-800">{a.horas} hrs</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="italic text-[10px] text-slate-400">No hay asignaciones de aula registradas para este contrato.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end rounded-b-2xl">
              <button 
                onClick={() => setViewingFuncionario(null)}
                className="bg-white hover:bg-slate-100 text-slate-600 font-bold px-6 py-2 rounded-xl border transition-all cursor-pointer text-xs"
              >
                Cerrar
              </button>
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
    </div>
  );
}
