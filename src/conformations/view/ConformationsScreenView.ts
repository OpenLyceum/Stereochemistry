import { DerivedProperty, PatternStringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Range, toFixed } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { HBox, Node, Rectangle, VBox } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { HSlider } from "scenerystack/sun";
import { namedConformation } from "../../common/model/ConformationEnergy.js";
import { positionAt } from "../../common/model/MoleculeGraph.js";
import type { Vec3 } from "../../common/model/structure/Geometry.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/StereochemistryButtonOptions.js";
import { StereochemistryPanel } from "../../common/StereochemistryPanel.js";
import { EnergyChartNode } from "../../common/view/EnergyChartNode.js";
import { MoleculeChooserNode } from "../../common/view/MoleculeChooserNode.js";
import { NewmanProjectionNode } from "../../common/view/NewmanProjectionNode.js";
import { STEREO_SLIDER_OPTIONS, stereoButton, stereoCheckbox, stereoText } from "../../common/view/StereoControls.js";
import { StereoViewerNode } from "../../common/view/StereoViewerNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../StereochemistryColors.js";
import {
  STEREO_LAYOUT_SETTINGS as LAYOUT,
  SCREEN_VIEW_MARGIN,
  CONFORMATIONS_SCREEN_SETTINGS as SETTINGS,
} from "../../StereochemistryConstants.js";
import type { ConformationsModel } from "../model/ConformationsModel.js";
import { ConformationsScreenSummaryContent } from "./ConformationsScreenSummaryContent.js";

export type ConformationsScreenViewOptions = ScreenViewOptions;

export class ConformationsScreenView extends ScreenView {
  public constructor(model: ConformationsModel, providedOptions?: ConformationsScreenViewOptions) {
    super(
      optionize<ConformationsScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
        { screenSummaryContent: new ConformationsScreenSummaryContent(model) },
        providedOptions,
      ),
    );

    const manager = StringManager.getInstance();
    const strings = manager.getStereoStrings();
    const a11y = manager.getConformationsA11yStrings();
    const sharedA11y = manager.getStereoA11yStrings();
    const names = {
      anti: strings.antiStringProperty,
      eclipsed: strings.eclipsedStringProperty,
      gauche: strings.gaucheStringProperty,
      staggered: strings.staggeredStringProperty,
      "totally-eclipsed": strings.totallyEclipsedStringProperty,
      intermediate: strings.intermediateStringProperty,
    };
    const conformerName = (name: ReturnType<typeof namedConformation>) => names[name ?? "intermediate"].value;
    const angleText = new PatternStringProperty(
      strings.angleValueStringProperty,
      { value: model.phiProperty },
      { decimalPlaces: 0 },
    );
    const temperatureText = new PatternStringProperty(
      strings.temperatureValueStringProperty,
      { value: model.temperatureProperty },
      { decimalPlaces: 0 },
    );
    const viewer = new StereoViewerNode(
      model.stereoViewModel,
      new Bounds2(0, 0, LAYOUT.VIEWPORT_WIDTH, LAYOUT.VIEWPORT_HEIGHT),
      {
        measurementsProperty: model.measurementProperty,
        measurementLabelProperty: angleText,
        center: ({ positions }): Vec3 => {
          const [measurement] = model.measurementProperty.value;
          const front = positionAt(positions, measurement?.atoms[1] ?? 0);
          const back = positionAt(positions, measurement?.atoms[2] ?? 1);
          return [(front[0] + back[0]) / 2, (front[1] + back[1]) / 2, (front[2] + back[2]) / 2];
        },
      },
    );
    const resetView = stereoButton(sharedA11y.resetViewStringProperty, () => model.stereoViewModel.resetView());
    const newman = new NewmanProjectionNode(model.newmanProperty, model.phiProperty);
    const chart = new EnergyChartNode({
      width: LAYOUT.CHART_WIDTH,
      xRange: model.phiProperty.range,
      yRange: new Range(0, SETTINGS.CHART_MAX_ENERGY),
      xTick: SETTINGS.CHART_ANGLE_TICK,
      yTick: SETTINGS.CHART_ENERGY_TICK,
      xLabel: strings.angleStringProperty,
      yLabel: strings.energyStringProperty,
      curveProperty: model.curveProperty,
      markerXProperty: model.phiProperty,
      markerEnergyProperty: model.energyProperty,
      namedPoints: SETTINGS.DIHEDRAL_LANDMARKS.map((x) => ({
        x,
        label: DerivedProperty.deriveAny([model.newmanProperty, ...Object.values(names)], () =>
          conformerName(namedConformation(x, model.newmanProperty.value)),
        ),
      })),
    });
    const heading = (title: TReadOnlyProperty<string>, body: Node, footer?: Node) =>
      new VBox({
        spacing: LAYOUT.GAP,
        children: [stereoText(title, LAYOUT.HEADING_FONT_SIZE), body, ...(footer ? [footer] : [])],
      });
    const diagramRow = new HBox({
      align: "top",
      spacing: LAYOUT.GAP,
      children: [
        heading(strings.molecule3DStringProperty, viewer, resetView),
        heading(
          strings.newmanStringProperty,
          newman,
          stereoText(
            DerivedProperty.deriveAny([model.conformationNameProperty, ...Object.values(names)], () =>
              conformerName(model.conformationNameProperty.value),
            ),
          ),
        ),
        heading(strings.energyProfileStringProperty, chart),
      ],
      centerX: this.layoutBounds.centerX,
      top: this.layoutBounds.minY + SCREEN_VIEW_MARGIN,
    });

