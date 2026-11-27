export interface AssetEntryMeta {
  path: string;
  width: number;
  height: number;
  frames?: number;
  fps?: number;
}

export interface LoadedAsset {
  key: string;
  meta: AssetEntryMeta;
  image: HTMLImageElement;
  frameWidth: number;
  frameHeight: number;
}

interface ManifestFile {
  version: number;
  assets: Record<string, AssetEntryMeta>;
}

class AssetLoader {
  private loaded = new Map<string, LoadedAsset>();
  private totalCount = 0;
  private isLoading = false;
  private hasLoaded = false;

  async loadAssets(): Promise<void> {
    if (this.isLoading || this.hasLoaded) return;
    this.isLoading = true;

    try {
      const res = await fetch('./assets/manifest.json');
      if (!res.ok) {
        this.hasLoaded = true;
        return;
      }

      const manifest = (await res.json()) as ManifestFile;
      const entries = Object.entries(manifest.assets ?? {});
      this.totalCount = entries.length;

      await Promise.all(
        entries.map(([key, meta]) => this.tryLoadImage(key, meta)),
      );
    } catch {
      // Fallback silently to procedural canvas placeholders when manifest/assets are absent.
    } finally {
      this.isLoading = false;
      this.hasLoaded = true;
    }
  }

  private tryLoadImage(key: string, meta: AssetEntryMeta): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Ignore empty/broken loads or HTML fallback pages
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const frames = Math.max(1, meta.frames ?? 1);
          const inferredFrameWidth =
            img.naturalWidth > meta.width && frames > 1
              ? Math.floor(img.naturalWidth / frames)
              : img.naturalWidth;
          this.loaded.set(key, {
            key,
            meta,
            image: img,
            frameWidth: inferredFrameWidth,
            frameHeight: img.naturalHeight,
          });
        }
        resolve();
      };
      img.onerror = () => {
        // Expected when user hasn't dropped in Google Flow assets yet
        resolve();
      };
      img.src = `./${meta.path.replace(/^\/+/, '')}`;
    });
  }

  getAsset(key: string): LoadedAsset | undefined {
    return this.loaded.get(key);
  }

  getAssetStats(): { total: number; loaded: number } {
    return {
      total: this.totalCount,
      loaded: this.loaded.size,
    };
  }

  /**
   * Draws an asset centered on (cx, cy) if loaded. Returns true if drawn.
   */
  drawSprite(
    ctx: CanvasRenderingContext2D,
    key: string,
    cx: number,
    cy: number,
    drawWidth: number,
    drawHeight: number,
    timeSec: number,
    flipX = false,
  ): boolean {
    const asset = this.loaded.get(key);
    if (!asset) return false;

    const frames = Math.max(1, asset.meta.frames ?? 1);
    const fps = asset.meta.fps ?? 8;
    const isSheet = frames > 1 && asset.image.naturalWidth >= asset.frameWidth * frames;
    const frameIndex = isSheet ? Math.floor(timeSec * fps) % frames : 0;
    const sx = frameIndex * asset.frameWidth;

    ctx.save();
    ctx.translate(cx, cy);
    if (flipX) {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      asset.image,
      sx,
      0,
      asset.frameWidth,
      asset.frameHeight,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight,
    );
    ctx.restore();
    return true;
  }
}

export const assetLoader = new AssetLoader();
