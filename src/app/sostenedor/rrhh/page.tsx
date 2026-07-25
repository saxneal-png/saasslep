'use client';

import React, { useState } from 'react';
import { NavbarContextual, UserRoleContext } from '@/components/ui/NavbarContextual';
import { ListaDinamicaDocentes, DocenteItem } from '@/components/ui/ListaDinamicaDocentes';
import { 
  ShieldAlert, 
  Users, 
  Award, 
  BookOpen, 
  FileText, 
  DollarSign, 
  Calendar, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Edit3, 
  PlusCircle, 
  Sparkles, 
  FileSpreadsheet,
  Clock,
  Building2,
  HeartHandshake
} from 'lucide-react';
import { calcularJornadaMinutos, formatMinutosAHorasTexto } from '@/core/mineduc/calculoJornada';
import { exportarTablaAExcel, exportarTablaAPdf } from '@/lib/exportUtils';
import { validarRutChileno, normalizarRutChileno, DocenteIngestaSchema } from '@/core/ingesta/schemas';

const INITIAL_DOCENTES: DocenteItem[] = [
  {
    rut: '12.345.678-5',
    nombres: 'María Paz',
    apellidos: 'González López',
    rbd: '101',
    escuelaNombre: 'Liceo Polivalente Manuel Bulnes',
    horasContrato: 44,
    horasPedagogicasAsignadas: 38,
    tramoCarrera: 'Avanzado',
    tipoContrato: 'Planta',
    asignaturaPrincipal: 'Lengua y Literatura'
  },
  {
    rut: '11.111.111-1',
    nombres: 'Carlos Eduardo',
    apellidos: 'Rojas Sepúlveda',
    rbd: '101',
    escuelaNombre: 'Liceo Polivalente Manuel Bulnes',
    horasContrato: 44,
    horasPedagogicasAsignadas: 39, // Sobreasignado
    tramoCarrera: 'Inicial',
    tipoContrato: 'Contrata',
    asignaturaPrincipal: 'Matemática'
  },
  {
    rut: '9.876.543-2',
    nombres: 'Patricia Elena',
    apellidos: 'Silva Morales',
    rbd: '102',
    escuelaNombre: 'Escuela E-250 San Ignacio',
    horasContrato: 30,
    horasPedagogicasAsignadas: 15, // Vacante
    tramoCarrera: 'Experto I',
    tipoContrato: 'Contrata',
    asignaturaPrincipal: 'Ciencias Naturales'
  },
  {
    rut: '14.567.890-K',
    nombres: 'Fernando',
    apellidos: 'Muñoz Alarcón',
    rbd: '103',
    escuelaNombre: 'Liceo Arturo Prat Chacón',
    horasContrato: 44,
    horasPedagogicasAsignadas: 38,
    tramoCarrera: 'Experto II',
    tipoContrato: 'Planta',
    asignaturaPrincipal: 'Historia y Geografía'
  },
  {
    rut: '15.678.901-2',
    nombres: 'Daniela Andrea',
    apellidos: 'Vargas Castro',
    rbd: '102',
    escuelaNombre: 'Escuela E-250 San Ignacio',
    horasContrato: 20,
    horasPedagogicasAsignadas: 17,
    tramoCarrera: 'Temprano',
    tipoContrato: 'Contrata',
    asignaturaPrincipal: 'Inglés'
  }
];

