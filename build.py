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
# 从 __init__.py 读取唯一版本号
import runpy
_version_ns = runpy.run_path(str(ROOT / "src" / "amdl" / "__init__.py"))
VERSION = _version_ns["__version__"]


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
        "--icon", str(ROOT / "icon.ico"),
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
    """创建便携版压缩包（完整版 + 轻量版）"""
    step("4/4 创建便携版压缩包...")

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
    (ROOT / "启动.bat").write_text(bat_content, encoding="utf-8")
    bundled_ffmpeg = ROOT / "ffmpeg.exe"
    has_ffmpeg = bundled_ffmpeg.exists()

    for flavor, include_ffmpeg in [("full", True), ("lite", False)]:
        if not include_ffmpeg and not has_ffmpeg:
            continue
        if include_ffmpeg and not has_ffmpeg:
            continue

        portable_dir = BUILD / "portable" / APP_NAME
        portable_dir.mkdir(parents=True, exist_ok=True)

        exe = DIST / f"{APP_NAME}.exe"
        if exe.exists():
            shutil.copy(exe, portable_dir / f"{APP_NAME}.exe")
        if include_ffmpeg and has_ffmpeg:
            shutil.copy(bundled_ffmpeg, portable_dir / "ffmpeg.exe")
        (portable_dir / "启动.bat").write_text(bat_content, encoding="utf-8")

        suffix = "" if include_ffmpeg else "_lite"
        zip_path = ROOT / f"{APP_NAME}_v{VERSION}_portable{suffix}.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in portable_dir.rglob("*"):
                arcname = f.relative_to(portable_dir.parent)
                zf.write(f, arcname)
        print(f"  便携版 ({flavor}) -> {APP_NAME}_v{VERSION}_portable{suffix}.zip")
        shutil.rmtree(portable_dir, ignore_errors=True)

    shutil.rmtree(BUILD / "portable", ignore_errors=True)


def make_installer():
    """创建 NSIS 安装程序（完整版 + 轻量版）"""
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

    has_ffmpeg = (ROOT / "ffmpeg.exe").exists()

    for flavor, inc_ffmpeg in [("full", True), ("lite", False)]:
        if inc_ffmpeg and not has_ffmpeg:
            continue

        suffix = "" if inc_ffmpeg else "_lite"
        out_name = f"AMDL_Setup_v{VERSION}{suffix}"
        defines = [f"!define PRODUCT_OUTFILE \"dist\\{out_name}.exe\""]
        if not inc_ffmpeg:
            defines.append("!define LITE_VERSION")

        # 在 ROOT 下生成临时 .nsi（NSIS 相对路径解析需要）
        nsi_content = (ROOT / "installer.nsi").read_text(encoding="utf-8")
        tmp_nsi = ROOT / f"installer_{flavor}.nsi"
        tmp_nsi.write_text("\n".join(defines) + "\n" + nsi_content, encoding="utf-8")

        run_cmd([makensis, str(tmp_nsi)], cwd=str(ROOT))
        tmp_nsi.unlink()
        print(f"  安装包 ({flavor}) -> dist/{out_name}.exe")


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
