/**
 * Components specific to the Akai S5000/S6000 sampler series
 */
import React, {useState} from "react";
import {ProgramInfo, ProgramOutputInfo} from "@/midi/device";
import {SimpleSelect, Selectable, Option, ControlPanel, MutableSlider} from "./components-common";
import {Flex, Tabs, NumberInput} from '@chakra-ui/react'
import {Slider} from '@/components/chakra/slider'

import {MutableNumber} from "@/lib/lib-core";


interface ProgramData {
    info: ProgramInfo
    output: ProgramOutputInfo
}

export interface AppData {
    midiOutputs: Selectable
    midiInputs: Selectable
    program: ProgramData
}

export function ProgramView({data}) {
    return (

        <Tabs.Root defaultValue={'output'}>
            <Tabs.List>
                <Tabs.Trigger value={'output'}>Program Output</Tabs.Trigger>
                <Tabs.Trigger value={'info'}>Program Info</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value={'output'}> <ProgramOutputView data={data.output}/></Tabs.Content>
            <Tabs.Content value={'info'}>Tab content for Program Info.</Tabs.Content>
        </Tabs.Root>
    )
}


function ProgramOutputView({data}: { data: ProgramOutputInfo }) {
    const variant = 'subtle'
    return (
        <Flex gap={4}>
            <ControlPanel title={'Loudness'} flexGrow={1} variant={variant}>
                <MutableSlider data={data.loudness} label={'Loudness'}/>
            </ControlPanel>

            <ControlPanel title={'Amp Mod 1'}>
                <ModSourceSelect modSource={data.ampMod1Source} label={'Source'}/>
                <MutableSlider data={data.ampMod1Value} label={'Value'}/>
            </ControlPanel>
            {/*<SlCard>*/}
            {/*    <div slot={'header'}>Amp Mod 1</div>*/}
            {/*    <ModSourceView modSource={output.ampMod1Source} label={'Source'}/>*/}
            {/*    <LabeledRange data={output.ampMod1Value} label={"Value"}/>*/}
            {/*</SlCard>*/}
            {/*<SlCard>*/}
            {/*    <div slot="header">Amp Mod 2</div>*/}
            {/*    <ModSourceView modSource={output.ampMod2Source} label={'Source'}/>*/}
            {/*    <LabeledRange data={output.ampMod2Value} label={"Value"}/>*/}
            {/*</SlCard>*/}
            {/*<SlCard>*/}
            {/*    <div slot="header">Pan Mod 1</div>*/}
            {/*    <ModSourceView modSource={output.panMod1Source} label={'Source'}/>*/}
            {/*    <LabeledRange data={output.panMod1Value} label={'Value'}/>*/}
            {/*</SlCard>*/}
            {/*<SlCard>*/}
            {/*    <div slot="header">Pan Mod 2</div>*/}
            {/*    <ModSourceView modSource={output.panMod2Source} label={'Source'}/>*/}
            {/*    <LabeledRange data={output.panMod2Value} label={'Value'}/>*/}
            {/*</SlCard>*/}
            {/*<SlCard>*/}
            {/*    <div slot="header">Pan Mod 3</div>*/}
            {/*    <ModSourceView modSource={output.panMod2Source} label={'Source'}/>*/}
            {/*    <LabeledRange data={output.panMod3Value} label={'Value'}/>*/}
            {/*</SlCard>*/}
        </Flex>
    )
}


// function ProgramInfoView({info}: { info: ProgramInfo }) {
//     return (
//         <div className={'flex columns-2'}>
//             <SlInput
//                 name="program-name"
//                 value={info.name.value}
//                 onSlChange={(event) => info.name.mutator((event.target as any).value)}/>
//             <div>Id:</div>
//             <div><SlFormatNumber value={info.id}/></div>
//             <div>Index:</div>
//             <div><SlFormatNumber value={info.index}/></div>
//             <div>Keygroup Count:</div>
//             <div><SlFormatNumber value={info.keygroupCount}/></div>
//         </div>
//     )
// }


function ModSourceSelect({modSource, label}: { modSource: MutableNumber, label: string }) {
    const [selected, setSelected] = useState("" + modSource.value)
    const items = {
        0: 'No Source',
        1: 'Modwheel',
        2: 'Pitch Bend',
        3: 'Aftertouch',
        4: 'External',
        5: 'Velocity',
        6: 'Keyboard',
        7: 'LFO 1',
        8: 'LFO 2',
        9: 'Amp Envelope',
        10: 'Filter Envelope',
        11: 'Aux Envelope',
        12: '+Modwheel',
        13: '+Pitch Bend',
        14: '+External'
    }
    return (
        <SimpleSelect
            options={Object.getOwnPropertyNames(items).map(key => {
                return {value: key, label: items[key], selected: key === selected} as Option
            })}
            mutator={modSource.mutator}
            label={label}
        />
    )
}