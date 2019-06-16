
/**
 *  主要文件，程序的主线逻辑都在这个文件里。
 */
/* global module, document, Node */
import {Module} from './modules/module';
import {Hooks} from './hooks';
import vnode, {VNode, VNodeData, Key} from './vnode';
import * as is from './is';
import htmlDomApi, {DOMAPI} from './htmldomapi';

function isUndef(s: any): boolean { return s === undefined; }
function isDef(s: any): boolean { return s !== undefined; }

type VNodeQueue = Array<VNode>;

const emptyNode = vnode('', {}, [], undefined, undefined);
/**
 *  只要这两个虚拟元素的sel(选择器)和key一样就是same的
 */
function sameVnode(vnode1: VNode, vnode2: VNode): boolean {
  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}

function isVnode(vnode: any): vnode is VNode {
  return vnode.sel !== undefined;
}

type KeyToIndexMap = {[key: string]: number};

type ArraysOf<T> = {
  [K in keyof T]: (T[K])[];
}

type ModuleHooks = ArraysOf<Module>;

function createKeyToOldIdx(children: Array<VNode>, beginIdx: number, endIdx: number): KeyToIndexMap {
  let i: number, map: KeyToIndexMap = {}, key: Key | undefined, ch;
  for (i = beginIdx; i <= endIdx; ++i) {
    ch = children[i];
    if (ch != null) {
      key = ch.key;
      if (key !== undefined) map[key] = i;
    }
  }
  return map;
}

const hooks: (keyof Module)[] = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];

export {h} from './h';
export {thunk} from './thunk';
//Make all properties in T optional
//Partial的作用是将所有属性转变为可选值
/**
 * 
 * @param modules 
 * @param domApi 
 * @returns 返回 patch 方法
 */
export function init(modules: Array<Partial<Module>>, domApi?: DOMAPI) {
  let i: number, j: number, cbs = ({} as ModuleHooks);

  const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi;
  // 循环 hooks , 将每个 modules 下的 hook 方法提取出来存到 cbs 里面
 // 返回结果 eg ： cbs['create'] = [modules[0]['create'],modules[1]['create'],...];
  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = [];
    for (j = 0; j < modules.length; ++j) {
      const hook = modules[j][hooks[i]];
      if (hook !== undefined) {
        (cbs[hooks[i]] as Array<any>).push(hook);
      }
    }
  }
  /**
   * vnode选择器的构造有三部分组成
   * 1. tagName
   * 2. # +元素id(可能wei'')
   * 3. class属性名使用.号做连接符
   * @param elm 
   */
  function emptyNodeAt(elm: Element) {
    const id = elm.id ? '#' + elm.id : '';
    const c = elm.className ? '.' + elm.className.split(' ').join('.') : '';
    return vnode(api.tagName(elm).toLowerCase() + id + c, {}, [], undefined, elm);
  }
/**
 *  创建一个删除的回调，多次调用这个回调，直到监听器都没了，就删除元素
 * @param childElm 
 * @param listeners 
 */
  function createRmCb(childElm: Node, listeners: number) {
    return function rmCb() {
      if (--listeners === 0) {
        const parent = api.parentNode(childElm);
        api.removeChild(parent, childElm);
      }
    };
  }
