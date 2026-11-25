/** Profile-aware vector artwork used at both home-screen and navigation-bar sizes. */
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, Rectangle, Text, type TPaint } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { ScreenIcon } from "scenerystack/sim";
import { StringManager } from "../i18n/StringManager.js";
import Colors from "../StereochemistryColors.js";
import { SCREEN_ICON_SETTINGS as SETTINGS } from "../StereochemistryConstants.js";
import { screenStarShape } from "./screenStarShape.js";

const { WIDTH, HEIGHT } = SETTINGS;
const ink = Colors.textColorProperty;
const accent = Colors.accentColorProperty;
const stroke = { stroke: ink, lineWidth: SETTINGS.STROKE, lineCap: "round", lineJoin: "round" } as const;

function iconFrom(...children: Node[]): ScreenIcon {
  return new ScreenIcon(
    new Node({
      children: [new Rectangle(0, 0, WIDTH, HEIGHT, { fill: Colors.backgroundColorProperty }), ...children],
    }),
    {
      maxIconWidthProportion: 1,
      maxIconHeightProportion: 1,
      fill: Colors.backgroundColorProperty,
    },
  );
}

function stickFigure(reflect: (x: number) => number): Node {
  const [x, y] = SETTINGS.STICK_CENTRE;
  const colors = [
    accent,
    Colors.cipPriority2ColorProperty,
    Colors.cipPriority3ColorProperty,
    Colors.cipPriority4ColorProperty,
  ];
  return new Node({
    children: [
      ...SETTINGS.STICK_TIPS.map(([tx, ty]) => new Line(reflect(x), y, reflect(tx), ty, stroke)),
      ...SETTINGS.STICK_TIPS.map(
        ([tx, ty], i) =>
          new Circle(SETTINGS.TIP_RADIUS, { fill: colors[i] ?? accent, centerX: reflect(tx), centerY: ty }),
      ),
      new Circle(SETTINGS.CENTRE_RADIUS, { fill: ink, centerX: reflect(x), centerY: y }),
    ],
  });
}

export function createChiralityIcon(): ScreenIcon {
  return iconFrom(
    new Line(WIDTH / 2, SETTINGS.MIRROR_INSET, WIDTH / 2, HEIGHT - SETTINGS.MIRROR_INSET, {
      ...stroke,
      stroke: Colors.mirrorPlaneColorProperty,
      lineDash: [...SETTINGS.MIRROR_DASH],
    }),
    stickFigure((x) => x),
    stickFigure((x) => WIDTH - x),
  );
}

export function createRSIcon(): ScreenIcon {
  const arc = new Shape().arc(
    ...SETTINGS.RS_ARROW_CENTRE,
    SETTINGS.RS_ARROW_RADIUS,
    SETTINGS.RS_ARROW_START,
    SETTINGS.RS_ARROW_END,
  );
  const [a, b, c] = SETTINGS.RS_ARROW_HEAD;
  const head = new Shape()
    .moveTo(...a)
    .lineTo(...b)
    .lineTo(...c);
  const arrow = { ...stroke, stroke: Colors.cipArrowColorProperty };
  const [x, y] = SETTINGS.RS_LETTER;
  return iconFrom(
    stickFigure((value) => value + SETTINGS.RS_SHIFT),
    new Path(arc, arrow),
    new Path(head, arrow),
    new Text(StringManager.getInstance().getRSStrings().rStringProperty, {
      fill: ink,
      font: new PhetFont({ size: SETTINGS.RS_FONT, weight: "bold" }),
      centerX: x,
      centerY: y,
    }),
  );
}

export function createConformationsIcon(): ScreenIcon {
  const spokes = (inner: number, shift: number, color: TPaint) =>
    SETTINGS.NEWMAN_ANGLES.map((angle) => {
      const radians = ((angle + shift) * Math.PI) / 180;
      const x = Math.sin(radians);
      const y = -Math.cos(radians);
      return new Line(
        WIDTH / 2 + inner * x,
        HEIGHT / 2 + inner * y,
        WIDTH / 2 + SETTINGS.NEWMAN_SPOKE * x,
        HEIGHT / 2 + SETTINGS.NEWMAN_SPOKE * y,
        { ...stroke, stroke: color },
      );
    });
  return iconFrom(
    ...spokes(SETTINGS.NEWMAN_RADIUS, SETTINGS.NEWMAN_OFFSET, accent),
    new Circle(SETTINGS.NEWMAN_RADIUS, { ...stroke, stroke: accent, centerX: WIDTH / 2, centerY: HEIGHT / 2 }),
    ...spokes(0, 0, ink),
    new Circle(SETTINGS.TIP_RADIUS, { fill: ink, centerX: WIDTH / 2, centerY: HEIGHT / 2 }),
  );
}

export function createCyclohexaneIcon(): ScreenIcon {
  const [first, ...points] = SETTINGS.CHAIR_POINTS;
  const shape = new Shape().moveTo(...first);
  for (const [x, y] of points) {
    shape.lineTo(x, y);
  }
  return iconFrom(new Path(shape.close(), { ...stroke, stroke: accent }));
}

export function createChallengeIcon(): ScreenIcon {
  return iconFrom(
    new Path(screenStarShape(SETTINGS.BADGE_RADIUS), {
      ...stroke,
      fill: accent,
      centerX: WIDTH / 2,
      centerY: HEIGHT / 2,
    }),
  );
}
