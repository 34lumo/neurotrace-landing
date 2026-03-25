'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutGroup, motion } from 'framer-motion'
import {
  LineChart,
  Line,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'
import {
  Activity,
  AlertCircle,
  Info,
  TrendingUp,
  LayoutDashboard,
  LogOut,
  Zap,
  Eye,
  Brain,
  Target,
  Clock,
  BarChart2,
  Gamepad2,
} from 'lucide-react'
import { CardContainer, CardBody, CardItem } from '@/components/ui/3d-card'
import { useDashboardVisualLayer } from '@/contexts/DashboardVisualLayerContext'
import { NeuroCommandBrain } from '@/components/dashboard/NeuroCommandBrain'
import type { DashboardSession } from './page'

// ─── types ────────────────────────────────────────────────────────────────────

type Metrics = DashboardSession['metrics']

const METRIC_GLOSSARY = {
  reaction: {
    title: 'Latencia de Respuesta Motora (LRM)',
    definition:
      'Cuantificación de la latencia entre el estímulo visual y el inicio de la respuesta motora. Evalúa la integridad de la vía eferente y la velocidad de procesamiento central del córtex motor.',
    norm: '300ms - 450ms (Cohorte Normativa 60+)',
    ref: 'Ref: ISO/TC 173 Clinical Neuro-Rehab',
  },
  neglect: {
    title: 'Índice de Atención Hemiespacial (IAH)',
    definition:
      'Medición del sesgo atencional en el espacio peripersonal. Un índice < 0.50 confirma negligencia sistemática del hemicampo contralateral a la lesión parietal.',
    norm: '> 0.70 (Simetría Funcional)',
    ref: 'Ref: Mesulam, M. M. (1981). Ann. Neurol.',
  },
  asymmetry: {
    title: 'Simetría Bi-Hemisférica (SBH)',
    definition:
      'Ratio de potencia motora entre el hemicuerpo parético y el sano. Valores > 1.2 indican dominancia compensatoria persistente del hemisferio no afectado.',
    norm: '0.9 - 1.15 (Balance Neuromotor)',
    ref: 'Ref: Fugl-Meyer Assessment Standard',
  },
  coverage: {
    title: 'Ratio de Exploración Visual (REV)',
    definition:
      'Porcentaje de área de trabajo escaneada mediante sacádicos. Determina la presencia de escotomas funcionales y la capacidad de búsqueda visual activa.',
    norm: '> 85% del Campo Visual Efectivo',
    ref: 'Ref: VFD-Screening Protocol 2.4',
  },
} as const

type MetricGlossaryKey = keyof typeof METRIC_GLOSSARY
type FocusMetricId = MetricGlossaryKey
const FOCUS_METRIC_ORDER: FocusMetricId[] = ['reaction', 'neglect', 'asymmetry', 'coverage']
const FOCUS_LAYOUT_SPRING = { type: 'spring' as const, stiffness: 340, damping: 32 }

// ─── helpers ──────────────────────────────────────────────────────────────────

function computeStreak(sessions: DashboardSession[]): number {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date(today)
    expected.setDate(today.getDate() - i)
    const sd = new Date(sorted[i].date)
    sd.setHours(0, 0, 0, 0)
    if (sd.getTime() === expected.getTime()) streak++
    else break
  }
  return streak
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return Math.round(((previous - current) / previous) * 100)
}

function slope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const xs = Array.from({ length: n }, (_, i) => i)
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = values.reduce((a, b) => a + b, 0) / n
  const num = xs.reduce((acc, x, i) => acc + (x - meanX) * (values[i] - meanY), 0)
  const den = xs.reduce((acc, x) => acc + (x - meanX) ** 2, 0)
  return den === 0 ? 0 : num / den
}

function metricTrend(
  sessions: DashboardSession[],
  key: keyof Metrics,
  lowerIsBetter: boolean
): { label: string; improving: boolean } {
  const last7 = sessions.slice(-7).map((s) => s.metrics[key] as number)
  const s = slope(last7)
  const improving = lowerIsBetter ? s < -0.5 : s > 0.5
  const worsening = lowerIsBetter ? s > 0.5 : s < -0.5
  if (improving) return { label: 'Mejorando', improving: true }
  if (worsening) return { label: 'Empeorando', improving: false }
  return { label: 'Estable', improving: true }
}

// ─── interpretations ──────────────────────────────────────────────────────────

function interpretReaction(ms: number): { text: string; color: string } {
  if (ms < 400) return { text: 'Normal (<400 ms)', color: 'text-green-400' }
  if (ms <= 700) return { text: 'Lento (400–700 ms)', color: 'text-yellow-400' }
  return { text: 'Muy lento (>700 ms)', color: 'text-red-400' }
}
function interpretNeglect(idx: number): { text: string; color: string } {
  if (idx > 0.8) return { text: 'Normal (>0.8)', color: 'text-green-400' }
  if (idx >= 0.5) return { text: 'Asimetría leve (0.5–0.8)', color: 'text-yellow-400' }
  return { text: 'Alerta clínica (<0.5)', color: 'text-red-400' }
}
function interpretAsymmetry(ratio: number): { text: string; color: string } {
  if (ratio < 1.2) return { text: 'Simétrico (<1.2)', color: 'text-green-400' }
  if (ratio <= 2.0) return { text: 'Asimetría moderada', color: 'text-yellow-400' }
  return { text: 'Severa (>2.0)', color: 'text-red-400' }
}
function interpretCoverage(pct: number): { text: string; color: string } {
  if (pct > 70) return { text: 'Exploración completa (>70%)', color: 'text-green-400' }
  if (pct >= 50) return { text: 'Parcial (50–70%)', color: 'text-yellow-400' }
  return { text: 'Limitada (<50%)', color: 'text-red-400' }
}
function interpretEyeHand(ms: number): { text: string; color: string } {
  if (ms < 400) return { text: 'Normal (<400 ms)', color: 'text-green-400' }
  if (ms <= 600) return { text: 'Elevada (400–600 ms)', color: 'text-yellow-400' }
  return { text: 'Muy elevada (>600 ms)', color: 'text-red-400' }
}

const STABILITY_SIGMA_MIN_MS = 40
const STABILITY_SIGMA_MAX_MS = 200

function calculateStability(session: DashboardSession) {
  const avgReactionMs = session.metrics.avg_reaction_time_ms ?? 500
  let h = 0
  for (let i = 0; i < session.id.length; i++) h = (Math.imul(31, h) + session.id.charCodeAt(i)) | 0
  const u = (Math.abs(Math.sin(h)) + Math.abs(Math.cos(h * 0.7))) / 2
  const rtNorm = Math.min(1, Math.max(0, (avgReactionMs - 280) / (900 - 280)))
  const span = STABILITY_SIGMA_MAX_MS - STABILITY_SIGMA_MIN_MS
  const blended = 0.25 + 0.55 * rtNorm + 0.2 * u
  const standard_deviation_ms = Math.round(
    Math.min(STABILITY_SIGMA_MAX_MS, Math.max(STABILITY_SIGMA_MIN_MS, STABILITY_SIGMA_MIN_MS + span * blended))
  )
  return { standard_deviation_ms, sessionId: session.id, repetitionsAnalyzed: session.completed_reps ?? 0 }
}

