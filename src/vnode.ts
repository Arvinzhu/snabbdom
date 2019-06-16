/**
 * 定义了vnode的模型和转化成为vnode的工具方法。
 */
import {Hooks} from './hooks';
import {AttachData} from './helpers/attachto'
import {VNodeStyle} from './modules/style'
import {On} from './modules/eventlisteners'
import {Attrs} from './modules/attributes'
import {Classes} from './modules/class'
import {Props} from './modules/props'
import {Dataset} from './modules/dataset'
import {Hero} from './modules/hero'

export type Key = string | number;
/**
 * 定义VNode类型
 */
export interface VNode {
  // VNode的选择器，nodeName+id+class的组合
  sel: string | undefined;
  // 存放VNodeData的地方，具体见下面的VNodeData定义
  // 数据，主要包括属性、样式、数据、绑定时间等
  data: VNodeData | undefined;
  // 子vnode的地方数组
  children: Array<VNode | string> | undefined;
  // 存储vnode对应的真实的dom的地方
  //Node 是描述真实DOM 的数据类型
  // 关联的原生DOM节点
  elm: Node | undefined;
  // VNode的text文本，和children只能二选一
  text: string | undefined;
  // vnode的key值，主要用于后续vnode的diff过程
  // key , 唯一值，为了优化性能
  key: Key | undefined;
}
/**
 * VNodeData节点全部都是可选属性，也可动态添加任意类型的属性
 */
export interface VNodeData {
  // vnode上的其他属性
   // 属性 能直访问和接用  
  props?: Props;
  // vnode上面的浏览器原生属性，可以使用setAttribute设置的
  attrs?: Attrs;
  //样式类,class属性集合
  class?: Classes;
  // style属性集合
  style?: VNodeStyle;
  // vnode上面挂载的数据集合
  dataset?: Dataset;
  // 监听事件集合
  on?: On;
  // 
  hero?: Hero;
  // 额外附加的数据
  attachData?: AttachData;
  // 钩子函数集合，执行到不同的阶段调用不同的钩子函数
  hook?: Hooks;
  //
  key?: Key;
  // 命名空间 SVGs 命名空间，主要用于SVG
  ns?: string; // for SVGs
  fn?: () => VNode; // for thunks
  args?: Array<any>; // for thunks
  //其它额外的属性
  [key: string]: any; // for any other 3rd party module
}

/**
 * 根据窗入的属性对象，返回一个VNode对象
 * @param sel 
 * @param data 
 * @param children 
 * @param text 
 * @param elm 
 */
export function vnode(sel: string | undefined,
                      data: any | undefined,
                      children: Array<VNode | string> | undefined,
                      text: string | undefined,
                      elm: Element | Text | undefined): VNode {
  let key = data === undefined ? undefined : data.key;
  return {sel: sel, data: data, children: children,
          text: text, elm: elm, key: key};
}

export default vnode;
