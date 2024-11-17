import {createRoot} from "react-dom/client"
import React, {useState} from 'react'
import {newS56kDevice} from "@/midi/device"

import {Midi} from "@/midi/midi"
import {newClientCommon} from "./client-common"
import {ClientConfig} from "./config-client"
import {AppData, ProgramView} from "@/components/components-s56k";
import {Option, Selectable} from "@/components/components-common";
import {
    Container,
    createListCollection,
    Flex,
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectRoot,
    SelectTrigger,
    SelectValueText
} from "@chakra-ui/react";
import {Provider} from "@/components/provider";

function sanitize(val: string) {
    return encodeURI(val)
}

function desanitize(val: string) {
    return decodeURI(val)
}

function MidiDeviceSelect({name, label, onSelect, options}:
                              { name: string, label: string, onSelect: Function, options: Option[] }) {

    const s = options.filter(o => o.selected)
    const [selected, setSelected] = useState(s.length ? s[0].value : '')
    const items = options.map((o) => {
        return {label: o.name, value: o.value}
    })
    const data = createListCollection({items: items})
    return (

        <SelectRoot collection={data} name={name} value={[selected]} onValueChange={(event) => {
            const value = event.value[0]
            setSelected(value)
            onSelect(desanitize(value))
        }}>
            <SelectLabel>{label}</SelectLabel>
            <SelectTrigger>
                <SelectValueText placeholder={'Select...'}/>
            </SelectTrigger>
            <SelectContent>
                {data.items.map((item) => (
                    <SelectItem item={item} key={item.value}>{item.label}</SelectItem>
                ))}
            </SelectContent>
        </SelectRoot>
    )
}

function ControlApp({data}: { data: AppData }) {
    console.log(`data: ${JSON.stringify(data)}`)
    return (
        <Provider>
            <Container>
                <h1>S5000/S6000 Control</h1>
                <Flex direction={'column'} gap={5}>
                    <Flex>
                        <MidiDeviceSelect
                            name="midi-output"
                            label="MIDI Output"
                            onSelect={data.midiOutputs.onSelect}
                            options={data.midiOutputs.options}/>
                        <MidiDeviceSelect
                            name={'midi-intput'}
                            label={'MIDI Input'}
                            onSelect={data.midiInputs.onSelect}
                            options={data.midiInputs.options}/>
                    </Flex>
                    <ProgramView data={data.program}/>
                </Flex>
            </Container>
        </Provider>
    )
}

const common = newClientCommon((msg) => console.log(msg), (msg) => console.error(msg))
const appRoot = createRoot(document.getElementById('app'))
const midi = new Midi()
const device = newS56kDevice(midi, common.getOutput())
midi.start(async () => {
    const rcfg = await common.fetchConfig()
    if (rcfg.error) {
        common.error(rcfg.error)
        return
    }
    const cfg = rcfg.data as ClientConfig
    await midi.setOutputByName(cfg.midiOutput)
    await midi.setInputByName(cfg.midiInput)

    async function midiDeviceData(outputs: boolean) {
        return {
            onSelect: (deviceName) => {
                outputs ? midi.setOutputByName(deviceName) : midi.setInputByName(deviceName)
                outputs ? cfg.midiOutput = deviceName : cfg.midiInput = deviceName
                common.saveConfig(cfg)
            },
            options: (outputs ? await midi.getOutputs() : await midi.getInputs()).map(device => {
                return {
                    name: device.name,
                    selected: outputs ? midi.isCurrentOutput(device.name) : midi.isCurrentInput(device.name),
                    value: sanitize(device.name)
                } as Option
            })
        } as Selectable
    }

    // Fetch data from Sysex...
    device.init()
    const program = device.getCurrentProgram()
    const programInfoResult = await program.getInfo()
    const programOutputResult = await program.getOutput().getInfo()
    const errors: Error[] = programInfoResult.errors
        .concat(programOutputResult.errors)
    common.error(errors)


    const data = {
        midiOutputs: await midiDeviceData(true),
        midiInputs: await midiDeviceData(false),
        program: {
            info: programInfoResult.data,
            output: programOutputResult.data
        },
    } as AppData
    appRoot.render(<ControlApp data={data}/>)
}).catch((err) => console.error(err))