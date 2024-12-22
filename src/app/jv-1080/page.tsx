"use client"
import FormControl from "@mui/material/FormControl";
import {
    Button,
    ButtonGroup, FormControlLabel, FormGroup,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent, Switch,
} from "@mui/material";
import {Midi} from "@/midi/midi";
import {useState} from "react";
import {ClientConfig, newClientConfig} from "@/lib/config-client";
import {newClientCommon} from "@/lib/client-common";
import {Message, Note} from "webmidi";
import {Jv1080} from "@/midi/roland";
import IntField from "@/components/number-field";

const clientCommon = newClientCommon((msg) => console.log(msg), (msg) => console.error(msg))

const midiListener = (e) => {
    console.log(`Midi Event!!!!`)
    console.log(e)
    switch (e.type) {
        case 'noteon':
            const m: Message = e.message
            const note: Note = e.note
            console.log(`${new Date().getTime()}: ${e.type}, Chan: ${m.channel}, Note: ${note.name}, Vel: ${note.rawAttack}\n`)
            break
        default: {
            console.log(`${new Date().getTime()}: ${e.type}\n`)
        }
    }
}
const midi = new Midi()
const jv1080 = new Jv1080(midi, 16)
midi.start(() => {
    clientCommon.fetchConfig().then(r => {
            if (r.errors.length == 0) {
                const cfg = r.data
                midi.setInputByName(cfg.midiInput)
                midi.setOutputByName(cfg.midiOutput)

                midi.addListener('noteon', midiListener)
                midi.addListener('sysex', midiListener)

            } else {
                console.error(r.errors)
            }
        }
    )
}).then()


function getInputMenuItems() {
    return midi.getInputs().map(i => <MenuItem key={i.id} value={i.name}>{i.name}</MenuItem>);
}

function getOutputMenuItems() {
    return midi.getOutputs().map(i => <MenuItem key={i.id} value={i.name}>{i.name}</MenuItem>);
}

export default function Page() {
    const [inputMenuItems, setInputMenuItems] = useState(getInputMenuItems())
    const [outputMenuItems, setOutputMenuItems] = useState(getOutputMenuItems())
    const [selectedInput, setSelectedInput] = useState<string>("")
    const [selectedOutput, setSelectedOutput] = useState<string>("")
    const [clientConfig, setClientConfig] = useState<ClientConfig>(newClientConfig())

    return (
        <div className="container mx-auto">
            <div className="flex flex-col gap-10">
                <h1>Roland JV-1080</h1>
                <div className="flex gap-10">
                    <div className="flex gap-10 h-full">
                        <FormControl>
                            <InputLabel id="midi-input-select-label">MIDI Input</InputLabel>
                            <Select
                                labelId="midi-input-select-label"
                                id="midi-input-select"
                                value={selectedInput}
                                label="MIDI Input"
                                onChange={(e: SelectChangeEvent) => {
                                    setSelectedInput(e.target.value)
                                    clientConfig.midiInput = e.target.value
                                    clientCommon.saveConfig(clientConfig).then()
                                    setClientConfig(clientConfig)
                                    midi.setInputByName(clientConfig.midiInput)
                                }}>
                                {inputMenuItems}
                            </Select>
                        </FormControl>
                        <FormControl>
                            <InputLabel id="midi-output-select-label">MIDI Output</InputLabel>
                            <Select
                                labelId="midi-output-select-label"
                                id="midi-output-select"
                                value={selectedOutput}
                                label="MIDI Output"
                                onChange={(e: SelectChangeEvent) => {
                                    setSelectedOutput(e.target.value)
                                    clientConfig.midiOutput = e.target.value
                                    clientCommon.saveConfig(clientConfig).then()
                                    setClientConfig(clientConfig)
                                    midi.setOutputByName(clientConfig.midiOutput)
                                }}>
                                {outputMenuItems}
                            </Select>
                        </FormControl>
                    </div>
                    <Button variant="contained"
                            onClick={() => {
                                setInputMenuItems(getInputMenuItems())
                                setOutputMenuItems(getOutputMenuItems())
                                setSelectedInput(midi.getCurrentInput()?.name)
                                setSelectedOutput(midi.getCurrentOutput()?.name)
                            }}>Refresh MIDI</Button>
                    <Button variant="contained"
                            onMouseDown={() => {
                                const o = midi.getCurrentOutput()
                                o.sendNoteOn(60, {channels: 1, rawAttack: 64})
                            }}
                            onMouseUp={() => {
                                midi.getCurrentOutput().sendNoteOff(60)
                            }}>Test Note</Button>
                    <Button variant="contained"
                            onClick={() => {
                                console.log(`Test Sysex!!!!!`)
                                jv1080.testSysex()
                            }}
                    >Test Sysex</Button>
                    <ButtonGroup variant="contained">
                        <Button onClick={() => jv1080.panelModePerformance()}>Performance</Button>
                        <Button onClick={() => jv1080.panelModePatch()}>Patch</Button>
                        <Button onClick={() => jv1080.panelModeGm()}>GM</Button>
                    </ButtonGroup>
                    <IntField label="Perf. No." defaultValue={1} min={1} max={128}
                              onSubmit={n => jv1080.setPerformanceNumber(n - 1)}/>
                </div>
                <div className="flex gap-10">
                    <ButtonGroup label="Patch Group">
                        <Button onClick={() => {
                            jv1080.patchGroupUser()
                        }}>User</Button>
                        <Button onClick={() => {
                            jv1080.patchGroupPcm()
                        }}>PCM</Button>
                        <Button>EXP</Button>
                    </ButtonGroup>
                    <IntField label="Patch Grp. Id" defaultValue={1} min={1} max={128}
                              onSubmit={n => jv1080.setPatchGroupId(n - 1)}/>
                    <IntField label="Patch No." defaultValue={1} min={1} max={254}
                              onSubmit={n => jv1080.setPatchNumber(n - 1)}/>
                </div>
                <div className="flex gap-10">
                    <FormGroup>
                        <FormControlLabel control={<Switch onChange={e => jv1080.setInsertFx(e.target.checked)}/>} label="Insert EFX"/>
                        <FormControlLabel control={<Switch onChange={e => jv1080.setChorusFx(e.target.checked)}/>} label="Chorus"/>
                        <FormControlLabel control={<Switch onChange={e => jv1080.setReverbFx(e.target.checked)}/>} label="Reverb"/>
                    </FormGroup>
                    <FormGroup>
                        <FormControlLabel control={<Switch onChange={e => jv1080.setPatchRemain(e.target.checked)}/>} label="Patch Remain" />
                    </FormGroup>
                </div>
            </div>
        </div>)
}