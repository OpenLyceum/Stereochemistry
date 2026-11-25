import type { Property, TReadOnlyProperty } from "scenerystack/axon";
import { type Node, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { ComboBox, type ComboBoxItem } from "scenerystack/sun";
import { StringManager } from "../../i18n/StringManager.js";
import { STEREO_LAYOUT_SETTINGS as SETTINGS } from "../../StereochemistryConstants.js";
import { CYCLOHEXANE_LIBRARY, MOLECULE_LIBRARY } from "../model/MoleculeLibrary.js";
import { LIGHT_SURFACE_TEXT_FILL, STEREOCHEMISTRY_COMBO_BOX_OPTIONS } from "../StereochemistryButtonOptions.js";

type Entry = (typeof MOLECULE_LIBRARY)[number] | (typeof CYCLOHEXANE_LIBRARY)[number];
type Family = Entry["family"];

export class MoleculeChooserNode<Id extends string> extends ComboBox<Id> {
  public constructor(
    selectionProperty: Property<Id>,
    family: Family,
    listParent: Node,
    accessibleName: TReadOnlyProperty<string>,
    extraItem?: { id: Id; label: TReadOnlyProperty<string> },
  ) {
    const names = StringManager.getInstance().getMoleculeNames();
    const format = (label: TReadOnlyProperty<string>) =>
      new Text(label, {
        fill: LIGHT_SURFACE_TEXT_FILL,
        font: new PhetFont(SETTINGS.FONT_SIZE),
        maxWidth: SETTINGS.PICKER_ITEM_MAX_WIDTH,
      });
    const entries = [...MOLECULE_LIBRARY, ...CYCLOHEXANE_LIBRARY].filter(
      ({ family: candidate }) => candidate === family,
    );
    const items: ComboBoxItem<Id>[] = entries.map(({ id }) => {
      const value = selectionProperty.validValues?.find((candidate) => candidate === id);
      if (value === undefined) {
        throw new Error(`Molecule chooser selection must allow ${id}`);
      }
      const label = names[`${id}StringProperty`];
      return { value, createNode: () => format(label), accessibleName: label };
    });
    if (extraItem) {
      const { id, label } = extraItem;
      items.push({ value: id, createNode: () => format(label), accessibleName: label });
    }
    super(selectionProperty, items, listParent, {
      ...STEREOCHEMISTRY_COMBO_BOX_OPTIONS,
      accessibleName,
      listPosition: "above",
    });
  }
}
