'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/supabase';
import { Funcionario, Contrato, AsignacionAula, CursoDinamico, Establecimiento } from '@/lib/types';
import { 
  calcularJornadaDocenteMixta, 
  TABLA_HORAS_ESTRUCTURADA, 
  JornadaDocenteMixtaResult,
  formatMinsToString,
  parseStringToMins
} from '@/lib/jornadaDocente';

interface DocenteAuditoria {
  id: string; // Unique simulation ID
  run: string;
  nombre: string;
  nivel: string;
  l65: number; // 65/35 pedagogical
  l60: number; // 60/40 pedagogical
  pie: number; // PIE chronological
  contratoReal: number; // real contract hours
  isMock: boolean;
}

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export default function AuditorMixtoPage() {
  const [docentes, setDocentes] = useState<DocenteAuditoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'alerta' | 'deficit' | 'holgura' | 'exacto'>('todos');
  const [selectedDocenteId, setSelectedDocenteId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [toastCounter, setToastCounter] = useState(0);

  // Load real data from database and initialize
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        await api.pullCloudSync();
        const [rawEscuelas, rawFuncs, rawConts, rawAsigs, rawCursos] = await Promise.all([
          api.getEstablecimientos(),
          api.getFuncionarios(),
          api.getContratos(),
          api.getTodasLasAsignaciones(),
          api.getTodosLosCursosDinamicos()
        ]);

        const docentesList: DocenteAuditoria[] = [];

        // Filter for Docentes
        const docFuncs = rawFuncs.filter(f => f.estamento === 'Docente');

        docFuncs.forEach(f => {
          const teacherConts = rawConts.filter(c => c.funcionario_run === f.run);
          if (teacherConts.length === 0) return;

          const contratoReal = teacherConts.reduce((sum, c) => sum + c.horas_totales, 0);
          
          // PIE / SEP hours (exclude these from the regular contract splitting)
          const pieHours = teacherConts
            .filter(c => 
              c.calidad_juridica.includes('PIE') || 
              c.calidad_juridica.includes('SEP') || 
              String(c.funcion_principal).toUpperCase().includes('PIE') || 
              String(c.funcion_principal).toUpperCase().includes('SEP')
            )
            .reduce((sum, c) => sum + c.horas_totales, 0);

          // Get teacher assignments
          const teacherContsIds = teacherConts.map(c => c.id);
          const teacherAsigs = rawAsigs.filter(as => teacherContsIds.includes(as.contrato_id));

          let l65 = 0;
          let l60 = 0;

          teacherAsigs.forEach(asig => {
            // Check if course qualifies for 60/40 prioritized ratio
            const relatedCont = rawConts.find(c => c.id === asig.contrato_id);
            const rbd = relatedCont ? relatedCont.rbd : '';
            const cursoInfo = rawCursos.find(c => c.rbd === rbd && c.nombre === asig.curso);
            let is60_40 = false;
            
            if (cursoInfo) {
              const level = String(cursoInfo.nivel || '').toLowerCase();
              const cleanCurso = String(asig.curso || '').toLowerCase();
              const is1To4 = level.includes('1°') || level.includes('2°') || level.includes('3°') || level.includes('4°') ||
                             level.includes('1o') || level.includes('2o') || level.includes('3o') || level.includes('4o') ||
                             level.includes('primero') || level.includes('segundo') || level.includes('tercero') || level.includes('cuarto') ||
                             cleanCurso.includes('1°') || cleanCurso.includes('2°') || cleanCurso.includes('3°') || cleanCurso.includes('4°') ||
                             cleanCurso.includes('1o') || cleanCurso.includes('2o') || cleanCurso.includes('3o') || cleanCurso.includes('4o');
              const isBasico = level.includes('bás') || level.includes('bas') || level.includes('primaria') ||
                               cleanCurso.includes('bás') || cleanCurso.includes('bas');
              const isMedio = level.includes('med') || level.includes('sec') || cleanCurso.includes('med');
              
              const prioritarios = cursoInfo.concentracion_prioritarios ?? 0;
              if (is1To4 && isBasico && !isMedio && prioritarios >= 80) {
                is60_40 = true;
              }
            }

            if (is60_40) {
              l60 += asig.horas;
            } else {
              l65 += asig.horas;
            }
          });

          // Determine educator level
          let nivel = f.tramo || 'Transversal';
          if (nivel === 'Sin Tramo') nivel = 'Inicial';

          docentesList.push({
            id: f.run,
            run: f.run,
            nombre: f.nombre,
            nivel: nivel,
            l65: Math.round(l65),
            l60: Math.round(l60),
            pie: Math.round(pieHours),
            contratoReal: Math.round(contratoReal),
            isMock: false
          });
        });

        if (docentesList.length === 0) {
          // If no teachers in DB, load default mock scenarios
          loadMockScenarios();
        } else {
          setDocentes(docentesList);
          if (docentesList.length > 0) {
            setSelectedDocenteId(docentesList[0].id);
          }
          addToast('Se cargaron los docentes reales desde la base de datos.', 'success');
        }
      } catch (err) {
        console.error('Error loading data:', err);
        addToast('No se pudieron cargar algunos datos, usando casos de prueba.', 'warning');
        loadMockScenarios();
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const loadMockScenarios = () => {
    const mockList: DocenteAuditoria[] = [
      { id: 'sim_1', run: '12.345.678-9', nombre: 'Alejandra Valenzuela', nivel: 'General Bilingüe', l65: 22, l60: 10, pie: 5, contratoReal: 44, isMock: true },
      { id: 'sim_2', run: '15.678.912-K', nombre: 'Mauricio San Martín', nivel: 'Media JEC', l65: 38, l60: 0, pie: 0, contratoReal: 44, isMock: true },
      { id: 'sim_3', run: '18.912.345-6', nombre: 'Carolina Fuentes', nivel: 'PIE Diferencial', l65: 0, l60: 0, pie: 30, contratoReal: 30, isMock: true },
      { id: 'sim_4', run: '10.123.456-7', nombre: 'Patricia Muñoz', nivel: 'Básica Rural', l65: 12, l60: 20, pie: 4, contratoReal: 44, isMock: true },
      { id: 'sim_5', run: '14.234.567-8', nombre: 'Roberto González', nivel: 'Media Técnico', l65: 24, l60: 0, pie: 10, contratoReal: 38, isMock: true }
    ];
    setDocentes(mockList);
    setSelectedDocenteId(mockList[0].id);
  };

  const addToast = (text: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = toastCounter;
    setToastCounter(prev => prev + 1);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const updateDocenteVal = (id: string, field: keyof DocenteAuditoria, val: any) => {
    setDocentes(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, [field]: val };
      }
      return d;
    }));
  };

  const agregarFila = () => {
    const newId = `sim_add_${Date.now()}`;
    const newDocente: DocenteAuditoria = {
      id: newId,
      run: `20.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}-${Math.random() > 0.5 ? 'K' : Math.floor(Math.random() * 9)}`,
      nombre: `Nuevo Docente Simulado ${docentes.length + 1}`,
      nivel: 'Transversal',
      l65: 0,
      l60: 0,
      pie: 0,
      contratoReal: 0,
      isMock: true
    };
    setDocentes(prev => [newDocente, ...prev]);
    setSelectedDocenteId(newId);
    addToast('Nuevo docente agregado para auditoría simulada.', 'success');
  };

  const eliminarDocente = (id: string) => {
    setDocentes(prev => prev.filter(d => d.id !== id));
    if (selectedDocenteId === id) {
      const remaining = docentes.filter(d => d.id !== id);
      setSelectedDocenteId(remaining.length > 0 ? remaining[0].id : null);
    }
    addToast('Docente removido de la auditoría.', 'info');
  };

  const limpiarTabla = () => {
    setDocentes([]);
    setSelectedDocenteId(null);
    addToast('Se limpió el listado de auditoría.', 'warning');
  };

  const restaurarCasos = () => {
    setIsLoading(true);
    // Reload page or re-run useEffect
    window.location.reload();
  };

  const exportarCSV = () => {
    if (docentes.length === 0) {
      addToast('No hay datos para exportar.', 'error');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "RUN,Docente,Nivel Educativo,Aula 65/35 (Ped),Aula 60/40 (Ped),PIE/SEP (HC),Sugerido Minimo (Hrs),Contrato Real (Hrs),Saldo,Estado,Mensaje\n";

    docentes.forEach(d => {
      const calc = calcularJornadaDocenteMixta(d.l65, d.l60, d.pie, d.contratoReal);
      const row = [
        d.run,
        d.nombre,
        d.nivel,
        d.l65,
        d.l60,
        d.pie,
        calc.contratoSugerido,
        calc.contratoReal,
        calc.saldo,
        calc.estado.toUpperCase(),
        `"${calc.mensaje.replace(/"/g, '""')}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Auditoria_Contratos_Mixtos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Datos exportados a CSV con éxito.', 'success');
  };

  // KPI calculations
  const totalRequerido = docentes.reduce((sum, d) => {
    const calc = calcularJornadaDocenteMixta(d.l65, d.l60, d.pie, d.contratoReal);
    return sum + calc.contratoSugerido;
  }, 0);

  const totalReal = docentes.reduce((sum, d) => sum + d.contratoReal, 0);
  const totalPie = docentes.reduce((sum, d) => sum + d.pie, 0);
  const totalAulaPed = docentes.reduce((sum, d) => sum + d.l65 + d.l60, 0);

  const totalSobrantes = docentes.reduce((sum, d) => {
    const calc = calcularJornadaDocenteMixta(d.l65, d.l60, d.pie, d.contratoReal);
    return calc.saldo > 0 ? sum + calc.saldo : sum;
  }, 0);

  const totalDeficit = docentes.reduce((sum, d) => {
    const calc = calcularJornadaDocenteMixta(d.l65, d.l60, d.pie, d.contratoReal);
    return calc.saldo < 0 ? sum + Math.abs(calc.saldo) : sum;
  }, 0);

  // Apply filters and search
  const filteredDocentes = docentes.filter(d => {
    const matchSearch = d.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        d.run.includes(searchQuery);
    
    if (!matchSearch) return false;

    if (filterStatus === 'todos') return true;

    const calc = calcularJornadaDocenteMixta(d.l65, d.l60, d.pie, d.contratoReal);
    return calc.estado === filterStatus;
  });

  const selectedDocente = docentes.find(d => d.id === selectedDocenteId);
  const selectedCalc = selectedDocente 
    ? calcularJornadaDocenteMixta(selectedDocente.l65, selectedDocente.l60, selectedDocente.pie, selectedDocente.contratoReal)
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-indigo-100">
      
      {/* Top Header */}
      <header className="bg-slate-900 text-white py-4 px-6 relative overflow-hidden shadow no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚖️</span>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold leading-none">Auditoría Normativa - Carrera Docente</p>
              <h1 className="text-lg font-extrabold tracking-tight mt-1 text-white">Auditor Avanzado de Contratos y Horas Mixtas</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-full uppercase tracking-wider border border-indigo-500/30">
              Ley 20.903 MINEDUC
            </span>
            <Link 
              href="/sostenedor" 
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition border border-white/10"
            >
              ← Volver a Sostenedor
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-[1700px] p-4 sm:p-6 lg:p-8 flex-1 w-full flex flex-col gap-6">
        
        {/* Banner principal */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden no-print">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_20%,rgba(99,102,241,0.15),transparent_60%)]"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Consola de Control Multitramo</h2>
              <p className="text-indigo-200 text-xs mt-2 max-w-4xl leading-relaxed font-light">
                Certifica el cumplimiento de proporciones lectivas (aula) y no lectivas (planificación) cruzando tramos regulares (<span className="font-semibold text-white">65/35</span>) y prioritarios (<span className="font-semibold text-white">60/40</span>) bajo concentración de vulnerabilidad. El motor de cálculo realiza la distribución exacta y proporcional utilizando los valores literales del reglamento oficial.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={limpiarTabla} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs transition flex items-center gap-1.5">
                🗑️ Limpiar
              </button>
              <button onClick={restaurarCasos} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs transition flex items-center gap-1.5">
                🔄 Sincronizar / Restaurar
              </button>
              <button onClick={() => setShowModal(true)} className="px-3 py-2 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-800 rounded-xl font-bold text-xs transition flex items-center gap-1.5">
                📋 Ver Tablas Mineduc
              </button>
              <button onClick={exportarCSV} className="px-3 py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-xl font-bold text-xs transition flex items-center gap-1.5">
                📥 Exportar CSV
              </button>
              <button onClick={agregarFila} className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl font-black text-xs transition shadow-lg shadow-indigo-500/20 flex items-center gap-1.5">
                ➕ Añadir Docente Simulado
              </button>
            </div>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 no-print">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Contrato Mínimo Requerido</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-indigo-600">{totalRequerido}</span>
                <span className="text-xs text-slate-400 font-semibold">hrs</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-100 pt-2">Estimación base por tabla</p>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-sans">Total Contratos Reales</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-800">{totalReal}</span>
                <span className="text-xs text-slate-400 font-semibold">hrs</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-100 pt-2">Carga registrada real</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500 block mb-1">Apoyo PIE / SEP</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-purple-600">{totalPie}</span>
                <span className="text-xs text-slate-400 font-semibold">hrs</span>
              </div>
            </div>
            <p className="text-[10px] text-purple-400/80 mt-2 border-t border-slate-100 pt-2">Horas de apoyo exclusivas</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block mb-1">Horas de Aula Totales</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-blue-600">{totalAulaPed}</span>
                <span className="text-xs text-slate-400 font-semibold">ped</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-100 pt-2 font-sans">Suma de cargas lectivas</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block mb-1">Holguras (Sobrante)</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-emerald-600">{totalSobrantes}</span>
                <span className="text-xs text-slate-400 font-semibold">hrs</span>
              </div>
            </div>
            <p className="text-[10px] text-emerald-500 font-semibold mt-2 border-t border-slate-100 pt-2 flex items-center gap-1">
              ✓ Contratos seguros
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block mb-1">Déficit Docente</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-rose-600">{totalDeficit}</span>
                <span className="text-xs text-slate-400 font-semibold">hrs</span>
              </div>
            </div>
            <p className={`text-[10px] font-semibold mt-2 border-t border-slate-100 pt-2 flex items-center gap-1 ${totalDeficit > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
              {totalDeficit > 0 ? '⚠️ Requiere regularizar' : '✓ Dotación cubierta'}
            </p>
          </div>
        </div>

        {/* Content area: Table & Side Panel */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          {/* Main Table */}
          <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
            
            {/* Search and Filters Bar */}
            <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center no-print">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="w-3.5 h-3.5 bg-indigo-600 rounded-full animate-pulse flex-shrink-0"></span>
                <h2 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">Planilla de Auditoría Multitramo</h2>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                {/* Search input */}
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    🔍
                  </span>
                  <input 
                    type="text" 
                    placeholder="Buscar docente por nombre..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl py-2.5 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition"
                  />
                </div>
                
                {/* Status select */}
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="alerta">Con Infracción Legal</option>
                  <option value="deficit">Con Déficit de Horas</option>
                  <option value="holgura">Con Holgura</option>
                  <option value="exacto">Exacto / Ajustado</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto w-full">
              {isLoading ? (
                <div className="p-16 text-center text-slate-400 font-bold">
                  Cargando nómina docente y realizando auditoría horaria...
                </div>
              ) : filteredDocentes.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4 text-2xl">
                    ⚠️
                  </div>
                  <p className="text-base text-slate-600 font-bold">No se encontraron docentes</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">Prueba ajustando los filtros seleccionados o ingresa un nuevo docente simulado.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[1300px] text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="p-4 pl-6 w-[230px]">Docente / RUN</th>
                      <th className="p-4 text-center w-[120px]">Nivel/Escuela</th>
                      <th className="p-4 text-center bg-indigo-50/15 w-[110px]">Aula 65/35 <br/><span className="text-[10px] font-normal text-slate-400">(Pedagógicas)</span></th>
                      <th className="p-4 text-center bg-purple-50/15 w-[110px]">Aula 60/40 <br/><span className="text-[10px] font-normal text-slate-400">(Pedagógicas)</span></th>
                      <th className="p-4 text-center w-[110px]">Apoyo PIE / SEP <br/><span className="text-[10px] font-normal text-slate-400">(Cronológicas)</span></th>
                      <th className="p-4 text-center bg-slate-100/40 w-[140px]">Sugerido Mínimo <br/><span className="text-[10px] font-normal text-slate-400">(Fórmula Mineduc)</span></th>
                      <th className="p-4 text-center w-[110px]">Contrato Real <br/><span className="text-[10px] font-normal text-slate-400">(Pagado)</span></th>
                      <th className="p-4 text-center w-[180px]">Saldos e Infracción</th>
                      <th className="p-4 text-center w-[110px]">HNL Base <br/><span className="text-[10px] font-normal text-slate-400">(Planificación)</span></th>
                      <th className="p-4 text-center w-[110px]">40% Prep. Clases <br/><span className="text-[10px] font-normal text-slate-400">(Exclusivo Ley)</span></th>
                      <th className="p-4 text-center pr-6 w-[80px] no-print">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                    {filteredDocentes.map(d => {
                      const calc = calcularJornadaDocenteMixta(d.l65, d.l60, d.pie, d.contratoReal);
                      const isSelected = selectedDocenteId === d.id;

                      let badgeClass = 'bg-slate-100 text-slate-600 border border-slate-200';
                      let badgeText = 'Exacto';
                      if (calc.estado === 'alerta') {
                        badgeClass = 'bg-rose-50 text-rose-600 border border-rose-100';
                        badgeText = 'Infracción';
                      } else if (calc.estado === 'deficit') {
                        badgeClass = 'bg-amber-50 text-amber-600 border border-amber-100';
                        badgeText = `Déficit (-${Math.abs(calc.saldo)}h)`;
                      } else if (calc.estado === 'holgura') {
                        badgeClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                        badgeText = `Holgura (+${calc.saldo}h)`;
                      }

                      return (
                        <tr 
                          key={d.id}
                          onClick={() => setSelectedDocenteId(d.id)}
                          className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/30 border-l-4 border-l-indigo-600' : ''}`}
                        >
                          {/* Name / RUN */}
                          <td className="p-4 pl-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{d.nombre}</span>
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">{d.run}</span>
                            </div>
                          </td>

                          {/* Nivel */}
                          <td className="p-4 text-center text-slate-500 font-sans">
                            {d.nivel}
                          </td>

                          {/* Aula 65/35 */}
                          <td className="p-4 text-center bg-indigo-50/5">
                            <input 
                              type="number" 
                              value={d.l65 || ''} 
                              onChange={(e) => updateDocenteVal(d.id, 'l65', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-16 bg-white border border-slate-200 rounded p-1 text-center font-semibold font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                            />
                          </td>

                          {/* Aula 60/40 */}
                          <td className="p-4 text-center bg-purple-50/5">
                            <input 
                              type="number" 
                              value={d.l60 || ''} 
                              onChange={(e) => updateDocenteVal(d.id, 'l60', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-16 bg-white border border-slate-200 rounded p-1 text-center font-semibold font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                            />
                          </td>

                          {/* PIE */}
                          <td className="p-4 text-center">
                            <input 
                              type="number" 
                              value={d.pie || ''} 
                              onChange={(e) => updateDocenteVal(d.id, 'pie', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-16 bg-white border border-slate-200 rounded p-1 text-center font-semibold font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                            />
                          </td>

                          {/* Suggested */}
                          <td className="p-4 text-center bg-slate-50/30">
                            <div className="flex flex-col items-center">
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2 py-0.5 font-bold font-mono">
                                {calc.contratoSugerido} hrs
                              </span>
                              <span className="text-[9px] text-slate-400 mt-1 font-medium">
                                (Base: {calc.req65 + calc.req60} + {d.pie} PIE)
                              </span>
                            </div>
                          </td>

                          {/* Real */}
                          <td className="p-4 text-center">
                            <input 
                              type="number" 
                              value={d.contratoReal || ''} 
                              onChange={(e) => updateDocenteVal(d.id, 'contratoReal', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-16 bg-white border border-slate-200 rounded p-1 text-center font-semibold font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                            />
                          </td>

                          {/* Status */}
                          <td className="p-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${badgeClass}`}>
                                {badgeText}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium max-w-[170px] truncate block" title={calc.mensaje}>
                                {calc.mensaje}
                              </span>
                            </div>
                          </td>

                          {/* HNL */}
                          <td className="p-4 text-center font-mono font-semibold text-blue-600">
                            {formatMinsToString(calc.hnlHC * 60)}
                          </td>

                          {/* Prep Classes */}
                          <td className="p-4 text-center font-mono font-semibold text-emerald-600">
                            {formatMinsToString(calc.prepDocenteHC * 60)}
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-center no-print" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => eliminarDocente(d.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg transition"
                              title="Eliminar Docente"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            
            {/* Analysis card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md relative overflow-hidden transition-all duration-300">
              <div className="absolute top-0 left-0 w-2.5 h-full bg-indigo-600"></div>
              
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2 mb-4">
                📊 Análisis de Jornada Individual
              </h3>

              {selectedDocente && selectedCalc ? (
                <div className="space-y-5 text-xs text-slate-600">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-800 text-sm">{selectedDocente.nombre}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedDocente.run}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-100">
                        Tramo: {selectedDocente.nivel}
                      </span>
                      {selectedDocente.isMock && (
                        <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded border border-slate-200">
                          Simulado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sugerencia info */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Carga Horaria de Aula</p>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2.5 bg-slate-50 border rounded-lg">
                        <span className="text-[9px] block text-slate-400">Regular (65/35)</span>
                        <span className="font-mono font-black text-sm text-slate-700">{selectedDocente.l65} ped</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 border rounded-lg">
                        <span className="text-[9px] block text-slate-400">Prioritario (60/40)</span>
                        <span className="font-mono font-black text-sm text-slate-700">{selectedDocente.l60} ped</span>
                      </div>
                    </div>
                  </div>

                  {/* Suggested vs Real */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Comparación de Contrato</p>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                        <span className="text-[9px] block text-indigo-400">Recomendado</span>
                        <span className="font-mono font-black text-sm text-indigo-700">{selectedCalc.contratoSugerido} hrs</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 border rounded-lg">
                        <span className="text-[9px] block text-slate-400">Contrato Real</span>
                        <span className="font-mono font-black text-sm text-slate-700">{selectedDocente.contratoReal} hrs</span>
                      </div>
                    </div>
                  </div>

                  {/* Regular Contract Splitting details */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Desglose de Contrato Regular ({selectedCalc.cReg} hrs)</p>
                    
                    <div className="space-y-1.5 text-[11px] leading-relaxed">
                      <div className="flex justify-between">
                        <span>Ponderación 65/35:</span>
                        <span className="font-bold">{selectedCalc.c65} hrs contrato (max {selectedCalc.aulaMax65} ped)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ponderación 60/40:</span>
                        <span className="font-bold">{selectedCalc.c60} hrs contrato (max {selectedCalc.aulaMax60} ped)</span>
                      </div>
                      <div className="flex justify-between border-t pt-1.5">
                        <span>Límite Aula Total:</span>
                        <span className="font-bold text-slate-800">{selectedCalc.aulaMaxTotal} ped</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Aula Asignada:</span>
                        <span className={`font-bold ${selectedDocente.l65 + selectedDocente.l60 > selectedCalc.aulaMaxTotal ? 'text-rose-600' : 'text-slate-800'}`}>
                          {selectedDocente.l65 + selectedDocente.l60} ped
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tiempos Cronológicos */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Distribución de Tiempos Semanales</p>
                    
                    <div className="space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span>Lectivo Aula (Cronológico):</span>
                        <span className="font-mono font-bold">{formatMinsToString(selectedCalc.horasLectivasHC * 60)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Recreo Reglamentario:</span>
                        <span className="font-mono font-bold text-blue-600">{formatMinsToString(selectedCalc.recreoHC * 60)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>No Lectivas (Planificación):</span>
                        <span className="font-mono font-bold text-blue-700">{formatMinsToString(selectedCalc.hnlHC * 60)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t pt-1.5">
                        <span>40% Preparación y Evaluaciones:</span>
                        <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {formatMinsToString(selectedCalc.prepDocenteHC * 60)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t pt-1.5">
                        <span>Horas Vacantes / No Destinadas:</span>
                        <span className={`font-mono font-bold ${selectedCalc.horasVacantesHC > 0.05 ? 'text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded' : 'text-slate-500'}`}>
                          {formatMinsToString(selectedCalc.horasVacantesHC * 60)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Verification Status message */}
                  <div className={`p-3.5 rounded-xl text-[11px] leading-relaxed border ${
                    selectedCalc.estado === 'alerta' ? 'bg-rose-50 border-rose-200 text-rose-900' :
                    selectedCalc.estado === 'deficit' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                    selectedCalc.estado === 'holgura' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                    'bg-blue-50 border-blue-200 text-blue-900'
                  }`}>
                    <p className="font-bold flex items-center gap-1.5">
                      <span>{selectedCalc.estado === 'alerta' ? '⚠️ Infracción Normativa' : '✓ Auditoría Concluida'}</span>
                    </p>
                    <p className="mt-1 font-medium">{selectedCalc.mensaje}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed text-center text-slate-400 italic">
                  Selecciona un docente en la planilla para desplegar su analítica en tiempo real.
                </div>
              )}
            </div>

            {/* Glossary / Rules */}
            <div className="bg-slate-900 text-slate-200 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-400 mb-3 block">
                Reglas y Límites Estatutarios
              </h4>
              <div className="space-y-3.5 text-[11px] leading-relaxed text-slate-400">
                <div>
                  <h5 className="font-bold text-white mb-0.5">¿Qué es un Contrato Mixto?</h5>
                  <p>Es el caso en que un docente reparte sus horas en establecimientos regulares (65/35) y prioritarios con alta vulnerabilidad (60/40), requiriendo un prorrateo de su tope máximo lectivo.</p>
                </div>
                <div>
                  <h5 className="font-bold text-white mb-0.5">La Regla del 40% HNL</h5>
                  <p>Al menos el 40% de las horas No Lectivas totales del contrato deben quedar legalmente reservadas de forma exclusiva para preparación de clases y evaluaciones en aula.</p>
                </div>
                <div>
                  <h5 className="font-bold text-white mb-0.5">Recreos en la Carrera Docente</h5>
                  <p>Los recreos no forman parte de la planificación libre (HNL), sino que se calculan y resguardan de forma proporcional al bloque de docencia directa para cumplir el marco legal.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal - Referencia Mineduc */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div onClick={() => setShowModal(false)} className="fixed inset-0 bg-slate-900/60 transition-opacity"></div>

            {/* Center Content */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">Tablas de Equivalencias Carrer Docente Mineduc</h3>
                  <p className="text-xs text-indigo-200 mt-1">Valores oficiales correspondientes al reglamento de la Ley de Carrera Docente 20.903</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-white hover:text-indigo-200 text-2xl font-bold">&times;</button>
              </div>
              
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[65vh] overflow-y-auto text-xs">
                {/* 65/35 */}
                <div>
                  <h4 className="text-xs font-black text-indigo-700 mb-3 uppercase tracking-wider">Régimen Regular (65% Aula / 35% No Lectivo)</h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                        <tr>
                          <th className="p-2.5 text-center">Jornada (Hrs)</th>
                          <th className="p-2.5 text-center">Aula Máx (Ped)</th>
                          <th className="p-2.5 text-center">Aula Máx (HC)</th>
                          <th className="p-2.5 text-center">Recreos</th>
                          <th className="p-2.5 text-center">HNL Base</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                        {TABLA_HORAS_ESTRUCTURADA.regimen_65_35.map(e => (
                          <tr key={e.jornada_semanal} className="hover:bg-slate-50">
                            <td className="p-2 text-center font-bold">{e.jornada_semanal}</td>
                            <td className="p-2 text-center font-semibold text-indigo-600">{e.horas_lectivas_HA}</td>
                            <td className="p-2 text-center">{e.horas_lectivas_hc}</td>
                            <td className="p-2 text-center">{e.recreo}</td>
                            <td className="p-2 text-center font-semibold text-blue-600">{e.horas_no_lectivas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 60/40 */}
                <div>
                  <h4 className="text-xs font-black text-purple-700 mb-3 uppercase tracking-wider">Régimen Prioritario (60% Aula / 40% No Lectivo)</h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                        <tr>
                          <th className="p-2.5 text-center">Jornada (Hrs)</th>
                          <th className="p-2.5 text-center">Aula Máx (Ped)</th>
                          <th className="p-2.5 text-center">Aula Máx (HC)</th>
                          <th className="p-2.5 text-center">Recreos</th>
                          <th className="p-2.5 text-center">HNL Base</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                        {TABLA_HORAS_ESTRUCTURADA.regimen_60_40.map(e => (
                          <tr key={e.jornada_semanal} className="hover:bg-slate-50">
                            <td className="p-2 text-center font-bold">{e.jornada_semanal}</td>
                            <td className="p-2 text-center font-semibold text-purple-600">{e.horas_lectivas_HA}</td>
                            <td className="p-2 text-center">{e.horas_lectivas_hc}</td>
                            <td className="p-2 text-center">{e.recreo}</td>
                            <td className="p-2 text-center font-semibold text-blue-600">{e.horas_no_lectivas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 border-t border-slate-150 flex justify-end">
                <button onClick={() => setShowModal(false)} className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full no-print">
        {toasts.map(t => {
          let bgClass = 'border-indigo-200 text-indigo-800 bg-indigo-50/95';
          if (t.type === 'success') bgClass = 'border-emerald-200 text-emerald-800 bg-emerald-50/95';
          if (t.type === 'error') bgClass = 'border-rose-200 text-rose-800 bg-rose-50/95';
          if (t.type === 'warning') bgClass = 'border-amber-200 text-amber-800 bg-amber-50/95';

          return (
            <div key={t.id} className={`p-4 rounded-xl shadow-lg border text-xs font-bold flex items-center justify-between gap-3 transition-all duration-300 w-full ${bgClass}`}>
              <span>{t.text}</span>
              <button onClick={() => removeToast(t.id)} className="text-base font-semibold leading-none hover:opacity-75">&times;</button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
