/**
 * ## Sysex message structure
 * ```
 * <Start of SysEx> <AKAI ID> <S5000/6000 ID> <User-selectable Device ID> <User-Refs..> ...
 * ```
 *
 * Where the values of the bytes are:
 *```
 * <&F0> <&47> <&5E> <0..&7F> <0..&F7> ... {<240> <71> <94> <0..127> <0..247> ...}
 *```
 *
 * ## Complete control message
 * <&F0> <&47> <&5E> <0..&7F> <0..&7F> <...> <Section> <Item> <Data1> ... <DataN> <checksum> <&F7>
 *
 *  ## Sections
 *  +-----------+-------------------------------+
 *  | Section   | Description                   |
 *  +-----------+-------------------------------+
 *  | 0x00      | Sysex Configuration           |
 *  | 0x02      | System Setup                  |
 *  | 0x04      | MIDI Configuration            |
 *  | 0x06      | Keygroup Zone Manipulation    |
 *  | 0x08      | Keygroup Manipulation         |
 *  | 0x0A      | Program Manipulation          |
 *  | 0x0C      | Multi Manipulation            |
 *  | 0x0E      | Sample Tools                  |
 *  | 0x10      | Disk Tools                    |
 *  | 0x12      | Multi FX Control              |
 *  | 0x14      | Scenelist Manipulation        |
 *  | 0x16      | MIDI Songfile Tools           |
 *  | 0x20      | Front Panel Control           |
 *  | 0x2A      | Alt. Program Manipulation     |
 *  | 0x2C      | Alt. Multi Manipulation       |
 *  | 0x2E      | Alt. Sample Tools             |
 *  | 0x32      | Alt. Multi FX Control         |
 *  +-----------+-------------------------------+
 *
 * ### Section: Keygroup Zone
 *  +-----------+---------------+---------------+---------------------------+
 *  | Item      | Data 1        | Data 2        | Description               |
 *  |           | (Zone number) |               |                           |
 *  +-----------+----------------+--------------+---------------------------+
 *  | 0x21      | 0, 1-4        | N/A           | Get Zone Sample           |
 *  | 0x22      | 0, 1-4        | N/A           | Get Zone Level            |
 *  | ...       | ...           | ...           | ...                       |
 *  +-----------+---------------+---------------+---------------------------+
 */

import {Midi} from "./midi";
import {newClientOutput, ProcessOutput} from "../process-output";
import {Buffer} from 'buffer/'

enum ResponseStatus {
    OK = 79,
    DONE = 68,
    REPLY = 82,
    ERROR = 69
}

function getStatusMessage(status: number) {
    switch (status) {
        case ResponseStatus.OK:
            return "Ok"
        case ResponseStatus.DONE:
            return "Done"
        case ResponseStatus.REPLY:
            return "Reply"
        case ResponseStatus.ERROR:
            return "Error"
        default:
            return "Unknown"
    }
}

enum ErrorCode {
    NOT_SUPPORTED = 0,
    INVALID_FORMAT,
    PARAMETER_OUT_OF_RANGE
}

function getErrorMessage(errorCode: number) {
    switch (errorCode) {
        case 0:
            return "Error: Not supported"
        case 1:
            return "Error: Invalid message format"
        case 2:
            return "Error: Parameter out of range"
        case 3:
            return "Error: Device: Unknown error"
        case 4:
            return "Error: Not found"
        case 5:
            return "Error: Unable to create new element"
        case 6:
            return "Error: Unable to delete item"
        case 129:
            return "Error: Checksum invalid"
        case 257:
            return "Disk error: Selected disk invalid"
        case 258:
            return "Disk error: Error during load"
        case 259:
            return "Disk error: Item not found"
        case 260:
            return "Disk error: Unable to create"
        case 261:
            return "Disk error: Folder not empty"
        case 262:
            return "Disk error: Unable to delete"
        case 263:
            return "Disk error: Unknown error"
        case 264:
            return "Disk error: Error during save"
        case 265:
            return "Disk error: Insufficient space"
        case 266:
            return "Disk error: Media is write protected"
        case 267:
            return "Disk error: Name not unique"
        case 268:
            return "Disk error: Invalid disk handle"
        case 269:
            return "Disk error: Disk is empty"
        case 270:
            return "Disk error: Aborted"
        case 271:
            return "Disk error: Failed on open"
        case 272:
            return "Disk error: Read error"
        case 273:
            return "Disk error: Disk not ready"
        case 274:
            return "Disk error: SCSI error"
        case 385:
            return "Program error: Requested keygroup does not exist"
        default:
            return "Error code unknown"
    }
}

