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
var Token = require('./token');
var sax = require('sax');
var END = '__END__';
function isDecimalChar(currentCharacter) {
    return currentCharacter >= '0' && currentCharacter <= '9';
}
function endsWith(string, suffix) {
    return string.indexOf(suffix, string.length - suffix.length) !== -1;
}
;
function verifyXML(string) {
    var parser = sax.parser(true), result = true;
    parser.onerror = function (e) {
        result = false;
    };
    parser.write(string).close();
    return result;
}
/**
 * convert a actionscript to a stream of tokens
 *
 * @author rbokel
 * @author xagnetti
 */
var AS3Scanner = (function () {
    function AS3Scanner() {
        this.content = '';
    }
    /**
     * @return
     */
    AS3Scanner.prototype.moveToNextToken = function () {
        return this.nextToken();
    };
    /**
     * @param linesToBeSet
     */
    AS3Scanner.prototype.setContent = function (content) {
        this.content = content;
        this.index = -1;
    };
    AS3Scanner.prototype.isHexChar = function (currentCharacter) {
        return (currentCharacter >= '0' && currentCharacter <= '9') || (currentCharacter >= 'A' && currentCharacter <= 'Z') || (currentCharacter >= 'a' && currentCharacter <= 'z');
    };
    /**
     * @return
     */
    AS3Scanner.prototype.nextToken = function () {
        var currentCharacter;
        if (this.content != null && this.index < this.content.length) {
            currentCharacter = this.nextNonWhitespaceCharacter();
        }
        else {
            return new Token(END, this.index);
        }
        if (currentCharacter === '\n') {
            return new Token('\n', this.index);
        }
        else if (currentCharacter === '/') {
            return this.scanCommentRegExpOrOperator();
        }
        else if (currentCharacter === '"') {
            return this.scanString(currentCharacter);
        }
        else if (currentCharacter === '\'') {
            return this.scanString(currentCharacter);
        }
        else if (currentCharacter === '<') {
            return this.scanXMLOrOperator(currentCharacter);
        }
        else if (currentCharacter >= '0' && currentCharacter <= '9' || currentCharacter === '.') {
            return this.scanNumberOrDots(currentCharacter);
        }
        else if (currentCharacter === '{' || currentCharacter === '}' || currentCharacter === '(' || currentCharacter === ')' || currentCharacter === '[' || currentCharacter === ']' || currentCharacter === ';' || currentCharacter === ',' || currentCharacter === '?' || currentCharacter === '~') {
            return this.scanSingleCharacterToken(currentCharacter);
        }
        else if (currentCharacter === ':') {
            return this.scanCharacterSequence(currentCharacter, ['::']);
        }
        else if (currentCharacter === '*') {
            return this.scanCharacterSequence(currentCharacter, []);
        }
        else if (currentCharacter === '+') {
            return this.scanCharacterSequence(currentCharacter, ['++', '+=']);
        }
        else if (currentCharacter === '-') {
            return this.scanCharacterSequence(currentCharacter, ['--', '-=']);
        }
        else if (currentCharacter === '%') {
            return this.scanCharacterSequence(currentCharacter, ['%=']);
        }
        else if (currentCharacter === '&') {
            return this.scanCharacterSequence(currentCharacter, ['&&', '&=']);
        }
        else if (currentCharacter === '|') {
            return this.scanCharacterSequence(currentCharacter, ['||', '|=']);
        }
        else if (currentCharacter === '^') {
            return this.scanCharacterSequence(currentCharacter, ['^=']);
        }
        else if (currentCharacter === '>') {
            if (this.inVector) {
                this.inVector = false;
            }
            else {
                return this.scanCharacterSequence(currentCharacter, ['>>>=', '>>>', '>>=', '>>', '>=']);
            }
        }
        else if (currentCharacter === '=') {
            return this.scanCharacterSequence(currentCharacter, ['===', '==']);
        }
        else if (currentCharacter === '!') {
            return this.scanCharacterSequence(currentCharacter, ['!==', '!=']);
        }
        var token = this.scanWord(currentCharacter);
        return token.text.length === 0 ? this.nextToken() : token;
    };
    AS3Scanner.prototype.computePossibleMatchesMaxLength = function (possibleMatches) {
        return possibleMatches.reduce(function (max, possibleMatch) {
            return Math.max(max, possibleMatch.length);
        }, 0);
    };
    AS3Scanner.prototype.getPreviousCharacter = function () {
        var currentIndex = -1, currentChar;
        do {
            currentChar = this.peekChar(currentIndex--);
        } while (currentChar == ' ');
        return currentChar;
    };
    AS3Scanner.prototype.isIdentifierCharacter = function (currentCharacter) {
        return currentCharacter >= 'A' && currentCharacter <= 'Z' || currentCharacter >= 'a' && currentCharacter <= 'z' || currentCharacter >= '0' && currentCharacter <= '9' || currentCharacter === '_' || currentCharacter === '$';
    };
    AS3Scanner.prototype.isProcessingInstruction = function (text) {
        return text.indexOf('<?') === 0;
    };
    AS3Scanner.prototype.isValidRegExp = function (pattern) {
        try {
            new RegExp(pattern);
        }
        catch (e) {
            if (e instanceof SyntaxError) {
                return false;
            }
        }
        return true;
    };
    AS3Scanner.prototype.nextChar = function () {
        this.index++;
        var currentChar = this.content.charAt(this.index);
        while (currentChar == '\uFEFF') {
            this.index++;
            currentChar = this.content.charAt(this.index);
        }
        return currentChar;
    };
    AS3Scanner.prototype.nextNonWhitespaceCharacter = function () {
        var result;
        do {
            result = this.nextChar();
        } while (result == ' ' || result == '\t' || result.charCodeAt(0) == 13);
        return result;
    };
    AS3Scanner.prototype.peekChar = function (offset) {
        var index = this.index + offset;
        if (index == -1) {
            return '\0';
        }
        return this.content.charAt(index);
    };
    /**
     * find the longest matching sequence
     *
     * @param currentCharacter
     * @param possibleMatches
     * @param maxLength
     * @return
     */
    AS3Scanner.prototype.scanCharacterSequence = function (currentCharacter, possibleMatches) {
        var peekPos = 1;
        var buffer = '';
        var maxLength = this.computePossibleMatchesMaxLength(possibleMatches);
        buffer += currentCharacter;
        var found = buffer.toString();
        while (peekPos < maxLength) {
            buffer += this.peekChar(peekPos);
            peekPos++;
            for (var i = 0; i < possibleMatches.length; i++) {
                var possibleMatche = possibleMatches[i];
                if (buffer.toString() === possibleMatche) {
                    found = buffer.toString();
                }
            }
        }
        var result = new Token(found, this.index);
        this.skipChars(found.length - 1);
        return result;
    };
    /**
     * Something started with a slash This might be a comment, a regexp or a
     * operator
     *
     * @param currentCharacter
     * @return
     */
    AS3Scanner.prototype.scanCommentRegExpOrOperator = function () {
        var firstCharacter = this.peekChar(1);
        if (firstCharacter == '/') {
            return this.scanSingleLineComment();
        }
        if (firstCharacter == '*') {
            return this.scanMultiLineComment();
        }
        var result;
        if (this.getPreviousCharacter() == '=' || this.getPreviousCharacter() == '(' || this.getPreviousCharacter() == ',') {
            result = this.scanRegExp();
            if (result != null) {
                return result;
            }
        }
        if (firstCharacter == '=') {
            result = new Token('/=', this.index);
            this.skipChars(1);
            return result;
        }
        result = new Token('/', this.index);
        return result;
    };
    /**
     * c is either a dot or a number
     *
     * @return
     */
    AS3Scanner.prototype.scanDecimal = function (currentCharacter) {
        var currentChar = currentCharacter;
        var buffer = '';
        var peekPos = 1;
        while (isDecimalChar(currentChar)) {
            buffer += currentChar;
            currentChar = this.peekChar(peekPos++);
        }
        if (currentChar == '.') {
            buffer += currentChar;
            currentChar = this.peekChar(peekPos++);
            while (isDecimalChar(currentChar)) {
                buffer += currentChar;
                currentChar = this.peekChar(peekPos++);
            }
            if (currentChar == 'E') {
                buffer += currentChar;
                currentChar = this.peekChar(peekPos++);
                while (isDecimalChar(currentChar)) {
                    buffer += currentChar;
                    currentChar = this.peekChar(peekPos++);
                }
            }
        }
        var result = new Token(buffer.toString(), this.index, true);
        this.skipChars(result.text.length - 1);
        return result;
    };
    /**
     * The first dot has been scanned Are the next chars dots as well?
     *
     * @return
     */
    AS3Scanner.prototype.scanDots = function () {
        var secondCharacter = this.peekChar(1);
        if (secondCharacter == '.') {
            var thirdCharacter = this.peekChar(2);
            var text = thirdCharacter == '.' ? '...' : '..';
            var result = new Token(text, this.index);
            this.skipChars(text.length - 1);
            return result;
        }
        else if (secondCharacter == '<') {
            var result = new Token('.<', this.index);
            this.skipChars(1);
            this.inVector = true;
            return result;
        }
        return null;
    };
    /**
     * we have seen the 0x prefix
     *
     * @return
     */
    AS3Scanner.prototype.scanHex = function () {
        var buffer = '';
        buffer += '0x';
        var peekPos = 2;
        for (;;) {
            var character = this.peekChar(peekPos++);
            if (!this.isHexChar(character)) {
                break;
            }
            buffer += character;
        }
        var result = new Token(buffer, this.index, true);
        this.skipChars(result.text.length - 1);
        return result;
    };
    /**
     * the current string is the first slash plus we know, that a * is following
     *
     * @return
     */
    AS3Scanner.prototype.scanMultiLineComment = function () {
        var buffer = '';
        var currentCharacter = ' ';
        var previousCharacter = ' ';
        buffer += '/*';
        this.skipChar();
        do {
            previousCharacter = currentCharacter;
            currentCharacter = this.nextChar();
            buffer += currentCharacter;
        } while (currentCharacter && !(currentCharacter === '/' && previousCharacter == '*'));
        return new Token(buffer.toString(), this.index);
    };
    /**
     * Something started with a number or a dot.
     *
     * @param characterToBeScanned
     * @return
     */
    AS3Scanner.prototype.scanNumberOrDots = function (characterToBeScanned) {
        if (characterToBeScanned == '.') {
            var result = this.scanDots();
            if (result != null) {
                return result;
            }
            var firstCharacter = this.peekChar(1);
            if (!isDecimalChar(firstCharacter)) {
                return new Token('.', this.index);
            }
        }
        if (characterToBeScanned == '0') {
            var firstCharacter = this.peekChar(1);
            if (firstCharacter == 'x') {
                return this.scanHex();
            }
        }
        return this.scanDecimal(characterToBeScanned);
    };
    AS3Scanner.prototype.scanRegExp = function () {
        var token = this.scanUntilDelimiter('/');
        if (token != null && this.isValidRegExp(token.text)) {
            return token;
        }
        return null;
    };
    AS3Scanner.prototype.scanSingleCharacterToken = function (character) {
        return new Token(character, this.index);
    };
    /**
     * the current string is the first slash plus we know, that another slash is
     * following
     *
     * @return
     */
    AS3Scanner.prototype.scanSingleLineComment = function () {
        /*var result: Token = new Token(this.lines[this.line].substring(this.column), this.index);
        this.skipChars(result.text.length - 1);
        return result;*/
        var char, buffer = this.content[this.index];
        do {
            char = this.nextChar();
            buffer += char;
        } while (char !== '\n');
        return new Token(buffer.toString(), this.index);
    };
    /**
     * Something started with a quote or number quote consume characters until
     * the quote/double quote shows up again and is not escaped
     *
     * @param startingCharacter
     * @return
     */
    AS3Scanner.prototype.scanString = function (startingCharacter) {
        return this.scanUntilDelimiter(startingCharacter);
    };
    AS3Scanner.prototype.scanUntilDelimiter = function (start, delimiter) {
        if (typeof delimiter === 'undefined') {
            delimiter = start;
        }
        var buffer = '';
        ;
        var peekPos = 1;
        var numberOfBackslashes = 0;
        buffer += start;
        for (;;) {
            var currentCharacter = this.peekChar(peekPos++);
            if (currentCharacter === '\n') {
                return null;
            }
            buffer += currentCharacter;
            if (currentCharacter === delimiter && numberOfBackslashes == 0) {
                var result = new Token(buffer, this.index);
                this.skipChars(buffer.toString().length - 1);
                return result;
            }
            numberOfBackslashes = currentCharacter === '\\' ? (numberOfBackslashes + 1) % 2 : 0;
        }
    };
    AS3Scanner.prototype.scanWord = function (startingCharacter) {
        var currentChar = startingCharacter;
        var buffer = '';
        ;
        buffer += currentChar;
        var peekPos = 1;
        for (;;) {
            currentChar = this.peekChar(peekPos++);
            if (!this.isIdentifierCharacter(currentChar)) {
                break;
            }
            buffer += currentChar;
        }
        var result = new Token(buffer.toString(), this.index);
        this.skipChars(buffer.toString().length - 1);
        return result;
    };
    /**
     * Try to parse a XML document
     *
     * @return
     */
    AS3Scanner.prototype.scanXML = function () {
        var currentIndex = this.index;
        var level = 0;
        var buffer = '';
        ;
        var currentCharacter = '<';
        for (;;) {
            var currentToken = null;
            do {
                currentToken = this.scanUntilDelimiter('<', '>');
                if (currentToken == null) {
                    this.index = currentIndex;
                    return null;
                }
                buffer += currentToken.text;
                if (this.isProcessingInstruction(currentToken.text)) {
                    currentCharacter = this.nextChar();
                    if (currentCharacter === '\n') {
                        buffer += '\n';
                        this.skipChar();
                    }
                    currentToken = null;
                }
            } while (currentToken == null);
            if (currentToken.text.indexOf('</') === 0) {
                level--;
            }
            else if (!endsWith(currentToken.text, '/>') && currentToken.text !== '<>') {
                level++;
            }
            if (level <= 0) {
                return new Token(buffer.toString(), this.index);
            }
            for (;;) {
                currentCharacter = this.nextChar();
                if (currentCharacter === '<' || this.index < this.content.length) {
                    break;
                }
                buffer += currentCharacter;
            }
        }
    };
    /**
     * Something started with a lower sign <
     *
     * @param startingCharacterc
     * @return
     */
    AS3Scanner.prototype.scanXMLOrOperator = function (startingCharacterc) {
        var xmlToken = this.scanXML();
        if (xmlToken != null && verifyXML(xmlToken.text)) {
            return xmlToken;
        }
        return this.scanCharacterSequence(startingCharacterc, ['<<<=', '<<<', '<<=', '<<', '<=']);
    };
    AS3Scanner.prototype.skipChar = function () {
        this.nextChar();
    };
    AS3Scanner.prototype.skipChars = function (count) {
        var decrementCount = count;
        while (decrementCount-- > 0) {
            this.nextChar();
        }
    };
    return AS3Scanner;
})();
module.exports = AS3Scanner;