// 根据VNode创建element
  /**
   * 将 vnode 转换成真正的 DOM 元素
   * 主要逻辑如下：
   * - 触发 init 钩子
   * - 处理注释节点
   * - 创建元素并设置 id , class
   * - 触发模块 create 钩子 。
   * - 处理子节点
   * - 处理文本节点
   * - 触发 vnodeData 的 create 钩子
   * @param vnode 
   * @param insertedVnodeQueue 
   */
  function createElm(vnode: VNode, insertedVnodeQueue: VNodeQueue): Node {
    let i: any, data = vnode.data;
    if (data !== undefined) {
      // 创建之前调用init钩子
      // 如果VNodeData存在且hooks里有init函数,则执行init函数,然后重新赋值VNodeData
      if (isDef(i = data.hook) && isDef(i = i.init)) {
        i(vnode);
        data = vnode.data;
      }
    }
    // 子虚拟dom,
    let children = vnode.children, sel = vnode.sel;

    // 当sel == "!"的时候表示这个vnode就是一个comment
    if (sel === '!') {
      if (isUndef(vnode.text)) {
        vnode.text = '';
      }
      vnode.elm = api.createComment(vnode.text as string);
    } else if (sel !== undefined) {
      // Parse selector
      // 从sel中获得tag值,id值,class值
      const hashIdx = sel.indexOf('#');
      const dotIdx = sel.indexOf('.', hashIdx);
      const hash = hashIdx > 0 ? hashIdx : sel.length;
      const dot = dotIdx > 0 ? dotIdx : sel.length;
      //获取tagName
      //改解析过程可以与sel属性组装的过程对照起来看
      const tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;

      const elm = vnode.elm = isDef(data) && isDef(i = (data as VNodeData).ns) ? api.createElementNS(i, tag): api.createElement(tag);
      if (hash < dot) elm.setAttribute('id', sel.slice(hash + 1, dot));
      // 设置元素的class
      if (dotIdx > 0) elm.setAttribute('class', sel.slice(dot + 1).replace(/\./g, ' '));


      // 调用create钩子
      // 执行所有模块的 create 钩子，创建对应的内容
      for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode);

      // 如果存在 children ，则创建children
      if (is.array(children)) {
        for (i = 0; i < children.length; ++i) {
          const ch = children[i];
          if (ch != null) {
            // 深度遍历
            api.appendChild(elm, createElm(ch as VNode, insertedVnodeQueue));
          }
        }
      } else if (is.primitive(vnode.text)) {
        // 追加文本节点
        api.appendChild(elm, api.createTextNode(vnode.text));
      }

      // 执行 vnode.data.hook 中的 create 钩子
      i = (vnode.data as VNodeData).hook; // Reuse variable
      if (isDef(i)) {
        if (i.create) i.create(emptyNode, vnode);
        ///当insert的hook存在,就在插入Vnode的队列中加入该vnode
        if (i.insert) insertedVnodeQueue.push(vnode);
      }
    } else {
      // 其他的情况就当vnode是一个简单的TextNode
      // sel 不存在的情况， 即为文本节点
      vnode.elm = api.createTextNode(vnode.text as string);
    }
    return vnode.elm;
  }
