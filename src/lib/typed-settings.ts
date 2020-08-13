/**
 * Type of 'props' received by a Setting JSX, having 'settings' and 'settingsStorage' properties
 */
export type SettingsComponentProps = Parameters<
  Parameters<typeof registerSettingsPage>[0]
>[0];

export const ASIS: Readonly<object> = {}; // just a unique value as marker, should not conflict with anything for practical purpose
type ASIS = typeof ASIS;

/**
 * Decides wrapper behaviour when updating (calling props.settingsStorage.setItem) and when unpacking from props.settings
 *
 * Stringify_Always_Parse_Always [Default Option]:
 * on update always JSON.stringify, even if value is a string ('8' would be set as '"8"' in storage)
 * on unpacking always attempts JSON.parse, if fails then use the string as is
 *
 * Stringify_NonString_Parse_Always:
 * on update only JSON.stringify non-string values,
 * on unpacking always attempts JSON.parse
 * this option does not guarantee round-trip ('8' packed as '8' then unpacked as 8, a number)
 *
 * Stringify_NonString_Parse_Key_Decide:
 * on update only JSON.stringify non-string values,
 * on unpacking, when key ends with "_s" or "_S" (indicating string value) does NOT attempt JSON.parse, otherwise attempts JSON.parse
 */
export enum StringifyParseOptions {
  Stringify_Always_Parse_Always = 'AA',
  Stringify_NonString_Parse_Always = 'DA', // on update only JSON.stringify non-string values, on unpacking always attempts JSON.parse
  Stringify_NonString_Parse_Key_Decide = 'DD' // on update only JSON.stringify non-string values, on unpacking attempts JSON.parse when key NOT ends with "_S" (indicating strings)
}

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
  constructor(
    private props: SettingsComponentProps,
    private option: StringifyParseOptions = StringifyParseOptions.Stringify_Always_Parse_Always
  ) {
    // unpack from props.settings, attempt parse as JSON, or just set as string
    for (const [k, v] of Object.entries(props.settings)) {
      if (v !== undefined) {
        if (
          option === StringifyParseOptions.Stringify_Always_Parse_Always ||
          option === StringifyParseOptions.Stringify_NonString_Parse_Always ||
          (option ===
            StringifyParseOptions.Stringify_NonString_Parse_Key_Decide &&
            !k.endsWith('_s') &&
            !k.endsWith('_S'))
        ) {
          // attempt parse
          try {
            this.typedSettings[k] = JSON.parse(v);
          } catch {
            this.typedSettings[k] = v;
          }
        } else {
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
    if (val === undefined) {
      this.props.settingsStorage.removeItem(key);
    } else if (
      this.option === StringifyParseOptions.Stringify_Always_Parse_Always ||
      typeof val !== 'string'
    ) {
      this.props.settingsStorage.setItem(key, JSON.stringify(val));
    } else {
      this.props.settingsStorage.setItem(key, val);
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
