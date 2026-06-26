declare module 'ktree' {
  export class Octree<T extends object = object> {
    constructor(
      data: T[],
      options: { key: keyof T; transform: (value: string) => [number, number, number] },
    );

    add(value: T): void;

    remove(value: string): void;

    closest(value: string): T | null;
  }
}
