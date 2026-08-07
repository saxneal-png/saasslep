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
  docente_jefe_run: string | null;
}

interface StudentParentAttendance {
  alumno_id: string;
  alumno_nombre: string;
  apoderado_id: string;
  apoderado_nombre: string;
  apoderado_run: string;
  asistio: boolean;
  firma_digital_key: string;
}

interface ParentMeetingRow {
  meeting_id: string;
  fecha: string;
  temario: string;
  creado_por_run: string;
  asistencia?: any[];
}

export default function ReunionesPage() {
  const rbdRaw = typeof window !== 'undefined'
    ? (localStorage.getItem('slep_sim_rbd') ?? document.cookie.match(/slep_sim_rbd=([^;]+)/)?.[1] ?? '10202')
    : '10202';
  const rbd = parseInt(rbdRaw, 10) || 10202;

  const [fecha, setFecha] = useState(HOY);
  const [courses, setCourses] = useState<CourseSectionOption[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  
  const [parentsList, setParentsList] = useState<StudentParentAttendance[]>([]);
  const [meetings, setMeetings] = useState<ParentMeetingRow[]>([]);
  const [cargando, setCargando] = useState(false);

  // Formulario nueva reunión
  const [openModal, setOpenModal] = useState(false);
  const [temario, setTemario] = useState('');
  const [docenteRun, setDocenteRun] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cargarCursos = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('ede_course_section')
        .select('section_id, nombre_curso, docente_jefe_run')
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

  const cargarApoderados = async () => {
    if (!selectedSection) return;
    try {
      const supabase = getSupabase();
      // Obtenemos la matrícula completa con apoderados vinculados
      const { data, error } = await supabase
        .from('vw_ede_matricula_completa')
        .select('alumno_id, primer_nombre, apellido_paterno, apoderado_id, apoderado_primer_nombre, apoderado_apellido_paterno, apoderado_run')
        .eq('section_id', selectedSection)
        .eq('rbd', rbd);

      if (!error && data) {
        const listado: StudentParentAttendance[] = data.map((d: any) => ({
          alumno_id: d.alumno_id,
          alumno_nombre: `${d.primer_nombre} ${d.apellido_paterno}`,
          apoderado_id: d.apoderado_id || '00000000-0000-0000-0000-000000000000',
          apoderado_nombre: d.apoderado_id ? `${d.apoderado_primer_nombre} ${d.apoderado_apellido_paterno}` : 'SIN APODERADO REGISTRADO',
          apoderado_run: d.apoderado_run || '',
          asistio: false,
          firma_digital_key: ''
        }));
        setParentsList(listado);
      }
    } catch (e) {
      console.error('Error al cargar apoderados:', e);
    }
  };

  const cargarReuniones = async () => {
    if (!selectedSection) return;
    setCargando(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('vw_ede_parent_meetings')
        .select('*')
        .eq('section_id', selectedSection)
        .eq('fecha', fecha);

      if (!error && data) {
        setMeetings(data as ParentMeetingRow[]);
      }
    } catch (e) {
      console.error('Error al cargar reuniones:', e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCursos();
  }, [rbd]);

  useEffect(() => {
    cargarApoderados();
    cargarReuniones();
  }, [selectedSection, fecha]);

  // RUN docente jefe por defecto
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

  // Manejar cambio asistencia checkbox
  const handleAsistenciaToggle = (idx: number) => {
    const updated = [...parentsList];
    updated[idx].asistio = !updated[idx].asistio;
    if (!updated[idx].asistio) {
      updated[idx].firma_digital_key = '';
    } else {
      // Simula llave de verificación de identidad de apoderado (Circular N°1)
      updated[idx].firma_digital_key = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    setParentsList(updated);
  };

  const registrarReunion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !temario || !docenteRun || !otpCode) {
      setErrorForm('Todos los campos marcados son obligatorios');
      return;
    }

    setGuardando(true);
    setErrorForm(null);

    // Formatear asistencia para la API
    const asistenciaPayload = parentsList.map(p => ({
      apoderado_id: p.apoderado_id,
      alumno_id: p.alumno_id,
      asistio: p.asistio,
      firma_digital_key: p.asistio ? p.firma_digital_key : null
    }));

    try {
      const res = await fetch('/api/ede/reuniones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: selectedSection,
          rbd,
          fecha,
          temario,
          creado_por_run: docenteRun,
          otp: otpCode,
          asistencia: asistenciaPayload
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Error al guardar reunión de apoderados');
      }

      setOpenModal(false);
      setTemario('');
      setOtpCode('');
      cargarReuniones();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al registrar reunión');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <style>{`
        .reu-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
          font-family: system-ui, -apple-system, sans-serif;
          color: #1e293b;
        }
        .reu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 20px;
        }
        .reu-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .reu-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .reu-input {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background-color: white;
          font-size: 0.88rem;
          color: #1e293b;
        }
        .btn-add {
          background-color: #0284c7;
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.3);
        }
        .btn-add:hover { background-color: #0369a1; }
        .grid-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
          margin-top: 12px;
        }
        .reu-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .reu-meta {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 8px;
        }
        .reu-body {
          font-size: 0.88rem;
          line-height: 1.5;
        }
        .reu-heading {
          font-size: 1.12rem;
          font-weight: 700;
          margin: 0 0 6px 0;
          color: #0f172a;
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
          maxWidth: 550px;
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

      <div className="reu-container">
        {/* Header */}
        <header className="reu-header">
          <div>
            <Link href="/escuela" style={{ textDecoration: 'none', color: '#0284c7', fontSize: '0.82rem', fontWeight: 'bold' }}>
              ← Volver al Panel
            </Link>
            <h1 className="reu-title" style={{ marginTop: 8 }}>👥 Reuniones y Comunidad Escolar</h1>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>Hojas 9 y 10 EDE MINEDUC · Bitácora de Actas y Asistencia de Apoderados</p>
          </div>

          <div className="reu-controls">
            <select
              className="reu-input"
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
              className="reu-input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            <button className="btn-add" onClick={() => {
              setErrorForm(null);
              setOpenModal(true);
            }}>
              + Crear Acta Reunión
            </button>
          </div>
        </header>

        {/* Listado */}
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 64, color: '#64748b' }}>
            <p>Cargando actas de reuniones...</p>
          </div>
        ) : meetings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, border: '2px dashed #cbd5e1', borderRadius: 16, color: '#64748b' }}>
            <p style={{ fontWeight: 600 }}>Sin reuniones registradas para esta fecha y curso</p>
          </div>
        ) : (
          <div className="grid-cards">
            {meetings.map((reu) => (
              <div key={reu.meeting_id} className="reu-card">
                <h4 className="reu-heading">Reunión de Apoderados</h4>
                <div className="reu-meta">
                  <span>📅 {reu.fecha}</span>
                  <span style={{ marginLeft: 12 }}>👤 Dictada por: {reu.creado_por_run}</span>
                </div>
                <div className="reu-body">
                  <p style={{ margin: '0 0 10px 0' }}>
                    <strong>📋 Temario y Acuerdos:</strong>
                  </p>
                  <p style={{ background: '#f8fafc', padding: 12, borderRadius: 8, margin: 0, fontSize: '0.84rem', color: '#334155', border: '1px solid #e2e8f0', lineHeight: 1.5 }}>
                    {reu.temario}
                  </p>
                  <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 'bold' }}>✓ Acta Firmada</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Crear Reunión */}
        {openModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem' }}>👥 Crear Acta y Asistencia de Reunión</h3>
              <form onSubmit={registrarReunion}>

                <div className="form-group">
                  <label>Temario, Acuerdos y Decisiones de la Reunión</label>
                  <textarea 
                    placeholder="Escribir el acta detallada..."
                    className="reu-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569', height: 80, resize: 'none' }}
                    value={temario}
                    onChange={(e) => setTemario(e.target.value)}
                    required
                  />
                </div>

                {/* Tabla de asistencia */}
                <div className="form-group" style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #334155', padding: 10, borderRadius: 8, background: '#0f172a' }}>
                  <label style={{ marginBottom: 8, display: 'block' }}>Control de Firmas Apoderados</label>
                  {parentsList.length === 0 ? (
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>No hay alumnos en el curso</p>
                  ) : (
                    parentsList.map((p, idx) => (
                      <div key={p.alumno_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
                        <div style={{ flex: 3 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{p.apoderado_nombre}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Apod. de: {p.alumno_nombre}</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={p.asistio}
                            onChange={() => handleAsistenciaToggle(idx)}
                          />
                        </div>
                        <div style={{ flex: 2, textAlign: 'right', fontSize: '0.72rem', color: '#22c55e', fontWeight: 'bold', fontFamily: 'monospace' }}>
                          {p.asistio ? `✍️ ${p.firma_digital_key}` : '—'}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="form-group" style={{ borderTop: '1px solid #334155', paddingTop: 14 }}>
                  <label>RUN Docente Jefe (Cita y Cierra el Acta)</label>
                  <input 
                    type="text" 
                    className="reu-input"
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
                    className="reu-input"
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
                  <button type="button" className="reu-input" style={{ flex: 1, background: 'transparent', color: '#94a3b8', border: '1px solid #475569', cursor: 'pointer' }} onClick={() => setOpenModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-add" style={{ flex: 2 }} disabled={guardando}>
                    {guardando ? 'Guardando acta...' : '✍️ Firmar y Guardar'}
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
