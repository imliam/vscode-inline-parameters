import * as vscode from 'vscode'
import { MarkdownString } from 'vscode'

export interface ParameterPosition {
    namedValue?: string

    expression: {
        line: number,
        character: number,
    }

    key: number

    start: {
        line: number,
        character: number,
    }

    end: {
        line: number,
        character: number,
    }
}

export interface LanguageDriver {
    getParameterNameList(editor: vscode.TextEditor, languageParameters: ParameterPosition[]): Promise<(string | undefined)[]>
    parse(code: string): ParameterPosition[][]
}

export function removeShebang(sourceCode: string): string {
    const sourceCodeArr = sourceCode.split("\n")

    if (sourceCodeArr[0].substr(0, 2) === "#!") {
        sourceCodeArr[0] = ""
    }

    return sourceCodeArr.join("\n")
}

export function showVariadicNumbers(str: string, number: number): string {
    const showVariadicNumbers = vscode.workspace.getConfiguration('inline-parameters').get('showVariadicNumbers')

    if (showVariadicNumbers) {
        return `${str}[${number}]`
    }

    return str
}

export function chooseTheMostLikelyFunctionDefinition(hoverList: MarkdownString[]): string | undefined {
    for (const hover of hoverList) {
        if (hover.value.includes("```"))
            return hover.value;
    }
    return undefined;
}
