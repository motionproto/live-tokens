// Value-level parsing shared by check-page and check-component, so the two
// checkers can never disagree about what counts as a literal.

// `transparent` and `currentcolor` are left out: neither paints a colour of its own.
const NAMED_COLORS =
  'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen';
const NAMED_COLOR = new RegExp(`(?<![\\w-])(?:${NAMED_COLORS.split(' ').join('|')})(?![\\w-])`);

/** True when `value` paints a literal colour: hex, a colour function, or a named colour. */
export function hasColorLiteral(value) {
  return /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(|\boklab\(/i.test(value) || NAMED_COLOR.test(value);
}

/** True when `value` pins a non-zero px or rem length outside any token. */
export function hasDimensionLiteral(value) {
  return [...value.matchAll(/(?<![\w.-])(\d*\.?\d+)(px|rem)\b/g)].some((d) => parseFloat(d[1]) !== 0);
}

/**
 * Replace `var(--x, <fallback>)` with `var(--x)`. A fallback only renders when
 * the token is missing, so its literals are not the value that paints.
 */
export function stripVarFallbacks(value) {
  let out = '';
  for (let i = 0; i < value.length; i++) {
    if (!value.startsWith('var(', i)) {
      out += value[i];
      continue;
    }
    let depth = 0;
    let comma = -1;
    let j = i;
    for (; j < value.length; j++) {
      const c = value[j];
      if (c === '(') depth++;
      else if (c === ')') {
        depth--;
        if (depth === 0) break;
      } else if (c === ',' && depth === 1 && comma === -1) comma = j;
    }
    out += comma === -1 ? value.slice(i, j + 1) : `${value.slice(i, comma)})`;
    i = j;
  }
  return out;
}

/** Blank string literal contents so a colour word inside `content: "..."` never matches a rule. */
export function blankStrings(css) {
  return css.replace(/(["'])(?:\\.|(?!\1)[^\\])*\1/g, (m) => m[0] + ' '.repeat(m.length - 2) + m[0]);
}
