/**
*    Copyright (c) 2009, Adobe Systems, Incorporated
*    All rights reserved.
*
*    Redistribution  and  use  in  source  and  binary  forms, with or without
*    modification,  are  permitted  provided  that  the  following  conditions
*    are met:
*
*      * Redistributions  of  source  code  must  retain  the  above copyright
*        notice, this list of conditions and the following disclaimer.
*      * Redistributions  in  binary  form  must reproduce the above copyright
*        notice,  this  list  of  conditions  and  the following disclaimer in
*        the    documentation   and/or   other  materials  provided  with  the
*        distribution.
*      * Neither the name of the Adobe Systems, Incorporated. nor the names of
*        its  contributors  may be used to endorse or promote products derived
*        from this software without specific prior written permission.
*
*    THIS  SOFTWARE  IS  PROVIDED  BY THE  COPYRIGHT  HOLDERS AND CONTRIBUTORS
*    "AS IS"  AND  ANY  EXPRESS  OR  IMPLIED  WARRANTIES,  INCLUDING,  BUT NOT
*    LIMITED  TO,  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
*    PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER
*    OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,  INCIDENTAL,  SPECIAL,
*    EXEMPLARY,  OR  CONSEQUENTIAL  DAMAGES  (INCLUDING,  BUT  NOT  LIMITED TO,
*    PROCUREMENT  OF  SUBSTITUTE   GOODS  OR   SERVICES;  LOSS  OF  USE,  DATA,
*    OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
*    LIABILITY,  WHETHER  IN  CONTRACT,  STRICT  LIABILITY, OR TORT (INCLUDING
*    NEGLIGENCE  OR  OTHERWISE)  ARISING  IN  ANY  WAY  OUT OF THE USE OF THIS
*    SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var StringBuffer = require('./stringBuffer');

var NestedNode = (function () {
    /**
    * @param idToBeSet
    */
    function NestedNode(idToBeSet, childToBeSet) {
        this.nodeId = idToBeSet;
        if (childToBeSet) {
            this.addChild(childToBeSet);
        }
    }
    /**
    * @param type
    * @return
    */
    NestedNode.prototype.countNodeFromType = function (type) {
        var count = 0;
        if (this.is(type)) {
            count++;
        }
        if (this.numChildren() > 0) {
            count = this.getChildren().reduce(function (count, child) {
                return count + child.countNodeFromType(type);
            }, count);
        }
        return count;
    };

    /**
    * @param index
    * @return
    */
    NestedNode.prototype.getChild = function (index) {
        var children = this.getChildren();
        return children && children.length <= index ? null : this.children[index];
    };

    /**
    * @return
    */
    NestedNode.prototype.getChildren = function () {
        return this.children;
    };

    /**
    * @return
    */
    NestedNode.prototype.getId = function () {
        return this.nodeId;
    };

    NestedNode.prototype.setId = function (id) {
        this.nodeId = id;
    };

    /**
    * @return
    */
    NestedNode.prototype.getLastChild = function () {
        var lastChild = this.getChild(this.numChildren() - 1);

        return lastChild != null && lastChild.numChildren() > 0 ? lastChild.getLastChild() : lastChild;
    };

    /**
    * @param expectedType
    * @return
    */
    NestedNode.prototype.is = function (expectedType) {
        return this.getId() === expectedType;
    };

    /**
    * @return
    */
    NestedNode.prototype.numChildren = function () {
        return this.getChildren() == null ? 0 : this.getChildren().length;
    };

    /**
    * @param child
    * @return
    */
    NestedNode.prototype.addChild = function (child) {
        if (child == null) {
            return child;
        }

        if (this.children == null) {
            this.children = [];
        }
        this.children.push(child);
        return child;
    };
    return NestedNode;
})();
exports.NestedNode = NestedNode;

function isNameInArray(strings, string) {
    return strings.some(function (compare) {
        return compare === string;
    });
}

var Node = (function (_super) {
    __extends(Node, _super);
    function Node(idToBeSet, lineToBeSet, columnToBeSet, childToBeSet, valueToBeSet) {
        if (typeof valueToBeSet === "undefined") { valueToBeSet = null; }
        _super.call(this, idToBeSet, childToBeSet);

        this.line = lineToBeSet;
        this.column = columnToBeSet;
        this.stringValue = valueToBeSet;
    }
    Node.create = function (idToBeSet, lineToBeSet, columnToBeSet, childToBeSet, valueToBeSet) {
        return new Node(idToBeSet, lineToBeSet, columnToBeSet, childToBeSet, valueToBeSet);
    };

    /* public findPrimaryStatementsFromNameInChildren( names: string[] ): IParserNode[] {
    var foundNode: IParserNode[] = [];
    
    if ( this.stringValue != null  && isNameInArray( names, this.stringValue) ) {
    foundNode.push( this );
    }
    else if ( this.numChildren() != 0 ) {
    this.getChildren().forEach( child => {
    foundNode = foundNode.concat( child.findPrimaryStatementsFromNameInChildren( names ) );
    });
    }
    return foundNode;
    }*/
    Node.prototype.getColumn = function () {
        return this.column;
    };

    Node.prototype.getLine = function () {
        return this.line;
    };

    Node.prototype.getStringValue = function () {
        return this.stringValue;
    };

    Node.prototype.toString = function () {
        var buffer = new StringBuffer();

        if (this.getStringValue() == null) {
            buffer.append(this.getId());
        } else {
            buffer.append(this.getStringValue());
        }

        buffer.append(' ');

        if (this.getChildren() != null) {
            this.getChildren().forEach(function (child) {
                buffer.append(child.toString());
                buffer.append(' ');
            });
        }
        return buffer.toString();
    };
    return Node;
})(NestedNode);
exports.Node = Node;
