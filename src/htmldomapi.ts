
/**
 * 对浏览器的dom的api进行二次包装，可以直接操作，html的dom的api
 */
export interface DOMAPI {
  createElement: (tagName: any) => HTMLElement;
  createElementNS: (namespaceURI: string, qualifiedName: string) => Element;
  createTextNode: (text: string) => Text;
  createComment: (text: string) => Comment;
  insertBefore: (parentNode: Node, newNode: Node, referenceNode: Node | null) => void;
  removeChild: (node: Node, child: Node) => void;
  appendChild: (node: Node, child: Node) => void;
  parentNode: (node: Node) => Node;
  nextSibling: (node: Node) => Node;
  tagName: (elm: Element) => string;
  setTextContent: (node: Node, text: string | null) => void;
  getTextContent: (node: Node) => string | null;
  isElement: (node: Node) => node is Element;
  isText: (node: Node) => node is Text;
  isComment: (node: Node) => node is Comment;
}
/**
 * 创建标签元素
 */
function createElement(tagName: any): HTMLElement {
  return document.createElement(tagName);
}
/**
 * 创建一个具有指定的命名空间URI和限定名称的元素。
 * @param namespaceURI 指定与元素相关联的命名空间URI的字符串
 * @param qualifiedName 元素的类型的字符串
 */
function createElementNS(namespaceURI: string, qualifiedName: string): Element {
  return document.createElementNS(namespaceURI, qualifiedName);
}
/**
 * 添加文本节点
 */
function createTextNode(text: string): Text {
  return document.createTextNode(text);
}
/**
 * 创建注释
 */
function createComment(text: string): Comment {
  return document.createComment(text);
}
/**
 * 节点前插入元素
 */
function insertBefore(parentNode: Node, newNode: Node, referenceNode: Node | null): void {
  parentNode.insertBefore(newNode, referenceNode);
}

function removeChild(node: Node, child: Node): void {
  node.removeChild(child);
}

function appendChild(node: Node, child: Node): void {
  node.appendChild(child);
}

function parentNode(node: Node): Node | null {
  return node.parentNode;
}

function nextSibling(node: Node): Node | null {
  return node.nextSibling;
}

function tagName(elm: Element): string {
  return elm.tagName;
}

function setTextContent(node: Node, text: string | null): void {
  node.textContent = text;
}

function getTextContent(node: Node): string | null {
  return node.textContent;
}

function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}

function isText(node: Node): node is Text {
  return node.nodeType === 3;
}

function isComment(node: Node): node is Comment {
  return node.nodeType === 8;
}

export const htmlDomApi = {
  createElement,
  createElementNS,
  createTextNode,
  createComment,
  insertBefore,
  removeChild,
  appendChild,
  parentNode,
  nextSibling,
  tagName,
  setTextContent,
  getTextContent,
  isElement,
  isText,
  isComment,
} as DOMAPI;

export default htmlDomApi;
