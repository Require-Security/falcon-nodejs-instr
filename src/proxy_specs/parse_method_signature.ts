// Copyright 2023, Require Security Inc, All Rights Reserved
import assert from "assert"
import { SpecJson } from "../types/types"

export class FunctionArgType {
  params: Array<ArgType[]>
  ret: ArgType[]
  kind: "FunctionArgType"
  constructor(params: Array<ArgType[]>, ret: ArgType[]) {
    this.params = params
    this.ret = ret
    this.kind = "FunctionArgType"
  }
}

class TupleType {
  types: Array<ArgType[]>
  kind: "TupleType"
  constructor(types: Array<ArgType[]>) {
    this.types = types
    this.kind = "TupleType"
  }
}

class ArrayType {
  type: ArgType[]
  kind: "ArrayType"
  constructor(type: ArgType[]) {
    this.type = type
    this.kind = "ArrayType"
  }
}

export class LiteralType {
  text: string
  kind: "LiteralType"
  constructor(text: string) {
    this.text = text
    this.kind = "LiteralType"
  }
}

export class RawType {
  name: string
  kind: "RawType"
  constructor(name: string) {
    this.name = name
    this.kind = "RawType"
  }
}
export type ArgType = RawType | FunctionArgType | TupleType | ArrayType | LiteralType

