"""AMDL 构建脚本 —— 一键打包 Windows 可执行文件"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).parent
DIST = ROOT / "dist"
BUILD = ROOT / "build_output"

APP_NAME = "AMDL"
VERSION = "1.0.0"


def step(msg: str):
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}")


def build_frontend():
    """构建 Next.js 前端，输出到 gui/out/"""
    step("1/4 构建前端...")
    gui_dir = ROOT / "gui"
    if not (gui_dir / "node_modules").exists():
        run_cmd(["npm", "install"], cwd=str(gui_dir))
    next_bin = gui_dir / "node_modules" / ".bin" / "next"
    run_cmd([str(next_bin), "build"], cwd=str(gui_dir))
    print("  前端构建完成 -> gui/out/")


def clean():
    """清理旧的构建产物"""
    step("2/4 清理旧构建...")
    for d in [DIST, BUILD]:
        if d.exists():
            shutil.rmtree(d)
    print("  清理完成")


def build_backend():
    """用 PyInstaller 打包后端 + 桌面壳"""
    step("3/4 打包后端...")
    DIST.mkdir(parents=True, exist_ok=True)

    # 确保 gui/out/ 存在
    gui_out = ROOT / "gui" / "out"
    if not (gui_out / "index.html").exists():
        print("  前端未构建，先构建前端...")
        build_frontend()

    # PyInstaller 命令
    src_dir = ROOT / "src"
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name", APP_NAME,
        "--onefile",
        "--console",
        "--clean",
        "--noconfirm",
        "--add-data", f"{gui_out}{os.pathsep}gui{os.path.sep}out",
        "--add-data", f"{src_dir}{os.pathsep}amdl",
        "--hidden-import", "amdl",
        "--hidden-import", "amdl.server",
        "--hidden-import", "amdl.core_downloader",
        "--hidden-import", "amdl.task_manager",
        "--hidden-import", "amdl.db",
        "--hidden-import", "amdl.config_manager",
        "--hidden-import", "amdl.converter",
        "--hidden-import", "amdl.enums",
        "--hidden-import", "amdl.cli",
        "--hidden-import", "amdl.i18n",
        "--hidden-import", "amdl.utils",
        "--hidden-import", "gamdl",
        "--hidden-import", "gamdl.api",
        "--hidden-import", "gamdl.downloader",
        "--hidden-import", "gamdl.interface",
        "--hidden-import", "python_multipart",
        "--hidden-import", "multipart",
        "--hidden-import", "websockets",
        str(ROOT / "desktop.py"),
    ]
    run_cmd(cmd, cwd=str(ROOT))

    # 移动结果到根目录
    # PyInstaller 默认输出到 cwd/dist/（即 ROOT/dist/）
    exe_src = DIST / f"{APP_NAME}.exe"
    if not exe_src.exists():
        exe_src = BUILD / "dist" / f"{APP_NAME}.exe"
    if exe_src.exists():
        root_exe = ROOT / f"{APP_NAME}.exe"
        shutil.copy(exe_src, root_exe)
        print(f"  可执行文件 -> {APP_NAME}.exe")

    print("  后端打包完成")


def make_portable():
    """创建便携版压缩包"""
    step("4/4 创建便携版压缩包...")

    portable_dir = BUILD / "portable" / APP_NAME
    portable_dir.mkdir(parents=True, exist_ok=True)

    # 复制 exe
    exe = DIST / f"{APP_NAME}.exe"
    if exe.exists():
        shutil.copy(exe, portable_dir / f"{APP_NAME}.exe")

    # 复制启动脚本（设置 PYTHONUTF8=1 修复 Windows GBK 编码问题）
    bat_content = f'''@echo off
chcp 65001 >nul
title AMDL - Apple Music Downloader
set PYTHONUTF8=1
echo.
echo   AMDL v{VERSION}
echo   Apple Music Downloader
echo.
echo   首次使用请确保已准备好 cookies.txt
echo.
start "" "%~dp0{APP_NAME}.exe"
'''
    (portable_dir / "启动.bat").write_text(bat_content, encoding="utf-8")
    # 同时复制启动脚本到根目录
    (ROOT / "启动.bat").write_text(bat_content, encoding="utf-8")

    # 压缩到根目录
    zip_path = ROOT / f"{APP_NAME}_v{VERSION}_portable.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in portable_dir.rglob("*"):
            arcname = f.relative_to(portable_dir.parent)
            zf.write(f, arcname)
    print(f"  便携版 -> {APP_NAME}_v{VERSION}_portable.zip")

    shutil.rmtree(BUILD / "portable", ignore_errors=True)


def make_installer():
    """创建 NSIS 安装程序"""
    step("5/5 创建 NSIS 安装包...")

    nsis_paths = [
        "C:/Program Files (x86)/NSIS/makensis.exe",
        "C:/Program Files/NSIS/makensis.exe",
    ]
    makensis = None
    for p in nsis_paths:
        if Path(p).exists():
            makensis = p
            break

    if not makensis:
        makensis = shutil.which("makensis")

    if not makensis:
        print("  [跳过] NSIS 未安装，无法创建安装包")
        return

    cmd = [makensis, str(ROOT / "installer.nsi")]
    run_cmd(cmd, cwd=str(ROOT))
    print(f"  安装包 -> dist/{APP_NAME}_Setup_v{VERSION}.exe")


def run_cmd(cmd: list[str], cwd: str | None = None):
    """运行命令并打印输出"""
    print(f"  > {' '.join(cmd)}")
    result = subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.stdout:
        for line in result.stdout.strip().split("\n")[-10:]:
            print(f"    {line}")
    if result.returncode != 0:
        if result.stderr:
            for line in result.stderr.strip().split("\n")[-5:]:
                print(f"    [ERR] {line}")
        raise RuntimeError(f"Command failed with code {result.returncode}")


# ── main ────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="AMDL 构建脚本")
    parser.add_argument("--skip-frontend", action="store_true", help="跳���前端构建")
    parser.add_argument("--portable-only", action="store_true", help="仅创建便携版（需要已打包的 exe）")
    args = parser.parse_args()

    if args.portable_only:
        make_portable()
        return

    if not args.skip_frontend:
        build_frontend()
    clean()
    build_backend()
    make_portable()
    make_installer()

    step("构建完成！")
    print(f"\n  输出目录: {ROOT}")
    print(f"  便携程序:   {APP_NAME}.exe")
    print(f"  便携压缩包: {APP_NAME}_v{VERSION}_portable.zip")
    print(f"  安装程序:   dist/{APP_NAME}_Setup_v{VERSION}.exe")
    print()


if __name__ == "__main__":
    main()
