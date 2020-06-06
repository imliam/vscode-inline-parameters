import * as vscode from 'vscode'

export default class Commands {
    public static registerCommands() {
        vscode.commands.registerCommand('inline-parameters.toggle', () => {
            const currentState = vscode.workspace.getConfiguration('inline-parameters').get('enabled')

            vscode.workspace.getConfiguration('inline-parameters').update('enabled', !currentState, true)
        })
    }
}
