import Panel from "sap/m/Panel"
import Device from "sap/ui/Device"
import VerticalLayout from "sap/ui/layout/VerticalLayout"
import Toolbar from "sap/m/Toolbar"
import Button from "sap/m/Button"
import { ButtonType } from "sap/m/library"
import Text from "sap/m/Text"

/**
 * @namespace io.camunda.connector.sap.btp.control
 */
class SlidePanel extends Panel {
  /* Add new property */
  _layoutWidth = null
  _slidedAway: boolean = null
  //_oSlideButton: Button = null

  metadata = {
    properties: {
      startVisible: {
        type: "boolean",
        defaultValue: false
      },
      autoWidth: {
        type: "boolean",
        defaultValue: true
      },
      toolbarTitle: {
        type: "string",
        defaultValue: ""
      },
      slideButtonType: {
        type: "string",
        defaultValue: ButtonType.Transparent
      },
      slideButtonTooltip: {
        type: "string",
        defaultValue: "Click to slide panel in and out"
      },
      slideButtonVisIcon: {
        type: "string",
        defaultValue: "sap-icon://navigation-left-arrow"
      },
      slideButtonHidIcon: {
        type: "string",
        defaultValue: "sap-icon://navigation-right-arrow"
      },
      contrastStyle: {
        type: "boolean",
        defaultValue: true
      }
    },
    aggregations: {
      _oSlideButton: {
        type: "sap.m.Button",
        multiple: false
      }
    }
  }

  /* =========================================================== */
  /* lifecycle methods                                           */
  /* =========================================================== */

  /* Initialisation */
  init(): void {
    // call standard initialisation
    if (Panel.prototype.init) {
      Panel.prototype.init.apply(this)
    }

    // add SlidePanel object local properties:
    // width that needs to be slided: set after rendering, depending on rendered object
    this._layoutWidth = 0
    // current panel status: whether it's slided away or not (used in button press handler)
    this._slidedAway = this.getStartVisible() ? false : true
    // button for sliding the SlidePanel
    // -> added to SlidePanel object for easy access in later methods
    this.setAggregation(
      "_oSlideButton",
      new Button({
        press: this._onSlidePanel.bind(this) // IMPORTANT to bind to SlidePanel object
      })
    )
    //debugger
    // position of the button in the panel's header toolbar
    //this._oSlideButton.addStyleClass("absoluteTopRight")
  }

  /* Changes before rendering... */
  onBeforeRendering(): void {
    //debugger
    if (Panel.prototype.onBeforeRendering) {
      Panel.prototype.onBeforeRendering.apply(this, arguments)
    }

    /* Force transparent style on the panel */
    this.setBackgroundDesign("Transparent")

    /* Determine/set width */
    if (this.getAutoWidth() || !this.getWidth()) {
      if (Device.system.tablet && Device.orientation.portrait) {
        this.setWidth("50%")
      } else if (Device.system.tablet && Device.orientation.landscape) {
        this.setWidth("40%")
      } else if (Device.system.desktop) {
        this.setWidth("25%")
      } else {
        this.setWidth("80%")
      }
    }

    /* Force header toolbar 
	  (which will have the button for sliding and optional a text for the title) */
    const oTB = new Toolbar({
      design: "Solid",
      style: "Clear"
    })
    if (this.getContrastStyle()) {
      oTB.addStyleClass("sapContrast")
    }
    oTB.addContent(
      new Text({
        text: this.getToolbarTitle(), // set toolbar title
        textAlign: "Center",
        width: "90%"
      })
    )
    // style the already created slide button for header toolbar
    //debugger
    const _oButton: Button = this.getAggregation("_oSlideButton")
    _oButton.setType(this.getSlideButtonType())
    //this._oSlideButton.setTooltip(this.getSlideButtonTooltip())
    //this._oSlideButton.setIcon(this.getStartVisible() ? this.getSlideButtonVisIcon() : this.getSlideButtonHidIcon())
    // add button to toolbar
    oTB.addContent(_oButton)
    this.setHeaderToolbar(oTB)
  }

  /* Rendering... */
  renderer(oRM, oControl): void {
    debugger
    // start slide panel div with id
    oRM.openStart("div", oControl.getId())
    // position and style slide panel
    oRM.style("position", "absolute")
    oRM.style("top", "0")
    oRM.style("left", "0")
    oRM.style("z-index", "999")
    if (oControl.getStartVisible()) {
      oRM.style("visibility", "visible")
    } else {
      oRM.style("visibility", "hidden")
    }
    // set width
    oRM.style("width", oControl.getWidth())
    // PANEL CONTENT ----------------------------
    oRM.openEnd()
    // toolbars
    let oTB = oControl.getHeaderToolbar()
    if (!oTB) {
      // N/A
    } else {
      oRM.renderControl(oTB)
    }
    oTB = null
    oTB = oControl.getInfoToolbar()
    if (!oTB) {
      // N/A
    } else {
      oRM.renderControl(oTB)
    }
    // content - add a wrapper around the content
    const oLayout = new VerticalLayout({
      width: "100%"
    })
    if (oControl.getContrastStyle()) {
      oLayout.addStyleClass("sapContrast")
      oLayout.addStyleClass("layoutContrastBG")
    } else {
      oLayout.addStyleClass("sapMPageBgStandard")
    }
    oLayout.addStyleClass("smallPadding")
    // add the content from SlidePanel from the view, into the wrapper
    oControl.getContent().forEach(function (oCtrl) {
      oLayout.addContent(oCtrl)
    })
    // render wrapper
    oRM.renderControl(oLayout)
    // close slide panel div
    oRM.close("div")
  }

  /* Changes, after rendering is done... */
  onAfterRendering(): void {
    debugger
    if (Panel.prototype.onAfterRendering) {
      Panel.prototype.onAfterRendering.apply(this, arguments)
    }
    // set VerticalLayout width:
    // 1) subtract slide button width & margin (we don't know this until after rendering)
    // 2) consider layout padding
    const oLayout = this.$().find(".sapUiVlt")
    if (oLayout.length === 1) {
      const oBtn = this.getAggregation("_oSlideButton").$(), // get jQuery object of button
        padding =
          parseInt(oLayout.css("padding-left").slice(0, -2), 10) +
          parseInt(oLayout.css("padding-right").slice(0, -2), 10),
        bMargin =
          parseInt(oBtn.css("margin-left").slice(0, -2), 10) + parseInt(oBtn.css("margin-right").slice(0, -2), 10)
      oLayout.width(oLayout.width() - oBtn.width() - bMargin - padding)
      // set sliding width (including padding)
      this._layoutWidth = oLayout.width() + padding
    }
    // check if the panel needs to be slided away at start
    if (!this.getStartVisible()) {
      const oSP = this.$() // to use in animate callback
      // slide away
      this.$().animate({ left: "-" + this._layoutWidth }, 100, function () {
        oSP.css("visibility", "visible") // make it visible, now that it's slided away
      })
    }
  }

  /* =========================================================== */
  /* event handlers                                              */
  /* =========================================================== */

  /* slide button's press event */
  _onSlidePanel(): void {
    const that = this // to use in animate callback
    // slide the panel left/right using jQuery animate
    if (that._slidedAway) {
      that.$().animate({ left: "0" }, 350, function () {
        that._oSlideButton.setIcon(that.getSlideButtonVisIcon())
        that._slidedAway = false
      })
    } else {
      that.$().animate({ left: "-" + that._layoutWidth }, 350, function () {
        that._oSlideButton.setIcon(that.getSlideButtonHidIcon())
        that._slidedAway = true
      })
    }
  }
}

export default SlidePanel
