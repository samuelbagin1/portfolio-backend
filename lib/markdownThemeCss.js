import postcss from 'postcss';

export const MAX_MARKDOWN_THEME_CSS_LENGTH = 20_000;

const ALLOWED_SELECTORS = new Set([
  'a',
  'a:hover',
  'blockquote',
  'code',
  'del',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'pre code',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul'
]);

const ALLOWED_PROPERTIES = new Set([
  'background-color',
  'border',
  'border-bottom',
  'border-bottom-color',
  'border-bottom-style',
  'border-bottom-width',
  'border-collapse',
  'border-color',
  'border-left',
  'border-left-color',
  'border-left-style',
  'border-left-width',
  'border-radius',
  'border-right',
  'border-right-color',
  'border-right-style',
  'border-right-width',
  'border-spacing',
  'border-style',
  'border-top',
  'border-top-color',
  'border-top-style',
  'border-top-width',
  'border-width',
  'box-sizing',
  'color',
  'display',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'height',
  'letter-spacing',
  'line-height',
  'list-style-position',
  'list-style-type',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-height',
  'max-width',
  'min-height',
  'min-width',
  'object-fit',
  'opacity',
  'overflow',
  'overflow-wrap',
  'overflow-x',
  'overflow-y',
  'padding',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'tab-size',
  'text-align',
  'text-decoration',
  'text-decoration-color',
  'text-decoration-style',
  'text-decoration-thickness',
  'text-transform',
  'vertical-align',
  'white-space',
  'width',
  'word-break'
]);

const FORBIDDEN_VALUE_PATTERN = /(?:url|var|expression|image-set|cross-fade|element)\s*\(|(?:javascript|data):|@import/i;
const FORBIDDEN_VALUE_SYNTAX_PATTERN = /[<>\\]|\/\*/;

function invalidCss(message) {
  const error = new Error(message);
  error.code = 'INVALID_MARKDOWN_THEME_CSS';
  return error;
}

function canonicalizeSelectors(selector) {
  const selectors = selector
    .split(',')
    .map((value) => value.trim().replace(/\s+/g, ' '));

  if (selectors.some((value) => !ALLOWED_SELECTORS.has(value))) {
    throw invalidCss(`Selector is not allowed: ${selector}`);
  }

  return [...new Set(selectors)].sort().join(', ');
}

export function validateAndCanonicalizeMarkdownThemeCss(css) {
  if (typeof css !== 'string') {
    throw invalidCss('CSS must be a string');
  }

  if (css.length > MAX_MARKDOWN_THEME_CSS_LENGTH) {
    throw invalidCss(`CSS must not exceed ${MAX_MARKDOWN_THEME_CSS_LENGTH} characters`);
  }

  let root;

  try {
    root = postcss.parse(css);
  } catch {
    throw invalidCss('CSS contains invalid syntax');
  }

  if (root.nodes.length === 0) {
    throw invalidCss('CSS must contain at least one rule');
  }

  const rules = [];

  root.each((node) => {
    if (node.type === 'comment') {
      return;
    }

    if (node.type !== 'rule') {
      throw invalidCss('At-rules and other non-style rules are not allowed');
    }

    const selector = canonicalizeSelectors(node.selector);
    const declarations = [];

    node.each((child) => {
      if (child.type === 'comment') {
        return;
      }

      if (child.type !== 'decl') {
        throw invalidCss('Nested rules are not allowed');
      }

      const property = child.prop.toLowerCase();
      const value = child.value.trim().replace(/\s+/g, ' ');

      if (!ALLOWED_PROPERTIES.has(property)) {
        throw invalidCss(`Property is not allowed: ${child.prop}`);
      }

      if (!value) {
        throw invalidCss(`Property must have a value: ${property}`);
      }

      if (child.important) {
        throw invalidCss('!important is not allowed');
      }

      if (FORBIDDEN_VALUE_PATTERN.test(value)) {
        throw invalidCss(`Property value is not allowed: ${property}`);
      }

      if (FORBIDDEN_VALUE_SYNTAX_PATTERN.test(value)) {
        throw invalidCss(`Property value contains forbidden syntax: ${property}`);
      }

      declarations.push({ property, value });
    });

    if (declarations.length === 0) {
      throw invalidCss(`Rule must contain at least one declaration: ${selector}`);
    }

    declarations.sort((a, b) => a.property.localeCompare(b.property));
    rules.push({ selector, declarations });
  });

  if (rules.length === 0) {
    throw invalidCss('CSS must contain at least one rule');
  }

  rules.sort((a, b) => a.selector.localeCompare(b.selector));

  const canonicalCss = rules
    .map(({ selector, declarations }) => {
      const body = declarations
        .map(({ property, value }) => `  ${property}: ${value};`)
        .join('\n');

      return `${selector} {\n${body}\n}`;
    })
    .join('\n\n');

  if (canonicalCss.length > MAX_MARKDOWN_THEME_CSS_LENGTH) {
    throw invalidCss(`Canonical CSS must not exceed ${MAX_MARKDOWN_THEME_CSS_LENGTH} characters`);
  }

  return canonicalCss;
}
