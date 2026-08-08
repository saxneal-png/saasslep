# Especificación Física del Modelo CEDS NDS (Normalized Data Schema)

Este documento detalla el diseño físico del esquema de base de datos normalizado oficial de CEDS (**NDS v7.1**) para las tablas estructurales más importantes utilizadas en las validaciones de **saasslep** e integraciones ministeriales.

---

## 🗄️ Diccionario Físico de Tablas NDS

### 📊 Tabla NDS: `AssessmentResult`
- **Cantidad de Columnas Físicas:** `24` campos en la base de datos SQL

| Columna SQL | Tipo de Dato | Nullable | SIERequired | Descripción del Campo |
|---|---|---|---|---|
| `AssessmentResultDescriptiveFeedbackDateTime` | `datetime` | `YES` | `NO` | The date and time the descriptive feedback was entered for a scored/evaluated portion of an assessment. |
| `AssessmentResultScoreStandardError` | `decimal` | `YES` | `NO` | The measure of sampling variability and measurement error for the score, the amount of error to be expected in the score. |
| `DateCreated` | `date` | `YES` | `NO` | The date on which the assessment result was generated. |
| `DateUpdated` | `date` | `YES` | `NO` | The most recent date that the result was calculated/updated.  The value should be the same as Assessment Result Date Created if the subtest has only been scored once, but may be different if the score was recalculated with a different result. |
| `DescriptiveFeedback` | `nvarchar(300)` | `YES` | `NO` | The formative descriptive feedback that was given to a learner based on a scored/evaluated portion of an assessment as recorded in the result entity. |
| `DescriptiveFeedbackSource` | `nvarchar(60)` | `YES` | `NO` | Identifies the source of the descriptive feedback that was given to a learner based on a scored/evaluated portion of an assessment. May indicate if this is teacher, scorer, or system generated feedback. Values for this attribute would be determined by the assessment program. |
| `DiagnosticStatement` | `nvarchar(max)` | `YES` | `NO` | A statement intended for use by education professionals, using professional terminology, to interpret learner needs based on the scored/evaluated portion of an assessment.  This statement may inform Descriptive Feedback given to the learner. |
| `DiagnosticStatementSource` | `nvarchar(300)` | `YES` | `NO` | Identifies the source of the Diagnostic Statement based on a scored/evaluated portion of an assessment. |
| `IncludedInAypCalculation` | `bit` | `YES` | `NO` | An indication of whether a proficiency score on the state assessment was included in the state’s calculation of adequate yearly progress (AYP). |
| `InstructionalRecommendation` | `nvarchar(100)` | `YES` | `NO` | This provides the next steps for instruction for the student based upon the assessment results and student characteristics. |
| `NumberOfResponses` | `int` | `YES` | `NO` | The number of responses that are included with the Student Score Set. Responses are those items that were attempted (partially or fully answered) by the student and not necessarily the number of items in the assessment (which can be determined from the assessment object). |
| `PreliminaryIndicator` | `bit` | `YES` | `NO` | If this score is preliminary, then this attribute value should be set.  Preliminary scores may be provided for early use by the assessment program or user while final scoring is occurring. |
| `RecordEndDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RecordStartDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RefAssessmentPretestOutcomeId` | `int` | `YES` | `NO` | The results of a pre-test in academic subjects. |
| `RefAssessmentResultDataTypeId` | `int` | `YES` | `NO` |  The data type of the assessment result score value. |
| `RefAssessmentResultScoreTypeId` | `int` | `YES` | `NO` | Indicates the purpose for which this assessment score instance was recorded. |
| `RefELOutcomeMeasurementLevelId` | `int` | `YES` | `NO` | Use for outcome measures in early learning. |
| `RefOutcomeTimePointId` | `int` | `YES` | `NO` | The point in time for which the result is used for an outcome measure. |
| `RefScoreMetricTypeId` | `int` | `YES` | `NO` | The specific method used to report the performance and achievement of the assessment. This is the metric that is being used to derive the scores. |
| `ScoreValue` | `nvarchar(35)` | `YES` | `NO` | A meaningful raw score, derived score, or statistical expression of the performance of a person on an assessment. The type of result is indicated by the Assessment Score Metric Type element. The results can be expressed as a number, percentile, range, level, etc. The score relates to all scored items or a sub test scoring one aspect of performance on the test. This value may or may not correspond to one or more Performance Levels. |
| `AssessmentRegistrationId` | `int` | `NO` | `YES` | Foreign key - AssessmentRegistration |
| `AssessmentResultId` | `int` | `NO` | `YES` | Surrogate Key |
| `AssessmentSubtestId` | `int` | `NO` | `YES` | Foreign key - AssessmentSubtest |

