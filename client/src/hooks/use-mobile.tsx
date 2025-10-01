import * as React from "react"

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export interface BreakpointReturn {
  breakpoint: Breakpoint
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouch: boolean
  isSmallScreen: boolean
}

const BREAKPOINTS: Record<Breakpoint, number> = {
  'xs': 475,
  'sm': 640,
  'md': 768,
  'lg': 1024,
  'xl': 1280,
  '2xl': 1536,
}

export function useBreakpoint(): BreakpointReturn {
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint>('lg')
  const [isTouch, setIsTouch] = React.useState(false)

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth

      if (width < BREAKPOINTS.xs) setBreakpoint('xs')
      else if (width < BREAKPOINTS.sm) setBreakpoint('xs')
      else if (width < BREAKPOINTS.md) setBreakpoint('sm')
      else if (width < BREAKPOINTS.lg) setBreakpoint('md')
      else if (width < BREAKPOINTS.xl) setBreakpoint('lg')
      else if (width < BREAKPOINTS['2xl']) setBreakpoint('xl')
      else setBreakpoint('2xl')
    }

    const detectTouch = () => {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }

    updateBreakpoint()
    detectTouch()

    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  const isMobile = breakpoint === 'xs' || breakpoint === 'sm'
  const isTablet = breakpoint === 'md'
  const isDesktop = breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl'
  const isSmallScreen = !isDesktop

  return {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    isSmallScreen
  }
}

// Legacy export for backward compatibility
const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
