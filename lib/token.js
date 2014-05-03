var Token = (function () {
    function Token(text, index, isNumeric) {
        if (typeof isNumeric === "undefined") { isNumeric = false; }
        this.text = text;
        this.index = index;
        this.isNumeric = isNumeric;
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
