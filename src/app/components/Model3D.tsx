import { useEffect, useRef, useState } from "react";

/**
 * Real-time 3D view of a charm with three.js.
 *
 * It loads a reduced display mesh (scripts/make-display-mesh.py), never the
 * STL being sold. three.js is imported on demand, so it only downloads on the
 * page that shows the model; the poster image stays up until the first frame.
 *
 * Idles with a slow spin, drag to turn it with inertia, leans towards the
 * cursor. Pauses off-screen and in background tabs; reduced motion stops the
 * idle spin. Falls back to the poster if WebGL is unavailable.
 */
export function Model3D({
  src,
  poster,
  label,
}: {
  src: string;
  poster: string;
  label: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current!;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { mergeVertices, toCreasedNormals } = await import(
        "three/examples/jsm/utils/BufferGeometryUtils.js"
      );
      const buffer = await fetch(src).then((r) => {
        if (!r.ok) throw new Error(`Model ${r.status}`);
        return r.arrayBuffer();
      });
      if (disposed) return;

      // ---- Decode the display mesh (see make-display-mesh.py for the format).
      const view = new DataView(buffer);
      const vCount = view.getUint32(4, true);
      const tCount = view.getUint32(8, true);
      const min = [0, 1, 2].map((k) => view.getFloat32(12 + k * 4, true));
      const max = [0, 1, 2].map((k) => view.getFloat32(24 + k * 4, true));
      const q = new Uint16Array(buffer, 36, vCount * 3);
      const indexOffset = 36 + vCount * 6;
      const indices = new Uint32Array(buffer.slice(indexOffset, indexOffset + tCount * 12));
      const positions = new Float32Array(vCount * 3);
      for (let i = 0; i < vCount; i++) {
        for (let k = 0; k < 3; k++) {
          positions[i * 3 + k] = min[k] + (q[i * 3 + k] / 65535) * (max[k] - min[k]);
        }
      }
      let geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      geometry = mergeVertices(geometry);
      // Smooth across gentle curves, but keep sharp edges (eye rims, tear
      // lines, the nose) crisp instead of averaging the light across them.
      geometry = toCreasedNormals(geometry, (32 * Math.PI) / 180);
      // STL is Z-up with the face looking down -Y; three.js is Y-up facing +Z.
      geometry.rotateX(-Math.PI / 2);
      geometry.center();
      geometry.computeBoundingSphere();
      const radius = geometry.boundingSphere!.radius;

      // ---- Scene
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      } catch {
        return; // No WebGL: the poster stays.
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const canvas = renderer.domElement;
      canvas.className = "model3d-canvas";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", `${label}. Drag to rotate.`);
      host.appendChild(canvas);

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(28, 1, radius * 0.1, radius * 20);
      camera.position.set(0, radius * 0.18, radius * 4.4);
      camera.lookAt(0, 0, 0);

      // The same shading as scripts/render-stl-smooth.py, so the live model
      // matches the still renders: matte white, soft key from the upper left,
      // fill and rim lights, and a faint satin highlight. Lights are fixed to
      // the camera, as in the script; the model turns underneath them.
      const material = new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vNormal;
          const vec3 BASE = vec3(247.0, 245.0, 244.0) / 255.0;
          const vec3 KEY = normalize(vec3(-0.45, 0.6, 0.66));
          const vec3 FILL = normalize(vec3(0.7, 0.1, 0.5));
          const vec3 RIM = normalize(vec3(0.2, -0.9, -0.3));
          void main() {
            vec3 n = normalize(vNormal);
            if (n.z < 0.0) n = -n;
            vec3 halfway = normalize(KEY + vec3(0.0, 0.0, 1.0));
            float light = 0.52
              + 0.44 * max(dot(n, KEY), 0.0)
              + 0.12 * max(dot(n, FILL), 0.0)
              + 0.08 * max(dot(n, RIM), 0.0);
            float spec = pow(max(dot(n, halfway), 0.0), 40.0);
            gl_FragColor = vec4(min(BASE * light + 0.16 * spec, 1.0), 1.0);
          }
        `,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const pivot = new THREE.Group(); // spin
      const lean = new THREE.Group(); // cursor tilt
      pivot.add(mesh);
      lean.add(pivot);
      scene.add(lean);

      const resize = () => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(host);
      resize();

      // ---- Motion: angles in radians, speeds in radians per millisecond.
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const IDLE = reduce ? 0 : (Math.PI * 2) / 10000; // one turn every 10 s
      // Arrival: exactly one eased turn that lands facing the viewer.
      const INTRO = reduce ? 0 : 1800;
      let introStart = 0;
      let angle = 0;
      let vel = IDLE;
      let dragging = false;
      let lastX = 0;
      let lastT = 0;
      let tx = 0, ty = 0;
      let visible = true;
      let raf = 0;
      let prev = 0;

      const frame = (now: number) => {
        raf = 0;
        if (disposed || !visible || document.hidden) return;
        const dt = prev ? Math.min(40, now - prev) : 16;
        prev = now;
        if (!introStart) introStart = now;
        const intro = (now - introStart) / INTRO;
        if (INTRO && intro < 1 && !dragging) {
          angle = -Math.PI * 2 * Math.pow(1 - intro, 3);
        } else if (!dragging) {
          angle += vel * dt;
          vel += (Math.sign(vel || 1) * IDLE - vel) * Math.min(1, dt * 0.0018);
        }
        pivot.rotation.y = angle;
        lean.rotation.x += (ty - lean.rotation.x) * Math.min(1, dt * 0.005);
        lean.rotation.z += (-tx * 0.4 - lean.rotation.z) * Math.min(1, dt * 0.005);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      };
      const start = () => {
        if (!raf && !disposed) {
          prev = 0;
          raf = requestAnimationFrame(frame);
        }
      };

      const onDown = (e: PointerEvent) => {
        introStart = -1e9; // a grab ends the arrival spin
        dragging = true;
        lastX = e.clientX;
        lastT = e.timeStamp;
        vel = 0;
        canvas.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        if (!reduce) {
          tx = ((e.clientX - r.left) / r.width - 0.5) * 0.35;
          ty = ((e.clientY - r.top) / r.height - 0.5) * 0.3;
        }
        if (!dragging) return;
        const step = ((e.clientX - lastX) / r.width) * Math.PI * 2;
        angle += step;
        vel = step / Math.max(1, e.timeStamp - lastT);
        lastX = e.clientX;
        lastT = e.timeStamp;
      };
      const onUp = (e: PointerEvent) => {
        dragging = false;
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      };
      const onLeave = () => {
        tx = 0;
        ty = 0;
      };
      canvas.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointerleave", onLeave);

      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        start();
      });
      io.observe(host);
      const onVisibility = () => start();
      document.addEventListener("visibilitychange", onVisibility);

      renderer.render(scene, camera);
      setReady(true);
      start();

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        canvas.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointerleave", onLeave);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        canvas.remove();
      };
    })().catch(() => {
      /* Keep the poster if three.js or the mesh fails to load. */
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [src, label]);

  return (
    <div className={`model3d ${ready ? "is-ready" : ""}`}>
      <span className="model3d-shadow" aria-hidden="true" />
      <img className="model3d-poster" src={poster} alt="" aria-hidden="true" />
      <div className="model3d-stage" ref={hostRef} />
    </div>
  );
}
