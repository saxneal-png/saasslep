'use client';

// =============================================================================
// PANEL DE MATRÍCULA EDE — Circular N°1 MINEDUC
// /escuela/matricula
// =============================================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getMatriculaByRbd,
  getResumenCursosByRbd,
  getSectionesByRbd,
  matricularAlumno,
  actualizarEstadoMatricula,
} from '@/lib/ede-supabase';
import {
  EdeRegistroMatriculaRow,
  EdeResumenCursoRow,
  EdeSectionCurso,
  EdeMatricularAlumnoPayload,
  REF_PERSON_STATUS,
  REF_PERSON_RELATIONSHIP,
} from '@/lib/ede-types';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const ANIO_ACTUAL = new Date().getFullYear();
const COLORES_ESTADO: Record<string, string> = {
  DEFINITIVA: '#22c55e',
  PROVISORIA: '#f59e0b',
  RETIRO: '#ef4444',
};
const BADGE_ESTADO: Record<string, string> = {
  DEFINITIVA: 'badge-definitiva',
  PROVISORIA: 'badge-provisoria',
  RETIRO: 'badge-retiro',
};

// ---------------------------------------------------------------------------
// Tipos internos de estado
// ---------------------------------------------------------------------------
type Vista = 'resumen' | 'nomina' | 'nueva';
interface FormNuevaMatricula {
  rbd: number;  // INTEGER
  section_id: string;
  primer_nombre: string;
  segundo_nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  sexo_id: '1' | '2' | '3';
  run: string;
  ipe: string;
  es_pie: boolean;
  es_sep: boolean;
  es_prioritario: boolean;
  apoderado_nombre: string;
  apoderado_apellido: string;
  apoderado_run: string;
  apoderado_telefono: string;
  apoderado_email: string;
}

