'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/supabase';
import { Establecimiento, Supervisor, ProfesionalEscuelaAsignada } from '@/lib/types';

export default function SostenedorDashboard() {
  const router = useRouter();

  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [tutelas, setTutelas] = useState<ProfesionalEscuelaAsignada[]>([]);
  
  // Estado para formularios
  const [nuevaEscuela, setNuevaEscuela] = useState<Establecimiento>({ rbd: '', nombre: '', ivm: 0, comuna: '', regimen: 'JEC' });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [allEsts, allSups, allTutelas] = await Promise.all([
        api.getEstablecimientos(),
        api.getSupervisores(),
        api.getTodasLasTutelas()
      ]);
      setEstablecimientos(allEsts);
      setSupervisores(allSups);
      setTutelas(allTutelas);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleAgregarEscuela = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.upsertEstablecimiento(nuevaEscuela);
    setEstablecimientos([...establecimientos, nuevaEscuela]);
    alert('Escuela agregada exitosamente');
  };

  const handleRemoverTutela = async (run: string, rbd: string) => {
    await api.removerEscuelaDeProfesional(run, rbd);
    setTutelas(tutelas.filter(t => !(t.profesional_run === run && t.establecimiento_rbd === rbd)));
  };

  if (loading) return <div>Cargando consola del Sostenedor...</div>;

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-black mb-6">Consola de Control del Sostenedor</h1>

      {/* Gestión de Escuelas */}
      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h2 className="font-bold mb-4">Registrar Nueva Escuela</h2>
        <form onSubmit={handleAgregarEscuela} className="grid grid-cols-2 gap-4">
          <input placeholder="RBD" className="border p-2" onChange={(e) => setNuevaEscuela({...nuevaEscuela, rbd: e.target.value})} />
          <input placeholder="Nombre" className="border p-2" onChange={(e) => setNuevaEscuela({...nuevaEscuela, nombre: e.target.value})} />
          <button type="submit" className="col-span-2 bg-blue-600 text-white p-2 rounded">Guardar Escuela</button>
        </form>
      </div>

      {/* Matriz de Tutelas */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-bold mb-4">Matriz de Tutelas (Asesores)</h2>
        <table className="w-full">
          <thead><tr className="bg-gray-100"><th>Asesor</th><th>Escuela</th><th>Acción</th></tr></thead>
          <tbody>
            {tutelas.map((t, i) => (
              <tr key={i}>
                <td>{t.profesional_run}</td>
                <td>{t.establecimiento_rbd}</td>
                <td>
                  <button onClick={() => handleRemoverTutela(t.profesional_run, t.establecimiento_rbd)} className="text-red-600">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
