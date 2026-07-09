'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/supabase';
import { 
  Establecimiento, Contrato, Funcionario, CursoDinamico, 
  AsignacionAula, TareaReemplazo, ReemplazoDetalle 
} from '@/lib/types';
import { validarCargaDocente } from '@/lib/rulesEngine';

export default function DirectorDashboard() {
  const router = useRouter();
  const [rbd, setRbd] = useState<string>('');
  const [escuela, setEscuela] = useState<Establecimiento | null>(null);
  
  // Estados de datos
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [cursos, setCursos] = useState<CursoDinamico[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAula[]>([]);
  const [tareasReemplazo, setTareasReemplazo] = useState<TareaReemplazo[]>([]);
  const [reemplazosList, setReemplazosList] = useState<ReemplazoDetalle[]>([]);

  // Estados de Formulario
  const [nuevoFuncionario, setNuevoFuncionario] = useState<Funcionario>({ run: '', nombre: '', estamento: 'Docente', cargo: 'DOCENTE DE AULA' });
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'dotacion' | 'cursos' | 'reemplazos'>('dotacion');

  useEffect(() => {
    const storedRbd = localStorage.getItem('slep_sim_rbd') || '10202';
    setRbd(storedRbd);
  }, []);

  useEffect(() => {
    if (!rbd) return;
    async function loadData() {
      setLoading(true);
      const [est, allConts, allFuncs, schoolCursos, schoolAsigs, tasks, rems] = await Promise.all([
        api.getEstablecimientoByRbd(rbd),
        api.getContratos(rbd),
        api.getFuncionarios(),
        api.getCursosDinamicos(rbd),
        api.getAsignacionesPorEstablecimiento(rbd),
        api.getTareasReemplazo(),
        api.getReemplazosLicencias()
      ]);
      setEscuela(est || null);
      setContratos(allConts);
      setFuncionarios(allFuncs);
      setCursos(schoolCursos);
      setAsignaciones(schoolAsigs);
      setTareasReemplazo(tasks.filter(t => t.rbd === rbd));
      setReemplazosList(rems.filter(r => r.rbd === rbd));
      setLoading(false);
    }
    loadData();
  }, [rbd]);

  // Funciones de gestión restauradas
  const handleGuardarDocente = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.upsertFuncionario(nuevoFuncionario);
    setFuncionarios([...funcionarios.filter(f => f.run !== nuevoFuncionario.run), nuevoFuncionario]);
    alert('Funcionario actualizado');
  };

  const listaDocentesConCalculo = useMemo(() => {
    return contratos.map(contrato => ({
      contrato,
      funcionario: funcionarios.find(f => f.run === contrato.funcionario_run),
      calculoLey: escuela ? validarCargaDocente(contrato, escuela, asignaciones.filter(a => a.contrato_id === contrato.id)) : null
    }));
  }, [contratos, funcionarios, asignaciones, escuela]);

  if (loading) return <div>Cargando gestión escolar...</div>;

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-black mb-6">{escuela?.nombre || 'Escuela'} - Panel de Dirección</h1>
      
      {/* Navegación de pestañas */}
      <div className="flex gap-4 mb-6">
        <button onClick={() => setActiveTab('dotacion')} className="p-2 bg-blue-600 text-white rounded">Personal</button>
        <button onClick={() => setActiveTab('cursos')} className="p-2 bg-blue-600 text-white rounded">Cursos</button>
        <button onClick={() => setActiveTab('reemplazos')} className="p-2 bg-blue-600 text-white rounded">Licencias</button>
      </div>

      {/* Vista de Personal */}
      {activeTab === 'dotacion' && (
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-bold mb-4">Gestionar Personal</h2>
          <form onSubmit={handleGuardarDocente} className="grid grid-cols-3 gap-4 mb-6">
            <input placeholder="RUN" className="border p-2" onChange={(e) => setNuevoFuncionario({...nuevoFuncionario, run: e.target.value})} />
            <input placeholder="Nombre" className="border p-2" onChange={(e) => setNuevoFuncionario({...nuevoFuncionario, nombre: e.target.value})} />
            <button type="submit" className="bg-green-600 text-white p-2 rounded">Guardar Docente</button>
          </form>
          
          <table className="w-full text-sm">
            <thead className="bg-gray-100"><tr><th>Nombre</th><th>Horas</th><th>Estado Ley 20.903</th></tr></thead>
            <tbody>
              {listaDocentesConCalculo.map(({ contrato, funcionario, calculoLey }) => (
                <tr key={contrato.id}>
                  <td>{funcionario?.nombre}</td>
                  <td>{contrato.horas_totales}</td>
                  <td>{calculoLey?.cumpleLey20903 ? '✅ Cumple' : '❌ Infracción'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
