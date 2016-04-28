'use strict'

const pixel = require('node-pixel')
const five  = require('johnny-five')
const kutu  = require('./kutu')

const repl  = false

const board = new five.Board({
    repl: repl
})

const config = {
    83: [0, 9],
    88: [1, 8],
    92: [2, 7],
    95: [3, 6],
    97: [4, 5]
}

let strip

board.on('ready', function() {
    /*
    strip = new pixel.Strip({
        board: this,
        controller: 'FIRMATA',
        strips: [{
            pin: 6,
            length: 10
        }]
    })

    strip.on('ready', function() {
        // ...
    })
    */

    let range = []
    for (let i = 2; i < 12; i++) {
        range.push(i)
    }

    const leds = five.Leds(range)

    if (repl) {
        this.repl.inject({
            leds: leds
        })
    }

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
        if (rpm > blink) {
            blinking = true
            leds.blink()
            return
        } else if (blinking) {
            blinking = false
            leds.stop()
        }

        const percent = rpm / max * 100
        for (let threshold in config) {
            if (percent >= threshold) {
                config[threshold].forEach(function(led) {
                    leds[led].on()
                })
            } else {
                config[threshold].forEach(function(led) {
                    leds[led].off()
                })
            }
        }
    }
})
