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

import NodeKind = require('./nodeKind');
import StringBuffer = require('./stringBuffer');


export interface IParserNode {
    /**
     * @param index
     * @return the indexth child
     */
    getChild( index: number): IParserNode;

    /**
     * @return the entire list of chilren
     */
    getChildren(): IParserNode[];

    /**
     * @return node's column
     */
    getColumn(): number;

    /**
     * @return node's type
     */
    getId(): string;

    /**
     * @return the node's last child
     */
    getLastChild(): IParserNode;

    /**
     * @return nodes's line
     */
    getLine(): number;

    /**
     * @return node's string value
     */
    getStringValue(): string;

    /**
     * @param expectedType
     * @return true if the node's type is identical to the given name
     */
    is( expectedType: string ): boolean; // NOPMD

    /**
     * @return the children number
     */
    numChildren(): number;
}


export class NestedNode  {
       private children:IParserNode[];
       private nodeId: string;
    
       /**
        * @param idToBeSet
        */
       constructor( idToBeSet: string, childToBeSet?: IParserNode )
       {
            this.nodeId = idToBeSet;
            if (childToBeSet) {
                this.addChild( childToBeSet );
            }
       }
    
    
       /**
        * @param type
        * @return
        */
       public countNodeFromType( type: string ): number
       {
          var count: number = 0;
          if ( this.is( type ) )
          {
             count++;
          }
          if ( this.numChildren() > 0 )
          {
             count=  this.getChildren().reduce((count: number, child) => {
                 return count + child.countNodeFromType( type );
             }, count);
          }
          return count;
       }
    
       /**
        * @param index
        * @return
        */
       public getChild( index: number ):IParserNode
       {
           var children = this.getChildren()
          return children && children.length <= index ? null : this.children[index];
       }
    
       /**
        * @return
        */
       public getChildren(): IParserNode[]
       {
          return this.children;
       }
    
       /**
        * @return
        */
       public getId():string
       {
          return this.nodeId;
       }
    
    
       public setId(id: string) {
          this.nodeId = id;
       }
    
       /**
        * @return
        */
       public getLastChild():IParserNode
       {
          var lastChild: IParserNode = this.getChild(  this.numChildren() - 1 );
    
          return lastChild != null
                && lastChild.numChildren() > 0 ? lastChild.getLastChild()
                                              : lastChild;
       }
    
       /**
        * @param expectedType
        * @return
        */
       public  is( expectedType: string ): boolean // NOPMD
       {
          return  this.getId() === expectedType;
       }
    
       /**
        * @return
        */
       public numChildren(): number
       {
          return this.getChildren() == null ? 0 : this.getChildren().length;
       }
    
       /**
        * @param child
        * @return
        */
       public addChild( child: IParserNode ):IParserNode
       {
          if ( child == null )
          {
             return child; // skip optional children
          }
    
          if ( this.children == null )
          {
            this.children = []
          }
          this.children.push(child);
          return child;
       }
}

function isNameInArray( strings: string[], string: string ): boolean {
    return strings.some( compare => compare === string );
}

export class Node extends NestedNode implements IParserNode {
    static create( idToBeSet: string, lineToBeSet: number, columnToBeSet: number, childToBeSet?: IParserNode, valueToBeSet?: string ): Node {
        return new Node( idToBeSet, lineToBeSet, columnToBeSet, childToBeSet, valueToBeSet );
    }

    

    private column: number;
    private line: number;
    private stringValue: string;

    constructor( idToBeSet: string, lineToBeSet: number, columnToBeSet: number, childToBeSet?: IParserNode, valueToBeSet: string = null  ) {
        super( idToBeSet, childToBeSet );

        this.line = lineToBeSet;
        this.column = columnToBeSet;
        this.stringValue = valueToBeSet;
    }


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

    public getColumn(): number {
        return this.column;
    }

    public getLine(): number {
        return this.line;
    }

    public getStringValue(): string {
        return this.stringValue;
    }

    public toString(): string {
        var buffer: StringBuffer = new StringBuffer();

        if ( this.getStringValue() == null ) {
            buffer.append( this.getId());
        }
        else {
            buffer.append( this.getStringValue() );
        }

        buffer.append( ' ' );

        if ( this.getChildren() != null ) {
            this.getChildren().forEach( child => {
                buffer.append( child.toString() );
                buffer.append( ' ' );
            })
      }
        return buffer.toString();
    }
}