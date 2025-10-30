import JSONModel from "sap/ui/model/json/JSONModel"
import type Context from "sap/ui/model/Context"
import ChangeReason from "sap/ui/model/ChangeReason"

/**
 * @namespace io.camunda.connector.sap.btp.app.model
 */
export default class DeepJSONModel extends JSONModel {
  /**
   * Overrides the default setProperty method to also fire a propertyChange event
   * for parent paths.
   *
   * @param sPath The path of the property to set.
   * @param oValue The new value for the property.
   * @param oContext The context used for path resolution.
   * @param bAsyncUpdate Whether the update should be done asynchronously.
   * @returns True if the value was set, false otherwise.
   */
  public setProperty(sPath: string, oValue: any, oContext?: Context, bAsyncUpdate?: boolean): boolean {
    // 1. Call the original setProperty method.
    // This ensures that the value is actually updated in the model
    // and the default event for the exact path is fired.
    const bSuccess = super.setProperty(sPath, oValue, oContext, bAsyncUpdate)

    // 2. If the update was successful, fire additional events.
    if (bSuccess) {
      // Split the path into its parts. e.g., "/BPMNform/variables/firstName" -> ["", "BPMNform", "variables", "firstName"]
      const aPathParts = sPath.split("/")

      // 3. Iterate backwards through the path parts to create the parent paths.
      // We start at the second to last part and go up to the first real path part.
      for (let i = aPathParts.length - 1; i > 1; i--) {
        // Create the parent path. e.g., "/BPMNform/variables"
        const sParentPath = aPathParts.slice(0, i).join("/")

        // Get the new value for the parent path.
        const oParentValue = this.getProperty(sParentPath)

        // 4. Manually fire a 'propertyChange' event for the parent path.
        // This notifies all listeners that are waiting for changes on this object.
        this.firePropertyChange({
          path: sParentPath,
          value: oParentValue,
          reason: ChangeReason.Change // or "binding"
        })
      }
    }

    return bSuccess
  }
}