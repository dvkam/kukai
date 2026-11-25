import { ElementRef } from '@angular/core';
import { AppComponent } from '../../../app.component';
import { AssetComponent } from './asset.component';

describe('3D collectible renderer', () => {
  let component: AssetComponent;
  let webgl: boolean;

  beforeEach(() => {
    webgl = AppComponent.hasWebGL;
    component = new AssetComponent(new ElementRef(document.createElement('div')), null, null);
  });

  afterEach(() => (AppComponent.hasWebGL = webgl));

  it('keeps a model on the fallback path when WebGL is unavailable', () => {
    AppComponent.hasWebGL = false;
    component.mimeType = 'model/gltf-binary';
    component.setSrc({ uri: 'https://example.test/collectible.glb' });
    expect(component.display).toBe(component.Display.image);
    expect(component.preSrc).toBe(component.unknownUrl);
  });

  it('registers the viewer on demand for a model and keeps its controls available', async () => {
    AppComponent.hasWebGL = true;
    component.mimeType = 'model/gltf-binary';
    component.updateDisplay();
    await customElements.whenDefined('model-viewer');
    expect(component.display).toBe(component.Display.threeD);
    const viewer = document.createElement('model-viewer');
    expect('cameraControls' in viewer).toBeTrue();
    expect('ar' in viewer).toBeTrue();
  });
});