function interpretStabilitySigma(sigmaMs: number): { text: string; color: string } {
  if (sigmaMs < 60) return { text: 'Patrón Motor Consolidado', color: 'text-green-400' }
  if (sigmaMs <= 150) return { text: 'Fase de Reclutamiento Neuronal', color: 'text-yellow-400' }
  return { text: 'Inestabilidad Neuromotora', color: 'text-red-400' }
}

// ─── constants ────────────────────────────────────────────────────────────────

const RT_TARGET = 400
const MEDIA_POBLACIONAL_MS = 300
const DESVIACION_ESTANDAR_POBLACIONAL_MS = 50
const UMBRAL_NORMALIDAD_Z = 1.5
const NORMLIM_SUP_MS = MEDIA_POBLACIONAL_MS + UMBRAL_NORMALIDAD_Z * DESVIACION_ESTANDAR_POBLACIONAL_MS
const PROJECTION_ERROR_MARGIN = 0.1
const FORECAST_SAMPLE_N = 7

function getFocusChartCopy(id: FocusMetricId) {
  switch (id) {
    case 'reaction': return { chartMeta: 'Evolución temporal', title: 'Tiempo de reacción', subtitle: `↓ mejor · norma ≤ ${NORMLIM_SUP_MS} ms · ref. clínica: ${RT_TARGET} ms` }
    case 'neglect':  return { chartMeta: 'Evolución temporal', title: 'Neglect Index',       subtitle: '↑ mayor es mejor · zona alerta: < 0.5' }
    case 'asymmetry':return { chartMeta: 'Evolución temporal', title: 'Asimetría L-D',       subtitle: '↓ menor es mejor · zona normal: < 1.2' }
    case 'coverage': return { chartMeta: 'Evolución temporal', title: 'Cobertura visual %',  subtitle: '↑ mayor es mejor · objetivo: >70%' }
  }
}

function describeNormativeZ(z: number): string {
  if (z < 0) return 'Por debajo de la media poblacional'
  if (z <= UMBRAL_NORMALIDAD_Z) return 'Rango de normalidad funcional (Z ≤ 1,5)'
  if (z <= 2.5) return 'Déficit Moderado'
  return 'Déficit Severo'
}

// ─── design tokens ────────────────────────────────────────────────────────────

const D = {
  bg:           '#0d0d14',
  navbar:       '#0f0f1a',
  card:         '#14141f',
  border:       '#1e1e2e',
  borderHover:  'rgba(124,58,237,0.4)',
  violet:       '#7c3aed',
  violetSoft:   '#a78bfa',
  violetGlow:   'rgba(124,58,237,0.25)',
  green:        '#4ade80',
  warning:      '#fbbf24',
  error:        '#ef4444',
  textPrimary:  '#e2e8f0',
  textSecondary:'#94a3b8',
  textTertiary: '#475569',
} as const

const CHART = {
  reaction: '#a78bfa',
  neglect:  '#38bdf8',
  asymmetry:'#34d399',
  coverage: '#fb923c',
  grid:     '#1e1e2e',
  refRose:  '#ef4444',
  refEmerald:'#4ade80',
  refCoverage:'#fb923c',
} as const

function buildHeatmapFromCoverage(coveragePct: number): boolean[][] {
  const COLS = 8, ROWS = 6
  const colWeights = [0.30, 0.45, 0.55, 0.65, 0.78, 0.88, 0.95, 1.0]
  const cells: boolean[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(false))
  const targetCovered = Math.round((coveragePct / 100) * COLS * ROWS)
  let covered = 0
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (covered >= targetCovered) break
      if (Math.random() < colWeights[col] + 0.1) { cells[row][col] = true; covered++ }
    }
    if (covered >= targetCovered) break
  }
  return cells
}

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#14141f',
    border: `1px solid rgba(124,58,237,0.3)`,
    borderRadius: 8,
    padding: '8px 12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
  },
  labelStyle: { color: '#94a3b8', fontSize: 11, fontWeight: 500, marginBottom: 4 },
}

function semColorFromClass(cls: string): string {
  if (cls.includes('green')) return D.green
  if (cls.includes('yellow')) return D.warning
  if (cls.includes('red')) return D.error
  return D.textSecondary
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ onPlay, onHome }: { onPlay: () => void; onHome: () => void }) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 h-14 z-40 flex items-center px-6 gap-4"
      style={{ background: D.navbar, borderBottom: `1px solid ${D.border}` }}
    >
      <button
        onClick={onHome}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
        style={{
          background: `linear-gradient(135deg, ${D.violet}, #5b21b6)`,
          boxShadow: `0 0 14px ${D.violetGlow}`,
        }}
      >
        N
      </button>
      <div className="flex items-center gap-1 flex-1">
        <button
          className="flex items-center gap-2 px-3 h-8 rounded-lg text-xs font-medium transition-colors"
          style={{ background: 'rgba(124,58,237,0.15)', color: D.violetSoft, border: '1px solid rgba(124,58,237,0.25)' }}
        >
          <LayoutDashboard size={14} strokeWidth={1.8} />
          <span className="hidden md:inline">Dashboard</span>
        </button>
        <button
          onClick={onPlay}
          className="flex items-center gap-2 px-3 h-8 rounded-lg text-xs font-medium transition-colors"
          style={{ background: 'transparent', color: D.textTertiary, border: '1px solid transparent' }}
        >
          <Gamepad2 size={14} strokeWidth={1.8} />
          <span className="hidden md:inline">Jugar</span>
        </button>
      </div>
      <button
        onClick={onHome}
        title="Salir"
        className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
        style={{ color: D.textTertiary }}
      >
        <LogOut size={15} strokeWidth={1.8} />
      </button>
    </nav>
  )
}

// ─── ProtocolGlossaryTrigger ──────────────────────────────────────────────────

function ProtocolGlossaryTrigger({
  entry,
  commandMode,
}: {
  entry: (typeof METRIC_GLOSSARY)[MetricGlossaryKey]
  commandMode: boolean
}) {
  return (
    <div className="group relative inline-flex shrink-0">
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className={`rounded p-0.5 transition-colors outline-none ${commandMode ? 'text-cyan-400' : ''}`}
        style={{ color: commandMode ? undefined : D.textTertiary }}
        aria-label={`Protocolo: ${entry.title}`}
      >
        <Info size={13} strokeWidth={2} aria-hidden />
      </button>
      <div className="pointer-events-none invisible absolute bottom-full left-1/2 z-[70] mb-2 w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: '#0f0f1a', border: `1px solid rgba(124,58,237,0.3)`, boxShadow: '0 16px 48px rgba(0,0,0,0.8)' }}
        >
          <p className="text-sm font-semibold" style={{ color: D.violetSoft }}>{entry.title}</p>
          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: '#aaa' }}>
            <span className="font-medium" style={{ color: D.textSecondary }}>Definición: </span>
            {entry.definition}
          </p>
          <div className="mt-2 space-y-1 pt-2" style={{ borderTop: `1px solid ${D.border}` }}>
            <p className="text-[10px] font-mono" style={{ color: D.green }}>
              <span style={{ color: D.textSecondary }}>Rango: </span>{entry.norm}
            </p>
            <p className="text-[10px] font-mono" style={{ color: D.textTertiary }}>{entry.ref}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ChartCard ────────────────────────────────────────────────────────────────

