// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';
import { 
  Establecimiento, 
  Funcionario, 
  Contrato, 
  FinanciamientoContrato, 
  AsignacionAula, 
  AlertaConciliacion,
  EstadoContrato,
  ProfesionalEscuelaAsignada,
  CursoDinamico,
  AsignaturaDinamica,
  CargoPersonalizado,
  PlanEstudioNorm,
  Supervisor,
  RegistroRemuneracion,
  TareaReemplazo,
  ReemplazoDetalle
} from './types';

// Comunas in Diguillín/Valle Diguillín area
const COMUNAS = ['Bulnes', 'Chillán Viejo', 'El Carmen', 'Pemuco', 'San Ignacio', 'Yungay', 'Quillón'];

const NOMBRES_ESCUELAS = [
  'Liceo Polivalente Manuel Bulnes',
  'Escuela E-250 San Ignacio',
  'Liceo Arturo Prat Chacón',
  'Escuela F-270 El Carmen',
  'Liceo Polivalente de Yungay',
  'Escuela D-120 Pemuco',
  'Colegio Héroes de la Concepción',
  'Escuela República de Italia',
  'Liceo Técnico Puente Ñuble',
  'Escuela Las Mercedes',
  'Centro Educacional Valle Diguillín',
  'Escuela Básica Tres Esquinas',
];

// Default MINEDUC decrees
export const DECRETOS_MINEDUC_INICIAL: PlanEstudioNorm[] = [
  {
    nivel: '1° a 4° Básico',
    regimen: 'JEC',
    horasObligatorias: 38,
    horasPIEReglamentarias: 10,
    asignaturasBase: [
      { nombre: 'Lenguaje y Comunicación', horasSugeridas: 8 },
      { nombre: 'Matemática', horasSugeridas: 8 },
      { nombre: 'Ciencias Naturales', horasSugeridas: 3 },
      { nombre: 'Historia, Geografía y Ciencias Sociales', horasSugeridas: 3 },
      { nombre: 'Artes Visuales', horasSugeridas: 2 },
      { nombre: 'Música', horasSugeridas: 2 },
      { nombre: 'Educación Física y Salud', horasSugeridas: 4 },
      { nombre: 'Tecnología', horasSugeridas: 1 },
      { nombre: 'Orientación', horasSugeridas: 1 },
      { nombre: 'Religión', horasSugeridas: 2 },
      { nombre: 'Taller JEC (Reforzamiento)', horasSugeridas: 4 }
    ]
  },
  {
    nivel: '1° a 4° Básico',
    regimen: 'No JEC',
    horasObligatorias: 33,
    horasPIEReglamentarias: 8,
    asignaturasBase: [
      { nombre: 'Lenguaje y Comunicación', horasSugeridas: 8 },
      { nombre: 'Matemática', horasSugeridas: 8 },
      { nombre: 'Ciencias Naturales', horasSugeridas: 3 },
      { nombre: 'Historia, Geografía y Ciencias Sociales', horasSugeridas: 3 },
      { nombre: 'Artes Visuales', horasSugeridas: 2 },
      { nombre: 'Música', horasSugeridas: 2 },
      { nombre: 'Educación Física y Salud', horasSugeridas: 3 },
      { nombre: 'Tecnología', horasSugeridas: 1 },
      { nombre: 'Orientación', horasSugeridas: 1 },
      { nombre: 'Religión', horasSugeridas: 2 }
    ]
  },
  {
    nivel: '5° a 8° Básico',
    regimen: 'JEC',
    horasObligatorias: 38,
    horasPIEReglamentarias: 10,
    asignaturasBase: [
      { nombre: 'Lenguaje y Comunicación', horasSugeridas: 6 },
      { nombre: 'Matemática', horasSugeridas: 6 },
      { nickname: 'Ciencias Naturales', nombre: 'Ciencias Naturales', horasSugeridas: 4 },
      { nombre: 'Historia, Geografía y Ciencias Sociales', horasSugeridas: 4 },
      { nombre: 'Idioma Extranjero: Inglés', horasSugeridas: 3 },
      { nombre: 'Artes Visuales', horasSugeridas: 2 },
      { nombre: 'Música', horasSugeridas: 2 },
      { nombre: 'Educación Física y Salud', horasSugeridas: 4 },
      { nombre: 'Tecnología', horasSugeridas: 1 },
      { nombre: 'Orientación', horasSugeridas: 1 },
      { nombre: 'Religión', horasSugeridas: 2 },
      { nombre: 'Taller JEC', horasSugeridas: 3 }
    ]
  },
  {
    nivel: 'Educación Parvularia (Pre-Kínder y Kínder)',
    regimen: 'JEC',
    horasObligatorias: 30,
    horasPIEReglamentarias: 6,
    asignaturasBase: [
      { nombre: 'Ámbito Desarrollo Personal y Social', horasSugeridas: 10 },
      { nombre: 'Ámbito Comunicación Integral', horasSugeridas: 10 },
      { nombre: 'Ámbito Relación con el Medio Natural y Cultural', horasSugeridas: 10 }
    ]
  }
];

function generarEstablecimientosMock(): Establecimiento[] {
  const lista: Establecimiento[] = [
    { rbd: '10201', nombre: 'Liceo Polivalente Manuel Bulnes', ivm: 85.4, comuna: 'Bulnes', regimen: 'JEC' },
    { rbd: '10202', nombre: 'Escuela E-250 San Ignacio (Altamente Vulnerable)', ivm: 92.1, comuna: 'San Ignacio', regimen: 'JEC' },
    { rbd: '10203', nombre: 'Liceo Arturo Prat Chacón (No JEC)', ivm: 78.5, comuna: 'Quillón', regimen: 'No JEC' },
    { rbd: '10204
