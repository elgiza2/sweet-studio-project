// Browser stub for `node:stream` / `node:stream/web`.
//
// `@tanstack/react-start` (pulled in by the PDF server-function module) carries
// side-effect-only `import "node:stream"` statements. Marking `node:*` external
// left those specifiers untouched in the production client bundle, so the
// browser tried to fetch a `node:` URL, failed with a CORS/scheme error, and
// the whole app rendered a blank page. Nothing imports any binding from these
// modules — only the side effect — so an empty module is a safe substitute.
export {};
