# Catálogo de Semillas y Enumeraciones CEDS (Common Education Data Standards)

Este catálogo documenta los valores estándar y códigos de semillas de las tablas de referencia (`RefXXX`) de CEDS oficiales requeridas para la certificación del Libro Digital de Clases EDE, extraídas de la matriz maestra de enumeraciones de CEDS e integradas en **saasslep**.

---

## 📑 Tablas de Referencia Clave y Opciones Estándar

### 📊 RefAttendanceEventType
- **Cantidad de códigos definidos:** `4` opciones estándar

| Código CEDS | Nombre / Etiqueta | Descripción / Definición |
|---|---|---|
| `DailyAttendance` | **Daily attendance** | Daily attendance is specified as the type of attendance event. |
| `ClassSectionAttendance` | **Class/section attendance** | Class/section attendance is specified as the type of attendance event. |
| `ProgramAttendance` | **Program attendance** | Program attendance is specified as the type of attendance event. |
| `ExtracurricularAttendance` | **Extracurricular attendance** | Extracurricular attendance is specified as the type of attendance event. |

### 📊 RefAttendanceStatus
- **Cantidad de códigos definidos:** `5` opciones estándar

| Código CEDS | Nombre / Etiqueta | Descripción / Definición |
|---|---|---|
| `Present` | **Present** | Present is specified as the status of a person's attendance associated with an Attendance Event Type, Calendar Event Date, in an organization-person-role context. |
| `ExcusedAbsence` | **Excused Absence** | Not present but is temporarily excused from attendance because the person is: 1) is ill and attendance would endanger his or her health or the health of others; 2) has an immediate family member who is seriously ill or has died; 3) is observing a recognized religious holiday of his or her faith; or 4) is otherwise excused in accordance with policies. |
| `UnexcusedAbsence` | **Unexcused Absence** | Not present without acceptable cause or authorization. |
| `Tardy` | **Tardy** | Is absent at the time a given schedule when attendance begins but is present before the close of that time period. |
| `EarlyDeparture` | **Early Departure** | Leaves before the official close of the daily session. Reasons may include a special activity for curricular enrichment, doctor's appointment, and family emergency. State, local, and school regulations may distinguish excused and unexcused early departures. When officially approved on a regular basis, early departures immediately prior to the close of the session are considered to be released time. |

### 📊 RefEnrollmentStatus
- **Cantidad de códigos definidos:** `4` opciones estándar

| Código CEDS | Nombre / Etiqueta | Descripción / Definición |
|---|---|---|
| `01812` | **Concurrently enrolled** | The student is concurrently enrolled. |
| `01811` | **Currently enrolled** | The student is currently enrolled. |
| `01810` | **Previously enrolled** | The student was previously enrolled. |
| `01813` | **Transferring (will enroll)** | The student is transferring (will enroll). |

### 📊 RefGradeLevel
- **Cantidad de códigos definidos:** `852` opciones estándar

| Código CEDS | Nombre / Etiqueta | Descripción / Definición |
|---|---|---|
| `IT` | **Infant/toddler** | Sin definición |
| `PR` | **Preschool** | Sin definición |
| `PK` | **Prekindergarten** | Sin definición |
| `TK` | **Transitional Kindergarten** | Sin definición |
| `KG` | **Kindergarten** | Sin definición |
| `01` | **First grade** | Sin definición |
| `02` | **Second grade** | Sin definición |
| `03` | **Third grade** | Sin definición |
| `04` | **Fourth grade** | Sin definición |
| `05` | **Fifth grade** | Sin definición |
| `06` | **Sixth grade** | Sin definición |
| `07` | **Seventh grade** | Sin definición |
| `08` | **Eighth grade** | Sin definición |
| `09` | **Ninth grade** | Sin definición |
| `10` | **Tenth grade** | Sin definición |
| `11` | **Eleventh grade** | Sin definición |
| `12` | **Twelfth grade** | Sin definición |
| `13` | **Grade 13** | Sin definición |
| `PS` | **Postsecondary** | Sin definición |
| `UG` | **Ungraded** | Sin definición |
| `Other` | **Other** | Sin definición |
| `IT` | **Infant/toddler** | Sin definición |
| `PR` | **Preschool** | Sin definición |
| `PK` | **Prekindergarten** | Sin definición |
| `TK` | **Transitional Kindergarten** | Sin definición |
| ... | *(+827 opciones adicionales)* | ... |

