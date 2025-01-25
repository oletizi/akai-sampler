import {useEffect, useState} from "react";
import {DirectorySpec, FileSet, FileSpec} from "@/lib/lib-fs-api";
import {ChopApp} from "@/app/chopper/chop-app";
import {cdSource, listSource} from "@/lib/client-translator";
import {FileList, newItemAdornments} from "@/components/file-list"
import {ChopDetailScreen} from "@/app/chopper/ChopDetailScreen";

export function ChopScreen({app}: { app: ChopApp }) {
    const [dir, setDir] = useState<string>('/')
    const [files, setFiles] = useState<FileSet>(null)
    useEffect(() => {
        cdSource(dir).then(() => {
                listSource().then(r => {
                    if (r.errors.length > 0) {
                        app.onErrors(r.errors)
                    } else {
                        setFiles(r.data)
                        setDir('/' + r.data.path.join('/'))
                    }
                })
            }
        )
    }, [dir])

    function visitItem(item: FileSpec | DirectorySpec) {
        const rv = newItemAdornments()
        rv.clickable = item.isDirectory
        rv.translatable = (!item.isDirectory) && item.name.toUpperCase().endsWith('.WAV')
        rv.onClick = () => {
            setDir(item.name)
        }
        rv.onTranslate = () => {
            app.setScreen(<ChopDetailScreen file={item.name}/>)
        }
        return rv
    }

    return (
        <div className="flex flex-col">
            <div>Let's pick a sample to chop!:</div>
            <div>Source: {dir}</div>
            <FileList data={files} visit={visitItem}/>
        </div>
    )
}