import fs from "fs/promises";
import {Entry, DirList} from "./api.ts"
import path from "path";
import {translate} from "../translate-lib";

export namespace brain {

    export function makeBreadCrumb(root: string, leaf: string) {
        return leaf.substring(root.length, leaf.length)
    }

    function exclude(entry: string) {
        return entry.startsWith('.') || entry.startsWith('$') || entry.startsWith('#')
    }

    export class Brain {
        private sourceRoot: string;
        private source: string;
        private targetRoot: string
        private target: string;

        constructor(home: string, target: string) {
            this.sourceRoot = path.resolve(home)
            this.source = this.sourceRoot
            this.targetRoot = path.resolve(target)
            this.target = this.targetRoot
        }

        async list(): Promise<DirList[]> {
            return [
                await this.getDirList(this.sourceRoot, this.source),
                await this.getDirList(this.targetRoot, this.target)
            ]
        }

        async getDirList(root, dirpath): Promise<DirList> {
            const dirlist = await fs.readdir(dirpath);
            const entries: Entry[] = [
                {
                    directory: true,
                    name: '..'
                }
            ]
            for (const entryName of dirlist) {
                try {
                    let stats = await fs.stat(path.join(dirpath, entryName));
                    if (!exclude(entryName)) {
                        entries.push({
                            directory: stats.isDirectory(),
                            name: entryName
                        })
                    }
                } catch (e) {
                    console.error(e)
                }
            }
            return {
                breadcrumb: makeBreadCrumb(root, dirpath),
                entries: entries
            } as DirList
        }

        async cdFromDir(newdir: string) {
            const newpath = await this.cd(this.source, newdir)
            if (newpath.startsWith(this.sourceRoot)) {
                this.source = newpath
            }
        }

        async cdToDir(newdir: string) {
            const newpath = await this.cd(this.target, newdir)
            console.log(`attempt to change target dir: ${newpath}`)
            if (newpath.startsWith(this.targetRoot)) {
                this.target = newpath
                console.log(`New target dir: ${this.target}`)
            } else {
                console.log(`New target dir not a subdir of target home: ${this.targetRoot}. Ignoring.`)
            }
        }

        private async cd(olddir: string, newdir: string) {
            console.log(`cd: newdir: ${newdir}`)
            const newpath = path.resolve(path.join(olddir, newdir))

            const stats = await fs.stat(newpath)
            if (newpath.startsWith(this.sourceRoot)) {
                console.log(`Changing cwd to ${newpath}`)
            } else {
                console.log(`Won't change directories outside home dir.`)
            }
            return newpath
        }

        async newTargetDir(newdir: string) {
            await this.mkdir(newdir)
        }

        // XXX: This is super dangerous. Need to aggresively check this input
        private async mkdir(newdir: string) {
            if (newdir !== '') {
                const newpath = path.resolve(path.join(this.target, newdir))
                if (newpath.startsWith(this.target)) {
                    console.log(`mkdir: ${newpath}`)
                    await fs.mkdir(newpath)
                }
            }
        }

        async translate(name) {
            console.log(`translate: ${name}`)
            const srcpath = path.resolve(path.join(this.source, name))
            const targetpath = path.resolve(path.join(this.target), path.parse(name).name)
            if (srcpath.startsWith(this.source) && targetpath.startsWith(this.target)) {
                await fs.stat(srcpath)
                await fs.mkdir(targetpath)
            }
            await translate.mpc2Sxk(srcpath, targetpath)
            this.target = targetpath
        }
    }
}