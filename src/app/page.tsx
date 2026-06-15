'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/supabase';
import { Establecimiento } from '@/lib/types';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  
  // Login Simulation states
  const [selectedRole, setSelectedRole] = useState<'sostenedor_maestro' | 'profesional_slep' | 'director_escuela'>('sostenedor_maestro');
  const [profesionalRun, setProfesionalRun] = useState('11.111.111-1');
  const [directorRbd, setDirectorRbd] = useState('10202');
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);

  useEffect(() => {
    async function loadSchools() {
      const data = await api.getEstablecimientos();
      setEstablecimientos(data);
      if (data.length > 0) {
        setDirectorRbd(data[0].rbd);
      }
    }
    loadSchools();
  }, []);

  const handleLogin = () => {
    // Save simulated session parameters to sessionStorage/localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('slep_sim_role', selectedRole);
      document.cookie = `slep_sim_role=${selectedRole}; path=/`;
      if (selectedRole === 'profesional_slep') {
        localStorage.setItem('slep_sim_run', profesionalRun);
        router.push('/profesional');
      } else if (selectedRole === 'director_escuela') {
        localStorage.setItem('slep_sim_rbd', directorRbd);
        router.push('/escuela');
      } else {
        router.push('/sostenedor');
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top Header Branding */}
      <header className="bg-slep-blue text-white shadow-md py-6 px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slep-gold opacity-10 rounded-full translate-x-20 -translate-y-20 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="Logo SLEP" width={110} height={45} className="object-contain bg-white/5 p-1 rounded-lg" />
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-300 font-semibold leading-none">Servicio Local de Educación Pública</p>
              <h1 className="text-xl font-bold tracking-tight mt-1">Valle Diguillín</h1>
            </div>
          </div>
          <div className="bg-slep-blue-dark/50 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-lg text-sm">
            🛡️ Control de Dotación y Conciliación Financiera (RBAC Habilitado)
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-7xl mx-auto w-full">
        
        <div className="text-center max-w-2xl mb-10">
          <span className="bg-slep-blue/10 text-slep-blue font-bold px-4 py-1.5 rounded-full text-xs uppercase tracking-wide">
            Portal de Acceso Centralizado
          </span>
          <h2 className="text-3xl font-extrabold text-slate-800 mt-4 tracking-tight leading-tight">
            Plataforma de Conciliación de Dotación Docente
          </h2>
          <p className="text-slate-600 mt-3 text-base">
            Selecciona tu rol institucional e ingresa con credenciales simuladas para verificar las políticas de seguridad y visualización en tiempo real.
          </p>
        </div>

        {/* Roles Selector & Simulated Authentication Box */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 w-full max-w-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-slep-blue"></div>
          
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span>🔑</span> Simulación de Credenciales
          </h3>

          <div className="space-y-5">
            {/* Role Radio Choices */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Selecciona tu Perfil de Acceso</label>
              
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { id: 'sostenedor_maestro', label: 'Sostenedor Maestro (SLEP General)', desc: 'Vista global absoluta, configuración de planes de estudio y tutela de asesores.' },
                  { id: 'profesional_slep', label: 'Profesional SLEP (Asesor Técnico)', desc: 'Visibilidad de escuelas bajo su tutela asignada, carga de nóminas y finanzas de su grupo.' },
                  { id: 'director_escuela', label: 'Director / Jefe de UTP (Escuela)', desc: 'Gestión exclusiva de su propio RBD, matriz horaria, licencias médicas y cursos.' },
                ].map(r => (
                  <label 
                    key={r.id}
                    onClick={() => setSelectedRole(r.id as any)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer flex flex-col transition-all duration-200 ${
                      selectedRole === r.id 
                        ? 'border-slep-blue bg-blue-50/50 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="user_role"
                        checked={selectedRole === r.id}
                        onChange={() => {}}
                        className="text-slep-blue focus:ring-slep-blue"
                      />
                      <span className="font-bold text-sm text-slate-800">{r.label}</span>
                    </div>
                    <span className="text-xs text-slate-500 mt-1 pl-5 leading-normal">{r.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Simulated login parameters based on selected role */}
            {selectedRole === 'profesional_slep' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-500">Seleccionar RUN de Asesor Técnico</label>
                <select 
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm"
                  value={profesionalRun}
                  onChange={(e) => setProfesionalRun(e.target.value)}
                >
                  <option value="11.111.111-1">11.111.111-1 (Asesor 1 - Tutela Escuela 10202 y 10204)</option>
                  <option value="22.222.222-2">22.222.222-2 (Asesor 2 - Sin tutela asignada)</option>
                </select>
              </div>
            )}

            {selectedRole === 'director_escuela' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-500">Seleccionar Escuela del Director (RBD)</label>
                <select 
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm"
                  value={directorRbd}
                  onChange={(e) => setDirectorRbd(e.target.value)}
                >
                  {establecimientos.map(est => (
                    <option key={est.rbd} value={est.rbd}>
                      {est.nombre} (RBD {est.rbd} - Prioritarios {est.ivm}%)
                    </option>
                  ))}
                  {establecimientos.length === 0 && (
                    <option value="10202">Cargando escuelas...</option>
                  )}
                </select>
              </div>
            )}

            {/* Action button */}
            <button 
              onClick={handleLogin}
              className="w-full bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark font-extrabold py-3.5 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              Ingresar al Dashboard Seguro →
            </button>
          </div>
        </div>

        {/* Database Synchronization Panel */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 w-full max-w-lg mt-6">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>💾</span> Sincronizar Datos entre Dispositivos
          </h4>
          <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
            La plataforma guarda tus cambios localmente en el navegador de este computador. Usa estos botones para exportar tu base de datos e importarla en otro dispositivo.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                const keys = [
                  'establecimientos', 'funcionarios', 'contratos', 'financiamientos',
                  'asignaciones', 'alertas', 'tutelas', 'cursos_dinamicos',
                  'asignaturas_dinamicas', 'supervisores', 'cargos_personalizados',
                  'planes_estudio_json', 'comunas', 'libro_remuneraciones',
                  'tareas_reemplazo', 'reemplazos_licencias'
                ];
                const backup: Record<string, any> = {};
                keys.forEach(k => {
                  const item = localStorage.getItem(`slep_db_${k}`);
                  if (item) {
                    backup[k] = JSON.parse(item);
                  }
                });
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `slep_backup_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="bg-slep-blue hover:bg-slep-blue-hover text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors shadow-sm cursor-pointer text-center"
            >
              📤 Descargar Datos de Aquí
            </button>
            <div className="relative">
              <label className="w-full block bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-lg text-xs transition-colors border border-dashed border-slate-300 text-center cursor-pointer">
                📥 Subir Datos (JSON)
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const backup = JSON.parse(event.target?.result as string);
                        Object.keys(backup).forEach(k => {
                          localStorage.setItem(`slep_db_${k}`, JSON.stringify(backup[k]));
                        });
                        alert('✅ Datos importados correctamente. La página se recargará.');
                        window.location.reload();
                      } catch (err) {
                        alert('Error al leer el archivo JSON.');
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Servicio Local de Educación Pública Valle Diguillín • Área de Planificación y Control de Dotación
      </footer>
    </div>
  );
}
