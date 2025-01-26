import {
    wav2Akai,
    akaiFormat,
    akaiList,
    AkaiRecordType,
    akaiWrite,
    validateConfig, readAkaiData
} from "../../src/akaitools/akaitools";
import path from "path";
import {expect} from "chai";
import fs from "fs/promises";
import {
    KeygroupHeader,
    parseKeygroupHeader,
    parseProgramHeader,
    parseSampleHeader,
    ProgramHeader,
    SampleHeader
} from "../../src/midi/devices/s3000xl";
import {byte2nibblesLE} from "../../src/lib/lib-core";
import {akaiByte2String, nextByte} from "../../src/midi/akai-s3000xl";

describe('Test interaction w/ akaitools and akai files.', async () => {
    let diskFile = ""
    beforeEach(() => {
        diskFile = path.join('build', `akai.${new Date().getTime()}.img`)
    })

    afterEach(() => {
        fs.rm(diskFile).then().catch(() => {
        })
    })

    function newConfig() {
        return {
            akaiToolsPath: path.join('..', 'akaitools-1.5'),
            diskFile: diskFile
        }
    }

    it('Validates config', async () => {
        expect(await validateConfig(newConfig()))
    })

    it(`Formats an Akai disk image`, async function () {
        const c = newConfig()
        let result = await akaiFormat(c)
        result.errors.forEach(e => console.error(e))
        expect(result.errors.length).eq(0)
        expect(result.code).eq(0)
    })

    it(`Writes to an Akai disk image and lists its contents`, async function () {
        const c = newConfig()
        let result = await akaiFormat(c)
        expect(result.code).eq(0)
        expect(result.errors.length).eq(0)

        for (const n of ['saw.a3p', 'sawtooth.a3s', 'sine.a3s', 'square.a3s', 'test_program.a3p']) {
            const file = path.join('test', 'data', 's3000xl', 'instruments', n)
            const s = await fs.stat(file)
            expect(s.isFile())
            result = await akaiWrite(c, file, `/VOLUME 1/`)
            expect(result.code).eq(0)
            expect(result.errors.length).eq(0)
        }

        let listResult = await akaiList(newConfig())
        for (const e of listResult.errors) {
            console.error(e)
        }

        // the first entry should be a volume
        expect(listResult.errors).empty
        expect(listResult.data.length).eq(1)
        expect(listResult.data[0].type).eq(AkaiRecordType.VOLUME)

        // listing the volume should return some Akai objects
        listResult = await akaiList(newConfig(), listResult.data[0].name)
        expect(listResult.errors).empty
        expect(listResult.data.length).eq(5)
    })
    it(`Converts wav files to Akai sample format`, async () => {
        const source = path.join('test', 'data', 's3000xl', 'samples', 'kit.wav')
        const stat = await fs.stat(source)
        expect(stat.isFile())
        const targetDir = path.join('build')
        const c = newConfig()
        let result = await akaiFormat(c)
        expect(result.code).eq(0)
        expect(result.errors.length).eq(0)
        result = await wav2Akai(c, source, targetDir, 'kit'.padEnd(12, ' '))

        expect(!result.code)
        expect(result.errors).empty
    })
})


describe(`Test parsing Akai objects read by akaitools`, async () => {
    it(`Parses Akai program file`, async () => {
        const programPath = path.join('test', 'data', 's3000xl', 'instruments', 'test_program.a3p')
        const buffer = await fs.readFile(programPath)
        const data = []
        for (let i = 0; i < buffer.length; i++) {
            const nibbles = byte2nibblesLE(buffer[i])
            data.push(nibbles[0])
            data.push(nibbles[1])
        }
        let header = {} as ProgramHeader;
        parseProgramHeader(data, 1, header)
        expect(header.PRNAME).eq('TEST PROGRAM')
    })

    it(`Parses Akai sample header from file`, async () => {
        const samplePath = path.join('test', 'data', 's3000xl', 'instruments', 'sine.a3s')
        const data = await readAkaiData(samplePath);
        let header = {} as SampleHeader
        const bytesRead = parseSampleHeader(data, 0, header)
        console.log(`bytes read: ${bytesRead}`)
        console.log(`data size : ${data.length}`)
        expect(header.SHNAME).equal('SINE        ')
    })

    it(`Parses Akai program header from file`, async () => {
        const programPath = path.join('test', 'data', 's3000xl', 'instruments', 'test_program.a3p')
        const data = await readAkaiData(programPath)
        const programHeader = {} as ProgramHeader
        const bytesRead = parseProgramHeader(data, 1, programHeader)
        console.log(`bytes read: ${bytesRead}`)
        console.log(`data size : ${data.length}`)
        console.log(`Keygroup count: ${programHeader.GROUPS}`)
        expect(programHeader.PRNAME).equal('TEST PROGRAM')

        const kg = {} as KeygroupHeader
        parseKeygroupHeader(data.slice(384), 0, kg)
        expect(kg.SNAME1.startsWith('SINE'))

        const v = {value: 0, offset: 0}
        for (let i = 0; i < data.length; i += 2) {

            const kg = {} as KeygroupHeader
            parseKeygroupHeader(data.slice(i), 0, kg)
            if (kg.SNAME1.startsWith('SINE')) {
                console.log(`Bytes read by program: ${bytesRead}`)
                console.log(`OFFSET               : ${i}`)
                break
            }
        }


        // SNAM1 offset into data: 476
    })

    it(`Finds strings in akai files`, async () => {
        const programPath = path.join('test', 'data', 's3000xl', 'instruments', 'test_program.a3p')
        const data = await readAkaiData(programPath)
        let offset = 0
        const v = {value: 0, offset: offset * 2}
        const window = []
        while (v.offset < data.length) {
            nextByte(data, v)
            window.push(v.value)
            if (window.length > 12) {
                window.shift()
            }
            // console.log(window)
            const s = akaiByte2String(window)
            console.log(`${v.offset}: ${s}`)
        }
    })
})