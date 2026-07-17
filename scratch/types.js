"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CARGOS_DOCENTES_LIST = void 0;
exports.normalizarCargoDocente = normalizarCargoDocente;
exports.CARGOS_DOCENTES_LIST = [
    'DOCENTE DE AULA',
    'DOCENTE DIFERENCIAL',
    'DIRECTOR/A',
    'JEFE/A UTP',
    'DOCENTE ENCARGADO',
    'EDUCADORA DE PARVULOS',
    'INSPECTOR/A GENERAL',
    'DOCENTE TECNICO',
    'COORDINADOR/A PIE',
    'ORIENTADOR/A',
    'ENCARGADO/A DE CONVIVENCIA',
    'OTRO'
];
function normalizarCargoDocente(rawCargo) {
    if (!rawCargo)
        return 'DOCENTE DE AULA';
    const clean = rawCargo.trim().toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove accents
    if (clean.includes("DOCENTE DE AULA") || clean.includes("AULA") || clean.includes("DOCENTE AULA") || clean.includes("PROFESOR DE AULA") || clean.includes("DOCENTE BASICA") || clean.includes("DOCENTE MEDIA")) {
        return "DOCENTE DE AULA";
    }
    if (clean.includes("DOCENTE DIFERENCIAL") || clean.includes("DIFERENCIAL") || clean.includes("PSICOPEDAGOGO") || clean.includes("EDUCADORA DIFERENCIAL") || clean.includes("PSICOPEDAGOGA")) {
        return "DOCENTE DIFERENCIAL";
    }
    if (clean.includes("DIRECTOR") || clean.includes("DIRECTORA")) {
        return "DIRECTOR/A";
    }
    if (clean.includes("JEFE UTP") || clean.includes("JEFE/A UTP") || clean.includes("JEFA UTP") || clean.includes("JEFE DE UTP") || clean.includes("JEFE U.T.P.") || clean.includes("UTP")) {
        return "JEFE/A UTP";
    }
    if (clean.includes("DOCENTE ENCARGADO") || (clean.includes("ENCARGADO") && clean.includes("DOCENTE"))) {
        return "DOCENTE ENCARGADO";
    }
    if (clean.includes("PARVULO") || clean.includes("EDUCADORA DE PARVULOS") || clean.includes("EDUCADORA PARVULO")) {
        return "EDUCADORA DE PARVULOS";
    }
    if (clean.includes("INSPECTOR GENERAL") || clean.includes("INSPECTOR/A GENERAL") || clean.includes("INSPECTORA GENERAL")) {
        return "INSPECTOR/A GENERAL";
    }
    if (clean.includes("DOCENTE TECNICO") || clean.includes("TECNICO") || clean.includes("TECNICA")) {
        return "DOCENTE TECNICO";
    }
    if (clean.includes("COORDINADOR PIE") || clean.includes("COORDINADOR/A PIE") || (clean.includes("PIE") && clean.includes("COORDINAD"))) {
        return "COORDINADOR/A PIE";
    }
    if (clean.includes("ORIENTADOR") || clean.includes("ORIENTADORA")) {
        return "ORIENTADOR/A";
    }
    if (clean.includes("CONVIVENCIA") || clean.includes("CONVIVENCIA ESCOLAR") || clean.includes("ENCARGADO DE CONVIVENCIA") || clean.includes("ENCARGADA DE CONVIVENCIA")) {
        return "ENCARGADO/A DE CONVIVENCIA";
    }
    // Return the original clean uppercase version if it doesn't match, or return rawCargo
    return rawCargo;
}
