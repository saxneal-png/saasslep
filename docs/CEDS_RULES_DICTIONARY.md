# Diccionario Oficial de Reglas de Validación CEDS - MINEDUC (Circular N°1)

Este documento detalla la matriz oficial de reglas lógicas de consistencia (funciones de validación `fnXXX`) definidas por el Ministerio de Educación de Chile para el Libro Digital de Clases EDE, integradas en **saasslep**.

Mapea la sección reglamentaria, la condición oficial de verificación del MINEDUC y las tablas/columnas físicas del estándar **CEDS v7.1 + Extensiones Chile** involucradas.

---

## 📊 Resumen por Grupos de Reglas

| Prefijo de Regla | Tipo de Validación / Grupo CEDS | Descripción Principal |
|---|---|---|
| **fn0XX** | Estructura Organizacional y Jerarquías | Valida niveles, cursos, jornadas y roles de matrícula. |
| **fn1XX** | Incidentes, Salidas y Firmas | Valida registros de pases de salida, libros de vida y firmas OTP. |
| **fn2XX** | Identificación de Personas | Valida RUN, IPE, nombres y fechas de nacimiento del alumno y apoderado. |
| **fn3XX** | Planificación Curricular y Horarios | Valida leccionarios, bloques de clase y asignaturas. |
| **fn5XX** | Asistencia y Calendario | Valida pases de lista diario, alertas de deserción y calendarios. |
| **fn6XX** | Notas y Evaluaciones | Valida ingreso de calificaciones, semestres y promedios oficiales. |
| **fn8XX** | Comunidad y Reuniones | Valida actas y control de asistencia a reuniones de apoderados. |

---

## 📑 Catálogo de Funciones de Validación (`fn`)

### 🔍 fn0FA
- **Sección oficial:** `Registro de salidas`
- **Subsección:** *7.0 Registro de salidas o retiros*
- **Condición que verifica:** **"Cada estudiante tiene al menos una persona autorizada para retirarlo del establecimiento."**
- **Cantidad de campos CEDS validados:** `21` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId
  * `CEDS.OrganizationPersonRole`: OrganizationId, personId, RecordEndDateTime, RefOrganizationTypeId, RoleId
  * `CEDS.Person`: personId
  * `CEDS.PersonIdentifier`: Identifier, personId, RecordEndDateTime, RefPersonIdentificationSystemId
  * `CEDS.PersonRelationship`: RecordEndDateTime, RelatedPersonId, RetirarEstudianteIndicador
  * `CEDS.RefOrganizationType`: code, RefOrganizationTypeId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId
  * `CEDS.Role`: name, RoleId
  * `CEDS.jerarquiasList`: OrganizationIdDelCurso

### 🔍 fn0FB
- **Sección oficial:** `Registro de salidas`
- **Subsección:** *7.0 Registro de salidas o retiros*
- **Condición que verifica:** **"Cuando hay un retiro, está escaneado el documento o está registrado el verificador de identidad."**
- **Cantidad de campos CEDS validados:** `40` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RecordEndDateTime, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, OrganizationPersonRoleId, personId, RecordEndDateTime
  * `CEDS.OrganizationRelationship`: OrganizationId, Parent_OrganizationId
  * `CEDS.PersonRelationship`: personId, RecordEndDateTime, RelatedPersonId, RetirarEstudianteIndicador
  * `CEDS.RefAttendanceEventType`: Code, RefAttendanceEventTypeId
  * `CEDS.RefAttendanceStatus`: Code, RefAttendanceStatusId
  * `CEDS.RefOrganizationType`: code, RefOrganizationTypeId
  * `CEDS.RefRoleStatus`: code, RefRoleStatusId
  * `CEDS.Role`: name, RoleId
  * `CEDS.RoleAttendanceEvent`: Date, digitalRandomKey, digitalRandomKeyDate, fechaRatificador, fileScanBase64, firmaRatificador, observaciones, oprIdRatificador (+3 más)
  * `CEDS.RoleStatus`: OrganizationPersonRoleId, RecordEndDateTime, RefRoleStatusId, StatusEndDate
  * `CEDS.jerarquiasList`: nivel, OrganizationIdDelCurso

### 🔍 fn1FA
- **Sección oficial:** `Registro entrega de información`
- **Subsección:** *8.0 De la entrega de información*
- **Condición que verifica:** **"Los alumnos retirados tienen un incidente creado, fecha, registro de entrega de información, firma digital del profesor, documento o firma digital del apoderado."**
- **Cantidad de campos CEDS validados:** `15` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Incident`: IncidentId, RefIncidentBehaviorId
  * `CEDS.IncidentPerson`: digitalRandomKey, fileScanBase64, IncidentId, personId, RefIncidentPersonTypeId
  * `CEDS.OrganizationPersonRole`: ExitDate, OrganizationPersonRoleId, RoleId
  * `CEDS.PersonIdentifier`: Identifier, personId
  * `CEDS.PersonRelationship`: RelatedPersonId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId

### 🔍 fn1FB
- **Sección oficial:** `Registro entrega de información`
- **Subsección:** *8.0 De la entrega de información*
- **Condición que verifica:** **"Los documentos de interés general fueron entregados a un apoderado, tutor, padre o madre."**
- **Cantidad de campos CEDS validados:** `17` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId
  * `CEDS.Incident`: IncidentId, RefIncidentBehaviorId
  * `CEDS.IncidentPerson`: fileScanBase64, IncidentId, personId, RefIncidentPersonTypeId
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.PersonRelationship`: personId, RefPersonRelationshipId
  * `CEDS.RefIncidentBehavior`: Description, RefIncidentBehaviorId
  * `CEDS.RefIncidentPersonType`: Description, RefIncidentPersonTypeId
  * `CEDS.RefPersonRelationship`: RefPersonRelationshipId
  * `CEDS.Role`: RoleId

### 🔍 fn1FC
- **Sección oficial:** `Registro entrega de información`
- **Subsección:** *8.0 De la entrega de información*
- **Condición que verifica:** **"A los alumnos retirados se les ha entregado a sus apoderados los documentos para continuidad de estudios."**
- **Cantidad de campos CEDS validados:** `31` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId, fileScanBase64
  * `CEDS.Incident`: IncidentId, RefIncidentBehaviorId
  * `CEDS.IncidentPerson`: Date, digitalRandomKey, fileScanBase64, IncidentId, personId, RefIncidentPersonTypeId
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.Person`: personId
  * `CEDS.PersonIdentifier`: Identifier, RefPersonIdentificationSystemId
  * `CEDS.PersonRelationship`: personId, RefPersonRelationshipId, RelatedPersonId
  * `CEDS.PersonStatus`: personId
  * `CEDS.RefIncidentBehavior`: Description, RefIncidentBehaviorId
  * `CEDS.RefIncidentPersonType`: Description, RefIncidentPersonTypeId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId
  * `CEDS.RefPersonRelationship`: Code, RefPersonRelationshipId
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId
  * `CEDS.Role`: name, RoleId

### 🔍 fn28A
- **Sección oficial:** `Registro de matrícula`
- **Subsección:** *5.8 De los estudiantes migrantes*
- **Condición que verifica:** **"Los estudiantes migrantes tienen su IPE y documento de convalidación de estudios."**
- **Cantidad de campos CEDS validados:** `10` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId, fileScanBase64
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.Person`: personId
  * `CEDS.PersonIdentifier`: Identifier, personId, RefPersonIdentificationSystemId
  * `CEDS.PersonStatus`: fileScanBase64, RefPersonStatusTypeId

