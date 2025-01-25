import {newFileApp, newMidiApp} from "../../src/cli/cli-app";
import {loadClientConfig} from "../../src/lib/config-server";
import {newServerOutput} from "../../src/lib/process-output";
import midi from "midi";
import {Device} from "../../src/midi/akai-s3000xl";
import {expect} from "chai";

describe(`CliApp implementations`, async () => {
    it(`Instantiates Midi version of CliApp`, async () => {
        const config = await loadClientConfig()
        const out = newServerOutput()
        const midiInput = new midi.Input()
        const midiOutput = new midi.Output()
        const device = {} as Device
        const app = newMidiApp(config, device, out, midiInput, midiOutput)
        expect(app).exist
    })

    it(`Instantiates file version of CliApp`, async () => {
        const config = await loadClientConfig()
        const out = newServerOutput()

        const diskFile = 'foo'
        const device = {} as Device
        const app = newFileApp(config, device, out, diskFile)
        expect(app).exist

    })
})