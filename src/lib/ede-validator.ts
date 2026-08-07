import { SupabaseClient } from '@supabase/supabase-js';

export interface EdeValidationIssue {
  ruleId: string;
  severity: 'ERROR' | 'WARNING';
  table: string;
  message: string;
  affectedRecordId?: string;
}

/**
 * Ejecuta la suite de verificación oficial de EDE MINEDUC sobre el establecimiento
 * basándose en las reglas de coherencia del Diccionario EDE.
 * 
 * @param supabase Cliente Supabase autenticado
 * @param rbd RBD del establecimiento (INTEGER)
 * @param anio Año escolar a auditar (INT)
 */
export async function runEdeComplianceCheck(
  supabase: SupabaseClient,
  rbd: number,
  anio: number
): Promise<{ passed: boolean; issues: EdeValidationIssue[] }> {
  const issues: EdeValidationIssue[] = [];

  try {
    // -------------------------------------------------------------------------
    // FV-MAT-001: Estudiante sin Identificador Válido (RUN [51] o IPE [52])
    // -------------------------------------------------------------------------
    const { data: enrollments, error: errEnroll } = await supabase
      .from('ede_enrollment')
      .select(`
        alumno_id,
        ede_person!inner (
          person_id,
          primer_nombre,
          apellido_paterno
        )
      `)
      .eq('rbd', rbd)
      .eq('anio_escolar', anio);

    if (errEnroll) throw errEnroll;

    if (enrollments && enrollments.length > 0) {
      // Obtener todos los identificadores de estas personas
      const personIds = enrollments.map((e: any) => e.alumno_id);
      
      const { data: identifiers } = await supabase
        .from('ede_person_identifier')
        .select('person_id, identificador, system_id')
        .in('person_id', personIds);

      const idMap = new Map<string, any[]>();
      identifiers?.forEach((id) => {
        if (!idMap.has(id.person_id)) idMap.set(id.person_id, []);
        idMap.get(id.person_id)!.push(id);
      });

      for (const en of enrollments) {
        const student = (en as any).ede_person;
        const studentIds = idMap.get(student.person_id) ?? [];
        
        // Buscar RUN (51) o IPE (52)
        const hasRunOrIpe = studentIds.some(
          (id) => id.system_id === 51 || id.system_id === 52
        );

        if (!hasRunOrIpe) {
          issues.push({
            ruleId: 'FV-MAT-001',
            severity: 'ERROR',
            table: 'ede_person',
            message: `El estudiante matriculado ${student.primer_nombre} ${student.apellido_paterno} no posee RUN (51) ni IPE (52) asignado.`,
            affectedRecordId: student.person_id,
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // FV-MAT-002: Matrículas activas duplicadas en el año escolar (RPC check_duplicate_active_enrollments)
    // -------------------------------------------------------------------------
    const { data: duplicates, error: errDup } = await supabase.rpc(
      'check_duplicate_active_enrollments',
      { p_rbd: rbd, p_anio: anio }
    );

    if (!errDup && duplicates) {
      duplicates.forEach((record: any) => {
        issues.push({
          ruleId: 'FV-MAT-002',
          severity: 'ERROR',
          table: 'ede_enrollment',
          message: `El alumno ${record.student_name} tiene matriculaciones simultáneas en múltiples cursos activos (${record.sections_count} cursos).`,
          affectedRecordId: record.student_id,
        });
      });
    }

    // -------------------------------------------------------------------------
    // FV-ASI-004: Asistencia registrada posterior al retiro del alumno (RPC check_attendance_after_withdrawal)
    // -------------------------------------------------------------------------
    const { data: attendanceAfterWithdrawal, error: errAtt } = await supabase.rpc(
      'check_attendance_after_withdrawal',
      { p_rbd: rbd }
    );

    if (!errAtt && attendanceAfterWithdrawal) {
      attendanceAfterWithdrawal.forEach((record: any) => {
        issues.push({
          ruleId: 'FV-ASI-004',
          severity: 'ERROR',
          table: 'ede_attendance_event',
          message: `El estudiante ${record.student_name} registra asistencia en la fecha ${record.attendance_date}, posterior a su fecha de retiro (${record.exit_date}).`,
          affectedRecordId: record.student_id,
        });
      });
    }

    // -------------------------------------------------------------------------
    // FV-APO-001: Alumno activo sin apoderado principal registrado
    // -------------------------------------------------------------------------
    if (enrollments && enrollments.length > 0) {
      const personIds = enrollments.map((e: any) => e.alumno_id);
      
      const { data: relationships } = await supabase
        .from('ede_person_relationship')
        .select('alumno_id, relationship_id')
        .in('alumno_id', personIds);

      const parentSet = new Set(relationships?.map((r) => r.alumno_id) ?? []);

      for (const en of enrollments) {
        const student = (en as any).ede_person;
        if (!parentSet.has(student.person_id)) {
          issues.push({
            ruleId: 'FV-APO-001',
            severity: 'WARNING', // Advertencia (MINEDUC la acepta pero advierte)
            table: 'ede_person_relationship',
            message: `El alumno matriculado ${student.primer_nombre} ${student.apellido_paterno} no posee un apoderado principal registrado.`,
            affectedRecordId: student.person_id,
          });
        }
      }
    }

  } catch (error) {
    console.error('Error al ejecutar pre-auditoría EDE compliance:', error);
    issues.push({
      ruleId: 'FV-SYS-001',
      severity: 'ERROR',
      table: 'sistema',
      message: `Error de ejecución en la suite de pre-auditoría: ${error instanceof Error ? error.message : 'Error interno.'}`,
    });
  }

  return {
    passed: issues.filter((i) => i.severity === 'ERROR').length === 0,
    issues,
  };
}