### 🔍 fn28B
- **Sección oficial:** `Registro de matrícula`
- **Subsección:** *5.8 De los estudiantes migrantes*
- **Condición que verifica:** **"Los estudiantes migrantes tienen su IPE y el documento de convalidación de estudios no es nulo."**
- **Cantidad de campos CEDS validados:** `10` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId, fileScanBase64
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.Person`: personId
  * `CEDS.PersonIdentifier`: Identifier, personId, RefPersonIdentificationSystemId
  * `CEDS.PersonStatus`: fileScanBase64, RefPersonStatusTypeId

### 🔍 fn29A
- **Sección oficial:** `Registro de matrícula`
- **Subsección:** *5.7 De los estudiantes en práctica*
- **Condición que verifica:** **"Los estudiantes en práctica han terminado al menos el primer semestre del tercer año."**
- **Cantidad de campos CEDS validados:** `12` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId
  * `CEDS.Person`: personId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId
  * `CEDS.RefOrganizationType`: code, RefOrganizationTypeId
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId
  * `CEDS.jerarquiasList`: grado, OrganizationIdDelCurso

### 🔍 fn29B
- **Sección oficial:** `Registro de matrícula`
- **Subsección:** *5.7 De los estudiantes en práctica*
- **Condición que verifica:** **"Si la práctica se realiza durante la jornada escolar o en vacaciones existe solo un registro de matricula para el estudiante."**
- **Cantidad de campos CEDS validados:** `10` campos
- **Campos Clave Comprometidos:**
  * `CEDS.K12StudentEnrollment`: OrganizationPersonRoleId
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, OrganizationPersonRoleId, personId, RoleId
  * `CEDS.Person`: personId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId

### 🔍 fn29C
- **Sección oficial:** `Registro de matrícula`
- **Subsección:** *5.7 De los estudiantes en práctica*
- **Condición que verifica:** **"Los estudiantes egresados de cuarto medio y que estén realizando su práctica tienen asignado un profesor tutor."**
- **Cantidad de campos CEDS validados:** `6` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, personId, RoleId
  * `CEDS.Person`: personId

### 🔍 fn2AA
- **Sección oficial:** `Registro de matrícula`
- **Subsección:** *5.6 De los estudiantes de intercambio*
- **Condición que verifica:** **"Existe cargada en el sistema la resolución que autoriza al estudiante de intercambio."**
- **Cantidad de campos CEDS validados:** `5` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Person`: personId, RefVisaTypeId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId, StatusValue

### 🔍 fn2BA
- **Sección oficial:** `Registro de matrícula`
- **Subsección:** *5.5 De los estudiantes excedentes*
- **Condición que verifica:** **"Existe cargada en el sistema la resolución que autoriza al estudiante excedente."**
- **Cantidad de campos CEDS validados:** `7` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId, fileScanBase64
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.Person`: personId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId

### 🔍 fn2CA
- **Sección oficial:** `Registro de matrícula`
- **Subsección:** *5.4 De las bajas en el registro de matrícula*
- **Condición que verifica:** **"Existe la fecha, motivo y declaración jurada del requirente o su verificador de identidad cargado en el sistema."**
- **Cantidad de campos CEDS validados:** `15` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId, fileScanBase64
  * `CEDS.OrganizationPersonRole`: personId, RecordEndDateTime, RoleId
  * `CEDS.Person`: personId, RecordEndDateTime
  * `CEDS.PersonStatus`: Description, fileScanBase64, personId, RecordEndDateTime, RefPersonStatusTypeId, StatusStartDate
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId

### 🔍 fn2CB
- **Sección oficial:** `Registro de matrícula`
- **Subsección:** *5.4 De las bajas en el registro de matrícula*
- **Condición que verifica:** **"Todos los estudiantes retirados definitivamente tienen documento e indicente relacionado a la entrega de estos."**
- **Cantidad de campos CEDS validados:** `27` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId, fileScanBase64
  * `CEDS.Incident`: IncidentId, RefIncidentBehaviorId
  * `CEDS.IncidentPerson`: Date, digitalRandomKey, fileScanBase64, IncidentId, RefIncidentPersonTypeId
  * `CEDS.OrganizationPersonRole`: RoleId
  * `CEDS.PersonIdentifier`: Identifier
  * `CEDS.PersonRelationship`: personId, RefPersonRelationshipId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId
  * `CEDS.RefIncidentBehavior`: Description, RefIncidentBehaviorId
  * `CEDS.RefIncidentPersonType`: Description, RefIncidentPersonTypeId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId
  * `CEDS.RefPersonRelationship`: Code, RefPersonRelationshipId
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId
  * `CEDS.Role`: name, RoleId

### 🔍 fn2DA
- **Sección oficial:** `Registro de matrícula`
- **Subsección:** *5.3 De las altas en el registro de matrícula.*
- **Condición que verifica:** **"Todos los alumnos nuevos con matricula definitiva poseen documento."**
- **Cantidad de campos CEDS validados:** `8` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId, fileScanBase64
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.Person`: personId
  * `CEDS.PersonStatus`: fileScanBase64, personId, RefPersonStatusTypeId

### 🔍 fn2DB
- **Sección oficial:** `Registro de matrícula`
- **Subsección:** *5.3 De las altas en el registro de matrícula.*
- **Condición que verifica:** **"Todos los estudiantes matriculados bajo el decreto 152 artículo 60 tienen su documento escaneado."**
- **Cantidad de campos CEDS validados:** `8` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId, fileScanBase64
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.Person`: personId
  * `CEDS.PersonStatus`: fileScanBase64, personId, RefPersonStatusTypeId

### 🔍 fn2EA
- **Sección oficial:** `Registro de matrícula`
- **Subsección:** *5.2 Contenido mínimo del registro de matrícula.*
- **Condición que verifica:** **"Los alumnos tienen todos sus datos obligatorios."**
- **Cantidad de campos CEDS validados:** `53` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId
  * `CEDS.OrganizationPersonRole`: EntryDate, ExitDate, personId, RoleId
  * `CEDS.Person`: FirstName, LastName, MiddleName, personId, RefSexId, RefTribalAffiliationId, SecondLastName
  * `CEDS.PersonAddress`: AddressCountyName, ApartmentRoomOrSuiteNumber, City, PersonId, PostalCode, RefCountyId, RefPersonalInformationVerificationId, StreetNumberAndName
  * `CEDS.PersonEmailAddress`: EmailAddress, PersonId, RefEmailTypeId
  * `CEDS.PersonIdentifier`: Identifier
  * `CEDS.PersonRelationship`: RelatedPersonId
  * `CEDS.PersonTelephone`: PersonId, PrimaryTelephoneNumberIndicator, RefPersonTelephoneNumberTypeId, TelephoneNumber
  * `CEDS.RefCountry`: Description, RefCountryId
  * `CEDS.RefCounty`: Description, RefCountyId
  * `CEDS.RefEmailType`: Description, RefEmailTypeId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId
  * `CEDS.RefPersonRelationship`: description, RefPersonRelationshipId
  * `CEDS.RefPersonTelephoneNumberType`: Description, RefPersonTelephoneNumberTypeId
  * `CEDS.RefPersonalInformationVerification`: Description, RefPersonalInformationVerificationId
  * `CEDS.RefSex`: Description, RefSexId
  * `CEDS.RefState`: Description, RefStateId
  * `CEDS.RefTribalAffiliation`: Description, RefTribalAffiliationId
  * `CEDS.Role`: name, RoleId

### 🔍 fn2FA
- **Sección oficial:** `Registro de matrícula`
- **Subsección:** *5.1 Estructura del registro de matrícula.*
- **Condición que verifica:** **"El total de alumnos matriculados menos las bajas, es igual a la suma de los estudiantes inscritos en los libros de clases."**
- **Cantidad de campos CEDS validados:** `7` campos
- **Campos Clave Comprometidos:**
  * `CEDS.K12StudentEnrollment`: FirstEntryDateIntoUSSchool, OrganizationPersonRoleId, RefEnrollmentStatusId
  * `CEDS.OrganizationPersonRole`: EntryDate, ExitDate, personId, RoleId

### 🔍 fn3C3
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Las Organizaciones tienen bien definida su localización."**
- **Cantidad de campos CEDS validados:** `28` campos
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSectionLocation`: OrganizationId
  * `CEDS.LocationAddress`: ApartmentRoomOrSuiteNumber, BuildingSiteNumber, City, LocationId, RefCountryId, RefCountyId, RefStateId, StreetNumberAndName
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationEmail`: OrganizationId, RefEmailTypeId
  * `CEDS.OrganizationLocation`: LocationId, OrganizationId, RefOrganizationLocationTypeId
  * `CEDS.OrganizationTelephone`: OrganizationId, RefInstitutionTelephoneTypeId
  * `CEDS.OrganizationWebsite`: OrganizationId
  * `CEDS.RefCountry`: Description, RefCountryId
  * `CEDS.RefEmailType`: RefEmailTypeId
  * `CEDS.RefInstitutionTelephoneType`: RefInstitutionTelephoneTypeId
  * `CEDS.RefOrganizationLocationType`: Description, RefOrganizationLocationTypeId
  * `CEDS.RefOrganizationType`: Description
  * `CEDS.RefState`: Description, RefStateId

### 🔍 fn3C4
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"El campo MaximumCapacity cumple con la siguiente expresión regular: '^[1-9]{1}\d{1,3}$' y todas las organizaciones de la tabla CourseSection son de tipo ASIGNATURA."**
- **Cantidad de campos CEDS validados:** `5` campos
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: EntryDate, ExitDate, OrganizationPersonRoleId
  * `CEDS.RoleAttendanceEvent`: Date, RoleAttendanceEventId

### 🔍 fn3C5
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Verificador de identidad (OTP) cumple la expresión regular."**
- **Cantidad de campos CEDS validados:** `2` campos
- **Campos Clave Comprometidos:**
  * `CEDS.RoleAttendanceEvent`: digitalRandomKey, fechaRatificador

### 🔍 fn3CA
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Existen campos relacionados a la asistencia."**
- **Cantidad de campos CEDS validados:** `13` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, OrganizationPersonRoleId
  * `CEDS.RefAttendanceEventType`: Description, RefAttendanceEventTypeId
  * `CEDS.RefAttendanceStatus`: Description, RefAttendanceStatusId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId
  * `CEDS.RoleAttendanceEvent`: RefAttendanceEventTypeId, RefAttendanceStatusId, RoleAttendanceEventId

### 🔍 fn3D0
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Cada asignatura se encuentra asociada a un curso."**
- **Cantidad de campos CEDS validados:** `6` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationRelationship`: OrganizationId, Parent_OrganizationId
  * `CEDS.RefOrganizationType`: RefOrganizationTypeId
  * `CEDS.RefPersonalInformationVerification`: Description

