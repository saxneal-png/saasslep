'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/ede-supabase';

const HOY = new Date().toISOString().split('T')[0];
const ANIO_ACTUAL = 2026;
export const dynamic = 'force-dynamic';

interface PieStudentOption {
  alumno_id: string;
  enrollment_id: string;
  section_id: string;
  primer_nombre: string;
  apellido_paterno: string;
  nombre_curso: string;
}

interface PieRecordRow {
  pie_id: string;
  fecha_registro: string;
  paci_detalles: string | null;
  tipo_apoyo: string | null;
  progreso_anual: string | null;
  equipo_aula: any[] | null;
  reuniones_coordinacion: any[] | null;
  estrategias_familia: string | null;
  alumno_nombre_completo: string;
  alumno_run: string;
  registrado_por_run: string;
}

export default function AulaPiePage() {
  const rbdRaw = typeof window !== 'undefined'
    ? (localStorage.getItem('slep_sim_rbd') ?? document.cookie.match(/slep_sim_rbd=([^;]+)/)?.[1] ?? '10202')
    : '10202';
  const rbd = parseInt(rbdRaw, 10) || 10202;

  const [students, setStudents] = useState<PieStudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<PieStudentOption | null>(null);
  const [records, setRecords] = useState<PieRecordRow[]>([]);
  const [cargando, setCargando] = useState(false);

  // Formulario nueva ficha PIE
  const [openModal, setOpenModal] = useState(false);
  const [paciDetalles, setPaciDetalles] = useState('');
  const [tipoApoyo, setTipoApoyo] = useState('Apoyo Psicopedagógico en Aula de Recursos');
  const [progresoAnual, setProgresoAnual] = useState('');
  const [estrategiasFamilia, setEstrategiasFamilia] = useState('');
  
  // Equipo de aula (simple input parseado como array)
  const [integrantes, setIntegrantes] = useState('Juanita Pérez (Psicopedagoga), Alberto Gómez (Educador Diferencial)');
  const [reuniones, setReuniones] = useState('02-03-2026: Planificación de adecuaciones curriculares del semestre.');

  const [docenteRun, setDocenteRun] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cargarAlumnosPie = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('vw_ede_matricula_completa')
        .select('alumno_id, enrollment_id, section_id, primer_nombre, apellido_paterno, nombre_curso')
        .eq('rbd', rbd)
        .eq('anio_escolar', ANIO_ACTUAL)
        .eq('es_pie', true); // Filtrar solo alumnos adscritos al programa PIE

      if (!error && data) {
        setStudents(data as PieStudentOption[]);
        if (data.length > 0) {
          setSelectedStudent(data[0]);
        }
      }
    } catch (e) {
      console.error('Error al cargar alumnos PIE:', e);
    }
  };

  const cargarFichasPie = async () => {
    if (!selectedStudent) return;
    setCargando(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('vw_ede_pie_records')
        .select('*')
        .eq('alumno_id', selectedStudent.alumno_id)
        .eq('rbd', rbd);

      if (!error && data) {
        setRecords(data as PieRecordRow[]);
      }
    } catch (e) {
      console.error('Error al cargar fichas PIE:', e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAlumnosPie();
  }, [rbd]);

  useEffect(() => {
    cargarFichasPie();
  }, [selectedStudent]);

  const registrarPie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !paciDetalles || !docenteRun || !otpCode) {
      setErrorForm('Todos los campos marcados son obligatorios');
      return;
    }

    setGuardando(true);
    setErrorForm(null);

    // Formatear arrays simples de texto a JSONB para guardar
    const equipoArray = integrantes.split(',').map(i => {
      const parts = i.trim().split('(');
      return {
        nombre: parts[0].trim(),
        profesion: parts[1] ? parts[1].replace(')', '').trim() : 'Especialista PIE'
      };
    });

    const reunionesArray = reuniones.split('\n').filter(r => r.trim() !== '').map(r => {
      const idx = r.indexOf(':');
      return {
        fecha: idx > -1 ? r.substring(0, idx).trim() : HOY,
        temas: idx > -1 ? r.substring(idx + 1).trim() : r.trim()
      };
    });

    try {
      const res = await fetch('/api/ede/pie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno_id: selectedStudent.alumno_id,
          enrollment_id: selectedStudent.enrollment_id,
          section_id: selectedStudent.section_id,
          rbd,
          fecha_registro: HOY,
          paci_detalles: paciDetalles,
          tipo_apoyo: tipoApoyo,
          progreso_anual: progresoAnual || null,
          equipo_aula: equipoArray,
          reuniones_coordinacion: reunionesArray,
          estrategias_familia: estrategiasFamilia || null,
          registrado_por_run: docenteRun,
          otp: otpCode
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Error al guardar el registro Aula PIE');
      }

      setOpenModal(false);
      setPaciDetalles('');
      setProgresoAnual('');
      setEstrategiasFamilia('');
      setOtpCode('');
      cargarFichasPie();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al registrar ficha PIE');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <style>{`
        .pie-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
          font-family: system-ui, -apple-system, sans-serif;
          color: #1e293b;
        }
        .pie-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 20px;
        }
        .pie-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .pie-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .pie-input {
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
        .ficha-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          margin-bottom: 20px;
        }
        .ficha-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 12px;
        }
        .meta-field {
          font-size: 0.82rem;
          margin-bottom: 10px;
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

      <div className="pie-container">
        {/* Header */}
        <header className="pie-header">
          <div>
            <Link href="/escuela" style={{ textDecoration: 'none', color: '#0284c7', fontSize: '0.82rem', fontWeight: 'bold' }}>
              ← Volver al Panel
            </Link>
            <h1 className="pie-title" style={{ marginTop: 8 }}>🩺 Registro Aula PIE (Integración Especial)</h1>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>Hoja 12 EDE MINEDUC · Fichas de Apoyo Individual y Plan de Adecuación (PACI)</p>
          </div>

          <div className="pie-controls">
            <select
              className="pie-input"
              value={selectedStudent ? selectedStudent.alumno_id : ''}
              onChange={(e) => {
                const st = students.find(s => s.alumno_id === e.target.value);
                setSelectedStudent(st || null);
              }}
            >
              {students.map(s => (
                <option key={s.alumno_id} value={s.alumno_id}>
                  {s.primer_nombre} {s.apellido_paterno} ({s.nombre_curso})
                </option>
              ))}
            </select>
            <button className="btn-add" onClick={() => {
              setErrorForm(null);
              setOpenModal(true);
            }} disabled={students.length === 0}>
              + Nueva Adecuación
            </button>
          </div>
        </header>

        {/* Listado de Fichas del Estudiante */}
        {students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, border: '2px dashed #cbd5e1', borderRadius: 16, color: '#64748b' }}>
            <p style={{ fontWeight: 600 }}>Sin estudiantes en el Programa de Integración Escolar (PIE)</p>
            <p style={{ fontSize: '0.78rem' }}>Habilite el check PIE en la matrícula del alumno para poder gestionar sus adecuaciones curriculares.</p>
          </div>
        ) : cargando ? (
          <div style={{ textAlign: 'center', padding: 64, color: '#64748b' }}>
            <p>Cargando adecuaciones PIE...</p>
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, border: '2px dashed #cbd5e1', borderRadius: 16, color: '#64748b' }}>
            <p style={{ fontWeight: 600 }}>Sin fichas de adecuación ni planificaciones PACI firmadas para este estudiante</p>
          </div>
        ) : (
          records.map((rec) => (
            <div key={rec.pie_id} className="ficha-card">
              <div className="ficha-header">
                <h3 style={{ margin: 0, fontSize: '1.12rem', color: '#0f172a' }}>Ficha Plan de Apoyo Individual (PACI)</h3>
                <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 'bold' }}>✓ Firmado OTP</span>
              </div>
              <div className="ficha-body">
                <div className="meta-field">
                  <strong>📅 Fecha Registro:</strong> {rec.fecha_registro} | <strong>👤 Especialista Firmante:</strong> {rec.registrado_por_run}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem' }}>🎯 Adecuaciones y Estrategias PACI:</h4>
                    <p style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: '0.84rem', color: '#334155', border: '1px solid #e2e8f0', margin: 0 }}>
                      {rec.paci_detalles}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem' }}>🤝 Tipo de Apoyo y Plan de Aula:</h4>
                    <p style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: '0.84rem', color: '#334155', border: '1px solid #e2e8f0', margin: 0 }}>
                      {rec.tipo_apoyo}
                    </p>
                  </div>
                </div>
                
                {rec.equipo_aula && rec.equipo_aula.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <strong>👥 Integrantes Equipo de Aula:</strong>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                      {rec.equipo_aula.map((eq: any, idx: number) => (
                        <span key={idx} style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 20, fontSize: '0.78rem', border: '1px solid #cbd5e1' }}>
                          👤 {eq.nombre} ({eq.profesion})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Modal Crear Ficha PIE */}
        {openModal && selectedStudent && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem' }}>🩺 Registro de Ficha Aula PIE / PACI</h3>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: 20 }}>
                Estudiante: <strong>{selectedStudent.primer_nombre} {selectedStudent.apellido_paterno}</strong> ({selectedStudent.nombre_curso})
              </p>

              <form onSubmit={registrarPie}>

                <div className="form-group">
                  <label>Estrategias y Adecuaciones Curriculares Individuales (PACI)</label>
                  <textarea 
                    placeholder="Detallar las adecuaciones en contenidos, tiempos o formas de evaluación..."
                    className="pie-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569', height: 60, resize: 'none' }}
                    value={paciDetalles}
                    onChange={(e) => setPaciDetalles(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Modalidad y Tipo de Apoyo</label>
                  <input 
                    type="text" 
                    className="pie-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    value={tipoApoyo}
                    onChange={(e) => setTipoApoyo(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Integrantes del Equipo de Aula</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Juanita Pérez (Psicopedagoga), Alberto Gómez (Educador Diferencial)"
                    className="pie-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    value={integrantes}
                    onChange={(e) => setIntegrantes(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Reuniones de Coordinación (Fecha: Temas)</label>
                  <textarea 
                    placeholder="02-03-2026: Planificación de adecuaciones..."
                    className="pie-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569', height: 40, resize: 'none' }}
                    value={reuniones}
                    onChange={(e) => setReuniones(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Estrategias de trabajo con la familia</label>
                  <textarea 
                    placeholder="Especificar compromisos o tareas de apoyo familiar..."
                    className="pie-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569', height: 40, resize: 'none' }}
                    value={estrategiasFamilia}
                    onChange={(e) => setEstrategiasFamilia(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ borderTop: '1px solid #334155', paddingTop: 14 }}>
                  <label>RUN Especialista PIE (Firma el registro)</label>
                  <input 
                    type="text" 
                    className="pie-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    value={docenteRun}
                    onChange={(e) => setDocenteRun(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ color: '#0ea5e9' }}>Firma Digital OTP Especialista (Mineduc)</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="123456"
                    className="pie-input"
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
                  <button type="button" className="pie-input" style={{ flex: 1, background: 'transparent', color: '#94a3b8', border: '1px solid #475569', cursor: 'pointer' }} onClick={() => setOpenModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-add" style={{ flex: 2 }} disabled={guardando}>
                    {guardando ? 'Guardando ficha...' : '✍️ Firmar y Guardar'}
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
