////////////////////////////////////////////////////////////////////////////////
//
//  Kap IT  -  Copyright 2011 Kap IT  -  All Rights Reserved.
//
//  This component is distributed under the GNU LGPL v2.1 
//  (available at : http://www.hnu.org/licences/old-licenses/lgpl-2.1.html)
//
////////////////////////////////////////////////////////////////////////////////
module com.deCampredon.spark.components
{
	import DateChooserDataGrid = com.deCampredon.spark.components.supportClass.DateChooserDataGrid;
	import YearNavigatorSpinner = com.deCampredon.spark.components.supportClass.YearNavigatorSpinner;
	import DateChooserScrollEvent = com.deCampredon.spark.events.DateChooserScrollEvent;
	import DateChooserScrollEventDetail = com.deCampredon.spark.events.DateChooserScrollEventDetail;
	import DateChooserSelectionEvent = com.deCampredon.spark.events.DateChooserSelectionEvent;

	import Event = flash.events.Event;
	import MouseEvent = flash.events.MouseEvent;

	import ArrayList = mx.collections.ArrayList;
	import IList = mx.collections.IList;
	import DateChooser = mx.controls.DateChooser;
	import IVisualElement = mx.core.IVisualElement;
	import DateChooserEventDetail = mx.events.DateChooserEventDetail;
	import FlexEvent = mx.events.FlexEvent;
	import IFocusManagerComponent = mx.managers.IFocusManagerComponent;

	import CellPosition = spark.components.gridClasses.CellPosition;
	import GridColumn = spark.components.gridClasses.GridColumn;
	import GridSelectionMode = spark.components.gridClasses.GridSelectionMode;
	import ButtonBase = spark.components.supportClasses.ButtonBase;
	import SkinnableComponent = spark.components.supportClasses.SkinnableComponent;
	import IDisplayText = spark.core.IDisplayText;
	import GridEvent = spark.events.GridEvent;
	import GridSelectionEvent = spark.events.GridSelectionEvent;

	//--------------------------------------
	//  Events
	//--------------------------------------

	/**
	 *  Dispatched when a date is selected or changed.
	 *
	 *  @eventType com.deCampredon.sparkDateChooser.events.DateChooserSelectionEvent.SELECTION_CHANGE
	 *  
	 */
	/*[Event(name="selectionChange", type="com.deCampredon.spark.events.DateChooserSelectionEvent")]*/

	/**
	 *  Dispatched when a date is going to be selected.
	 *  Calling the <code>preventDefault()</code> method
	 *  on the event prevents the selection from changing.
	 *
	 *  @eventType com.deCampredon.sparkDateChooser.events.DateChooserSelectionEvent.SELECTION_CHANGING
	 * 
	 */
	/*[Event(name="selectionChanging", type="com.deCampredon.spark.events.DateChooserSelectionEvent")]*/


	/**
	 *  Dispatched when the displayed month or year changes due to user interaction.
	 *
	 *  @eventType com.deCampredon.sparkDateChooser.events.DateChooserScrollEvent.SCROLL
	 *  
	 */
	/*[Event(name="scroll", type="com.deCampredon.spark.events.DateChooserSelectionEvent")]*/

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
	/*[Style(name="color", type="uint", format="Color", inherit="yes")]*/

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
	/*[Style(name="fontFamily", type="String", inherit="yes")]*/

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
	/*[Style(name="fontLookup", type="String", enumeration="auto,device,embeddedCFF", inherit="yes")]*/

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
	/*[Style(name="fontSize", type="Number", format="Length", inherit="yes", minValue="1.0", maxValue="720.0")]*/

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
	/*[Style(name="accentColor", type="uint", format="Color", inherit="yes", theme="spark, mobile")]*/

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
	/*[Style(name="fontStyle", type="String", enumeration="normal,italic", inherit="yes")]*/

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
	/*[Style(name="fontWeight", type="String", enumeration="normal,bold", inherit="yes")]*/

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
	/*[Style(name="locale", type="String", inherit="yes")]*/



	/**
	 *  @copy spark.components.supportClasses.GroupBase#style:alternatingItemColors
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	/*[Style(name="alternatingItemColors", type="Array", arrayType="uint", format="Color", inherit="yes", theme="spark, mobile")]*/

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
	/*[Style(name="backgroundAlpha", type="Number", inherit="no", theme="spark, mobile")]*/

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
	/*[Style(name="backgroundColor", type="uint", format="Color", inherit="no", theme="spark, mobile")]*/

	/**
	 *  The alpha of the content background for this component.
	 * 
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */
	/*[Style(name="contentBackgroundAlpha", type="Number", inherit="yes", theme="spark, mobile")]*/

	/**
	 *  @copy spark.components.supportClasses.GroupBase#style:contentBackgroundColor
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */ 
	/*[Style(name="contentBackgroundColor", type="uint", format="Color", inherit="yes", theme="spark, mobile")]*/

