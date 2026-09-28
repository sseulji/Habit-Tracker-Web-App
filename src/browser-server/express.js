// Just enough of Express's Router for server/routes.js to run in the browser-only build.

function compile(path) {
  const keys = [];
  const pattern = path.replace(/:(\w+)/g, (_, key) => {
    keys.push(key);
    return '([^/]+)';
  });
  return { keys, regex: new RegExp(`^${pattern}$`) };
}

export function Router() {
  const layers = [];

  const add = (method) => (path, ...fns) => {
    if (typeof path === 'function') {
      fns = [path, ...fns];
      path = null;
    }
    const route = path ? compile(path) : null;
    for (const fn of fns) layers.push({ method, route, fn });
  };

  const router = {
    get: add('GET'),
    post: add('POST'),
    patch: add('PATCH'),
    delete: add('DELETE'),
    use: add(null),

    // Runs the matching handlers in order, like Express: error handlers take four arguments.
    async handle(req, res) {
      let error = null;
      for (const { method, route, fn } of layers) {
        if (res.finished) break;
        const isErrorHandler = fn.length === 4;
        if (Boolean(error) !== isErrorHandler) continue;
        if (method && method !== req.method) continue;
        if (route) {
          const match = route.regex.exec(req.path);
          if (!match) continue;
          req.params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(match[i + 1])]));
        }
        let passed = false;
        const next = (err) => {
          passed = true;
          if (err) error = err;
        };
        try {
          await (error ? fn(error, req, res, next) : fn(req, res, next));
        } catch (err) {
          error = err;
          continue;
        }
        if (!passed && !error) break;
      }
    },
  };
  return router;
}

export default { Router };