### 🔍 fn3D1
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Las asignaturas tienen una capacidad máxima."**
- **Cantidad de campos CEDS validados:** `5` campos
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSection`: MaximumCapacity, OrganizationId
  * `CEDS.Organization`: OrganizationId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId

### 🔍 fn3D2
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"El campo de Asistencia no se encuentra vacío."**
- **Cantidad de campos CEDS validados:** `2` campos
- **Campos Clave Comprometidos:**
  * `CEDS.RoleAttendanceEvent`: RoleAttendanceEventId, VirtualIndicator

### 🔍 fn3D3
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Los ClassMeetingDays corresponden a los días de la semana, y los ClassPeriod a los bloques."**
- **Cantidad de campos CEDS validados:** `2` campos
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSectionSchedule`: ClassMeetingDays, ClassPeriod

### 🔍 fn3D9
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Las asignaturas tienen sus sesiones de calendario (cuándo será la clase) y sus asistencias."**
- **Cantidad de campos CEDS validados:** `14` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId
  * `CEDS.OrganizationCalendar`: OrganizationId
  * `CEDS.OrganizationCalendarSession`: AttendanceTermIndicator, BeginDate, EndDate, OrganizationCalendarId, OrganizationCalendarSessionId, SessionStartTime
  * `CEDS.OrganizationPersonRole`: OrganizationId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId
  * `CEDS.RoleAttendanceEvent`: Date, OrganizationPersonRoleId, RoleAttendanceEventId

### 🔍 fn3DA
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Existe asistencia diaria y las tasas de asistencia estan bien calculadas."**
- **Cantidad de campos CEDS validados:** `16` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationPersonRoleId
  * `CEDS.OrganizationRelationship`: OrganizationId
  * `CEDS.RefAttendanceEventType`: Description, RefAttendanceEventTypeId
  * `CEDS.RefAttendanceStatus`: Description, RefAttendanceStatusId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId
  * `CEDS.Role`: name, RoleId
  * `CEDS.RoleAttendance`: AttendanceRate, OrganizationPersonRoleId, RoleAttendanceId
  * `CEDS.RoleAttendanceEvent`: OrganizationPersonRoleId, RefAttendanceEventTypeId

### 🔍 fn3DD
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"El establecimiento tiene su información mínima ingresada."**
- **Cantidad de campos CEDS validados:** `33` campos
- **Campos Clave Comprometidos:**
  * `CEDS.LocationAddress`: ApartmentRoomOrSuiteNumber, BuildingSiteNumber, City, Latitude, LocationId, Longitude, PostalCode, RefCountryId (+2 más)
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationEmail`: ElectronicMailAddress, OrganizationId
  * `CEDS.OrganizationLocation`: LocationId, OrganizationId
  * `CEDS.OrganizationTelephone`: OrganizationId, RefInstitutionTelephoneTypeId, TelephoneNumber
  * `CEDS.OrganizationWebsite`: OrganizationId, Website
  * `CEDS.RefCountry`: Description, RefCountryId
  * `CEDS.RefEmailType`: Description, RefEmailTypeId
  * `CEDS.RefInstitutionTelephoneType`: Description, RefInstitutionTelephoneTypeId
  * `CEDS.RefOrganizationLocationType`: Description, RefOrganizationLocationTypeId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId
  * `CEDS.RefState`: Description, RefStateId

### 🔍 fn3E0
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Hay docentes registrados (vista personList filtrada por docente)"**
- **Cantidad de campos CEDS validados:** `8` campos
- **Campos Clave Comprometidos:**
  * `CEDS.PersonList`: AwardDate, DegreeOrCertificateTitleOrSubject, DegreeOrCertificateTypeDescription, educationVerificationMethodDescription, higherEducationInstitutionAccreditationStatusDescription, NameOfInstitution, personId, Role

### 🔍 fn3E1
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Todos los docentes tienen su título y la institución de educación ingresados en el sistema."**
- **Cantidad de campos CEDS validados:** `17` campos
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: personId
  * `CEDS.PersonDegreeOrCertificate`: AwardDate, DegreeOrCertificateTitleOrSubject, idoneidadDocente, NameOfInstitution, personId, RefDegreeOrCertificateTypeId, RefEducationVerificationMethodId, RefHigherEducationInstitutionAccreditationStatusId
  * `CEDS.RefDegreeOrCertificateType`: Description, RefDegreeOrCertificateTypeId
  * `CEDS.RefEducationVerificationMethod`: Description, RefEducationVerificationMethodId
  * `CEDS.RefHigherEducationInstitutionAccreditationStatus`: Description, RefHigherEducationInstitutionAccreditationStatusId
  * `CEDS.Role`: name, RoleId

### 🔍 fn3E2
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Los establecimientos tienen su RBD (identificador)"**
- **Cantidad de campos CEDS validados:** `3` campos
- **Campos Clave Comprometidos:**
  * `CEDS.k12schoolList`: OrganizationId
  * `CEDS.organizationList`: Identifier, OrganizationId

### 🔍 fn3E3
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"El código identificador del establecimiento RBD es correcto de acuerdo al formato."**
- **Cantidad de campos CEDS validados:** `3` campos
- **Campos Clave Comprometidos:**
  * `CEDS.k12schoolList`: OrganizationId
  * `CEDS.organizationList`: Identifier, OrganizationId

### 🔍 fn3E4
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Los cursos tienen una organización, rbd, nivel, jornada, etc."**
- **Cantidad de campos CEDS validados:** `12` campos
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3E5
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"La modalidad de cada curso está dentro de la lista permitida."**
- **Cantidad de campos CEDS validados:** `12` campos
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3E6
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"La jornada está dentro de la lista permitida."**
- **Cantidad de campos CEDS validados:** `12` campos
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3E7
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"El nivel está dentro de la lista permitida."**
- **Cantidad de campos CEDS validados:** `12` campos
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3E8
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"La rama está dentro de la lista permitida."**
- **Cantidad de campos CEDS validados:** `12` campos
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3E9
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"El sector está dentro de la lista permitida."**
- **Cantidad de campos CEDS validados:** `12` campos
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3EA
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"La especialidad está dentro de la lista permitida."**
- **Cantidad de campos CEDS validados:** `12` campos
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3EB
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Los tipos de curso están dentro de la lista permitida."**
- **Cantidad de campos CEDS validados:** `12` campos
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3EC
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Los códigos de enseñanza están dentro de la lista permitida."**
- **Cantidad de campos CEDS validados:** `12` campos
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3ED
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"El grado está dentro de la lista permitida."**
- **Cantidad de campos CEDS validados:** `12` campos
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3EE
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"La letra del curso está dentro de la lista permitida."**
- **Cantidad de campos CEDS validados:** `12` campos
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3EF
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Los id del curso son equivalentes en las tablas course y organization."**
- **Cantidad de campos CEDS validados:** `2` campos
- **Campos Clave Comprometidos:**
  * `CEDS.cursoList`: OrganizationIdCurso
  * `CEDS.jerarquiasList`: OrganizationIdDelCurso

### 🔍 fn3F0
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"La conexión con la base de datos es exitosa"**
- **Cantidad de campos CEDS validados:** `1` campos
- **Campos Clave Comprometidos:**
  * `CEDS.PersonList`: personId

### 🔍 fn3F2
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Hay personas registradas en el sistema (vista personList)."**
- **Cantidad de campos CEDS validados:** `1` campos
- **Campos Clave Comprometidos:**
  * `CEDS.PersonList`: RUN

### 🔍 fn3F3
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Los RUT's ingresados son válidos de acuerdo al formato."**
- **Cantidad de campos CEDS validados:** `4` campos
- **Campos Clave Comprometidos:**
  * `CEDS.PersonIdentifier`: Identifier, RefPersonIdentificationSystemId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId

### 🔍 fn3F4
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Los IPE ingresados son válidos de acuerdo al formato."**
- **Cantidad de campos CEDS validados:** `4` campos
- **Campos Clave Comprometidos:**
  * `CEDS.PersonIdentifier`: Identifier, RefPersonIdentificationSystemId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId

### 🔍 fn3F5
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Los e-mails ingresados cumplen con el formato"**
- **Cantidad de campos CEDS validados:** `2` campos
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationEmail`: ElectronicMailAddress
  * `CEDS.PersonEmailAddress`: EmailAddress

