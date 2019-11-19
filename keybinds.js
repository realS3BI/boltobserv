const fs = require("fs")
const JSON5 = require("json5")
const path = require("path")
const electron = require("electron")

let win = false
let socket = false
let effects = {}

function executeAction(bind) {
	let subject = bind.split(":")[0]
	let command = bind.split(":")[1]

	switch (command) {
		case "toggle":
			if (typeof effects[subject] == "undefined") effects[subject] = false
			effects[subject] = !effects[subject]
			break

		case "on":
			effects[subject] = true
			break

		case "off":
			effects[subject] = false
			break

		default:
			console.warn(`WARNING: Unkown keybind command in keybind "${bind}"`)
			return
	}

	socket.send({
		type: "effect",
		data: {
			key: subject,
			value: effects[subject]
		}
	})

	switch (subject) {
		case "window.fullscreen":
			win.setFullScreen(effects[subject])
			break
	}
}

module.exports = (_socket, _win) => {
	win = _win
	socket = _socket

	let rawArr = JSON5.parse(fs.readFileSync(path.join(__dirname, "config", "keybinds.json5"), "utf8"))

	if (fs.existsSync(path.join(__dirname, "config", "keybinds.override.json5"))) {
		let override = JSON5.parse(fs.readFileSync(path.join(__dirname, "config", "keybinds.override.json5"), "utf8"))
		Object.assign(rawArr, override)
	}

	for (let rawBind in rawArr) {
		if (electron.globalShortcut.isRegistered(rawBind)) {
			console.warn(`WARNING: Keybind "${rawBind}" is already used, registering anyway`)
		}

		try {
			let registered = electron.globalShortcut.register(rawBind, () => {
				executeAction(rawArr[rawBind])
			})

			if (!registered) {
				console.warn(`WARNING: Keybind "${rawBind}" could not be registered`)
			}
		} catch (e) {
			console.warn(`WARNING: Error while registering Keybind "${rawBind}"`)
		}
	}

	let count = Object.keys(rawArr).length
	if (count > 0) console.info(`Registered ${count} ${count == 1 ? "keybind" : "keybinds"} with the OS`)
}