	/**
	 *  @copy spark.components.supportClasses.GroupBase#style:downColor
	 *   
	 *  @langversion 3.0
	 *  @playerversion Flash 10.1
	 *  @playerversion AIR 2.5
	 *  @productversion Flex 4.5
	 */
	/*[Style(name="downColor", type="uint", format="Color", inherit="yes", theme="mobile")]*/

	/**
	 *  @copy spark.components.supportClasses.GroupBase#style:focusColor
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */ 
	/*[Style(name="focusColor", type="uint", format="Color", inherit="yes", theme="spark, mobile")]*/

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
	/*[Style(name="rollOverColor", type="uint", format="Color", inherit="yes", theme="spark")]*/

	/**
	 *  @copy spark.components.supportClasses.GroupBase#style:symbolColor
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10
	 *  @playerversion AIR 1.5
	 *  @productversion Flex 4
	 */ 
	/*[Style(name="symbolColor", type="uint", format="Color", inherit="yes", theme="spark, mobile")]*/

	/**
	 *  @copy spark.components.supportClasses.GroupBase#style:touchDelay
	 *  
	 *  @langversion 3.0
	 *  @playerversion Flash 10.1
	 *  @playerversion AIR 2.5
	 *  @productversion Flex 4.5
	 */
	/*[Style(name="touchDelay", type="Number", format="Time", inherit="yes", minValue="0.0")]*/

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
	/*[Style(name="textShadowColor", type="uint", format="Color", inherit="yes", theme="mobile")]*/

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
	/*[Style(name="textShadowAlpha", type="Number",inherit="yes", minValue="0.0", maxValue="1.0", theme="mobile")]*/

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
	/*[Style(name="borderAlpha", type="Number", inherit="no", theme="spark")]*/

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
	/*[Style(name="borderColor", type="uint", format="Color", inherit="no", theme="spark")]*/

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
	/*[Style(name="borderVisible", type="Boolean", inherit="no", theme="spark")]*/

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
	/*[Style(name="cornerRadius", type="Number", format="Length", inherit="no", theme="spark")]*/

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
	/*[Style(name="dropShadowVisible", type="Boolean", inherit="no", theme="spark")]*/


	/*[ResourceBundle("controls")]*/
	/*[ResourceBundle("SharedResources")]*/

	/*[SkinState("normal")]*/
	/*[SkinState("disabled")]*/
	/*[SkinState("normalWithYearNavigation")]*/
	/*[SkinState("disabledWithYearNavigation")]*/

	/**
	 *  The DateChooser control displays the name of a month, the year,
	 *  and a grid of the days of the month, with columns labeled
	 *  for the day of the week.
	 *  The user can select a date.
	 *  @author François de Campredon
	 */
	export class DateChooser extends SkinnableComponent implements IFocusManagerComponent
	{

		//--------------------------------------------------------------------------
		//
		//  Class Constant
		//
		//--------------------------------------------------------------------------

		/**
		 * @private
		 */
		private static dayProps:any[] = ["sun","mon","tue","wen","thu","fri","sat"];

		//--------------------------------------------------------------------------
		//
		//  Constructor
		//
		//--------------------------------------------------------------------------

		/**
		 * Constructor
		 */
		constructor(value:Date = null)
		{
			super();
			var currentDate:Date = value ? value : new Date(), hello: string;
			this.displayedMonth = currentDate.month;
			this.displayedYear = currentDate.fullYear;
			this.monthNames = null;
			this.dayNames = null;
			this.firstDayOfWeek  = NaN;
		}


		//--------------------------------------------------------------------------
		//
		//  Skin Part
		//
		//--------------------------------------------------------------------------

		/*[SkinPart(required="false")]*/
		/**
		 * SkinPart representing a navigation button
		 */
		public nextMonthButton:ButtonBase;


		/*[SkinPart(required="false")]*/
		/**
		 * SkinPart representing a navigation button
		 */
		public prevMonthButton:ButtonBase;


		/*[SkinPart(required="false")]*/
		/**
		 * SkinPart displaying the displayedMonth name
		 */
		public monthLabelDisplay:IDisplayText;


		/*[SkinPart(required="false")]*/
		/**
		 * Body of the chooser
		 */
		public bodyGrid:DateChooserDataGrid;


		/*[SkinPart(required="false")]*/
		/**
		 * Spinner allowing year navigation.
		 */
		public yearNavigator:YearNavigatorSpinner;

		/*[SkinPart(required="false")]*/
		/**
		 * Skin part that will renderer the "today" indicator,
		 * that part should not be added as a child of the skin.
		 */
		public todayIndicator:IVisualElement;


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
		/*override*/ public get baselinePosition():number {
			return this.getBaselinePositionForPart(<IVisualElement>this.monthLabelDisplay );
		}

		//----------------------------------
		//  selectedDate 
		//----------------------------------

		private _selectedDate:Date;

		private selectedDateChanged:boolean

		/*[Bindable(event="selectionChange")]*/
		/**
		 *  Date selected in the DateChooser control.
		 *  If the incoming Date object has any time values, 
		 *  they are zeroed out.
		 */
		public get selectedDate():Date
		{
			return this._selectedDate;
		}

