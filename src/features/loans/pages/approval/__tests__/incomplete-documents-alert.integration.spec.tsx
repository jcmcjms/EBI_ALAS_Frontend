import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/src/shared/ui/navigation/tabs'
import { IncompleteDocumentsAlert } from '../components/incomplete-documents-alert'
import { DocumentsTabContent } from '../documents-tab-content'

function Harness({ onRecheck = vi.fn() }: { onRecheck?: () => void }) {
  const [tab, setTab] = useState('workflow')
  return (
    <div>
      <IncompleteDocumentsAlert
        count={2}
        onReview={() => {
          setTab('files')
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              document
                .getElementById('document-requirements')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            })
          })
        }}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
        <TabsContent value="workflow">workflow-panel</TabsContent>
        <TabsContent value="files">
          <DocumentsTabContent
            loanId="1"
            frozen={false}
            canWriteRemarks={false}
            canPushBack={false}
            pushBackPending={false}
            onPushBack={vi.fn()}
            recheckPending={false}
            onRecheck={onRecheck}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

describe('IncompleteDocumentsAlert → Document Requirements', () => {
  it('opens Files and reveals Document Requirements with Re-check on the right', async () => {
    const user = userEvent.setup()
    const scrollSpy = vi.fn()
    Element.prototype.scrollIntoView = scrollSpy
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    )

    await user.click(
      screen.getByRole('button', { name: /review missing documents/i }),
    )

    expect(await screen.findByText('Document Requirements')).toBeVisible()
    await waitFor(() => expect(scrollSpy).toHaveBeenCalled())

    const recheck = screen.getByRole('button', { name: /re-check documents/i })
    expect(recheck).toBeVisible()
    
    expect(recheck.closest('[data-slot="card-action"]')).not.toBeNull()
  })
})
