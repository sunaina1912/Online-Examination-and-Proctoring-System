import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { faceImageDataUrl, licenseImageDataUrl } = await req.json()

    if (!faceImageDataUrl || !licenseImageDataUrl) {
      return NextResponse.json(
        { error: 'Face image and driving license image are required.' },
        { status: 400 }
      )
    }

    const serviceUrl = process.env.PYTHON_PROCTORING_URL?.trim() || 'http://127.0.0.1:8001'
    const controller = new AbortController()
    const timeoutMs = Number(process.env.PYTHON_PROCTORING_TIMEOUT_MS ?? 20000)
    const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 20000)

    try {
      const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/license/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          face_image_data_url: faceImageDataUrl,
          license_image_data_url: licenseImageDataUrl,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        return NextResponse.json(
          {
            error: 'License verification service failed.',
            details: payload,
          },
          { status: response.status }
        )
      }

      return NextResponse.json(payload)
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Unable to reach the Python verification service.',
          reason: error instanceof Error ? error.name : 'service_unavailable',
        },
        { status: 503 }
      )
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
