import * as vscode from 'vscode'
import * as phpDriver from './drivers/php'
import * as luaDriver from './drivers/lua'
import * as javascriptDriver from './drivers/javascript'
import * as javascriptReactDriver from './drivers/javascriptreact'
import * as typescriptDriver from './drivers/typescript'
import * as typescriptReactDriver from './drivers/typescriptreact'
import * as javaDriver from './drivers/java'
import { Annotations } from './annotationProvider'
import Commands from './commands'
import { LanguageDriver, ParameterPosition } from './utils'

const hintDecorationType = vscode.window.createTextEditorDecorationType({})

async function updateDecorations(activeEditor, languageDrivers: Record<string, LanguageDriver>) {
    if (!activeEditor) {
        return
    }

    if (!(activeEditor.document.languageId in languageDrivers)) {
        return
    }

    const driver: LanguageDriver = languageDrivers[activeEditor.document.languageId]

    const isEnabled = vscode.workspace.getConfiguration('inline-parameters').get('enabled')

    if (!isEnabled) {
        activeEditor.setDecorations(hintDecorationType, [])
        return
    }

    const code = activeEditor.document.getText()
    let languageParameters: ParameterPosition[] = []

    try {
        languageParameters = driver.parse(code)
    } catch (err) {
        // Error parsing language's AST, likely a syntax error on the user's side
    }

    if (languageParameters.length === 0) {
        return
    }

    const languageFunctions: vscode.DecorationOptions[] = []

    for (let index = 0; index < languageParameters.length; index++) {
        var parameter = languageParameters[index]

        const start = new vscode.Position(
            parameter.start.line,
            parameter.start.character
        )

        const end = new vscode.Position(
            parameter.end.line,
            parameter.end.character
        )

        let parameterName: any

        try {
            parameterName = await driver.getParameterName(
                activeEditor,
                new vscode.Position(
                    parameter.expression.line,
                    parameter.expression.character
                ),
                parameter.key,
                parameter.namedValue
            )
        } catch (err) {
            // Error getting a parameter name, just ignore it
        }

        if (!parameterName) {
            continue
        }
    
        const leadingCharacters = vscode.workspace.getConfiguration('inline-parameters').get('leadingCharacters')
        const trailingCharacters = vscode.workspace.getConfiguration('inline-parameters').get('trailingCharacters')
        const parameterCase = vscode.workspace.getConfiguration('inline-parameters').get('parameterCase')

        if (parameterCase === 'uppercase') {
            parameterName = parameterName.toUpperCase()
        }

        if (parameterCase === 'lowercase') {
            parameterName = parameterName.toLowerCase()
        }

        const annotation = Annotations.parameterAnnotation(
            leadingCharacters + parameterName + trailingCharacters,
            new vscode.Range(start, end)
        )

        languageFunctions.push(annotation)
    }

    activeEditor.setDecorations(hintDecorationType, languageFunctions)
}

export function activate(context: vscode.ExtensionContext) {
    const languageDrivers: Record<string, LanguageDriver> = {
        php: phpDriver,
        lua: luaDriver,
        javascript: javascriptDriver,
        javascriptreact: javascriptReactDriver,
        typescript: typescriptDriver,
        typescriptreact: typescriptReactDriver,
        java: javaDriver,
    }

    let timeout: NodeJS.Timer | undefined = undefined
    let activeEditor = vscode.window.activeTextEditor

    Commands.registerCommands()

    function triggerUpdateDecorations(timer: boolean = true) {
        if (timeout) {
            clearTimeout(timeout)
            timeout = undefined
        }

        timeout = setTimeout(() => updateDecorations(activeEditor, languageDrivers), timer ? 2500 : 25)
    }

    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('inline-parameters')) {
            triggerUpdateDecorations(false)
        }
    })

    vscode.window.onDidChangeActiveTextEditor(
        (editor) => {
            activeEditor = editor

            if (editor) {
                triggerUpdateDecorations(false)
            }
        },
        null,
        context.subscriptions
    )

    vscode.workspace.onDidChangeTextDocument(
        (event) => {
            if (activeEditor && event.document === activeEditor.document) {
                triggerUpdateDecorations(false)
            }
        },
        null,
        context.subscriptions
    )

    if (activeEditor) {
        triggerUpdateDecorations()
    }
}
