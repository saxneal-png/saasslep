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

interface StudentOption {
  alumno_id: string;
  enrollment_id: string;
  primer_nombre: string;
  apellido_paterno: string;
}

interface ConvivenciaRow {
  incident_id: string;
  fecha: string;
  tipo_anotacion: string;
  subsector: string | null;
  descripcion: string;
  alumno_nombre_completo: string;
  alumno_run: string;
  registrado_por_run: string;
}

export default function ConvivenciaPage() {
  const rbdRaw = typeof window !== 'undefined'
    ? (localStorage.getItem('slep_sim_rbd') ?? document.cookie.match(/slep_sim_rbd=([^;]+)/)?.[1] ?? '10202')
    : '10202';
  const rbd = parseInt(rbdRaw, 10) || 10202;

  const [fecha, setFecha] = useState(HOY);
  const [courses, setCourses] = useState<CourseSectionOption[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  
  const [incidents, setIncidents] = useState<ConvivenciaRow[]>([]);
  const [cargando, setCargando] = useState(false);

  // Formulario nuevo incidente
  const [openModal, setOpenModal] = useState(false);
  const [tipoAnotacion, setTipoAnotacion] = useState('NEGATIVA');
  const [subsector, setSubsector] = useState('');
  const [descripcion, setDescripcion] = useState('');
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

  const cargarAlumnos = async () => {
    if (!selectedSection) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('vw_ede_matricula')
        .select('alumno_id, enrollment_id, primer_nombre, apellido_paterno')
        .eq('section_id', selectedSection)
        .eq('rbd', rbd);

      if (!error && data) {
        setStudents(data as StudentOption[]);
      }
    } catch (e) {
      console.error('Error al cargar alumnos:', e);
    }
  };

  const cargarIncidentes = async () => {
    if (!selectedSection) return;
    setCargando(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('vw_ede_discipline_incidents')
        .select('*')
        .eq('section_id', selectedSection)
        .eq('fecha', fecha);

      if (!error && data) {
        setIncidents(data as ConvivenciaRow[]);
      }
    } catch (e) {
      console.error('Error al cargar incidencias:', e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCursos();
  }, [rbd]);

  useEffect(() => {
    cargarAlumnos();
    cargarIncidentes();
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

  const registrarAnotacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !tipoAnotacion || !descripcion || !docenteRun || !otpCode) {
      setErrorForm('Todos los campos marcados son obligatorios');
      return;
    }

    setGuardando(true);
    setErrorForm(null);

    try {
      const res = await fetch('/api/ede/convivencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno_id: selectedStudent.alumno_id,
          enrollment_id: selectedStudent.enrollment_id,
          section_id: selectedSection,
          rbd,
          fecha,
          tipo_anotacion: tipoAnotacion,
          subsector: subsector || null,
          descripcion,
          registrado_por_run: docenteRun,
          otp: otpCode
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Error al firmar y guardar la anotación');
      }

      setOpenModal(false);
      setDescripcion('');
      setSubsector('');
      setOtpCode('');
      cargarIncidentes();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al registrar anotación');
    } finally {
      setGuardando(false);
    }
  };

  const getBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'POSITIVA': return { bg: '#dcfce7', text: '#15803d' };
      case 'NEGATIVA': return { bg: '#fee2e2', text: '#b91c1c' };
      case 'MEDIDA_DISCIPLINARIA': return { bg: '#ffedd5', text: '#c2410c' };
      case 'RECONOCIMIENTO': return { bg: '#e0f2fe', text: '#0369a1' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  return (
    <>
      <style>{`
        .conv-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
          font-family: system-ui, -apple-system, sans-serif;
          color: #1e293b;
        }
        .conv-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 20px;
        }
        .conv-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .conv-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .conv-input {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background-color: white;
          font-size: 0.88rem;
          color: #1e293b;
        }
        .btn-add {
          background-color: #ef4444;
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3);
        }
        .btn-add:hover { background-color: #dc2626; }
        .conv-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }
        .conv-table th {
          background-color: #f8fafc;
          padding: 14px 20px;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          border-bottom: 1px solid #e2e8f0;
        }
        .conv-table td {
          padding: 16px 20px;
          font-size: 0.88rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .badge-type {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
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
          maxWidth: 480px;
          color: #f8fafc;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
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

      <div className="conv-container">
        {/* Header */}
        <header className="conv-header">
          <div>
            <Link href="/escuela" style={{ textDecoration: 'none', color: '#ef4444', fontSize: '0.82rem', fontWeight: 'bold' }}>
              ← Volver al Panel
            </Link>
            <h1 className="conv-title" style={{ marginTop: 8 }}>⚖️ Convivencia Escolar y Libro de Vida</h1>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>Hoja 11 EDE MINEDUC · Bitácora de Observaciones y Conducta Escolar</p>
          </div>

          <div className="conv-controls">
            <select
              className="conv-input"
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
              className="conv-input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            <button className="btn-add" onClick={() => {
              setErrorForm(null);
              setOpenModal(true);
            }}>
              + Agregar Anotación
            </button>
          </div>
        </header>

        {/* Listado */}
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 64, color: '#64748b' }}>
            <p>Cargando bitácora de observaciones...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, border: '2px dashed #cbd5e1', borderRadius: 16, color: '#64748b' }}>
            <p style={{ fontWeight: 600 }}>Sin observaciones registradas para esta fecha y curso</p>
            <p style={{ fontSize: '0.78rem' }}>Las anotaciones positivas, negativas o medidas disciplinarias deben ser registradas y firmadas por personal del establecimiento.</p>
          </div>
        ) : (
          <table className="conv-table">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Tipo</th>
                <th>Asignatura</th>
                <th>Anotación / Observación</th>
                <th>Registrado por</th>
                <th>Firma</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => {
                const badge = getBadgeColor(inc.tipo_anotacion);
                return (
                  <tr key={inc.incident_id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{inc.alumno_nombre_completo}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{inc.alumno_run}</div>
                    </td>
                    <td>
                      <span className="badge-type" style={{ backgroundColor: badge.bg, color: badge.text }}>
                        {inc.tipo_anotacion.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{inc.subsector || 'Establecimiento'}</td>
                    <td style={{ fontSize: '0.84rem', lineHeight: 1.4, maxWidth: 300 }}>{inc.descripcion}</td>
                    <td style={{ fontSize: '0.78rem' }}>{inc.registrado_por_run}</td>
                    <td>
                      <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '0.78rem' }}>✓ Firmada</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Modal Registrar Anotación */}
        {openModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem' }}>⚖️ Registrar Observación de Conducta</h3>
              <form onSubmit={registrarAnotacion}>

                <div className="form-group">
                  <label>Estudiante</label>
                  <select 
                    className="conv-input" 
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    onChange={(e) => {
                      const st = students.find(s => s.alumno_id === e.target.value);
                      setSelectedStudent(st || null);
                    }}
                    required
                  >
                    <option value="">-- Seleccionar Alumno --</option>
                    {students.map(s => (
                      <option key={s.alumno_id} value={s.alumno_id}>
                        {s.primer_nombre} {s.apellido_paterno}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Tipo de Anotación</label>
                  <select 
                    className="conv-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    value={tipoAnotacion}
                    onChange={(e) => setTipoAnotacion(e.target.value)}
                    required
                  >
                    <option value="POSITIVA">Positiva (Destacado Cumplimiento)</option>
                    <option value="NEGATIVA">Negativa (Incumplimiento)</option>
                    <option value="MEDIDA_DISCIPLINARIA">Medida Disciplinaria</option>
                    <option value="RECONOCIMIENTO">Reconocimiento Especial</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Asignatura / Subsector (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Dejar en blanco si es general del colegio"
                    className="conv-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    value={subsector}
                    onChange={(e) => setSubsector(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Detalle / Descripción de los hechos</label>
                  <textarea 
                    placeholder="Escribir la anotación en el libro de vida..."
                    className="conv-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569', height: 80, resize: 'none' }}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ borderTop: '1px solid #334155', paddingTop: 14 }}>
                  <label>RUN de Funcionario que Registra</label>
                  <input 
                    type="text" 
                    className="conv-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    value={docenteRun}
                    onChange={(e) => setDocenteRun(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ color: '#ef4444' }}>Firma Digital OTP Autorizador</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="123456"
                    className="conv-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#ef4444', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.2em', fontWeight: 'bold' }}
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
                  <button type="button" className="conv-input" style={{ flex: 1, background: 'transparent', color: '#94a3b8', border: '1px solid #475569', cursor: 'pointer' }} onClick={() => setOpenModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-add" style={{ flex: 2 }} disabled={guardando}>
                    {guardando ? 'Guardando...' : '✍️ Firmar y Registrar'}
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
