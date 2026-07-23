-- =============================================================================
-- ESQUEMA BASE DE DATOS Y VISTAS DE AGREGACIÓN - SAAS SLEP (Ley 21.040 & 20.903)
-- =============================================================================

-- 1. Tabla de Establecimientos Educacionales (RBD)
CREATE TABLE IF NOT EXISTS public.establecimientos (
  rbd TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  comuna TEXT NOT NULL DEFAULT 'Chillán',
  regimen_jec BOOLEAN NOT NULL DEFAULT true,
  matrícula_total INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Funcionarios / Docentes
CREATE TABLE IF NOT EXISTS public.funcionarios (
  rut TEXT PRIMARY KEY,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  email TEXT,
  titulo_profesional TEXT,
  tramo_carrera TEXT NOT NULL DEFAULT 'Sin Tramo', -- Acceso, Inicial, Temprano, Avanzado, Experto I, Experto II
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Contratos Docentes
CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_rut TEXT NOT NULL REFERENCES public.funcionarios(rut) ON DELETE CASCADE,
  rbd TEXT NOT NULL REFERENCES public.establecimientos(rbd) ON DELETE CASCADE,
  horas_contrato INT NOT NULL CHECK (horas_contrato >= 1 AND horas_contrato <= 44),
  horas_lectivas_asignadas INT NOT NULL DEFAULT 0,
  tipo_contrato TEXT NOT NULL DEFAULT 'Contrata', -- Planta, Contrata, Reemplazo, Honorarios
  fuente_financiamiento TEXT NOT NULL DEFAULT 'REGULAR', -- REGULAR, PIE, SEP, PME
  es_pie BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Vista Materializada: Resumen Macro Sostenedor SLEP
CREATE OR REPLACE VIEW public.vw_resumen_sostenedor_macro AS
SELECT 
  COUNT(DISTINCT f.rut) AS total_docentes,
  COUNT(DISTINCT e.rbd) AS total_escuelas,
  SUM(c.horas_contrato) AS total_horas_contratadas,
  SUM(c.horas_lectivas_asignadas) AS total_horas_lectivas_asignadas,
  SUM(CASE WHEN c.fuente_financiamiento = 'PIE' OR c.es_pie THEN c.horas_contrato ELSE 0 END) AS total_horas_pie,
  COUNT(CASE WHEN (c.horas_lectivas_asignadas * 45) > (
    CASE 
      WHEN c.horas_contrato >= 44 THEN 1710
      WHEN c.horas_contrato >= 30 THEN (c.horas_contrato * 45 * 0.65)::INT
      ELSE (c.horas_contrato * 45 * 0.65)::INT
    END
  ) THEN 1 END) AS docentes_sobreasignados_count
FROM public.contratos c
JOIN public.funcionarios f ON f.rut = c.funcionario_rut
JOIN public.establecimientos e ON e.rbd = c.rbd;

-- 5. Vista por RBD para gestión directiva de Escuela
CREATE OR REPLACE VIEW public.vw_resumen_escuela_rbd AS
SELECT 
  e.rbd,
  e.nombre AS establecimiento_nombre,
  COUNT(DISTINCT c.funcionario_rut) AS cantidad_docentes,
  SUM(c.horas_contrato) AS horas_contrato_escuela,
  SUM(c.horas_lectivas_asignadas) AS horas_lectivas_escuela,
  COUNT(CASE WHEN (c.horas_lectivas_asignadas * 45) > (c.horas_contrato * 45 * 0.65) THEN 1 END) AS docentes_riesgo_count
FROM public.establecimientos e
LEFT JOIN public.contratos c ON c.rbd = e.rbd
GROUP BY e.rbd, e.nombre;
