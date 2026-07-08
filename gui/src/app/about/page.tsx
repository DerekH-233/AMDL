
export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">关于 AMDL</h1>
      <p className="text-zinc-400 mb-8">Apple Music Downloader v3.0.0</p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">项目信息</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">版本</span>
            <span className="text-white font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">后端</span>
            <span className="text-white">FastAPI + gamdl</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">前端</span>
            <span className="text-white">Next.js + TypeScript + Tailwind</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">桌面壳</span>
            <span className="text-white">pywebview</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">平台</span>
            <span className="text-white">Windows</span>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">鸣谢</h2>
        <p className="text-sm text-zinc-400 mb-3">
          本项目基于以下开源项目构建：
        </p>
        <ul className="space-y-2 text-sm">
          <li>
            <a
              href="https://github.com/glomatico/gamdl"
              className="text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              glomatico/gamdl
            </a>
            <span className="text-zinc-500"> — Apple Music 下载引擎</span>
          </li>
          <li>
            <a
              href="https://github.com/yt-dlp/yt-dlp"
              className="text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              yt-dlp/yt-dlp
            </a>
            <span className="text-zinc-500"> — 通用视频下载器</span>
          </li>
          <li>
            <a
              href="https://github.com/wenfeng110402/AppleMusic-Downloader"
              className="text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              wenfeng110402/AppleMusic-Downloader
            </a>
            <span className="text-zinc-500"> — 项目灵感来源</span>
          </li>
        </ul>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-3">免责声明</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          本工具仅供教育和研究目的使用。使用本工具需要有效的 Apple Music
          订阅。下载的内容仅供个人使用，请尊重版权。使用者需自行承担使用风险。
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-6 text-sm text-zinc-500">
        <a
          href="https://github.com/DerekH-233/AMDL"
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
          DerekH-233/AMDL
        </a>
        <span className="flex items-center gap-1 text-zinc-500">
          Forked from wenfeng110402
        </span>
      </div>
    </div>
  );
}