/**
 * 添加 Vnodes 到 真实 DOM 中
 * @param parentElm 
 * @param before 
 * @param vnodes 
 * @param startIdx 
 * @param endIdx 
 * @param insertedVnodeQueue 
 */
  function addVnodes(parentElm: Node,
                     before: Node | null,
                     vnodes: Array<VNode>,
                     startIdx: number,
                     endIdx: number,
                     insertedVnodeQueue: VNodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx];
      if (ch != null) {
        api.insertBefore(
          parentElm, 
          createElm(ch, insertedVnodeQueue),
          before
          );
      }
    }
  }

  function invokeDestroyHook(vnode: VNode) {
    let i: any, j: number, data = vnode.data;
    if (data !== undefined) {
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode);
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode);
      if (vnode.children !== undefined) {
        for (j = 0; j < vnode.children.length; ++j) {
          i = vnode.children[j];
          if (i != null && typeof i !== "string") {
            invokeDestroyHook(i);
          }
        }
      }
    }
  }
  /**
   * 删除 VNodes 的主要逻辑如下:
   * 循环触发 destroy 钩子，递归触发子节点的钩子
   * 触发 remove 钩子,利用 createRmCb , 在所有监听器执行后，才调用 api.removeChild,删除真正的 DOM 节点
   * @param parentElm 
   * @param vnodes 
   * @param startIdx 
   * @param endIdx 
   */
  function removeVnodes(parentElm: Node,
                        vnodes: Array<VNode>,
                        startIdx: number,
                        endIdx: number): void {
    for (; startIdx <= endIdx; ++startIdx) {
      let i: any, listeners: number, rm: () => void, ch = vnodes[startIdx];
      if (ch != null) {
        // 从这里可以看出判断文本节点和元素节点的依据是sel属性
        if (isDef(ch.sel)) {
          // 触发 destory钩子
          invokeDestroyHook(ch);
          // 
          listeners = cbs.remove.length + 1;
          // 所有监听删除
          rm = createRmCb(ch.elm as Node, listeners);
          //// 如果有钩子则调用钩子后再调删除回调，如果没，则直接调用回调
          for (i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm);


          if (isDef(i = ch.data) && isDef(i = i.hook) && isDef(i = i.remove)) {
            i(ch, rm);
          } else {
            rm();
          }
        } else { // Text node
          // 文本节点
          api.removeChild(parentElm, ch.elm as Node);
        }
      }
    }
  }
  /**
   * diff算法
   */
  /**
   * diff算法的核心逻辑
   * 1. 有线处理特殊场景，先对比两端，也就是
   *  旧 vnode 头 vs 新 vnode 头（顺序）
   *  旧 vnode 尾 vs 新 vnode 尾（顺序）
   *  旧 vnode 头 vs 新 vnode 尾（倒序）
   *  旧 vnode 尾 vs 新 vnode 头（倒序）
   * 2. 首尾不一样的情况，寻找 key 相同的节点，找不到则新建元素
   * 3. 如果找到 key，但是，元素选择器变化了，也新建元素
   * 4. 如果找到 key，并且元素选择没变， 则移动元素
   * 5. 两个列表对比完之后，清理多余的元素，新增添加的元素
   * 
   * 不提供 key 的情况下，如果只是顺序改变的情况，例如第一个移动到末尾。这个时候，会导致其实更新了后面的所有元素，这就体现了key 的重要性
   * @param parentElm 
   * @param oldCh 
   * @param newCh 
   * @param insertedVnodeQueue 
   */
  function updateChildren(parentElm: Node,
                          oldCh: Array<VNode>,
                          newCh: Array<VNode>,
                          insertedVnodeQueue: VNodeQueue) {
    //和patchVnode形成了精巧递归
    // 旧子节点数组的相关变量
    let oldStartIdx = 0, newStartIdx = 0;
    let oldEndIdx = oldCh.length - 1;
    let oldStartVnode = oldCh[0];
    let oldEndVnode = oldCh[oldEndIdx];
    //新子节点数组的相关变量
    let newEndIdx = newCh.length - 1;
    let newStartVnode = newCh[0];
    let newEndVnode = newCh[newEndIdx];

    let oldKeyToIdx: any;
    let idxInOld: number;
    let elmToMove: VNode;
    let before: any;
    // 当oldCh和newCh其中还有一个没有比较完的话，就执行下的函数
    //双向查找，只要有一个没遍历完成就继续处理
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      //oldCh其实元素为null则往后走一步
      //循环处理变量
      if (oldStartVnode == null) {
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
      } else if (oldEndVnode == null) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (newStartVnode == null) {
        newStartVnode = newCh[++newStartIdx];
      } else if (newEndVnode == null) {
        newEndVnode = newCh[--newEndIdx];

        // 比较 新旧的start元素是否相同
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        // 如果相同则进入patchVnode过程处理
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
        //跟新新旧start VNode继续向下走
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
        
        // 比较新旧endVnode元素是否相同
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
        //跟新新旧end VNode继续向下走
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];

        // 倒序比较
        // 比较oldStart  和 newEnd 元素
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        // 如果发现两个vnode元素sel相同
        // 应该进行如下处理
        // 1. 先对两个Vnode进行patch
        //做patch标记
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        // 然后将旧结点的DOM元素插入到当前oldEnd结点的下一个兄弟节点之前
        // 由于当前oldEndVnode可能不是指向oldCh数组末尾的元素。所以需要使用nextSibling来准确获取兄弟元素
        api.insertBefore(
          parentElm, 
          oldStartVnode.elm as Node, 
          api.nextSibling(oldEndVnode.elm as Node)
          );
        // 更新变量的idx
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];


      // 比较oldEnd和oldStart
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        // patchVnode标记不同的地方，跟新VDOM的内容
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
        // 此时将oldEndVnode.elm插入到oldStartVnode所指向的DOM元素之前
        api.insertBefore(parentElm, oldEndVnode.elm as Node, oldStartVnode.elm as Node);
        // 更新变量的idx
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        // 当正序和倒序都没有命中时
        // 先构建剩余旧元素的map，map是元素key到元素在oldCh数组的下标
        if (oldKeyToIdx === undefined) {
          oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        }
        //检查当前newStartVonode.key是否存在map中
        //存在则说明有匹配的元素，不存在则说明是新元素需要创建
        idxInOld = oldKeyToIdx[newStartVnode.key as string];
        // 处理不存在
        if (isUndef(idxInOld)) { // New element
          // 将当前的newStartVnode元素插入到当前的oldStartVnode.elm 元素之前
          api.insertBefore(
            parentElm, 
            createElm(newStartVnode, insertedVnodeQueue), 
            oldStartVnode.elm as Node
            );
          // 往后走
          newStartVnode = newCh[++newStartIdx];

        // 处理存在
        } else {
          // newStartVnode.key对应的old元素
          elmToMove = oldCh[idxInOld];
          // 比较选择器
          // sel属性有tageName+#元素id+使用.连接的class属性三部分组成
          if (elmToMove.sel !== newStartVnode.sel) {
            // 选择器不相同，需要创建元素
            //然后将其插入到oldStartVnode.elm之前
            api.insertBefore(
              parentElm, 
              createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm as Node
              );

          } else {
            //选择器相同，不需要新创建元素
            // 先执行patch
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
            //将移动的元素从oldCh数组里面用undeined代替，放置再次处理
            oldCh[idxInOld] = undefined as any;
            // 将命中并需要移动的元素插入到oldStartVnode.elm 元素之前
            api.insertBefore(
              parentElm, 
              (elmToMove.elm as Node),
              oldStartVnode.elm as Node);
          }
          //继续走
          newStartVnode = newCh[++newStartIdx];
        }
      }
    }
    // 当oldCh或者newCh中的元素已经全部处理完毕时
    if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
      // oldCh已经处理完毕，
      if (oldStartIdx > oldEndIdx) {
        //获取剩余元素赢当插入位置的兄弟节点
        // 兄弟节点可能是空，也可能是一个vdom节点
        before = newCh[newEndIdx+1] == null ? null : newCh[newEndIdx+1].elm;
        // 将剩余元素即newCh数组中下标在[newStartIdx,newStartIdx]区间之内的元素全都插入到before之前
        addVnodes(parentElm, 
          before,
          newCh, 
          newStartIdx,
          newStartIdx, 
          insertedVnodeQueue);
      } else {
        // newCH已经处理完毕，oldCH中剩余的元素应该被全部移除
        removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
      }
    }
  }
