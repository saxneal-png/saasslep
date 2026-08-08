# Diccionario Oficial de Reglas de Validación CEDS - MINEDUC (circular N°1)

Este documento detalla la matriz oficial de reglas lógicas de consistencia (funciones de validación `fnXXX`) definidas por el Ministerio de Educación de Chile sobre el estándar **CEDS v7.1 + Extensiones Chile** e integradas en **saasslep**.

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
- **Cantidad de campos validados:** `21` campos CEDS
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
- **Cantidad de campos validados:** `40` campos CEDS
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
- **Cantidad de campos validados:** `15` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Incident`: IncidentId, RefIncidentBehaviorId
  * `CEDS.IncidentPerson`: digitalRandomKey, fileScanBase64, IncidentId, personId, RefIncidentPersonTypeId
  * `CEDS.OrganizationPersonRole`: ExitDate, OrganizationPersonRoleId, RoleId
  * `CEDS.PersonIdentifier`: Identifier, personId
  * `CEDS.PersonRelationship`: RelatedPersonId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId

### 🔍 fn1FB
- **Cantidad de campos validados:** `17` campos CEDS
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
- **Cantidad de campos validados:** `31` campos CEDS
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
- **Cantidad de campos validados:** `10` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId, fileScanBase64
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.Person`: personId
  * `CEDS.PersonIdentifier`: Identifier, personId, RefPersonIdentificationSystemId
  * `CEDS.PersonStatus`: fileScanBase64, RefPersonStatusTypeId

### 🔍 fn28B
- **Cantidad de campos validados:** `10` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId, fileScanBase64
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.Person`: personId
  * `CEDS.PersonIdentifier`: Identifier, personId, RefPersonIdentificationSystemId
  * `CEDS.PersonStatus`: fileScanBase64, RefPersonStatusTypeId

### 🔍 fn29A
- **Cantidad de campos validados:** `12` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId
  * `CEDS.Person`: personId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId
  * `CEDS.RefOrganizationType`: code, RefOrganizationTypeId
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId
  * `CEDS.jerarquiasList`: grado, OrganizationIdDelCurso

### 🔍 fn29B
- **Cantidad de campos validados:** `10` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.K12StudentEnrollment`: OrganizationPersonRoleId
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, OrganizationPersonRoleId, personId, RoleId
  * `CEDS.Person`: personId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId

### 🔍 fn29C
- **Cantidad de campos validados:** `6` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, personId, RoleId
  * `CEDS.Person`: personId

### 🔍 fn2AA
- **Cantidad de campos validados:** `5` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Person`: personId, RefVisaTypeId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId, StatusValue

### 🔍 fn2BA
- **Cantidad de campos validados:** `7` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId, fileScanBase64
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.Person`: personId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId

### 🔍 fn2CA
- **Cantidad de campos validados:** `15` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId, fileScanBase64
  * `CEDS.OrganizationPersonRole`: personId, RecordEndDateTime, RoleId
  * `CEDS.Person`: personId, RecordEndDateTime
  * `CEDS.PersonStatus`: Description, fileScanBase64, personId, RecordEndDateTime, RefPersonStatusTypeId, StatusStartDate
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId

### 🔍 fn2CB
- **Cantidad de campos validados:** `27` campos CEDS
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
- **Cantidad de campos validados:** `8` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId, fileScanBase64
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.Person`: personId
  * `CEDS.PersonStatus`: fileScanBase64, personId, RefPersonStatusTypeId

### 🔍 fn2DB
- **Cantidad de campos validados:** `8` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Document`: documentId, fileScanBase64
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.Person`: personId
  * `CEDS.PersonStatus`: fileScanBase64, personId, RefPersonStatusTypeId

### 🔍 fn2EA
- **Cantidad de campos validados:** `53` campos CEDS
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
- **Cantidad de campos validados:** `7` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.K12StudentEnrollment`: FirstEntryDateIntoUSSchool, OrganizationPersonRoleId, RefEnrollmentStatusId
  * `CEDS.OrganizationPersonRole`: EntryDate, ExitDate, personId, RoleId

