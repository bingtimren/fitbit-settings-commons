# fitbit-settings-commons

Fitbit settings use React JSX that receives a `props` parameter. The JSX receives persisted settings from `props.settings`, and persists settings with `props.settingStorage`. In both cases the settings values must be strings. Values other than strings need to be 'packed' into strings with `JSON.stringify()` and 'unpacked' from strings with `JSON.parse()`. 

This library provides a wrapper to make it easier to work with Fitbit Setting API. Behind the scene, the wrapper 'packs' and 'unpacks' settings into / from strings, and persists to the `props.settingsStorage`, so that users don't need to do that in their codes. 

By default, 'packs' always uses `JSON.stringify()` to encode settings, even if the value is a string, and 'unpacks' always attempts to decode strings with `JSON.parse()` and, if that fails, return the strings as is. This default behaviour ensures that a value being packed and then unpacked would not change. However, if the value is a string, the stringified version of the string (i.e. wrapped in "") is put inside the store. 

The packing and unpacking behaviours can be customised at general level or at individual property level. An unpacker at individual level can also act as an initializer, to provide a default value where no value is provided in `props.settings`.

When using Typescript the wrapper uses a generic type variable to denote the setting's type, allowing the development tools to type checking and autocomplete the unpacked settings.

## Usage

See below. The code examples are provided in Typescript and TSX.

### Install the library

```
npm i --save fitbit-settings-commons
```

### Import the artifacts

```typescript
import {TypedSettingProps, ASIS, SettingsComponentProps, StringifyParseOptions} from "fitbit-settings-commons"
```

See [API document](https://bingtimren.github.io/fitbit-settings-commons/) for details.

### Using TypedSettingProps Wrapper

To use `TypedSettingProps` in typescript, it's preferrable to first define the settings type, for example:

```typescript
interface SettingType {
  stringVal?: string ;
  stringConfusingVal_s?: string ;
  numberVal?: number;
  objVal?:
    | {
        stringProp: string;
      }
    | undefined;
  arrayVal?: string[] | undefined;
}
```

Then, at the begining of the Settings JSX, wrap the received `props` parameter with a new TypedSettingProps object. Later codes can then work with this wrapper instead of the `props` object directly.

```typescript
const typedSetting : TypedSettingProps<SettingType>
    = new TypedSettingProps(props);
```

### Accessing the unpacked setting values

The `get()` method of the wrapper returns the unpacked settings. For example:
```
    const stringProperty = typedSetting.get().objVal?.stringProp;
    const arrayElement = typedSetting.get().arrayVal![1];
```

### Updating a setting by putting a new value

Use `update()` method to put new setting values or replace existing values. It receives an object as parameter, copies all enumerable own properties of the object to the unpacked settings (similar to `Object.assign()`), and persists the changes to `props.settingsStorage` behind the scene. 

For example:

```typescript
    typedSetting.update({
      stringVal:"new string val"
    })
```

If SettingsType generic type is provided, the parameter of the `update()` method is typed. In typescript, type checking and autocomplete will be available to the parameter.

```typescript
    typedSetting.update({
      stringVal: 42 // error
    })
```


### Updating part of a setting object or array

If an **existing** setting value is an object or array, to update **part** of the value without replacing the whole object or array, use `getToUpdate()`. This method returns a tracked setting object. When accessing a property of the tracked setting object through a key, the key is marked as 'dirty', meaning it's assumed that the property is changed and needs to be persisted to `settingsStorage` later. In the end the `commit()` method of the wrapper needs to be called to persist all the 'dirty' properties. For example: 
```typescript
    typedSetting.getToUpdate().objVal!.stringProp = 'new property';
    typedSetting.getToUpdate().arrayVal!.push('new element');
    typedSetting.commit();
```

The returned tracked setting object is typed and readonly. Any property such as an object or array can be partially updated but not replaced. To set a property directly, use `update()`.

### Updating a setting ASIS

Another way of updating settings is to make the changes directly on the unpacked settings, then call `update()` with a constant `ASIS`, which is exported from this library as a marker to denote the changed properties. The value of the denoted property would be taken from the unpacked settings "as is". 

For example, after partially changing the property `objVal`, the two callings of `update()` are equal, however using ASIS makes the method 1 shorter and less prone to error.

```typescript
    typedSetting.get().objVal!.stringProp = "new string";
    // method 1
    typedSetting.update({
      objVal: ASIS
    });    
    // method 2
    typedSetting.update({
      objVal: typedSetting.get().objVal
    });    
```

### Set Stringify Parse Behaviour

The constructor of the wrapper `TypedSettingProps` can receive two additional optional parameters to customise the packing / unpacking / initialisation behaviour of the wrapper for individual setting keys as well as the default behaviour for all keys.

```typescript
  constructor(
    private props: SettingsComponentProps,
    private packerUnpackers?: PackerUnpackerOption<SettingsType>,
    defaultPackerUnpacker?: DefaultPackerUnpackerOption
  ) 
```

The parameter `packerUnpackers` customise wrapper's packing / unpacking / initialization behaviour for individual properties of the settings. The value should be an object with matching keys of the SettingsType. Under a matching key, 'packer' and 'unpackInitiator' can optionally be provided as functions. For example:

``` typescript
  {
    stringConfusingVal: {
      packer: v => v,
      unpackInitiator: v => v
    }
  }
```
- A packer function receives a value of the type of the matching SettingsType property and returns a string.
- An unpackInitiator receives a string or `undefined` and returns a value of the type of the matching SettingsType property. If an unpackInitiator is provided, but no setting is under the matching key in `props.settings`, the unpackInitiator will be called with `undefined`, acting as an initiator to return a default value for the key.

The parameter `defaultPackerUnpacker` customise the default pack / unpack behaviour of the wrapper for all SettingsType properties. The value should be an object, with optional keys `packer` and / or `unpacker` providing the default packer / unpacker. Example value below sets a behaviour identical to the default behaviour of the wrapper.
```typescript
  {
    packer: JSON.stringify,
    unpacker: jsonParseUnpackInitiator
  }
```

### Extending type checking to "settingsKey" in settings components

Fitbit settings components, such as `<TextInput>`, accepts a `settingsKey` property that specifies where in the settings storage to put the input value. Without type checking, you can give it any string. 

If you are already using fitbit-sdk-types ([https://github.com/SergioMorchon/fitbit-sdk-types](https://github.com/SergioMorchon/fitbit-sdk-types)), then you can extend type checking to the "settingsKey" in the components. To use this feature, first follow the steps in fitbit-sdk-types package's README and make sure it's properly set up. Then replace the 'fitbit-sdk-types' package with a patched version:

```
npm i --save-dev github:bingtimren/fitbit-sdk-types#release
```
Now the components can accept a `SettingsType` type variable, and the `settingsKey` property would only accept a key in the `SettingsType` that has a value type matching the type of value that the component will put under that key.

For example, below `<Slider>` accepts a type variable SliderSettingsType. Since the value `<Slider>` puts is a number, now `settingsKey` will only accept `numberKey` and `assignableKey` as ligitimate values because other keys does not match the type.

```typescript
interface SliderSettingsType {
	stringKey: string;
	booleanKey: boolean;
	numberKey: number;
	assignableKey: number | undefined;
}

<Slider<SliderSettingsType>
	label="Example"
	settingsKey="numberKey"
	min="0"
	max="60"
/>;
```

See [https://github.com/bingtimren/fitbit-sdk-types/tree/master/test-code-samples/settings](https://github.com/bingtimren/fitbit-sdk-types/tree/master/test-code-samples/settings) for more usage examples for other components.