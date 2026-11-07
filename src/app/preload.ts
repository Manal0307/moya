import { isCutout, previewImage, products, renderSrc } from "./data/products";

/**
 * Loads everything the home page needs before the opening screen lifts, and
 * reports real progress (0 to 1), weighted by each item's approximate size.
 *
 * Items: web fonts, the three.js modules used by Model3D (same specifiers, so
 * Model3D reuses them from the module cache), the Catstar display mesh
 * (streamed, so progress moves byte by byte) and the home images. Everything
 * lands in the browser cache, so the page renders without waiting.
 * Failures count as done: the site must never stay stuck behind the loader.
 */
export async function preloadHome(onProgress: (fraction: number) => void) {
  const done = new Map<string, number>(); // id -> loaded weight
  const weights = new Map<string, number>(); // id -> total weight
  const report = () => {
    let total = 0;
    let got = 0;
    weights.forEach((w, id) => {
      total += w;
      got += Math.min(w, done.get(id) ?? 0);
    });
    onProgress(total ? got / total : 1);
  };
  const task = (id: string, weight: number, run: (tick: (w: number) => void) => Promise<unknown>) => {
    weights.set(id, weight);
    // Wrapped so even a synchronous throw becomes a settled task.
    return Promise.resolve()
      .then(() =>
        run((w) => {
          done.set(id, w);
          report();
        }),
      )
      .catch(() => {})
      .finally(() => {
        done.set(id, weight);
        report();
      });
  };
  const image = (src: string) =>
    new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = img.onerror = () => resolve();
      img.src = src;
    }).then(() => undefined);

  const cards = products
    .filter((p) => isCutout(p) && p.id !== "catstar-test")
    .slice(0, 4)
    .map((p) => previewImage(p, 480));

  const jobs = [
    task("fonts", 50, () => document.fonts.ready),
    task("three", 180, () =>
      Promise.all([
        import("three"),
        import("three/examples/jsm/utils/BufferGeometryUtils.js"),
      ]),
    ),
    task("mesh", 300, async (tick) => {
      const response = await fetch("/models/catstar.mesh");
      const size = Number(response.headers.get("content-length")) || 0;
      const reader = response.body?.getReader();
      if (!reader || !size) return response.arrayBuffer();
      let received = 0;
      for (;;) {
        const { done: end, value } = await reader.read();
        if (end) break;
        received += value.length;
        tick((received / size) * 300);
      }
    }),
    task("poster", 40, () => image(renderSrc("catstar", 1200))),
    task("logo", 10, () => image("/logo.png")), // nav and footer logo
    ...cards.map((src, i) => task(`card-${i}`, 12, () => image(src))),
  ];
  report();
  await Promise.all(jobs);
}
