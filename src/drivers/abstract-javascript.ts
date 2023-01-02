import * as recast from "recast"
import * as vscode from 'vscode'
import { removeShebang, ParameterPosition, showVariadicNumbers } from "../utils"

export function getParameterName(editor: vscode.TextEditor, position: vscode.Position, key: number, namedValue?: string) {
    return new Promise(async (resolve, reject) => {
        let isVariadic = false
        let parameters: any[]
        const description: any = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', editor.document.uri, position)
        const shouldHideRedundantAnnotations = vscode.workspace.getConfiguration('inline-parameters').get('hideRedundantAnnotations')

        if (description && description.length > 0) {
            try { 
                let definition = description[0].contents[0].value;
                // Find the bracket matching () => or () :
                let pos = [0, -1];
                let bracketsCount = 0;
                let isFindingBrackets = false;
                for (let i = definition.length - 1; i >= 0; i--) {
                    const e = definition[i];
                    switch (e) {
                        case ")":
                            if (bracketsCount === 0 && isFindingBrackets) pos[1] = i;
                            bracketsCount ++;
                            break;
                        case "(":
                            bracketsCount --;
                            if (bracketsCount === 0 && isFindingBrackets) {
                                pos[0] = i;
                                isFindingBrackets = false;
                            }
                            break;
                        case ":":
                        case "=":
                            if (bracketsCount === 0)
                                isFindingBrackets = true;
                            break;
                        case " ":
                            break;
                        default:
                            if (bracketsCount === 0) isFindingBrackets = false;
                            break;
                    }
                }
                definition = definition.slice(pos[0], pos[1] + 1);

                if (!definition || definition.length === 0) {
                    return reject()
                }

                definition = definition.slice(1, -1)
                    .replace(/\<.*?\>/g,'')
                    .replace(/\(.*?\)/g,'');

                const jsParameterNameRegex = /^[a-zA-Z_$]([0-9a-zA-Z_$]+)?/g

                parameters = definition.split(',')
                    .map((parameter: any) => parameter.trim())
                    .map((parameter: any) => {
                        if (parameter.startsWith('...')) {
                            isVariadic = true
                            parameter = parameter.slice(3)
                        }

                        const matches = parameter.match(jsParameterNameRegex)

                        if (matches && matches.length) {
                            return matches[0]
                        }

                        return parameter
                    })

                // Typescript allows "this" type
                if (parameters[0] === "this") {
                    parameters.shift();
                }
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

export function parse(code: string, options: any) {
    code = removeShebang(code)
    let javascriptAst: any = ''
    let parameters: ParameterPosition[] = []
    const editor = vscode.window.activeTextEditor

    try {
        javascriptAst = recast.parse(code, options).program.body
    } catch (err) {
        return parameters
    }

    parameters = lookForFunctionCalls(editor, parameters, javascriptAst)

    return parameters
}

function lookForFunctionCalls(editor: vscode.TextEditor, parameters: ParameterPosition[], body: any): ParameterPosition[] {
    let arr = []

    function getNodes(astNode, nodeArr) {
        // Loop through all keys in the current node
        for (const key in astNode) {
            if (astNode.hasOwnProperty(key)) {
                const item = astNode[key]

                if (item === undefined || item === null) {
                    continue
                }

                if (Array.isArray(item)) {
                    // If the current node is an array of nodes, loop through each
                    item.forEach((subItem) => nodeArr = getNodes(subItem, nodeArr))
                } else if (item.loc !== undefined) {
                    // If is a proper node and has a location in the source, push it into the array and recurse on that for nodes inside this node
                    nodeArr.push(item)
                    nodeArr = getNodes(item, nodeArr)
                }
            }
        }

        return nodeArr
    }

    arr = getNodes(body, arr)

    const nodes = arr.filter((node) => node.type === "CallExpression" || node.type === "NewExpression")

    const calls = []

    nodes.forEach((node) => {
        if (node.type === "NewExpression") {
            calls.push(node, ...node.arguments)
        } else {
            calls.push(node)
        }
    })

    for (const call of calls) {
        if (call.callee && call.callee.loc) {

            if (call.arguments) {
                const hideSingleParameters = vscode.workspace.getConfiguration('inline-parameters').get('hideSingleParameters')

                if (hideSingleParameters && call.arguments.length === 1) {
                    continue
                }

                const expression = getExpressionLoc(call)

                call.arguments.forEach((argument: any, key: number) => {
                    parameters.push(parseParam(argument, key, expression, editor))
                })
            }
        }
    }

    return parameters
}

function parseParam(argument: any, key: number, expression: any, editor: vscode.TextEditor): ParameterPosition {
    const parameter: ParameterPosition = {
        namedValue: argument.name ?? null,
        expression: {
            line: expression.start.line,
            character: expression.start.column,
        },
        key: key,
        start: {
            line: argument.loc.start.line - 1,
            character: argument.loc.start.column,
        },
        end: {
            line: argument.loc.end.line - 1,
            character: argument.loc.end.column,
        },
    }

    // TSTypeAssertions are off by one for some reason so subtract the column by one.
    if (argument.type === "TSTypeAssertion") {
        parameter.start.character -= 1
    }

    const line = editor.document.lineAt(parameter.start.line)

    const offset = editor.options.insertSpaces ? 0 : line.firstNonWhitespaceCharacterIndex * 3

    parameter.expression.character -= offset
    parameter.start.character -= offset
    parameter.end.character -= offset

    return parameter
}

function getExpressionLoc(call: any) {
    if (call.callee.type === "MemberExpression" && call.callee.property.loc) {
        const { start, end } = call.callee.property.loc

        return {
            start: {
                line: start.line - 1,
                column: start.column
            },
            end: {
                line: end.line - 1,
                column: end.column
            }
        }
    }
    
    if (call.callee.type === "CallExpression") {
        const { start, end } = call.callee.arguments[0].loc

        return {
            start: {
                line: start.line - 1,
                column: start.column
            },
            end: {
                line: end.line - 1,
                column: end.column
            }
        }
    }

    const { start, end } = call.callee.loc

    return {
        start: {
            line: start.line - 1,
            column: start.column
        },
        end: {
            line: end.line - 1,
            column: end.column
        }
    }
}