		public set selectedDate(value:Date)
		{
			if( this._selectedDate == value || ( value && !this.isEnableddDate(value) ) )
				return;

			var event:DateChooserSelectionEvent = new DateChooserSelectionEvent(DateChooserSelectionEvent.SELECTION_CHANGE);
			event.previousDate = this.selectedDate;
			event.newDate = value;

			this._selectedDate = value;

			this.selectedDateChanged = true;
			this.invalidateProperties();

			this.dispatchEvent(event);
		}




		//----------------------------------
		//  displayedMonth
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the displayedMonth property.
		 */
		private _displayedMonth:number;

		/**
		 *  @private
		 */
		private displayedMonthChanged:boolean = false;


		/*[Bindable("displayedMonthChanged")]*/
		/*[Inspectable(category="General")]*/

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
		public get displayedMonth():number
		{
			return this._displayedMonth;
		}

		/**
		 *  @private
		 */
		public set displayedMonth(value:number)
		{
			if (value < 0 || value > 11 || this.displayedMonth == value)
				return;

			this._displayedMonth = value;
			this.displayedMonthChanged = true;

			this.invalidateProperties();
			this.dispatchChangeEvent("displayedMonthChanged");
		}


		//----------------------------------
		//  displayedYear
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the displayedYear property.
		 */
		private _displayedYear:number;

		/**
		 *  @private
		 */
		private displayedYearChanged:boolean = false;


		/*[Bindable("displayedYearChanged")]*/
		/*[Inspectable(category="General")]*/

		/**
		 *  Used together with the <code>displayedMonth</code> property,
		 *  the <code>displayedYear</code> property specifies the year
		 *  displayed in the DateChooser control.
		 *  Setting this property changes the appearance of the DateChooser control.
		 *
		 *  <p>The default value is the current year.</p>
		 *  
		 */
		public get displayedYear():number
		{
			return this._displayedYear;
		}

		/**
		 *  @private
		 */
		public set displayedYear(value:number)
		{
			if (this.displayedYear == value || value < this.minYear || value > this.maxYear)
				return;

			this._displayedYear = value;
			this.displayedYearChanged = true;

			this.invalidateProperties();
			this.dispatchChangeEvent("displayedYearChanged");
		}



		//----------------------------------
		//  firstDayOfWeek
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the firstDayOfWeek property.
		 */
		private _firstDayOfWeek:number;

		/**
		 *  @private
		 */
		private firstDayOfWeekOverride:number;

		/**
		 *  @private
		 */
		private firstDayOfWeekChanged:boolean = false;

		/*[Bindable("firstDayOfWeekChanged")]*/
		/*[Inspectable(category="General")]*/

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
		public get firstDayOfWeek():number
		{
			return this._firstDayOfWeek;
		}

		/**
		 *  @private
		 */
		public set firstDayOfWeek(value:number)
		{
			if (this.firstDayOfWeek == value)
				return;

			this.firstDayOfWeekOverride  = value;

			this._firstDayOfWeek = !isNaN(value)  ?
										int(value) :
										this.resourceManager.getInt(
											"controls", "firstDayOfWeek");

			this.firstDayOfWeekChanged = true;

			this.invalidateProperties();
			this.dispatchChangeEvent("firstDayOfWeekChanged");
		}

		//----------------------------------
		//  dayNames
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the dayNames property.
		 */
		private _dayNames:string[];

		/**
		 *  @private
		 */
		private dayNamesChanged:boolean = false;

		/**
		 *  @private
		 */
		private dayNamesOverride:string[];

		/*[Bindable("dayNamesChanged")]*/
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
		public get dayNames():string[]
		{
			return this._dayNames?this._dayNames.concat():null;
		}

		/**
		 *  @private
		 */
		public set dayNames(value:string[])
		{
			if(value && value.length!=7)
				return;
			this.dayNamesOverride = value;

			this._dayNames = value != null ?
				value : (<string[]>this.resourceManager.getStringArray("controls", "dayNamesShortest"))

			// _dayNames will be null if there are no resources.
			this._dayNames = this._dayNames ? this._dayNames.concat() : null;

			this.dayNamesChanged = true;

			this.invalidateProperties();
			this.dispatchChangeEvent("dayNamesChanged");
		}



		//----------------------------------
		//  monthNames
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the monthNames property.
		 */
		private _monthNames:string[];

		private monthNamesOverride:string[];

		/**
		 *  @private
		 */
		private monthNamesChanged:boolean = false;


		/*[Bindable("monthNamesChanged")]*/

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
		public get monthNames():string[]
		{
			return this._monthNames?this._monthNames.concat():null;
		}

		/**
		 *  @private
		 */
		public set monthNames(value:string[])
		{
			if(value &&  value.length!=12)
				return;

			this.monthNamesOverride = value;

			this._monthNames = value != null ?
				value : (<string[]>this.resourceManager.getStringArray("SharedResources", "monthNames"));

			// _monthNames will be null if there are no resources.
			this._monthNames = this._monthNames ? this._monthNames.concat() : null;

			this.monthNamesChanged = true;

			this.invalidateProperties();
			this.dispatchChangeEvent("monthNamesChanged");
		}


