import { EditableContentManager } from "./EditableContentManager";
import { QueryCommandManager } from "./QueryCommandManager";

new EditableContentManager().beginEditableContentHandling(document);
// new ExternalCssLoader().beginExternalCssObservation(document);
new QueryCommandManager().overrideQueryCommandValue(document);

document.documentElement!.dispatchEvent(new CustomEvent("PageScriptLoaded"));