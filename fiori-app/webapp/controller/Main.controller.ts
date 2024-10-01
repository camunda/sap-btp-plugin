import MessageBox from "sap/m/MessageBox";
import BaseController from "./BaseController";

/**
 * @namespace io.camunda.connector.sap.btp.app.controller
 */
export default class Main extends BaseController {
	public sayHello(): void {
		MessageBox.show("Hello World!");
	}
}
