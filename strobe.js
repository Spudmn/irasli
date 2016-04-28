const five = require('johnny-five')
const board = new five.Board()

board.on('ready', function() {
    // this.repl.close()

    let range = []
    for (let i = 2; i < 12; i++) {
        range.push(i)
    }

    const leds = five.Leds(range)

    this.repl.inject({
        leds: leds
    })
})