### 🔍 fn3F6
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"La lista de teléfonos cumple con el formato."**
- **Cantidad de campos CEDS validados:** `2` campos
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationTelephone`: TelephoneNumber
  * `CEDS.PersonTelephone`: TelephoneNumber

### 🔍 fn3F7
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"El número de lista cumple con el formato"**
- **Cantidad de campos CEDS validados:** `4` campos
- **Campos Clave Comprometidos:**
  * `CEDS.PersonIdentifier`: Identifier, RefPersonIdentificationSystemId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId

### 🔍 fn3F8
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"El número de matrícula cumple con el formato"**
- **Cantidad de campos CEDS validados:** `4` campos
- **Campos Clave Comprometidos:**
  * `CEDS.PersonIdentifier`: Identifier, RefPersonIdentificationSystemId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId

### 🔍 fn3F9
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Las fechas ingresadas cumplen con el formato."**
- **Cantidad de campos CEDS validados:** `22` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Incident`: IncidentDate
  * `CEDS.IncidentPerson`: Date
  * `CEDS.K12StudentDiscipline`: DisciplinaryActionEndDate, DisciplinaryActionStartDate
  * `CEDS.OrganizationCalendarEvent`: rexDate
  * `CEDS.OrganizationCalendarSession`: BeginDate, EndDate, FirstInstructionDate, LastInstructionDate
  * `CEDS.OrganizationPersonRole`: EntryDate, ExitDate
  * `CEDS.Person`: Birthdate
  * `CEDS.PersonDegreeOrCertificate`: AwardDate
  * `CEDS.PersonStatus`: StatusEndDate, StatusStartDate
  * `CEDS.RoleAttendanceEvent`: Date, digitalRandomKeyDate
  * `CEDS.RoleStatus`: StatusEndDate, StatusStartDate
  * `CEDS.organizationCalendarCrisis`: CrisisEndDate, EndDate, StartDate

### 🔍 fn3FA
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"La lista de afiliaciones tribales se encuentra dentro de la lista permitida"**
- **Cantidad de campos CEDS validados:** `3` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Person`: RefTribalAffiliationId
  * `CEDS.RefTribalAffiliation`: Description, RefTribalAffiliationId

### 🔍 fn3FB
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"La cantidad de #Matricula == #lista == #FechasIncorporaciones"**
- **Cantidad de campos CEDS validados:** `9` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Person`: personId
  * `CEDS.PersonIdentifier`: personId, RefPersonIdentificationSystemId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId

### 🔍 fn3FC
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"La cantidad de emails corresponde con los tipos de emails ingresados"**
- **Cantidad de campos CEDS validados:** `4` campos
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationEmail`: ElectronicMailAddress, RefEmailTypeId
  * `CEDS.PersonEmailAddress`: EmailAddress, RefEmailTypeId

### 🔍 fn3FD
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"La cantidad de teléfonos corresponde con los tipos de teléfonos ingresados."**
- **Cantidad de campos CEDS validados:** `4` campos
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationTelephone`: RefInstitutionTelephoneTypeId, TelephoneNumber
  * `CEDS.PersonTelephone`: RefPersonTelephoneNumberTypeId, TelephoneNumber

### 🔍 fn3FE
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Los estudiantes tienen sus datos de nacimiento"**
- **Cantidad de campos CEDS validados:** `13` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Person`: personId
  * `CEDS.PersonBirthplace`: City, PersonId, RefCountryId, RefStateId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId
  * `CEDS.RefCountry`: Code, RefCountryId
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId
  * `CEDS.RefState`: Code, RefStateId

### 🔍 fn3FF
- **Sección oficial:** `Integridad de datos`
- **Subsección:** *nan*
- **Condición que verifica:** **"Todos los estudiantes tienen país, región y ciudad de nacimiento."**
- **Cantidad de campos CEDS validados:** `13` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Person`: personId
  * `CEDS.PersonBirthplace`: City, PersonId, RefCountryId, RefStateId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId
  * `CEDS.RefCountry`: Code, RefCountryId
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId
  * `CEDS.RefState`: Code, RefStateId

### 🔍 fn4FA
- **Sección oficial:** `Registro de antecedentes generales de los estudiantes por curso`
- **Subsección:** *6.2 Contenido mínimo, letra a*
- **Condición que verifica:** **"Los estudiantes tienen sus datos mínimos."**
- **Cantidad de campos CEDS validados:** `28` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: name, OrganizationId
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.OrganizationRelationship`: OrganizationId, Parent_OrganizationId
  * `CEDS.Person`: FirstName, LastName, MiddleName, personId, RefSexId, SecondLastName
  * `CEDS.PersonAddress`: PersonId, StreetNumberAndName
  * `CEDS.PersonIdentifier`: Identifier, personId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId
  * `CEDS.RefOrganizationType`: code, RefOrganizationTypeId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId
  * `CEDS.RefSex`: Description, RefSexId
  * `CEDS.Role`: name, RoleId

### 🔍 fn5D0
- **Sección oficial:** `Registro de control de asignatura`
- **Subsección:** *6.2 Contenido mínimo, letra b.3*
- **Condición que verifica:** **"No existen asistencias de Class/section duplicadas"**
- **Cantidad de campos CEDS validados:** `8` campos
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: OrganizationPersonRoleId, personId, RoleId
  * `CEDS.RoleAttendanceEvent`: Date, digitalRandomKey, OrganizationPersonRoleId, RoleAttendanceEventId, VirtualIndicator

### 🔍 fn5E0
- **Sección oficial:** `Registro de control de asignatura`
- **Subsección:** *6.2 Contenido mínimo, letra b.1*
- **Condición que verifica:** **"El registro de asistencia bloque a bloque es válido."**
- **Cantidad de campos CEDS validados:** `35` campos
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSectionLocation`: OrganizationId
  * `CEDS.CourseSectionSchedule`: ClassBeginningTime, ClassEndingTime, ClassMeetingDays, RecordEndDateTime
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationCalendar`: OrganizationId, RecordEndDateTime
  * `CEDS.OrganizationCalendarSession`: AttendanceTermIndicator, Description, OrganizationCalendarId, RecordEndDateTime
  * `CEDS.OrganizationPersonRole`: OrganizationId, OrganizationPersonRoleId, personId, RecordEndDateTime
  * `CEDS.PersonIdentifier`: Identifier, personId, RecordEndDateTime, RefPersonIdentificationSystemId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId
  * `CEDS.Role`: name, RoleId
  * `CEDS.RoleAttendanceEvent`: Date, digitalRandomKey, digitalRandomKeyDate, OrganizationPersonRoleId, RecordEndDateTime, RefAttendanceStatusId, RoleAttendanceEventId, VirtualIndicator

### 🔍 fn5E1
- **Sección oficial:** `Registro de control de asignatura`
- **Subsección:** *6.2 Contenido mínimo, letra b.2*
- **Condición que verifica:** **"Al final de la jornada existe el registro de alumnos matriculados en el curso y el total de la asistencia diaria.."**
- **Cantidad de campos CEDS validados:** `10` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Course`: OrganizationId
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, OrganizationPersonRoleId, personId, RoleId
  * `CEDS.RoleAttendance`: RoleAttendanceId
  * `CEDS.RoleAttendanceEvent`: Date, RoleAttendanceEventId

