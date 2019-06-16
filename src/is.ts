/**
 * is函数主要是针对做一些数据类型判断，分 primitive和array类型
 */
export const array = Array.isArray;
export function primitive(s: any): s is (string | number) {
  return typeof s === 'string' || typeof s === 'number';
}
