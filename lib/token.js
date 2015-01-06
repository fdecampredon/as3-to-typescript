var Token = (function () {
    function Token(text, index, isNumeric, isXML) {
        if (isNumeric === void 0) { isNumeric = false; }
        if (isXML === void 0) { isXML = false; }
        this.text = text;
        this.index = index;
        this.isNumeric = isNumeric;
        this.isXML = isXML;
    }
    Object.defineProperty(Token.prototype, "end", {
        get: function () {
            return this.index + this.text.length;
        },
        enumerable: true,
        configurable: true
    });
    return Token;
})();
module.exports = Token;
