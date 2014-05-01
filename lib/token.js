var Token = (function () {
    /**
    * @param textContent
    * @param tokenLine
    * @param tokenColumn
    */
    function Token(textContent, tokenLine, tokenColumn, isNumeric) {
        if (typeof isNumeric === "undefined") { isNumeric = false; }
        this.text = textContent;
        this.line = tokenLine + 1;
        this.column = tokenColumn + 1;
        this.isNumeric = isNumeric;
    }
    Token.create = function (textContent, tokenLine, tokenColumn) {
        return new Token(textContent, tokenLine, tokenColumn);
    };

    /**
    * @return
    */
    Token.prototype.getColumn = function () {
        return this.column;
    };

    /**
    * @return
    */
    Token.prototype.getLine = function () {
        return this.line;
    };

    /**
    * @return
    */
    Token.prototype.getText = function () {
        return this.text;
    };

    /**
    * @return
    */
    Token.prototype.isNum = function () {
        return this.isNumeric;
    };
    return Token;
})();

module.exports = Token;