export interface SysexResponse {
    // 94 (product id)
    // 0  (deviceId)
    // 0  (userRef)
    // 79 ('O':OK) | 68 ('D':DONE) | 82 ('R':REPLY) | 69 ('E': ERROR)
    // 0  (Data 1)
    // 0  (Data 2)
    productId: number
    deviceId: number
    userRef: number
    status: ResponseStatus
    errorCode: number
    message: string
    section: number
    item: number
    data: number[]
}

function newResponse(event) {
    const data = event['dataBytes']
    const rv = {} as SysexResponse
    if (data && data.length >= 6) {
        let cursor = 0
        rv.productId = data[cursor++]
        rv.deviceId = data[cursor++]
        rv.userRef = data[cursor++]
        rv.status = data[cursor++]
        rv.data = []

        if (rv.status == ResponseStatus.REPLY) {
            // Reply messages have a section byte and an item byte before the data byte
            rv.section = data[cursor++]
            rv.item = data[cursor++]
        }
        for (; cursor < data.length; cursor++) {
            rv.data.push(data[cursor])
        }

        if (rv.status === ResponseStatus.ERROR) {
            rv.errorCode = data[4] * 128 + data[5]
            rv.message = getErrorMessage(rv.errorCode)
        } else {
            rv.errorCode = -1
            rv.message = getStatusMessage(rv.status)
        }
        rv.message += ` at ${event.timestamp}`
    } else {
        rv.productId = -1
        rv.deviceId = -1
        rv.userRef = -1
        rv.status = ResponseStatus.ERROR
        rv.errorCode = -1
        rv.message = "Unknown"
        rv.data = []
    }
    return rv as SysexResponse
}

enum Section {
    SYSEX_CONFIG = 0x00,
    SYSTEM_SETUP = 0x02,
    MIDI_CONFIG = 0x04,
    KEYGROUP_ZONE = 0x06,
    KEYGROUP = 0x08,
    PROGRAM = 0x0A,
    MULTI = 0x0C,
    SAMPLE_TOOLS = 0x0E,
    DISK_TOOLS = 0x10,
    FX = 0x12,
    SCENLIST = 0x14,
    SONGFILE = 0x16,
    FRONT_PANEL = 0x20,
    ALT_PROGRAM = 0x2A,
    ALT_MULTI = 0x2C,
    ALT_SAMPLE = 0x2E,
    ALT_FX = 0x32
}

interface Item {
    getCode(): number
}

enum SysexItem {
    QUERY = 0x00
}

enum ProgramItem {
    GET_PROGRAM_COUNT = 0x10,
    GET_ID = 0x11,
    GET_INDEX = 0x12,
    GET_NAME = 0x13,
    GET_KEYGROUP_COUNT = 0x14,
    GET_KEYGROUP_CROSSFADE = 0x15,

    // OUTPUT
    GET_LOUDNESS = 0x28,
    GET_VELOCITY_SENSITIVITY = 0x29,
    GET_AMP_MOD_SOURCE = 0x2A, // !!! This message requires data to select between amp mod source 1 or 2
    GET_AMP_MOD_VALUE = 0x2B,  // !!! Ibid.
    GET_PAN_MOD_SOURCE = 0x2C, // DATA1: 1 | 2 | 3
    GET_PAN_MOD_VALUE = 0x2D,  // DATA1: 1 | 2 | 3

