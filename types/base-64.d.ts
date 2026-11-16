declare module "base-64" {
  export function decode(input: string): string;
  export function encode(input: string): string;
  const _default: { decode: typeof decode; encode: typeof encode };
  export default _default;
}
