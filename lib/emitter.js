var NodeKind = require('./nodeKind');

function assign(target) {
    var items = [];
    for (var _i = 0; _i < (arguments.length - 1); _i++) {
        items[_i] = arguments[_i + 1];
    }
    return items.reduce(function (target, source) {
        return Object.keys(source).reduce(function (target, key) {
            target[key] = source[key];
            return target;
        }, target);
    }, target);
}

var defaultEmitterOptions = {
    lineSeparator: '\n'
};

function filterAST(node) {
    //we don't care about comment
    node.children = node.children.filter(function (child) {
        return child && child.kind !== NodeKind.AS_DOC && child.kind !== NodeKind.MULTI_LINE_COMMENT;
    });

    node.children.forEach(function (child) {
        filterAST(child);
    });
}

var Emitter = (function () {
    function Emitter(ast, content, options) {
        this.content = content;
        this.index = 0;
        this.output = '';
        this.options = assign(defaultEmitterOptions, options || {});
        this.ast = ast;
        filterAST(this.ast);
    }
    Emitter.prototype.emit = function () {
        this.visitNode(this.ast);
        this.catchup(this.content.length - 1);
        return this.output;
    };

    Emitter.prototype.visitNodes = function (nodes) {
        var _this = this;
        if (!nodes) {
            return;
        }
        nodes.forEach(function (node) {
            return _this.visitNode(node);
        });
    };

    Emitter.prototype.visitNode = function (node) {
        if (!node) {
            return;
        }
        switch (node.kind) {
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
    };

    Emitter.prototype.emitPackage = function (node) {
        this.catchup(node.start);
        this.skip(NodeKind.PACKAGE.length);
        this.insert('module');
        this.visitNodes(node.children);
    };

    Emitter.prototype.emitMeta = function (node) {
        this.catchup(node.start);
        this.commentNode(node, false);
    };

    Emitter.prototype.emitInclude = function (node) {
        this.catchup(node.start);
        this.commentNode(node, true);
    };

    Emitter.prototype.emitImport = function (node) {
        this.catchup(node.start + NodeKind.IMPORT.length + 1);
        var split = node.text.split('.');
        this.insert(split[split.length - 1] + ' = ');
        this.catchup(node.end);
    };

    Emitter.prototype.emitInterface = function (node) {
        var _this = this;
        this.emitDeclaration(node);

        //we'll catchup the other part
        var content = node.findChild(NodeKind.CONTENT);
        var contentsNode = content && content.children;
        var foundVariables = {};
        if (contentsNode) {
            contentsNode.forEach(function (node) {
                _this.visitNode(node.findChild(NodeKind.META_LIST));
                _this.catchup(node.start);
                if (node.kind === NodeKind.FUNCTION) {
                    _this.skip(8);
                } else if (node.kind === NodeKind.GET || node.kind === NodeKind.SET) {
                    var name = node.findChild(NodeKind.NAME), paramerterList = node.findChild(NodeKind.PARAMETER_LIST);
                    if (!foundVariables[name.text]) {
                        _this.skipTo(name.start);
                        _this.catchup(name.end);
                        foundVariables[name.text] = true;
                        if (node.kind === NodeKind.GET) {
                            _this.skipTo(paramerterList.end);
                            var type = node.findChild(NodeKind.TYPE);
                            if (type) {
                                _this.emitType(type);
                            }
                        } else if (node.kind === NodeKind.SET) {
                            var setParam = paramerterList.findChild(NodeKind.PARAMETER).children[0];
                            _this.skipTo(setParam.findChild(NodeKind.NAME).end);
                            var type = setParam.findChild(NodeKind.TYPE);
                            if (type) {
                                _this.emitType(type);
                            }
                            _this.skipTo(node.end);
                        }
                    } else {
                        _this.commentNode(node, true);
                    }
                } else {
                    //include or import in interface content not supported
                    _this.commentNode(node, true);
                }
            });
        }
    };

    Emitter.prototype.emitFunction = function (node) {
        this.emitDeclaration(node);
        var rest = node.getChildFrom(NodeKind.MOD_LIST);
        this.visitNodes(rest);
    };

    Emitter.prototype.emitClass = function (node) {
        var _this = this;
        this.emitDeclaration(node);
        var content = node.findChild(NodeKind.CONTENT);
        var contentsNode = content && content.children;
        if (contentsNode) {
            contentsNode.forEach(function (node) {
                _this.visitNode(node.findChild(NodeKind.META_LIST));
                _this.catchup(node.start);
                switch (node.kind) {
                    case NodeKind.SET:
                        _this.emitSet(node);
                        break;
                    case NodeKind.GET:
                    case NodeKind.FUNCTION:
                        _this.emitMethod(node);
                        break;
                    case NodeKind.VAR_LIST:
                        _this.emitPropertyDecl(node);
                        break;
                    case NodeKind.CONST_LIST:
                        _this.emitPropertyDecl(node, true);
                        break;
                    default:
                        _this.visitNode(node);
                }
            });
        }
    };

    Emitter.prototype.emitSet = function (node) {
        this.emitClassField(node);
        var name = node.findChild(NodeKind.NAME);
        this.consume('function', name.start);
        var params = node.findChild(NodeKind.PARAMETER_LIST);
        this.visitNode(params);
        this.catchup(params.end);
        var type = node.findChild(NodeKind.TYPE);
        if (type) {
            this.skipTo(type.end);
        }
        this.visitNodes(node.getChildFrom(NodeKind.TYPE));
    };

    Emitter.prototype.emitMethod = function (node) {
        this.emitClassField(node);
        var name = node.findChild(NodeKind.NAME);
        this.consume('function', name.start);
        this.catchup(name.end);
        this.visitNodes(node.getChildFrom(NodeKind.NAME));
    };

    Emitter.prototype.emitPropertyDecl = function (node, isConst) {
        if (typeof isConst === "undefined") { isConst = false; }
        this.emitClassField(node);
        var name = node.findChild(NodeKind.NAME_TYPE_INIT);
        this.consume(isConst ? 'const' : 'var', name.start);
        this.visitNode(name);
    };

    Emitter.prototype.emitClassField = function (node) {
        var _this = this;
        var mods = node.findChild(NodeKind.MOD_LIST);
        if (mods) {
            this.catchup(mods.start);
            mods.children.forEach(function (node) {
                _this.catchup(node.start);
                if (node.text !== 'private' && node.text !== 'public' && node.text !== 'static') {
                    _this.commentNode(node, false);
                }
                _this.catchup(node.end);
            });
        }
    };

    Emitter.prototype.emitDeclaration = function (node) {
        var _this = this;
        this.catchup(node.start);
        this.visitNode(node.findChild(NodeKind.META_LIST));
        var mods = node.findChild(NodeKind.MOD_LIST);
        if (mods && mods.children.length) {
            this.catchup(mods.start);
            var insertExport = false;
            mods.children.forEach(function (node) {
                if (node.text !== 'private') {
                    insertExport = true;
                }
                _this.skipTo(node.end);
            });
            if (insertExport) {
                this.insert('export');
            }
        }
    };

    Emitter.prototype.emitType = function (node) {
        this.catchup(node.start);
        this.skip(node.text.length);
        var type;
        switch (node.text) {
            case 'String':
                type = 'string';
                break;
            case 'Boolean':
                type = 'boolean';
                break;
            case 'Number':
            case 'int':
            case 'uint':
                type = 'number';
                break;
            case '*':
                type = 'any';
                break;
            case 'Array':
                type = 'any[]';
                break;
            default:
                type = node.text;
        }
        this.insert(type);
    };

    Emitter.prototype.emitVector = function (node) {
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
    };

    Emitter.prototype.emitNew = function (node) {
        this.catchup(node.start);
        this.isNew = true;
        this.visitNodes(node.children);
        this.isNew = false;
    };

    Emitter.prototype.emitCall = function (node) {
        this.catchup(node.start);
        var isNew = this.isNew;
        this.isNew = false;
        if (node.children[0].kind === NodeKind.VECTOR) {
            if (isNew) {
                var vector = node.children[0];
                this.catchup(vector.start);
                this.insert('Array');
                this.insert('<');
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
    };

    Emitter.prototype.emitRelation = function (node) {
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
        this.visitNodes(node.children);
    };

    Emitter.prototype.emitOp = function (node) {
        this.catchup(node.start);
        if (node.text === "is") {
            this.insert('instanceof');
            this.skipTo(node.end);
            return;
        }
        this.catchup(node.end);
    };

    Emitter.prototype.emitForeach = function (node) {
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
    };

    Emitter.prototype.commentNode = function (node, catchSemi) {
        this.insert('/*');
        this.catchup(node.end);
        var index = this.index;
        if (catchSemi) {
            while (true) {
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
    };
    Emitter.prototype.catchup = function (index) {
        if (index < this.index) {
            return;
        }
        while (this.index !== index) {
            this.output += this.content[this.index];
            this.index++;
        }
    };

    Emitter.prototype.skipTo = function (index) {
        this.index = index;
    };

    Emitter.prototype.skip = function (number) {
        this.index += number;
    };

    Emitter.prototype.insert = function (string) {
        this.output += string;
    };

    Emitter.prototype.consume = function (string, limit) {
        var index = this.content.indexOf(string, this.index) + string.length;
        if (index > limit || index < this.index) {
            throw new Error('invalid consume');
        }
        this.index = index;
    };
    return Emitter;
})();

module.exports = Emitter;
