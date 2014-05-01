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

import AS3Scanner = require('./scanner');
import Token = require('./token');
import NodeKind = require('./nodeKind');
import Operators = require('./operators');
import KeyWords = require('./keywords');
import node = require('./node');
import IParserNode = node.IParserNode;
import Node = node.Node;
import StringBuffer = require('./stringBuffer');


var ASDOC_COMMENT: string = "/**";

var MULTIPLE_LINES_COMMENT: string = "/*";

var NEW_LINE: string = "\n";

var SINGLE_LINE_COMMENT: string = "//";

var VECTOR: string = "Vector";


function startsWith(string: string, prefix: string) {
    return string.indexOf(prefix) === 0;
};

function endsWith(string: string, suffix: string) {
    return string.indexOf(suffix, string.length - suffix.length) !== -1;
};

/**
 * @author xagnetti
 */
class AS3Parser {
  
    private currentAsDoc: Node;
    private currentFunctionNode: Node;
    private currentMultiLineComment: Node;
    private fileName: string;
    private isInFor: boolean;
    private scn: AS3Scanner;
    private tok: Token;

    /**
     * 
     */
    constructor() {
        this.scn = new AS3Scanner();
        this.isInFor = false;
    }


    /*
     * (non-Javadoc)
     * @see com.adobe.ac.pmd.parser.IAS3Parser#buildAst(java.lang.String,
     * java.lang.String[])
     */
    public buildAst(filePath: string, scriptBlockLines: string[]): IParserNode {
        return this.parseLines(filePath, scriptBlockLines);
    }

    /**
     * @return
     */
    private getScn(): AS3Scanner {
        return this.scn;
    }

    private nextToken(ignoreDocumentation: boolean= false): void {
         do {
            if (ignoreDocumentation) {
                this.nextTokenIgnoringDocumentation();
            }
            else {
                this.nextTokenAllowNewLine();
            }
        }
        while (this.tok.getText() === NEW_LINE);
    }


    /**
     * tok is first content token
     * 
     * @throws TokenException
     */
    private parseClassContent(): Node {
        var result: Node = Node.create(NodeKind.CONTENT,
            this.tok.getLine(),
            this.tok.getColumn());
        var modifiers: Token [] = [];
        var meta: Node[] = [];

        while (!this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
            if (this.tokIs(Operators.LEFT_CURLY_BRACKET)) {
                result.addChild(this.parseBlock());
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
                result.addChild(this.parseImport());
            }
            else if (this.tokIs(KeyWords.FUNCTION)) {
                this.parseClassFunctions(result, modifiers,  meta);
            }
            else {
                this.tryToParseCommentNode(result, modifiers);
            }
        }
        return result;
    }

    /**
     * tok is empty, since nextToken has not been called before
     * 
     * @throws UnExpectedTokenException
     */
    private parseCompilationUnit(): Node {
        var result: Node = Node.create(NodeKind.COMPILATION_UNIT, -1, -1);

        this.nextTokenIgnoringDocumentation();
        if (this.tokIs(KeyWords.PACKAGE)) {
            result.addChild(this.parsePackage());
        }
        result.addChild(this.parsePackageContent());
        return result;
    }

    /**
     * @return
     * @throws TokenException
     */
    private parseExpression(): IParserNode {
        return this.parseAssignmentExpression();
    }

