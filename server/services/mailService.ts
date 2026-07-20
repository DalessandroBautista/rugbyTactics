import nodemailer from 'nodemailer'
import type { AuthMailer, VerificationPurpose } from './authService.js'

const PURPOSE_LABELS: Record<VerificationPurpose, string> = {
  register: 'confirmar tu registro',
  login: 'iniciar sesión',
  reset: 'restablecer tu contraseña',
}

export function buildCodeEmail(
  code: string,
  purpose: VerificationPurpose,
): { subject: string; text: string; html: string } {
  const action = PURPOSE_LABELS[purpose]
  return {
    subject: `Tu código de RugbyTactics para ${action}`,
    text: [
      'RugbyTactics',
      '',
      `Usá este código para ${action}:`,
      '',
      code,
      '',
      'Vence en 10 minutos y sólo puede usarse una vez.',
      'Si no lo pediste, ignorá este mensaje.',
    ].join('\n'),
    html: `
      <div style="background:#111510;color:#e8eadf;padding:32px;font-family:Arial,sans-serif">
        <div style="max-width:520px;margin:0 auto;border:1px solid #3d4738;background:#1b211a;padding:28px">
          <p style="margin:0 0 8px;color:#d6a53b;font-size:12px;font-weight:700;letter-spacing:1.5px">RUGBYTACTICS</p>
          <h1 style="margin:0 0 18px;font-size:22px">Código de verificación</h1>
          <p style="color:#b9c1b4">Usá este código para ${action}:</p>
          <div style="margin:22px 0;padding:16px;border:1px dashed #d6a53b;color:#f1c45f;font-family:monospace;font-size:32px;font-weight:700;letter-spacing:8px;text-align:center">${code}</div>
          <p style="margin:0;color:#929c8d;font-size:13px;line-height:1.6">Vence en 10 minutos y sólo puede usarse una vez. Si no lo pediste, ignorá este mensaje.</p>
        </div>
      </div>
    `.trim(),
  }
}

function createResendMailer(apiKey: string, from: string, fetchFn: typeof fetch): AuthMailer {
  return {
    sendCode: async (email, code, purpose) => {
      const message = buildCodeEmail(code, purpose)
      const response = await fetchFn('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [email],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      })
      if (!response.ok) {
        throw new Error(`Resend respondió ${response.status}: ${await response.text()}`)
      }
    },
  }
}

function createBrevoMailer(apiKey: string, from: string, fetchFn: typeof fetch): AuthMailer {
  const match = from.match(/^(?:"?([^"<]*)"?\s*<)?([^<>\s]+@[^<>\s]+)>?$/)
  const sender = { name: match?.[1]?.trim() || 'RugbyTactics', email: match?.[2] ?? from }
  return {
    sendCode: async (email, code, purpose) => {
      const message = buildCodeEmail(code, purpose)
      const response = await fetchFn('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender,
          to: [{ email }],
          subject: message.subject,
          textContent: message.text,
          htmlContent: message.html,
        }),
      })
      if (!response.ok) {
        throw new Error(`Brevo respondió ${response.status}: ${await response.text()}`)
      }
    },
  }
}

export function createMailService(
  env: NodeJS.ProcessEnv = process.env,
  fetchFn: typeof fetch = fetch,
): AuthMailer {
  const httpKey = env.RESEND_API_KEY || env.BREVO_API_KEY
  if (httpKey) {
    if (!env.EMAIL_FROM) {
      if (env.NODE_ENV === 'production') throw new Error('EMAIL_FROM requerido para el proveedor HTTP de mail')
    } else {
      return env.RESEND_API_KEY
        ? createResendMailer(env.RESEND_API_KEY, env.EMAIL_FROM, fetchFn)
        : createBrevoMailer(env.BREVO_API_KEY!, env.EMAIL_FROM, fetchFn)
    }
  }

  const smtpConfigured = env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER &&
    env.SMTP_APP_PASSWORD && env.EMAIL_FROM

  if (!smtpConfigured) {
    if (env.NODE_ENV === 'production') throw new Error('Configuración SMTP incompleta')
    return {
      sendCode: async (email, code, purpose) => {
        console.info(`[mail:dev] ${purpose} para ${email}: ${code}`)
      },
    }
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: env.SMTP_SECURE !== 'false',
    auth: { user: env.SMTP_USER, pass: env.SMTP_APP_PASSWORD?.replace(/\s/g, '') },
  })

  return {
    sendCode: async (email, code, purpose) => {
      const message = buildCodeEmail(code, purpose)
      await transporter.sendMail({ from: env.EMAIL_FROM, to: email, ...message })
    },
  }
}
