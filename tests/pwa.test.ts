import { afterEach, describe, expect, it, vi } from "vitest";
import { PwaController, type PwaState } from "../src/pwa/controller";
import { installInstructions, isStandalone } from "../src/pwa/install";

class Worker extends EventTarget {
  state: ServiceWorkerState = "installing";
  postMessage = vi.fn();
  change(state: ServiceWorkerState) {
    this.state = state;
    this.dispatchEvent(new Event("statechange"));
  }
}
class Registration extends EventTarget {
  waiting: Worker | null = null;
  installing: Worker | null = null;
  update = vi.fn().mockResolvedValue(undefined);
}
class Container extends EventTarget {
  controller: Worker | null = new Worker();
  registration = new Registration();
  register = vi.fn().mockResolvedValue(this.registration);
  activate(worker = new Worker()) {
    this.registration.waiting = null;
    this.controller = worker;
    this.dispatchEvent(new Event("controllerchange"));
  }
}

const managers: PwaController[] = [];
function setup({ dirty = false, waiting = true, first = false } = {}) {
  const container = new Container();
  if (first) container.controller = null;
  if (waiting) container.registration.waiting = new Worker();
  let blocked = dirty;
  const states: PwaState[] = [];
  const reload = vi.fn();
  const manager = new PwaController(
    container as unknown as ServiceWorkerContainer,
    () => !blocked,
    (state) => states.push(state),
    reload,
  );
  managers.push(manager);
  return {
    container,
    manager,
    reload,
    states,
    block: (value: boolean) => {
      blocked = value;
    },
  };
}
afterEach(() => {
  managers.splice(0).forEach((manager) => manager.dispose());
  vi.useRealTimers();
});

