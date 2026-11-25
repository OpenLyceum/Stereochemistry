import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import type { Bounds2 } from "scenerystack/dot";
import { Vector2 } from "scenerystack/dot";
import {
  CanvasNode,
  Color,
  colorProfileProperty,
  KeyboardListener,
  Node,
  PressListener,
  Rectangle,
  type SceneryEvent,
  type TInputListener,
} from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import StereochemistryColors from "../../StereochemistryColors.js";
import {
  MOLECULE_RENDERER_APPEARANCE_SETTINGS,
  STEREO_VIEWER_SETTINGS as SETTINGS,
} from "../../StereochemistryConstants.js";
import { VIEWER_HOTKEYS } from "../../StereochemistryHotkeyData.js";
import { type BuiltMolecule, positionAt } from "../model/MoleculeGraph.js";
import { findStereocentres } from "../model/Stereocentres.js";
import type { StereoViewModel } from "../model/StereoViewModel.js";
import { DisplayState } from "../model/structure/DisplayState.js";
import type { Vec3 } from "../model/structure/Geometry.js";
import type { Measurement } from "../model/structure/Measurement.js";
import { findPolyhedra } from "../model/structure/Polyhedra.js";
import { MoleculeRenderer } from "./MoleculeRenderer.js";

type StereoViewerOptions = {
  measurementsProperty?: TReadOnlyProperty<readonly Measurement[]>;
  measurementLabelOffsetX?: number;
  measurementLabelProperty?: TReadOnlyProperty<string>;
  appearanceDependencies?: readonly TReadOnlyProperty<unknown>[];
  atomColor?: (index: number) => number | undefined;
  bondColor?: (a: number, b: number) => number | undefined;
  canPick?: (index: number) => boolean;
  center?: (built: BuiltMolecule) => Vec3;
  fitMolecule?: () => BuiltMolecule;
  interactive?: boolean;
  accessibleName?: TReadOnlyProperty<string>;
  helpText?: TReadOnlyProperty<string>;
};

const LABEL_FONT = new PhetFont(SETTINGS.LABEL_FONT_SIZE);

function centroid(built: BuiltMolecule): Vec3 {
  const sum: Vec3 = [0, 0, 0];
  const count = built.structure.atoms.length;
  for (let index = 0; index < count; index++) {
    const [x, y, z] = positionAt(built.positions, index);
    sum[0] += x;
    sum[1] += y;
    sum[2] += z;
  }
  return [sum[0] / count, sum[1] / count, sum[2] / count];
}

function framing(
  built: BuiltMolecule,
  options: StereoViewerOptions,
  display?: DisplayState,
): { center: Vec3; radius: number } {
  const center = options.center?.(built) ?? centroid(built);
  const fit = options.fitMolecule?.() ?? built;
  const state = display ?? new DisplayState(fit.structure);
  if (!display) {
    state.applyStyle("ballAndStick");
  }
  let radius = 0;
  for (let index = 0; index < state.atomCount; index++) {
    const [x, y, z] = positionAt(fit.positions, index);
    radius = Math.max(radius, Math.hypot(x - center[0], y - center[1], z - center[2]) + (state.atomRadius[index] ?? 0));
  }
  return { center, radius };
}

class StereoCanvasNode extends CanvasNode {
  public readonly moleculeRenderer = new MoleculeRenderer();
  private readonly model: StereoViewModel;
  private readonly options: StereoViewerOptions;

  public constructor(model: StereoViewModel, bounds: Bounds2, options: StereoViewerOptions) {
    super({ canvasBounds: bounds, pickable: false });
    this.model = model;
    this.options = options;
  }

  public override paintCanvas(context: CanvasRenderingContext2D): void {
    const model = this.model;
    const built = model.builtProperty.value;
    const { structure, positions } = built;
    // DisplayState initializes CPK colors through applyColorScheme.
    const state = new DisplayState(structure);
    state.applyStyle("ballAndStick");
    for (const [index, label] of model.labelsProperty.value) {
      state.labels[index] = label;
    }
    for (let index = 0; index < state.atomCount; index++) {
      const color = this.options.atomColor?.(index);
      if (color !== undefined) {
        state.colors[index] = color;
      }
    }
    state.selected.fill(0);
    for (const index of model.haloAtomsProperty.value) {
      state.selected[index] = 1;
    }

    const { center, radius } = framing(built, this.options, state);
    const { width, height, minX, minY } = this.canvasBounds;
    const text = StereochemistryColors.textColorProperty.value.toCSS();
    const { options } = this;
    context.save();
    context.translate(minX, minY);
    this.moleculeRenderer.render(context, {
      width,
      height,
      state,
      positions,
      center,
      radius,
      rotation: model.rotationProperty.value,
      zoom: model.zoomProperty.value,
      perspective: false,
      background: null,
      paths: [],
      hydrogenBonds: null,
      unitCell: null,
      cellRange: [1, 1, 1],
      showAxes: false,
      polyhedra: model.showTetrahedronProperty.value ? findPolyhedra(structure, positions) : null,
      showHalos: model.haloAtomsProperty.value.length > 0,
      hovered: model.hoveredAtomProperty.value,
      picked: model.pickedAtomProperty.value,
      pendingPicks: [],
      measurements: options.measurementsProperty?.value ?? [],
      ...(options.measurementLabelOffsetX !== undefined
        ? { measurementLabelOffsetX: options.measurementLabelOffsetX }
        : {}),
      measurementLabel: () => options.measurementLabelProperty?.value ?? "",
      axisLabels: ["", "", ""],
      cellLabels: ["", "", "", ""],
      ...(options.bondColor ? { bondColor: options.bondColor } : {}),
      colors: {
        label: text,
        measurement: StereochemistryColors.measurementColorProperty.value.toCSS(),
        halo: StereochemistryColors.viewerHaloColorProperty.value.toCSS(),
        hover: text,
        pick: StereochemistryColors.viewerPickColorProperty.value.toCSS(),
        unitCell: text,
        hydrogenBond: text,
        axisX: text,
        axisY: text,
        axisZ: text,
      },
      font: LABEL_FONT.toCSS(),
    });
    context.restore();
  }
}