    // MIDI/TUNE
    GET_SEMITONE_TUNE = 0x38,
    GET_FINE_TUNE = 0x39,
    GET_TUNE_TEMPLATE = 0x3A,
    GET_USER_TUNE_TEMPLATE = 0x3B,
    GET_KEY = 0x3C,

    // PITCH BEND
    GET_PITCH_BEND_UP = 0x48,
    GET_PITCH_BEND_DOWN = 0x49,
    GET_PITCH_BEND_MODE = 0x4A,
    GET_AFTERTOUCH_MOD = 0x4B,
    GET_AFTERTOUCH_VALUE = 0x4C,
    GET_PORTAMENTO_ENABLE = 0x4D,
    GET_PORTAMENTO_MODE = 0x4E,
    GET_PORTAMENTO_TIME = 0x4F,

    // LFO (DATA1 [1: LFO 1 | 2: LFO 2])
    GET_LFO_RATE = 0x60,        // DATA1: 1 | 2
    GET_LFO_DELAY = 0x61,       // DATA1: 1 | 2
    GET_LFO_DEPTH = 0x62,       // DATA1: 1 | 2

}

interface SysexControlMessage {
    section: Section
    item: number
    data: number[]
}

function newControlMessage(section: Section, item: number, data: number[]): SysexControlMessage {
    return {
        section: section,
        item: item,
        data: data
    } as SysexControlMessage
}

interface Result {
    errors: Error[]
    data: any
}

interface ByteArrayResult extends Result {
    data: number[]
}

interface NumberResult extends Result {
    data: number
}

interface StringResult extends Result {
    data: string
}

function newByteArrayResult(res: SysexResponse, bytes: number): ByteArrayResult {
    const rv = {
        errors: [],
        data: []
    } as ByteArrayResult
    if (res.status == ResponseStatus.REPLY && res.data && res.data.length >= bytes) {
        rv.data = rv.data.concat(res.data.slice(0, bytes))
    } else {
        rv.errors.push(new Error(`Malformed REPLY message for ByteArrayResult: ${res.status}: ${res.message}`))
    }
    return rv
}

function newNumberResult(res: SysexResponse, bytes: number, signed: boolean = false): NumberResult {
    const rv = {
        errors: []
    } as NumberResult
    if (signed && bytes < 2) {
        throw new Error("Error parsing SysexResponse for NumberResult. At least two bytes required for signed value.")
    }
    if (res.status == ResponseStatus.REPLY && res.data && res.data.length >= bytes) {
        let abs = 0
        // signed numbers use the first data byte for signed, where 0 is positive, 1 is negative
        const offset = signed ? 1 : 0
        const length = signed ? bytes -1 : bytes
        abs = Buffer.from(res.data).readIntBE(offset, length)
        rv.data = signed ? abs * (res.data[0] ? -1 : 1) : abs
    } else {
        rv.errors.push(new Error(`Malformed REPLY message for NumberResult: ${res.status}: ${res.message}`))
    }
    return rv
}

function newStringResult(res: SysexResponse): StringResult {
    const rv = {
        errors: [],
        data: '',
    } as StringResult
    if (res.status == ResponseStatus.REPLY && res.data && res.data.length > 0) {
        for (const c of res.data.filter(c => c != 0)) {
            rv.data += String.fromCharCode(c)
        }
    } else {
        rv.errors.push(new Error(`Malformed REPLY message for StringResult: ${res.status}: ${res.message}`))
    }
    return rv
}

export interface ProgramInfo {
    name: string
    id: number
    index: number
    keygroupCount: number
    loudness: number
    velocitySensitivity: number
    ampMod1Source: number

}

export interface ProgramInfoResult extends Result {
    data: ProgramInfo
}

export function newS56kDevice(midi, out: ProcessOutput) {
    return new S56kSysex(midi, out)
}


export interface S56kProgramOutput {
    getLoudness(): Promise<NumberResult>

