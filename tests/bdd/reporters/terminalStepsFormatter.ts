import type { Envelope, Pickle, PickleStep, TestStepFinished } from '@cucumber/messages'
import { Formatter, type IFormatterOptions } from '@cucumber/cucumber'

const STATUS_MARK: Record<string, string> = {
  PASSED: '✔',
  FAILED: '✖',
  SKIPPED: '-',
  PENDING: '-',
  AMBIGUOUS: '?',
  UNDEFINED: '?'
}

export function statusMarkFor(status: string | undefined): string {
  if (!status) return STATUS_MARK.UNDEFINED
  return STATUS_MARK[status] ?? '?'
}

export function gherkinKeywordForStepType(type: string | undefined): string {
  if (type === 'Context') return 'Given '
  if (type === 'Action') return 'When '
  return 'Then '
}

export function formatPickleStepText(step: PickleStep | undefined): string | undefined {
  if (!step?.text) return undefined
  return `${gherkinKeywordForStepType(step.type)}${step.text}`.trim()
}

export default class TerminalStepsFormatter extends Formatter {
  private readonly pickles = new Map<string, Pickle>()
  private currentPickleId: string | null = null
  private stepIndex = 0

  constructor(options: IFormatterOptions) {
    super(options)
    if (process.env.BDD_TERMINAL_STEPS !== '1') return

    options.eventBroadcaster.on('envelope', (envelope: Envelope) => {
      if (envelope.pickle) {
        this.pickles.set(envelope.pickle.id, envelope.pickle)
      }
      if (envelope.testCase?.pickleId) {
        this.currentPickleId = envelope.testCase.pickleId
        this.stepIndex = 0
      }
      if (envelope.testStepStarted) {
        const text = this.currentStepText()
        if (text) {
          process.stdout.write(`  → ${text}\n`)
        }
      }
      if (envelope.testStepFinished) {
        this.printStepFinished(envelope.testStepFinished)
        this.stepIndex += 1
      }
    })
  }

  private currentStepText(): string | undefined {
    if (!this.currentPickleId) return undefined
    const pickle = this.pickles.get(this.currentPickleId)
    return formatPickleStepText(pickle?.steps[this.stepIndex])
  }

  private printStepFinished(finished: TestStepFinished): void {
    const status = finished.testStepResult?.status ?? 'UNDEFINED'
    const mark = statusMarkFor(status)
    const text = this.currentStepText() ?? finished.testStepId
    process.stdout.write(`  ${mark} ${text}\n`)
  }
}
