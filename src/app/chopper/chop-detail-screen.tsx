import React, {useEffect, useState} from "react";
import {SampleMetadata} from "@/model/sample";
import {getMeta} from "@/lib/client-translator";
import {FieldDisplay} from "@/components/components-core";
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    Divider, Paper,
    Slider,
    Table, TableBody,
    TableCell,
    TableRow,
    TextField
} from "@mui/material";

export function ChopDetailScreen(
    {
        file,
        onErrors = (e) => console.error(e),
        doIt
    }: {
        file: string | null,
        onErrors: (e: Error | Error[]) => void,
        doIt: (prefix: string, samplesPerBeat: number, beatsPerChop: number) => void
    }) {
    const [meta, setMeta] = useState<SampleMetadata | null>(null)
    const [bpm, setBpm] = useState<number>(120)
    const [beatsPerChop, setBeatsPerChop] = useState<number>(4)
    const [prefix, setPrefix] = useState<string>('chop.01')
    useEffect(() => {
        if (file) {
            getMeta(file).then(r => {
                if (r.errors.length) {
                    onErrors(r.errors)
                } else {
                    setMeta(r.data)
                }
            })
        }

    }, [file])

    function getSamplesPerBeat() {
        return Math.round(meta?.sampleRate / (bpm / 60))
    }

    function getTotalChops() {
        return Math.round(meta?.sampleLength / (getSamplesPerBeat() * beatsPerChop))
    }

    function getTotalBeats() {
        return Math.round(meta?.sampleLength / getSamplesPerBeat())
    }

    return (
        <Card className="w-1/2">
            <CardHeader title={`Let's chop this sample!`}
                        subheader={`${file ? file : 'Choose a file!'}`}/>
            <CardContent>

                <div className="flex flex-col gap-4">
                    {meta ? (
                            <>
                                <Paper><Metadata meta={meta}/></Paper>
                                <Paper className="flex gap-5">
                                    <Table><TableBody>
                                        <TableRow><TableCell>BPM</TableCell><TableCell>{bpm}</TableCell></TableRow>
                                        <TableRow><TableCell>Beats per
                                            Chop</TableCell><TableCell>{beatsPerChop}</TableCell></TableRow>
                                    </TableBody></Table>
                                    <Table><TableBody>
                                        <TableRow><TableCell>Total Beats</TableCell>
                                            <TableCell>{getTotalBeats()}</TableCell></TableRow>
                                        <TableRow><TableCell>Total
                                            Chops</TableCell><TableCell>{getTotalChops()}</TableCell></TableRow>
                                    </TableBody> </Table>
                                </Paper>
                                <Paper className="flex gap-5">
                                    <Table><TableBody>
                                        <TableRow>
                                            <TableCell>BPM
                                                <Slider value={bpm} min={60}
                                                        max={200}
                                                        valueLabelDisplay="auto"
                                                        step={1}
                                                        shiftStep={5}
                                                        onChange={e => setBpm(e.target.value)}/></TableCell>
                                        </TableRow>
                                    </TableBody>
                                    </Table>
                                    <Table>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>Beats per Chop
                                                    <Slider value={beatsPerChop} min={1} max={32} marks
                                                            valueLabelDisplay="auto"
                                                            step={1}
                                                            shiftStep={4}
                                                            onChange={e => setBeatsPerChop(e.target.value)}/></TableCell>
                                            </TableRow>
                                        </TableBody></Table>
                                </Paper>
                                <TextField label="Prog. Name" value={prefix} onChange={e => setPrefix(e.target.value)}/>
                                <Button variant="contained" onClick={() => doIt(prefix, getSamplesPerBeat(), beatsPerChop)}>Do
                                    It!</Button>
                            </>) :
                        (<></>)
                    }
                </div>
            </CardContent>
        </Card>
    )
}

function Metadata({meta}: { meta: SampleMetadata | null }) {
    if (!meta) {
        return (<></>)
    }
    return (
        <div className="flex gap-5">
            <Table>
                <TableBody>
                    <TableRow>
                        <TableCell className="">Sample Rate</TableCell><TableCell>{meta.sampleRate}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Channel Count</TableCell><TableCell>{meta.channelCount}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
            <Table>
                <TableBody>
                    <TableRow>
                        <TableCell>Bit Depth</TableCell><TableCell>{meta.bitDepth}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Sample Length</TableCell><TableCell>{meta.sampleLength}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    )
    // return (
    //     <div className="flex flex-col gap-4">
    //         <FieldDisplay label="Sample Rate" value={meta.sampleRate}/>
    //         <FieldDisplay label="Bit Depth" value={meta.bitDepth}/>
    //         <FieldDisplay label="Channel Count" value={meta.channelCount}/>
    //         <FieldDisplay label="Sample Length" value={meta.sampleLength}/>
    //     </div>)
}