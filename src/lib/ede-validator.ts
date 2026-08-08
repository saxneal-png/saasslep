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
            severity: 'WARNING',
            table: 'ede_person_relationship',
            message: `El alumno matriculado ${student.primer_nombre} ${student.apellido_paterno} no posee un apoderado principal registrado.`,
            affectedRecordId: student.person_id,
          });
        }
      }
    }

    // =========================================================================
    // NUEVAS REGLAS OFICIALES CEDS-MINEDUC (DICCIONARIO DE DATOS EDE)
    // =========================================================================

    // 1. fn0FA: Coherencia de Roles y Enrolamiento
    // Verificar que todas las matrículas correspondan a una sección de curso válida y existente.
    const { data: invalidEnrollSections } = await supabase
      .from('ede_enrollment')
      .select('enrollment_id, section_id, alumno_id')
      .eq('rbd', rbd)
      .eq('anio_escolar', anio);

    if (invalidEnrollSections) {
      const sectionIds = invalidEnrollSections.map(e => e.section_id).filter(Boolean);
      let existingSectionIds = new Set<string>();
      
      if (sectionIds.length > 0) {
        const { data: validSections } = await supabase
          .from('ede_course_section')
          .select('section_id')
          .in('section_id', sectionIds);
        existingSectionIds = new Set(validSections?.map(s => s.section_id) ?? []);
      }

      invalidEnrollSections.forEach(en => {
        if (!en.section_id || !existingSectionIds.has(en.section_id)) {
          issues.push({
            ruleId: 'fn0FA',
            severity: 'ERROR',
            table: 'ede_enrollment',
            message: `Fallo fn0FA: La matrícula no cuenta con asignación de sección/curso activa en la jerarquía CEDS.`,
            affectedRecordId: en.enrollment_id
          });
        }
      });
    }

    // 2. fn0FB: Estructura de Jerarquía de Cursos y Niveles
    // Verificar que todas las secciones del establecimiento tengan código de grado/enseñanza y nivel.
    const { data: sectionsHierarchy } = await supabase
      .from('ede_course_section')
      .select('section_id, nombre_curso, nivel, letra')
      .eq('rbd', rbd)
      .eq('anio_escolar', anio);

    sectionsHierarchy?.forEach(sec => {
      if (!sec.nivel || sec.nivel.trim() === '') {
        issues.push({
          ruleId: 'fn0FB',
          severity: 'ERROR',
          table: 'ede_course_section',
          message: `Fallo fn0FB: El curso '${sec.nombre_curso}' no posee nivel educacional definido en la jerarquía del establecimiento.`,
          affectedRecordId: sec.section_id
        });
      }
    });

    // 3. fn1FA: Registro e Identificación de Firmas de Salida
    // Validar que todos los retiros anticipados tengan un RUN de apoderado autorizante y una clave digital del inspector.
    const { data: departuresSignature } = await supabase
      .from('ede_early_departure')
      .select('departure_id, alumno_id, apoderado_run, inspector_digital_key')
      .eq('rbd', rbd);

    departuresSignature?.forEach(dep => {
      if (!dep.apoderado_run || !dep.inspector_digital_key) {
        issues.push({
          ruleId: 'fn1FA',
          severity: 'ERROR',
          table: 'ede_early_departure',
          message: `Fallo fn1FA: Salida anticipada del estudiante sin registro de firma digital o RUN del adulto responsable.`,
          affectedRecordId: dep.departure_id
        });
      }
    });

    // 4. fn1FC: Asistencia y Firmas de Apoderados en Reunión
    // Validar que toda asistencia confirmada de apoderados en reuniones de apoderados cuente con llave digital de verificación.
    const { data: meetAttendanceSign } = await supabase
      .from('ede_parent_meeting_attendance')
      .select('attendance_id, meeting_id, apoderado_id, asistio, firma_digital_key');

    meetAttendanceSign?.forEach(att => {
      if (att.asistio && (!att.firma_digital_key || att.firma_digital_key.trim() === '')) {
        issues.push({
          ruleId: 'fn1FC',
          severity: 'WARNING',
          table: 'ede_parent_meeting_attendance',
          message: `Fallo fn1FC: El apoderado asistió a la reunión pero falta su firma digital / clave de verificación de identidad.`,
          affectedRecordId: att.attendance_id
        });
      }
    });

    // 5. fn2EA: Integridad del Perfil Estudiante y Datos de Nacimiento
    // Validar nombres e integridad básica de estudiantes matriculados.
    if (enrollments && enrollments.length > 0) {
      for (const en of enrollments) {
        const student = (en as any).ede_person;
        if (!student.primer_nombre || student.primer_nombre.trim() === '' || !student.apellido_paterno || student.apellido_paterno.trim() === '') {
          issues.push({
            ruleId: 'fn2EA',
            severity: 'ERROR',
            table: 'ede_person',
            message: `Fallo fn2EA: El estudiante no tiene sus nombres o apellidos completos en el registro civil escolar.`,
            affectedRecordId: student.person_id
          });
        }
      }
    }

    // 6. fn680: Coherencia de Leccionarios y Bloques Curriculares
    // Validar que todos los bloques de clases dictados tengan un bloque de horas mayor a cero.
    const { data: activitiesClass } = await supabase
      .from('ede_class_activity')
      .select('activity_id, nombre_asignatura, bloq_horas')
      .eq('rbd', rbd);

    activitiesClass?.forEach(act => {
      if (!act.bloq_horas || act.bloq_horas <= 0) {
        issues.push({
          ruleId: 'fn680',
          severity: 'ERROR',
          table: 'ede_class_activity',
          message: `Fallo fn680: Leccionario de '${act.nombre_asignatura}' registrado con bloque de horas inválido o en cero.`,
          affectedRecordId: act.activity_id
        });
      }
    });

    // 7. fn8F2: Libro de Vida y Coherencia de Incidentes
    // Validar que todos los incidentes de convivencia tengan una descripción y tipo válidos.
    const { data: disciplineInc } = await supabase
      .from('ede_discipline_incident')
      .select('incident_id, tipo_anotacion, descripcion')
      .eq('rbd', rbd);

    disciplineInc?.forEach(inc => {
      if (!inc.descripcion || inc.descripcion.trim() === '' || !inc.tipo_anotacion) {
        issues.push({
          ruleId: 'fn8F2',
          severity: 'ERROR',
          table: 'ede_discipline_incident',
          message: `Fallo fn8F2: Observación de convivencia en Libro de Vida sin detalle o tipo de anotación configurada.`,
          affectedRecordId: inc.incident_id
        });
      }
    });

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
