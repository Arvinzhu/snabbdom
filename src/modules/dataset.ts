/**
 * 在vnode更新的时候，更新dom中的dataset(自定义数据集)操作。
 */
import {VNode, VNodeData} from '../vnode';
import {Module} from './module';

export type Dataset = Record<string, string>;

const CAPS_REGEX = /[A-Z]/g;

function updateDataset(oldVnode: VNode, vnode: VNode): void {
  let elm: HTMLElement = vnode.elm as HTMLElement,
    oldDataset = (oldVnode.data as VNodeData).dataset,
    dataset = (vnode.data as VNodeData).dataset,
    key: string;

  if (!oldDataset && !dataset) return;
  if (oldDataset === dataset) return;
  oldDataset = oldDataset || {};
  dataset = dataset || {};
  const d = elm.dataset;


  // 删除旧节点中在新节点不存在的数据集
  for (key in oldDataset) {
    if (!dataset[key]) {
      if (d) {
        if (key in d) {
          delete d[key];
        }
      } else {
        //  CAPS_REGEX = /[A-Z]/g;
        // 将驼峰格式转为中横线连接格式
        elm.removeAttribute('data-' + key.replace(CAPS_REGEX, '-$&').toLowerCase());
      }
    }
  }
  // 更新数据集
  for (key in dataset) {
    if (oldDataset[key] !== dataset[key]) {
      if (d) {
        d[key] = dataset[key];
      } else {
        elm.setAttribute('data-' + key.replace(CAPS_REGEX, '-$&').toLowerCase(), dataset[key]);
      }
    }
  }
}

/**
 * 从elm中删除vnode不存在的属性集中的属性
 */
export const datasetModule = {create: updateDataset, update: updateDataset} as Module;
export default datasetModule;
