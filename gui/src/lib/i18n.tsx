'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type Lang = 'zh' | 'en';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslationValue = string | ((...args: any[]) => string);
const translations: Record<Lang, Record<string, TranslationValue>> = {
  zh: {
    app_name: 'AMDL',
    download: '下载',
    tasks: '任务',
    history: '历史',
    settings: '设置',
    about: '关于',
    download_title: '下载 Apple Music',
    download_desc: '支持歌曲、专辑、播放列表、音乐视频 — 粘贴链接即可下载',
    url_label: 'Apple Music 链接',
    url_placeholder: '粘贴 Apple Music 链接，每行一个：',
    url_count: (n: number) => `已输入 ${n} 个链接`,
    url_hint: '支持歌曲、专辑、播放列表、MV 链接',
    playlist_detected: '检测到歌单 — 将以歌单名建文件夹',
    cookies_label: 'Cookies 文件',
    cookies_placeholder: 'cookies.txt 文件路径...',
    cookies_browse: '浏览...',
    cookies_check: '检测',
    cookies_checking: '检测中...',
    cookies_valid: 'cookies 有效',
    cookies_invalid: 'cookies 无效',
    cookies_hint: '导出浏览器 cookies 为 Netscape 格式，或直接输入路径。建议先点击「检测」验证有效性。',
    output_label: '保存路径',
    output_hint: '下载文件的保存目录，可填写相对路径或绝对路径',
    download_btn: '开始下载',
    downloading_btn: '正在创建任务...',
    please_select_cookies: '请先选择 cookies.txt 文件',
    no_tasks: '暂无下载任务',
    no_tasks_hint: '去下载页面创建新任务',
    task_list: '下载任务',
    task_list_desc: '查看和管理当前下载任务',
    refresh: '刷新',
    loading: '加载中...',
    pending: '等待中',
    downloading: '下载中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
    cancel: '取消',
    delete: '删除',
    progress: '下载进度',
    songs: '首',
    done_songs: '首下载完成',
    errors: '个错误',
    skipped: '项跳过',
    view_logs: '查看日志',
    hide_logs: '收起日志',
    no_logs: '暂无日志',
    history_title: '下载历史',
    history_desc: '查看过往下载记录',
    no_history: '暂无下载历史',
    no_history_hint: '完成的下载任务会自动出现在这里',
    clear_history: '清空历史',
    settings_title: '设置',
    settings_desc: '自定义下载行为和外观',
    save_settings: '保存设置',
    saving: '保存中...',
    saved: '已保存',
    reset: '恢复默认',
    backend_service: '后端服务',
    api_address: 'API 地址',
    connect: '连接',
    download_settings: '下载设置',
    download_dir: '下载目录',
    temp_dir: '临时目录',
    audio_codec: '音频编码',
    video_codec: '音乐视频编码',
    convert_format: '转换格式',
    lyrics_format: '同步歌词格式',
    cover_size: '封面尺寸',
    download_lyrics_label: '同时下载歌词（LRC）',
    download_lyrics_desc: '关闭可减少资源占用',
    save_cover_label: '保存封面图片',
    save_playlist_label: '保存播放列表文件',
    overwrite_label: '覆盖已有文件',
    cleanup_section: '清理',
    cleanup_temp: '清除临时文件',
    cleanup_history: '清空下载列表',
    cleanup_output: '清空已下载文件',
    cleanup_done: (n: number) => `已清理 ${n} 个临时文件`,
    cleanup_output_done: (n: number, m: number) => `已清理 ${n} 个临时文件，${m} 个下载文件`,
    about_title: '关于 AMDL',
    update_section: '更新',
    check_update: '检查更新',
    checking: '检查中...',
    up_to_date: (v: string) => `已是最新版本 v${v}`,
    new_version: (l: string, c: string) => `发现新版本 v${l}（当前 v${c}）`,
    go_download: '前往下载',
    check_failed: '检查失败，请检查网络连接',
    project_info: '项目信息',
    version: '版本',
    backend: '后端',
    frontend: '前端',
    desktop_shell: '桌面壳',
    platform: '平台',
    acknowledgments: '鸣谢',
    ack_desc: '本项目基于以下开源项目构建：',
    ack_gamdl: 'Apple Music 下载引擎',
    ack_ytdlp: '通用视频下载器',
    ack_wenfeng: '项目灵感来源',
    disclaimer: '免责声明',
    disclaimer_text: '本工具仅供教育和研究目的使用。使用本工具需要有效的 Apple Music 订阅。下载的内容仅供个人使用，请尊重版权。使用者需自行承担使用风险。',
    task_created: (id: string) => `任务已创建: ${id}`,
    download_failed: '下载请求失败',
    region_prefix: '地区: ',
    supported_links: '支持的链接类型',
    song: '歌曲',
    album: '专辑',
    playlist: '播放列表',
    music_video: '音乐视频',
    go_to_tasks: '前往任务页查看进度 →',
    keep_original: '不转换（保持原始格式）',
  },
  en: {
    app_name: 'AMDL',
    download: 'Download',
    tasks: 'Tasks',
    history: 'History',
    settings: 'Settings',
    about: 'About',
    download_title: 'Download Apple Music',
    download_desc: 'Songs, albums, playlists, music videos — paste links to download',
    url_label: 'Apple Music Links',
    url_placeholder: 'Paste Apple Music links, one per line:',
    url_count: (n: number) => `${n} link(s) entered`,
    url_hint: 'Supports songs, albums, playlists, MV links',
    playlist_detected: 'Playlist detected — will use playlist name as folder',
    cookies_label: 'Cookies File',
    cookies_placeholder: 'cookies.txt path...',
    cookies_browse: 'Browse...',
    cookies_check: 'Check',
    cookies_checking: 'Checking...',
    cookies_valid: 'cookies valid',
    cookies_invalid: 'cookies invalid',
    cookies_hint: 'Export browser cookies in Netscape format, or enter path directly. Click "Check" to verify.',
    output_label: 'Save Path',
    output_hint: 'Download output directory (relative or absolute path)',
    download_btn: 'Download',
    downloading_btn: 'Creating task...',
    please_select_cookies: 'Please select cookies.txt first',
    no_tasks: 'No download tasks',
    no_tasks_hint: 'Go to download page to create a new task',
    task_list: 'Download Tasks',
    task_list_desc: 'View and manage download tasks',
    refresh: 'Refresh',
    loading: 'Loading...',
    pending: 'Pending',
    downloading: 'Downloading',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    cancel: 'Cancel',
    delete: 'Delete',
    progress: 'Progress',
    songs: 'songs',
    done_songs: 'songs downloaded',
    errors: 'errors',
    skipped: 'skipped',
    view_logs: 'View Logs',
    hide_logs: 'Hide Logs',
    no_logs: 'No logs',
    history_title: 'Download History',
    history_desc: 'View past downloads',
    no_history: 'No history',
    no_history_hint: 'Completed downloads will appear here',
    clear_history: 'Clear History',
    settings_title: 'Settings',
    settings_desc: 'Customize download behavior and appearance',
    save_settings: 'Save Settings',
    saving: 'Saving...',
    saved: 'Saved',
    reset: 'Reset Defaults',
    backend_service: 'Backend Service',
    api_address: 'API Address',
    connect: 'Connect',
    download_settings: 'Download Settings',
    download_dir: 'Download Directory',
    temp_dir: 'Temp Directory',
    audio_codec: 'Audio Codec',
    video_codec: 'Video Codec',
    convert_format: 'Convert Format',
    lyrics_format: 'Lyrics Format',
    cover_size: 'Cover Size',
    download_lyrics_label: 'Download synced lyrics (LRC)',
    download_lyrics_desc: 'Turn off to reduce resource usage',
    save_cover_label: 'Save cover image',
    save_playlist_label: 'Save playlist file',
    overwrite_label: 'Overwrite existing files',
    cleanup_section: 'Cleanup',
    cleanup_temp: 'Clear temp files',
    cleanup_history: 'Clear download list',
    cleanup_output: 'Clear downloaded files',
    cleanup_done: (n: number) => `Cleaned ${n} temp files`,
    cleanup_output_done: (n: number, m: number) => `Cleaned ${n} temp files, ${m} downloaded files`,
    about_title: 'About AMDL',
    update_section: 'Update',
    check_update: 'Check for Updates',
    checking: 'Checking...',
    up_to_date: (v: string) => `Up to date v${v}`,
    new_version: (l: string, c: string) => `New version v${l} available (current v${c})`,
    go_download: 'Download',
    check_failed: 'Check failed, please verify network connection',
    project_info: 'Project Info',
    version: 'Version',
    backend: 'Backend',
    frontend: 'Frontend',
    desktop_shell: 'Desktop Shell',
    platform: 'Platform',
    acknowledgments: 'Acknowledgments',
    ack_desc: 'Built upon the following open source projects:',
    ack_gamdl: 'Apple Music download engine',
    ack_ytdlp: 'Universal video downloader',
    ack_wenfeng: 'Project inspiration',
    disclaimer: 'Disclaimer',
    disclaimer_text: 'This tool is for educational and research purposes only. Requires valid Apple Music subscription. Downloaded content is for personal use only. Respect copyright. Use at your own risk.',
    task_created: (id: string) => `Task created: ${id}`,
    download_failed: 'Download request failed',
    region_prefix: 'Region: ',
    supported_links: 'Supported Link Types',
    song: 'Song',
    album: 'Album',
    playlist: 'Playlist',
    music_video: 'Music Video',
    go_to_tasks: 'Go to Tasks →',
    keep_original: 'Keep original format',
  },
};

// Language context
interface I18nContextType {
  lang: Lang;
  t: (key: string, ...args: (string | number)[]) => string;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'zh',
  t: (key: string) => key,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('amdl_lang') as Lang) || 'zh';
    }
    return 'zh';
  });

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('amdl_lang', newLang);
  }, []);

  const t = useCallback((key: string, ...args: (string | number)[]) => {
    const val = translations[lang]?.[key];
    if (typeof val === 'function') {
      return (val as (...a: (string | number)[]) => string)(...args);
    }
    return val ?? translations['zh']?.[key] ?? key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export { translations };
