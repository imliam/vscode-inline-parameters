import * as vscode from 'vscode'
import { removeShebang, ParameterPosition, showVariadicNumbers } from '../utils'

const engine = require("php-parser")

const parser = new engine({
    parser: {
        extractDoc: true,
        php7: true,
        locations: true,
        suppressErrors: true,
    },
    ast: {
        all_tokens: true,
        withPositions: true,
    },
})

export function getParameterNameList(editor: vscode.TextEditor, languageParameters: ParameterPosition[]): Promise<string[]> {
    return new Promise(async (resolve, reject) => {
        let isVariadic = false
        let parameters: any []
        const firstParameter = languageParameters[0]
        const description: any = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', editor.document.uri, new vscode.Position(
            firstParameter.expression.line,
            firstParameter.expression.character
        ))
        const shouldHideRedundantAnnotations = vscode.workspace.getConfiguration('inline-parameters').get('hideRedundantAnnotations')
    
        if (description && description.length > 0) {
            try {
                const regEx = /(?<=@param.+)(\.{3})?(\$[a-zA-Z0-9_]+)/g
                parameters = description[0].contents[0].value.match(regEx)
            } catch (err) {
                console.error(err)
            }
        }

        if (!parameters) {
            return reject()
        }

        parameters = parameters.map((parameter: any) => {
            if (parameter.startsWith('...')) {
                isVariadic = true
                parameter = parameter.slice(3)
            }

            return parameter
        })

        let namedValueName = undefined;
        const parametersLength = parameters.length;
        for (let i = 0; i < languageParameters.length; i++) {
            const parameter = languageParameters[i];
            const key = parameter.key;
            
            if (isVariadic && key >= parameters.length - 1) {
                if (namedValueName === undefined) namedValueName = parameters[parameters.length - 1]

                if (shouldHideRedundantAnnotations && namedValueName.replace('$', '') === parameter.namedValue) {
                    return reject()
                }

                let name = namedValueName;
                name = showDollar(name)
                parameters[i] = showVariadicNumbers(name, -parametersLength + 1 + key)
                continue;
            }

            if (parameters[key]) {
                let name = parameters[key]

                if (shouldHideRedundantAnnotations && name.replace('$', '') === parameter.namedValue) {
                    parameters[i] = undefined
                    continue;
                }

                name = showDollar(name)

                parameters[i] = name
                continue;
            }
        
            parameters[i] = undefined
            continue;
        }
        
        return resolve(parameters);
    })
}

export function parse(code: string): ParameterPosition[][] {
    code = removeShebang(code).replace("<?php", "")
    const ast: any = parser.parseEval(code)
    const functionCalls: any[] = crawlAst(ast)
    let parameters: ParameterPosition[][] = []

    functionCalls.forEach((expression) => {
        parameters.push(getParametersFromExpression(expression))
    })

    return parameters
}

function showDollar(str: string): string {
    if (vscode.workspace.getConfiguration('inline-parameters').get('showPhpDollar')) {
        return str
    }

    return str.replace('$', '')
}

function crawlAst(ast, functionCalls = []) {
    const canAcceptArguments = ast.kind && (ast.kind === 'call' || ast.kind === 'new')
    const hasArguments = ast.arguments && ast.arguments.length > 0
    const shouldHideArgumentNames = vscode.workspace.getConfiguration('inline-parameters').get('hideSingleParameters') && ast.arguments && ast.arguments.length === 1

    if (canAcceptArguments && hasArguments && !shouldHideArgumentNames) {
        functionCalls.push(ast)
    }

    for (const [key, value] of Object.entries(ast)) {
        if (value instanceof Object) {
            functionCalls = crawlAst(value, functionCalls)
        }
    }

    return functionCalls
}

function getParametersFromExpression(expression: any): ParameterPosition[] | undefined {
    if (!expression.arguments) {
        return undefined
    }

    let parameters = [];

    expression.arguments.forEach((argument: any, key: number) => {
        if (!expression.what || (!expression.what.offset && !expression.what.loc)) {
            return
        }
    
        const expressionLoc = expression.what.offset ? expression.what.offset.loc.start : expression.what.loc.end

        parameters.push({
            namedValue: argument.name ?? null,
            expression: {
                line: parseInt(expressionLoc.line) - 1,
                character: parseInt(expressionLoc.column),
            },
            key: key,
            start: {
                line: parseInt(argument.loc.start.line) - 1,
                character: parseInt(argument.loc.start.column),
            },
            end: {
                line: parseInt(argument.loc.end.line) - 1,
                character: parseInt(argument.loc.end.column),
            },
        })
    })

    return parameters
}
