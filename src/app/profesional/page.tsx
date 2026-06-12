'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/supabase';
import { parsearNominaCsv } from '@/lib/csvParser';
import { 
  Establecimiento, 
  Contrato, 
  FinanciamientoContrato, 
  AlertaConciliacion
} from '@/lib/types';

export default function ProfesionalDashboard() {
  const router = useRouter();
  const [profesionalRun, setProfesionalRun] = useState('11.111.111-1');
  const [escuelasAsignadasRbd, setEscuelasAsignadasRbd] = useState<string[]>([]);
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [financiamientos, setFinanciamientos] = useState<FinanciamientoContrato[]>([]);
  const [alertas, setAlertas] = useState<AlertaConciliacion[]>([]);

  // Drag-and-drop
  const [dragActive, setDragActive] = useState(false);
  const [importLogs, setImportLogs] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Asistentes Drag-and-drop
  const [dragActiveAsis, setDragActiveAsis] = useState(false);
  const [importLogsAsis, setImportLogsAsis] = useState('');
  const fileInputRefAsis = useRef<HTMLInputElement>(null);

  // Local filters
  const [searchEst, setSearchEst] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const run = localStorage.getItem('slep_sim_run') || '11.111.111-1';
      setProfesionalRun(run);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!profesionalRun) return;

      const rbds = await api.getTutelasPorProfesional(profesionalRun);
      setEscuelasAsignadasRbd(rbds);

      const allEsts = await api.getEstablecimientos();
      const filteredEsts = allEsts.filter(e => rbds.includes(e.rbd));
      setEstablecimientos(filteredEsts);

      const allConts = await api.getContratos();
      const filteredConts = allConts.filter(c => rbds.includes(c.rbd));
      setContratos(filteredConts);

      const allAlts = await api.getAlertas();
      const filteredAlts = allAlts.filter(a => rbds.includes(a.rbd));
      setAlertas(filteredAlts);

      const fins: FinanciamientoContrato[] = [];
      for (const c of filteredConts) {
        const f = await api.getFinanciamientosPorContrato(c.id);
        fins.push(...f);
      }
      setFinanciamientos(fins);
    }
    loadData();
  }, [profesionalRun]);

  // Handle click on delegate school administration
  const handleAdministrarEscuela = (rbd: string) => {
    if (typeof window !== 'undefined') {
      // Set the simulated school and tell school page we are in supervisor/delegated mode
      localStorage.setItem('slep_sim_rbd', rbd);
      localStorage.setItem('slep_sim_role', 'director_escuela'); // Temporarily assume role to access page
      localStorage.setItem('slep_supervisor_mode', 'true'); // Flag to return to supervisor panel
      router.push('/escuela');
    }
  };

  // Drag-and-drop files
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processNominaFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processNominaFile(e.target.files[0]);
    }
  };

  const processNominaFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const controlPrevioMock = [
          { run: '12.345.678-9', funcion: 'Docente de Aula', horas: 44 },
          { run: '15.432.987-K', funcion: 'Director de Escuela', horas: 38 }
        ];

        const parsed = parsearNominaCsv(text, escuelasAsignadasRbd[0] || '10202', controlPrevioMock, 'Docente');

        const invalidRows = parsed.contratos.filter(c => !escuelasAsignadasRbd.includes(c.rbd));
        if (invalidRows.length > 0) {
          const badRbds = Array.from(new Set(invalidRows.map(c => c.rbd)));
          alert(`❌ Error de Permiso: No tiene autorización para subir nóminas de los establecimientos con RBD: ${badRbds.join(', ')}. Solo puede administrar las escuelas asignadas a su tutela.`);
          return;
        }

        for (const f of parsed.funcionarios) {
          await api.upsertFuncionario(f);
        }
        for (const c of parsed.contratos) {
          const cFins = parsed.financiamientos.filter(f => f.contrato_id === c.id);
          await api.upsertContratoCompleto(c, cFins);
        }
        for (const a of parsed.alertas) {
          await api.crearAlerta(a);
        }

        const allConts = await api.getContratos();
        const filteredConts = allConts.filter(c => escuelasAsignadasRbd.includes(c.rbd));
        setContratos(filteredConts);

        const allAlts = await api.getAlertas();
        const filteredAlts = allAlts.filter(a => escuelasAsignadasRbd.includes(a.rbd));
        setAlertas(filteredAlts);

        setImportLogs(`✅ Éxito: Se procesaron ${parsed.contratos.length} docentes para tus escuelas supervisadas.`);
      } catch (err: any) {
        setImportLogs(`❌ Error al procesar archivo: ${err.message}`);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDragAsis = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveAsis(true);
    } else if (e.type === "dragleave") {
      setDragActiveAsis(false);
    }
  };

  const handleDropAsis = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveAsis(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAsistenteFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChangeAsis = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processAsistenteFile(e.target.files[0]);
    }
  };

  const processAsistenteFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const controlPrevioMock: any[] = [];
        const parsed = parsearNominaCsv(text, escuelasAsignadasRbd[0] || '10202', controlPrevioMock, 'Asistente de la Educación');

        const invalidRows = parsed.contratos.filter(c => !escuelasAsignadasRbd.includes(c.rbd));
        if (invalidRows.length > 0) {
          const badRbds = Array.from(new Set(invalidRows.map(c => c.rbd)));
          alert(`❌ Error de Permiso: No tiene autorización para subir nóminas de los establecimientos con RBD: ${badRbds.join(', ')}.`);
          return;
        }

        for (const f of parsed.funcionarios) {
          await api.upsertFuncionario(f);
        }
        for (const c of parsed.contratos) {
          const cFins = parsed.financiamientos.filter(f => f.contrato_id === c.id);
          await api.upsertContratoCompleto(c, cFins);
        }
        for (const a of parsed.alertas) {
          await api.crearAlerta(a);
        }

        const allConts = await api.getContratos();
        const filteredConts = allConts.filter(c => escuelasAsignadasRbd.includes(c.rbd));
        setContratos(filteredConts);

        const allAlts = await api.getAlertas();
        const filteredAlts = allAlts.filter(a => escuelasAsignadasRbd.includes(a.rbd));
        setAlertas(filteredAlts);

        setImportLogsAsis(`✅ Éxito: Se procesaron ${parsed.contratos.length} asistentes para tus escuelas supervisadas.`);
      } catch (err: any) {
        setImportLogsAsis(`❌ Error al procesar archivo: ${err.message}`);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const filteredEsts = establecimientos.filter(e => 
    e.nombre.toLowerCase().includes(searchEst.toLowerCase()) || e.rbd.includes(searchEst)
  );

  const totalRegular = financiamientos.filter(f => f.origen_fondo === 'Subvención Regular').reduce((sum, f) => sum + f.horas, 0);
  const totalSep = financiamientos.filter(f => f.origen_fondo === 'SEP').reduce((sum, f) => sum + f.horas, 0);
  const totalPie = financiamientos.filter(f => f.origen_fondo === 'PIE').reduce((sum, f) => sum + f.horas, 0);
  const totalRef = financiamientos.filter(f => f.origen_fondo === 'Reforzamiento').reduce((sum, f) => sum + f.horas, 0);
  const totalPro = financiamientos.filter(f => f.origen_fondo === 'Pro-retención').reduce((sum, f) => sum + f.horas, 0);
  const totalOtro = financiamientos.filter(f => f.origen_fondo === 'Otro').reduce((sum, f) => sum + f.horas, 0);
  const sumFinanciamientos = totalRegular + totalSep + totalPie + totalRef + totalPro + totalOtro;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      
      {/* Header */}
      <header className="bg-slep-blue text-white shadow-md py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo SLEP" width={110} height={45} className="brightness-0 invert object-contain" />
            <div className="border-l border-white/20 pl-3">
              <p className="text-[9px] uppercase tracking-wider text-slate-300 font-semibold leading-none">Supervisor Técnico / Profesional SLEP</p>
              <h1 className="text-sm font-bold tracking-tight mt-0.5">Bandeja de Tutela Delegada</h1>
            </div>
          </div>
          <Link href="/" className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors border border-white/10">
            Cerrar Sesión
          </Link>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        
        {/* Left Column: Supervised schools list */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white rounded-xl shadow border border-slate-200/60 p-5 flex justify-between items-center bg-blue-50/20">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Supervisando de forma activa</p>
              <p className="text-lg font-bold text-slep-blue mt-0.5">{escuelasAsignadasRbd.length} Colegios Asignados</p>
            </div>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Facultades de Edición Completas
            </span>
          </div>

          <div className="bg-white rounded-xl shadow border border-slate-200/60 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Establecimientos a su Cargo</h2>
                <p className="text-xs text-slate-500 mt-1">Haga clic en &quot;Administrar Escuela&quot; para heredar atribuciones de Director.</p>
              </div>
              <input 
                type="text" 
                placeholder="RBD..." 
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                value={searchEst}
                onChange={(e) => setSearchEst(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="p-3 pl-6">RBD</th>
                    <th className="p-3">Establecimiento</th>
                    <th className="p-3 text-center">IVM</th>
                    <th className="p-3 text-center">Alertas</th>
                    <th className="p-3 text-center">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEsts.map(e => {
                    const estAlts = alertas.filter(a => a.rbd === e.rbd && !a.resuelta);
                    return (
                      <tr key={e.rbd} className="hover:bg-slate-50">
                        <td className="p-3 pl-6 font-mono font-medium text-slate-500">{e.rbd}</td>
                        <td className="p-3 font-semibold text-slate-800">{e.nombre}</td>
                        <td className="p-3 text-center font-bold">{e.ivm}%</td>
                        <td className="p-3 text-center">
                          {estAlts.length > 0 ? (
                            <span className="bg-slep-coral/20 text-red-800 font-bold px-2 py-0.5 rounded-full">
                              ⚠️ {estAlts.length} Alertas
                            </span>
                          ) : (
                            <span className="bg-slep-emerald/20 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                              ✓ Conciliado
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleAdministrarEscuela(e.rbd)}
                            className="bg-slep-gold hover:bg-slep-gold-hover text-slep-blue-dark font-extrabold px-3 py-1 rounded shadow text-[10px]"
                          >
                            Administrar Escuela 🛠️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: restricted drag and drop file uploads and financial details */}
        <div className="space-y-6">
          
          {/* Restricted Drag-and-drop file upload for Docentes */}
          <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>📥</span> Cargar Nómina Docentes (Drag & Drop)
            </h2>
            <p className="text-xs text-slate-500 mt-1">Cargue el archivo de personal docente (.csv o .json) de sus escuelas asignadas.</p>

            <div 
              onDragEnter={handleDrag} 
              onDragOver={handleDrag} 
              onDragLeave={handleDrag} 
              onDrop={handleDrop}
              className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-slep-blue bg-blue-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv,.json"
                className="hidden" 
                onChange={handleFileChange}
              />
              <span className="text-2xl block mb-2">👨‍🏫</span>
              <p className="text-xs font-bold text-slate-700">Arrastra nómina de Docentes o haz clic</p>
            </div>

            {importLogs && (
              <pre className="mt-3 p-2 bg-slate-100 border rounded text-[9px] text-slate-600 whitespace-pre-wrap">
                {importLogs}
              </pre>
            )}
          </div>

          {/* Restricted Drag-and-drop file upload for Asistentes */}
          <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>📥</span> Cargar Nómina Asistentes (Drag & Drop)
            </h2>
            <p className="text-xs text-slate-500 mt-1">Cargue el archivo de asistentes (.csv o .json) de sus escuelas asignadas.</p>

            <div 
              onDragEnter={handleDragAsis} 
              onDragOver={handleDragAsis} 
              onDragLeave={handleDragAsis} 
              onDrop={handleDropAsis}
              className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragActiveAsis ? 'border-slep-blue bg-blue-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
              }`}
              onClick={() => fileInputRefAsis.current?.click()}
            >
              <input 
                ref={fileInputRefAsis}
                type="file" 
                accept=".csv,.json"
                className="hidden" 
                onChange={handleFileChangeAsis}
              />
              <span className="text-2xl block mb-2">🤝</span>
              <p className="text-xs font-bold text-slate-700">Arrastra nómina de Asistentes o haz clic</p>
            </div>

            {importLogsAsis && (
              <pre className="mt-3 p-2 bg-slate-100 border rounded text-[9px] text-slate-600 whitespace-pre-wrap">
                {importLogsAsis}
              </pre>
            )}
          </div>

          {/* Financial details */}
          <div className="bg-white rounded-xl shadow border border-slate-200/60 p-6">
            <h2 className="text-base font-bold text-slate-800">Presupuesto consolidado del supervisor</h2>
            <div className="mt-4 space-y-3">
              {[
                { name: 'Subvención Regular', hours: totalRegular, color: 'bg-blue-600' },
                { name: 'SEP', hours: totalSep, color: 'bg-amber-500' },
                { name: 'PIE', hours: totalPie, color: 'bg-purple-500' },
                { name: 'Otros', hours: totalRef + totalPro + totalOtro, color: 'bg-slate-500' },
              ].map(fund => {
                const percentage = sumFinanciamientos > 0 ? (fund.hours / sumFinanciamientos) * 100 : 0;
                return (
                  <div key={fund.name} className="space-y-1 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-600">{fund.name}</span>
                      <span>{fund.hours.toFixed(1)} hrs ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${fund.color}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
