/**
 * 帮助函数主要用来操作生成vnode
 */
import {vnode, VNode, VNodeData} from './vnode';
export type VNodes = Array<VNode>;
export type VNodeChildElement = VNode | string | number | undefined | null;
export type ArrayOrElement<T> = T | T[];
export type VNodeChildren = ArrayOrElement<VNodeChildElement>
import * as is from './is';
 

function addNS(data: any, children: VNodes | undefined, sel: string | undefined): void {
  //svg 的name space
  data.ns = 'http://www.w3.org/2000/svg';
  if (sel !== 'foreignObject' && children !== undefined) {
    for (let i = 0; i < children.length; ++i) {
      let childData = children[i].data;
      if (childData !== undefined) {
        // 递归为子节点添加命名空间
        addNS(childData, (children[i] as VNode).children as VNodes, children[i].sel);
      }
    }
  }
}
/**
 * 重载h函数
 * 根据选择器 ，数据 ，创建 vnode
 */
export function h(sel: string): VNode;
export function h(sel: string, data: VNodeData): VNode;
export function h(sel: string, children: VNodeChildren): VNode;
export function h(sel: string, data: VNodeData, children: VNodeChildren): VNode;
/**
 *  h 函数比较简单，主要是提供一个方便的工具函数，方便创建 vnode 对象
 * @param sel 选择器
 * @param b    数据
 * @param c    子节点
 * @returns {{sel, data, children, text, elm}}
 */
export function h(sel: any, b?: any, c?: any): VNode {
  var data: VNodeData = {}, children: any, text: any, i: number;
  // 如果存在子节点
  // 三个参数的情况  sel , data , children | text
  if (c !== undefined) {
    // 那么h的第二项就是data
    data = b;
    // 如果c是数组，那么存在子element节点
    if (is.array(c)) { children = c; }
    //否则为子text节点
    else if (is.primitive(c)) { text = c; }
    // 说明c是一个子元素
    else if (c && c.sel) { children = [c]; }
    //如果c不存在，只存在b，那么说明需要渲染的vdom不存在data部分，只存在子节点部分
  } else if (b !== undefined) {
    // 两个参数的情况 : sel , children | text
    // 两个参数的情况 : sel , data
    // 子元素数组
    if (is.array(b)) { children = b; }
    //子元素文本节点
    else if (is.primitive(b)) { text = b; }
    // 单个子元素
    else if (b && b.sel) { children = [b]; }
    // 不是元素，而是数据
    else { data = b; }
  }
  //  对文本或者数字类型的子节点进行转化
  if (children !== undefined) {
    for (i = 0; i < children.length; ++i) {
       // 如果children是文本或数字 ，则创建文本节点
  //{sel: sel, data: data, children: children, text: text, elm: elm, key: key};
  //文本节点sel和data属性都是undefined
      if (is.primitive(children[i])) children[i] = vnode(undefined, undefined, undefined, children[i], undefined);
    }
  }
  //  针对svg的node进行特别的处理
  if (
    sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g' &&
    (sel.length === 3 || sel[3] === '.' || sel[3] === '#')
  ) {
      // 增加 namespace
    addNS(data, children, sel);
  }
  // 返回一个正常的vnode对象
  return vnode(sel, data, children, text, undefined);
};
export default h;
