'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Table as TableIcon, 
  LayoutGrid, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  User, 
  Briefcase, 
  BookOpen, 
  Layers,
  ArrowUpDown,
  Download
} from 'lucide-react';
import { calcularJornadaMinutos, formatMinutosAHorasTexto } from '@/core/mineduc/calculoJornada';

export interface DocenteItem {
  rut: string;
  nombres: string;
  apellidos: string;
  rbd: string;
  escuelaNombre?: string;
  horasContrato: number;
  horasPedagogicasAsignadas: number;
  tramoCarrera: 'Acceso' | 'Inicial' | 'Temprano' | 'Avanzado' | 'Experto I' | 'Experto II' | 'Sin Tramo';
  tipoContrato: 'Planta' | 'Contrata' | 'Reemplazo' | 'Honorarios';
  asignaturaPrincipal?: string;
}

export interface ListaDinamicaDocentesProps {
  docentes: DocenteItem[];
  cargando?: boolean;
  onSelectDocente?: (docente: DocenteItem) => void;
  onExportarCSV?: () => void;
}

export type VistaModo = 'tabla' | 'kanban';
export type AgrupacionModo = 'ninguno' | 'tramo' | 'semaforo' | 'tipoContrato';

export function ListaDinamicaDocentes({
  docentes,
  cargando = false,
  onSelectDocente,
  onExportarCSV
}: ListaDinamicaDocentesProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipoContrato, setFiltroTipoContrato] = useState<string>('todos');
  const [filtroTramo, setFiltroTramo] = useState<string>('todos');
  const [filtroSemaforo, setFiltroSemaforo] = useState<string>('todos');
  const [vista, setVista] = useState<VistaModo>('tabla');
  const [agrupacion, setAgrupacion] = useState<AgrupacionModo>('ninguno');
  const [ordenAsc, setOrdenAsc] = useState<boolean>(true);

  // Filtrado multidimensional
  const docentesFiltrados = useMemo(() => {
    return docentes.filter(d => {
      const calculo = calcularJornadaMinutos(d.horasContrato, d.horasPedagogicasAsignadas);
      const query = busqueda.toLowerCase().trim();
      const coincideTexto = !query || 
        `${d.nombres} ${d.apellidos}`.toLowerCase().includes(query) ||
        d.rut.toLowerCase().includes(query) ||
        (d.asignaturaPrincipal && d.asignaturaPrincipal.toLowerCase().includes(query)) ||
        d.rbd.includes(query);

      const coincideContrato = filtroTipoContrato === 'todos' || d.tipoContrato === filtroTipoContrato;
      const coincideTramo = filtroTramo === 'todos' || d.tramoCarrera === filtroTramo;
      
      let coincideSemaforo = true;
      if (filtroSemaforo === 'ok') coincideSemaforo = !calculo.esSobreasignado && calculo.horasPedagogicasVacantes === 0;
      else if (filtroSemaforo === 'sobreasignado') coincideSemaforo = calculo.esSobreasignado;
      else if (filtroSemaforo === 'vacante') coincideSemaforo = calculo.horasPedagogicasVacantes > 0;

      return coincideTexto && coincideContrato && coincideTramo && coincideSemaforo;
    }).sort((a, b) => {
      const nombreA = `${a.apellidos} ${a.nombres}`;
      const nombreB = `${b.apellidos} ${b.nombres}`;
      return ordenAsc ? nombreA.localeCompare(nombreB) : nombreB.localeCompare(nombreA);
    });
  }, [docentes, busqueda, filtroTipoContrato, filtroTramo, filtroSemaforo, ordenAsc]);

  // Agrupación dinámica conmutable
  const grupos = useMemo(() => {
    if (agrupacion === 'ninguno') {
      return [{ titulo: 'Todos los Docentes', items: docentesFiltrados }];
    }

    const mapa = new Map<string, DocenteItem[]>();

    docentesFiltrados.forEach(d => {
      let clave = 'General';
      if (agrupacion === 'tramo') clave = `Tramo: ${d.tramoCarrera}`;
      else if (agrupacion === 'tipoContrato') clave = `Contrato: ${d.tipoContrato}`;
      else if (agrupacion === 'semaforo') {
        const calculo = calcularJornadaMinutos(d.horasContrato, d.horasPedagogicasAsignadas);
        if (calculo.esSobreasignado) clave = '🔴 Sobreasignados (Riesgo SuperEduc)';
        else if (calculo.horasPedagogicasVacantes > 0) clave = '🟡 Carga Inconclusa (Horas Vacantes)';
        else clave = '🟢 Distribución Correcta (100% Ok)';
      }

      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave)!.push(d);
    });

    return Array.from(mapa.entries()).map(([titulo, items]) => ({ titulo, items }));
  }, [docentesFiltrados, agrupacion]);

  if (cargando) {
    return <SkeletonList />;
  }

  return (
    <div className="w-full space-y-4">
      {/* Barra Superior de Herramientas: Búsqueda, Filtros, Agrupación y Vistas */}
      <div className="glass-panel p-4 rounded-xl shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-3">
        
        {/* Campo de Búsqueda Ultarrápida */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Nombre, RUT, RBD o Asignatura..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
        </div>

        {/* Filtros Multidimensionales */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filtroTramo}
              onChange={(e) => setFiltroTramo(e.target.value)}
              className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los Tramos</option>
              <option value="Acceso">Acceso</option>
              <option value="Inicial">Inicial</option>
              <option value="Temprano">Temprano</option>
              <option value="Avanzado">Avanzado</option>
              <option value="Experto I">Experto I</option>
              <option value="Experto II">Experto II</option>
            </select>
          </div>

          <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
            <select
              value={filtroSemaforo}
              onChange={(e) => setFiltroSemaforo(e.target.value)}
              className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los Estados (65/35)</option>
              <option value="ok">🟢 Distribución Correcta</option>
              <option value="sobreasignado">🔴 Sobreasignados (Riesgo)</option>
              <option value="vacante">🟡 Horas Vacantes</option>
            </select>
          </div>

          <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={agrupacion}
              onChange={(e) => setAgrupacion(e.target.value as AgrupacionModo)}
              className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ninguno">Sin Agrupar</option>
              <option value="tramo">Agrupar por Tramo</option>
              <option value="semaforo">Agrupar por Semáforo</option>
              <option value="tipoContrato">Agrupar por Contrato</option>
            </select>
          </div>

          {/* Toggle Vista Tabla vs Cards */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setVista('tabla')}
              title="Vista Tabla Densa (Auditoría UATP)"
              className={`p-1.5 rounded-md transition-all ${vista === 'tabla' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setVista('kanban')}
              title="Vista Tarjetas (Gestión Directiva)"
              className={`p-1.5 rounded-md transition-all ${vista === 'kanban' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {onExportarCSV && (
            <button
              onClick={onExportarCSV}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>
          )}

        </div>
      </div>

      {/* Contenido Renderizado por Grupos */}
      {docentesFiltrados.length === 0 ? (
        <div className="glass-panel p-8 rounded-xl text-center text-slate-500 space-y-2">
          <User className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-sm font-medium">No se encontraron docentes con los filtros seleccionados.</p>
        </div>
      ) : (
        grupos.map((grupo, gIndex) => (
          <div key={gIndex} className="space-y-3">
            {agrupacion !== 'ninguno' && (
              <div className="flex items-center space-x-2 pt-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{grupo.titulo}</h3>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
                  {grupo.items.length}
                </span>
              </div>
            )}

            {vista === 'tabla' ? (
              <RenderTablaDensa items={grupo.items} onSelectDocente={onSelectDocente} />
            ) : (
              <RenderCardsKanban items={grupo.items} onSelectDocente={onSelectDocente} />
            )}
          </div>
        ))
      )}
    </div>
  );
}

function RenderTablaDensa({ items, onSelectDocente }: { items: DocenteItem[]; onSelectDocente?: (d: DocenteItem) => void }) {
  return (
    <div className="glass-panel rounded-xl overflow-hidden shadow-xs border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Docente</th>
              <th className="py-3 px-4">RUT</th>
              <th className="py-3 px-4">RBD</th>
              <th className="py-3 px-4">Tramo</th>
              <th className="py-3 px-4">Jornada</th>
              <th className="py-3 px-4">Capacidad Lectiva</th>
              <th className="py-3 px-4 text-center">Estado 65/35</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 bg-white/70">
            {items.map((docente, idx) => {
              const calculo = calcularJornadaMinutos(docente.horasContrato, docente.horasPedagogicasAsignadas);
              return (
                <tr 
                  key={idx} 
                  onClick={() => onSelectDocente && onSelectDocente(docente)}
                  className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {docente.apellidos}, {docente.nombres}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{docente.rut}</td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{docente.rbd}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-[11px] font-medium">
                      {docente.tramoCarrera}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{docente.horasContrato} hrs</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">
                        {docente.horasPedagogicasAsignadas} / {calculo.horasPedagogicasDisponiblesMax} HA
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Lectivo: {formatMinutosAHorasTexto(calculo.minutosLectivosAsignados)} | Recreo: {formatMinutosAHorasTexto(calculo.minutosRecreoAsignados)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {calculo.esSobreasignado ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-[11px] font-bold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Sobreasignado (+{formatMinutosAHorasTexto(calculo.minutosSobreasignados)})</span>
                      </span>
                    ) : calculo.horasPedagogicasVacantes > 0 ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[11px] font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Vacante ({calculo.horasPedagogicasVacantes} HA libre)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Cumple 65/35 (100% Ok)</span>
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
  );
}

function RenderCardsKanban({ items, onSelectDocente }: { items: DocenteItem[]; onSelectDocente?: (d: DocenteItem) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((docente, idx) => {
        const calculo = calcularJornadaMinutos(docente.horasContrato, docente.horasPedagogicasAsignadas);
        const porcentajeUso = Math.min(100, Math.round((docente.horasPedagogicasAsignadas / calculo.horasPedagogicasDisponiblesMax) * 100));

        return (
          <div
            key={idx}
            onClick={() => onSelectDocente && onSelectDocente(docente)}
            className="glass-panel p-4 rounded-xl hover:shadow-md transition-all duration-150 cursor-pointer border border-slate-200/90 space-y-3"
          >
            {/* Header Tarjeta */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-900 text-amber-400 flex items-center justify-center font-bold text-sm shadow-xs">
                  {docente.nombres.charAt(0)}{docente.apellidos.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    {docente.apellidos}, {docente.nombres}
                  </h4>
                  <p className="text-[11px] font-mono text-slate-500">{docente.rut}</p>
                </div>
              </div>

              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold border border-slate-200">
                {docente.tramoCarrera}
              </span>
            </div>

            {/* Detalles */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
              <div>
                <span className="block text-slate-400 text-[10px]">Jornada Contrato</span>
                <span className="font-semibold text-slate-800">{docente.horasContrato} hrs ({docente.tipoContrato})</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px]">RBD Escuela</span>
                <span className="font-semibold text-slate-800">{docente.rbd}</span>
              </div>
            </div>

            {/* Barra de Progreso Capacidad Lectiva */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-medium">
                <span className="text-slate-600">Horas Aula Asignadas</span>
                <span className="font-bold text-slate-900">
                  {docente.horasPedagogicasAsignadas} / {calculo.horasPedagogicasDisponiblesMax} HA ({porcentajeUso}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`h-full transition-all duration-300 ${
                    calculo.esSobreasignado 
                      ? 'bg-rose-500' 
                      : porcentajeUso === 100 
                        ? 'bg-emerald-500' 
                        : 'bg-amber-400'
                  }`}
                  style={{ width: `${porcentajeUso}%` }}
                />
              </div>
            </div>

            {/* Badge de Estado 65/35 */}
            <div className="pt-1 flex items-center justify-between">
              {calculo.esSobreasignado ? (
                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold flex items-center space-x-1">
                  <XCircle className="w-3 h-3" />
                  <span>Sobreasignado ({formatMinutosAHorasTexto(calculo.minutosSobreasignados)})</span>
                </span>
              ) : calculo.horasPedagogicasVacantes > 0 ? (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Vacante ({calculo.horasPedagogicasVacantes} HA libre)</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>100% Cumple 65/35</span>
                </span>
              )}

              <span className="text-[10px] text-slate-400">HNL: {formatMinutosAHorasTexto(calculo.minutosNoLectivosCalculados)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-14 bg-slate-200/80 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-44 bg-slate-200/70 rounded-xl" />
        <div className="h-44 bg-slate-200/70 rounded-xl" />
        <div className="h-44 bg-slate-200/70 rounded-xl" />
      </div>
    </div>
  );
}
