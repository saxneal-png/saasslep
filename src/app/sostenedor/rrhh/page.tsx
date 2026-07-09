// src/app/sostenedor/rrhh/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/supabase';
import { RegistroRemuneracion, Contrato, AsignacionAula, Funcionario } from '@/lib/types';
import { parsearRemuneracionesCsv } from '@/lib/csvParser';
import { conciliarFuncionario } from '@/lib/rulesEngine';

export default function RemuneracionesPage() {
  const router = useRouter();

  // Estados de datos globales
  const [remuneraciones, setRemuneraciones] = useState<RegistroRemuneracion[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAula[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

  // Estados de UI
  const [loading, setLoading] = useState<boolean>(true);
  const [csvText, setCsvText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [filtroDiscrepancia, setFiltroDiscrepancia] = useState<boolean>(false);

  useEffect(() => {
    async function loadRemunData() {
      setLoading(true);
      const rems = await api.getRemuneraciones();
      setRemuneraciones(rems);

      const conts = await api.getContratos();
      setContratos(conts);

      const asigs = await api.getTodasLasAsignaciones();
      setAsignaciones(asigs);

      const funcs = await api.getFuncionarios();
      setFuncionarios(funcs);
      setLoading(false);
    }
    loadRemunData();
  }, []);

  // useMemo para mitigar el cuello de botella del cruce de datos masivo de liquidaciones
  const listadoConciliado = useMemo(() => {
    // Agrupar a todos los RUNs únicos presentes en contratos o liquidaciones para auditarlos
    const todosLosRuns = new Set([
      ...contratos.map(c => c.funcionario_run),
      ...remuneraciones.map(r => r.funcionario_run)
    ]);

    const items = Array.from(todosLosRuns).map(run => {
      const funcionario = funcionarios.find(f => f.run === run);
      const conciliacion = conciliarFuncionario(run, contratos, asignaciones, remuneraciones);

      return {
        run,
        nombre: funcionario?.nombre || 'Funcionario no registrado en RR.HH.',
        estamento: funcionario?.estamento || 'No especificado',
        ...conciliacion
      };
    });

    if (filtroDiscrepancia) {
      return items.filter(i => i.discrepancia);
    }
    return items;
  }, [contratos, remuneraciones, asignaciones, funcionarios, filtroDiscrepancia]);

  // Manejador de la carga masiva de liquidaciones
  const handleCargarRemuneraciones = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    setIsProcessing(true);
    try {
      const registrosParseados = parsearRemuneracionesCsv(csvText);
      if (registrosParseados.length === 0) {
        alert('⚠️ No se detectaron filas válidas en el archivo pegado. Verifica el formato.');
        setIsProcessing(false);
        return;
      }

      await api.cargarRemuneraciones(registrosParseados);
      setRemuneraciones(registrosParseados);
      setCsvText('');
      alert(`🎉 Libro de Remuneraciones cargado con éxito. Se procesaron ${registrosParseados.length} registros del mes.`);
    } catch (err: any) {
      console.error(err);
      alert('❌ Error al procesar el archivo de remuneraciones: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-500">Sincronizando Libro de Remuneraciones con Supabase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Encabezado */}
      <header className="bg-slate-900 text-white px-8 py-5 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/sostenedor')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl text-xs transition-colors"
          >
            ← Volver
          </button>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight">Módulo de Finanzas y Remuneraciones</h1>
            <p className="text-xs text-slate-400">Auditoría de Liquidaciones vs Dotación Legal • SLEP Valle Diguillín</p>
          </div>
        </div>
        <div className="text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400">
          Periodo Contable Activo: {remuneraciones[0]?.mes_pago || 'Sin registros'}
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* Panel de Ingesta Izquierdo */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span>📥</span> Carga Mensual Masiva
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Sube el extracto emitido por el sistema central de pagos.</p>
          </div>

          <form onSubmit={handleCargarRemuneraciones} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600">Pegar Texto Planilla (CSV / JSON)</label>
              <textarea 
                required
                rows={12}
                placeholder="RUN,HorasPagadas,TotalHaberes,MesPago,GrupoEstamento,AplicaLey20903Art5..."
                className="w-full p-3 border border-slate-300 rounded-xl font-mono text-[11px] outline-none bg-slate-50/50 focus:ring-1 focus:ring-blue-500"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-700 leading-normal">
              💡 **Regla de Consistencia:** Al cargar un nuevo mes se sobrescribirá el histórico previo en caché, forzando un recálculo inmediato de descalces.
            </div>

            <button 
              type="submit"
              disabled={isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl text-xs transition-colors shadow-sm disabled:opacity-40"
            >
              {isProcessing ? '⏳ Procesando Liquidaciones...' : '⚡ Cargar y Conciliar Haberes'}
            </button>
          </form>
        </div>

        {/* Listado de Auditoría Derecho */}
        <div className="lg:col-span-2 space-y-4 flex flex-col">
          {/* Filtros superiores */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
            <div>
              <h3 className="font-bold text-slate-800">Resultado de la Conciliación Cruzada</h3>
              <p className="text-slate-400 text-[11px] mt-0.5">Comparación de Horas del Contrato de RR.HH. frente a Horas Liquidadas.</p>
            </div>
            
            <label className="flex items-center gap-2 font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <input 
                type="checkbox" 
                className="rounded text-blue-600 focus:ring-blue-500"
                checked={filtroDiscrepancia}
                onChange={(e) => setFiltroDiscrepancia(e.target.checked)}
              />
              ⚠️ Mostrar solo Descalces / Alertas
            </label>
          </div>

          {/* Tabla de Conciliación */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-4">Funcionario</th>
                    <th className="p-4 text-center">Hrs. Contrato</th>
                    <th className="p-4 text-center">Hrs. Aula</th>
                    <th className="p-4 text-center">Hrs. Pagadas</th>
                    <th className="p-4">Diagnóstico Auditoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listadoConciliado.map(item => (
                    <tr key={item.run} className={`hover:bg-slate-50/60 transition-colors ${item.discrepancia ? 'bg-rose-50/20' : ''}`}>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{item.nombre}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.run} • <span className="font-medium text-slate-500">{item.estamento}</span></div>
                      </td>
                      <td className="p-4 text-center font-bold text-slate-700">{item.contratadas} hrs</td>
                      <td className="p-4 text-center text-slate-500 font-medium">{item.aula} hrs</td>
                      <td className="p-4 text-center font-bold text-slate-700">{item.pagadas} hrs</td>
                      <td className="p-4 max-w-xs">
                        {item.discrepancia ? (
                          <span className="text-rose-600 font-bold flex items-start gap-1 leading-normal">
                            <span className="mt-0.5">❌</span> {item.mensaje}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <span>✅</span> Correcto
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {listadoConciliado.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center p-12 text-slate-400 font-medium">No se registran datos para los filtros especificados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
