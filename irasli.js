'use strict'

const pixel = require('node-pixel')
const five  = require('johnny-five')
const _     = require('lodash')

const kutu  = require('./kutu')

const REPL = false
const LEDS = 10
const DATA = 6

const board = new five.Board({
    repl: REPL
})

const OFF    = '#000'
const YELLOW = '#110'
const GREEN  = '#010'
const BLUE   = '#001'
const RED    = '#100'

const config = {
    83: { color: GREEN, pins: [0, 9] },
    88: { color: GREEN, pins: [1, 8] },
    92: { color: GREEN, pins: [2, 7] },
    95: { color: GREEN, pins: [3, 6] },
    97: { color: RED, pins: [4, 5] }
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
            shift = null,
            first = null,
            last = null,
            idle = null,
            red = null

        let blinking = false,
            limiter  = false

        const ir = new kutu(['EngineWarnings', 'RPM'], ['DriverInfo'], 60)
        ir.onupdate = function(keys) {
            if (_.indexOf(keys, 'DriverInfo') >= 0) {
                blink = ir.data.DriverInfo.DriverCarSLBlinkRPM
                shift = ir.data.DriverInfo.DriverCarSLShiftRPM
                first = ir.data.DriverInfo.DriverCarSLFirstRPM
                last  = ir.data.DriverInfo.DriverCarSLLastRPM
                idle  = ir.data.DriverInfo.DriverCarIdleRPM
                red   = ir.data.DriverInfo.DriverCarRedLine
            }

            if (_.indexOf(keys, 'EngineWarnings') >= 0) {
                if (ir.data.EngineWarnings & PIT_SPEED_LIMITER) {
                    if (!limiter) {
                        let toggle = false
                        limiter = setInterval(function() {
                            if (toggle) {
                                toggle = false
                                _.range(0, 10, 2).forEach(function(led) {
                                    strip.pixel(led).color(YELLOW)
                                })
                                _.range(1, 10, 2).forEach(function(led) {
                                    strip.pixel(led).color(BLUE)
                                })
                            } else {
                                toggle = true
                                _.range(0, 10, 2).forEach(function(led) {
                                    strip.pixel(led).color(BLUE)
                                })
                                _.range(1, 10, 2).forEach(function(led) {
                                    strip.pixel(led).color(YELLOW)
                                })
                            }

                            strip.show()
                        }, limiterInterval)
                    }

                    return
                } else if (limiter) {
                    clearInterval(limiter)
                    limiter = false
                }
            }

            if (!last || !first || !blink || !red) {
                return
            }

            const rpm = ir.data.RPM
            if (rpm >= blink) {
                if (!blinking) {
                    blinking = true
                    strip.color(RED)
                    strip.show()
                }

                return
            } else if (blinking) {
                blinking = false
                strip.color(OFF)
                strip.show()
            }

            const percent = rpm / red * 100
            for (let threshold in config) {
                if (percent >= threshold) {
                    _.forEach(config[threshold].pins, function(pixel) {
                        strip.pixel(pixel).color( config[threshold].color)
                    })
                } else {
                    _.forEach(config[threshold].pins, function(pixel) {
                        strip.pixel(pixel).color(OFF)
                    })
                }
            }

            strip.show()
        }
    })
})
