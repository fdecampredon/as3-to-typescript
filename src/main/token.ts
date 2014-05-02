class Token {
    constructor(
        public text: string, 
        public index: number, 
        public isNumeric = false
    ) {  }
    
    get end() {
        return this.index + this.text.length;
    }

}

export = Token;