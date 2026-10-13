/**
 * Thin wrapper over the Poki SDK (developers.poki.com). Every call is safe
 * when the SDK is missing (self-hosted build, ad blocker, offline): the game
 * just plays on. Rules enforced here so the game code cannot break them:
 *   - gameplayStart / gameplayStop never fire twice in a row;
 *   - nothing is sent while an ad is running;
 *   - audio is muted for the whole ad.
 */
interface PokiSDKApi {
  init(): Promise<void>;
  gameLoadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  commercialBreak(onStart?: () => void): Promise<void>;
  rewardedBreak(onStart?: () => void): Promise<boolean>;
  setDebug?(on: boolean): void;
}

declare global {
  interface Window { PokiSDK?: PokiSDKApi }
}

export class Poki {
  private sdk: PokiSDKApi | null = null;
  private playing = false;
  adRunning = false;

  async init(): Promise<void> {
    const sdk = window.PokiSDK;
    if (!sdk) return;
    try {
      await sdk.init();
      this.sdk = sdk;
    } catch {
      // Ad blocker etc.: Poki asks that the game still runs.
      this.sdk = sdk;
    }
  }

  get available(): boolean { return this.sdk !== null; }

  loadingFinished(): void {
    try { this.sdk?.gameLoadingFinished(); } catch { /* ignore */ }
  }

  gameplayStart(): void {
    if (this.playing || this.adRunning) return;
    this.playing = true;
    try { this.sdk?.gameplayStart(); } catch { /* ignore */ }
  }

  gameplayStop(): void {
    if (!this.playing || this.adRunning) return;
    this.playing = false;
    try { this.sdk?.gameplayStop(); } catch { /* ignore */ }
  }

  /** Interstitial at a natural break (before a new run). Poki decides if one actually plays. */
  async commercialBreak(mute: (on: boolean) => void): Promise<void> {
    if (!this.sdk || this.adRunning) return;
    this.gameplayStop();
    this.adRunning = true;
    try {
      await this.sdk.commercialBreak(() => mute(true));
    } catch { /* ignore */ }
    this.adRunning = false;
    mute(false);
  }

  /**
   * Opt-in rewarded ad. Without the SDK (self-hosted / dev) the reward is
   * granted directly so the flow can be tested.
   */
  async rewardedBreak(mute: (on: boolean) => void): Promise<boolean> {
    if (this.adRunning) return false;
    if (!this.sdk) return true;
    this.gameplayStop();
    this.adRunning = true;
    let ok = false;
    try {
      ok = await this.sdk.rewardedBreak(() => mute(true));
    } catch { ok = false; }
    this.adRunning = false;
    mute(false);
    return ok;
  }
}
