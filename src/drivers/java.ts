import * as vscode from 'vscode'
import { removeShebang, ParameterPosition, showVariadicNumbers } from '../utils'

import { parse as javaparse, walk, ParseTree, JavaParserListener, MethodCallContext, ExpressionContext, ArgumentsContext } from 'java-ast'

export function getParameterName(editor: vscode.TextEditor, position: vscode.Position, key: number, namedValue?: string) {
    return new Promise(async (resolve, reject) => {
        let isVariadic = false
        let parameters: any[]
        const description: any = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', editor.document.uri, position)
        const shouldHideRedundantAnnotations = vscode.workspace.getConfiguration('inline-parameters').get('hideRedundantAnnotations')

        if (description && description.length > 0) {
            try {
                const functionDefinitionRegex = /[^ ](?!^)\((.*)\)/gm
                let definition = description[0].contents[0].value.match(functionDefinitionRegex)

                if (!definition || definition.length === 0) {
                    return reject()
                }

                definition = definition[0].slice(2, -1)

                const jsParameterNameRegex = /[a-zA-Z_$][0-9a-zA-Z_$]*$/g

                parameters = definition.split(',')
                    .map((parameter: string) => parameter.trim())
                    .map((parameter: string) => {
                        if (parameter.includes('...')) {
                            isVariadic = true
                        }

                        const matches = parameter.match(jsParameterNameRegex)

                        if (matches && matches.length) {
                            return matches[0]
                        }

                        return parameter
                    })
            } catch (err) {
                console.error(err)
            }
        }

        if (!parameters) {
            return reject()
        }

        if (isVariadic && key >= parameters.length - 1) {
            let name = parameters[parameters.length - 1]

            if (shouldHideRedundantAnnotations && name === namedValue) {
                return reject()
            }

            name = showVariadicNumbers(name, -parameters.length + 1 + key)

            return resolve(name)
        }

        if (parameters[key]) {
            let name = parameters[key]

            if (shouldHideRedundantAnnotations && name === namedValue) {
                return reject()
            }

            return resolve(name)
        }

        return reject()
    })
}

export function parse(code: string): ParameterPosition[] {
    code = removeShebang(code)
    const ast = javaparse(code)
    const editor = vscode.window.activeTextEditor

    const functionCalls: any[] = getFunctionCalls(ast)
    let parameters: ParameterPosition[] = []

    for (const call of functionCalls) {
        parameters = getParametersFromMethod(editor, call, parameters)
    }

    return parameters
}

function getFunctionCalls(ast: ParseTree): any[] {
    let functionCalls: any[] = []

    const hideSingleParameters = vscode.workspace.getConfiguration('inline-parameters').get('hideSingleParameters')

    class JavaMethodListener implements JavaParserListener {
        enterArguments = (args: ArgumentsContext) => {
            const params = args.expressionList().expression()
            if (!(hideSingleParameters && params.length === 1)) {
                functionCalls.push(args);
            }
        }
        enterMethodCall = (method: MethodCallContext) => {
            const params = method.expressionList().expression()
            if (!(hideSingleParameters && params.length === 1)) {
                functionCalls.push(method);
            }
        };
    }

    const listener: JavaParserListener = new JavaMethodListener()

    walk(listener, ast)

    return functionCalls
}

function position(parameter) {
    const start = parameter.start.line + "L" + parameter.start.character + "C"
    const end = parameter.end.line + "L" + parameter.end.character + "C"
    const exp = parameter.expression.line + "L" + parameter.expression.character + "C"
    return "[" + start + " - " + end + "] @ " + exp
}

function getParametersFromMethod(editor: vscode.TextEditor, method: any, parameters: ParameterPosition[]): ParameterPosition[] {

    let params = method.expressionList().expression()

    params.forEach((param, key) => {
        parameters.push(parseParam(editor, method, param, key))
    })

    return parameters
}

function parseParam(editor: vscode.TextEditor, expression: any, argument: ExpressionContext, key: number): ParameterPosition {
    const parameter: ParameterPosition = {
        namedValue: argument.text ?? null,
        expression: {
            line: expression.start.line - 1,
            character: expression.start.charPositionInLine,
        },
        key: key,
        start: {
            line: argument.start.line - 1,
            character: argument.start.charPositionInLine,
        },
        end: {
            line: argument.stop.line - 1,
            character: argument.stop.charPositionInLine,
        },
    }

    const line = editor.document.lineAt(parameter.start.line)

    const offset = editor.options.insertSpaces ? 0 : line.firstNonWhitespaceCharacterIndex * 3

    parameter.expression.character -= offset
    parameter.start.character -= offset
    parameter.end.character -= offset

    console.log("JACK:  " + argument.text + position(parameter))

    return parameter
}