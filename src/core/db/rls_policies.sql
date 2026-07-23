-- =============================================================================
-- POLÍTICAS DE SEGURIDAD POR FILA (ROW LEVEL SECURITY - RLS) MULTINIVEL
-- =============================================================================

-- Habilitar RLS en las tablas principales
ALTER TABLE public.establecimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 1. Políticas RLS para la tabla ESTABLECIMIENTOS
-- -----------------------------------------------------------------------------
-- Sostenedor: Acceso total a todos los establecimientos del SLEP
CREATE POLICY "Sostenedor lectura total establecimientos" ON public.establecimientos
  FOR SELECT
  USING (
    (auth.jwt() ->> 'user_role') = 'sostenedor' OR
    (auth.jwt() ->> 'role') = 'service_role'
  );

-- Escuela: Solo visualiza su propio RBD
CREATE POLICY "Escuela lectura propio RBD" ON public.establecimientos
  FOR SELECT
  USING (
    (auth.jwt() ->> 'user_role') = 'escuela' AND rbd = (auth.jwt() ->> 'user_rbd')
  );

-- -----------------------------------------------------------------------------
-- 2. Políticas RLS para la tabla CONTRATOS
-- -----------------------------------------------------------------------------
-- Sostenedor: Lectura y modificación total de contratos del SLEP
CREATE POLICY "Sostenedor acceso total contratos" ON public.contratos
  FOR ALL
  USING (
    (auth.jwt() ->> 'user_role') = 'sostenedor' OR
    (auth.jwt() ->> 'role') = 'service_role'
  );

-- Escuela: Lectura únicamente de contratos pertenecientes a su RBD
CREATE POLICY "Escuela lectura contratos su RBD" ON public.contratos
  FOR SELECT
  USING (
    (auth.jwt() ->> 'user_role') = 'escuela' AND rbd = (auth.jwt() ->> 'user_rbd')
  );

-- Profesional/Docente: Lectura únicamente de sus propios contratos por RUT
CREATE POLICY "Docente lectura sus propios contratos" ON public.contratos
  FOR SELECT
  USING (
    (auth.jwt() ->> 'user_role') = 'profesional' AND funcionario_rut = (auth.jwt() ->> 'user_rut')
  );
