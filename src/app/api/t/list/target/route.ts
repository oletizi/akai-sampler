import {NextResponse} from "next/server";
import {newServerConfig} from "@/lib/config-server";
import {list} from "@/lib/lib-fs-server";
import {getSessionData, getSessionId} from "@/lib/lib-session";

// Docs: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

export async function GET(request) {
    const session = await getSessionData(await getSessionId())
    return NextResponse.json(await list((await newServerConfig()).targetRoot + '/' + session.translate.target.join('/')))
}