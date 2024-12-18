import {NextRequest, NextResponse} from "next/server";
import {newServerConfig} from "@/lib/config-server";
import {getSessionData, getSessionId, saveSessionData} from "@/lib/lib-session";
import path from "path";
import fs from "fs/promises";
import {translate} from "@/lib/lib-translate";


export async function POST(request: NextRequest, {params}: { params: Promise<{ path: string[] }> }) {
    try {
        const data = await request.json()
        if (data.path == undefined) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error('Invalid path.')
        }

        let sessionId = await getSessionId();
        const session = await getSessionData(sessionId)

        const normalSource = path.normalize(path.join(session.translate.source.join('/'), data.path))
        const name = path.parse(data.path).name
        const normalTarget = path.normalize(path.join(session.translate.target.join('/'), name))

        let cfg = await newServerConfig();
        const absoluteSource = path.normalize(path.join(cfg.sourceRoot, normalSource))
        const absoluteTarget = path.normalize(path.join(cfg.targetRoot, normalTarget))

        if (!(absoluteSource.startsWith(cfg.sourceRoot) && absoluteTarget.startsWith(cfg.targetRoot))) {
            // Make sure the absolute path is within the root directory
            // noinspection ExceptionCaughtLocallyJS
            throw new Error('Invalid')
        }

        try {
            await fs.stat(absoluteTarget)
            // The target exists. Bail.
            return NextResponse.json({message: "Invalid", status: 403})
        } catch (e) {
            // The target doesn't exist. Ok.
        }

        const statsSource = await fs.stat(absoluteSource)

        if (statsSource.isDirectory()) {
            return NextResponse.json({message: "Invalid", status: 403})
        } else {
            await fs.mkdir(absoluteTarget)
            if (absoluteSource.endsWith('.dspreset')) {
                // this is a Decent Sampler patch
                await translate.decent2Sxk(absoluteSource, absoluteTarget)
            } else if (absoluteSource.endsWith('.xpm')) {
                await translate.mpc2Sxk(absoluteSource, absoluteTarget)
            } else {
                return NextResponse.json({message: "Invalid", status: 403})
            }
            return NextResponse.json({message: "Ok", status: 200})
        }
    } catch (e) {
        console.error(e)
        return NextResponse.json({message: "Not Found", status: 404})
    }
}