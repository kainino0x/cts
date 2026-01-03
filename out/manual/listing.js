// AUTO-GENERATED - DO NOT EDIT. See src/common/tools/gen_listings_and_webworkers.ts.

export const listing = [
  {
    "file": [],
    "readme": "WebGPU tests that require manual intervention.\n\nMany of these test may be HTML pages rather than using the harness.\n\nAdd informal notes here on possible stress tests.\n\n- Suspending or hibernating the machine.\n- Manually crashing or relaunching the browser's GPU process.\n- Triggering a GPU driver reset (TDR).\n- Forcibly or gracefully unplugging an external GPU.\n- Forcibly switching between GPUs using OS/driver settings.\n- Backgrounding the browser (on mobile OSes).\n- Moving windows between displays attached to different hardware adapters.\n- Moving windows between displays with different color properties (HDR/WCG).\n- Unplugging a laptop.\n- Switching between canvas and XR device output.\n\nTODO: look at dEQP (OpenGL ES and Vulkan) and WebGL for inspiration here."
  }
];
