/**
 * 在vnode更新的时候，更新dom中的attrs操作。
 */
import {VNode, VNodeData} from '../vnode';
import {Module} from './module';

// because those in TypeScript are too restrictive: https://github.com/Microsoft/TSJS-lib-generator/pull/237
declare global {
  interface Element {
    setAttribute(name: string, value: string | number | boolean): void;
    setAttributeNS(namespaceURI: string, qualifiedName: string, value: string | number | boolean): void;
  }
}

export type Attrs = Record<string, string | number | boolean>

const xlinkNS = 'http://www.w3.org/1999/xlink';
const xmlNS = 'http://www.w3.org/XML/1998/namespace';
const colonChar = 58;
const xChar = 120;
/**
 * 更新属性
 * 步骤:
 * 1. 遍历新 vnode 所有的属性，判断在 oldVnode 中是否相等，修改不相等的属性
 * 2. 删除不存在于 vnode 的属性
 * @param oldVnode 
 * @param vnode 
 */
function updateAttrs(oldVnode: VNode, vnode: VNode): void {
  var key: string, elm: Element = vnode.elm as Element,
      oldAttrs = (oldVnode.data as VNodeData).attrs,
      attrs = (vnode.data as VNodeData).attrs;
  //如果旧节点和新节点都不包含属性，立刻返回
  if (!oldAttrs && !attrs) return;
  if (oldAttrs === attrs) return;
  oldAttrs = oldAttrs || {};
  attrs = attrs || {};

  // update modified attributes, add new attributes
  //更新发生变化的属性，添加新的属性
  for (key in attrs) {
    const cur = attrs[key];
    const old = oldAttrs[key];
    //如果旧的属性和新的属性不同
    if (old !== cur) {
      if (cur === true) {
        elm.setAttribute(key, "");
      } else if (cur === false) {
        // 如果是boolean类属性，当vnode设置为falsy value时，直接删除，而不是更新值
        elm.removeAttribute(key);
      } else {
        // xChar = 120 = 'x'
        // 如果不是 x 开头
        if (key.charCodeAt(0) !== xChar) {
          elm.setAttribute(key, cur);
        // colonChar = 58 = ':'
        } else if (key.charCodeAt(3) === colonChar) {
          // Assume xml namespace
          // 处理xml的属性
          elm.setAttributeNS(xmlNS, key, cur);
        } else if (key.charCodeAt(5) === colonChar) {
          // Assume xlink namespace
          //处理xlink的属性
          elm.setAttributeNS(xlinkNS, key, cur);
        } else {
          // 处理普通属性
          elm.setAttribute(key, cur);
        }
      }
    }
  }
  // remove removed attributes
  // use `in` operator since the previous `for` iteration uses it (.i.e. add even attributes with undefined value)
  // the other option is to remove all attributes with value == undefined
  // 删除多余的属性
  for (key in oldAttrs) {
    if (!(key in attrs)) {
      elm.removeAttribute(key);
    }
  }
}
// attributesModule 导出了两个方法， 都是调用了 updateAttrs
// 在创建元素的时候，以及更新的时候，都会触发这两个钩子，来更新 attribute
export const attributesModule = {
  create: updateAttrs, 
  update: updateAttrs} as Module;
export default attributesModule;
