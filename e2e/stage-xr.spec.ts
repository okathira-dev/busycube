import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import ts from "typescript";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

test("native immersive support remains unavailable without a device and ordinary clicks cannot solve", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-730");
  const support = await page.evaluate(async () => ({
    vr: navigator.xr
      ? await navigator.xr.isSessionSupported("immersive-vr")
      : false,
    ar: navigator.xr
      ? await navigator.xr.isSessionSupported("immersive-ar")
      : false,
  }));
  expect(support).toEqual({ vr: false, ar: false });
  const box = page.locator(".gift-box");
  await expect(box).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText(
    "No immersive AR or VR device is available.",
  );
  await box.click();
  await page.getByRole("button", { name: "Enter immersive XR" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "No immersive AR or VR device is available.",
  );
  await expect(box).not.toHaveAttribute("data-box-state", "open");
  await expect(page.getByRole("button", { name: "End XR" })).toBeDisabled();
});

test("renders the actual gift geometry and its hover/open states in native WebGL for visual review", async ({
  page,
}, testInfo) => {
  const gift = ts.transpileModule(
    readFileSync("src/stages/S-730/gift.ts", "utf8"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    },
  ).outputText;
  await page.route("**/__xr-preview/*.js", async (route) => {
    const file = new URL(route.request().url()).pathname.split("/").at(-1);
    const body =
      file === "gift.js"
        ? gift
        : file === "three.module.js" || file === "three.core.js"
          ? readFileSync(`node_modules/three/build/${file}`, "utf8")
          : "";
    await route.fulfill({ contentType: "text/javascript", body });
  });
  await page.route("**/__xr-preview/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="en"><head><title>XR gift visual fixture</title><style>body{margin:0;background:#050816}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/__xr-preview/three.module.js"}}</script></head><body><script type="module">
    import {Scene,PerspectiveCamera,WebGLRenderer,AmbientLight,PointLight} from 'three';
    import {createGift} from './gift.js';
    const scene=new Scene(),gift=createGift(),camera=new PerspectiveCamera(45,800/600,.01,20),renderer=new WebGLRenderer({antialias:true});
    renderer.setSize(800,600);renderer.setClearColor(0x050816);document.body.append(renderer.domElement);
    gift.root.visible=true;gift.root.position.set(0,0,-1.5);scene.add(gift.root,new AmbientLight(0xffffff,1.5));
    const light=new PointLight(0xffffff,10,8);light.position.set(.5,1,0);scene.add(light);
    camera.position.set(.8,.65,-.15);camera.lookAt(0,.12,-1.5);const draw=()=>renderer.render(scene,camera);draw();
    window.previewGift={highlight(){gift.setHighlighted(true);draw()},open(){gift.open();gift.setHighlighted(true);for(let i=0;i<60;i++)gift.animate();draw()},dispose(){gift.dispose();renderer.dispose()}};
  </script></body></html>`,
    }),
  );
  await page.goto("/__xr-preview/");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await page.waitForFunction(() => !!Reflect.get(window, "previewGift"));
  await canvas.screenshot({ path: testInfo.outputPath("xr-gift-closed.png") });
  await page.evaluate(() => Reflect.get(window, "previewGift").highlight());
  await canvas.screenshot({
    path: testInfo.outputPath("xr-gift-highlight.png"),
  });
  await page.evaluate(() => Reflect.get(window, "previewGift").open());
  await canvas.screenshot({ path: testInfo.outputPath("xr-gift-open.png") });
  await page.evaluate(() => Reflect.get(window, "previewGift").dispose());
});
