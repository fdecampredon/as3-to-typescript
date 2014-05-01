class Token {
    public static create(textContent: string, tokenLine: number, tokenColumn: number): Token {
        return new Token(textContent, tokenLine, tokenColumn);
    }

    public column: number;
    public isNumeric: boolean;
    public line: number;
    public text: string;

    /**
     * @param textContent
     * @param tokenLine
     * @param tokenColumn
     */
    constructor(textContent: string, tokenLine: number, tokenColumn: number, isNumeric = false) {
        this.text = textContent;
        this.line = tokenLine + 1;
        this.column = tokenColumn + 1;
        this.isNumeric = isNumeric;
    }


    /**
     * @return
     */
    public getColumn(): number {
        return this.column;
    }

    /**
     * @return
     */
    public getLine(): number {
        return this.line;
    }

    /**
     * @return
     */
    public getText(): string {
        return this.text;
    }

    /**
     * @return
     */
    public isNum(): boolean {
        return this.isNumeric;
    }
}

export = Token;