### 🔍 fn3C3
- **Cantidad de campos validados:** `28` campos CEDS
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
- **Cantidad de campos validados:** `5` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: EntryDate, ExitDate, OrganizationPersonRoleId
  * `CEDS.RoleAttendanceEvent`: Date, RoleAttendanceEventId

### 🔍 fn3C5
- **Cantidad de campos validados:** `2` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.RoleAttendanceEvent`: digitalRandomKey, fechaRatificador

### 🔍 fn3CA
- **Cantidad de campos validados:** `13` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, OrganizationPersonRoleId
  * `CEDS.RefAttendanceEventType`: Description, RefAttendanceEventTypeId
  * `CEDS.RefAttendanceStatus`: Description, RefAttendanceStatusId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId
  * `CEDS.RoleAttendanceEvent`: RefAttendanceEventTypeId, RefAttendanceStatusId, RoleAttendanceEventId

### 🔍 fn3D0
- **Cantidad de campos validados:** `6` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationRelationship`: OrganizationId, Parent_OrganizationId
  * `CEDS.RefOrganizationType`: RefOrganizationTypeId
  * `CEDS.RefPersonalInformationVerification`: Description

### 🔍 fn3D1
- **Cantidad de campos validados:** `5` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSection`: MaximumCapacity, OrganizationId
  * `CEDS.Organization`: OrganizationId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId

### 🔍 fn3D2
- **Cantidad de campos validados:** `2` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.RoleAttendanceEvent`: RoleAttendanceEventId, VirtualIndicator

### 🔍 fn3D3
- **Cantidad de campos validados:** `2` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSectionSchedule`: ClassMeetingDays, ClassPeriod

### 🔍 fn3D9
- **Cantidad de campos validados:** `14` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId
  * `CEDS.OrganizationCalendar`: OrganizationId
  * `CEDS.OrganizationCalendarSession`: AttendanceTermIndicator, BeginDate, EndDate, OrganizationCalendarId, OrganizationCalendarSessionId, SessionStartTime
  * `CEDS.OrganizationPersonRole`: OrganizationId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId
  * `CEDS.RoleAttendanceEvent`: Date, OrganizationPersonRoleId, RoleAttendanceEventId

### 🔍 fn3DA
- **Cantidad de campos validados:** `16` campos CEDS
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
- **Cantidad de campos validados:** `33` campos CEDS
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
- **Cantidad de campos validados:** `8` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.PersonList`: AwardDate, DegreeOrCertificateTitleOrSubject, DegreeOrCertificateTypeDescription, educationVerificationMethodDescription, higherEducationInstitutionAccreditationStatusDescription, NameOfInstitution, personId, Role

### 🔍 fn3E1
- **Cantidad de campos validados:** `17` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: personId
  * `CEDS.PersonDegreeOrCertificate`: AwardDate, DegreeOrCertificateTitleOrSubject, idoneidadDocente, NameOfInstitution, personId, RefDegreeOrCertificateTypeId, RefEducationVerificationMethodId, RefHigherEducationInstitutionAccreditationStatusId
  * `CEDS.RefDegreeOrCertificateType`: Description, RefDegreeOrCertificateTypeId
  * `CEDS.RefEducationVerificationMethod`: Description, RefEducationVerificationMethodId
  * `CEDS.RefHigherEducationInstitutionAccreditationStatus`: Description, RefHigherEducationInstitutionAccreditationStatusId
  * `CEDS.Role`: name, RoleId

### 🔍 fn3E2
- **Cantidad de campos validados:** `3` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.k12schoolList`: OrganizationId
  * `CEDS.organizationList`: Identifier, OrganizationId

### 🔍 fn3E3
- **Cantidad de campos validados:** `3` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.k12schoolList`: OrganizationId
  * `CEDS.organizationList`: Identifier, OrganizationId