export function parseMethodParams(argTxt: string): Array<ArgType[]> {
  type Delimiter = {
    kind: "delimiter"
    char: string
  }
  type Name = {
    kind: "name"
    name: string
  }
  type List = {
    kind: "list"
    boundary: string,
    tokens: Token[]
  }

  type Token = Delimiter | Name | List

  function lex(chars: string) {
    function lexName(chars: string): [Name, string] | null {
      const matchName = /^\s*(?<name>[a-zA-Z0-9_\.]+)\s*(?<rest>.*)/
      const m = chars.match(matchName)
      if(!m) {
        return null
      }
      const tok: Name = {kind: "name", name: m.groups!.name}
      return [tok, m.groups!.rest]
    }

    function lexDelimiter(chars: string): [Delimiter, string] | null {
      // Match ':' or ',' or '|' or '[' or ']' or '<' or '>' or '"' or "'"
      const matchDelimiter = /^\s*(?<char>[:,\|\[\],\>\<"'])(?<rest>.*)\s*/
      const m = chars.match(matchDelimiter)
      if(!m) {
        return null
      }
      let char = m.groups!.char

      // Standardize quotes
      if(char == "'") {
        char = '"'
      }

      const tok: Delimiter = {kind: "delimiter", char: m.groups!.char}
      return [tok, m.groups!.rest]
    }

    var tokens: Token[] = []
    // // Remove the parens around the outside
    // chars = chars.slice(1, chars.length)
    while(chars) {
      let p: [Token, string] | null  = null
      p = lexDelimiter(chars)
      if(p) {
        var [name, chars] = p
        tokens.push(name)
        continue
      }

      p = lexName(chars)
      if(p) {
        var [delim, chars] = p
        tokens.push(delim)
        continue
      }

      throw Error(`Expecting a name or delim, found ${chars}`)
    }
    return tokens
  }

  function bounariesMatch(start: string, end: string) {
    switch(start) {
      case "[":
        return end == "]"
      case "<":
        return end == ">"
      default:
        throw Error(`Unknown list bound: ${start}`)
    }
  }

  // Turn a flat stream of tokens into a proper nested list
  function structure(tokens: Token[]) : Token[] {
    // Now get proper list structure
    var listList: List[] = [{kind: "list", boundary: "start", tokens: []}]
    for (let tok of tokens) {
      // Add tokens to the most recently added list
      const currentList = listList.at(-1)
      assert (currentList)

      // If we hit a '[', it's a new list. Add it to the current list,
      // and make it the new current list
      if(tok.kind == "delimiter" && ["[", "<"].includes(tok.char)) {
        var newList: List = {kind: "list", boundary: tok.char, tokens: []}
        currentList.tokens.push(newList)
        listList.push(newList)
      // If we hit a ']', our current list is done. Remove it.
      } else if(tok.kind == "delimiter" && ["]", ">"].includes(tok.char)) {
        const finished = listList.pop()
        assert(finished)
        assert(bounariesMatch(finished?.boundary, tok.char))
      // Otherwise, add our token to the current list
      } else {
        currentList.tokens.push(tok)
      }
    }

    assert(listList.length = 1)
    return listList[0].tokens
  }


  // Take a structured list of tokens and convert them into arg types
  function parse(tokens: Token[]) : Array<ArgType[]> {
    function parseListOfTypes(list: List) {
      const types: Array<ArgType[]> = []
      while(list.tokens.length) {
        types.push(parseArgTypes(list.tokens))
      }
      return types
    }

    function parseSingleType(tokens: Token[]) : ArgType {
      let tok = tokens.shift()
      assert(tok)

      // Dealing with a literal array type
      if (tok.kind == "list") {
        return new TupleType(parseListOfTypes(tok))
      }

      if (tok.kind == "delimiter" && tok.char == '"') {
        let txt = tokens.shift()
        assert(txt?.kind == "name", "Quote must be followed by a literal name")
        let end = tokens.shift()
        assert(end?.kind == "delimiter" && tok.char == '"', "literal name must be followed by an end quote")
        return new LiteralType(txt.name)
      }

      assert(tok?.kind == "name", "At this point, name should be the only possibility")
      let type: ArgType = new RawType(tok.name)

      let next = tokens.at(0)
      // Dealing with a simple name
      if(next?.kind != "list") {
        return type
      }

      // Dealing with a name followed by a list
      tok = next
      tokens.shift()

      // This is an array
      if (tok.boundary == "[") {
        assert(tok.tokens.length == 0, "Empty array is shorthand for array, otherwise???")
        assert(tokens.at(0)?.kind != "list", "TODO: Support multidimensional array types")
        return new ArrayType([type])
      }

      // We are now looking at a function, with an angle bracket list
      assert(type.name == "Function")
      assert(tok.boundary == "<")

      // Look inside our function spec
      next = tok.tokens.at(0)
      assert(next, "Should have at least one value in function spec")

      let paramTypes: Array<ArgType[]> = []
      // If next.type is a list, its the parameters list for the function
      if (next.kind == "list") {
        // Consume params
        let params = next
        tok.tokens.shift()
        paramTypes = parseListOfTypes(params)
        const delim = tok.tokens.shift()
        assert(delim?.kind == "delimiter" && delim.char == ",", `After params should be a ',', got ${JSON.stringify(delim)}`)
        next = tok.tokens.at(0)
      }

      assert(next?.kind == "name", "Return value should start with a name")
      const retTy = parseArgTypes(tok.tokens)
      type = new FunctionArgType(paramTypes, retTy)

      return type
    }

    // Parse all the possible types for this argument
    function parseArgTypes(tokens: Token[]) {
      var possibleTypes: ArgType[] = []
      while (true) {
        const type = parseSingleType(tokens)
        possibleTypes.push(type)
        let tok = tokens.shift()

        // There's another option for this arg
        if(tok?.kind == "delimiter" && tok.char == "|") {
          continue
        }

        // If we get here, we should be at the end of this argument:
        assert(tok == undefined || (tok.kind == "delimiter" && tok.char == ","))
        return possibleTypes
      }
    }

    const argTypes: Array<ArgType[]> = []
    while (tokens.length) {
      let tok = tokens.shift()
      // Ignore name
      assert (tok?.kind == "name")
      tok = tokens.shift()
      // Ignore ':'
      assert (tok?.kind == "delimiter" && tok.char == ":")

      argTypes.push(parseArgTypes(tokens))
    }

    return argTypes
  }

  let tokens = lex(argTxt)
  tokens = structure(tokens)
  return parse(tokens)


}

export function parseMethodSignature(method: SpecJson.MethodSpec) : [Array<ArgType[]>, string] {
  const parsedSignature = method.signature.match(
    /^\(\s*(?<args>.*)\s*\)\s*(:\s*(?<ret_type>.+))?\s*$/)
  if (parsedSignature == null) {
    throw Error(`Method ${method.name} has unsupported method ` +
                `signature format: ${method.signature}`)
  }
  const returnType = parsedSignature.groups!.ret_type
  const paramTypes = parseMethodParams(parsedSignature.groups!.args)
  return [paramTypes, returnType]
}
