import path from "pathe";
import fsp from "fs/promises"
import fs from 'fs'
import _ from 'lodash'
import {pad, ServerConfig} from '@oletizi/sampler-lib'
import {
    Akaitools,
    AkaiToolsConfig,
    KeygroupHeader_writeCP1,
    KeygroupHeader_writeCP2,
    KeygroupHeader_writeHINOTE,
    KeygroupHeader_writeHIVEL2,
    KeygroupHeader_writeLONOTE,
    KeygroupHeader_writeSNAME1,
    KeygroupHeader_writeSNAME2,
    newAkaitools,
    newAkaiToolsConfig,
    parseSampleHeader,
    ProgramHeader_writePRNAME,
    RAW_LEADER,
    readAkaiData,
    SampleHeader
} from "@oletizi/sampler-devices/s3k"

import {
    MapFunction,
    mapProgram, newDefaultAudioTranslate,
    newDefaultAudioFactory,
    TranslateContext
} from "@/lib-translate.js";
import {ExecutionResult} from "@oletizi/sampler-devices";
import {newDefaultSampleFactory, SampleFactory} from "@/sample.js";
import {tmpdir} from "node:os";


export interface S3kTranslateContext extends TranslateContext {
    akaiTools: Akaitools
}

export async function newDefaultTranslateContext() {
    const rv: S3kTranslateContext = {
        akaiTools: newAkaitools(await newAkaiToolsConfig()),
        fs: fsp,
        audioFactory: newDefaultAudioFactory(),
        audioTranslate: newDefaultAudioTranslate()
    }
    return rv
}

export async function map(ctx: S3kTranslateContext, mapFunction: MapFunction, opts: {
    source: string,
    target: string,
    prefix: string,
    partition: number,
    wipeDisk: boolean
}) {
    const rv = await mapProgram(ctx, mapFunction, opts)
    if (rv.errors.length > 0 || !rv.data) {
        return rv
    }

    const keygroups = rv.data
    const tools = ctx.akaiTools
    const audioTranslate = ctx.audioTranslate
    const fs = ctx.fs
    let count = 0

    if (opts.wipeDisk) {
        tools.akaiFormat(60, 1)
    }
    for (const keygroup of keygroups) {
        for (const zone of keygroup.zones) {
            const sourcePath = zone.audioSource.filepath
            const targetPath = opts.target
            const {name} = path.parse(sourcePath)
            const intermediatePath = path.join(tmpdir(), name + '.wav')
            const tr = await audioTranslate.translate(sourcePath, intermediatePath)
            if (tr.errors.length > 0) {
                rv.errors = tr.errors.concat(tr.errors)
                return rv
            }
            const targetName = pad(count++, 3);
            const r = await tools.wav2Akai(intermediatePath, targetPath, targetName)
            if (r.errors.length > 0) {
                rv.errors = rv.errors.concat(r.errors)
                return rv
            }
        }
    }
    for (const filename of await fs.readdir(opts.target)) {
        if (filename.endsWith('a3s')) {
            // write sample file to akai disk
            const result = await tools.akaiWrite(path.join(opts.target, filename), `/${opts.prefix}`, opts.partition)
            if (result.errors.length > 0) {
                rv.errors = rv.errors.concat(result.errors)
            }
        }
    }
    return rv
}

export interface ChopOpts {
    source: string;
    target: string;
    partition: number;
    prefix: string;
    samplesPerBeat: number;
    beatsPerChop: number;
    wipeDisk: boolean;
}

