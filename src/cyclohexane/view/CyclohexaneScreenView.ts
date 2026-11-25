import { DerivedProperty, Multilink, PatternStringProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Range, toFixed } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { HBox, Line, Node, type TPaint, VBox } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { AquaRadioButtonGroup, ComboBox, HSlider } from "scenerystack/sun";
import { type RingSubstituent, slotIndex } from "../../common/model/Cyclohexane.js";
import {
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
  STEREOCHEMISTRY_COMBO_BOX_OPTIONS,
} from "../../common/StereochemistryButtonOptions.js";
import { StereochemistryPanel } from "../../common/StereochemistryPanel.js";
import { EnergyChartNode } from "../../common/view/EnergyChartNode.js";
import { MoleculeChooserNode } from "../../common/view/MoleculeChooserNode.js";
import { STEREO_SLIDER_OPTIONS, stereoButton, stereoCheckbox, stereoText } from "../../common/view/StereoControls.js";
import { StereoViewerNode } from "../../common/view/StereoViewerNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../StereochemistryColors.js";
import {
  STEREO_LAYOUT_SETTINGS as LAYOUT,
  CYCLOHEXANE_SETTINGS as RING,
  SCREEN_VIEW_MARGIN,
  CYCLOHEXANE_SCREEN_SETTINGS as SETTINGS,
} from "../../StereochemistryConstants.js";
import type { CyclohexaneModel } from "../model/CyclohexaneModel.js";
import { chairPopulationsProperty, relativeConfigurationProperty } from "./ChairReadouts.js";
import { CyclohexaneScreenSummaryContent } from "./CyclohexaneScreenSummaryContent.js";

export type CyclohexaneScreenViewOptions = ScreenViewOptions;

type Group = Exclude<RingSubstituent["group"], "H">;
type Face = RingSubstituent["face"];

export class CyclohexaneScreenView extends ScreenView {
  public constructor(model: CyclohexaneModel, providedOptions?: CyclohexaneScreenViewOptions) {
    super(
      optionize<CyclohexaneScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
        { screenSummaryContent: new CyclohexaneScreenSummaryContent(model) },
        providedOptions,
      ),
    );

    const manager = StringManager.getInstance();
    const strings = manager.getStereoStrings();
    const a11y = manager.getCyclohexaneA11yStrings();
    const sharedA11y = manager.getStereoA11yStrings();
    const groupNames = new Map<Group, typeof strings.groups.methylStringProperty>([
      ["CH3", strings.groups.methylStringProperty],
      ["CH2CH3", strings.groups.ethylStringProperty],
      ["CH(CH3)2", strings.groups.isopropylStringProperty],
      ["C(CH3)3", strings.groups.tertButylStringProperty],
      ["OH", strings.groups.hydroxylStringProperty],
      ["Cl", strings.groups.chloroStringProperty],
    ]);

    const colorFor = (index: number) => {
      if (!model.showBondTypesProperty.value) {
        return undefined;
      }
      const { axial, slotAtoms } = model.ringProperty.value;
      const slot = slotAtoms.indexOf(index);
      if (slot < 0) {
        return undefined;
      }
      return (axial[slot] ? Colors.axialColorProperty : Colors.equatorialColorProperty).value.toNumber();
    };
    const viewer = new StereoViewerNode(
      model.stereoViewModel,
      new Bounds2(0, 0, LAYOUT.CHAIR_VIEWPORT_WIDTH, SETTINGS.VIEWPORT_HEIGHT),
      {
        helpText: a11y.viewerHelpStringProperty,
        canPick: (index) => index < RING.RING_SIZE,
        appearanceDependencies: [model.showBondTypesProperty],
        atomColor: colorFor,
        bondColor: (a, b) => (a < RING.RING_SIZE ? colorFor(b) : b < RING.RING_SIZE ? colorFor(a) : undefined),
      },
    );
    const resetView = stereoButton(sharedA11y.resetViewStringProperty, () => model.stereoViewModel.resetView());
    const legendItem = (label: TReadOnlyProperty<string>, stroke: TPaint) =>
      new HBox({
        spacing: LAYOUT.ROW_GAP,
        children: [
          new Line(0, 0, SETTINGS.LEGEND_SWATCH_WIDTH, 0, { stroke, lineWidth: SETTINGS.LEGEND_SWATCH_LINE_WIDTH }),
          stereoText(label, LAYOUT.SMALL_FONT_SIZE),
        ],
      });
    const bondLegend = new HBox({
      spacing: LAYOUT.GAP,
      children: [
        legendItem(strings.axialStringProperty, Colors.axialColorProperty),
        legendItem(strings.equatorialStringProperty, Colors.equatorialColorProperty),
      ],
    });
    model.showBondTypesProperty.link((visible) => {
      bondLegend.visible = visible;
    });
    const viewerColumn = new VBox({
      spacing: LAYOUT.ROW_GAP,
      children: [stereoText(strings.molecule3DStringProperty, LAYOUT.HEADING_FONT_SIZE), viewer, bondLegend, resetView],
    });

