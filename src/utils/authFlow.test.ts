import { describe, expect, it } from 'vitest'
import { authFlowReducer, initialAuthFlow } from './authFlow'

describe('authFlowReducer', () => {
  it('continues from email to password login choices', () => {
    expect(authFlowReducer(initialAuthFlow, {
      type: 'EMAIL_CONTINUED',
      email: 'coach@example.com',
    })).toMatchObject({ step: 'login', email: 'coach@example.com' })
  })

  it('starts registration with a code step', () => {
    const state = authFlowReducer(initialAuthFlow, {
      type: 'CODE_REQUESTED',
      email: 'coach@example.com',
      purpose: 'register',
      challengeId: 'challenge-1',
    })

    expect(state).toMatchObject({
      step: 'code',
      email: 'coach@example.com',
      purpose: 'register',
      challengeId: 'challenge-1',
    })
  })

  it('moves verified registration to password setup', () => {
    const codeState = {
      ...initialAuthFlow,
      step: 'code' as const,
      email: 'coach@example.com',
      purpose: 'register' as const,
      challengeId: 'challenge-1',
    }

    expect(authFlowReducer(codeState, { type: 'CODE_VERIFIED', flowToken: 'flow' }))
      .toMatchObject({ step: 'set-password', flowToken: 'flow' })
  })

  it('moves verified reset to a new password step', () => {
    const codeState = {
      ...initialAuthFlow,
      step: 'code' as const,
      email: 'coach@example.com',
      purpose: 'reset' as const,
      challengeId: 'challenge-1',
    }

    expect(authFlowReducer(codeState, { type: 'CODE_VERIFIED', flowToken: 'flow' }))
      .toMatchObject({ step: 'reset-password', flowToken: 'flow' })
  })
})
