/**
 * Type of 'props' received by a Setting JSX, having 'settings' and 'settingsStorage' properties
 */
export type SettingsComponentProps = Parameters<
  Parameters<typeof registerSettingsPage>[0]
>[0];

export const ASIS: Readonly<object> = {}; // just a unique value as marker, should not conflict with anything for practical purpose
type ASIS = typeof ASIS;

/**
 * Provides typing to Fitbit settings, handles JSON encoding / decoding and persistence to settingStorage automatically.
 */
export class TypedSettingProps<SettingsType extends object> {
  private readonly tracker : {
    typedSettings: { [k: string]: unknown };
    trackedSettings : {[k:string]:any},
    accessedRegistry : Set<string>
  }= {
    typedSettings: {},
    trackedSettings: {},
    accessedRegistry: new Set<string>()
  };
  constructor(private props: SettingsComponentProps) {
    // unpack from props.settings, attempt parse as JSON, or just set as string
    for (const [k, v] of Object.entries(props.settings)) {
      if (typeof v === 'string') {
        try {
          this.tracker.typedSettings[k] = JSON.parse(v);
        } catch {
          this.tracker.typedSettings[k] = v;
        }
      }
      // install getter to tracker
      this.track(k);
    }
  }
  /**
   * Takes a partial object of the settings, then updates the settings and takes care of preserving the
   * updatted setting in settingStorage. For example:
   *
   *
   *
   *
   * The value of a property of the partial object can also be
   * the constant ASIS, which is defined in this package. When ASIS is found as a value of a property, the
   * value of the property in the setting object is used.
   *
   *
   * @param value a partial object of SettingsType to update, and the value of a property, such as an array,
   * can be the constant ASIS, used as a marker to
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
        v === ASIS ? this.tracker.typedSettings[k] : (this.tracker.typedSettings[k] = v);

      this.persist(k, val);
    }
  }
  /**
   * Get a typed, readonly copy of the settings.
   * To update the settings, use 'update' method.
   */
  public get(): Readonly<SettingsType> {
    return this.tracker.typedSettings as Readonly<SettingsType>;
  }
  public getToUpdate(): Readonly<SettingsType> {
    return this.tracker.trackedSettings as Readonly<SettingsType>;
  }
  public commit(): void {
    this.tracker.accessedRegistry.forEach(k => {
      this.persist(k, this.tracker.trackedSettings[k]);
    });
    this.tracker.accessedRegistry.clear();
  }
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
  private track(key: string): void {
    Object.defineProperty(this.tracker.trackedSettings, key, {
      enumerable:true,
      get: ((t, k) => (()=>{
        t.accessedRegistry.add(k);
        return t.typedSettings[k];
      })) (this.tracker, key)
  })
  } 
}
