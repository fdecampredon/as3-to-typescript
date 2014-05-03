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
            case NodeKind.VECTOR:
                this.emitVector(node);
                break;
            case NodeKind.TYPE:
                this.emitType(node);
                break;
            case NodeKind.CALL:
                this.emitCall(node);
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
        this.commentNode(node);
    };

    Emitter.prototype.emitImport = function (node) {
        this.catchup(node.start + NodeKind.IMPORT.length + 1);
        var split = node.text.split('.');
        this.insert(split[split.length - 1] + ' = ');
        this.catchup(node.end);
    };

    Emitter.prototype.emitInterface = function (node) {
        var _this = this;
        this.emitTopLevelType(node);

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
                        _this.commentNode(node);
                    }
                } else {
                    //include or import in interface content not supported
                    _this.commentNode(node, true);
                }
            });
        }
    };

    Emitter.prototype.emitFunction = function (node) {
        this.emitTopLevelType(node);
        var rest = node.getChildFrom(NodeKind.MOD_LIST);
        this.visitNodes(rest);
    };

    Emitter.prototype.emitTopLevelType = function (node) {
        var _this = this;
        this.catchup(node.start);
        this.visitNode(node.findChild(NodeKind.META_LIST));
        var mods = node.findChild(NodeKind.MOD_LIST);
        if (mods) {
            this.catchup(mods.start);
            var insertExport = false;
            mods.children.forEach(function (node) {
                if (node.text !== 'private') {
                    _this.insert('export');
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

    Emitter.prototype.emitCall = function (node) {
        this.catchup(node.start);
        if (node.children[0].kind === NodeKind.VECTOR) {
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

    Emitter.prototype.commentNode = function (node, catchSemi) {
        if (typeof catchSemi === "undefined") { catchSemi = true; }
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
    return Emitter;
})();

module.exports = Emitter;
