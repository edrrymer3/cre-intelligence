import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { spawn } from 'child_process'
import path from 'path'

const SCRIPTS: Record<string, string> = {
  'discover-companies': 'scripts/discover-companies.ts',
  'discover-reits': 'scripts/discover-reits.ts',
  'extract-filings': 'scripts/extract-filings.ts',
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { script } = await req.json()
  if (!SCRIPTS[script]) {
    return NextResponse.json({ error: 'Unknown script' }, { status: 400 })
  }

  const scriptPath = path.join(process.cwd(), SCRIPTS[script])

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const child = spawn('npx', ['ts-node', '--skip-project', scriptPath], {
        env: { ...process.env },
        cwd: process.cwd(),
      })

      child.stdout.on('data', (data: Buffer) => {
        controller.enqueue(encoder.encode(data.toString()))
      })

      child.stderr.on('data', (data: Buffer) => {
        controller.enqueue(encoder.encode(data.toString()))
      })

      child.on('close', (code: number) => {
        controller.enqueue(encoder.encode(`\n[Script exited with code ${code}]`))
        controller.close()
      })

      child.on('error', (err: Error) => {
        controller.enqueue(encoder.encode(`\n[Error: ${err.message}]`))
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
