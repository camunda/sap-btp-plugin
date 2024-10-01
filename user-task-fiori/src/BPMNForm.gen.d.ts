import Event from "sap/ui/base/Event";
import { PropertyBindingInfo } from "sap/ui/base/ManagedObject";
import { $ControlSettings } from "sap/ui/core/Control";

declare module "./BPMNForm" {

    /**
     * Interface defining the settings object used in constructor calls
     */
    interface $BPMNFormSettings extends $ControlSettings {

        /**
         * The text to display.
         */
        text?: string | PropertyBindingInfo;

        /**
         * Event is fired when the user clicks the control.
         */
        press?: (event: BPMNForm$PressEvent) => void;
    }

    export default interface BPMNForm {

        // property: text

        /**
         * The text to display.
         */
        getText(): string;

        /**
         * The text to display.
         */
        setText(text: string): this;

        // event: press

        /**
         * Event is fired when the user clicks the control.
         */
        attachPress(fn: (event: BPMNForm$PressEvent) => void, listener?: object): this;

        /**
         * Event is fired when the user clicks the control.
         */
        attachPress<CustomDataType extends object>(data: CustomDataType, fn: (event: BPMNForm$PressEvent, data: CustomDataType) => void, listener?: object): this;

        /**
         * Event is fired when the user clicks the control.
         */
        detachPress(fn: (event: BPMNForm$PressEvent) => void, listener?: object): this;

        /**
         * Event is fired when the user clicks the control.
         */
        firePress(parameters?: BPMNForm$PressEventParameters): this;
    }

    /**
     * Interface describing the parameters of BPMNForm's 'press' event.
     * Event is fired when the user clicks the control.
     */
    // eslint-disable-next-line
    export interface BPMNForm$PressEventParameters {
    }

    /**
     * Type describing the BPMNForm's 'press' event.
     * Event is fired when the user clicks the control.
     */
    export type BPMNForm$PressEvent = Event<BPMNForm$PressEventParameters>;
}
