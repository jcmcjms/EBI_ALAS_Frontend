import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Eye,
  DownloadSimple,
  CheckCircle,
  FileDashed,
  Warning,
  WarningCircle,
  XCircle,
  ChatCenteredText,
} from '@phosphor-icons/react'

import { Button } from '@/src/shared/ui/primitives/button'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Checkbox } from '@/src/shared/ui/primitives/checkbox'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { EmptyState, ErrorState } from '@/src/shared/ui/feedback/empty-state'
import { countNoun } from '@/src/shared/lib/format'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/src/shared/ui/feedback/alert-dialog'
import { Label } from '@/src/shared/ui/primitives/label'
import { Textarea } from '@/src/shared/ui/primitives/textarea'

import {
  getChecklistDocuments,
  getDocumentRemarks,
  viewChecklistDocument,
  type LoanChecklistDocumentDto,
} from '@/src/features/loans/api/loan-review'
import { loanReviewKeys } from '@/src/features/loans/api/loan-review'
import { isSubmittedWithoutUpload } from '@/src/features/loans/model/checklist-upload-status'
import { DocumentRemarksThread } from './document-remarks-thread'
import { DocumentPreviewDialog } from './document-preview-dialog'

/** Mirrors the minimum the document-flag endpoint enforces on the reason. */
const MIN_REMARKS = 5
const MAX_REMARKS = 2000

interface AttachmentsPanelProps {
  loanId: number | string
  frozen: boolean

  canRemark: boolean

  canPushBack: boolean
  pushBackPending: boolean
  onPushBack: (pendingCodes: string[], remarks: string) => void
  focusDocCode?: string | null
}

