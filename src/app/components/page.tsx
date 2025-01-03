"use client"
import {Knob} from "@/components/knob";
import {useState} from "react";
import {Button, ButtonGroup, Stack} from "@mui/material";

import {DoubleThrowSwitch} from "@/components/components-core";

export default function Page() {
    const mainColor = "#aaaaaa"
    const [value, setValue] = useState(1)
    const [thingy, setThingy] = useState(0)
    const subscribers = new Set()
    const dataSource = {
        subscribe: ((onStoreChange) => {
            subscribers.add(onStoreChange)
            return () => {subscribers.delete(onStoreChange)}
        }),
        getSnapshot: () => value,
        getServerSnapshot: () => 0
    }
    return (<div className="container pt-10">
        <Stack className="flex flex-col items-center gap-5">
            <Knob strokeWidth={3}
                  onChange={(v) => {
                      console.log(`new value: ${v}`)
                      setValue(v)
                  }}
                  min={0}
                  max={5}
                  step={1}
                  dataSource={dataSource}
                  defaultValue={value}/>
            <div style={{color: mainColor}}>{value}</div>
            <Button onClick={() => setValue(4)}>Set Value to 4</Button>
            {thingy ? <><Knob defaultValue={64} min={0} max={127}/>
                    <div>Thingy B</div>
                </>
                : <><Knob defaultValue={127} min={0} max={127}/>
                    <div>Thingy A</div>
                </>}
            <DoubleThrowSwitch aLabel="A Label" bLabel="B Label"
                               onChange={(v) => setThingy(v)}/>
        </Stack>
    </div>)
}

