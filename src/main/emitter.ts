
import Token = require('./token');
import NodeKind = require('./nodeKind');
import Operators = require('./operators');
import KeyWords = require('./keywords');
import Node = require('./node');


function assign(target: any, ...items: any[]): any {
    return items.reduce(function (target: any, source: any) {
        return Object.keys(source).reduce((target: any, key: string) => {
            target[key] = source[key];
            return target;
        }, target);
    }, target);
}



var defaultEmitterOptions = {
    lineSeparator: '\n'
}

function filterAST(node:Node): void {
    //we don't care about comment
    node.children = node.children.filter(
        child  => child && 
            child.kind !== NodeKind.AS_DOC && 
            child.kind !== NodeKind.MULTI_LINE_COMMENT
    );
    
    node.children.forEach(child => {
        filterAST(child);
    });
}

class Emitter {
    private index: number = 0;
    private output: string = '';
    private options: Emitter.EmitterOptions;
    private ast: Node;
    
    constructor(
        ast: Node,
        private content: string,
        options?: Emitter.EmitterOptions
    ) {
        this.options = assign(defaultEmitterOptions, options || {});
        this.ast = ast;
        filterAST(this.ast);
    }
    
    
    public emit() {
        this.visitNode(this.ast);
        this.catchup(this.content.length -1);
        return this.output;
    }
    
    private visitNodes(nodes: Node[]) {
        if (!nodes) {
            return;
        }
        nodes.forEach(node =>  this.visitNode(node));
    }
    
    private visitNode(node: Node) {
        if (!node) {
            return;
        }
        switch(node.kind) {
            case NodeKind.PACKAGE:
                this.emitPackage(node);
                break;
            case NodeKind.META:
                this.emitMeta(node);
                break;
            case NodeKind.IMPORT:
                this.emitImport(node);
                break;
            case NodeKind.INCLUDE:
                this.emitInclude(node);
                break;
            /*case NodeKind.FUNCTION:
                this.emitFunction(node);
                break;*/
            case NodeKind.INTERFACE:
                this.emitInterface(node);
                break;
            default:
                this.catchup(node.start);
                this.visitNodes(node.children);
                break;
        }
    }
    
    private emitPackage(node: Node) {
        this.catchup(node.start);
        this.skip(NodeKind.PACKAGE.length);
        this.insert('module');
        this.visitNodes(node.children);
    }
    
    private emitMeta(node: Node) {
        this.catchup(node.start);
        this.commentNode(node, false);
    }
    
    private emitInclude(node: Node) {
        this.catchup(node.start);
        this.commentNode(node);
    }
    
    private emitImport(node: Node) {
        this.catchup(node.start + NodeKind.IMPORT.length + 1);
        var split = node.text.split('.');
        this.insert(split[split.length -1] + ' = ');
        this.catchup(node.end);
    }
    
    private emitInterface(node: Node) {
        this.catchup(node.start);
        this.visitNode(node.findChild(NodeKind.META_LIST));
        
        var mods = node.findChild(NodeKind.MOD_LIST);
        if (mods) {
            this.catchup(mods.start);
            var insertExport = false;
            mods.children.forEach(node => {
                if (node.text !== 'private') {
                    this.insert('export');
                }  
                this.skipTo(node.end);
            }) 
            if (insertExport) {
                this.insert('export');
            }
        }
       
        
        //we'll catchup the other part
        var content = node.findChild(NodeKind.CONTENT)
        var contentsNode = content && content.children;
        var foundVariables: { [name: string]: boolean } = {};
        if (contentsNode) {
            contentsNode.forEach(node => {
                this.catchup(node.start);
                if (node.kind === NodeKind.FUNCTION) {
                    this.skip(8);
                } else if (node.kind === NodeKind.GET || node.kind === NodeKind.SET) {
                    var name = node.findChild(NodeKind.NAME),
                        paramerterList = node.findChild(NodeKind.PARAMETER_LIST); 
                    if (!foundVariables[name.text]) {
                        this.skipTo(name.start);
                        this.catchup(name.end);
                        foundVariables[name.text] = true;
                        if (node.kind === NodeKind.GET) {
                            this.skipTo(paramerterList.end);
                            //this.skip(1);
                            var type = node.findChild(NodeKind.TYPE);
                            if (type) {
                                this.emitType(type);
                            }
                        } else if (node.kind === NodeKind.SET) {
                            var setParam = paramerterList
                                .findChild(NodeKind.PARAMETER).children[0];
                            this.skipTo(setParam.findChild(NodeKind.NAME).end)
                            var type = setParam.findChild(NodeKind.TYPE);
                            if (type) {
                                this.emitType(type);
                            }
                            this.skipTo(node.end);
                        }
                    } else {
                        this.commentNode(node);
                    }
                } else {
                    //include or import in interface content not supported
                    this.commentNode(node, true);
                }
            })
        }
    }
    
    private emitType(node: Node) {
        this.catchup(node.start);
        this.skip(node.text.length);
        var type: string;
        switch(node.text) {
            case 'String':
                type = 'string'
                break;
            case 'Boolean': 
                type= 'boolean'
                break;
            case 'Number':
            case 'int':
            case 'uint':
                type = 'number'
                break;
            case '*':
                type = 'any'
                break;
            case 'Array':
                type = 'any[]'
                break;
            default:
                type = node.text;
        }
        this.insert(type);
    }
    
    private commentNode(node: Node, catchSemi = true) {
        this.insert('/*');
        this.catchup(node.end);
        var index = this.index;
        if (catchSemi) {
            while(true) {
                if (this.content[index] === '\n') {
                    this.catchup(index);
                    break;
                }
                if (this.content[index] === ';') {
                    this.catchup(index + 1);
                    break;
                }
                index++;
            }
        }
        this.insert( '*/'); 
    }
    private catchup(index: number) {
        if (index < this.index) {
            return;
        }
        while (this.index !== index) {
            this.output+= this.content[this.index];
            this.index++;
        }
    }
    
    private skipTo(index: number) {
        this.index = index;
    }
    
    private skip(number: number) {
        this.index += number;
    }
    
    
    private insert(string: string) {
        this.output += string;
    }
    

}

module Emitter {
    export interface EmitterOptions {
        lineSeparator: string;
    }
}

export = Emitter;