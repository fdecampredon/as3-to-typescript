var NodeKind = require('./nodeKind');

//Utils
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
    return node;
}

var data;

var state;

var output;

function emit(ast, source, options) {
    data = {
        ast: filterAST(ast),
        source: source,
        options: assign(defaultEmitterOptions, options || {})
    };
    Object.freeze(data);

    state = {
        index: 0,
        currentClassName: '',
        scope: null,
        isNew: false
    };
    output = '';

    enterScope([]);
    visitNode(ast);
    catchup(data.source.length - 1);
    exitScope();
    return output;
}
exports.emit = emit;

function visitNodes(nodes) {
    if (!nodes) {
        return;
    }
    nodes.forEach(function (node) {
        return visitNode(node);
    });
}

function visitNode(node) {
    if (!node) {
        return;
    }
    switch (node.kind) {
        case NodeKind.PACKAGE:
            emitPackage(node);
            break;
        case NodeKind.META:
            emitMeta(node);
            break;
        case NodeKind.IMPORT:
            emitImport(node);
            break;
        case NodeKind.USE:
        case NodeKind.INCLUDE:
            emitInclude(node);
            break;
        case NodeKind.FUNCTION:
            emitFunction(node);
            break;
        case NodeKind.INTERFACE:
            emitInterface(node);
            break;
        case NodeKind.CLASS:
            emitClass(node);
            break;
        case NodeKind.VECTOR:
            emitVector(node);
            break;
        case NodeKind.TYPE:
            emitType(node);
            break;
        case NodeKind.CALL:
            emitCall(node);
            break;
        case NodeKind.NEW:
            emitNew(node);
            break;
        case NodeKind.RELATION:
            emitRelation(node);
            break;
        case NodeKind.OP:
            emitOp(node);
            break;
        case NodeKind.FOREACH:
            emitForeach(node);
            break;
        default:
            catchup(node.start);
            visitNodes(node.children);
            break;
    }
}

function emitPackage(node) {
    catchup(node.start);
    skip(NodeKind.PACKAGE.length);
    insert('module');
    visitNodes(node.children);
}

function emitMeta(node) {
    catchup(node.start);
    commentNode(node, false);
}

function emitInclude(node) {
    catchup(node.start);
    commentNode(node, true);
}

function emitImport(node) {
    catchup(node.start + NodeKind.IMPORT.length + 1);
    var split = node.text.split('.');
    var name = split[split.length - 1];
    insert(name + ' = ');
    catchup(node.end);
    state.scope.declarations.push({ name: name });
}

function emitInterface(node) {
    emitDeclaration(node);

    //we'll catchup the other part
    state.scope.declarations.push({ name: node.findChild(NodeKind.NAME).text });
    var content = node.findChild(NodeKind.CONTENT);
    var contentsNode = content && content.children;
    var foundVariables = {};
    if (contentsNode) {
        contentsNode.forEach(function (node) {
            visitNode(node.findChild(NodeKind.META_LIST));
            catchup(node.start);
            if (node.kind === NodeKind.FUNCTION) {
                skip(8);
            } else if (node.kind === NodeKind.GET || node.kind === NodeKind.SET) {
                var name = node.findChild(NodeKind.NAME), paramerterList = node.findChild(NodeKind.PARAMETER_LIST);
                if (!foundVariables[name.text]) {
                    skipTo(name.start);
                    catchup(name.end);
                    foundVariables[name.text] = true;
                    if (node.kind === NodeKind.GET) {
                        skipTo(paramerterList.end);
                        var type = node.findChild(NodeKind.TYPE);
                        if (type) {
                            emitType(type);
                        }
                    } else if (node.kind === NodeKind.SET) {
                        var setParam = paramerterList.findChild(NodeKind.PARAMETER).children[0];
                        skipTo(setParam.findChild(NodeKind.NAME).end);
                        var type = setParam.findChild(NodeKind.TYPE);
                        if (type) {
                            emitType(type);
                        }
                        skipTo(node.end);
                    }
                } else {
                    commentNode(node, true);
                }
            } else {
                //include or import in interface content not supported
                commentNode(node, true);
            }
        });
    }
}

function emitFunction(node) {
    emitDeclaration(node);
    enterFunctionScope(node);
    var rest = node.getChildFrom(NodeKind.MOD_LIST);
    exitScope();
    visitNodes(rest);
}

