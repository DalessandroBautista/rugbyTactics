// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildCodeEmail } from './mailService.js'

describe('buildCodeEmail', () => {
  it('builds registration email in text and HTML without remote assets', () => {
    const email = buildCodeEmail('482913', 'register')

    expect(email.subject).toContain('RugbyTactics')
    expect(email.text).toContain('RugbyTactics\n\n')
    expect(email.text).toContain('482913')
    expect(email.text).toContain('10 minutos')
    expect(email.html).toContain('482913')
    expect(email.html).not.toContain('<script')
    expect(email.html).not.toContain('http')
  })
})