### 🔍 fn5E2
- **Sección oficial:** `Registro de control de asignatura`
- **Subsección:** *6.2 Contenido mínimo, letra b.2*
- **Condición que verifica:** **"Cuando falta docente, existe la observación con los datos de éste"**
- **Cantidad de campos CEDS validados:** `17` campos
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: OrganizationPersonRoleId, personId, RoleId
  * `CEDS.Person`: FirstName, LastName, MiddleName, personId, SecondLastName
  * `CEDS.PersonDegreeOrCertificate`: AwardDate, DegreeOrCertificateTitleOrSubject, NameOfInstitution, personId
  * `CEDS.PersonIdentifier`: Identifier, personId
  * `CEDS.RoleAttendanceEvent`: observaciones, OrganizationPersonRoleId, RefAttendanceStatusId

### 🔍 fn5E3
- **Sección oficial:** `Registro de control de asignatura`
- **Subsección:** *6.2 Contenido mínimo, letra b.2*
- **Condición que verifica:** **"La clase con reemplazante no idóneo no es contabilizada en el cumplimiento del plan de estudio."**
- **Cantidad de campos CEDS validados:** `20` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Classroom`: LocationId
  * `CEDS.CourseSection`: OrganizationId
  * `CEDS.CourseSectionLocation`: LocationId, OrganizationId
  * `CEDS.LocationAddress`: LocationId
  * `CEDS.Organization`: OrganizationId
  * `CEDS.OrganizationCalendar`: OrganizationId
  * `CEDS.OrganizationCalendarSession`: claseRecuperadaId, OrganizationCalendarId
  * `CEDS.OrganizationPersonRole`: OrganizationId, personId, RoleId
  * `CEDS.Person`: FirstName, LastName, MiddleName, personId
  * `CEDS.PersonDegreeOrCertificate`: idoneidadDocente, personId
  * `CEDS.RoleAttendanceEvent`: digitalRandomKey, OrganizationPersonRoleId

### 🔍 fn5E4
- **Sección oficial:** `Registro de control de asignatura`
- **Subsección:** *6.2 Contenido mínimo, letra b.2*
- **Condición que verifica:** **"La asistencia se encuentra tomada, es decir, cada estudiante tiene alguno de los siguientes estados: Presente, ausente o atrasado."**
- **Cantidad de campos CEDS validados:** `5` campos
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: OrganizationPersonRoleId, RoleId
  * `CEDS.RoleAttendanceEvent`: Date, OrganizationPersonRoleId, RefAttendanceStatusId

### 🔍 fn5E5
- **Sección oficial:** `Registro de control de asignatura`
- **Subsección:** *6.2 Contenido mínimo, letra b.2*
- **Condición que verifica:** **"La hora del registro de control de subvenciones corresponde con la segunda hora del registro de control de asignatura"**
- **Cantidad de campos CEDS validados:** `33` campos
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSectionSchedule`: ClassBeginningTime, ClassEndingTime, ClassMeetingDays, ClassPeriod, RecordEndDateTime
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationCalendar`: OrganizationId, RecordEndDateTime
  * `CEDS.OrganizationCalendarSession`: AttendanceTermIndicator, BeginDate, Description, OrganizationCalendarId, RecordEndDateTime, SessionStartTime
  * `CEDS.OrganizationPersonRole`: OrganizationId, RecordEndDateTime
  * `CEDS.OrganizationRelationship`: OrganizationId, Parent_OrganizationId, RefOrganizationRelationShipId
  * `CEDS.RefOrganizationRelationShip`: Code, RefOrganizationRelationShipId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId
  * `CEDS.Role`: name, RoleId
  * `CEDS.RoleAttendanceEvent`: Date, digitalRandomKey, digitalRandomKeyDate, OrganizationPersonRoleId, RecordEndDateTime, RefAttendanceStatusId, VirtualIndicator

### 🔍 fn5F0
- **Sección oficial:** `Registro de control de asignatura`
- **Subsección:** *6.2 Contenido mínimo, letra b.1*
- **Condición que verifica:** **"La información relacionada con el cumplimiento de los programas de estudio y asistencia de los estudiantes es válida."**
- **Cantidad de campos CEDS validados:** `8` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationCalendar`: OrganizationId
  * `CEDS.OrganizationCalendarSession`: FirstInstructionDate, LastInstructionDate, OrganizationCalendarId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId

### 🔍 fn680
- **Sección oficial:** `Registro control mensual de asistencia o control de subvenciones`
- **Subsección:** *6.2 Contenido mínimo, letra c.8*
- **Condición que verifica:** **"Los registros reportados semanalmente por la empresa se encuentran ingresados en el sistema"**
- **Cantidad de campos CEDS validados:** `48` campos
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSectionLocation`: OrganizationId
  * `CEDS.CourseSectionSchedule`: ClassBeginningTime, ClassEndingTime, ClassMeetingDays, RecordEndDateTime
  * `CEDS.Document`: documentId, fileScanBase64
  * `CEDS.Organization`: OrganizationId, RecordEndDateTime, RefOrganizationTypeId
  * `CEDS.OrganizationCalendar`: OrganizationCalendarId, OrganizationId, RecordEndDateTime
  * `CEDS.OrganizationCalendarSession`: AttendanceTermIndicator, Description, OrganizationCalendarId, RecordEndDateTime
  * `CEDS.OrganizationPersonRole`: OrganizationId, OrganizationPersonRoleId, personId, RecordEndDateTime, RoleId
  * `CEDS.Person`: personId
  * `CEDS.PersonIdentifier`: Identifier, personId, RecordEndDateTime, RefPersonIdentificationSystemId
  * `CEDS.PersonStatus`: personId, RecordEndDateTime, RefPersonStatusTypeId
  * `CEDS.RefAttendanceEventType`: Code, RefAttendanceEventTypeId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId
  * `CEDS.Role`: name, RoleId
  * `CEDS.RoleAttendanceEvent`: Date, digitalRandomKey, digitalRandomKeyDate, fileScanBase64, observaciones, RecordEndDateTime, RefAttendanceEventTypeId, VirtualIndicator

### 🔍 fn681
- **Sección oficial:** `Registro control mensual de asistencia o control de subvenciones`
- **Subsección:** *6.2 Contenido mínimo, letra c.8*
- **Condición que verifica:** **"Los estudiantes de formación dual se encuentran identificados en el sistema."**
- **Cantidad de campos CEDS validados:** `13` campos
- **Campos Clave Comprometidos:**
  * `CEDS.K12Course`: OrganizationId, RefWorkbasedLearningOpportunityTypeId
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, personId, RoleId
  * `CEDS.OrganizationRelationship`: OrganizationId, Parent_OrganizationId
  * `CEDS.PersonIdentifier`: Identifier, personId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId

### 🔍 fn682
- **Sección oficial:** `Registro control mensual de asistencia o control de subvenciones`
- **Subsección:** *6.2 Contenido mínimo, letra c.8*
- **Condición que verifica:** **"Los estudiantes de formación dual se encuentran identificados en el registro de control de asistencia y asignatura."**
- **Cantidad de campos CEDS validados:** `39` campos
- **Campos Clave Comprometidos:**
  * `CEDS.K12Course`: OrganizationId, RefWorkbasedLearningOpportunityTypeId
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationCalendarEvent`: EventDate
  * `CEDS.OrganizationCalendarSession`: BeginDate, EndDate, OrganizationCalendarSessionId
  * `CEDS.OrganizationPersonRole`: EntryDate, ExitDate, OrganizationId, OrganizationPersonRoleId, personId, RecordEndDateTime, RecordStartDateTime, RefOrganizationTypeId (+1 más)
  * `CEDS.OrganizationRelationship`: OrganizationId, Parent_OrganizationId
  * `CEDS.PersonIdentifier`: personId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId
  * `CEDS.RoleAttendanceEvent`: Date, digitalRandomKey, digitalRandomKeyDate, fechaRatificador, fileScanBase64, firmaRatificador, observaciones, oprIdRatificador (+7 más)
  * `CEDS.organizationCalendarCrisis`: EndDate, StartDate

