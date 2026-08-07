'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/ede-supabase';
import { runEdeComplianceCheck, EdeValidationIssue } from '@/lib/ede-validator';
import AppLogo from '@/components/AppLogo';

const ANIO_ACTUAL = 2026;

export const dynamic = 'force-dynamic';

export default function AuditoriaEdePage() {
  // Contexto del establecimiento (simulado; en producción viene de localStorage/cookie)
  const rbdRaw = typeof window !== 'undefined'
    ? (localStorage.getItem('slep_sim_rbd') ?? document.cookie.match(/slep_sim_rbd=([^;]+)/)?.[1] ?? '10202')
    : '10202';
  const rbd = parseInt(rbdRaw, 10) || 10202;

  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<EdeValidationIssue[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'ERROR' | 'WARNING'>('ALL');

  const ejecutarDiagnostico = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const result = await runEdeComplianceCheck(supabase, rbd, anio);
      setIssues(result.issues);
      setHasRun(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ejecutarDiagnostico();
  }, [rbd, anio]);

  const numErrors = issues.filter((i) => i.severity === 'ERROR').length;
  const numWarnings = issues.filter((i) => i.severity === 'WARNING').length;

  const filteredIssues = issues.filter((i) => {
    if (filterSeverity === 'ALL') return true;
    return i.severity === filterSeverity;
  });

  // Calcular score representativo (Base: 4 reglas principales evaluadas)
  const totalReglas = 4;
  const score = Math.max(0, Math.round(((totalReglas - numErrors) / totalReglas) * 100));

  return (
    <>
      <style>{`
        .aud-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
          font-family: system-ui, -apple-system, sans-serif;
          color: #1e293b;
        }
        .aud-header {
          display: flex;
          align-items: center;
          justify-between;
          margin-bottom: 32px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 20px;
        }
        .aud-title-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .aud-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .aud-subtitle {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0;
        }
        .aud-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .aud-select {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background-color: white;
          font-size: 0.88rem;
          font-weight: 600;
          color: #475569;
        }
        .aud-btn {
          background-color: #0284c7;
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.3);
        }
        .aud-btn:hover {
          background-color: #0369a1;
          transform: translateY(-1px);
        }
        .aud-btn:disabled {
          background-color: #94a3b8;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .aud-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }
        .aud-kpi-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 1px 3px 0 rgba(0,0,0,0.05);
        }
        .aud-kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
        }
        .kpi-score::before { background-color: #0ea5e9; }
        .kpi-total::before { background-color: #64748b; }
        .kpi-errors::before { background-color: #ef4444; }
        .kpi-warnings::before { background-color: #f59e0b; }
        
        .aud-kpi-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.05em;
        }
        .aud-kpi-value {
          font-size: 2.25rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1;
        }
        .aud-kpi-desc {
          font-size: 0.78rem;
          color: #94a3b8;
        }
        .aud-section-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .aud-filters {
          display: flex;
          gap: 8px;
        }
        .filter-chip {
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
        }
        .filter-chip.active {
          background: #0f172a;
          color: white;
          border-color: #0f172a;
        }
        .issue-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 12px;
          transition: all 0.2s;
          box-shadow: 0 1px 2px 0 rgba(0,0,0,0.02);
        }
        .issue-card:hover {
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          border-color: #cbd5e1;
        }
        .issue-badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          flex-shrink: 0;
        }
        .badge-error {
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fecaca;
        }
        .badge-warning {
          background: #fffbeb;
          color: #d97706;
          border: 1px solid #fef3c7;
        }
        .issue-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .issue-rule {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .issue-table-badge {
          background: #f1f5f9;
          color: #475569;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.68rem;
          font-family: monospace;
        }
        .issue-message {
          font-size: 0.88rem;
          color: #334155;
          font-weight: 500;
          line-height: 1.4;
        }
        .issue-id {
          font-size: 0.72rem;
          color: #94a3b8;
          font-family: monospace;
        }
        .empty-state {
          text-align: center;
          padding: 64px 32px;
          background: white;
          border: 2px dashed #cbd5e1;
          border-radius: 20px;
          color: #64748b;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .passed-state {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }
        .passed-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #14532d;
          margin: 0;
        }
        .passed-desc {
          font-size: 0.88rem;
          color: #15803d;
          max-width: 460px;
          margin: 0;
          line-height: 1.4;
        }
      `}</style>

      <div className="aud-container">
        {/* Header */}
        <header className="aud-header">
          <div className="aud-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Link href="/escuela" style={{ textDecoration: 'none', color: '#0284c7', fontSize: '0.82rem', fontWeight: 'bold' }}>
                ← Volver al Panel
              </Link>
            </div>
            <h1 className="aud-title">🩺 Pre-auditoría EDE MINEDUC</h1>
            <p className="aud-subtitle">Estándar CEDS v7.1 + Extensiones Chile · Circular N°1 Superintendencia de Educación</p>
          </div>

          <div className="aud-controls">
            <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#64748b' }}>Periodo:</span>
            <select 
              className="aud-select" 
              value={anio} 
              onChange={(e) => setAnio(parseInt(e.target.value, 10))}
              disabled={loading}
            >
              <option value={2026}>Año Escolar 2026</option>
              <option value={2025}>Año Escolar 2025</option>
            </select>
            <button 
              className="aud-btn" 
              onClick={ejecutarDiagnostico} 
              disabled={loading}
            >
              {loading ? '⟳ Diagnosticando...' : '🔍 Ejecutar Diagnóstico'}
            </button>
          </div>
        </header>

        {/* KPI Scorecards */}
        {hasRun && (
          <div className="aud-kpi-grid">
            <div className="aud-kpi-card kpi-score">
              <span className="aud-kpi-label">Conformidad EDE</span>
              <span className="aud-kpi-value">{score}%</span>
              <span className="aud-kpi-desc">Nivel de cumplimiento de reglas</span>
            </div>
            <div className="aud-kpi-card kpi-total">
              <span className="aud-kpi-label">Problemas Detectados</span>
              <span className="aud-kpi-value">{issues.length}</span>
              <span className="aud-kpi-desc">Total de inconsistencias</span>
            </div>
            <div className="aud-kpi-card kpi-errors">
              <span className="aud-kpi-label">Errores Críticos</span>
              <span className="aud-kpi-value" style={{ color: numErrors > 0 ? '#ef4444' : '#0f172a' }}>
                {numErrors}
              </span>
              <span className="aud-kpi-desc">Bloquean la fiscalización</span>
            </div>
            <div className="aud-kpi-card kpi-warnings">
              <span className="aud-kpi-label">Advertencias</span>
              <span className="aud-kpi-value" style={{ color: numWarnings > 0 ? '#f59e0b' : '#0f172a' }}>
                {numWarnings}
              </span>
              <span className="aud-kpi-desc">Observaciones de consistencia</span>
            </div>
          </div>
        )}

        {/* Diagnostics Results List */}
        {hasRun && (
          <div style={{ marginTop: 40 }}>
            <h2 className="aud-section-title">
              <span>📋 Resultados del Análisis</span>
              {issues.length > 0 && (
                <div className="aud-filters">
                  <button 
                    className={`filter-chip ${filterSeverity === 'ALL' ? 'active' : ''}`}
                    onClick={() => setFilterSeverity('ALL')}
                  >
                    Todos ({issues.length})
                  </button>
                  <button 
                    className={`filter-chip ${filterSeverity === 'ERROR' ? 'active' : ''}`}
                    onClick={() => setFilterSeverity('ERROR')}
                    style={{ borderLeft: '3px solid #ef4444' }}
                  >
                    Errores ({numErrors})
                  </button>
                  <button 
                    className={`filter-chip ${filterSeverity === 'WARNING' ? 'active' : ''}`}
                    onClick={() => setFilterSeverity('WARNING')}
                    style={{ borderLeft: '3px solid #f59e0b' }}
                  >
                    Advertencias ({numWarnings})
                  </button>
                </div>
              )}
            </h2>

            {issues.length === 0 ? (
              <div className="empty-state passed-state">
                <div style={{ fontSize: '3.5rem' }}>✅</div>
                <h3 className="passed-title">¡Libro Digital Cumple al 100%!</h3>
                <p className="passed-desc">
                  No se detectaron inconsistencias estructurales ni violaciones a las reglas de negocio del MINEDUC en la base de datos de este RBD. Tu Libro de Clases está listo para exportación.
                </p>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: '2.5rem' }}>🔍</div>
                <p style={{ fontWeight: 'bold' }}>Sin resultados que coincidan con el filtro seleccionado</p>
              </div>
            ) : (
              <div>
                {filteredIssues.map((issue, idx) => (
                  <div key={`${issue.ruleId}-${idx}`} className="issue-card">
                    <span className={`issue-badge ${issue.severity === 'ERROR' ? 'badge-error' : 'badge-warning'}`}>
                      {issue.severity}
                    </span>
                    <div className="issue-content">
                      <div className="issue-rule">
                        <span style={{ fontWeight: 800, color: '#475569' }}>{issue.ruleId}</span>
                        <span className="issue-table-badge">Tabla: {issue.table}</span>
                      </div>
                      <div className="issue-message">{issue.message}</div>
                      {issue.affectedRecordId && (
                        <div className="issue-id">ID de Registro: {issue.affectedRecordId}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading state placeholder */}
        {loading && !hasRun && (
          <div className="empty-state">
            <div style={{ fontSize: '3rem', animation: 'spin 2s linear infinite' }}>⟳</div>
            <p style={{ fontWeight: 'bold' }}>Analizando base de datos y relaciones de matrícula...</p>
          </div>
        )}
      </div>
    </>
  );
}
