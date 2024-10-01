/*!
 * ${copyright}
 */

import Lib from "sap/ui/core/Lib";
import RenderManager from "sap/ui/core/RenderManager";
import BPMNForm from "./BPMNForm";
// import { ExampleColor } from "./library";

/**
 * Example renderer.
 * @namespace
 */
export default {
	apiVersion: 2, // usage of DOM Patcher

	/**
	 * Renders the HTML for the given control, using the provided {@link RenderManager}.
	 *
	 * @param rm The reference to the <code>sap.ui.core.RenderManager</code>
	 * @param control The control instance to be rendered
	 */
	render: function (rm: RenderManager, control: BPMNForm) {
		const i18n = Lib.getResourceBundleFor("io.camunda.connector.sap.btp.lib");

		rm.openStart("div", control);
		rm.openEnd();
		rm.text(`${i18n.getText("ANY_TEXT")}: ${control.getText()}`);
		rm.close("div");
	}
};