### 📊 Tabla NDS: `CourseSectionSchedule`
- **Cantidad de Columnas Físicas:** `9` campos en la base de datos SQL

| Columna SQL | Tipo de Dato | Nullable | SIERequired | Descripción del Campo |
|---|---|---|---|---|
| `ClassBeginningTime` | `time` | `YES` | `NO` | An indication of the time of day the class begins. |
| `ClassEndingTime` | `time` | `YES` | `NO` | An indication of the time of day the class ends. |
| `ClassMeetingDays` | `nvarchar(60)` | `YES` | `NO` | The day(s) of the week (e.g., Monday, Wednesday) that the class meets or an indication that a class meets "out-of-school" or "self-paced". |
| `ClassPeriod` | `nvarchar(30)` | `YES` | `NO` | An indication of the portion of a typical daily session in which students receive instruction in a specified subject (e.g., morning, sixth period, block period, or AB schedules). |
| `RecordEndDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RecordStartDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `TimeDayIdentifier` | `nvarchar(40)` | `YES` | `NO` | The unique identifier for the locally defined rotation cycle date code when the class meets (e.g., in a two day schedule, valid values could be "A" and "B", or "1" and "2"). |
| `CourseSectionScheduleId` | `int` | `NO` | `YES` | Surrogate Key |
| `OrganizationId` | `int` | `NO` | `YES` | Surrogate key from CourseSection. |

### 📊 Tabla NDS: `Incident`
- **Cantidad de Columnas Físicas:** `24` campos en la base de datos SQL

| Columna SQL | Tipo de Dato | Nullable | SIERequired | Descripción del Campo |
|---|---|---|---|---|
| `IncidentCost` | `nvarchar(30)` | `YES` | `NO` | The value of any quantifiable monetary loss directly resulting from the incident. Examples include the value of repairs necessitated by vandalism of a school facility, the value of personnel resources used for repairs or consumed by the incident, the value of stolen items, and the value of time consumed by an incident (e.g., instructional time involved in evacuating a school during a false fire alarm).  Cost may be reported by specific monetary amount or range. |
| `IncidentDate` | `date` | `YES` | `NO` | The year, month and day on which the incident occurred. |
| `IncidentDescription` | `nvarchar(max)` | `YES` | `NO` | The description for an incident. |
| `IncidentIdentifier` | `nvarchar(40)` | `YES` | `NO` | A locally assigned unique identifier (within the school or school district) to identify each specific incident or occurrence. The same identifier should be used to document the entire incident even if it included multiple offenses and multiple offenders. |
| `IncidentReporterId` | `int` | `YES` | `NO` | Identifies the reporter of the incident using  a pre-existing unique student identifier or unique staff identifier, when the reporter is a student or staff member. |
| `IncidentTime` | `time` | `YES` | `NO` | An indication of the time of day the incident took place. |
| `OrganizationPersonRoleId` | `int` | `YES` | `NO` | Foreign key - OrganizationPersonRoleId. |
| `RecordEndDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RecordStartDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RefFirearmTypeId` | `int` | `YES` | `NO` | The type of firearm. |
| `RefIncidentBehaviorId` | `int` | `YES` | `NO` | Categories of behavior coded for use in describing an incident. |
| `RefIncidentBehaviorSecondaryId` | `int` | `YES` | `NO` | Supplemental information about an incident when the primary offense is more serious in nature than alcohol or drug, etc. offenses. |
| `RefIncidentInjuryTypeId` | `int` | `YES` | `NO` | An indication of the occurrence of physical injury to participants involved in the incident and, if so, the level of injury sustained. |
| `RefIncidentLocationId` | `int` | `YES` | `NO` | Identifies where the incident occurred and whether or not it occurred on campus. |
| `RefIncidentMultipleOffenseTypeId` | `int` | `YES` | `NO` | An indication of whether the offense was primary or secondary in nature when a single incident included more than one type of offense. |
| `RefIncidentPerpetratorInjuryTypeId` | `int` | `YES` | `NO` | An indication of the occurrence of physical injury to the perpetrator(s) (participants) involved in the incident and‚ if so‚ the level of injury sustained. |
| `RefIncidentReporterTypeId` | `int` | `YES` | `NO` | Information on the type of person who reported the incident. When known and/or if useful, use a more specific option code (e.g., "Counselor" rather than "Professional Staff"). |
| `RefIncidentTimeDescriptionCodeId` | `int` | `YES` | `NO` | A code for the description of the time of day that an incident took place. |
| `RefWeaponTypeId` | `int` | `YES` | `NO` | Identifies the type of weapon used during an incident. |
| `RegulationViolatedDescription` | `nvarchar(100)` | `YES` | `NO` | A description of the rule‚ regulation‚ or standard that was violated when an incident occurred (e.g.‚ the identification of a relevant law‚ conduct standard‚ or acceptable use policy). |
| `RelatedToDisabilityManifestationInd` | `bit` | `YES` | `NO` | An indication whether a student’s behavior (offense) was a manifestation of‚ or related to‚ a disability condition. |
| `OrganizationId` | `int` | `YES` | `NO` | Organización creada en consulta con la SIE |
| `ReportedToLawEnforcementInd` | `bit` | `YES` | `NO` | An indication that the school resource officer or any other law enforcement official was notified about the incident‚ regardless of whether official action is taken. |
| `IncidentId` | `int` | `NO` | `YES` | Surrogate Key |

### 📊 Tabla NDS: `IncidentPerson`
- **Cantidad de Columnas Físicas:** `10` campos en la base de datos SQL

| Columna SQL | Tipo de Dato | Nullable | SIERequired | Descripción del Campo |
|---|---|---|---|---|
| `Date` | `datetime` | `YES` | `NO` | Sin descripción |
| `digitalRandomKey` | `nvarchar(8)` | `YES` | `NO` | Sin descripción |
| `fileScanBase64` | `text` | `YES` | `NO` | Sin descripción |
| `Identifier` | `nvarchar(40)` | `YES` | `NO` | Person's identifier. |
| `RecordEndDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RecordStartDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RefIncidentPersonTypeId` | `int` | `YES` | `NO` | Information on the type of individual who was involved in an incident. |
| `IncidentId` | `int` | `NO` | `YES` | Sin descripción |
| `PersonId` | `int` | `NO` | `YES` | Sin descripción |
| `RefIncidentPersonRoleTypeId` | `int` | `NO` | `YES` | The role or type of participation of a person in a discipline incident. |

### 📊 Tabla NDS: `K12StudentDiscipline`
- **Cantidad de Columnas Físicas:** `22` campos en la base de datos SQL

| Columna SQL | Tipo de Dato | Nullable | SIERequired | Descripción del Campo |
|---|---|---|---|---|
| `DisciplinaryActionEndDate` | `date` | `YES` | `NO` | The year, month and day on which a discipline action ends. |
| `DisciplinaryActionStartDate` | `date` | `YES` | `NO` | The year, month and day on which a discipline action begins. |
| `DurationOfDisciplinaryAction` | `decimal` | `YES` | `NO` | The length, in school days, of the disciplinary action. |
| `EducationalServicesAfterRemoval` | `bit` | `YES` | `NO` | An indication of whether children (students) were provided educational services when removed from the regular school program for disciplinary reasons. |
| `FullYearExpulsion` | `bit` | `YES` | `NO` | An expulsion with or without services for a period of one full year (i.e., 365 days). |
| `IEPPlacementMeetingIndicator` | `bit` | `YES` | `NO` | An indication as to whether an offense and/or disciplinary action resulted in a meeting of a student’s Individualized Education Program (IEP) team to determine appropriate placement. |
| `IncidentId` | `int` | `YES` | `NO` | Surrogate Key |
| `personId` | `int` | `YES` | `NO` | Sin descripción |
| `RecordEndDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RecordStartDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RefDisciplinaryActionTakenId` | `int` | `YES` | `NO` | Identifies the consequences of an incident for the student(s) involved in an incident as perpetrator(s). |
| `RefDisciplineLengthDifferenceReasonId` | `int` | `YES` | `NO` | The reason for the difference, if any, between the official and actual lengths of a student’s disciplinary assignment. |
| `RefDisciplineMethodFirearmsId` | `int` | `YES` | `NO` | The method used to discipline students who are not children with disabilities (IDEA) involved in firearms and other outcomes of firearms incidents. |
| `RefDisciplineMethodOfCwdId` | `int` | `YES` | `NO` | The type of suspension or expulsion used for the discipline of children with disabilities. |
| `RefDisciplineReasonId` | `int` | `YES` | `NO` | The reason why the student was disciplined. |
| `RefIDEADisciplineMethodFirearmId` | `int` | `YES` | `NO` | The methods used to discipline students who are children with disabilities (IDEA) involved in firearms and other outcomes of firearms incidents. |
| `RefIdeaInterimRemovalId` | `int` | `YES` | `NO` | The type of interim removal from current educational setting experienced by children with disabilities (IDEA). |
| `RefIdeaInterimRemovalReasonId` | `int` | `YES` | `NO` | The reasons why children with disabilities were unilaterally removed from their current educational placement to an interim alternative educational setting. |
| `RelatedToZeroTolerancePolicy` | `bit` | `YES` | `NO` | An indication of whether or not any of the disciplinary actions taken against a student were imposed as a consequence of state or local zero tolerance policies. |
| `ShortenedExpulsion` | `bit` | `YES` | `NO` | An expulsion with or without services that is shortened to a term of less than one year by the superintendent or chief administrator of a school district. |
| `K12StudentDisciplineId` | `int` | `NO` | `YES` | Surrogate Key |
| `OrganizationPersonRoleId` | `int` | `NO` | `YES` | Surrogate key from OrganizationPersonRole |

### 📊 Tabla NDS: `K12StudentEnrollment`
- **Cantidad de Columnas Físicas:** `21` campos en la base de datos SQL

| Columna SQL | Tipo de Dato | Nullable | SIERequired | Descripción del Campo |
|---|---|---|---|---|
| `active` | `int` | `YES` | `NO` | Sin descripción |
| `DisplacedStudentStatus` | `bit` | `YES` | `NO` | A student who was enrolled, or eligible for enrollment, but has enrolled in another place because of a crisis. |
| `FirstEntryDateIntoUSSchool` | `date` | `YES` | `NO` | The year, month and day of a person's initial enrollment into a United States school. |
| `NSLPDirectCertificationIndicator` | `bit` | `YES` | `NO` | Indicates that the student's National School Lunch Program (NSLP) eligibility has been determined through direct certification. |
| `RecordEndDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RecordStartDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RefDirectoryInformationBlockStatusId` | `int` | `YES` | `NO` | An indication of whether a individual requested a Family Education Rights and Privacy Act (FERPA) block to withhold the release of the person's directory information. |
| `RefEndOfTermStatusId` | `int` | `YES` | `NO` | The nature of the student's progress at the end of a given school term. |
| `RefEnrollmentStatusId` | `int` | `YES` | `NO` | An indication as to whether a student's name was, is, or will be officially registered on the roll of a school or schools. |
| `RefEntryGradeLevelId` | `int` | `YES` | `NO` | The grade level or primary instructional level at which a student enters and receives services in a school or an educational institution during a given academic session. |
| `RefEntryType` | `int` | `YES` | `NO` | The process by which a student enters a school during a given academic session. |
| `RefExitGradeLevel` | `int` | `YES` | `NO` | The grade level or primary instructional level at which a student exits a school, program, or an educational institution. |
| `RefExitOrWithdrawalStatusId` | `int` | `YES` | `NO` | An indication as to whether an instance of student exit/withdrawal is considered to be of a permanent or temporary nature. |
| `RefExitOrWithdrawalTypeId` | `int` | `YES` | `NO` | The circumstances under which the student exited from membership in an educational institution.  |
| `RefFoodServiceEligibilityId` | `int` | `YES` | `NO` | An indication of a student's level of eligibility to participate in the National School Lunch Program for breakfast, lunch, snack, supper, and milk programs. |
| `RefNonPromotionReasonId` | `int` | `YES` | `NO` | The primary reason as to why a staff member determined that a student should not be promoted (or be demoted). |
| `RefPromotionReasonId` | `int` | `YES` | `NO` | The nature of the student's promotion or progress at the end of a given school term. |
| `RefPublicSchoolResidence` | `int` | `YES` | `NO` | An indication of the location of a persons legal residence relative to (within or outside) the boundaries of the public school attended and its administrative unit. |
| `RefStudentEnrollmentAccessTypeId` | `int` | `YES` | `NO` | The designation of how students secure access to age appropriate public schools, or publicly funded charter or private schools. |
| `OrganizationPersonRoleId` | `int` | `NO` | `YES` | Surrogate key from OrganizationPersonRole. |
| `StudentListNumber` | `int` | `NO` | `YES` | CL: Número de lista del estudiante en el curso |

### 📊 Tabla NDS: `Organization`
- **Cantidad de Columnas Físicas:** `7` campos en la base de datos SQL

| Columna SQL | Tipo de Dato | Nullable | SIERequired | Descripción del Campo |
|---|---|---|---|---|
| `RecordEndDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RecordStartDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RefOrganizationTypeId` | `int` | `YES` | `NO` | The type of organization.  (Foreign key - RefOrganizationType) |
| `RegionGeoJSON` | `nvarchar(2000)` | `YES` | `NO` | The geo-political area of the organization's facility, building, or site. |
| `Name` | `nvarchar(128)` | `YES` | `YES` | The name or title of a non-person entity such as an organization, institution, agency, business, program or course. |
| `OrganizationId` | `int` | `NO` | `YES` | Surrogate Key |
| `ShortName` | `nvarchar(30)` | `YES` | `YES` | The name of the institution, which may be the abbreviated form of the full legally accepted name. |

### 📊 Tabla NDS: `OrganizationCalendar`
- **Cantidad de Columnas Físicas:** `7` campos en la base de datos SQL

| Columna SQL | Tipo de Dato | Nullable | SIERequired | Descripción del Campo |
|---|---|---|---|---|
| `CalendarCode` | `nvarchar(30)` | `YES` | `NO` | A unique number assigned by a school district to a school calendar. |
| `CalendarYear` | `nchar(4)` | `YES` | `NO` | The school or program year for the calendar. |
| `RecordEndDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RecordStartDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `CalendarDescription` | `nvarchar(60)` | `NO` | `YES` | A description or identification of the calendar. |
| `OrganizationCalendarId` | `int` | `NO` | `YES` | Surrogate Key |
| `OrganizationId` | `int` | `NO` | `YES` | Foreign key - Organization |

