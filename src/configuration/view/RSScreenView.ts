/** R/S practice view with a live priority arrow, wedge drawing, and CIP explanation. */
import { Multilink, Property } from "scenerystack/axon";
import { Bounds2, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { HBox, Node, Path, Rectangle, VBox } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/StereochemistryButtonOptions.js";
import { StereochemistryPanel } from "../../common/StereochemistryPanel.js";
import { MoleculeChooserNode } from "../../common/view/MoleculeChooserNode.js";
import { stereoButton, stereoCheckbox, stereoText } from "../../common/view/StereoControls.js";
import { StereoViewerNode } from "../../common/view/StereoViewerNode.js";
import { WedgeDashNode } from "../../common/view/WedgeDashNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../StereochemistryColors.js";
import {
  STEREO_LAYOUT_SETTINGS as LAYOUT,
  SCREEN_VIEW_MARGIN,
  RS_SCREEN_SETTINGS as SETTINGS,
} from "../../StereochemistryConstants.js";
import type { RSModel } from "../model/RSModel.js";
import { cipExplanationProperty } from "./cipExplanation.js";
import { RSScreenSummaryContent, rsReadouts } from "./RSScreenSummaryContent.js";

const PRIORITY_COLORS = [
  Colors.cipPriority1ColorProperty,
  Colors.cipPriority2ColorProperty,
  Colors.cipPriority3ColorProperty,
  Colors.cipPriority4ColorProperty,
];

/** The orientation of the projected triangle selects the arc through the middle ligand. */
function priorityArrow(first: Vector2, middle: Vector2, last: Vector2): Shape | null {
  const a = middle.minus(first);
  const b = last.minus(first);
  const cross = a.x * b.y - a.y * b.x;
  if (cross === 0) {
    return null;
  }
  const centre = first.plus(
    new Vector2(
      (a.magnitudeSquared * b.y - b.magnitudeSquared * a.y) / (2 * cross),
      (a.x * b.magnitudeSquared - b.x * a.magnitudeSquared) / (2 * cross),
    ),
  );
  const start = first.minus(centre);
  const end = last.minus(centre);
  const shape = new Shape().arc(centre.x, centre.y, start.magnitude, start.angle, end.angle, cross < 0);
  const tangent = end.normalized().perpendicular.timesScalar(-Math.sign(cross));
  const tail = last.minus(tangent.timesScalar(SETTINGS.ARROW_HEAD));
  const wing = tangent.perpendicular.timesScalar(SETTINGS.ARROW_HEAD / 2);
  return shape.moveToPoint(tail.plus(wing)).lineToPoint(last).lineToPoint(tail.minus(wing));
}

export class RSScreenView extends ScreenView {
  public constructor(model: RSModel, options?: ScreenViewOptions) {
    const readouts = rsReadouts(model);
    super({ ...options, screenSummaryContent: new RSScreenSummaryContent(readouts) });
    const manager = StringManager.getInstance();
    const strings = manager.getRSStrings();
    const shared = manager.getStereoStrings();
    const bounds = new Bounds2(0, 0, SETTINGS.VIEWPORT_WIDTH, SETTINGS.VIEWPORT_HEIGHT);
    const stereo = model.stereoViewModel;
    const viewer = new StereoViewerNode(stereo, bounds, {
      canPick: (index) => model.stereocentresProperty.value.includes(index),
      appearanceDependencies: [model.cipProperty, model.showPrioritiesProperty, ...PRIORITY_COLORS],
      atomColor: (index) => {
        const order = model.cipProperty.value?.order;
        const rank = model.showPrioritiesProperty.value ? (order?.indexOf(index) ?? -1) : -1;
        return PRIORITY_COLORS[rank]?.value.toNumber();
      },
    });
    const outline = new Path(null, {
      stroke: Colors.backgroundColorProperty,
      lineWidth: SETTINGS.ARROW_OUTLINE_WIDTH,
      lineJoin: "round",
      lineCap: "round",
    });
    const arrow = new Path(null, {
      stroke: Colors.cipArrowColorProperty,
      lineWidth: SETTINGS.ARROW_WIDTH,
      lineJoin: "round",
      lineCap: "round",
    });
    const graphics = new Node({ children: [outline, arrow], pickable: false, clipArea: Shape.bounds(bounds) });
    Multilink.multilink(
      [
        model.cipProperty,
        model.showPrioritiesProperty,
        model.lowestAwayProperty,
        stereo.builtProperty,
        stereo.rotationProperty,
        stereo.zoomProperty,
      ],
      (cip, show, away, built) => {
        const order = cip?.order ?? [];
        stereo.labelsProperty.value = new Map(show ? order.map((index, rank) => [index, String(rank + 1)]) : []);
        const shape =
          show && away && built === model.builtProperty.value
            ? (() => {
                const [first, middle, last] = viewer.projectAtoms(order.slice(0, 3));
                return first && middle && last ? priorityArrow(first, middle, last) : null;
              })()
            : null;
        arrow.shape = shape;
        outline.shape = shape;
      },
    );

    const direction = stereoText(readouts.directionProperty, LAYOUT.FONT_SIZE, Colors.cipArrowColorProperty);
    model.showPrioritiesProperty.link((show) => {
      direction.visible = show;
    });
    const viewHeading = stereoText(shared.molecule3DStringProperty, LAYOUT.HEADING_FONT_SIZE);
    const drawingHeading = stereoText(strings.drawingStringProperty, LAYOUT.HEADING_FONT_SIZE);
    const drawing = new WedgeDashNode(
      stereo,
      model.centreProperty,
      new Bounds2(0, 0, SETTINGS.DRAWING_WIDTH, bounds.height),
    );
    const traceProperty = cipExplanationProperty(model);
    const lines = new VBox({ align: "left", spacing: LAYOUT.ROW_GAP, accessibleParagraph: "" });
    const traceHeading = stereoText(strings.traceStringProperty, LAYOUT.HEADING_FONT_SIZE);
    const tracePanel = new StereochemistryPanel(
      new Node({
        children: [new Rectangle(0, 0, SETTINGS.EXPLANATION_WIDTH, bounds.height), lines],
      }),
    );
    Multilink.multilink([traceProperty, strings.noCentreStringProperty], (trace, noCentre) => {
      for (const line of [...lines.children]) {
        line.dispose();
      }
      const displayed = trace.length > 0 ? trace : [noCentre];
      lines.children = displayed.map((line) =>
        stereoText(new Property(line), LAYOUT.FONT_SIZE, Colors.textColorProperty, SETTINGS.EXPLANATION_WIDTH),
      );
      lines.accessibleParagraph = displayed.join(" ");
    });
    const work = new HBox({
      align: "top",
      spacing: LAYOUT.GAP,
      children: [
        new VBox({
          spacing: LAYOUT.ROW_GAP,
          children: [viewHeading, new Node({ children: [viewer, graphics] }), direction],
        }),
        new VBox({ spacing: LAYOUT.ROW_GAP, children: [drawingHeading, drawing] }),
        new VBox({ spacing: LAYOUT.ROW_GAP, children: [traceHeading, tracePanel] }),
      ],
    });
    work.boundsProperty.link(() => {
      work.centerX = this.layoutBounds.centerX;
    });
    work.top = this.layoutBounds.minY + SETTINGS.WORKSPACE_TOP;

    const listParent = new Node();
    const chooser = new MoleculeChooserNode(
      model.moleculeProperty,
      "chirality",
      listParent,
      shared.moleculeStringProperty,
    );
    const priorities = stereoCheckbox(model.showPrioritiesProperty, strings.showPrioritiesStringProperty);
    const orient = stereoButton(strings.orientLowestStringProperty, () => model.orientLowestAway());
    const resetView = stereoButton(manager.getStereoA11yStrings().resetViewStringProperty, () => stereo.resetView());
    const nextCentre = stereoButton(strings.nextCentreStringProperty, () => {
      const centres = model.stereocentresProperty.value;
      const picked = model.centreProperty.value;
      const index = picked === null ? -1 : centres.indexOf(picked);
      model.centreProperty.value = centres[(index + 1) % centres.length] ?? null;
      this.addAccessibleResponse(readouts.centreTextProperty);
    });
    const r = stereoButton(strings.rStringProperty, () => {
      model.answerProperty.value = "R";
      this.addAccessibleResponse(readouts.feedbackTextProperty);
    });
    const s = stereoButton(strings.sStringProperty, () => {
      model.answerProperty.value = "S";
      this.addAccessibleResponse(readouts.feedbackTextProperty);
    });
    model.stereocentresProperty.link((centres) => {
      nextCentre.visible = centres.length > 1;
      orient.enabled = centres.length > 0;
      priorities.enabled = centres.length > 0;
      r.enabled = centres.length > 0;
      s.enabled = centres.length > 0;
    });
    const controls = new StereochemistryPanel(
      new VBox({
        spacing: LAYOUT.ROW_GAP,
        children: [
          new HBox({ spacing: LAYOUT.GAP, children: [chooser, nextCentre, priorities, orient, resetView] }),
          new HBox({
            spacing: LAYOUT.GAP,
            children: [stereoText(readouts.centreTextProperty), stereoText(strings.questionStringProperty), r, s],
          }),
          stereoText(
            readouts.feedbackTextProperty,
            LAYOUT.FONT_SIZE,
            Colors.cipArrowColorProperty,
            SETTINGS.FEEDBACK_WIDTH,
          ),
        ],
      }),
    );
    controls.boundsProperty.link(() => {
      controls.centerX = this.layoutBounds.centerX;
    });
    controls.top = this.layoutBounds.minY + SETTINGS.CONTROLS_TOP;
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
      work,
      controls,
      resetAll,
      listParent,
      new Node({
        pdomOrder: [viewer, lines, chooser, nextCentre, priorities, orient, resetView, r, s, resetAll],
      }),
    ];
  }
}
