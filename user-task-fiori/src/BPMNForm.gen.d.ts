import Event from "sap/ui/base/Event";
import { PropertyBindingInfo } from "sap/ui/base/ManagedObject";
import Control from "sap/ui/core/Control";
import { AggregationBindingInfo } from "sap/ui/base/ManagedObject";
import { $ControlSettings } from "sap/ui/core/Control";

declare module "./BPMNForm" {

    /**
     * Interface defining the settings object used in constructor calls
     */
    interface $BPMNFormSettings extends $ControlSettings {
        buttonText?: string | PropertyBindingInfo;
        placeHolderText?: string | PropertyBindingInfo;
        finalResultTextSuccess?: string | PropertyBindingInfo;
        finalResultTextFail?: string | PropertyBindingInfo;
        submitButtonVisible?: boolean | PropertyBindingInfo | `{${string}}`;
        valid?: boolean | PropertyBindingInfo | `{${string}}`;
        formStep?: number | PropertyBindingInfo | `{${string}}`;
        items?: Control[] | Control | AggregationBindingInfo | `{${string}}`;
        summary?: (event: BPMNForm$SummaryEvent) => void;
        finishedForm?: (event: BPMNForm$FinishedFormEvent) => void;
    }

    export default interface BPMNForm {

        // property: buttonText
        getButtonText(): string;
        setButtonText(buttonText: string): this;

        // property: placeHolderText
        getPlaceHolderText(): string;
        setPlaceHolderText(placeHolderText: string): this;

        // property: finalResultTextSuccess
        getFinalResultTextSuccess(): string;
        setFinalResultTextSuccess(finalResultTextSuccess: string): this;

        // property: finalResultTextFail
        getFinalResultTextFail(): string;
        setFinalResultTextFail(finalResultTextFail: string): this;

        // property: submitButtonVisible
        getSubmitButtonVisible(): boolean;
        setSubmitButtonVisible(submitButtonVisible: boolean): this;

        // property: valid
        getValid(): boolean;
        setValid(valid: boolean): this;
        bindValid(bindingInfo: PropertyBindingInfo): this;
        unbindValid(): this;

        // property: formStep
        getFormStep(): number;
        setFormStep(formStep: number): this;
        bindFormStep(bindingInfo: PropertyBindingInfo): this;
        unbindFormStep(): this;

        // aggregation: items
        getItems(): Control[];
        addItem(items: Control): this;
        insertItem(items: Control, index: number): this;
        removeItem(items: number | string | Control): Control | null;
        removeAllItems(): Control[];
        indexOfItem(items: Control): number;
        destroyItems(): this;

        // event: summary
        attachSummary(fn: (event: BPMNForm$SummaryEvent) => void, listener?: object): this;
        attachSummary<CustomDataType extends object>(data: CustomDataType, fn: (event: BPMNForm$SummaryEvent, data: CustomDataType) => void, listener?: object): this;
        detachSummary(fn: (event: BPMNForm$SummaryEvent) => void, listener?: object): this;
        fireSummary(parameters?: BPMNForm$SummaryEventParameters): this;

        // event: finishedForm
        attachFinishedForm(fn: (event: BPMNForm$FinishedFormEvent) => void, listener?: object): this;
        attachFinishedForm<CustomDataType extends object>(data: CustomDataType, fn: (event: BPMNForm$FinishedFormEvent, data: CustomDataType) => void, listener?: object): this;
        detachFinishedForm(fn: (event: BPMNForm$FinishedFormEvent) => void, listener?: object): this;
        fireFinishedForm(parameters?: BPMNForm$FinishedFormEventParameters): this;
    }

    /**
     * Interface describing the parameters of BPMNForm's 'summary' event.
     */
    // eslint-disable-next-line
    export interface BPMNForm$SummaryEventParameters {
    }

    /**
     * Interface describing the parameters of BPMNForm's 'finishedForm' event.
     */
    // eslint-disable-next-line
    export interface BPMNForm$FinishedFormEventParameters {
    }

    /**
     * Type describing the BPMNForm's 'summary' event.
     */
    export type BPMNForm$SummaryEvent = Event<BPMNForm$SummaryEventParameters>;

    /**
     * Type describing the BPMNForm's 'finishedForm' event.
     */
    export type BPMNForm$FinishedFormEvent = Event<BPMNForm$FinishedFormEventParameters>;
}