### 🔍 fn3E4
- **Cantidad de campos validados:** `12` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3E5
- **Cantidad de campos validados:** `12` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3E6
- **Cantidad de campos validados:** `12` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3E7
- **Cantidad de campos validados:** `12` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3E8
- **Cantidad de campos validados:** `12` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3E9
- **Cantidad de campos validados:** `12` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3EA
- **Cantidad de campos validados:** `12` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3EB
- **Cantidad de campos validados:** `12` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3EC
- **Cantidad de campos validados:** `12` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3ED
- **Cantidad de campos validados:** `12` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3EE
- **Cantidad de campos validados:** `12` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.jerarquiasList`: codigoEnseñanza, especialidad, grado, jornada, letraCurso, modalidad, nivel, nombreEstablecimiento (+4 más)

### 🔍 fn3EF
- **Cantidad de campos validados:** `2` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.cursoList`: OrganizationIdCurso
  * `CEDS.jerarquiasList`: OrganizationIdDelCurso

### 🔍 fn3F0
- **Cantidad de campos validados:** `1` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.PersonList`: personId

### 🔍 fn3F2
- **Cantidad de campos validados:** `1` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.PersonList`: RUN

### 🔍 fn3F3
- **Cantidad de campos validados:** `4` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.PersonIdentifier`: Identifier, RefPersonIdentificationSystemId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId

### 🔍 fn3F4
- **Cantidad de campos validados:** `4` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.PersonIdentifier`: Identifier, RefPersonIdentificationSystemId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId

### 🔍 fn3F5
- **Cantidad de campos validados:** `2` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationEmail`: ElectronicMailAddress
  * `CEDS.PersonEmailAddress`: EmailAddress

### 🔍 fn3F6
- **Cantidad de campos validados:** `2` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationTelephone`: TelephoneNumber
  * `CEDS.PersonTelephone`: TelephoneNumber

### 🔍 fn3F7
- **Cantidad de campos validados:** `4` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.PersonIdentifier`: Identifier, RefPersonIdentificationSystemId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId

### 🔍 fn3F8
- **Cantidad de campos validados:** `4` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.PersonIdentifier`: Identifier, RefPersonIdentificationSystemId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId

### 🔍 fn3F9
- **Cantidad de campos validados:** `22` campos CEDS
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
- **Cantidad de campos validados:** `3` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Person`: RefTribalAffiliationId
  * `CEDS.RefTribalAffiliation`: Description, RefTribalAffiliationId

### 🔍 fn3FB
- **Cantidad de campos validados:** `9` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Person`: personId
  * `CEDS.PersonIdentifier`: personId, RefPersonIdentificationSystemId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId

### 🔍 fn3FC
- **Cantidad de campos validados:** `4` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationEmail`: ElectronicMailAddress, RefEmailTypeId
  * `CEDS.PersonEmailAddress`: EmailAddress, RefEmailTypeId

### 🔍 fn3FD
- **Cantidad de campos validados:** `4` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationTelephone`: RefInstitutionTelephoneTypeId, TelephoneNumber
  * `CEDS.PersonTelephone`: RefPersonTelephoneNumberTypeId, TelephoneNumber

### 🔍 fn3FE
- **Cantidad de campos validados:** `13` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Person`: personId
  * `CEDS.PersonBirthplace`: City, PersonId, RefCountryId, RefStateId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId
  * `CEDS.RefCountry`: Code, RefCountryId
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId
  * `CEDS.RefState`: Code, RefStateId

### 🔍 fn3FF
- **Cantidad de campos validados:** `13` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Person`: personId
  * `CEDS.PersonBirthplace`: City, PersonId, RefCountryId, RefStateId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId
  * `CEDS.RefCountry`: Code, RefCountryId
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId
  * `CEDS.RefState`: Code, RefStateId

### 🔍 fn4FA
- **Cantidad de campos validados:** `28` campos CEDS
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
- **Cantidad de campos validados:** `8` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: OrganizationPersonRoleId, personId, RoleId
  * `CEDS.RoleAttendanceEvent`: Date, digitalRandomKey, OrganizationPersonRoleId, RoleAttendanceEventId, VirtualIndicator

