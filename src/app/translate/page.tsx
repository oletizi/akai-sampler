"use client"
import {FileList} from "@/components/file-list"
import {listSource, listTarget} from "@/lib/client-translator";
import {useState} from "react";
import {Directory, FileSet} from "@/lib/lib-fs-api";

export default function Page() {
    const [source, updateSource] = useState<FileSet | null>(null)
    const [target, updateTarget] = useState<FileSet | null>(null)
    const filter = (f: File): boolean => {
        return f.name != undefined && !f.name.startsWith('.DS_Store')
    }

    if (!source) {
        listSource(filter).then(r => updateSource(r.data))
    }
    if (!target) {
        listTarget(filter).then(r => updateTarget(r.data))
    }

    function sourceSelect(f: File | Directory) {
        console.log(`Source select: `)
        console.log(f)
    }

    return (<div className="container mx-auto">
        <div className="flex gap-10">
            <div className="flex-1">
                <div>From:</div>
                <FileList data={source} onSelect={sourceSelect}/>
            </div>
            <div className="flex-1">
                <div>To:</div>
                <FileList data={target} onSelect={sourceSelect}/>
            </div>
        </div>
    </div>)
}
