import { TypedSettingProps, StringifyParseOptions, ASIS } from '..';

interface SettingType {
  stringVal?: string;
  stringConfusingVal_s?: string;
  numberVal?: number;
  objVal?:
    | {
        stringProp: string;
      }
    | undefined;
  arrayVal?: string[] | undefined;
}

describe('Typed Setting Props', () => {
  // mock 'prop'
  let mockedStorageInternal: { [k: string]: string } = {};
  const mockSettingsStorage = {
    length: 0,
    onchange: jest.fn(),
    clear: jest.fn(() => {
      mockedStorageInternal = {};
    }),
    getItem: jest.fn(k => mockedStorageInternal[k]),
    key: jest.fn(),
    removeItem: jest.fn(k => {
      delete mockedStorageInternal[k];
    }),
    setItem: jest.fn((k, v) => {
      mockedStorageInternal[k] = v;
    }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  };
  // name the mocks for information
  for (const [k, v] of Object.entries(mockSettingsStorage)) {
    if (typeof v === 'function') v.mockName(k);
  }
  const exampleSettings: SettingType = {
    arrayVal: ['a', 'b', 'c'],
    numberVal: 42,
    objVal: {
      stringProp: 'I am a string property inside an object'
    },
    stringVal: 'I am a string value',
    stringConfusingVal_s: '42'
  };
  // prepare packed examples under various options
  const examplePackedSettingsByOptions: {
    [k: string]: { [k: string]: string };
  } = {};
  for (const o of Object.values(StringifyParseOptions)) {
    mockSettingsStorage.clear();
    const ts = new TypedSettingProps<SettingType>(
      {
        settings: {},
        settingsStorage: mockSettingsStorage
      },
      o as StringifyParseOptions
    );
    ts.update(exampleSettings);
    examplePackedSettingsByOptions[o] = Object.assign(
      {},
      mockedStorageInternal
    );
  }

  beforeEach(() => {
    mockSettingsStorage.clear();
    jest.clearAllMocks();
  });

  test.each(Object.entries(examplePackedSettingsByOptions))(
    'Unpacked settings found in return object of get() under option %p',
    (option, examplePackedSettings) => {
      const typedSetting: TypedSettingProps<SettingType> = new TypedSettingProps(
        {
          settings: examplePackedSettings,
          settingsStorage: mockSettingsStorage
        },
        option as StringifyParseOptions
      );
      switch (option) {
        case StringifyParseOptions.Stringify_NonString_Parse_Always:
          expect(typedSetting.get()).toEqual(
            Object.assign({}, exampleSettings, { stringConfusingVal_s: 42 })
          ); // parse-always problem
          break;
        case StringifyParseOptions.Stringify_Always_Parse_Always:
        case StringifyParseOptions.Stringify_NonString_Parse_Key_Decide:
          expect(typedSetting.get()).toEqual(exampleSettings);
      }
    }
  );

  test.each(Object.entries(examplePackedSettingsByOptions))(
    'Settings packed then unpacked should remain equal under option %p',
    option => {
      const typedSetting: TypedSettingProps<SettingType> = new TypedSettingProps(
        {
          settings: {},
          settingsStorage: mockSettingsStorage
        },
        option as StringifyParseOptions
      );
      typedSetting.update(exampleSettings);
      const clone = Object.assign({}, mockedStorageInternal);
      const unpacked: TypedSettingProps<SettingType> = new TypedSettingProps(
        {
          settings: clone,
          settingsStorage: mockSettingsStorage
        },
        option as StringifyParseOptions
      );
      switch (option) {
        case StringifyParseOptions.Stringify_NonString_Parse_Always:
          expect(unpacked.get()).toEqual(
            Object.assign({}, exampleSettings, { stringConfusingVal_s: 42 })
          ); // parse-always problem
          break;
        case StringifyParseOptions.Stringify_Always_Parse_Always:
        case StringifyParseOptions.Stringify_NonString_Parse_Key_Decide:
          expect(unpacked.get()).toEqual(exampleSettings);
      }
    }
  );

  test.each(Object.entries(examplePackedSettingsByOptions))(
    'Unpacked settings found in return object of getToUpdate() under option %p',
    (option, examplePackedSettings) => {
      const typedSetting: TypedSettingProps<SettingType> = new TypedSettingProps(
        {
          settings: examplePackedSettings,
          settingsStorage: mockSettingsStorage
        },
        option as StringifyParseOptions
      );
      switch (option) {
        case StringifyParseOptions.Stringify_NonString_Parse_Always:
          expect(typedSetting.getToUpdate()).toEqual(
            Object.assign({}, exampleSettings, { stringConfusingVal_s: 42 })
          ); // parse-always problem
          break;
        case StringifyParseOptions.Stringify_NonString_Parse_Key_Decide:
        case StringifyParseOptions.Stringify_Always_Parse_Always:
          expect(typedSetting.getToUpdate()).toEqual(exampleSettings);
      }
    }
  );

  test.each(Object.entries(examplePackedSettingsByOptions))(
    'commit() without getToUpdate() does nothing under option %p',
    (option, examplePackedSettings) => {
      const typedSetting: TypedSettingProps<SettingType> = new TypedSettingProps(
        {
          settings: examplePackedSettings,
          settingsStorage: mockSettingsStorage
        },
        option as StringifyParseOptions
      );
      typedSetting.commit();
      for (const [_k, f] of Object.entries(mockSettingsStorage)) {
        if (typeof f === 'function') expect(f).toBeCalledTimes(0);
      }
    }
  );

  test.each(Object.entries(examplePackedSettingsByOptions))(
    'commit() after getToUpdate() calls settingsStorage under option %p',
    (option, examplePackedSettings) => {
      const typedSetting: TypedSettingProps<SettingType> = new TypedSettingProps(
        {
          settings: examplePackedSettings,
          settingsStorage: mockSettingsStorage
        },
        option as StringifyParseOptions
      );
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
    }
  );

  test.each(Object.entries(examplePackedSettingsByOptions))(
    'update() calls settingsStorage under option %p',
    (option, examplePackedSettings) => {
      const typedSetting: TypedSettingProps<SettingType> = new TypedSettingProps(
        {
          settings: examplePackedSettings,
          settingsStorage: mockSettingsStorage
        },
        option as StringifyParseOptions
      );
      // update a string property
      typedSetting.update({
        stringVal: 'new string val'
      });
      expect(mockSettingsStorage.setItem).toBeCalledTimes(1);
      expect(typedSetting.get().stringVal).toEqual('new string val');
      expect(mockSettingsStorage.setItem).toHaveBeenLastCalledWith(
        'stringVal',
        option === StringifyParseOptions.Stringify_Always_Parse_Always
          ? JSON.stringify('new string val')
          : 'new string val'
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
      expect(mockSettingsStorage.removeItem).toHaveBeenLastCalledWith(
        'arrayVal'
      );
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
    }
  );
});
