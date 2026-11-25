/** The original and mirror viewers, comparison readouts, and chirality controls. */
import { Multilink } from "scenerystack/axon";
import { Bounds2 } from "scenerystack/dot";
import { HBox, Line, Node, Rectangle, VBox } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/StereochemistryButtonOptions.js";
import { StereochemistryPanel } from "../../common/StereochemistryPanel.js";
import { MoleculeChooserNode } from "../../common/view/MoleculeChooserNode.js";
import { stereoButton, stereoCheckbox, stereoText } from "../../common/view/StereoControls.js";
import { StereoViewerNode } from "../../common/view/StereoViewerNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../StereochemistryColors.js";
import {
  STEREO_LAYOUT_SETTINGS as LAYOUT,
  SCREEN_VIEW_MARGIN,
  CHIRALITY_SCREEN_SETTINGS as SETTINGS,
} from "../../StereochemistryConstants.js";
import type { ChiralityModel } from "../model/ChiralityModel.js";
import { ChiralityScreenSummaryContent, chiralityReadouts } from "./ChiralityScreenSummaryContent.js";

export class ChiralityScreenView extends ScreenView {
  public constructor(model: ChiralityModel, options?: ScreenViewOptions) {
    const readouts = chiralityReadouts(model);
    super({ ...options, screenSummaryContent: new ChiralityScreenSummaryContent(model, readouts) });

    const manager = StringManager.getInstance();
    const strings = manager.getChiralityStrings();
    const shared = manager.getStereoStrings();
    const a11y = manager.getChiralityA11yStrings();
    const bounds = new Bounds2(0, 0, SETTINGS.VIEWPORT_WIDTH, SETTINGS.VIEWPORT_HEIGHT);
    const original = new StereoViewerNode(model.originalView, bounds, {
      accessibleName: a11y.viewerStringProperty,
      canPick: (index) => model.descriptorProperty.value.has(index),
      center: () => [0, 0, 0],
    });
    const mirror = new StereoViewerNode(model.mirrorView, bounds, {
      interactive: false,
      center: () => [0, 0, 0],
      fitMolecule: () => model.builtProperty.value,
    });
    const originalTitle = stereoText(strings.originalStringProperty, LAYOUT.HEADING_FONT_SIZE);
    const mirrorTitle = stereoText(strings.mirrorStringProperty, LAYOUT.HEADING_FONT_SIZE);
    const spacing = LAYOUT.GAP;
    const totalWidth = bounds.width * 2 + spacing * 2;
    const midpoint = totalWidth / 2;
    const mirrorPlane = new Line(midpoint, 0, midpoint, bounds.height, {
      stroke: Colors.mirrorPlaneColorProperty,
      lineWidth: SETTINGS.MIRROR_PLANE_WIDTH,
      lineDash: [...SETTINGS.MIRROR_PLANE_DASH],
      pickable: false,
    });
    const viewers = new Node({
      children: [
        new Rectangle(0, 0, totalWidth, bounds.height),
        mirrorPlane,
        original,
        mirror,
        originalTitle,
        mirrorTitle,
      ],
      x: this.layoutBounds.centerX - midpoint,
      y: this.layoutBounds.minY + SETTINGS.VIEWERS_TOP,
    });
    originalTitle.localBoundsProperty.link(() => {
      originalTitle.centerX = bounds.centerX;
    });
    mirrorTitle.localBoundsProperty.link(() => {
      mirrorTitle.centerX = totalWidth - bounds.centerX;
    });

    Multilink.multilink([model.showMirrorProperty, model.superimposeProgressProperty], (show, progress) => {
      const slide = (midpoint - bounds.centerX) * progress;
      original.x = show ? slide : midpoint - bounds.centerX;
      mirror.x = totalWidth - bounds.width - slide;
      mirror.visible = show;
      mirrorPlane.visible = show && progress === 0;
      mirrorTitle.visible = show && progress === 0;
      originalTitle.visible = show && progress === 0;
    });
    Multilink.multilink(
      [model.descriptorProperty, model.showStereocentresProperty, strings.centreMarkStringProperty],
      (labels, show, mark) => {
        const marks = new Map(show ? [...labels.keys()].map((index) => [index, mark]) : []);
        model.originalView.labelsProperty.value = marks;
        model.mirrorView.labelsProperty.value = marks;
      },
    );

    const results = new VBox({
      spacing: LAYOUT.ROW_GAP,
      children: [
        new HBox({
          spacing,
          children: [
            stereoText(readouts.countProperty),
            stereoText(readouts.chiralityProperty, LAYOUT.HEADING_FONT_SIZE),
            stereoText(readouts.descriptorProperty),
          ],
        }),
        stereoText(readouts.resultProperty, LAYOUT.HEADING_FONT_SIZE, Colors.accentColorProperty, totalWidth),
      ],
    });
    results.boundsProperty.link(() => {
      results.centerX = this.layoutBounds.centerX;
    });
    results.top = this.layoutBounds.minY + SETTINGS.VIEWERS_TOP + bounds.height;
    model.completedProperty.lazyLink((complete) => {
      if (complete) {
        this.addAccessibleResponse(
          model.isChiralProperty.value ? strings.mismatchStringProperty : strings.matchStringProperty,
        );
      }
    });

    const listParent = new Node();
    const chooser = new MoleculeChooserNode(
      model.moleculeProperty,
      "chirality",
      listParent,
      shared.moleculeStringProperty,
    );
    const superimpose = stereoButton(strings.superimposeStringProperty, () => model.superimpose());
    const separate = stereoButton(strings.separateStringProperty, () => model.separate());
    const resetView = stereoButton(manager.getStereoA11yStrings().resetViewStringProperty, () =>
      model.originalView.resetView(),
    );
    const swap = stereoButton(strings.swapStringProperty, () => {
      const picked = model.originalView.pickedAtomProperty.value;
      const centre = picked ?? model.descriptorProperty.value.keys().next().value;
      if (centre !== undefined) {
        model.swapGroups(centre);
        this.addAccessibleResponse(readouts.chiralityProperty);
      }
    });
    model.superimposeProgressProperty.link((progress) => {
      separate.enabled = progress > 0;
    });
    model.stereocentreCountProperty.link((count) => {
      swap.enabled = count > 0;
    });
    const showMirror = stereoCheckbox(model.showMirrorProperty, strings.showMirrorStringProperty);
    const showCentres = stereoCheckbox(model.showStereocentresProperty, strings.showStereocentresStringProperty);
    const controls = new StereochemistryPanel(
      new VBox({
        spacing,
        children: [
          new HBox({ spacing, children: [chooser, showMirror, showCentres] }),
          new HBox({ spacing, children: [superimpose, separate, swap, resetView] }),
        ],
      }),
    );
    controls.boundsProperty.link(() => {
      controls.centerX = this.layoutBounds.centerX;
    });
    controls.top = results.top + SETTINGS.CONTROLS_OFFSET;

    const resetAll = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        this.interruptSubtreeInput();
        model.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.children = [
      viewers,
      results,
      controls,
      resetAll,
      listParent,
      new Node({
        pdomOrder: [original, chooser, showMirror, showCentres, superimpose, separate, swap, resetView, resetAll],
      }),
    ];
  }
}