export class StereoViewerNode extends Node {
  private readonly disposeViewer: () => void;
  private readonly projectAtomsInViewport: (indices: readonly number[]) => Vector2[];

  public constructor(model: StereoViewModel, bounds: Bounds2, options: StereoViewerOptions = {}) {
    const a11y = StringManager.getInstance().getStereoA11yStrings();
    const canvas = new StereoCanvasNode(model, bounds, options);
    const hitArea = new Rectangle(bounds, { fill: Color.TRANSPARENT, cursor: "grab" });
    const interactive = options.interactive ?? true;
    super({
      children: interactive ? [canvas, hitArea] : [canvas],
      ...(interactive
        ? {
            tagName: "div",
            ariaRole: "application",
            focusable: true,
            accessibleName: options.accessibleName ?? a11y.viewerStringProperty,
            accessibleHelpText: options.helpText ?? a11y.viewerHelpStringProperty,
          }
        : { pickable: false }),
    });

    const invalidate = () => canvas.invalidatePaint();
    const repaint = Multilink.multilink(
      [
        model.builtProperty,
        model.rotationProperty,
        model.zoomProperty,
        model.hoveredAtomProperty,
        model.pickedAtomProperty,
        model.haloAtomsProperty,
        model.labelsProperty,
        model.showTetrahedronProperty,
        colorProfileProperty,
      ],
      invalidate,
    );
    const appearanceDependencies = [
      options.measurementsProperty,
      options.measurementLabelProperty,
      ...(options.appearanceDependencies ?? []),
    ];
    for (const property of appearanceDependencies) {
      property?.lazyLink(invalidate);
    }

    this.projectAtomsInViewport = (indices) => {
      const built = model.builtProperty.value;
      const { center, radius } = framing(built, options);
      const scale =
        (model.zoomProperty.value * Math.min(bounds.width, bounds.height)) /
        (2 * radius * MOLECULE_RENDERER_APPEARANCE_SETTINGS.FIT_RADIUS_FACTOR);
      return indices.map((index) => {
        const [x, y, z] = positionAt(built.positions, index);
        const point = model.rotationProperty.value.apply(x - center[0], y - center[1], z - center[2], [0, 0, 0]);
        return new Vector2(bounds.centerX + point[0] * scale, bounds.centerY - point[1] * scale);
      });
    };

    const disposePainting = () => {
      repaint.dispose();
      for (const property of appearanceDependencies) {
        property?.unlink(invalidate);
      }
      canvas.dispose();
      hitArea.dispose();
    };
    if (!interactive) {
      this.disposeViewer = disposePainting;
      return;
    }

    const accepts = (index: number) =>
      index >= 0 && index < model.builtProperty.value.structure.atoms.length && (options.canPick?.(index) ?? true);
    const announceAtom = (index: number) => {
      const { structure, positions } = model.builtProperty.value;
      const symbol = structure.atoms[index]?.element.symbol;
      const element = {
        C: a11y.carbonStringProperty.value,
        H: a11y.hydrogenStringProperty.value,
        O: a11y.oxygenStringProperty.value,
        Cl: a11y.chlorineStringProperty.value,
      };
      const name = symbol && Object.hasOwn(element, symbol) ? element[symbol as keyof typeof element] : (symbol ?? "");
      const pattern = findStereocentres(structure, positions).includes(index)
        ? a11y.stereocentreStringProperty.value
        : a11y.atomStringProperty.value;
      this.addAccessibleResponse(pattern.replace("{{element}}", name).replace("{{index}}", String(index + 1)));
    };
    let atomCursor: number | null = null;
    const clearCursor = (atom: number | null) => {
      if (atom === null) {
        atomCursor = null;
      }
    };
    model.pickedAtomProperty.lazyLink(clearCursor);
    const pick = (index: number) => {
      if (accepts(index)) {
        atomCursor = index;
        model.pickedAtomProperty.value = index;
        announceAtom(index);
      }
    };
    const moveCursor = (direction: 1 | -1) => {
      const count = model.builtProperty.value.structure.atoms.length;
      let index = atomCursor !== null && accepts(atomCursor) ? atomCursor : direction === 1 ? -1 : 0;
      for (let step = 0; step < count; step++) {
        index = (index + direction + count) % count;
        if (accepts(index)) {
          atomCursor = index;
          model.hoveredAtomProperty.value = index;
          announceAtom(index);
          break;
        }
      }
    };
    const localPoint = (event: SceneryEvent) => this.globalToLocalPoint(event.pointer.point);
    const hit = (event: SceneryEvent) => {
      const point = localPoint(event);
      return canvas.moleculeRenderer.pick(point.x - bounds.minX, point.y - bounds.minY, accepts);
    };

    let start = Vector2.ZERO;
    let last = Vector2.ZERO;
    let dragged = false;
    let shift = false;
    const press = new PressListener({
      attach: true,
      press: (event) => {
        start = localPoint(event);
        last = start;
        dragged = false;
        shift = event.domEvent instanceof MouseEvent && event.domEvent.shiftKey;
        hitArea.cursor = "grabbing";
        this.focus();
      },
      drag: (event) => {
        const point = localPoint(event);
        if (!dragged && point.distance(start) < SETTINGS.CLICK_SLOP) {
          return;
        }
        dragged = true;
        const { x: dx, y: dy } = point.minus(last);
        last = point;
        if (shift) {
          model.zoomBy(SETTINGS.ZOOM_STEP ** (-dy / SETTINGS.ZOOM_PIXELS_PER_STEP));
          model.rotate([0, 0, 1], -dx * SETTINGS.DEGREES_PER_PIXEL);
        } else {
          model.rotationProperty.value = model.rotationProperty.value
            .rotatedAboutScreenAxis([0, 1, 0], dx * SETTINGS.DEGREES_PER_PIXEL)
            .rotatedAboutScreenAxis([1, 0, 0], dy * SETTINGS.DEGREES_PER_PIXEL);
        }
      },
      release: (event, listener) => {
        hitArea.cursor = "grab";
        if (event && !listener.interrupted && !dragged) {
          const index = hit(event);
          if (index !== null) {
            pick(index);
          }
        }
        model.hoveredAtomProperty.value = event && !event.pointer.isTouchLike() ? hit(event) : null;
      },
    });
    const hover: TInputListener = {
      move: (event) => {
        if (!(press.isPressed || event.pointer.isTouchLike())) {
          model.hoveredAtomProperty.value = hit(event);
        }
      },
      exit: () => {
        model.hoveredAtomProperty.value = null;
      },
      wheel: (event) => {
        const delta = event.domEvent?.deltaY ?? 0;
        if (delta) {
          model.zoomBy(delta < 0 ? SETTINGS.ZOOM_STEP : 1 / SETTINGS.ZOOM_STEP);
          event.handle();
        }
      },
    };
    const keyboard = new KeyboardListener({
      keyStringProperties: VIEWER_HOTKEYS.flatMap((hotkey) => hotkey.keyStringProperties),
      fire: (_event, key) => {
        switch (key) {
          case "arrowLeft":
            model.rotate([0, 1, 0], -SETTINGS.KEY_ROTATION);
            break;
          case "arrowRight":
            model.rotate([0, 1, 0], SETTINGS.KEY_ROTATION);
            break;
          case "arrowUp":
            model.rotate([1, 0, 0], -SETTINGS.KEY_ROTATION);
            break;
          case "arrowDown":
            model.rotate([1, 0, 0], SETTINGS.KEY_ROTATION);
            break;
          case "shift+plus":
          case "plus":
            model.zoomBy(SETTINGS.ZOOM_STEP);
            break;
          case "minus":
            model.zoomBy(1 / SETTINGS.ZOOM_STEP);
            break;
          case "home":
            model.resetView();
            break;
          case "n":
            moveCursor(1);
            break;
          case "p":
            moveCursor(-1);
            break;
          case "enter":
          case "space":
            if (atomCursor !== null) {
              pick(atomCursor);
            }
            break;
        }
      },
    });
    hitArea.addInputListener(press);
    hitArea.addInputListener(hover);
    this.addInputListener(keyboard);

    this.disposeViewer = () => {
      model.pickedAtomProperty.unlink(clearCursor);
      hitArea.removeInputListener(press);
      hitArea.removeInputListener(hover);
      this.removeInputListener(keyboard);
      press.dispose();
      keyboard.dispose();
      disposePainting();
    };
  }

  /** Project an atom in the same coordinates as the orthographic canvas. */
  public projectAtoms(indices: readonly number[]): Vector2[] {
    return this.projectAtomsInViewport(indices);
  }

  public override dispose(): void {
    this.disposeViewer();
    super.dispose();
  }
}