### 📊 RefIncidentBehavior
- **Cantidad de códigos definidos:** `30` opciones estándar

| Código CEDS | Nombre / Etiqueta | Descripción / Definición |
|---|---|---|
| `04618` | **Alcohol** | Alcohol related behavior associated with the incident. |
| `04625` | **Arson** | Arson is a behavior associated with the incident. |
| `04626` | **Attendance Policy Violation** | Attendance Policy Violation is a behavior associated with the incident. |
| `04632` | **Battery** | Battery is a behavior associated with the incident. |
| `04633` | **Burglary/Breaking and Entering** | Burglary/Breaking and Entering is a behavior associated with the incident. |
| `04634` | **Disorderly Conduct** | Disorderly Conduct is a behavior associated with the incident. |
| `04635` | **Drugs Excluding Alcohol and Tobacco** | Drugs Excluding Alcohol and Tobacco is a behavior associated with the incident. |
| `04645` | **Fighting** | Fighting is a behavior associated with the incident. |
| `13354` | **Harassment or bullying on the basis of disability** | Harassment or bullying on the basis of disability is a behavior associated with the incident. |
| `13355` | **Harassment or bullying on the basis of race, color, or national origin** | Harassment or bullying on the basis of race, color, or national origin is a behavior associated with the incident. |
| `13356` | **Harassment or bullying on the basis of sex** | Harassment or bullying on the basis of sex is a behavior associated with the incident. |
| `04646` | **Harassment, Nonsexual** | Harassment, Nonsexual is a behavior associated with the incident. |
| `04650` | **Harassment, Sexual** | Harassment, Sexual is a behavior associated with the incident. |
| `04651` | **Homicide** | Homicide is a behavior associated with the incident. |
| `04652` | **Inappropriate Use of Medication** | Inappropriate Use of Medication is a behavior associated with the incident. |
| `04659` | **Insubordination** | Insubordination is a behavior associated with the incident. |
| `04660` | **Kidnapping** | Kidnapping is a behavior associated with the incident. |
| `04661` | **Obscene Behavior** | Obscene Behavior is a behavior associated with the incident. |
| `04669` | **Physical Altercation, Minor** | Physical Altercation, Minor is a behavior associated with the incident. |
| `04670` | **Robbery** | Robbery is a behavior associated with the incident. |
| `04671` | **School Threat** | School Threat is a behavior associated with the incident. |
| `04677` | **Sexual Battery (sexual assault)** | Sexual Battery (sexual assault) is a behavior associated with the incident. |
| `04678` | **Sexual Offenses, Other (lewd behavior, indecent exposure)** | Sexual Offenses, Other (lewd behavior, indecent exposure) is a behavior associated with the incident. |
| `04682` | **Theft** | Theft is a behavior associated with the incident. |
| `04686` | **Threat/Intimidation** | Threat/Intimidation is a behavior associated with the incident. |
| ... | *(+5 opciones adicionales)* | ... |

### 📊 RefPersonIdentificationSystem
- **Cantidad de códigos definidos:** `52` opciones estándar

