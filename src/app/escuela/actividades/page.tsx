'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/ede-supabase';

const HOY = new Date().toISOString().split('T')[0];
const ANIO_ACTUAL = 2026;
export const dynamic = 'force-dynamic';

interface CourseSectionOption {
  section_id: string;
  nombre_curso: string;
  nivel: string;
  docente_jefe_run: string | null;
}

interface ClassActivityRow {
  activity_id: string;
  fecha: string;
  horas: number;
  subsector: string;
  contenidos: string;
  objetivo: string;
  actividad: string | null;
  evaluacion: string | null;
  docente_run: string;
  firma_digital_key: string | null;
}

export default function LeccionarioPage() {
  const rbdRaw = typeof window !== 'undefined'
    ? (localStorage.getItem('slep_sim_rbd') ?? document.cookie.match(/slep_sim_rbd=([^;]+)/)?.[1] ?? '10202')
    : '10202';
  const rbd = parseInt(rbdRaw, 10) || 10202;

  const [fecha, setFecha] = useState(HOY);
  const [courses, setCourses] = useState<CourseSectionOption[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [activities, setActivities] = useState<ClassActivityRow[]>([]);
  const [cargando, setCargando] = useState(false);

  // Formulario de registro de clase
  const [openModal, setOpenModal] = useState(false);
  const [subsector, setSubsector] = useState('');
  const [horas, setHoras] = useState(2);
  const [contenidos, setContenidos] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [actividadDesarrollada, setActividadDesarrollada] = useState('');
  const [evaluacion, setEvaluacion] = useState('');
  const [docenteRun, setDocenteRun] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cargarCursos = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('ede_course_section')
        .select('section_id, nombre_curso, nivel, docente_jefe_run')
        .eq('rbd', rbd)
        .eq('anio_escolar', ANIO_ACTUAL)
        .order('nombre_curso');

      if (!error && data) {
        setCourses(data as CourseSectionOption[]);
        if (data.length > 0) {
          setSelectedSection(data[0].section_id);
        }
      }
    } catch (e) {
      console.error('Error al cargar cursos:', e);
    }
  };

  const cargarActividades = async () => {
    if (!selectedSection) return;
    setCargando(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('ede_class_activity')
        .select('*')
        .eq('section_id', selectedSection)
        .eq('fecha', fecha);

      if (!error && data) {
        setActivities(data as ClassActivityRow[]);
      }
    } catch (e) {
      console.error('Error al cargar actividades:', e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCursos();
  }, [rbd]);

  useEffect(() => {
    cargarActividades();
  }, [selectedSection, fecha]);

  // Cargar RUN por defecto del docente jefe
  useEffect(() => {
    if (selectedSection && courses.length > 0) {
      const cursoSel = courses.find(c => c.section_id === selectedSection);
      if (cursoSel && cursoSel.docente_jefe_run) {
        setDocenteRun(cursoSel.docente_jefe_run);
      } else {
        setDocenteRun('');
      }
    }
  }, [selectedSection, courses]);

  const registrarActividad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !subsector || !horas || !contenidos || !objetivo || !docenteRun || !otpCode) {
      setErrorForm('Todos los campos marcados son obligatorios');
      return;
    }

    setGuardando(true);
    setErrorForm(null);

    try {
      const res = await fetch('/api/ede/actividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: selectedSection,
          rbd,
          fecha,
          horas,
          subsector,
          contenidos,
          objetivo,
          actividad: actividadDesarrollada || null,
          evaluacion: evaluacion || null,
          docente_run: docenteRun,
          otp: otpCode
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Error al firmar y guardar la clase');
      }

      setOpenModal(false);
      setSubsector('');
      setContenidos('');
      setObjetivo('');
      setActividadDesarrollada('');
      setEvaluacion('');
      setOtpCode('');
      cargarActividades();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al registrar clase');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <style>{`
        .lec-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
          font-family: system-ui, -apple-system, sans-serif;
          color: #1e293b;
        }
        .lec-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 20px;
        }
        .lec-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .lec-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .lec-input {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background-color: white;
          font-size: 0.88rem;
          color: #1e293b;
        }
        .btn-add {
          background-color: #0ea5e9;
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.3);
        }
        .btn-add:hover { background-color: #0284c7; }
        .grid-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 12px;
        }
        .act-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          position: relative;
        }
        .badge-signed {
          position: absolute;
          top: 20px;
          right: 20px;
          background-color: #dcfce7;
          color: #15803d;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }
        .act-meta {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 12px;
          display: flex;
          gap: 12px;
        }
        .act-body {
          font-size: 0.88rem;
          line-height: 1.5;
        }
        .act-title {
          font-size: 1.12rem;
          font-weight: 700;
          margin: 0 0 6px 0;
          color: #0f172a;
          padding-right: 60px;
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          zIndex: 1000;
        }
        .modal-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 28px;
          width: 90%;
          maxWidth: 500px;
          color: #f8fafc;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
          maxHeight: 90vh;
          overflowY: auto;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }
        .form-group label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
        }
      `}</style>

      <div className="lec-container">
        {/* Header */}
        <header className="lec-header">
          <div>
            <Link href="/escuela" style={{ textDecoration: 'none', color: '#0ea5e9', fontSize: '0.82rem', fontWeight: 'bold' }}>
              ← Volver al Panel
            </Link>
            <h1 className="lec-title" style={{ marginTop: 8 }}>📖 Leccionario y Registro de Clases</h1>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>Hoja 7 EDE MINEDUC · Registro y Firma de Objetivos y Contenidos Pedagógicos</p>
          </div>

          <div className="lec-controls">
            <select
              className="lec-input"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              {courses.map(c => (
                <option key={c.section_id} value={c.section_id}>
                  {c.nombre_curso}
                </option>
              ))}
            </select>
            <input 
              type="date" 
              className="lec-input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            <button className="btn-add" onClick={() => {
              setErrorForm(null);
              setOpenModal(true);
            }}>
              + Firmar Bloque Clase
            </button>
          </div>
        </header>

        {/* Listado */}
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 64, color: '#64748b' }}>
            <p>Cargando leccionario...</p>
          </div>
        ) : activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, border: '2px dashed #cbd5e1', borderRadius: 16, color: '#64748b' }}>
            <p style={{ fontWeight: 600 }}>Sin clases firmadas en el leccionario para este curso y fecha</p>
            <p style={{ fontSize: '0.78rem' }}>Los docentes deben registrar y firmar con su OTP el cierre de cada bloque de clases dictado.</p>
          </div>
        ) : (
          <div className="grid-cards">
            {activities.map((act) => (
              <div key={act.activity_id} className="act-card">
                <span className="badge-signed">✓ Firmado</span>
                <h4 className="act-title">{act.subsector}</h4>
                <div className="act-meta">
                  <span>⏱️ {act.horas} Horas</span>
                  <span>👤 Docente: {act.docente_run}</span>
                </div>
                <div className="act-body">
                  <p style={{ margin: '0 0 10px 0' }}>
                    <strong>🎯 Objetivo:</strong> {act.objetivo}
                  </p>
                  <p style={{ margin: '0 0 10px 0' }}>
                    <strong>📚 Contenidos:</strong> {act.contenidos}
                  </p>
                  {act.actividad && (
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#475569' }}>
                      <strong>📝 Actividades:</strong> {act.actividad}
                    </p>
                  )}
                  {act.evaluacion && (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#0369a1' }}>
                      <strong>📝 Evaluación:</strong> {act.evaluacion}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Firmar Clase */}
        {openModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem' }}>✍️ Registro y Firma de Bloque de Clases</h3>
              <form onSubmit={registrarActividad}>

                <div className="form-group">
                  <label>Asignatura / Subsector</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Matemáticas, Lenguaje y Comunicación"
                    className="lec-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    value={subsector}
                    onChange={(e) => setSubsector(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Cantidad de Horas Pedagógicas</label>
                  <select 
                    className="lec-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    value={horas}
                    onChange={(e) => setHoras(parseInt(e.target.value, 10))}
                    required
                  >
                    <option value={1}>1 Hora</option>
                    <option value={2}>2 Horas</option>
                    <option value={3}>3 Horas</option>
                    <option value={4}>4 Horas</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Objetivo / Aprendizaje Esperado</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Resolver sumas con reserva del 1 al 100"
                    className="lec-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    value={objetivo}
                    onChange={(e) => setObjetivo(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contenidos / Temas de la Clase</label>
                  <textarea 
                    placeholder="Especificar los contenidos tratados..."
                    className="lec-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569', height: 50, resize: 'none' }}
                    value={contenidos}
                    onChange={(e) => setContenidos(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Actividades Desarrolladas (Opcional)</label>
                  <textarea 
                    placeholder="Descripción de la experiencia de aprendizaje..."
                    className="lec-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569', height: 40, resize: 'none' }}
                    value={actividadDesarrollada}
                    onChange={(e) => setActividadDesarrollada(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Instrumento de Evaluación (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Prueba escrita, pauta de observación"
                    className="lec-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    value={evaluacion}
                    onChange={(e) => setEvaluacion(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ borderTop: '1px solid #334155', paddingTop: 14 }}>
                  <label>RUN del Docente Firmante</label>
                  <input 
                    type="text" 
                    placeholder="12.345.678-9"
                    className="lec-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    value={docenteRun}
                    onChange={(e) => setDocenteRun(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ color: '#0ea5e9' }}>Firma Digital OTP del Docente (Mineduc)</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="123456"
                    className="lec-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#0ea5e9', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.2em', fontWeight: 'bold' }}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                {errorForm && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#f87171', padding: 10, borderRadius: 8, fontSize: '0.78rem', marginBottom: 14 }}>
                    ⚠️ {errorForm}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className="lec-input" style={{ flex: 1, background: 'transparent', color: '#94a3b8', border: '1px solid #475569', cursor: 'pointer' }} onClick={() => setOpenModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-add" style={{ flex: 2 }} disabled={guardando}>
                    {guardando ? 'Firmando leccionario...' : '✍️ Firmar y Registrar'}
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