/**
 *  patchVnode 了解相同节点是如何更新的
 * 触发 prepatch 钩子
 * 触发 update 钩子， 这里主要为了更新对应的 module 内容
 * 非文本节点的情况 , 调用 updateChildren 更新所有子节点
 * 文本节点的情况 ， 直接 api.setTextContent(elm, vnode.text as string);
 * @param oldVnode 
 * @param vnode 
 * @param insertedVnodeQueue
 * @returns 
 */
  function patchVnode(oldVnode: VNode, vnode: VNode, insertedVnodeQueue: VNodeQueue) {
    let i: any, hook: any;
     // 调用全局hook里定义的事件的地方
    if (isDef(i = vnode.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {
      // 调用 prepatch 回调
      i(oldVnode, vnode);
    }
    // 因为 vnode 和 oldVnode 是相同的 vnode，所以我们可以复用 oldVnode.elm
    const elm = vnode.elm = (oldVnode.elm as Node);
    let oldCh = oldVnode.children;
    let ch = vnode.children;
    if (oldVnode === vnode) return;

     // 调用 cbs 中的所有模块的update回调 更新对应的实际内容。
    if (vnode.data !== undefined) {
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode);
      i = vnode.data.hook;
      if (isDef(i) && isDef(i = i.update)) i(oldVnode, vnode);
    }
    // 如果 vnode.text 不存在
    if (isUndef(vnode.text)) {
      // 如果新旧子节点数组都存在
      if (isDef(oldCh) && isDef(ch)) {
        // 核心逻辑（最复杂的地方）：怎么比较新旧 children 并更新，对应上面
        // 的数组比较
        if (oldCh !== ch) updateChildren(elm, oldCh as Array<VNode>, ch as Array<VNode>, insertedVnodeQueue);
        // 添加新 children
      } else if (isDef(ch)) {
        // 老节点不存在子节点，情况下，新建元素
        //  首先清空原来的 text
        if (isDef(oldVnode.text)) api.setTextContent(elm, '');
        //然后添加新节点
        addVnodes(elm, null, ch as Array<VNode>, 0, (ch as Array<VNode>).length - 1, insertedVnodeQueue);
      } else if (isDef(oldCh)) {
        //旧节点存在而新节点为空，说明子节点已被移除
        removeVnodes(elm, oldCh as Array<VNode>, 0, (oldCh as Array<VNode>).length - 1);
      } else if (isDef(oldVnode.text)) {
        // 新节点不存在，清空旧节点文本
        api.setTextContent(elm, '');
      }
      //新旧节点文本不一样，更新文本
    } else if (oldVnode.text !== vnode.text) {
      // 新节点无子节点，所以清除旧的子节点
      if (isDef(oldCh)) {
        removeVnodes(elm, oldCh as Array<VNode>, 0, (oldCh as Array<VNode>).length - 1);
      }
      // 新旧节点的文本不一样，复用文本元素，设置新的文本信息
      api.setTextContent(elm, vnode.text as string);
    }
    if (isDef(hook) && isDef(i = hook.postpatch)) {
      i(oldVnode, vnode);
    }
  }
  // 返回patch 方法
  /**
   * 触发 pre 钩子
   *  如果老节点非 vnode， 则新创建空的 vnode
   *  新旧节点为 sameVnode 的话，则调用 patchVnode 更新 vnode , 否则创建新节点
   *  触发收集到的新元素 insert 钩子
   *  触发 post 钩子
   * @param oldVnode 
   * @param vnode 
   * @returns  vnode
   */
  function patch(oldVnode: VNode | Element, vnode: VNode): VNode {
    let i: number, elm: Node, parent: Node;
    //收集新插入到的元素
    const insertedVnodeQueue: VNodeQueue = [];
    //先调用pre回调
    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]();

    // 如果老节点非 vnode ， 则创建一个空的 vnode
    if (!isVnode(oldVnode)) {
      oldVnode = emptyNodeAt(oldVnode);
    }
    //  如果是同个节点，则进行修补
    if (sameVnode(oldVnode, vnode)) {
      // 进入patch流程
      patchVnode(oldVnode, vnode, insertedVnodeQueue);
    } else {
      // 不同 Vnode 节点则新建
      // as 是告诉类型检查器，次数oldVnode.elm的类型应该是Node类型
      elm = oldVnode.elm as Node;
      //取到父节点node.parentNode属性
      parent = api.parentNode(elm);

      createElm(vnode, insertedVnodeQueue);
      // 插入新节点，删除老节点
      if (parent !== null) {
        api.insertBefore(parent, vnode.elm as Node, api.nextSibling(elm));
        removeVnodes(parent, [oldVnode], 0, 0);
      }
    }
    // 遍历所有收集到的插入节点，调用插入的钩子，
    for (i = 0; i < insertedVnodeQueue.length; ++i) {
      (((insertedVnodeQueue[i].data as VNodeData).hook as Hooks).insert as any)(insertedVnodeQueue[i]);
    }
    // 调用post的钩子
    for (i = 0; i < cbs.post.length; ++i) cbs.post[i]();
    return vnode;
  };
  
  return patch;
}