### 📊 Tabla NDS: `Person`
- **Cantidad de Columnas Físicas:** `20` campos en la base de datos SQL

| Columna SQL | Tipo de Dato | Nullable | SIERequired | Descripción del Campo |
|---|---|---|---|---|
| `BirthdateVerification` | `nvarchar(60)` | `YES` | `NO` | The evidence by which a child's date of birth is confirmed. |
| `GenerationCode` | `nvarchar(10)` | `YES` | `NO` | An appendage, if any, used to denote a person's generation in his family (e.g., Jr., Sr., III). |
| `HispanicLatinoEthnicity` | `bit` | `YES` | `NO` | An indication that the person traces his or her origin or descent to Mexico, Puerto Rico, Cuba, Central and South America, and other Spanish cultures, regardless of race. |
| `Prefix` | `nvarchar(30)` | `YES` | `NO` | An appellation, if any, used to denote rank, placement, or status (e.g., Mr., Ms., Reverend, Sister, Dr., Colonel). |
| `RecordEndDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RecordStartDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RefHighestEducationLevelCompletedId` | `int` | `YES` | `NO` | The extent of formal instruction a person has received (e.g., the highest grade in school completed or its equivalent or the highest degree received). |
| `RefPersonalInformationVerificationId` | `int` | `YES` | `NO` | The evidence by which a persons name, address, date of birth, etc. is confirmed. |
| `RefProofOfResidencyTypeId` | `int` | `YES` | `NO` | An accepted form of proof of residency in the district/county/other locality. |
| `RefStateOfResidenceId` | `int` | `YES` | `NO` | An person's permanent address as determined by such evidence as a driver's license or voter registration. For entering freshmen, state of residence may be the legal state of residence of a parent or guardian. |
| `RefTribalAffiliationId` | `int` | `YES` | `NO` | The Native American tribal entity recognized and eligible to receive services from the United States Bureau of Indian Affairs to which a person is affiliated. |
| `RefUSCitizenshipStatusId` | `int` | `YES` | `NO` | An indicator of whether or not the person is a US citizen. |
| `RefVisaTypeId` | `int` | `YES` | `NO` | An indicator of a non-US citizen's Visa type. |
| `Birthdate` | `date` | `YES` | `YES` | The year, month and day on which a person was born. |
| `FirstName` | `nvarchar(35)` | `YES` | `YES` | The full legal first name given to a person at birth, baptism, or through legal change. |
| `LastName` | `nvarchar(35)` | `NO` | `YES` | The full legal last name borne in common by members of a family. |
| `MiddleName` | `nvarchar(35)` | `YES` | `YES` | A full legal middle name given to a person at birth, baptism, or through legal change. |
| `PersonId` | `int` | `NO` | `YES` | Surrogate Key |
| `RefSexId` | `int` | `YES` | `YES` | The concept describing the biological traits that distinguish the males and females of a species. |
| `SecondLastName` | `nvarchar(35)` | `NO` | `YES` | CL:Corresponde al apellido materno |

