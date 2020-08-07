/**
 * Type of 'props' received by a Setting JSX, having 'settings' and 'settingsStorage' properties
 */
export type SettingsComponentProps = Parameters<
  Parameters<typeof registerSettingsPage>[0]
>[0];

export const ASIS: Readonly<object> = {}; // just a unique value as marker, should not conflict with anything for practical purpose
type ASIS = typeof ASIS;

/**
 * Helper handles JSON encoding / decoding and persistence to settingStorage.
 */
export class TypedSettingProps<SettingsType extends object> {
  // the settings
  private readonly typedSettings: { [k: string]: unknown } = {};
  // the tracker, with getter for each of the keys in settings, track access in accessRegistry
  private readonly trackedSettings: { [k: string]: unknown } = {};
  // registry to record access for later commit()
  private readonly accessedRegistry: Set<string> = new Set<string>();

  /**
   *
   * @param props the 'props' parameter received by the JSX
   */
  constructor(private props: SettingsComponentProps) {
    // unpack from props.settings, attempt parse as JSON, or just set as string
    for (const [k, v] of Object.entries(props.settings)) {
      if (typeof v === 'string') {
        try {
          this.typedSettings[k] = JSON.parse(v);
        } catch {
          this.typedSettings[k] = v;
        }
      }
      // install getter to tracker
      this.track(k);
    }
  }
  /**
   * Takes a partial settings, then updates the settings and takes care of preserving the
   * updates in settingStorage.
   *
   * The value of a property of the partial settings can also be the constant ASIS, which is
   * defined in this package. This denotes that the value of the property in the setting
   * object is to be used as is.
   *
   * @param value a partial SettingsType object
   */
  public update(
    value: Partial<
      {
        [P in keyof SettingsType]: SettingsType[P] | ASIS;
      }
    >
  ): void {
    for (const [k, v] of Object.entries(value)) {
      const val =
        v === ASIS ? this.typedSettings[k] : (this.typedSettings[k] = v);
      this.persist(k, val);
    }
  }
  /**
   * Get a typed, readonly copy of the settings.
   * To update the settings, use 'update' method.
   */
  public get(): Readonly<SettingsType> {
    return this.typedSettings as Readonly<SettingsType>;
  }
  public getToUpdate(): Readonly<SettingsType> {
    return this.trackedSettings as Readonly<SettingsType>;
  }
  /**
   * update all the properties that has been accessed through getToUpdate() to the settingsStorage
   */
  public commit(): void {
    this.accessedRegistry.forEach(k => {
      this.persist(k, this.typedSettings[k]);
    });
    this.accessedRegistry.clear();
  }
  // persist key & value to settingsStorage, value cannot be ASIS
  private persist(key: string, val: any): void {
    // preserve the value to settingsStorage
    if (typeof val === 'string') {
      this.props.settingsStorage.setItem(key, val);
    } else if (val === undefined) {
      this.props.settingsStorage.removeItem(key);
    } else {
      this.props.settingsStorage.setItem(key, JSON.stringify(val));
    }
  }
  // install a tracker to trackedSettings to track access
  private track(key: string): void {
    Object.defineProperty(this.trackedSettings, key, {
      enumerable: true,
      get: () => {
        this.accessedRegistry.add(key);
        return this.typedSettings[key];
      }
    });
  }
}
