# Reglas de Verificación EDE MINEDUC (Libro de Clases Digital)

Este archivo define las directrices y reglas lógicas de verificación (FV) establecidas por el MINEDUC para auditar bases de datos del Libro de Clases Digital.

---

## 1. Mapeo de Tablas EDE/CEDS Requeridas

Toda base de datos del Libro de Clases Digital debe contar con las siguientes entidades estructurales bajo el esquema CEDS:
*   `ede_person`: Registro base de personas (alumnos, apoderados, docentes).
*   `ede_person_identifier`: Identificadores únicos (RUN, IPE, N° Matrícula).
*   `ede_course_section`: Cursos y asignaturas en ejecución.
*   `ede_enrollment`: Matrícula del alumno en un año escolar y curso.
*   `ede_attendance_event`: Pase de lista diario o mensual de asistencia.
*   `ede_assessment_result`: Calificaciones y evaluaciones.

---

## 2. Reglas de Validación de Negocio (FV)

### A. Módulo de Matrícula y Alumnos

#### FV-MAT-001: Identificador Obligatorio de Estudiantes
*   **Descripción**: Todo estudiante con matrícula activa en el año escolar debe poseer al menos un identificador registrado de tipo **RUN (51)** o **IPE (52)**.
*   **Gravedad**: `ERROR` (Crítico).
*   **Lógica**:
    ```sql
    SELECT p.person_id 
    FROM ede_person p
    JOIN ede_enrollment e ON e.alumno_id = p.person_id
    LEFT JOIN ede_person_identifier i ON i.person_id = p.person_id AND i.system_id IN (51, 52)
    WHERE i.identificador IS NULL;
    ```

#### FV-MAT-002: Matrículas Duplicadas
*   **Descripción**: Un estudiante no puede estar registrado activamente en más de un curso en el mismo establecimiento durante el mismo año escolar.
*   **Gravedad**: `ERROR` (Crítico).
*   **Lógica**:
    ```sql
    SELECT alumno_id 
    FROM ede_enrollment
    WHERE estado_id IN (27, 29) -- Activos (Definitivos / Provisorios)
    GROUP BY alumno_id, anio_escolar, rbd
    HAVING COUNT(section_id) > 1;
    ```

---

### B. Módulo de Asistencia y Calendario

#### FV-ASI-004: Asistencia Post-Retiro
*   **Descripción**: No se pueden registrar eventos de asistencia para un estudiante en fechas posteriores a su fecha de retiro formal.
*   **Gravedad**: `ERROR` (Crítico).
*   **Lógica**:
    ```sql
    SELECT ae.event_id 
    FROM ede_attendance_event ae
    JOIN ede_enrollment e ON e.enrollment_id = ae.enrollment_id
    WHERE e.fecha_retiro IS NOT NULL 
      AND ae.fecha > e.fecha_retiro;
    ```

---

### C. Módulo de Apoderados

#### FV-APO-001: Vínculo de Apoderado
*   **Descripción**: Todo estudiante matriculado activamente en un curso debe contar con la información del apoderado principal registrado en el sistema.
*   **Gravedad**: `WARNING` (Advertencia).
*   **Lógica**:
    ```sql
    SELECT e.alumno_id 
    FROM ede_enrollment e
    LEFT JOIN ede_person_relationship r ON r.alumno_id = e.alumno_id
    WHERE r.alumno_id IS NULL;
    ```
