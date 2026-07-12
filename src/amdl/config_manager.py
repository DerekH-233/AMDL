"""配置持久化管理 —— 读写 ~/.amdl/config.json"""
from __future__ import annotations

import json
from pathlib import Path

CONFIG_DIR = Path.home() / ".amdl"
CONFIG_PATH = CONFIG_DIR / "config.json"

DEFAULT_CONFIG: dict = {
    "cookies_path": "",
    "download_lyrics": True,
    "folder_style": "artist_album",
    "file_name_order": ["track", "title", "artist"],
    "artist_media_type": "all-albums",
    "output_path": str(Path.home() / "Music" / "Apple Music"),
    "temp_path": str(Path.home() / ".amdl" / "temp"),
    "codec_song": "aac-web",
    "codec_music_video": "h264",
    "cover_format": "jpg",
    "cover_size": 1200,
    "synced_lyrics_format": "lrc",
    "download_mode": "ytdlp",
    "audio_format": None,
    "video_format": None,
    "language": "zh-Hans",
    "theme": "dark",
    "save_cover": True,
    "save_playlist": True,
    "overwrite": False,
    "template_folder_album": "{album_artist}/{album}",
    "template_folder_compilation": "Compilations/{album}",
    "template_file_single_disc": "{track:02d} {title}",
    "template_file_multi_disc": "{disc}-{track:02d} {title}",
    "template_folder_no_album": "{artist}/Unknown Album",
    "template_file_no_album": "{title}",
    "template_file_playlist": "Playlists/{playlist_artist}/{playlist_title}",
    "truncate": None,
    "exclude_tags": None,
}


def load_config() -> dict:
    """加载配置，如果文件不存在则返回默认配置。自动修复无效的旧配置值。"""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    if not CONFIG_PATH.exists():
        save_config(DEFAULT_CONFIG)
        return dict(DEFAULT_CONFIG)
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return dict(DEFAULT_CONFIG)

    merged = dict(DEFAULT_CONFIG)
    merged.update(data)

    # 清理无效的旧配置值
    merged = _validate_and_fix(merged)

    return merged


def _validate_and_fix(config: dict) -> dict:
    """检查配置值是否有效，无效则重置为默认值"""
    try:
        from gamdl.interface.enums import SongCodec, MusicVideoCodec, CoverFormat, SyncedLyricsFormat, UploadedVideoQuality
        from gamdl.downloader.enums import DownloadMode
    except ImportError:
        return config

    valid_song_codecs = {c.value for c in SongCodec}
    valid_mv_codecs = {c.value for c in MusicVideoCodec}
    valid_cover = {c.value for c in CoverFormat}
    valid_lyrics = {c.value for c in SyncedLyricsFormat}
    valid_modes = {c.value for c in DownloadMode}

    changed = False

    if config.get("codec_song") not in valid_song_codecs:
        config["codec_song"] = DEFAULT_CONFIG["codec_song"]
        changed = True

    if config.get("codec_music_video") not in valid_mv_codecs:
        config["codec_music_video"] = DEFAULT_CONFIG["codec_music_video"]
        changed = True

    if config.get("cover_format") not in valid_cover:
        config["cover_format"] = DEFAULT_CONFIG["cover_format"]
        changed = True

    if config.get("synced_lyrics_format") not in valid_lyrics:
        config["synced_lyrics_format"] = DEFAULT_CONFIG["synced_lyrics_format"]
        changed = True

    if config.get("download_mode") not in valid_modes:
        config["download_mode"] = DEFAULT_CONFIG["download_mode"]
        changed = True

    if changed:
        save_config(config)

    return config


def save_config(config: dict) -> None:
    """保存配置到文件"""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def get_config_path() -> Path:
    return CONFIG_PATH
