import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SLEP Valle Diguillín - Gestión de Dotación Docente",
  description: "Plataforma Avanzada de Gestión de Dotación y Conciliación Financiera - Servicio Local de Educación Pública Valle Diguillín",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