export function AttachmentsPanel({
  loanId,
  frozen,
  canRemark,
  canPushBack,
  pushBackPending,
  onPushBack,
  focusDocCode,
}: AttachmentsPanelProps) {
  const [openThread, setOpenThread] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [pushBackOpen, setPushBackOpen] = useState(false)
  const [pushBackRemarks, setPushBackRemarks] = useState('')
  const [showRemarksError, setShowRemarksError] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<{
    docId: number
    fileName: string
    contentType: string
  } | null>(null)

  const checklistDocs = useQuery({
    queryKey: loanReviewKeys.checklistDocuments(loanId),
    queryFn: () => getChecklistDocuments(loanId),
  })

  const remarksQuery = useQuery({
    queryKey: loanReviewKeys.documentRemarks(loanId),
    queryFn: () => getDocumentRemarks(loanId),
    staleTime: 15_000,
  })

  const items: LoanChecklistDocumentDto[] = checklistDocs.data ?? []

  useEffect(() => {
    if (!focusDocCode || items.length === 0) return
    setOpenThread(focusDocCode)
    document
      .getElementById(`doc-${focusDocCode}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusDocCode, items])
  const pending = useMemo(
    () =>
      items.filter(
        (i) => i.uploadStatus !== 'Uploaded' && i.uploadStatus !== 'Submitted',
      ),
    [items],
  )
  const uploadedCount = items.length - pending.length
  const selectedCodes = pending
    .filter((p) => selected[p.idCode])
    .map((p) => p.idCode)
  const remarksTooShort = pushBackRemarks.trim().length < MIN_REMARKS

  const remarksFor = (code: string) =>
    (remarksQuery.data ?? []).filter((r) => r.checklistIdCode === code)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {items.length > 0 && (
          <Badge variant="secondary" className="text-xs tabular-nums">
            {uploadedCount}/{items.length} uploaded
          </Badge>
        )}
        {pending.length > 0 && (
          <Badge variant="outline" className="text-xs text-destructive">
            Incomplete
          </Badge>
        )}
      </div>

      {checklistDocs.isLoading && <Spinner className="size-5" />}
      {checklistDocs.isError && (
        <ErrorState
          className="py-6"
          message="The document checklist could not be loaded."
          onRetry={() => checklistDocs.refetch()}
        />
      )}
      {!checklistDocs.isLoading && items.length === 0 && (
        <EmptyState
          className="py-6"
          icon={FileDashed}
          title="No documents required"
          hint="This loan product has no checklist, so there is nothing to verify here."
        />
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, index) => {
            const isPending =
              item.uploadStatus !== 'Uploaded' &&
              item.uploadStatus !== 'Submitted'
            const paperOnly = isSubmittedWithoutUpload(item)
            const threadOpen = openThread === item.idCode
            const remarkCount = remarksFor(item.idCode).length
            return (
              <li
                id={`doc-${item.idCode}`}
                key={`${item.idCode}-${item.docId ?? index}`}
                className="scroll-mt-24 border bg-background"
              >
                <div className="flex items-start gap-3 p-3">
                  {canPushBack && isPending && (
                    <Checkbox
                      className="mt-1"
                      aria-label={`Select ${item.checklistDescription ?? item.idCode} as missing`}
                      checked={!!selected[item.idCode]}
                      onCheckedChange={(checked) =>
                        setSelected((s) => ({
                          ...s,
                          [item.idCode]: checked === true,
                        }))
                      }
                    />
                  )}
                  {isPending ? (
                    <XCircle
                      size={20}
                      weight="fill"
                      className="mt-0.5 shrink-0 text-muted-foreground"
                    />
                  ) : paperOnly ? (
                    <Warning
                      size={20}
                      weight="fill"
                      className="mt-0.5 shrink-0 text-warning"
                    />
                  ) : (
                    <CheckCircle
                      size={20}
                      weight="fill"
                      className="mt-0.5 shrink-0 text-success"
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-sm font-medium">
                        {item.checklistDescription ?? item.idCode}
                      </p>
                      <Badge
                        variant={isPending ? 'destructive' : 'outline'}
                        className="shrink-0 text-xs font-normal"
                      >
                        {isPending
                          ? 'Missing'
                          : item.uploadStatus === 'Submitted'
                            ? 'Submitted'
                            : 'Uploaded'}
                      </Badge>
                    </div>
                    {!isPending && item.docId ? (
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        {item.docStr ? (
                          <span className="min-w-0 truncate">{item.docStr}</span>
                        ) : null}
                        {item.uploadedBy || item.created ? (
                          <span className="min-w-0 truncate">
                            {item.uploadedBy ? `Uploaded by ${item.uploadedBy}` : ''}
                            {item.created
                              ? ` on ${new Date(item.created).toLocaleDateString()}`
                              : ''}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    {paperOnly && (
                      <p className="text-xs text-warning">
                        Marked submitted in WebLoan, but no file is attached.
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {!isPending && item.docId ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() =>
                              setPreviewDoc({
                                docId: item.docId!,
                                fileName:
                                  item.docStr ?? `document-${item.docId}`,
                                contentType:
                                  item.contentType ?? 'application/octet-stream',
                              })
                            }
                          >
                            <Eye size={14} weight="bold" /> View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5"
                            onClick={() =>
                              viewChecklistDocument(
                                item.docId!,
                                item.docStr ?? `document-${item.docId}`,
                              )
                            }
                          >
                            <DownloadSimple size={14} weight="bold" /> Download
                          </Button>
                        </>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5"
                        aria-expanded={threadOpen}
                        onClick={() =>
                          setOpenThread((t) =>
                            t === item.idCode ? null : item.idCode,
                          )
                        }
                      >
                        <ChatCenteredText size={14} weight="bold" />
                        Remarks ({remarkCount})
                      </Button>
                    </div>
                  </div>
                </div>
                {threadOpen && (
                  <div className="border-t bg-muted/30 p-3">
                    <DocumentRemarksThread
                      loanId={loanId}
                      checklistIdCode={item.idCode}
                      docId={item.docId ?? null}
                      remarks={remarksFor(item.idCode)}
                      canWrite={canRemark}
                      frozen={frozen}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {canPushBack && !frozen && pending.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <p aria-live="polite" className="text-xs text-muted-foreground">
            {selectedCodes.length === 0
              ? 'Select what is missing to flag it for the encoder.'
              : `${countNoun(selectedCodes.length, 'requirement')} selected`}
          </p>
          <AlertDialog open={pushBackOpen} onOpenChange={setPushBackOpen}>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={selectedCodes.length === 0 || pushBackPending}
                />
              }
            >
              <WarningCircle size={14} weight="bold" />
              Flag missing documents
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Flag {countNoun(selectedCodes.length, 'document')} as missing?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  The encoder is told what to upload. The application stays in
                  your queue.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <ul className="space-y-1 border-l-2 border-border pl-3 text-xs">
                {selectedCodes.map((code) => (
                  <li key={code}>
                    {pending.find((p) => p.idCode === code)
                      ?.checklistDescription ?? code}
                  </li>
                ))}
              </ul>
              <div className="space-y-1.5">
                <Label
                  htmlFor="pushback-remarks"
                  className="font-medium"
                >
                  What the encoder needs to do
                </Label>
                <Textarea
                  id="pushback-remarks"
                  rows={3}
                  maxLength={MAX_REMARKS}
                  placeholder="Upload the signed COE; the payslip is cut off"
                  value={pushBackRemarks}
                  onChange={(e) => setPushBackRemarks(e.target.value)}
                  onBlur={() => setShowRemarksError(true)}
                  aria-required
                  aria-invalid={Boolean(showRemarksError && remarksTooShort)}
                  aria-describedby="pushback-remarks-help"
                />
                <p
                  id="pushback-remarks-help"
                  className={
                    showRemarksError && remarksTooShort
                      ? 'text-xs text-destructive'
                      : 'text-xs text-muted-foreground'
                  }
                >
                  {showRemarksError && remarksTooShort
                    ? 'Add a note so the encoder knows what to upload.'
                    : `Sent with the notification. ${MIN_REMARKS} characters minimum.`}
                </p>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pushBackPending}>
                  Keep reviewing
                </AlertDialogCancel>
                <AlertDialogAction
                  type="button"
                  className="gap-2"
                  disabled={pushBackPending}
                  onClick={() => {
                    if (remarksTooShort) {
                      setShowRemarksError(true)
                      return
                    }
                    onPushBack(selectedCodes, pushBackRemarks.trim())
                    setPushBackOpen(false)
                    setPushBackRemarks('')
                    setSelected({})
                    setShowRemarksError(false)
                  }}
                >
                  {pushBackPending && (
                    <Spinner className="size-3.5" aria-hidden />
                  )}
                  Flag documents
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <DocumentPreviewDialog
        open={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        doc={previewDoc}
      />
    </div>
  )
}