### 🔍 fn5E0
- **Cantidad de campos validados:** `35` campos CEDS
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
- **Cantidad de campos validados:** `10` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Course`: OrganizationId
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, OrganizationPersonRoleId, personId, RoleId
  * `CEDS.RoleAttendance`: RoleAttendanceId
  * `CEDS.RoleAttendanceEvent`: Date, RoleAttendanceEventId

### 🔍 fn5E2
- **Cantidad de campos validados:** `17` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: OrganizationPersonRoleId, personId, RoleId
  * `CEDS.Person`: FirstName, LastName, MiddleName, personId, SecondLastName
  * `CEDS.PersonDegreeOrCertificate`: AwardDate, DegreeOrCertificateTitleOrSubject, NameOfInstitution, personId
  * `CEDS.PersonIdentifier`: Identifier, personId
  * `CEDS.RoleAttendanceEvent`: observaciones, OrganizationPersonRoleId, RefAttendanceStatusId

### 🔍 fn5E3
- **Cantidad de campos validados:** `20` campos CEDS
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
- **Cantidad de campos validados:** `5` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: OrganizationPersonRoleId, RoleId
  * `CEDS.RoleAttendanceEvent`: Date, OrganizationPersonRoleId, RefAttendanceStatusId

### 🔍 fn5E5
- **Cantidad de campos validados:** `33` campos CEDS
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
- **Cantidad de campos validados:** `8` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationCalendar`: OrganizationId
  * `CEDS.OrganizationCalendarSession`: FirstInstructionDate, LastInstructionDate, OrganizationCalendarId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId

### 🔍 fn680
- **Cantidad de campos validados:** `48` campos CEDS
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
- **Cantidad de campos validados:** `13` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.K12Course`: OrganizationId, RefWorkbasedLearningOpportunityTypeId
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, personId, RoleId
  * `CEDS.OrganizationRelationship`: OrganizationId, Parent_OrganizationId
  * `CEDS.PersonIdentifier`: Identifier, personId
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId

### 🔍 fn682
- **Cantidad de campos validados:** `39` campos CEDS
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
- **Cantidad de campos validados:** `23` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: OrganizationPersonRoleId, personId, RoleId
  * `CEDS.PersonIdentifier`: Identifier, personId
  * `CEDS.RefAttendanceEventType`: Code, RefAttendanceEventTypeId
  * `CEDS.RefPersonIdentificationSystem`: Code, RefPersonIdentificationSystemId
  * `CEDS.Role`: name, RoleId
  * `CEDS.RoleAttendanceEvent`: Date, digitalRandomKey, digitalRandomKeyDate, fechaRatificador, firmaRatificador, oprIdRatificador, OrganizationPersonRoleId, RecordEndDateTime (+3 más)
  * `CEDS.RoleStatus`: RecordEndDateTime

### 🔍 fn6C0
- **Cantidad de campos validados:** `12` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, OrganizationPersonRoleId, personId, RoleId
  * `CEDS.PersonList`: personId, RUN
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId
  * `CEDS.RoleAttendance`: OrganizationPersonRoleId
  * `CEDS.RoleAttendanceEvent`: Date

### 🔍 fn6C2
- **Cantidad de campos validados:** `12` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.PersonIdentifier`: Identifier, personId, RefPersonIdentificationSystemId
  * `CEDS.PersonStatus`: docnumber, fileScanBase64, personId, RefPersonStatusTypeId, StatusStartDate
  * `CEDS.RefPersonIdentificationSystem`: description, RefPersonIdentificationSystemId
  * `CEDS.RefPersonStatusType`: Description, RefPersonStatusTypeId

