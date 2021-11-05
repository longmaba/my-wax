export class WaxEventSource {
  constructor(private waxSigningURL: string) {
    this.openEventSource = this.openEventSource.bind(this);
    this.onceEvent = this.onceEvent.bind(this);
  }

  public async openPopup(url: string,
    message?: any ): Promise<Window> {
    const win = await window.open(url, message, "height=800,width=600");

    if (win) {
      return win;
    }

    throw new Error("Unable to open popup window");
  }

  public async openEventSource(
    url: string,
    message?: any,
    win?: Window
  ): Promise<any> {
    const openedWindow = win
      ? win
      : await this.openPopup(url, message.sessionToken ? message.sessionToken : 'WaxPoup');

    if (!openedWindow) {
      throw new Error("Unable to open a popup window");
    }

    if (typeof message === "undefined") {
      return openedWindow;
    }

    const postTransaction = async (event: any) => {
      if (event.data.type === "READY") {
        // @ts-ignore
        openedWindow.postMessage(message, this.waxSigningURL);
      }
    };

    const eventPromise = this.onceEvent(
      // @ts-ignore
      openedWindow,
      this.waxSigningURL,
      postTransaction
    );

    await Promise.race([eventPromise, this.timeout()]).catch(err => {
      if (err.message !== "Timeout") {
        throw err;
      }

      openedWindow.postMessage(message, this.waxSigningURL);
    });

    return openedWindow;
  }

  public async onceEvent<T>(
    source: Window,
    origin: string,
    action: (e: MessageEvent) => T,
    type?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      window.addEventListener(
        "message",
        async function onEvent(event) {
          if (event.origin !== origin) {
            return;
          }

          if (event.source !== source) {
            return;
          }

          if (typeof event.data !== "object") {
            return;
          }

          try {
            resolve(await action(event));
          } catch (e) {
            reject(e);
          }

          window.removeEventListener("message", onEvent, false);
        },
        false
      );
    });
  }

  private timeout = () => {
    return new Promise((resolve, reject) => {
      const wait = setTimeout(() => {
        clearTimeout(wait);
        reject(new Error("Timeout"));
      }, 5000);
    });
  };
}
