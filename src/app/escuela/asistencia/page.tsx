'use client';

// =============================================================================
// PANEL DE ASISTENCIA EDE — Circular N°1 MINEDUC
// /escuela/asistencia
// =============================================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getNominaAlumnos,
  getAsistenciaDiaria,
  getAlertaTempranaAlumnos,
  getSectionesByRbd,
  registrarAsistencia,
} from '@/lib/ede-supabase';
import {
  EdeNominaAlumnoRow,
  EdeAsistenciaDiariaRow,
  EdeAlertaTempranaRow,
  EdeSectionCurso,
  REF_ATTENDANCE_EVENT_TYPE,
  RefAttendanceEventTypeId,
} from '@/lib/ede-types';

// ---------------------------------------------------------------------------
const ANIO_ACTUAL = new Date().getFullYear();
const HOY = new Date().toISOString().split('T')[0];

type VistaAsistencia = 'pase_lista' | 'alertas' | 'historial';

interface EstadoAlumno {
  enrollment_id: string;
  alumno_id: string;
  event_type_id: RefAttendanceEventTypeId;
  observacion: string;
}

// ---------------------------------------------------------------------------
export default function AsistenciaPage() {
  // establecimientos.rbd es INTEGER en Supabase
  const rbdRaw = typeof window !== 'undefined'
    ? (localStorage.getItem('slep_sim_rbd') ?? document.cookie.match(/slep_sim_rbd=([^;]+)/)?.[1] ?? '10202')
    : '10202';
  const rbd = parseInt(rbdRaw, 10) || 10202;

  const [vista, setVista] = useState<VistaAsistencia>('pase_lista');
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [fecha, setFecha] = useState(HOY);
  const [sections, setSections] = useState<EdeSectionCurso[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [nomina, setNomina] = useState<EdeNominaAlumnoRow[]>([]);
  const [historial, setHistorial] = useState<EdeAsistenciaDiariaRow[]>([]);
  const [alertas, setAlertas] = useState<EdeAlertaTempranaRow[]>([]);
  const [estadosAlumno, setEstadosAlumno] = useState<Record<string, EstadoAlumno>>({});
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [docente_run] = useState('14.206.906-3'); // RUN de docente jefe para simulación
  
  // Firma Digital OTP (MINEDUC)
  const [modalFirmaOpen, setModalFirmaOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [rutFirmante, setRutFirmante] = useState('14.206.906-3');
  const [errorFirma, setErrorFirma] = useState<string | null>(null);

  // Carga inicial de secciones
  useEffect(() => {
    (async () => {
      try {
        const secs = await getSectionesByRbd(rbd, anio);
        setSections(secs);
        if (secs.length > 0 && !sectionId) setSectionId(secs[0].section_id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar secciones');
      }
    })();
  }, [rbd, anio]);

  // Carga de nómina cuando cambia la sección
  const cargarNomina = useCallback(async () => {
    if (!sectionId) return;
    setCargando(true); setError(null);
    try {
      const data = await getNominaAlumnos(rbd, anio, sectionId);
      setNomina(data);
      // Inicializar todos como PRESENTE por defecto
      const estadosIniciales: Record<string, EstadoAlumno> = {};
      data.forEach((a) => {
        estadosIniciales[a.alumno_id] = {
          enrollment_id: '', // Se rellenará desde el enrollment en producción
          alumno_id: a.alumno_id,
          event_type_id: REF_ATTENDANCE_EVENT_TYPE.PRESENTE,
          observacion: '',
        };
      });
      setEstadosAlumno(estadosIniciales);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar nómina');
    } finally {
      setCargando(false);
    }
  }, [rbd, anio, sectionId]);

  const cargarHistorial = useCallback(async () => {
    if (!sectionId) return;
    setCargando(true); setError(null);
    try {
      const data = await getAsistenciaDiaria(rbd, fecha, sectionId);
      setHistorial(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar historial');
    } finally {
      setCargando(false);
    }
  }, [rbd, fecha, sectionId]);

  const cargarAlertas = useCallback(async () => {
    setCargando(true); setError(null);
    try {
      const data = await getAlertaTempranaAlumnos(rbd, anio);
      setAlertas(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar alertas');
    } finally {
      setCargando(false);
    }
  }, [rbd, anio]);

  useEffect(() => {
    if (vista === 'pase_lista') cargarNomina();
    if (vista === 'historial') cargarHistorial();
    if (vista === 'alertas') cargarAlertas();
  }, [vista, sectionId, fecha, cargarNomina, cargarHistorial, cargarAlertas]);

  // Estadísticas rápidas del pase de lista actual
  const statsLista = useMemo(() => {
    const vals = Object.values(estadosAlumno);
    return {
      total: vals.length,
      presentes: vals.filter((e) => e.event_type_id === REF_ATTENDANCE_EVENT_TYPE.PRESENTE).length,
      ausentes: vals.filter((e) => e.event_type_id === REF_ATTENDANCE_EVENT_TYPE.AUSENTE).length,
      justif: vals.filter((e) => e.event_type_id === REF_ATTENDANCE_EVENT_TYPE.AUSENTE_JUSTIF).length,
      atrasos: vals.filter((e) => e.event_type_id === REF_ATTENDANCE_EVENT_TYPE.ATRASO).length,
    };
  }, [estadosAlumno]);

  const porcentajePresente = statsLista.total > 0
    ? Math.round((statsLista.presentes / statsLista.total) * 100)
    : 0;

  // Marcar todos como presente / ausente
  const marcarTodos = (tipo: RefAttendanceEventTypeId) => {
    setEstadosAlumno((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        next[id] = { ...next[id], event_type_id: tipo };
      });
      return next;
    });
  };

  const handleGuardarAsistencia = () => {
    if (!sectionId) { setError('Selecciona un curso'); return; }
    setErrorFirma(null);
    setOtpCode('');
    setModalFirmaOpen(true);
  };

  const ejecutarGuardadoConFirma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorFirma('El código OTP debe ser de 6 dígitos');
      return;
    }
    setGuardando(true);
    setErrorFirma(null);
    try {
      const res = await fetch('/api/ede/asistencia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section_id: sectionId,
          rbd,
          fecha,
          registrado_por_run: docente_run,
          otp: otpCode,
          rut_firmante: rutFirmante,
          eventos: Object.values(estadosAlumno),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al validar firma y guardar asistencia');
      }

      setExito(`✓ Asistencia del ${fecha} guardada y firmada digitalmente — ${data.registrados} registros`);
      setModalFirmaOpen(false);
      setOtpCode('');
      
      // Forzar recarga del historial si está en esa vista
      if (vista === 'historial') cargarHistorial();
    } catch (err) {
      setErrorFirma(err instanceof Error ? err.message : 'Error al verificar firma y guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleExportarAsistencia = async () => {
    const url = `/api/ede/asistencia?rbd=${encodeURIComponent(rbd)}&anio=${anio}`;
    const res = await fetch(url);
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `EDE_Asistencia_${rbd}_${anio}.json`;
    link.click();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const TIPO_BTN: Record<RefAttendanceEventTypeId, { label: string; color: string; bg: string; border: string }> = {
    [REF_ATTENDANCE_EVENT_TYPE.PRESENTE]: { label: 'P', color: '#4ade80', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)' },
    [REF_ATTENDANCE_EVENT_TYPE.AUSENTE]: { label: 'A', color: '#f87171', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)' },
    [REF_ATTENDANCE_EVENT_TYPE.AUSENTE_JUSTIF]: { label: 'J', color: '#fbbf24', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)' },
    [REF_ATTENDANCE_EVENT_TYPE.ATRASO]: { label: 'AT', color: '#818cf8', bg: 'rgba(129,140,248,0.15)', border: 'rgba(129,140,248,0.4)' },
    [REF_ATTENDANCE_EVENT_TYPE.RETIRO_ANTICIPADO]: { label: 'RA', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)' },
  };

  const nivelAlertaStyle: Record<string, { color: string; bg: string; icon: string }> = {
    CRITICO:     { color: '#f87171', bg: 'rgba(239,68,68,0.12)', icon: '🔴' },
    ADVERTENCIA: { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', icon: '🟡' },
    NORMAL:      { color: '#4ade80', bg: 'rgba(34,197,94,0.08)',  icon: '🟢' },
    SIN_DATOS:   { color: '#475569', bg: 'rgba(71,85,105,0.1)',   icon: '⚪' },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .asistencia-page {
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          background: #0f1117;
          color: #e2e8f0;
          padding: 24px;
        }
        .ast-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 28px;
        }
        .ast-title {
          font-size: 1.75rem;
          font-weight: 800;
          background: linear-gradient(135deg, #4ade80, #22d3ee);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }
        .ast-subtitle { font-size: 0.85rem; color: #64748b; margin: 4px 0 0; }

        /* Nav */
        .ast-nav {
          display: flex;
          gap: 4px;
          background: #1e2330;
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 24px;
          width: fit-content;
        }
        .ast-nav-btn {
          padding: 8px 20px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s;
          color: #64748b;
          background: transparent;
        }
        .ast-nav-btn.active {
          background: linear-gradient(135deg, #4ade80, #22d3ee);
          color: #0f1117;
          font-weight: 700;
        }
        .ast-nav-btn:hover:not(.active) { background: #2d3348; color: #cbd5e1; }

        /* Toolbar */
        .ast-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .ast-select, .ast-input {
          background: #1e2330;
          border: 1px solid #2d3348;
          border-radius: 8px;
          color: #e2e8f0;
          padding: 8px 12px;
          font-size: 0.875rem;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.2s;
        }
        .ast-select:focus, .ast-input:focus { border-color: #4ade80; }

        /* Botones */
        .btn-save {
          background: linear-gradient(135deg, #4ade80, #22d3ee);
          color: #0f1117;
          border: none;
          border-radius: 8px;
          padding: 10px 22px;
          font-size: 0.9rem;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-save:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-outline {
          background: transparent;
          color: #4ade80;
          border: 1px solid #4ade80;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 0.875rem;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-outline:hover { background: rgba(74,222,128,0.1); }
        .btn-ghost {
          background: #1e2330;
          color: #94a3b8;
          border: 1px solid #2d3348;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 0.85rem;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-ghost:hover { background: #2d3348; color: #e2e8f0; }

        /* KPI Strip */
        .kpi-strip {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .kpi-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #1e2330;
          border: 1px solid #2d3348;
          border-radius: 10px;
          padding: 10px 16px;
          min-width: 100px;
        }
        .kpi-chip-label { font-size: 0.72rem; color: #64748b; font-weight: 500; text-transform: uppercase; }
        .kpi-chip-value { font-size: 1.4rem; font-weight: 800; }

        /* Barra de progreso asistencia */
        .progreso-bar-container {
          background: #1e2330;
          border: 1px solid #2d3348;
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .progreso-circle {
          position: relative;
          width: 80px;
          height: 80px;
          flex-shrink: 0;
        }
        .progreso-number {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          font-weight: 800;
          color: #4ade80;
        }
        .progreso-label {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .progreso-bar-track {
          flex: 1;
          height: 12px;
          background: #2d3348;
          border-radius: 10px;
          overflow: hidden;
          min-width: 200px;
        }
        .progreso-bar-fill {
          height: 100%;
          border-radius: 10px;
          transition: width 0.5s ease;
        }

        /* Lista de pase */
        .lista-container {
          background: #1e2330;
          border: 1px solid #2d3348;
          border-radius: 14px;
          overflow: hidden;
        }
        .lista-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid #2d3348;
          flex-wrap: wrap;
          gap: 10px;
        }
        .lista-alumno-row {
          display: flex;
          align-items: center;
          padding: 12px 20px;
          border-bottom: 1px solid #1a1f2e;
          gap: 14px;
          transition: background 0.15s;
        }
        .lista-alumno-row:last-child { border-bottom: none; }
        .lista-alumno-row:hover { background: rgba(74,222,128,0.03); }
        .lista-num {
          width: 28px;
          text-align: center;
          font-size: 0.8rem;
          color: #475569;
          font-weight: 600;
          flex-shrink: 0;
        }
        .lista-nombre {
          flex: 1;
          min-width: 0;
        }
        .lista-nombre-main {
          font-weight: 600;
          color: #f1f5f9;
          font-size: 0.9rem;
        }
        .lista-nombre-run {
          font-size: 0.78rem;
          color: #64748b;
          font-family: monospace;
        }
        .lista-badges { display: flex; gap: 4px; }
        .mini-badge {
          padding: 2px 7px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .tipo-btns { display: flex; gap: 6px; flex-shrink: 0; }
        .tipo-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid;
          font-size: 0.78rem;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tipo-btn.selected { transform: scale(1.1); }
        .obs-input {
          background: #16192a;
          border: 1px solid #2d3348;
          border-radius: 6px;
          color: #94a3b8;
          padding: 6px 10px;
          font-size: 0.78rem;
          font-family: 'Inter', sans-serif;
          width: 160px;
          outline: none;
        }
        .obs-input:focus { border-color: #4ade80; }

        /* Tabla alertas */
        .alertas-container {
          background: #1e2330;
          border: 1px solid #2d3348;
          border-radius: 14px;
          overflow: hidden;
        }
        .alerta-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 20px;
          border-bottom: 1px solid #1a1f2e;
          transition: background 0.15s;
          flex-wrap: wrap;
        }
        .alerta-row:last-child { border-bottom: none; }
        .alerta-row:hover { background: rgba(239,68,68,0.03); }
        .alerta-icon { font-size: 1.2rem; flex-shrink: 0; }
        .alerta-nombre { flex: 1; min-width: 200px; }
        .alerta-nombre-main { font-weight: 600; color: #f1f5f9; font-size: 0.9rem; }
        .alerta-nombre-sub { font-size: 0.78rem; color: #64748b; }
        .alerta-pct {
          font-size: 1.3rem;
          font-weight: 800;
          min-width: 60px;
          text-align: right;
        }
        .alerta-stats {
          font-size: 0.78rem;
          color: #64748b;
          text-align: right;
          min-width: 120px;
        }
        .alerta-nivel-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.3px;
          border: 1px solid;
          flex-shrink: 0;
        }

        /* Alertas */
        .alert {
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 0.875rem;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .alert-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
        .alert-exito { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3); color: #4ade80; }
      `}</style>

      <div className="asistencia-page">
        {/* ── HEADER ── */}
        <div className="ast-header">
          <div>
            <h1 className="ast-title">📅 Asistencia EDE</h1>
            <p className="ast-subtitle">
              Libro de Clases Digital · Circular N°1 MINEDUC · RBD {rbd}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="ast-select" value={anio} onChange={(e) => setAnio(parseInt(e.target.value))}>
              {[ANIO_ACTUAL - 1, ANIO_ACTUAL].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button className="btn-outline" onClick={handleExportarAsistencia}>⬇ Exportar EDE</button>
          </div>
        </div>

        {/* ── ALERTAS ── */}
        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
          </div>
        )}
        {exito && (
          <div className="alert alert-exito">
            {exito}
            <button onClick={() => setExito(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* ── NAV ── */}
        <nav className="ast-nav">
          {[
            { key: 'pase_lista', label: '✓ Pase de Lista' },
            { key: 'alertas',    label: '🚨 Alerta Temprana (MAT)' },
            { key: 'historial',  label: '📂 Historial' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`ast-nav-btn ${vista === key ? 'active' : ''}`}
              onClick={() => setVista(key as VistaAsistencia)}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            VISTA: PASE DE LISTA
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {vista === 'pase_lista' && (
          <>
            {/* Toolbar */}
            <div className="ast-toolbar">
              <select
                className="ast-select"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              >
                {sections.length === 0 && <option value="">Sin cursos registrados</option>}
                {sections.map((s) => (
                  <option key={s.section_id} value={s.section_id}>{s.nombre_curso}</option>
                ))}
              </select>
              <input
                className="ast-input"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-ghost" onClick={() => marcarTodos(REF_ATTENDANCE_EVENT_TYPE.PRESENTE)}>
                  ✓ Marcar todos P
                </button>
                <button className="btn-ghost" onClick={() => marcarTodos(REF_ATTENDANCE_EVENT_TYPE.AUSENTE)}>
                  ✗ Marcar todos A
                </button>
              </div>
            </div>

            {/* Barra de progreso */}
            {nomina.length > 0 && (
              <div className="progreso-bar-container">
                <div className="progreso-circle">
                  <svg viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#2d3348" strokeWidth="8" />
                    <circle
                      cx="40" cy="40" r="34" fill="none"
                      stroke={porcentajePresente >= 90 ? '#4ade80' : porcentajePresente >= 85 ? '#fbbf24' : '#f87171'}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - porcentajePresente / 100)}`}
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <div className="progreso-number">{porcentajePresente}%</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="progreso-label">Asistencia del día · {fecha}</div>
                  <div className="progreso-bar-track" style={{ marginTop: 10 }}>
                    <div
                      className="progreso-bar-fill"
                      style={{
                        width: `${porcentajePresente}%`,
                        background: porcentajePresente >= 90 ? 'linear-gradient(90deg,#4ade80,#22d3ee)'
                          : porcentajePresente >= 85 ? 'linear-gradient(90deg,#fbbf24,#f59e0b)'
                          : 'linear-gradient(90deg,#f87171,#ef4444)',
                      }}
                    />
                  </div>
                </div>
                <div className="kpi-strip" style={{ margin: 0 }}>
                  {[
                    { label: 'Presentes', val: statsLista.presentes, color: '#4ade80' },
                    { label: 'Ausentes', val: statsLista.ausentes, color: '#f87171' },
                    { label: 'Justific.', val: statsLista.justif, color: '#fbbf24' },
                    { label: 'Atrasos', val: statsLista.atrasos, color: '#818cf8' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="kpi-chip">
                      <div>
                        <div className="kpi-chip-label">{label}</div>
                        <div className="kpi-chip-value" style={{ color }}>{val}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de alumnos */}
            <div className="lista-container">
              <div className="lista-header">
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#e2e8f0' }}>
                  {sections.find((s) => s.section_id === sectionId)?.nombre_curso ?? 'Curso'} — {nomina.length} alumnos
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', padding: '6px 12px', background: '#16192a', borderRadius: 6 }}>
                    P=Presente · A=Ausente · J=Justificado · AT=Atraso
                  </span>
                </div>
              </div>

              {nomina.length === 0 && !cargando ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>📋</div>
                  <p style={{ fontWeight: 600 }}>Sin alumnos matriculados en este curso</p>
                </div>
              ) : (
                nomina.map((alumno, i) => {
                  const estado = estadosAlumno[alumno.alumno_id];
                  const tipoActual = estado?.event_type_id ?? REF_ATTENDANCE_EVENT_TYPE.PRESENTE;

                  return (
                    <div key={alumno.alumno_id} className="lista-alumno-row">
                      <div className="lista-num">{alumno.numero_lista}</div>
                      <div className="lista-nombre">
                        <div className="lista-nombre-main">
                          {alumno.apellido_paterno} {alumno.apellido_materno}, {alumno.primer_nombre}
                        </div>
                        <div className="lista-nombre-run">{alumno.rut_ipe_estudiante ?? '—'}</div>
                      </div>
                      <div className="lista-badges">
                        {alumno.es_pie && (
                          <span className="mini-badge" style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}>PIE</span>
                        )}
                        {alumno.es_sep && (
                          <span className="mini-badge" style={{ background: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.3)' }}>SEP</span>
                        )}
                      </div>
                      {/* Botones P / A / J / AT */}
                      <div className="tipo-btns">
                        {([
                          REF_ATTENDANCE_EVENT_TYPE.PRESENTE,
                          REF_ATTENDANCE_EVENT_TYPE.AUSENTE,
                          REF_ATTENDANCE_EVENT_TYPE.AUSENTE_JUSTIF,
                          REF_ATTENDANCE_EVENT_TYPE.ATRASO,
                        ] as RefAttendanceEventTypeId[]).map((tipo) => {
                          const s = TIPO_BTN[tipo];
                          const activo = tipoActual === tipo;
                          return (
                            <button
                              key={tipo}
                              className={`tipo-btn ${activo ? 'selected' : ''}`}
                              style={{
                                color: activo ? s.color : '#475569',
                                background: activo ? s.bg : 'transparent',
                                borderColor: activo ? s.border : '#2d3348',
                              }}
                              onClick={() =>
                                setEstadosAlumno((prev) => ({
                                  ...prev,
                                  [alumno.alumno_id]: {
                                    ...prev[alumno.alumno_id],
                                    alumno_id: alumno.alumno_id,
                                    enrollment_id: prev[alumno.alumno_id]?.enrollment_id ?? '',
                                    event_type_id: tipo,
                                  },
                                }))
                              }
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                      {/* Observación (visible si no es presente) */}
                      {tipoActual !== REF_ATTENDANCE_EVENT_TYPE.PRESENTE && (
                        <input
                          className="obs-input"
                          placeholder="Observación..."
                          value={estado?.observacion ?? ''}
                          onChange={(e) =>
                            setEstadosAlumno((prev) => ({
                              ...prev,
                              [alumno.alumno_id]: {
                                ...prev[alumno.alumno_id],
                                observacion: e.target.value,
                              },
                            }))
                          }
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Botón guardar */}
            {nomina.length > 0 && (
              <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn-save" onClick={handleGuardarAsistencia} disabled={guardando}>
                  {guardando ? '⟳ Guardando...' : '💾 Guardar Asistencia EDE'}
                </button>
              </div>
            )}
          </>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            VISTA: ALERTAS TEMPRANA (MAT)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {vista === 'alertas' && (
          <>
            {/* Resumen */}
            <div className="kpi-strip" style={{ marginBottom: 20 }}>
              {[
                { label: 'Críticos (< 85%)',   val: alertas.filter((a) => a.nivel_alerta === 'CRITICO').length,     color: '#f87171' },
                { label: 'Advertencia (85-90%)', val: alertas.filter((a) => a.nivel_alerta === 'ADVERTENCIA').length, color: '#fbbf24' },
                { label: 'Total con alerta',   val: alertas.length,                                                  color: '#94a3b8' },
              ].map(({ label, val, color }) => (
                <div key={label} className="kpi-chip">
                  <div>
                    <div className="kpi-chip-label">{label}</div>
                    <div className="kpi-chip-value" style={{ color }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="alertas-container">
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #2d3348', fontWeight: 600, color: '#e2e8f0' }}>
                Alumnos con Alerta de Asistencia — {anio}
                <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: 10, fontWeight: 400 }}>
                  Umbral MINEDUC: &lt; 85% = Crítico
                </span>
              </div>

              {alertas.length === 0 && !cargando ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
                  <p style={{ fontWeight: 600 }}>Sin alertas de asistencia — excelente cobertura</p>
                </div>
              ) : (
                alertas.map((a) => {
                  const nivel = nivelAlertaStyle[a.nivel_alerta] ?? nivelAlertaStyle.SIN_DATOS;
                  const pct = a.porcentaje_asistencia ?? 0;
                  return (
                    <div key={`${a.alumno_id}-${a.anio}`} className="alerta-row" style={{ background: nivel.bg }}>
                      <span className="alerta-icon">{nivel.icon}</span>
                      <div className="alerta-nombre">
                        <div className="alerta-nombre-main">{a.nombre_completo}</div>
                        <div className="alerta-nombre-sub">
                          {a.rut_ipe_estudiante} · {a.nombre_curso} · {a.nombre_establecimiento}
                        </div>
                      </div>
                      <div className="alerta-pct" style={{ color: nivel.color }}>
                        {pct}%
                      </div>
                      <div className="alerta-stats">
                        <div>{a.sesiones_presente} / {a.total_sesiones} sesiones</div>
                        <div style={{ color: '#f87171' }}>
                          {a.ausencias_sin_justif} ausencias injustif.
                        </div>
                      </div>
                      {/* Mini barra */}
                      <div style={{ width: 80, height: 6, background: '#2d3348', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: nivel.color,
                            borderRadius: 6,
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                      <span
                        className="alerta-nivel-badge"
                        style={{ color: nivel.color, borderColor: nivel.color, background: nivel.bg }}
                      >
                        {a.nivel_alerta}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            VISTA: HISTORIAL
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {vista === 'historial' && (
          <>
            <div className="ast-toolbar">
              <select className="ast-select" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                {sections.map((s) => (
                  <option key={s.section_id} value={s.section_id}>{s.nombre_curso}</option>
                ))}
              </select>
              <input
                className="ast-input"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
              <button className="btn-ghost" onClick={cargarHistorial} disabled={cargando}>↺ Actualizar</button>
            </div>

            <div className="lista-container">
              <div className="lista-header">
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#e2e8f0' }}>
                  Registro del {fecha} — {historial.length} eventos
                </div>
              </div>
              {historial.length === 0 && !cargando ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>📂</div>
                  <p style={{ fontWeight: 600 }}>Sin registro de asistencia para esta fecha</p>
                </div>
              ) : (
                historial.map((h) => {
                  const tipo = TIPO_BTN[h.event_type_id as RefAttendanceEventTypeId];
                  return (
                    <div key={`${h.alumno_id}-${h.fecha}`} className="lista-alumno-row">
                      <div style={{ width: 40, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: `1px solid ${tipo?.border ?? '#2d3348'}`, background: tipo?.bg ?? 'transparent', fontWeight: 700, fontSize: '0.8rem', color: tipo?.color ?? '#94a3b8', flexShrink: 0 }}>
                        {tipo?.label ?? '?'}
                      </div>
                      <div className="lista-nombre">
                        <div className="lista-nombre-main">{h.nombre_completo}</div>
                        <div className="lista-nombre-run">{h.rut_ipe_estudiante}</div>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{h.descripcion_asistencia}</div>
                      {h.observacion && (
                        <div style={{ fontSize: '0.78rem', color: '#475569', fontStyle: 'italic' }}>
                          &ldquo;{h.observacion}&rdquo;
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
        {/* ── MODAL FIRMA DIGITAL OTP (MINEDUC) ── */}
        {modalFirmaOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 16,
              padding: 28,
              width: '90%',
              maxWidth: 440,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
              color: '#f8fafc'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px 0' }}>
                <span>🔐</span> Firma Digital Transaccional EDE
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                De acuerdo con la Circular N°1 del MINEDUC, debes autorizar el registro diario de asistencia mediante firma digital de doble factor (2FA).
              </p>

              <form onSubmit={ejecutarGuardadoConFirma} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>RUN del Docente Firmante</label>
                  <input 
                    type="text" 
                    value={rutFirmante} 
                    onChange={(e) => setRutFirmante(e.target.value)} 
                    placeholder="14.206.906-3"
                    required
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #475569',
                      background: '#0f172a',
                      color: '#f8fafc',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Código OTP (2FA de 6 dígitos)</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    value={otpCode} 
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                    placeholder="123456"
                    required
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid #475569',
                      background: '#0f172a',
                      color: '#f8fafc',
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      letterSpacing: '0.25em'
                    }}
                  />
                </div>

                {errorFirma && (
                  <div style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontSize: '0.8rem',
                    lineHeight: 1.4
                  }}>
                    ⚠️ {errorFirma}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button 
                    type="button" 
                    onClick={() => setModalFirmaOpen(false)}
                    disabled={guardando}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: 8,
                      border: '1px solid #334155',
                      background: 'transparent',
                      color: '#94a3b8',
                      fontWeight: 'bold',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={guardando}
                    style={{
                      flex: 2,
                      padding: '10px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#0284c7',
                      color: '#f8fafc',
                      fontWeight: 'bold',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.4)'
                    }}
                  >
                    {guardando ? 'Verificando OTP...' : '✍️ Firmar y Registrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
