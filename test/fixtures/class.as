////////////////////////////////////////////////////////////////////////////////
//
//  Kap IT  -  Copyright 2011 Kap IT  -  All Rights Reserved.
//
//  This component is distributed under the GNU LGPL v2.1 
//  (available at : http://www.hnu.org/licences/old-licenses/lgpl-2.1.html)
//
////////////////////////////////////////////////////////////////////////////////
package com.deCampredon.spark.components
{
	import com.deCampredon.spark.components.supportClass.DateChooserDataGrid;
	import com.deCampredon.spark.components.supportClass.YearNavigatorSpinner;
	import com.deCampredon.spark.events.DateChooserScrollEvent;
	import com.deCampredon.spark.events.DateChooserScrollEventDetail;
	import com.deCampredon.spark.events.DateChooserSelectionEvent;

	import flash.events.Event;
	import flash.events.MouseEvent;

	import mx.collections.ArrayList;
	import mx.collections.IList;
	import mx.controls.DateChooser;
	import mx.core.IVisualElement;
	import mx.events.DateChooserEventDetail;
	import mx.events.FlexEvent;
	import mx.managers.IFocusManagerComponent;

	import spark.components.gridClasses.CellPosition;
	import spark.components.gridClasses.GridColumn;
	import spark.components.gridClasses.GridSelectionMode;
	import spark.components.supportClasses.ButtonBase;
	import spark.components.supportClasses.SkinnableComponent;
	import spark.core.IDisplayText;
	import spark.events.GridEvent;
	import spark.events.GridSelectionEvent;

	//--------------------------------------
	//  Events
	//--------------------------------------

	/**
	 *  Dispatched when a date is selected or changed.
	 *
	 *  @eventType com.deCampredon.sparkDateChooser.events.DateChooserSelectionEvent.SELECTION_CHANGE
	 *  
	 */
	[Event(name="selectionChange", type="com.deCampredon.spark.events.DateChooserSelectionEvent")]

	/**
	 *  Dispatched when a date is going to be selected.
	 *  Calling the <code>preventDefault()</code> method
	 *  on the event prevents the selection from changing.
	 *
	 *  @eventType com.deCampredon.sparkDateChooser.events.DateChooserSelectionEvent.SELECTION_CHANGING
	 * 
	 */
	[Event(name="selectionChanging", type="com.deCampredon.spark.events.DateChooserSelectionEvent")]


	/**
	 *  Dispatched when the displayed month or year changes due to user interaction.
	 *
	 *  @eventType com.deCampredon.sparkDateChooser.events.DateChooserScrollEvent.SCROLL
	 *  
	 */
	[Event(name="scroll", type="com.deCampredon.spark.events.DateChooserSelectionEvent")]

	//--------------------------------------
	//  Styles
	//--------------------------------------



	/**
	 *  Color of the text.
	 * 
	 *  <p><b>For the Spark theme, see
	 *  flashx.textLayout.formats.ITextLayoutFormat.color.</b></p>
	 *
	 *  <p><b>For the Mobile theme, if using StyleableTextField,
	 *  see spark.components.supportClasses.StyleableTextField Style color,
	 *  and if using StyleableStageText,
	 *  see spark.components.supportClasses.StyleableStageText Style color.</b></p>
	 *
	 *  @see flashx.textLayout.formats.ITextLayoutFormat#color
	 *  @see spark.components.supportClasses.StyleableTextField#style:color
	 *  @see spark.components.supportClasses.StyleableStageText#style:color
	 * 
	 *  @default 0x000000
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="color", type="uint", format="Color", inherit="yes")]

	/**
	 *  The name of the font to use, or a comma-separated list of font names. 
	 * 
	 *  <p><b>For the Spark theme, see
	 *  flashx.textLayout.formats.ITextLayoutFormat.fontFamily.</b></p>
	 *
	 *  <p><b>For the Mobile theme, if using StyleableTextField,
	 *  see spark.components.supportClasses.StyleableTextField Style fontFamily,
	 *  and if using StyleableStageText,
	 *  see spark.components.supportClasses.StyleableStageText Style fontFamily.</b></p>
	 * 
	 *  <p>The default value for the Spark theme is <code>Arial</code>.
	 *  The default value for the Mobile theme is <code>_sans</code>.</p>
	 *
	 *  @see flashx.textLayout.formats.ITextLayoutFormat#fontFamily
	 *  @see spark.components.supportClasses.StyleableStageText#style:fontFamily
	 *  @see spark.components.supportClasses.StyleableTextField#style:fontFamily
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="fontFamily", type="String", inherit="yes")]

	/**
	 *  Font lookup to use. 
	 *  
	 *  <p><b>For the Spark theme, see
	 *  flashx.textLayout.formats.ITextLayoutFormat.fontLookup</b></p>
	 *
	 *  <p><b>For the Mobile theme, this is not supported.</b></p>
	 * 
	 *  @see flashx.textLayout.formats.ITextLayoutFormat#fontLookup
	 * 
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="fontLookup", type="String", enumeration="auto,device,embeddedCFF", inherit="yes")]

	/**
	 *  Height of the text, in pixels.
	 * 
	 *  <p><b>For the Spark theme, see
	 *  flashx.textLayout.formats.ITextLayoutFormat.fontSize</b></p>
	 *
	 *  <p><b>For the Mobile theme, if using StyleableTextField,
	 *  see spark.components.supportClasses.StyleableTextField Style fontSize,
	 *  and if using StyleableStageText,
	 *  see spark.components.supportClasses.StyleableStageText Style fontSize.</b></p>
	 * 
	 *  <p>The default value for the Spark theme is <code>12</code>.
	 *  The default value for the Mobile theme is <code>24</code>.</p>
	 *
	 *  @see flashx.textLayout.formats.ITextLayoutFormat#fontSize
	 *  @see spark.components.supportClasses.StyleableStageText#style:fontSize
	 *  @see spark.components.supportClasses.StyleableTextField#style:fontSize
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="fontSize", type="Number", format="Length", inherit="yes", minValue="1.0", maxValue="720.0")]

	/**
	 *  @copy spark.components.supportClasses.GroupBase#style:accentColor
	 * 
	 *  @default #0099FF
	 * 
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="accentColor", type="uint", format="Color", inherit="yes", theme="spark, mobile")]

	/**
	 *  Determines whether the text is italic font.
	 * 
	 *  <p><b>For the Spark theme, see
	 *  flashx.textLayout.formats.ITextLayoutFormat.fontStyle</b></p>
	 *
	 *  <p><b>For the Mobile theme, if using StyleableTextField,
	 *  see spark.components.supportClasses.StyleableTextField Style fontStyle,
	 *  and if using StyleableStageText,
	 *  see spark.components.supportClasses.StyleableStageText Style fontStyle.</b></p>
	 * 
	 *  @see flashx.textLayout.formats.ITextLayoutFormat#fontStyle
	 *  @see spark.components.supportClasses.StyleableStageText#style:fontStyle
	 *  @see spark.components.supportClasses.StyleableTextField#style:fontStyle
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="fontStyle", type="String", enumeration="normal,italic", inherit="yes")]

	/**
	 *  Determines whether the text is boldface.
	 * 
	 *  <p><b>For the Spark theme, see
	 *  flashx.textLayout.formats.ITextLayoutFormat.fontWeight</b></p>
	 *
	 *  <p><b>For the Mobile theme, if using StyleableTextField,
	 *  see spark.components.supportClasses.StyleableTextField Style fontWeight,
	 *  and if using StyleableStageText,
	 *  see spark.components.supportClasses.StyleableStageText Style fontWeight.</b></p>
	 * 
	 *  @see flashx.textLayout.formats.ITextLayoutFormat#fontWeight
	 *  @see spark.components.supportClasses.StyleableStageText#style:fontWeight
	 *  @see spark.components.supportClasses.StyleableTextField#style:fontWeight
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="fontWeight", type="String", enumeration="normal,bold", inherit="yes")]

	/**
	 *  The locale of the text. 
	 *  Controls case transformations and shaping. 
	 *  Uses standard locale identifiers as described in Unicode Technical Standard #35. 
	 *  For example "en", "en_US" and "en-US" are all English, "ja" is Japanese. 
	 *  
	 *  <p>The default value is undefined. This property inherits its value from an ancestor; if 
	 *  still undefined, it inherits from the global <code>locale</code> style. 
	 *  During the application initialization, if the global <code>locale</code> style is undefined, 
	 *  then the default value is set to "en".</p>
	 * 
	 *  <p>When using the Spark formatters and globalization classes, you can set this style on the 
	 *  root application to the value of the <code>LocaleID.DEFAULT</code> constant. 
	 *  Those classes will then use the client operating system's international preferences.</p>
	 * 
	 *  @default undefined
	 *  @see http://www.unicode.org/reports/tr35/
	 *
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="locale", type="String", inherit="yes")]



	/**
	 *  @copy spark.components.supportClasses.GroupBase#style:alternatingItemColors
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="alternatingItemColors", type="Array", arrayType="uint", format="Color", inherit="yes", theme="spark, mobile")]

	/**
	 *  Alpha level of the background for this component.
	 *  Valid values range from 0.0 to 1.0. 
	 *  
	 *  @default 1.0
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="backgroundAlpha", type="Number", inherit="no", theme="spark, mobile")]

	/**
	 *  Background color of a component.
	 *  
	 *  @default 0xFFFFFF
	 * 
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="backgroundColor", type="uint", format="Color", inherit="no", theme="spark, mobile")]

	/**
	 *  The alpha of the content background for this component.
	 * 
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="contentBackgroundAlpha", type="Number", inherit="yes", theme="spark, mobile")]

	/**
	 *  @copy spark.components.supportClasses.GroupBase#style:contentBackgroundColor
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */ 
	[Style(name="contentBackgroundColor", type="uint", format="Color", inherit="yes", theme="spark, mobile")]

	/**
	 *  @copy spark.components.supportClasses.GroupBase#style:downColor
	 *   
	 *  @langversion 3.0
	 *  @playerversion Flash 10.1
	 *  @playerversion AIR 2.5
	 *  @productversion Flex 4.5
	 */
	[Style(name="downColor", type="uint", format="Color", inherit="yes", theme="mobile")]

	/**
	 *  @copy spark.components.supportClasses.GroupBase#style:focusColor
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */ 
	[Style(name="focusColor", type="uint", format="Color", inherit="yes", theme="spark, mobile")]

	/**
	 *  @copy spark.components.supportClasses.GroupBase#style:rollOverColor
	 *   
	 *  @default 0xCEDBEF
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="rollOverColor", type="uint", format="Color", inherit="yes", theme="spark")]

	/**
	 *  @copy spark.components.supportClasses.GroupBase#style:symbolColor
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */ 
	[Style(name="symbolColor", type="uint", format="Color", inherit="yes", theme="spark, mobile")]

	/**
	 *  @copy spark.components.supportClasses.GroupBase#style:touchDelay
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10.1
	 *  @playerversion AIR 2.5
	 *  @productversion Flex 4.5
	 */
	[Style(name="touchDelay", type="Number", format="Time", inherit="yes", minValue="0.0")]

	/**
	 *  Color of text shadows.
	 * 
	 *  @default #FFFFFF
	 * 
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="textShadowColor", type="uint", format="Color", inherit="yes", theme="mobile")]

	/**
	 *  Alpha of text shadows.
	 * 
	 *  @default 0.55
	 * 
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="textShadowAlpha", type="Number",inherit="yes", minValue="0.0", maxValue="1.0", theme="mobile")]

	/**
	 *  The alpha of the border for this component.
	 *
	 *  @default 0.5
	 * 
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="borderAlpha", type="Number", inherit="no", theme="spark")]

	/**
	 *  The color of the border for this component.
	 *
	 *  @default 0
	 * 
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="borderColor", type="uint", format="Color", inherit="no", theme="spark")]

	/**
	 *  Controls the visibility of the border for this component.
	 *
	 *  @default true
	 * 
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="borderVisible", type="Boolean", inherit="no", theme="spark")]

	/**
	 *  The radius of the corners for this component.
	 *
	 *  @default 0
	 * 
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="cornerRadius", type="Number", format="Length", inherit="no", theme="spark")]

	/**
	 *  Controls the visibility of the drop shadow for this component.
	 *
	 *  @default true
	 * 
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	[Style(name="dropShadowVisible", type="Boolean", inherit="no", theme="spark")]


	[ResourceBundle("controls")]
	[ResourceBundle("SharedResources")]

	[SkinState("normal")]
	[SkinState("disabled")]
	[SkinState("normalWithYearNavigation")]
	[SkinState("disabledWithYearNavigation")]

	/**
	 *  The DateChooser control displays the name of a month, the year,
	 *  and a grid of the days of the month, with columns labeled
	 *  for the day of the week.
	 *  The user can select a date.
	 *  @author François de Campredon
	 */
	public class DateChooser extends SkinnableComponent implements IFocusManagerComponent
	{

		//--------------------------------------------------------------------------
		//
		//  Class Constant
		//
		//--------------------------------------------------------------------------

		/**
		 * @private
		 */
		private static const dayProps:Array = ["sun","mon","tue","wen","thu","fri","sat"];

		//--------------------------------------------------------------------------
		//
		//  Constructor
		//
		//--------------------------------------------------------------------------

		/**
		 * Constructor
		 */
		public function DateChooser(value:Date = null)
		{
			super();
			var currentDate:Date = value ? value : new Date(), hello: string;
			displayedMonth = currentDate.month;
			displayedYear = currentDate.fullYear;
			monthNames = null;
			dayNames = null;
			firstDayOfWeek  = NaN;
		}


		//--------------------------------------------------------------------------
		//
		//  Skin Part
		//
		//--------------------------------------------------------------------------

		[SkinPart(required="false")]
		/**
		 * SkinPart representing a navigation button
		 */
		public var nextMonthButton:ButtonBase;


		[SkinPart(required="false")]
		/**
		 * SkinPart representing a navigation button
		 */
		public var prevMonthButton:ButtonBase;


		[SkinPart(required="false")]
		/**
		 * SkinPart displaying the displayedMonth name
		 */
		public var monthLabelDisplay:IDisplayText;


		[SkinPart(required="false")]
		/**
		 * Body of the chooser
		 */
		public var bodyGrid:DateChooserDataGrid;


		[SkinPart(required="false")]
		/**
		 * Spinner allowing year navigation.
		 */
		public var yearNavigator:YearNavigatorSpinner;

		[SkinPart(required="false")]
		/**
		 * Skin part that will renderer the "today" indicator,
		 * that part should not be added as a child of the skin.
		 */
		public var todayIndicator:IVisualElement;


		//--------------------------------------------------------------------------
		//
		//  Properties
		//
		//--------------------------------------------------------------------------

		//----------------------------------
		//  baselinePosition 
		//----------------------------------

		/**
		 * @private
		 */
		override public function get baselinePosition():Number {
			return getBaselinePositionForPart(monthLabelDisplay as IVisualElement);
		}

		//----------------------------------
		//  selectedDate 
		//----------------------------------

		private var _selectedDate:Date;

		private var selectedDateChanged:Boolean

		[Bindable(event="selectionChange")]
		/**
		 *  Date selected in the DateChooser control.
		 *  If the incoming Date object has any time values, 
		 *  they are zeroed out.
		 */
		public function get selectedDate():Date
		{
			return _selectedDate;
		}

		public function set selectedDate(value:Date):void
		{
			if( _selectedDate == value || ( value && !isEnableddDate(value) ) )
				return;

			var event:DateChooserSelectionEvent = new DateChooserSelectionEvent(DateChooserSelectionEvent.SELECTION_CHANGE);
			event.previousDate = selectedDate;
			event.newDate = value;

			_selectedDate = value;

			selectedDateChanged = true;
			invalidateProperties();

			dispatchEvent(event);
		}




		//----------------------------------
		//  displayedMonth
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the displayedMonth property.
		 */
		private var _displayedMonth:int;

		/**
		 *  @private
		 */
		private var displayedMonthChanged:Boolean = false;


		[Bindable("displayedMonthChanged")]
		[Inspectable(category="General")]

		/**
		 *  Used together with the <code>displayedYear</code> property,
		 *  the <code>displayedMonth</code> property specifies the month
		 *  displayed in the DateChooser control.
		 *  Month numbers are zero-based, so January is 0 and December is 11.
		 *  Setting this property changes the appearance of the DateChooser control.
		 *
		 *  <p>The default value is the current month.</p>
		 *
		 */
		public function get displayedMonth():int
		{
			return _displayedMonth;
		}

		/**
		 *  @private
		 */
		public function set displayedMonth(value:int):void
		{
			if (value < 0 || value > 11 || displayedMonth == value)
				return;

			_displayedMonth = value;
			displayedMonthChanged = true;

			invalidateProperties();
			dispatchChangeEvent("displayedMonthChanged");
		}


		//----------------------------------
		//  displayedYear
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the displayedYear property.
		 */
		private var _displayedYear:int;

		/**
		 *  @private
		 */
		private var displayedYearChanged:Boolean = false;


		[Bindable("displayedYearChanged")]
		[Inspectable(category="General")]

		/**
		 *  Used together with the <code>displayedMonth</code> property,
		 *  the <code>displayedYear</code> property specifies the year
		 *  displayed in the DateChooser control.
		 *  Setting this property changes the appearance of the DateChooser control.
		 *
		 *  <p>The default value is the current year.</p>
		 *  
		 */
		public function get displayedYear():int
		{
			return _displayedYear;
		}

		/**
		 *  @private
		 */
		public function set displayedYear(value:int):void
		{
			if (displayedYear == value || value < minYear || value > maxYear)
				return;

			_displayedYear = value;
			displayedYearChanged = true;

			invalidateProperties();
			dispatchChangeEvent("displayedYearChanged");
		}



		//----------------------------------
		//  firstDayOfWeek
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the firstDayOfWeek property.
		 */
		private var _firstDayOfWeek:int;

		/**
		 *  @private
		 */
		private var firstDayOfWeekOverride:Number;

		/**
		 *  @private
		 */
		private var firstDayOfWeekChanged:Boolean = false;

		[Bindable("firstDayOfWeekChanged")]
		[Inspectable(category="General")]

		/**
	     *  Number representing the day of the week to display in the
	     *  first column of the DateChooser control.
	     *  The value must be in the range 0 to 6, where 0 corresponds to Sunday,
	     *  the first element of the <code>dayNames</code> Array.
	     *
	     *  <p>Setting this property changes the order of the day columns.
	     *  For example, setting it to 1 makes Monday the first column
	     *  in the control.</p>
	     *
	     *  @default 0 (Sunday)
		 *  
		 */
		public function get firstDayOfWeek():Number
		{
			return _firstDayOfWeek;
		}

		/**
		 *  @private
		 */
		public function set firstDayOfWeek(value:Number):void
		{
			if (firstDayOfWeek == value)
				return;

			firstDayOfWeekOverride  = value;

			_firstDayOfWeek = !isNaN(value)  ?
										int(value) :
										resourceManager.getInt(
											"controls", "firstDayOfWeek");

			firstDayOfWeekChanged = true;

			invalidateProperties();
			dispatchChangeEvent("firstDayOfWeekChanged");
		}

		//----------------------------------
		//  dayNames
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the dayNames property.
		 */
		private var _dayNames:Vector.<String>;

		/**
		 *  @private
		 */
		private var dayNamesChanged:Boolean = false;

		/**
		 *  @private
		 */
		private var dayNamesOverride:Vector.<String>;

		[Bindable("dayNamesChanged")]
		/**
		 *  The weekday names for DateChooser control.
		 *  Changing this property changes the day labels
		 *  of the DateChooser control.
		 *  Sunday is the first day (at index 0).
		 *  The rest of the week names follow in the normal order.
		 *
		 *  @default [ "S", "M", "T", "W", "T", "F", "S" ].
		 *  
		 */
		public function get dayNames():Vector.<String>
		{
			return _dayNames?_dayNames.concat():null;
		}

		/**
		 *  @private
		 */
		public function set dayNames(value:Vector.<String>):void
		{
			if(value && value.length!=7)
				return;
			dayNamesOverride = value;

			_dayNames = value != null ?
				value : Vector.<String>(resourceManager.getStringArray("controls", "dayNamesShortest"))

			// _dayNames will be null if there are no resources.
			_dayNames = _dayNames ? _dayNames.concat() : null;

			dayNamesChanged = true;

			invalidateProperties();
			dispatchChangeEvent("dayNamesChanged");
		}



		//----------------------------------
		//  monthNames
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the monthNames property.
		 */
		private var _monthNames:Vector.<String>;

		private var monthNamesOverride:Vector.<String>;

		/**
		 *  @private
		 */
		private var monthNamesChanged:Boolean = false;


		[Bindable("monthNamesChanged")]

		/**
		 *  Names of the months displayed at the top of the DateChooser control.
		 *  The <code>monthSymbol</code> property is appended to the end of 
		 *  the value specified by the <code>monthNames</code> property, 
		 *  which is useful in languages such as Japanese.
		 *
		 *  @default [ "January", "February", "March", "April", "May", "June", 
		 *  "July", "August", "September", "October", "November", "December" ]
		 *  
		 *  
		 */
		public function get monthNames():Vector.<String>
		{
			return _monthNames?_monthNames.concat():null;
		}

		/**
		 *  @private
		 */
		public function set monthNames(value:Vector.<String>):void
		{
			if(value &&  value.length!=12)
				return;

			monthNamesOverride = value;

			_monthNames = value != null ?
				value : Vector.<String>(resourceManager.getStringArray("SharedResources", "monthNames"));

			// _monthNames will be null if there are no resources.
			_monthNames = _monthNames ? _monthNames.concat() : null;

			monthNamesChanged = true;

			invalidateProperties();
			dispatchChangeEvent("monthNamesChanged");
		}


		//----------------------------------
		//  monthSymbol
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the monthSymbol property.
		 */
		private var _monthSymbol:String;

		private var monthSymbolOverride:String;

		/**
		 *  @private
		 */
		private var monthSymbolChanged:Boolean = false;

		[Bindable("monthSymbolChanged")]
		[Inspectable(defaultValue="")]

		/**
		 *  This property is appended to the end of the value specified 
		 *  by the <code>monthNames</code> property to define the names 
		 *  of the months displayed at the top of the DateChooser control.
		 *  Some languages, such as Japanese, use an extra 
		 *  symbol after the month name. 
		 *
		 *  @default ""
		 *  
		 */
		public function get monthSymbol():String
		{
			return _monthSymbol;
		}

		/**
		 *  @private
		 */
		public function set monthSymbol(value:String):void
		{
			monthSymbolOverride = value;

			_monthSymbol = value != null ?
				value :
				resourceManager.getString(
					"SharedResources", "monthSymbol");

			monthSymbolChanged = true;

			invalidateProperties();
			dispatchChangeEvent("monthSymbolChanged");
		}

		//----------------------------------
		//  yearSymbol
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the yearSymbol property.
		 */
		private var _yearSymbol:String;

		/**
		 *  @private
		 */
		private var yearSymbolOverride:String;

		[Bindable("yearSymbolChanged")]
		[Inspectable(defaultValue="")]

		/**
		 *  This property is appended to the end of the year 
		 *  displayed at the top of the DateChooser control.
		 *  Some languages, such as Japanese, 
		 *  add a symbol after the year. 
		 *
		 *  @default ""
		 *  
		 *  @langversion 3.0
		 *  @playerversion Flash 9
		 *  @playerversion AIR 1.1
		 *  @productversion Flex 3
		 */
		public function get yearSymbol():String
		{
			return _yearSymbol;
		}

		/**
		 *  @private
		 */
		public function set yearSymbol(value:String):void
		{
			yearSymbolOverride = value;

			_yearSymbol = value != null ?
				value :
				resourceManager.getString(
					"controls", "yearSymbol");

			if(yearNavigator)
				yearNavigator.yearSymbol = yearSymbol;
			dispatchChangeEvent("yearSymbolChanged");
		}

		//----------------------------------
		//  yearNavigationEnabled
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the yearNavigationEnabled property.
		 */
		private var _yearNavigationEnabled:Boolean = false;

		[Bindable("yearNavigationEnabledChanged")]
		[Inspectable(defaultValue="false")]

		/**
		 *  Enables year navigation. When <code>true</code>
		 *  an up and down button appear to the right
		 *  of the displayed year. You can use these buttons
		 *  to change the current year.
		 *  These button appear to the left of the year in locales where year comes 
		 *  before the month in the date format.
		 *
		 *  @default false
		 *  
		 */
		public function get yearNavigationEnabled():Boolean
		{
			return _yearNavigationEnabled;
		}

		/**
		 *  @private
		 */
		public function set yearNavigationEnabled(value:Boolean):void
		{
			if(_yearNavigationEnabled != value) {
				_yearNavigationEnabled = value;
				invalidateSkinState();
				dispatchChangeEvent("yearNavigationEnabledChanged");
			}
		}

		//----------------------------------
		//  maxYear
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the maxYear property.
		 */
		private var _maxYear:int = 2100;

		/**
		 * @private
		 */
		private var maxYearChanged:Boolean;

		[Bindable("maxYearChanged")]
		[Inspectable(defaultValue="2100")]
		/**
		 *  The last year selectable in the control.
		 *
		 *  @default 2100
		 *  
		 *  @langversion 3.0
		 *  @playerversion Flash 9
		 *  @playerversion AIR 1.1
		 *  @productversion Flex 3
		 */
		public function get maxYear():int
		{
			return _maxYear;
		}

		/**
		 *  @private
		 */
		public function set maxYear(value:int):void
		{
			if (_maxYear == value || value < _minYear)
				return;
			maxYearChanged = true;
			_maxYear = value;
			invalidateProperties();
			dispatchChangeEvent("maxYearChanged");
		}

		//----------------------------------
		//  minYear
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the minYear property.
		 */
		private var _minYear:int = 1900;

		/**
		 * @private
		 */
		private var minYearChanged:Boolean;

		[Bindable("minYearChanged")]
		[Inspectable(defaultValue="1900")]
		/**
		 *  The first year selectable in the control.
		 *
		 *  @default 1900
		 *  
		 *  @langversion 3.0
		 *  @playerversion Flash 9
		 *  @playerversion AIR 1.1
		 *  @productversion Flex 3
		 */
		public function get minYear():int
		{
			return _minYear;
		}

		/**
		 *  @private
		 */
		public function set minYear(value:int):void
		{
			if (_minYear == value || _maxYear<value)
				return;
			minYearChanged = true;
			_minYear = value;
			invalidateProperties();
			dispatchChangeEvent("minYearChanged");
		}

		//----------------------------------
		//  showToday
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the showToday property.
		 */
		private var _showToday:Boolean = true;

		/**
		 *  @private
		 */
		private var showTodayChanged:Boolean = false;

		[Bindable("showTodayChanged")]
		[Inspectable(category="General", defaultValue="true")]

		/**
		 *  If <code>true</code>, specifies that today is highlighted
		 *  in the DateChooser control.
		 *  Setting this property changes the appearance of the DateChooser control.
		 *
		 *  @default true
		 *  
		 */
		public function get showToday():Boolean
		{
			return _showToday;
		}

		/**
		 *  @private
		 */
		public function set showToday(value:Boolean):void
		{
			if(showToday == value)
				return;
			_showToday = value;
			showTodayChanged = true;
			invalidateProperties();
			dispatchChangeEvent("showTodayChanged");
		}


		//----------------------------------
		//  disabledDays
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the disabledDays property.
		 */
		private var _disabledDays:Vector.<int>;

		/**
		 *  @private
		 */
		private var disabledDaysChanged:Boolean = false;

		[Bindable("disabledDaysChanged")]
		/**
		 *  The days to disable in a week.
		 *  All the dates in a month, for the specified day, are disabled.
		 *  This property changes the appearance of the DateChooser control.
		 *  The elements of this array can have values from 0 (Sunday) to
		 *  6 (Saturday).
		 *  For example, a value of <code>[ 0, 6 ]</code>
		 *  disables Sunday and Saturday.
		 *
		 *  @default []
		 *  
		 *  @langversion 3.0
		 *  @playerversion Flash 9
		 *  @playerversion AIR 1.1
		 *  @productversion Flex 3
		 */
		public function get disabledDays():Vector.<int>
		{
			return _disabledDays?_disabledDays.concat():null;
		}

		/**
		 *  @private
		 */
		public function set disabledDays(value:Vector.<int>):void
		{
			_disabledDays = value?value.concat():null;
			disabledDaysChanged = true;
			invalidateProperties();
			dispatchChangeEvent("disabledDaysChanged");
		}

		//----------------------------------
		//  disabledRanges
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the disabledRanges property.
		 */
		private var _disabledRanges:Array = [];

		/**
		 *  @private
		 */
		private var disabledRangesChanged:Boolean = false;

		[Bindable("disabledRangesChanged")]
		[Inspectable(arrayType="Object")]

		/**
		 *  Disables single and multiple days.
		 *
		 *  <p>This property accepts an Array of objects as a parameter.
		 *  Each object in this array is a Date object, specifying a
		 *  single day to disable; or an object containing either or both
		 *  of the <code>rangeStart</code> and <code>rangeEnd</code> properties,
		 *  each of whose values is a Date object.
		 *  The value of these properties describes the boundaries
		 *  of the date range.
		 *  If either is omitted, the range is considered
		 *  unbounded in that direction.
		 *  If you specify only <code>rangeStart</code>,
		 *  all the dates after the specified date are disabled,
		 *  including the <code>rangeStart</code> date.
		 *  If you specify only <code>rangeEnd</code>,
		 *  all the dates before the specified date are disabled,
		 *  including the <code>rangeEnd</code> date.
		 *  To disable a single day, use a single Date object specifying a date
		 *  in the Array. Time values are zeroed out from the Date 
		 *  object if they are present.</p>
		 *
		 *  <p>The following example, disables the following dates: January 11
		 *  2006, the range January 23 - February 10 2006, and March 1 2006
		 *  and all following dates.</p>
		 *
		 *  <p><code>disabledRanges="{[ new Date(2006,0,11), {rangeStart:
		 *  new Date(2006,0,23), rangeEnd: new Date(2006,1,10)},
		 *  {rangeStart: new Date(2006,2,1)} ]}"</code></p>
		 *
		 *  @default []
		 *  
		 */
		public function get disabledRanges():Array
		{
			return _disabledRanges;
		}

		/**
		 *  @private
		 */
		public function set disabledRanges(value:Array):void
		{
			_disabledRanges = scrubTimeValues(value);
			disabledRangesChanged = true;

			invalidateProperties();
			dispatchChangeEvent("disabledRangesChanged");
		}

		//----------------------------------
		//  selectableRange
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the selectableRange property.
		 */
		private var _selectableRange:Object;

		/**
		 *  @private
		 */
		private var selectableRangeChanged:Boolean = false;

		[Bindable("selectableRangeChanged")]

		/**
		 *  Range of dates between which dates are selectable.
		 *  For example, a date between 04-12-2006 and 04-12-2007
		 *  is selectable, but dates out of this range are disabled.
		 *
		 *  <p>This property accepts an Object as a parameter.
		 *  The Object contains two properties, <code>rangeStart</code>
		 *  and <code>rangeEnd</code>, of type Date.
		 *  If you specify only <code>rangeStart</code>,
		 *  all the dates after the specified date are enabled.
		 *  If you only specify <code>rangeEnd</code>,
		 *  all the dates before the specified date are enabled.
		 *  To enable only a single day in a DateChooser control,
		 *  you can pass a Date object directly. Time values are 
		 *  zeroed out from the Date object if they are present.</p>
		 *
		 *  <p>The following example enables only the range
		 *  January 1, 2006 through June 30, 2006. Months before January
		 *  and after June do not appear in the DateChooser.</p>
		 *
		 *  <p><code>selectableRange="{{rangeStart : new Date(2006,0,1),
		 *  rangeEnd : new Date(2006,5,30)}}"</code></p>
		 *
		 *  @default null
		 *  
		 *  @langversion 3.0
		 *  @playerversion Flash 9
		 *  @playerversion AIR 1.1
		 *  @productversion Flex 3
		 */
		public function get selectableRange():Object
		{
			return _selectableRange;
		}

		/**
		 *  @private
		 */
		public function set selectableRange(value:Object):void
		{
			_selectableRange = scrubTimeValue(value);
			selectableRangeChanged = true;
			dispatchChangeEvent("selectableRangeChanged");
			invalidateProperties();
		}


		//--------------------------------------------------------------------------
		//
		//  Variables
		//
		//--------------------------------------------------------------------------


		//----------------------------------
		//  gridColumns
		//----------------------------------

		/**
		 * @private
		 */
		private var _gridColumns:IList;

		/**
		 * @private
		 * list of columns passed to the bodyGrid
		 */
		private function get gridColumns():IList
		{
			return _gridColumns;
		}

		/**
		 * @private
		 */
		private function set gridColumns(value:IList):void
		{
			_gridColumns = value;
			if(bodyGrid)
				bodyGrid.columns = value;
		}


		//----------------------------------
		//  gridDataProvider
		//----------------------------------
		/**
		 * @private
		 */
		private var _gridDataProvider:IList;

		/**
		 * @private
		 * dataProvider passed to the bodyGrid
		 */
		private function get gridDataProvider():IList
		{
			return _gridDataProvider;
		}

		/**
		 * @private
		 */
		private function set gridDataProvider(value:IList):void
		{
			_gridDataProvider = value;
			if(bodyGrid)
				bodyGrid.dataProvider = value
		}

		//----------------------------------
		//  currentMonthText
		//----------------------------------
		/**
		 * @private
		 */
		private var _currentMonthText:String;

		/**
		 * @private
		 * text displayed by the monthLabelDisplay
		 */
		private function get currentMonthText():String
		{
			return _currentMonthText;
		}

		/**
		 * @private
		 */
		private function set currentMonthText(value:String):void
		{
			_currentMonthText = value;
			if(monthLabelDisplay)
				monthLabelDisplay.text = value;
		}

		//----------------------------------
		//  selectedCellPosition
		//----------------------------------
		/**
		 * @private
		 */
		private var _selectedCellPosition:CellPosition;

		/**
		 * cell selected on the grid
		 */
		private function get selectedCellPosition():CellPosition
		{
			return _selectedCellPosition;
		}

		/**
		 * @private
		 */
		private function set selectedCellPosition(value:CellPosition):void
		{
			_selectedCellPosition = value;
			if(bodyGrid)
				bodyGrid.selectedCell = value
		}



		//--------------------------------------------------------------------------
		//
		//  Overriden methods
		//
		//--------------------------------------------------------------------------

		/**
		 * @private
		 * retrieve the CellPosition of the cell displaying the current date
		 */
		public function getTodayCellPosition():CellPosition {
			var today:Date = new Date();
			if(displayedMonth == today.month && displayedYear == today.fullYear) {
				var cellPosition:CellPosition = new CellPosition();
				var date:Date = new Date(displayedYear,displayedMonth,1);
				var currentWeek:int = -1.
				while(date.month == displayedMonth) {
					if(date.day == firstDayOfWeek || currentWeek==-1) {
						currentWeek++;
					}
					if(date.date == today.date) {
						cellPosition.rowIndex = currentWeek;
						cellPosition.columnIndex = (today.day+firstDayOfWeek)%7;
						return cellPosition;
					}
					date.date++;
				}
			}
			return null;
		}

		/**
		 * @private
		 */
		public function isEnabledCell(rowIndex:int, columnIndex:int):Boolean
		{
			var date:Date = getDateForCell(rowIndex,columnIndex);
			return isEnableddDate(date);
		}


		/**
		 * @private
		 */
		override protected function commitProperties():void {
			super.commitProperties();
			var i:int,weekObject:Object;

			if(maxYearChanged || minYearChanged) {
				if(displayedYear < minYear)
					displayedYear = minYear;
				if(displayedYear > maxYear)
					displayedYear = maxYear;
				if(yearNavigator) {
					yearNavigator.maximum = maxYear;
					yearNavigator.minimum = minYear;
				}
			}
			if(showTodayChanged || disabledDaysChanged || selectableRangeChanged) {
				if(bodyGrid && bodyGrid.grid)
					bodyGrid.grid.invalidateDisplayList();
			}
			if(selectedDateChanged) {
				commitVisualSelection(true);
			}
			if(firstDayOfWeekChanged || displayedMonthChanged || displayedYearChanged || disabledRangesChanged) {
				updateGridDataProvider();
				if(!selectedDateChanged) {
					commitVisualSelection(false);
				}
				else {
					if(bodyGrid) {
						bodyGrid.selectedCell = selectedCellPosition
					}
				}
			}
			if(firstDayOfWeekChanged || dayNamesChanged) {
				updateGridColumn();
			}
			if(displayedMonthChanged || monthNamesChanged || monthSymbolChanged) {
				updateMonthText();
			}
			if(displayedYearChanged && yearNavigator) {
				yearNavigator.value = displayedYear
			}

			monthNamesChanged = false;
			monthSymbolChanged = false;
			selectedDateChanged = false;
			displayedMonthChanged = false;	
			displayedYearChanged = false;
			firstDayOfWeekChanged = false;
			dayNamesChanged = false;
			maxYearChanged = false;
			minYearChanged = false;
			disabledDaysChanged = false;
			showTodayChanged = false;
			disabledRangesChanged = false;
			selectableRangeChanged = false;
		}


		/**
		 * @private
		 */
		override protected function resourcesChanged():void
		{
			super.resourcesChanged();

			dayNames = dayNamesOverride;
			firstDayOfWeek = firstDayOfWeekOverride;
			monthNames = monthNamesOverride;
			monthSymbol = monthSymbolOverride;
			yearSymbol = yearSymbolOverride;
		}


		/**
		 * @private
		 */
		override protected function getCurrentSkinState():String {
			if(yearNavigationEnabled) {
				return enabled?"normalWithYearNavigation":"disabledWithYearNavigation";
			}
			return enabled?"normal":"disabled";
		}

		/**
		 * @private
		 */
		override protected function partAdded(partName:String, instance:Object):void {
			super.partAdded(partName,instance);
			if(instance == bodyGrid) {
				bodyGrid.dateChooser = this;
				bodyGrid.columns = gridColumns;
				bodyGrid.dataProvider = gridDataProvider;
				bodyGrid.selectedCell = selectedCellPosition;
				bodyGrid.selectionMode = GridSelectionMode.SINGLE_CELL
				bodyGrid.addEventListener(GridSelectionEvent.SELECTION_CHANGING,bodyGrid_selectionChangingHandler);
				bodyGrid.addEventListener(GridSelectionEvent.SELECTION_CHANGE,bodyGrid_selectionChangeHandler);
				bodyGrid.addEventListener(GridEvent.GRID_ROLL_OVER,bodyGrid_gridRollOverHandler);
			}
			else if(instance == monthLabelDisplay) {
				monthLabelDisplay.text = currentMonthText;
			}
			else if(instance == nextMonthButton) {
				nextMonthButton.addEventListener(MouseEvent.CLICK,nextMonthButton_clickHandler);
			}
			else if(instance == prevMonthButton) {
				prevMonthButton.addEventListener(MouseEvent.CLICK,prevMonthButton_clickHandler);
			}
			else if(instance == yearNavigator) {
				yearNavigator.maximum = maxYear;
				yearNavigator.minimum = minYear;
				yearNavigator.value = displayedYear;
				yearNavigator.yearSymbol = yearSymbol;
				yearNavigator.addEventListener(Event.CHANGE,yearNavigator_changeHandler);
			}
		}



		/**
		 * @private
		 */
		override protected function partRemoved(partName:String, instance:Object):void {
			super.partRemoved(partName,instance);
			if(instance == bodyGrid) {
				bodyGrid.removeEventListener(GridSelectionEvent.SELECTION_CHANGING,bodyGrid_selectionChangingHandler);
				bodyGrid.removeEventListener(GridSelectionEvent.SELECTION_CHANGE,bodyGrid_selectionChangeHandler);
				bodyGrid.removeEventListener(GridEvent.GRID_ROLL_OVER,bodyGrid_gridRollOverHandler);
			}
			else if(instance == nextMonthButton) {
				nextMonthButton.removeEventListener(MouseEvent.CLICK,nextMonthButton_clickHandler);
			}
			else if(instance == prevMonthButton) {
				prevMonthButton.removeEventListener(MouseEvent.CLICK,prevMonthButton_clickHandler);
			}
			else if(instance == yearNavigator) {
				yearNavigator.removeEventListener(Event.CHANGE,yearNavigator_changeHandler);
			}
		}




		//--------------------------------------------------------------------------
		//
		//  Events Handler
		//
		//--------------------------------------------------------------------------

		/**
		 * @private
		 * handle selectionChanging events displayed by the grid, prevent the selection 
		 * if the cell corresponding date should not be selected.
		 */
		protected function bodyGrid_selectionChangingHandler(event:GridSelectionEvent):void
		{
			if(!isEnabledCell(event.selectionChange.rowIndex,event.selectionChange.columnIndex)){
				event.preventDefault();
			}
		}		

		/**
		 * @private
		 * handle selectionChange events dispatched by the grid, and commit the selection
		 */
		protected function bodyGrid_selectionChangeHandler(event:GridSelectionEvent):void
		{
			var date:Date = getDateForCell(event.selectionChange.rowIndex,event.selectionChange.columnIndex);
			date = new Date(date.time);
			setSelectedDate(date)
		}		



		/**
		 * @private
		 * handle rollOver events on grid cell, prevent the rollOverIndicator to be displayed
		 * if the cell is not selectable.
		 */
		protected function bodyGrid_gridRollOverHandler(event:GridEvent):void
		{
			if(!isEnabledCell(event.rowIndex,event.columnIndex) && bodyGrid && bodyGrid.grid) {
				bodyGrid.grid.hoverRowIndex = -1;
				bodyGrid.grid.hoverColumnIndex = -1;
			}
		}

		/**
		 * @private
		 * handle prevMonthButton click events
		 */
		protected function prevMonthButton_clickHandler(event:MouseEvent):void
		{
			decreaseDisplayedMonth();
		}


		/**
		 * @private
		 * handle nextMonthButton click events
		 */
		protected function nextMonthButton_clickHandler(event:MouseEvent):void
		{
			increaseDisplayedMonth();
		}		


		/**
		 * @private
		 * handle yearNavigation change events
		 */
		protected function yearNavigator_changeHandler(event:Event):void
		{
			var increased:Boolean = displayedYear < yearNavigator.value;
			displayedYear = yearNavigator.value;
			dispatchScrollingEvent(increased?DateChooserEventDetail.NEXT_YEAR:DateChooserEventDetail.PREVIOUS_YEAR);
		}	

		//--------------------------------------------------------------------------
		//
		//  Private methods
		//
		//--------------------------------------------------------------------------

		/**
		 * @private 
		 * update the selectedDate
		 */
		private function setSelectedDate(date:Date):void
		{
			//dispatch a selectionChanging event to allow the user to prevent/modify the selection
			var selectionEvent:DateChooserSelectionEvent = 
				new DateChooserSelectionEvent(DateChooserSelectionEvent.SELECTION_CHANGING,false,true,selectedDate,date);

			dispatchEvent(selectionEvent);
			//if the event have not been default prevented commit the selection
			if(!selectionEvent.isDefaultPrevented()) {
				selectedDate = selectionEvent.newDate;
				dispatchEvent(new FlexEvent(FlexEvent.VALUE_COMMIT));
			}

			//if event have been selected, or date have been modified commit the visual selection
			if(selectionEvent.isDefaultPrevented() || selectionEvent.newDate != date)
				commitVisualSelection(true);
		}

		/**
		 * @private
		 * increase the displayed month
		 */
		private function increaseDisplayedMonth():void
		{
			if(displayedMonth == 11) {
				if(displayedYear >= maxYear)
					return;
				displayedYear++;
				displayedMonth = 0;
			} 
			else { 
				displayedMonth++;
			}
			dispatchScrollingEvent(DateChooserScrollEventDetail.NEXT_MONTH);
		}		

		/**
		 * @private
		 * decrease the displayed month
		 */
		private function decreaseDisplayedMonth():void
		{
			if(displayedMonth ==0) {
				if(displayedYear <= minYear)
					return;
				displayedYear--;
				displayedMonth = 11;
			}
			else {
				displayedMonth--;
			}
			dispatchScrollingEvent(DateChooserScrollEventDetail.PREVIOUS_MONTH);
		}


		private function dispatchScrollingEvent(detail:String):void
		{
			dispatchEvent(new DateChooserScrollEvent(DateChooserScrollEvent.SCROLL,false,false,detail));
		}

		/**
		 * @private
		 * create column passed to the bodyGrid skinPart
		 */
		private function updateGridColumn():void
		{
			var days:Vector.<int> = new Vector.<int>();
			var gridColumnsArray:Array = []
			for(var i:int =0;i<7;i++) {
				var day:int = (i+firstDayOfWeek)%7;
				var collumn:GridColumn = new GridColumn();
				collumn.dataField = dayProps[day];
				collumn.headerText = dayNames[day];
				collumn.labelFunction = gridLabelFunction;
				gridColumnsArray.push(collumn);
			}
			gridColumns = new ArrayList(gridColumnsArray);
		}

		/**
		 * @private
		 * create the dataProvider passed to the bodyGrid skinPart
		 */
		private function updateGridDataProvider():void
		{
			var date:Date = new Date(displayedYear,displayedMonth,1);
			var weekObjects:Array = new Array(6);
			var currentObject:Object;
			for (var i:int = 0; i < weekObjects.length; i++) 
			{
				weekObjects[i] = currentObject = new Object();
			}
			var currentWeek:int = -1;

			while(date.month == displayedMonth) {
				if(date.day == firstDayOfWeek || currentWeek==-1) {
					currentWeek++;
					currentObject =  weekObjects[currentWeek];
				}
				currentObject[dayProps[date.day]] = new Date(date.time);
				date.date++;
			}
			gridDataProvider = new ArrayList(weekObjects);
		}

		/**
		 * @private 
		 * update the text displayed by the monthLabelDisplay
		 */
		private function updateMonthText():void
		{
			currentMonthText = monthNames[displayedMonth]+monthSymbol;
		}


		/**
		 * @private
		 * commit the visual selection
		 * @params overrideMonthAndYear 
		 * 		if true, will set the displayedMonth/displayedYear properties 
		 * 		to be sure that the selectedDate is currently displayed
		 */
		private function commitVisualSelection(overrideMonthAndYear:Boolean):void
		{
			if(selectedDate ) {
				if(displayedMonth != selectedDate.month || displayedYear != selectedDate.fullYear) {
					if(overrideMonthAndYear) {
						displayedMonth = selectedDate.month;
						displayedYear = selectedDate.fullYear;
					}
					else  {
						selectedCellPosition = null;
						return;
					}
				}
				var date:Date = new Date(displayedYear,displayedMonth,1);
				var currentWeek:int = -1.
				while(date.month == displayedMonth) {
					if(date.day == firstDayOfWeek || currentWeek==-1) {
						currentWeek++;
					}
					if(date.date == selectedDate.date) {
						var cellPosition:CellPosition = new CellPosition();
						cellPosition.rowIndex = currentWeek;
						cellPosition.columnIndex = (date.day+firstDayOfWeek)%7;
						selectedCellPosition = cellPosition;
						return;
					}
					date.date++;
				}
			}
			else {
				selectedCellPosition = null;
			}
		}

		/**
		 * @private
		 * label function used by gridColumns of the bodyGrud
		 */
		private function gridLabelFunction(weekObject:Object,column:GridColumn):String {
			if(weekObject) {
				var date:Date = weekObject[column.dataField] as Date;
				if(date)
					return String(date.date);
			}
			return " ";
		}




		/**
		 * @private
		 * return true if the the given date is contained by the current range
		 */
		private function dateInRange(date:Date, range:Object):Boolean
		{
			var hasRangeStart:Boolean = (
				range.hasOwnProperty("rangeStart") && 
				range.rangeStart is Date
			)

			var hasRangeEnd:Boolean = (
				range.hasOwnProperty("rangeEnd") && 
				range.rangeEnd is Date
			)

			var afterRangeStart:Boolean = hasRangeStart && range.rangeStart.time <= date.time;
			var beforeRangeEnd:Boolean = hasRangeEnd && range.rangeEnd.time >= date.time ;
			if(hasRangeStart && hasRangeEnd) {
				if(afterRangeStart && beforeRangeEnd) return true;
			}
			else if(hasRangeStart) {
				if(afterRangeStart) return true;
			}
			else if(hasRangeEnd) {
				if(beforeRangeEnd) return true;
			}
			return false;
		}

		/**
		 * @private
		 * get the date corresponding to a grid cell rowIndex and columnIndex
		 */
		private function getDateForCell(rowIndex:uint,columnIndex:uint):Date {
			if(gridDataProvider && gridColumns && rowIndex >=0 && rowIndex <7 && columnIndex >=0 && columnIndex < 7) {
				var week:Object = gridDataProvider.getItemAt(rowIndex);
				var column:GridColumn = gridColumns.getItemAt(columnIndex) as GridColumn;
				return week[column.dataField];
			}
			return null;
		}


		/**
		 * @private 
		 * return true if the date is currently selectable in compiliance with 
		 * the disabledDays, disabledRanges and selectableRange properties
		 */
		private function isEnableddDate(date:Date):Boolean {
			if(!date)
				return false;
			if(disabledDays && disabledDays.indexOf(date.day)!=-1)
				return false;
			if(disabledRanges) {
				for (var i in disabledRanges) {
                    var range:*  = disabledRanges[i];
					if(range is Date && date.time == range.time) {
						return false;
					}
					else if(range is Object && dateInRange(date,range)) {
						return false;
					}
				}
                for(i in disabledRanges) {
                    var range:*  = disabledRanges[i];
					if(range is Date && date.time == range.time) {
						return false;
					}
					else if(range is Object && dateInRange(date,range)) {
						return false;
					}
				}
			}
			if(selectableRange && !dateInRange(date,selectableRange)) {
				return false;
			}
			return true;
		}

		/**
		 * @private
		 */
		private function dispatchChangeEvent(event:String):void
		{
			if(hasEventListener(event))
				dispatchEvent(new Event(event));
		}

		/**
		 *  @private
		 *  This method scrubs out time values from incoming date objects
		 */ 
		private function scrubTimeValue(value:Object):Object
		{
			if (value is Date)
			{
				return new Date(value.getFullYear(), value.getMonth(), value.getDate());
			}
			else if (value is Object) 
			{
				var range:Object = {};
				if (value.rangeStart)
				{
					range.rangeStart = new Date(value.rangeStart.getFullYear(), 
						value.rangeStart.getMonth(), 
						value.rangeStart.getDate());
				}

				if (value.rangeEnd)
				{
					range.rangeEnd = new Date(value.rangeEnd.getFullYear(), 
						value.rangeEnd.getMonth(), 
						value.rangeEnd.getDate());
				}
				return range;
			}
			return null;
		}

		/**
		 *  @private
		 *  This method scrubs out time values from incoming date objects
		 */ 
		private function scrubTimeValues(values:Array):Array
		{
			var dates:Array = [];
			for (var i:int = 0; i < values.length; i++)
			{
				dates[i] = scrubTimeValue(values[i]);
			}
			return dates;
		}

	}
}