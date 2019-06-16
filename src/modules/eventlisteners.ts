/**
 * 在vnode更新的时候，更新dom中的eventlisteners(自定义数据集)操作
 */
import {VNode, VNodeData} from '../vnode';
import {Module} from './module';

export type On = {
  [N in keyof HTMLElementEventMap]?: (ev: HTMLElementEventMap[N]) => void
} & {
  [event: string]: EventListener
};
//snabbdom中对事件处理做了一层包装，真实DOM的事件触发的是对vnode的操作
//主要途径是
// createListner => 返回handler作事件监听生成器 =>handler上绑定vnode =>将handler作真实DOM的事件处理器
//真实DOM事件触发后 => handler获得真实DOM的事件对象 => 将真实DOM事件对象传入handleEvent => handleEvent找到
//对应的vnode事件处理器，然后调用这个处理器从而修改vnode
/**
 * 执行响应的事件处理程序
 * 主要是处理几种情况：
 * 1. handler 为函数的情况
 * 2. handler 为 object , 但是第一个元素为 function 的情况 ，eg: handler = [fn,arg1,arg2] ;
 * 3. handler 为 object ，第一个元素不为 function 的情况 ， eg: handler = [[fn1,arg1],[fn2]]
 * @param handler 
 * @param vnode 
 * @param event 
 */
function invokeHandler(handler: any, vnode?: VNode, event?: Event): void {
  if (typeof handler === "function") {
    // call function handler
    //将事件处理器在vnode上调用
    handler.call(vnode, event, vnode);
  //存在事件绑定数据或者存在多事件处理器
  } else if (typeof handler === "object") {
    // call handler with arguments
  
    if (typeof handler[0] === "function") {
      // 第一项为函数说明后面的项为想要传的参数
      // special case for single argument for performance
      //当长度为2的时候，用call，优化性能
      if (handler.length === 2) {
        handler[0].call(vnode, handler[1], event, vnode);
      } else {
        //如果存在多个绑定数据，则要转化为数组，用apply的方式调用，而apply性能比call差
        // 组装参数，用 apply 调用
        var args = handler.slice(1);
        args.push(event);
        args.push(vnode);
        handler[0].apply(vnode, args);
      }
    } else {
      // call multiple handlers
      //如果存在多个相同事件的不同处理器，则递归调用
      //如on：{click:[[handeler1,1],[handler,2]]}
      for (var i = 0; i < handler.length; i++) {
        invokeHandler(handler[i], vnode, event);
      }
    }
  }
}
/**
 * 当事件触发的时候，会调用 handleEvent(event, (handler as any).vnode);

handleEvent 主要负责转发 ， 去除 on 里面对应的事件处理函数，进行调用
 * @param event 
 * @param vnode 
 */
function handleEvent(event: Event, vnode: VNode) {
  var name = event.type,
      on = (vnode.data as VNodeData).on;

  // call event handler(s) if exists
  if (on && on[name]) {
    invokeHandler(on[name], vnode, event);
  }
}
/**
 * 创建监听器
 */
function createListener() {
  //事件处理器
  return function handler(event: Event) {
    handleEvent(event, (handler as any).vnode);
  }
}


/**
 * 事件监听器
 * 更新事件监听的主要逻辑:
 * 1. 删除新事件列表上不存在的事件
 * 2. 添加新增的事件
 * @param oldVnode 
 * @param vnode 
 */
function updateEventListeners(oldVnode: VNode, vnode?: VNode): void {

  // vnode.data.on : 这个保存了一系列的绑定事件。 例如 on['click'] ,里面保存了绑定的 click 事件

  //vnode.listener : 作为实际绑定到元素上的回调 。 elm.addEventListener(name, listener, false);。所有的事件触发后都是先回调到 listener ，再分发给不同的事件处理器
  var oldOn = (oldVnode.data as VNodeData).on,
      oldListener = (oldVnode as any).listener,
      oldElm: Element = oldVnode.elm as Element,
      on = vnode && (vnode.data as VNodeData).on,
      elm: Element = (vnode && vnode.elm) as Element,
      name: string;

  // optimization for reused immutable handlers
  if (oldOn === on) {
    return;
  }

  // remove existing listeners which no longer used
  // 删除多余的事件
  if (oldOn && oldListener) {
    // if element changed or deleted we remove all existing listeners unconditionally
    if (!on) {
      // 如果新的节点没有绑定事件，则删除所有的事件
      for (name in oldOn) {
        // remove listener if element was changed or existing listeners removed
         // 删除监听器
        oldElm.removeEventListener(name, oldListener, false);
      }
    } else {
      for (name in oldOn) {
        // remove listener if existing listener removed
         // 删除在新事件列表上不存在的监听器
        if (!on[name]) {
          oldElm.removeEventListener(name, oldListener, false);
        }
      }
    }
  }

  // add new listeners which has not already attached
  if (on) {
    // reuse existing listener or create new
    // 重用old的监听器
    var listener = (vnode as any).listener = (oldVnode as any).listener || createListener();
    // update vnode for listener
    listener.vnode = vnode;

    // if element changed or added we add all needed listeners unconditionally
    if (!oldOn) {
      for (name in on) {
        // add listener if element was changed or new listeners added
        elm.addEventListener(name, listener, false);
      }
    } else {
      for (name in on) {
        // add listener if new listener added
        if (!oldOn[name]) {
          // 添加新增的监听器
          elm.addEventListener(name, listener, false);
        }
      }
    }
  }
}
/**
 * 导出时间监听模块，创建、更新、销毁
 */
export const eventListenersModule = {
  create: updateEventListeners,
  update: updateEventListeners,
  destroy: updateEventListeners
} as Module;
export default eventListenersModule;