### 🔍 fn6B0
- **Sección oficial:** `Registro control mensual de asistencia o control de subvenciones`
- **Subsección:** *6.2 Contenido mínimo, letra c.5*
- **Condición que verifica:** **"Todas las correcciones realizadas al registro de asistencia y asignatura se registren indicando su fecha, hora, verificador de identidad del funcionario que la realiza dicha acción y motivo del cambio.y estan visadas por el director del establecimiento o el funcionario que él haya designado."**
- **Cantidad de campos CEDS validados:** `23` campos
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: OrganizationPersonRoleId, personId, RoleId
  * `CEDS.PersonIdentifier`: Identifier, personId
  * `CEDS.RefAttendanceEventType`: Code, RefAttendanceEventTypeId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId
  * `CEDS.Role`: name, RoleId
  * `CEDS.RoleAttendanceEvent`: Date, digitalRandomKey, digitalRandomKeyDate, fechaRatificador, firmaRatificador, oprIdRatificador, OrganizationPersonRoleId, RecordEndDateTime (+3 más)
  * `CEDS.RoleStatus`: RecordEndDateTime

### 🔍 fn6C0
- **Sección oficial:** `Registro control mensual de asistencia o control de subvenciones`
- **Subsección:** *6.2 Contenido mínimo, letra c.4*
- **Condición que verifica:** **"Los estudiantes excedentes estan registrados en el control de asistencia solo para efectos pedagógicos"**
- **Cantidad de campos CEDS validados:** `12` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, OrganizationPersonRoleId, personId, RoleId
  * `CEDS.PersonList`: personId, RUN
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId
  * `CEDS.RoleAttendance`: OrganizationPersonRoleId
  * `CEDS.RoleAttendanceEvent`: Date

### 🔍 fn6C2
- **Sección oficial:** `Registro control mensual de asistencia o control de subvenciones`
- **Subsección:** *6.2 Contenido mínimo, letra c.4*
- **Condición que verifica:** **"Los alumnos excedentes (con derecho a pago) que sustituyan a otros estudiantes retirados del establecimiento cuentan con la autorización de la secretaría ministerial"**
- **Cantidad de campos CEDS validados:** `12` campos
- **Campos Clave Comprometidos:**
  * `CEDS.PersonIdentifier`: Identifier, personId, RefPersonIdentificationSystemId
  * `CEDS.PersonStatus`: docnumber, fileScanBase64, personId, RefPersonStatusTypeId, StatusStartDate
  * `CEDS.RefPersonIdentificationSystem`: description, RefPersonIdentificationSystemId
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId

### 🔍 fn6D0
- **Sección oficial:** `Registro control mensual de asistencia o control de subvenciones`
- **Subsección:** *6.2 Contenido mínimo, letra c.3*
- **Condición que verifica:** **"Las bajas y altas realizadas en el transcurso del periodo escolar son identificadas y establecida su fecha como insumo para otras verificaciones."**
- **Cantidad de campos CEDS validados:** `25` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: EntryDate, ExitDate, OrganizationId, OrganizationPersonRoleId, personId, RoleId
  * `CEDS.PersonIdentifier`: Identifier, personId, RecordEndDateTime, RefPersonIdentificationSystemId
  * `CEDS.PersonStatus`: RecordEndDateTime, RefPersonStatusTypeId, StatusEndDate, StatusStartDate
  * `CEDS.PersonTelephone`: PersonId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId
  * `CEDS.RefPersonIdentificationSystem`: description, RefPersonIdentificationSystemId
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId
  * `CEDS.Role`: name, RoleId

### 🔍 fn6D1
- **Sección oficial:** `Registro control mensual de asistencia o control de subvenciones`
- **Subsección:** *6.2 Contenido mínimo, letra c.3*
- **Condición que verifica:** **"No se declara la asistencia de un estudiante dado de baja."**
- **Cantidad de campos CEDS validados:** `17` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationCalendar`: OrganizationCalendarId, OrganizationId
  * `CEDS.OrganizationCalendarSession`: FirstInstructionDate, LastInstructionDate, OrganizationCalendarId
  * `CEDS.OrganizationPersonRole`: EntryDate, ExitDate, OrganizationPersonRoleId, personId
  * `CEDS.PersonList`: personId, RUN
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId
  * `CEDS.RoleAttendanceEvent`: Date, OrganizationPersonRoleId

### 🔍 fn6E0
- **Sección oficial:** `Registro control mensual de asistencia o control de subvenciones`
- **Subsección:** *6.2 Contenido mínimo, letra c.2*
- **Condición que verifica:** **"La hora del registro de control de asistencia corresponda con la segunda hora del registro de control de asignatura."**
- **Cantidad de campos CEDS validados:** `20` campos
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSectionLocation`: OrganizationId
  * `CEDS.CourseSectionSchedule`: ClassBeginningTime, ClassMeetingDays, ClassPeriod
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: EntryDate, ExitDate, OrganizationId, OrganizationPersonRoleId, personId, RecordEndDateTime, RecordStartDateTime, RoleId
  * `CEDS.PersonIdentifier`: Identifier, personId
  * `CEDS.RoleAttendanceEvent`: Date, fileScanBase64, observaciones, OrganizationPersonRoleId

### 🔍 fn6E1
- **Sección oficial:** `Registro control mensual de asistencia o control de subvenciones`
- **Subsección:** *6.2 Contenido mínimo, letra c.2*
- **Condición que verifica:** **"Existe el justificativo de aquellos estudiantes que ingresaron con posterioridad a la 2da hora de clases."**
- **Cantidad de campos CEDS validados:** `21` campos
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSectionSchedule`: ClassBeginningTime, ClassEndingTime, ClassMeetingDays, ClassPeriod, OrganizationId, RecordEndDateTime
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: EntryDate, ExitDate, OrganizationId, OrganizationPersonRoleId, personId, RecordEndDateTime, RoleId
  * `CEDS.PersonIdentifier`: Identifier, personId
  * `CEDS.RoleAttendanceEvent`: Date, fileScanBase64, observaciones, OrganizationPersonRoleId

### 🔍 fn6E2
- **Sección oficial:** `Registro control mensual de asistencia o control de subvenciones`
- **Subsección:** *6.2 Contenido mínimo, letra c.2*
- **Condición que verifica:** **"La información es consistente en aquellos casos en los cuales se ha informado a la comunidad escolar la suspensión de clases."**
- **Cantidad de campos CEDS validados:** `9` campos
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationCalendarEvent`: EventDate
  * `CEDS.OrganizationPersonRole`: OrganizationPersonRoleId, personId
  * `CEDS.PersonList`: RUN
  * `CEDS.PersonRelationship`: personId
  * `CEDS.RoleAttendanceEvent`: Date, OrganizationPersonRoleId
  * `CEDS.organizationCalendarCrisis`: EndDate, StartDate

