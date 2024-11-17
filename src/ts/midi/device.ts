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
import {
    BooleanResult,
    ByteArrayResult,
    MutableNumber,
    MutableString,
    NumberResult,
    Result,
    StringResult
} from "../lib/lib-core";
import {newControlMessage, ResponseStatus, Section, Sysex, SysexControlMessage, SysexResponse} from "@/midi/sysex";
import {newProgramOutput, ProgramOutput} from "@/midi/devices/devices";



enum ErrorCode {
    NOT_SUPPORTED = 0,
    INVALID_FORMAT,
    PARAMETER_OUT_OF_RANGE
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
    GET_AFTERTOUCH_VALUE = 0x4B,
    GET_LEGATO_ENABLE = 0x4C,
    GET_PORTAMENTO_ENABLE = 0x4D,
    GET_PORTAMENTO_MODE = 0x4E,
    GET_PORTAMENTO_TIME = 0x4F,

    // LFO (DATA1 [1: LFO 1 | 2: LFO 2])
    GET_LFO_RATE = 0x60,        // DATA1: 1 | 2
    GET_LFO_DELAY = 0x61,       // DATA1: 1 | 2
    GET_LFO_DEPTH = 0x62,       // DATA1: 1 | 2

}





function newResult(res: SysexResponse): Result {
    const rv = {
        errors: [],
        data: []
    } as Result
    if (res.status == ResponseStatus.REPLY && res.data) {
        rv.data = res.data
    } else if (res.status == ResponseStatus.ERROR) {
        rv.errors.push(new Error(`Error: ${res.errorCode}: ${res.message}`))
    }

    return rv
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
        const length = signed ? bytes - 1 : bytes
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

function newBooleanResult(res: SysexResponse): BooleanResult {
    const result = newNumberResult(res, 1)
    return {
        errors: result.errors,
        data: !!result.data
    }
}


export interface ProgramInfo {
    name: MutableString
    id: number
    index: number
    keygroupCount: number
}

export interface ProgramInfoResult extends Result {
    data: ProgramInfo
}

export function newS56kDevice(midi, out: ProcessOutput) {
    return new S56kSysex(midi, out)
}


export interface S56kProgram {
    getName(): Promise<StringResult>

    getId(): Promise<NumberResult>

    getIndex(): Promise<NumberResult>

    getKeygroupCount(): Promise<NumberResult>

    getInfo(): Promise<ProgramInfoResult>

    getOutput(): ProgramOutput

    getMidiTune(): ProgramMidiTune

    getPitchBend(): ProgramPitchBend

    getLfos(): ProgramLfos
}

export interface S56kDevice {
    init()

    ping(): Promise<SysexResponse>

    getProgramCount(): Promise<NumberResult>

    getCurrentProgram(): S56kProgram

}

class S56kProgramSysex implements S56kProgram {
    private readonly sysex: Sysex;
    private readonly out: ProcessOutput;

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
        rv.errors = rv.errors
            .concat(programId.errors)
            .concat(programIndex.errors)
            .concat(keygroupCount.errors)
            .concat(programName.errors)
        rv.data = {
            id: programId.data,
            index: programIndex.data,
            keygroupCount: keygroupCount.data,
            name: {
                value: programName.data, mutator: (value: string) => {
                    this.out.log(`TODO: Write program name: ${value}`);
                    return []
                }
            },
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
    getOutput(): ProgramOutput {
        return newProgramOutput(this.sysex, this.out)
    }

    // MIDI/Tune
    getMidiTune(): ProgramMidiTune {
        return newProgramMidiTune(this.sysex, this.out)
    }

    getPitchBend(): ProgramPitchBend {
        return newProgramPitchBend(this.sysex, this.out)
    }

    getLfos(): ProgramLfos {
        return newProgramLfos(this.sysex, this.out)
    }
}


export interface DeviceSpec {
    className: string,
    sectionCode: number,
    items: any[]
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// PROGRAM OUTPUT
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export interface ProgramOutputInfo {
//     loudness: MutableNumber
//     velocitySensitivity: MutableNumber
//     ampMod1Source: MutableNumber
//     ampMod2Source: MutableNumber
//     ampMod1Value: MutableNumber
//     ampMod2Value: MutableNumber
//     panMod1Source: MutableNumber
//     panMod2Source: MutableNumber
//     panMod3Source: MutableNumber
//     panMod1Value: MutableNumber
//     panMod2Value: MutableNumber
//     panMod3Value: MutableNumber
// }
//
// export interface ProgramOutputInfoResult extends Result {
//     data: ProgramOutputInfo
// }
//
// export interface ProgramOutput {
//     getLoudness(): Promise<NumberResult>
//
//     getVelocitySensitivity(): Promise<NumberResult>
//
//     getAmpMod1Source(): Promise<NumberResult>
//
//     getAmpMod2Source(): Promise<NumberResult>
//
//     getAmpMod1Value(): Promise<NumberResult>
//
//     getAmpMod2Value(): Promise<NumberResult>
//
//     getPanMod1Source(): Promise<NumberResult>
//
//     getPanMod2Source(): Promise<NumberResult>
//
//     getPanMod3Source(): Promise<NumberResult>
//
//     getPanMod1Value(): Promise<NumberResult>
//
//     getPanMod2Value(): Promise<NumberResult>
//
//     getPanMod3Value(): Promise<NumberResult>
//
//     getInfo(): Promise<ProgramOutputInfoResult>
// }
// const programOutputSpec = {
//     className: "ProgramOutput",
//     sectionCode: Section.PROGRAM,
//     items: [
//         // | general                                 | set request spec. req data length encoded in length of the spec array
//         // | method name root, type spec             | item code, req data, response data type, response data length | item code, [req byte 1 (type | value), ..., req byte n (type | value) ]
//         // |                   'number|min|max|step" |
//         // |                   'string|max'          |
//         ["Loudness", "number|0|100|1", 0x28, [], "uint8", 1, 0x20, ["uint8"]],
//         ["VelocitySensitivity", "number|-100|100|1", 0x29, [], "uint8", 1, 0x21, ["int8sign", "int8abs"]],
//         ["AmpMod1Source", "number|0|14|1", 0x2A, [1], "uint8", 1, 0x22, [1, "uint8"]],
//         ["AmpMod2Source", "number|0|14|1", 0x2A, [2], "uint8", 1, 0x22, [2, "uint8"]],
//         ["AmpMod1Value", "number|-100|100|1", 0x2B, [1], "int8", 2, 0x23, [1, "int8sign", "int8abs"]],
//         ["AmpMod2Value", "number|-100|100|1", 0x2B, [2], "int8", 2, 0x23, [2, "int8sign", "int8abs"]],
//         ["PanMod1Source", "number|0|14|1", 0x2C, [1], "uint8", 1, 0x24, [1, "uint8"]],
//         ["PanMod2Source", "number|0|14|1", 0x2C, [2], "uint8", 1, 0x24, [2, "uint8"]],
//         ["PanMod3source", "number|0|14|1", 0x2C, [3], "uint8", 1, 0x24, [3, "uint8"]],
//         ["PanMod1Value", "number|-100|100|1", 0x2D, [1], "int8", 2, 0x25, [1, "int8sign", "int8abs"]],
//         ["PanMod2Value", "number|-100|100|1", 0x2D, [2], "int8", 2, 0x25, [2, "int8sign", "int8abs"]],
//         ["PanMod3Value", "number|-100|100|1", 0x2D, [3], "int8", 2, 0x25, [3, "int8sign", "int8abs"]],
//     ]
// }
//
// function newProgramOutput(sysex: Sysex, out: ProcessOutput): ProgramOutput {
//     return newDeviceObject(programOutputSpec, sysex, out) as ProgramOutput
// }

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// PROGRAM MIDI TUNE
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface ProgramMidiTuneInfoResult extends Result {
    data: ProgramMidiTuneInfo
}

export interface ProgramMidiTuneInfo {
    semitoneTune: MutableNumber
    fineTune: MutableNumber
    tuneTemplate: MutableNumber
    key: MutableNumber
}

export interface ProgramMidiTune {
    getSemitoneTune(): Promise<NumberResult>

    getFineTune(): Promise<NumberResult>

    getTuneTemplate(): Promise<NumberResult>

    getKey(): Promise<NumberResult>

    getInfo(): Promise<ProgramMidiTuneInfoResult>
}

const programMidTuneSpec = {
    className: "ProgramMidiTune",
    sectionCode: Section.PROGRAM,
    items: [
        ["SemitoneTune", "number|-36|36|1", 0x38, [], "int8", 2, 0x30, ["int8sign", "int8abs"]],
        ["FineTune", "number|-50|50|1", 0x39, [], "int8", 2, 0x31, ["int8sign", "int8abs"]],
        ["TuneTemplate", "number|0|7|1", 0x3A, [], 'uint8', 1, 0x32, ["uint8"]],
        ["Key", "number|0|11|1", 0x3C, [], 'uint8', 1, 0x34, ["uint8"]],
    ]
}

function newProgramMidiTune(sysex: Sysex, out: ProcessOutput): ProgramMidiTune {
    return newDeviceObject(programMidTuneSpec, sysex, out) as ProgramMidiTune
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// PROGRAM PITCH BEND
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export interface ProgramPitchBendInfoResult extends Result {
    data: ProgramPitchBendInfo
}

export interface ProgramPitchBendInfo {
    pitchBendUp: MutableNumber
    pitchBendDown: MutableNumber
    bendMode: MutableNumber
    aftertouchValue: MutableNumber
    legatoEnable: MutableNumber
    portamentoEnable: MutableNumber
    portamentoMode: MutableNumber
    portamentoTime: MutableNumber
}

export interface ProgramPitchBend {
    getPitchBendUp(): Promise<NumberResult>

    getPitchBendDown(): Promise<NumberResult>

    getBendMode(): Promise<NumberResult>

    getAftertouchValue(): Promise<NumberResult>

    getLegatoEnable(): Promise<BooleanResult>

    getPortamentoEnable(): Promise<BooleanResult>

    getPortamentoMode(): Promise<NumberResult>

    getPortamentoTime(): Promise<NumberResult>

    getInfo(): Promise<ProgramPitchBendInfoResult>
}

const programPitchBendSpec = {
    className: "ProgramPitchBend",
    sectionCode: Section.PROGRAM,
    items: [
        ["PitchBendUp", "number|0|24|1", 0x48, [], "uint8", 1, 0x40, ["uint8"]],
        ["PitchBendDown", "number|0|24|1", 0x49, [], "uint8", 1, 0x41, ["uint8"]],
        ["BendMode", "number|0|1|1", 0x4A, [], "uint8", 1, 0x42, ["uint8"]],
        ["AftertouchValue", "number|-12|12|1", 0x4B, [], "int8", 2, 0x43, ["int8sign", "int8abs"]],
        ["LegatoEnable", "number|0|1|1", 0x4C, [], "uint8", 1, 0x44, ["uint8"]],
        ["PortamentoEnable", "number|0|1|1", 0x4D, [], "uint8", 1, 0x45, ["uint8"]],
        ["PortamentoMode", "number|0|1|1", 0x4E, [], "uint8", 1, 0x46, ["uint8"]],
        ["PortamentoTime", "number|0|100|1", 0x4F, [], "uint8", 1, 0x47, ["uint8"]],
    ]
}

function newProgramPitchBend(sysex: Sysex, out: ProcessOutput): ProgramPitchBend {
    return newDeviceObject(programPitchBendSpec, sysex, out) as ProgramPitchBend
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// PROGRAM PITCH BEND
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface ProgramLfosInfoResult extends Result {
    data: ProgramLfosInfo
}

export interface ProgramLfosInfo {
    lfo1Rate: MutableNumber
    lfo2Rate: MutableNumber
    // pitchBendUp: MutableNumber
    // pitchBendDown: MutableNumber
    // bendMode: MutableNumber
    // aftertouchValue: MutableNumber
    // legatoEnable: MutableNumber
    // portamentoEnable: MutableNumber
    // portamentoMode: MutableNumber
    // portamentoTime: MutableNumber
}

export interface ProgramLfos {
    // getPitchBendUp(): Promise<NumberResult>
    //
    // getPitchBendDown(): Promise<NumberResult>
    //
    // getBendMode(): Promise<NumberResult>
    //
    // getAftertouchValue(): Promise<NumberResult>
    //
    // getLegatoEnable(): Promise<BooleanResult>
    //
    // getPortamentoEnable(): Promise<BooleanResult>
    //
    // getPortamentoMode(): Promise<NumberResult>
    //
    // getPortamentoTime(): Promise<NumberResult>

    getInfo(): Promise<ProgramLfosInfoResult>
}

const programLfosSpec = {
    className: "ProgramLfos",
    sectionCode: Section.PROGRAM,
    items: [
        // ["PitchBendUp", "number|0|24|1", 0x48, [], "uint8", 1, 0x40, ["uint8"]],
        // ["PitchBendDown", "number|0|24|1", 0x49, [], "uint8", 1, 0x41, ["uint8"]],
        // ["BendMode", "number|0|1|1", 0x4A, [], "uint8", 1, 0x42, ["uint8"]],
        // ["AftertouchValue", "number|-12|12|1", 0x4B, [], "int8", 2, 0x43, ["int8sign", "int8abs"]],
        // ["LegatoEnable", "number|0|1|1", 0x4C, [], "uint8", 1, 0x44, ["uint8"]],
        // ["PortamentoEnable", "number|0|1|1", 0x4D, [], "uint8", 1, 0x45, ["uint8"]],
        // ["PortamentoMode", "number|0|1|1", 0x4E, [], "uint8", 1, 0x46, ["uint8"]],
        // ["PortamentoTime", "number|0|100|1", 0x4F, [], "uint8", 1, 0x47, ["uint8"]],
    ]
}

function newProgramLfos(sysex: Sysex, out: ProcessOutput): ProgramLfos {
    return newDeviceObject(programLfosSpec, sysex, out) as ProgramLfos
}

/**
 * Dynamically generates a device object that implements sysex getter/setter methods based on the given spec
 *
 * @param spec -- a spec object describing the getters and setters the device object should have
 * @param sysex -- a Sysex client that knows how to send and receive Akai S56k system exclusive messages
 * @param out -- a wrapper around stdout/stderr and/or console.log/console.err, depending on execution context (nodejs or browser)
 */
export function newDeviceObject(spec, sysex: Sysex, out: ProcessOutput) {
    const sectionCode = spec.sectionCode
    const obj = {}

    for (const item of spec.items) {
        let i = 0
        const methodName = item[i++] as string
        const dataTypeSpec = item[i++] as string
        const getterItemCode = item[i++] as number
        const getterRequestData = item[i++] as number[]
        const responseType = item[i++] as string
        const responseSize = item[i++] as number
        obj[`get${methodName}`] = async () => {
            const res = await sysex.sysexRequest(newControlMessage(sectionCode, getterItemCode, getterRequestData))
            switch (responseType) {
                case "uint8":
                    return newNumberResult(res, responseSize)
                case "int8":
                    return newNumberResult(res, responseSize, true)
                default:
                    return newByteArrayResult(res, responseSize)
            }
        }

        const setterItemCode = item[i++]
        const setterDataSpec = item[i++]
        const setterRequestData = []

        for (let i = 0; i < setterDataSpec.length; i++) {
            const d = setterDataSpec[i]
            if (typeof d === 'string') {
                // d describes the datum
                switch (d) {
                    case "uint8":
                        // Write a function into the current request data array that knows how to retrieve the value from
                        // the arguments of the method.
                        setterRequestData[i] = (value) => {
                            // write the argument in the current data slot (erasing this function, which we don't need anymore)
                            setterRequestData[i] = value
                        }
                        break
                    case "int8sign":
                        // this data byte is the sign byte signed int8. Write a function into the current request data array
                        // that knows how to retrieve the number passed in as an argument and replace itself and the next
                        // data byte with the two-byte version of the argument data
                        setterRequestData[i] = (value) => {
                            const int8 = value
                            // write the sign byte into the current data slot (erasing this function, which we don't need anymore)
                            setterRequestData[i] = (int8 >= 0) ? 0 : 1
                            // write the absolute value into the next data slot
                            setterRequestData[i + 1] = Math.abs(int8)
                        }
                        break
                    case "int8abs":
                        // This data byte is the absolute value of the signed int8
                        // Nothing to do here. The previous handler should have filled this in.
                        break
                    case "string":
                        //
                        // TODO: Need to stuff strings into the request data array.
                        // this means the request data can be variable length and my 1:1 spec:data array indexing scheme
                        // may not work, unless:
                        //
                        //   a) there is only one variable length parameter per request; and
                        //   b) the variable length parameter is at the end of the data array.
                        //
                        // I strongly suspect this is true.
                        //
                        break
                    default:
                        break
                }
            } else {
                // d is the literal datum
                setterRequestData.push(d)
            }
        }
        obj[`set${methodName}`] = async (value) => {
            // iterate over the setterRequestData to execute argument reading functions (which replace themselves with the
            // argument data
            for (let i = 0; i < setterRequestData.length; i++) {
                const d = setterRequestData[i]
                if (typeof d === 'function') {
                    // this *is* an argument-handling function. Call it with the arguments array
                    // d(arguments)
                    d(value)
                }
                // else: all other request data was inserted from the spec
            }
            return newResult(await sysex.sysexRequest(newControlMessage(sectionCode, setterItemCode, setterRequestData)))
        }
    }
    // Create get<...>Info() method
    obj[`getInfo`] = async () => {
        const info = {}
        let errors = []
        for (const item of spec.items) {
            const methodNameRoot = item[0]
            const getter = 'get' + methodNameRoot
            const setter = 'set' + methodNameRoot
            const dataTypeSpec = item[1]
            const propertyName = String(methodNameRoot).charAt(0).toLowerCase() + String(methodNameRoot).slice(1)
            const result = await obj[getter]()
            const propertyValue = {
                value: result.data,
                mutator: obj[setter]
            }
            if (dataTypeSpec.startsWith('number')) {
                const [type, min, max, step] = dataTypeSpec.split('|')
                propertyValue['type'] = type
                propertyValue['min'] = min
                propertyValue['max'] = max
                propertyValue['step'] = step
            }

            info[propertyName] = propertyValue
            errors = errors.concat(result.errors)
        }
        return {errors: errors, data: info}
    }

    return obj
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


export interface S5000 {
    init()
}

export function newVirtualS5000(midi: Midi, out: ProcessOutput): S5000 {
    return new VirtualS5000(midi, out)
}

class VirtualS5000 implements S5000 {
    private readonly midi: Midi;
    private readonly out: ProcessOutput;

    constructor(midi: Midi, out: ProcessOutput) {
        this.midi = midi
        this.out = out
    }

    init() {
        const out = this.out

        function log(msg) {
            out.log('vs5k sysex: ' + msg)
        }

        this.midi.addListener('sysex', async (event) => {
            log(`Sysex!!!`)
            Object.getOwnPropertyNames(event).sort().forEach((name) => log(`${name}: ${event[name]}`))
        })
    }
}

