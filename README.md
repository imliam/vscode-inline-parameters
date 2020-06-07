# Inline Parameters for VSCode

<p align="center">
  <img src="https://raw.githubusercontent.com/imliam/vscode-inline-parameters/master/icon.png" alt="Inline Parameters for VSCode">
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=liamhammett.inline-parameters"><img src="https://vsmarketplacebadge.apphb.com/version-short/liamhammett.inline-parameters.svg" alt="VS Marketplace Version"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=liamhammett.inline-parameters"><img src="https://vsmarketplacebadge.apphb.com/installs-short/liamhammett.inline-parameters.svg" alt="VS Marketplace Installs"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=liamhammett.inline-parameters"><img src="https://vsmarketplacebadge.apphb.com/rating-short/liamhammett.inline-parameters.svg" alt="VS Marketplace Rating"></a>
</p>
  
<p align="center">
An extension for Visual Studio Code that adds inline parameter annotations when calling a function.
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/imliam/vscode-inline-parameters/master/example.gif" alt="Example of extension">
</p>

This is a feature that was [popularised by JetBrains' IDEs](https://blog.jetbrains.com/phpstorm/2017/03/new-in-phpstorm-2017-1-parameter-hints/) that can give you additional context when reading your code, making it easier to understand what different function parameters refer to by showing the parameter's name inline.

No longer do you have to be confused about whether the needle or haystack comes first, or have to slow down your workflow by going to a function's source to figure out what it does!

## Language Support

Currently, this extension supports the following languages:

- JavaScript (and with React)
- TypeScript (and with React)
- PHP (with the [Intelephense](https://marketplace.visualstudio.com/items?itemName=bmewburn.vscode-intelephense-client) language server)

### Want to contribute additional language support?

Additional language support is welcome as pull requests, and highly encouraged. You can see the source code to see how existing languages have been implemented.

Currently, the extension has 2 major steps that all language drivers must implement:

1. Parsing the source code of the currently active file (eg. by using an AST library - [AST Explorer](https://astexplorer.net/) can assist in navigating it) to retrieve a list of positions where annotations should be inserted
2. Getting the name of the parameters to use as the annotations. Existing language drivers does this by triggering the hover providers for the function being called, and extracting the parameter names from the description

## Settings

The extension provides a handful of configuration settings you can use to customise the look and behaviour of the parameters.

| Name | Description | Default |
|-------|------------|---------|
| `inline-parameters.enabled`  | Show inline parameters | `true` |
| `inline-parameters.leadingCharacters`  | Characters to be shown before each parameter annotation | `" "` |
| `inline-parameters.trailingCharacters`  | Characters to be shown after each parameter annotation | `": "` |
| `inline-parameters.showPhpDollar`  | Show the $ character before PHP parameter names | `false` |
| `inline-parameters.hideSingleParameters`  | Hide inline parameters if a function only has 1 parameter | `false` |
| `inline-parameters.parameterCase`  | Forcibly change the case of the inline parameter name. Options are `normal`, `lowercase` or `uppercase` | `"normal"` |
| `inline-parameters.showVariadicNumbers`  | Show the number of times a variadic parameter has been called | `true` |
| `inline-parameters.hideRedundantAnnotations`  | If the value given to a parameter is the same as the parameter name, hide the parameter name | `true` |
| `inline-parameters.fontWeight` | Annotation styling of font-weight CSS property | `"400"` |
| `inline-parameters.fontStyle` | Annotation styling of font-style CSS property | `"italic"` |
| `inline-parameters.fontSize` | Annotation styling of font size CSS property | `12` |

## Themable Colours

You can change the default foreground and background colours in the `workbench.colorCustomizations` property in user settings.

| Name | Description |
|------|-------------|
| `inline-parameters.annotationForeground` | Specifies the foreground colour for the annotations |
| `inline-parameters.annotationBackground` | Specifies the background colour for the annotations |

## Commands

| Name | Description |
|------|-------------|
| `inline-parameters.annotationForeground` | Specifies the foreground colour for the annotations |

## Credits / Links

- [Liam Hammett](https://github.com/imliam)
- [VSCode's Extension Samples](https://github.com/microsoft/vscode-extension-samples/tree/master/decorator-sample), which was a huge help to get started
- [Benjamin Lannon](https://github.com/lannonbr) for the (no longer maintained) [VSCode JS Annotations extension](https://github.com/lannonbr/vscode-js-annotations) (where some AST parsing for the Javascript languages was borrowed from)
- [Bobby Zrncev](https://github.com/bzrncev) for the [IntelliJ Parameter Hints](https://github.com/bzrncev/intellij-parameter-hints) extension which achieves the same for PHP
- [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see the [license file](LICENSE.md) for more information.
