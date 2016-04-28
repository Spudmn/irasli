'use strict'

const ws = require('nodejs-websocket')

const kutu = function(always, once, fps, server) {
    this.always = always
    this.once = once
    this.fps = fps || 60
    this.server = server || '127.0.0.1:8182'
    this.ibt = false

    this.data = {}

    this.connected = false
    this.first = true

    this.connect()
}

kutu.prototype.connect = function() {
    this.ws = ws.connect('ws://' + this.server + '/ws')

    this.ws.on('connect', (function(ir) {
        return function() {
            return ir.onopen.apply(ir, arguments)
        }
    })(this))

    this.ws.on('text', (function(ir) {
        return function() {
            return ir.ontext.apply(ir, arguments)
        }
    })(this))

    this.ws.on('close', (function(ir) {
        return function() {
            ir.onclose.apply(ir, arguments)
        }
    })(this))
}

kutu.prototype.onopen = function() {
    console.log('connect', arguments)

    for (let key in this.data) {
        delete this.data[key]
    }

    this.ws.send(JSON.stringify({
      fps: this.fps,
      readIbt: this.ibt,
      requestParams: this.always,
      requestParamsOnce: this.once
    }))
}

kutu.prototype.ontext = function(data) {
    data = JSON.parse(data.replace(/\bNaN\b/g, 'null'))

    if (data.disconnected) {
        this.connected = false
        if (this.ondisconnect) {
            this.disconnect()
        }
    }

    if (data.connected) {
        for (let key in this.data) {
            delete this.data[key]
        }
    }

    if (data.connected || (this.first && !this.connected)) {
        this.connected = true
        this.first = false

        if (this.onconnect) {
            this.onconnect()
        }
    }

    if (data.data) {
        const ref = data.data
        let keys = []

        for (let key in ref) {
        this.data[key] = ref[key]
            keys.push(key)
        }

        if (this.onupdate) {
            this.onupdate(keys)
        }
    }
}

kutu.prototype.onclose = function() {
    console.log('close', arguments)
    this.ws.onopen = this.ws.onmessage = this.ws.onclose = null;

    if (this.connected) {
        this.connected = false

        if (this.ondisconnect) {
            this.ondisconnect()
        }
    }
}

module.exports = kutu
