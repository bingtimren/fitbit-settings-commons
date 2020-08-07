import { TypedSettingProps, ASIS } from '..';

interface SettingType {
  stringVal: string | undefined;
  numberVal: number | undefined;
  objVal:
    | {
        stringProp: string;
      }
    | undefined;
  arrayVal: string[] | undefined;
}

describe('Typed Setting Props', () => {
  // mock 'prop'
  const mockSettingsStorage = {
    length: 0,
    onchange: jest.fn(),
    clear: jest.fn(),
    getItem: jest.fn(),
    key: jest.fn(),
    removeItem: jest.fn(),
    setItem: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  };
  for (const [k, v] of Object.entries(mockSettingsStorage)) {
    if (typeof v === 'function') v.mockName(k);
  }
  const exampleSettings: SettingType = {
    arrayVal: ['a', 'b', 'c'],
    numberVal: 42,
    objVal: {
      stringProp: 'I am a string property inside an object'
    },
    stringVal: 'I am a string value'
  };

  const examplePackedSettings = {
    arrayVal: JSON.stringify(exampleSettings.arrayVal),
    numberVal: JSON.stringify(exampleSettings.numberVal),
    stringVal: exampleSettings.stringVal,
    objVal: JSON.stringify(exampleSettings.objVal)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Unpacked settings found in return object of get()', () => {
    const typedSetting: TypedSettingProps<SettingType> = new TypedSettingProps({
      settings: examplePackedSettings,
      settingsStorage: mockSettingsStorage
    });
    expect(typedSetting.get()).toEqual(exampleSettings);
  });

  test('Unpacked settings found in return object of getToUpdate()', () => {
    const typedSetting: TypedSettingProps<SettingType> = new TypedSettingProps({
      settings: examplePackedSettings,
      settingsStorage: mockSettingsStorage
    });
    expect(typedSetting.getToUpdate()).toEqual(exampleSettings);
  });

  test('commit() without getToUpdate() does nothing', () => {
    const typedSetting: TypedSettingProps<SettingType> = new TypedSettingProps({
      settings: examplePackedSettings,
      settingsStorage: mockSettingsStorage
    });
    typedSetting.commit();
    for (const [_k, f] of Object.entries(mockSettingsStorage)) {
      if (typeof f === 'function') expect(f).toBeCalledTimes(0);
    }
  });

  test('commit() after getToUpdate() calls settingsStorage', () => {
    const typedSetting: TypedSettingProps<SettingType> = new TypedSettingProps({
      settings: examplePackedSettings,
      settingsStorage: mockSettingsStorage
    });
    // update an array
    typedSetting.getToUpdate().arrayVal!.push('d');
    typedSetting.commit();
    expect(mockSettingsStorage.setItem).toBeCalledTimes(1);
    expect(typedSetting.get().arrayVal).toEqual(['a', 'b', 'c', 'd']);
    expect(mockSettingsStorage.setItem).toHaveBeenLastCalledWith(
      'arrayVal',
      JSON.stringify(['a', 'b', 'c', 'd'])
    );

    // update an object
    typedSetting.getToUpdate().objVal!.stringProp = 'new string';
    typedSetting.commit();
    expect(mockSettingsStorage.setItem).toHaveBeenCalledTimes(2);
    expect(typedSetting.get().objVal).toEqual({
      stringProp: 'new string'
    });
    expect(mockSettingsStorage.setItem).toHaveBeenCalledWith(
      'objVal',
      JSON.stringify({
        stringProp: 'new string'
      })
    );
  });

  test('update() calls settingsStorage', () => {
    const typedSetting: TypedSettingProps<SettingType> = new TypedSettingProps({
      settings: examplePackedSettings,
      settingsStorage: mockSettingsStorage
    });
    // update a string property
    typedSetting.update({
      stringVal: 'new string val'
    });
    expect(mockSettingsStorage.setItem).toBeCalledTimes(1);
    expect(typedSetting.get().stringVal).toEqual('new string val');
    expect(mockSettingsStorage.setItem).toHaveBeenLastCalledWith(
      'stringVal',
      'new string val'
    );

    // update a number
    typedSetting.update({
      numberVal: 24
    });
    expect(mockSettingsStorage.setItem).toHaveBeenCalledTimes(2);
    expect(typedSetting.get().numberVal).toEqual(24);
    expect(mockSettingsStorage.setItem).toHaveBeenLastCalledWith(
      'numberVal',
      JSON.stringify(24)
    );

    // update to remove
    typedSetting.update({
      arrayVal: undefined
    });
    expect(mockSettingsStorage.setItem).toHaveBeenCalledTimes(2);
    expect(mockSettingsStorage.removeItem).toHaveBeenCalledTimes(1);
    expect(mockSettingsStorage.removeItem).toHaveBeenLastCalledWith('arrayVal');
    expect(typedSetting.get().arrayVal).toBeUndefined();

    // update ASIS
    typedSetting.get().objVal!.stringProp = 'new string';
    typedSetting.update({
      objVal: ASIS
    });
    expect(mockSettingsStorage.setItem).toHaveBeenCalledTimes(3);
    expect(typedSetting.get().objVal).toEqual({
      stringProp: 'new string'
    });
    expect(mockSettingsStorage.setItem).toHaveBeenLastCalledWith(
      'objVal',
      JSON.stringify({
        stringProp: 'new string'
      })
    );
  });
});
