/**
 *    Copyright (c) 2009, Adobe Systems, Incorporated
 *    All rights reserved.
 *
 *    Redistribution  and  use  in  source  and  binary  forms, with or without
 *    modification,  are  permitted  provided  that  the  following  conditions
 *    are met:
 *
 *      * Redistributions  of  source  code  must  retain  the  above copyright
 *        notice, this list of conditions and the following disclaimer.
 *      * Redistributions  in  binary  form  must reproduce the above copyright
 *        notice,  this  list  of  conditions  and  the following disclaimer in
 *        the    documentation   and/or   other  materials  provided  with  the
 *        distribution.
 *      * Neither the name of the Adobe Systems, Incorporated. nor the names of
 *        its  contributors  may be used to endorse or promote products derived
 *        from this software without specific prior written permission.
 *
 *    THIS  SOFTWARE  IS  PROVIDED  BY THE  COPYRIGHT  HOLDERS AND CONTRIBUTORS
 *    "AS IS"  AND  ANY  EXPRESS  OR  IMPLIED  WARRANTIES,  INCLUDING,  BUT NOT
 *    LIMITED  TO,  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 *    PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER
 *    OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,  INCIDENTAL,  SPECIAL,
 *    EXEMPLARY,  OR  CONSEQUENTIAL  DAMAGES  (INCLUDING,  BUT  NOT  LIMITED TO,
 *    PROCUREMENT  OF  SUBSTITUTE   GOODS  OR   SERVICES;  LOSS  OF  USE,  DATA,
 *    OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 *    LIABILITY,  WHETHER  IN  CONTRACT,  STRICT  LIABILITY, OR TORT (INCLUDING
 *    NEGLIGENCE  OR  OTHERWISE)  ARISING  IN  ANY  WAY  OUT OF THE USE OF THIS
 *    SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var AS3Scanner = require('./scanner');
var NodeKind = require('./nodeKind');
var Operators = require('./operators');
var KeyWords = require('./keywords');
var Node = require('./node');
var ASDOC_COMMENT = "/**";
var MULTIPLE_LINES_COMMENT = "/*";
var NEW_LINE = "\n";
var SINGLE_LINE_COMMENT = "//";
var VECTOR = "Vector";
function startsWith(string, prefix) {
    return string.indexOf(prefix) === 0;
}
;
function endsWith(string, suffix) {
    return string.indexOf(suffix, string.length - suffix.length) !== -1;
}
;
var CARRIAGE_RETURN = 13, LINE_FEED = 10, LINE_SEPARATOR = 0x2028, PARAGRAPH_SEPARATOR = 0x2029, NEXT_LINE = 0x0085;
function isAnyLineBreakCharacter(c) {
    return c === LINE_FEED || c === CARRIAGE_RETURN || c === NEXT_LINE || c === LINE_SEPARATOR || c === PARAGRAPH_SEPARATOR;
}
function getLengthOfLineBreak(text, index) {
    var c = text.charCodeAt(index);
    // common case - ASCII & not a line break
    if (c > CARRIAGE_RETURN && c <= 127) {
        return 0;
    }
    if (c === CARRIAGE_RETURN) {
        var next = index + 1;
        return (next < text.length) && LINE_FEED === text.charCodeAt(next) ? 2 : 1;
    }
    else if (isAnyLineBreakCharacter(c)) {
        return 1;
    }
    else {
        return 0;
    }
}
function buildLineMap(text) {
    var length = text.length;
    // Corner case check
    if (0 === length) {
        var result = new Array();
        result.push(0);
        return result;
    }
    var position = 0;
    var index = 0;
    var arrayBuilder = new Array();
    var lineNumber = 0;
    while (index < length) {
        var c = text.charCodeAt(index);
        var lineBreakLength;
        // common case - ASCII & not a line break
        if (c > 13 && c <= 127) {
            index++;
            continue;
        }
        else if (c === 13 && index + 1 < length && text.charCodeAt(index + 1) === 10) {
            lineBreakLength = 2;
        }
        else if (c === 10) {
            lineBreakLength = 1;
        }
        else {
            lineBreakLength = getLengthOfLineBreak(text, index);
        }
        if (0 === lineBreakLength) {
            index++;
        }
        else {
            arrayBuilder.push(position);
            index += lineBreakLength;
            position = index;
            lineNumber++;
        }
    }
    // Create a start for the final line.  
    arrayBuilder.push(position);
    return arrayBuilder;
}
function getLineAndCharacterFromPosition(position, lineStarts) {
    if (position < 0 || position > this.length) {
        throw Error("invalid position" + position);
    }
    var lineNumber = -1;
    if (position === this.length) {
        lineNumber = lineStarts.length - 1;
    }
    else {
        for (var i = 0; i < lineStarts.length; i++) {
            if (lineStarts[i] > position) {
                break;
            }
            lineNumber = i;
        }
        lineNumber = lineNumber > 0 ? lineNumber : 0;
    }
    return { line: lineNumber, col: position - lineStarts[lineNumber] };
}
/**
 * @author xagnetti
 */
