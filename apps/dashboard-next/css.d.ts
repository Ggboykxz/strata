// Next 14 app router imports global CSS from a server component. TypeScript 6 needs an explicit
// ambient declaration for side-effect CSS imports; Next's own next-env.d.ts does not provide one.
declare module '*.css';
