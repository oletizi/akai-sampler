import {
    bytes2numberBE,
    bytes2numberLE,
    natural2real,
    newSequence,
    pad,
    parseNote,
    real2natural,
    scale,
    timestamp
} from "@/lib-core";
import {expect} from "chai";

describe(`Core library functions`, () => {
    it(`Returns an incrementing sequence`, () => {
        const base = 'the base'
        const sequence = newSequence(base)
        const s1 = sequence()
        const s2 = sequence()

        expect(s1).not.eq(s2)
        expect(s1.startsWith(base))
        expect(s1.endsWith("0"))
        expect(s2.startsWith(base))
        expect(s2.endsWith("1"))
    })

    it(`Returns a timestamp`,() => {
        const t1 = timestamp()
        const t2 = timestamp()
        expect(t1).exist
        expect(t1).not.eq(t2)
    })

    it(`Pads a number with leading zeroes`, () => {
        expect(pad(1, 2)).eq('01')
        expect(pad(10, 4)).eq('0010')
    })

    it(`Parses midi note number`, () => {
        expect(parseNote('C3')).eq(60)
        expect(parseNote('C0')).eq(24)
        expect(parseNote('C#3')).eq(61)
    })

    it('parses note as number', () => {
        expect(parseNote("60")).eq(60)
    })

    it('scale', () => {
        expect(scale(50, 0, 100, 0, 10)).eq(5)
        expect(scale(-1, -100, 100, 0, 200)).eq(99)
    })
    it('real2natural', () => {
        expect(real2natural(0, -100, 100)).eq(100)
        expect(real2natural(50, 0, 100)).eq(50)
    })
    it('natural2real', () => {
        expect(natural2real(50, 0, 100)).eq(50)
        expect(natural2real(100, -100, 100)).eq(0)
        expect(natural2real(100, -50, 100)).eq(50)
    })
    it('byte2number', () => {
        let b = [1, 0]
        expect(bytes2numberLE(b)).to.eq(1)
        expect(bytes2numberBE(b)).to.eq(256)
    })
})