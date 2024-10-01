import { ExampleColor } from "io/camunda/connector/sap/btp/lib/library";
import Example from "io/camunda/connector/sap/btp/lib/Example";

// create a new instance of the Example control and
// place it into the DOM element with the id "content"
new Example({
	text: "my ex",
	color: ExampleColor.Highlight,
	press: (event) => {
		alert(event.getSource());
	}
}).placeAt("content");
