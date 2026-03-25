'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'neurohab-dashboard-visual-layer'

export type DashboardVisualLayer = 'clinical' | 'command'

type Ctx = {
  layer: DashboardVisualLayer
  setLayer: (l: DashboardVisualLayer) => void
  toggleLayer: () => void
  isCommandCenter: boolean
}

const DashboardVisualLayerContext = createContext<Ctx | null>(null)

function readStored(): DashboardVisualLayer {
  if (typeof window === 'undefined') return 'clinical'
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === 'command' ? 'command' : 'clinical'
  } catch {
    return 'clinical'
  }
}

export function DashboardVisualLayerProvider({ children }: { children: ReactNode }) {
  const [layer, setLayerState] = useState<DashboardVisualLayer>('clinical')

  useEffect(() => {
    setLayerState(readStored())
  }, [])

  const setLayer = useCallback((l: DashboardVisualLayer) => {
    setLayerState(l)
    try {
      window.localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleLayer = useCallback(() => {
    setLayerState((prev) => {
      const next: DashboardVisualLayer = prev === 'clinical' ? 'command' : 'clinical'
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      layer,
      setLayer,
      toggleLayer,
      isCommandCenter: layer === 'command',
    }),
    [layer, setLayer, toggleLayer]
  )

  return (
    <DashboardVisualLayerContext.Provider value={value}>{children}</DashboardVisualLayerContext.Provider>
  )
}

export function useDashboardVisualLayer(): Ctx {
  const ctx = useContext(DashboardVisualLayerContext)
  if (!ctx) {
    throw new Error('useDashboardVisualLayer must be used within DashboardVisualLayerProvider')
  }
  return ctx
}
