'use strict'

const pixel = require('node-pixel')
const five  = require('johnny-five')
const kutu  = require('./kutu')

const REPL = false
const LEDS = 10
const DATA = 6

const board = new five.Board({
    repl: REPL
})

const config = {
    83: { color: '#010', pins: [0, 9] },
    88: { color: '#010', pins: [1, 8] },
    92: { color: '#110', pins: [2, 7] },
    95: { color: '#110', pins: [3, 6] },
    97: { color: '#100', pins: [4, 5] }
}

const blinkInterval = 1000 / 20
const limiterInterval = 1000 / 2

const PIT_SPEED_LIMITER = 0x10

board.on('ready', function() {
    const strip = new pixel.Strip({
        board: this,
        controller: 'FIRMATA',
        length: LEDS,
        data: 6
    })

    strip.on('ready', function() {
        let blink = null,
            first = null,
            last = null,
            max = null

        let blinking = false
        let limiter = false

        const ir = new kutu(['DriverInfo', 'RPM'], [], 60)
        ir.onupdate = function(keys) {
            if (keys.indexOf('DriverInfo') >= 0) {
                blink = ir.data.DriverInfo.DriverCarSLBlinkRPM
                first = ir.data.DriverInfo.DriverCarSLFirstRPM
                last  = ir.data.DriverInfo.DriverCarSLLastRPM
                max   = ir.data.DriverInfo.DriverCarRedLine
            }

            if (keys.indexOf('EngineWarnings') >= 0) {
                if (ir.data.EngineWarnings & PIT_SPEED_LIMITER) {
                    if (!limiter) {
                        console.log('started limiter')

                        let toggle = false
                        limiter = setInterval(function() {
                            if (toggle) {
                                toggle = false

                                strip.pixel(0).color('#110')
                                strip.pixel(2).color('#110')
                                strip.pixel(4).color('#110')
                                strip.pixel(6).color('#110')
                                strip.pixel(8).color('#110')

                                strip.pixel(1).color('#001')
                                strip.pixel(3).color('#001')
                                strip.pixel(5).color('#001')
                                strip.pixel(7).color('#001')
                                strip.pixel(9).color('#001')
                            } else {
                                toggle = true

                                strip.pixel(0).color('#001')
                                strip.pixel(2).color('#001')
                                strip.pixel(4).color('#001')
                                strip.pixel(6).color('#001')
                                strip.pixel(8).color('#001')

                                strip.pixel(1).color('#110')
                                strip.pixel(3).color('#110')
                                strip.pixel(5).color('#110')
                                strip.pixel(7).color('#110')
                                strip.pixel(9).color('#110')
                            }

                            strip.show()
                        }, limiterInterval)
                    }

                    return
                } else if (limiter) {
                    console.log('stopped limiter')
                    clearInterval(limiter)
                    limiter = false
                }
            }

            if (!last || !first || !blink || !max) {
                return
            }

            const rpm = ir.data.RPM
            if (rpm >= blink) {
                if (!blinking) {
                    console.log('started blinking')
                    /* blinking = setInterval(function() {
                        strip.color('#000')
                        strip.show()

                        strip.pixel(0).color('#010')
                        strip.pixel(1).color('#010')
                        strip.pixel(8).color('#010')
                        strip.pixel(9).color('#010')

                        strip.pixel(2).color('#110')
                        strip.pixel(3).color('#110')
                        strip.pixel(6).color('#110')
                        strip.pixel(7).color('#110')

                        strip.pixel(4).color('#100')
                        strip.pixel(5).color('#100')

                        strip.show()
                    }, blinkInterval) */

                    blinking = true

                    strip.color('#100')
                    strip.show()
                }

                return
            } else if (blinking) {
                console.log('stopped blinking')
                // clearInterval(blinking)
                blinking = false
                strip.color('#000')
                strip.show()
            }

            const percent = rpm / max * 100
            for (let threshold in config) {
                if (percent >= threshold) {
                    config[threshold].pins.forEach(function(led) {
                        strip.pixel(led).color(config[threshold].color)
                    })
                } else {
                    config[threshold].pins.forEach(function(led) {
                        strip.pixel(led).color('#000')
                    })
                }
            }

            strip.show()
        }
    })
})
