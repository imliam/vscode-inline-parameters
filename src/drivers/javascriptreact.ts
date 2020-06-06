import { parse as abstractParse } from './abstract-javascript'
export { getParameterName } from './abstract-javascript'

export function parse(code: string) {
    return abstractParse(code, {
        parser: require("recast/parsers/babel"),
    })
}
