/**
 * 定义的module结构
 */
import {PreHook, CreateHook, UpdateHook, DestroyHook, RemoveHook, PostHook} from '../hooks';
/**
 *  定义模块的钩子
 */
export interface Module {
  pre: PreHook;
  create: CreateHook;
  update: UpdateHook;
  destroy: DestroyHook;
  remove: RemoveHook;
  post: PostHook;
}