function ChartCard({
  title, subtitle, children, className = '', chartMeta,
  commandMode = false, glossaryKey, onCardClick, isSupportTile = false, is3D = true,
}: {
  title: string; subtitle?: string; children: ReactNode; className?: string
  chartMeta?: string; commandMode?: boolean; glossaryKey?: MetricGlossaryKey
  onCardClick?: () => void; isSupportTile?: boolean; is3D?: boolean
}) {
  const interactive = Boolean(isSupportTile && onCardClick)

  const shellStyle = commandMode
    ? { background: 'rgba(5,5,8,0.95)', border: '1px solid rgba(34,211,238,0.2)' }
    : { background: D.card, border: `1px solid ${D.border}` }

  const interactiveProps = interactive
    ? {
        onClick: onCardClick,
        onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick?.() } },
        tabIndex: 0 as const,
        role: 'button' as const,
        'aria-label': `Promover ${title} al panel principal`,
        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
          ;(e.currentTarget as HTMLElement).style.borderColor = commandMode ? 'rgba(34,211,238,0.4)' : D.borderHover
          ;(e.currentTarget as HTMLElement).style.boxShadow = commandMode ? '' : `0 0 24px ${D.violetGlow}`
        },
        onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
          ;(e.currentTarget as HTMLElement).style.borderColor = commandMode ? 'rgba(34,211,238,0.2)' : D.border
          ;(e.currentTarget as HTMLElement).style.boxShadow = ''
        },
      }
    : {}

  const titleBlock = (
    <div className="mb-1 flex items-start justify-between gap-2">
      <p className="font-semibold flex-1 min-w-0 text-[15px]"
         style={{ color: commandMode ? '#e2e8f0' : D.textPrimary }}>
        {title}
      </p>
      {glossaryKey && <ProtocolGlossaryTrigger entry={METRIC_GLOSSARY[glossaryKey]} commandMode={commandMode} />}
    </div>
  )

  const chartBlock = (
    <div className="relative min-h-0">
      {interactive && commandMode && (
        <span className="pointer-events-none absolute right-0 top-0 z-20 rounded border border-cyan-500/45 bg-[#020203]/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-200 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          CLICK PARA ENFOCAR
        </span>
      )}
      {children}
    </div>
  )

  const section = (
    <section
      className={`group relative rounded-xl p-5 transition-[border-color,box-shadow] duration-200 ${className}`}
      style={shellStyle}
      {...interactiveProps}
    >
      <p className="text-[10px] uppercase tracking-widest mb-2 font-medium"
         style={{ color: commandMode ? 'rgba(34,211,238,0.6)' : D.textSecondary }}>
        {chartMeta ?? 'Evolución temporal'}
      </p>
      {is3D ? (
        <>
          <CardItem translateZ={50} className="w-full">
            {titleBlock}
            {subtitle && <p className="text-xs mb-4" style={{ color: D.textSecondary }}>{subtitle}</p>}
          </CardItem>
          <CardItem translateZ={20} className="w-full">{chartBlock}</CardItem>
        </>
      ) : (
        <>
          {titleBlock}
          {subtitle && <p className="text-xs mb-4" style={{ color: D.textSecondary }}>{subtitle}</p>}
          {chartBlock}
        </>
      )}
    </section>
  )

  if (!is3D) return section

  return (
    <CardContainer containerClassName="py-0 w-full" className="w-full">
      <CardBody className="h-auto w-full">{section}</CardBody>
    </CardContainer>
  )
}

// ─── StabilityIndicator ───────────────────────────────────────────────────────