### 📊 Tabla NDS: `PersonRelationship`
- **Cantidad de Columnas Físicas:** `13` campos en la base de datos SQL

| Columna SQL | Tipo de Dato | Nullable | SIERequired | Descripción del Campo |
|---|---|---|---|---|
| `ContactPriorityNumber` | `int` | `YES` | `NO` | The numeric order in the preferred sequence and priority for contacting a person related to the learner. |
| `ContactRestrictions` | `nvarchar(2000)` | `YES` | `NO` | Restrictions for student and/or teacher contact with the individual (e.g., the student may not be picked up by the individual) |
| `CustodialRelationshipIndicator` | `bit` | `YES` | `NO` | An indication that a person has legal custody of a child. |
| `LivesWithIndicator` | `bit` | `YES` | `NO` | Indicates whether or not the learner lives with the related person. |
| `RecordEndDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RecordStartDateTime` | `datetime` | `YES` | `NO` | Sin descripción |
| `RefPersonRelationshipId` | `int` | `YES` | `NO` | The nature of the person's relationship to a learner.  The learner may be an Early Learning Child, K12 Student, Postsecondary Student, or an adult learner in a workforce education program. |
| `RetirarEstudianteIndicador` | `bit` | `YES` | `NO` | Indica si la persona tiene o no autorización para retirar al estudiante |
| `EmergencyContactInd` | `bit` | `YES` | `YES` | Indicates whether or not the person is a designated emergency contact for the learner. |
| `PersonId` | `int` | `NO` | `YES` | Foreign key - Person. |
| `PersonRelationshipId` | `int` | `NO` | `YES` | Surrogate Key |
| `PrimaryContactIndicator` | `bit` | `YES` | `YES` | Indicates that a person is a primary contact within the specified context, such as a primary parental contact specified in Person Relationship to Learner or a primary administrative contact for an organization. |
| `RelatedPersonId` | `int` | `NO` | `YES` | Foreign key - Person.  Identifies the other person. |

