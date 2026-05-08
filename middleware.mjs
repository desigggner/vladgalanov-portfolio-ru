const closedExactPaths = new Set([
  "/404.html",
  "/500.html",
  "/about",
  "/about.html",
  "/admin",
  "/admin.html",
  "/admin/index.html",
  "/auth",
  "/auth.html",
  "/invert",
  "/invert.html",
  "/media",
  "/media.html",
  "/new",
  "/new.html",
  "/old-home",
  "/old-home.html",
  "/portfolio",
  "/portfolio.html",
]);

const closedPathPrefixes = [
  "/about/",
  "/admin/",
  "/api/",
  "/auth/",
  "/errors/",
  "/invert/",
  "/media/",
  "/new/",
  "/old-home/",
  "/portfolio/",
];

function shouldRedirectToHome(pathname) {
  return (
    closedExactPaths.has(pathname) ||
    closedPathPrefixes.some((prefix) => pathname.startsWith(prefix))
  );
}

export default function middleware(request) {
  const url = new URL(request.url);

  if (!shouldRedirectToHome(url.pathname)) {
    return;
  }

  return Response.redirect(new URL("/", request.url), 308);
}