function emitClass(node) {
    emitDeclaration(node);
    var name = node.findChild(NodeKind.NAME);
    state.currentClassName = name.text;
    var content = node.findChild(NodeKind.CONTENT);
    var contentsNode = content && content.children;
    if (contentsNode) {
        //collects declarations
        enterClassScope(contentsNode);
        contentsNode.forEach(function (node) {
            visitNode(node.findChild(NodeKind.META_LIST));
            catchup(node.start);
            switch (node.kind) {
                case NodeKind.SET:
                    emitSet(node);
                    break;
                case NodeKind.GET:
                case NodeKind.FUNCTION:
                    emitMethod(node);
                    break;
                case NodeKind.VAR_LIST:
                    emitPropertyDecl(node);
                    break;
                case NodeKind.CONST_LIST:
                    emitPropertyDecl(node, true);
                    break;
                default:
                    visitNode(node);
            }
        });
        exitScope();
    }
    state.currentClassName = null;
}

function emitSet(node) {
    emitClassField(node);
    var name = node.findChild(NodeKind.NAME);
    consume('function', name.start);
    var params = node.findChild(NodeKind.PARAMETER_LIST);
    visitNode(params);
    catchup(params.end);
    var type = node.findChild(NodeKind.TYPE);
    if (type) {
        skipTo(type.end);
    }
    visitNodes(node.getChildFrom(NodeKind.TYPE));
}

function emitMethod(node) {
    var name = node.findChild(NodeKind.NAME);
    if (node.kind !== NodeKind.FUNCTION || name.text !== state.currentClassName) {
        emitClassField(node);
        consume('function', name.start);
        catchup(name.end);
    } else {
        var mods = node.findChild(NodeKind.MOD_LIST);
        if (mods) {
            catchup(mods.start);
        }
        insert('constructor');
        skipTo(name.end);
    }
    enterFunctionScope(node);
    visitNodes(node.getChildFrom(NodeKind.NAME));
}

function emitPropertyDecl(node, isConst) {
    if (typeof isConst === "undefined") { isConst = false; }
    emitClassField(node);
    var name = node.findChild(NodeKind.NAME_TYPE_INIT);
    consume(isConst ? 'const' : 'var', name.start);
    visitNode(name);
}

function emitClassField(node) {
    var mods = node.findChild(NodeKind.MOD_LIST);
    if (mods) {
        catchup(mods.start);
        mods.children.forEach(function (node) {
            catchup(node.start);
            if (node.text !== 'private' && node.text !== 'public' && node.text !== 'static') {
                commentNode(node, false);
            }
            catchup(node.end);
        });
    }
}

function emitDeclaration(node) {
    catchup(node.start);
    visitNode(node.findChild(NodeKind.META_LIST));
    var mods = node.findChild(NodeKind.MOD_LIST);
    if (mods && mods.children.length) {
        catchup(mods.start);
        var insertExport = false;
        mods.children.forEach(function (node) {
            if (node.text !== 'private') {
                insertExport = true;
            }
            skipTo(node.end);
        });
        if (insertExport) {
            insert('export');
        }
    }
}

function emitType(node) {
    catchup(node.start);
    skip(node.text.length);
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
    insert(type);
}

function emitVector(node) {
    catchup(node.start);
    var type = node.findChild(NodeKind.TYPE);
    if (type) {
        skipTo(type.start);
        emitType(type);
        insert('[]');
    } else {
        insert('any[]');
    }
    skipTo(node.end);
}

function emitNew(node) {
    catchup(node.start);
    state.isNew = true;
    visitNodes(node.children);
    state.isNew = false;
}

function emitCall(node) {
    catchup(node.start);
    var isNew = isNew;
    isNew = false;
    if (node.children[0].kind === NodeKind.VECTOR) {
        if (isNew) {
            var vector = node.children[0];
            catchup(vector.start);
            insert('Array');
            insert('<');
            var type = vector.findChild(NodeKind.TYPE);
            if (type) {
                skipTo(type.start);
                emitType(type);
            } else {
                insert('any');
            }
            skipTo(vector.end);
            insert('>');
            visitNodes(node.getChildFrom(NodeKind.VECTOR));
            return;
        }

        var args = node.findChild(NodeKind.ARGUMENTS);

        //vector conversion lets just cast to array
        if (args.children.length === 1) {
            insert('(<');
            emitVector(node.children[0]);
            insert('>');
            skipTo(args.children[0].start);
            visitNode(args.children[0]);
            catchup(node.end);
            return;
        }
    }
    visitNodes(node.children);
}