    const landmarkNames = [
      strings.chairAStringProperty,
      strings.halfChairStringProperty,
      strings.twistBoatStringProperty,
      strings.halfChairStringProperty,
      strings.chairBStringProperty,
    ];
    const chart = new EnergyChartNode({
      width: LAYOUT.CHAIR_CHART_WIDTH,
      xRange: model.flipProperty.range,
      yRange: new Range(0, SETTINGS.CHART_MIN_MAX_ENERGY),
      xTick: SETTINGS.CHART_PROGRESS_TICK,
      yTick: SETTINGS.CHART_ENERGY_TICK,
      xLabel: strings.progressStringProperty,
      yLabel: strings.energyStringProperty,
      curveProperty: model.curveProperty,
      markerXProperty: model.flipProperty,
      markerEnergyProperty: model.energyProperty,
      namedPoints: RING.ENERGY_KEYFRAMES.map(([x], i) => ({
        x,
        label: landmarkNames[i] ?? strings.halfChairStringProperty,
      })),
      expandYRange: true,
    });
    const chartColumn = new VBox({
      spacing: LAYOUT.GAP,
      children: [stereoText(strings.energyProfileStringProperty, LAYOUT.HEADING_FONT_SIZE), chart],
    });

    const deltaProperty = new DerivedProperty([model.equilibriumProperty], (value) => value.ΔG);
    const ratioProperty = new DerivedProperty([model.equilibriumProperty], ({ K }) =>
      Intl.NumberFormat(undefined, { maximumSignificantDigits: 3 }).format(K),
    );
    const strainAProperty = new DerivedProperty([model.strainProperty], ({ A }) => A);
    const strainBProperty = new DerivedProperty([model.strainProperty], ({ B }) => B);
    const readout = new StereochemistryPanel(
      new VBox({
        spacing: LAYOUT.GAP,
        align: "left",
        children: [
          stereoText(chairPopulationsProperty(model), LAYOUT.HEADING_FONT_SIZE),
          stereoText(
            new PatternStringProperty(
              strings.strainStringProperty,
              { a: strainAProperty, b: strainBProperty },
              { decimalPlaces: 1 },
            ),
          ),
          stereoText(
            new PatternStringProperty(strings.deltaGStringProperty, { value: deltaProperty }, { decimalPlaces: 1 }),
          ),
          stereoText(new PatternStringProperty(strings.ratioStringProperty, { value: ratioProperty })),
          stereoText(relativeConfigurationProperty(model)),
        ],
      }),
    );

    const listParent = new Node();
    const chooser = new MoleculeChooserNode(
      model.presetProperty,
      "cyclohexane",
      listParent,
      strings.presetStringProperty,
      {
        id: "custom",
        label: strings.customStringProperty,
      },
    );
    const flip = stereoButton(strings.flipStringProperty, () => model.startFlip());
    const progress = new HSlider(model.flipProperty, model.flipProperty.range, {
      ...STEREO_SLIDER_OPTIONS,
      accessibleName: strings.progressStringProperty,
      keyboardStep: SETTINGS.SLIDER_STEP,
      startDrag: () => {
        model.flippingProperty.value = false;
      },
      pdomDependencies: [a11y.progressDescriptionStringProperty],
      pdomCreateAriaValueText: (value) =>
        a11y.progressDescriptionStringProperty.value.replace("{{value}}", toFixed(100 * (value ?? 0), 0)),
    });
    const bondTypes = stereoCheckbox(model.showBondTypesProperty, strings.bondTypesStringProperty);
    const diaxial = stereoCheckbox(model.showDiaxialProperty, strings.diaxialStringProperty);
    const flipControls = new StereochemistryPanel(
      new VBox({
        align: "left",
        spacing: LAYOUT.ROW_GAP,
        children: [
          new HBox({ children: [stereoText(strings.presetStringProperty), chooser], spacing: LAYOUT.ROW_GAP }),
          new HBox({ children: [flip, progress], spacing: LAYOUT.GAP }),
          bondTypes,
          diaxial,
        ],
      }),
    );

