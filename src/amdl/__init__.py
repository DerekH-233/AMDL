__version__ = "1.0.6"

# Monkey-patch MozillaCookieJar — 强制 UTF-8 读 cookies，修复中文 Windows GBK 崩溃
import http.cookiejar as _cookiejar
_real_load = _cookiejar.MozillaCookieJar._really_load
def _patched_load(self, f, *args, **kwargs):
    if isinstance(f, str):
        f = open(f, "r", encoding="utf-8")
    return _real_load(self, f, *args, **kwargs)
_cookiejar.MozillaCookieJar._really_load = _patched_load