// XXX: This is super messy and should be refactored.
export async function chop(cfg: ServerConfig, tools: Akaitools, opts: ChopOpts, sampleFactory: SampleFactory = newDefaultSampleFactory()) {
    const rv: ExecutionResult = {code: -1, errors: []}
    if (opts.samplesPerBeat <= 0 || opts.beatsPerChop <= 0) {
        rv.errors.push(new Error(`Bad params: samplesPerBeat: ${opts.samplesPerBeat}, beatsPerChop: ${opts.beatsPerChop}`))
        return rv
    }
    if (!(await fsp.stat(opts.source)).isFile()) {
        rv.errors.push(new Error(`Source is not a regular file: ${opts.source}`))
        return rv
    }
    try {
        const stats = await fsp.stat(opts.target)
        if (!stats.isDirectory()) {
            rv.errors.push(new Error(`Target is not a directory: ${opts.target}`))
            return rv
        }
    } catch (e) {
        await fsp.mkdir(opts.target)
    }

    const sample = await sampleFactory.newSampleFromFile(opts.source)

    if (sample.getMetadata().sampleRate > 44100) {
        sample.to441()
    }
    if (sample.getMetadata().bitDepth > 16) {
        sample.to16Bit()
    }
    const sampleCount = sample.getSampleCount()
    const chopLength = opts.samplesPerBeat * opts.beatsPerChop
    let count = 0
    for (let i = 0; i < sampleCount; i += chopLength) {
        const chop = sample.trim(i, i + chopLength)
        let targetName = opts.prefix + '.' + _.pad(String(count), 2, ' ')
        const outfile = path.join(opts.target, targetName) + '.wav'
        await chop.writeToStream(fs.createWriteStream(outfile))
        const result = await tools.wav2Akai(outfile, opts.target, targetName)
        if (result.errors.length) {
            rv.errors = rv.errors.concat(result.errors)
        }
        count++
    }
    if (rv.errors.length === 0) {
        if (opts.wipeDisk) {
            await tools.akaiFormat(10, 1)
        }
        const keygroupSpec: { sample1: string, sample2: string | null }[] = []
        for (const f of await fsp.readdir(opts.target)) {
            if (f.endsWith('a3s')) {
                const result = await tools.akaiWrite(path.join(opts.target, f), `/${opts.prefix}`, opts.partition)
                if (result.errors.length !== 0) {
                    rv.errors = rv.errors.concat(rv.errors, result.errors)
                    return rv
                }
                // const buf = await fs.readFile(path.join(target, f))
                const data = await readAkaiData(path.join(opts.target, f))
                const sampleHeader = {} as SampleHeader
                parseSampleHeader(data, 0, sampleHeader)
                sampleHeader.raw = new Array(RAW_LEADER).fill(0).concat(data)

                console.log(`Checking sample name for stereo; ${sampleHeader.SHNAME}`)

                if (sampleHeader.SHNAME.endsWith('-R')) {
                    keygroupSpec[keygroupSpec.length - 1].sample2 = sampleHeader.SHNAME
                } else {
                    keygroupSpec.push({sample1: sampleHeader.SHNAME, sample2: null})
                }
                if (result.errors.length > 0) {
                    rv.errors = rv.errors.concat(result.errors)
                    return rv
                }

            }
        }
        const p = await tools.readAkaiProgram(cfg.getS3kDefaultProgramPath(keygroupSpec.length))
        if (p.keygroups.length != keygroupSpec.length) {
            rv.errors.push(new Error(`Keygroup count does not match. Program keygroups: ${p.keygroups.length}; expected keygroups: ${keygroupSpec.length}`))
            return rv
        } else {
            ProgramHeader_writePRNAME(p.program, opts.prefix)

            for (let i = 0; i < p.keygroups.length; i++) {
                const kg = p.keygroups[i]
                const spec = keygroupSpec[i]
                KeygroupHeader_writeLONOTE(kg, 60 + i)
                KeygroupHeader_writeHINOTE(kg, 60 + i)

                KeygroupHeader_writeSNAME1(kg, spec.sample1)
                KeygroupHeader_writeCP1(kg, 1)
                if (spec.sample2) {
                    KeygroupHeader_writeSNAME2(kg, spec.sample2)
                    KeygroupHeader_writeHIVEL2(kg, 127)
                    KeygroupHeader_writeCP2(kg, 1)
                }
            }
            const programPath = path.join(opts.target, opts.prefix + '.a3p');
            await tools.writeAkaiProgram(programPath, p)
            await tools.akaiWrite(programPath, `/${opts.prefix}`, opts.partition)
        }
    }
    if (rv.errors.length === 0) {
        rv.code = 0
    }
    return rv
}