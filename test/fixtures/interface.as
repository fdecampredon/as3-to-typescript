/**
* Copyright 2009 François de Campredon
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*      http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

package com.deCampredon.flexAcacia.validation.core
{
	import flash.events.IEventDispatcher;

	/**
	 *  Dispatched when validation succeeds.
	 *
	 *  @eventType mx.events.ValidationResultEvent.VALID 
	 *  
	 */
	[Event(name="valid", type="mx.events.ValidationResultEvent")]

	/** 
	 *  Dispatched when validation fails.
	 *
	 *  @eventType mx.events.ValidationResultEvent.INVALID 
	 *  
	 */
	[Event(name="invalid", type="mx.events.ValidationResultEvent")]

	/**
	 * This interface specifies methods and property that a constraint Object must implement.
	 * 
	 * @author Francois de Campredon
	 */	
	public interface Constraint extends IEventDispatcher
	{
    
        import something.*;
        
        include 'hello';
        
		/**
		 * Field name validated by this constraint, in case that constraint is attached 
		 * to a property, contain the property name, Ootherwise, will be the an arbitrary name.
		 */
		function get field():String;
		function set field(value:String):void;

		/**
		 * List of group that constraint belongs to.
		 */
		function set groups(value:Array):void;
		function get groups():Array;

		/**
		 * Start the validation process.
		 * @param target the validation target
		 */
		function validate(target:Object):void;

		/**
		 * Create a clone of this Constraint.
		 * @return a clone of this Constraint
		 */
		function clone():Constraint;
	}
}