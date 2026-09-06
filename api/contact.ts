const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS = 5
const requests = new Map<string, number[]>()
declare const process: { env: Record<string, string | undefined> }

function json(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  })
}

function clientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

function isRateLimited(request: Request) {
  const now = Date.now()
  const key = clientKey(request)
  const recent = (requests.get(key) || []).filter(time => now - time < WINDOW_MS)
  recent.push(now)
  requests.set(key, recent)
  return recent.length > MAX_REQUESTS
}

export async function POST(request: Request) {
  if (isRateLimited(request)) return json({ error: 'Please wait a few minutes and try again.' }, 429)

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 20_000) return json({ error: 'Message is too large.' }, 413)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Please check the form and try again.' }, 400)
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const company = typeof body.company === 'string' ? body.company.trim() : ''

  // Bots commonly fill hidden fields. Return success without sending so they do not adapt.
  if (company) return json({ ok: true })

  if (!name || name.length > 80 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || message.length < 10 || message.length > 5000) {
    return json({ error: 'Please complete every field with a valid email and message.' }, 400)
  }

  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_TO_EMAIL
  const from = process.env.CONTACT_FROM_EMAIL
  if (!apiKey || !to || !from) {
    console.error('Contact form email environment variables are not configured.')
    return json({ error: 'The form is temporarily unavailable. Please try again later.' }, 503)
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'nathan-shumate-contact-form/1.0'
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `Website message from ${name.replace(/[\r\n]/g, ' ')}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`
    })
  })

  if (!response.ok) {
    console.error('Resend rejected a contact form message.', response.status, await response.text())
    return json({ error: 'Your message could not be sent. Please try again later.' }, 502)
  }

  return json({ ok: true })
}

export function GET() {
  return json({ error: 'Method not allowed.' }, 405)
}