### 🔍 fn6E3
- **Sección oficial:** `Registro control mensual de asistencia o control de subvenciones`
- **Subsección:** *6.2 Contenido mínimo, letra c.2*
- **Condición que verifica:** **"En los casos de suspensión de clases, existe ingresado en el sistema la aprobación del calendario de recuperación de la secretaría ministerial."**
- **Cantidad de campos CEDS validados:** `8` campos
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationCalendarEvent`: fileScanBase64, indicadorSinClases, rexDate, rexNumber
  * `CEDS.OrganizationCalendarSession`: claseRecuperadaId, fechaREX, fileScanBase64, numeroREX

### 🔍 fn6E4
- **Sección oficial:** `Registro control mensual de asistencia o control de subvenciones`
- **Subsección:** *6.2 Contenido mínimo, letra c.2*
- **Condición que verifica:** **"Se encuentran bien registrados los cambios de actividades al calendario escolar."**
- **Cantidad de campos CEDS validados:** `23` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId
  * `CEDS.OrganizationCalendar`: OrganizationCalendarId, OrganizationId
  * `CEDS.OrganizationCalendarEvent`: EventDate, OrganizationCalendarId, RefCalendarEventType
  * `CEDS.OrganizationCalendarSession`: AttendanceTermIndicator, BeginDate, EndDate, RecordEndDateTime, SessionEndTime, SessionStartTime
  * `CEDS.RefCalendarEventType`: Code, RefCalendarEventTypeId
  * `CEDS.RefOrganizationType`: code, RefOrganizationTypeId
  * `CEDS.RoleAttendanceEvent`: Date, digitalRandomKeyDate, OrganizationPersonRoleId, RecordEndDateTime
  * `CEDS.organizationCalendarCrisis`: EndDate, OrganizationId, StartDate

### 🔍 fn6F0
- **Sección oficial:** `Registro control mensual de asistencia o control de subvenciones`
- **Subsección:** *6.2 Contenido mínimo, letra c*
- **Condición que verifica:** **"Existe el registro de asistencia en aquellos casos en los cuales se realizó la clase al estudiante."**
- **Cantidad de campos CEDS validados:** `36` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: name, OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationCalendar`: OrganizationCalendarId, OrganizationId, RecordEndDateTime
  * `CEDS.OrganizationCalendarEvent`: EventDate, OrganizationCalendarId, RefCalendarEventType
  * `CEDS.OrganizationCalendarSession`: FirstInstructionDate, LastInstructionDate, OrganizationCalendarId
  * `CEDS.OrganizationPersonRole`: OrganizationId, OrganizationPersonRoleId, RecordEndDateTime
  * `CEDS.PersonIdentifier`: Identifier, personId, RecordEndDateTime, RefPersonIdentificationSystemId
  * `CEDS.RefCalendarEventType`: Code, RefCalendarEventTypeId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId
  * `CEDS.Role`: name, RoleId
  * `CEDS.RoleAttendanceEvent`: Date, digitalRandomKey, digitalRandomKeyDate, OrganizationPersonRoleId, RecordEndDateTime, RefAttendanceStatusId, RoleAttendanceEventId
  * `CEDS.organizationCalendarCrisis`: OrganizationId, StartDate

### 🔍 fn6F1
- **Sección oficial:** `Registro control mensual de asistencia o control de subvenciones`
- **Subsección:** *6.2 Contenido mínimo, letra c*
- **Condición que verifica:** **"El registro contiene la información mínima"**
- **Cantidad de campos CEDS validados:** `11` campos
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: OrganizationPersonRoleId, personId, RoleId
  * `CEDS.PersonIdentifier`: Identifier, personId, RefPersonIdentificationSystemId
  * `CEDS.RefPersonIdentificationSystem`: description, RefPersonIdentificationSystemId
  * `CEDS.RoleAttendanceEvent`: Date, OrganizationPersonRoleId, VirtualIndicator

### 🔍 fn7F0
- **Sección oficial:** `Registro de evaluaciones y sectores educativos`
- **Subsección:** *6.2 Contenido mínimo, letra d*
- **Condición que verifica:** **"Las evaluaciones de los estudiantes estan todas clasificadas en formativas o sumativas."**
- **Cantidad de campos CEDS validados:** `15` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Assessment`: AssessmentId, RefAssessmentTypeId
  * `CEDS.AssessmentAdministration`: AssessmentAdministrationId, AssessmentId
  * `CEDS.AssessmentRegistration`: AssessmentAdministrationId, AssessmentRegistrationId
  * `CEDS.AssessmentResult`: AssessmentRegistrationId
  * `CEDS.AssessmentSession`: AssessmentAdministrationId, AssessmentSessionId
  * `CEDS.AssessmentSessionStaffRole`: AssessmentSessionId, AssessmentSessionStaffRoleId, PersonId, RefAssessmentSessionStaffRoleTypeId
  * `CEDS.OrganizationPersonRole`: personId, RoleId

### 🔍 fn7F1
- **Sección oficial:** `Registro de evaluaciones y sectores educativos`
- **Subsección:** *6.2 Contenido mínimo, letra d*
- **Condición que verifica:** **"Las calificaciones de las evaluaciones sumativas son representadas en una escala de 1 a 7 hasta con un decimal."**
- **Cantidad de campos CEDS validados:** `24` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Assessment`: AssessmentId, RefAssessmentTypeId
  * `CEDS.AssessmentAdministration`: AssessmentAdministrationId, AssessmentId
  * `CEDS.AssessmentRegistration`: AssessmentAdministrationId, AssessmentRegistrationId
  * `CEDS.AssessmentResult`: AssessmentRegistrationId, RefScoreMetricTypeId, ScoreValue
  * `CEDS.AssessmentSession`: AssessmentAdministrationId, AssessmentSessionId
  * `CEDS.AssessmentSessionStaffRole`: AssessmentSessionId, AssessmentSessionStaffRoleId, PersonId, RefAssessmentSessionStaffRoleTypeId
  * `CEDS.Organization`: name, OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, RoleId
  * `CEDS.OrganizationRelationship`: OrganizationId, Parent_OrganizationId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId

### 🔍 fn7F2
- **Sección oficial:** `Registro de evaluaciones y sectores educativos`
- **Subsección:** *6.2 Contenido mínimo, letra d*
- **Condición que verifica:** **"La calificación final mínima de aprobación del estudiante es un 4.0."**
- **Cantidad de campos CEDS validados:** `13` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: name, OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, personId, RoleId
  * `CEDS.OrganizationRelationship`: OrganizationId, Parent_OrganizationId
  * `CEDS.Person`: personId
  * `CEDS.PersonStatus`: RefPersonStatusTypeId
  * `CEDS.PersonTelephone`: PersonId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId

### 🔍 fn7F3
- **Sección oficial:** `Registro de evaluaciones y sectores educativos`
- **Subsección:** *6.2 Contenido mínimo, letra d*
- **Condición que verifica:** **"verificar que se encuentre cargado en el sistema la cantidad de calificaciones y ponderaciones que se utilizan para calcular la calificación final de los estudiantes en cada asignatura o módulo de cada curso."**
- **Cantidad de campos CEDS validados:** `12` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Assessment`: AssessmentId, RefAssessmentTypeId
  * `CEDS.AssessmentAdministration`: AssessmentAdministrationId, AssessmentId
  * `CEDS.AssessmentRegistration`: AssessmentAdministrationId, AssessmentRegistrationId
  * `CEDS.AssessmentResult`: AssessmentRegistrationId, RefScoreMetricTypeId, ScoreValue
  * `CEDS.LearnerActivity`: LearnerActivityId, PersonId, Weight

### 🔍 fn7F4
- **Sección oficial:** `Registro de evaluaciones y sectores educativos`
- **Subsección:** *6.2 Contenido mínimo, letra d*
- **Condición que verifica:** **"Los cambios realizados a las escalas o ponderaciones tienen el verificador de identidad del docente y del jefe técnico-pedagógico."**
- **Cantidad de campos CEDS validados:** `7` campos
- **Campos Clave Comprometidos:**
  * `CEDS.LearnerActivity`: DateDigitalRandomKey, digitalRandomKey, LearnerActivityId, personIDDigitalRandomKey
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.Person`: personId