describe("PWA 更新保护", () => {
  it("发现等待中的版本时只提示，不激活或刷新", async () => {
    const { manager, container, states, reload } = setup();
    await manager.start();
    expect(container.register).toHaveBeenCalledWith("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    expect(states.at(-1)?.needRefresh).toBe(true);
    expect(container.registration.waiting?.postMessage).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
  it("有草稿或业务操作未完成时拒绝更新，完成后才能确认", async () => {
    const { manager, container, states, reload, block } = setup({
      dirty: true,
    });
    await manager.start();
    manager.update();
    expect(container.registration.waiting?.postMessage).not.toHaveBeenCalled();
    expect(states.at(-1)?.error).toContain("请先保存");
    block(false);
    manager.update();
    expect(container.registration.waiting?.postMessage).toHaveBeenCalledWith({
      type: "SKIP_WAITING",
    });
    expect(reload).not.toHaveBeenCalled();
    container.activate();
    expect(reload).toHaveBeenCalledOnce();
  });
  it("另一个标签页激活新版不会刷新有未保存内容的页面", async () => {
    const { manager, container, states, reload, block } = setup({
      dirty: true,
    });
    await manager.start();
    container.activate();
    expect(states.at(-1)?.needRefresh).toBe(true);
    manager.update();
    expect(reload).not.toHaveBeenCalled();
    block(false);
    manager.update();
    expect(reload).toHaveBeenCalledOnce();
  });
  it("另一个标签页激活新版也不会刷新已保存的页面", async () => {
    const { manager, container, reload } = setup();
    await manager.start();
    container.activate();
    expect(reload).not.toHaveBeenCalled();
    manager.update();
    expect(reload).toHaveBeenCalledOnce();
  });
  it("确认到激活之间又输入了内容时，仍保留输入", async () => {
    const { manager, container, reload, block, states } = setup();
    await manager.start();
    manager.update();
    block(true);
    container.activate();
    expect(reload).not.toHaveBeenCalled();
    expect(states.at(-1)?.updating).toBe(false);
    block(false);
    manager.update();
    expect(reload).toHaveBeenCalledOnce();
  });
  it("等待激活超时后撤回刷新授权，迟到的激活也不会刷新", async () => {
    vi.useFakeTimers();
    const { manager, container, reload, states } = setup();
    await manager.start();
    manager.update();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(states.at(-1)?.error).toContain("更新暂未完成");
    container.activate();
    expect(reload).not.toHaveBeenCalled();
  });
  it("首次安装完成提示离线就绪，不要求刷新", async () => {
    const { manager, container, states, reload } = setup({
      waiting: false,
      first: true,
    });
    container.registration.installing = new Worker();
    await manager.start();
    container.registration.installing.change("installed");
    container.activate();
    expect(states.at(-1)?.offlineReady).toBe(true);
    expect(states.at(-1)?.needRefresh).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    manager.dismissOfflineReady();
    expect(states.at(-1)?.offlineReady).toBe(false);
  });
  it("更新下载完成前不提示，下载失败时允许继续使用旧版本", async () => {
    const { manager, container, states, reload } = setup({ waiting: false });
    await manager.start();
    const worker = new Worker();
    container.registration.installing = worker;
    container.registration.dispatchEvent(new Event("updatefound"));
    expect(states).toHaveLength(0);
    worker.change("redundant");
    expect(states.at(-1)?.error).toContain("离线资源准备失败");
    expect(reload).not.toHaveBeenCalled();
  });
  it("后台发现新版本下载完成时显示更新提示", async () => {
    const { manager, container, states } = setup({ waiting: false });
    await manager.start();
    container.registration.installing = new Worker();
    container.registration.dispatchEvent(new Event("updatefound"));
    container.registration.installing.change("installed");
    expect(states.at(-1)?.needRefresh).toBe(true);
  });
  it("注册失败仅报告错误，不刷新或抛出未处理异常", async () => {
    const { manager, container, reload, states } = setup();
    container.register.mockRejectedValueOnce(new Error("unavailable"));
    await manager.start();
    expect(states.at(-1)?.error).toContain("日记本仍可正常使用");
    expect(reload).not.toHaveBeenCalled();
  });
  it("更新消息发送失败后可重试", async () => {
    const { manager, container, states } = setup();
    await manager.start();
    container.registration.waiting?.postMessage.mockImplementationOnce(() => {
      throw new Error("worker gone");
    });
    manager.update();
    expect(states.at(-1)?.updating).toBe(false);
    expect(states.at(-1)?.error).toContain("更新失败");
    manager.update();
    expect(states.at(-1)?.updating).toBe(true);
  });
  it("检查更新失败时保留可用版本，并限制重复检查", async () => {
    const { manager, container, states } = setup({ waiting: false });
    await manager.start();
    container.registration.update.mockRejectedValueOnce(new Error("offline"));
    await manager.checkForUpdate();
    await manager.checkForUpdate();
    expect(container.registration.update).toHaveBeenCalledOnce();
    expect(states).toHaveLength(0);
  });
  it("卸载后移除监听和超时，不再刷新或更新 React 状态", async () => {
    vi.useFakeTimers();
    const { manager, container, states, reload } = setup();
    await manager.start();
    manager.update();
    manager.dispose();
    const count = states.length;
    container.activate();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(states).toHaveLength(count);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe("安装状态与安装说明", () => {
  it("识别标准 standalone 和 iOS standalone，不把普通网页当成已安装", () => {
    expect(isStandalone(false)).toBe(false);
    expect(isStandalone(true)).toBe(true);
    expect(isStandalone(false, true)).toBe(true);
    expect(isStandalone(false, false)).toBe(false);
  });
  it("iPhone 和桌面模式 iPad 均提供 Safari 主屏幕说明", () => {
    expect(installInstructions("iPhone", 5)).toContain("Safari");
    expect(installInstructions("Macintosh", 5)).toContain("添加到主屏幕");
    expect(installInstructions("Macintosh", 0)).toContain("地址栏");
  });
  it("Android 和普通桌面浏览器提供各自的安装入口说明", () => {
    expect(installInstructions("Android", 5)).toContain("Chrome");
    expect(installInstructions("Windows", 0)).toContain("浏览器菜单");
  });
});
