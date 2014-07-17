
class Node {
    constructor (
        public kind: string, 
        public start: number,
        public end: number,
        public text?: string,
        public children?: Node[],
        public parent? :Node
    ) {
        if (!this.children) {
            this.children = []
        }
    }
    
    findChild(type: string): Node {
        for (var i = 0; i< this.children.length;i++) {
            if (this.children[i].kind === type) {
                return this.children[i]
            }
        }
        return null;
    }
    
    findChildren(type: string): Node[] {
        return this.children.filter(child => child.kind === type);
    }
    
    getChildFrom(type: string) {
        var child = this.findChild(type);
        if (!child) {
            return this.children.slice(0)
        } else {
            var index = this.children.indexOf(child);
            return this.children.slice(index + 1);
        }
    }
    
    getChildUntil(type: string) {
        var child = this.findChild(type);
        if (!child) {
            return this.children.splice(0)
        } else {
            var index = this.children.indexOf(child);
            return this.children.slice(0, index);
        }
    }
    
    get lastChild(): Node {
        return this.children[this.children.length -1];
    }
}

export = Node;