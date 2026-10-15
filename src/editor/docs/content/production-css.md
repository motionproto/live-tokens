# Production CSS

In dev, every design token sits on `:root` as a CSS variable, because the
editor can rewrite any of them while the page runs. A production build runs no
editor, so most of those values never change. `vite build` rewrites the CSS it
emits to match: a token stays a variable only where its value can change at
runtime, and every other `var()` gives way to the value it reads.

The dev server keeps every variable. Your source files keep every token too:
the build rewrites only the files it emits, so `tokens.css`,
`tokens.generated.css` and your components still name each token, and the
token names stay the API you write against.

## The build step

`themeFileApi` runs the step at the end of every `vite build`, after Vite has
bundled and minified the CSS. It reads every stylesheet and script in the
bundle, including lazy chunks, and then:

- **removes** each custom property that no rule reads, directly or through
  another property;
- **substitutes** each `var()` that reads a static property with the text of
  that property's value, so `calc()` and `color-mix()` still resolve on the
  element that uses them;
- **declares** each remaining property once on `:root`, with the value that
  wins the cascade, so DevTools lists it once.

The build prints one line with the result:

```
live-tokens: the production CSS declares 76 of 848 custom properties and is 61.3 kB smaller.
```

A file's hashed name follows its content. Each stylesheet the build rewrites
takes a new hash, and so does each script that loads it, so a cache that keeps
hashed files forever serves each release its own files. A file name pattern
without `[hash]` keeps every name.

## The dynamic rule

A property stays a variable when its value can change while the page runs, or
when the build cannot prove it never does. A property that changes and loses
its variable breaks a page, and an extra variable costs a few bytes, so a case
that could fall either way stays a variable. A property is **dynamic** when any
of these hold:

- A rule declares it under a selector besides a root selector such as `:root`
  or `:root:root`, or inside `@media`, `@supports` or `@container`. The size
  tokens and the column gutter and margin in the three responsive `@media`
  blocks of `tokens.css` stay variables this way.
- Its name appears in a script or HTML page the build emits. That covers
  `style:--name` directives, `setProperty`, `getPropertyValue` and inline
  `style` attributes. Card sets `--card-hover-border-enabled` through a
  `style:` directive, so the token stays a variable.
- Its name appears in an at-rule's prelude, such as a `style()` container
  query.
- An `@property` rule registers it.
- The `keep` option lists it.
- Its value reads a dynamic property.
- Its winning value is a CSS-wide keyword such as `initial`, or it reads
  itself through a loop of `var()` references.
- Two stylesheets give it different `:root` values.
- Its value reads a name that no stylesheet declares and no script or `keep`
  entry names.
- Only a lazily loaded stylesheet declares it, and another stylesheet reads
  it.

Every other property is **static**: one value on `:root` for the life of the
page.

## Computed names

The build finds a name in a script only when the script spells it out. A
script that assembles a name while the page runs, such as
`` `--color-${family}-500` ``, hides it. The build then substitutes or removes
that token, so a read returns an empty string and a write changes nothing. List
each such name under `keep`:

```ts
themeFileApi({
  tokensCssPath: 'src/system/styles/tokens.css',
  productionCss: { keep: ['--color-brand-500', '--color-accent-500'] },
}),
```

`keep` takes exact names. The same goes for a stylesheet outside the bundle,
such as one in `public/`: the build never reads it, so list each token it
reads under `keep`.

## Options

`productionCss` on `themeFileApi` sets the step:

- **Default.** The build removes, substitutes and declares, as above.
- **`productionCss: { keep: [...] }`.** Each listed name stays a variable.
- **`productionCss: { substitute: false }`.** The build removes properties no
  rule reads and keeps every other `var()`, so DevTools shows token names while
  you debug. It still declares each property once on `:root`.
- **`productionCss: false`.** The build keeps every variable, as dev does.

`keep` and `substitute` combine in one object. When a page renders differently
in production, build it with `productionCss: false`. A difference that goes
away points at a token the rule missed, and `keep` fixes it.

## Limits

- **Values a property rejects.** In dev, `width: var(--color-brand-500)` passes
  the parser, and when the color reaches `width` the browser treats the
  declaration as `unset`. After substitution, `width` holds a color, the parser
  drops the declaration, and an earlier `width` rule applies. Keep each token's
  value valid for every property that reads it.
- **Fixed stylesheet names.** The build renames each stylesheet it rewrites
  through the hash in the build's `assetFileNames` pattern. A plugin that emits
  a stylesheet under a fixed `fileName` breaks that pattern, and the build
  stops with `live-tokens: <file> does not follow the output pattern
  "<pattern>"`. Set `productionCss: false` for that build.
