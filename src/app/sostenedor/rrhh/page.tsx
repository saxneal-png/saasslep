'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, dbLocal } from '@/lib/supabase';
import { 
  Funcionario, 
  Contrato, 
  GrupoEstamento, 
  TareaReemplazo, 
  OrigenFondo,
  CalidadJuridica
} from '@/lib/types';
import { normalizarRun } from '@/lib/csvParser';
import { calcularHaberBaseEUS } from '@/lib/rulesEngine';

export default function RRHHPage() {
  const router = useRouter();
  
  // Lists
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [tareas, setTareas] = useState<TareaReemplazo[]>([]);
  const [comunas, setComunas] = useState<string[]>([]);
  const [escuelas, setEscuelas] = useState<{ rbd: string; nombre: string }[]>([]);

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
  const [funcionPrincipal, setFuncionPrincipal] = useState('Docente de Aula');
  const [horasContrato, setHorasContrato] = useState(44);
  const [titulo, setTitulo] = useState('');

  // Licencias Medicas State
  const [selectedLicenciaRun, setSelectedLicenciaRun] = useState('');
  const [licenciaDias, setLicenciaDias] = useState(15);

  // Bulk deletion & Tab state
  const [selectedFuncs, setSelectedFuncs] = useState<string[]>([]);
  const [rrhhTab, setRrhhTab] = useState<'fichas' | 'licencias'>('fichas');

  const [authorized, setAuthorized] = useState(false);

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
        loadData();
      }
    }
  }, []);

  async function loadData() {
    const funcs = await api.getFuncionarios();
    setFuncionarios(funcs);
    const conts = await api.getContratos();
    setContratos(conts);
    const tasks = await api.getTareasReemplazo();
    setTareas(tasks);
    const coms = await api.getComunas();
    setComunas(coms);
    const ests = await api.getEstablecimientos();
    setEscuelas(ests);
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

      // Add default Subvención Regular financing
      dbLocal.financiamientoContratos = [
        ...dbLocal.financiamientoContratos,
        {
          id: `fin-${nuevoContrato.id}-1`,
          contrato_id: nuevoContrato.id,
          origen_fondo: 'Subvención Regular' as OrigenFondo,
          horas: horasContrato
        }
      ];
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

    // Update contract status to 'Licencia Médica'
    const updatedConts = dbLocal.contratos.map(c => {
      if (c.funcionario_run === selectedLicenciaRun && c.rbd !== '99999') {
        return { ...c, estado: 'Licencia Médica' as const };
      }
      return c;
    });
    dbLocal.contratos = updatedConts;

    // Dispatch pending replacement tasks for all school contracts of this teacher
    for (const c of funcConts) {
      const nuevaTarea: TareaReemplazo = {
        id: `reemplazo-task-${Date.now()}-${c.id}`,
        rbd: c.rbd,
        funcionario_titular_run: selectedLicenciaRun,
        funcionario_titular_nombre: func ? func.nombre : selectedLicenciaRun,
        horas_a_cubrir: c.horas_totales,
        estado: 'Pendiente'
      };
      await api.crearTareaReemplazo(nuevaTarea);
    }

    setSelectedLicenciaRun('');
    await loadData();
    alert('✅ Licencia médica registrada. Se ha notificado al Director de la escuela para la designación de reemplazo.');
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
      dbLocal.funcionarios = dbLocal.funcionarios.filter(f => !selectedFuncs.includes(f.run));
      dbLocal.contratos = dbLocal.contratos.filter(c => !selectedFuncs.includes(c.funcionario_run));
      setSelectedFuncs([]);
      await loadData();
      alert('✅ Funcionarios y sus contratos eliminados exitosamente.');
    }
  };

  // Filter staff
  const filteredFuncionarios = funcionarios.filter(f => {
    const matchesSearch = f.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || f.run.includes(searchTerm);
    if (filterEstamento === 'P01') return matchesSearch && f.grupo_estamento === 'P01_Administrativo';
    if (filterEstamento === 'P02') return matchesSearch && f.grupo_estamento === 'P02_Educacion';
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
                    <div className="bg-amber-50/40 p-3 rounded-lg border border-amber-100 col-span-full grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Calidad Jurídica P02</label>
                        <select 
                          className="w-full p-1.5 bg-white border rounded font-semibold text-slate-800 cursor-pointer"
                          value={calidadP02}
                          onChange={(e) => setCalidadP02(e.target.value as any)}
                        >
                          <option value="Titular">Titular</option>
                          <option value="A contrata">A contrata</option>
                          <option value="Plazo fijo">Plazo fijo</option>
                          <option value="Indefinido">Indefinido</option>
                          <option value="Reemplazo">Reemplazo</option>
                          <option value="Habilitación especial">Habilitación especial</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Horas Semanales Contrato</label>
                        <input 
                          type="number"
                          className="w-full p-1.5 bg-white border rounded font-bold text-slate-800 text-center"
                          value={horasContrato}
                          onChange={(e) => setHorasContrato(parseInt(e.target.value) || 44)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-slate-600 font-bold mb-1">Título Profesional / Especialidad</label>
                        <input 
                          type="text"
                          placeholder="Ej: Profesor de Lenguaje y Comunicación"
                          className="w-full p-1.5 bg-white border rounded text-slate-800"
                          value={titulo}
                          onChange={(e) => setTitulo(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Función Principal</label>
                        <input 
                          type="text"
                          className="w-full p-1.5 bg-white border rounded text-slate-800"
                          value={funcionPrincipal}
                          onChange={(e) => setFuncionPrincipal(e.target.value)}
                        />
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
                              <p className="font-bold text-slate-800">{f.nombre}</p>
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
                                  <p>Cargo: <span className="font-semibold">{f.cargo || 'Docente'}</span></p>
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
                const pendingLicencias = contratos.filter(c => c.estado === 'Licencia Médica');
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
                              <p className="font-bold text-slate-800">{f ? f.nombre : c.funcionario_run}</p>
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
                      <label className="block text-slate-500 font-bold mb-1">Funcionario Docente / Asistente</label>
                      <select 
                        value={selectedLicenciaRun} 
                        onChange={(e) => setSelectedLicenciaRun(e.target.value)}
                        className="w-full p-2 bg-white border rounded font-semibold text-slate-700 cursor-pointer"
                      >
                        <option value="">Seleccione personal...</option>
                        {funcionarios.filter(f => f.grupo_estamento === 'P02_Educacion' || !f.grupo_estamento).map(f => (
                          <option key={f.run} value={f.run}>{f.nombre} ({f.run})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold mb-1">Duración de Licencia (Días)</label>
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

                {/* Right Column: Pending replacement tasks count */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow border border-slate-200/60 p-6 space-y-4">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>📋</span> Tareas de Reemplazo Pendientes en Establecimientos
                  </h2>
                  <p className="text-xs text-slate-500">Listado de horas críticas de aula que se encuentran vacantes por licencias vigentes y requieren cobertura.</p>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {tareas.map(t => (
                      <div key={t.id} className="text-xs bg-slate-50 border p-3 rounded-xl flex justify-between items-center hover:shadow-sm transition-shadow">
                        <div>
                          <p className="font-bold text-slate-800">{t.funcionario_titular_nombre}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">RBD: {t.rbd} • Horas a Cubrir: {t.horas_a_cubrir} hrs</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          t.estado === 'Pendiente' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                        }`}>{t.estado === 'Pendiente' ? 'Buscando Reemplazo 🔍' : 'Asignado ✓'}</span>
                      </div>
                    ))}
                    {tareas.length === 0 && (
                      <p className="text-center py-6 text-slate-400 italic">No hay alertas de reemplazos activas en el territorio.</p>
                    )}
                  </div>
                </div>

              </div>

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
                                  <p className="font-bold text-slate-800">{candidateFunc ? candidateFunc.nombre : 'Candidato Reemplazo'}</p>
                                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{p.funcionario_run}</p>
                                </td>
                                <td className="p-3 font-semibold text-slate-700">
                                  🏫 RBD {p.rbd}
                                </td>
                                <td className="p-3 font-medium text-slate-600">
                                  {p.funcion_principal} • <span className="font-bold text-slep-blue">{p.horas_totales} hrs</span>
                                </td>
                                <td className="p-3 text-slate-500">
                                  👤 RUN: {p.vinculo_titular_id ? p.vinculo_titular_id.replace('c-' + p.rbd + '-', '') : 'N/A'}
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

        </div>
      </main>
    </div>
  );
}
