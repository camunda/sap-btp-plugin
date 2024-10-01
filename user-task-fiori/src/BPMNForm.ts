/*!
 * ${copyright}
 */
import Control from "sap/ui/core/Control";
import type { MetadataOptions } from "sap/ui/core/Element";
import BPMNFormRenderer from "./BPMNFormRenderer";
// import { ExampleColor } from "./library";

/**
 * Constructor for a new <code>io.camunda.connector.sap.btp.lib.Example</code> control.
 *
 * Some class description goes here.
 * @extends Control
 *
 * @author Volker Buzek
 * @version ${version}
 *
 * @constructor
 * @public
 * @name io.camunda.connector.sap.btp.lib.BPMNForm
 */
export default class BPMNForm extends Control {
	// The following three lines were generated and should remain as-is to make TypeScript aware of the constructor signatures
	constructor(id?: string | $BPMNFormSettings);
	constructor(id?: string, settings?: $BPMNFormSettings);
	constructor(id?: string, settings?: $BPMNFormSettings) {
		super(id, settings);
	}

	static readonly metadata: MetadataOptions = {
		library: "io.camunda.connector.sap.btp.lib",
		properties: {
			/**
			 * The text to display.
			 */
			text: {
				type: "string",
				group: "Data",
				defaultValue: null
			},
			
		},
		events: {
			/**
			 * Event is fired when the user clicks the control.
			 */
			press: {}
		}
	};

	static renderer: typeof BPMNFormRenderer = BPMNFormRenderer;

	onclick = () => {
		this.firePress();
	};
}
