# fitbit-settings-commons

Fitbit settings use React JSX that receives a `props` parameter. The JSX receives persisted settings from `props.settings`, and persists settings with `props.settingStorage`. In both cases the settings values must be strings. Values other than strings need to be 'packed' into strings with `JSON.stringify()`. 

This library provides a wrapper to make it easier to work with Fitbit Setting API. The wrapper "unpacks" the values from `props.settings` when the values can be decoded by `JSON.parse()`, so that further codes can deal with the unpacked settings directly. Setting changes can be made to the unpacked settings. The wrapper "packs" the values that are not strings with `JSON.stringify()`, and persists to the `props.settingsStorage` behind the scene.

When using Typescript the wrapper uses a generic type variable to denote the setting's type, allowing the development tools to type checking and autocomplete the unpacked settings.

## Usage

The code examples are provided in Typescript and TSX.

### Install the library

```
npm i --save fitbit-settings-commons
```

### Import the artifacts

```typescript
import {TypedSettingProps, ASIS, SettingsComponentProps, StringifyParseOptions} from "fitbit-settings-commons"
```

### Using SettingsComponentProps

`SettingsComponentProps` is the type of the 'props' parameter received by the settings JSX. It can be used in TSX to type the 'props' parameter in typescript to provide autocomplete and type checking.

```tsx
function SettingsPage(props: SettingsComponentProps) {
    return (
      <Page>
        <Section
          title={<Text bold align="center">Demo Settings</Text>}>
        </Section>
      </Page>
    );
  }
  
registerSettingsPage(SettingsPage);  
```

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

The parameter of the `update()` method is typed. In typescript, type checking and autocomplete will be available to the parameter.

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

Another way of updating settings is to make the changes directly on the unpacked settings, then call `update()` with a constant `ASIS` that is exported from this library as a marker to denote the changed properties. The value of the denoted property would be taken from the unpacked settings "as is". 

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

As mentioned, when the wrapper extracts values from props.settings, wrapper calls `JSON.parse()` to extract non-string objects. When wrapper persists value into props.settingsStorage, wrapper calls `JSON.stringify()` to encode values into strings. Enum `StringifyParseOptions` provides three options to set the stringify/parse behaviour of the wrapper. 

To set a behaviour other than the default, pass a second parameter into the wrapper's constructor, for example:

```typescript
const typedSetting : TypedSettingProps<SettingType>
    = new TypedSettingProps(props, StringifyParseOptions.Stringify_NonString_Parse_Always);
```

The three options are:

**Stringify_Always_Parse_Always [Default Option]**: 
- On update always JSON.stringify, even if value is a string ('8' would be set as '"8"' in storage);
- On unpacking always attempts JSON.parse, if fails then use the string as is;
- This is the default behaviour, it make sure values after packed / unpacked remain the same. However, string values will be put into props.settingsStorage as JSON as well, meaning the extra '"' wrapping the strings.

**Stringify_NonString_Parse_Always**:
- On update only JSON.stringify non-string values;
- On unpacking always attempts JSON.parse;
- This option does not guarantee round-trip ('8' packed as '8' then unpacked as 8, a number)

**Stringify_NonString_Parse_Key_Decide**:
- On update only JSON.stringify non-string values;
- On unpacking, when key ends with "_s" or "_S" (indicating string value) does NOT attempt JSON.parse, otherwise attempts JSON.parse;
- This option works if you name the keys of string type values to end with "_s" or "_S"
