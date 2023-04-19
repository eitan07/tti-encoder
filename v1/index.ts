// Import libraries
import Jimp from 'jimp'
import path, { dirname } from 'path'
import inquirer from 'inquirer'
import fs from 'fs'
import _p from 'prompt-sync'
import { fileURLToPath } from 'url'
import nano from 'nanospinner'
import 'colors'


// Types

type TPreferences = {
    outputToConsole: {
        encode: boolean,
        decode: boolean
    }
}


// Constants
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const prompt = _p()  // Initialize prompt module


// Variables
let text: string
let bin: string = ''
let preferences: TPreferences = JSON.parse(fs.readFileSync(path.join(__dirname, 'preferences.json')).toString('utf8'))


// Methods
function main_menu() {
    inquirer.prompt({
        name: 'main_menu',
        message: 'What do you want to do?',
        type: "list",
        choices: [
            {
                name: 'Encode',
                value: 'encode',
            },
            {
                name: 'Decode',
                value: 'decode'
            },
            {
                name: 'Settings',
                value: 'settings'
            },
            new inquirer.Separator(),
            {
                name: 'Exit',
                value: 'exit'
            }
        ]
    }).then(result => {
        switch (result.main_menu) {
            case 'encode':
                encode()
                break
            case 'decode':
                decode()
                break
            case 'settings':
                settings()
                break
            case 'exit':
                console.log('Bye.')
                process.exit(0)
        }
    }).catch(console.error)
}


function encode(): void {
    inquirer.prompt({
        name: 'input_type',
        message: 'Select input type',
        type: 'list',
        choices: [
            {
                name: 'From file',
                value: 'file'
            },
            {
                name: 'Prompt (Manually type or paste)',
                value: 'prompt'
            },
            new inquirer.Separator(),
            {
                name: 'Back to main menu',
                value: 'main_menu'
            }
        ]
    }).then(result => {
        let spinner = nano.createSpinner()
        let startTimestamp: number = 0
        let broke: boolean = false

        switch (result.input_type) {
            case 'prompt':
                text = prompt('Enter text to encode: ')
                spinner.start({ text: 'Encoding...' })
                startTimestamp = Date.now()
                break
            case 'file':
                let fileName = prompt('Enter file name or path: ')
                let localFileRegex = /^[a-zA-Z0-9]+\.[a-zA-Z0-9]+$/

                spinner.start({ text: 'Encoding...' })
                startTimestamp = Date.now()

                let filePath = localFileRegex.test(fileName) ? path.join(__dirname, fileName) : fileName
                if (fs.existsSync(filePath)) {
                    text = fs.readFileSync(filePath).toString()
                } else {
                    spinner.error({ text: 'File does not exist!'.red })
                    prompt('')
                    console.clear()
                    main_menu()
                }
                break
            case 'main_menu':
                main_menu()
                broke = true
                break
        }
        if (!broke) {
            for (let i = 0; i < text.length; i++) {
                bin += text.charCodeAt(i).toString(2).padStart(8, '0')
            }

            const WIDTH = Math.ceil(Math.sqrt(bin.length))
            const HEIGHT = (WIDTH ** 2 - bin.length > WIDTH) ? WIDTH - Math.floor((WIDTH ** 2 - bin.length) / WIDTH) : WIDTH

            const img: Jimp = new Jimp(WIDTH, HEIGHT)

            let binDigitIndex: number = 0
            for (let y = 0; y < HEIGHT; y++) {
                for (let x = 0; x < WIDTH; x++) {
                    if (binDigitIndex >= bin.length) {
                        img.setPixelColor(
                            Jimp.rgbaToInt(
                                128,
                                128,
                                128,
                                255
                            ),
                            x, y
                        )
                    } else {
                        let pixelVal: boolean = bin.charAt(binDigitIndex) == '1'

                        img.setPixelColor(
                            Jimp.rgbaToInt(
                                pixelVal ? 0 : 255,
                                pixelVal ? 0 : 255,
                                pixelVal ? 0 : 255,
                                255
                            ),
                            x, y
                        )
                        binDigitIndex++
                    }
                }
            }

            if (preferences.outputToConsole.encode) {
                console.log(`Output:\n${bin}`)
            }

            img.write(path.join(__dirname, 'out.jpeg'))
            spinner.success({ text: `  Done. (Took ${Date.now() - startTimestamp}ms)`.green })
            prompt('')
            console.clear()
            main_menu()
        }
    }).catch(console.error)
}

function decode(): void {

    let fileName = prompt('Enter file name or path: ')
    let localFileRegex = /^[a-zA-Z0-9]+\.[a-zA-Z0-9]+$/

    let filePath = localFileRegex.test(fileName) ? path.join(__dirname, fileName) : fileName
    let spinner = nano.createSpinner()

    if (fs.existsSync(filePath)) {

        let startTimestamp = Date.now()

        Jimp.read(fileName).then(img => {
            const WIDTH = img.getWidth()
            const HEIGHT = img.getHeight()

            for (let y = 0; y < HEIGHT; y++) {
                for (let x = 0; x < WIDTH; x++) {
                    const { r, g, b } = Jimp.intToRGBA(img.getPixelColor(x, y))

                    if (r <= 5 && g <= 5 && b <= 5) {
                        bin += '1'
                    } else if (r >= 250 && g >= 250 && b >= 250) {
                        bin += '0'
                    }
                }
            }

            let result = ''
            for (let i = 0; i < bin.length; i += 8) {
                result += String.fromCharCode(Number.parseInt(bin.substring(i, i + 8), 2))
            }

            if (preferences.outputToConsole.decode) {
                console.log(`Output:\n${result}`)
            }

            fs.writeFileSync(path.join(__dirname, 'out.txt'), result)
            spinner.success({ text: `  Done. (Took ${Date.now() - startTimestamp}ms)` })
            prompt('')
            console.clear()
            main_menu()
        })
    } else {
        spinner.error({ text: 'File does not exist!'.red })
        prompt('')
        console.clear()
        main_menu()
    }
}

function settings() {
    inquirer.prompt({
        name: 'settings',
        message: 'Settings',
        type: 'checkbox',
        choices: [
            {
                name: 'Output to console (encode)',
                value: 'encode_output',
                checked: preferences.outputToConsole.encode
            },
            {
                name: 'Output to console (decode)',
                value: 'decode_output',
                checked: preferences.outputToConsole.decode
            }
        ]
    }).then(_res => {

        console.log(preferences.outputToConsole)
        let result: string[] = _res.settings as string[]
        let newObj: TPreferences = {
            outputToConsole: {
                encode: result.includes('encode_output'),
                decode: result.includes('decode_output')
            }
        }

        preferences = newObj
        fs.writeFileSync(path.join(__dirname, 'preferences.json'), JSON.stringify(newObj, null, 4))

        console.clear()
        main_menu()
    }).catch(console.error)
}

// --- APPLICATION START ---

console.clear()
main_menu()