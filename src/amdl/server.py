"""AMDL FastAPI 后端 —— REST API + WebSocket + 任务队列"""
from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import shutil
import tempfile

from fastapi import FastAPI, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from amdl.config_manager import load_config, save_config, CONFIG_PATH
from amdl import __version__
from amdl.core_downloader import download_urls
from amdl.enums import (
    CoverFormat,
    DownloadMode,
    MusicVideoCodec,
    SongCodec,
    SyncedLyricsFormat,
    UploadedVideoQuality,
)
from amdl.task_manager import (
    TaskInfo,
    broadcast_to_task,
    register_ws,
    task_manager,
    unregister_ws,
)
from amdl import db


# ── 生命周期 ───────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动时初始化数据库和任务管理器，关闭时停止"""
    await task_manager.start()
    yield
    await task_manager.stop()


# ── FastAPI 应用 ───────────────────────────────────────────────

app = FastAPI(
    title="AMDL API",
    description="Apple Music Downloader API — 支持实时进度推送和多任务队列",
    version=__version__,
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════
# 请求 / 响应模型
# ═══════════════════════════════════════════════════════════════

class TaskCreateRequest(BaseModel):
    urls: list[str] = Field(..., min_length=1, description="Apple Music 链接列表")
    cookies_path: str = Field(..., description="Netscape 格式 cookies.txt 路径")
    output_path: str | None = Field(default=None, description="下载输出目录（不填则用配置中的路径）")
    temp_path: str | None = Field(default=None, description="临时文件路径（不填则用配置中的路径）")
    wvd_path: str | None = Field(default=None, description="WVD 文件路径")
    nm3u8dlre_path: str = Field(default="N_m3u8DL-RE")
    ffmpeg_path: str = Field(default="ffmpeg")
    download_mode: str = Field(default="ytdlp")
    codec_song: str = Field(default="aac-web")
    codec_music_video: str = Field(default="h264")
    quality_uploaded_video: str = Field(default="best")
    synced_lyrics_format: str = Field(default="lrc")
    cover_format: str = Field(default="jpg")
    cover_size: int = Field(default=1200, ge=50, le=5000)
    truncate: int | None = Field(default=None, ge=0)
    audio_format: str | None = Field(default=None)
    video_format: str | None = Field(default=None)
    language: str = Field(default="zh-Hans")
    overwrite: bool = Field(default=False)
    save_cover: bool = Field(default=True)
    save_playlist: bool = Field(default=True)
    synced_lyrics_only: bool = Field(default=False)
    no_synced_lyrics: bool = Field(default=False)
    read_urls_as_txt: bool = Field(default=False)
    exclude_tags: str | None = Field(default=None)
    append_year: bool = Field(default=False, description="是否在专辑名后添加年份")
    year_before_album: bool = Field(default=False, description="年份放在专辑名前")
    folder_style: str | None = Field(default=None, description="文件夹结构（覆盖配置）")
    file_name_order: list | None = Field(default=None, description="文件名排列（覆盖配置）")
    template_folder_album: str = Field(default="{album_artist}/{album}")
    template_folder_compilation: str = Field(default="Compilations/{album}")
    template_file_single_disc: str = Field(default="{track:02d} {title}")
    template_file_multi_disc: str = Field(default="{disc}-{track:02d} {title}")
    template_folder_no_album: str = Field(default="{artist}/Unknown Album")
    template_file_no_album: str = Field(default="{title}")
    template_file_playlist: str = Field(default="Playlists/{playlist_artist}/{playlist_title}")
    template_date: str = Field(default="%Y-%m-%dT%H:%M:%SZ")


class DirectDownloadRequest(BaseModel):
    urls: list[str] = Field(..., min_length=1, description="Apple Music 链接列表")
    cookies_path: str = Field(..., description="Netscape 格式 cookies.txt 路径")
    output_path: str = Field(default="./Apple Music")
    temp_path: str = Field(default="./temp")
    wvd_path: str | None = Field(default=None)
    nm3u8dlre_path: str = Field(default="N_m3u8DL-RE")
    ffmpeg_path: str = Field(default="ffmpeg")
    download_mode: str = Field(default="ytdlp")
    codec_song: str = Field(default="aac-web")
    codec_music_video: str = Field(default="h264")
    quality_uploaded_video: str = Field(default="best")
    synced_lyrics_format: str = Field(default="lrc")
    cover_format: str = Field(default="jpg")
    cover_size: int = Field(default=1200, ge=50, le=5000)
    truncate: int | None = Field(default=None, ge=0)
    audio_format: str | None = Field(default=None)
    video_format: str | None = Field(default=None)
    language: str = Field(default="zh-Hans")
    overwrite: bool = Field(default=False)
    save_cover: bool = Field(default=True)
    save_playlist: bool = Field(default=True)
    synced_lyrics_only: bool = Field(default=False)
    no_synced_lyrics: bool = Field(default=False)
    read_urls_as_txt: bool = Field(default=False)
    exclude_tags: str | None = Field(default=None)
    append_year: bool = Field(default=False, description="是否在专辑名后添加年份")
    template_folder_album: str = Field(default="{album_artist}/{album}")
    template_folder_compilation: str = Field(default="Compilations/{album}")
    template_file_single_disc: str = Field(default="{track:02d} {title}")
    template_file_multi_disc: str = Field(default="{disc}-{track:02d} {title}")
    template_folder_no_album: str = Field(default="{artist}/Unknown Album")
    template_file_no_album: str = Field(default="{title}")
    template_file_playlist: str = Field(default="Playlists/{playlist_artist}/{playlist_title}")
    template_date: str = Field(default="%Y-%m-%dT%H:%M:%SZ")


class ConfigUpdateRequest(BaseModel):
    output_path: str | None = None
    temp_path: str | None = None
    cookies_path: str | None = None
    download_lyrics: bool | None = None
    folder_style: str | None = None
    file_name_order: list | None = None
    codec_song: str | None = None
    codec_music_video: str | None = None
    cover_format: str | None = None
    cover_size: int | None = None
    synced_lyrics_format: str | None = None
    download_mode: str | None = None
    audio_format: str | None = None
    video_format: str | None = None
    language: str | None = None
    theme: str | None = None
    save_cover: bool | None = None
    save_playlist: bool | None = None
    overwrite: bool | None = None
    template_folder_album: str | None = None
    template_folder_compilation: str | None = None
    template_file_single_disc: str | None = None
    template_file_multi_disc: str | None = None
    template_folder_no_album: str | None = None
    template_file_no_album: str | None = None
    template_file_playlist: str | None = None
    truncate: int | None = None
    exclude_tags: str | None = None


# ═══════════════════════════════════════════════════════════════
# 健康检查 & 信息
# ═══════════════════════════════════════════════════════════════

@app.get("/api/health", tags=["system"])
async def health_check():
    return {"status": "ok", "version": __version__}


@app.get("/api/version", tags=["system"])
async def get_version():
    return {"version": __version__}


@app.get("/api/info", tags=["system"])
async def get_api_info():
    return {
        "api_version": __version__,
        "supported_codecs_song": [{"value": c.value, "label": c.name} for c in SongCodec],
        "supported_codecs_music_video": [{"value": c.value, "label": c.name} for c in MusicVideoCodec],
        "supported_cover_formats": [{"value": c.value, "label": c.name} for c in CoverFormat],
        "supported_synced_lyrics_formats": [{"value": c.value, "label": c.name} for c in SyncedLyricsFormat],
        "supported_uploaded_video_qualities": [{"value": c.value, "label": c.name} for c in UploadedVideoQuality],
        "supported_download_modes": [{"value": c.value, "label": c.name} for c in DownloadMode],
        "supported_audio_conversion_formats": ["mp3", "flac", "wav", "aac", "m4a", "ogg", "wma", "alac"],
        "supported_video_conversion_formats": ["mp4", "mov", "mkv", "avi", "wmv", "flv", "webm"],
    }


# ═══════════════════════════════════════════════════════════════
# WebSocket —— 实时进度/日志推送
# ═══════════════════════════════════════════════════════════════

@app.websocket("/api/ws/{task_id}")
async def websocket_endpoint(ws: WebSocket, task_id: str):
    await ws.accept()
    register_ws(task_id, ws)

    # 如果有任务，先发送当前状态
    task = task_manager.get_task(task_id)
    if task:
        await ws.send_json({
            "type": "status",
            "status": task.status,
            "progress": task.progress,
            "completed": task.completed,
            "total": task.total,
            "error_count": task.error_count,
        })
        # 发送已有日志
        for log_line in task.logs[-100:]:
            await ws.send_json({"type": "log", "message": log_line})

    try:
        while True:
            # 保持连接，接收客户端消息（如 cancel 指令）
            data = await ws.receive_text()
            # 可选：处理客户端发来的控制消息
    except WebSocketDisconnect:
        pass
    finally:
        unregister_ws(task_id, ws)


# ═══════════════════════════════════════════════════════════════
# 任务管理 API
# ═══════════════════════════════════════════════════════════════

@app.post("/api/tasks", tags=["tasks"])
async def create_task(req: TaskCreateRequest):
    """创建下载任务并加入队列，自动检测歌单并调整文件夹结构"""
    kwargs = req.model_dump()
    config = load_config()
    folder_style = req.folder_style or config.get("folder_style", "artist_album")

    # 自动检测歌单链接
    is_playlist = any("playlist" in u for u in req.urls)
    if is_playlist:
        kwargs["template_folder_album"] = "{playlist_title}"
        kwargs["template_file_single_disc"] = "{title}"
        kwargs["template_folder_compilation"] = "{playlist_title}"
        kwargs["template_file_no_album"] = "{artist} - {title}"
    else:
        # 应用用户选择的文件夹结构
        if folder_style == "none":
            # 读取用户自定义的文件名排列顺序并转为模板
            order = req.file_name_order or config.get("file_name_order", ["track", "title", "artist"])
            part_map = {"track": "{track:02d}", "title": "{title}", "artist": "{artist}", "album": "{album}", "sep": " - "}
            name_template = " ".join(part_map.get(p, "") for p in order).replace("  ", " ").replace(" -  - ", " - ").strip()
            kwargs["template_folder_album"] = ""
            kwargs["template_file_single_disc"] = name_template
            kwargs["template_folder_compilation"] = ""
            kwargs["template_folder_no_album"] = ""
            kwargs["template_file_no_album"] = name_template
        elif folder_style == "album_artist":
            kwargs["template_folder_album"] = "{album}/{album_artist}"
            kwargs["template_file_single_disc"] = "{track:02d} {title}"
            kwargs["template_folder_compilation"] = "{album}/{album_artist}"
        # artist_album is the gamdl default, no override needed

    # 专辑名添加年份
    if req.append_year:
        if req.year_before_album:
            replacement = "({year}) {album}"
        else:
            replacement = "{album} ({year})"
        for key in ["template_folder_album", "template_folder_compilation"]:
            val = kwargs.get(key)
            if val and "{album}" in val:
                kwargs[key] = val.replace("{album}", replacement)
            elif val and val == "{playlist_title}":
                pass  # 歌单文件夹不加年份
        if "template_folder_no_album" in kwargs:
            val = kwargs["template_folder_no_album"]
            if val and val != "" and val != "." and "{album}" not in (val or ""):
                kwargs["template_folder_no_album"] = replacement

    task = task_manager.create_task(**kwargs)
    task_manager.enqueue_task(task.id)
    return {"task_id": task.id, "status": task.status, "playlist": is_playlist}


@app.get("/api/tasks", tags=["tasks"])
async def list_tasks(status: str | None = None):
    """获取任务列表"""
    return task_manager.list_tasks(status=status)


@app.get("/api/tasks/{task_id}", tags=["tasks"])
async def get_task(task_id: str):
    """获取单个任务详情"""
    task = task_manager.get_task(task_id)
    if task is None:
        # 从数据库查
        db_task = db.get_task(task_id)
        if db_task is None:
            raise HTTPException(status_code=404, detail="任务不存在")
        return db_task
    return task.to_dict()


@app.delete("/api/tasks/{task_id}", tags=["tasks"])
async def delete_task(task_id: str):
    """删除任务（不能删除正在下载的任务）"""
    ok = task_manager.delete_task(task_id)
    if not ok:
        raise HTTPException(status_code=400, detail="无法删除该任务")
    return {"deleted": True}


@app.post("/api/tasks/{task_id}/cancel", tags=["tasks"])
async def cancel_task(task_id: str):
    """取消任务"""
    ok = await task_manager.cancel_task(task_id)
    if not ok:
        raise HTTPException(status_code=404, detail="任务不存在或无法取消")
    return {"cancelled": True}


# ═══════════════════════════════════════════════════════════════
# 直接下载 API（兼容旧版，同步模式）
# ═══════════════════════════════════════════════════════════════

@app.post("/api/download", tags=["download"])
async def download(req: DirectDownloadRequest):
    """直接下载（同步），不经过任务队列"""
    try:
        err_count = await asyncio.to_thread(
            download_urls,
            urls=req.urls,
            cookies_path=Path(req.cookies_path),
            output_path=Path(req.output_path),
            temp_path=Path(req.temp_path),
            wvd_path=Path(req.wvd_path) if req.wvd_path else None,
            nm3u8dlre_path=req.nm3u8dlre_path,
            ffmpeg_path=req.ffmpeg_path,
            download_mode=DownloadMode(req.download_mode),
            codec_song=SongCodec(req.codec_song),
            codec_music_video=MusicVideoCodec(req.codec_music_video),
            quality_post=UploadedVideoQuality(req.quality_uploaded_video),
            synced_lyrics_format=SyncedLyricsFormat(req.synced_lyrics_format),
            cover_format=CoverFormat(req.cover_format),
            cover_size=req.cover_size,
            truncate=req.truncate,
            audio_format=req.audio_format,
            video_format=req.video_format,
            template_folder_album=req.template_folder_album,
            template_folder_compilation=req.template_folder_compilation,
            template_file_single_disc=req.template_file_single_disc,
            template_file_multi_disc=req.template_file_multi_disc,
            template_folder_no_album=req.template_folder_no_album,
            template_file_no_album=req.template_file_no_album,
            template_file_playlist=req.template_file_playlist,
            template_date=req.template_date,
            exclude_tags=req.exclude_tags,
            overwrite=req.overwrite,
            save_cover=req.save_cover,
            save_playlist=req.save_playlist,
            synced_lyrics_only=req.synced_lyrics_only,
            no_synced_lyrics=req.no_synced_lyrics,
            read_urls_as_txt=req.read_urls_as_txt,
            language=req.language,
            log_level="INFO",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"下载出错: {e}")

    return {
        "success": err_count == 0,
        "error_count": err_count,
        "total_urls": len(req.urls),
        "message": "全部下载完成" if err_count == 0 else f"下载完成，共 {err_count} 个错误",
    }


# ═══════════════════════════════════════════════════════════════
# 下载历史
# ═══════════════════════════════════════════════════════════════

@app.get("/api/history", tags=["history"])
async def get_history(limit: int = 50):
    """获取下载历史"""
    return db.list_tasks(limit=limit)


@app.delete("/api/history", tags=["history"])
async def clear_history():
    """清空所有下载记录（包括进行中的任务）"""
    # 取消所有进行中的任务
    for task_id in list(task_manager._tasks.keys()):
        await task_manager.cancel_task(task_id)
    # 清空内存
    task_manager._tasks.clear()
    # 清空数据库
    count = db.clear_history()
    return {"deleted": count}


# ═══════════════════════════════════════════════════════════════
# 配置管理
# ═══════════════════════════════════════════════════════════════

@app.get("/api/config", tags=["config"])
async def get_config():
    """获取当前配置"""
    return load_config()


@app.put("/api/config", tags=["config"])
async def update_config(req: ConfigUpdateRequest):
    """更新配置（只更新传入的字段）"""
    current = load_config()
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    current.update(updates)
    save_config(current)
    return current


@app.get("/api/config/path", tags=["config"])
async def get_config_path():
    """获取配置文件路径"""
    return {"path": str(CONFIG_PATH)}


# ═══════════════════════════════════════════════════════════════
# 清理
# ═══════════════════════════════════════════════════════════════

@app.post("/api/cleanup", tags=["system"])
async def cleanup(clear_output: bool = False):
    """清理临时文件和可选的输出目录"""
    from amdl.config_manager import load_config

    config = load_config()
    temp_path = Path(config.get("temp_path", "./temp"))
    output_path = Path(config.get("output_path", "./Apple Music"))

    results = {"temp_deleted": 0, "output_deleted": 0}

    # 清理临时目录
    if temp_path.exists():
        for f in temp_path.glob("*"):
            try:
                if f.is_dir():
                    shutil.rmtree(f, ignore_errors=True)
                else:
                    f.unlink()
                results["temp_deleted"] += 1
            except Exception:
                pass

    # 清理输出目录
    if clear_output and output_path.exists():
        count = 0
        for f in output_path.rglob("*"):
            if f.is_file():
                try:
                    f.unlink()
                    count += 1
                except Exception:
                    pass
        # 清理空目录
        for d in sorted(output_path.rglob("*"), reverse=True):
            if d.is_dir() and d != output_path:
                try:
                    d.rmdir()
                except Exception:
                    pass
        results["output_deleted"] = count

    return {"success": True, **results}


# ═══════════════════════════════════════════════════════════════
# Cookies 验证
# ═══════════════════════════════════════════════════════════════

class CookiesCheckRequest(BaseModel):
    cookies_path: str = Field(..., description="Netscape 格式 cookies.txt 路径")
    language: str = Field(default="zh-Hans", description="API 语言")


@app.post("/api/cookies/check", tags=["cookies"])
async def check_cookies(req: CookiesCheckRequest):
    """验证 cookies 文件是否有效"""
    from gamdl.api import AppleMusicApi

    path = Path(req.cookies_path)
    if not path.exists():
        return {"valid": False, "error": "文件不存在", "subscription": False}

    if not path.is_file():
        return {"valid": False, "error": "路径不是文件", "subscription": False}

    try:
        api = await AppleMusicApi.create_from_netscape_cookies(
            cookies_path=str(path),
            language=req.language,
        )
    except Exception as e:
        return {"valid": False, "error": f"无法解析 cookies: {e}", "subscription": False}

    has_sub = api.active_subscription

    # 检测地区/商店（gamdl 初始化时已获取，直接从属性读取）
    storefront = getattr(api, "storefront", None)
    storefront_name = None

    storefront_map = {
        "us": ("美国", "🇺🇸"), "cn": ("中国", "🇨🇳"), "jp": ("日本", "🇯🇵"),
        "tw": ("台湾", "🇹🇼"), "hk": ("香港", "🇭🇰"), "gb": ("英国", "🇬🇧"),
        "fr": ("法国", "🇫🇷"), "de": ("德国", "🇩🇪"), "kr": ("韩国", "🇰🇷"),
        "ca": ("加拿大", "🇨🇦"), "au": ("澳大利亚", "🇦🇺"),
        "sg": ("新加坡", "🇸🇬"), "in": ("印度", "🇮🇳"), "br": ("巴西", "🇧🇷"),
        "mx": ("墨西哥", "🇲🇽"), "es": ("西班牙", "🇪🇸"), "it": ("意大利", "🇮🇹"),
        "nl": ("荷兰", "🇳🇱"), "se": ("瑞典", "🇸🇪"), "no": ("挪威", "🇳🇴"),
        "dk": ("丹麦", "🇩🇰"), "fi": ("芬兰", "🇫🇮"), "ru": ("俄罗斯", "🇷🇺"),
        "tr": ("土耳其", "🇹🇷"), "za": ("南非", "🇿🇦"), "nz": ("新西兰", "🇳🇿"),
    }
    storefront_emoji = None
    if storefront:
        info = storefront_map.get(storefront.lower(), (storefront.upper(), ""))
        storefront_name = info[0]
        storefront_emoji = info[1]

    return {
        "valid": True,
        "error": None,
        "subscription": has_sub,
        "storefront": storefront,
        "storefront_name": storefront_name,
        "storefront_emoji": storefront_emoji,
        "message": None,  # deprecated, frontend uses structured fields now
    }


@app.post("/api/cookies/upload", tags=["cookies"])
async def upload_cookies(file: UploadFile):
    """上传 cookies 文件（浏览器模式），保存到临时目录并返回路径"""
    if not file.filename or not (file.filename.endswith(".txt") or "cookie" in file.filename.lower()):
        raise HTTPException(status_code=400, detail="请上传 .txt 格式的 cookies 文件")

    temp_dir = Path(tempfile.gettempdir()) / "amdl_cookies"
    temp_dir.mkdir(parents=True, exist_ok=True)

    safe_name = f"cookies_{Path(file.filename).name}"
    save_path = temp_dir / safe_name

    try:
        content = await file.read()
        save_path.write_bytes(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存文件失败: {e}")

    return {"path": str(save_path), "filename": file.filename}


# ═══════════════════════════════════════════════════════════════
# 更新检查
# ═══════════════════════════════════════════════════════════════

@app.get("/api/update/check", tags=["system"])
async def check_update():
    """检查 GitHub Release 是否有新版本"""
    import urllib.request

    try:
        url = "https://api.github.com/repos/DerekH-233/AMDL/releases/latest"
        req = urllib.request.Request(url, headers={"User-Agent": "AMDL"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            latest_tag = data.get("tag_name", "").lstrip("v")
    except Exception:
        return {
            "current": __version__,
            "latest": None,
            "has_update": False,
            "error": "检查失败，请检查网络连接",
            "release_url": "https://github.com/DerekH-233/AMDL/releases",
        }

    has_update = _version_newer(latest_tag, __version__)

    return {
        "current": __version__,
        "latest": latest_tag,
        "has_update": has_update,
        "error": None,
        "release_url": f"https://github.com/DerekH-233/AMDL/releases/tag/v{latest_tag}" if has_update else None,
    }


def _version_newer(latest: str, current: str) -> bool:
    """比较版本号，latest > current 返回 True"""
    try:
        latest_parts = [int(x) for x in latest.split(".")]
        current_parts = [int(x) for x in current.split(".")]
        return latest_parts > current_parts
    except (ValueError, AttributeError):
        return False


# ═══════════════════════════════════════════════════════════════
# 全局异常处理
# ═══════════════════════════════════════════════════════════════

@app.exception_handler(Exception)
async def global_exception_handler(request: Any, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": f"服务器错误: {exc}"})
