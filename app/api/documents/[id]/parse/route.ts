import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const scriptPath = path.join(process.cwd(), 'scripts/parse-document.ts')

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const child = spawn('npx', ['ts-node', '--skip-project', scriptPath, id], {
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
        controller.enqueue(encoder.encode(`\n[Done — exit code ${code}]`))
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
