import { splitTopLevel } from "../string-utils.js";
import { Color } from "./Color/index.js";

// ─── Shared types ─────────────────────────────────────────────

export type GradientStop = {
  color: Color;
  position?: string;
};

export type StopInput = GradientStop | Color | string | [color: Color | string, position: string];

// ─── Helpers ──────────────────────────────────────────────────

const normalizeStop = (input: StopInput): GradientStop => {
  if (typeof input === "string") {
    return { color: new Color(input) };
  }
  if (input instanceof Color) {
    return { color: input };
  }
  if (Array.isArray(input)) {
    const color = input[0] instanceof Color ? input[0] : new Color(input[0]);
    return { color, position: input[1] };
  }
  return input;
};

// Parse "red 50%" or "rgba(0,0,0,0.5) 25%" from a CSS gradient stop string
const parseStop = (str: string): GradientStop => {
  const s = str.trim();

  // Find the last top-level space
  let depth = 0;
  let lastSpace = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") {
      depth++;
    } else if (s[i] === ")") {
      depth--;
    } else if (s[i] === " " && depth === 0) {
      lastSpace = i;
    }
  }

  if (lastSpace > 0) {
    const after = s.slice(lastSpace + 1).trim();
    if (/^\d+(\.\d+)?(%|px|rem|em|vw|vh)$/.test(after)) {
      return { color: new Color(s.slice(0, lastSpace).trim()), position: after };
    }
  }

  return { color: new Color(s) };
};

const stopToCSS = (stop: GradientStop): string => {
  const c = stop.color.toString();
  return stop.position ? `${c} ${stop.position}` : c;
};

const flipPosition = (pos: string): string => {
  if (pos.endsWith("%")) {
    const val = parseFloat(pos);
    return isNaN(val) ? pos : `${100 - val}%`;
  }
  return pos;
};

// ─── Direction mapping ────────────────────────────────────────

const directionAngles: Record<string, number> = {
  "to top": 0,
  "to top right": 45,
  "to right": 90,
  "to bottom right": 135,
  "to bottom": 180,
  "to bottom left": 225,
  "to left": 270,
  "to top left": 315,
};

const angleKeywords: Record<number, string> = Object.fromEntries(
  Object.entries(directionAngles).map(([k, v]) => [v, k]),
);

const degRe = /^(-?\d+(?:\.\d+)?)(deg|turn|rad|grad)?$/;

const parseDegrees = (str: string): number | null => {
  const m = str.match(degRe);
  if (!m) {
    return null;
  }
  const val = parseFloat(m[1]!);
  const unit = m[2] || "deg";
  switch (unit) {
    case "turn":
      return val * 360;
    case "rad":
      return val * (180 / Math.PI);
    case "grad":
      return val * 0.9;
    default:
      return val;
  }
};

const normalizeAngle = (deg: number): number => ((deg % 360) + 360) % 360;

// ─── LinearGradient ───────────────────────────────────────────

const linearRe = /^linear-gradient\(([\s\S]+)\)$/i;

export type LinearGradientInput = {
  angle: number;
  stops: StopInput[];
};

export class LinearGradient {
  /** @internal brand — do not use directly; see `isFirstClassValue()` */
  readonly __teikn_fcv__: true = true;
  readonly #angle: number;
  readonly #stops: readonly GradientStop[];

  constructor(angle: number, stops: StopInput[]);
  constructor(input: LinearGradientInput | LinearGradient | string);
  constructor(first: number | string | LinearGradient | LinearGradientInput, stops?: StopInput[]) {
    if (first instanceof LinearGradient) {
      this.#angle = first.#angle;
      this.#stops = first.#stops;
      return;
    }

    if (typeof first === "string") {
      const m = first.match(linearRe);
      if (!m) {
        throw new Error(`Invalid linear-gradient: "${first}"`);
      }
      const parts = splitTopLevel(m[1]!);
      const firstPart = parts[0]!.trim();

      // Check for keyword direction
      const kwAngle = directionAngles[firstPart.toLowerCase()];
      if (kwAngle !== undefined) {
        this.#angle = kwAngle;
        this.#stops = parts.slice(1).map(parseStop);
        return;
      }

      // Check for angle value
      const deg = parseDegrees(firstPart);
      if (deg !== null) {
        this.#angle = normalizeAngle(deg);
        this.#stops = parts.slice(1).map(parseStop);
        return;
      }

      // No direction specified — default to bottom (180deg), all parts are stops
      this.#angle = 180;
      this.#stops = parts.map(parseStop);
      return;
    }

    if (typeof first === "object") {
      const opts = first as LinearGradientInput;
      this.#angle = normalizeAngle(opts.angle);
      this.#stops = opts.stops.map(normalizeStop);
      return;
    }

    this.#angle = normalizeAngle(first as number);
    this.#stops = (stops ?? []).map(normalizeStop);
  }

