import React from "react";
import {Input, Output} from "webmidi";
import {ProgramInfo} from "../midi/device";

let sequence = 0

export interface MidiDeviceSpec {
    name: string
    isActive: boolean
    action: () => void
}

function uid() {
    return sequence++ + '-' + Math.random().toString(16).slice(2)
}

export function ProgramInfoView(data: ProgramInfo) {
    const items = []
    for (const name of Object.getOwnPropertyNames(data).sort()) {
        items.push(<li className={'list-group-item'} key={name}>
            <div className={'row'}>
                <div className={'col'}><span className={'fw-bold'}>{name}</span></div>
                <div className={'col'}>{data[name]}</div>
            </div>
        </li>)
    }
    return (
        <div className={'card'}>
            <div className={'card-header'}>Program Info</div>
            <div className={'card-body'}>
                <ul className={'list-group'}>
                    {items}
                </ul>
            </div>
        </div>)
}

export function MidiDeviceSelect(specs: MidiDeviceSpec[], label: string) {
    let current = ''
    const target = `midi-device-view-${uid()}`
    const items = specs.map((spec) => {
        const classes = ['dropdown-item']
        if (spec.isActive) {
            classes.push('active')
            current = spec.name
        }

        return (<li key={spec.name + '-' + target}>
            <a className={classes.join(' ')}
               href={'#'}
               onClick={spec.action}
               data-bs-toggle="dropdown"
               data-bs-target={target}>{spec.name}</a></li>)
    })
    return (<div>
        <button className="btn btn-primary dropdown-toggle" type="button"
                data-bs-toggle="dropdown"
                data-bs-target={'#' + target}><span className={'fw-bold'}>{label}</span>{current}</button>
        <ul id={target} className={'dropdown-menu'}>{items}</ul>
    </div>)
}
