// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { buildCodeEmail, createMailService } from './mailService.js'

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

describe('createMailService', () => {
  const okResponse = { ok: true, status: 200, text: async () => '' } as Response

  it('prefers Resend HTTP API when RESEND_API_KEY is set', async () => {
    const fetchFn = vi.fn(async () => okResponse)
    const mailer = createMailService(
      { RESEND_API_KEY: 'rk', EMAIL_FROM: 'RugbyTactics <hola@rt.app>' } as NodeJS.ProcessEnv,
      fetchFn,
    )
    await mailer.sendCode('coach@club.com', '482913', 'login')

    expect(fetchFn).toHaveBeenCalledOnce()
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers).toMatchObject({ Authorization: 'Bearer rk' })
    const body = JSON.parse(init.body as string)
    expect(body.to).toEqual(['coach@club.com'])
    expect(body.html).toContain('482913')
  })

  it('uses Brevo HTTP API when only BREVO_API_KEY is set', async () => {
    const fetchFn = vi.fn(async () => okResponse)
    const mailer = createMailService(
      { BREVO_API_KEY: 'bk', EMAIL_FROM: 'hola@rt.app' } as NodeJS.ProcessEnv,
      fetchFn,
    )
    await mailer.sendCode('coach@club.com', '482913', 'register')

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(init.headers).toMatchObject({ 'api-key': 'bk' })
    const body = JSON.parse(init.body as string)
    expect(body.to).toEqual([{ email: 'coach@club.com' }])
  })

  it('throws when the HTTP provider responds with an error', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => 'bad key',
    }) as Response)
    const mailer = createMailService(
      { RESEND_API_KEY: 'rk', EMAIL_FROM: 'hola@rt.app' } as NodeJS.ProcessEnv,
      fetchFn,
    )
    await expect(mailer.sendCode('a@b.com', '111111', 'reset')).rejects.toThrow(/Resend/)
  })

  it('requires EMAIL_FROM for HTTP providers in production', () => {
    expect(() =>
      createMailService({ NODE_ENV: 'production', RESEND_API_KEY: 'rk' } as NodeJS.ProcessEnv),
    ).toThrow(/EMAIL_FROM/)
  })

  it('falls back to dev logger without config outside production', async () => {
    const mailer = createMailService({} as NodeJS.ProcessEnv)
    await expect(mailer.sendCode('a@b.com', '111111', 'login')).resolves.toBeUndefined()
  })
})
