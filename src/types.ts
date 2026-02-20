export interface Segment {
  start: string
  end: string
  text: string
}

export interface CheckResult {
  ready: boolean
  missing: string[]
}
