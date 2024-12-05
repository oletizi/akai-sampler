import {NextResponse} from "next/server";
import {loadClientConfig} from "@/server/config-server";
export async function GET(request) {
    const cfg = await loadClientConfig()
    return NextResponse.json( {data: cfg});
}