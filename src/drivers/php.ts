import * as vscode from 'vscode'
import { removeShebang, ParameterPosition } from '../utils'

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

export function getParameterName(editor: vscode.TextEditor, position: vscode.Position, key: number, namedValue?: string) {
    return new Promise(async (resolve, reject) => {
        let parameters: any []
        const description: any = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', editor.document.uri, position)
        const shouldHideRedundantAnnotations = vscode.workspace.getConfiguration('inline-parameters').get('hideRedundantAnnotations')
    
        if (description && description.length > 0) {
            try {
                const regEx = /(?<=@param.+)(\.{3})?(\$[a-zA-Z0-9_]+)/g
                parameters = description[0].contents[0].value.match(regEx)

                parameters = parameters.map((parameter: any) => {
                    if (parameter.startsWith('...')) {
                        isVariadic = true
                        parameter = parameter.slice(3)
                    }

                    return parameter
                })
            } catch (err) {
                console.error(err)
            }
        }

        if (parameters) {
            if (isVariadic && key >= parameters.length - 1) {
                let name = showDollar(parameters[parameters.length - 1])

            if (shouldHideRedundantAnnotations && name.replace('$', '') === namedValue) {
                return reject()
                }

                name = showDollar(name)

                resolve(name)
            } else if (parameters[key]) {
                let name = showDollar(parameters[key])

                resolve(name)
            }
        }
    
        reject()
    })
}

            if (shouldHideRedundantAnnotations && name.replace('$', '') === namedValue) {
                return reject()
                }

                if (argument.kind === 'call') {
                    expressions.push(argument)
                }
            })
        }

        if (expression.right && expression.right.kind === 'array') {
            expression.right.items.forEach((entry: any) => {
                if (entry.key) {
                    expressions.push(entry.key)
                }

                if (entry.value) {
                    expressions.push(entry.value)
                }
            })
        }

        expressions.push(expression)
    }

    function crawlPhpAst(obj: any) {
        if (obj.children) {
            obj.children.forEach((children: any) => {
                crawlPhpAst(children)
            }) 
        }

        if (obj.body) {
            if (Array.isArray(obj.body)) {
                obj.body.forEach((children: any) => {
                    crawlPhpAst(children)
                })
            } else {
                if (obj.body.children) {
                    obj.body.children.forEach((children: any) => {
                        crawlPhpAst(children)
                    })
                }
            }
        }

        if (obj.test) {
            if (obj.test.left) {
                crawlExpressionAst(obj.test.left)
            }

            if (obj.test.right) {
                crawlExpressionAst(obj.test.right)
            }

            if (obj.test.kind === 'call') {
                crawlExpressionAst(obj.test)
            }
        }


        if (obj.expression) {
            crawlExpressionAst(obj.expression)
        }

        if (obj.expressions) {
            obj.expressions.forEach((expression: any) => {
                crawlExpressionAst(expression)
            })
        }

        if (obj.expr) {
            expressions.push(obj.expr)
        }
    }

    function getBeginingOfParameter(parameter: any): any {
        if (parameter.left) {
            return getBeginingOfParameter(parameter.left)
        }

        return parameter
    }

    const parameters: ParameterPosition[] = []

    function getParametersFromExpression(expression: any): any {
        if (expression.arguments && expression.arguments.length > 0) {
            const hideSingleParameters = vscode.workspace.getConfiguration('inline-parameters').get('hideSingleParameters')

            if (hideSingleParameters && expression.arguments.length === 1) {
                return
            }

            expression.arguments.forEach((argument: any, key: number) => {
                if (expression.what && (expression.what.offset || expression.what.loc)) {
                    const beginingOfArgument: any = getBeginingOfParameter(argument)
                    const startLoc: any = beginingOfArgument.loc.start
                    const endLoc: any = beginingOfArgument.loc.end
                    const expressionLoc = expression.what.offset ? expression.what.offset.loc.start : expression.what.loc.end

                    parameters.push({
            namedValue: argument.name ?? null,
                        expression: {
                            line: parseInt(expressionLoc.line) - 1,
                            character: parseInt(expressionLoc.column),
                        },
                        key: key,
                        start: {
                            line: parseInt(startLoc.line) - 1,
                            character: parseInt(startLoc.column),
                        },
                        end: {
                            line: parseInt(endLoc.line) - 1,
                            character: parseInt(endLoc.column),
                        },
                    })
                }
            })
        }

        if (expression.what) {
            getParametersFromExpression(expression.what)
        }

        if (expression.right) {
            getParametersFromExpression(expression.right)
        }

        if (expression.left) {
            getParametersFromExpression(expression.left)
        }
    }

    expressions.forEach((expression) => {
        getParametersFromExpression(expression)
    })

    return parameters
}

function showDollar(str: string): string {
    if (vscode.workspace.getConfiguration('inline-parameters').get('showPhpDollar')) {
        return str
    }

    return str.replace('$', '')
}