### 🔍 fn6D0
- **Cantidad de campos validados:** `25` campos CEDS
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
- **Cantidad de campos validados:** `17` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationCalendar`: OrganizationCalendarId, OrganizationId
  * `CEDS.OrganizationCalendarSession`: FirstInstructionDate, LastInstructionDate, OrganizationCalendarId
  * `CEDS.OrganizationPersonRole`: EntryDate, ExitDate, OrganizationPersonRoleId, personId
  * `CEDS.PersonList`: personId, RUN
  * `CEDS.PersonStatus`: personId, RefPersonStatusTypeId
  * `CEDS.RoleAttendanceEvent`: Date, OrganizationPersonRoleId

### 🔍 fn6E0
- **Cantidad de campos validados:** `20` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSectionLocation`: OrganizationId
  * `CEDS.CourseSectionSchedule`: ClassBeginningTime, ClassMeetingDays, ClassPeriod
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: EntryDate, ExitDate, OrganizationId, OrganizationPersonRoleId, personId, RecordEndDateTime, RecordStartDateTime, RoleId
  * `CEDS.PersonIdentifier`: Identifier, personId
  * `CEDS.RoleAttendanceEvent`: Date, fileScanBase64, observaciones, OrganizationPersonRoleId

### 🔍 fn6E1
- **Cantidad de campos validados:** `21` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSectionSchedule`: ClassBeginningTime, ClassEndingTime, ClassMeetingDays, ClassPeriod, OrganizationId, RecordEndDateTime
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: EntryDate, ExitDate, OrganizationId, OrganizationPersonRoleId, personId, RecordEndDateTime, RoleId
  * `CEDS.PersonIdentifier`: Identifier, personId
  * `CEDS.RoleAttendanceEvent`: Date, fileScanBase64, observaciones, OrganizationPersonRoleId

### 🔍 fn6E2
- **Cantidad de campos validados:** `9` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationCalendarEvent`: EventDate
  * `CEDS.OrganizationPersonRole`: OrganizationPersonRoleId, personId
  * `CEDS.PersonList`: RUN
  * `CEDS.PersonRelationship`: personId
  * `CEDS.RoleAttendanceEvent`: Date, OrganizationPersonRoleId
  * `CEDS.organizationCalendarCrisis`: EndDate, StartDate

### 🔍 fn6E3
- **Cantidad de campos validados:** `8` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationCalendarEvent`: fileScanBase64, indicadorSinClases, rexDate, rexNumber
  * `CEDS.OrganizationCalendarSession`: claseRecuperadaId, fechaREX, fileScanBase64, numeroREX

### 🔍 fn6E4
- **Cantidad de campos validados:** `23` campos CEDS
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
- **Cantidad de campos validados:** `36` campos CEDS
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
- **Cantidad de campos validados:** `11` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: OrganizationPersonRoleId, personId, RoleId
  * `CEDS.PersonIdentifier`: Identifier, personId, RefPersonIdentificationSystemId
  * `CEDS.RefPersonIdentificationSystem`: description, RefPersonIdentificationSystemId
  * `CEDS.RoleAttendanceEvent`: Date, OrganizationPersonRoleId, VirtualIndicator

### 🔍 fn7F0
- **Cantidad de campos validados:** `15` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Assessment`: AssessmentId, RefAssessmentTypeId
  * `CEDS.AssessmentAdministration`: AssessmentAdministrationId, AssessmentId
  * `CEDS.AssessmentRegistration`: AssessmentAdministrationId, AssessmentRegistrationId
  * `CEDS.AssessmentResult`: AssessmentRegistrationId
  * `CEDS.AssessmentSession`: AssessmentAdministrationId, AssessmentSessionId
  * `CEDS.AssessmentSessionStaffRole`: AssessmentSessionId, AssessmentSessionStaffRoleId, PersonId, RefAssessmentSessionStaffRoleTypeId
  * `CEDS.OrganizationPersonRole`: personId, RoleId

### 🔍 fn7F1
- **Cantidad de campos validados:** `24` campos CEDS
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
- **Cantidad de campos validados:** `13` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Organization`: name, OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationPersonRole`: OrganizationId, personId, RoleId
  * `CEDS.OrganizationRelationship`: OrganizationId, Parent_OrganizationId
  * `CEDS.Person`: personId
  * `CEDS.PersonStatus`: RefPersonStatusTypeId
  * `CEDS.PersonTelephone`: PersonId
  * `CEDS.RefOrganizationType`: Description, RefOrganizationTypeId

