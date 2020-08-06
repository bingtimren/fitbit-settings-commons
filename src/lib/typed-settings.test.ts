import { TypedSettingProps } from '..';

interface SettingType {
  stringVal: string | undefined;
  numberVal: number | undefined;
  objVal:
    | {
        stringProp: string;
      }
    | undefined;
  arrayVal: string[];
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
    if (typeof(v)==='function')
      v.mockName(k)
  }
  const exampleSettings: SettingType = {
    arrayVal: ['a', 'B', 'c'],
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

  beforeEach(()=>{
    jest.clearAllMocks()
  })


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
    const o = typedSetting.getToUpdate();
    for (const [k,v] of Object.entries(o)){
      const expected = (exampleSettings as any)[k];
      expect(v).toEqual(expected);
    }
  });

  test('commit() without getToUpdate() does nothing', () => {
    const typedSetting: TypedSettingProps<SettingType> = new TypedSettingProps({
      settings: examplePackedSettings,
      settingsStorage: mockSettingsStorage
    });
    typedSetting.commit()
    for (const [_k, f] of Object.entries(mockSettingsStorage)) {
      if (typeof(f)==='function')
        expect(f).toBeCalledTimes(0);
    }
  });

});