    /**
     * tok is first content token
     * 
     * @throws TokenException
     */
    private parseInterfaceContent(): Node {
        var result: Node = Node.create(NodeKind.CONTENT,
            this.tok.getLine(),
            this.tok.getColumn());
        while (!this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
            if (this.tokIs(KeyWords.IMPORT)) {
                result.addChild(this.parseImport());
            }
            else if (this.tokIs(KeyWords.FUNCTION)) {
                result.addChild(this.parseFunctionSignature());
            }
            else if (this.tokIs(KeyWords.INCLUDE)
                || this.tokIs(KeyWords.INCLUDE_AS2)) {
                result.addChild(this.parseIncludeExpression());
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
        return result;
    }

    /**
     * tok is first token of content
     * 
     * @throws UnExpectedTokenException
     */
    private parsePackageContent(): Node {
        var result: Node = Node.create(NodeKind.CONTENT,
            this.tok.getLine(),
            this.tok.getColumn());
        var modifiers: Token [] = [];
        var meta: Node [] = [];

        while (!this.tokIs(Operators.RIGHT_CURLY_BRACKET)
            && !this.tokIs(KeyWords.EOF)) {
            if (this.tokIs(KeyWords.IMPORT)) {
                result.addChild(this.parseImport());
            }
            else if (this.tokIs(KeyWords.USE)) {
                result.addChild(this.parseUse());
            }
            else if (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
                meta.push(this.parseMetaData());
            }
            else if (this.tokIs(KeyWords.CLASS)) {
                result.addChild(this.parseClass(meta,  modifiers));

                modifiers.length = 0;
                meta.length = 0;
            }
            else if (this.tokIs(KeyWords.INTERFACE)) {
                result.addChild(this.parseInterface(meta, modifiers));
                modifiers.length = 0;
                meta.length = 0;
            }
            else if (this.tokIs(KeyWords.FUNCTION)) {
                this.parseClassFunctions(result, modifiers, meta);
            }
            else if (startsWith(this.tok.getText(), ASDOC_COMMENT)) {
                this.currentAsDoc = Node.create(NodeKind.AS_DOC,
                    this.tok.getLine(),
                    this.tok.getColumn(),
                    null,
                    this.tok.getText());
                this.nextToken();
            }
            else if (startsWith(this.tok.getText(), MULTIPLE_LINES_COMMENT)) {
                this.currentMultiLineComment = Node.create(NodeKind.MULTI_LINE_COMMENT,
                    this.tok.getLine(),
                    this.tok.getColumn(),
                    null,
                    this.tok.getText());
                this.nextToken();
            }
            else {
                modifiers.push(this.tok);
                this.nextTokenIgnoringDocumentation();
            }
        }
        return result;
    }

    /**
     * @return
     * @throws TokenException
     */
    private parsePrimaryExpression(): Node {
        var result: Node = Node.create(NodeKind.PRIMARY,
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            this.tok.getText());

        if (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
            result.addChild(this.parseArrayLiteral());
        }
        else if (this.tokIs(Operators.LEFT_CURLY_BRACKET)) {
            result.addChild(this.parseObjectLiteral());
        }
        else if (this.tokIs(KeyWords.FUNCTION)) {
            result.addChild(this.parseLambdaExpression());
        }
        else if (this.tokIs(KeyWords.NEW)) {
            result = this.parseNewExpression();
        }
        else if (this.tokIs(Operators.LEFT_PARENTHESIS)) {
            result.addChild(this.parseEncapsulatedExpression());
        }
        else {
            this.nextToken(true);
        }
        return result;
    }

    /**
     * tok is the first token of a statement
     * 
     * @throws TokenException
     */
    private parseStatement(): IParserNode {
        var result: IParserNode;

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
        else if (this.tokIs(Operators.SEMI_COLUMN)) {
            result = this.parseEmptyStatement();
        }
        else {
            result = this.parseExpressionList();
            this.skip(Operators.SEMI_COLUMN);
        }
        return result;
    }

    /**
     * @return
     * @throws TokenException
     */
    private parseUnaryExpression(): Node {
        var result: Node;
        if (this.tokIs(Operators.INCREMENT)) {
            this.nextToken();
            result = Node.create(NodeKind.PRE_INC,
                this.tok.getLine(),
                this.tok.getColumn(),
                this.parseUnaryExpression());
        }
        else if (this.tokIs(Operators.DECREMENT)) {
            this.nextToken();
            result = Node.create(NodeKind.PRE_DEC,
                this.tok.getLine(),
                this.tok.getColumn(),
                this.parseUnaryExpression());
        }
        else if (this.tokIs(Operators.MINUS)) {
            this.nextToken();
            result = Node.create(NodeKind.MINUS,
                this.tok.getLine(),
                this.tok.getColumn(),
                this.parseUnaryExpression());
        }
        else if (this.tokIs(Operators.PLUS)
            || this.tokIs(Operators.PLUS_AS2)) {
            this.nextToken();
            result = Node.create(NodeKind.PLUS,
                this.tok.getLine(),
                this.tok.getColumn(),
                this.parseUnaryExpression());
        }
        else {
            result = this.parseUnaryExpressionNotPlusMinus();
        }
        return result;
    }

    private collectVarListContent(result: Node): IParserNode {
        result.addChild(this.parseNameTypeInit());
        while (this.tokIs(Operators.COMMA)) {
            this.nextToken(true);
            result.addChild(this.parseNameTypeInit());
        }
        return result;
    }


    /**
     * Compare the current token to the parameter. If it equals, get the next
     * token. If not, throw a runtime exception.
     * 
     * @param text
     * @throws UnExpectedTokenException
     */
    consume(text: string): void {
        while (startsWith(this.tok.getText(), "//")) {
            this.nextToken();
        }

        if (!this.tokIs(text)) {
            /*throw new UnExpectedTokenException(this.tok.getText(),
                new Position(this.tok.getLine(), this.tok.getColumn()),
                fileName,
                text);*/
            throw new Error('unexpected token : ' +
                this.tok.getText() + '(' + this.tok.getLine()+ ',' + this.tok.getColumn() + ')'+
                ' in file '+ this.fileName + 
                'expected: ' + text
            );
        }
        this.nextToken();
    }

    private convertMeta(metadataList: Node []): Node {
        if (metadataList == null || metadataList.length === 0) {
            return null;
        }

        var result: Node = Node.create(NodeKind.META_LIST,
            this.tok.getLine(),
            this.tok.getColumn());

        metadataList.forEach((metadataNode) => {
            result.addChild(metadataNode);
        })
      return result;
    }

    private convertModifiers(modifierList: Token []): Node {
        if (modifierList == null) {
            return null;
        }

        var result: Node = Node.create(NodeKind.MOD_LIST,
            this.tok.getLine(),
            this.tok.getColumn());

        modifierList.forEach(modifierToken => {
            result.addChild(
                Node.create(
                    NodeKind.MODIFIER,
                    this.tok.getLine(),
                    this.tok.getColumn(),
                    null,
                    modifierToken.getText()
                )
            )
        })
      return result;
    }

    private doParseSignature(): Node[] {
       this. consume(KeyWords.FUNCTION);

        var type: Node = Node.create(
            NodeKind.TYPE,
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            KeyWords.FUNCTION.toString()
        );
        if (this.tokIs(KeyWords.SET)
            || this.tokIs(KeyWords.GET)) {
            type = Node.create(NodeKind.TYPE,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText());
            this.nextToken(); // set or get
        }
        var name: Node = Node.create(NodeKind.NAME,
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            this.tok.getText());
        this.nextToken(); // name
        var params: Node = this.parseParameterList();
        var returnType: Node = this.parseOptionalType();
        return [type,  name, params, returnType];
    }

    private findFunctionTypeFromSignature(signature: Node[]): string {
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
    }

    /**
     * Get the next token Skip comments but keep newlines We need this method for
     * beeing able to decide if a returnStatement has an expression
     * 
     * @throws UnExpectedTokenException
     */
    private nextTokenAllowNewLine(): void {
        do {
            this.tok = this.scn.nextToken();

            if (this.tok == null) {
                throw new Error(this.fileName)//TODO NullTokenException(fileName);

            }
            if (this.tok.getText() == null) {
                 throw new Error(this.fileName)//TODO throw new NullTokenException(fileName);
            }
        }
        while (startsWith(this.tok.getText(), SINGLE_LINE_COMMENT));
    }

    private nextTokenIgnoringDocumentation(): void {
        do {
            this.nextToken();
        }
        while (startsWith(this.tok.getText(), MULTIPLE_LINES_COMMENT));
    }

    private parseAdditiveExpression(): IParserNode {
        var result: Node = Node.create(NodeKind.ADD,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseMultiplicativeExpression());
        while (this.tokIs(Operators.PLUS)
            || this.tokIs(Operators.PLUS_AS2) || this.tokIs(Operators.MINUS)) {
            result.addChild(Node.create(NodeKind.OP,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseMultiplicativeExpression());
        }
        return result.numChildren() > 1 ? result
            : result.getChild(0);
    }

    // ------------------------------------------------------------------------
    // language specific recursive descent parsing
    // ------------------------------------------------------------------------

    private parseAndExpression(): IParserNode {
        var result: Node = Node.create(NodeKind.AND,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseBitwiseOrExpression());
        while (this.tokIs(Operators.AND)
            || this.tokIs(Operators.AND_AS2)) {
            result.addChild(Node.create(NodeKind.OP,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseBitwiseOrExpression());
        }
        return result.numChildren() > 1 ? result
            : result.getChild(0);
    }

    /**
     * tok is ( exit tok is first token after )
     */
    private parseArgumentList(): Node {
       this. consume(Operators.LEFT_PARENTHESIS);
        var result: Node = Node.create(NodeKind.ARGUMENTS,
            this.tok.getLine(),
            this.tok.getColumn());
        while (!this.tokIs(Operators.RIGHT_PARENTHESIS)) {
            result.addChild(this.parseExpression());
            this.skip(Operators.COMMA);
        }
       this. consume(Operators.RIGHT_PARENTHESIS);
        return result;
    }

    private parseArrayAccessor(node: Node): Node {
        var result: Node = Node.create(NodeKind.ARRAY_ACCESSOR,
            this.tok.getLine(),
            this.tok.getColumn());
        result.addChild(node);
        while (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
            this.nextToken(true);
            result.addChild(this.parseExpression());
           this. consume(Operators.RIGHT_SQUARE_BRACKET);
        }
        return result;
    }

    /**
     * tok is [
     */
    private parseArrayLiteral(): IParserNode {
        var result: Node = Node.create(NodeKind.ARRAY,
            this.tok.getLine(),
            this.tok.getColumn());
       this. consume(Operators.LEFT_SQUARE_BRACKET);
        while (!this.tokIs(Operators.RIGHT_SQUARE_BRACKET)) {
            result.addChild(this.parseExpression());
            this.skip(Operators.COMMA);
        }
       this. consume(Operators.RIGHT_SQUARE_BRACKET);
        return result;
    }

    private parseAssignmentExpression(): IParserNode {
        var result: Node = Node.create(NodeKind.ASSIGN,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseConditionalExpression());
        while (this.tokIs(Operators.EQUAL)
            || this.tokIs(Operators.PLUS_EQUAL) || this.tokIs(Operators.MINUS_EQUAL)
            || this.tokIs(Operators.TIMES_EQUAL) || this.tokIs(Operators.DIVIDED_EQUAL)
            || this.tokIs(Operators.MODULO_EQUAL) || this.tokIs(Operators.AND_EQUAL) || this.tokIs(Operators.OR_EQUAL)
            || this.tokIs(Operators.XOR_EQUAL)) {
            result.addChild(Node.create(NodeKind.OP,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseExpression());
        }
        return result.numChildren() > 1 ? result
            : result.getChild(0);
    }

    private parseBitwiseAndExpression(): IParserNode {
        var result: Node = Node.create(NodeKind.B_AND,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseEqualityExpression());
        while (this.tokIs(Operators.B_AND)) {
            result.addChild(Node.create(NodeKind.OP,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseEqualityExpression());
        }
        return result.numChildren() > 1 ? result
            : result.getChild(0);
    }

    private parseBitwiseOrExpression(): IParserNode {
        var result: Node = Node.create(NodeKind.B_OR,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseBitwiseXorExpression());
        while (this.tokIs(Operators.B_OR)) {
            result.addChild(Node.create(NodeKind.OP,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseBitwiseXorExpression());
        }
        return result.numChildren() > 1 ? result
            : result.getChild(0);
    }

    private parseBitwiseXorExpression(): IParserNode {
        var result: Node = Node.create(NodeKind.B_XOR,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseBitwiseAndExpression());
        while (this.tokIs(Operators.B_XOR)) {
            result.addChild(Node.create(NodeKind.OP,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseBitwiseAndExpression());
        }
        return result.numChildren() > 1 ? result
            : result.getChild(0);
    }


    private parseBlock(result?: Node): Node {
        if (!result) {
            result = Node.create(NodeKind.BLOCK, this.tok.getLine(), this.tok.getColumn())
        }
       this. consume(Operators.LEFT_CURLY_BRACKET);

        while (!this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
            if (startsWith(this.tok.getText(), MULTIPLE_LINES_COMMENT)) {
                this.currentFunctionNode.addChild(Node.create(NodeKind.MULTI_LINE_COMMENT,
                    this.tok.getLine(),
                    this.tok.getColumn(),
                    null,
                    this.tok.getText()));
                this.nextToken();
            }
            else {
                result.addChild(this.parseStatement());
            }
        }
       this. consume(Operators.RIGHT_CURLY_BRACKET);
        return result;
    }

    /**
     * tok is catch
     * 
     * @throws TokenException
     */
    private parseCatch(): Node {
       this. consume(KeyWords.CATCH);
       this. consume(Operators.LEFT_PARENTHESIS);
        var result: Node = Node.create(NodeKind.CATCH,
            this.tok.getLine(),
            this.tok.getColumn(),
            Node.create(NodeKind.NAME,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText()));
        this.nextToken(true); // name
        if (this.tokIs(Operators.COLUMN)) {
            this.nextToken(true); // :
            result.addChild(Node.create(NodeKind.TYPE,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText()));
            this.nextToken(true); // type
        }
       this. consume(Operators.RIGHT_PARENTHESIS);
        result.addChild(this.parseBlock());
        return result;
    }

    /**
     * tok is class
     * 
     * @param meta
     * @param modifier
     * @throws TokenException
     */
    private parseClass(meta: Node [], modifier: Token []): Node {
       this. consume(KeyWords.CLASS);

        var result: Node = Node.create(NodeKind.CLASS,
            this.tok.getLine(),
            this.tok.getColumn());

        if (this.currentAsDoc != null) {
            result.addChild(this.currentAsDoc);
            this.currentAsDoc = null;
        }
        if (this.currentMultiLineComment != null) {
            result.addChild(this.currentMultiLineComment);
            this.currentMultiLineComment = null;
        }

        result.addChild(Node.create(NodeKind.NAME,
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            this.parseQualifiedName(true)));

        result.addChild(this.convertMeta(meta));
        result.addChild(this.convertModifiers(modifier));

        // this.nextToken( true ); // name

        do {
            if (this.tokIs(KeyWords.EXTENDS)) {
                this.nextToken(true); // extends
                result.addChild(Node.create(NodeKind.EXTENDS,
                    this.tok.getLine(),
                    this.tok.getColumn(),
                    null,
                    this.parseQualifiedName(false)));
            }
            else if (this.tokIs(KeyWords.IMPLEMENTS)) {
                result.addChild(this.parseImplementsList());
            }
        }
        while (!this.tokIs(Operators.LEFT_CURLY_BRACKET));
       this. consume(Operators.LEFT_CURLY_BRACKET);
        result.addChild(this.parseClassContent());
       this. consume(Operators.RIGHT_CURLY_BRACKET);
        return result;
    }

    private parseClassConstant(result: Node,
        modifiers: Token [],
        meta: Node []): void {
        result.addChild(this.parseConstList(meta,
            modifiers));
        if (this.tokIs(Operators.SEMI_COLUMN)) {
            this.nextToken();
        }
        meta.length = 0;
        modifiers.length = 0;
    }

    private parseClassField(result: Node,
        modifiers: Token [],
        meta: Node []): void {
        var varList: Node = this.parseVarList(meta,
            modifiers);
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
    }

    private parseClassFunctions(result: Node,
        modifiers: Token [],
        meta: Node []): void {
        result.addChild(this.parseFunction(meta,
            modifiers));
        meta.length = 0;
        modifiers.length = 0;
    }

    /**
     * tok is (
     * 
     * @throws TokenException
     */
    private parseCondition(): Node {
        this.consume(Operators.LEFT_PARENTHESIS);
        var result: Node = Node.create(NodeKind.CONDITION,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseExpression());
        this. consume(Operators.RIGHT_PARENTHESIS);
        return result;
    }

    private parseConditionalExpression(): IParserNode {
        var result: IParserNode = this.parseOrExpression();
        if (this.tokIs(Operators.QUESTION_MARK)) {
            var conditional: Node = Node.create(NodeKind.CONDITIONAL,
                this.tok.getLine(),
                this.tok.getColumn(),
                result);
            this.nextToken(true); // ?
            conditional.addChild(this.parseExpression());
            this.nextToken(true); // :
            conditional.addChild(this.parseExpression());

            return conditional;
        }
        return result;
    }

    private parseConst(): Node {
        var result: Node;
        result = this.parseConstList(null,
            null);
        this.skip(Operators.SEMI_COLUMN);
        return result;
    }

    /**
     * tok is const
     * 
     * @param modifiers
     * @param meta
     * @throws TokenException
     */
    private parseConstList(meta: Node [],
        modifiers: Token []): Node {
       this. consume(KeyWords.CONST);
        var result: Node = Node.create(NodeKind.CONST_LIST,
            this.tok.getLine(),
            this.tok.getColumn());
        result.addChild(this.convertMeta(meta));
        result.addChild(this.convertModifiers(modifiers));
        this.collectVarListContent(result);
        return result;
    }

    private parseDecrement(node: Node): Node {
        this.nextToken(true);
        var result: Node = Node.create(NodeKind.POST_DEC,
            this.tok.getLine(),
            this.tok.getColumn());
        result.addChild(node);
        return result;
    }

    /**
     * tok is do
     * 
     * @throws TokenException
     */
    private parseDo(): Node {
       this. consume(KeyWords.DO);
        var result: Node = Node.create(NodeKind.DO,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseStatement());
       this. consume(KeyWords.WHILE);
        result.addChild(this.parseCondition());
        if (this.tokIs(Operators.SEMI_COLUMN)) {
            this.nextToken(true);
        }
        return result;
    }

    private parseDot(node: Node): Node {
        this.nextToken();
        if (this.tokIs(Operators.LEFT_PARENTHESIS)) {
            this.nextToken();
            var result: Node = Node.create(NodeKind.E4X_FILTER,
                this.tok.getLine(),
                this.tok.getColumn());
            result.addChild(node);
            result.addChild(this.parseExpression());
           this. consume(Operators.RIGHT_PARENTHESIS);
            return result;
        }
        else if (this.tokIs(Operators.TIMES)) {
            var result: Node = Node.create(NodeKind.E4X_STAR,
                this.tok.getLine(),
                this.tok.getColumn());
            result.addChild(node);
            return result;
        }
        var result: Node = Node.create(NodeKind.DOT,
            this.tok.getLine(),
            this.tok.getColumn());
        result.addChild(node);
        result.addChild(this.parseExpression());
        return result;
    }

    private parseEmptyStatement(): Node {
        var result: Node;
        result = Node.create(NodeKind.STMT_EMPTY,
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            Operators.SEMI_COLUMN.toString());
        this.nextToken(true);
        return result;
    }

    private parseEncapsulatedExpression(): Node {
       this. consume(Operators.LEFT_PARENTHESIS);
        var result: Node = Node.create(NodeKind.ENCAPSULATED,
            this.tok.getLine(),
            this.tok.getColumn());
        result.addChild(this.parseExpressionList());

       this. consume(Operators.RIGHT_PARENTHESIS);

        return result;
    }

    private parseEqualityExpression(): IParserNode {
        var result: Node = Node.create(NodeKind.EQUALITY,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseRelationalExpression());
        while (this.tokIs(Operators.DOUBLE_EQUAL)
            || this.tokIs(Operators.DOUBLE_EQUAL_AS2) || this.tokIs(Operators.STRICTLY_EQUAL)
            || this.tokIs(Operators.NON_EQUAL) || this.tokIs(Operators.NON_EQUAL_AS2_1)
            || this.tokIs(Operators.NON_EQUAL_AS2_2) || this.tokIs(Operators.NON_STRICTLY_EQUAL)) {
            result.addChild(Node.create(NodeKind.OP,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseRelationalExpression());
        }
        return result.numChildren() > 1 ? result
            : result.getChild(0);
    }

    private parseExpressionList(): IParserNode {
        var result: Node = Node.create(NodeKind.EXPR_LIST,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseAssignmentExpression());
        while (this.tokIs(Operators.COMMA)) {
            this.nextToken(true);
            result.addChild(this.parseAssignmentExpression());
        }
        return result.numChildren() > 1 ? result
            : result.getChild(0);
    }

    private parseFinally(): Node {
        var result: Node;
        this.nextToken(true);
        result = Node.create(NodeKind.FINALLY,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseBlock());
        return result;
    }

    /**
     * tok is for
     * 
     * @throws TokenException
     */
    private parseFor(): Node {
       this. consume(KeyWords.FOR);

        if (this.tokIs(KeyWords.EACH)) {
            this.nextToken();
            return this.parseForEach();
        }
        else {
            return this.parseTraditionalFor();
        }
    }

    /**
     * tok is ( for each( var obj : Type in List )
     * 
     * @throws TokenException
     */
    private parseForEach(): Node {
       this. consume(Operators.LEFT_PARENTHESIS);

        var result: Node = Node.create(NodeKind.FOREACH,
            this.tok.getLine(),
            this.tok.getColumn());
        if (this.tokIs(KeyWords.VAR)) {
            var node: Node = Node.create(NodeKind.VAR,
                this.tok.getLine(),
                this.tok.getColumn());
            this.nextToken();
            node.addChild(this.parseNameTypeInit());
            result.addChild(node);
        }
        else {
            result.addChild(Node.create(NodeKind.NAME,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText()));
            // names allowed?
            this.nextToken();
        }
        this.nextToken(); // in
        result.addChild(Node.create(NodeKind.IN,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseExpression()));
       this. consume(Operators.RIGHT_PARENTHESIS);
        result.addChild(this.parseStatement());
        return result;
    }

    private parseForIn(result: Node): Node {
        this.nextToken();
        result.addChild(Node.create(NodeKind.IN,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseExpression()));
        result.setId(NodeKind.FORIN);
        return result;
    }

    /**
     * tok is function
     * 
     * @param modifiers
     * @param meta
     * @throws TokenException
     */
    private parseFunction(meta: Node [],
        modifiers: Token []): Node {
        var signature: Node[] = this.doParseSignature();
        var result: Node = Node.create(this.findFunctionTypeFromSignature(signature),
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            signature[0].getStringValue());

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
           this. consume(Operators.SEMI_COLUMN);
        }
        else {
            result.addChild(this.parseFunctionBlock());
        }
        this.currentFunctionNode = null;
        return result;
    }

    /**
     * tok is { exit tok is the first tok after }
     * 
     * @throws TokenException
     * @throws TokenException
     */

    private parseFunctionBlock(): Node {
        var block: Node = Node.create(NodeKind.BLOCK,
            this.tok.getLine(),
            this.tok.getColumn());

        this.currentFunctionNode = block;

        this.parseBlock(block);

        return block;
    }

    private parseFunctionCall(node: Node): Node {
        var result: Node = Node.create(NodeKind.CALL,
            this.tok.getLine(),
            this.tok.getColumn());
        result.addChild(node);
        while (this.tokIs(Operators.LEFT_PARENTHESIS)) {
            result.addChild(this.parseArgumentList());
        }
        while (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
            result.addChild(this.parseArrayLiteral());
        }

        return result;
    }

    /**
     * tok is function exit tok is the first token after the optional ;
     * 
     * @throws TokenException
     */
    private parseFunctionSignature(): Node {
        var signature: Node[] = this.doParseSignature();
        this.skip(Operators.SEMI_COLUMN);
        var result: Node = Node.create(this.findFunctionTypeFromSignature(signature),
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            signature[0].getStringValue());
        result.addChild(signature[1]);
        result.addChild(signature[2]);
        result.addChild(signature[3]);
        return result;
    }

    /**
     * tok is if
     * 
     * @throws TokenException
     */
    private parseIf(): Node {
       this. consume(KeyWords.IF);
        var result: Node = Node.create(NodeKind.IF,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseCondition());
        result.addChild(this.parseStatement());
        if (this.tokIs(KeyWords.ELSE)) {
            this.nextToken(true);
            result.addChild(this.parseStatement());
        }
        return result;
    }

    /**
     * tok is implements implements a,b,c exit tok is the first token after the
     * list of qualfied names
     * 
     * @throws TokenException
     */
    private parseImplementsList(): Node {
       this. consume(KeyWords.IMPLEMENTS);

        var result: Node = Node.create(NodeKind.IMPLEMENTS_LIST,
            this.tok.getLine(),
            this.tok.getColumn());
        result.addChild(Node.create(NodeKind.IMPLEMENTS,
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            this.parseQualifiedName(true)));
        while (this.tokIs(Operators.COMMA)) {
            this.nextToken(true);
            result.addChild(Node.create(NodeKind.IMPLEMENTS,
                this.tok.getLine(),
                this.tok.getColumn(),
            null,
                this.parseQualifiedName(false)));
        }
        return result;
    }

    /**
     * tok is import
     * 
     * @throws TokenException
     */
    private parseImport(): Node {
       this. consume(KeyWords.IMPORT);
        var result: Node = Node.create(NodeKind.IMPORT,
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            this.parseImportName());
        this.skip(Operators.SEMI_COLUMN);
        return result;
    }

    /**
     * tok is the first part of a name the last part can be a star exit tok is
     * the first token, which doesn't belong to the name
     * 
     * @throws TokenException
     */
    private parseImportName(): string {
        var result: StringBuffer = new StringBuffer();

        result.append(this.tok.getText());
        this.nextToken();
        while (this.tokIs(Operators.DOT)) {
            result.append(Operators.DOT);
            this.nextToken(); // .
            result.append(this.tok.getText());
            this.nextToken(); // part of name
        }
        return result.toString();
    }

    private parseIncludeExpression(): IParserNode {
        var result: Node = Node.create(NodeKind.INCLUDE,
            this.tok.getLine(),
            this.tok.getColumn());
        if (this.tokIs(KeyWords.INCLUDE)) {
           this. consume(KeyWords.INCLUDE);
        }
        else if (this.tokIs(KeyWords.INCLUDE_AS2)) {
           this. consume(KeyWords.INCLUDE_AS2);
        }
        result.addChild(this.parseExpression());
        return result;
    }

    private parseIncrement(node: Node): Node {
        this.nextToken(true);
        var result: Node = Node.create(NodeKind.POST_INC,
            this.tok.getLine(),
            this.tok.getColumn());
        result.addChild(node);
        return result;
    }

    /**
     * tok is interface
     * 
     * @param meta
     * @param modifier
     * @throws TokenException
     */
    private parseInterface(meta: Node [],
        modifier: Token []): Node {
       this. consume(KeyWords.INTERFACE);
        var result: Node = Node.create(NodeKind.INTERFACE,
            this.tok.getLine(),
            this.tok.getColumn());

        if (this.currentAsDoc != null) {
            result.addChild(this.currentAsDoc);
            this.currentAsDoc = null;
        }
        if (this.currentMultiLineComment != null) {
            result.addChild(this.currentMultiLineComment);
            this.currentMultiLineComment = null;
        }
        result.addChild(Node.create(NodeKind.NAME,
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            this.parseQualifiedName(true)));

        result.addChild(this.convertMeta(meta));
        result.addChild(this.convertModifiers(modifier));

        if (this.tokIs(KeyWords.EXTENDS)) {
            this.nextToken(); // extends
            result.addChild(Node.create(NodeKind.EXTENDS,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.parseQualifiedName(false)));
        }
        while (this.tokIs(Operators.COMMA)) {
            this.nextToken(); // comma
            result.addChild(Node.create(NodeKind.EXTENDS,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.parseQualifiedName(false)));
        }
       this. consume(Operators.LEFT_CURLY_BRACKET);
        result.addChild(this.parseInterfaceContent());
       this. consume(Operators.RIGHT_CURLY_BRACKET);
        return result;
    }

    /**
     * tok is function
     * 
     * @throws TokenException
     */
    private parseLambdaExpression(): Node {
       this. consume(KeyWords.FUNCTION);
        var result: Node;

        //if (this.tok.getText().compareTo("(") == 0) {
        if (this.tok.getText()== "(") {
            result = Node.create(NodeKind.LAMBDA,
                this.tok.getLine(),
                this.tok.getColumn());
        }
        else {
            result = Node.create(NodeKind.FUNCTION,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText());
            this.nextToken(true);
        }
        result.addChild(this.parseParameterList());
        result.addChild(this.parseOptionalType());
        result.addChild(this.parseBlock());
        return result;
    }

    private parseLines(filePath: string, lines: string[]): IParserNode {
        this.setFileName(filePath);
        this.scn = new AS3Scanner();
        this.scn.setLines(lines);
        return this.parseCompilationUnit();
    }

    /**
     * tok is [ [id] [id ("test")] [id (name="test",type="a.b.c.Event")] exit
     * token is the first token after ]
     * 
     * @throws TokenException
     */
    private parseMetaData(): Node {
        var buffer: StringBuffer = new StringBuffer();

        var line: number = this.tok.getLine();
        var column: number = this.tok.getColumn();

       this. consume(Operators.LEFT_SQUARE_BRACKET);
        while (!this.tokIs(Operators.RIGHT_SQUARE_BRACKET)) {
            if (buffer.toString().length > 0) {
                buffer.append(' ');
            }
            buffer.append(this.tok.getText());
            this.nextToken();
        }
        this.skip(Operators.RIGHT_SQUARE_BRACKET);
        var metaDataNode: Node = Node.create(NodeKind.META,
            line,
            column,
            null,
            buffer.toString());

        return metaDataNode;
    }

    private parseMultiplicativeExpression(): IParserNode {
        var result: Node = Node.create(NodeKind.MULTIPLICATION,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseUnaryExpression());
        while (this.tokIs(Operators.TIMES)
            || this.tokIs(Operators.SLASH) || this.tokIs(Operators.MODULO)) {
            result.addChild(Node.create(NodeKind.OP,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseUnaryExpression());
        }
        return result.numChildren() > 1 ? result
            : result.getChild(0);
    }

    private parseNamespaceName(): string {
        var name: string = this.tok.getText();
        this.nextToken(); // simple name for now
        return name;
    }

    private parseNameTypeInit(): Node {
        var result: Node = Node.create(NodeKind.NAME_TYPE_INIT,
            this.tok.getLine(),
            this.tok.getColumn());
        result.addChild(Node.create(NodeKind.NAME,
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            this.tok.getText()));
        this.nextToken(true); // name
        result.addChild(this.parseOptionalType());
        result.addChild(this.parseOptionalInit());
        return result;
    }

    private parseNewExpression(): Node {
       this. consume(KeyWords.NEW);

        var result: Node = Node.create(NodeKind.NEW,
            this.tok.getLine(),
            this.tok.getColumn());
        result.addChild(this.parseExpression()); // name
        if (this.tokIs(Operators.VECTOR_START)) {
            result.addChild(Node.create(NodeKind.VECTOR,
                this.tok.getLine(),
                this.tok.getColumn(),
                this.parseVector()));
        }
        if (this.tokIs(Operators.LEFT_PARENTHESIS)) {
            result.addChild(this.parseArgumentList());
        }
        return result;
    }

    /**
     * tok is {
     */
    private parseObjectLiteral(): Node {
        var result: Node = Node.create(NodeKind.OBJECT,
            this.tok.getLine(),
            this.tok.getColumn());
       this. consume(Operators.LEFT_CURLY_BRACKET);
        while (!this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
            result.addChild(this.parseObjectLiteralPropertyDeclaration());
            this.skip(Operators.COMMA);
        }
       this. consume(Operators.RIGHT_CURLY_BRACKET);
        return result;
    }

    /*
     * tok is name
     */
    private parseObjectLiteralPropertyDeclaration(): Node {
        var result: Node = Node.create(NodeKind.PROP,
            this.tok.getLine(),
            this.tok.getColumn());
        var name: Node = Node.create(NodeKind.NAME,
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            this.tok.getText());
        result.addChild(name);
        this.nextToken(); // name
       this. consume(Operators.COLUMN);
        result.addChild(Node.create(NodeKind.VALUE,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseExpression()));
        return result;
    }

    /**
     * if tok is "=" parse the expression otherwise do nothing
     * 
     * @return
     */
    private parseOptionalInit(): Node {
        var result: Node = null;
        if (this.tokIs(Operators.EQUAL)) {
            this.nextToken(true);
            result = Node.create(NodeKind.INIT,
                this.tok.getLine(),
                this.tok.getColumn(),
                this.parseExpression());
        }
        return result;
    }

    /**
     * if tok is ":" parse the type otherwise do nothing
     * 
     * @return
     * @throws TokenException
     */
    private parseOptionalType(): Node {
        var result: Node = Node.create(NodeKind.TYPE,
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            "");
        if (this.tokIs(Operators.COLUMN)) {
            this.nextToken(true);
            result = this.parseType();
        }
        return result;
    }

    private parseOrExpression(): IParserNode {
        var result: Node = Node.create(NodeKind.OR,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseAndExpression());
        while (this.tokIs(Operators.LOGICAL_OR)
            || this.tokIs(Operators.LOGICAL_OR_AS2)) {
            result.addChild(Node.create(NodeKind.OP,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseAndExpression());
        }
        return result.numChildren() > 1 ? result
            : result.getChild(0);
    }

    /**
     * tok is package
     * 
     * @throws UnExpectedTokenException
     */
    private parsePackage(): Node {
       this. consume(KeyWords.PACKAGE);

        var result: Node = Node.create(NodeKind.PACKAGE,
            this.tok.getLine(),
            this.tok.getColumn());
        var nameBuffer: StringBuffer = new StringBuffer();

        while (!this.tokIs(Operators.LEFT_CURLY_BRACKET)) {
            nameBuffer.append(this.tok.getText());
            this.nextToken();
        }
        result.addChild(Node.create(NodeKind.NAME,
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            nameBuffer.toString()));
       this. consume(Operators.LEFT_CURLY_BRACKET);
        result.addChild(this.parsePackageContent());
       this. consume(Operators.RIGHT_CURLY_BRACKET);
        return result;
    }

    /**
     * tok is the name of a parameter or ...
     */
    private parseParameter(): Node {
        var result: Node = Node.create(NodeKind.PARAMETER,
            this.tok.getLine(),
            this.tok.getColumn());
        if (this.tokIs(Operators.REST_PARAMETERS)) {
            this.nextToken(true); // ...
            var rest: Node = Node.create(NodeKind.REST,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText());
            this.nextToken(true); // rest
            result.addChild(rest);
        }
        else {
            result.addChild(this.parseNameTypeInit());
        }
        return result;
    }

    /**
     * tok is (
     * 
     * @throws TokenException
     */
    private parseParameterList(): Node {
       this. consume(Operators.LEFT_PARENTHESIS);

        var result: Node = Node.create(NodeKind.PARAMETER_LIST,
            this.tok.getLine(),
            this.tok.getColumn());
        while (!this.tokIs(Operators.RIGHT_PARENTHESIS)) {
            result.addChild(this.parseParameter());
            if (this.tokIs(Operators.COMMA)) {
                this.nextToken(true);
            }
            else {
                break;
            }
        }
       this. consume(Operators.RIGHT_PARENTHESIS);
        return result;
    }

    /**
     * tok is first part of the name exit tok is the first token after the name
     * 
     * @throws TokenException
     */
    private parseQualifiedName(skipPackage: boolean): string {
        var buffer: StringBuffer = new StringBuffer();

        buffer.append(this.tok.getText());
        this.nextToken();
        while (this.tokIs(Operators.DOT)
            || this.tokIs(Operators.DOUBLE_COLUMN)) {
            buffer.append(this.tok.getText());
            this.nextToken();
            buffer.append(this.tok.getText());
            this.nextToken(); // name
        }

        if (skipPackage) {
            return buffer.toString().substring(buffer.toString().lastIndexOf(Operators.DOT.toString()) + 1);
        }
        return buffer.toString();
    }

    private parseRelationalExpression(): IParserNode {
        var result: Node = Node.create(NodeKind.RELATION,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseShiftExpression());
        while (this.tokIs(Operators.INFERIOR)
            || this.tokIs(Operators.INFERIOR_AS2) || this.tokIs(Operators.INFERIOR_OR_EQUAL)
            || this.tokIs(Operators.INFERIOR_OR_EQUAL_AS2) || this.tokIs(Operators.SUPERIOR)
            || this.tokIs(Operators.SUPERIOR_AS2) || this.tokIs(Operators.SUPERIOR_OR_EQUAL)
            || this.tokIs(Operators.SUPERIOR_OR_EQUAL_AS2) || this.tokIs(KeyWords.IS) || this.tokIs(KeyWords.IN)
            && !this.isInFor || this.tokIs(KeyWords.AS) || this.tokIs(KeyWords.INSTANCE_OF)) {
            if (!this.tokIs(KeyWords.AS)) {
                result.addChild(Node.create(NodeKind.OP,
                    this.tok.getLine(),
                    this.tok.getColumn(),
                    null,
                    this.tok.getText()));
            }
            else {
                result.addChild(Node.create(NodeKind.AS,
                    this.tok.getLine(),
                    this.tok.getColumn(),
                    null,
                    this.tok.getText()));
            }
            this.nextToken(true);
            result.addChild(this.parseShiftExpression());
        }
        return result.numChildren() > 1 ? result
            : result.getChild(0);
    }

    private parseReturnStatement(): IParserNode {
        var result: Node;

        this.nextTokenAllowNewLine();
        if (this.tokIs(NEW_LINE)
            || this.tokIs(Operators.SEMI_COLUMN)) {
            this.nextToken(true);
            result = Node.create(NodeKind.RETURN,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                "");
        }
        else {
            result = Node.create(NodeKind.RETURN,
                this.tok.getLine(),
                this.tok.getColumn(),
                this.parseExpression());
            this.skip(Operators.SEMI_COLUMN);
        }
        return result;
    }

    private parseShiftExpression(): IParserNode {
        var result: Node = Node.create(NodeKind.SHIFT,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseAdditiveExpression());
        while (this.tokIs(Operators.DOUBLE_SHIFT_LEFT)
            || this.tokIs(Operators.TRIPLE_SHIFT_LEFT) || this.tokIs(Operators.DOUBLE_SHIFT_RIGHT)
            || this.tokIs(Operators.TRIPLE_SHIFT_RIGHT)) {
            result.addChild(Node.create(NodeKind.OP,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText()));
            this.nextToken(true);
            result.addChild(this.parseAdditiveExpression());
        }
        return result.numChildren() > 1 ? result
            : result.getChild(0);
    }

    /**
     * tok is switch
     * 
     * @throws TokenException
     */
    private parseSwitch(): Node {
       this. consume(KeyWords.SWITCH);
        var result: Node = Node.create(NodeKind.SWITCH,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseCondition());
        if (this.tokIs(Operators.LEFT_CURLY_BRACKET)) {
            this.nextToken();
            result.addChild(this.parseSwitchCases());
           this. consume(Operators.RIGHT_CURLY_BRACKET);
        }
        return result;
    }

    /**
     * tok is case, default or the first token of the first statement
     * 
     * @throws TokenException
     */
    private parseSwitchBlock(): Node {
        var result: Node = Node.create(NodeKind.SWITCH_BLOCK,
            this.tok.getLine(),
            this.tok.getColumn());
        while (!this.tokIs(KeyWords.CASE)
            && !this.tokIs(KeyWords.DEFAULT) && !this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
            result.addChild(this.parseStatement());
        }
        return result;
    }

    /**
     * tok is { exit tok is }
     * 
     * @throws TokenException
     */
    private parseSwitchCases(): Node {
        var result: Node = Node.create(NodeKind.CASES,
            this.tok.getLine(),
            this.tok.getColumn());
        for (; ;) {
            if (this.tokIs(Operators.RIGHT_CURLY_BRACKET)) {
                break;
            }
            else if (this.tokIs(KeyWords.CASE)) {
                this.nextToken(true); // case
                var caseNode: Node = Node.create(NodeKind.CASE,
                    this.tok.getLine(),
                    this.tok.getColumn(),
                    this.parseExpression());
               this. consume(Operators.COLUMN);
                caseNode.addChild(this.parseSwitchBlock());
                result.addChild(caseNode);
            }
            else if (this.tokIs(KeyWords.DEFAULT)) {
                this.nextToken(true); // default
               this. consume(Operators.COLUMN);
                var caseNode: Node = Node.create(NodeKind.CASE,
                    this.tok.getLine(),
                    this.tok.getColumn(),
                    Node.create(NodeKind.DEFAULT,
                        this.tok.getLine(),
                        this.tok.getColumn(),
                        null,
                        KeyWords.DEFAULT.toString()));
                caseNode.addChild(this.parseSwitchBlock());
                result.addChild(caseNode);
            }
        }
        return result;
    }

    /**
     * tok is ( for( var x : number = 0; i < length; i++ ) for( var s : string in
     * Object )
     * 
     * @throws TokenException
     */
    private parseTraditionalFor(): Node {
       this. consume(Operators.LEFT_PARENTHESIS);

        var result: Node = Node.create(NodeKind.FOR,
            this.tok.getLine(),
            this.tok.getColumn());
        if (!this.tokIs(Operators.SEMI_COLUMN)) {
            if (this.tokIs(KeyWords.VAR)) {
                result.addChild(Node.create(NodeKind.INIT,
                    this.tok.getLine(),
                    this.tok.getColumn(),
                    this.parseVarList(null,
                        null)));
            }
            else {
                this.isInFor = true;
                result.addChild(Node.create(NodeKind.INIT,
                    this.tok.getLine(),
                    this.tok.getColumn(),
                    this.parseExpression()));
                this.isInFor = false;
            }
            if (this.tokIs(NodeKind.IN.toString())) {
                return this.parseForIn(result);
            }
        }
       this. consume(Operators.SEMI_COLUMN);
        if (!this.tokIs(Operators.SEMI_COLUMN)) {
            result.addChild(Node.create(NodeKind.COND,
                this.tok.getLine(),
                this.tok.getColumn(),
                this.parseExpression()));
        }
       this. consume(Operators.SEMI_COLUMN);
        if (!this.tokIs(Operators.RIGHT_PARENTHESIS)) {
            result.addChild(Node.create(NodeKind.ITER,
                this.tok.getLine(),
                this.tok.getColumn(),
                this.parseExpressionList()));
        }
       this. consume(Operators.RIGHT_PARENTHESIS);
        result.addChild(this.parseStatement());
        return result;
    }

    private parseTry(): Node {
        var result: Node;
        this.nextToken(true);
        result = Node.create(NodeKind.TRY,
            this.tok.getLine(),
            this.tok.getColumn(),
            this.parseBlock());
        return result;
    }

    private parseType(): Node {
        var result: Node;
        if (this.tok.getText() === VECTOR) {
            result = this.parseVector();
        }
        else {
            result = Node.create(NodeKind.TYPE,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.parseQualifiedName(true));
            // this.nextToken( true );
        }
        return result;
    }

    private parseUnaryExpressionNotPlusMinus(): Node {
        var result: Node;
        if (this.tokIs(KeyWords.DELETE)) {
            this.nextToken(true);
            result = Node.create(NodeKind.DELETE,
                this.tok.getLine(),
                this.tok.getColumn(),
                this.parseExpression());
        }
        else if (this.tokIs(KeyWords.VOID)) {
            this.nextToken(true);
            result = Node.create(NodeKind.VOID,
                this.tok.getLine(),
                this.tok.getColumn(),
                this.parseExpression());
        }
        else if (this.tokIs(KeyWords.TYPEOF)) {
            this.nextToken(true);
            result = Node.create(NodeKind.TYPEOF,
                this.tok.getLine(),
                this.tok.getColumn(),
                this.parseExpression());
        }
        else if (this.tokIs("!")
            || this.tokIs("not")) {
            this.nextToken(true);
            result = Node.create(NodeKind.NOT,
                this.tok.getLine(),
                this.tok.getColumn(),
                this.parseExpression());
        }
        else if (this.tokIs("~")) {
            this.nextToken(true);
            result = Node.create(NodeKind.B_NOT,
                this.tok.getLine(),
                this.tok.getColumn(),
                this.parseExpression());
        }
        else {
            result = this.parseUnaryPostfixExpression();
        }
        return result;
    }

    private parseUnaryPostfixExpression(): Node {
        var node: Node = this.parsePrimaryExpression();

        if (this.tokIs(Operators.LEFT_SQUARE_BRACKET)) {
            node = this.parseArrayAccessor(node);
        }
        else if (this.tokIs(Operators.LEFT_PARENTHESIS)) {
            node = this.parseFunctionCall(node);
        }
        if (this.tokIs(Operators.INCREMENT)) {
            node = this.parseIncrement(node);
        }
        else if (this.tokIs(Operators.DECREMENT)) {
            node = this.parseDecrement(node);
        }
        else if (this.tokIs(Operators.DOT)
            || this.tokIs(Operators.DOUBLE_COLUMN)) {
            node = this.parseDot(node);
        }
        return node;
    }

    private parseUse(): Node {
       this. consume(KeyWords.USE);
       this. consume(KeyWords.NAMESPACE);
        var result: Node = Node.create(NodeKind.USE,
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            this.parseNamespaceName());
        this.skip(Operators.SEMI_COLUMN);
        return result;
    }

    private parseVar(): Node {
        var result: Node;
        result = this.parseVarList(null,
            null);
        this.skip(Operators.SEMI_COLUMN);
        return result;
    }

    /**
     * tok is var var x, y : String, z : number = 0;
     * 
     * @param modifiers
     * @param meta
     * @throws TokenException
     */
    private parseVarList(meta: Node [], modifiers: Token []): Node {
       this. consume(KeyWords.VAR);
        var result: Node = Node.create(NodeKind.VAR_LIST,
            this.tok.getLine(),
            this.tok.getColumn());
        result.addChild(this.convertMeta(meta));
        result.addChild(this.convertModifiers(modifiers));
        this.collectVarListContent(result);
        return result;
    }

    private parseVector(): Node {
        var result: Node = Node.create(NodeKind.VECTOR,
            this.tok.getLine(),
            this.tok.getColumn(),
            null,
            "");
        if (this.tok.getText() === "Vector") {
            this.nextToken();
        }
       this. consume(Operators.VECTOR_START);

        result.addChild(this.parseType());

       this. consume(Operators.SUPERIOR);

        return result;
    }

    /**
     * tok is while
     * 
     * @throws TokenException
     */
    private parseWhile(): Node {
       this. consume(KeyWords.WHILE);
        var result: Node = Node.create(NodeKind.WHILE,
            this.tok.getLine(),
            this.tok.getColumn());
        result.addChild(this.parseCondition());
        result.addChild(this.parseStatement());
        return result;
    }

    private setFileName(fileNameToParse: string): void {
        this.fileName = fileNameToParse;
    }


    /**
     * Skip the current token, if it equals to the parameter
     * 
     * @param text
     * @throws UnExpectedTokenException
     */
    private skip(text: string): void {
        if (this.tokIs(text)) {
            this.nextToken();
        }
    }

    /**
     * Compare the current token to the parameter
     * 
     * @param text
     * @return true, if tok's text property equals the parameter
     */
    private tokIs(text: string): boolean {
        return this.tok.getText() ===  text;
    }

    private tryToParseCommentNode(result: Node,
        modifiers: Token []): void {
        if (startsWith(this.tok.getText(), ASDOC_COMMENT)) {
            this.currentAsDoc = Node.create(NodeKind.AS_DOC,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText());
            this.nextToken();
        }
        else if (startsWith(this.tok.getText(),MULTIPLE_LINES_COMMENT)) {
            result.addChild(Node.create(NodeKind.MULTI_LINE_COMMENT,
                this.tok.getLine(),
                this.tok.getColumn(),
                null,
                this.tok.getText()));
            this.nextToken();
        }
        else {
            if (modifiers != null) {
                modifiers.push(this.tok);
            }
            this.nextTokenIgnoringDocumentation();
        }
    }
}

export = AS3Parser;