### 🔍 fn7F3
- **Cantidad de campos validados:** `12` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Assessment`: AssessmentId, RefAssessmentTypeId
  * `CEDS.AssessmentAdministration`: AssessmentAdministrationId, AssessmentId
  * `CEDS.AssessmentRegistration`: AssessmentAdministrationId, AssessmentRegistrationId
  * `CEDS.AssessmentResult`: AssessmentRegistrationId, RefScoreMetricTypeId, ScoreValue
  * `CEDS.LearnerActivity`: LearnerActivityId, PersonId, Weight

### 🔍 fn7F4
- **Cantidad de campos validados:** `7` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.LearnerActivity`: DateDigitalRandomKey, digitalRandomKey, LearnerActivityId, personIDDigitalRandomKey
  * `CEDS.OrganizationPersonRole`: personId, RoleId
  * `CEDS.Person`: personId

### 🔍 fn7F5
- **Cantidad de campos validados:** `6` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Assessment`: AssessmentId
  * `CEDS.AssessmentAdministration`: AssessmentAdministrationId, AssessmentId
  * `CEDS.AssessmentRegistration`: AssessmentRegistrationId
  * `CEDS.LearnerActivity`: AssessmentRegistrationId, LearnerActivityId

### 🔍 fn8F0
- **Cantidad de campos validados:** `27` campos CEDS
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
- **Cantidad de campos validados:** `3` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Incident`: IncidentId, RefIncidentBehaviorId
  * `CEDS.RefIncidentBehavior`: Description

### 🔍 fn8F2
- **Cantidad de campos validados:** `70` campos CEDS
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
- **Cantidad de campos validados:** `18` campos CEDS
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
- **Cantidad de campos validados:** `5` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.OrganizationPersonRole`: OrganizationId, personId, RoleId
  * `CEDS.PersonDegreeOrCertificate`: personId
  * `CEDS.PersonList`: personId

### 🔍 fn9F1
- **Cantidad de campos validados:** `21` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSection`: CourseId, MaximumCapacity, OrganizationId, RefInstructionLanguageId, VirtualIndicator
  * `CEDS.CourseSectionSchedule`: ClassBeginningTime, ClassEndingTime, ClassMeetingDays, ClassPeriod, OrganizationId, RecordEndDateTime
  * `CEDS.Organization`: OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationCalendar`: OrganizationCalendarId, OrganizationId
  * `CEDS.OrganizationCalendarSession`: OrganizationCalendarId, OrganizationCalendarSessionId
  * `CEDS.OrganizationRelationship`: OrganizationId, Parent_OrganizationId
  * `CEDS.RefOrganizationType`: code, RefOrganizationTypeId

### 🔍 fn9F2
- **Cantidad de campos validados:** `13` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.CourseSection`: CourseId
  * `CEDS.Organization`: name, OrganizationId, RefOrganizationTypeId
  * `CEDS.OrganizationCalendar`: CalendarCode, CalendarDescription, CalendarYear, OrganizationCalendarId, OrganizationId
  * `CEDS.OrganizationPersonRole`: OrganizationId, personId, RoleId
  * `CEDS.Person`: personId

### 🔍 fn9F3
- **Cantidad de campos validados:** `10` campos CEDS
- **Campos Clave Comprometidos:**
  * `CEDS.Incident`: IncidentId, RefIncidentBehaviorId
  * `CEDS.IncidentPerson`: IncidentId, RefIncidentPersonTypeId
  * `CEDS.RefIncidentBehavior`: Description, RefIncidentBehaviorId
  * `CEDS.RefIncidentPersonRoleType`: Description, RefIncidentPersonRoleTypeId
  * `CEDS.RefIncidentPersonType`: Description, RefIncidentPersonTypeId

