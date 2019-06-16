/**
 *  在vnode更新的时候，更新dom中的props操作
 */
import {VNode, VNodeData} from '../vnode';
import {Module} from './module';
/**
 * 将string类型的数据转变为any类型
 */
export type Props = Record<string, any>;

function updateProps(oldVnode: VNode, vnode: VNode): void {
  var key: string, cur: any, old: any, elm = vnode.elm,
      oldProps = (oldVnode.data as VNodeData).props,
      props = (vnode.data as VNodeData).props;

  if (!oldProps && !props) return;
  if (oldProps === props) return;
  oldProps = oldProps || {};
  props = props || {};


   // 删除多余的属性
  for (key in oldProps) {
    if (!props[key]) {
      delete (elm as any)[key];
    }
  }
   // 添加新增的属性
  for (key in props) {
    cur = props[key];
    old = oldProps[key];
    //如果新旧节点属性不同，且对比的属性不是value或者elm上对应属性和新属性也不同，那么就需要更新
    // key为value的情况，再判断是否value有变化
    // key不为value的情况，直接更新
    if (old !== cur && (key !== 'value' || (elm as any)[key] !== cur)) {
      (elm as any)[key] = cur;
    }
  }
}

export const propsModule = {create: updateProps, update: updateProps} as Module;
export default propsModule;