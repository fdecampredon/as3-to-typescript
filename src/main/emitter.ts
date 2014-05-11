
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
    
    //state
    
    private currentClassName: string;
    
    private currenClassMembers: {
        isStatic: boolean;
        name: string;
    }[];
    
    private isNew: boolean;
    
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
            case NodeKind.USE:
            case NodeKind.INCLUDE:
                this.emitInclude(node);
                break;
            case NodeKind.FUNCTION:
                this.emitFunction(node);
                break;
            case NodeKind.INTERFACE:
                this.emitInterface(node);
                break;
            case NodeKind.CLASS:
                this.emitClass(node);
                break;
            case NodeKind.VECTOR:
                this.emitVector(node);
                break;
            case NodeKind.TYPE:
                this.emitType(node);
                break;
            case NodeKind.CALL:
                this.emitCall(node);
                break;
            case NodeKind.NEW:
                this.emitNew(node);
                break;
            case NodeKind.RELATION:
                this.emitRelation(node);
                break;
            case NodeKind.OP:
                this.emitOp(node);
                break;
             case NodeKind.FOREACH:
                this.emitForeach(node);
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
        this.commentNode(node, true);
    }
    
    private emitImport(node: Node) {
        this.catchup(node.start + NodeKind.IMPORT.length + 1);
        var split = node.text.split('.');
        this.insert(split[split.length -1] + ' = ');
        this.catchup(node.end);
    }
    
    private emitInterface(node: Node) {
        this.emitDeclaration(node);
       
        
        //we'll catchup the other part
        var content = node.findChild(NodeKind.CONTENT)
        var contentsNode = content && content.children;
        var foundVariables: { [name: string]: boolean } = {};
        if (contentsNode) {
            contentsNode.forEach(node => {
                this.visitNode(node.findChild(NodeKind.META_LIST));
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
                        this.commentNode(node, true);
                    }
                } else {
                    //include or import in interface content not supported
                    this.commentNode(node, true);
                }
            })
        }
    }
    
    private emitFunction(node: Node) {
        this.emitDeclaration(node);
        var rest = node.getChildFrom(NodeKind.MOD_LIST);
        this.visitNodes(rest);
    }
    
    private emitClass(node: Node) {
        this.emitDeclaration(node);
        var name = node.findChild(NodeKind.NAME);
        this.currentClassName = name.text;
        var content = node.findChild(NodeKind.CONTENT)
        var contentsNode = content && content.children;
        if (contentsNode) {
            this.currenClassMembers = [];
            contentsNode.forEach(node => {
                var name: Node;
                switch (node.kind) {
                    case NodeKind.SET:
                    case NodeKind.GET:
                    case NodeKind.FUNCTION:
                        name = node.findChild(NodeKind.NAME)
                        break;
                    case NodeKind.VAR_LIST:
                        name = node.findChild(NodeKind.VAR_LIST).findChild(NodeKind.NAME_TYPE_INIT).findChild(NodeKind.NAME);
                        break;
                    case NodeKind.CONST_LIST:
                        name = node.findChild(NodeKind.CONST_LIST).findChild(NodeKind.NAME_TYPE_INIT).findChild(NodeKind.NAME);
                        break;
                }
                
                var modList = node.findChild(NodeKind.MOD_LIST);
                var isStatic = modList && 
                    modList.children.some(mod => mod.text === 'static');
               
                this.currenClassMembers.push({
                    isStatic: isStatic,
                    name : name.text
                });
            });
            
            contentsNode.forEach(node => {
                this.visitNode(node.findChild(NodeKind.META_LIST));
                this.catchup(node.start);
                switch (node.kind) {
                    case NodeKind.SET:
                        this.emitSet(node);
                        break;
                    case NodeKind.GET:
                    case NodeKind.FUNCTION:
                        this.emitMethod(node);
                        break;
                    case NodeKind.VAR_LIST:
                        this.emitPropertyDecl(node);
                        break;
                    case NodeKind.CONST_LIST:
                        this.emitPropertyDecl(node, true);
                        break;
                    default:
                        this.visitNode(node);
                }
            })
        }
        this.currentClassName = null;
    }
    
    
    private emitSet(node: Node) {
        this.emitClassField(node);
        var name = node.findChild(NodeKind.NAME);
        this.consume('function', name.start);
        var params = node.findChild(NodeKind.PARAMETER_LIST)
        this.visitNode(params);
        this.catchup(params.end)
        var type = node.findChild(NodeKind.TYPE);
        if (type) {
            this.skipTo(type.end);
        }
        this.visitNodes(node.getChildFrom(NodeKind.TYPE));
    }
    
    private emitMethod(node: Node) {
        var name = node.findChild(NodeKind.NAME);
        if (node.kind !== NodeKind.FUNCTION || name.text !== this.currentClassName) {
            this.emitClassField(node);
            this.consume('function', name.start);
            this.catchup(name.end)
        } else {
            var mods = node.findChild(NodeKind.MOD_LIST);
            if (mods) {
                this.catchup(mods.start);
            }
            this.insert('constructor');
            this.skipTo(name.end)
        }
        this.visitNodes(node.getChildFrom(NodeKind.NAME));
    }
    
    private emitPropertyDecl(node: Node, isConst = false) {
        this.emitClassField(node);
        var name = node.findChild(NodeKind.NAME_TYPE_INIT);
        this.consume(isConst ? 'const': 'var', name.start);
        this.visitNode(name);
    }
    
    private emitClassField(node: Node) {
        var mods = node.findChild(NodeKind.MOD_LIST);
        if (mods) {
            this.catchup(mods.start);
            mods.children.forEach(node => {
                this.catchup(node.start);
                if (node.text !== 'private' && node.text !== 'public' && node.text !== 'static') {
                    this.commentNode(node, false);
                }  
                this.catchup(node.end);
            });
        }
    }
    
    private emitDeclaration(node: Node) {
        this.catchup(node.start);
        this.visitNode(node.findChild(NodeKind.META_LIST));
        var mods = node.findChild(NodeKind.MOD_LIST);
        if (mods && mods.children.length) {
            this.catchup(mods.start);
            var insertExport = false;
            mods.children.forEach(node => {
                if (node.text !== 'private') {
                    insertExport = true;
                }  
                this.skipTo(node.end);
            }) 
            if (insertExport) {
                this.insert('export');
            }
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
    
    private emitVector(node: Node) {
        this.catchup(node.start);
        var type = node.findChild(NodeKind.TYPE);
        if (type) {
            this.skipTo(type.start);
            this.emitType(type);
            this.insert('[]');
        } else {
            this.insert('any[]');
        }
        this.skipTo(node.end);
    }
    
    private emitNew(node:Node) {
        this.catchup(node.start);
        this.isNew = true;
        this.visitNodes(node.children);
        this.isNew = false;
    }
    
    private emitCall(node: Node) {
        this.catchup(node.start);
        var isNew = this.isNew;
        this.isNew = false;
        if (node.children[0].kind === NodeKind.VECTOR) {
            if (isNew) {
                var vector = node.children[0];
                this.catchup(vector.start);
                this.insert('Array');
                this.insert('<')
                var type = vector.findChild(NodeKind.TYPE);
                if (type) {
                    this.skipTo(type.start);
                    this.emitType(type);
                } else {
                    this.insert('any');
                }
                this.skipTo(vector.end);
                this.insert('>');
                this.visitNodes(node.getChildFrom(NodeKind.VECTOR));
                return;
            }
            
            var args = node.findChild(NodeKind.ARGUMENTS);
            //vector conversion lets just cast to array
            if (args.children.length === 1) {
                this.insert('(<');
                this.emitVector(node.children[0]);
                this.insert('>');
                this.skipTo(args.children[0].start);
                this.visitNode(args.children[0]);
                this.catchup(node.end);
                return;
            }
        } 
        this.visitNodes(node.children);
    }
    
    private emitRelation(node: Node) {
        this.catchup(node.start);
        var as = node.findChild(NodeKind.AS);
        if (as) {
            if (node.lastChild.kind === NodeKind.PRIMARY) {
                this.insert('<');
                this.insert(node.lastChild.text);
                this.insert('>');
                this.visitNodes(node.getChildUntil(NodeKind.AS));
                this.catchup(as.start);
                this.skipTo(node.end);
            } else {
                this.commentNode(node, false);
            }
            return;
        }
        this.visitNodes(node.children)
    }
    
    private emitOp(node: Node) {
        this.catchup(node.start);
        if (node.text === "is") {
            this.insert('instanceof');
            this.skipTo(node.end);
            return;
        }
        this.catchup(node.end);
    }
    
    private emitForeach(node: Node) {
        this.catchup(node.start);
        this.commentNode(node, false);
        /*this.catchup(node.start);
        this.insert('for');
        this.skip(4);
        var name  = node.findChild(NodeKind.NAME);
        if (name) {
            this.consume('each', name.start);
            this.catchup(name.start);
            this.skipTo(name.end);
            this.insert('var key');
            
            var inNode = node.findChild(NodeKind.IN),
                arrayText = node.children[0].text,
                block = node.findChild(NodeKind.BLOCK);
            
            this.catchup(block.start);
            this.consume('{', block.children[0].start);
            this.insert('{\n' + name.text + ' = ' + arrayText + '[' + 'key' + ']');
        }
        
        this.catchup(node.end);*/
    }
    
    
    private commentNode(node: Node, catchSemi:boolean) {
        this.insert('/*');
        this.catchup(node.end);
        var index = this.index;
        if (catchSemi) {
            while(true) {
                if (index >= this.content.length) {
                    break;
                }
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
        this.insert('*/'); 
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
    
    private consume(string: string, limit: number) {
        var index = this.content.indexOf(string, this.index) + string.length;
        if (index > limit || index < this.index) {
            throw new Error('invalid consume');
        }
        this.index = index;
    }
}

module Emitter {
    export interface EmitterOptions { }
}

export = Emitter;