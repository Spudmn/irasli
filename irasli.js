'use strict'

const pixel = require('node-pixel')
const five  = require('johnny-five')
const kutu  = require('./kutu')

const repl  = false

const board = new five.Board({
    repl: repl
})

const config = {
    83: { color: '#0F0', pins: [0, 9] },
    88: { color: '#FF0', pins: [1, 8] },
    92: { color: '#F00', pins: [2, 7] },
    95: { color: '#FF0', pins: [3, 6] },
    97: { color: '#0F0', pins: [4, 5] }
}

board.on('ready', function() {
    const strip = new pixel.Strip({
        board: this,
        controller: 'FIRMATA',
        length: 10,
        data: 6
    })

    strip.on('ready', function() {
        let blink = null,
            first = null,
            last = null,
            max = null

        let blinking = false

        const ir = new kutu(['DriverInfo', 'RPM'], [], 60)
        ir.onupdate = function(keys) {
            if (keys.indexOf('DriverInfo') >= 0) {
                blink = ir.data.DriverInfo.DriverCarSLBlinkRPM
                first = ir.data.DriverInfo.DriverCarSLFirstRPM
                last  = ir.data.DriverInfo.DriverCarSLLastRPM
                max   = ir.data.DriverInfo.DriverCarRedLine
            }

            if (!last || !first || !blink || !max) {
                return
            }

            const rpm = ir.data.RPM
            if (rpm > blink && !blinking) {
                // blinking = true
                // leds.blink()
                /// return
            } else if (blinking) {
                // blinking = false
                // leds.stop()
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