    const listParent = new Node();
    const chooser = new MoleculeChooserNode(
      model.moleculeProperty,
      "conformations",
      listParent,
      strings.moleculeStringProperty,
    );
    const angleSlider = new HSlider(model.phiProperty, model.phiProperty.range, {
      ...STEREO_SLIDER_OPTIONS,
      constrainValue: Math.round,
      keyboardStep: SETTINGS.SMALL_ANGLE_STEP,
      shiftKeyboardStep: SETTINGS.LARGE_ANGLE_STEP,
      accessibleName: a11y.angleNameStringProperty,
      pdomDependencies: [a11y.angleDescriptionStringProperty, model.newmanProperty, ...Object.values(names)],
      pdomCreateAriaValueText: (value) =>
        a11y.angleDescriptionStringProperty.value
          .replace("{{value}}", toFixed(value ?? 0, 0))
          .replace("{{name}}", conformerName(namedConformation(value ?? 0, model.newmanProperty.value)).toLowerCase()),
    });
    const temperatureSlider = new HSlider(model.temperatureProperty, model.temperatureProperty.range, {
      ...STEREO_SLIDER_OPTIONS,
      constrainValue: Math.round,
      accessibleName: strings.temperatureStringProperty,
      pdomDependencies: [a11y.temperatureDescriptionStringProperty],
      pdomCreateAriaValueText: (value) =>
        a11y.temperatureDescriptionStringProperty.value.replace("{{value}}", toFixed(value ?? 0, 0)),
    });
    const animate = stereoCheckbox(model.animatingProperty, strings.animateStringProperty);
    const populationNames = [strings.antiStringProperty, strings.gaucheStringProperty, strings.gaucheStringProperty];
    const fills = [Colors.equatorialColorProperty, Colors.methylColorProperty, Colors.gaucheOtherColorProperty];
    const bars = fills.map((fill) => new Rectangle(0, 0, 1, SETTINGS.POPULATION_HEIGHT, { fill }));
    const populationLabels = fills.map((fill, index) => {
      const name = populationNames[index] ?? strings.gaucheStringProperty;
      const valueProperty = new DerivedProperty(
        [model.populationsProperty],
        ({ anti, gaucheLeft, gaucheRight }) => 100 * ([anti, gaucheLeft, gaucheRight][index] ?? 0),
      );
      return stereoText(
        new PatternStringProperty(
          strings.percentNamedStringProperty,
          { name, value: valueProperty },
          { decimalPlaces: 1 },
        ),
        LAYOUT.SMALL_FONT_SIZE,
        fill,
      );
    });
    model.populationsProperty.link(({ anti, gaucheLeft, gaucheRight }) => {
      let start = 0;
      for (const [index, value] of [anti, gaucheLeft, gaucheRight].entries()) {
        const bar = bars[index];
        if (bar) {
          bar.rectWidth = (value ?? 0) * SETTINGS.POPULATION_WIDTH;
          bar.left = start;
          start = bar.right;
        }
      }
    });
    const population = new VBox({
      spacing: LAYOUT.ROW_GAP,
      align: "left",
      children: [
        stereoText(strings.populationStringProperty),
        new Node({ children: bars }),
        new HBox({ children: populationLabels, spacing: LAYOUT.ROW_GAP }),
      ],
    });
    model.moleculeProperty.link((id) => {
      population.visible = id === "butane";
    });
    const labeled = (label: TReadOnlyProperty<string>, control: Node, value?: TReadOnlyProperty<string>) =>
      new VBox({
        align: "left",
        spacing: LAYOUT.ROW_GAP,
        children: [stereoText(label), control, ...(value ? [stereoText(value)] : [])],
      });
    const controls = new StereochemistryPanel(
      new HBox({
        align: "top",
        spacing: LAYOUT.GAP,
        children: [
          new VBox({
            align: "left",
            spacing: LAYOUT.ROW_GAP,
            children: [labeled(strings.moleculeStringProperty, chooser), animate],
          }),
          labeled(strings.angleStringProperty, angleSlider, angleText),
          labeled(strings.temperatureStringProperty, temperatureSlider, temperatureText),
          population,
        ],
      }),
    );
    // A fixed panel anchor keeps the diagram and controls from shifting as values change.
    controls.centerX = this.layoutBounds.centerX;
    controls.top = this.layoutBounds.minY + LAYOUT.PANEL_TOP;

    const resetAll = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        this.interruptSubtreeInput();
        model.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    const traversal = new Node({
      pdomOrder: [viewer, resetView, newman, chooser, angleSlider, animate, temperatureSlider, resetAll],
    });
    this.addChild(diagramRow);
    this.addChild(controls);
    this.addChild(resetAll);
    this.addChild(listParent);
    this.addChild(traversal);
  }
}
