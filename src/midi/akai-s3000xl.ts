import * as midi from 'midi'
import {byte2nibblesLE, bytes2numberLE, nibbles2byte} from "@/lib/lib-core";
import {newClientOutput, ProcessOutput} from "@/lib/process-output";
import {
    KeygroupHeader, parseKeygroupHeader,
    parseProgramHeader,
    parseSampleHeader,
    ProgramHeader,
    SampleHeader
} from "@/midi/devices/s3000xl";
import midi, {output} from "midi";
import {data} from "autoprefixer";
import {message} from "blessed";

export interface Device {

    init(): Promise<void>

    fetchSampleNames(names: any[]): Promise<String[]>

    fetchSampleHeader(sampleNumber: number, header: SampleHeader): Promise<SampleHeader>

    fetchProgramNames(names: string[]): Promise<string[]>

    getProgramNames(names: string[]): string[]

    getProgramHeader(programName: string): ProgramHeader

    fetchProgramHeader(programNumber: number, header: ProgramHeader): Promise<ProgramHeader>

    fetchKeygroupHeader(programNumber: number, keygroupNumber: number, header: KeygroupHeader): Promise<KeygroupHeader>

    updateProgramName(header: ProgramHeader, name: string): Promise<void>

    writeProgram(header: ProgramHeader): Promise<void>
}

export function newDevice(input: midi.Input, output: midi.Output, out: ProcessOutput = newClientOutput()): Device {
    return new s3000xl(input, output, out)
}


// noinspection JSUnusedGlobalSymbols
enum Opcode {
    // ID	Mnemonic	Direction	Description
    // 00h	RSTAT	<	request S1000 status
    RSTAT = 0x00,
    // 01h	STAT	>	S1000 status report
    STAT,
    // 02h	RPLIST	>	request list of resident program names
    RPLIST,
    // 03h	PLIST	>	list of resident program names
    PLIST,
    // 04h	RSLIST	<	request list of resident sample names
    RLIST,
    // 05h	SLIST	>	list of resident sample names
    SLIST,
    // 06h	RPDATA	<	request program common data
    RPDATA,
    // 07h	PDATA	<>	program common data
    PDATA,
    // 08h	RKDATA	<	request keygroup data
    RKDATA,
    // 09h	KDATA	<>	keygroup data
    KDATA,
    // 0Ah	RSDATA	<	request sample header data
    RSDATA,
    // 0Bh	SDATA	<>	sample header data
    SDATA,
    // 0Ch	RSPACK	<	request sample data packet(s)
    RSPACK,
    // 0Dh	ASPACK	<	accept sample data packet(s)
    ASPACK,
    // 0Eh	RDDATA	<	request drum settings
    OxRDDATA,
    // 0Fh	DDATA	<>	drum input settings
    DDATA,
    // 10h	RMDATA	<	request miscellaneous data
    RMDATA,
    // 11h	MDATA	<>	miscellaneous data
    MDATA,
    // 12h	DELP	<	delete program and its keygroup
    DELP,
    // 13h	DELK	<	delete keygroup
    DELK,
    // 14h	DELS	<	delete sample header and data
    DELS,
    // 15h	SETEX	<	set S1000 exclusive channel
    SETEX,
    // 16h	REPLY	>	S1000 command reply (error or ok)
    REPLY,
    // 1Dh	CASPACK	<	corrected ASPACK
    CASPACK = 0x1D
}


class s3000xl implements Device {
    private readonly midiInput: midi.Input;
    private readonly midiOutput: midi.Output;
    private readonly programNames: string[] = []
    private readonly programs = {}
    private readonly sampleNames: string[] = []

    private readonly out: ProcessOutput

    constructor(input: midi.Input, output: midi.Output, out: ProcessOutput) {
        this.midiInput = input
        this.midiOutput = output
        this.out = out
    }

    async init() {
        const names = await this.fetchProgramNames([])
        for (let i = 0; i < names.length; i++) {
            const header = {} as ProgramHeader
            await this.fetchProgramHeader(i, header)
            this.programs[names[i]] = header
        }
    }


    getProgramNames(names: string[]) {
        this.programNames.forEach(n => names.push(n))
        return names
    }

    async fetchProgramNames(names: string[] = []) {
        const out = this.out
        this.programNames.length = 0
        let offset = 5

        out.log(`Request program names...`)
        const m = await this.send(Opcode.RPLIST, [])
        out.log(`Received program names.`)

        let b = m.slice(offset, offset + 2)
        offset += 2
        const programCount = bytes2numberLE(b)

        for (let i = 0; i < programCount; i++, offset += 12) {
            let n = akaiByte2String(m.slice(offset, offset + 12));
            this.programNames.push(n)
            names.push(n)
        }
        return names
    }

    async fetchSampleNames(names: string[]) {
        this.sampleNames.length = 0
        let offset = 5
        const m = await this.send(Opcode.RLIST, [])
        let b = m.slice(offset, offset + 2);
        offset += 2
        const sampleCount = bytes2numberLE(b)
        for (let i = 0; i < sampleCount; i++, offset += 12) {
            const n = akaiByte2String(m.slice(offset, offset + 12));
            this.sampleNames.push(n)
            names.push(n)
        }
        return names
    }