    getVelocitySensitivity(): Promise<NumberResult>

    getAmpModSource(ampMod: 1 | 2): Promise<NumberResult>


    getAmpModValue(ampMod: 1 | 2): Promise<NumberResult>

    getPanModSource(panMod: 1 | 2 | 3): Promise<NumberResult>

    getPanModValue(panMod: 1 | 2 | 3): Promise<NumberResult>
}

export interface S56kProgram {
    getName(): Promise<StringResult>

    getId(): Promise<NumberResult>

    getIndex(): Promise<NumberResult>

    getKeygroupCount(): Promise<NumberResult>

    getInfo(): Promise<ProgramInfoResult>

    getOutput(): S56kProgramOutput
}

export interface S56kDevice {
    init()

    ping(): Promise<SysexResponse>

    getProgramCount(): Promise<NumberResult>

    getCurrentProgram(): S56kProgram

}

class S56kProgramSysex implements S56kProgram, S56kProgramOutput {
    private sysex: Sysex;
    private out: ProcessOutput;

    constructor(sysex: Sysex, out: ProcessOutput) {
        this.sysex = sysex
        this.out = out
    }

    async getInfo() {
        const rv = {
            errors: [],
            data: null
        } as ProgramInfoResult
        const programId = await this.getId()
        const programIndex = await this.getIndex()
        const keygroupCount = await this.getKeygroupCount()
        const programName = await this.getName()
        const loudness = await this.getLoudness()
        const velocitySensitivity = await this.getVelocitySensitivity()
        const ampMod1Source = await this.getAmpModSource(1)
        const ampMod2Source = await this.getAmpModSource(2)
        rv.errors = rv.errors
            .concat(programId.errors)
            .concat(programIndex.errors)
            .concat(keygroupCount.errors)
            .concat(programName.errors)
            .concat(loudness.errors)
            .concat(velocitySensitivity.errors)
            .concat(ampMod1Source.errors)
            .concat(ampMod2Source.errors)
        rv.data = {
            id: programId.data,
            index: programIndex.data,
            keygroupCount: keygroupCount.data,
            name: programName.data,
            loudness: loudness.data,
            velocitySensitivity: velocitySensitivity.data,
            ampMod1Source: ampMod1Source.data,
            ampMod2Source: ampMod2Source.data,
        } as ProgramInfo
        return rv
    }

    async getName(): Promise<StringResult> {
        return newStringResult(await this.sysex.sysexRequest(newControlMessage(Section.PROGRAM, ProgramItem.GET_NAME, [])))
    }

    async getId() {
        const res = await this.sysex.sysexRequest(newControlMessage(Section.PROGRAM, ProgramItem.GET_ID, []))
        return newNumberResult(res, 2)
    }

    async getIndex(): Promise<NumberResult> {
        return newNumberResult(
            await this.sysex.sysexRequest(newControlMessage(Section.PROGRAM, ProgramItem.GET_INDEX, [])),
            2
        )
    }

    async getKeygroupCount(): Promise<NumberResult> {
        return newNumberResult(
            await this.sysex.sysexRequest(newControlMessage(Section.PROGRAM, ProgramItem.GET_KEYGROUP_COUNT, [])),
            1
        )
    }

    // OUTPUT
    getOutput(): S56kProgramOutput {
        return this
    }

    async getLoudness(): Promise<NumberResult> {
        return newNumberResult(
            await this.sysex.sysexRequest(newControlMessage(Section.PROGRAM, ProgramItem.GET_LOUDNESS, [])),
            1
        )
    }

    async getVelocitySensitivity(): Promise<NumberResult> {
        return newNumberResult(
            await this.sysex.sysexRequest(newControlMessage(Section.PROGRAM, ProgramItem.GET_VELOCITY_SENSITIVITY, [])),
            2,
            true
        )
    }

