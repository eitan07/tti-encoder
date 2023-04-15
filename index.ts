// Import libraries
import Jimp from 'jimp'
import path, { dirname } from 'path'
import inquirer from 'inquirer'
import fs from 'fs'
import _p from 'prompt-sync'
import { fileURLToPath } from 'url'
import 'colors'

// Constants
export const __filename = fileURLToPath(import.meta.url)
export const __dirname = dirname(__filename)


// Variables
let text: string
let bin: string = ''

const prompt = _p()  // Initialize prompt moduke

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
                name: 'Prompt (Manually type or paste)',
                value: 'prompt'
            },
            {
                name: 'From file',
                value: 'file'
            },
            new inquirer.Separator(),
            {
                name: 'Back to main menu',
                value: 'main_menu'
            }
        ]
    }).then(result => {
        switch (result.input_type) {
            case 'prompt':
                text = prompt('Enter text to encode: ')
                break
            case 'file':
                let fileName = prompt('Enter file name or path: ')
                let localFileRegex = /^[a-zA-Z0-9]+\.[a-zA-Z0-9]+$/

                let filePath = localFileRegex.test(fileName) ? path.join(__dirname, fileName) : fileName
                if (fs.existsSync(filePath)) {
                    text = fs.readFileSync(filePath).toString()
                } else {
                    console.error('File does not exist!'.red)
                    prompt(String(null))
                    console.clear()
                    main_menu()
                }
                break
            case 'main_menu':
                main_menu()
                break
        }

        for (let i = 0; i < text.length; i++) {
            bin += text.charCodeAt(i).toString(2).padStart(8, '0')
        }

        inquirer.prompt({
            name: 'confirmation',
            message: 'Do you want to print the binary output to the console?',
            type: 'confirm'
        }).then(result => {
            if (result.confirmation) {
                console.log(`Binary output: ${bin}`)
            }

            const WIDTH = Math.ceil(Math.sqrt(bin.length))
            const HEIGHT = (WIDTH ** 2 - bin.length > WIDTH) ? WIDTH - Math.floor((WIDTH ** 2 - bin.length) / WIDTH) : WIDTH

            const img: Jimp = new Jimp(WIDTH, HEIGHT)

            let startTimestamp = Date.now()

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

            img.write(path.join(__dirname, 'out.jpeg'))
            console.log(`Done. (Took ${Date.now() - startTimestamp}ms)`.green)
        }).catch(console.error)
    }).catch(console.error)
}

function decode(): void {

    let fileName = prompt('Enter file name or path: ')
    let localFileRegex = /^[a-zA-Z0-9]+\.[a-zA-Z0-9]+$/

    let filePath = localFileRegex.test(fileName) ? path.join(__dirname, fileName) : fileName

    if (fs.existsSync(filePath)) {
        Jimp.read(fileName).then(img => {
            const WIDTH = img.getWidth()
            const HEIGHT = img.getHeight()

            let startTimestamp = Date.now()

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
            console.log(`Done. (${Date.now() - startTimestamp}ms)`)
            fs.writeFileSync(path.join(__dirname, 'out.txt'), result)
            main_menu()
        })
    } else {
        console.error('File does not exist!'.red)
        prompt(String(null))
        console.clear()
        main_menu()
    }
}

// --- APPLICATION START ---

console.clear()
main_menu()