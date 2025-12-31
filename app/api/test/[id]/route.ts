import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    context: { params: { id: string } }
) {
    const params = await context.params
    return NextResponse.json({
        message: 'Test endpoint working',
        id: params.id,
        timestamp: new Date().toISOString()
    })
}