    getProgramHeader(programName: string): ProgramHeader {
        return this.programs[programName]
    }

    async fetchProgramHeader(programNumber: number, header: ProgramHeader) {
        // See header spec: https://lakai.sourceforge.net/docs/s2800_sysex.html
        const out = this.out//newClientOutput(true, 'getProgramHeader')
        const m = await this.send(Opcode.RPDATA, byte2nibblesLE(programNumber))
        const v = {value: 0, offset: 5}
        out.log(`PNUMBER: offset: ${v.offset}`)
        header['PNUMBER'] = nextByte(m, v).value
        const headerData = m.slice(v.offset, m.length - 1)
        parseProgramHeader(headerData, 1, header)
        header.raw = m
        out.log(header)
        return header
    }

    async writeProgram(header: ProgramHeader) {
        const data = header.raw
        await this.send(Opcode.PDATA, data)
    }

    async updateProgramName(header: ProgramHeader, name: string) {
        const offset = 13 // offset into raw sysex message for start of program name
        let v = ''
        for (let i = offset; i < offset + 12 * 2; i += 2) {
            const b = nibbles2byte(header.raw[i], header.raw[i + 1])
            v += akaiByte2String([b])
        }
        this.out.log(`current name: ${v}`)


        const data = string2AkaiBytes(name)
        for (let i = offset, j = 0; i < offset + 12 * 2; i += 2, j++) {
            const nibbles = byte2nibblesLE(data[j])
            header.raw[i] = nibbles[0]
            header.raw[i + 1] = nibbles[1]
        }

        v = ''
        for (let i = offset; i < offset + 12 * 2; i += 2) {
            const b = nibbles2byte(header.raw[i], header.raw[i + 1])
            v += akaiByte2String([b])
        }
        this.out.log(`new name: ${v}`)
        await this.send(Opcode.PDATA, header.raw)
    }

    async fetchKeygroupHeader(programNumber: number, keygroupNumber: number, header: KeygroupHeader) {
        const out = this.out //newClientOutput(true, 'getKeygroupHeader')
        const m = await this.send(Opcode.RKDATA, byte2nibblesLE(programNumber).concat(keygroupNumber))
        const v = {value: 0, offset: 5}
        out.log(`PNUMBER: offset: ${v.offset}`)
        header['PNUMBER'] = nextByte(m, v).value

        out.log(`KNUMBER: offset: ${v.offset}`)
        header['KNUMBER'] = m[v.offset++]
        out.log(`offset after KNUMBER: ${v.offset}`)

        const headerData = m.slice(v.offset, m.length - 1)
        parseKeygroupHeader(headerData, 0, header)
        out.log(header)
        return header
    }

    async fetchSampleHeader(sampleNumber: number, header: SampleHeader) {
        // See header spec: https://lakai.sourceforge.net/docs/s2800_sysex.html
        const out = this.out // newClientOutput(true, 'getSampleHeader')
        const m = await this.send(Opcode.RSDATA, byte2nibblesLE(sampleNumber))
        const v = {value: 0, offset: 5}
        out.log(`SNUMBER: offset: ${v.offset}`)
        header['SNUMBER'] = nextByte(m, v).value

        parseSampleHeader(m.slice(v.offset, m.length - 1), 0, header)
        out.log(header)
        return header
    }


    private async send(opcode: Opcode, data: number[]): Promise<number[]> {
        const out = this.out
        const input = this.midiInput
        const output = this.midiOutput
        const message = [
            0xf0, // 00: (240) SYSEX_START
            0x47, // 01: ( 71) AKAI
            0x00, // 02: (  0) CHANNEL
            opcode,
            0x48, // 04: ( 72) DEVICE ID
        ].concat(data)
        message.push(0xf7)  // 21: (247) SYSEX_END)

        const response = new Promise((resolve) => {
            function listener(delta: number, message: midi.MidiMessage) {
                // TODO: make sure the opcode in the response message is correct
                input.removeListener('message', listener)
                resolve(message)
            }

            input.on('message', listener)
        })

        out.log(`Sending message...`)
        output.sendMessage(message)
        return response
    }

}

const ALPHABET = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q',
    'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#', '+', '-', '.']

export function akaiByte2String(bytes: number[]) {
    let rv = ''
    for (let v of bytes) {
        rv += ALPHABET[v]
    }
    return rv

}

export function string2AkaiBytes(s: string) {
    s = s.toUpperCase()
    const data = []
    for (let i = 0; i < 12; i++) {
        let akaiValue = 10 // default value is ' '
        if (s.length > i) {
            const c = s.charAt(i)
            for (let j = 0; j < ALPHABET.length; j++) {
                if (ALPHABET[j] === c) {
                    akaiValue = j
                }
            }
        }
        data.push(akaiValue)
    }
    return data
}

export function nextByte(nibbles, v: { value: number, offset: number }) {
    v.value = nibbles2byte(nibbles[v.offset], nibbles[v.offset + 1])
    v.offset += 2
    return v
}