import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Match the `(max-width: 767px)` media query and re-render the consumer
 * when the viewport crosses the threshold.
 *
 * The initial value is computed via the media-query list's
 * `matches` flag (synchronous, no render cascade) instead of the
 * legacy `setState(window.innerWidth < N)` pattern, which the new
 * React 19 / `react-hooks/set-state-in-effect` rule correctly flags
 * as a wasted second render.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
  })

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(mql.matches)
    }
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
