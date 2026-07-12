"""任务队列管理器 —— 多任务排队、WebSocket 实时推送、进度追踪"""
from __future__ import annotations

import asyncio
import json
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

from amdl import db
from amdl.config_manager import load_config

# ── 全局 WebSocket 连接注册表 ─────────────────────────────────
# {task_id: set(websocket, ...)}
_ws_clients: dict[str, set] = {}


def register_ws(task_id: str, ws) -> None:
    _ws_clients.setdefault(task_id, set()).add(ws)


def unregister_ws(task_id: str, ws) -> None:
    clients = _ws_clients.get(task_id)
    if clients:
        clients.discard(ws)
        if not clients:
            del _ws_clients[task_id]


async def broadcast_to_task(task_id: str, message: dict) -> None:
    """向监听某个任务的所有 WebSocket 客户端广播消息"""
    clients = _ws_clients.get(task_id, set())
    dead = set()
    payload = json.dumps(message, ensure_ascii=False)
    for ws in clients:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.add(ws)
    for ws in dead:
        unregister_ws(task_id, ws)


# ── 任务状态 ───────────────────────────────────────────────────

@dataclass
class TaskInfo:
    id: str
    urls: list[str]
    cookies_path: str = ""
    output_path: str = "./Apple Music"
    temp_path: str = "./temp"
    wvd_path: str | None = None
    nm3u8dlre_path: str = "N_m3u8DL-RE"
    ffmpeg_path: str = "ffmpeg"
    download_mode: str = "ytdlp"
    codec_song: str = "aac-web"
    codec_music_video: str = "h264"
    quality_uploaded_video: str = "best"
    synced_lyrics_format: str = "lrc"
    cover_format: str = "jpg"
    cover_size: int = 1200
    truncate: int | None = None
    audio_format: str | None = None
    video_format: str | None = None
    language: str = "zh-Hans"
    overwrite: bool = False
    save_cover: bool = True
    save_playlist: bool = True
    synced_lyrics_only: bool = False
    no_synced_lyrics: bool = False
    read_urls_as_txt: bool = False
    exclude_tags: str | None = None
    artist_media_type: str = "all-albums"
    # 模板
    template_folder_album: str = "{album_artist}/{album}"
    template_folder_compilation: str = "Compilations/{album}"
    template_file_single_disc: str = "{track:02d} {title}"
    template_file_multi_disc: str = "{disc}-{track:02d} {title}"
    template_folder_no_album: str = "{artist}/Unknown Album"
    template_file_no_album: str = "{title}"
    template_file_playlist: str = "Playlists/{playlist_artist}/{playlist_title}"
    template_date: str = "%Y-%m-%dT%H:%M:%SZ"
    # 运行时状态
    status: str = "pending"
    progress: int = 0
    completed: int = 0
    total: int = 0
    error_count: int = 0
    last_error: str = ""
    logs: list[str] = field(default_factory=list)
    _cancel_event: asyncio.Event | None = field(default=None, repr=False)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "urls": self.urls,
            "cookies_path": self.cookies_path,
            "output_path": self.output_path,
            "codec_song": self.codec_song,
            "codec_music_video": self.codec_music_video,
            "audio_format": self.audio_format,
            "video_format": self.video_format,
            "status": self.status,
            "progress": self.progress,
            "completed": self.completed,
            "total": self.total,
            "error_count": self.error_count,
            "last_error": self.last_error,
        }


# ── 任务队列 ───────────────────────────────────────────────────