		//----------------------------------
		//  monthSymbol
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the monthSymbol property.
		 */
		private _monthSymbol:string;

		private monthSymbolOverride:string;

		/**
		 *  @private
		 */
		private monthSymbolChanged:boolean = false;

		/*[Bindable("monthSymbolChanged")]*/
		/*[Inspectable(defaultValue="")]*/

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
		public get monthSymbol():string
		{
			return this._monthSymbol;
		}

		/**
		 *  @private
		 */
		public set monthSymbol(value:string)
		{
			this.monthSymbolOverride = value;

			this._monthSymbol = value != null ?
				value :
				this.resourceManager.getString(
					"SharedResources", "monthSymbol");

			this.monthSymbolChanged = true;

			this.invalidateProperties();
			this.dispatchChangeEvent("monthSymbolChanged");
		}

		//----------------------------------
		//  yearSymbol
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the yearSymbol property.
		 */
		private _yearSymbol:string;

		/**
		 *  @private
		 */
		private yearSymbolOverride:string;

		/*[Bindable("yearSymbolChanged")]*/
		/*[Inspectable(defaultValue="")]*/

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
		public get yearSymbol():string
		{
			return this._yearSymbol;
		}

		/**
		 *  @private
		 */
		public set yearSymbol(value:string)
		{
			this.yearSymbolOverride = value;

			this._yearSymbol = value != null ?
				value :
				this.resourceManager.getString(
					"controls", "yearSymbol");

			if(this.yearNavigator)
				this.yearNavigator.yearSymbol = this.yearSymbol;
			this.dispatchChangeEvent("yearSymbolChanged");
		}

		//----------------------------------
		//  yearNavigationEnabled
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the yearNavigationEnabled property.
		 */
		private _yearNavigationEnabled:boolean = false;

		/*[Bindable("yearNavigationEnabledChanged")]*/
		/*[Inspectable(defaultValue="false")]*/

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
		public get yearNavigationEnabled():boolean
		{
			return this._yearNavigationEnabled;
		}

		/**
		 *  @private
		 */
		public set yearNavigationEnabled(value:boolean)
		{
			if(this._yearNavigationEnabled != value) {
				this._yearNavigationEnabled = value;
				this.invalidateSkinState();
				this.dispatchChangeEvent("yearNavigationEnabledChanged");
			}
		}

		//----------------------------------
		//  maxYear
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the maxYear property.
		 */
		private _maxYear:number = 2100;

		/**
		 * @private
		 */
		private maxYearChanged:boolean;

		/*[Bindable("maxYearChanged")]*/
		/*[Inspectable(defaultValue="2100")]*/
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
		public get maxYear():number
		{
			return this._maxYear;
		}

		/**
		 *  @private
		 */
		public set maxYear(value:number)
		{
			if (this._maxYear == value || value < this._minYear)
				return;
			this.maxYearChanged = true;
			this._maxYear = value;
			this.invalidateProperties();
			this.dispatchChangeEvent("maxYearChanged");
		}

		//----------------------------------
		//  minYear
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the minYear property.
		 */
		private _minYear:number = 1900;

		/**
		 * @private
		 */
		private minYearChanged:boolean;

		/*[Bindable("minYearChanged")]*/
		/*[Inspectable(defaultValue="1900")]*/
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
		public get minYear():number
		{
			return this._minYear;
		}

		/**
		 *  @private
		 */
		public set minYear(value:number)
		{
			if (this._minYear == value || this._maxYear<value)
				return;
			this.minYearChanged = true;
			this._minYear = value;
			this.invalidateProperties();
			this.dispatchChangeEvent("minYearChanged");
		}

		//----------------------------------
		//  showToday
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the showToday property.
		 */
		private _showToday:boolean = true;

		/**
		 *  @private
		 */
		private showTodayChanged:boolean = false;

		/*[Bindable("showTodayChanged")]*/
		/*[Inspectable(category="General", defaultValue="true")]*/

		/**
		 *  If <code>true</code>, specifies that today is highlighted
		 *  in the DateChooser control.
		 *  Setting this property changes the appearance of the DateChooser control.
		 *
		 *  @default true
		 *  
		 */
		public get showToday():boolean
		{
			return this._showToday;
		}

		/**
		 *  @private
		 */
		public set showToday(value:boolean)
		{
			if(this.showToday == value)
				return;
			this._showToday = value;
			this.showTodayChanged = true;
			this.invalidateProperties();
			this.dispatchChangeEvent("showTodayChanged");
		}


		//----------------------------------
		//  disabledDays
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the disabledDays property.
		 */
		private _disabledDays:number[];

		/**
		 *  @private
		 */
		private disabledDaysChanged:boolean = false;

		/*[Bindable("disabledDaysChanged")]*/
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
		public get disabledDays():number[]
		{
			return this._disabledDays?this._disabledDays.concat():null;
		}

		/**
		 *  @private
		 */
		public set disabledDays(value:number[])
		{
			this._disabledDays = value?value.concat():null;
			this.disabledDaysChanged = true;
			this.invalidateProperties();
			this.dispatchChangeEvent("disabledDaysChanged");
		}

