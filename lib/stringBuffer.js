var StringBuffer = (function () {
    function StringBuffer() {
        this.text = '';
    }
    StringBuffer.prototype.append = function (text) {
        this.text += text;
    };

    StringBuffer.prototype.toString = function () {
        return this.text;
    };
    return StringBuffer;
})();
module.exports = StringBuffer;
