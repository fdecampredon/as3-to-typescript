class StringBuffer {
    text: string = '';
    append(text: string) {
        this.text += text;
    }

    toString() {
        return this.text
    }
}
export = StringBuffer