		//----------------------------------
		//  disabledRanges
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the disabledRanges property.
		 */
		private _disabledRanges:any[] = [];

		/**
		 *  @private
		 */
		private disabledRangesChanged:boolean = false;

		/*[Bindable("disabledRangesChanged")]*/
		/*[Inspectable(arrayType="Object")]*/

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
		public get disabledRanges():any[]
		{
			return this._disabledRanges;
		}

		/**
		 *  @private
		 */
		public set disabledRanges(value:any[])
		{
			this._disabledRanges = this.scrubTimeValues(value);
			this.disabledRangesChanged = true;

			this.invalidateProperties();
			this.dispatchChangeEvent("disabledRangesChanged");
		}

		//----------------------------------
		//  selectableRange
		//----------------------------------

		/**
		 *  @private
		 *  Storage for the selectableRange property.
		 */
		private _selectableRange:Object;

		/**
		 *  @private
		 */
		private selectableRangeChanged:boolean = false;

		/*[Bindable("selectableRangeChanged")]*/

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
		public get selectableRange():Object
		{
			return this._selectableRange;
		}

		/**
		 *  @private
		 */
		public set selectableRange(value:Object)
		{
			this._selectableRange = this.scrubTimeValue(value);
			this.selectableRangeChanged = true;
			this.dispatchChangeEvent("selectableRangeChanged");
			this.invalidateProperties();
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
		private _gridColumns:IList;

		/**
		 * @private
		 * list of columns passed to the bodyGrid
		 */
		private get gridColumns():IList
		{
			return this._gridColumns;
		}

		/**
		 * @private
		 */
		private set gridColumns(value:IList)
		{
			this._gridColumns = value;
			if(this.bodyGrid)
				this.bodyGrid.columns = value;
		}


		//----------------------------------
		//  gridDataProvider
		//----------------------------------
		/**
		 * @private
		 */
		private _gridDataProvider:IList;

		/**
		 * @private
		 * dataProvider passed to the bodyGrid
		 */
		private get gridDataProvider():IList
		{
			return this._gridDataProvider;
		}

		/**
		 * @private
		 */
		private set gridDataProvider(value:IList)
		{
			this._gridDataProvider = value;
			if(this.bodyGrid)
				this.bodyGrid.dataProvider = value
		}

		//----------------------------------
		//  currentMonthText
		//----------------------------------
		/**
		 * @private
		 */
		private _currentMonthText:string;

		/**
		 * @private
		 * text displayed by the monthLabelDisplay
		 */
		private get currentMonthText():string
		{
			return this._currentMonthText;
		}

		/**
		 * @private
		 */
		private set currentMonthText(value:string)
		{
			this._currentMonthText = value;
			if(this.monthLabelDisplay)
				this.monthLabelDisplay.text = value;
		}

		//----------------------------------
		//  selectedCellPosition
		//----------------------------------
		/**
		 * @private
		 */
		private _selectedCellPosition:CellPosition;

		/**
		 * cell selected on the grid
		 */
		private get selectedCellPosition():CellPosition
		{
			return this._selectedCellPosition;
		}

		/**
		 * @private
		 */
		private set selectedCellPosition(value:CellPosition)
		{
			this._selectedCellPosition = value;
			if(this.bodyGrid)
				this.bodyGrid.selectedCell = value
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
		public getTodayCellPosition():CellPosition {
			var today:Date = new Date();
			if(this.displayedMonth == today.month && this.displayedYear == today.fullYear) {
				var cellPosition:CellPosition = new CellPosition();
				var date:Date = new Date(this.displayedYear,this.displayedMonth,1);
				var currentWeek:number = -1.
				while(date.month == this.displayedMonth) {
					if(date.day == this.firstDayOfWeek || currentWeek==-1) {
						currentWeek++;
					}
					if(date.date == today.date) {
						cellPosition.rowIndex = currentWeek;
						cellPosition.columnIndex = (today.day+this.firstDayOfWeek)%7;
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
		public isEnabledCell(rowIndex:number, columnIndex:number):boolean
		{
			var date:Date = this.getDateForCell(rowIndex,columnIndex);
			return this.isEnableddDate(date);
		}


		/**
		 * @private
		 */
		/*override*/ /*protected*/ commitProperties():void {
			super.commitProperties();
			var i:number,weekObject:Object;

			if(this.maxYearChanged || this.minYearChanged) {
				if(this.displayedYear < this.minYear)
					this.displayedYear = this.minYear;
				if(this.displayedYear > this.maxYear)
					this.displayedYear = this.maxYear;
				if(this.yearNavigator) {
					this.yearNavigator.maximum = this.maxYear;
					this.yearNavigator.minimum = this.minYear;
				}
			}
			if(this.showTodayChanged || this.disabledDaysChanged || this.selectableRangeChanged) {
				if(this.bodyGrid && this.bodyGrid.grid)
					this.bodyGrid.grid.invalidateDisplayList();
			}
			if(this.selectedDateChanged) {
				this.commitVisualSelection(true);
			}
			if(this.firstDayOfWeekChanged || this.displayedMonthChanged || this.displayedYearChanged || this.disabledRangesChanged) {
				this.updateGridDataProvider();
				if(!this.selectedDateChanged) {
					this.commitVisualSelection(false);
				}
				else {
					if(this.bodyGrid) {
						this.bodyGrid.selectedCell = this.selectedCellPosition
					}
				}
			}
			if(this.firstDayOfWeekChanged || this.dayNamesChanged) {
				this.updateGridColumn();
			}
			if(this.displayedMonthChanged || this.monthNamesChanged || this.monthSymbolChanged) {
				this.updateMonthText();
			}
			if(this.displayedYearChanged && this.yearNavigator) {
				this.yearNavigator.value = this.displayedYear
			}

			this.monthNamesChanged = false;
			this.monthSymbolChanged = false;
			this.selectedDateChanged = false;
			this.displayedMonthChanged = false;	
			this.displayedYearChanged = false;
			this.firstDayOfWeekChanged = false;
			this.dayNamesChanged = false;
			this.maxYearChanged = false;
			this.minYearChanged = false;
			this.disabledDaysChanged = false;
			this.showTodayChanged = false;
			this.disabledRangesChanged = false;
			this.selectableRangeChanged = false;
		}


		/**
		 * @private
		 */
		/*override*/ /*protected*/ resourcesChanged():void
		{
			super.resourcesChanged();

			this.dayNames = this.dayNamesOverride;
			this.firstDayOfWeek = this.firstDayOfWeekOverride;
			this.monthNames = this.monthNamesOverride;
			this.monthSymbol = this.monthSymbolOverride;
			this.yearSymbol = this.yearSymbolOverride;
		}


		/**
		 * @private
		 */
		/*override*/ /*protected*/ getCurrentSkinState():string {
			if(this.yearNavigationEnabled) {
				return this.enabled?"normalWithYearNavigation":"disabledWithYearNavigation";
			}
			return this.enabled?"normal":"disabled";
		}

		/**
		 * @private
		 */
		/*override*/ /*protected*/ partAdded(partName:string, instance:Object):void {
			super.partAdded(partName,instance);
			if(instance == this.bodyGrid) {
				this.bodyGrid.dateChooser = this;
				this.bodyGrid.columns = this.gridColumns;
				this.bodyGrid.dataProvider = this.gridDataProvider;
				this.bodyGrid.selectedCell = this.selectedCellPosition;
				this.bodyGrid.selectionMode = GridSelectionMode.SINGLE_CELL
				this.bodyGrid.addEventListener(GridSelectionEvent.SELECTION_CHANGING,this.bodyGrid_selectionChangingHandler);
				this.bodyGrid.addEventListener(GridSelectionEvent.SELECTION_CHANGE,this.bodyGrid_selectionChangeHandler);
				this.bodyGrid.addEventListener(GridEvent.GRID_ROLL_OVER,this.bodyGrid_gridRollOverHandler);
			}
			else if(instance == this.monthLabelDisplay) {
				this.monthLabelDisplay.text = this.currentMonthText;
			}
			else if(instance == this.nextMonthButton) {
				this.nextMonthButton.addEventListener(MouseEvent.CLICK,this.nextMonthButton_clickHandler);
			}
			else if(instance == this.prevMonthButton) {
				this.prevMonthButton.addEventListener(MouseEvent.CLICK,this.prevMonthButton_clickHandler);
			}
			else if(instance == this.yearNavigator) {
				this.yearNavigator.maximum = this.maxYear;
				this.yearNavigator.minimum = this.minYear;
				this.yearNavigator.value = this.displayedYear;
				this.yearNavigator.yearSymbol = this.yearSymbol;
				this.yearNavigator.addEventListener(Event.CHANGE,this.yearNavigator_changeHandler);
			}
		}



		/**
		 * @private
		 */
		/*override*/ /*protected*/ partRemoved(partName:string, instance:Object):void {
			super.partRemoved(partName,instance);
			if(instance == this.bodyGrid) {
				this.bodyGrid.removeEventListener(GridSelectionEvent.SELECTION_CHANGING,this.bodyGrid_selectionChangingHandler);
				this.bodyGrid.removeEventListener(GridSelectionEvent.SELECTION_CHANGE,this.bodyGrid_selectionChangeHandler);
				this.bodyGrid.removeEventListener(GridEvent.GRID_ROLL_OVER,this.bodyGrid_gridRollOverHandler);
			}
			else if(instance == this.nextMonthButton) {
				this.nextMonthButton.removeEventListener(MouseEvent.CLICK,this.nextMonthButton_clickHandler);
			}
			else if(instance == this.prevMonthButton) {
				this.prevMonthButton.removeEventListener(MouseEvent.CLICK,this.prevMonthButton_clickHandler);
			}
			else if(instance == this.yearNavigator) {
				this.yearNavigator.removeEventListener(Event.CHANGE,this.yearNavigator_changeHandler);
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
		/*protected*/ bodyGrid_selectionChangingHandler(event:GridSelectionEvent):void
		{
			if(!this.isEnabledCell(event.selectionChange.rowIndex,event.selectionChange.columnIndex)){
				event.preventDefault();
			}
		}		

		/**
		 * @private
		 * handle selectionChange events dispatched by the grid, and commit the selection
		 */
		/*protected*/ bodyGrid_selectionChangeHandler(event:GridSelectionEvent):void
		{
			var date:Date = this.getDateForCell(event.selectionChange.rowIndex,event.selectionChange.columnIndex);
			date = new Date(date.time);
			this.setSelectedDate(date)
		}		



		/**
		 * @private
		 * handle rollOver events on grid cell, prevent the rollOverIndicator to be displayed
		 * if the cell is not selectable.
		 */
		/*protected*/ bodyGrid_gridRollOverHandler(event:GridEvent):void
		{
			if(!this.isEnabledCell(event.rowIndex,event.columnIndex) && this.bodyGrid && this.bodyGrid.grid) {
				this.bodyGrid.grid.hoverRowIndex = -1;
				this.bodyGrid.grid.hoverColumnIndex = -1;
			}
		}

		/**
		 * @private
		 * handle prevMonthButton click events
		 */
		/*protected*/ prevMonthButton_clickHandler(event:MouseEvent):void
		{
			this.decreaseDisplayedMonth();
		}


		/**
		 * @private
		 * handle nextMonthButton click events
		 */
		/*protected*/ nextMonthButton_clickHandler(event:MouseEvent):void
		{
			this.increaseDisplayedMonth();
		}		


		/**
		 * @private
		 * handle yearNavigation change events
		 */
		/*protected*/ yearNavigator_changeHandler(event:Event):void
		{
			var increased:boolean = this.displayedYear < this.yearNavigator.value;
			this.displayedYear = this.yearNavigator.value;
			this.dispatchScrollingEvent(increased?DateChooserEventDetail.NEXT_YEAR:DateChooserEventDetail.PREVIOUS_YEAR);
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
		private setSelectedDate(date:Date):void
		{
			//dispatch a selectionChanging event to allow the user to prevent/modify the selection
			var selectionEvent:DateChooserSelectionEvent = 
				new DateChooserSelectionEvent(DateChooserSelectionEvent.SELECTION_CHANGING,false,true,this.selectedDate,date);

			this.dispatchEvent(selectionEvent);
			//if the event have not been default prevented commit the selection
			if(!selectionEvent.isDefaultPrevented()) {
				this.selectedDate = selectionEvent.newDate;
				this.dispatchEvent(new FlexEvent(FlexEvent.VALUE_COMMIT));
			}

			//if event have been selected, or date have been modified commit the visual selection
			if(selectionEvent.isDefaultPrevented() || selectionEvent.newDate != date)
				this.commitVisualSelection(true);
		}

		/**
		 * @private
		 * increase the displayed month
		 */
		private increaseDisplayedMonth():void
		{
			if(this.displayedMonth == 11) {
				if(this.displayedYear >= this.maxYear)
					return;
				this.displayedYear++;
				this.displayedMonth = 0;
			} 
			else { 
				this.displayedMonth++;
			}
			this.dispatchScrollingEvent(DateChooserScrollEventDetail.NEXT_MONTH);
		}		

		/**
		 * @private
		 * decrease the displayed month
		 */
		private decreaseDisplayedMonth():void
		{
			if(this.displayedMonth ==0) {
				if(this.displayedYear <= this.minYear)
					return;
				this.displayedYear--;
				this.displayedMonth = 11;
			}
			else {
				this.displayedMonth--;
			}
			this.dispatchScrollingEvent(DateChooserScrollEventDetail.PREVIOUS_MONTH);
		}


		private dispatchScrollingEvent(detail:string):void
		{
			this.dispatchEvent(new DateChooserScrollEvent(DateChooserScrollEvent.SCROLL,false,false,detail));
		}

		/**
		 * @private
		 * create column passed to the bodyGrid skinPart
		 */
		private updateGridColumn():void
		{
			var days:number[] = new Array<number>();
			var gridColumnsArray:any[] = []
			for(var i:number =0;i<7;i++) {
				var day:number = (i+this.firstDayOfWeek)%7;
				var collumn:GridColumn = new GridColumn();
				collumn.dataField = DateChooser.dayProps[day];
				collumn.headerText = this.dayNames[day];
				collumn.labelFunction = this.gridLabelFunction;
				gridColumnsArray.push(collumn);
			}
			this.gridColumns = new ArrayList(gridColumnsArray);
		}

		/**
		 * @private
		 * create the dataProvider passed to the bodyGrid skinPart
		 */
		private updateGridDataProvider():void
		{
			var date:Date = new Date(this.displayedYear,this.displayedMonth,1);
			var weekObjects:any[] = new Array(6);
			var currentObject:Object;
			for (var i:number = 0; i < weekObjects.length; i++) 
			{
				weekObjects[i] = currentObject = new Object();
			}
			var currentWeek:number = -1;

			while(date.month == this.displayedMonth) {
				if(date.day == this.firstDayOfWeek || currentWeek==-1) {
					currentWeek++;
					currentObject =  weekObjects[currentWeek];
				}
				currentObject[DateChooser.dayProps[date.day]] = new Date(date.time);
				date.date++;
			}
			this.gridDataProvider = new ArrayList(weekObjects);
		}

		/**
		 * @private 
		 * update the text displayed by the monthLabelDisplay
		 */
		private updateMonthText():void
		{
			this.currentMonthText = this.monthNames[this.displayedMonth]+this.monthSymbol;
		}


		/**
		 * @private
		 * commit the visual selection
		 * @params overrideMonthAndYear 
		 * 		if true, will set the displayedMonth/displayedYear properties 
		 * 		to be sure that the selectedDate is currently displayed
		 */
		private commitVisualSelection(overrideMonthAndYear:boolean):void
		{
			if(this.selectedDate ) {
				if(this.displayedMonth != this.selectedDate.month || this.displayedYear != this.selectedDate.fullYear) {
					if(overrideMonthAndYear) {
						this.displayedMonth = this.selectedDate.month;
						this.displayedYear = this.selectedDate.fullYear;
					}
					else  {
						this.selectedCellPosition = null;
						return;
					}
				}
				var date:Date = new Date(this.displayedYear,this.displayedMonth,1);
				var currentWeek:number = -1.
				while(date.month == this.displayedMonth) {
					if(date.day == this.firstDayOfWeek || currentWeek==-1) {
						currentWeek++;
					}
					if(date.date == this.selectedDate.date) {
						var cellPosition:CellPosition = new CellPosition();
						cellPosition.rowIndex = currentWeek;
						cellPosition.columnIndex = (date.day+this.firstDayOfWeek)%7;
						this.selectedCellPosition = cellPosition;
						return;
					}
					date.date++;
				}
			}
			else {
				this.selectedCellPosition = null;
			}
		}

		/**
		 * @private
		 * label function used by gridColumns of the bodyGrud
		 */
		private gridLabelFunction(weekObject:Object,column:GridColumn):string {
			if(weekObject) {
				var date:Date = <Date>weekObject[column.dataField] ;
				if(date)
					return String(date.date);
			}
			return " ";
		}




		/**
		 * @private
		 * return true if the the given date is contained by the current range
		 */
		private dateInRange(date:Date, range:Object):boolean
		{
			var hasRangeStart:boolean = (
				range.hasOwnProperty("rangeStart") && 
				range.rangeStart instanceof Date
			)

			var hasRangeEnd:boolean = (
				range.hasOwnProperty("rangeEnd") && 
				range.rangeEnd instanceof Date
			)

			var afterRangeStart:boolean = hasRangeStart && range.rangeStart.time <= date.time;
			var beforeRangeEnd:boolean = hasRangeEnd && range.rangeEnd.time >= date.time ;
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
		private getDateForCell(rowIndex:number,columnIndex:number):Date {
			if(this.gridDataProvider && this.gridColumns && rowIndex >=0 && rowIndex <7 && columnIndex >=0 && columnIndex < 7) {
				var week:Object = this.gridDataProvider.getItemAt(rowIndex);
				var column:GridColumn = <GridColumn>this.gridColumns.getItemAt(columnIndex) ;
				return week[column.dataField];
			}
			return null;
		}


		/**
		 * @private 
		 * return true if the date is currently selectable in compiliance with 
		 * the disabledDays, disabledRanges and selectableRange properties
		 */
		private isEnableddDate(date:Date):boolean {
			if(!date)
				return false;
			if(this.disabledDays && this.disabledDays.indexOf(date.day)!=-1)
				return false;
			if(this.disabledRanges) {
				for (var i in this.disabledRanges) {
                    var range:any  = this.disabledRanges[i];
					if(range instanceof Date && date.time == range.time) {
						return false;
					}
					else if(range instanceof Object && this.dateInRange(date,range)) {
						return false;
					}
				}
                for(i in this.disabledRanges) {
                    var range:any  = this.disabledRanges[i];
					if(range instanceof Date && date.time == range.time) {
						return false;
					}
					else if(range instanceof Object && this.dateInRange(date,range)) {
						return false;
					}
				}
			}
			if(this.selectableRange && !this.dateInRange(date,this.selectableRange)) {
				return false;
			}
			return true;
		}

		/**
		 * @private
		 */
		private dispatchChangeEvent(event:string):void
		{
			if(this.hasEventListener(event))
				this.dispatchEvent(new Event(event));
		}

		/**
		 *  @private
		 *  This method scrubs out time values from incoming date objects
		 */ 
		private scrubTimeValue(value:Object):Object
		{
			if (value instanceof Date)
			{
				return new Date(value.getFullYear(), value.getMonth(), value.getDate());
			}
			else if (value instanceof Object) 
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
		private scrubTimeValues(values:any[]):any[]
		{
			var dates:any[] = [];
			for (var i:number = 0; i < values.length; i++)
			{
				dates[i] = this.scrubTimeValue(values[i]);
			}
			return dates;
		}

	}
}