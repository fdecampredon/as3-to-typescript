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
var node = require('./node');

var Node = node.Node;
var StringBuffer = require('./stringBuffer');

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
    AS3Parser.prototype.buildAst = function (filePath, scriptBlockLines) {
        return this.parseLines(filePath, scriptBlockLines);
    };

    /**
    * @return
    */
    AS3Parser.prototype.getScn = function () {
        return this.scn;
    };

    AS3Parser.prototype.nextToken = function (ignoreDocumentation) {
        if (typeof ignoreDocumentation === "undefined") { ignoreDocumentation = false; }
        do {
            if (ignoreDocumentation) {
                this.nextTokenIgnoringDocumentation();
            } else {
                this.nextTokenAllowNewLine();
            }
        } while(this.tok.getText() === NEW_LINE);
    };

    /**
    * tok is first content token
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseClassContent = function () {
        var result = Node.create(NodeKind.CONTENT, this.tok.getLine(), this.tok.getColumn());
        var modifiers = [];
        var meta = [];

        while (!this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
            if (this.tokIs(Operators.LEFT_CURLY_BRACKET)) {
                result.addChild(this.parseBlock());
            }
            if (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
                meta.push(this.parseMetaData());
            } else if (this.tokIs(KeyWords.VAR)) {
                this.parseClassField(result, modifiers, meta);
            } else if (this.tokIs(KeyWords.CONST)) {
                this.parseClassConstant(result, modifiers, meta);
            } else if (this.tokIs(KeyWords.IMPORT)) {
                result.addChild(this.parseImport());
            } else if (this.tokIs(KeyWords.FUNCTION)) {
                this.parseClassFunctions(result, modifiers, meta);
            } else {
                this.tryToParseCommentNode(result, modifiers);
            }
        }
        return result;
    };

    /**
    * tok is empty, since nextToken has not been called before
    *
    * @throws UnExpectedTokenException
    */
    AS3Parser.prototype.parseCompilationUnit = function () {
        var result = Node.create(NodeKind.COMPILATION_UNIT, -1, -1);

        this.nextTokenIgnoringDocumentation();
        if (this.tokIs(KeyWords.PACKAGE)) {
            result.addChild(this.parsePackage());
        }
        result.addChild(this.parsePackageContent());
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
        var result = Node.create(NodeKind.CONTENT, this.tok.getLine(), this.tok.getColumn());
        while (!this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
            if (this.tokIs(KeyWords.IMPORT)) {
                result.addChild(this.parseImport());
            } else if (this.tokIs(KeyWords.FUNCTION)) {
                result.addChild(this.parseFunctionSignature());
            } else if (this.tokIs(KeyWords.INCLUDE) || this.tokIs(KeyWords.INCLUDE_AS2)) {
                result.addChild(this.parseIncludeExpression());
            } else if (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
                while (!this.tokIs(Operators.RIGHT_SQUARE_BRACKET)) {
                    this.nextToken();
                }
                this.nextToken();
            } else {
                this.tryToParseCommentNode(result, null);
            }
        }
        return result;
    };

    /**
    * tok is first token of content
    *
    * @throws UnExpectedTokenException
    */
    AS3Parser.prototype.parsePackageContent = function () {
        var result = Node.create(NodeKind.CONTENT, this.tok.getLine(), this.tok.getColumn());
        var modifiers = [];
        var meta = [];

        while (!this.tokIs(Operators.RIGHT_CURLY_BRACKET) && !this.tokIs(KeyWords.EOF)) {
            if (this.tokIs(KeyWords.IMPORT)) {
                result.addChild(this.parseImport());
            } else if (this.tokIs(KeyWords.USE)) {
                result.addChild(this.parseUse());
            } else if (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
                meta.push(this.parseMetaData());
            } else if (this.tokIs(KeyWords.CLASS)) {
                result.addChild(this.parseClass(meta, modifiers));

                modifiers.length = 0;
                meta.length = 0;
            } else if (this.tokIs(KeyWords.INTERFACE)) {
                result.addChild(this.parseInterface(meta, modifiers));
                modifiers.length = 0;
                meta.length = 0;
            } else if (this.tokIs(KeyWords.FUNCTION)) {
                this.parseClassFunctions(result, modifiers, meta);
            } else if (startsWith(this.tok.getText(), ASDOC_COMMENT)) {
                this.currentAsDoc = Node.create(NodeKind.AS_DOC, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText());
                this.nextToken();
            } else if (startsWith(this.tok.getText(), MULTIPLE_LINES_COMMENT)) {
                this.currentMultiLineComment = Node.create(NodeKind.MULTI_LINE_COMMENT, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText());
                this.nextToken();
            } else {
                modifiers.push(this.tok);
                this.nextTokenIgnoringDocumentation();
            }
        }
        return result;
    };

    /**
    * @return
    * @throws TokenException
    */
    AS3Parser.prototype.parsePrimaryExpression = function () {
        var result = Node.create(NodeKind.PRIMARY, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText());

        if (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
            result.addChild(this.parseArrayLiteral());
        } else if (this.tokIs(Operators.LEFT_CURLY_BRACKET)) {
            result.addChild(this.parseObjectLiteral());
        } else if (this.tokIs(KeyWords.FUNCTION)) {
            result.addChild(this.parseLambdaExpression());
        } else if (this.tokIs(KeyWords.NEW)) {
            result = this.parseNewExpression();
        } else if (this.tokIs(Operators.LEFT_PARENTHESIS)) {
            result.addChild(this.parseEncapsulatedExpression());
        } else {
            this.nextToken(true);
        }
        return result;
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
        } else if (this.tokIs(KeyWords.IF)) {
            result = this.parseIf();
        } else if (this.tokIs(KeyWords.SWITCH)) {
            result = this.parseSwitch();
        } else if (this.tokIs(KeyWords.DO)) {
            result = this.parseDo();
        } else if (this.tokIs(KeyWords.WHILE)) {
            result = this.parseWhile();
        } else if (this.tokIs(KeyWords.TRY)) {
            result = this.parseTry();
        } else if (this.tokIs(KeyWords.CATCH)) {
            result = this.parseCatch();
        } else if (this.tokIs(KeyWords.FINALLY)) {
            result = this.parseFinally();
        } else if (this.tokIs(Operators.LEFT_CURLY_BRACKET)) {
            result = this.parseBlock();
        } else if (this.tokIs(KeyWords.VAR)) {
            result = this.parseVar();
        } else if (this.tokIs(KeyWords.CONST)) {
            result = this.parseConst();
        } else if (this.tokIs(KeyWords.RETURN)) {
            result = this.parseReturnStatement();
        } else if (this.tokIs(Operators.SEMI_COLUMN)) {
            result = this.parseEmptyStatement();
        } else {
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
        var result;
        if (this.tokIs(Operators.INCREMENT)) {
            this.nextToken();
            result = Node.create(NodeKind.PRE_INC, this.tok.getLine(), this.tok.getColumn(), this.parseUnaryExpression());
        } else if (this.tokIs(Operators.DECREMENT)) {
            this.nextToken();
            result = Node.create(NodeKind.PRE_DEC, this.tok.getLine(), this.tok.getColumn(), this.parseUnaryExpression());
        } else if (this.tokIs(Operators.MINUS)) {
            this.nextToken();
            result = Node.create(NodeKind.MINUS, this.tok.getLine(), this.tok.getColumn(), this.parseUnaryExpression());
        } else if (this.tokIs(Operators.PLUS) || this.tokIs(Operators.PLUS_AS2)) {
            this.nextToken();
            result = Node.create(NodeKind.PLUS, this.tok.getLine(), this.tok.getColumn(), this.parseUnaryExpression());
        } else {
            result = this.parseUnaryExpressionNotPlusMinus();
        }
        return result;
    };

    AS3Parser.prototype.collectVarListContent = function (result) {
        result.addChild(this.parseNameTypeInit());
        while (this.tokIs(Operators.COMMA)) {
            this.nextToken(true);
            result.addChild(this.parseNameTypeInit());
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
        while (startsWith(this.tok.getText(), "//")) {
            this.nextToken();
        }

        if (!this.tokIs(text)) {
            throw new Error('unexpected token : ' + this.tok.getText() + '(' + this.tok.getLine() + ',' + this.tok.getColumn() + ')' + ' in file ' + this.fileName + 'expected: ' + text);
        }
        this.nextToken();
    };

    AS3Parser.prototype.convertMeta = function (metadataList) {
        if (metadataList == null || metadataList.length === 0) {
            return null;
        }

        var result = Node.create(NodeKind.META_LIST, this.tok.getLine(), this.tok.getColumn());

        metadataList.forEach(function (metadataNode) {
            result.addChild(metadataNode);
        });
        return result;
    };

    AS3Parser.prototype.convertModifiers = function (modifierList) {
        var _this = this;
        if (modifierList == null) {
            return null;
        }

        var result = Node.create(NodeKind.MOD_LIST, this.tok.getLine(), this.tok.getColumn());

        modifierList.forEach(function (modifierToken) {
            result.addChild(Node.create(NodeKind.MODIFIER, _this.tok.getLine(), _this.tok.getColumn(), null, modifierToken.getText()));
        });
        return result;
    };

    AS3Parser.prototype.doParseSignature = function () {
        this.consume(KeyWords.FUNCTION);

        var type = Node.create(NodeKind.TYPE, this.tok.getLine(), this.tok.getColumn(), null, KeyWords.FUNCTION.toString());
        if (this.tokIs(KeyWords.SET) || this.tokIs(KeyWords.GET)) {
            type = Node.create(NodeKind.TYPE, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText());
            this.nextToken(); // set or get
        }
        var name = Node.create(NodeKind.NAME, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText());
        this.nextToken(); // name
        var params = this.parseParameterList();
        var returnType = this.parseOptionalType();
        return [type, name, params, returnType];
    };

    AS3Parser.prototype.findFunctionTypeFromSignature = function (signature) {
        for (var i = 0; i < signature.length; i++) {
            var node = signature[i];
            if (node.is(NodeKind.TYPE)) {
                if (node.getStringValue() === "set") {
                    return NodeKind.SET;
                }
                if (node.getStringValue() === "get") {
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
            if (this.tok.getText() == null) {
                throw new Error(this.fileName);
            }
        } while(startsWith(this.tok.getText(), SINGLE_LINE_COMMENT));
    };

    AS3Parser.prototype.nextTokenIgnoringDocumentation = function () {
        do {
            this.nextToken();
        } while(startsWith(this.tok.getText(), MULTIPLE_LINES_COMMENT));
    };

    AS3Parser.prototype.parseAdditiveExpression = function () {
        var result = Node.create(NodeKind.ADD, this.tok.getLine(), this.tok.getColumn(), this.parseMultiplicativeExpression());
        while (this.tokIs(Operators.PLUS) || this.tokIs(Operators.PLUS_AS2) || this.tokIs(Operators.MINUS)) {
            result.addChild(Node.create(NodeKind.OP, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseMultiplicativeExpression());
        }
        return result.numChildren() > 1 ? result : result.getChild(0);
    };

    // ------------------------------------------------------------------------
    // language specific recursive descent parsing
    // ------------------------------------------------------------------------
    AS3Parser.prototype.parseAndExpression = function () {
        var result = Node.create(NodeKind.AND, this.tok.getLine(), this.tok.getColumn(), this.parseBitwiseOrExpression());
        while (this.tokIs(Operators.AND) || this.tokIs(Operators.AND_AS2)) {
            result.addChild(Node.create(NodeKind.OP, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseBitwiseOrExpression());
        }
        return result.numChildren() > 1 ? result : result.getChild(0);
    };

    /**
    * tok is ( exit tok is first token after )
    */
    AS3Parser.prototype.parseArgumentList = function () {
        this.consume(Operators.LEFT_PARENTHESIS);
        var result = Node.create(NodeKind.ARGUMENTS, this.tok.getLine(), this.tok.getColumn());
        while (!this.tokIs(Operators.RIGHT_PARENTHESIS)) {
            result.addChild(this.parseExpression());
            this.skip(Operators.COMMA);
        }
        this.consume(Operators.RIGHT_PARENTHESIS);
        return result;
    };

    AS3Parser.prototype.parseArrayAccessor = function (node) {
        var result = Node.create(NodeKind.ARRAY_ACCESSOR, this.tok.getLine(), this.tok.getColumn());
        result.addChild(node);
        while (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
            this.nextToken(true);
            result.addChild(this.parseExpression());
            this.consume(Operators.RIGHT_SQUARE_BRACKET);
        }
        return result;
    };

    /**
    * tok is [
    */
    AS3Parser.prototype.parseArrayLiteral = function () {
        var result = Node.create(NodeKind.ARRAY, this.tok.getLine(), this.tok.getColumn());
        this.consume(Operators.LEFT_SQUARE_BRACKET);
        while (!this.tokIs(Operators.RIGHT_SQUARE_BRACKET)) {
            result.addChild(this.parseExpression());
            this.skip(Operators.COMMA);
        }
        this.consume(Operators.RIGHT_SQUARE_BRACKET);
        return result;
    };

    AS3Parser.prototype.parseAssignmentExpression = function () {
        var result = Node.create(NodeKind.ASSIGN, this.tok.getLine(), this.tok.getColumn(), this.parseConditionalExpression());
        while (this.tokIs(Operators.EQUAL) || this.tokIs(Operators.PLUS_EQUAL) || this.tokIs(Operators.MINUS_EQUAL) || this.tokIs(Operators.TIMES_EQUAL) || this.tokIs(Operators.DIVIDED_EQUAL) || this.tokIs(Operators.MODULO_EQUAL) || this.tokIs(Operators.AND_EQUAL) || this.tokIs(Operators.OR_EQUAL) || this.tokIs(Operators.XOR_EQUAL)) {
            result.addChild(Node.create(NodeKind.OP, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseExpression());
        }
        return result.numChildren() > 1 ? result : result.getChild(0);
    };

    AS3Parser.prototype.parseBitwiseAndExpression = function () {
        var result = Node.create(NodeKind.B_AND, this.tok.getLine(), this.tok.getColumn(), this.parseEqualityExpression());
        while (this.tokIs(Operators.B_AND)) {
            result.addChild(Node.create(NodeKind.OP, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseEqualityExpression());
        }
        return result.numChildren() > 1 ? result : result.getChild(0);
    };

    AS3Parser.prototype.parseBitwiseOrExpression = function () {
        var result = Node.create(NodeKind.B_OR, this.tok.getLine(), this.tok.getColumn(), this.parseBitwiseXorExpression());
        while (this.tokIs(Operators.B_OR)) {
            result.addChild(Node.create(NodeKind.OP, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseBitwiseXorExpression());
        }
        return result.numChildren() > 1 ? result : result.getChild(0);
    };

    AS3Parser.prototype.parseBitwiseXorExpression = function () {
        var result = Node.create(NodeKind.B_XOR, this.tok.getLine(), this.tok.getColumn(), this.parseBitwiseAndExpression());
        while (this.tokIs(Operators.B_XOR)) {
            result.addChild(Node.create(NodeKind.OP, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseBitwiseAndExpression());
        }
        return result.numChildren() > 1 ? result : result.getChild(0);
    };

    AS3Parser.prototype.parseBlock = function (result) {
        if (!result) {
            result = Node.create(NodeKind.BLOCK, this.tok.getLine(), this.tok.getColumn());
        }
        this.consume(Operators.LEFT_CURLY_BRACKET);

        while (!this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
            if (startsWith(this.tok.getText(), MULTIPLE_LINES_COMMENT)) {
                this.currentFunctionNode.addChild(Node.create(NodeKind.MULTI_LINE_COMMENT, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
                this.nextToken();
            } else {
                result.addChild(this.parseStatement());
            }
        }
        this.consume(Operators.RIGHT_CURLY_BRACKET);
        return result;
    };

    /**
    * tok is catch
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseCatch = function () {
        this.consume(KeyWords.CATCH);
        this.consume(Operators.LEFT_PARENTHESIS);
        var result = Node.create(NodeKind.CATCH, this.tok.getLine(), this.tok.getColumn(), Node.create(NodeKind.NAME, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
        this.nextToken(true); // name
        if (this.tokIs(Operators.COLUMN)) {
            this.nextToken(true); // :
            result.addChild(Node.create(NodeKind.TYPE, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
            this.nextToken(true); // type
        }
        this.consume(Operators.RIGHT_PARENTHESIS);
        result.addChild(this.parseBlock());
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
        this.consume(KeyWords.CLASS);

        var result = Node.create(NodeKind.CLASS, this.tok.getLine(), this.tok.getColumn());

        if (this.currentAsDoc != null) {
            result.addChild(this.currentAsDoc);
            this.currentAsDoc = null;
        }
        if (this.currentMultiLineComment != null) {
            result.addChild(this.currentMultiLineComment);
            this.currentMultiLineComment = null;
        }

        result.addChild(Node.create(NodeKind.NAME, this.tok.getLine(), this.tok.getColumn(), null, this.parseQualifiedName(true)));

        result.addChild(this.convertMeta(meta));
        result.addChild(this.convertModifiers(modifier));

        do {
            if (this.tokIs(KeyWords.EXTENDS)) {
                this.nextToken(true); // extends
                result.addChild(Node.create(NodeKind.EXTENDS, this.tok.getLine(), this.tok.getColumn(), null, this.parseQualifiedName(false)));
            } else if (this.tokIs(KeyWords.IMPLEMENTS)) {
                result.addChild(this.parseImplementsList());
            }
        } while(!this.tokIs(Operators.LEFT_CURLY_BRACKET));
        this.consume(Operators.LEFT_CURLY_BRACKET);
        result.addChild(this.parseClassContent());
        this.consume(Operators.RIGHT_CURLY_BRACKET);
        return result;
    };

    AS3Parser.prototype.parseClassConstant = function (result, modifiers, meta) {
        result.addChild(this.parseConstList(meta, modifiers));
        if (this.tokIs(Operators.SEMI_COLUMN)) {
            this.nextToken();
        }
        meta.length = 0;
        modifiers.length = 0;
    };

    AS3Parser.prototype.parseClassField = function (result, modifiers, meta) {
        var varList = this.parseVarList(meta, modifiers);
        result.addChild(varList);
        if (this.currentAsDoc != null) {
            varList.addChild(this.currentAsDoc);
            this.currentAsDoc = null;
        }
        if (this.currentMultiLineComment != null) {
            result.addChild(this.currentMultiLineComment);
            this.currentMultiLineComment = null;
        }
        if (this.tokIs(Operators.SEMI_COLUMN)) {
            this.nextToken();
        }
        meta.length = 0;
        modifiers.length = 0;
    };

    AS3Parser.prototype.parseClassFunctions = function (result, modifiers, meta) {
        result.addChild(this.parseFunction(meta, modifiers));
        meta.length = 0;
        modifiers.length = 0;
    };

    /**
    * tok is (
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseCondition = function () {
        this.consume(Operators.LEFT_PARENTHESIS);
        var result = Node.create(NodeKind.CONDITION, this.tok.getLine(), this.tok.getColumn(), this.parseExpression());
        this.consume(Operators.RIGHT_PARENTHESIS);
        return result;
    };

    AS3Parser.prototype.parseConditionalExpression = function () {
        var result = this.parseOrExpression();
        if (this.tokIs(Operators.QUESTION_MARK)) {
            var conditional = Node.create(NodeKind.CONDITIONAL, this.tok.getLine(), this.tok.getColumn(), result);
            this.nextToken(true); // ?
            conditional.addChild(this.parseExpression());
            this.nextToken(true); // :
            conditional.addChild(this.parseExpression());

            return conditional;
        }
        return result;
    };

    AS3Parser.prototype.parseConst = function () {
        var result;
        result = this.parseConstList(null, null);
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
        this.consume(KeyWords.CONST);
        var result = Node.create(NodeKind.CONST_LIST, this.tok.getLine(), this.tok.getColumn());
        result.addChild(this.convertMeta(meta));
        result.addChild(this.convertModifiers(modifiers));
        this.collectVarListContent(result);
        return result;
    };

    AS3Parser.prototype.parseDecrement = function (node) {
        this.nextToken(true);
        var result = Node.create(NodeKind.POST_DEC, this.tok.getLine(), this.tok.getColumn());
        result.addChild(node);
        return result;
    };

    /**
    * tok is do
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseDo = function () {
        this.consume(KeyWords.DO);
        var result = Node.create(NodeKind.DO, this.tok.getLine(), this.tok.getColumn(), this.parseStatement());
        this.consume(KeyWords.WHILE);
        result.addChild(this.parseCondition());
        if (this.tokIs(Operators.SEMI_COLUMN)) {
            this.nextToken(true);
        }
        return result;
    };

    AS3Parser.prototype.parseDot = function (node) {
        this.nextToken();
        if (this.tokIs(Operators.LEFT_PARENTHESIS)) {
            this.nextToken();
            var result = Node.create(NodeKind.E4X_FILTER, this.tok.getLine(), this.tok.getColumn());
            result.addChild(node);
            result.addChild(this.parseExpression());
            this.consume(Operators.RIGHT_PARENTHESIS);
            return result;
        } else if (this.tokIs(Operators.TIMES)) {
            var result = Node.create(NodeKind.E4X_STAR, this.tok.getLine(), this.tok.getColumn());
            result.addChild(node);
            return result;
        }
        var result = Node.create(NodeKind.DOT, this.tok.getLine(), this.tok.getColumn());
        result.addChild(node);
        result.addChild(this.parseExpression());
        return result;
    };

    AS3Parser.prototype.parseEmptyStatement = function () {
        var result;
        result = Node.create(NodeKind.STMT_EMPTY, this.tok.getLine(), this.tok.getColumn(), null, Operators.SEMI_COLUMN.toString());
        this.nextToken(true);
        return result;
    };

    AS3Parser.prototype.parseEncapsulatedExpression = function () {
        this.consume(Operators.LEFT_PARENTHESIS);
        var result = Node.create(NodeKind.ENCAPSULATED, this.tok.getLine(), this.tok.getColumn());
        result.addChild(this.parseExpressionList());

        this.consume(Operators.RIGHT_PARENTHESIS);

        return result;
    };

    AS3Parser.prototype.parseEqualityExpression = function () {
        var result = Node.create(NodeKind.EQUALITY, this.tok.getLine(), this.tok.getColumn(), this.parseRelationalExpression());
        while (this.tokIs(Operators.DOUBLE_EQUAL) || this.tokIs(Operators.DOUBLE_EQUAL_AS2) || this.tokIs(Operators.STRICTLY_EQUAL) || this.tokIs(Operators.NON_EQUAL) || this.tokIs(Operators.NON_EQUAL_AS2_1) || this.tokIs(Operators.NON_EQUAL_AS2_2) || this.tokIs(Operators.NON_STRICTLY_EQUAL)) {
            result.addChild(Node.create(NodeKind.OP, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseRelationalExpression());
        }
        return result.numChildren() > 1 ? result : result.getChild(0);
    };

    AS3Parser.prototype.parseExpressionList = function () {
        var result = Node.create(NodeKind.EXPR_LIST, this.tok.getLine(), this.tok.getColumn(), this.parseAssignmentExpression());
        while (this.tokIs(Operators.COMMA)) {
            this.nextToken(true);
            result.addChild(this.parseAssignmentExpression());
        }
        return result.numChildren() > 1 ? result : result.getChild(0);
    };

    AS3Parser.prototype.parseFinally = function () {
        var result;
        this.nextToken(true);
        result = Node.create(NodeKind.FINALLY, this.tok.getLine(), this.tok.getColumn(), this.parseBlock());
        return result;
    };

    /**
    * tok is for
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseFor = function () {
        this.consume(KeyWords.FOR);

        if (this.tokIs(KeyWords.EACH)) {
            this.nextToken();
            return this.parseForEach();
        } else {
            return this.parseTraditionalFor();
        }
    };

    /**
    * tok is ( for each( var obj : Type in List )
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseForEach = function () {
        this.consume(Operators.LEFT_PARENTHESIS);

        var result = Node.create(NodeKind.FOREACH, this.tok.getLine(), this.tok.getColumn());
        if (this.tokIs(KeyWords.VAR)) {
            var node = Node.create(NodeKind.VAR, this.tok.getLine(), this.tok.getColumn());
            this.nextToken();
            node.addChild(this.parseNameTypeInit());
            result.addChild(node);
        } else {
            result.addChild(Node.create(NodeKind.NAME, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));

            // names allowed?
            this.nextToken();
        }
        this.nextToken(); // in
        result.addChild(Node.create(NodeKind.IN, this.tok.getLine(), this.tok.getColumn(), this.parseExpression()));
        this.consume(Operators.RIGHT_PARENTHESIS);
        result.addChild(this.parseStatement());
        return result;
    };

    AS3Parser.prototype.parseForIn = function (result) {
        this.nextToken();
        result.addChild(Node.create(NodeKind.IN, this.tok.getLine(), this.tok.getColumn(), this.parseExpression()));
        result.setId(NodeKind.FORIN);
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
        var result = Node.create(this.findFunctionTypeFromSignature(signature), this.tok.getLine(), this.tok.getColumn(), null, signature[0].getStringValue());

        if (this.currentAsDoc != null) {
            result.addChild(this.currentAsDoc);
            this.currentAsDoc = null;
        }
        if (this.currentMultiLineComment != null) {
            result.addChild(this.currentMultiLineComment);
            this.currentMultiLineComment = null;
        }
        result.addChild(this.convertMeta(meta));
        result.addChild(this.convertModifiers(modifiers));
        result.addChild(signature[1]);
        result.addChild(signature[2]);
        result.addChild(signature[3]);
        if (this.tokIs(Operators.SEMI_COLUMN)) {
            this.consume(Operators.SEMI_COLUMN);
        } else {
            result.addChild(this.parseFunctionBlock());
        }
        this.currentFunctionNode = null;
        return result;
    };

    /**
    * tok is { exit tok is the first tok after }
    *
    * @throws TokenException
    * @throws TokenException
    */
    AS3Parser.prototype.parseFunctionBlock = function () {
        var block = Node.create(NodeKind.BLOCK, this.tok.getLine(), this.tok.getColumn());

        this.currentFunctionNode = block;

        this.parseBlock(block);

        return block;
    };

    AS3Parser.prototype.parseFunctionCall = function (node) {
        var result = Node.create(NodeKind.CALL, this.tok.getLine(), this.tok.getColumn());
        result.addChild(node);
        while (this.tokIs(Operators.LEFT_PARENTHESIS)) {
            result.addChild(this.parseArgumentList());
        }
        while (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
            result.addChild(this.parseArrayLiteral());
        }

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
        var result = Node.create(this.findFunctionTypeFromSignature(signature), this.tok.getLine(), this.tok.getColumn(), null, signature[0].getStringValue());
        result.addChild(signature[1]);
        result.addChild(signature[2]);
        result.addChild(signature[3]);
        return result;
    };

    /**
    * tok is if
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseIf = function () {
        this.consume(KeyWords.IF);
        var result = Node.create(NodeKind.IF, this.tok.getLine(), this.tok.getColumn(), this.parseCondition());
        result.addChild(this.parseStatement());
        if (this.tokIs(KeyWords.ELSE)) {
            this.nextToken(true);
            result.addChild(this.parseStatement());
        }
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

        var result = Node.create(NodeKind.IMPLEMENTS_LIST, this.tok.getLine(), this.tok.getColumn());
        result.addChild(Node.create(NodeKind.IMPLEMENTS, this.tok.getLine(), this.tok.getColumn(), null, this.parseQualifiedName(true)));
        while (this.tokIs(Operators.COMMA)) {
            this.nextToken(true);
            result.addChild(Node.create(NodeKind.IMPLEMENTS, this.tok.getLine(), this.tok.getColumn(), null, this.parseQualifiedName(false)));
        }
        return result;
    };

    /**
    * tok is import
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseImport = function () {
        this.consume(KeyWords.IMPORT);
        var result = Node.create(NodeKind.IMPORT, this.tok.getLine(), this.tok.getColumn(), null, this.parseImportName());
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
        var result = new StringBuffer();

        result.append(this.tok.getText());
        this.nextToken();
        while (this.tokIs(Operators.DOT)) {
            result.append(Operators.DOT);
            this.nextToken(); // .
            result.append(this.tok.getText());
            this.nextToken(); // part of name
        }
        return result.toString();
    };

    AS3Parser.prototype.parseIncludeExpression = function () {
        var result = Node.create(NodeKind.INCLUDE, this.tok.getLine(), this.tok.getColumn());
        if (this.tokIs(KeyWords.INCLUDE)) {
            this.consume(KeyWords.INCLUDE);
        } else if (this.tokIs(KeyWords.INCLUDE_AS2)) {
            this.consume(KeyWords.INCLUDE_AS2);
        }
        result.addChild(this.parseExpression());
        return result;
    };

    AS3Parser.prototype.parseIncrement = function (node) {
        this.nextToken(true);
        var result = Node.create(NodeKind.POST_INC, this.tok.getLine(), this.tok.getColumn());
        result.addChild(node);
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
        this.consume(KeyWords.INTERFACE);
        var result = Node.create(NodeKind.INTERFACE, this.tok.getLine(), this.tok.getColumn());

        if (this.currentAsDoc != null) {
            result.addChild(this.currentAsDoc);
            this.currentAsDoc = null;
        }
        if (this.currentMultiLineComment != null) {
            result.addChild(this.currentMultiLineComment);
            this.currentMultiLineComment = null;
        }
        result.addChild(Node.create(NodeKind.NAME, this.tok.getLine(), this.tok.getColumn(), null, this.parseQualifiedName(true)));

        result.addChild(this.convertMeta(meta));
        result.addChild(this.convertModifiers(modifier));

        if (this.tokIs(KeyWords.EXTENDS)) {
            this.nextToken(); // extends
            result.addChild(Node.create(NodeKind.EXTENDS, this.tok.getLine(), this.tok.getColumn(), null, this.parseQualifiedName(false)));
        }
        while (this.tokIs(Operators.COMMA)) {
            this.nextToken(); // comma
            result.addChild(Node.create(NodeKind.EXTENDS, this.tok.getLine(), this.tok.getColumn(), null, this.parseQualifiedName(false)));
        }
        this.consume(Operators.LEFT_CURLY_BRACKET);
        result.addChild(this.parseInterfaceContent());
        this.consume(Operators.RIGHT_CURLY_BRACKET);
        return result;
    };

    /**
    * tok is function
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseLambdaExpression = function () {
        this.consume(KeyWords.FUNCTION);
        var result;

        //if (this.tok.getText().compareTo("(") == 0) {
        if (this.tok.getText() == "(") {
            result = Node.create(NodeKind.LAMBDA, this.tok.getLine(), this.tok.getColumn());
        } else {
            result = Node.create(NodeKind.FUNCTION, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText());
            this.nextToken(true);
        }
        result.addChild(this.parseParameterList());
        result.addChild(this.parseOptionalType());
        result.addChild(this.parseBlock());
        return result;
    };

    AS3Parser.prototype.parseLines = function (filePath, lines) {
        this.setFileName(filePath);
        this.scn = new AS3Scanner();
        this.scn.setLines(lines);
        return this.parseCompilationUnit();
    };

    /**
    * tok is [ [id] [id ("test")] [id (name="test",type="a.b.c.Event")] exit
    * token is the first token after ]
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseMetaData = function () {
        var buffer = new StringBuffer();

        var line = this.tok.getLine();
        var column = this.tok.getColumn();

        this.consume(Operators.LEFT_SQUARE_BRACKET);
        while (!this.tokIs(Operators.RIGHT_SQUARE_BRACKET)) {
            if (buffer.toString().length > 0) {
                buffer.append(' ');
            }
            buffer.append(this.tok.getText());
            this.nextToken();
        }
        this.skip(Operators.RIGHT_SQUARE_BRACKET);
        var metaDataNode = Node.create(NodeKind.META, line, column, null, buffer.toString());

        return metaDataNode;
    };

    AS3Parser.prototype.parseMultiplicativeExpression = function () {
        var result = Node.create(NodeKind.MULTIPLICATION, this.tok.getLine(), this.tok.getColumn(), this.parseUnaryExpression());
        while (this.tokIs(Operators.TIMES) || this.tokIs(Operators.SLASH) || this.tokIs(Operators.MODULO)) {
            result.addChild(Node.create(NodeKind.OP, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseUnaryExpression());
        }
        return result.numChildren() > 1 ? result : result.getChild(0);
    };

    AS3Parser.prototype.parseNamespaceName = function () {
        var name = this.tok.getText();
        this.nextToken(); // simple name for now
        return name;
    };

    AS3Parser.prototype.parseNameTypeInit = function () {
        var result = Node.create(NodeKind.NAME_TYPE_INIT, this.tok.getLine(), this.tok.getColumn());
        result.addChild(Node.create(NodeKind.NAME, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
        this.nextToken(true); // name
        result.addChild(this.parseOptionalType());
        result.addChild(this.parseOptionalInit());
        return result;
    };

    AS3Parser.prototype.parseNewExpression = function () {
        this.consume(KeyWords.NEW);

        var result = Node.create(NodeKind.NEW, this.tok.getLine(), this.tok.getColumn());
        result.addChild(this.parseExpression()); // name
        if (this.tokIs(Operators.VECTOR_START)) {
            result.addChild(Node.create(NodeKind.VECTOR, this.tok.getLine(), this.tok.getColumn(), this.parseVector()));
        }
        if (this.tokIs(Operators.LEFT_PARENTHESIS)) {
            result.addChild(this.parseArgumentList());
        }
        return result;
    };

    /**
    * tok is {
    */
    AS3Parser.prototype.parseObjectLiteral = function () {
        var result = Node.create(NodeKind.OBJECT, this.tok.getLine(), this.tok.getColumn());
        this.consume(Operators.LEFT_CURLY_BRACKET);
        while (!this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
            result.addChild(this.parseObjectLiteralPropertyDeclaration());
            this.skip(Operators.COMMA);
        }
        this.consume(Operators.RIGHT_CURLY_BRACKET);
        return result;
    };

    /*
    * tok is name
    */
    AS3Parser.prototype.parseObjectLiteralPropertyDeclaration = function () {
        var result = Node.create(NodeKind.PROP, this.tok.getLine(), this.tok.getColumn());
        var name = Node.create(NodeKind.NAME, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText());
        result.addChild(name);
        this.nextToken(); // name
        this.consume(Operators.COLUMN);
        result.addChild(Node.create(NodeKind.VALUE, this.tok.getLine(), this.tok.getColumn(), this.parseExpression()));
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
            result = Node.create(NodeKind.INIT, this.tok.getLine(), this.tok.getColumn(), this.parseExpression());
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
        var result = Node.create(NodeKind.TYPE, this.tok.getLine(), this.tok.getColumn(), null, "");
        if (this.tokIs(Operators.COLUMN)) {
            this.nextToken(true);
            result = this.parseType();
        }
        return result;
    };

    AS3Parser.prototype.parseOrExpression = function () {
        var result = Node.create(NodeKind.OR, this.tok.getLine(), this.tok.getColumn(), this.parseAndExpression());
        while (this.tokIs(Operators.LOGICAL_OR) || this.tokIs(Operators.LOGICAL_OR_AS2)) {
            result.addChild(Node.create(NodeKind.OP, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseAndExpression());
        }
        return result.numChildren() > 1 ? result : result.getChild(0);
    };

    /**
    * tok is package
    *
    * @throws UnExpectedTokenException
    */
    AS3Parser.prototype.parsePackage = function () {
        this.consume(KeyWords.PACKAGE);

        var result = Node.create(NodeKind.PACKAGE, this.tok.getLine(), this.tok.getColumn());
        var nameBuffer = new StringBuffer();

        while (!this.tokIs(Operators.LEFT_CURLY_BRACKET)) {
            nameBuffer.append(this.tok.getText());
            this.nextToken();
        }
        result.addChild(Node.create(NodeKind.NAME, this.tok.getLine(), this.tok.getColumn(), null, nameBuffer.toString()));
        this.consume(Operators.LEFT_CURLY_BRACKET);
        result.addChild(this.parsePackageContent());
        this.consume(Operators.RIGHT_CURLY_BRACKET);
        return result;
    };

    /**
    * tok is the name of a parameter or ...
    */
    AS3Parser.prototype.parseParameter = function () {
        var result = Node.create(NodeKind.PARAMETER, this.tok.getLine(), this.tok.getColumn());
        if (this.tokIs(Operators.REST_PARAMETERS)) {
            this.nextToken(true); // ...
            var rest = Node.create(NodeKind.REST, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText());
            this.nextToken(true); // rest
            result.addChild(rest);
        } else {
            result.addChild(this.parseNameTypeInit());
        }
        return result;
    };

    /**
    * tok is (
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseParameterList = function () {
        this.consume(Operators.LEFT_PARENTHESIS);

        var result = Node.create(NodeKind.PARAMETER_LIST, this.tok.getLine(), this.tok.getColumn());
        while (!this.tokIs(Operators.RIGHT_PARENTHESIS)) {
            result.addChild(this.parseParameter());
            if (this.tokIs(Operators.COMMA)) {
                this.nextToken(true);
            } else {
                break;
            }
        }
        this.consume(Operators.RIGHT_PARENTHESIS);
        return result;
    };

    /**
    * tok is first part of the name exit tok is the first token after the name
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseQualifiedName = function (skipPackage) {
        var buffer = new StringBuffer();

        buffer.append(this.tok.getText());
        this.nextToken();
        while (this.tokIs(Operators.DOT) || this.tokIs(Operators.DOUBLE_COLUMN)) {
            buffer.append(this.tok.getText());
            this.nextToken();
            buffer.append(this.tok.getText());
            this.nextToken(); // name
        }

        if (skipPackage) {
            return buffer.toString().substring(buffer.toString().lastIndexOf(Operators.DOT.toString()) + 1);
        }
        return buffer.toString();
    };

    AS3Parser.prototype.parseRelationalExpression = function () {
        var result = Node.create(NodeKind.RELATION, this.tok.getLine(), this.tok.getColumn(), this.parseShiftExpression());
        while (this.tokIs(Operators.INFERIOR) || this.tokIs(Operators.INFERIOR_AS2) || this.tokIs(Operators.INFERIOR_OR_EQUAL) || this.tokIs(Operators.INFERIOR_OR_EQUAL_AS2) || this.tokIs(Operators.SUPERIOR) || this.tokIs(Operators.SUPERIOR_AS2) || this.tokIs(Operators.SUPERIOR_OR_EQUAL) || this.tokIs(Operators.SUPERIOR_OR_EQUAL_AS2) || this.tokIs(KeyWords.IS) || this.tokIs(KeyWords.IN) && !this.isInFor || this.tokIs(KeyWords.AS) || this.tokIs(KeyWords.INSTANCE_OF)) {
            if (!this.tokIs(KeyWords.AS)) {
                result.addChild(Node.create(NodeKind.OP, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
            } else {
                result.addChild(Node.create(NodeKind.AS, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
            }
            this.nextToken(true);
            result.addChild(this.parseShiftExpression());
        }
        return result.numChildren() > 1 ? result : result.getChild(0);
    };

    AS3Parser.prototype.parseReturnStatement = function () {
        var result;

        this.nextTokenAllowNewLine();
        if (this.tokIs(NEW_LINE) || this.tokIs(Operators.SEMI_COLUMN)) {
            this.nextToken(true);
            result = Node.create(NodeKind.RETURN, this.tok.getLine(), this.tok.getColumn(), null, "");
        } else {
            result = Node.create(NodeKind.RETURN, this.tok.getLine(), this.tok.getColumn(), this.parseExpression());
            this.skip(Operators.SEMI_COLUMN);
        }
        return result;
    };

    AS3Parser.prototype.parseShiftExpression = function () {
        var result = Node.create(NodeKind.SHIFT, this.tok.getLine(), this.tok.getColumn(), this.parseAdditiveExpression());
        while (this.tokIs(Operators.DOUBLE_SHIFT_LEFT) || this.tokIs(Operators.TRIPLE_SHIFT_LEFT) || this.tokIs(Operators.DOUBLE_SHIFT_RIGHT) || this.tokIs(Operators.TRIPLE_SHIFT_RIGHT)) {
            result.addChild(Node.create(NodeKind.OP, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseAdditiveExpression());
        }
        return result.numChildren() > 1 ? result : result.getChild(0);
    };

    /**
    * tok is switch
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseSwitch = function () {
        this.consume(KeyWords.SWITCH);
        var result = Node.create(NodeKind.SWITCH, this.tok.getLine(), this.tok.getColumn(), this.parseCondition());
        if (this.tokIs(Operators.LEFT_CURLY_BRACKET)) {
            this.nextToken();
            result.addChild(this.parseSwitchCases());
            this.consume(Operators.RIGHT_CURLY_BRACKET);
        }
        return result;
    };

    /**
    * tok is case, default or the first token of the first statement
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseSwitchBlock = function () {
        var result = Node.create(NodeKind.SWITCH_BLOCK, this.tok.getLine(), this.tok.getColumn());
        while (!this.tokIs(KeyWords.CASE) && !this.tokIs(KeyWords.DEFAULT) && !this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
            result.addChild(this.parseStatement());
        }
        return result;
    };

    /**
    * tok is { exit tok is }
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseSwitchCases = function () {
        var result = Node.create(NodeKind.CASES, this.tok.getLine(), this.tok.getColumn());
        for (; ;) {
            if (this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
                break;
            } else if (this.tokIs(KeyWords.CASE)) {
                this.nextToken(true); // case
                var caseNode = Node.create(NodeKind.CASE, this.tok.getLine(), this.tok.getColumn(), this.parseExpression());
                this.consume(Operators.COLUMN);
                caseNode.addChild(this.parseSwitchBlock());
                result.addChild(caseNode);
            } else if (this.tokIs(KeyWords.DEFAULT)) {
                this.nextToken(true); // default
                this.consume(Operators.COLUMN);
                var caseNode = Node.create(NodeKind.CASE, this.tok.getLine(), this.tok.getColumn(), Node.create(NodeKind.DEFAULT, this.tok.getLine(), this.tok.getColumn(), null, KeyWords.DEFAULT.toString()));
                caseNode.addChild(this.parseSwitchBlock());
                result.addChild(caseNode);
            }
        }
        return result;
    };

    /**
    * tok is ( for( var x : number = 0; i < length; i++ ) for( var s : string in
    * Object )
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseTraditionalFor = function () {
        this.consume(Operators.LEFT_PARENTHESIS);

        var result = Node.create(NodeKind.FOR, this.tok.getLine(), this.tok.getColumn());
        if (!this.tokIs(Operators.SEMI_COLUMN)) {
            if (this.tokIs(KeyWords.VAR)) {
                result.addChild(Node.create(NodeKind.INIT, this.tok.getLine(), this.tok.getColumn(), this.parseVarList(null, null)));
            } else {
                this.isInFor = true;
                result.addChild(Node.create(NodeKind.INIT, this.tok.getLine(), this.tok.getColumn(), this.parseExpression()));
                this.isInFor = false;
            }
            if (this.tokIs(NodeKind.IN.toString())) {
                return this.parseForIn(result);
            }
        }
        this.consume(Operators.SEMI_COLUMN);
        if (!this.tokIs(Operators.SEMI_COLUMN)) {
            result.addChild(Node.create(NodeKind.COND, this.tok.getLine(), this.tok.getColumn(), this.parseExpression()));
        }
        this.consume(Operators.SEMI_COLUMN);
        if (!this.tokIs(Operators.RIGHT_PARENTHESIS)) {
            result.addChild(Node.create(NodeKind.ITER, this.tok.getLine(), this.tok.getColumn(), this.parseExpressionList()));
        }
        this.consume(Operators.RIGHT_PARENTHESIS);
        result.addChild(this.parseStatement());
        return result;
    };

    AS3Parser.prototype.parseTry = function () {
        var result;
        this.nextToken(true);
        result = Node.create(NodeKind.TRY, this.tok.getLine(), this.tok.getColumn(), this.parseBlock());
        return result;
    };

    AS3Parser.prototype.parseType = function () {
        var result;
        if (this.tok.getText() === VECTOR) {
            result = this.parseVector();
        } else {
            result = Node.create(NodeKind.TYPE, this.tok.getLine(), this.tok.getColumn(), null, this.parseQualifiedName(true));
            // this.nextToken( true );
        }
        return result;
    };

    AS3Parser.prototype.parseUnaryExpressionNotPlusMinus = function () {
        var result;
        if (this.tokIs(KeyWords.DELETE)) {
            this.nextToken(true);
            result = Node.create(NodeKind.DELETE, this.tok.getLine(), this.tok.getColumn(), this.parseExpression());
        } else if (this.tokIs(KeyWords.VOID)) {
            this.nextToken(true);
            result = Node.create(NodeKind.VOID, this.tok.getLine(), this.tok.getColumn(), this.parseExpression());
        } else if (this.tokIs(KeyWords.TYPEOF)) {
            this.nextToken(true);
            result = Node.create(NodeKind.TYPEOF, this.tok.getLine(), this.tok.getColumn(), this.parseExpression());
        } else if (this.tokIs("!") || this.tokIs("not")) {
            this.nextToken(true);
            result = Node.create(NodeKind.NOT, this.tok.getLine(), this.tok.getColumn(), this.parseExpression());
        } else if (this.tokIs("~")) {
            this.nextToken(true);
            result = Node.create(NodeKind.B_NOT, this.tok.getLine(), this.tok.getColumn(), this.parseExpression());
        } else {
            result = this.parseUnaryPostfixExpression();
        }
        return result;
    };

    AS3Parser.prototype.parseUnaryPostfixExpression = function () {
        var node = this.parsePrimaryExpression();

        if (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
            node = this.parseArrayAccessor(node);
        } else if (this.tokIs(Operators.LEFT_PARENTHESIS)) {
            node = this.parseFunctionCall(node);
        }
        if (this.tokIs(Operators.INCREMENT)) {
            node = this.parseIncrement(node);
        } else if (this.tokIs(Operators.DECREMENT)) {
            node = this.parseDecrement(node);
        } else if (this.tokIs(Operators.DOT) || this.tokIs(Operators.DOUBLE_COLUMN)) {
            node = this.parseDot(node);
        }
        return node;
    };

    AS3Parser.prototype.parseUse = function () {
        this.consume(KeyWords.USE);
        this.consume(KeyWords.NAMESPACE);
        var result = Node.create(NodeKind.USE, this.tok.getLine(), this.tok.getColumn(), null, this.parseNamespaceName());
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
        this.consume(KeyWords.VAR);
        var result = Node.create(NodeKind.VAR_LIST, this.tok.getLine(), this.tok.getColumn());
        result.addChild(this.convertMeta(meta));
        result.addChild(this.convertModifiers(modifiers));
        this.collectVarListContent(result);
        return result;
    };

    AS3Parser.prototype.parseVector = function () {
        var result = Node.create(NodeKind.VECTOR, this.tok.getLine(), this.tok.getColumn(), null, "");
        if (this.tok.getText() === "Vector") {
            this.nextToken();
        }
        this.consume(Operators.VECTOR_START);

        result.addChild(this.parseType());

        this.consume(Operators.SUPERIOR);

        return result;
    };

    /**
    * tok is while
    *
    * @throws TokenException
    */
    AS3Parser.prototype.parseWhile = function () {
        this.consume(KeyWords.WHILE);
        var result = Node.create(NodeKind.WHILE, this.tok.getLine(), this.tok.getColumn());
        result.addChild(this.parseCondition());
        result.addChild(this.parseStatement());
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
        return this.tok.getText() === text;
    };

    AS3Parser.prototype.tryToParseCommentNode = function (result, modifiers) {
        if (startsWith(this.tok.getText(), ASDOC_COMMENT)) {
            this.currentAsDoc = Node.create(NodeKind.AS_DOC, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText());
            this.nextToken();
        } else if (startsWith(this.tok.getText(), MULTIPLE_LINES_COMMENT)) {
            result.addChild(Node.create(NodeKind.MULTI_LINE_COMMENT, this.tok.getLine(), this.tok.getColumn(), null, this.tok.getText()));
            this.nextToken();
        } else {
            if (modifiers != null) {
                modifiers.push(this.tok);
            }
            this.nextTokenIgnoringDocumentation();
        }
    };
    return AS3Parser;
})();

module.exports = AS3Parser;
