
import {NextRequest, NextResponse} from "next/server";
import {newServerConfig} from "@/lib/config-server";
import {list} from "@/lib/lib-fs-server";
import {getSessionData, getSessionId, saveSessionData} from "@/lib/lib-session";
import path from "path";
import fs from "fs/promises";

// Docs: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

export async function POST(request: NextRequest, {params}: { params: Promise<{ path: string[] }> }) {
    try {
        const location = (await params).path.shift()
        if (location !== 'source' && location !== 'target') {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error('Invalid location.')
        }
        const data = await request.json()
        if (data.path == undefined) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error('Invalid path.')
        }

        let sessionId = await getSessionId();
        const session = await getSessionData(sessionId)

        const normal = path.normalize(path.join(session.translate[location].join('/'), data.path))

        let cfg = await newServerConfig();
        const absolute = path.normalize(path.join(cfg[location + 'Root'], normal))

        if (!absolute.startsWith(cfg[location + 'Root'])) {
            // Make sure the absolute path is within the root directory
            // noinspection ExceptionCaughtLocallyJS
            throw new Error('Invalid')
        }

        const stats = await fs.stat(absolute)
        if (stats.isDirectory()) {
            session.translate[location] = normal.split('/')
            await saveSessionData(sessionId, session)
            return NextResponse.json({message: "OK", status: 200})
        } else {
            return NextResponse.json({message: "Invalid", status: 400})
        }
    } catch (e) {
        console.error(e)
        return NextResponse.json({message: "Not Found", status: 404})
    }
}