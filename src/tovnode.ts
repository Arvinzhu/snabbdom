
/**
 * 提供了toVNode的方法，把真实dom转化为vnode
 */
import vnode, {VNode} from './vnode';
import htmlDomApi, {DOMAPI} from './htmldomapi';
/**
 * 将dom节点转换为vnode
 */
export function toVNode(node: Node, domApi?: DOMAPI): VNode {
  // 定义变量api，主要是一些用于dom操作的api接口
  const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi;
  let text: string;
  //元素 即元素nodeType === 1 
  if (api.isElement(node)) {
    // id选择器
    const id = node.id ? '#' + node.id : '';
    // class属性
    const cn = node.getAttribute('class');
    const c = cn ? '.' + cn.split(' ').join('.') : '';
    //
    const sel = api.tagName(node).toLowerCase() + id + c;
    const attrs: any = {};
    const children: Array<VNode> = [];
    let name: string;
    let i: number, n: number;
    const elmAttrs = node.attributes;
    const elmChildren = node.childNodes;
    // 保存attrs
    for (i = 0, n = elmAttrs.length; i < n; i++) {
      name = elmAttrs[i].nodeName;
      if (name !== 'id' && name !== 'class') {
        attrs[name] = elmAttrs[i].nodeValue;
      }
    }
    // 递归转换子节点为vnode
    for (i = 0, n = elmChildren.length; i < n; i++) {
      children.push(toVNode(elmChildren[i], domApi));
    }
    //返回构造的子节点
    return vnode(sel, {attrs}, children, undefined, node);
  } else if (api.isText(node)) {
    // 文本节点，元素节点nodeType === 3
    text = api.getTextContent(node) as string;
    return vnode(undefined, undefined, undefined, text, node);
  } else if (api.isComment(node)) {
    // 注释节点， nodeType === 8
    text = api.getTextContent(node) as string;
    return vnode('!', {}, [], text, node as any);
  } else {
    return vnode('', {}, [], undefined, node as any);
  }
}

export default toVNode;