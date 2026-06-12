import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top Header Branding */}
      <header className="bg-slep-blue text-white shadow-md py-6 px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slep-gold opacity-10 rounded-full translate-x-20 -translate-y-20 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slep-gold flex items-center justify-center font-bold text-slep-blue text-xl shadow">
              VD
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-300 font-semibold">Servicio Local de Educación Pública</p>
              <h1 className="text-2xl font-bold tracking-tight">Valle Diguillín</h1>
            </div>
          </div>
          <div className="bg-slep-blue-dark/50 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-lg text-sm">
            📍 Región de Ñuble • Bulnes • Chillán Viejo • El Carmen • Pemuco • San Ignacio • Yungay • Quillón
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mb-12">
          <span className="bg-slep-blue/10 text-slep-blue font-bold px-4 py-1.5 rounded-full text-xs uppercase tracking-wide">
            Control de Dotación y Conciliación Financiera
          </span>
          <h2 className="text-4xl font-extrabold text-slate-800 mt-4 tracking-tight leading-tight">
            Plataforma Territorial de Gestión de Dotación Docente
          </h2>
          <p className="text-slate-600 mt-4 text-lg">
            Sistema centralizado para el control de horas de asignación, conciliación presupuestaria de subvenciones (Regular, SEP, PIE) y monitoreo de la Ley 20.903.
          </p>
        </div>

        {/* Profiles Selector */}
        <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
          
          {/* Sostenedor / Super Usuario */}
          <Link href="/sostenedor" className="group">
            <div className="h-full bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 hover:border-slep-blue transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slep-blue/5 rounded-bl-full group-hover:bg-slep-blue/10 transition-colors"></div>
              <div>
                <div className="w-14 h-14 bg-slep-blue text-white rounded-xl flex items-center justify-center text-2xl mb-6 shadow-md shadow-slep-blue/20">
                  🏛️
                </div>
                <h3 className="text-xl font-bold text-slate-800 group-hover:text-slep-blue transition-colors">
                  Sostenedor / UATP (SLEP)
                </h3>
                <p className="text-slate-500 mt-3 text-sm leading-relaxed">
                  Acceso global para la administración del territorio completo. Visualiza el mapa de calor de los 131 establecimientos, realiza búsquedas maestras por RUN y monitorea los fondos consolidados de subvenciones.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-slep-blue font-semibold text-sm">
                Ingresar al panel territorial
                <span className="transform group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>

          {/* Director / Escuela */}
          <Link href="/escuela" className="group">
            <div className="h-full bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 hover:border-slep-gold transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slep-gold/5 rounded-bl-full group-hover:bg-slep-gold/10 transition-colors"></div>
              <div>
                <div className="w-14 h-14 bg-slep-gold text-slep-blue-dark rounded-xl flex items-center justify-center text-2xl mb-6 shadow-md shadow-slep-gold/20">
                  🎒
                </div>
                <h3 className="text-xl font-bold text-slate-800 group-hover:text-slep-gold-hover transition-colors">
                  Director / UTP Escuela
                </h3>
                <p className="text-slate-500 mt-3 text-sm leading-relaxed">
                  Gestión focalizada para directivos de establecimientos. Carga nóminas SIGE en formato CSV, visualiza alertas de descalce, programa la matriz horaria escolar y administra la proporción legal de aula de la Ley 20.903.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-slep-gold-hover font-semibold text-sm">
                Ingresar al panel del colegio
                <span className="transform group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>

        </div>

        {/* Territory Stats Footer */}
        <div className="mt-16 w-full max-w-4xl bg-slate-900 text-white rounded-2xl p-8 shadow-inner relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-extrabold text-slep-gold">131</p>
              <p className="text-xs text-slate-400 uppercase mt-1 tracking-wider">Establecimientos</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slep-gold">+4,000</p>
              <p className="text-xs text-slate-400 uppercase mt-1 tracking-wider">Funcionarios</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slep-gold">60 / 40</p>
              <p className="text-xs text-slate-400 uppercase mt-1 tracking-wider">Proporción Especial</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slep-gold">100%</p>
              <p className="text-xs text-slate-400 uppercase mt-1 tracking-wider">Monitoreo Conciliado</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="bg-slate-100 border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Servicio Local de Educación Pública Valle Diguillín • Área de Planificación y Control de Dotación
      </footer>
    </div>
  );
}
