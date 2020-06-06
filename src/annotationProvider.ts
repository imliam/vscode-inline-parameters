import {
    DecorationInstanceRenderOptions,
    ThemeColor,
    DecorationOptions,
    Range,
    workspace,
} from "vscode"

export class Annotations {
    public static parameterAnnotation(
        message: string,
        range: Range
    ): DecorationOptions {
        return {
            range,
            renderOptions: {
                before: {
                    contentText: message,
                    color: new ThemeColor("inlineparameters.annotationForeground"),
                    backgroundColor: new ThemeColor("inlineparameters.annotationBackground"),
                    fontStyle: workspace.getConfiguration("inline-parameters").get("fontStyle"),
                    fontWeight: workspace.getConfiguration("inline-parameters").get("fontWeight"),
                    fontSize: workspace.getConfiguration("inline-parameters").get("fontSize") + "px",
                },
            } as DecorationInstanceRenderOptions,
        } as DecorationOptions
    }
}