  get angle(): number {
    return this.#angle;
  }
  get stops(): readonly GradientStop[] {
    return this.#stops;
  }

  rotate(degrees: number): LinearGradient {
    return new LinearGradient(this.#angle + degrees, [...this.#stops]);
  }

  reverse(): LinearGradient {
    const reversed = [...this.#stops]
      .toReversed()
      .map((stop) => (stop.position ? { ...stop, position: flipPosition(stop.position) } : stop));
    return new LinearGradient(normalizeAngle(this.#angle + 180), reversed);
  }

  addStop(color: Color | string, position?: string): LinearGradient {
    const c = color instanceof Color ? color : new Color(color);
    const stop: GradientStop = position ? { color: c, position } : { color: c };
    return new LinearGradient(this.#angle, [...this.#stops, stop]);
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    if (this.#stops.length === 0) {
      throw new Error("LinearGradient requires at least one color stop");
    }
    const stopsStr = this.#stops.map(stopToCSS).join(", ");
    const kw = angleKeywords[this.#angle];
    const dir = kw ?? `${this.#angle}deg`;
    return `linear-gradient(${dir}, ${stopsStr})`;
  }

  static from(value: LinearGradient | LinearGradientInput | string): LinearGradient {
    if (typeof value === "object" && !(value instanceof LinearGradient)) {
      return new LinearGradient(value);
    }
    return new LinearGradient(value);
  }
}

// ─── RadialGradient ───────────────────────────────────────────

type RadialShape = "circle" | "ellipse";
type RadialSize = "closest-side" | "closest-corner" | "farthest-side" | "farthest-corner" | string;

export type RadialGradientOptions = {
  shape?: RadialShape;
  size?: RadialSize;
  position?: string;
};

const radialRe = /^radial-gradient\(([\s\S]+)\)$/i;

const isShapeSpec = (str: string): boolean =>
  /^(circle|ellipse|closest|farthest)/i.test(str) || /\bat\s/i.test(str);

export class RadialGradient {
  /** @internal brand — do not use directly; see `isFirstClassValue()` */
  readonly __teikn_fcv__: true = true;
  readonly #shape: RadialShape;
  readonly #size: RadialSize;
  readonly #position: string;
  readonly #stops: readonly GradientStop[];

  constructor(options: RadialGradientOptions, stops: StopInput[]);
  constructor(value: RadialGradient | string);
  constructor(first: RadialGradientOptions | string | RadialGradient, stops?: StopInput[]) {
    if (first instanceof RadialGradient) {
      this.#shape = first.#shape;
      this.#size = first.#size;
      this.#position = first.#position;
      this.#stops = first.#stops;
      return;
    }

    if (typeof first === "string") {
      const m = first.match(radialRe);
      if (!m) {
        throw new Error(`Invalid radial-gradient: "${first}"`);
      }
      const parts = splitTopLevel(m[1]!);
      const firstPart = parts[0]!.trim();

      if (isShapeSpec(firstPart)) {
        let shape: RadialShape = "ellipse";
        let size: RadialSize = "farthest-corner";
        let position = "center";

        const atIdx = firstPart.toLowerCase().indexOf(" at ");
        const shapePart = atIdx >= 0 ? firstPart.slice(0, atIdx).trim() : firstPart;
        if (atIdx >= 0) {
          position = firstPart.slice(atIdx + 4).trim();
        }

        if (/\bcircle\b/i.test(shapePart)) {
          shape = "circle";
        }
        const sizeKeywords = ["closest-side", "closest-corner", "farthest-side", "farthest-corner"];
        for (const kw of sizeKeywords) {
          if (shapePart.toLowerCase().includes(kw)) {
            size = kw;
            break;
          }
        }

        this.#shape = shape;
        this.#size = size;
        this.#position = position;
        this.#stops = parts.slice(1).map(parseStop);
        return;
      }

      // No shape spec — all parts are color stops
      this.#shape = "ellipse";
      this.#size = "farthest-corner";
      this.#position = "center";
      this.#stops = parts.map(parseStop);
      return;
    }

    this.#shape = first.shape ?? "ellipse";
    this.#size = first.size ?? "farthest-corner";
    this.#position = first.position ?? "center";
    this.#stops = (stops ?? []).map(normalizeStop);
  }

  get shape(): RadialShape {
    return this.#shape;
  }
  get size(): RadialSize {
    return this.#size;
  }
  get position(): string {
    return this.#position;
  }
  get stops(): readonly GradientStop[] {
    return this.#stops;
  }

  setShape(shape: RadialShape): RadialGradient {
    return new RadialGradient({ shape, size: this.#size, position: this.#position }, [
      ...this.#stops,
    ]);
  }

  setPosition(position: string): RadialGradient {
    return new RadialGradient({ shape: this.#shape, size: this.#size, position }, [...this.#stops]);
  }

  addStop(color: Color | string, position?: string): RadialGradient {
    const c = color instanceof Color ? color : new Color(color);
    const stop: GradientStop = position ? { color: c, position } : { color: c };
    return new RadialGradient({ shape: this.#shape, size: this.#size, position: this.#position }, [
      ...this.#stops,
      stop,
    ]);
  }

  reverse(): RadialGradient {
    const reversed = [...this.#stops]
      .toReversed()
      .map((stop) => (stop.position ? { ...stop, position: flipPosition(stop.position) } : stop));
    return new RadialGradient(
      { shape: this.#shape, size: this.#size, position: this.#position },
      reversed,
    );
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    const stopsStr = this.#stops.map(stopToCSS).join(", ");
    const shapeParts: string[] = [];

    if (this.#shape !== "ellipse" || this.#size !== "farthest-corner") {
      const spec = [
        this.#shape !== "ellipse" ? this.#shape : "",
        this.#size !== "farthest-corner" ? this.#size : "",
      ]
        .filter(Boolean)
        .join(" ");
      if (spec) {
        shapeParts.push(spec);
      }
    }

    if (this.#position !== "center") {
      const last = shapeParts.pop();
      shapeParts.push(last ? `${last} at ${this.#position}` : `at ${this.#position}`);
    }

    if (this.#stops.length === 0) {
      throw new Error("RadialGradient requires at least one color stop");
    }
    if (shapeParts.length > 0) {
      return `radial-gradient(${shapeParts.join(" ")}, ${stopsStr})`;
    }
    return `radial-gradient(${stopsStr})`;
  }

  static from(value: RadialGradient | string): RadialGradient {
    return new RadialGradient(value);
  }
}

// ─── GradientList ────────────────────────────────────────────

type AnyGradient = LinearGradient | RadialGradient;

const parseGradient = (str: string): AnyGradient => {
  const s = str.trim();
  if (/^linear-gradient\(/i.test(s)) {
    return new LinearGradient(s);
  }
  if (/^radial-gradient\(/i.test(s)) {
    return new RadialGradient(s);
  }
  throw new Error(`Unknown gradient type: "${s}"`);
};

export class GradientList {
  /** @internal brand — do not use directly; see `isFirstClassValue()` */
  readonly __teikn_fcv__: true = true;
  readonly #layers: readonly AnyGradient[];

  constructor(value: GradientList | string | AnyGradient[]);
  constructor(first: AnyGradient[] | string | GradientList) {
    if (first instanceof GradientList) {
      this.#layers = first.#layers;
      return;
    }

    if (typeof first === "string") {
      this.#layers = splitTopLevel(first).map(parseGradient);
      return;
    }

    this.#layers = [...first];
  }

  get layers(): readonly AnyGradient[] {
    return this.#layers;
  }
  get length(): number {
    return this.#layers.length;
  }

  at(index: number): AnyGradient | undefined {
    return this.#layers[index];
  }

  map(fn: (gradient: AnyGradient, index: number) => AnyGradient): GradientList {
    return new GradientList(this.#layers.map(fn));
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    return this.#layers.map((g) => g.toString()).join(", ");
  }

  static from(value: GradientList | string | (LinearGradient | RadialGradient)[]): GradientList {
    return new GradientList(value);
  }
}
