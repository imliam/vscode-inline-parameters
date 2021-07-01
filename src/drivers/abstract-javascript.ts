import * as recast from "recast"
import * as vscode from 'vscode'
import { removeShebang, ParameterPosition, showVariadicNumbers } from "../utils"

export function getParameterNameList(editor: vscode.TextEditor, languageParameters: ParameterPosition[]): Promise<string[]> {
    return new Promise(async (resolve, reject) => {
        let isVariadic = false
        let parameters: any[]
        const firstParameter = languageParameters[0]
        const description: any = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', editor.document.uri, new vscode.Position(
            firstParameter.expression.line,
            firstParameter.expression.character
        ))
        const shouldHideRedundantAnnotations = vscode.workspace.getConfiguration('inline-parameters').get('hideRedundantAnnotations')

        if (description && description.length > 0) {
            try { 
                let definition = description[0].contents[0].value.replace(/(?<=\)\s*\:)[\s\S]*/m, '');
                // Find the left bracket matching the last right bracket
                let pos = [0, 0];
                let bracketsCount = 0;
                let isLastRightBracketFound = false;
                for (let i = definition.length - 1; i >= 0; i--) {
                    const e = definition[i];
                    if (e === ')') { 
                        bracketsCount++; 
                        if (!isLastRightBracketFound) {
                            isLastRightBracketFound = true;
                            pos[1] = i;
                        }
                    }
                    else if (e === '(') bracketsCount--;
                    if (isLastRightBracketFound && bracketsCount === 0) {
                        pos[0] = i;
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

        let namedValueName = undefined;
        const parametersLength = parameters.length;
        for (let i = 0; i < languageParameters.length; i++) {
            const parameter = languageParameters[i];
            const key = parameter.key;

            if (isVariadic && key >= parameters.length - 1) {
                if (namedValueName === undefined) namedValueName = parameters[parameters.length - 1]

                if (shouldHideRedundantAnnotations && namedValueName === parameter.namedValue) {
                    parameters[i] = undefined
                    continue;
                }

                parameters[i] = showVariadicNumbers(namedValueName, -parametersLength + 1 + key)
                continue;
            }
        
            if (parameters[key]) {
                let name = parameters[key]

                if (shouldHideRedundantAnnotations && name === parameter.namedValue) {
                    parameters[i] = undefined
                }
                continue;
            }

            parameters[i] = undefined
            continue;
        }

        return resolve(parameters)
    })
}

export function parse(code: string, options: any) {
    code = removeShebang(code)
    let javascriptAst: any = ''
    const editor = vscode.window.activeTextEditor

    try {
        javascriptAst = recast.parse(code, options).program.body
    } catch (err) {
        return [];
    }

   return lookForFunctionCalls(editor, javascriptAst)
}

function lookForFunctionCalls(editor: vscode.TextEditor, body: any): ParameterPosition[][] {
    let parameters:ParameterPosition[][] = [];

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

    calls.forEach((call, index) => {
         if (call.callee && call.callee.loc) {

            if (call.arguments) {
                const hideSingleParameters = vscode.workspace.getConfiguration('inline-parameters').get('hideSingleParameters')

                if (hideSingleParameters && call.arguments.length === 1) {
                    return;
                }

                const expression = getExpressionLoc(call)
                
                if (call.arguments.length > 0) {
                    parameters[index] = [];
                    call.arguments.forEach((argument: any, key: number) => {
                        parameters[index].push(parseParam(argument, key, expression, editor))
                    })
                }
            }
        }
    })

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