// ---------------------------------------------------------------------------
// Componente Principal
// ---------------------------------------------------------------------------
export default function MatriculaPage() {
  // Contexto del establecimiento (simulado; en producción viene de cookie/JWT)
  // establecimientos.rbd es INTEGER en Supabase
  const rbdRaw = typeof window !== 'undefined'
    ? (document.cookie.match(/slep_sim_rbd=([^;]+)/)?.[1] ?? '100')
    : '100';
  const rbd = parseInt(rbdRaw, 10) || 100;

  const [vista, setVista] = useState<Vista>('resumen');
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [cursos, setCursos] = useState<EdeResumenCursoRow[]>([]);
  const [sections, setSections] = useState<EdeSectionCurso[]>([]);
  const [nomina, setNomina] = useState<EdeRegistroMatriculaRow[]>([]);
  const [sectionSeleccionada, setSectionSeleccionada] = useState<string>('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [modalRetiro, setModalRetiro] = useState<EdeRegistroMatriculaRow | null>(null);
  const [form, setForm] = useState<FormNuevaMatricula>({
    rbd, section_id: '', primer_nombre: '', segundo_nombre: '',
    apellido_paterno: '', apellido_materno: '', fecha_nacimiento: '',
    sexo_id: '1', run: '', ipe: '', es_pie: false, es_sep: false,
    es_prioritario: false, apoderado_nombre: '', apoderado_apellido: '',
    apoderado_run: '', apoderado_telefono: '', apoderado_email: '',
  });

  // ---------------------------------------------------------------------------
  // Carga de datos
  // ---------------------------------------------------------------------------
  const cargarResumen = useCallback(async () => {
    setCargando(true); setError(null);
    try {
      const [res, secs] = await Promise.all([
        getResumenCursosByRbd(rbd, anio),
        getSectionesByRbd(rbd, anio),
      ]);
      setCursos(res);
      setSections(secs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setCargando(false);
    }
  }, [rbd, anio]);

  const cargarNomina = useCallback(async (sectionId?: string) => {
    setCargando(true); setError(null);
    try {
      const data = await getMatriculaByRbd(rbd, anio, {
        incluirRetirados: filtroEstado === 'RETIRO',
        sectionId,
      });
      setNomina(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar nómina');
    } finally {
      setCargando(false);
    }
  }, [rbd, anio, filtroEstado]);

  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  useEffect(() => {
    if (vista === 'nomina') cargarNomina(sectionSeleccionada || undefined);
  }, [vista, sectionSeleccionada, cargarNomina]);

  // ---------------------------------------------------------------------------
  // Filtrado de nómina
  // ---------------------------------------------------------------------------
  const nominaFiltrada = useMemo(() => {
    return nomina.filter((a) => {
      const matchBusqueda = busqueda === '' ||
        `${a.primer_nombre} ${a.apellido_paterno} ${a.apellido_materno} ${a.rut_ipe_estudiante}`
          .toLowerCase().includes(busqueda.toLowerCase());
      const matchEstado = filtroEstado === 'todos' || a.estado_matricula === filtroEstado;
      return matchBusqueda && matchEstado;
    });
  }, [nomina, busqueda, filtroEstado]);

  // ---------------------------------------------------------------------------
  // Totales del resumen
  // ---------------------------------------------------------------------------
  const totales = useMemo(() => ({
    matriculados: cursos.reduce((s, c) => s + (c.total_matriculados - c.retirados), 0),
    definitivos: cursos.reduce((s, c) => s + c.matriculados_definitivos, 0),
    provisorios: cursos.reduce((s, c) => s + c.matriculados_provisorios, 0),
    pie: cursos.reduce((s, c) => s + c.alumnos_pie, 0),
    sep: cursos.reduce((s, c) => s + c.alumnos_sep, 0),
  }), [cursos]);

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------
  const handleNuevaMatricula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.section_id) { setError('Selecciona un curso'); return; }
    setCargando(true); setError(null);
    try {
      const payload: EdeMatricularAlumnoPayload = {
        rbd,
        anio_escolar: anio,
        section_id: form.section_id,
        primer_nombre: form.primer_nombre,
        segundo_nombre: form.segundo_nombre || undefined,
        apellido_paterno: form.apellido_paterno,
        apellido_materno: form.apellido_materno || undefined,
        fecha_nacimiento: form.fecha_nacimiento || undefined,
        sexo_id: parseInt(form.sexo_id) as 1 | 2 | 3,
        run: form.run || undefined,
        ipe: form.ipe || undefined,
        es_pie: form.es_pie,
        es_sep: form.es_sep,
        es_prioritario: form.es_prioritario,
        apoderado: form.apoderado_nombre ? {
          primer_nombre: form.apoderado_nombre,
          apellido_paterno: form.apoderado_apellido,
          run: form.apoderado_run || undefined,
          telefono: form.apoderado_telefono || undefined,
          email: form.apoderado_email || undefined,
          relationship_id: REF_PERSON_RELATIONSHIP.APODERADO,
        } : undefined,
      };
      await matricularAlumno(payload);
      setExito('Matrícula registrada exitosamente');
      setVista('resumen');
      cargarResumen();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al matricular');
    } finally {
      setCargando(false);
    }
  };

  const handleRetiro = async (enrollmentId: string, motivo: string) => {
    setCargando(true); setError(null);
    try {
      await actualizarEstadoMatricula(enrollmentId, REF_PERSON_STATUS.RETIRO, {
        fechaRetiro: new Date().toISOString().split('T')[0],
        motivoRetiro: motivo,
      });
      setModalRetiro(null);
      setExito('Retiro registrado correctamente');
      cargarNomina(sectionSeleccionada || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar retiro');
    } finally {
      setCargando(false);
    }
  };

  const handleExportarJSON = async () => {
    try {
      const url = `/api/ede/matricula?rbd=${encodeURIComponent(rbd)}&anio=${anio}`;
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `EDE_Matricula_${rbd}_${anio}.json`;
      link.click();
    } catch {
      setError('Error al exportar JSON EDE');
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .matricula-page {
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          background: #0f1117;
          color: #e2e8f0;
          padding: 24px;
        }

        /* Header */
        .mat-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 28px;
        }
        .mat-title {
          font-size: 1.75rem;
          font-weight: 800;
          background: linear-gradient(135deg, #38bdf8, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }
        .mat-subtitle {
          font-size: 0.85rem;
          color: #64748b;
          margin: 4px 0 0;
        }
        .mat-badge-ede {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, rgba(56,189,248,0.15), rgba(129,140,248,0.15));
          border: 1px solid rgba(56,189,248,0.3);
          border-radius: 20px;
          padding: 4px 14px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #38bdf8;
          letter-spacing: 0.5px;
        }

        /* Nav tabs */
        .mat-nav {
          display: flex;
          gap: 4px;
          background: #1e2330;
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 24px;
          width: fit-content;
        }
        .mat-nav-btn {
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
        .mat-nav-btn.active {
          background: linear-gradient(135deg, #38bdf8, #818cf8);
          color: #fff;
          font-weight: 600;
        }
        .mat-nav-btn:hover:not(.active) {
          background: #2d3348;
          color: #cbd5e1;
        }

        /* Toolbar */
        .mat-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .mat-select, .mat-input {
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
        .mat-select:focus, .mat-input:focus {
          border-color: #38bdf8;
        }
        .mat-input { min-width: 240px; }

        /* Botones */
        .btn-primary {
          background: linear-gradient(135deg, #38bdf8, #818cf8);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 8px 18px;
          font-size: 0.875rem;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary {
          background: #1e2330;
          color: #94a3b8;
          border: 1px solid #2d3348;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 0.875rem;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-secondary:hover { background: #2d3348; color: #e2e8f0; }
        .btn-danger {
          background: rgba(239,68,68,0.15);
          color: #f87171;
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 6px;
          padding: 5px 12px;
          font-size: 0.8rem;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-danger:hover { background: rgba(239,68,68,0.25); }

        /* KPI Cards */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }
        .kpi-card {
          background: #1e2330;
          border: 1px solid #2d3348;
          border-radius: 14px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s;
        }
        .kpi-card:hover { transform: translateY(-2px); }
        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
        }
        .kpi-card.azul::before  { background: linear-gradient(90deg, #38bdf8, #818cf8); }
        .kpi-card.verde::before { background: linear-gradient(90deg, #22c55e, #16a34a); }
        .kpi-card.ambar::before { background: linear-gradient(90deg, #f59e0b, #d97706); }
        .kpi-card.violeta::before { background: linear-gradient(90deg, #a78bfa, #7c3aed); }
        .kpi-card.cyan::before  { background: linear-gradient(90deg, #06b6d4, #0891b2); }
        .kpi-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .kpi-value {
          font-size: 2rem;
          font-weight: 800;
          margin-top: 8px;
          color: #f1f5f9;
        }

        /* Tabla resumen cursos */
        .cursos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
          margin-bottom: 28px;
        }
        .curso-card {
          background: #1e2330;
          border: 1px solid #2d3348;
          border-radius: 12px;
          padding: 18px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .curso-card:hover {
          border-color: #38bdf8;
          background: #232b3e;
          transform: translateY(-2px);
        }
        .curso-card-nombre {
          font-size: 1rem;
          font-weight: 700;
          color: #e2e8f0;
          margin-bottom: 6px;
        }
        .curso-card-docente {
          font-size: 0.78rem;
          color: #64748b;
          margin-bottom: 12px;
        }
        .curso-card-stats {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .curso-stat {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .curso-stat span { font-weight: 700; color: #cbd5e1; }

        /* Tabla nómina */
        .tabla-wrapper {
          background: #1e2330;
          border: 1px solid #2d3348;
          border-radius: 14px;
          overflow: hidden;
        }
        .tabla-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #2d3348;
          gap: 12px;
          flex-wrap: wrap;
        }
        .tabla-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: #e2e8f0;
        }
        .tabla-count {
          font-size: 0.8rem;
          color: #64748b;
        }
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #16192a; }
        th {
          padding: 12px 16px;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          white-space: nowrap;
        }
        td {
          padding: 12px 16px;
          font-size: 0.875rem;
          color: #cbd5e1;
          border-bottom: 1px solid #1a1f2e;
          vertical-align: middle;
        }
        tr:last-child td { border-bottom: none; }
        tbody tr:hover { background: rgba(56,189,248,0.04); }

        /* Badges */
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.3px;
        }
        .badge-definitiva { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
        .badge-provisoria  { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }
        .badge-retiro      { background: rgba(239,68,68,0.15);  color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
        .badge-pie         { background: rgba(167,139,250,0.15); color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); }
        .badge-sep         { background: rgba(6,182,212,0.15);  color: #22d3ee; border: 1px solid rgba(6,182,212,0.3); }

        /* Formulario nueva matrícula */
        .form-matricula {
          background: #1e2330;
          border: 1px solid #2d3348;
          border-radius: 14px;
          padding: 28px;
          max-width: 860px;
        }
        .form-section-title {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #38bdf8;
          margin: 24px 0 14px;
          padding-bottom: 8px;
          border-bottom: 1px solid #2d3348;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .form-input, .form-select {
          background: #16192a;
          border: 1px solid #2d3348;
          border-radius: 8px;
          color: #e2e8f0;
          padding: 10px 14px;
          font-size: 0.875rem;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.2s;
          width: 100%;
          box-sizing: border-box;
        }
        .form-input:focus, .form-select:focus { border-color: #38bdf8; }
        .form-checkbox-row {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          align-items: center;
          margin: 8px 0;
        }
        .form-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: #94a3b8;
          cursor: pointer;
        }
        input[type="checkbox"] { accent-color: #38bdf8; width: 16px; height: 16px; }

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
        .alert-error  { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
        .alert-exito  { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
        .alert-carga  { background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); color: #38bdf8; }

        /* Modal retiro */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        .modal-box {
          background: #1e2330;
          border: 1px solid #2d3348;
          border-radius: 16px;
          padding: 28px;
          max-width: 440px;
          width: 100%;
        }
        .modal-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; color: #f87171; }
        .modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
      `}</style>

      <div className="matricula-page">
        {/* ── HEADER ── */}
        <div className="mat-header">
          <div>
            <h1 className="mat-title">📋 Matrícula EDE</h1>
            <p className="mat-subtitle">Libro de Clases Digital · Circular N°1 MINEDUC · RBD {rbd}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="mat-badge-ede">✦ EDE-MINEDUC-CIRCULAR1</span>
            <select
              className="mat-select"
              value={anio}
              onChange={(e) => setAnio(parseInt(e.target.value))}
            >
              {[ANIO_ACTUAL - 1, ANIO_ACTUAL, ANIO_ACTUAL + 1].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
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
            <span>✓</span> {exito}
            <button onClick={() => setExito(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
          </div>
        )}
        {cargando && (
          <div className="alert alert-carga">
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Procesando...
          </div>
        )}

        {/* ── NAV TABS ── */}
        <nav className="mat-nav">
          {[
            { key: 'resumen', label: '📊 Resumen por Curso' },
            { key: 'nomina', label: '👥 Nómina de Alumnos' },
            { key: 'nueva', label: '➕ Nueva Matrícula' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`mat-nav-btn ${vista === key ? 'active' : ''}`}
              onClick={() => setVista(key as Vista)}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            VISTA: RESUMEN
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {vista === 'resumen' && (
          <>
            {/* KPIs */}
            <div className="kpi-grid">
              <div className="kpi-card azul">
                <div className="kpi-label">Total Matriculados</div>
                <div className="kpi-value">{totales.matriculados.toLocaleString('es-CL')}</div>
              </div>
              <div className="kpi-card verde">
                <div className="kpi-label">Definitivos</div>
                <div className="kpi-value">{totales.definitivos.toLocaleString('es-CL')}</div>
              </div>
              <div className="kpi-card ambar">
                <div className="kpi-label">Provisorios</div>
                <div className="kpi-value">{totales.provisorios.toLocaleString('es-CL')}</div>
              </div>
              <div className="kpi-card violeta">
                <div className="kpi-label">Alumnos PIE</div>
                <div className="kpi-value">{totales.pie.toLocaleString('es-CL')}</div>
              </div>
              <div className="kpi-card cyan">
                <div className="kpi-label">Alumnos SEP</div>
                <div className="kpi-value">{totales.sep.toLocaleString('es-CL')}</div>
              </div>
            </div>

            {/* Acciones */}
            <div className="mat-toolbar" style={{ marginBottom: 20 }}>
              <button className="btn-primary" onClick={handleExportarJSON} disabled={cargando}>
                ⬇ Exportar JSON EDE
              </button>
              <button className="btn-secondary" onClick={cargarResumen} disabled={cargando}>
                ↺ Actualizar
              </button>
            </div>

            {/* Grid de cursos */}
            {cursos.length === 0 && !cargando ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>📚</div>
                <p style={{ fontSize: '1rem', fontWeight: 600 }}>Sin cursos registrados para {anio}</p>
                <p style={{ fontSize: '0.85rem', marginTop: 8 }}>
                  Ejecuta el SQL de migración en Supabase para comenzar.
                </p>
              </div>
            ) : (
              <div className="cursos-grid">
                {cursos.map((curso) => (
                  <div
                    key={`${curso.rbd}-${curso.nombre_curso}`}
                    className="curso-card"
                    onClick={() => {
                      setSectionSeleccionada('');
                      setVista('nomina');
                    }}
                  >
                    <div className="curso-card-nombre">{curso.nombre_curso}</div>
                    <div className="curso-card-docente">
                      {curso.docente_jefe ?? 'Sin docente jefe asignado'}
                    </div>
                    <div className="curso-card-stats">
                      <div className="curso-stat">👥 <span>{curso.total_matriculados - curso.retirados}</span> alumnos</div>
                      {curso.alumnos_pie > 0 && (
                        <div className="curso-stat">♿ <span>{curso.alumnos_pie}</span> PIE</div>
                      )}
                      {curso.alumnos_sep > 0 && (
                        <div className="curso-stat">🎯 <span>{curso.alumnos_sep}</span> SEP</div>
                      )}
                      {curso.matriculados_provisorios > 0 && (
                        <div className="curso-stat" style={{ color: '#fbbf24' }}>
                          ⚡ <span>{curso.matriculados_provisorios}</span> prov.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            VISTA: NÓMINA
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {vista === 'nomina' && (
          <>
            <div className="mat-toolbar">
              <select
                className="mat-select"
                value={sectionSeleccionada}
                onChange={(e) => setSectionSeleccionada(e.target.value)}
              >
                <option value="">Todos los cursos</option>
                {sections.map((s) => (
                  <option key={s.section_id} value={s.section_id}>{s.nombre_curso}</option>
                ))}
              </select>
              <input
                className="mat-input"
                placeholder="🔍 Buscar alumno (nombre, RUN...)"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <select
                className="mat-select"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="DEFINITIVA">Definitivos</option>
                <option value="PROVISORIA">Provisorios</option>
                <option value="RETIRO">Retirados</option>
              </select>
              <button className="btn-primary" onClick={handleExportarJSON}>
                ⬇ Exportar EDE
              </button>
            </div>

            <div className="tabla-wrapper">
              <div className="tabla-header-row">
                <div>
                  <span className="tabla-title">Nómina de Alumnos</span>{' '}
                  <span className="tabla-count">({nominaFiltrada.length} registros)</span>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>RUN / IPE</th>
                      <th>Apellidos, Nombre</th>
                      <th>Curso</th>
                      <th>F. Nac.</th>
                      <th>Sexo</th>
                      <th>Estado</th>
                      <th>Flags</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nominaFiltrada.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#475569' }}>
                          Sin registros encontrados
                        </td>
                      </tr>
                    ) : (
                      nominaFiltrada.map((a, i) => (
                        <tr key={a.enrollment_id}>
                          <td style={{ color: '#475569', fontSize: '0.8rem' }}>{i + 1}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {a.rut_ipe_estudiante ?? '—'}
                            {a.tipo_identificador === 'IPE' && (
                              <span style={{ marginLeft: 4, fontSize: '0.7rem', color: '#64748b' }}>IPE</span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#f1f5f9' }}>
                              {a.apellido_paterno} {a.apellido_materno}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              {a.primer_nombre} {a.segundo_nombre}
                            </div>
                          </td>
                          <td>{a.nombre_curso}</td>
                          <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                            {a.fecha_nacimiento
                              ? new Date(a.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-CL')
                              : '—'}
                            {a.edad != null && (
                              <span style={{ marginLeft: 4, color: '#475569' }}>({a.edad}a)</span>
                            )}
                          </td>
                          <td>{a.sexo}</td>
                          <td>
                            <span className={`badge ${BADGE_ESTADO[a.estado_matricula] ?? ''}`}>
                              {a.estado_matricula}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {a.es_pie && <span className="badge badge-pie">PIE</span>}
                              {a.es_sep && <span className="badge badge-sep">SEP</span>}
                              {a.es_prioritario && (
                                <span className="badge" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>PRIO</span>
                              )}
                            </div>
                          </td>
                          <td>
                            {a.estado_matricula !== 'RETIRO' && (
                              <button
                                className="btn-danger"
                                onClick={() => setModalRetiro(a)}
                              >
                                Retiro
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            VISTA: NUEVA MATRÍCULA
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {vista === 'nueva' && (
          <form className="form-matricula" onSubmit={handleNuevaMatricula}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0' }}>
              Nueva Matrícula
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 4px' }}>
              Los datos se guardarán en Supabase siguiendo el estándar CEDS/EDE.
            </p>

            <div className="form-section-title">1. Asignación de Curso</div>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Año Escolar</label>
                <select className="form-select" value={anio} onChange={(e) => setAnio(parseInt(e.target.value))}>
                  {[ANIO_ACTUAL - 1, ANIO_ACTUAL, ANIO_ACTUAL + 1].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div className="form-field" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Curso *</label>
                <select
                  className="form-select"
                  value={form.section_id}
                  onChange={(e) => setForm({ ...form, section_id: e.target.value })}
                  required
                >
                  <option value="">Seleccionar curso...</option>
                  {sections.map((s) => (
                    <option key={s.section_id} value={s.section_id}>{s.nombre_curso}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-section-title">2. Datos del Estudiante</div>
            <div className="form-grid">
              {[
                { key: 'primer_nombre', label: 'Primer Nombre *', required: true },
                { key: 'segundo_nombre', label: 'Segundo Nombre' },
                { key: 'apellido_paterno', label: 'Apellido Paterno *', required: true },
                { key: 'apellido_materno', label: 'Apellido Materno' },
              ].map(({ key, label, required }) => (
                <div key={key} className="form-field">
                  <label className="form-label">{label}</label>
                  <input
                    className="form-input"
                    type="text"
                    value={form[key as keyof FormNuevaMatricula] as string}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    required={required}
                  />
                </div>
              ))}
              <div className="form-field">
                <label className="form-label">Fecha de Nacimiento</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Sexo</label>
                <select
                  className="form-select"
                  value={form.sexo_id}
                  onChange={(e) => setForm({ ...form, sexo_id: e.target.value as '1' | '2' | '3' })}
                >
                  <option value="1">Masculino</option>
                  <option value="2">Femenino</option>
                  <option value="3">No Binario</option>
                </select>
              </div>
            </div>

            <div className="form-section-title">3. Identificadores</div>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">RUN (si tiene)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="12.345.678-9"
                  value={form.run}
                  onChange={(e) => setForm({ ...form, run: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label className="form-label">IPE (si es extranjero)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="IPE-XXXXXXXXX"
                  value={form.ipe}
                  onChange={(e) => setForm({ ...form, ipe: e.target.value })}
                />
              </div>
            </div>

            <div className="form-section-title">4. Clasificaciones</div>
            <div className="form-checkbox-row">
              {[
                { key: 'es_pie', label: '♿ Alumno PIE' },
                { key: 'es_sep', label: '🎯 Alumno SEP' },
                { key: 'es_prioritario', label: '⭐ Alumno Prioritario' },
              ].map(({ key, label }) => (
                <label key={key} className="form-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form[key as keyof FormNuevaMatricula] as boolean}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="form-section-title">5. Apoderado Principal (opcional)</div>
            <div className="form-grid">
              {[
                { key: 'apoderado_nombre', label: 'Nombre del Apoderado' },
                { key: 'apoderado_apellido', label: 'Apellido del Apoderado' },
                { key: 'apoderado_run', label: 'RUN Apoderado' },
                { key: 'apoderado_telefono', label: 'Teléfono' },
                { key: 'apoderado_email', label: 'Email', span2: true },
              ].map(({ key, label, span2 }) => (
                <div key={key} className="form-field" style={span2 ? { gridColumn: 'span 2' } : {}}>
                  <label className="form-label">{label}</label>
                  <input
                    className="form-input"
                    type={key === 'apoderado_email' ? 'email' : 'text'}
                    value={form[key as keyof FormNuevaMatricula] as string}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <button type="submit" className="btn-primary" disabled={cargando}>
                {cargando ? '⟳ Procesando...' : '✓ Registrar Matrícula'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setVista('resumen')}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── MODAL RETIRO ── */}
      {modalRetiro && (
        <ModalRetiro
          alumno={modalRetiro}
          onConfirmar={(motivo) => handleRetiro(modalRetiro.enrollment_id, motivo)}
          onCancelar={() => setModalRetiro(null)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: Modal de confirmación de retiro
// ---------------------------------------------------------------------------
function ModalRetiro({
  alumno,
  onConfirmar,
  onCancelar,
}: {
  alumno: EdeRegistroMatriculaRow;
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
}) {
  const [motivo, setMotivo] = useState('Traslado');

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">⚠️ Confirmar Retiro</div>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: '0 0 16px' }}>
          ¿Confirmas el retiro de{' '}
          <strong style={{ color: '#f1f5f9' }}>
            {alumno.primer_nombre} {alumno.apellido_paterno}
          </strong>{' '}
          del curso <strong style={{ color: '#f1f5f9' }}>{alumno.nombre_curso}</strong>?
        </p>
        <div className="form-field">
          <label className="form-label">Motivo del Retiro</label>
          <select
            className="mat-select"
            style={{ width: '100%' }}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          >
            {['Traslado', 'Repitencia', 'Deserción', 'Egreso', 'Cambio de establecimiento', 'Otro'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancelar}>Cancelar</button>
          <button className="btn-danger" style={{ padding: '8px 20px', borderRadius: 8, fontSize: '0.875rem' }} onClick={() => onConfirmar(motivo)}>
            Confirmar Retiro
          </button>
        </div>
      </div>
    </div>
  );
}
