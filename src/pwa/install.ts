export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function isStandalone(displayMode: boolean, iosStandalone?: boolean) {
  return displayMode || iosStandalone === true;
}

export function installInstructions(userAgent: string, touchPoints: number) {
  if (
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && touchPoints > 1)
  ) {
    return "请用 Safari 打开本站，点分享按钮，选择「添加到主屏幕」，再点「添加」。若在微信等应用内，请先选择用 Safari 打开。";
  }
  if (/Android/i.test(userAgent)) {
    return "请用 Chrome 打开本站，在浏览器菜单中选择「安装应用」或「添加到主屏幕」。若当前浏览器不支持，请换用支持安装的浏览器。";
  }
  return "请点击浏览器地址栏中的安装图标，或在浏览器菜单中选择「安装应用」。若没有此选项，请使用 Chrome 或 Edge 等支持安装的浏览器。";
}
