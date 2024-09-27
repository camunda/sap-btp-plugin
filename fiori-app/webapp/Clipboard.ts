export default abstract class Clipboard {
  /**
   * copy given text to clipboard
   *
   * @param text the text that will be copied to clipboard
   */
  public static copyTextToClipboard(text: string): void {
    const copyFrom = $("<textarea/>")
    copyFrom.text(text)
    $("body").append(copyFrom)
    copyFrom.select()
    document.execCommand("copy")
    copyFrom.remove()
  }
}