### 🔍 fn7F5
- **Sección oficial:** `Registro de evaluaciones y sectores educativos`
- **Subsección:** *6.2 Contenido mínimo, letra d*
- **Condición que verifica:** **"Existe un registro de los objetivos y contenidos de materias o actividades que son entregados por el docente en cada sector educativo, asignatura o módulo."**
- **Cantidad de campos CEDS validados:** `6` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Assessment`: AssessmentId
  * `CEDS.AssessmentAdministration`: AssessmentAdministrationId, AssessmentId
  * `CEDS.AssessmentRegistration`: AssessmentRegistrationId
  * `CEDS.LearnerActivity`: AssessmentRegistrationId, LearnerActivityId

### 🔍 fn8F0
- **Sección oficial:** `Registro de anotaciones de convivencia escolar por estudiante`
- **Subsección:** *6.2 Contenido mínimo, letra e*
- **Condición que verifica:** **"Existe registro de la siguiente información
- Anotaciones negativas de su comportamiento
- Citaciones a los apoderados sobre temas relativos a sus pupilos.
- Medidas disciplinarias que sean aplicadas al estudiante.
- Reconocimientos por destacado cumplimiento del reglamento interno (positivas)."**
- **Cantidad de campos CEDS validados:** `27` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Incident`: IncidentDate, IncidentDescription, IncidentId, RefIncidentBehaviorId, RefIncidentTimeDescriptionCodeId, RegulationViolatedDescription
  * `CEDS.IncidentPerson`: Date, IncidentId, personId, RefIncidentPersonTypeId
  * `CEDS.K12StudentAcademicHonor`: OrganizationPersonRoleId
  * `CEDS.K12StudentDiscipline`: IncidentId, organizationPersonRoleId, RefDisciplinaryActionTakenId
  * `CEDS.OrganizationPersonRole`: EntryDate, ExitDate, OrganizationId, OrganizationPersonRoleId, personId, RecordEndDateTime, RecordStartDateTime, RefOrganizationTypeId (+1 más)
  * `CEDS.RefDisciplinaryActionTaken`: RefDisciplinaryActionTakenId
  * `CEDS.RefIncidentBehavior`: Description
  * `CEDS.Role`: name, RoleId

### 🔍 fn8F1
- **Sección oficial:** `Registro de anotaciones de convivencia escolar por estudiante`
- **Subsección:** *6.2 Contenido mínimo, letra e*
- **Condición que verifica:** **"La aplicación y seguimiento de medidas disciplinarias relacionadas con el reglamento interno es correcto."**
- **Cantidad de campos CEDS validados:** `3` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Incident`: IncidentId, RefIncidentBehaviorId
  * `CEDS.RefIncidentBehavior`: Description

### 🔍 fn8F2
- **Sección oficial:** `Registro de anotaciones de convivencia escolar por estudiante`
- **Subsección:** *6.2 Contenido mínimo, letra e*
- **Condición que verifica:** **"El contenido de cada registro de convivencia es correcto"**
- **Cantidad de campos CEDS validados:** `70` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Incident`: incidentCost, IncidentDate, IncidentId, incidentReporterId, incidentTime, organizationId, organizationPersonRoleId, RefFirearmTypeId (+11 más)
  * `CEDS.IncidentPerson`: Date, digitalRandomKey, fileScanBase64, IncidentId, personId, RecordEndDateTime, RefIncidentPersonRoleTypeId, RefIncidentPersonTypeId
  * `CEDS.K12StudentDiscipline`: DisciplinaryActionEndDate, DisciplinaryActionStartDate, durationOfDisciplinaryAction, educationalServicesAfterRemoval, fullYearExpulsion, iEPPlacementMeetingIndicator, IncidentId, k12StudentDisciplineId (+13 más)
  * `CEDS.RefFirearmType`: Description, RefFirearmTypeId
  * `CEDS.RefIncidentBehavior`: Description, RefIncidentBehaviorId
  * `CEDS.RefIncidentInjuryType`: Description, RefIncidentInjuryTypeId
  * `CEDS.RefIncidentLocation`: Description, RefIncidentLocationId
  * `CEDS.RefIncidentMultipleOffenseType`: Description, RefIncidentMultipleOffenseTypeId
  * `CEDS.RefIncidentPerpetratorInjuryType`: Description, RefIncidentPerpetratorInjuryTypeId
  * `CEDS.RefIncidentPersonRoleType`: Description, RefIncidentPersonRoleTypeId
  * `CEDS.RefIncidentPersonType`: Description, RefIncidentPersonTypeId
  * `CEDS.RefIncidentReporterType`: Description, RefIncidentReporterTypeId
  * `CEDS.RefIncidentTimeDescriptionCode`: Description, RefIncidentTimeDescriptionCodeId
  * `CEDS.RefWeaponType`: Description, RefWeaponTypeId

### 🔍 fn8F3
- **Sección oficial:** `Registro de anotaciones de convivencia escolar por estudiante`
- **Subsección:** *6.2 Contenido mínimo, letra e*
- **Condición que verifica:** **"Las entrevistas con el apoderado y su contenido se encuentran ingresados en el sistema."**
- **Cantidad de campos CEDS validados:** `18` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId
  * `CEDS.Incident`: IncidentId, RefIncidentBehaviorId
  * `CEDS.IncidentPerson`: fileScanBase64, IncidentId, personId, RefIncidentPersonTypeId
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.PersonRelationship`: personId
  * `CEDS.RefIncidentBehavior`: Description, RefIncidentBehaviorId
  * `CEDS.RefIncidentPersonType`: Description, RefIncidentPersonTypeId
  * `CEDS.RefPersonRelationship`: Code, RefPersonRelationshipId
  * `CEDS.Role`: name, RoleId

### 🔍 fn9F0
- **Sección oficial:** `Registro de atención de profesionales y de recursos relacionados con la formación del estudiante`
- **Subsección:** *6.2 Contenido mínimo, letra f*
- **Condición que verifica:** **"La información del equipo de docentes y profesionales relacionados con la formación del estudiante se encuentran registrados en el sistema."**
- **Cantidad de campos CEDS validados:** `5` campos
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: OrganizationId, personId, RoleId
  * `CEDS.PersonDegreeOrCertificate`: personId
  * `CEDS.PersonList`: personId

### 🔍 fn9F1
- **Sección oficial:** `Registro de atención de profesionales y de recursos relacionados con la formación del estudiante`
- **Subsección:** *6.2 Contenido mínimo, letra f*
- **Condición que verifica:** **"La planificación del proceso formativo del estudiante se encuentra registrada en el sistema."**
- **Cantidad de campos CEDS validados:** `21` campos
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSection`: CourseId, MaximumCapacity, OrganizationId, RefInstructionLanguageId, VirtualIndicator
  * `CEDS.CourseSectionSchedule`: ClassBeginningTime, ClassEndingTime, ClassMeetingDays, ClassPeriod, OrganizationId, RecordEndDateTime
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationCalendar`: OrganizationCalendarId, OrganizationId
  * `CEDS.OrganizationCalendarSession`: OrganizationCalendarId, OrganizationCalendarSessionId
  * `CEDS.OrganizationRelationship`: OrganizationId, Parent_OrganizationId
  * `CEDS.RefOrganizationType`: code, RefOrganizationTypeId

### 🔍 fn9F2
- **Sección oficial:** `Registro de atención de profesionales y de recursos relacionados con la formación del estudiante`
- **Subsección:** *6.2 Contenido mínimo, letra f*
- **Condición que verifica:** **"El registro de la implementación y evaluación del proceso formativo del estudiante se encuentra en el sistema."**
- **Cantidad de campos CEDS validados:** `13` campos
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSection`: CourseId
  * `CEDS.Organization`: name, OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationCalendar`: CalendarCode, CalendarDescription, CalendarYear, OrganizationCalendarId, OrganizationId
  * `CEDS.OrganizationPersonRole`: OrganizationId, personId, RoleId
  * `CEDS.Person`: personId

### 🔍 fn9F3
- **Sección oficial:** `Registro de atención de profesionales y de recursos relacionados con la formación del estudiante`
- **Subsección:** *6.2 Contenido mínimo, letra f*
- **Condición que verifica:** **"El registro de actividades con la familia y la comunidad se encuentra en el sistema."**
- **Cantidad de campos CEDS validados:** `10` campos
- **Campos Clave Comprometidos:**
  * `CEDS.Incident`: IncidentId, RefIncidentBehaviorId
  * `CEDS.IncidentPerson`: IncidentId, RefIncidentPersonTypeId
  * `CEDS.RefIncidentBehavior`: Description, RefIncidentBehaviorId
  * `CEDS.RefIncidentPersonRoleType`: Description, RefIncidentPersonRoleTypeId
  * `CEDS.RefIncidentPersonType`: Description, RefIncidentPersonTypeId