    const groupProperty = new Property<Group>("CH3");
    const faceProperty = new Property<Face>("up");
    const groupCombo = new ComboBox(
      groupProperty,
      [...groupNames].map(([value, label]) => ({
        value,
        createNode: () => stereoText(label, LAYOUT.FONT_SIZE, LIGHT_SURFACE_TEXT_FILL),
        accessibleName: label,
      })),
      listParent,
      { ...STEREOCHEMISTRY_COMBO_BOX_OPTIONS, accessibleName: strings.groupStringProperty, listPosition: "above" },
    );
    const faceOptions = [
      { value: "up" as const, label: strings.upStringProperty },
      { value: "down" as const, label: strings.downStringProperty },
    ];
    const faceRadio = new AquaRadioButtonGroup<Face>(
      faceProperty,
      faceOptions.map(({ value, label }) => ({
        value,
        createNode: () => stereoText(label),
        options: { accessibleName: label },
      })),
      { orientation: "horizontal", spacing: LAYOUT.GAP, accessibleName: strings.faceStringProperty },
    );
    const selection = model.stereoViewModel.pickedAtomProperty;
    const selectedCarbonProperty = new DerivedProperty(
      [selection, strings.selectedCarbonStringProperty, strings.selectCarbonStringProperty],
      (carbon, pattern, hint) => (carbon === null ? hint : pattern.replace("{{index}}", String(carbon + 1))),
    );
    const edit = (group: RingSubstituent["group"]) => {
      const carbon = selection.value;
      if (carbon !== null) {
        model.editSubstituent({ carbon, group, face: faceProperty.value });
      }
    };
    const add = stereoButton(strings.addStringProperty, () => edit(groupProperty.value));
    const remove = stereoButton(strings.removeStringProperty, () => edit("H"));
    Multilink.multilink([selection, faceProperty, model.substituentsProperty], (carbon, face, subs) => {
      add.enabled = carbon !== null;
      remove.enabled =
        carbon !== null && subs.some((sub) => sub.carbon === carbon && sub.face === face && sub.group !== "H");
    });
    const editor = new StereochemistryPanel(
      new VBox({
        align: "left",
        spacing: LAYOUT.ROW_GAP,
        children: [
          stereoText(strings.editorStringProperty, LAYOUT.HEADING_FONT_SIZE),
          stereoText(selectedCarbonProperty),
          new HBox({
            children: [
              stereoText(strings.groupStringProperty),
              groupCombo,
              stereoText(strings.faceStringProperty),
              faceRadio,
            ],
            spacing: LAYOUT.ROW_GAP,
          }),
          new HBox({ children: [add, remove], spacing: LAYOUT.ROW_GAP }),
        ],
      }),
    );

    model.flipCompletedEmitter.addListener(() => {
      const descriptions = model.substituentsProperty.value.flatMap(({ carbon, group, face }) => {
        const label = group !== "H" && groupNames.get(group);
        if (!label) {
          return [];
        }
        const axial = model.ringProperty.value.axial[slotIndex(carbon, face)];
        const pattern = axial ? a11y.nowAxialStringProperty.value : a11y.nowEquatorialStringProperty.value;
        return pattern.replace("{{group}}", label.value).replace("{{index}}", String(carbon + 1));
      });
      flip.addAccessibleResponse([a11y.flippedStringProperty.value, ...descriptions].join(" "));
    });

    const diagrams = new HBox({
      children: [viewerColumn, chartColumn, readout],
      align: "top",
      spacing: LAYOUT.GAP,
      centerX: this.layoutBounds.centerX,
      top: this.layoutBounds.minY + SCREEN_VIEW_MARGIN,
    });
    const controls = new HBox({
      children: [flipControls, editor],
      align: "top",
      spacing: LAYOUT.GAP,
      centerX: this.layoutBounds.centerX,
      top: this.layoutBounds.minY + LAYOUT.PANEL_TOP,
    });
    const resetAll = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        this.interruptSubtreeInput();
        model.reset();
        faceProperty.reset();
        groupProperty.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(diagrams);
    this.addChild(controls);
    this.addChild(resetAll);
    this.addChild(listParent);
    this.addChild(
      new Node({
        pdomOrder: [
          viewer,
          resetView,
          chooser,
          flip,
          progress,
          bondTypes,
          diaxial,
          groupCombo,
          faceRadio,
          add,
          remove,
          resetAll,
        ],
      }),
    );
  }
}
