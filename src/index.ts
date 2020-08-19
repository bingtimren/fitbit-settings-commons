/**
 * Type of the 'props' parameter received by a Setting JSX, having 'settings' and 'settingsStorage' properties
 * It can be used in TSX to type the 'props' parameter in typescript to provide autocomplete and type checking.
 *
 * ```tsx
 * function SettingsPage(props: SettingsComponentProps) {
 *     return (
 *       <Page>
 *         <Section
 *           title={<Text bold align="center">Demo Settings</Text>}>
 *         </Section>
 *       </Page>
 *     );
 *   }
 *
 * registerSettingsPage(SettingsPage);
 * ```
 */
export interface SettingsComponentProps {
  readonly settings: { [key: string]: string | undefined };
  readonly settingsStorage: LiveStorage;
}
/**
 * A marker, to be used with TypedSettingProps.update()
 */
export const ASIS: Readonly<object> = {};
type ASIS = typeof ASIS;

/**
 * utility type, remove 'undefined' from T
 */
type NonUndefined<T> = T extends undefined ? never : T;

/**
 * Type of the optional second parameter of the constructor of TypedSettingProps, to customise pack / unpack / initiate behaviour of the wrapper for
 * individual SettingsType properties. Expects an object, with matching keys of the SettingsType. Under a matching key, 'packer' and 'unpackInitiator'
 * can be provided as functions. For example:
 * ```
 *  {
 *    stringConfusingVal: {
 *      packer: v => v,
 *      unpackInitiator: v => v
 *    }
 *  }
 * ```
 * A packer function receives a value of the type of the matching SettingsType property and returns a string.
 * An unpackInitiator receives a string or undefined and returns a value of the type of the matching SettingsType property.
 * If an unpackInitiator is provided, but no setting is under the matching key, the unpackInitiator will be called with 'undefined', acting as an
 * initiator to return a default value for the key.
 */
export type PackerUnpackerOption<SettingsType extends object> = {
  [k in keyof SettingsType]?: {
    packer?: (value: NonUndefined<SettingsType[k]>) => string;
    unpackInitiator?: (settings: string | undefined) => SettingsType[k];
  };
};

/**
 * Type of the optional third parameter of the constructor of TypedSettingProps, to customise the default pack / unpack behaviour of the wrapper for all SettingsType properties.
 */
export interface DefaultPackerUnpackerOption {
  packer?: (value: NonUndefined<any>) => string;
  unpacker?: (settings: string | undefined) => unknown;
}

/**
 * The default unpacker/initiator of the wrapper.
 * First attempt to JSON.parse(setting), if fails, just return setting as string.
 *
 * @param setting setting string
 */
export const jsonParseUnpackInitiator = (setting: string | undefined) => {
  try {
    return setting ? JSON.parse(setting) : undefined;
  } catch {
    return setting;
  }
};

/**
 * Return JSON.stringify(value) if value is not string, otherwise just return value.
 * Can be used as packer if desired.
 *
 * @param value
 */
export const stringifyNonString = (value: any) => {
  return typeof value === 'string' ? value : JSON.stringify(value);
};

/**
 * A wrapper to make it easier to work with Fitbit Setting API.
 *
 * Behind the scene, the wrapper 'packs' and 'unpacks' settings into / from strings, and persists to the `props.settingsStorage`,
 * so that users don't need to do that in their codes. By default, 'packs' always uses `JSON.stringify()` to encode settings, even
 * if the value is a string, and 'unpacks' always attempts to decode strings with `JSON.parse()` and, if that fails, return the
 * strings as is. The packing and unpacking behaviours can be customised.
 *
 * Receives an optional generic type SettingsType, which is the type of the unpacked settings.
 */
export class TypedSettingProps<SettingsType extends object> {
  // the settings
  private readonly typedSettings: { [k: string]: unknown } = {};
  // the tracker, with getter for each of the keys in settings, track access in accessRegistry
  private readonly trackedSettings: { [k: string]: unknown } = {};
  // registry to record access for later commit()
  private readonly accessedRegistry: Set<string> = new Set<string>();

  private readonly defaultPacker: (value: NonUndefined<any>) => string;
  private readonly defaultUnpackInitiator: (settings: string) => unknown;

  /**
   * Construct a wrapper of the 'props', and optionally customise the packing / unpacking behaviour of the wrapper.
   * @param props the 'props' parameter received by the JSX
   * @param packerUnpackers option to customise wrapper's packing / unpacking / initialization behaviour for individual properties of the settings.
   * See `PackerUnpackerOption` for more details.
   * @param defaultPackerUnpacker
   */
  constructor(
    private props: SettingsComponentProps,
    private packerUnpackers?: PackerUnpackerOption<SettingsType>,
    defaultPackerUnpacker?: DefaultPackerUnpackerOption
  ) {
    // set default packer / unpacker
    this.defaultPacker = defaultPackerUnpacker?.packer ?? JSON.stringify;
    this.defaultUnpackInitiator =
      defaultPackerUnpacker?.unpacker ?? jsonParseUnpackInitiator;
    // unpack from props.settings
    for (const [k, v] of Object.entries(props.settings)) {
      // find an unpack-initiator or use the default
      const unpacker =
        this.packerUnpackers?.[k as keyof SettingsType]?.unpackInitiator ??
        this.defaultUnpackInitiator;
      this.typedSettings[k] = unpacker(v!);
      // install getter to tracker
      this.track(k);
    }
    // call initiators
    if (packerUnpackers) {
      for (const [k, packing] of Object.entries(packerUnpackers)) {
        if ((packing as any).unpackInitiator && !(k in props.settings)) {
          // there is an unpackInitiator but not called, call as initiator & track the key
          this.typedSettings[k] = (packing as any).unpackInitiator(undefined);
          this.track(k);
        }
      }
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

  /**
   * Returns a tracked setting object. When accessing a property of the tracked setting object through a key, the key is marked as 'dirty',
   * meaning it's assumed that the property is changed and needs to be persisted to `settingsStorage` later. In the end the `commit()` method
   * of the wrapper needs to be called to persist all the 'dirty' properties.
   */
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

  /**
   * Persist key & value to settingsStorage, value cannot be ASIS
   * @param key
   * @param val
   */
  private persist(key: string, val: any): void {
    // preserve the value to settingsStorage
    if (val === undefined) {
      this.props.settingsStorage.removeItem(key);
    } else {
      // find the packer, pack & persist
      const packer =
        this.packerUnpackers?.[key as keyof SettingsType]?.packer ??
        this.defaultPacker;
      this.props.settingsStorage.setItem(key, packer(val));
    }
  }
  /**
   * install a tracker to trackedSettings to track access
   * @param key
   */
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
