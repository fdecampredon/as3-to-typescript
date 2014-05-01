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
/// <reference path="./sax.d.ts" />
var Token = require('./token');
var sax = require('sax');
var StringBuffer = require('./stringBuffer');

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
        this.lines = null;
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
    AS3Scanner.prototype.setLines = function (linesToBeSet) {
        this.lines = linesToBeSet;
        this.line = 0;
        this.column = -1;
    };

    AS3Scanner.prototype.isHexChar = function (currentCharacter) {
        return (currentCharacter >= '0' && currentCharacter <= '9') || (currentCharacter >= 'A' && currentCharacter <= 'Z') || (currentCharacter >= 'a' && currentCharacter <= 'z');
    };

    /**
    * @return
    */
    AS3Scanner.prototype.nextToken = function () {
        var currentCharacter;

        if (this.lines != null && this.line < this.lines.length) {
            currentCharacter = this.nextNonWhitespaceCharacter();
        } else {
            return new Token(END, this.line, this.column);
        }

        if (currentCharacter === '\n') {
            return new Token('\n', this.line, this.column);
        } else if (currentCharacter === '/') {
            return this.scanCommentRegExpOrOperator();
        } else if (currentCharacter === '"') {
            return this.scanString(currentCharacter);
        } else if (currentCharacter === '\'') {
            return this.scanString(currentCharacter);
        } else if (currentCharacter === '<') {
            return this.scanXMLOrOperator(currentCharacter);
        } else if (currentCharacter >= '0' && currentCharacter <= '9' || currentCharacter === '.') {
            return this.scanNumberOrDots(currentCharacter);
        } else if (currentCharacter === '{' || currentCharacter === '}' || currentCharacter === '(' || currentCharacter === ')' || currentCharacter === '[' || currentCharacter === ']' || currentCharacter === ';' || currentCharacter === ',' || currentCharacter === '?' || currentCharacter === '~') {
            return this.scanSingleCharacterToken(currentCharacter);
        } else if (currentCharacter === ':') {
            return this.scanCharacterSequence(currentCharacter, ['::']);
        } else if (currentCharacter === '*') {
            return this.scanCharacterSequence(currentCharacter, []);
        } else if (currentCharacter === '+') {
            return this.scanCharacterSequence(currentCharacter, ['++', '+=']);
        } else if (currentCharacter === '-') {
            return this.scanCharacterSequence(currentCharacter, ['--', '-=']);
        } else if (currentCharacter === '%') {
            return this.scanCharacterSequence(currentCharacter, ['%=']);
        } else if (currentCharacter === '&') {
            return this.scanCharacterSequence(currentCharacter, ['&&', '&=']);
        } else if (currentCharacter === '|') {
            return this.scanCharacterSequence(currentCharacter, ['||', '|=']);
        } else if (currentCharacter === '^') {
            return this.scanCharacterSequence(currentCharacter, ['^=']);
        } else if (currentCharacter === '>') {
            if (this.inVector) {
                this.inVector = false;
            } else {
                return this.scanCharacterSequence(currentCharacter, ['>>>=', '>>>', '>>=', '>>', '>=']);
            }
        } else if (currentCharacter === '=') {
            return this.scanCharacterSequence(currentCharacter, ['===', '==']);
        } else if (currentCharacter === '!') {
            return this.scanCharacterSequence(currentCharacter, ['!==', '!=']);
        }

        return this.scanWord(currentCharacter);
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
        } while(currentChar == ' ');
        return currentChar;
    };

    AS3Scanner.prototype.isIdentifierCharacter = function (currentCharacter) {
        return currentCharacter >= 'A' && currentCharacter <= 'Z' || currentCharacter >= 'a' && currentCharacter <= 'z' || currentCharacter >= '0' && currentCharacter <= '9' || currentCharacter === '_' || currentCharacter === '$';
    };

    AS3Scanner.prototype.isProcessingInstruction = function (text) {
        return text.indexOf('<?') === 0;
    };

    AS3Scanner.prototype.isValidRegExp = function (pattern) {
        try  {
            new RegExp(pattern);
        } catch (e) {
            if (e instanceof SyntaxError) {
                return false;
            }
        }
        return true;
    };

    AS3Scanner.prototype.nextChar = function () {
        var currentLine = this.lines[this.line];

        this.column++;
        if (currentLine.length <= this.column) {
            this.column = -1;
            this.line++;
            return '\n';
        }

        var currentChar = currentLine.charAt(this.column);

        while (currentChar == '\uFEFF') {
            this.column++;
            currentChar = currentLine.charAt(this.column);
        }
        return currentChar;
    };

    AS3Scanner.prototype.nextNonWhitespaceCharacter = function () {
        var result;
        do {
            result = this.nextChar();
        } while(result == ' ' || result == '\t');
        return result;
    };

    AS3Scanner.prototype.peekChar = function (offset) {
        var currentLine = this.lines[this.line];
        var index = this.column + offset;
        if (index == -1) {
            return '\0';
        }
        if (index >= currentLine.length) {
            return '\n';
        }

        return currentLine.charAt(index);
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
        var buffer = new StringBuffer();
        var maxLength = this.computePossibleMatchesMaxLength(possibleMatches);

        buffer.append(currentCharacter);
        var found = buffer.toString();
        while (peekPos < maxLength) {
            buffer.append(this.peekChar(peekPos));
            peekPos++;
            for (var i = 0; i < possibleMatches.length; i++) {
                var possibleMatche = possibleMatches[i];
                if (buffer.toString() === possibleMatche) {
                    found = buffer.toString();
                }
            }
        }
        var result = new Token(found, this.line, this.column);
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
            result = new Token('/=', this.line, this.column);
            this.skipChars(1);
            return result;
        }
        result = new Token('/', this.line, this.column);
        return result;
    };

    /**
    * c is either a dot or a number
    *
    * @return
    */
    AS3Scanner.prototype.scanDecimal = function (currentCharacter) {
        var currentChar = currentCharacter;
        var buffer = new StringBuffer();
        var peekPos = 1;

        while (isDecimalChar(currentChar)) {
            buffer.append(currentChar);
            currentChar = this.peekChar(peekPos++);
        }

        if (currentChar == '.') {
            buffer.append(currentChar);
            currentChar = this.peekChar(peekPos++);

            while (isDecimalChar(currentChar)) {
                buffer.append(currentChar);
                currentChar = this.peekChar(peekPos++);
            }

            if (currentChar == 'E') {
                buffer.append(currentChar);
                currentChar = this.peekChar(peekPos++);
                while (isDecimalChar(currentChar)) {
                    buffer.append(currentChar);
                    currentChar = this.peekChar(peekPos++);
                }
            }
        }
        var result = new Token(buffer.toString(), this.line, this.column, true);
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
            var result = new Token(text, this.line, this.column);

            this.skipChars(text.length - 1);

            return result;
        } else if (secondCharacter == '<') {
            var result = new Token('.<', this.line, this.column);

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
        var buffer = new StringBuffer();

        buffer.append('0x');
        var peekPos = 2;
        for (; ;) {
            var character = this.peekChar(peekPos++);

            if (!this.isHexChar(character)) {
                break;
            }
            buffer.append(character);
        }
        var result = new Token(buffer.toString(), this.line, this.column, true);
        this.skipChars(result.text.length - 1);
        return result;
    };

    /**
    * the current string is the first slash plus we know, that a * is following
    *
    * @return
    */
    AS3Scanner.prototype.scanMultiLineComment = function () {
        var buffer = new StringBuffer();
        var currentCharacter = ' ';
        var previousCharacter = ' ';

        buffer.append('/*');
        this.skipChar();
        do {
            previousCharacter = currentCharacter;
            currentCharacter = this.nextChar();
            buffer.append(currentCharacter);
        } while(currentCharacter != '0' && !(currentCharacter === '/' && previousCharacter == '*'));

        return new Token(buffer.toString(), this.line, this.column);
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
                return new Token('.', this.line, this.column);
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
        return new Token(character, this.line, this.column);
    };

    /**
    * the current string is the first slash plus we know, that another slash is
    * following
    *
    * @return
    */
    AS3Scanner.prototype.scanSingleLineComment = function () {
        var result = new Token(this.lines[this.line].substring(this.column), this.line, this.column);
        this.skipChars(result.text.length - 1);
        return result;
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
        var buffer = new StringBuffer();
        var peekPos = 1;
        var numberOfBackslashes = 0;

        buffer.append(start);

        for (; ;) {
            var currentCharacter = this.peekChar(peekPos++);
            if (currentCharacter === '\n') {
                return null;
            }
            buffer.append(currentCharacter);
            if (currentCharacter === delimiter && numberOfBackslashes == 0) {
                var result = Token.create(buffer.toString(), this.line, this.column);
                this.skipChars(buffer.toString().length - 1);
                return result;
            }
            numberOfBackslashes = currentCharacter === '\\' ? (numberOfBackslashes + 1) % 2 : 0;
        }
    };

    AS3Scanner.prototype.scanWord = function (startingCharacter) {
        var currentChar = startingCharacter;
        var buffer = new StringBuffer();

        buffer.append(currentChar);
        var peekPos = 1;
        for (; ;) {
            currentChar = this.peekChar(peekPos++);
            if (!this.isIdentifierCharacter(currentChar)) {
                break;
            }

            buffer.append(currentChar);
        }
        var result = new Token(buffer.toString(), this.line, this.column);
        this.skipChars(buffer.toString().length - 1);
        return result;
    };

    /**
    * Try to parse a XML document
    *
    * @return
    */
    AS3Scanner.prototype.scanXML = function () {
        var currentLine = this.line;
        var currentColumn = this.column;
        var level = 0;
        var buffer = new StringBuffer();
        var currentCharacter = '<';

        for (; ;) {
            var currentToken = null;
            do {
                currentToken = this.scanUntilDelimiter('<', '>');
                if (currentToken == null) {
                    this.line = currentLine;
                    this.column = currentColumn;
                    return null;
                }
                buffer.append(currentToken.text);
                if (this.isProcessingInstruction(currentToken.text)) {
                    currentCharacter = this.nextChar();
                    if (currentCharacter === '\n') {
                        buffer.append('\n');
                        this.skipChar();
                    }
                    currentToken = null;
                }
            } while(currentToken == null);

            if (currentToken.text.indexOf('</') === 0) {
                level--;
            } else if (!endsWith(currentToken.text, '/>') && currentToken.text !== '<>') {
                level++;
            }

            if (level <= 0) {
                return new Token(buffer.toString(), this.line, this.column);
            }

            for (; ;) {
                currentCharacter = this.nextChar();
                if (currentCharacter === '<') {
                    break;
                }
                buffer.append(currentCharacter);
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
