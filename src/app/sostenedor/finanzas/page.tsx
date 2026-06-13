'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, dbLocal } from '@/lib/supabase';
import { 
  Establecimiento, 
  Contrato, 
  AsignacionAula, 
  Funcionario,
  RegistroRemuneracion
} from '@/lib/types';
import { parsearRemuneracionesCsv } from '@/lib/csvParser';
import { conciliarFuncionario } from '@/lib/rulesEngine';

export default function FinanzasPage() {
  const router = useRouter();
  
  // Guard & session
  const [authorized, setAuthorized] = useState(false);
  
  // Data lists
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAula[]>([]);
  const [remuneraciones, setRemuneraciones] = useState<RegistroRemuneracion[]>([]);
  
  // View logs and files
  const [uploadRemunLogs, setUploadRemunLogs] = useState('');
  const remunFileInputRef = useRef<HTMLInputElement>(null);
  const [filtroDiscrepancias, setFiltroDiscrepancias] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('slep_sim_role');
      if (role !== 'sostenedor_maestro') {
        if (role === 'profesional_slep') {
          router.push('/profesional');
        } else if (role === 'director_escuela') {
          router.push('/escuela');
        } else {
          router.push('/');
        }
      } else {
        setAuthorized(true);
        loadAllData();
      }
    }
  }, []);

  async function loadAllData() {
    const conts = await api.getContratos();
    const funcs = await api.getFuncionarios();
    const asigs = dbLocal.asignacionesAula;
    const rems = await api.getRemuneraciones();
    
    setContratos(conts);
    setFuncionarios(funcs);
    setAsignaciones(asigs);
    setRemuneraciones(rems);
  }

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-600 font-bold">
        🔒 Acceso Restringido. Redirigiendo...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slep-blue-dark text-white flex flex-col z-40 shadow-xl shrink-0">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <Image src="/logo.png" alt="Logo SLEP" width={110} height={45} className="object-contain" />
        </div>
        
        <div className="p-4 flex-1 space-y-6">
          <div>
            <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Unidad UATP</p>
            <nav className="space-y-1">
              <Link
                href="/sostenedor?tab=dashboard"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left text-slate-300 hover:bg-white/5 block"
              >
                🎛️ Tablero de Gobernanza
              </Link>
              <Link
                href="/sostenedor?tab=compendio"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left text-slate-300 hover:bg-white/5 block"
              >
                📊 Compendio Territorial
              </Link>
            </nav>
          </div>

          <div>
            <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Gestión de Personas</p>
            <nav className="space-y-1">
              <Link
                href="/sostenedor/rrhh"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left text-slate-300 hover:bg-white/5 block"
              >
                💼 Fichas, Licencias & Reemplazos
              </Link>
            </nav>
          </div>

          <div>
            <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Finanzas SLEP</p>
            <nav className="space-y-1">
              <Link
                href="/sostenedor/finanzas"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left bg-slep-blue text-white shadow block"
              >
                💵 Conciliación Remuneraciones
              </Link>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Sostenedor Maestro</p>
          <Link href="/" className="mt-2 block w-full bg-white/10 hover:bg-white/20 text-white font-bold py-1.5 rounded text-[10px] transition-colors border border-white/10">
            Cerrar Sesión
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <header className="bg-white border-b py-4 px-6 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-base font-bold text-slate-800">💵 Finanzas SLEP</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Auditoría y conciliación cruzada de remuneraciones del Servicio Local</p>
          </div>
        </header>

        <main className="p-6 md:p-8 flex-1 flex flex-col gap-6 w-full animate-fadeIn">
          <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>💵</span> Conciliación de Remuneraciones
                </h2>
                <p className="text-xs text-slate-500 mt-1">Cargue el libro de remuneraciones de la SLEP (CSV o JSON) para conciliar automáticamente con la dotación en RR.HH. y las horas aula.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => remunFileInputRef.current?.click()}
                  className="bg-slep-blue hover:bg-slep-blue-hover text-white text-xs font-bold px-3 py-2 rounded shadow transition-all cursor-pointer"
                >
                  📥 Cargar Libro Remuneraciones
                </button>
                <input
                  ref={remunFileInputRef}
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const reader = new FileReader();
                      reader.onload = async (evt) => {
                        try {
                          const text = evt.target?.result as string;
                          const parsed = parsearRemuneracionesCsv(text);
                          await api.cargarRemuneraciones(parsed);
                          setRemuneraciones(parsed);
                          setUploadRemunLogs(`✅ Éxito: Se procesaron ${parsed.length} registros del libro de remuneraciones.`);
                        } catch (err: any) {
                          setUploadRemunLogs(`❌ Error al procesar archivo: ${err.message}`);
                        }
                      };
                      reader.readAsText(e.target.files[0], 'UTF-8');
                    }
                  }}
                />
              </div>
            </div>

            {uploadRemunLogs && (
              <div className="mt-3 p-3 bg-slate-50 border rounded-lg text-xs font-bold text-slate-700">
                {uploadRemunLogs}
              </div>
            )}

            {(() => {
              const totalRemunerado = remuneraciones.reduce((sum, r) => sum + r.total_haberes, 0);
              const totalHrsPagadas = remuneraciones.reduce((sum, r) => sum + r.horas_pagadas, 0);
              const totalHrsContrato = contratos.reduce((sum, c) => sum + c.horas_totales, 0);
              
              const alertsCount = funcionarios.filter(f => {
                const conc = conciliarFuncionario(f.run, contratos, asignaciones, remuneraciones);
                return conc.discrepancia;
              }).length;

              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 shadow-sm">
                    <p className="text-slate-505 text-[10px] uppercase font-bold">Total Liquidado</p>
                    <p className="text-lg font-extrabold text-slate-800 mt-1">${totalRemunerado.toLocaleString('es-CL')}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 shadow-sm">
                    <p className="text-slate-555 text-[10px] uppercase font-bold">Horas Pagadas (Libro)</p>
                    <p className="text-lg font-extrabold text-slate-800 mt-1">{totalHrsPagadas.toFixed(1)} hrs</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 shadow-sm">
                    <p className="text-slate-555 text-[10px] uppercase font-bold">Horas Contratadas (RR.HH.)</p>
                    <p className="text-lg font-extrabold text-slep-blue mt-1">{totalHrsContrato.toFixed(1)} hrs</p>
                  </div>
                  <div className="bg-red-50 border border-slep-coral/30 rounded-xl p-4 shadow-sm">
                    <p className="text-red-700 text-[10px] uppercase font-bold">Alertas de Descalce</p>
                    <p className="text-lg font-extrabold text-red-600 mt-1">⚠️ {alertsCount} Funcionarios</p>
                  </div>
                </div>
              );
            })()}

            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border">
                <span className="text-xs font-bold text-slate-700">Detalle de Conciliación por Funcionario</span>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtroDiscrepancias}
                    onChange={(e) => setFiltroDiscrepancias(e.target.checked)}
                    className="rounded text-slep-blue"
                  />
                  <span>Mostrar sólo descalces y discrepancias</span>
                </label>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-600 border-b">
                    <tr>
                      <th className="p-3 pl-4">Funcionario / RUN</th>
                      <th className="p-3">Estamento</th>
                      <th className="p-3 text-center">Horas Contratadas</th>
                      <th className="p-3 text-center">Horas en Aula</th>
                      <th className="p-3 text-center">Horas Pagadas</th>
                      <th className="p-3">Estado de Auditoría / Descalce</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {funcionarios.filter(f => {
                      if (!filtroDiscrepancias) return true;
                      const conc = conciliarFuncionario(f.run, contratos, asignaciones, remuneraciones);
                      return conc.discrepancia;
                    }).map(f => {
                      const conc = conciliarFuncionario(f.run, contratos, asignaciones, remuneraciones);
                      return (
                        <tr key={f.run} className="hover:bg-slate-50">
                          <td className="p-3 pl-4">
                            <span className="font-bold text-slate-800">{f.nombre}</span>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{f.run}</p>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              f.estamento === 'Docente' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {f.estamento || 'P01 Administrativo'}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">{conc.contratadas} hrs</td>
                          <td className="p-3 text-center font-bold text-slep-blue">{conc.aula} hrs</td>
                          <td className="p-3 text-center font-bold text-slate-600">{conc.pagadas} hrs</td>
                          <td className="p-3">
                            {conc.discrepancia ? (
                              <span className="inline-block bg-slep-coral/20 text-red-950 border border-slep-coral/40 px-2.5 py-1 rounded font-semibold text-[10.5px]">
                                ⚠️ {conc.mensaje}
                              </span>
                            ) : (
                              <span className="inline-block bg-slep-emerald/20 text-emerald-950 border border-slep-emerald/40 px-2.5 py-1 rounded font-semibold text-[10.5px]">
                                ✓ Conciliado Correctamente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
