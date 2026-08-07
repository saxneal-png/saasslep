'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/ede-supabase';

const ANIO_ACTUAL = 2026;
export const dynamic = 'force-dynamic';

interface CourseSectionOption {
  section_id: string;
  nombre_curso: string;
  docente_jefe_run: string | null;
}

interface StudentGradeRow {
  alumno_id: string;
  enrollment_id: string;
  primer_nombre: string;
  apellido_paterno: string;
  calificaciones: number[];
  promedio: number | null;
}

export default function EvaluacionesPage() {
  const rbdRaw = typeof window !== 'undefined'
    ? (localStorage.getItem('slep_sim_rbd') ?? document.cookie.match(/slep_sim_rbd=([^;]+)/)?.[1] ?? '10202')
    : '10202';
  const rbd = parseInt(rbdRaw, 10) || 10202;

  const [courses, setCourses] = useState<CourseSectionOption[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [subsector, setSubsector] = useState('Matemáticas');
  const [periodo, setPeriodo] = useState('Primer Semestre');
  
  const [students, setStudents] = useState<StudentGradeRow[]>([]);
  const [cargando, setCargando] = useState(false);

  // Formulario de firma y guardado
  const [openModal, setOpenModal] = useState(false);
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

  const cargarNotas = async () => {
    if (!selectedSection) return;
    setCargando(true);
    try {
      const supabase = getSupabase();
      
      // 1. Obtener la nómina de alumnos
      const { data: alumnos, error: errAl } = await supabase
        .from('vw_ede_matricula')
        .select('alumno_id, enrollment_id, primer_nombre, apellido_paterno')
        .eq('section_id', selectedSection)
        .eq('rbd', rbd);

      if (errAl) throw errAl;

      // 2. Obtener las notas existentes para esta sección, asignatura y periodo
      const { data: notas, error: errNt } = await supabase
        .from('ede_assessment_result')
        .select('alumno_id, calificaciones, promedio')
        .eq('section_id', selectedSection)
        .eq('subsector', subsector)
        .eq('periodo', periodo);

      if (errNt) throw errNt;

      // Combinar nómina con notas
      const listado: StudentGradeRow[] = (alumnos || []).map((al) => {
        const notaReg = (notas || []).find((n) => n.alumno_id === al.alumno_id);
        
        // Si no hay notas registradas, inicializamos con 5 casillas vacías (0)
        let calificaciones = [0, 0, 0, 0, 0];
        if (notaReg && Array.isArray(notaReg.calificaciones)) {
          // Aseguramos que tenga al menos 5 notas
          calificaciones = [...notaReg.calificaciones];
          while (calificaciones.length < 5) calificaciones.push(0);
        }

        return {
          alumno_id: al.alumno_id,
          enrollment_id: al.enrollment_id,
          primer_nombre: al.primer_nombre,
          apellido_paterno: al.apellido_paterno,
          calificaciones,
          promedio: notaReg ? parseFloat(String(notaReg.promedio)) : null
        };
      });

      setStudents(listado);
    } catch (e) {
      console.error('Error al cargar notas:', e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCursos();
  }, [rbd]);

  useEffect(() => {
    cargarNotas();
  }, [selectedSection, subsector, periodo]);

  // Cargar docente jefe
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

  // Manejar cambio en un casillero de nota
  const handleNotaChange = (studentIdx: number, notaIdx: number, val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && (num < 1.0 || num > 7.0)) return; // Validar rango de notas en Chile (1.0 - 7.0)

    const updated = [...students];
    const notasAlumno = [...updated[studentIdx].calificaciones];
    notasAlumno[notaIdx] = isNaN(num) ? 0 : num;
    updated[studentIdx].calificaciones = notasAlumno;

    // Calcular promedio omitiendo los ceros (casillas vacías)
    const validas = notasAlumno.filter(n => n > 0);
    if (validas.length > 0) {
      const suma = validas.reduce((acc, curr) => acc + curr, 0);
      updated[studentIdx].promedio = parseFloat((suma / validas.length).toFixed(2));
    } else {
      updated[studentIdx].promedio = null;
    }

    setStudents(updated);
  };

  // Guardar y firmar notas
  const guardarCalificaciones = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docenteRun || !otpCode) {
      setErrorForm('Por favor ingrese el RUN y el código OTP');
      return;
    }

    setGuardando(true);
    setErrorForm(null);

    try {
      // Registrar cada fila de notas en paralelo
      const savePromises = students.map(async (st) => {
        // Filtrar calificaciones ingresadas (omitir ceros)
        const notasIngresadas = st.calificaciones.filter(n => n > 0);
        if (notasIngresadas.length === 0) return Promise.resolve(); // Omitir si no tiene notas

        const res = await fetch('/api/ede/evaluaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enrollment_id: st.enrollment_id,
            alumno_id: st.alumno_id,
            section_id: selectedSection,
            subsector,
            periodo,
            calificaciones: notasIngresadas,
            promedio: st.promedio,
            registrado_por_run: docenteRun,
            otp: otpCode,
            anio_escolar: ANIO_ACTUAL
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `Error al guardar notas de ${st.primer_nombre}`);
        }
      });

      await Promise.all(savePromises);

      setOpenModal(false);
      setOtpCode('');
      cargarNotas();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al guardar calificaciones');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <style>{`
        .eva-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
          font-family: system-ui, -apple-system, sans-serif;
          color: #1e293b;
        }
        .eva-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 20px;
        }
        .eva-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .eva-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .eva-input {
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
        .nota-box {
          width: 50px;
          text-align: center;
          padding: 6px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-family: monospace;
          font-size: 0.94rem;
        }
        .promedio-cell {
          font-weight: 800;
          font-size: 1rem;
          color: #0f172a;
        }
        .eva-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }
        .eva-table th {
          background-color: #f8fafc;
          padding: 14px 20px;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          border-bottom: 1px solid #e2e8f0;
        }
        .eva-table td {
          padding: 14px 20px;
          font-size: 0.88rem;
          border-bottom: 1px solid #f1f5f9;
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
          maxWidth: 450px;
          color: #f8fafc;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }
        .form-group label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
        }
      `}</style>

      <div className="eva-container">
        {/* Header */}
        <header className="eva-header">
          <div>
            <Link href="/escuela" style={{ textDecoration: 'none', color: '#0284c7', fontSize: '0.82rem', fontWeight: 'bold' }}>
              ← Volver al Panel
            </Link>
            <h1 className="eva-title" style={{ marginTop: 8 }}>📊 Calificaciones y Evaluaciones</h1>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>Hoja 8 EDE MINEDUC · Ingreso y Firma de Notas Parciales y Promedios</p>
          </div>

          <div className="eva-controls">
            <select
              className="eva-input"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              {courses.map(c => (
                <option key={c.section_id} value={c.section_id}>
                  {c.nombre_curso}
                </option>
              ))}
            </select>

            <select
              className="eva-input"
              value={subsector}
              onChange={(e) => setSubsector(e.target.value)}
            >
              <option value="Matemáticas">Matemáticas</option>
              <option value="Lenguaje y Comunicación">Lenguaje y Comunicación</option>
              <option value="Ciencias Naturales">Ciencias Naturales</option>
              <option value="Historia, Geografía y Ciencias Sociales">Historia</option>
              <option value="Idioma Extranjero Inglés">Inglés</option>
              <option value="Artes Visuales">Artes Visuales</option>
              <option value="Educación Física y Salud">Educación Física</option>
            </select>

            <select
              className="eva-input"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            >
              <option value="Primer Semestre">Primer Semestre</option>
              <option value="Segundo Semestre">Segundo Semestre</option>
            </select>

            <button className="btn-add" onClick={() => {
              setErrorForm(null);
              setOpenModal(true);
            }}>
              💾 Firmar y Guardar Notas
            </button>
          </div>
        </header>

        {/* Tabla de notas */}
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 64, color: '#64748b' }}>
            <p>Cargando calificaciones...</p>
          </div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, border: '2px dashed #cbd5e1', borderRadius: 16, color: '#64748b' }}>
            <p style={{ fontWeight: 600 }}>Sin estudiantes matriculados en este curso</p>
          </div>
        ) : (
          <table className="eva-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Alumno</th>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <th key={idx} style={{ textAlign: 'center', width: '10%' }}>Nota {idx + 1}</th>
                ))}
                <th style={{ textAlign: 'center', width: '20%' }}>Promedio</th>
              </tr>
            </thead>
            <tbody>
              {students.map((st, sIdx) => (
                <tr key={st.alumno_id}>
                  <td style={{ fontWeight: 600 }}>{st.primer_nombre} {st.apellido_paterno}</td>
                  {st.calificaciones.map((nota, nIdx) => (
                    <td key={nIdx} style={{ textAlign: 'center' }}>
                      <input
                        type="text"
                        maxLength={3}
                        className="nota-box"
                        value={nota === 0 ? '' : nota.toFixed(1)}
                        onChange={(e) => handleNotaChange(sIdx, nIdx, e.target.value)}
                        placeholder="0.0"
                      />
                    </td>
                  ))}
                  <td style={{ textAlign: 'center' }} className="promedio-cell">
                    {st.promedio ? st.promedio.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Modal Confirmación y Firma OTP */}
        {openModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem' }}>🔐 Confirmación de Calificaciones EDE</h3>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: 20 }}>
                Estás a punto de firmar e ingresar las calificaciones del <strong>{periodo}</strong> en la asignatura <strong>{subsector}</strong>. 
                De acuerdo con la Circular N°1 del MINEDUC, este registro será guardado de forma inmutable.
              </p>
              
              <form onSubmit={guardarCalificaciones}>
                
                <div className="form-group">
                  <label>RUN Docente Evaluador</label>
                  <input 
                    type="text" 
                    placeholder="12.345.678-9"
                    className="eva-input"
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
                    className="eva-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#0ea5e9', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.2em', fontWeight: 'bold' }}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                {errorForm && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#f87171', padding: 10, borderRadius: 8, fontSize: '0.78rem', marginBottom: 16 }}>
                    ⚠️ {errorForm}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className="eva-input" style={{ flex: 1, background: 'transparent', color: '#94a3b8', border: '1px solid #475569', cursor: 'pointer' }} onClick={() => setOpenModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-add" style={{ flex: 2 }} disabled={guardando}>
                    {guardando ? 'Guardando notas...' : '✍️ Firmar y Publicar'}
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