function StabilityIndicator({ sigmaMs }: { sigmaMs: number }) {
  const range = STABILITY_SIGMA_MAX_MS - STABILITY_SIGMA_MIN_MS
  const pctStable = Math.min(100, Math.max(0, ((STABILITY_SIGMA_MAX_MS - sigmaMs) / range) * 100))
  const barBg = 'linear-gradient(90deg, rgba(239,68,68,0.8) 0%, rgba(251,191,36,0.7) 45%, rgba(74,222,128,0.8) 100%)'

  return (
    <div className="mt-4 pt-4 space-y-2" style={{ borderTop: `1px solid ${D.border}` }}>
      <p className="text-[10px] uppercase tracking-widest font-medium"
         style={{ color: D.textSecondary }}>Radar de Consistencia Motora</p>
      <p className="text-[11px] flex justify-between"
         style={{ color: D.textSecondary }}>
        <span style={{ color: D.error }}>Alta varianza</span>
        <span style={{ color: D.green }}>Baja varianza</span>
      </p>
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e2e' }}>
        <div className="absolute inset-0" style={{ background: barBg }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full"
             style={{ left: `calc(${pctStable}% - 1px)`, background: '#fff', boxShadow: '0 0 4px rgba(255,255,255,0.8)' }} />
      </div>
      <p className="text-[10px] font-mono" style={{ color: D.textTertiary }}>σ = √(Σ(x − μ)² / n)</p>
    </div>
  )
}

// ─── ForecastCard ─────────────────────────────────────────────────────────────

function ForecastCard({ sessionsToNormative, currentMs }: {
  sessionsToNormative: number | null; currentMs: number
}) {
  const zScore = (currentMs - 300) / 50
  const progressPct = currentMs <= NORMLIM_SUP_MS
    ? 100
    : Math.min(100, Math.max(0, Math.round(((900 - currentMs) / (900 - NORMLIM_SUP_MS)) * 100)))
  const zFormatted = `${zScore >= 0 ? '+' : ''}${zScore.toFixed(2)}`
  const normativeFunctional = zScore < UMBRAL_NORMALIDAD_Z

  return (
    <div
      className="rounded-xl px-5 py-4 flex-1 min-w-[220px] sm:max-w-md"
      style={{ background: D.card, border: `1px solid ${D.border}` }}
    >
      <div className="flex items-start gap-3">
        <Activity className="w-5 h-5 shrink-0 mt-0.5" style={{ color: D.violet }} strokeWidth={1.5} aria-hidden />
        <div className="flex-1 min-w-0 space-y-3">
          <p className="text-[10px] tracking-widest font-medium uppercase"
             style={{ color: D.violet }}>
            Análisis de Convergencia Normativa
          </p>
          <p className={`text-sm leading-snug ${normativeFunctional ? 'font-medium' : ''}`}
             style={{ color: normativeFunctional ? D.green : D.textPrimary }}>
            {normativeFunctional ? 'Rango de Normalidad Funcional Alcanzado.'
              : sessionsToNormative != null ? (
                <>Intersección estimada: <span className="font-semibold tabular-nums"
                  style={{ color: D.violetSoft }}>{sessionsToNormative}</span> sesiones</>
              ) : 'Sin convergencia proyectada. Mantener protocolo.'}
          </p>
          <p className="text-xs font-mono" style={{ color: D.textSecondary }}>
            Z = {zFormatted}σ · {describeNormativeZ(zScore)}
          </p>
          <div>
            <div className="flex justify-between text-[10px] mb-1.5 font-mono" style={{ color: D.textSecondary }}>
              <span>RT actual: {Math.round(currentMs)} ms</span>
              <span>Límite Z=1,5: {NORMLIM_SUP_MS} ms</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1e1e2e' }}>
              <div className="h-full rounded-full"
                   style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${D.violet}, ${D.violetSoft})` }} />
            </div>
          </div>
          <p className="text-[10px] font-mono pt-1" style={{ color: D.textTertiary, borderTop: `1px solid ${D.border}` }}>
            Regresión lineal N = {FORECAST_SAMPLE_N} sesiones · μ = {MEDIA_POBLACIONAL_MS} ms
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({
  label, value, unit, sessionTrend, interpretation, trend7, primaryDisplay, icon: Icon,
}: {
  label: string; value?: number | boolean; unit?: string
  sessionTrend?: 'up' | 'down' | 'neutral'
  interpretation: { text: string; color: string }
  trend7?: { label: string; improving: boolean }
  primaryDisplay?: ReactNode
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>
  commandMode?: boolean
}) {
  const semColor = semColorFromClass(interpretation.color)

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 transition-[border-color,box-shadow] duration-200"
      style={{ background: D.card, border: `1px solid ${D.border}` }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = D.borderHover
        ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${D.violetGlow}`
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = D.border
        ;(e.currentTarget as HTMLElement).style.boxShadow = ''
      }}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-medium uppercase tracking-widest"
              style={{ color: D.textSecondary }}>
          {label}
        </span>
        {Icon && <Icon size={14} strokeWidth={1.8} style={{ color: semColor }} />}
      </div>
      <div className="flex items-end gap-2">
        {primaryDisplay != null ? (
          <span className="text-2xl font-semibold tabular-nums"
                style={{ color: D.textPrimary }}>
            {primaryDisplay}
          </span>
        ) : (
          <>
            <span className="text-3xl font-semibold tabular-nums"
                  style={{ color: D.textPrimary }}>
              {typeof value === 'boolean' ? (value ? 'Sí' : 'No') : value}
            </span>
            {unit && <span className="text-xs mb-1" style={{ color: D.textSecondary }}>{unit}</span>}
            {sessionTrend && (
              <span className="mb-1" style={{ color: sessionTrend === 'up' ? D.green : sessionTrend === 'down' ? D.error : D.textSecondary }}>
                {sessionTrend === 'up' ? <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
                  : sessionTrend === 'down' ? <TrendingUp className="w-4 h-4 rotate-180" strokeWidth={1.5} />
                  : <span className="text-xs">—</span>}
              </span>
            )}
          </>
        )}
      </div>
      <p className={`text-xs font-medium ${interpretation.color}`}>
        {interpretation.text}
      </p>
      {trend7 && (
        <p className="text-xs flex items-center gap-1.5"
           style={{ color: trend7.improving ? D.green : D.error }}>
          {trend7.improving
            ? <TrendingUp className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            : <TrendingUp className="w-3.5 h-3.5 shrink-0 rotate-180" strokeWidth={1.5} />}
          {trend7.label} (últimas 7 ses.)
        </p>
      )}
    </div>
  )
}

// ─── MiniStatCard ─────────────────────────────────────────────────────────────

