'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/ede-supabase';

const HOY = new Date().toISOString().split('T')[0];
const ANIO_ACTUAL = 2026;
export const dynamic = 'force-dynamic';

interface StudentSelectOption {
  alumno_id: string;
  enrollment_id: string;
  section_id: string;
  primer_nombre: string;
  apellido_paterno: string;
  nombre_curso: string;
}

interface EarlyDepartureRow {
  id: string;
  fecha: string;
  hora_salida: string;
  hora_regreso: string | null;
  alumno_nombre_completo: string;
  alumno_run: string;
  retirado_por_nombre: string;
  retirado_por_run: string | null;
  observacion: string | null;
  firma_digital_key: string | null;
}

export default function SalidasEdePage() {
  // Contexto del establecimiento (RBD local)
  const rbdRaw = typeof window !== 'undefined'
    ? (localStorage.getItem('slep_sim_rbd') ?? document.cookie.match(/slep_sim_rbd=([^;]+)/)?.[1] ?? '10202')
    : '10202';
  const rbd = parseInt(rbdRaw, 10) || 10202;

  const [fecha, setFecha] = useState(HOY);
  const [students, setStudents] = useState<StudentSelectOption[]>([]);
  const [salidas, setSalidas] = useState<EarlyDepartureRow[]>([]);
  const [cargando, setCargando] = useState(false);
  
  // Formulario nuevo registro
  const [openModal, setOpenModal] = useState(false);
  const [selStudent, setSelStudent] = useState<StudentSelectOption | null>(null);
  const [nombreRetira, setNombreRetira] = useState('');
  const [runRetira, setRunRetira] = useState('');
  const [observacion, setObservacion] = useState('');
  const [horaSalida, setHoraSalida] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [errorFirma, setErrorFirma] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Formulario reingreso
  const [openReingresoModal, setOpenReingresoModal] = useState<EarlyDepartureRow | null>(null);
  const [horaRegreso, setHoraRegreso] = useState('');
  const [otpReingreso, setOtpReingreso] = useState('');
  const [errorReingreso, setErrorReingreso] = useState<string | null>(null);

  const cargarAlumnos = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('vw_ede_matricula')
        .select('alumno_id, enrollment_id, section_id, primer_nombre, apellido_paterno, nombre_curso')
        .eq('rbd', rbd)
        .eq('anio_escolar', ANIO_ACTUAL);

      if (!error && data) {
        setStudents(data as StudentSelectOption[]);
      }
    } catch (e) {
      console.error('Error al cargar alumnos:', e);
    }
  };

  const cargarSalidas = async () => {
    setCargando(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('vw_ede_early_departures')
        .select('*')
        .eq('rbd', rbd)
        .eq('fecha', fecha);

      if (!error && data) {
        setSalidas(data as EarlyDepartureRow[]);
      }
    } catch (e) {
      console.error('Error al cargar salidas:', e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAlumnos();
    cargarSalidas();
  }, [rbd, fecha]);

  // Registrar salida
  const registrarSalida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selStudent || !nombreRetira || !horaSalida || !otpCode) {
      setErrorFirma('Todos los campos marcados son obligatorios');
      return;
    }
    if (otpCode.length !== 6) {
      setErrorFirma('El código OTP debe ser de 6 dígitos');
      return;
    }

    setGuardando(true);
    setErrorFirma(null);

    try {
      // 1. Validar OTP del inspector que autoriza (simulado o mediante endpoint)
      const otpRes = await fetch('/api/ede/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rbd,
          fecha,
          section_id: selStudent.section_id,
          registrado_por_run: '14.206.906-3', // RUN inspector de guardia
          otp: otpCode,
          rut_firmante: '14.206.906-3',
          eventos: [] // Array vacío para disparar solo la comprobación OTP
        })
      });

      if (!otpRes.ok) {
        const errData = await otpRes.json();
        throw new Error(errData.error || 'Código OTP inválido para el Inspector');
      }

      // 2. Guardar la salida
      const res = await fetch('/api/ede/salidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno_id: selStudent.alumno_id,
          enrollment_id: selStudent.enrollment_id,
          section_id: selStudent.section_id,
          rbd,
          fecha,
          hora_salida: horaSalida,
          retirado_por_nombre: nombreRetira,
          retirado_por_run: runRetira || null,
          firma_digital_key: otpCode,
          observacion: observacion || null
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Error al guardar el retiro anticipado');
      }

      setOpenModal(false);
      setSelStudent(null);
      setNombreRetira('');
      setRunRetira('');
      setObservacion('');
      setOtpCode('');
      cargarSalidas();
    } catch (err) {
      setErrorFirma(err instanceof Error ? err.message : 'Error al registrar retiro');
    } finally {
      setGuardando(false);
    }
  };

  // Registrar reingreso
  const registrarReingreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openReingresoModal || !horaRegreso || !otpReingreso) {
      setErrorReingreso('Todos los campos son obligatorios');
      return;
    }

    setGuardando(true);
    setErrorReingreso(null);

    try {
      // 1. Validar OTP del inspector
      const otpRes = await fetch('/api/ede/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rbd,
          fecha,
          section_id: '00000000-0000-0000-0000-000000000000', // UUID dummy
          registrado_por_run: '14.206.906-3',
          otp: otpReingreso,
          rut_firmante: '14.206.906-3',
          eventos: []
        })
      });

      if (!otpRes.ok) {
        const errData = await otpRes.json();
        throw new Error(errData.error || 'Código OTP inválido para el Inspector');
      }

      // 2. Actualizar registro en Supabase
      const supabase = getSupabase();
      const { error } = await supabase
        .from('ede_early_departure')
        .update({ hora_regreso: horaRegreso })
        .eq('id', openReingresoModal.id);

      if (error) throw error;

      // Auditoría de reingreso
      await fetch('/api/ede/salidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno_id: openReingresoModal.alumno_run,
          dummy: true // Trigger dummy para el audit log en el middleware/servidor
        })
      }).catch(() => {}); // Fallback silencioso para demo

      setOpenReingresoModal(null);
      setHoraRegreso('');
      setOtpReingreso('');
      cargarSalidas();
    } catch (err) {
      setErrorReingreso(err instanceof Error ? err.message : 'Error al registrar reingreso');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <style>{`
        .sal-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
          font-family: system-ui, -apple-system, sans-serif;
          color: #1e293b;
        }
        .sal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 20px;
        }
        .sal-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .sal-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .sal-input {
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
        .sal-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }
        .sal-table th {
          background-color: #f8fafc;
          padding: 14px 20px;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          border-bottom: 1px solid #e2e8f0;
        }
        .sal-table td {
          padding: 16px 20px;
          font-size: 0.88rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 800;
        }
        .badge-out { background-color: #fee2e2; color: #ef4444; }
        .badge-in { background-color: #dcfce7; color: #22c55e; }
        
        /* Modales */
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
          margin-bottom: 16px;
        }
        .form-group label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
        }
      `}</style>

      <div className="sal-container">
        {/* Header */}
        <header className="sal-header">
          <div>
            <Link href="/escuela" style={{ textDecoration: 'none', color: '#0284c7', fontSize: '0.82rem', fontWeight: 'bold' }}>
              ← Volver al Panel
            </Link>
            <h1 className="sal-title" style={{ marginTop: 8 }}>🚪 Salidas y Retiros Anticipados</h1>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>Hoja 3 EDE MINEDUC · Control de Salidas en Jornada Escolar</p>
          </div>

          <div className="sal-controls">
            <input 
              type="date" 
              className="sal-input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            <button className="btn-add" onClick={() => {
              setErrorFirma(null);
              setOpenModal(true);
            }}>
              + Registrar Retiro
            </button>
          </div>
        </header>

        {/* Listado */}
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 64, color: '#64748b' }}>
            <p>Cargando registros de retiros...</p>
          </div>
        ) : salidas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, border: '2px dashed #cbd5e1', borderRadius: 16, color: '#64748b' }}>
            <p style={{ fontWeight: 600 }}>Sin retiros anticipados registrados para esta fecha</p>
          </div>
        ) : (
          <table className="sal-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Curso</th>
                <th>Hora Salida</th>
                <th>Hora Regreso</th>
                <th>Retirado por</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {salidas.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.alumno_nombre_completo}</td>
                  <td>{s.alumno_run}</td>
                  <td style={{ fontFamily: 'monospace' }}>{s.hora_salida}</td>
                  <td style={{ fontFamily: 'monospace' }}>{s.hora_regreso || '—'}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{s.retirado_por_nombre}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.retirado_por_run}</div>
                  </td>
                  <td>
                    {s.hora_regreso ? (
                      <span className="status-badge badge-in">REGRESADO</span>
                    ) : (
                      <span className="status-badge badge-out">FUERA</span>
                    )}
                  </td>
                  <td>
                    {!s.hora_regreso && (
                      <button 
                        style={{ background: '#22c55e', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer' }}
                        onClick={() => {
                          setErrorReingreso(null);
                          setOpenReingresoModal(s);
                        }}
                      >
                        ✓ Reingreso
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Modal Registrar Salida */}
        {openModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem' }}>🔐 Autorizar Retiro Anticipado EDE</h3>
              <form onSubmit={registrarSalida}>
                
                <div className="form-group">
                  <label>Seleccionar Alumno</label>
                  <select 
                    className="sal-input" 
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    onChange={(e) => {
                      const st = students.find(s => s.alumno_id === e.target.value);
                      setSelStudent(st || null);
                    }}
                    required
                  >
                    <option value="">-- Buscar Alumno --</option>
                    {students.map(s => (
                      <option key={s.alumno_id} value={s.alumno_id}>
                        {s.primer_nombre} {s.apellido_paterno} ({s.nombre_curso})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Hora de Salida</label>
                  <input 
                    type="time" 
                    className="sal-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    value={horaSalida}
                    onChange={(e) => setHoraSalida(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Nombre Adulto Responsable (Persona que Retira)</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Juan Pérez"
                    className="sal-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    value={nombreRetira}
                    onChange={(e) => setNombreRetira(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>RUN de Persona que Retira (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="12.345.678-9"
                    className="sal-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    value={runRetira}
                    onChange={(e) => setRunRetira(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Justificación / Observaciones</label>
                  <textarea 
                    placeholder="Motivo del retiro anticipado..."
                    className="sal-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569', height: 60, resize: 'none' }}
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ borderTop: '1px solid #334155', paddingTop: 16 }}>
                  <label style={{ color: '#0ea5e9' }}>Firma Digital Inspector (Código OTP)</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="123456"
                    className="sal-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#0284c7', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.2em', fontWeight: 'bold' }}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                {errorFirma && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#f87171', padding: 10, borderRadius: 8, fontSize: '0.78rem', marginBottom: 16 }}>
                    ⚠️ {errorFirma}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className="sal-input" style={{ flex: 1, background: 'transparent', color: '#94a3b8', border: '1px solid #475569', cursor: 'pointer' }} onClick={() => setOpenModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-add" style={{ flex: 2 }} disabled={guardando}>
                    {guardando ? 'Firmando...' : '✍️ Autorizar y Guardar'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Modal Registrar Reingreso */}
        {openReingresoModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem' }}>🔄 Confirmar Reingreso de Estudiante</h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 20 }}>
                Estudiante: <strong>{openReingresoModal.alumno_nombre_completo}</strong>
              </p>
              
              <form onSubmit={registrarReingreso}>
                <div className="form-group">
                  <label>Hora de Retorno / Regreso</label>
                  <input 
                    type="time" 
                    className="sal-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#475569' }}
                    value={horaRegreso}
                    onChange={(e) => setHoraRegreso(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ borderTop: '1px solid #334155', paddingTop: 16 }}>
                  <label style={{ color: '#0ea5e9' }}>Firma Digital Inspector (Código OTP)</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="123456"
                    className="sal-input"
                    style={{ background: '#0f172a', color: 'white', borderColor: '#0284c7', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.2em', fontWeight: 'bold' }}
                    value={otpReingreso}
                    onChange={(e) => setOtpReingreso(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                {errorReingreso && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#f87171', padding: 10, borderRadius: 8, fontSize: '0.78rem', marginBottom: 16 }}>
                    ⚠️ {errorReingreso}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className="sal-input" style={{ flex: 1, background: 'transparent', color: '#94a3b8', border: '1px solid #475569', cursor: 'pointer' }} onClick={() => setOpenReingresoModal(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-add" style={{ flex: 2, background: '#22c55e' }} disabled={guardando}>
                    {guardando ? 'Firmando...' : '✍️ Registrar Retorno'}
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
