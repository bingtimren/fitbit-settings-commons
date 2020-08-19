import { TypedSettingProps, ASIS, PackerUnpackerOption } from '..';
import {
  DefaultPackerUnpackerOption,
  stringifyNonString,
  jsonParseUnpackInitiator
} from './typed-settings';

interface SettingType {
  stringVal?: string;
  stringConfusingVal?: string;
  numberVal?: number;
  objVal?:
    | {
        stringProp: string;
      }
    | undefined;
  arrayVal?: string[] | undefined;
  theAnswer?: number;
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
  // example settings
  const exampleSettings: SettingType = {
    arrayVal: ['a', 'b', 'c'],
    numberVal: 42,
    objVal: {
      stringProp: 'I am a string property inside an object'
    },
    stringVal: 'I am a string value',
    stringConfusingVal: '42'
  };
  // list of different packer/unpacker options for testing
  const packerUnpackerOptions: {
    [k: string]: [
      PackerUnpackerOption<SettingType> | undefined,
      DefaultPackerUnpackerOption | undefined
    ];
  } = {
    DEFAULT: [undefined, undefined],
    ConfusingStringASIS: [
      {
        stringConfusingVal: {
          packer: v => v,
          unpackInitiator: v => v
        }
      },
      undefined
    ],
    StringifyNonString: [
      undefined,
      {
        packer: stringifyNonString
      }
    ],
    DEFAULT_ALT: [
      undefined,
      {
        unpacker: jsonParseUnpackInitiator
      }
    ],
    DEFAULT_PACKER_UNPACKER: [
      undefined,
      {
        packer: JSON.stringify,
        unpacker: jsonParseUnpackInitiator
      }
    ],
    DEFAULT_ALT2: [
      {
        theAnswer: {
          unpackInitiator: jsonParseUnpackInitiator
        }
      },
      undefined
    ],
    TheAnswerHasDefault: [
      {
        theAnswer: {
          unpackInitiator: v => (v ? JSON.parse(v) : 42)
        }
      },
      undefined
    ]
  };

  // prepare packed examples under various options
  const examplePackedSettingsByOptions: {
    [desc: string]: { [k: string]: string };
  } = {};
  for (const [desc, option] of Object.entries(packerUnpackerOptions)) {
    mockSettingsStorage.clear();
    const ts = new TypedSettingProps<SettingType>(
      {
        settings: {},
        settingsStorage: mockSettingsStorage
      },
      option[0],
      option[1]
    );
    ts.update(exampleSettings);
    examplePackedSettingsByOptions[desc] = Object.assign(
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
          settings: examplePackedSettings!,
          settingsStorage: mockSettingsStorage
        },
        packerUnpackerOptions[option][0],
        packerUnpackerOptions[option][1]
      );
      switch (option) {
        case 'StringifyNonString': // always parse caused '42' changed to 42
          expect(typedSetting.get()).toEqual(
            Object.assign({}, exampleSettings, {
              stringConfusingVal: 42
            })
          );
          break;
        case 'TheAnswerHasDefault': // test default works
          expect(typedSetting.get()).toEqual(
            Object.assign({}, exampleSettings, {
              theAnswer: 42
            })
          );
          break;
        default:
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
        packerUnpackerOptions[option][0],
        packerUnpackerOptions[option][1]
      );
      typedSetting.update(exampleSettings);
      const clone = Object.assign({}, mockedStorageInternal);
      const unpacked: TypedSettingProps<SettingType> = new TypedSettingProps(
        {
          settings: clone,
          settingsStorage: mockSettingsStorage
        },
        packerUnpackerOptions[option][0],
        packerUnpackerOptions[option][1]
      );
      switch (option) {
        case 'StringifyNonString': // always parse caused '42' changed to 42
          expect(unpacked.get()).toEqual(
            Object.assign({}, exampleSettings, {
              stringConfusingVal: 42
            })
          );
          break;
        case 'TheAnswerHasDefault': // test default works
          expect(unpacked.get()).toEqual(
            Object.assign({}, exampleSettings, {
              theAnswer: 42
            })
          );
          break;

        default:
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
        packerUnpackerOptions[option][0],
        packerUnpackerOptions[option][1]
      );
      switch (option) {
        case 'StringifyNonString': // always parse caused '42' changed to 42
          expect(typedSetting.getToUpdate()).toEqual(
            Object.assign({}, exampleSettings, {
              stringConfusingVal: 42
            })
          );
          break;
        case 'TheAnswerHasDefault': // test default works
          expect(typedSetting.getToUpdate()).toEqual(
            Object.assign({}, exampleSettings, {
              theAnswer: 42
            })
          );
          break;

        default:
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
        packerUnpackerOptions[option][0],
        packerUnpackerOptions[option][1]
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
        packerUnpackerOptions[option][0],
        packerUnpackerOptions[option][1]
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
        packerUnpackerOptions[option][0],
        packerUnpackerOptions[option][1]
      );
      // update a string property
      typedSetting.update({
        stringVal: 'new string val'
      });
      expect(mockSettingsStorage.setItem).toBeCalledTimes(1);
      expect(typedSetting.get().stringVal).toEqual('new string val');
      switch (option) {
        case 'DEFAULT':
        case 'ConfusingStringASIS':
          expect(mockSettingsStorage.setItem).toHaveBeenLastCalledWith(
            'stringVal',
            JSON.stringify('new string val')
          );
      }

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
