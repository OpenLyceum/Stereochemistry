/** Orthographic skeletal drawing with depth-dependent stereocentre bonds. */
import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { type Bounds2, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import Colors from "../../StereochemistryColors.js";
import { STEREO_LAYOUT_SETTINGS as LAYOUT, RS_SCREEN_SETTINGS as SETTINGS } from "../../StereochemistryConstants.js";
import { adjacency, type BuiltMolecule, positionAt } from "../model/MoleculeGraph.js";
import type { StereoViewModel } from "../model/StereoViewModel.js";
import { subtract, type Vec3 } from "../model/structure/Geometry.js";
import { wedgeBondStyle } from "../model/wedgeBondStyle.js";

function extendEndOnBonds(points: (Vector2 | null)[], neighbors: ReadonlySet<number>): void {
  // Give an end-on bond a short schematic length in the largest gap between other bonds.
  const angles = [...neighbors]
    .flatMap((index) => {
      const point = points[index];
      return point && point.magnitude >= SETTINGS.WEDGE_END_ON_LENGTH ? [point.angle] : [];
    })
    .sort((a, b) => a - b);
  let widest = 0;
  let gapDirection = 0;
  angles.forEach((angle, index) => {
    const gap = (angles[index + 1] ?? (angles[0] ?? 0) + 2 * Math.PI) - angle;
    if (gap > widest) {
      widest = gap;
      gapDirection = angle + gap / 2;
    }
  });
  for (const index of neighbors) {
    const point = points[index];
    if (point && point.magnitude < SETTINGS.WEDGE_END_ON_LENGTH) {
      points[index] = Vector2.createPolar(SETTINGS.WEDGE_END_ON_LENGTH, gapDirection);
    }
  }
}

function drawWedge(style: "solid" | "hashed", origin: Vector2, tip: Vector2, lines: Shape, wedges: Shape): void {
  const direction = tip.minus(origin);
  if (direction.magnitude === 0) {
    return;
  }
  const edge = direction.normalized().perpendicular.timesScalar(SETTINGS.WEDGE_WIDTH);
  if (style === "solid") {
    wedges.moveToPoint(origin).lineToPoint(tip.plus(edge)).lineToPoint(tip.minus(edge)).close();
    return;
  }
  for (let hash = 1; hash <= SETTINGS.WEDGE_HASHES; hash++) {
    const fraction = hash / SETTINGS.WEDGE_HASHES;
    const middle = origin.plus(direction.timesScalar(fraction));
    const half = edge.timesScalar(fraction);
    lines.moveToPoint(middle.minus(half)).lineToPoint(middle.plus(half));
  }
}

function drawBonds(
  built: BuiltMolecule,
  screen: readonly (Vector2 | undefined)[],
  projected: readonly (Vec3 | null)[],
  centre: number,
  origin: Vector2,
): { lineShape: Shape; wedgeShape: Shape } {
  const lineShape = new Shape();
  const wedgeShape = new Shape();
  for (const { a, b, order } of built.structure.bonds) {
    const from = screen[a];
    const to = screen[b];
    if (!(from && to)) {
      continue;
    }
    const ligand = a === centre ? b : b === centre ? a : null;
    const style = ligand === null ? "plain" : wedgeBondStyle(projected[ligand]?.[2] ?? 0);
    const tip = a === centre ? to : from;
    if (style === "plain") {
      lineShape.moveToPoint(from).lineToPoint(to);
      if (order > 1 && from.distance(to) > 0) {
        const offset = to
          .minus(from)
          .normalized()
          .perpendicular.timesScalar(SETTINGS.WEDGE_LINE_WIDTH * 2);
        lineShape.moveToPoint(from.plus(offset)).lineToPoint(to.plus(offset));
      }
    } else {
      drawWedge(style, origin, tip, lineShape, wedgeShape);
    }
  }
  return { lineShape, wedgeShape };
}

export class WedgeDashNode extends Node {
  private readonly disposeDrawing: () => void;

  public constructor(model: StereoViewModel, centreProperty: TReadOnlyProperty<number | null>, bounds: Bounds2) {
    const frame = new Rectangle(bounds);
    const lines = new Path(null, { stroke: Colors.textColorProperty, lineWidth: SETTINGS.WEDGE_LINE_WIDTH });
    const wedges = new Path(null, { fill: Colors.textColorProperty });
    const labels = new Node();
    super({ children: [frame, lines, wedges, labels], pickable: false });
    const elementLabels = new Map<number, Text>();
    const font = new PhetFont(LAYOUT.FONT_SIZE);

    const drawing = Multilink.multilink(
      [model.builtProperty, model.rotationProperty, centreProperty],
      (built, rotation, centre) => {
        if (centre === null || !built.structure.atoms[centre]) {
          lines.shape = null;
          wedges.shape = null;
          labels.visible = false;
          return;
        }
        labels.visible = true;
        const neighbors = new Set(adjacency(built.structure)[centre]?.map(({ index }) => index));
        const origin = positionAt(built.positions, centre);
        const projected = built.structure.atoms.map(({ element }, index) => {
          if (element.symbol === "H" && !neighbors.has(index)) {
            return null;
          }
          return rotation.apply(...subtract(positionAt(built.positions, index), origin), [0, 0, 0]);
        });
        const extents = projected.flatMap((point) => (point ? [new Vector2(point[0], -point[1])] : []));
        const maximumX = Math.max(...extents.map(({ x }) => Math.abs(x)), 1);
        const maximumY = Math.max(...extents.map(({ y }) => Math.abs(y)), 1);
        const padding = SETTINGS.WEDGE_END_ON_LENGTH + SETTINGS.WEDGE_LABEL_GAP;
        const scale = Math.min(
          (bounds.width / 2 - padding) / maximumX,
          (bounds.height / 2 - padding) / maximumY,
          SETTINGS.WEDGE_MAX_SCALE,
        );
        const points = projected.map((point) => (point ? new Vector2(point[0] * scale, -point[1] * scale) : null));

        extendEndOnBonds(points, neighbors);

        const screen = points.map((point) => point?.plus(bounds.center));
        const { lineShape, wedgeShape } = drawBonds(built, screen, projected, centre, bounds.center);
        lines.shape = lineShape;
        wedges.shape = wedgeShape;
        for (const label of elementLabels.values()) {
          label.visible = false;
        }
        for (const [index, { element }] of built.structure.atoms.entries()) {
          const point = screen[index];
          if (!point || element.symbol === "C") {
            continue;
          }
          let label = elementLabels.get(index);
          if (!label) {
            label = new Text(element.symbol, { font, fill: Colors.textColorProperty });
            elementLabels.set(index, label);
            labels.addChild(label);
          }
          label.string = element.symbol;
          label.visible = true;
          const outward = point.minus(bounds.center);
          label.center = point.plus(
            outward.magnitude > 0
              ? outward.normalized().timesScalar(SETTINGS.WEDGE_LABEL_GAP)
              : new Vector2(SETTINGS.WEDGE_LABEL_GAP, 0),
          );
        }
      },
    );
    this.disposeDrawing = () => {
      drawing.dispose();
      for (const label of elementLabels.values()) {
        label.dispose();
      }
      labels.dispose();
      wedges.dispose();
      lines.dispose();
      frame.dispose();
    };
  }

  public override dispose(): void {
    this.disposeDrawing();
    super.dispose();
  }
}
