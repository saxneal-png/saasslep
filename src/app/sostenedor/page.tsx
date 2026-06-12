'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api, dbLocal } from '@/lib/supabase';
import { parsearNominaCsv, normalizarRun } from '@/lib/csvParser';
import { 
  Establecimiento, 
  Funcionario, 
  Contrato, 
  FinanciamientoContrato, 
  AlertaConciliacion,
  ProfesionalEscuelaAsignada,
  Supervisor,
  PlanEstudioNorm
} from '@/lib/types';

export default function SostenedorDashboard() {
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [financiamientos, setFinanciamientos] = useState<FinanciamientoContrato[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [alertas, setAlertas] = useState<AlertaConciliacion[]>([]);
  const [tutelas, setTutelas] = useState<ProfesionalEscuelaAsignada[]>([]);
  
  // Custom states for CRUDs
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [planesEstudio, setPlanesEstudio] = useState<PlanEstudioNorm[]>([]);
  
  // CRUD Active forms
  const [newSupRun, setNewSupRun] = useState('');
  const [newSupNombre, setNewSupNombre] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');
  
  const [newEscRbd, setNewEscRbd] = useState('');
  const [newEscNombre, setNewEscNombre] = useState('');
  const [newEscIvm, setNewEscIvm] = useState(80);
  const [newEscComuna, setNewEscComuna] = useState('Bulnes');
  const [newEscRegimen, setNewEscRegimen] = useState<'JEC' | 'No JEC'>('JEC');

  // Tutorship
  const [selectedProfRun, setSelectedProfRun] = useState('');
  const [assignRbd, setAssignRbd] = useState('');

  // Drag-and-drop & file states
  const [dragActive, setDragActive] = useState(false);
  const [importLogs, setImportLogs] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    loadAllData();
  }, []);

  async function loadAllData() {
    const ests = await api.getEstablecimientos();
    const conts = await api.getContratos();
    const funcs = await api.getFuncionarios();
    const alts = await api.getAlertas();
    const tuts = await api.getTodasLasTutelas();
    const sups = await api.getSupervisores();
    const plans = await api.getPlanesEstudio();
    
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

    if (sups.length > 0) {
      setSelectedProfRun(sups[0].run);
    }
    if (ests.length > 0) {
      setAssignRbd(ests[0].rbd);
    }
  }

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
      regimen: newEscRegimen
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
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const controlPrevioMock = [
          { run: '12.345.678-9', funcion: 'Docente de Aula', horas: 44 },
          { run: '15.432.987-K', funcion: 'Director de Escuela', horas: 38 }
        ];

        const { funcionarios: newFuncs, contratos: newConts, financiamientos: newFins, alertas: newAlts } = parsearNominaCsv(
          text,
          '10201',
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

        await loadAllData();
        setImportLogs(`✅ Éxito: Se procesaron ${newConts.length} contratos y se generaron ${newAlts.length} alertas.`);
      } catch (err: any) {
        setImportLogs(`❌ Error al procesar archivo: ${err.message}`);
      }
    };
    reader.readAsText(file, 'UTF-8');
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

  const comunas = ['Todas', ...Array.from(new Set(establecimientos.map(e => e.comuna)))];
  const filteredEstablecimientos = establecimientos.filter(e => {
    const matchesSearch = e.nombre.toLowerCase().includes(searchEst.toLowerCase()) || e.rbd.includes(searchEst);
    const matchesComuna = selectedComuna === 'Todas' || e.comuna === selectedComuna;
    return matchesSearch && matchesComuna;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      
      {/* Header */}
      <header className="bg-slep-blue text-white shadow-md py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo SLEP" width={110} height={45} className="brightness-0 invert object-contain" />
            <div className="border-l border-white/20 pl-3">
              <p className="text-[9px] uppercase tracking-wider text-slate-300 font-semibold leading-none">Sostenedor Maestro (Superusuario)</p>
              <h1 className="text-sm font-bold tracking-tight mt-0.5">Consola de Gobernanza Territorial</h1>
            </div>
          </div>
          <Link href="/" className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors border border-white/10">
            Cerrar Sesión
          </Link>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        
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

            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 font-bold uppercase text-slate-600 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 pl-6">RBD</th>
                    <th className="p-3">Establecimiento</th>
                    <th className="p-3 text-center">IVM</th>
                    <th className="p-3 text-center">Régimen</th>
                    <th className="p-3 text-center">Supervisor</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEstablecimientos.map(e => {
                    const supervisorList = tutelas.filter(t => t.establecimiento_rbd === e.rbd);
                    return (
                      <tr key={e.rbd} className="hover:bg-slate-50">
                        <td className="p-3 pl-6 font-mono font-medium text-slate-500">{e.rbd}</td>
                        <td className="p-3 font-semibold text-slate-800">{e.nombre}</td>
                        <td className="p-3 text-center font-bold text-slate-600">{e.ivm}%</td>
                        <td className="p-3 text-center font-semibold">{e.regimen}</td>
                        <td className="p-3 text-center">
                          {supervisorList.map(s => {
                            const found = supervisores.find(sup => sup.run === s.profesional_run);
                            return found ? found.nombre : s.profesional_run;
                          }).join(', ') || <span className="text-slate-400 italic">Ninguno</span>}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteEscuela(e.rbd)}
                            className="text-red-500 hover:text-red-700 font-bold"
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

          {/* School CRUD creation */}
          <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span>🏫</span> Agregar Nuevo Establecimiento (Escuela)
            </h3>
            <form onSubmit={handleCreateEscuela} className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs bg-slate-50 p-4 rounded-xl border">
              <div>
                <label className="block font-bold text-slate-500 mb-1">RBD Único</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded"
                  value={newEscRbd}
                  onChange={(e) => setNewEscRbd(e.target.value)}
                />
              </div>
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
                <label className="block font-bold text-slate-500 mb-1">Vulnerabilidad (IVM)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border rounded font-bold"
                  value={newEscIvm}
                  onChange={(e) => setNewEscIvm(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full bg-slep-blue text-white font-bold py-2 rounded text-xs shadow">
                  Agregar RBD
                </button>
              </div>
            </form>
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
          
          {/* Drag-and-Drop Uploader for CSV/JSON Nomina */}
          <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>📥</span> Cargar Nómina Masiva (Drag & Drop)
            </h2>
            <p className="text-xs text-slate-500 mt-1">Sube el archivo físico `.csv` o `.json`. Prohibido copiar y pegar en texto.</p>

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
              <span className="text-2xl block mb-2">📄</span>
              <p className="text-xs font-bold text-slate-700">Arrastra tu archivo aquí o haz clic para seleccionarlo</p>
              <p className="text-[10px] text-slate-500 mt-1">Soporta formatos .CSV y .JSON únicamente</p>
            </div>

            {importLogs && (
              <pre className="mt-3 p-2.5 bg-slate-100 border rounded text-[9px] text-slate-600 whitespace-pre-wrap">
                {importLogs}
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
                <p className="font-bold text-slate-800">{searchRunResult.funcionario.nombre}</p>
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

      </main>
    </div>
  );
}