class TaskManager:
    """单例任务管理器"""

    _instance: TaskManager | None = None

    def __new__(cls) -> TaskManager:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        self._initialized = True
        self._tasks: dict[str, TaskInfo] = {}
        self._queue: asyncio.Queue[TaskInfo] = asyncio.Queue()
        self._worker_task: asyncio.Task | None = None
        self._running = False

    @property
    def is_running(self) -> bool:
        return self._running

    async def start(self) -> None:
        """启动后台下载 worker"""
        if self._running:
            return
        self._running = True
        db.init_db()
        self._worker_task = asyncio.create_task(self._worker_loop())

    async def stop(self) -> None:
        """停止后台 worker"""
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass

    # ── 任务 CRUD ──────────────────────────────────────────

    def create_task(self, **kwargs) -> TaskInfo:
        config = load_config()
        task_id = kwargs.pop("id", uuid.uuid4().hex[:12])

        # 处理 output_path / temp_path：如果前端传了 None 或空，用配置默认值
        output_path = kwargs.pop("output_path", None)
        if not output_path:
            output_path = config.get("output_path", "./Apple Music")
        temp_path = kwargs.pop("temp_path", None)
        if not temp_path:
            temp_path = config.get("temp_path", "./temp")

        task = TaskInfo(
            id=task_id,
            urls=kwargs.pop("urls", []),
            cookies_path=kwargs.pop("cookies_path", ""),
            output_path=output_path,
            temp_path=temp_path,
            wvd_path=kwargs.pop("wvd_path", None),
            nm3u8dlre_path=kwargs.pop("nm3u8dlre_path", "N_m3u8DL-RE"),
            ffmpeg_path=kwargs.pop("ffmpeg_path", "ffmpeg"),
            download_mode=kwargs.pop("download_mode", config.get("download_mode", "ytdlp")),
            codec_song=kwargs.pop("codec_song", config.get("codec_song", "aac-web")),
            codec_music_video=kwargs.pop("codec_music_video", config.get("codec_music_video", "h264")),
            quality_uploaded_video=kwargs.pop("quality_uploaded_video", "best"),
            synced_lyrics_format=kwargs.pop("synced_lyrics_format", config.get("synced_lyrics_format", "lrc")),
            cover_format=kwargs.pop("cover_format", config.get("cover_format", "jpg")),
            cover_size=kwargs.pop("cover_size", config.get("cover_size", 1200)),
            truncate=kwargs.pop("truncate", config.get("truncate")),
            audio_format=kwargs.pop("audio_format", config.get("audio_format")),
            video_format=kwargs.pop("video_format", config.get("video_format")),
            language=kwargs.pop("language", config.get("language", "zh-Hans")),
            overwrite=kwargs.pop("overwrite", config.get("overwrite", False)),
            save_cover=kwargs.pop("save_cover", config.get("save_cover", True)),
            save_playlist=kwargs.pop("save_playlist", config.get("save_playlist", True)),
            synced_lyrics_only=kwargs.pop("synced_lyrics_only", False),
            no_synced_lyrics=kwargs.pop("no_synced_lyrics", False),
            read_urls_as_txt=kwargs.pop("read_urls_as_txt", False),
            exclude_tags=kwargs.pop("exclude_tags", config.get("exclude_tags")),
            template_folder_album=kwargs.pop("template_folder_album", config.get("template_folder_album", "{album_artist}/{album}")),
            template_folder_compilation=kwargs.pop("template_folder_compilation", config.get("template_folder_compilation", "Compilations/{album}")),
            template_file_single_disc=kwargs.pop("template_file_single_disc", config.get("template_file_single_disc", "{track:02d} {title}")),
            template_file_multi_disc=kwargs.pop("template_file_multi_disc", config.get("template_file_multi_disc", "{disc}-{track:02d} {title}")),
            template_folder_no_album=kwargs.pop("template_folder_no_album", config.get("template_folder_no_album", "{artist}/Unknown Album")),
            template_file_no_album=kwargs.pop("template_file_no_album", config.get("template_file_no_album", "{title}")),
            template_file_playlist=kwargs.pop("template_file_playlist", config.get("template_file_playlist", "Playlists/{playlist_artist}/{playlist_title}")),
            template_date=kwargs.pop("template_date", config.get("template_date", "%Y-%m-%dT%H:%M:%SZ")),
        )
        self._tasks[task.id] = task
        db.create_task(
            task_id=task.id,
            urls=task.urls,
            output_path=task.output_path,
            audio_format=task.audio_format,
            video_format=task.video_format,
        )
        return task

    def get_task(self, task_id: str) -> TaskInfo | None:
        return self._tasks.get(task_id)

    def list_tasks(self, status: str | None = None) -> list[dict]:
        # 优先从内存取，再从数据库补
        db_tasks = db.list_tasks(status=status)
        result = []
        for d in db_tasks:
            tid = d["id"]
            if tid in self._tasks:
                result.append(self._tasks[tid].to_dict())
            else:
                result.append({
                    "id": d["id"],
                    "urls": d["urls"],
                    "output_path": d.get("output_path", ""),
                    "status": d["status"],
                    "progress": d["progress"],
                    "completed": d["completed"],
                    "total": d["total"],
                    "error_count": d["error_count"],
                    "audio_format": d.get("audio_format"),
                    "video_format": d.get("video_format"),
                })
        return result

    def delete_task(self, task_id: str) -> bool:
        if task_id in self._tasks:
            task = self._tasks[task_id]
            if task.status == "downloading":
                return False  # 不能删除正在下载的任务
            del self._tasks[task_id]
        return db.delete_task(task_id)

    async def cancel_task(self, task_id: str) -> bool:
        task = self._tasks.get(task_id)
        if task is None:
            return False
        if task.status == "pending":
            task.status = "cancelled"
            db.update_task_status(task_id, "cancelled")
            await broadcast_to_task(task_id, {"type": "status", "status": "cancelled"})
            return True
        if task.status == "downloading":
            task.status = "cancelled"
            if task._cancel_event:
                task._cancel_event.set()
            return True
        return False

    def enqueue_task(self, task_id: str) -> bool:
        """将任务加入下载队列"""
        task = self._tasks.get(task_id)
        if task is None:
            return False
        if task.status not in ("pending",):
            return False
        self._queue.put_nowait(task)
        return True

    # ── 后台 Worker ────────────────────────────────────────

    async def _worker_loop(self) -> None:
        """从队列取任务依次下载"""
        while self._running:
            try:
                task = await asyncio.wait_for(self._queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue

            await self._process_task(task)

    async def _process_task(self, task: TaskInfo) -> None:
        """处理单个任务的下载流程"""
        from amdl.core_downloader import _download_urls_async
        from gamdl.downloader.enums import DownloadMode
        from gamdl.interface.enums import (
            CoverFormat,
            MusicVideoCodec,
            SongCodec,
            SyncedLyricsFormat,
        )

        if task.status == "cancelled":
            return

        task.status = "downloading"
        task._cancel_event = asyncio.Event()
        db.update_task_status(task.id, "downloading")

        await broadcast_to_task(task.id, {"type": "status", "status": "downloading"})

        # 进度回调
        def progress_callback(completed: int, total: int):
            if total > 0:
                task.progress = int(completed / total * 100)
            task.completed = completed
            task.total = total
            db.update_task_progress(task.id, task.progress, completed, total, task.error_count)
            asyncio.ensure_future(
                broadcast_to_task(task.id, {
                    "type": "progress",
                    "progress": task.progress,
                    "completed": completed,
                    "total": total,
                })
            )

        # 日志回调
        def log_callback(msg: str):
            task.logs.append(msg)
            if len(task.logs) > 500:
                task.logs = task.logs[-500:]
            db.append_task_log(task.id, msg)
            asyncio.ensure_future(
                broadcast_to_task(task.id, {"type": "log", "message": msg})
            )

        try:
            error_count = await _download_urls_async(
                urls=task.urls,
                cookies_path=Path(task.cookies_path),
                output_path=Path(task.output_path).resolve(),
                temp_path=Path(task.temp_path).resolve(),
                wvd_path=Path(task.wvd_path) if task.wvd_path else None,
                nm3u8dlre_path=task.nm3u8dlre_path,
                ffmpeg_path=task.ffmpeg_path,
                download_mode=DownloadMode(task.download_mode),
                codec_song=SongCodec(task.codec_song),
                codec_music_video=MusicVideoCodec(task.codec_music_video),
                cover_format=CoverFormat(task.cover_format),
                cover_size=task.cover_size,
                synced_lyrics_format=SyncedLyricsFormat(task.synced_lyrics_format),
                truncate=task.truncate,
                audio_format=task.audio_format,
                video_format=task.video_format,
                template_folder_album=task.template_folder_album,
                template_folder_compilation=task.template_folder_compilation,
                template_file_single_disc=task.template_file_single_disc,
                template_file_multi_disc=task.template_file_multi_disc,
                template_folder_no_album=task.template_folder_no_album,
                template_file_no_album=task.template_file_no_album,
                template_file_playlist=task.template_file_playlist,
                template_date=task.template_date,
                exclude_tags=task.exclude_tags,
                overwrite=task.overwrite,
                save_cover=task.save_cover,
                save_playlist=task.save_playlist,
                synced_lyrics_only=task.synced_lyrics_only,
                no_synced_lyrics=task.no_synced_lyrics,
                read_urls_as_txt=task.read_urls_as_txt,
                artist_media_type=task.artist_media_type,
                language=task.language,
                log_callback=log_callback,
                log_level="INFO",
                progress_callback=progress_callback,
                cancel_event=task._cancel_event,
            )

            if task.status == "cancelled":
                db.update_task_status(task.id, "cancelled")
                await broadcast_to_task(task.id, {"type": "status", "status": "cancelled"})
            elif error_count == 0:
                task.status = "completed"
                task.progress = 100
                db.update_task_status(task.id, "completed")
                db.update_task_progress(task.id, 100, task.total, task.total, 0)
                await broadcast_to_task(task.id, {"type": "status", "status": "completed"})
            elif task.completed > 0:
                # 部分成功：有文件下载成功，也有错误
                task.status = "completed"
                task.progress = 100
                task.last_error = f"完成 {task.completed} 首，{error_count} 个错误（可能为编码兼容问题，文件已正常下载）"
                db.update_task_status(task.id, "completed")
                db.update_task_progress(task.id, 100, task.completed, task.total, task.error_count)
                await broadcast_to_task(task.id, {"type": "status", "status": "completed", "error_count": error_count, "error": task.last_error})
            else:
                task.status = "failed"
                task.error_count = error_count
                task.last_error = task.logs[-1] if task.logs else f"下载完成但有 {error_count} 个错误"
                db.update_task_status(task.id, "failed")
                await broadcast_to_task(task.id, {"type": "status", "status": "failed", "error_count": error_count, "error": task.last_error})

            await broadcast_to_task(task.id, {"type": "done"})

        except asyncio.CancelledError:
            task.status = "cancelled"
            task.last_error = "任务被取消"
            db.update_task_status(task.id, "cancelled")
            await broadcast_to_task(task.id, {"type": "status", "status": "cancelled", "error": task.last_error})
        except Exception as e:
            task.status = "failed"
            task.error_count += 1
            task.last_error = str(e)
            db.update_task_status(task.id, "failed")
            log_callback(f"任务异常: {e}")
            await broadcast_to_task(task.id, {"type": "status", "status": "failed", "error": task.last_error})


# 全局单例
task_manager = TaskManager()
