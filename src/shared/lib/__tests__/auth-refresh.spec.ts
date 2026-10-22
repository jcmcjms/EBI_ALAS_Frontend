import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { refreshAuthSession, resetAuthRefreshForTests } from '../auth-refresh'
import type { AuthTokenResponse } from '@/src/shared/lib/api/types'

vi.mock('axios', () => ({
  default: { post: vi.fn() },
}))

const body: AuthTokenResponse = {
  accessToken: 'token-1',
  accessTokenExpiresAt: '2030-01-01T00:00:00Z',
  mustChangePassword: false,
}

const post = vi.mocked(axios.post)

describe('refreshAuthSession', () => {
  beforeEach(() => {
    resetAuthRefreshForTests()
    post.mockReset()
  })

  it('deduplicates concurrent refresh calls into one request', async () => {
    let resolvePost!: (v: { data: AuthTokenResponse }) => void
    post.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve as never
        }) as never,
    )

    const a = refreshAuthSession()
    const b = refreshAuthSession()
    resolvePost({ data: body })

    const [ra, rb] = await Promise.all([a, b])
    expect(ra.accessToken).toBe('token-1')
    expect(rb).toBe(ra)
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('allows a later refresh after the in-flight one settles', async () => {
    post
      .mockResolvedValueOnce({ data: body } as never)
      .mockResolvedValueOnce({ data: { ...body, accessToken: 'token-2' } } as never)

    await refreshAuthSession()
    const second = await refreshAuthSession()
    expect(second.accessToken).toBe('token-2')
    expect(post).toHaveBeenCalledTimes(2)
  })
})