export default function RrhhDotacionPage() {
  const [rol, setRol] = useState<UserRoleContext>('sostenedor');
  const [pestaña, setPestaña] = useState<string>('rrhh');
  const [docentesList, setDocentesList] = useState<DocenteItem[]>(INITIAL_DOCENTES);
  const [selectedDocente, setSelectedDocente] = useState<DocenteItem | null>(null);
  const [editHorasAsignadas, setEditHorasAsignadas] = useState<number>(0);
  const [filtroSemaforoDirecto, setFiltroSemaforoDirecto] = useState<string>('todos');
  
  // Toast Notificación State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Nuevo Docente State
  const [isNuevoModalOpen, setIsNuevoModalOpen] = useState(false);
  const [nuevoRut, setNuevoRut] = useState('');
  const [nuevoNombres, setNuevoNombres] = useState('');
  const [nuevoApellidos, setNuevoApellidos] = useState('');
  const [nuevoRbd, setNuevoRbd] = useState('101');
  const [nuevoHorasContrato, setNuevoHorasContrato] = useState(44);
  const [nuevoHorasAsignadas, setNuevoHorasAsignadas] = useState(38);
  const [nuevoTramo, setNuevoTramo] = useState<'Acceso' | 'Inicial' | 'Temprano' | 'Avanzado' | 'Experto I' | 'Experto II' | 'Sin Tramo'>('Inicial');
  const [nuevoErrorMsg, setNuevoErrorMsg] = useState('');

  // Notificación Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Cálculo de resumenes en tiempo real
  const sobreasignadosList = docentesList.filter(d => {
    const calc = calcularJornadaMinutos(d.horasContrato, d.horasPedagogicasAsignadas);
    return calc.esSobreasignado;
  });

  const cumplidoresCount = docentesList.filter(d => {
    const calc = calcularJornadaMinutos(d.horasContrato, d.horasPedagogicasAsignadas);
    return !calc.esSobreasignado;
  }).length;

  const porcentajeCumplimiento = docentesList.length > 0
    ? Math.round((cumplidoresCount / docentesList.length) * 100)
    : 100;

  // Manejo de Edición de Docente
  const handleOpenDocenteModal = (docente: DocenteItem) => {
    setSelectedDocente(docente);
    setEditHorasAsignadas(docente.horasPedagogicasAsignadas);
  };

  const handleSaveDocenteEdit = () => {
    if (!selectedDocente) return;
    setDocentesList(prev => prev.map(d => {
      if (d.rut === selectedDocente.rut) {
        return { ...d, horasPedagogicasAsignadas: editHorasAsignadas };
      }
      return d;
    }));
    setSelectedDocente(null);
    showToast(`✅ Horas asignadas a ${selectedDocente.nombres} ${selectedDocente.apellidos} actualizadas correctamente.`);
  };

  // Manejo de Exportación Excel Real
  const handleExportarExcel = () => {
    const dataToExport = docentesList.map(d => {
      const calc = calcularJornadaMinutos(d.horasContrato, d.horasPedagogicasAsignadas);
      return {
        RUT: d.rut,
        Docente: `${d.apellidos}, ${d.nombres}`,
        RBD: d.rbd,
        Tramo: d.tramoCarrera,
        ContratoHoras: `${d.horasContrato} hrs`,
        HorasAulaAsignadas: `${d.horasPedagogicasAsignadas} HA`,
        MaxHorasAula: `${calc.horasPedagogicasDisponiblesMax} HA`,
        MinutosLectivos: formatMinutosAHorasTexto(calc.minutosLectivosAsignados),
        MinutosRecreo: formatMinutosAHorasTexto(calc.minutosRecreoAsignados),
        MinutosNoLectivos: formatMinutosAHorasTexto(calc.minutosNoLectivosCalculados),
        EstadoSemaforo: calc.esSobreasignado ? 'SOBREASIGNADO' : calc.horasPedagogicasVacantes > 0 ? 'VACANTE' : 'CUMPLE 65/35'
      };
    });

    exportarTablaAExcel(
      dataToExport,
      'dotacion_docente_slep',
      ['RUT', 'Docente', 'RBD', 'Tramo', 'ContratoHoras', 'HorasAulaAsignadas', 'MaxHorasAula', 'MinutosLectivos', 'MinutosRecreo', 'MinutosNoLectivos', 'EstadoSemaforo'],
      ['RUT', 'Docente', 'RBD', 'Tramo', 'ContratoHoras', 'HorasAulaAsignadas', 'MaxHorasAula', 'MinutosLectivos', 'MinutosRecreo', 'MinutosNoLectivos', 'EstadoSemaforo']
    );
    showToast('📊 Reporte Excel generado y descargado exitosamente.');
  };

  // Manejo de Exportación PDF de Resoluciones
  const handleExportarResolucionPDF = () => {
    const dataPDF = docentesList.map(d => ({
      rut: d.rut,
      nombre: `${d.apellidos}, ${d.nombres}`,
      rbd: d.rbd,
      horas: `${d.horasContrato} hrs`,
      aula: `${d.horasPedagogicasAsignadas} HA`
    }));

    exportarTablaAPdf(
      dataPDF,
      ['RUT Docente', 'Nombre Completo', 'RBD Escuela', 'Jornada Contrato', 'Horas Asignadas'],
      ['rut', 'nombre', 'rbd', 'horas', 'aula'],
      'Resolución de Distribución Horaria SLEP 2026'
    );
    showToast('📄 Borrador de Resolución generado en PDF y descargado.');
  };

  // Manejo de Creación de Nuevo Docente con Zod
  const handleAgregarNuevoDocente = (e: React.FormEvent) => {
    e.preventDefault();
    setNuevoErrorMsg('');

    if (!validarRutChileno(nuevoRut)) {
      setNuevoErrorMsg('El RUT ingresado es inválido o el dígito verificador es incorrecto.');
      return;
    }

    const rutNorm = normalizarRutChileno(nuevoRut);

    const parseRes = DocenteIngestaSchema.safeParse({
      rut: rutNorm,
      nombres: nuevoNombres,
      apellidos: nuevoApellidos,
      rbd: nuevoRbd,
      horasContrato: nuevoHorasContrato,
      horasPedagogicasAsignadas: nuevoHorasAsignadas,
      tramoCarrera: nuevoTramo,
      tipoContrato: 'Contrata'
    });

    if (!parseRes.success) {
      setNuevoErrorMsg(parseRes.error.issues[0].message);
      return;
    }

    const nuevoDocenteItem: DocenteItem = {
      rut: rutNorm,
      nombres: nuevoNombres,
      apellidos: nuevoApellidos,
      rbd: nuevoRbd,
      escuelaNombre: `Establecimiento RBD ${nuevoRbd}`,
      horasContrato: nuevoHorasContrato,
      horasPedagogicasAsignadas: nuevoHorasAsignadas,
      tramoCarrera: nuevoTramo,
      tipoContrato: 'Contrata',
      asignaturaPrincipal: 'General'
    };

    setDocentesList(prev => [nuevoDocenteItem, ...prev]);
    setIsNuevoModalOpen(false);
    setNuevoRut('');
    setNuevoNombres('');
    setNuevoApellidos('');
    showToast(`✨ Docente ${nuevoNombres} ${nuevoApellidos} registrado con éxito.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl flex items-center space-x-2 text-xs font-semibold animate-bounce border border-slate-700">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navegación Multinivel Encadenada por Rol */}
      <NavbarContextual
        rolActivo={rol}
        pestañaActiva={pestaña}
        onCambiarPestaña={(newTab) => {
          setPestaña(newTab);
          setFiltroSemaforoDirecto('todos');
        }}
        onCambiarRol={(newRol) => {
          setRol(newRol);
          if (newRol === 'sostenedor') setPestaña('macro');
          else if (newRol === 'escuela') setPestaña('rbd');
          else setPestaña('jornada');
        }}
        alertasRiesgoCount={sobreasignadosList.length}
      />

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        


        {/* VISTA OPERATIVA PRINCIPAL PLANTA DOCENTE / LICENCIAS & REEMPLAZOS */}
        {(pestaña === 'rrhh' || pestaña === 'planta' || pestaña === 'macro' || pestaña === 'rbd' || pestaña === 'jornada') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Gestión de Planta Docente, Licencias & Reemplazos</h2>
                <p className="text-xs text-slate-500">Módulo directo de administración de fichas, licencias médicas, asignaciones y reemplazos.</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsNuevoModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Nuevo Docente</span>
                </button>
                <button
                  onClick={handleExportarExcel}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Exportar Excel</span>
                </button>
              </div>
            </div>

            <ListaDinamicaDocentes
              docentes={docentesList}
              onSelectDocente={handleOpenDocenteModal}
              onExportarCSV={handleExportarExcel}
              onNuevoDocente={() => setIsNuevoModalOpen(true)}
              filtroSemaforoInicial={filtroSemaforoDirecto}
            />
          </div>
        )}

        {/* 3. VISTA AUDITORÍA UATP & SEMÁFORO DE RIESGO */}
        {pestaña === 'uatp' && (
          <div className="space-y-6">
            <div className="glass-panel p-5 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-3">
              <div className="flex items-center space-x-2 text-rose-800">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h2 className="text-base font-bold">Panel de Auditoría Preventiva UATP (Pre-SuperEduc)</h2>
              </div>
              <p className="text-xs text-rose-700 max-w-3xl">
                Este panel aísla a todos los docentes que presentan <strong>sobreasignación lectiva</strong> o incumplimiento en la proporción 65/35. Corrija los bloques de aula para evitar observaciones en fiscalizaciones oficiales.
              </p>
            </div>

            {sobreasignadosList.length === 0 ? (
              <div className="glass-panel p-8 rounded-2xl text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">¡Cero Riesgos Detectados!</h3>
                <p className="text-xs text-slate-600">Todos los docentes registrados cumplen al 100% con la norma legal de distribución horaria.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Docentes en Estado Crítico ({sobreasignadosList.length})
                </h3>
                <ListaDinamicaDocentes
                  docentes={sobreasignadosList}
                  onSelectDocente={handleOpenDocenteModal}
                  onExportarCSV={handleExportarExcel}
                  filtroSemaforoInicial="sobreasignado"
                />
              </div>
            )}
          </div>
        )}

        {/* 4. VISTA FINANZAS & SUBVENCIÓN */}
        {pestaña === 'finanzas' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-blue-900" />
                  <span>Desglose Financiero por Origen de Fondo</span>
                </h2>
                <button
                  onClick={handleExportarExcel}
                  className="px-3.5 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition-all cursor-pointer"
                >
                  Descargar Informe Financiero
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-xs text-slate-500 block">Subvención Regular</span>
                  <span className="text-lg font-bold text-slate-900">75% Horas totales</span>
                  <p className="text-[11px] text-slate-500">Costo plantilla base financiado</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-xs text-slate-500 block">Programa PIE (Inclusión)</span>
                  <span className="text-lg font-bold text-blue-900">15% Horas Co-docencia</span>
                  <p className="text-[11px] text-slate-500">Ley N° 20.845 verificada</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-xs text-slate-500 block">Ley SEP / PME</span>
                  <span className="text-lg font-bold text-emerald-700">10% Refuerzo Pedagógico</span>
                  <p className="text-[11px] text-slate-500">Convenios de Igualdad de Oportunidades</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. VISTA RESOLUCIONES & ACTOS ADMINISTRATIVOS */}
        {(pestaña === 'resoluciones' || pestaña === 'anexos') && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Generador de Resoluciones Exentas SLEP</h2>
                  <p className="text-xs text-slate-500">Emisión automatizada de decretos nominativos de distribución de jornada docente.</p>
                </div>
                <button
                  onClick={handleExportarResolucionPDF}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Borrador PDF</span>
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs text-slate-700 font-mono">
                <p className="font-bold text-slate-900">REPÚBLICA DE CHILE | SERVICIO LOCAL DE EDUCACIÓN PÚBLICA VALLE DIGUILLÍN</p>
                <p><strong>RESOLUCIÓN EXENTA N°:</strong> 2026-0485</p>
                <p><strong>MATERIA:</strong> APRUEBA DISTRIBUCIÓN HORARIA LECTIVA Y NO LECTIVA DOCENTE AÑO ESCOLAR 2026.</p>
                <hr className="border-slate-200 my-2" />
                <p>VISTOS: Lo dispuesto en la Ley N° 21.040, Ley N° 20.903, D.F.L. N° 1 de 1996 del Ministerio de Educación...</p>
              </div>
            </div>
          </div>
        )}

        {/* 6. VISTA MATRIZ DE HORARIOS */}
        {(pestaña === 'horarios' || pestaña === 'horario_semanal') && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-900" />
                <span>Matriz Semanal de Horarios y Bloques Pedagógicos</span>
              </h2>
              <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold text-slate-700 border-b border-slate-200 pb-2">
                <div>Lunes</div>
                <div>Martes</div>
                <div>Miércoles</div>
                <div>Jueves</div>
                <div>Viernes</div>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center text-xs text-slate-600">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">08:00 - 09:30<br/><span className="font-semibold text-blue-900">Lenguaje (90m)</span></div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">08:00 - 09:30<br/><span className="font-semibold text-blue-900">Matemática (90m)</span></div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">08:00 - 09:30<br/><span className="font-semibold text-blue-900">Ciencias (90m)</span></div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">08:00 - 09:30<br/><span className="font-semibold text-blue-900">Historia (90m)</span></div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">08:00 - 09:30<br/><span className="font-semibold text-blue-900">Inglés (90m)</span></div>
              </div>
              <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs text-center font-bold">
                ☕ Recreo Reglamentario (15m)
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL INTERACTIVO: FICHA Y EDICIÓN RÁPIDA DE DOCENTE */}
      {selectedDocente && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="glass-panel bg-white p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-900 text-amber-400 flex items-center justify-center font-bold text-xs">
                  {selectedDocente.nombres.charAt(0)}{selectedDocente.apellidos.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedDocente.apellidos}, {selectedDocente.nombres}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{selectedDocente.rut}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocente(null)}
                className="text-slate-400 hover:text-slate-700 font-bold px-2 py-1 text-sm rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Slider / Edición Interactiva de Horas */}
            {(() => {
              const calc = calcularJornadaMinutos(selectedDocente.horasContrato, editHorasAsignadas);
              return (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <label className="font-bold text-slate-800 block">
                      Ajustar Horas Pedagógicas Asignadas en Aula (HA):
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="range"
                        min={0}
                        max={44}
                        value={editHorasAsignadas}
                        onChange={(e) => setEditHorasAsignadas(parseInt(e.target.value, 10))}
                        className="flex-1 accent-blue-900 cursor-pointer"
                      />
                      <input
                        type="number"
                        min={0}
                        max={44}
                        value={editHorasAsignadas}
                        onChange={(e) => setEditHorasAsignadas(parseInt(e.target.value || '0', 10))}
                        className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-md font-bold text-center text-slate-900"
                      />
                      <span className="font-semibold text-slate-600">HA</span>
                    </div>
                  </div>

                  {/* Estado Calculado en Tiempo Real */}
                  <div className="p-3 rounded-xl border space-y-2 text-xs bg-slate-50 border-slate-200">
                    <div className="flex justify-between font-medium">
                      <span>Capacidad Lectiva Máxima:</span>
                      <strong className="text-slate-900">{calc.horasPedagogicasDisponiblesMax} HA ({formatMinutosAHorasTexto(calc.minutosLectivosDisponiblesMax)})</strong>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Recreos Cronológicos:</span>
                      <strong className="text-slate-900">{formatMinutosAHorasTexto(calc.minutosRecreoAsignados)}</strong>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>No Lectivas (Planificación):</span>
                      <strong className="text-slate-900">{formatMinutosAHorasTexto(calc.minutosNoLectivosCalculados)}</strong>
                    </div>
                    <div className="pt-2 border-t flex justify-between items-center">
                      <span>Estado Semáforo:</span>
                      {calc.esSobreasignado ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full font-bold">🔴 Sobreasignado (+{formatMinutosAHorasTexto(calc.minutosSobreasignados)})</span>
                      ) : calc.horasPedagogicasVacantes > 0 ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold">🟡 Vacante ({calc.horasPedagogicasVacantes} HA libre)</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">🟢 Cumple 65/35 (100% Ok)</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                onClick={() => setSelectedDocente(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDocenteEdit}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INTERACTIVO: NUEVO DOCENTE CON ZOD */}
      {isNuevoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="glass-panel bg-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-amber-500" />
                <span>Registrar Nuevo Docente</span>
              </h3>
              <button
                onClick={() => setIsNuevoModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold px-2 py-1 text-sm rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {nuevoErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                ⚠️ {nuevoErrorMsg}
              </div>
            )}

            <form onSubmit={handleAgregarNuevoDocente} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">RUT Docente (Formato 12345678-K):</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 12.345.678-5"
                  value={nuevoRut}
                  onChange={(e) => setNuevoRut(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombres:</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombres"
                    value={nuevoNombres}
                    onChange={(e) => setNuevoNombres(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Apellidos:</label>
                  <input
                    type="text"
                    required
                    placeholder="Apellidos"
                    value={nuevoApellidos}
                    onChange={(e) => setNuevoApellidos(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jornada Contrato (Hrs):</label>
                  <input
                    type="number"
                    min={1}
                    max={44}
                    value={nuevoHorasContrato}
                    onChange={(e) => setNuevoHorasContrato(parseInt(e.target.value || '44', 10))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Horas Aula Asignadas (HA):</label>
                  <input
                    type="number"
                    min={0}
                    max={44}
                    value={nuevoHorasAsignadas}
                    onChange={(e) => setNuevoHorasAsignadas(parseInt(e.target.value || '0', 10))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tramo Carrera Docente:</label>
                <select
                  value={nuevoTramo}
                  onChange={(e) => setNuevoTramo(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  <option value="Acceso">Acceso</option>
                  <option value="Inicial">Inicial</option>
                  <option value="Temprano">Temprano</option>
                  <option value="Avanzado">Avanzado</option>
                  <option value="Experto I">Experto I</option>
                  <option value="Experto II">Experto II</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNuevoModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold transition-all cursor-pointer shadow-xs"
                >
                  Guardar Docente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
