export type AuthPurpose = 'register' | 'login' | 'reset'
export type AuthStep = 'email' | 'login' | 'code' | 'set-password' | 'reset-password'

export interface AuthFlowState {
  step: AuthStep
  email: string
  purpose: AuthPurpose | null
  challengeId: string | null
  flowToken: string | null
}

export type AuthFlowEvent =
  | { type: 'EMAIL_CONTINUED'; email: string }
  | { type: 'RESET_REQUESTED'; email: string; challengeId: string }
  | { type: 'CODE_REQUESTED'; email: string; purpose: AuthPurpose; challengeId: string }
  | { type: 'CODE_VERIFIED'; flowToken?: string }
  | { type: 'RESET' }

export const initialAuthFlow: AuthFlowState = {
  step: 'email',
  email: '',
  purpose: null,
  challengeId: null,
  flowToken: null,
}

export function authFlowReducer(state: AuthFlowState, event: AuthFlowEvent): AuthFlowState {
  switch (event.type) {
    case 'EMAIL_CONTINUED':
      return { ...initialAuthFlow, step: 'login', email: event.email }
    case 'RESET_REQUESTED':
      return {
        ...initialAuthFlow,
        step: 'code',
        email: event.email,
        purpose: 'reset',
        challengeId: event.challengeId,
      }
    case 'CODE_REQUESTED':
      return {
        ...initialAuthFlow,
        step: 'code',
        email: event.email,
        purpose: event.purpose,
        challengeId: event.challengeId,
      }
    case 'CODE_VERIFIED':
      if (state.purpose === 'register') {
        return { ...state, step: 'set-password', flowToken: event.flowToken ?? null }
      }
      if (state.purpose === 'reset') {
        return { ...state, step: 'reset-password', flowToken: event.flowToken ?? null }
      }
      return state
    case 'RESET':
      return initialAuthFlow
  }
}