    async getAmpModSource(ampMod: 1 | 2): Promise<NumberResult> {
        const res = newByteArrayResult(
            await this.sysex.sysexRequest(newControlMessage(Section.PROGRAM, ProgramItem.GET_AMP_MOD_SOURCE, [ampMod])),
            1
        )
        return {
            errors: res.errors,
            data: res.data[0]
        }
    }

    async getAmpModValue(ampMod: 1 | 2): Promise<NumberResult> {
        return newNumberResult(
            await this.sysex.sysexRequest(newControlMessage(Section.PROGRAM, ProgramItem.GET_AMP_MOD_VALUE, [ampMod])),
            2,
            true
        )
    }

    async getPanModSource(panMod: 1 | 2 | 3): Promise<NumberResult> {
        return newNumberResult(
            await this.sysex.sysexRequest(newControlMessage(Section.PROGRAM, ProgramItem.GET_PAN_MOD_SOURCE, [panMod])),
            1
        )
    }

    async getPanModValue(panMod: 1 | 2 | 3): Promise<NumberResult> {
        return newNumberResult(
            await this.sysex.sysexRequest(newControlMessage(Section.PROGRAM, ProgramItem.GET_PAN_MOD_VALUE, [panMod])),
            2,
            true
        )
    }
}

class S56kSysex implements S56kDevice {
    private readonly monitor: boolean;
    private readonly sysex: Sysex;
    private readonly midi: any;
    private readonly out: ProcessOutput;
    private readonly program: S56kProgramSysex;

    constructor(midi, out: ProcessOutput = newClientOutput(), monitor: boolean = false) {
        this.sysex = new Sysex(midi, out)
        this.program = new S56kProgramSysex(this.sysex, out)
        this.midi = midi
        this.out = out
        this.monitor = monitor
    }

    init() {
        if (this.monitor) {
            const out = this.out
            let sequence = 0
            this.midi.addListener('sysex', (event) => {
                const count = sequence++
                for (const name of Object.getOwnPropertyNames(event)) {
                    out.log(`MONITOR: ${count}: ${name} = ${event[name]}`)
                }
            })
        }
    }

    async getProgramCount() {
        const res = await this.sysex.sysexRequest(newControlMessage(Section.PROGRAM, ProgramItem.GET_PROGRAM_COUNT, []))
        return newNumberResult(res, 2)
    }

    async ping(): Promise<SysexResponse> {
        return this.sysex.sysexRequest({
            section: Section.SYSEX_CONFIG,
            item: SysexItem.QUERY,
            data: []
        } as SysexControlMessage)
    }

    getCurrentProgram(): S56kProgram {
        return this.program
    }
}

class Sysex {
    protected midi: Midi
    protected out: ProcessOutput

    constructor(midi: Midi, out: ProcessOutput) {
        this.midi = midi
        this.out = out
    }

    async sysexRequest(message: SysexControlMessage): Promise<SysexResponse> {
        const midi = this.midi
        const out = this.out
        const akaiID = 0x47
        const s56kId = 0x5E
        const deviceId = 0x00
        const userRef = 0x00
        return new Promise<any>((resolve, reject) => {
            let eventCount = 0

            function listener(event) {
                for (const name of Object.getOwnPropertyNames(event)) {
                    out.log(`SYSEX RESPONSE ${eventCount}: ${name} = ${event[name]}`)
                }
                let response = newResponse(event);
                if (response.status == ResponseStatus.OK) {
                    out.log(`SYSEX RESPONSE: ${eventCount}: OK`)
                } else {
                    out.log(`SYSEX RESPONSE: ${eventCount}: ${response.status}; Resolving.`)
                    midi.removeListener('sysex', listener)
                    resolve(response)
                }
                eventCount++
            }

            this.midi.addListener('sysex', listener)
            let data = [s56kId, deviceId, userRef, message.section, message.item].concat(message.data);
            out.log(`Sending sysex data: ${data}`)
            this.midi.sendSysex(akaiID, data)
            this.out.log(`Done sending sysex.`)
        })
    }
}

