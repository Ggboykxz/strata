/**
 * Babylon capsule render. The headless variant uses NullEngine, which master §6 permits in tooling/CI;
 * NullEngine is never imported by the server tick. Both variants build the same capsule mesh so the
 * assert harness proves the client can actually render the tracer state.
 */
import { NullEngine, Scene, FreeCamera, MeshBuilder, Vector3 } from '@babylonjs/core';
import { TRACER_SCALE } from '@strata/core';
import type { RenderPosition } from './tracer-client';

export interface RenderResult {
  readonly meshes: number;
  readonly x: number;
  readonly z: number;
}

export function buildCapsule(scene: Scene, pos: RenderPosition) {
  new FreeCamera('tracer-camera', new Vector3(0, 0, -5), scene);
  const capsule = MeshBuilder.CreateCapsule('capsule', { height: 2, radius: 0.5 }, scene);
  capsule.position.set(pos.x / TRACER_SCALE, 0, pos.z / TRACER_SCALE);
  return capsule;
}

/** Tooling/CI only: constructs and renders the scene without a GPU. */
export function renderCapsuleNull(pos: RenderPosition): RenderResult {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const capsule = buildCapsule(scene, pos);
    scene.render();
    return { meshes: scene.meshes.length, x: capsule.position.x, z: capsule.position.z };
  } finally {
    engine.dispose();
  }
}
