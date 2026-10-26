import { CheckCircle, Question } from '@phosphor-icons/react'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/shared/ui/feedback/dialog'

const STAGES = [
  {
    title: '1. Client Identification',
    desc: 'Search the CIS registry, confirm the borrower identity, and attach an available preloan account.',
  },
  {
    title: '2. Financial Details',
    desc: 'Verify personal details, existing obligations, and configure the proposed loan parameters.',
  },
  {
    title: '3. Verification & Exceptions',
    desc: 'Record your account officer findings and document any policy deviations with justifications.',
  },
  {
    title: '4. Final Review',
    desc: 'Review the generated Approval Form document and submit the application for processing.',
  },
]

export function LoanCreationGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
          >
            <Question size={16} weight="bold" />
            Loan creation guide
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>How loan creation works</DialogTitle>
          <DialogDescription>
            Applications follow a four-stage workflow. Your draft saves
            automatically and is restored when you return.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {STAGES.map((stage, i) => (
            <div key={stage.title} className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                {i === STAGES.length - 1 ? (
                  <CheckCircle size={14} weight="bold" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{stage.title}</h4>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {stage.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
