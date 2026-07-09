'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/supabase';
import { Establecimiento, AlertaConciliacion } from '@/lib/types';
import { parsearNominaCsv } from '@/lib/csvParser';

export default function ProfesionalSlepDashboard() {
  const router = useRouter();
  const [runAsesor, setRunAsesor] = useState<string>('');
  
  // Estados
  const [escuelasAsignadas, setEscuelasAsignadas] = useState<Establecimiento[]>([]);
  const [alertas, setAlertas] = useState<AlertaConciliacion[]>([]);
  const [csvText, setCsvText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    const storedRun = localStorage.getItem('slep_sim_run') || '11.111.111-1';
    setRunAsesor(storedRun);
  }, []);

  useEffect(() => {
    if (!runAsesor) return;
    async function loadData() {
      const rbds = await api.getTutelasPorProfesional(runAsesor);
      const allEsts = await api.getEstablecimientos();
      const allAlerts = await api.getAlertas();
      
      setEscuelasAsignadas(allEsts.filter(e => rbds.includes(e.rbd)));
      setAlertas(allAlerts.filter(a => rbds.includes(a.rbd) && !a.resuelta));
    }
    loadData();
  }, [runAsesor]);

  const handleProcesarIngesta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    setIsProcessing(true);
    try {
      // El parser utiliza el RBD del primer colegio como fallback
      const rbdContext = escuelasAsignadas[0]?.rbd || '00000';
      const { funcionarios, contratos, financiamientos, alertas: nuevasAlertas } = parsearNominaCsv(csvText, rbdContext);

      // Persistencia
      for (const f of funcionarios) await api.upsertFuncionario(f);
      for (const c of contratos) {
        const fines = financiamientos.filter(fn => fn.contrato_id === c.id);
        await api.upsertContratoCompleto(c, fines);
      }
      for (const al of nuevasAlertas) await api.crearAlerta(al);

      alert('✅ Ingesta territorial procesada correctamente.');
      setCsvText('');
      window.location.reload();
    } catch (err: any) {
      alert('Error en ingesta: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-black mb-6">Dashboard UATP - Asesor: {runAsesor}</h1>

      <div className="grid grid-cols-2 gap-8">
        {/* Ingesta Masiva */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-bold mb-4">Ingesta Masiva SIGE</h2>
          <textarea 
            rows={10} 
            className="w-full border p-2 text-xs font-mono mb-4" 
            value={csvText} 
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="RUN,Nombre,RBD,CalidadJuridica,Funcion,HorasTotales..."
          />
          <button 
            onClick={handleProcesarIngesta} 
            disabled={isProcessing}
            className="bg-blue-600 text-white w-full p-2 rounded"
          >
            {isProcessing ? 'Procesando...' : 'Normalizar y Subir Datos'}
          </button>
        </div>

        {/* Alertas Territoriales */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-bold mb-4">Matriz de Alertas (Territorio)</h2>
          <div className="space-y-2">
            {alertas.map(a => (
              <div key={a.id} className="p-3 border border-red-200 bg-red-50 text-xs rounded">
                <strong>{a.nombre_funcionario} ({a.rbd}):</strong> {a.mensaje}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