function emitRelation(node) {
    catchup(node.start);
    var as = node.findChild(NodeKind.AS);
    if (as) {
        if (node.lastChild.kind === NodeKind.PRIMARY) {
            insert('<');
            insert(node.lastChild.text);
            insert('>');
            visitNodes(node.getChildUntil(NodeKind.AS));
            catchup(as.start);
            skipTo(node.end);
        } else {
            commentNode(node, false);
        }
        return;
    }
    visitNodes(node.children);
}

function emitOp(node) {
    catchup(node.start);
    if (node.text === "is") {
        insert('instanceof');
        skipTo(node.end);
        return;
    }
    catchup(node.end);
}

function emitForeach(node) {
    catchup(node.start);
    commentNode(node, false);
    /*catchup(node.start);
    insert('for');
    skip(4);
    var name  = node.findChild(NodeKind.NAME);
    if (name) {
    consume('each', name.start);
    catchup(name.start);
    skipTo(name.end);
    insert('var key');
    
    var inNode = node.findChild(NodeKind.IN),
    arrayText = node.children[0].text,
    block = node.findChild(NodeKind.BLOCK);
    
    catchup(block.start);
    consume('{', block.children[0].start);
    insert('{\n' + name.text + ' = ' + arrayText + '[' + 'key' + ']');
    }
    
    catchup(node.end);*/
}

function enterClassScope(contentsNode) {
    var found = {};

    var declarations = contentsNode.map(function (node) {
        var nameNode;
        var isStatic;

        switch (node.kind) {
            case NodeKind.SET:
            case NodeKind.GET:
            case NodeKind.FUNCTION:
                nameNode = node.findChild(NodeKind.NAME);
                break;
            case NodeKind.VAR_LIST:
            case NodeKind.CONST_LIST:
                nameNode = node.findChild(NodeKind.NAME_TYPE_INIT).findChild(NodeKind.NAME);
                break;
        }
        if (!nameNode || found[nameNode.text]) {
            return null;
        }
        found[nameNode.text] = true;

        var modList = node.findChild(NodeKind.MOD_LIST);
        var isStatic = modList && modList.children.some(function (mod) {
            return mod.text === 'static';
        });
        return {
            name: nameNode.text,
            bound: isStatic ? state.currentClassName : 'this'
        };
    }).filter(function (el) {
        return !!el;
    });

    enterScope(declarations);
}

function enterFunctionScope(node) {
    var block = node.findChild(NodeKind.BLOCK);
    if (!block) {
        enterScope([]);
        return;
    }
    function traverse(node) {
        var result = new Array();
        if (node.kind === NodeKind.VAR_LIST || node.kind === NodeKind.CONST_LIST) {
            result = result.concat(node.findChildren(NodeKind.NAME_TYPE_INIT).map(function (node) {
                return ({ name: node.findChild(NodeKind.NAME).text });
            }));
        }
        if (node.kind !== NodeKind.FUNCTION && node.children && node.children.length) {
            result = Array.prototype.concat.apply(result, node.children.map(traverse));
        }
        return result.filter(function (decl) {
            return !!decl;
        });
    }
    enterScope(traverse(block));
}

function enterScope(decls) {
    state.scope = {
        parent: state.scope,
        declarations: decls,
        get isTopLevel() {
            return !state.scope;
        }
    };
}

function exitScope() {
    state.scope = state.scope && state.scope.parent;
}

function commentNode(node, catchSemi) {
    insert('/*');
    catchup(node.end);
    var index = state.index;
    if (catchSemi) {
        while (true) {
            if (index >= data.source.length) {
                break;
            }
            if (data.source[index] === '\n') {
                catchup(index);
                break;
            }
            if (data.source[index] === ';') {
                catchup(index + 1);
                break;
            }
            index++;
        }
    }
    insert('*/');
}

function catchup(index) {
    if (state.index > index) {
        return;
    }
    while (state.index !== index) {
        output += data.source[state.index];
        state.index++;
    }
}

function skipTo(index) {
    state.index = index;
}

function skip(number) {
    state.index += number;
}

function insert(string) {
    output += string;
}

function consume(string, limit) {
    var index = data.source.indexOf(string, index) + string.length;
    if (index > limit || index < index) {
        throw new Error('invalid consume');
    }
    index = index;
}
