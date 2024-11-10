import {describe, it} from 'mocha'
import tmp from 'tmp'
import {newClientConfig, saveClientConfig} from "../src/ts/app/config-server";
import {expect} from "chai";
import fs from "fs/promises";

describe(`Config`, async () => {
    tmp.setGracefulCleanup()
    it('CRUDs config', async () => {
        const dataDir = tmp.dirSync().name

        const cfg = await newClientConfig(dataDir)
        expect(cfg).to.exist
        expect(cfg.midiOutput).to.be.empty

        let midiOutput = 'the output'
        cfg.midiOutput = midiOutput
        const filepath = await saveClientConfig(cfg, dataDir)
        expect(filepath).to.exist
        const stats = await fs.stat(filepath)
        expect(stats.isDirectory()).to.be.false


        const loaded = await newClientConfig(dataDir)
        expect(loaded).to.exist
        expect(loaded.midiOutput).to.eq(midiOutput)

    })
})