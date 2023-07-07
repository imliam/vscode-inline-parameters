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
                    color: new ThemeColor("inlineParameters.annotationForeground"),
                    backgroundColor: new ThemeColor("inlineParameters.annotationBackground"),
                    fontStyle: workspace.getConfiguration("inline-parameters").get("fontStyle"),
                    fontWeight: workspace.getConfiguration("inline-parameters").get("fontWeight"),
                    textDecoration: `;
                        font-size: ${workspace.getConfiguration("inline-parameters").get("fontSize")};
                        margin: ${workspace.getConfiguration("inline-parameters").get("margin")};
                        padding: ${workspace.getConfiguration("inline-parameters").get("padding")};
                        border-radius: ${workspace.getConfiguration("inline-parameters").get("borderRadius")};
                        border: ${workspace.getConfiguration("inline-parameters").get("border")};
                        vertical-align: middle;
                    `,
                },
            } as DecorationInstanceRenderOptions,
        } as DecorationOptions
    }
}