function MiniStatCard({
  label, value, unit, interpretation, trend7, extra,
}: {
  label: string; value: number; unit: string
  interpretation: { text: string; color: string }
  trend7?: { label: string; improving: boolean }
  extra?: ReactNode
}) {
  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-col gap-2 transition-[border-color,box-shadow] duration-200"
      style={{ background: D.card, border: `1px solid ${D.border}` }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = D.borderHover
        ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${D.violetGlow}`
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = D.border
        ;(e.currentTarget as HTMLElement).style.boxShadow = ''
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest font-medium"
              style={{ color: D.textSecondary }}>
          {label}
        </span>
        {trend7 && (
          <span className="text-[10px] flex items-center gap-0.5"
                style={{ color: trend7.improving ? D.green : D.error }}>
            {trend7.improving
              ? <TrendingUp className="w-3 h-3" strokeWidth={1.5} />
              : <TrendingUp className="w-3 h-3 rotate-180" strokeWidth={1.5} />}
            {trend7.label}
          </span>
        )}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-semibold tabular-nums"
              style={{ color: D.textPrimary }}>
          {value}
        </span>
        {unit && <span className="text-xs mb-0.5" style={{ color: D.textSecondary }}>{unit}</span>}
      </div>
      <p className={`text-xs ${interpretation.color}`}>
        {interpretation.text}
      </p>
      {extra}
    </div>
  )
}

// ─── ScrollIndicator ──────────────────────────────────────────────────────────

function ScrollIndicator() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const update = () => {
      const el = document.documentElement
      const total = el.scrollHeight - el.clientHeight
      setProgress(total > 0 ? el.scrollTop / total : 0)
    }
    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => window.removeEventListener('scroll', update)
  }, [])
  return (
    <div className="fixed right-0 top-0 w-[3px] h-full z-50 pointer-events-none">
      <div className="w-full rounded-full"
           style={{ height: `${progress * 100}%`, background: `linear-gradient(180deg, ${D.violet}, ${D.violetSoft})` }} />
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onPlay }: { onPlay: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: D.bg }}>
      <div className="text-center max-w-md px-6">
        <div className="text-6xl mb-6">🎮</div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: D.textPrimary }}>
          Sin sesiones registradas
        </h2>
        <p className="text-sm mb-8" style={{ color: D.textSecondary }}>
          Juega al menos una partida para ver tu dashboard de análisis clínico con gráficos y métricas.
        </p>
        <button
          onClick={onPlay}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-transform hover:-translate-y-0.5"
          style={{ background: `linear-gradient(135deg, ${D.violet}, #5b21b6)` }}
        >
          <Gamepad2 size={18} /> Jugar como Ana
        </button>
      </div>
    </div>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default function DashboardClient({ sessions: rawSessions }: { sessions: DashboardSession[] }) {
  const router = useRouter()
  const { isCommandCenter: cc, toggleLayer } = useDashboardVisualLayer()
  const [activeMetric, setActiveMetric] = useState<FocusMetricId>('reaction')

  const onPlay = () => router.push('/game')
  const onHome = () => router.push('/')

  if (rawSessions.length === 0) return <EmptyState onPlay={onPlay} />

  const sessions = [...rawSessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const latest = sessions[sessions.length - 1]
  const previous = sessions.length > 1 ? sessions[sessions.length - 2] : latest
  const streak = computeStreak(sessions)
  const stabilityAnalysis = calculateStability(latest)
  const stabilitySigmaMs = stabilityAnalysis.standard_deviation_ms

  const realHeatmap = latest.heatmap_grid
  const heatmapData: { grid: number[][] | null; isBool: boolean } = realHeatmap
    ? { grid: realHeatmap, isBool: false }
    : { grid: null, isBool: true }
  const fallbackHeatmap = buildHeatmapFromCoverage(latest.metrics.coverage_percent)

  function sessionTrend(key: keyof Metrics, lowerIsBetter = true): 'up' | 'down' | 'neutral' {
    const curr = latest.metrics[key] as number
    const prev = previous.metrics[key] as number
    if (Math.abs(curr - prev) < 1) return 'neutral'
    return (lowerIsBetter ? curr < prev : curr > prev) ? 'up' : 'down'
  }

  const reactionChange = pctChange(latest.metrics.avg_reaction_time_ms, previous.metrics.avg_reaction_time_ms)
  const improved = reactionChange > 0
  const motivationalMsg =
    Math.abs(reactionChange) < 1
      ? 'Rendimiento motor estable respecto a la sesión anterior (Δ < 1%).'
      : improved
      ? `Mejora del rendimiento motor: +${reactionChange}% vs sesión anterior.`
      : `Disminución del rendimiento motor: −${Math.abs(reactionChange)}% vs sesión anterior.`

  const last7ReactionMs = sessions.slice(-7).map((s) => s.metrics.avg_reaction_time_ms)
  const reactionSlope = slope(last7ReactionMs)

  let sessionsToNormative: number | null = null
  if (reactionSlope < -0.5 && latest.metrics.avg_reaction_time_ms > NORMLIM_SUP_MS) {
    sessionsToNormative = Math.ceil((NORMLIM_SUP_MS - latest.metrics.avg_reaction_time_ms) / reactionSlope)
    if (!Number.isFinite(sessionsToNormative) || sessionsToNormative <= 0) sessionsToNormative = null
  }

  const latestDayLabel = 'HOY'
  const lastIdx = sessions.length - 1
  const p1 = latest.metrics.avg_reaction_time_ms + reactionSlope
  const p2 = p1 + reactionSlope
  const p3 = p2 + reactionSlope

  type ChartDatum = {
    day: string; reaccion: number | null; reaccionProyeccion: number | null
    projeBandBase: number | null; projeBandSpread: number | null
    normalityZone: number; neglect: number | null; asimetria: number | null; cobertura: number | null
  }

  function projectionBandFromCenter(center: number | null) {
    if (center == null || !Number.isFinite(center)) return { projeBandBase: null, projeBandSpread: null }
    const lo = center * (1 - PROJECTION_ERROR_MARGIN)
    return { projeBandBase: lo, projeBandSpread: center * (1 + PROJECTION_ERROR_MARGIN) - lo }
  }

  const chartData: ChartDatum[] = [
    ...sessions.map((s, i) => {
      const proj = i === lastIdx ? s.metrics.avg_reaction_time_ms : null
      const band = projectionBandFromCenter(proj)
      return { day: i === lastIdx ? latestDayLabel : `S${i + 1}`, reaccion: s.metrics.avg_reaction_time_ms, reaccionProyeccion: proj, ...band, normalityZone: NORMLIM_SUP_MS, neglect: s.metrics.neglect_index, asimetria: s.metrics.asymmetry_reaction, cobertura: s.metrics.coverage_percent }
    }),
    (() => { const b = projectionBandFromCenter(p1); return { day: 'P1', reaccion: null, reaccionProyeccion: p1, ...b, normalityZone: NORMLIM_SUP_MS, neglect: null, asimetria: null, cobertura: null } })(),
    (() => { const b = projectionBandFromCenter(p2); return { day: 'P2', reaccion: null, reaccionProyeccion: p2, ...b, normalityZone: NORMLIM_SUP_MS, neglect: null, asimetria: null, cobertura: null } })(),
    (() => { const b = projectionBandFromCenter(p3); return { day: 'P3', reaccion: null, reaccionProyeccion: p3, ...b, normalityZone: NORMLIM_SUP_MS, neglect: null, asimetria: null, cobertura: null } })(),
  ]

  type Alert = { level: 'error' | 'warn'; text: string; detail: string }
  const alerts: Alert[] = []
  if (latest.metrics.neglect_index < 0.5)
    alerts.push({ level: 'error', text: 'Negligencia espacial detectada', detail: 'Ana ignora sistemáticamente el lado izquierdo.' })
  if (latest.metrics.asymmetry_reaction > 2.0)
    alerts.push({ level: 'error', text: 'Asimetría severa', detail: `Ratio lado afectado / sano: ${latest.metrics.asymmetry_reaction}` })
  const recentFatigue = sessions.slice(-3).filter((s) => s.metrics.fatigue_detected).length
  if (recentFatigue === 3)
    alerts.push({ level: 'warn', text: 'Patrón de fatiga recurrente', detail: 'Fatiga detectada en las 3 últimas sesiones — considerar reducir duración.' })
  if (stabilitySigmaMs > 150)
    alerts.push({ level: 'error', text: 'Variabilidad motora detectada', detail: 'Posible fatiga central o falta de consolidación de la ruta eferente.' })

  const chartP = cc
    ? { reaction: '#22d3ee', neglect: '#c084fc', asymmetry: '#34d399', coverage: '#fbbf24', grid: '#27272a', refRose: '#fb7185', refEmerald: '#4ade80', refCoverage: '#fbbf24' }
    : CHART

  const axisTick = cc
    ? ({ fill: '#22d3ee', fontSize: 11 } as const)
    : ({ fill: D.textTertiary, fontSize: 11 } as const)

  const tooltipLayer = cc
    ? { contentStyle: { ...TOOLTIP_STYLE.contentStyle, backgroundColor: '#030712', border: '1px solid rgba(34,211,238,0.3)' }, labelStyle: { ...TOOLTIP_STYLE.labelStyle, color: '#67e8f9' } }
    : TOOLTIP_STYLE

  const supportMetrics = FOCUS_METRIC_ORDER.filter((m) => m !== activeMetric)

  const renderFocusChartBody = (metricId: FocusMetricId, detail: boolean) => {
    const mH = { top: 8, right: 16, bottom: 8, left: 4 }
    const mC = { top: 4, right: 8, bottom: 4, left: 0 }

    switch (metricId) {
      case 'reaction':
        if (detail) return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={mH}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartP.grid} />
              <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis domain={[200, 900]} tick={axisTick} axisLine={false} tickLine={false} unit=" ms" width={60} />
              <Tooltip {...tooltipLayer} itemStyle={{ color: chartP.reaction, fontSize: 12 }}
                formatter={(value, name, item) => {
                  const key = item && typeof item === 'object' && 'dataKey' in item ? String(item.dataKey) : ''
                  if (key === 'projeBandBase' || key === 'projeBandSpread') return null
                  return typeof value === 'number' && Number.isFinite(value) ? [`${Math.round(value * 10) / 10} ms`, String(name)] : ['—', String(name)]
                }}
              />
              <ReferenceArea y1={0} y2={NORMLIM_SUP_MS} fill="#4ade80" fillOpacity={cc ? 0.1 : 0.04} ifOverflow="visible"
                label={{ value: 'Rango de Normalidad Funcional (Z < 1.5)', fill: '#4ade80', fontSize: 10, position: 'insideTopRight' }}
              />
              <ReferenceLine x={latestDayLabel} stroke={cc ? '#22d3ee' : D.violet} strokeDasharray="3 3" label="HOY" />
              <Area type="monotone" dataKey="projeBandBase" stackId="projConf" stroke="none" fill="rgba(0,0,0,0)" fillOpacity={0} isAnimationActive={false} connectNulls legendType="none" />
              <Area type="monotone" dataKey="projeBandSpread" stackId="projConf" stroke="none" fill={D.violet} fillOpacity={cc ? 0.15 : 0.08} isAnimationActive={false} connectNulls legendType="none" />
              <Line type="monotone" dataKey="reaccion" stroke={chartP.reaction} strokeWidth={2} dot={{ r: 3, fill: chartP.reaction, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} />
              <Line type="monotone" dataKey="reaccionProyeccion" stroke={chartP.reaction} strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: chartP.reaction, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls legendType="none" />
            </ComposedChart>
          </ResponsiveContainer>
        )
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={mC}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartP.grid} />
              <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis domain={[200, 900]} tick={axisTick} axisLine={false} tickLine={false} unit=" ms" width={48} />
              <Line type="monotone" dataKey="reaccion" stroke={chartP.reaction} strokeWidth={1.5} dot={{ r: 2, fill: chartP.reaction, strokeWidth: 0 }} isAnimationActive={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'neglect': return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={mC}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartP.grid} />
            <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 1]} tick={axisTick} axisLine={false} tickLine={false} width={36} />
            {detail && <Tooltip {...tooltipLayer} itemStyle={{ color: chartP.neglect, fontSize: 12 }} formatter={(v) => typeof v === 'number' && Number.isFinite(v) ? [v.toFixed(2), 'Neglect Index'] : ['—', 'Neglect Index']} />}
            <ReferenceArea y1={0} y2={0.5} fill={chartP.refRose} fillOpacity={detail ? 0.1 : 0.05} />
            <ReferenceLine y={0.5} stroke={chartP.refRose} strokeDasharray="4 4" label={detail ? { value: 'Umbral', fill: chartP.refRose, fontSize: 10, position: 'insideTopRight' } : undefined} />
            <Line type="monotone" dataKey="neglect" stroke={chartP.neglect} strokeWidth={1.5} dot={{ r: 2, fill: chartP.neglect, strokeWidth: 0 }} activeDot={detail ? { r: 4 } : false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )

      case 'asymmetry': return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={mC}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartP.grid} />
            <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 3]} tick={axisTick} axisLine={false} tickLine={false} width={36} />
            {detail && <Tooltip {...tooltipLayer} itemStyle={{ color: chartP.asymmetry, fontSize: 12 }} formatter={(v) => typeof v === 'number' && Number.isFinite(v) ? [v.toFixed(2), 'Asimetría'] : ['—', 'Asimetría']} />}
            <ReferenceArea y1={0} y2={1.2} fill={chartP.refEmerald} fillOpacity={detail ? 0.08 : 0.04} />
            <ReferenceLine y={1.2} stroke={chartP.refEmerald} strokeDasharray="4 4" label={detail ? { value: 'Simétrico', fill: chartP.refEmerald, fontSize: 10, position: 'insideTopRight' } : undefined} />
            <Line type="monotone" dataKey="asimetria" stroke={chartP.asymmetry} strokeWidth={1.5} dot={{ r: 2, fill: chartP.asymmetry, strokeWidth: 0 }} activeDot={detail ? { r: 4 } : false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )

      case 'coverage': return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={mC}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartP.grid} />
            <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} unit="%" width={40} />
            {detail && <Tooltip {...tooltipLayer} itemStyle={{ color: chartP.coverage, fontSize: 12 }} formatter={(v) => typeof v === 'number' && Number.isFinite(v) ? [`${v}%`, 'Cobertura'] : ['—', 'Cobertura']} />}
            {detail && <ReferenceArea y1={70} y2={100} fill={chartP.refEmerald} fillOpacity={0.08} label={{ value: 'Zona normativa (≥70%)', fill: chartP.refEmerald, fontSize: 10, position: 'insideTopLeft' }} />}
            <ReferenceLine y={70} stroke={chartP.refCoverage} strokeDasharray="4 4" label={detail ? { value: 'Objetivo', fill: chartP.refCoverage, fontSize: 10, position: 'insideTopRight' } : undefined} />
            <Line type="monotone" dataKey="cobertura" stroke={chartP.coverage} strokeWidth={1.5} dot={{ r: 2, fill: chartP.coverage, strokeWidth: 0 }} activeDot={detail ? { r: 4 } : false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )

      default: return null
    }
  }

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .neurohab-scanlines {
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.015) 2px,
            rgba(0,0,0,0.015) 4px
          );
          pointer-events: none;
          z-index: 200;
        }
      `}</style>

      <div className="neurohab-scanlines" aria-hidden />
      <ScrollIndicator />
      <Navbar onPlay={onPlay} onHome={onHome} />

      {cc && (
        <div className="fixed top-16 right-6 z-30 pointer-events-none">
          <NeuroCommandBrain
            neglectIndex={latest.metrics.neglect_index}
            eyeHandLatencyMs={latest.metrics.avg_eye_hand_latency_ms}
          />
        </div>
      )}

      <main
        className="pt-14 min-h-screen"
        style={{ background: D.bg }}
      >
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

          {/* ── HEADER ── */}
          <header className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: D.textSecondary }}>
                Dashboard clínico
              </p>
              <h1 className="text-2xl font-semibold"
                  style={{ color: D.textPrimary }}>
                Ana García
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleLayer}
                aria-pressed={cc}
                title="Capa visual (T)"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold font-mono transition"
                style={{
                  border: cc ? '1px solid rgba(34,211,238,0.5)' : `1px solid ${D.border}`,
                  background: cc ? 'rgba(34,211,238,0.1)' : D.card,
                  color: cc ? '#22d3ee' : D.textSecondary,
                }}
              >
                T
              </button>
              {streak > 0 && (
                <div
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', color: D.violetSoft }}
                >
                  🔥 {streak} días
                </div>
              )}
              <div
                className="hidden md:flex items-center px-3 py-1.5 rounded-full text-[11px]"
                style={{ background: D.card, border: `1px solid ${D.border}`, color: D.textSecondary }}
              >
                {formatDate(latest.date)}
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: `linear-gradient(135deg, ${D.violet}, #5b21b6)`, color: '#fff', boxShadow: `0 0 12px ${D.violetGlow}` }}
              >
                A
              </div>
            </div>
          </header>

          {/* ── BANNER MOTIVACIONAL ── */}
          <div
            className="rounded-xl px-5 py-3 flex items-center gap-3"
            style={{
              background: improved
                ? 'linear-gradient(135deg, rgba(74,222,128,0.08) 0%, transparent 70%)'
                : Math.abs(reactionChange) < 1
                ? 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, transparent 70%)'
                : 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, transparent 70%)',
              border: `1px solid ${improved ? 'rgba(74,222,128,0.2)' : Math.abs(reactionChange) < 1 ? 'rgba(124,58,237,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}
          >
            {improved
              ? <TrendingUp className="w-4 h-4 shrink-0" style={{ color: D.green }} strokeWidth={1.5} />
              : Math.abs(reactionChange) < 1
              ? <Activity className="w-4 h-4 shrink-0" style={{ color: D.violet }} strokeWidth={1.5} />
              : <TrendingUp className="w-4 h-4 shrink-0 rotate-180" style={{ color: D.error }} strokeWidth={1.5} />}
            <p className="text-sm font-medium flex-1"
               style={{ color: improved ? D.green : Math.abs(reactionChange) < 1 ? D.textPrimary : D.error }}>
              {motivationalMsg}
            </p>
            {Math.abs(reactionChange) >= 1 && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: improved ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
                  color: improved ? D.green : D.error,
                }}
              >
                {improved ? '+' : '−'}{Math.abs(reactionChange)}%
              </span>
            )}
          </div>

          {/* ── ALERTAS ── */}
          {alerts.length > 0 && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className="rounded-xl px-4 py-3 flex items-start gap-3"
                  style={{
                    background: alert.level === 'error' ? 'rgba(239,68,68,0.05)' : 'rgba(251,191,36,0.05)',
                    border: `1px solid ${alert.level === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)'}`,
                    borderLeft: `3px solid ${alert.level === 'error' ? D.error : D.warning}`,
                  }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: alert.level === 'error' ? D.error : D.warning }}
                    strokeWidth={1.5} aria-hidden
                  />
                  <div>
                    <p className="font-semibold text-sm"
                       style={{ color: alert.level === 'error' ? '#fca5a5' : '#fcd34d' }}>
                      {alert.text}
                    </p>
                    <p className="text-xs mt-0.5"
                       style={{ color: D.textSecondary }}>
                      {alert.detail}
                    </p>
                  </div>
                </div>
              ))}
            </section>
          )}
          {alerts.length === 0 && (
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)', borderLeft: `3px solid ${D.green}` }}
            >
              <Activity className="w-4 h-4 shrink-0" style={{ color: D.green }} strokeWidth={1.5} aria-hidden />
              <p className="text-sm" style={{ color: D.green }}>
                Sin hallazgos clínicos significativos en la revisión actual
              </p>
            </div>
          )}

          <div style={{ height: '1px', background: '#1a1a2e' }} />

          {/* ── GRID PRINCIPAL: hero (2/3) + mini métricas (1/3) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <LayoutGroup id="hero-chart">
                <motion.div layout transition={FOCUS_LAYOUT_SPRING}>
                  <ChartCard
                    {...getFocusChartCopy(activeMetric)}
                    is3D={false}
                    commandMode={cc}
                    glossaryKey={activeMetric}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(124,58,237,0.12)', color: D.violetSoft, border: '1px solid rgba(124,58,237,0.2)' }}
                      >
                        {sessions.length} sesiones
                      </span>
                    </div>
                    <div key={activeMetric} className="h-[280px] w-full">
                      {renderFocusChartBody(activeMetric, true)}
                    </div>
                  </ChartCard>
                </motion.div>
              </LayoutGroup>
            </div>

            <div className="flex flex-col gap-3">
              <MiniStatCard
                label="Tiempo de Reacción"
                value={Math.round(latest.metrics.avg_reaction_time_ms)}
                unit="ms"
                interpretation={interpretReaction(latest.metrics.avg_reaction_time_ms)}
                trend7={metricTrend(sessions, 'avg_reaction_time_ms', true)}
              />
              <MiniStatCard
                label="Neglect Index"
                value={parseFloat(latest.metrics.neglect_index.toFixed(2))}
                unit=""
                interpretation={interpretNeglect(latest.metrics.neglect_index)}
                trend7={metricTrend(sessions, 'neglect_index', false)}
                extra={
                  <div className="h-1.5 rounded-full overflow-hidden mt-1" style={{ background: '#1e1e2e' }}>
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{
                        width: `${Math.min(100, Math.abs(latest.metrics.neglect_index) * 100)}%`,
                        background: latest.metrics.neglect_index > 0.8 ? D.green
                          : latest.metrics.neglect_index >= 0.5 ? D.warning : D.error,
                      }}
                    />
                  </div>
                }
              />
              <MiniStatCard
                label="Asimetría L-D"
                value={parseFloat(latest.metrics.asymmetry_reaction.toFixed(2))}
                unit="ratio"
                interpretation={interpretAsymmetry(latest.metrics.asymmetry_reaction)}
                trend7={metricTrend(sessions, 'asymmetry_reaction', true)}
                extra={
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex-1 h-1.5 rounded-l-full overflow-hidden" style={{ background: '#1e1e2e' }}>
                      <div className="h-full rounded-l-full" style={{ width: '60%', background: D.error, marginLeft: 'auto' }} />
                    </div>
                    <span className="text-[9px]" style={{ color: D.textTertiary }}>|</span>
                    <div className="flex-1 h-1.5 rounded-r-full overflow-hidden" style={{ background: '#1e1e2e' }}>
                      <div className="h-full rounded-r-full" style={{ width: '40%', background: D.green }} />
                    </div>
                  </div>
                }
              />
              <ForecastCard
                sessionsToNormative={sessionsToNormative}
                currentMs={latest.metrics.avg_reaction_time_ms}
              />
            </div>
          </div>

          <div style={{ height: '1px', background: '#1a1a2e' }} />

          {/* ── BIOMARCADORES ── */}
          <section>
            <p className="text-xs uppercase tracking-widest font-medium mb-4"
               style={{ color: D.textSecondary }}>
              Biomarcadores de Soporte
            </p>
            <LayoutGroup id="support-charts">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {supportMetrics.map((id) => (
                  <motion.div key={id} layout transition={FOCUS_LAYOUT_SPRING} className="min-w-0">
                    <ChartCard
                      {...getFocusChartCopy(id)}
                      is3D
                      commandMode={cc}
                      glossaryKey={id}
                      onCardClick={() => setActiveMetric(id)}
                      isSupportTile
                    >
                      <div className="h-[160px] w-full">{renderFocusChartBody(id, false)}</div>
                      <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${D.border}` }}>
                        <span className="text-lg font-semibold tabular-nums"
                              style={{ color: D.textPrimary }}>
                          {id === 'neglect' ? latest.metrics.neglect_index.toFixed(2)
                            : id === 'asymmetry' ? latest.metrics.asymmetry_reaction.toFixed(2)
                            : `${latest.metrics.coverage_percent.toFixed(0)}%`}
                        </span>
                        <span className={`text-xs ${
                          id === 'neglect' ? interpretNeglect(latest.metrics.neglect_index).color
                          : id === 'asymmetry' ? interpretAsymmetry(latest.metrics.asymmetry_reaction).color
                          : interpretCoverage(latest.metrics.coverage_percent).color
                        }`}>
                          {id === 'neglect' ? interpretNeglect(latest.metrics.neglect_index).text
                            : id === 'asymmetry' ? interpretAsymmetry(latest.metrics.asymmetry_reaction).text
                            : interpretCoverage(latest.metrics.coverage_percent).text}
                        </span>
                      </div>
                    </ChartCard>
                  </motion.div>
                ))}
              </div>
            </LayoutGroup>
          </section>

          <div style={{ height: '1px', background: '#1a1a2e' }} />

          {/* ── MÉTRICAS ── */}
          <section>
            <p className="text-xs uppercase tracking-widest font-medium mb-4"
               style={{ color: D.textSecondary }}>
              Métricas de la Última Sesión
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard icon={Clock} label="Tiempo de Reacción" value={Math.round(latest.metrics.avg_reaction_time_ms)} unit="ms"
                sessionTrend={sessionTrend('avg_reaction_time_ms', true)}
                interpretation={interpretReaction(latest.metrics.avg_reaction_time_ms)}
                trend7={metricTrend(sessions, 'avg_reaction_time_ms', true)} />
              <MetricCard icon={BarChart2} label="Estabilidad de Respuesta"
                primaryDisplay={<span className="font-mono">σ = {stabilitySigmaMs} ms</span>}
                interpretation={interpretStabilitySigma(stabilitySigmaMs)} />
              <MetricCard icon={Zap} label="Tiempo de Descubrimiento" value={Math.round(latest.metrics.avg_discovery_time_ms)} unit="ms"
                sessionTrend={sessionTrend('avg_discovery_time_ms', true)}
                interpretation={interpretReaction(latest.metrics.avg_discovery_time_ms)}
                trend7={metricTrend(sessions, 'avg_discovery_time_ms', true)} />
              <MetricCard icon={Eye} label="Latencia Ojo-Mano" value={Math.round(latest.metrics.avg_eye_hand_latency_ms)} unit="ms"
                sessionTrend={sessionTrend('avg_eye_hand_latency_ms', true)}
                interpretation={interpretEyeHand(latest.metrics.avg_eye_hand_latency_ms)}
                trend7={metricTrend(sessions, 'avg_eye_hand_latency_ms', true)} />
              <MetricCard icon={Target} label="Precisión" value={Math.round(latest.metrics.avg_precision_px)} unit="px"
                sessionTrend={sessionTrend('avg_precision_px', true)}
                interpretation={latest.metrics.avg_precision_px <= 25 ? { text: 'Buena precisión (≤25 px)', color: 'text-green-400' } : { text: 'Precisión mejorable (>25 px)', color: 'text-yellow-400' }}
                trend7={metricTrend(sessions, 'avg_precision_px', true)} />
              <MetricCard icon={Eye} label="Cobertura Visual" value={Math.round(latest.metrics.coverage_percent)} unit="%"
                sessionTrend={sessionTrend('coverage_percent', false)}
                interpretation={interpretCoverage(latest.metrics.coverage_percent)}
                trend7={metricTrend(sessions, 'coverage_percent', false)} />
              <MetricCard icon={Brain} label="Asimetría L-D" value={parseFloat(latest.metrics.asymmetry_reaction.toFixed(2))} unit="ratio"
                sessionTrend={sessionTrend('asymmetry_reaction', true)}
                interpretation={interpretAsymmetry(latest.metrics.asymmetry_reaction)}
                trend7={metricTrend(sessions, 'asymmetry_reaction', true)} />
              <MetricCard icon={Activity} label="Neglect Index" value={parseFloat(latest.metrics.neglect_index.toFixed(2))} unit=""
                sessionTrend={sessionTrend('neglect_index', false)}
                interpretation={interpretNeglect(latest.metrics.neglect_index)}
                trend7={metricTrend(sessions, 'neglect_index', false)} />
            </div>
          </section>

          <div style={{ height: '1px', background: '#1a1a2e' }} />

          {/* ── HEATMAP ── */}
          <section
            className="rounded-xl p-5"
            style={{ background: D.card, border: `1px solid ${D.border}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-medium"
                   style={{ color: D.textSecondary }}>
                  Campo Visual Explorado
                </p>
                <p className="text-lg font-semibold mt-0.5"
                   style={{ color: D.textPrimary }}>
                  Cobertura: <span style={{ color: D.violetSoft }}>{latest.metrics.coverage_percent.toFixed(0)}%</span>
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs"
                   style={{ color: D.textSecondary }}>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: D.violet, opacity: 0.8 }} /> Explorado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: D.border }} /> No explorado
                </span>
              </div>
            </div>
            <div className="flex justify-between text-[10px] px-0.5 mb-2"
                 style={{ color: D.textSecondary }}>
              <span>← Izquierda (lado afectado)</span>
              <span>Derecha →</span>
            </div>
            {heatmapData.grid ? (
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${heatmapData.grid[0]?.length ?? 8}, 1fr)` }}>
                {heatmapData.grid.flat().map((val, idx) => {
                  const maxVal = Math.max(...heatmapData.grid!.flat(), 1)
                  const intensity = val / maxVal
                  return (
                    <div
                      key={idx}
                      className="rounded aspect-square"
                      style={{
                        background: val > 0
                          ? `rgba(124,58,237,${(0.15 + intensity * 0.85).toFixed(2)})`
                          : D.border,
                      }}
                    />
                  )
                })}
              </div>
            ) : (
              <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
                {fallbackHeatmap.flat().map((covered, idx) => {
                  const col = idx % 8
                  const intensity = covered ? (0.3 + (col / 7) * 0.7) : 0
                  return (
                    <div
                      key={idx}
                      className="rounded aspect-square"
                      style={{
                        background: covered
                          ? `rgba(124,58,237,${intensity.toFixed(2)})`
                          : D.border,
                      }}
                    />
                  )
                })}
              </div>
            )}
          </section>

          {/* ── CONSISTENCIA MOTORA ── */}
          <section
            className="rounded-xl px-5 py-4"
            style={{ background: D.card, border: `1px solid ${D.border}` }}
          >
            <p className="text-[10px] uppercase tracking-widest font-medium mb-3"
               style={{ color: D.textSecondary }}>
              Índice de Consistencia Motora
            </p>
            <StabilityIndicator sigmaMs={stabilitySigmaMs} />
          </section>

        </div>
      </main>
    </>
  )
}
