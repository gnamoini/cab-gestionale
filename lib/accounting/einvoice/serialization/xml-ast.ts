export type XmlTextNode = { kind: "text"; value: string };
export type XmlElementNode = {
  kind: "element";
  name: string;
  attributes?: Record<string, string>;
  children: XmlNode[];
};
export type XmlNode = XmlTextNode | XmlElementNode;

export function el(name: string, children: XmlNode[] = [], attributes?: Record<string, string>): XmlElementNode {
  const node: XmlElementNode = { kind: "element", name, children };
  if (attributes && Object.keys(attributes).length > 0) node.attributes = attributes;
  return node;
}

export function txt(value: string): XmlTextNode {
  return { kind: "text", value };
}

/** Omit empty optional branches at AST level. */
export function elOpt(name: string, children: XmlNode[] | null | undefined, attributes?: Record<string, string>): XmlElementNode | null {
  if (!children || children.length === 0) return null;
  const filtered = children.filter(Boolean) as XmlNode[];
  if (filtered.length === 0) return null;
  return el(name, filtered, attributes);
}