| Código CEDS | Nombre / Etiqueta | Descripción / Definición |
|---|---|---|
| `CanadianSIN` | **Canadian Social Insurance Number** | The related Child Identifier uses the child's Canadian Social Insurance Number. |
| `District` | **District-assigned number** | The related Child Identifier uses the child's District-assigned number. |
| `Family` | **Family unit number** | The related Child Identifier uses the child's Family unit number. |
| `Federal` | **Federal identification number** | The related Child Identifier uses the child's Federal identification number. |
| `NationalMigrant` | **National migrant number** | The related Child Identifier uses the child's National migrant number. |
| `School` | **School-assigned number** | The related Child Identifier uses the child's School-assigned number. |
| `SSN` | **Social Security Administration number** | The related Child Identifier uses the child's Social Security Administration number. |
| `State` | **State-assigned number** | The related Child Identifier uses the child's State-assigned number. |
| `StateMigrant` | **State migrant number** | The related Child Identifier uses the child's State migrant number. |
| `Program` | **Program-assigned number** | The related Child Identifier uses the child's Program-assigned number. |
| `SSN` | **Social Security Administration number** | The related Staff Identifier uses the staff member's Social Security Administration number. |
| `USVisa` | **US government Visa number** | The related Staff Identifier uses the staff member's US government Visa number. |
| `PIN` | **Personal identification number** | The related Staff Identifier uses the staff member's Personal identification number. |
| `Federal` | **Federal identification number** | The related Staff Identifier uses the staff member's Federal identification number. |
| `DriversLicense` | **Driver's license number** | The related Staff Identifier uses the staff member's Driver's license number. |
| `Medicaid` | **Medicaid number** | The related Staff Identifier uses the staff member's Medicaid number. |
| `HealthRecord` | **Health record number** | The related Staff Identifier uses the staff member's Health record number. |
| `ProfessionalCertificate` | **Professional certificate or license number** | The related Staff Identifier uses the staff member's Professional certificate or license number. |
| `School` | **School-assigned number** | The related Staff Identifier uses the staff member's School-assigned number. |
| `District` | **District-assigned number** | The related Staff Identifier uses the staff member's District-assigned number. |
| `State` | **State-assigned number** | The related Staff Identifier uses the staff member's State-assigned number. |
| `OtherFederal` | **Other federally assigned number** | The related Staff Identifier uses the staff member's Other federally assigned number. |
| `SelectiveService` | **Selective Service Number** | The related Staff Identifier uses the staff member's Selective Service Number. |
| `CanadianSIN` | **Canadian Social Insurance Number** | The related Staff Identifier uses the staff member's Canadian Social Insurance Number. |
| `Other` | **Other** | The related Staff Identifier is from an identification system not yet defined in CEDS. |
| ... | *(+27 opciones adicionales)* | ... |

### 📊 RefPersonRelationship
- **Cantidad de códigos definidos:** `30` opciones estándar

| Código CEDS | Nombre / Etiqueta | Descripción / Definición |
|---|---|---|
| `Aunt` | **Aunt** | The person is the learner's Aunt. |
| `Brother` | **Brother** | The person is the learner's Brother. |
| `BrotherInLaw` | **Brother-in-law** | The person is the learner's Brother-in-law. |
| `CourtAppointedGuardian` | **Court appointed guardian** | The person is the learner's court appointed guardian. |
| `Daughter` | **Daughter** | The person is the learner's Daughter. |
| `DaughterInLaw` | **Daughter-in-law** | The person is the learner's Aunt. |
| `Employer` | **Employer** | The person is the learner's Employer. |
| `Father` | **Father** | The person is the learner's Father. |
| `FathersSignificantOther` | **Father's significant other** | The person is the significant other of the learner's Father. |
| `FathersCivilPartner` | **Father's civil partner** | The person is a legal partner of the learner's father, established by a civil union other than marriage. |
| `FatherInLaw` | **Father-in-law** | The person is the father of the learner's spouse. |
| `Fiance` | **Fiance** | The person is  a man who is engaged to be married to the learner. |
| `Fiancee` | **Fiancee** | The person is  a woman who is engaged to be married to the learner. |
| `Friend` | **Friend** | The person is the learner's Friend. |
| `Grandfather` | **Grandfather** | The person is the learner's Grandfather. |
| `Grandmother` | **Grandmother** | The person is the learner's Grandmother. |
| `Husband` | **Husband** | The person is the learner's Husband. |
| `MothersSignificantOther` | **Mother's significant other** | The person is the significant other of the learner's Mother. |
| `Mother` | **Mother** | The person is the learner's Mother |
| `MothersCivilPartner` | **Mother's civil partner** | The person is a legal partner of the learner's mother, established by a civil union other than marriage. |
| `Nephew` | **Nephew** | The person is the learner's Nephew. |
| `Niece` | **Niece** | The person is the learner's Niece. |
| `Other` | **Other** | The person is related to the learner in a way not represented by other standard options. |
| `SignificantOther` | **Significant other** | The person is the Significant other of the learner. |
| `Sister` | **Sister** | The person is the learner's Sister. |
| ... | *(+5 opciones adicionales)* | ... |

### 📊 RefSex
- **Cantidad de códigos definidos:** `3` opciones estándar

| Código CEDS | Nombre / Etiqueta | Descripción / Definición |
|---|---|---|
| `Male` | **Male** | Male |
| `Female` | **Female** | Female |
| `NotSelected` | **Not selected** | Gender is not selected |

