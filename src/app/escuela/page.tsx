// src/app/escuela/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api, dbLocal } from '@/lib/supabase';
import { 
  Establecimiento, 
  Contrato, 
  Funcionario, 
  CursoDinamico, 
  AsignacionAula, 
  TareaReemplazo, 
  ReemplazoDetalle,
  OrigenFondo
} from '@/lib/types';
import { validarCargaDocente } from '@/lib/rulesEngine';

export default function DirectorDashboard() {
  const router = useRouter();
  const [rbd, setRbd] = useState<string>('');
  const [escuela, setEscuela] = useState<Establecimiento | null>(null);
  
  // Estados de datos
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [cursos, setCursos] = useState<CursoDinamico[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAula[]>([]);
  const [tareasReemplazo, setTareasReemplazo] = useState<TareaReemplazo[]>([]);
  const [reemplazosList, setReemplazosList] = useState<ReemplazoDetalle[]>([]);

  // Estados de formularios y UI
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'dotacion' | 'cursos' | 'reemplazos'>('dotacion');
  
  // Formulario Nuevo Curso
  const [nuevoCursoNombre, setNuevoCursoNombre] = useState('');
  const [nuevoCursoNivel, setNuevoCursoNivel] = useState('1° a 4° Básico');
  const [nuevoCursoRegimen, setNuevoCursoRegimen] = useState<'JEC' | 'No JEC'>('JEC');

  // Formulario Nueva Licencia/Reemplazo
  const [selectedContratoId, setSelectedContratoId] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaTermino, setFechaTermino] = useState('');
  const [reemplazoRun, setReemplazoRun] = useState('');
  const [reemplazoNombre, setReemplazoNombre] = useState('');

  // Carga inicial controlada
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRbd = localStorage.getItem('slep_sim_rbd') || '10202';
      setRbd(storedRbd);
    }
  }, []);

  useEffect(() => {
    if (!rbd) return;

    async function loadDirectorData() {
      setLoading(true);
      const est = await api.getEstablecimientoByRbd(rbd);
      if (est) setEscuela(est);

      const allConts = await api.getContratos(rbd);
      setContratos(allConts);

      const allFuncs = await api.getFuncionarios();
      setFuncionarios(allFuncs);

      const schoolCursos = await api.getCursosDinamicos(rbd);
      setCursos(schoolCursos);

      const schoolAsigs = await api.getAsignacionesPorEstablecimiento(rbd);
      setAsignaciones(schoolAsigs);

      const tasks = await api.getTareasReemplazo();
      setTareasReemplazo(tasks.filter(t => t.rbd === rbd));

      const rems = await api.getReemplazosLicencias();
      setReemplazosList(rems.filter(r => r.rbd === rbd));
      
      setLoading(false);
    }

    loadDirectorData();
  }, [rbd]);

  //useMemo para mitigar cuellos de botella en los listados pesados de personal
  const listaDocentesConCalculo = useMemo(() => {
    return contratos.map(contrato => {
      const funcionario = funcionarios.find(f => f.run === contrato.funcionario_run);
      const asigsDocente = asignaciones.filter(a => a.contrato_id === contrato.id);
      const calculoLey = escuela ? validarCargaDocente(contrato, escuela, asigsDocente) : null;

      return {
        contrato,
        funcionario,
        calculoLey
      };
    });
  }, [contratos, funcionarios, asignaciones, escuela]);

  const handleCrearCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCursoNombre.trim()) return;

    const nuevo: CursoDinamico = {
      rbd,
      nombre: nuevoCursoNombre.trim(),
      nivel: nuevoCursoNivel,
      regimen: nuevoCursoRegimen
    };

    await api.crearCursoDinamico(nuevo);
    setCursos([...cursos, nuevo]);
    setNuevoCursoNombre('');
  };

  const handleEliminarCurso = async (nombre: string) => {
    if (confirm(`¿Estás seguro de eliminar el curso ${nombre}? Esto borrará todas sus asignaciones de aula.`)) {
      await api.eliminarCursoDinamico(rbd, nombre);
      setCursos(cursos.filter(c => c.nombre !== nombre));
      setAsignaciones(asignaciones.filter(a => a.curso !== nombre));
    }
  };

  const handleRegistrarLicencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContratoId || !fechaInicio || !fechaTermino) return;

    const cont = contratos.find(c => c.id === selectedContratoId);
    if (!cont) return;

    const func = funcionarios.find(f => f.run === cont.funcionario_run);
    const nombreTitular = func ? func.nombre : 'Docente Titular';

    // 1. Modificar estado del contrato a Licencia Médica en Supabase/Local
    await api.updateContratoEstado(selectedContratoId, 'Licencia Médica', null, fechaInicio, fechaTermino);
    
    // 2. Levantar Tarea de Reemplazo para el Sostenedor
    const nuevaTarea: TareaReemplazo = {
      id: `task-${Date.now()}`,
      rbd,
      funcionario_titular_run: cont.funcionario_run,
      funcionario_titular_nombre: nombreTitular,
      horas_a_cubrir: cont.horas_totales,
      estado: 'Pendiente'
    };
    
    await api.crearTareaReemplazo(nuevaTarea);

    // Si se ingresó un reemplazo inmediato en la vista
    if (reemplazoRun.trim() && reemplazoNombre.trim()) {
      const nuevoReemplazoDetalle: ReemplazoDetalle = {
        id: `rep-${Date.now()}`,
        contrato_titular_id: selectedContratoId,
        reemplazo_run: reemplazoRun.trim(),
        reemplazo_nombre: reemplazoNombre.trim(),
        rbd,
        horas: cont.horas_totales,
        fecha_inicio: fechaInicio,
        fecha_termino: fechaTermino,
        validado_por_director: true,
        origen_fondo: 'Subvención Regular',
        calidad_juridica: 'Reemplazo'
      };
      await api.saveReemplazoLicencia(nuevoReemplazoDetalle);
      setReemplazosList([...reemplazosList, nuevoReemplazoDetalle]);
      await api.resolverTareaReemplazo(nuevaTarea.id, reemplazoRun.trim());
    }

    // Refrescar estado local de contratos
    const updatedConts = await api.getContratos(rbd);
    setContratos(updatedConts);
    
    // Limpiar formulario
    setSelectedContratoId('');
    setFechaInicio('');
    setFechaTermino('');
    setReemplazoRun('');
    setReemplazoNombre('');
    alert('✅ Licencia registrada y enviada a revisión técnica del Sostenedor.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-slep-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-500">Cargando dependencias normativas del RBD...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar Superior Escolar */}
      <header className="bg-slate-900 text-white px-8 py-4 shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="bg-slep-gold text-slate-900 font-black px-2.5 py-1 rounded text-sm tracking-tight">RBD {rbd}</span>
          <div>
            <h1 className="font-bold text-lg leading-tight">{escuela?.nombre}</h1>
            <p className="text-xs text-slate-400">Régimen: {escuela?.regimen} • IVM: {escuela?.ivm}% • Comuna: {escuela?.comuna}</p>
          </div>
        </div>
        <button 
          onClick={() => router.push('/')}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-xs font-bold border border-slate-700 transition-colors"
        >
          ← Cambiar Perfil / Salir
        </button>
      </header>

      {/* Tabs Operativas */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 mt-6">
        <div className="border-b border-slate-200 flex gap-2">
          {[
            { id: 'dotacion', label: '📊 Dotación y Ley 20.903', icon: '👤' },
            { id: 'cursos', label: '🏫 Configuración de Cursos', icon: '📚' },
            { id: 'reemplazos', label: '🩺 Licencias y Reemplazos', icon: '🩹' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'border-slep-blue text-slep-blue bg-white rounded-t-lg' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido Central */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6">
        
        {/* PESTAÑA 1: DOTACIÓN Y LEY 20903 */}
        {activeTab === 'dotacion' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 text-base mb-2">Análisis de Distribución de Horas Cronológicas</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                A continuación se listan todos los contratos vigentes de su establecimiento. El motor de reglas calcula en tiempo real si el total de horas destinadas a aula (horas lectivas) respeta los máximos estipulados por la **Carrera Docente** (65% máximo lectivo o 60% bajo condiciones especiales de vulnerabilidad).
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <th className="p-4">Funcionario</th>
                      <th className="p-4">Función Principal</th>
                      <th className="p-4 text-center">Calidad Jurídica</th>
                      <th className="p-4 text-center">Hrs. Contrato</th>
                      <th className="p-4 text-center">Max. Lectivo (Ley)</th>
                      <th className="p-4 text-center">Hrs. Aula Asignadas</th>
                      <th className="p-4 text-center">Estado Ley 20.903</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {listaDocentesConCalculo.map(({ contrato, funcionario, calculoLey }) => (
                      <tr key={contrato.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{funcionario?.nombre || 'No cargado'}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{contrato.funcionario_run}</div>
                        </td>
                        <td className="p-4 text-slate-600 font-medium">{contrato.funcion_principal}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            contrato.calidad_juridica === 'Titular' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {contrato.calidad_juridica}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-800">{contrato.horas_totales} hrs</td>
                        <td className="p-4 text-center text-slate-500 font-medium">
                          {calculoLey ? `${calculoLey.horasLectivasMaximas} hrs (${calculoLey.proporcionLectiva}%)` : '--'}
                        </td>
                        <td className="p-4 text-center font-bold text-slate-800">
                          {contrato.estado === 'Licencia Médica' ? (
                            <span className="text-amber-600">🩹 Licencia Activa</span>
                          ) : (
                            `${calculoLey?.horasLectivasAsignadas} hrs`
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {contrato.estado === 'Licencia Médica' ? (
                            <span className="text-slate-400 font-medium">No aplica</span>
                          ) : calculoLey?.cumpleLey20903 ? (
                            <span className="text-emerald-600 font-bold flex items-center justify-center gap-1">✅ Cumple</span>
                          ) : (
                            <span className="text-rose-600 font-bold flex items-center justify-center gap-1 animate-pulse">❌ Infracción</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {listaDocentesConCalculo.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center p-8 text-slate-400 font-medium">No se registran contratos vigentes en este RBD.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: CONFIGURACIÓN DE CURSOS */}
        {activeTab === 'cursos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulario de Curso */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
              <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider text-slate-400">Apertura de Curso</h3>
              <form onSubmit={handleCrearCurso} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Nombre del Curso</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. 1° Básico A"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slep-blue outline-none"
                    value={nuevoCursoNombre}
                    onChange={(e) => setNuevoCursoNombre(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Nivel de Estudio (MINEDUC)</label>
                  <select 
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    value={nuevoCursoNivel}
                    onChange={(e) => setNuevoCursoNivel(e.target.value)}
                  >
                    <option value="1° a 4° Básico">1° a 4° año de Educación Básica</option>
                    <option value="5° a 6° Básico">5° a 6° año de Educación Básica</option>
                    <option value="7° a 8° Básico">7° a 8° año de Educación Básica</option>
                    <option value="1° y 2° Medio">1° y 2° año de Educación Media</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Régimen Horario</label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                      <input type="radio" checked={nuevoCursoRegimen === 'JEC'} onChange={() => setNuevoCursoRegimen('JEC')} /> JEC
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                      <input type="radio" checked={nuevoCursoRegimen === 'No JEC'} onChange={() => setNuevoCursoRegimen('No JEC')} /> No JEC
                    </label>
                  </div>
                </div>
                <button type="submit" className="w-full bg-slep-blue hover:bg-slep-blue-hover text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm mt-2">
                  + Registrar Curso Obligatorio
                </button>
              </form>
            </div>

            {/* Listado de Cursos */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider text-slate-400">Estructura de Cursos Habilitados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cursos.map(curso => (
                  <div key={curso.nombre} className="border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-slate-300 bg-slate-50/50">
                    <div>
                      <h4 className="font-black text-sm text-slate-800">{curso.nombre}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{curso.nivel} • <span className="font-bold text-slate-600">{curso.regimen}</span></p>
                    </div>
                    <button 
                      onClick={() => handleEliminarCurso(curso.nombre)}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-colors text-xs font-bold"
                    >
                      🗑️ Quitar
                    </button>
                  </div>
                ))}
                {cursos.length === 0 && (
                  <div className="col-span-2 text-center p-8 text-slate-400 font-medium text-xs">No se registran cursos abiertos en el actual año académico.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: LICENCIAS Y REEMPLAZOS */}
        {activeTab === 'reemplazos' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Reportar Licencia */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider text-slate-400">Reportar Licencia Médica</h3>
                <form onSubmit={handleRegistrarLicencia} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600">Docente Afectado</label>
                    <select 
                      required
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                      value={selectedContratoId}
                      onChange={(e) => setSelectedContratoId(e.target.value)}
                    >
                      <option value="">-- Seleccionar Funcionario --</option>
                      {contratos.filter(c => c.estado !== 'Licencia Médica').map(c => {
                        const f = funcionarios.find(x => x.run === c.funcionario_run);
                        return (
                          <option key={c.id} value={c.id}>{f?.nombre} ({c.horas_totales} hrs)</option>
                        );
                      })}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">Fecha Inicio</label>
                      <input type="date" required className="w-full p-2 border border-slate-300 rounded-lg text-xs" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">Fecha Término</label>
                      <input type="date" required className="w-full p-2 border border-slate-300 rounded-lg text-xs" value={fechaTermino} onChange={(e) => setFechaTermino(e.target.value)} />
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3 mt-2 space-y-3">
                    <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-2 rounded border border-amber-200">
                      💡 Opcional: Si cuenta inmediatamente con un docente calificado para cubrir la vacante, ingrese sus datos abajo para su pre-aprobación automática.
                    </p>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">RUN Docente Reemplazo</label>
                      <input type="text" placeholder="12.345.678-9" className="w-full p-2 border border-slate-300 rounded-lg text-xs" value={reemplazoRun} onChange={(e) => setReemplazoRun(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">Nombre Completo Reemplazo</label>
                      <input type="text" placeholder="Juan Carlos Poblete" className="w-full p-2 border border-slate-300 rounded-lg text-xs" value={reemplazoNombre} onChange={(e) => setReemplazoNombre(e.target.value)} />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-lg text-xs transition-colors shadow-sm">
                    🩹 Grabar Licencia y Solicitar Reemplazo
                  </button>
                </form>
              </div>

              {/* Monitoreo de Reemplazos */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400 mb-3">Reemplazos Solicitados en Proceso de Aprobación</h3>
                  <div className="space-y-2">
                    {tareasReemplazo.map(t => (
                      <div key={t.id} className="border border-slate-200 rounded-lg p-3.5 flex items-center justify-between text-xs bg-slate-50/50">
                        <div>
                          <div className="font-bold text-slate-800">Titular: {t.funcionario_titular_nombre}</div>
                          <div className="text-slate-500 mt-0.5">Horas Espejo Requeridas: <span className="font-bold text-slate-700">{t.horas_a_cubrir} hrs</span></div>
                        </div>
                        <div>
                          {t.estado === 'Pendiente' ? (
                            <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2.5 py-1 rounded-full text-[10px] animate-pulse">⏳ Buscando Reemplazo</span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-1 rounded-full text-[10px]">✅ Asignado (RUN {t.reemplazo_run})</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {tareasReemplazo.length === 0 && (
                      <div className="text-center p-6 text-slate-400 font-medium text-xs">No hay alertas de reemplazos pendientes de dotación.</div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400 mb-3">Historial / Contratos de Reemplazo Vigentes</h3>
                  <div className="space-y-2">
                    {reemplazosList.map(r => (
                      <div key={r.id} className="border border-slate-100 rounded-lg p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div>
                          <div className="font-bold text-slate-800">{r.reemplazo_nombre}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Vigencia: {r.fecha_inicio} al {r.fecha_termino} • <span className="font-black text-slate-700">{r.horas} hrs</span></div>
                        </div>
                        <span className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">Activo en Aula</span>
                      </div>
                    ))}
                    {reemplazosList.length === 0 && (
                      <div className="text-center p-6 text-slate-400 font-medium text-xs">No se registran reemplazos históricos ingresados en este ciclo.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