var AS3Parser = (function () {
    /**
     *
     */
    function AS3Parser() {
        this.scn = new AS3Scanner();
        this.isInFor = false;
    }
    /*
     * (non-Javadoc)
     * @see com.adobe.ac.pmd.parser.IAS3Parser#buildAst(java.lang.String,
     * java.lang.String[])
     */
    AS3Parser.prototype.buildAst = function (filePath, content) {
        this.lineMap = buildLineMap(content);
        return this.parseFile(filePath, content);
    };
    AS3Parser.prototype.nextToken = function (ignoreDocumentation) {
        if (ignoreDocumentation === void 0) { ignoreDocumentation = false; }
        do {
            if (ignoreDocumentation) {
                this.nextTokenIgnoringDocumentation();
            }
            else {
                this.nextTokenAllowNewLine();
            }
        } while (this.tok.text === NEW_LINE);
    };
    /**
     * tok is first content token
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseClassContent = function () {
        var result = new Node(NodeKind.CONTENT, this.tok.index, -1);
        var modifiers = [];
        var meta = [];
        while (!this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
            if (this.tokIs(Operators.LEFT_CURLY_BRACKET)) {
                result.children.push(this.parseBlock());
            }
            if (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
                meta.push(this.parseMetaData());
            }
            else if (this.tokIs(KeyWords.VAR)) {
                this.parseClassField(result, modifiers, meta);
            }
            else if (this.tokIs(KeyWords.CONST)) {
                this.parseClassConstant(result, modifiers, meta);
            }
            else if (this.tokIs(KeyWords.IMPORT)) {
                result.children.push(this.parseImport());
            }
            else if (this.tokIs(KeyWords.INCLUDE) || this.tokIs(KeyWords.INCLUDE_AS2)) {
                result.children.push(this.parseIncludeExpression());
            }
            else if (this.tokIs(KeyWords.FUNCTION)) {
                this.parseClassFunctions(result, modifiers, meta);
            }
            else {
                this.tryToParseCommentNode(result, modifiers);
            }
        }
        if (result.lastChild) {
            result.end = result.lastChild.end;
        }
        return result;
    };
    /**
     * tok is empty, since nextToken has not been called before
     *
     * @throws UnExpectedTokenException
     */
    AS3Parser.prototype.parseCompilationUnit = function () {
        var result = new Node(NodeKind.COMPILATION_UNIT, -1, -1);
        this.nextTokenIgnoringDocumentation();
        if (this.tokIs(KeyWords.PACKAGE)) {
            result.children.push(this.parsePackage());
        }
        result.children.push(this.parsePackageContent());
        return result;
    };
    /**
     * @return
     * @throws TokenException
     */
    AS3Parser.prototype.parseExpression = function () {
        return this.parseAssignmentExpression();
    };
    /**
     * tok is first content token
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseInterfaceContent = function () {
        var result = new Node(NodeKind.CONTENT, this.tok.index, -1);
        while (!this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
            if (this.tokIs(KeyWords.IMPORT)) {
                result.children.push(this.parseImport());
            }
            else if (this.tokIs(KeyWords.FUNCTION)) {
                result.children.push(this.parseFunctionSignature());
            }
            else if (this.tokIs(KeyWords.INCLUDE) || this.tokIs(KeyWords.INCLUDE_AS2)) {
                result.children.push(this.parseIncludeExpression());
            }
            else if (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
                while (!this.tokIs(Operators.RIGHT_SQUARE_BRACKET)) {
                    this.nextToken();
                }
                this.nextToken();
            }
            else {
                this.tryToParseCommentNode(result, null);
            }
        }
        if (result.lastChild) {
            result.end = result.lastChild.end;
        }
        return result;
    };
    /**
     * tok is first token of content
     *
     * @throws UnExpectedTokenException
     */
    AS3Parser.prototype.parsePackageContent = function () {
        var result = new Node(NodeKind.CONTENT, this.tok.index, -1);
        var modifiers = [];
        var meta = [];
        while (!this.tokIs(Operators.RIGHT_CURLY_BRACKET) && !this.tokIs(KeyWords.EOF)) {
            if (this.tokIs(KeyWords.IMPORT)) {
                result.children.push(this.parseImport());
            }
            else if (this.tokIs(KeyWords.USE)) {
                result.children.push(this.parseUse());
            }
            else if (this.tokIs(KeyWords.INCLUDE) || this.tokIs(KeyWords.INCLUDE_AS2)) {
                result.children.push(this.parseIncludeExpression());
            }
            else if (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
                meta.push(this.parseMetaData());
            }
            else if (this.tokIs(KeyWords.CLASS)) {
                result.children.push(this.parseClass(meta, modifiers));
                modifiers.length = 0;
                meta.length = 0;
            }
            else if (this.tokIs(KeyWords.INTERFACE)) {
                result.children.push(this.parseInterface(meta, modifiers));
                modifiers.length = 0;
                meta.length = 0;
            }
            else if (this.tokIs(KeyWords.FUNCTION)) {
                this.parseClassFunctions(result, modifiers, meta);
            }
            else if (startsWith(this.tok.text, ASDOC_COMMENT)) {
                this.currentAsDoc = new Node(NodeKind.AS_DOC, this.tok.index, this.tok.index + this.tok.index - 1, this.tok.text);
                this.nextToken();
            }
            else if (startsWith(this.tok.text, MULTIPLE_LINES_COMMENT)) {
                this.currentMultiLineComment = new Node(NodeKind.MULTI_LINE_COMMENT, this.tok.index, this.tok.index + this.tok.index - 1, this.tok.text);
                this.nextToken();
            }
            else {
                modifiers.push(this.tok);
                this.nextTokenIgnoringDocumentation();
            }
        }
        if (result.lastChild) {
            result.end = result.lastChild.end;
        }
        return result;
    };
    /**
     * @return
     * @throws TokenException
     */
    AS3Parser.prototype.parsePrimaryExpression = function () {
        if (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
            return this.parseArrayLiteral();
        }
        else if (this.tokIs(Operators.LEFT_CURLY_BRACKET)) {
            return this.parseObjectLiteral();
        }
        else if (this.tokIs(KeyWords.FUNCTION)) {
            return this.parseLambdaExpression();
        }
        else if (this.tokIs(KeyWords.NEW)) {
            return this.parseNewExpression();
        }
        else if (this.tokIs(Operators.LEFT_PARENTHESIS)) {
            return this.parseEncapsulatedExpression();
        }
        else if (this.tok.text === 'Vector') {
            return this.parseVector();
        }
        else {
            var result;
            if (this.tok.text === '/' || this.tok.text === '/=') {
                var tok = this.scn.scanRegExp();
                if (tok) {
                    this.nextToken(true);
                    return new Node(NodeKind.LITERAL, tok.index, tok.end, tok.text);
                }
            }
            if (this.tok.isXML) {
                result = new Node(NodeKind.XML_LITERAL, this.tok.index, this.tok.end, this.tok.text);
            }
            else if (this.tok.isNumeric || /('|")/.test(this.tok.text[0])) {
                result = new Node(NodeKind.LITERAL, this.tok.index, this.tok.end, this.tok.text);
            }
            else {
                result = new Node(NodeKind.IDENTIFIER, this.tok.index, this.tok.end, this.tok.text);
            }
            this.nextToken(true);
            return result;
        }
    };
    /**
     * tok is the first token of a statement
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseStatement = function () {
        var result;
        if (this.tokIs(KeyWords.FOR)) {
            result = this.parseFor();
        }
        else if (this.tokIs(KeyWords.IF)) {
            result = this.parseIf();
        }
        else if (this.tokIs(KeyWords.SWITCH)) {
            result = this.parseSwitch();
        }
        else if (this.tokIs(KeyWords.DO)) {
            result = this.parseDo();
        }
        else if (this.tokIs(KeyWords.WHILE)) {
            result = this.parseWhile();
        }
        else if (this.tokIs(KeyWords.TRY)) {
            result = this.parseTry();
        }
        else if (this.tokIs(KeyWords.CATCH)) {
            result = this.parseCatch();
        }
        else if (this.tokIs(KeyWords.FINALLY)) {
            result = this.parseFinally();
        }
        else if (this.tokIs(Operators.LEFT_CURLY_BRACKET)) {
            result = this.parseBlock();
        }
        else if (this.tokIs(KeyWords.VAR)) {
            result = this.parseVar();
        }
        else if (this.tokIs(KeyWords.CONST)) {
            result = this.parseConst();
        }
        else if (this.tokIs(KeyWords.RETURN)) {
            result = this.parseReturnStatement();
        }
        else if (this.tokIs(KeyWords.THROW)) {
            result = this.parseThrowStatement();
        }
        else if (this.tokIs(Operators.SEMI_COLUMN)) {
            result = this.parseEmptyStatement();
        }
        else {
            result = this.parseExpressionList();
            this.skip(Operators.SEMI_COLUMN);
        }
        return result;
    };
    /**
     * @return
     * @throws TokenException
     */
    AS3Parser.prototype.parseUnaryExpression = function () {
        var result, index = this.tok.index;
        if (this.tokIs(Operators.INCREMENT)) {
            this.nextToken();
            result = new Node(NodeKind.PRE_INC, this.tok.index, index, null, [this.parseUnaryExpression()]);
        }
        else if (this.tokIs(Operators.DECREMENT)) {
            this.nextToken();
            result = new Node(NodeKind.PRE_DEC, this.tok.index, index, null, [this.parseUnaryExpression()]);
        }
        else if (this.tokIs(Operators.MINUS)) {
            this.nextToken();
            result = new Node(NodeKind.MINUS, this.tok.index, index, null, [this.parseUnaryExpression()]);
        }
        else if (this.tokIs(Operators.PLUS) || this.tokIs(Operators.PLUS_AS2)) {
            this.nextToken();
            result = new Node(NodeKind.PLUS, this.tok.index, index, null, [this.parseUnaryExpression()]);
        }
        else {
            return this.parseUnaryExpressionNotPlusMinus();
        }
        return result;
    };
    AS3Parser.prototype.collectVarListContent = function (result) {
        result.children.push(this.parseNameTypeInit());
        while (this.tokIs(Operators.COMMA)) {
            this.nextToken(true);
            result.children.push(this.parseNameTypeInit());
        }
        return result;
    };
    /**
     * Compare the current token to the parameter. If it equals, get the next
     * token. If not, throw a runtime exception.
     *
     * @param text
     * @throws UnExpectedTokenException
     */
    AS3Parser.prototype.consume = function (text) {
        while (startsWith(this.tok.text, "//")) {
            this.nextToken();
        }
        if (!this.tokIs(text)) {
            /*throw new UnExpectedTokenException(this.tok.text,
                new Position(this.tok.index, this.tok.getColumn()),
                fileName,
                text);*/
            var pos = getLineAndCharacterFromPosition(this.tok.index, this.lineMap);
            throw new Error('unexpected token : ' + this.tok.text + '(' + pos.line + ',' + pos.col + ')' + ' in file ' + this.fileName + 'expected: ' + text);
        }
        var result = this.tok;
        this.nextToken();
        return result;
    };
    AS3Parser.prototype.convertMeta = function (metadataList) {
        if (metadataList == null || metadataList.length === 0) {
            return null;
        }
        var result = new Node(NodeKind.META_LIST, this.tok.index, -1);
        result.children = metadataList ? metadataList.slice(0) : [];
        if (result.lastChild) {
            result.end = result.lastChild.end;
        }
        result.start = result.children.reduce(function (index, child) {
            return Math.min(index, child ? child.start : Infinity);
        }, result.start);
        return result;
    };
    AS3Parser.prototype.convertModifiers = function (modifierList) {
        if (modifierList == null) {
            return null;
        }
        var result = new Node(NodeKind.MOD_LIST, this.tok.index, -1);
        var end = this.tok.index;
        result.children = modifierList.map(function (tok) {
            end = tok.index + tok.text.length;
            return new Node(NodeKind.MODIFIER, tok.index, end, tok.text);
        });
        result.end = end;
        result.start = result.children.reduce(function (index, child) {
            return Math.min(index, child ? child.start : Infinity);
        }, result.start);
        return result;
    };
    AS3Parser.prototype.doParseSignature = function () {
        var tok = this.consume(KeyWords.FUNCTION);
        var type = new Node(NodeKind.TYPE, tok.index, tok.end, KeyWords.FUNCTION);
        if (this.tokIs(KeyWords.SET) || this.tokIs(KeyWords.GET)) {
            type = new Node(NodeKind.TYPE, tok.index, this.tok.end, this.tok.text);
            this.nextToken(); // set or get
        }
        var name = new Node(NodeKind.NAME, this.tok.index, this.tok.end, this.tok.text);
        this.nextToken(); // name
        var params = this.parseParameterList();
        var returnType = this.parseOptionalType();
        return [type, name, params, returnType];
    };
    AS3Parser.prototype.findFunctionTypeFromSignature = function (signature) {
        for (var i = 0; i < signature.length; i++) {
            var node = signature[i];
            if (node.kind === NodeKind.TYPE) {
                if (node.text === "set") {
                    return NodeKind.SET;
                }
                if (node.text === "get") {
                    return NodeKind.GET;
                }
                return NodeKind.FUNCTION;
            }
        }
        return NodeKind.FUNCTION;
    };
    /**
     * Get the next token Skip comments but keep newlines We need this method for
     * beeing able to decide if a returnStatement has an expression
     *
     * @throws UnExpectedTokenException
     */
    AS3Parser.prototype.nextTokenAllowNewLine = function () {
        do {
            this.tok = this.scn.nextToken();
            if (this.tok == null) {
                throw new Error(this.fileName);
            }
            if (this.tok.text == null) {
                throw new Error(this.fileName);
            }
        } while (startsWith(this.tok.text, SINGLE_LINE_COMMENT));
    };
    AS3Parser.prototype.nextTokenIgnoringDocumentation = function () {
        do {
            this.nextToken();
        } while (startsWith(this.tok.text, MULTIPLE_LINES_COMMENT));
    };
    AS3Parser.prototype.parseAdditiveExpression = function () {
        var result = new Node(NodeKind.ADD, this.tok.index, this.tok.end, null, [this.parseMultiplicativeExpression()]);
        while (this.tokIs(Operators.PLUS) || this.tokIs(Operators.PLUS_AS2) || this.tokIs(Operators.MINUS)) {
            result.children.push(new Node(NodeKind.OP, this.tok.index, this.tok.end, this.tok.text));
            this.nextToken(true);
            result.children.push(this.parseMultiplicativeExpression());
        }
        if (result.lastChild) {
            result.end = result.lastChild.end;
        }
        return result.children.length > 1 ? result : result.lastChild;
    };
    // ------------------------------------------------------------------------
    // language specific recursive descent parsing
    // ------------------------------------------------------------------------
    AS3Parser.prototype.parseAndExpression = function () {
        var result = new Node(NodeKind.AND, this.tok.index, this.tok.end, null, [this.parseBitwiseOrExpression()]);
        while (this.tokIs(Operators.AND) || this.tokIs(Operators.AND_AS2)) {
            result.children.push(new Node(NodeKind.OP, this.tok.index, this.tok.end, this.tok.text));
            this.nextToken(true);
            result.children.push(this.parseBitwiseOrExpression());
        }
        if (result.lastChild) {
            result.end = result.lastChild.end;
        }
        return result.children.length > 1 ? result : result.lastChild;
    };
    /**
     * tok is ( exit tok is first token after )
     */
    AS3Parser.prototype.parseArgumentList = function () {
        var tok = this.consume(Operators.LEFT_PARENTHESIS);
        var result = new Node(NodeKind.ARGUMENTS, tok.index, -1);
        while (!this.tokIs(Operators.RIGHT_PARENTHESIS)) {
            result.children.push(this.parseExpression());
            this.skip(Operators.COMMA);
        }
        tok = this.consume(Operators.RIGHT_PARENTHESIS);
        result.end = tok.end;
        return result;
    };
    AS3Parser.prototype.parseArrayAccessor = function (node) {
        var result = new Node(NodeKind.ARRAY_ACCESSOR, node.start, -1);
        result.children.push(node);
        while (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
            this.nextToken(true);
            result.children.push(this.parseExpression());
            result.end = this.consume(Operators.RIGHT_SQUARE_BRACKET).end;
        }
        return result;
    };
    /**
     * tok is [
     */
    AS3Parser.prototype.parseArrayLiteral = function () {
        var tok = this.consume(Operators.LEFT_SQUARE_BRACKET);
        var result = new Node(NodeKind.ARRAY, tok.index, -1);
        while (!this.tokIs(Operators.RIGHT_SQUARE_BRACKET)) {
            result.children.push(this.parseExpression());
            this.skip(Operators.COMMA);
        }
        result.end = this.consume(Operators.RIGHT_SQUARE_BRACKET).end;
        return result;
    };
    AS3Parser.prototype.parseAssignmentExpression = function () {
        var result = new Node(NodeKind.ASSIGN, this.tok.index, this.tok.end, null, [this.parseConditionalExpression()]);
        while (this.tokIs(Operators.EQUAL) || this.tokIs(Operators.PLUS_EQUAL) || this.tokIs(Operators.MINUS_EQUAL) || this.tokIs(Operators.TIMES_EQUAL) || this.tokIs(Operators.DIVIDED_EQUAL) || this.tokIs(Operators.MODULO_EQUAL) || this.tokIs(Operators.AND_EQUAL) || this.tokIs(Operators.OR_EQUAL) || this.tokIs(Operators.XOR_EQUAL)) {
            result.children.push(new Node(NodeKind.OP, this.tok.index, this.tok.end, this.tok.text));
            this.nextToken(true);
            result.children.push(this.parseExpression());
        }
        if (result.lastChild) {
            result.end = result.lastChild.end;
        }
        return result.children.length > 1 ? result : result.lastChild;
    };
    AS3Parser.prototype.parseBitwiseAndExpression = function () {
        var result = new Node(NodeKind.B_AND, this.tok.index, this.tok.end, this.tok.text, [this.parseEqualityExpression()]);
        while (this.tokIs(Operators.B_AND)) {
            result.children.push(new Node(NodeKind.OP, this.tok.index, this.tok.end, this.tok.text));
            this.nextToken(true);
            result.children.push(this.parseEqualityExpression());
        }
        if (result.lastChild) {
            result.end = result.lastChild.end;
        }
        return result.children.length > 1 ? result : result.lastChild;
    };
    AS3Parser.prototype.parseBitwiseOrExpression = function () {
        var result = new Node(NodeKind.B_OR, this.tok.index, this.tok.end, this.tok.text, [this.parseBitwiseXorExpression()]);
        while (this.tokIs(Operators.B_OR)) {
            result.children.push(new Node(NodeKind.OP, this.tok.index, this.tok.end, this.tok.text));
            this.nextToken(true);
            result.children.push(this.parseBitwiseXorExpression());
        }
        if (result.lastChild) {
            result.end = result.lastChild.end;
        }
        return result.children.length > 1 ? result : result.lastChild;
    };
    AS3Parser.prototype.parseBitwiseXorExpression = function () {
        var result = new Node(NodeKind.B_XOR, this.tok.index, this.tok.end, this.tok.text, [this.parseBitwiseAndExpression()]);
        while (this.tokIs(Operators.B_XOR)) {
            result.children.push(new Node(NodeKind.OP, this.tok.index, this.tok.end, this.tok.text));
            this.nextToken(true);
            result.children.push(this.parseBitwiseAndExpression());
        }
        if (result.lastChild) {
            result.end = result.lastChild.end;
        }
        return result.children.length > 1 ? result : result.lastChild;
    };
    AS3Parser.prototype.parseBlock = function (result) {
        var tok = this.consume(Operators.LEFT_CURLY_BRACKET);
        if (!result) {
            result = new Node(NodeKind.BLOCK, tok.index, this.tok.end);
        }
        else {
            result.start = tok.index;
        }
        while (!this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
            if (startsWith(this.tok.text, MULTIPLE_LINES_COMMENT)) {
                this.currentFunctionNode.children.push(new Node(NodeKind.MULTI_LINE_COMMENT, this.tok.index, this.tok.end, this.tok.text));
                this.nextToken();
            }
            else {
                result.children.push(this.parseStatement());
            }
        }
        result.end = this.consume(Operators.RIGHT_CURLY_BRACKET).end;
        return result;
    };
    /**
     * tok is catch
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseCatch = function () {
        var tok = this.consume(KeyWords.CATCH);
        this.consume(Operators.LEFT_PARENTHESIS);
        var result = new Node(NodeKind.CATCH, tok.index, tok.end, null, [
            new Node(NodeKind.NAME, this.tok.index, this.tok.end, this.tok.text)
        ]);
        this.nextToken(true); // name
        if (this.tokIs(Operators.COLUMN)) {
            this.nextToken(true); // :
            result.children.push(new Node(NodeKind.TYPE, this.tok.index, this.tok.end, this.tok.text));
            this.nextToken(true); // type
        }
        this.consume(Operators.RIGHT_PARENTHESIS);
        var parseBlock = this.parseBlock();
        result.children.push(parseBlock);
        result.end = parseBlock.end;
        return result;
    };
    /**
     * tok is class
     *
     * @param meta
     * @param modifier
     * @throws TokenException
     */
    AS3Parser.prototype.parseClass = function (meta, modifier) {
        var tok = this.consume(KeyWords.CLASS);
        var result = new Node(NodeKind.CLASS, tok.index, tok.end);
        if (this.currentAsDoc != null) {
            result.children.push(this.currentAsDoc);
            this.currentAsDoc = null;
        }
        if (this.currentMultiLineComment != null) {
            result.children.push(this.currentMultiLineComment);
            this.currentMultiLineComment = null;
        }
        var index = this.tok.index, name = this.parseQualifiedName(true);
        result.children.push(new Node(NodeKind.NAME, index, index + name.length, name));
        result.children.push(this.convertMeta(meta));
        result.children.push(this.convertModifiers(modifier));
        do {
            if (this.tokIs(KeyWords.EXTENDS)) {
                this.nextToken(true); // extends
                index = this.tok.index;
                name = this.parseQualifiedName(false);
                result.children.push(new Node(NodeKind.EXTENDS, index, index + name.length, name));
            }
            else if (this.tokIs(KeyWords.IMPLEMENTS)) {
                result.children.push(this.parseImplementsList());
            }
        } while (!this.tokIs(Operators.LEFT_CURLY_BRACKET));
        this.consume(Operators.LEFT_CURLY_BRACKET);
        result.children.push(this.parseClassContent());
        var tok = this.consume(Operators.RIGHT_CURLY_BRACKET);
        result.end = tok.end;
        result.start = result.children.reduce(function (index, child) {
            return Math.min(index, child ? child.start : Infinity);
        }, index);
        return result;
    };
    AS3Parser.prototype.parseClassConstant = function (result, modifiers, meta) {
        result.children.push(this.parseConstList(meta, modifiers));
        if (this.tokIs(Operators.SEMI_COLUMN)) {
            this.nextToken();
        }
        meta.length = 0;
        modifiers.length = 0;
    };
    AS3Parser.prototype.parseClassField = function (result, modifiers, meta) {
        var varList = this.parseVarList(meta, modifiers);
        result.children.push(varList);
        if (this.currentAsDoc != null) {
            varList.children.push(this.currentAsDoc);
            this.currentAsDoc = null;
        }
        if (this.currentMultiLineComment != null) {
            result.children.push(this.currentMultiLineComment);
            this.currentMultiLineComment = null;
        }
        if (this.tokIs(Operators.SEMI_COLUMN)) {
            this.nextToken();
        }
        meta.length = 0;
        modifiers.length = 0;
    };
    AS3Parser.prototype.parseClassFunctions = function (result, modifiers, meta) {
        result.children.push(this.parseFunction(meta, modifiers));
        meta.length = 0;
        modifiers.length = 0;
    };
    /**
     * tok is (
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseCondition = function () {
        var tok = this.consume(Operators.LEFT_PARENTHESIS);
        var result = new Node(NodeKind.CONDITION, tok.index, -1, null, [this.parseExpression()]);
        tok = this.consume(Operators.RIGHT_PARENTHESIS);
        result.end = tok.end;
        return result;
    };
    AS3Parser.prototype.parseConditionalExpression = function () {
        var result = this.parseOrExpression();
        if (this.tokIs(Operators.QUESTION_MARK)) {
            var conditional = new Node(NodeKind.CONDITIONAL, result.start, -1, null, [result]);
            this.nextToken(true); // ?
            conditional.children.push(this.parseExpression());
            this.nextToken(true); // :
            conditional.children.push(this.parseExpression());
            conditional.end = conditional.lastChild.start;
            return conditional;
        }
        return result;
    };
    AS3Parser.prototype.parseConst = function () {
        var result = this.parseConstList(null, null);
        this.skip(Operators.SEMI_COLUMN);
        return result;
    };
    /**
     * tok is const
     *
     * @param modifiers
     * @param meta
     * @throws TokenException
     */
    AS3Parser.prototype.parseConstList = function (meta, modifiers) {
        var tok = this.consume(KeyWords.CONST);
        var result = new Node(NodeKind.CONST_LIST, tok.index, -1);
        result.children.push(this.convertMeta(meta));
        result.children.push(this.convertModifiers(modifiers));
        this.collectVarListContent(result);
        result.start = result.children.reduce(function (index, child) {
            return Math.min(index, child ? child.start : Infinity);
        }, tok.index);
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, 0);
        return result;
    };
    AS3Parser.prototype.parseDecrement = function (node) {
        this.nextToken(true);
        var result = new Node(NodeKind.POST_DEC, node.start, this.tok.end);
        result.children.push(node);
        result.end = node.end;
        return result;
    };
    /**
     * tok is do
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseDo = function () {
        var tok = this.consume(KeyWords.DO);
        var result = new Node(NodeKind.DO, tok.index, -1, null, [this.parseStatement()]);
        this.consume(KeyWords.WHILE);
        var cond = this.parseCondition();
        result.children.push(cond);
        result.end = cond.end;
        if (this.tokIs(Operators.SEMI_COLUMN)) {
            this.nextToken(true);
        }
        return result;
    };
    AS3Parser.prototype.parseDot = function (node) {
        this.nextToken();
        if (this.tokIs(Operators.LEFT_PARENTHESIS)) {
            var index = this.tok.index;
            this.nextToken();
            var result = new Node(NodeKind.E4X_FILTER, this.tok.index, -1);
            result.children.push(node);
            result.children.push(this.parseExpression());
            result.end = this.consume(Operators.RIGHT_PARENTHESIS).end;
            return result;
        }
        else if (this.tokIs(Operators.TIMES)) {
            var result = new Node(NodeKind.E4X_STAR, this.tok.index, -1);
            result.children.push(node);
            result.end = node.end;
            return result;
        }
        var result = new Node(NodeKind.DOT, node.start, -1);
        result.children.push(node);
        result.children.push(new Node(NodeKind.LITERAL, this.tok.index, this.tok.end, this.tok.text));
        this.nextToken(true);
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, 0);
        return result;
    };
    AS3Parser.prototype.parseEmptyStatement = function () {
        var result;
        result = new Node(NodeKind.STMT_EMPTY, this.tok.index, this.tok.end, Operators.SEMI_COLUMN);
        this.nextToken(true);
        return result;
    };
    AS3Parser.prototype.parseEncapsulatedExpression = function () {
        var tok = this.consume(Operators.LEFT_PARENTHESIS);
        var result = new Node(NodeKind.ENCAPSULATED, tok.index, -1);
        result.children.push(this.parseExpressionList());
        tok = this.consume(Operators.RIGHT_PARENTHESIS);
        result.end = tok.end;
        return result;
    };
    AS3Parser.prototype.parseEqualityExpression = function () {
        var result = new Node(NodeKind.EQUALITY, this.tok.index, -1, null, [this.parseRelationalExpression()]);
        while (this.tokIs(Operators.DOUBLE_EQUAL) || this.tokIs(Operators.DOUBLE_EQUAL_AS2) || this.tokIs(Operators.STRICTLY_EQUAL) || this.tokIs(Operators.NON_EQUAL) || this.tokIs(Operators.NON_EQUAL_AS2_1) || this.tokIs(Operators.NON_EQUAL_AS2_2) || this.tokIs(Operators.NON_STRICTLY_EQUAL)) {
            result.children.push(new Node(NodeKind.OP, this.tok.index, this.tok.end, this.tok.text));
            this.nextToken(true);
            result.children.push(this.parseRelationalExpression());
        }
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, 0);
        return result.children.length > 1 ? result : result.children[0];
    };
    AS3Parser.prototype.parseExpressionList = function () {
        var result = new Node(NodeKind.EXPR_LIST, this.tok.index, -1, null, [this.parseAssignmentExpression()]);
        while (this.tokIs(Operators.COMMA)) {
            this.nextToken(true);
            result.children.push(this.parseAssignmentExpression());
        }
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, 0);
        return result.children.length > 1 ? result : result.children[0];
    };
    AS3Parser.prototype.parseFinally = function () {
        var result;
        var index = this.tok.index;
        this.nextToken(true);
        var block = this.parseBlock();
        result = new Node(NodeKind.FINALLY, index, block.end, null, [block]);
        return result;
    };
    /**
     * tok is for
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseFor = function () {
        var tok = this.consume(KeyWords.FOR);
        if (this.tokIs(KeyWords.EACH)) {
            this.nextToken();
            return this.parseForEach(tok.index);
        }
        else {
            return this.parseTraditionalFor(tok.index);
        }
    };
    /**
     * tok is ( for each( var obj : Type in List )
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseForEach = function (index) {
        this.consume(Operators.LEFT_PARENTHESIS);
        var result = new Node(NodeKind.FOREACH, index, -1);
        if (this.tokIs(KeyWords.VAR)) {
            var node = new Node(NodeKind.VAR, this.tok.index, -1);
            this.nextToken();
            var child = this.parseNameTypeInit();
            node.children.push(child);
            node.end = child.end;
            result.children.push(node);
        }
        else {
            result.children.push(new Node(NodeKind.NAME, this.tok.index, this.tok.end, this.tok.text));
            // names allowed?
            this.nextToken();
        }
        var index = this.tok.index;
        this.nextToken(); // in
        var expr = this.parseExpression();
        result.children.push(new Node(NodeKind.IN, index, expr.end, null, [expr]));
        this.consume(Operators.RIGHT_PARENTHESIS);
        var statement = this.parseStatement();
        result.children.push(statement);
        result.end = statement.end;
        return result;
    };
    AS3Parser.prototype.parseForIn = function (result) {
        var index = this.tok.index;
        this.nextToken();
        var expr = this.parseExpression();
        result.children.push(new Node(NodeKind.IN, index, expr.end, null, [expr]));
        result.kind = NodeKind.FORIN;
        this.consume(Operators.RIGHT_PARENTHESIS);
        return result;
    };
    /**
     * tok is function
     *
     * @param modifiers
     * @param meta
     * @throws TokenException
     */
    AS3Parser.prototype.parseFunction = function (meta, modifiers) {
        var signature = this.doParseSignature();
        var result = new Node(this.findFunctionTypeFromSignature(signature), signature[0].start, -1, signature[0].text);
        if (this.currentAsDoc != null) {
            result.children.push(this.currentAsDoc);
            this.currentAsDoc = null;
        }
        if (this.currentMultiLineComment != null) {
            result.children.push(this.currentMultiLineComment);
            this.currentMultiLineComment = null;
        }
        result.children.push(this.convertMeta(meta));
        result.children.push(this.convertModifiers(modifiers));
        result.children.push(signature[1]);
        result.children.push(signature[2]);
        result.children.push(signature[3]);
        if (this.tokIs(Operators.SEMI_COLUMN)) {
            this.consume(Operators.SEMI_COLUMN);
        }
        else {
            result.children.push(this.parseFunctionBlock());
        }
        this.currentFunctionNode = null;
        result.start = result.children.reduce(function (index, child) {
            return Math.min(index, child ? child.start : Infinity);
        }, result.start);
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, 0);
        return result;
    };
    /**
     * tok is { exit tok is the first tok after }
     *
     * @throws TokenException
     * @throws TokenException
     */
    AS3Parser.prototype.parseFunctionBlock = function () {
        var block = new Node(NodeKind.BLOCK, this.tok.index, -1);
        this.currentFunctionNode = block;
        this.parseBlock(block);
        return block;
    };
    AS3Parser.prototype.parseFunctionCall = function (node) {
        var result = new Node(NodeKind.CALL, node.start, -1);
        result.children.push(node);
        while (this.tokIs(Operators.LEFT_PARENTHESIS)) {
            result.children.push(this.parseArgumentList());
        }
        while (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
            result.children.push(this.parseArrayLiteral());
        }
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, 0);
        return result;
    };
    /**
     * tok is function exit tok is the first token after the optional ;
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseFunctionSignature = function () {
        var signature = this.doParseSignature();
        this.skip(Operators.SEMI_COLUMN);
        var result = new Node(this.findFunctionTypeFromSignature(signature), signature[0].start, -1, signature[0].text);
        result.children.push(signature[1]);
        result.children.push(signature[2]);
        result.children.push(signature[3]);
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, 0);
        return result;
    };
    /**
     * tok is if
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseIf = function () {
        var tok = this.consume(KeyWords.IF);
        var result = new Node(NodeKind.IF, tok.index, -1, null, [this.parseCondition()]);
        result.children.push(this.parseStatement());
        if (this.tokIs(KeyWords.ELSE)) {
            this.nextToken(true);
            result.children.push(this.parseStatement());
        }
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, 0);
        return result;
    };
    /**
     * tok is implements implements a,b,c exit tok is the first token after the
     * list of qualfied names
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseImplementsList = function () {
        this.consume(KeyWords.IMPLEMENTS);
        var result = new Node(NodeKind.IMPLEMENTS_LIST, this.tok.index, -1);
        var index = this.tok.index;
        var name = this.parseQualifiedName(true);
        result.children.push(new Node(NodeKind.IMPLEMENTS, index, index + name.length, name));
        while (this.tokIs(Operators.COMMA)) {
            this.nextToken(true);
            var index = this.tok.index;
            var name = this.parseQualifiedName(true);
            result.children.push(new Node(NodeKind.IMPLEMENTS, index, index + name.length, name));
        }
        return result;
    };
    /**
     * tok is import
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseImport = function () {
        var tok = this.consume(KeyWords.IMPORT);
        var name = this.parseImportName();
        var result = new Node(NodeKind.IMPORT, tok.index, tok.index + name.length, name);
        this.skip(Operators.SEMI_COLUMN);
        return result;
    };
    /**
     * tok is the first part of a name the last part can be a star exit tok is
     * the first token, which doesn't belong to the name
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseImportName = function () {
        var result = '';
        result += this.tok.text;
        this.nextToken();
        while (this.tokIs(Operators.DOT)) {
            result += Operators.DOT;
            this.nextToken(); // .
            result += this.tok.text;
            this.nextToken(); // part of name
        }
        return result;
    };
    AS3Parser.prototype.parseIncludeExpression = function () {
        var result = new Node(NodeKind.INCLUDE, this.tok.index, -1);
        var tok;
        if (this.tokIs(KeyWords.INCLUDE)) {
            tok = this.consume(KeyWords.INCLUDE);
        }
        else if (this.tokIs(KeyWords.INCLUDE_AS2)) {
            tok = this.consume(KeyWords.INCLUDE_AS2);
        }
        if (tok) {
            result.start = tok.index;
        }
        result.children.push(this.parseExpression());
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, 0);
        return result;
    };
    AS3Parser.prototype.parseIncrement = function (node) {
        this.nextToken(true);
        var result = new Node(NodeKind.POST_INC, node.start, this.tok.end);
        result.children.push(node);
        return result;
    };
    /**
     * tok is interface
     *
     * @param meta
     * @param modifier
     * @throws TokenException
     */
    AS3Parser.prototype.parseInterface = function (meta, modifier) {
        var tok = this.consume(KeyWords.INTERFACE);
        var result = new Node(NodeKind.INTERFACE, tok.index, -1);
        if (this.currentAsDoc != null) {
            result.children.push(this.currentAsDoc);
            this.currentAsDoc = null;
        }
        if (this.currentMultiLineComment != null) {
            result.children.push(this.currentMultiLineComment);
            this.currentMultiLineComment = null;
        }
        var name = this.parseQualifiedName(true);
        result.children.push(new Node(NodeKind.NAME, this.tok.index, this.tok.index + name.length, name));
        result.children.push(this.convertMeta(meta));
        result.children.push(this.convertModifiers(modifier));
        if (this.tokIs(KeyWords.EXTENDS)) {
            this.nextToken(); // extends
            name = this.parseQualifiedName(false);
            result.children.push(new Node(NodeKind.EXTENDS, this.tok.index, this.tok.index + name.length, name));
        }
        while (this.tokIs(Operators.COMMA)) {
            this.nextToken(); // comma
            name = this.parseQualifiedName(false);
            result.children.push(new Node(NodeKind.EXTENDS, this.tok.index, this.tok.index + name.length, name));
        }
        this.consume(Operators.LEFT_CURLY_BRACKET);
        result.children.push(this.parseInterfaceContent());
        tok = this.consume(Operators.RIGHT_CURLY_BRACKET);
        result.end = tok.end;
        result.start = result.children.reduce(function (index, child) {
            return Math.min(index, child ? child.start : Infinity);
        }, tok.index);
        return result;
    };
    /**
     * tok is function
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseLambdaExpression = function () {
        var tok = this.consume(KeyWords.FUNCTION);
        var result;
        //if (this.tok.text.compareTo("(") == 0) {
        if (this.tok.text === "(") {
            result = new Node(NodeKind.LAMBDA, tok.index, this.tok.end);
        }
        else {
            result = new Node(NodeKind.FUNCTION, tok.index, this.tok.end, this.tok.text);
            this.nextToken(true);
        }
        result.children.push(this.parseParameterList());
        result.children.push(this.parseOptionalType());
        result.children.push(this.parseBlock());
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, result.end);
        return result;
    };
    AS3Parser.prototype.parseFile = function (filePath, content) {
        this.setFileName(filePath);
        this.scn = new AS3Scanner();
        this.scn.setContent(content);
        return this.parseCompilationUnit();
    };
    /**
     * tok is [ [id] [id ("test")] [id (name="test",type="a.b.c.Event")] exit
     * token is the first token after ]
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseMetaData = function () {
        var buffer = '';
        var index = this.tok.index;
        var index = this.consume(Operators.LEFT_SQUARE_BRACKET).index;
        while (!this.tokIs(Operators.RIGHT_SQUARE_BRACKET)) {
            buffer += this.tok.text;
            this.nextToken();
        }
        var end = this.tok.end;
        this.skip(Operators.RIGHT_SQUARE_BRACKET);
        var metaDataNode = new Node(NodeKind.META, index, end, '[' + buffer + ']');
        return metaDataNode;
    };
    AS3Parser.prototype.parseMultiplicativeExpression = function () {
        var result = new Node(NodeKind.MULTIPLICATION, this.tok.index, -1, null, [this.parseUnaryExpression()]);
        while (this.tokIs(Operators.TIMES) || this.tokIs(Operators.SLASH) || this.tokIs(Operators.MODULO)) {
            result.children.push(new Node(NodeKind.OP, this.tok.index, this.tok.end, this.tok.text));
            this.nextToken(true);
            result.children.push(this.parseUnaryExpression());
        }
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, result.end);
        return result.children.length > 1 ? result : result.children[0];
    };
    AS3Parser.prototype.parseNamespaceName = function () {
        var name = this.tok.text;
        this.nextToken(); // simple name for now
        return name;
    };
    AS3Parser.prototype.parseNameTypeInit = function () {
        var result = new Node(NodeKind.NAME_TYPE_INIT, this.tok.index, -1);
        result.children.push(new Node(NodeKind.NAME, this.tok.index, this.tok.end, this.tok.text));
        this.nextToken(true); // name
        result.children.push(this.parseOptionalType());
        result.children.push(this.parseOptionalInit());
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, result.end);
        return result;
    };
    AS3Parser.prototype.parseNewExpression = function () {
        var tok = this.consume(KeyWords.NEW);
        var result = new Node(NodeKind.NEW, tok.index, -1);
        result.children.push(this.parseExpression()); // name
        if (this.tokIs(Operators.VECTOR_START)) {
            var index = this.tok.index;
            var vec = this.parseVector();
            result.children.push(new Node(NodeKind.VECTOR, index, vec.end, null, [vec]));
        }
        if (this.tokIs(Operators.LEFT_PARENTHESIS)) {
            result.children.push(this.parseArgumentList());
        }
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, result.end);
        return result;
    };
    /**
     * tok is {
     */
    AS3Parser.prototype.parseObjectLiteral = function () {
        var tok = this.consume(Operators.LEFT_CURLY_BRACKET);
        var result = new Node(NodeKind.OBJECT, tok.index, tok.end);
        while (!this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
            result.children.push(this.parseObjectLiteralPropertyDeclaration());
            this.skip(Operators.COMMA);
        }
        tok = this.consume(Operators.RIGHT_CURLY_BRACKET);
        result.end = tok.end;
        return result;
    };
    /*
     * tok is name
     */
    AS3Parser.prototype.parseObjectLiteralPropertyDeclaration = function () {
        var result = new Node(NodeKind.PROP, this.tok.index, this.tok.end);
        var name = new Node(NodeKind.NAME, this.tok.index, this.tok.end, this.tok.text);
        result.children.push(name);
        this.nextToken(); // name
        this.consume(Operators.COLUMN);
        var expr = this.parseExpression();
        var val = new Node(NodeKind.VALUE, this.tok.index, expr.end, null, [expr]);
        result.children.push(val);
        result.end = val.end;
        return result;
    };
    /**
     * if tok is "=" parse the expression otherwise do nothing
     *
     * @return
     */
    AS3Parser.prototype.parseOptionalInit = function () {
        var result = null;
        if (this.tokIs(Operators.EQUAL)) {
            this.nextToken(true);
            var index = this.tok.index;
            var expr = this.parseExpression();
            result = new Node(NodeKind.INIT, index, expr.end, null, [expr]);
        }
        return result;
    };
    /**
     * if tok is ":" parse the type otherwise do nothing
     *
     * @return
     * @throws TokenException
     */
    AS3Parser.prototype.parseOptionalType = function () {
        var result = new Node(NodeKind.TYPE, this.tok.index, this.tok.index, "");
        if (this.tokIs(Operators.COLUMN)) {
            this.nextToken(true);
            result = this.parseType();
        }
        return result;
    };
    AS3Parser.prototype.parseOrExpression = function () {
        var result = new Node(NodeKind.OR, this.tok.index, -1, null, [this.parseAndExpression()]);
        while (this.tokIs(Operators.LOGICAL_OR) || this.tokIs(Operators.LOGICAL_OR_AS2)) {
            result.children.push(new Node(NodeKind.OP, this.tok.index, this.tok.end, this.tok.text));
            this.nextToken(true);
            result.children.push(this.parseAndExpression());
        }
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, result.end);
        return result.children.length > 1 ? result : result.children[0];
    };
    /**
     * tok is package
     *
     * @throws UnExpectedTokenException
     */
    AS3Parser.prototype.parsePackage = function () {
        var tok = this.consume(KeyWords.PACKAGE);
        var result = new Node(NodeKind.PACKAGE, tok.index, -1);
        var nameBuffer = '';
        var index = this.tok.index;
        while (!this.tokIs(Operators.LEFT_CURLY_BRACKET)) {
            nameBuffer += this.tok.text;
            this.nextToken();
        }
        result.children.push(new Node(NodeKind.NAME, index, index + nameBuffer.length, nameBuffer));
        this.consume(Operators.LEFT_CURLY_BRACKET);
        result.children.push(this.parsePackageContent());
        tok = this.consume(Operators.RIGHT_CURLY_BRACKET);
        result.end = tok.end;
        return result;
    };
    /**
     * tok is the name of a parameter or ...
     */
    AS3Parser.prototype.parseParameter = function () {
        var result = new Node(NodeKind.PARAMETER, this.tok.index, -1);
        if (this.tokIs(Operators.REST_PARAMETERS)) {
            var index = this.tok.index;
            this.nextToken(true); // ...
            var rest = new Node(NodeKind.REST, index, this.tok.end, this.tok.text);
            this.nextToken(true); // rest
            result.children.push(rest);
        }
        else {
            result.children.push(this.parseNameTypeInit());
        }
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, result.end);
        return result;
    };
    /**
     * tok is (
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseParameterList = function () {
        var tok = this.consume(Operators.LEFT_PARENTHESIS);
        var result = new Node(NodeKind.PARAMETER_LIST, tok.index, -1);
        while (!this.tokIs(Operators.RIGHT_PARENTHESIS)) {
            result.children.push(this.parseParameter());
            if (this.tokIs(Operators.COMMA)) {
                this.nextToken(true);
            }
            else {
                break;
            }
        }
        tok = this.consume(Operators.RIGHT_PARENTHESIS);
        result.end = tok.end;
        return result;
    };
    /**
     * tok is first part of the name exit tok is the first token after the name
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseQualifiedName = function (skipPackage) {
        var buffer = '';
        buffer += this.tok.text;
        this.nextToken();
        while (this.tokIs(Operators.DOT) || this.tokIs(Operators.DOUBLE_COLUMN)) {
            buffer += this.tok.text;
            this.nextToken();
            buffer += this.tok.text;
            this.nextToken(); // name
        }
        if (skipPackage) {
            return buffer.substring(buffer.lastIndexOf(Operators.DOT) + 1);
        }
        return buffer;
    };
    AS3Parser.prototype.parseRelationalExpression = function () {
        var result = new Node(NodeKind.RELATION, this.tok.index, -1, null, [this.parseShiftExpression()]);
        while (this.tokIs(Operators.INFERIOR) || this.tokIs(Operators.INFERIOR_AS2) || this.tokIs(Operators.INFERIOR_OR_EQUAL) || this.tokIs(Operators.INFERIOR_OR_EQUAL_AS2) || this.tokIs(Operators.SUPERIOR) || this.tokIs(Operators.SUPERIOR_AS2) || this.tokIs(Operators.SUPERIOR_OR_EQUAL) || this.tokIs(Operators.SUPERIOR_OR_EQUAL_AS2) || this.tokIs(KeyWords.IS) || this.tokIs(KeyWords.IN) && !this.isInFor || this.tokIs(KeyWords.AS) || this.tokIs(KeyWords.INSTANCE_OF)) {
            if (!this.tokIs(KeyWords.AS)) {
                result.children.push(new Node(NodeKind.OP, this.tok.index, this.tok.end, this.tok.text));
            }
            else {
                result.children.push(new Node(NodeKind.AS, this.tok.index, this.tok.end, this.tok.text));
            }
            this.nextToken(true);
            result.children.push(this.parseShiftExpression());
        }
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, result.end);
        return result.children.length > 1 ? result : result.children[0];
    };
    AS3Parser.prototype.parseReturnStatement = function () {
        var result;
        var index = this.tok.index, end = this.tok.end;
        this.nextTokenAllowNewLine();
        if (this.tokIs(NEW_LINE) || this.tokIs(Operators.SEMI_COLUMN)) {
            this.nextToken(true);
            result = new Node(NodeKind.RETURN, index, end, "");
        }
        else {
            var expr = this.parseExpression();
            result = new Node(NodeKind.RETURN, index, expr.end, null, [expr]);
            this.skip(Operators.SEMI_COLUMN);
        }
        return result;
    };
    AS3Parser.prototype.parseThrowStatement = function () {
        var tok = this.consume(KeyWords.THROW);
        var expr = this.parseExpression();
        return new Node(NodeKind.RETURN, tok.index, expr.end, null, [expr]);
        ;
    };
    AS3Parser.prototype.parseShiftExpression = function () {
        var result = new Node(NodeKind.SHIFT, this.tok.index, -1, null, [this.parseAdditiveExpression()]);
        while (this.tokIs(Operators.DOUBLE_SHIFT_LEFT) || this.tokIs(Operators.TRIPLE_SHIFT_LEFT) || this.tokIs(Operators.DOUBLE_SHIFT_RIGHT) || this.tokIs(Operators.TRIPLE_SHIFT_RIGHT)) {
            result.children.push(new Node(NodeKind.OP, this.tok.index, this.tok.end, this.tok.text));
            this.nextToken(true);
            result.children.push(this.parseAdditiveExpression());
        }
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, result.end);
        return result.children.length > 1 ? result : result.children[0];
    };
    /**
     * tok is switch
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseSwitch = function () {
        var tok = this.consume(KeyWords.SWITCH);
        var result = new Node(NodeKind.SWITCH, tok.index, tok.end, null, [this.parseCondition()]);
        if (this.tokIs(Operators.LEFT_CURLY_BRACKET)) {
            this.nextToken();
            result.children.push(this.parseSwitchCases());
            result.end = this.consume(Operators.RIGHT_CURLY_BRACKET).end;
        }
        return result;
    };
    /**
     * tok is case, default or the first token of the first statement
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseSwitchBlock = function () {
        var result = new Node(NodeKind.SWITCH_BLOCK, this.tok.index, this.tok.end);
        while (!this.tokIs(KeyWords.CASE) && !this.tokIs(KeyWords.DEFAULT) && !this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
            result.children.push(this.parseStatement());
        }
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, result.end);
        return result;
    };
    /**
     * tok is { exit tok is }
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseSwitchCases = function () {
        var result = new Node(NodeKind.CASES, this.tok.index, this.tok.end);
        for (;;) {
            if (this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
                break;
            }
            else if (this.tokIs(KeyWords.CASE)) {
                var index = this.tok.index;
                this.nextToken(true); // case
                var expr = this.parseExpression();
                var caseNode = new Node(NodeKind.CASE, index, expr.end, null, [expr]);
                this.consume(Operators.COLUMN);
                var block = this.parseSwitchBlock();
                caseNode.children.push(block);
                caseNode.end = block.end;
                result.children.push(caseNode);
            }
            else if (this.tokIs(KeyWords.DEFAULT)) {
                var index = this.tok.index;
                this.nextToken(true); // default
                this.consume(Operators.COLUMN);
                var caseNode = new Node(NodeKind.CASE, index, -1, null, [new Node(NodeKind.DEFAULT, index, this.tok.end, KeyWords.DEFAULT)]);
                var block = this.parseSwitchBlock();
                caseNode.end = block.end;
                caseNode.children.push(block);
                result.children.push(caseNode);
            }
        }
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, result.end);
        return result;
    };
    /**
     * tok is ( for( var x : number = 0; i < length; i++ ) for( var s : string in
     * Object )
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseTraditionalFor = function (index) {
        this.consume(Operators.LEFT_PARENTHESIS);
        var result = new Node(NodeKind.FOR, index, -1);
        if (!this.tokIs(Operators.SEMI_COLUMN)) {
            if (this.tokIs(KeyWords.VAR)) {
                var varList = this.parseVarList(null, null);
                result.children.push(new Node(NodeKind.INIT, varList.start, varList.end, null, [varList]));
            }
            else {
                this.isInFor = true;
                var expr = this.parseExpression();
                result.children.push(new Node(NodeKind.INIT, expr.start, expr.end, null, [expr]));
                this.isInFor = false;
            }
            if (this.tokIs(NodeKind.IN)) {
                return this.parseForIn(result);
            }
        }
        this.consume(Operators.SEMI_COLUMN);
        if (!this.tokIs(Operators.SEMI_COLUMN)) {
            var expr = this.parseExpression();
            result.children.push(new Node(NodeKind.COND, expr.start, expr.end, null, [expr]));
        }
        this.consume(Operators.SEMI_COLUMN);
        if (!this.tokIs(Operators.RIGHT_PARENTHESIS)) {
            var expr = this.parseExpressionList();
            result.children.push(new Node(NodeKind.ITER, expr.start, expr.end, null, [expr]));
        }
        this.consume(Operators.RIGHT_PARENTHESIS);
        result.children.push(this.parseStatement());
        return result;
    };
    AS3Parser.prototype.parseTry = function () {
        var result;
        var index = this.tok.index;
        this.nextToken(true);
        var block = this.parseBlock();
        result = new Node(NodeKind.TRY, index, block.end, null, [block]);
        return result;
    };
    AS3Parser.prototype.parseType = function () {
        var result;
        if (this.tok.text === VECTOR) {
            result = this.parseVector();
        }
        else {
            var index = this.tok.index, name = this.parseQualifiedName(true);
            result = new Node(NodeKind.TYPE, index, index + name.length, name);
        }
        return result;
    };
    AS3Parser.prototype.parseUnaryExpressionNotPlusMinus = function () {
        var result;
        var index = this.tok.index;
        if (this.tokIs(KeyWords.DELETE)) {
            this.nextToken(true);
            var expr = this.parseExpression();
            result = new Node(NodeKind.DELETE, index, expr.end, null, [expr]);
        }
        else if (this.tokIs(KeyWords.VOID)) {
            this.nextToken(true);
            var expr = this.parseExpression();
            result = new Node(NodeKind.VOID, index, expr.end, null, [expr]);
        }
        else if (this.tokIs(KeyWords.TYPEOF)) {
            this.nextToken(true);
            var expr = this.parseExpression();
            result = new Node(NodeKind.TYPEOF, index, expr.end, null, [expr]);
        }
        else if (this.tokIs("!") || this.tokIs("not")) {
            this.nextToken(true);
            var expr = this.parseExpression();
            result = new Node(NodeKind.NOT, index, expr.end, null, [expr]);
        }
        else if (this.tokIs("~")) {
            this.nextToken(true);
            var expr = this.parseExpression();
            result = new Node(NodeKind.B_NOT, index, expr.end, null, [expr]);
        }
        else {
            result = this.parseUnaryPostfixExpression();
        }
        return result;
    };
    AS3Parser.prototype.parseUnaryPostfixExpression = function () {
        var node = this.parseAccessExpresion();
        if (this.tokIs(Operators.INCREMENT)) {
            node = this.parseIncrement(node);
        }
        else if (this.tokIs(Operators.DECREMENT)) {
            node = this.parseDecrement(node);
        }
        return node;
    };
    AS3Parser.prototype.parseAccessExpresion = function () {
        var node = this.parsePrimaryExpression();
        while (true) {
            if (this.tokIs(Operators.LEFT_PARENTHESIS)) {
                node = this.parseFunctionCall(node);
            }
            if (this.tokIs(Operators.DOT) || this.tokIs(Operators.DOUBLE_COLUMN)) {
                node = this.parseDot(node);
            }
            else if (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
                node = this.parseArrayAccessor(node);
            }
            else {
                break;
            }
        }
        return node;
    };
    AS3Parser.prototype.parseUse = function () {
        var tok = this.consume(KeyWords.USE);
        this.consume(KeyWords.NAMESPACE);
        var nameIndex = this.tok.index;
        var namespace = this.parseNamespaceName();
        var result = new Node(NodeKind.USE, tok.index, nameIndex + namespace.length, namespace);
        this.skip(Operators.SEMI_COLUMN);
        return result;
    };
    AS3Parser.prototype.parseVar = function () {
        var result;
        result = this.parseVarList(null, null);
        this.skip(Operators.SEMI_COLUMN);
        return result;
    };
    /**
     * tok is var var x, y : String, z : number = 0;
     *
     * @param modifiers
     * @param meta
     * @throws TokenException
     */
    AS3Parser.prototype.parseVarList = function (meta, modifiers) {
        var tok = this.consume(KeyWords.VAR);
        var result = new Node(NodeKind.VAR_LIST, tok.index, tok.end);
        result.children.push(this.convertMeta(meta));
        result.children.push(this.convertModifiers(modifiers));
        this.collectVarListContent(result);
        result.start = result.children.reduce(function (index, child) {
            return Math.min(index, child ? child.start : Infinity);
        }, tok.index);
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, tok.end);
        return result;
    };
    AS3Parser.prototype.parseVector = function () {
        var result = new Node(NodeKind.VECTOR, this.tok.index, -1, "");
        if (this.tok.text === "Vector") {
            this.nextToken();
        }
        this.consume(Operators.VECTOR_START);
        result.children.push(this.parseType());
        result.end = this.consume(Operators.SUPERIOR).end;
        return result;
    };
    /**
     * tok is while
     *
     * @throws TokenException
     */
    AS3Parser.prototype.parseWhile = function () {
        var tok = this.consume(KeyWords.WHILE);
        var result = new Node(NodeKind.WHILE, tok.index, tok.end);
        result.children.push(this.parseCondition());
        result.children.push(this.parseStatement());
        result.end = result.children.reduce(function (index, child) {
            return Math.max(index, child ? child.end : 0);
        }, tok.end);
        return result;
    };
    AS3Parser.prototype.setFileName = function (fileNameToParse) {
        this.fileName = fileNameToParse;
    };
    /**
     * Skip the current token, if it equals to the parameter
     *
     * @param text
     * @throws UnExpectedTokenException
     */
    AS3Parser.prototype.skip = function (text) {
        if (this.tokIs(text)) {
            this.nextToken();
        }
    };
    /**
     * Compare the current token to the parameter
     *
     * @param text
     * @return true, if tok's text property equals the parameter
     */
    AS3Parser.prototype.tokIs = function (text) {
        return this.tok.text === text;
    };
    AS3Parser.prototype.tryToParseCommentNode = function (result, modifiers) {
        if (startsWith(this.tok.text, ASDOC_COMMENT)) {
            this.currentAsDoc = new Node(NodeKind.AS_DOC, this.tok.index, -1, this.tok.text);
            this.nextToken();
        }
        else if (startsWith(this.tok.text, MULTIPLE_LINES_COMMENT)) {
            result.children.push(new Node(NodeKind.MULTI_LINE_COMMENT, this.tok.index, -1, this.tok.text));
            this.nextToken();
        }
        else {
            if (modifiers != null) {
                modifiers.push(this.tok);
            }
            this.nextTokenIgnoringDocumentation();
        }
    };
    return AS3Parser;
})();
module.exports = AS3Parser;
