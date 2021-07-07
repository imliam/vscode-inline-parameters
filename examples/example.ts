let a = (a: string, b: Record<string, number>, c?: number): void => {};

a("a", {}, 11);

type A<a, b, c> = a;

function b(
  a: string,
  b: A<string, Symbol, string>,
  c: Record<string, number>,
  d: number
): (() => void) | void {}

b("aa", "aa", {}, 2);

class B {
  foo(a: (c: string, q: string) => void, c: number) {}

  bar: (a: string) => void;
}

new B().foo(() => {}, 1);

new B().bar("aa");

a.call(this, 1);

let c = (a: string, b: () => void, c?: number) => {
  return () => {};
};

c("", () => {}, 2);
