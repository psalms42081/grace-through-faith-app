export interface SceneIllustrationState {
  imageUrl: string | null;
  loading: boolean;
  failed: boolean;
}

interface GenerateImageResponse {
  imageUrl?: string | null;
}

const inFlightSceneImageRequests = new Map<string, Promise<GenerateImageResponse>>();

function getSharedSceneImageRequest(
  sceneId: string,
  requestImage: (sceneId: string) => Promise<GenerateImageResponse>,
) {
  const existing = inFlightSceneImageRequests.get(sceneId);
  if (existing) return existing;

  let resolveRequest!: (value: GenerateImageResponse | PromiseLike<GenerateImageResponse>) => void;
  let rejectRequest!: (reason?: unknown) => void;
  const promise = new Promise<GenerateImageResponse>((resolve, reject) => {
    resolveRequest = resolve;
    rejectRequest = reject;
  });
  inFlightSceneImageRequests.set(sceneId, promise);

  const clear = () => {
    if (inFlightSceneImageRequests.get(sceneId) === promise) {
      inFlightSceneImageRequests.delete(sceneId);
    }
  };
  void promise.then(clear, clear);

  try {
    void requestImage(sceneId).then(resolveRequest, rejectRequest);
  } catch (error) {
    rejectRequest(error);
  }

  return promise;
}

export interface SceneIllustrationRequestControllerOptions {
  baseUrl: string;
  requestImage: (sceneId: string) => Promise<GenerateImageResponse>;
  onStateChange: (state: SceneIllustrationState) => void;
  onImageLoaded?: (url: string) => void;
}

export interface SceneIllustrationRequestController {
  start(sceneId: string, isVisible: boolean): boolean;
  invalidate(): void;
  updateOnImageLoaded(callback: ((url: string) => void) | undefined): void;
  getState(): SceneIllustrationState;
}

/**
 * Keeps an illustration request authoritative only while its scene remains
 * visible. The controller deliberately has no React dependency so its async
 * behavior can be regression tested without rendering a screen.
 */
export function createSceneIllustrationRequestController(
  options: SceneIllustrationRequestControllerOptions,
): SceneIllustrationRequestController {
  let requestVersion = 0;
  let activeRequest: { version: number; sceneId: string } | null = null;
  let completedSceneId: string | null = null;
  let failedSceneId: string | null = null;
  let onImageLoaded = options.onImageLoaded;
  let state: SceneIllustrationState = {
    imageUrl: null,
    loading: false,
    failed: false,
  };

  const publish = (nextState: SceneIllustrationState) => {
    state = nextState;
    options.onStateChange(state);
  };

  const isActive = (version: number, sceneId: string) =>
    activeRequest?.version === version && activeRequest.sceneId === sceneId;

  const invalidate = () => {
    if (activeRequest) {
      requestVersion += 1;
      activeRequest = null;
    }
  };

  const start = (sceneId: string, isVisible: boolean) => {
    if (!isVisible || !sceneId) {
      invalidate();
      return false;
    }

    if (
      completedSceneId === sceneId ||
      failedSceneId === sceneId ||
      activeRequest?.sceneId === sceneId
    ) {
      return false;
    }

    const version = ++requestVersion;
    activeRequest = { version, sceneId };
    publish({ imageUrl: null, loading: true, failed: false });

    void getSharedSceneImageRequest(sceneId, options.requestImage)
      .then((data) => {
        if (!isActive(version, sceneId)) return;

        activeRequest = null;
        if (data.imageUrl) {
          const fullUrl = `${options.baseUrl}${data.imageUrl}`;
          completedSceneId = sceneId;
          publish({ imageUrl: fullUrl, loading: false, failed: false });
          onImageLoaded?.(fullUrl);
          return;
        }

        failedSceneId = sceneId;
        publish({ imageUrl: null, loading: false, failed: true });
      })
      .catch(() => {
        if (!isActive(version, sceneId)) return;

        activeRequest = null;
        failedSceneId = sceneId;
        publish({ imageUrl: null, loading: false, failed: true });
      });

    return true;
  };

  return {
    start,
    invalidate,
    updateOnImageLoaded(callback) {
      onImageLoaded = callback;
    },
    getState() {
      return state;
    },
  };
}