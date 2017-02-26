var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
/*! *****************************************************************************
Copyright (C) Microsoft. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
var Reflect;
(function (Reflect) {
    "use strict";
    const hasOwn = Object.prototype.hasOwnProperty;
    // feature test for Symbol support
    const supportsSymbol = typeof Symbol === "function";
    const toPrimitiveSymbol = supportsSymbol && typeof Symbol.toPrimitive !== "undefined" ? Symbol.toPrimitive : "@@toPrimitive";
    const iteratorSymbol = supportsSymbol && typeof Symbol.iterator !== "undefined" ? Symbol.iterator : "@@iterator";
    var HashMap;
    (function (HashMap) {
        const supportsCreate = typeof Object.create === "function"; // feature test for Object.create support
        const supportsProto = { __proto__: [] } instanceof Array; // feature test for __proto__ support
        const downLevel = !supportsCreate && !supportsProto;
        // create an object in dictionary mode (a.k.a. "slow" mode in v8)
        HashMap.create = supportsCreate
            ? () => MakeDictionary(Object.create(null))
            : supportsProto
                ? () => MakeDictionary({ __proto__: null })
                : () => MakeDictionary({});
        HashMap.has = downLevel
            ? (map, key) => hasOwn.call(map, key)
            : (map, key) => key in map;
        HashMap.get = downLevel
            ? (map, key) => hasOwn.call(map, key) ? map[key] : undefined
            : (map, key) => map[key];
    })(HashMap || (HashMap = {}));
    // Load global or shim versions of Map, Set, and WeakMap
    const functionPrototype = Object.getPrototypeOf(Function);
    const usePolyfill = typeof process === "object" && process.env && process.env["REFLECT_METADATA_USE_MAP_POLYFILL"] === "true";
    const _Map = !usePolyfill && typeof Map === "function" && typeof Map.prototype.entries === "function" ? Map : CreateMapPolyfill();
    const _Set = !usePolyfill && typeof Set === "function" && typeof Set.prototype.entries === "function" ? Set : CreateSetPolyfill();
    const _WeakMap = !usePolyfill && typeof WeakMap === "function" ? WeakMap : CreateWeakMapPolyfill();
    // [[Metadata]] internal slot
    // https://rbuckton.github.io/reflect-metadata/#ordinary-object-internal-methods-and-internal-slots
    const Metadata = new _WeakMap();
    /**
      * Applies a set of decorators to a property of a target object.
      * @param decorators An array of decorators.
      * @param target The target object.
      * @param propertyKey (Optional) The property key to decorate.
      * @param attributes (Optional) The property descriptor for the target key.
      * @remarks Decorators are applied in reverse order.
      * @example
      *
      *     class Example {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     Example = Reflect.decorate(decoratorsArray, Example);
      *
      *     // property (on constructor)
      *     Reflect.decorate(decoratorsArray, Example, "staticProperty");
      *
      *     // property (on prototype)
      *     Reflect.decorate(decoratorsArray, Example.prototype, "property");
      *
      *     // method (on constructor)
      *     Object.defineProperty(Example, "staticMethod",
      *         Reflect.decorate(decoratorsArray, Example, "staticMethod",
      *             Object.getOwnPropertyDescriptor(Example, "staticMethod")));
      *
      *     // method (on prototype)
      *     Object.defineProperty(Example.prototype, "method",
      *         Reflect.decorate(decoratorsArray, Example.prototype, "method",
      *             Object.getOwnPropertyDescriptor(Example.prototype, "method")));
      *
      */
    function decorate(decorators, target, propertyKey, attributes) {
        if (!IsUndefined(propertyKey)) {
            if (!IsArray(decorators))
                throw new TypeError();
            if (!IsObject(target))
                throw new TypeError();
            if (!IsObject(attributes) && !IsUndefined(attributes) && !IsNull(attributes))
                throw new TypeError();
            if (IsNull(attributes))
                attributes = undefined;
            propertyKey = ToPropertyKey(propertyKey);
            return DecorateProperty(decorators, target, propertyKey, attributes);
        }
        else {
            if (!IsArray(decorators))
                throw new TypeError();
            if (!IsConstructor(target))
                throw new TypeError();
            return DecorateConstructor(decorators, target);
        }
    }
    Reflect.decorate = decorate;
    // 4.1.2 Reflect.metadata(metadataKey, metadataValue)
    // https://rbuckton.github.io/reflect-metadata/#reflect.metadata
    /**
      * A default metadata decorator factory that can be used on a class, class member, or parameter.
      * @param metadataKey The key for the metadata entry.
      * @param metadataValue The value for the metadata entry.
      * @returns A decorator function.
      * @remarks
      * If `metadataKey` is already defined for the target and target key, the
      * metadataValue for that key will be overwritten.
      * @example
      *
      *     // constructor
      *     @Reflect.metadata(key, value)
      *     class Example {
      *     }
      *
      *     // property (on constructor, TypeScript only)
      *     class Example {
      *         @Reflect.metadata(key, value)
      *         static staticProperty;
      *     }
      *
      *     // property (on prototype, TypeScript only)
      *     class Example {
      *         @Reflect.metadata(key, value)
      *         property;
      *     }
      *
      *     // method (on constructor)
      *     class Example {
      *         @Reflect.metadata(key, value)
      *         static staticMethod() { }
      *     }
      *
      *     // method (on prototype)
      *     class Example {
      *         @Reflect.metadata(key, value)
      *         method() { }
      *     }
      *
      */
    function metadata(metadataKey, metadataValue) {
        function decorator(target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey) && !IsPropertyKey(propertyKey))
                throw new TypeError();
            OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
        }
        return decorator;
    }
    Reflect.metadata = metadata;
    /**
      * Define a unique metadata entry on the target.
      * @param metadataKey A key used to store and retrieve metadata.
      * @param metadataValue A value that contains attached metadata.
      * @param target The target object on which to define metadata.
      * @param propertyKey (Optional) The property key for the target.
      * @example
      *
      *     class Example {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     Reflect.defineMetadata("custom:annotation", options, Example);
      *
      *     // property (on constructor)
      *     Reflect.defineMetadata("custom:annotation", options, Example, "staticProperty");
      *
      *     // property (on prototype)
      *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "property");
      *
      *     // method (on constructor)
      *     Reflect.defineMetadata("custom:annotation", options, Example, "staticMethod");
      *
      *     // method (on prototype)
      *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "method");
      *
      *     // decorator factory as metadata-producing annotation.
      *     function MyAnnotation(options): Decorator {
      *         return (target, key?) => Reflect.defineMetadata("custom:annotation", options, target, key);
      *     }
      *
      */
    function defineMetadata(metadataKey, metadataValue, target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
    }
    Reflect.defineMetadata = defineMetadata;
    /**
      * Gets a value indicating whether the target object or its prototype chain has the provided metadata key defined.
      * @param metadataKey A key used to store and retrieve metadata.
      * @param target The target object on which the metadata is defined.
      * @param propertyKey (Optional) The property key for the target.
      * @returns `true` if the metadata key was defined on the target object or its prototype chain; otherwise, `false`.
      * @example
      *
      *     class Example {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     result = Reflect.hasMetadata("custom:annotation", Example);
      *
      *     // property (on constructor)
      *     result = Reflect.hasMetadata("custom:annotation", Example, "staticProperty");
      *
      *     // property (on prototype)
      *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "property");
      *
      *     // method (on constructor)
      *     result = Reflect.hasMetadata("custom:annotation", Example, "staticMethod");
      *
      *     // method (on prototype)
      *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "method");
      *
      */
    function hasMetadata(metadataKey, target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryHasMetadata(metadataKey, target, propertyKey);
    }
    Reflect.hasMetadata = hasMetadata;
    /**
      * Gets a value indicating whether the target object has the provided metadata key defined.
      * @param metadataKey A key used to store and retrieve metadata.
      * @param target The target object on which the metadata is defined.
      * @param propertyKey (Optional) The property key for the target.
      * @returns `true` if the metadata key was defined on the target object; otherwise, `false`.
      * @example
      *
      *     class Example {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     result = Reflect.hasOwnMetadata("custom:annotation", Example);
      *
      *     // property (on constructor)
      *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticProperty");
      *
      *     // property (on prototype)
      *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "property");
      *
      *     // method (on constructor)
      *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticMethod");
      *
      *     // method (on prototype)
      *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "method");
      *
      */
    function hasOwnMetadata(metadataKey, target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryHasOwnMetadata(metadataKey, target, propertyKey);
    }
    Reflect.hasOwnMetadata = hasOwnMetadata;
    /**
      * Gets the metadata value for the provided metadata key on the target object or its prototype chain.
      * @param metadataKey A key used to store and retrieve metadata.
      * @param target The target object on which the metadata is defined.
      * @param propertyKey (Optional) The property key for the target.
      * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
      * @example
      *
      *     class Example {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     result = Reflect.getMetadata("custom:annotation", Example);
      *
      *     // property (on constructor)
      *     result = Reflect.getMetadata("custom:annotation", Example, "staticProperty");
      *
      *     // property (on prototype)
      *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "property");
      *
      *     // method (on constructor)
      *     result = Reflect.getMetadata("custom:annotation", Example, "staticMethod");
      *
      *     // method (on prototype)
      *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "method");
      *
      */
    function getMetadata(metadataKey, target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryGetMetadata(metadataKey, target, propertyKey);
    }
    Reflect.getMetadata = getMetadata;
    /**
      * Gets the metadata value for the provided metadata key on the target object.
      * @param metadataKey A key used to store and retrieve metadata.
      * @param target The target object on which the metadata is defined.
      * @param propertyKey (Optional) The property key for the target.
      * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
      * @example
      *
      *     class Example {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     result = Reflect.getOwnMetadata("custom:annotation", Example);
      *
      *     // property (on constructor)
      *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticProperty");
      *
      *     // property (on prototype)
      *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "property");
      *
      *     // method (on constructor)
      *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticMethod");
      *
      *     // method (on prototype)
      *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "method");
      *
      */
    function getOwnMetadata(metadataKey, target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryGetOwnMetadata(metadataKey, target, propertyKey);
    }
    Reflect.getOwnMetadata = getOwnMetadata;
    /**
      * Gets the metadata keys defined on the target object or its prototype chain.
      * @param target The target object on which the metadata is defined.
      * @param propertyKey (Optional) The property key for the target.
      * @returns An array of unique metadata keys.
      * @example
      *
      *     class Example {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     result = Reflect.getMetadataKeys(Example);
      *
      *     // property (on constructor)
      *     result = Reflect.getMetadataKeys(Example, "staticProperty");
      *
      *     // property (on prototype)
      *     result = Reflect.getMetadataKeys(Example.prototype, "property");
      *
      *     // method (on constructor)
      *     result = Reflect.getMetadataKeys(Example, "staticMethod");
      *
      *     // method (on prototype)
      *     result = Reflect.getMetadataKeys(Example.prototype, "method");
      *
      */
    function getMetadataKeys(target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryMetadataKeys(target, propertyKey);
    }
    Reflect.getMetadataKeys = getMetadataKeys;
    /**
      * Gets the unique metadata keys defined on the target object.
      * @param target The target object on which the metadata is defined.
      * @param propertyKey (Optional) The property key for the target.
      * @returns An array of unique metadata keys.
      * @example
      *
      *     class Example {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     result = Reflect.getOwnMetadataKeys(Example);
      *
      *     // property (on constructor)
      *     result = Reflect.getOwnMetadataKeys(Example, "staticProperty");
      *
      *     // property (on prototype)
      *     result = Reflect.getOwnMetadataKeys(Example.prototype, "property");
      *
      *     // method (on constructor)
      *     result = Reflect.getOwnMetadataKeys(Example, "staticMethod");
      *
      *     // method (on prototype)
      *     result = Reflect.getOwnMetadataKeys(Example.prototype, "method");
      *
      */
    function getOwnMetadataKeys(target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryOwnMetadataKeys(target, propertyKey);
    }
    Reflect.getOwnMetadataKeys = getOwnMetadataKeys;
    /**
      * Deletes the metadata entry from the target object with the provided key.
      * @param metadataKey A key used to store and retrieve metadata.
      * @param target The target object on which the metadata is defined.
      * @param propertyKey (Optional) The property key for the target.
      * @returns `true` if the metadata entry was found and deleted; otherwise, false.
      * @example
      *
      *     class Example {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     result = Reflect.deleteMetadata("custom:annotation", Example);
      *
      *     // property (on constructor)
      *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticProperty");
      *
      *     // property (on prototype)
      *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "property");
      *
      *     // method (on constructor)
      *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticMethod");
      *
      *     // method (on prototype)
      *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "method");
      *
      */
    function deleteMetadata(metadataKey, target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        const metadataMap = GetOrCreateMetadataMap(target, propertyKey, /*Create*/ false);
        if (IsUndefined(metadataMap))
            return false;
        if (!metadataMap.delete(metadataKey))
            return false;
        if (metadataMap.size > 0)
            return true;
        const targetMetadata = Metadata.get(target);
        targetMetadata.delete(propertyKey);
        if (targetMetadata.size > 0)
            return true;
        Metadata.delete(target);
        return true;
    }
    Reflect.deleteMetadata = deleteMetadata;
    function DecorateConstructor(decorators, target) {
        for (let i = decorators.length - 1; i >= 0; --i) {
            const decorator = decorators[i];
            const decorated = decorator(target);
            if (!IsUndefined(decorated) && !IsNull(decorated)) {
                if (!IsConstructor(decorated))
                    throw new TypeError();
                target = decorated;
            }
        }
        return target;
    }
    function DecorateProperty(decorators, target, propertyKey, descriptor) {
        for (let i = decorators.length - 1; i >= 0; --i) {
            const decorator = decorators[i];
            const decorated = decorator(target, propertyKey, descriptor);
            if (!IsUndefined(decorated) && !IsNull(decorated)) {
                if (!IsObject(decorated))
                    throw new TypeError();
                descriptor = decorated;
            }
        }
        return descriptor;
    }
    function GetOrCreateMetadataMap(O, P, Create) {
        let targetMetadata = Metadata.get(O);
        if (IsUndefined(targetMetadata)) {
            if (!Create)
                return undefined;
            targetMetadata = new _Map();
            Metadata.set(O, targetMetadata);
        }
        let metadataMap = targetMetadata.get(P);
        if (IsUndefined(metadataMap)) {
            if (!Create)
                return undefined;
            metadataMap = new _Map();
            targetMetadata.set(P, metadataMap);
        }
        return metadataMap;
    }
    // 3.1.1.1 OrdinaryHasMetadata(MetadataKey, O, P)
    // https://rbuckton.github.io/reflect-metadata/#ordinaryhasmetadata
    function OrdinaryHasMetadata(MetadataKey, O, P) {
        const hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
        if (hasOwn)
            return true;
        const parent = OrdinaryGetPrototypeOf(O);
        if (!IsNull(parent))
            return OrdinaryHasMetadata(MetadataKey, parent, P);
        return false;
    }
    // 3.1.2.1 OrdinaryHasOwnMetadata(MetadataKey, O, P)
    // https://rbuckton.github.io/reflect-metadata/#ordinaryhasownmetadata
    function OrdinaryHasOwnMetadata(MetadataKey, O, P) {
        const metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
        if (IsUndefined(metadataMap))
            return false;
        return ToBoolean(metadataMap.has(MetadataKey));
    }
    // 3.1.3.1 OrdinaryGetMetadata(MetadataKey, O, P)
    // https://rbuckton.github.io/reflect-metadata/#ordinarygetmetadata
    function OrdinaryGetMetadata(MetadataKey, O, P) {
        const hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
        if (hasOwn)
            return OrdinaryGetOwnMetadata(MetadataKey, O, P);
        const parent = OrdinaryGetPrototypeOf(O);
        if (!IsNull(parent))
            return OrdinaryGetMetadata(MetadataKey, parent, P);
        return undefined;
    }
    // 3.1.4.1 OrdinaryGetOwnMetadata(MetadataKey, O, P)
    // https://rbuckton.github.io/reflect-metadata/#ordinarygetownmetadata
    function OrdinaryGetOwnMetadata(MetadataKey, O, P) {
        const metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
        if (IsUndefined(metadataMap))
            return undefined;
        return metadataMap.get(MetadataKey);
    }
    // 3.1.5.1 OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P)
    // https://rbuckton.github.io/reflect-metadata/#ordinarydefineownmetadata
    function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P) {
        const metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ true);
        metadataMap.set(MetadataKey, MetadataValue);
    }
    // 3.1.6.1 OrdinaryMetadataKeys(O, P)
    // https://rbuckton.github.io/reflect-metadata/#ordinarymetadatakeys
    function OrdinaryMetadataKeys(O, P) {
        const ownKeys = OrdinaryOwnMetadataKeys(O, P);
        const parent = OrdinaryGetPrototypeOf(O);
        if (parent === null)
            return ownKeys;
        const parentKeys = OrdinaryMetadataKeys(parent, P);
        if (parentKeys.length <= 0)
            return ownKeys;
        if (ownKeys.length <= 0)
            return parentKeys;
        const set = new _Set();
        const keys = [];
        for (const key of ownKeys) {
            const hasKey = set.has(key);
            if (!hasKey) {
                set.add(key);
                keys.push(key);
            }
        }
        for (const key of parentKeys) {
            const hasKey = set.has(key);
            if (!hasKey) {
                set.add(key);
                keys.push(key);
            }
        }
        return keys;
    }
    // 3.1.7.1 OrdinaryOwnMetadataKeys(O, P)
    // https://rbuckton.github.io/reflect-metadata/#ordinaryownmetadatakeys
    function OrdinaryOwnMetadataKeys(O, P) {
        const keys = [];
        const metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
        if (IsUndefined(metadataMap))
            return keys;
        const keysObj = metadataMap.keys();
        const iterator = GetIterator(keysObj);
        let k = 0;
        while (true) {
            const next = IteratorStep(iterator);
            if (!next) {
                keys.length = k;
                return keys;
            }
            const nextValue = IteratorValue(next);
            try {
                keys[k] = nextValue;
            }
            catch (e) {
                try {
                    IteratorClose(iterator);
                }
                finally {
                    throw e;
                }
            }
            k++;
        }
    }
    // 6 ECMAScript Data Typ0es and Values
    // https://tc39.github.io/ecma262/#sec-ecmascript-data-types-and-values
    function Type(x) {
        if (x === null)
            return 1 /* Null */;
        switch (typeof x) {
            case "undefined": return 0 /* Undefined */;
            case "boolean": return 2 /* Boolean */;
            case "string": return 3 /* String */;
            case "symbol": return 4 /* Symbol */;
            case "number": return 5 /* Number */;
            case "object": return x === null ? 1 /* Null */ : 6 /* Object */;
            default: return 6 /* Object */;
        }
    }
    // 6.1.1 The Undefined Type
    // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-undefined-type
    function IsUndefined(x) {
        return x === undefined;
    }
    // 6.1.2 The Null Type
    // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-null-type
    function IsNull(x) {
        return x === null;
    }
    // 6.1.5 The Symbol Type
    // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-symbol-type
    function IsSymbol(x) {
        return typeof x === "symbol";
    }
    // 6.1.7 The Object Type
    // https://tc39.github.io/ecma262/#sec-object-type
    function IsObject(x) {
        return typeof x === "object" ? x !== null : typeof x === "function";
    }
    // 7.1 Type Conversion
    // https://tc39.github.io/ecma262/#sec-type-conversion
    // 7.1.1 ToPrimitive(input [, PreferredType])
    // https://tc39.github.io/ecma262/#sec-toprimitive
    function ToPrimitive(input, PreferredType) {
        switch (Type(input)) {
            case 0 /* Undefined */: return input;
            case 1 /* Null */: return input;
            case 2 /* Boolean */: return input;
            case 3 /* String */: return input;
            case 4 /* Symbol */: return input;
            case 5 /* Number */: return input;
        }
        const hint = PreferredType === 3 /* String */ ? "string" : PreferredType === 5 /* Number */ ? "number" : "default";
        const exoticToPrim = GetMethod(input, toPrimitiveSymbol);
        if (exoticToPrim !== undefined) {
            const result = exoticToPrim.call(input, hint);
            if (IsObject(result))
                throw new TypeError();
            return result;
        }
        return OrdinaryToPrimitive(input, hint === "default" ? "number" : hint);
    }
    // 7.1.1.1 OrdinaryToPrimitive(O, hint)
    // https://tc39.github.io/ecma262/#sec-ordinarytoprimitive
    function OrdinaryToPrimitive(O, hint) {
        if (hint === "string") {
            const toString = O.toString;
            if (IsCallable(toString)) {
                const result = toString.call(O);
                if (!IsObject(result))
                    return result;
            }
            const valueOf = O.valueOf;
            if (IsCallable(valueOf)) {
                const result = valueOf.call(O);
                if (!IsObject(result))
                    return result;
            }
        }
        else {
            const valueOf = O.valueOf;
            if (IsCallable(valueOf)) {
                const result = valueOf.call(O);
                if (!IsObject(result))
                    return result;
            }
            const toString = O.toString;
            if (IsCallable(toString)) {
                const result = toString.call(O);
                if (!IsObject(result))
                    return result;
            }
        }
        throw new TypeError();
    }
    // 7.1.2 ToBoolean(argument)
    // https://tc39.github.io/ecma262/2016/#sec-toboolean
    function ToBoolean(argument) {
        return !!argument;
    }
    // 7.1.12 ToString(argument)
    // https://tc39.github.io/ecma262/#sec-tostring
    function ToString(argument) {
        return "" + argument;
    }
    // 7.1.14 ToPropertyKey(argument)
    // https://tc39.github.io/ecma262/#sec-topropertykey
    function ToPropertyKey(argument) {
        const key = ToPrimitive(argument, 3 /* String */);
        if (IsSymbol(key))
            return key;
        return ToString(key);
    }
    // 7.2 Testing and Comparison Operations
    // https://tc39.github.io/ecma262/#sec-testing-and-comparison-operations
    // 7.2.2 IsArray(argument)
    // https://tc39.github.io/ecma262/#sec-isarray
    function IsArray(argument) {
        return Array.isArray
            ? Array.isArray(argument)
            : argument instanceof Object
                ? argument instanceof Array
                : Object.prototype.toString.call(argument) === "[object Array]";
    }
    // 7.2.3 IsCallable(argument)
    // https://tc39.github.io/ecma262/#sec-iscallable
    function IsCallable(argument) {
        // NOTE: This is an approximation as we cannot check for [[Call]] internal method.
        return typeof argument === "function";
    }
    // 7.2.4 IsConstructor(argument)
    // https://tc39.github.io/ecma262/#sec-isconstructor
    function IsConstructor(argument) {
        // NOTE: This is an approximation as we cannot check for [[Construct]] internal method.
        return typeof argument === "function";
    }
    // 7.2.7 IsPropertyKey(argument)
    // https://tc39.github.io/ecma262/#sec-ispropertykey
    function IsPropertyKey(argument) {
        switch (Type(argument)) {
            case 3 /* String */: return true;
            case 4 /* Symbol */: return true;
            default: return false;
        }
    }
    // 7.3 Operations on Objects
    // https://tc39.github.io/ecma262/#sec-operations-on-objects
    // 7.3.9 GetMethod(V, P)
    // https://tc39.github.io/ecma262/#sec-getmethod
    function GetMethod(V, P) {
        const func = V[P];
        if (func === undefined || func === null)
            return undefined;
        if (!IsCallable(func))
            throw new TypeError();
        return func;
    }
    // 7.4 Operations on Iterator Objects
    // https://tc39.github.io/ecma262/#sec-operations-on-iterator-objects
    function GetIterator(obj) {
        const method = GetMethod(obj, iteratorSymbol);
        if (!IsCallable(method))
            throw new TypeError(); // from Call
        const iterator = method.call(obj);
        if (!IsObject(iterator))
            throw new TypeError();
        return iterator;
    }
    // 7.4.4 IteratorValue(iterResult)
    // https://tc39.github.io/ecma262/2016/#sec-iteratorvalue
    function IteratorValue(iterResult) {
        return iterResult.value;
    }
    // 7.4.5 IteratorStep(iterator)
    // https://tc39.github.io/ecma262/#sec-iteratorstep
    function IteratorStep(iterator) {
        const result = iterator.next();
        return result.done ? false : result;
    }
    // 7.4.6 IteratorClose(iterator, completion)
    // https://tc39.github.io/ecma262/#sec-iteratorclose
    function IteratorClose(iterator) {
        const f = iterator["return"];
        if (f)
            f.call(iterator);
    }
    // 9.1 Ordinary Object Internal Methods and Internal Slots
    // https://tc39.github.io/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots
    // 9.1.1.1 OrdinaryGetPrototypeOf(O)
    // https://tc39.github.io/ecma262/#sec-ordinarygetprototypeof
    function OrdinaryGetPrototypeOf(O) {
        const proto = Object.getPrototypeOf(O);
        if (typeof O !== "function" || O === functionPrototype)
            return proto;
        // TypeScript doesn't set __proto__ in ES5, as it's non-standard.
        // Try to determine the superclass constructor. Compatible implementations
        // must either set __proto__ on a subclass constructor to the superclass constructor,
        // or ensure each class has a valid `constructor` property on its prototype that
        // points back to the constructor.
        // If this is not the same as Function.[[Prototype]], then this is definately inherited.
        // This is the case when in ES6 or when using __proto__ in a compatible browser.
        if (proto !== functionPrototype)
            return proto;
        // If the super prototype is Object.prototype, null, or undefined, then we cannot determine the heritage.
        const prototype = O.prototype;
        const prototypeProto = prototype && Object.getPrototypeOf(prototype);
        if (prototypeProto == null || prototypeProto === Object.prototype)
            return proto;
        // If the constructor was not a function, then we cannot determine the heritage.
        const constructor = prototypeProto.constructor;
        if (typeof constructor !== "function")
            return proto;
        // If we have some kind of self-reference, then we cannot determine the heritage.
        if (constructor === O)
            return proto;
        // we have a pretty good guess at the heritage.
        return constructor;
    }
    // naive Map shim
    function CreateMapPolyfill() {
        const cacheSentinel = {};
        const arraySentinel = [];
        class MapIterator {
            constructor(keys, values, selector) {
                this._index = 0;
                this._keys = keys;
                this._values = values;
                this._selector = selector;
            }
            "@@iterator"() { return this; }
            [iteratorSymbol]() { return this; }
            next() {
                const index = this._index;
                if (index >= 0 && index < this._keys.length) {
                    const result = this._selector(this._keys[index], this._values[index]);
                    if (index + 1 >= this._keys.length) {
                        this._index = -1;
                        this._keys = arraySentinel;
                        this._values = arraySentinel;
                    }
                    else {
                        this._index++;
                    }
                    return { value: result, done: false };
                }
                return { value: undefined, done: true };
            }
            throw(error) {
                if (this._index >= 0) {
                    this._index = -1;
                    this._keys = arraySentinel;
                    this._values = arraySentinel;
                }
                throw error;
            }
            return(value) {
                if (this._index >= 0) {
                    this._index = -1;
                    this._keys = arraySentinel;
                    this._values = arraySentinel;
                }
                return { value: value, done: true };
            }
        }
        return class Map {
            constructor() {
                this._keys = [];
                this._values = [];
                this._cacheKey = cacheSentinel;
                this._cacheIndex = -2;
            }
            get size() { return this._keys.length; }
            has(key) { return this._find(key, /*insert*/ false) >= 0; }
            get(key) {
                const index = this._find(key, /*insert*/ false);
                return index >= 0 ? this._values[index] : undefined;
            }
            set(key, value) {
                const index = this._find(key, /*insert*/ true);
                this._values[index] = value;
                return this;
            }
            delete(key) {
                const index = this._find(key, /*insert*/ false);
                if (index >= 0) {
                    const size = this._keys.length;
                    for (let i = index + 1; i < size; i++) {
                        this._keys[i - 1] = this._keys[i];
                        this._values[i - 1] = this._values[i];
                    }
                    this._keys.length--;
                    this._values.length--;
                    if (key === this._cacheKey) {
                        this._cacheKey = cacheSentinel;
                        this._cacheIndex = -2;
                    }
                    return true;
                }
                return false;
            }
            clear() {
                this._keys.length = 0;
                this._values.length = 0;
                this._cacheKey = cacheSentinel;
                this._cacheIndex = -2;
            }
            keys() { return new MapIterator(this._keys, this._values, getKey); }
            values() { return new MapIterator(this._keys, this._values, getValue); }
            entries() { return new MapIterator(this._keys, this._values, getEntry); }
            "@@iterator"() { return this.entries(); }
            [iteratorSymbol]() { return this.entries(); }
            _find(key, insert) {
                if (this._cacheKey !== key) {
                    this._cacheIndex = this._keys.indexOf(this._cacheKey = key);
                }
                if (this._cacheIndex < 0 && insert) {
                    this._cacheIndex = this._keys.length;
                    this._keys.push(key);
                    this._values.push(undefined);
                }
                return this._cacheIndex;
            }
        };
        function getKey(key, _) {
            return key;
        }
        function getValue(_, value) {
            return value;
        }
        function getEntry(key, value) {
            return [key, value];
        }
    }
    // naive Set shim
    function CreateSetPolyfill() {
        return class Set {
            constructor() {
                this._map = new _Map();
            }
            get size() { return this._map.size; }
            has(value) { return this._map.has(value); }
            add(value) { return this._map.set(value, value), this; }
            delete(value) { return this._map.delete(value); }
            clear() { this._map.clear(); }
            keys() { return this._map.keys(); }
            values() { return this._map.values(); }
            entries() { return this._map.entries(); }
            "@@iterator"() { return this.keys(); }
            [iteratorSymbol]() { return this.keys(); }
        };
    }
    // naive WeakMap shim
    function CreateWeakMapPolyfill() {
        const UUID_SIZE = 16;
        const keys = HashMap.create();
        const rootKey = CreateUniqueKey();
        return class WeakMap {
            constructor() {
                this._key = CreateUniqueKey();
            }
            has(target) {
                const table = GetOrCreateWeakMapTable(target, /*create*/ false);
                return table !== undefined ? HashMap.has(table, this._key) : false;
            }
            get(target) {
                const table = GetOrCreateWeakMapTable(target, /*create*/ false);
                return table !== undefined ? HashMap.get(table, this._key) : undefined;
            }
            set(target, value) {
                const table = GetOrCreateWeakMapTable(target, /*create*/ true);
                table[this._key] = value;
                return this;
            }
            delete(target) {
                const table = GetOrCreateWeakMapTable(target, /*create*/ false);
                return table !== undefined ? delete table[this._key] : false;
            }
            clear() {
                // NOTE: not a real clear, just makes the previous data unreachable
                this._key = CreateUniqueKey();
            }
        };
        function CreateUniqueKey() {
            let key;
            do
                key = "@@WeakMap@@" + CreateUUID();
            while (HashMap.has(keys, key));
            keys[key] = true;
            return key;
        }
        function GetOrCreateWeakMapTable(target, create) {
            if (!hasOwn.call(target, rootKey)) {
                if (!create)
                    return undefined;
                Object.defineProperty(target, rootKey, { value: HashMap.create() });
            }
            return target[rootKey];
        }
        function FillRandomBytes(buffer, size) {
            for (let i = 0; i < size; ++i)
                buffer[i] = Math.random() * 0xff | 0;
            return buffer;
        }
        function GenRandomBytes(size) {
            if (typeof Uint8Array === "function") {
                if (typeof crypto !== "undefined")
                    return crypto.getRandomValues(new Uint8Array(size));
                if (typeof msCrypto !== "undefined")
                    return msCrypto.getRandomValues(new Uint8Array(size));
                return FillRandomBytes(new Uint8Array(size), size);
            }
            return FillRandomBytes(new Array(size), size);
        }
        function CreateUUID() {
            const data = GenRandomBytes(UUID_SIZE);
            // mark as random - RFC 4122 § 4.4
            data[6] = data[6] & 0x4f | 0x40;
            data[8] = data[8] & 0xbf | 0x80;
            let result = "";
            for (let offset = 0; offset < UUID_SIZE; ++offset) {
                const byte = data[offset];
                if (offset === 4 || offset === 6 || offset === 8)
                    result += "-";
                if (byte < 16)
                    result += "0";
                result += byte.toString(16).toLowerCase();
            }
            return result;
        }
    }
    // uses a heuristic used by v8 and chakra to force an object into dictionary mode.
    function MakeDictionary(obj) {
        obj.__ = undefined;
        delete obj.__;
        return obj;
    }
    // patch global Reflect
    (function (__global) {
        if (typeof __global.Reflect !== "undefined") {
            if (__global.Reflect !== Reflect) {
                for (const p in Reflect) {
                    if (hasOwn.call(Reflect, p)) {
                        __global.Reflect[p] = Reflect[p];
                    }
                }
            }
        }
        else {
            __global.Reflect = Reflect;
        }
    })(typeof global !== "undefined" ? global :
        typeof self !== "undefined" ? self :
            Function("return this;")());
})(Reflect || (Reflect = {}));
/// <reference path="../../node_modules/reflect-metadata/Reflect.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var DI;
    (function (DI) {
        /**
         * Implement this class to add custom registrations at runtime.
         * IRegistrator implementaion should be marked as @DI.injectable(DI.IRegistrator) to be resolved.
         **/
        class IRegistrator {
        }
        DI.IRegistrator = IRegistrator;
        /** Lifetime scope of the injected instance */
        var Scope;
        (function (Scope) {
            /** Global singleton instance - this is default value */
            Scope[Scope["SingleInstance"] = 0] = "SingleInstance";
            /** New instance per dependency */
            Scope[Scope["InstancePerDependency"] = 1] = "InstancePerDependency";
            /** The same as {SingleInstance} but won't ever create a new instance */
            Scope[Scope["ExistingInstance"] = 2] = "ExistingInstance";
        })(Scope = DI.Scope || (DI.Scope = {}));
        /**
         * RegistrationCompletedError would be thrown if
         * DependencyInjector.register method has been called after
         * DependencyInjector.resolve method had been called first time
         **/
        class RegistrationCompletedError extends Error {
            constructor() {
                super("Registration process has been completed. No more new registrations can be done.");
                Object.setPrototypeOf(this, RegistrationCompletedError.prototype);
            }
        }
        DI.RegistrationCompletedError = RegistrationCompletedError;
        /**
         * ResolveFailedError would be thrown if DependencyInjector could not resolve the requested abstraction
         **/
        class ResolveFailedError extends Error {
            constructor(abstraction) {
                super(`DependencyInjector could not resolve type: ${abstraction}.`);
                Object.setPrototypeOf(this, ResolveFailedError.prototype);
            }
        }
        DI.ResolveFailedError = ResolveFailedError;
        /**
         * Dependency Injector
         **/
        class DependencyInjector {
            /** Dependency Injector constructor */
            constructor() {
                this._registrations = new Map();
                this._resolvedInstances = new WeakMap();
            }
            /** Registers the implementaion of the abstract type
             * @param abstraction - Abstract type to be registered
             * @param implementaion - Constructor of the implementaion of the abstract type
             * @param parameterTypes - List of the parameter types of the constructor
             * @param scope - Lifetime scope of the implementaion instance
             **/
            register(abstraction, implementaion, parameterTypes = new Array(), scope = Scope.SingleInstance) {
                if (!this._registrationCompleted) {
                    this._registrations.set(abstraction, { implementaion: implementaion, parameterTypes: parameterTypes, scope: scope });
                }
                else {
                    throw new RegistrationCompletedError();
                }
            }
            /**
             * - Resolves specified type.
             * - When called first time tries to resolve IRegistrator to finish registration process.
             * - No more registrations can be added after that.
             * @param abstraction - abstract type to be resolved
             **/
            resolve(abstraction) {
                if (!this._registrationCompleted) {
                    this.resolveInternal(IRegistrator);
                    this._registrationCompleted = true;
                }
                let result = this.resolveInternal(abstraction);
                if (result !== undefined) {
                    return result;
                }
                else
                    throw new ResolveFailedError(abstraction);
            }
            resolveInternal(abstraction) {
                let implementaionOptions = this._registrations.get(abstraction), resolvedInstance;
                if (implementaionOptions) {
                    if (implementaionOptions.scope === Scope.SingleInstance || implementaionOptions.scope === Scope.ExistingInstance) {
                        resolvedInstance = this._resolvedInstances.get(abstraction);
                        if (resolvedInstance === undefined && implementaionOptions.scope === Scope.ExistingInstance) {
                            this._registrations.forEach((otherOptions, otherAbstraction) => {
                                if (resolvedInstance === undefined && otherOptions.implementaion === implementaionOptions.implementaion) {
                                    resolvedInstance = this._resolvedInstances.get(otherAbstraction);
                                }
                            });
                            if (resolvedInstance !== undefined) {
                                this._resolvedInstances.set(abstraction, resolvedInstance);
                            }
                        }
                    }
                    if (resolvedInstance === undefined && implementaionOptions.scope !== Scope.ExistingInstance) {
                        let resolvedParameters = implementaionOptions.parameterTypes.map(p => this.resolveInternal(p));
                        resolvedInstance = new implementaionOptions.implementaion(...resolvedParameters);
                        if (implementaionOptions.scope === Scope.SingleInstance) {
                            this._resolvedInstances.set(abstraction, resolvedInstance);
                        }
                    }
                    return resolvedInstance;
                }
                else if (abstraction === IRegistrator) {
                    return undefined;
                }
                throw new ResolveFailedError(abstraction);
            }
        }
        DI.DependencyInjector = DependencyInjector;
        /** Default Dependency Injector */
        DI.Container = new DependencyInjector();
        /** Marks the class as injectable.
         * @param abstraction - Current class implements this abstraction.
         * @param scope - Lifetime scope of the implementaion instance.
         **/
        function injectable(abstraction, scope = Scope.SingleInstance) {
            return (constructor) => {
                let constructorParameterTypes = Reflect.getMetadata("design:paramtypes", constructor);
                DI.Container.register(abstraction || constructor, constructor, constructorParameterTypes, scope);
            };
        }
        DI.injectable = injectable;
    })(DI = MidnightLizard.DI || (MidnightLizard.DI = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Settings;
    (function (Settings) {
        class IApplicationSettings {
        }
        Settings.IApplicationSettings = IApplicationSettings;
    })(Settings = MidnightLizard.Settings || (MidnightLizard.Settings = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
var Chrome;
(function (Chrome) {
    let ChromeApplicationSettings = class ChromeApplicationSettings {
        constructor(_rootDocument) {
            this._rootDocument = _rootDocument;
            if (chrome.runtime.id === "pbnndmlekkboofhnbonilimejonapojg") {
                this._isDebug = false;
            }
            else {
                this._isDebug = true;
            }
            this._preserveDisplay = /facebook/gi.test(_rootDocument.defaultView.location.hostname);
        }
        get isDebug() { return this._isDebug; }
        get preserveDisplay() { return this._preserveDisplay; }
        get version() { return chrome.runtime.getManifest().version; }
    };
    ChromeApplicationSettings = __decorate([
        MidnightLizard.DI.injectable(MidnightLizard.Settings.IApplicationSettings),
        __metadata("design:paramtypes", [Document])
    ], ChromeApplicationSettings);
})(Chrome || (Chrome = {}));
/// <reference path="../DI/-DI.ts" />
var Chrome;
(function (Chrome) {
    /**
     * ChromePromise
     */
    let ChromePromise = ChromePromise_1 = class ChromePromise {
        constructor() {
            this.fillProperties(chrome, this);
        }
        setPromiseFunction(fn, thisArg) {
            return (...args) => {
                return new Promise((resolve, reject) => {
                    Array.prototype.push.call(args, callback);
                    fn.apply(thisArg, args);
                    function callback(...results) {
                        let err = chrome.runtime.lastError;
                        if (err) {
                            reject(err);
                        }
                        else {
                            switch (results.length) {
                                case 0:
                                    resolve();
                                    break;
                                case 1:
                                    resolve(results[0]);
                                    break;
                                default:
                                    resolve(results);
                            }
                        }
                    }
                });
            };
        }
        fillProperties(source, target) {
            for (let key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    let val = source[key];
                    let type = typeof val;
                    if (type === 'object' && !(val instanceof ChromePromise_1)) {
                        target[key] = {};
                        this.fillProperties(val, target[key]);
                    }
                    else if (type === 'function') {
                        target[key] = this.setPromiseFunction(val, source);
                    }
                    else {
                        target[key] = val;
                    }
                }
            }
        }
    };
    ChromePromise = ChromePromise_1 = __decorate([
        MidnightLizard.DI.injectable(),
        __metadata("design:paramtypes", [])
    ], ChromePromise);
    Chrome.ChromePromise = ChromePromise;
    var Tabs;
    (function (Tabs) {
    })(Tabs || (Tabs = {}));
    var Runtime;
    (function (Runtime) {
    })(Runtime || (Runtime = {}));
    var Storage;
    (function (Storage) {
    })(Storage || (Storage = {}));
    var ChromePromise_1;
})(Chrome || (Chrome = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Settings;
    (function (Settings) {
        class IStorageManager {
        }
        Settings.IStorageManager = IStorageManager;
    })(Settings = MidnightLizard.Settings || (MidnightLizard.Settings = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="./ChromePromise.ts" />
/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/IStorageManager.ts" />
var Chrome;
(function (Chrome) {
    /**
     * ChromeStorage
     */
    let ChromeStorageManager = class ChromeStorageManager {
        constructor(chromePromise) {
            this.chromePromise = chromePromise;
        }
        set(obj) {
            return this.chromePromise.storage.local.set(obj);
        }
        get(key) {
            return this.chromePromise.storage.local.get(key);
        }
        clear() {
            return this.chromePromise.storage.local.clear();
        }
    };
    ChromeStorageManager = __decorate([
        MidnightLizard.DI.injectable(MidnightLizard.Settings.IStorageManager),
        __metadata("design:paramtypes", [Chrome.ChromePromise])
    ], ChromeStorageManager);
})(Chrome || (Chrome = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Settings;
    (function (Settings) {
        /**
         * ColorScheme - MidnightLizard Settings
         */
        class ColorScheme {
            constructor() { }
        }
        Settings.ColorScheme = ColorScheme;
    })(Settings = MidnightLizard.Settings || (MidnightLizard.Settings = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="./ColorScheme.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var Settings;
    (function (Settings) {
        /**
         * ColorSchemes
         */
        class ColorSchemes extends Settings.ColorScheme {
        }
        ColorSchemes.default = {
            settingsVersion: "",
            runOnThisSite: false,
            restoreColorsOnCopy: false,
            backgroundSaturationLimit: 100,
            backgroundContrast: 0,
            backgroundLightnessLimit: 100,
            backgroundGraySaturation: 0,
            backgroundGrayHue: 0,
            textSaturationLimit: 100,
            textContrast: 0,
            textLightnessLimit: 100,
            textGraySaturation: 0,
            textGrayHue: 0,
            borderSaturationLimit: 100,
            borderContrast: 0,
            borderLightnessLimit: 100,
            borderGraySaturation: 0,
            borderGrayHue: 0,
            imageLightnessLimit: 100,
            imageSaturationLimit: 100,
            backgroundImageLightnessLimit: 100,
            backgroundImageSaturationLimit: 100,
            scrollbarSaturationLimit: 0,
            scrollbarContrast: 0,
            scrollbarLightnessLimit: 100,
            scrollbarGrayHue: 0
        };
        ColorSchemes.original = {
            runOnThisSite: false,
            restoreColorsOnCopy: false,
            backgroundSaturationLimit: 100,
            backgroundContrast: 0,
            backgroundLightnessLimit: 100,
            backgroundGraySaturation: 0,
            backgroundGrayHue: 0,
            textSaturationLimit: 100,
            textContrast: 0,
            textLightnessLimit: 100,
            textGraySaturation: 0,
            textGrayHue: 0,
            borderSaturationLimit: 100,
            borderContrast: 0,
            borderLightnessLimit: 100,
            borderGraySaturation: 0,
            borderGrayHue: 0,
            imageLightnessLimit: 100,
            imageSaturationLimit: 100,
            backgroundImageLightnessLimit: 100,
            backgroundImageSaturationLimit: 100,
            scrollbarSaturationLimit: 0,
            scrollbarContrast: 0,
            scrollbarLightnessLimit: 100,
            scrollbarGrayHue: 0
        };
        ColorSchemes.dimmedDust = {
            runOnThisSite: true,
            restoreColorsOnCopy: false,
            backgroundSaturationLimit: 80,
            backgroundContrast: 50,
            backgroundLightnessLimit: 20,
            backgroundGraySaturation: 10,
            backgroundGrayHue: 200,
            textSaturationLimit: 80,
            textContrast: 54,
            textLightnessLimit: 80,
            textGraySaturation: 24,
            textGrayHue: 16,
            borderSaturationLimit: 80,
            borderContrast: 30,
            borderLightnessLimit: 50,
            borderGraySaturation: 20,
            borderGrayHue: 16,
            imageLightnessLimit: 80,
            imageSaturationLimit: 90,
            backgroundImageLightnessLimit: 40,
            backgroundImageSaturationLimit: 80,
            scrollbarSaturationLimit: 10,
            scrollbarContrast: 5,
            scrollbarLightnessLimit: 50,
            scrollbarGrayHue: 174
        };
        ColorSchemes.kappaDream = {
            runOnThisSite: true,
            restoreColorsOnCopy: false,
            backgroundSaturationLimit: 80,
            backgroundContrast: 50,
            backgroundLightnessLimit: 20,
            backgroundGraySaturation: 40,
            backgroundGrayHue: 122,
            textSaturationLimit: 80,
            textContrast: 55,
            textLightnessLimit: 90,
            textGraySaturation: 30,
            textGrayHue: 66,
            borderSaturationLimit: 80,
            borderContrast: 30,
            borderLightnessLimit: 50,
            borderGraySaturation: 20,
            borderGrayHue: 88,
            imageLightnessLimit: 80,
            imageSaturationLimit: 100,
            backgroundImageLightnessLimit: 40,
            backgroundImageSaturationLimit: 100,
            scrollbarSaturationLimit: 30,
            scrollbarContrast: 5,
            scrollbarLightnessLimit: 50,
            scrollbarGrayHue: 122
        };
        ColorSchemes.sunsetSails = {
            runOnThisSite: true,
            restoreColorsOnCopy: false,
            backgroundSaturationLimit: 80,
            backgroundContrast: 50,
            backgroundLightnessLimit: 20,
            backgroundGraySaturation: 40,
            backgroundGrayHue: 4,
            textSaturationLimit: 80,
            textContrast: 55,
            textLightnessLimit: 90,
            textGraySaturation: 20,
            textGrayHue: 45,
            borderSaturationLimit: 80,
            borderContrast: 30,
            borderLightnessLimit: 50,
            borderGraySaturation: 20,
            borderGrayHue: 14,
            imageLightnessLimit: 80,
            imageSaturationLimit: 100,
            backgroundImageLightnessLimit: 40,
            backgroundImageSaturationLimit: 100,
            scrollbarSaturationLimit: 30,
            scrollbarContrast: 5,
            scrollbarLightnessLimit: 50,
            scrollbarGrayHue: 36
        };
        ColorSchemes.morningMist = {
            runOnThisSite: true,
            restoreColorsOnCopy: false,
            backgroundSaturationLimit: 100,
            backgroundContrast: 50,
            backgroundLightnessLimit: 90,
            backgroundGraySaturation: 10,
            backgroundGrayHue: 200,
            textSaturationLimit: 100,
            textContrast: 60,
            textLightnessLimit: 95,
            textGraySaturation: 20,
            textGrayHue: 199,
            borderSaturationLimit: 100,
            borderContrast: 40,
            borderLightnessLimit: 95,
            borderGraySaturation: 20,
            borderGrayHue: 200,
            imageLightnessLimit: 90,
            imageSaturationLimit: 90,
            backgroundImageLightnessLimit: 90,
            backgroundImageSaturationLimit: 100,
            scrollbarSaturationLimit: 15,
            scrollbarContrast: 5,
            scrollbarLightnessLimit: 80,
            scrollbarGrayHue: 187
        };
        ColorSchemes.antiqueCodex = {
            runOnThisSite: true,
            restoreColorsOnCopy: false,
            backgroundSaturationLimit: 30,
            backgroundContrast: 50,
            backgroundLightnessLimit: 93,
            backgroundGraySaturation: 50,
            backgroundGrayHue: 45,
            textSaturationLimit: 80,
            textContrast: 80,
            textLightnessLimit: 100,
            textGraySaturation: 40,
            textGrayHue: 16,
            borderSaturationLimit: 80,
            borderContrast: 60,
            borderLightnessLimit: 100,
            borderGraySaturation: 40,
            borderGrayHue: 36,
            imageLightnessLimit: 93,
            imageSaturationLimit: 50,
            backgroundImageLightnessLimit: 93,
            backgroundImageSaturationLimit: 30,
            scrollbarSaturationLimit: 15,
            scrollbarContrast: 5,
            scrollbarLightnessLimit: 85,
            scrollbarGrayHue: 16
        };
        ColorSchemes.increasedContrast = {
            runOnThisSite: true,
            restoreColorsOnCopy: false,
            backgroundSaturationLimit: 100,
            backgroundContrast: 50,
            backgroundLightnessLimit: 100,
            backgroundGraySaturation: 0,
            backgroundGrayHue: 0,
            textSaturationLimit: 100,
            textContrast: 60,
            textLightnessLimit: 100,
            textGraySaturation: 40,
            textGrayHue: 16,
            borderSaturationLimit: 100,
            borderContrast: 55,
            borderLightnessLimit: 100,
            borderGraySaturation: 10,
            borderGrayHue: 16,
            imageLightnessLimit: 100,
            imageSaturationLimit: 100,
            backgroundImageLightnessLimit: 100,
            backgroundImageSaturationLimit: 100,
            scrollbarSaturationLimit: 0,
            scrollbarContrast: 5,
            scrollbarLightnessLimit: 80,
            scrollbarGrayHue: 0
        };
        ColorSchemes.grayscale = {
            runOnThisSite: true,
            restoreColorsOnCopy: false,
            backgroundSaturationLimit: 10,
            backgroundContrast: 50,
            backgroundLightnessLimit: 100,
            backgroundGraySaturation: 0,
            backgroundGrayHue: 0,
            textSaturationLimit: 10,
            textContrast: 60,
            textLightnessLimit: 100,
            textGraySaturation: 0,
            textGrayHue: 0,
            borderSaturationLimit: 10,
            borderContrast: 40,
            borderLightnessLimit: 100,
            borderGraySaturation: 0,
            borderGrayHue: 0,
            imageLightnessLimit: 100,
            imageSaturationLimit: 10,
            backgroundImageLightnessLimit: 100,
            backgroundImageSaturationLimit: 10,
            scrollbarSaturationLimit: 0,
            scrollbarContrast: 5,
            scrollbarLightnessLimit: 80,
            scrollbarGrayHue: 0
        };
        ColorSchemes.invertedLight = {
            runOnThisSite: true,
            restoreColorsOnCopy: false,
            backgroundSaturationLimit: 80,
            backgroundContrast: 50,
            backgroundLightnessLimit: 10,
            backgroundGraySaturation: 0,
            backgroundGrayHue: 0,
            textSaturationLimit: 80,
            textContrast: 50,
            textLightnessLimit: 70,
            textGraySaturation: 0,
            textGrayHue: 0,
            borderSaturationLimit: 80,
            borderContrast: 30,
            borderLightnessLimit: 70,
            borderGraySaturation: 0,
            borderGrayHue: 0,
            imageLightnessLimit: 75,
            imageSaturationLimit: 100,
            backgroundImageLightnessLimit: 40,
            backgroundImageSaturationLimit: 100,
            scrollbarSaturationLimit: 0,
            scrollbarContrast: 5,
            scrollbarLightnessLimit: 50,
            scrollbarGrayHue: 0
        };
        ColorSchemes.invertedGrayscale = {
            runOnThisSite: true,
            restoreColorsOnCopy: false,
            backgroundSaturationLimit: 10,
            backgroundContrast: 50,
            backgroundLightnessLimit: 10,
            backgroundGraySaturation: 0,
            backgroundGrayHue: 0,
            textSaturationLimit: 10,
            textContrast: 50,
            textLightnessLimit: 80,
            textGraySaturation: 0,
            textGrayHue: 0,
            borderSaturationLimit: 10,
            borderContrast: 30,
            borderLightnessLimit: 50,
            borderGraySaturation: 0,
            borderGrayHue: 0,
            imageLightnessLimit: 75,
            imageSaturationLimit: 10,
            backgroundImageLightnessLimit: 30,
            backgroundImageSaturationLimit: 10,
            scrollbarSaturationLimit: 0,
            scrollbarContrast: 5,
            scrollbarLightnessLimit: 50,
            scrollbarGrayHue: 0
        };
        ColorSchemes.yellowOnBlack = {
            runOnThisSite: true,
            restoreColorsOnCopy: false,
            backgroundSaturationLimit: 80,
            backgroundContrast: 50,
            backgroundLightnessLimit: 10,
            backgroundGraySaturation: 0,
            backgroundGrayHue: 0,
            textSaturationLimit: 80,
            textContrast: 50,
            textLightnessLimit: 80,
            textGraySaturation: 60,
            textGrayHue: 54,
            borderSaturationLimit: 80,
            borderContrast: 40,
            borderLightnessLimit: 70,
            borderGraySaturation: 50,
            borderGrayHue: 54,
            imageLightnessLimit: 75,
            imageSaturationLimit: 100,
            backgroundImageLightnessLimit: 40,
            backgroundImageSaturationLimit: 100,
            scrollbarSaturationLimit: 40,
            scrollbarContrast: 5,
            scrollbarLightnessLimit: 50,
            scrollbarGrayHue: 54
        };
        ColorSchemes.greenOnBlack = {
            runOnThisSite: true,
            restoreColorsOnCopy: false,
            backgroundSaturationLimit: 80,
            backgroundContrast: 50,
            backgroundLightnessLimit: 10,
            backgroundGraySaturation: 0,
            backgroundGrayHue: 0,
            textSaturationLimit: 80,
            textContrast: 50,
            textLightnessLimit: 80,
            textGraySaturation: 60,
            textGrayHue: 122,
            borderSaturationLimit: 80,
            borderContrast: 40,
            borderLightnessLimit: 70,
            borderGraySaturation: 50,
            borderGrayHue: 122,
            imageLightnessLimit: 75,
            imageSaturationLimit: 100,
            backgroundImageLightnessLimit: 40,
            backgroundImageSaturationLimit: 100,
            scrollbarSaturationLimit: 40,
            scrollbarContrast: 5,
            scrollbarLightnessLimit: 50,
            scrollbarGrayHue: 122
        };
        Settings.ColorSchemes = ColorSchemes;
    })(Settings = MidnightLizard.Settings || (MidnightLizard.Settings = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="../DI/-DI.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var Cookies;
    (function (Cookies) {
        class ICookiesManager {
        }
        Cookies.ICookiesManager = ICookiesManager;
        /**
         * CookiesManager
         */
        let CookiesManager = class CookiesManager {
            constructor(_document) {
                this._document = _document;
            }
            getCookie(name) {
                let i, x, y, arrCookies = this._document.cookie.split(";");
                for (i = 0; i < arrCookies.length; i++) {
                    x = arrCookies[i].substr(0, arrCookies[i].indexOf("="));
                    y = arrCookies[i].substr(arrCookies[i].indexOf("=") + 1);
                    x = x.replace(/^\s+|\s+$/g, "");
                    if (x == name) {
                        return unescape(y);
                    }
                }
                return null;
            }
            setCookie(name, value, exdays = 1) {
                if (value !== undefined) {
                    let date = new Date();
                    date.setTime(date.getTime() + (exdays * 24 * 60 * 60 * 1000));
                    let record = escape(value) + ";expires=" + date.toUTCString() + ";domain=" + this._document.location.hostname + ";path=/";
                    this._document.cookie = name + "=" + record;
                }
            }
            deleteCookieByName(name) {
                this.setCookie(name, '', 0);
            }
            deleteCookieByRegExp(regExp) {
                let forDelete = this._document.cookie.match(regExp);
                forDelete && forDelete.forEach(cn => this.deleteCookieByName(cn));
            }
        };
        CookiesManager = __decorate([
            MidnightLizard.DI.injectable(ICookiesManager),
            __metadata("design:paramtypes", [Document])
        ], CookiesManager);
    })(Cookies = MidnightLizard.Cookies || (MidnightLizard.Cookies = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Util;
    (function (Util) {
        /** ([1,2,3,4,5], 2) => [ [1,2], [3,4], [5] ] */
        function sliceIntoChunks(array, chunk) {
            return array.reduce((ar, it, i) => {
                const ix = Math.floor(i / chunk);
                if (!ar[ix])
                    ar[ix] = [];
                ar[ix].push(it);
                return ar;
            }, []);
        }
        Util.sliceIntoChunks = sliceIntoChunks;
    })(Util = MidnightLizard.Util || (MidnightLizard.Util = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Util;
    (function (Util) {
        const UUID_SIZE = 16;
        function FillRandomBytes(buffer, size) {
            for (let i = 0; i < size; ++i) {
                buffer[i] = Math.random() * 0xff | 0;
            }
            return buffer;
        }
        function GenRandomBytes(size) {
            if (typeof Uint8Array === "function") {
                if (typeof crypto !== "undefined")
                    return crypto.getRandomValues(new Uint8Array(size));
                if (typeof msCrypto !== "undefined")
                    return msCrypto.getRandomValues(new Uint8Array(size));
                return FillRandomBytes(new Uint8Array(size), size);
            }
            return FillRandomBytes(new Array(size), size);
        }
        function guid(separator = "-") {
            const data = GenRandomBytes(UUID_SIZE);
            // mark as random - RFC 4122 § 4.4
            data[6] = data[6] & 0x4f | 0x40;
            data[8] = data[8] & 0xbf | 0x80;
            let result = "";
            for (let offset = 0; offset < UUID_SIZE; ++offset) {
                const byte = data[offset];
                if (offset === 4 || offset === 6 || offset === 8) {
                    result += separator;
                }
                if (byte < 16) {
                    result += "0";
                }
                result += byte.toString(16).toLowerCase();
            }
            return result;
        }
        Util.guid = guid;
    })(Util = MidnightLizard.Util || (MidnightLizard.Util = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Util;
    (function (Util) {
        function group(object, by) {
            let result = {};
            for (let key in object) {
                let value = object[key];
                let gr = by(value, key);
                if (!result[gr])
                    result[gr] = [];
                result[gr].push(value);
            }
            return result;
        }
        Util.group = group;
        function find(object, predicate) {
            for (let key in object) {
                let value = object[key];
                if (predicate(value, key)) {
                    return value;
                }
            }
            return null;
        }
        Util.find = find;
        function filter(object, predicate) {
            let arr = new Array();
            for (let key in object) {
                let value = object[key];
                if (predicate(value, key)) {
                    arr.push(value);
                }
            }
            return arr;
        }
        Util.filter = filter;
    })(Util = MidnightLizard.Util || (MidnightLizard.Util = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Util;
    (function (Util) {
        function forEachPromise(arrayOfParams, action, initialDelay = 0, getNextDelay) {
            let fePromise = null;
            let lastDelay = initialDelay;
            arrayOfParams.forEach((params, index) => {
                lastDelay = getNextDelay ? getNextDelay(lastDelay, index) : lastDelay;
                fePromise = Promise
                    .all([action, lastDelay, params, fePromise])
                    .then(([act, delay, params, prev]) => {
                    params && params.push(prev);
                    return setTimeoutPromise(act, delay, params);
                });
            });
            return fePromise;
        }
        Util.forEachPromise = forEachPromise;
        function setTimeoutPromise(action, delay, params) {
            params && params.push(delay);
            return new Promise((resolve, reject) => {
                if (delay) {
                    setTimeout((r, a, p) => p ? r(a(...p)) : r(a()), delay, resolve, action, params);
                }
                else {
                    params ? resolve(action(...params)) : resolve(action());
                }
            });
        }
        Util.setTimeoutPromise = setTimeoutPromise;
        var PromiseStatus;
        (function (PromiseStatus) {
            PromiseStatus[PromiseStatus["Success"] = 0] = "Success";
            PromiseStatus[PromiseStatus["Failure"] = 1] = "Failure";
        })(PromiseStatus = Util.PromiseStatus || (Util.PromiseStatus = {}));
        class HandledPromiseResult {
            constructor(status, data) {
                this.status = status;
                this.data = data;
            }
        }
        Util.HandledPromiseResult = HandledPromiseResult;
        /** Handles promise results in order to be safely used inside Promise.all so one failure would not stop the process */
        function handlePromise(promise) {
            return promise.then(result => new HandledPromiseResult(PromiseStatus.Success, result), error => new HandledPromiseResult(PromiseStatus.Failure));
        }
        Util.handlePromise = handlePromise;
    })(Util = MidnightLizard.Util || (MidnightLizard.Util = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Util;
    (function (Util) {
        function escapeRegex(str) {
            return str.replace(/[\[\](){}?*+\^\$\\\.|\-]/g, "\\$&");
        }
        Util.escapeRegex = escapeRegex;
        function trim(str, characters, flags = "gi") {
            characters = escapeRegex(characters);
            return str.replace(new RegExp("^[" + characters + "]+|[" + characters + "]+$", flags), '');
        }
        Util.trim = trim;
        function hashCode(str) {
            let hash = 0, chr, len;
            if (str && str.length !== 0) {
                for (let i = 0, len = str.length; i < len; i++) {
                    chr = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + chr;
                    hash = hash | 0; // Convert to 32bit integer
                }
            }
            return hash;
        }
        Util.hashCode = hashCode;
    })(Util = MidnightLizard.Util || (MidnightLizard.Util = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Util;
    (function (Util) {
        /** Name of type {boolean} */
        Util.BOOL = Boolean.name.toLowerCase();
        /** Name of type {number} */
        Util.NUM = Number.name.toLowerCase();
        /** Name of type {string} */
        Util.STR = String.name.toLowerCase();
        /** {number} type guard */
        function isNum(arg) {
            return typeof arg === Util.NUM;
        }
        Util.isNum = isNum;
        /** {string} type guard */
        function isStr(arg) {
            return typeof arg === Util.STR;
        }
        Util.isStr = isStr;
        /** {boolean} type guard */
        function isBool(arg) {
            return typeof arg === Util.BOOL;
        }
        Util.isBool = isBool;
    })(Util = MidnightLizard.Util || (MidnightLizard.Util = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Util;
    (function (Util) {
        function getEnumValues(enumType) {
            return Object.keys(enumType)
                .map(key => enumType[key])
                .filter(key => !isNaN(Number(key)));
        }
        Util.getEnumValues = getEnumValues;
    })(Util = MidnightLizard.Util || (MidnightLizard.Util = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Util;
    (function (Util) {
        var RegExpBuilder;
        (function (RegExpBuilder) {
            let capturingGroupsCount = 0;
            /** Resets index counter for the capturing groups */
            function resetCapturingGroups() {
                capturingGroupsCount = 0;
            }
            RegExpBuilder.resetCapturingGroups = resetCapturingGroups;
            /** Returns a new index for the next capturing group */
            function Next() {
                return ++capturingGroupsCount;
            }
            RegExpBuilder.Next = Next;
            /** Returns index of the last capturing group */
            function Last() {
                return capturingGroupsCount || undefined;
            }
            RegExpBuilder.Last = Last;
            RegExpBuilder.Or = "|", RegExpBuilder.OR = RegExpBuilder.Or;
            RegExpBuilder.BeginningOfLine = "^", RegExpBuilder.BOF = RegExpBuilder.BeginningOfLine;
            RegExpBuilder.EndOfLine = "$", RegExpBuilder.EOL = RegExpBuilder.EndOfLine;
            RegExpBuilder.WhiteSpace = "\\s", RegExpBuilder.WSP = RegExpBuilder.WhiteSpace;
            RegExpBuilder.NotWhiteSpace = "\\S", RegExpBuilder.NWSP = RegExpBuilder.NotWhiteSpace;
            RegExpBuilder.Word = "\\w", RegExpBuilder.WRD = RegExpBuilder.Word;
            RegExpBuilder.NotWord = "\\W", RegExpBuilder.NWRD = RegExpBuilder.NotWord;
            RegExpBuilder.AnyCharacter = ".", RegExpBuilder.ACH = RegExpBuilder.AnyCharacter, RegExpBuilder.Whatever = RegExpBuilder.ACH;
            RegExpBuilder.Dot = "\\.", RegExpBuilder.DOT = RegExpBuilder.Dot;
            RegExpBuilder.Comma = ",", RegExpBuilder.COM = RegExpBuilder.Comma;
            RegExpBuilder.Hash = "#", RegExpBuilder.HSH = RegExpBuilder.Hash;
            RegExpBuilder.Colon = ":", RegExpBuilder.CLN = RegExpBuilder.Colon;
            RegExpBuilder.Minus = "\\-", RegExpBuilder.MNS = RegExpBuilder.Minus;
            RegExpBuilder.LeftParenthesis = "\\(", RegExpBuilder.LPR = RegExpBuilder.LeftParenthesis;
            RegExpBuilder.RightParenthesis = "\\)", RegExpBuilder.RPR = RegExpBuilder.RightParenthesis;
            RegExpBuilder.LeftBrace = "\\{", RegExpBuilder.LBR = RegExpBuilder.LeftBrace;
            RegExpBuilder.RightBrace = "\\}", RegExpBuilder.RBR = RegExpBuilder.RightBrace;
            RegExpBuilder.LeftBracket = "\\[", RegExpBuilder.LBK = RegExpBuilder.LeftBracket;
            RegExpBuilder.RightBracket = "\\]", RegExpBuilder.RBK = RegExpBuilder.RightBracket;
            RegExpBuilder.WordBoundary = "\\b", RegExpBuilder.WBN = RegExpBuilder.WordBoundary;
            RegExpBuilder.NotWordBoundary = "\\B", RegExpBuilder.NWBN = RegExpBuilder.NotWordBoundary;
            RegExpBuilder.Digit = "\\d", RegExpBuilder.DGT = RegExpBuilder.Digit;
            RegExpBuilder.NotDigit = "\\D", RegExpBuilder.NDGT = RegExpBuilder.NotDigit;
            RegExpBuilder.NewLine = "\\n", RegExpBuilder.NLN = RegExpBuilder.NewLine;
            RegExpBuilder.CarriageReturn = "\r", RegExpBuilder.CRT = RegExpBuilder.CarriageReturn;
            /** Returns: ${varName} */
            function $var(varName) {
                return `$\{${varName}}`;
            }
            RegExpBuilder.$var = $var;
            /** Replaces all variables with its values */
            function applyVars(exp, vars) {
                let result = exp;
                vars.forEach((varValue, varName) => result = result.replace(RegExp(escape($var(varName)), "g"), varValue));
                return result;
            }
            RegExpBuilder.applyVars = applyVars;
            /** Excapes reserved symbols from the input string */
            RegExpBuilder.char = escape;
            /** Excapes reserved symbols from the input string */
            function escape(str) {
                return str.replace(/[\[\](){}?*+\^\$\\\.|\-]/g, "\\$&");
            }
            RegExpBuilder.escape = escape;
            /** Removes extra white spaces and trims the input string */
            function shrink(str) {
                return str ? str.replace(/\s(?=(\s+))/g, "").trim() : "";
            }
            RegExpBuilder.shrink = shrink;
            /** Returns: _exp1_|_exp2_|...|_expN_ */
            function or(...arrayOfExpressions) {
                return arrayOfExpressions.join("|");
            }
            RegExpBuilder.or = or;
            /** Returns: _exp1__exp2__exp3...expN_ */
            RegExpBuilder.join = and, RegExpBuilder.combine = and;
            /** Returns: _exp1__exp2__exp3...expN_ */
            function and(...arrayOfExpressions) {
                return arrayOfExpressions.join("");
            }
            RegExpBuilder.and = and;
            /** Returns: [_charSet_] */
            RegExpBuilder.oneOf = fromSet;
            /** Returns: [_charSet_] */
            function fromSet(...charSet) {
                return `[${charSet.join("")}]`;
            }
            RegExpBuilder.fromSet = fromSet;
            /** Returns: [^_charSet_] */
            function outOfSet(...charSet) {
                return `[^${charSet.join("")}]`;
            }
            RegExpBuilder.outOfSet = outOfSet;
            /** Returns: _exp_** */
            RegExpBuilder.anytime = any;
            /** Returns: _exp_** */
            function any(exp) {
                return `${exp}*`;
            }
            RegExpBuilder.any = any;
            /** Returns: _exp_+ */
            RegExpBuilder.sometime = some;
            /** Returns: _exp_+ */
            function some(exp) {
                return `${exp}+`;
            }
            RegExpBuilder.some = some;
            /** Returns: _exp_? */
            RegExpBuilder.neverOrOnce = noneOrOne;
            /** Returns: _exp_? */
            function noneOrOne(exp) {
                return `${exp}?`;
            }
            RegExpBuilder.noneOrOne = noneOrOne;
            /** Returns: _exp_ { _occurs_ } */
            function exactly(occurs, exp) {
                return `${exp}{${occurs}}`;
            }
            RegExpBuilder.exactly = exactly;
            /** Returns: _exp_ __{__ _minOccurs_ __,__ _maxOccurs_ __}__ */
            function strictly(minOccurs, maxOccurs, exp) {
                return `${exp}{${minOccurs},${maxOccurs}}`;
            }
            RegExpBuilder.strictly = strictly;
            /** Returns: (_exps_) */
            function remember(...exps) {
                return `(${exps.join("")})`;
            }
            RegExpBuilder.remember = remember;
            /** Returns: (?:_exps_) */
            function forget(...exps) {
                return `(?:${exps.join("")})`;
            }
            RegExpBuilder.forget = forget;
            /** Returns: (?=_exps_) */
            function followedBy(...exps) {
                return `(?=${exps.join("")})`;
            }
            RegExpBuilder.followedBy = followedBy;
            /** Returns: (?!_exps_) */
            function notFollowedBy(...exps) {
                return `(?!${exps.join("")})`;
            }
            RegExpBuilder.notFollowedBy = notFollowedBy;
            /** Returns: (?=(_exps_))\index */
            function succeededBy(index, ...exps) {
                return `(?=(${exps.join("")}))\\${index}`;
            }
            RegExpBuilder.succeededBy = succeededBy;
            /** Returns: \b_exps_\b */
            function wholeWord(...exps) {
                return `\\b${exps.join("")}\\b`;
            }
            RegExpBuilder.wholeWord = wholeWord;
            /** Returns: ^_exps_$ */
            RegExpBuilder.completely = wholeString;
            /** Returns: ^_exps_$ */
            function wholeString(...exps) {
                return `^${exps.join("")}$`;
            }
            RegExpBuilder.wholeString = wholeString;
            function somethingIn(left, right) {
                left = escape(left);
                right = escape(right);
                return `${left}[^${right}]+${right}`;
            }
            RegExpBuilder.somethingIn = somethingIn;
            /** \\__(__[^\\__)__]+\\__)__ */
            RegExpBuilder.SomethingInParentheses = somethingIn("(", ")");
            /** \\__{__[^\\__}__]+\\__}__ */
            RegExpBuilder.SomethingInBraces = somethingIn("{", "}");
            /** \\__[__[^\\__]__]+\\__]__ */
            RegExpBuilder.SomethingInBrackets = somethingIn("[", "]");
            /** __<__[^__>__]+__>__ */
            RegExpBuilder.SomethingInChevrons = somethingIn("<", ">");
            /** [\\w\\-] */
            RegExpBuilder.Literal = fromSet(RegExpBuilder.Word, RegExpBuilder.Minus);
        })(RegExpBuilder = Util.RegExpBuilder || (Util.RegExpBuilder = {}));
    })(Util = MidnightLizard.Util || (MidnightLizard.Util = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="./Array.ts" />
/// <reference path="./Guid.ts" />
/// <reference path="./Object.ts" />
/// <reference path="./Promise.ts" />
/// <reference path="./String.ts" />
/// <reference path="./TypeGuards.ts" />
/// <reference path="./Enum.ts" />
/// <reference path="./RegExp.ts" />
/// <reference path="./IEventHandler.ts" />
/// <reference path="./Event.ts" />
/// <reference path="../Utils/-Utils.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var Events;
    (function (Events) {
        class ArgumentedEventDispatcher {
            constructor() {
                this._handlers = new Map();
                this.event = new Events.ArgumentedEvent(this);
            }
            addListener(handler, thisArg, priority = Events.EventHandlerPriority.Normal, ...args) {
                this.removeListener(handler, thisArg);
                let handlersInPriority = this._handlers.get(priority);
                if (handlersInPriority === undefined) {
                    handlersInPriority = new Map();
                    this._handlers.set(priority, handlersInPriority);
                }
                let handlersInContext = handlersInPriority.get(thisArg);
                if (handlersInContext === undefined) {
                    handlersInContext = new Map();
                    handlersInPriority.set(thisArg, handlersInContext);
                }
                let boundHandler = thisArg || args.length > 0 ? handler.bind(thisArg, ...args) : handler;
                handlersInContext.set(handler, boundHandler);
                return boundHandler;
            }
            removeListener(handler, thisArg) {
                this._handlers.forEach((handlersInPriority, priority) => {
                    let handlersInContext = handlersInPriority.get(thisArg);
                    if (handlersInContext !== undefined) {
                        handlersInContext.delete(handler);
                        if (handlersInContext.size === 0) {
                            handlersInPriority.delete(thisArg);
                            if (handlersInPriority.size === 0) {
                                this._handlers.delete(priority);
                            }
                        }
                    }
                });
            }
            removeAllListeners() {
                this._handlers.clear();
            }
            raise(eventArgs) {
                let keys = new Set(this._handlers.keys());
                MidnightLizard.Util.getEnumValues(Events.EventHandlerPriority)
                    .filter(priority => keys.has(priority))
                    .map(priority => { return { priority: priority, contexts: this._handlers.get(priority) }; })
                    .forEach(x => x.priority == Events.EventHandlerPriority.After
                    ? setTimeout(([ctxt, ea, $this]) => $this.executeHandler(ctxt, ea), 1, x.contexts, eventArgs, this)
                    : this.executeHandler(x.contexts, eventArgs));
            }
            executeHandler(contexts, eventArgs) {
                contexts.forEach(contexts => contexts.forEach(boundHandler => boundHandler(eventArgs)));
            }
        }
        Events.ArgumentedEventDispatcher = ArgumentedEventDispatcher;
        class ResponsiveEventDispatcher {
            constructor() {
                this._handlers = new Map();
                this.event = new Events.ResponsiveEvent(this);
            }
            addListener(handler, thisArg, priority = Events.EventHandlerPriority.Normal, ...args) {
                this.removeListener(handler, thisArg);
                let handlersInPriority = this._handlers.get(priority);
                if (handlersInPriority === undefined) {
                    handlersInPriority = new Map();
                    this._handlers.set(priority, handlersInPriority);
                }
                let handlersInContext = handlersInPriority.get(thisArg);
                if (handlersInContext === undefined) {
                    handlersInContext = new Map();
                    handlersInPriority.set(thisArg, handlersInContext);
                }
                let boundHandler = thisArg || args.length > 0 ? handler.bind(thisArg, ...args) : handler;
                handlersInContext.set(handler, boundHandler);
                return boundHandler;
            }
            removeListener(handler, thisArg) {
                this._handlers.forEach((handlersInPriority, priority) => {
                    let handlersInContext = handlersInPriority.get(thisArg);
                    if (handlersInContext !== undefined) {
                        handlersInContext.delete(handler);
                        if (handlersInContext.size === 0) {
                            handlersInPriority.delete(thisArg);
                            if (handlersInPriority.size === 0) {
                                this._handlers.delete(priority);
                            }
                        }
                    }
                });
            }
            removeAllListeners() {
                this._handlers.clear();
            }
            raise(response, eventArgs) {
                let keys = new Set(this._handlers.keys());
                MidnightLizard.Util.getEnumValues(Events.EventHandlerPriority)
                    .filter(priority => keys.has(priority))
                    .map(priority => { return { priority: priority, contexts: this._handlers.get(priority) }; })
                    .forEach(x => x.priority == Events.EventHandlerPriority.After
                    ? setTimeout(([ctxt, resp, ea, $this]) => $this.executeHandler(ctxt, resp, ea), 1, x.contexts, response, eventArgs, this)
                    : this.executeHandler(x.contexts, response, eventArgs));
            }
            executeHandler(contexts, response, eventArgs) {
                contexts.forEach(context => context.forEach(boundHandler => boundHandler(response, eventArgs)));
            }
        }
        Events.ResponsiveEventDispatcher = ResponsiveEventDispatcher;
    })(Events = MidnightLizard.Events || (MidnightLizard.Events = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="./IEventHandler.ts" />
/// <reference path="./EventDispatcher.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var Events;
    (function (Events) {
        var EventHandlerPriority;
        (function (EventHandlerPriority) {
            /** Handlers with this priority will be called first of all */
            EventHandlerPriority[EventHandlerPriority["High"] = 1] = "High";
            /** Handlers with this priority will be called right after handlers with {High} priority */
            EventHandlerPriority[EventHandlerPriority["Normal"] = 2] = "Normal";
            /** Handlers with this priority will be called right after handlers with {Normal} priority */
            EventHandlerPriority[EventHandlerPriority["Low"] = 3] = "Low";
            /** Handlers with this priority will be called after all others whithin {setTimeout} 1ms */
            EventHandlerPriority[EventHandlerPriority["After"] = 4] = "After";
        })(EventHandlerPriority = Events.EventHandlerPriority || (Events.EventHandlerPriority = {}));
        /**
         * Event
         */
        class ArgumentedEvent {
            constructor(_dispatcher) {
                this._dispatcher = _dispatcher;
            }
            addListener(handler, thisArg, priority = EventHandlerPriority.Normal, ...args) {
                return this._dispatcher.addListener(handler, thisArg, priority, ...args);
            }
            removeListener(handler, thisArg) {
                this._dispatcher.removeListener(handler, thisArg);
            }
            removeAllListeners() {
                this._dispatcher.removeAllListeners();
            }
        }
        Events.ArgumentedEvent = ArgumentedEvent;
        class ResponsiveEvent {
            constructor(dispatcher) {
                this.dispatcher = dispatcher;
            }
            addListener(handler, thisArg, priority = EventHandlerPriority.Normal, ...args) {
                this.dispatcher.addListener(handler, thisArg, priority, ...args);
            }
            removeListener(handler, thisArg) {
                this.dispatcher.removeListener(handler, thisArg);
            }
            removeAllListeners() {
                this.dispatcher.removeAllListeners();
            }
        }
        Events.ResponsiveEvent = ResponsiveEvent;
    })(Events = MidnightLizard.Events || (MidnightLizard.Events = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Events;
    (function (Events) {
        let _handlers = new WeakMap();
        class HtmlEvent {
            static addEventListener(target, type, listener, thisArg, useCapture, ...args) {
                HtmlEvent.removeEventListener(target, type, listener);
                let handlersOnTarget = _handlers.get(target);
                if (handlersOnTarget === undefined) {
                    handlersOnTarget = new Map();
                    _handlers.set(target, handlersOnTarget);
                }
                let handlersOfType = handlersOnTarget.get(type);
                if (handlersOfType === undefined) {
                    handlersOfType = new Map();
                    handlersOnTarget.set(type, handlersOfType);
                }
                let boundHandler = thisArg || args.length > 0 ? listener.bind(thisArg, ...args) : listener;
                handlersOfType.set(listener, boundHandler);
                target.addEventListener(type, boundHandler, useCapture);
                return boundHandler;
            }
            static removeEventListener(target, type, listener) {
                let handlersOnTarget = _handlers.get(target);
                if (handlersOnTarget !== undefined) {
                    let handlersOfType = handlersOnTarget.get(type);
                    if (handlersOfType !== undefined) {
                        let boundHandler = handlersOfType.get(listener);
                        if (boundHandler !== undefined) {
                            target.removeEventListener(type, boundHandler, true);
                            target.removeEventListener(type, boundHandler, false);
                            handlersOfType.delete(listener);
                            if (handlersOfType.size === 0) {
                                handlersOnTarget.delete(type);
                                if (handlersOnTarget.size === 0) {
                                    _handlers.delete(target);
                                }
                            }
                        }
                    }
                }
            }
            static removeAllEventListeners(target, type) {
                let handlersOnTarget = _handlers.get(target);
                if (handlersOnTarget !== undefined) {
                    for (let tp of type ? [type] : handlersOnTarget.keys()) {
                        let handlersOfType = handlersOnTarget.get(tp);
                        if (handlersOfType !== undefined) {
                            for (let boundHandler of handlersOfType.values()) {
                                target.removeEventListener(tp, boundHandler, true);
                                target.removeEventListener(tp, boundHandler, false);
                            }
                            handlersOfType.clear();
                            handlersOnTarget.delete(tp);
                        }
                    }
                }
            }
        }
        Events.HtmlEvent = HtmlEvent;
    })(Events = MidnightLizard.Events || (MidnightLizard.Events = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="./IEventHandler.ts" />
/// <reference path="./Event.ts" />
/// <reference path="./EventDispatcher.ts" />
/// <reference path="./HtmlEvent.ts" />
/// <reference path="./ColorScheme.ts" />
/// <reference path="../Events/Event.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var Settings;
    (function (Settings) {
        /** Abstract settings communication bus */
        class ISettingsBus {
        }
        Settings.ISettingsBus = ISettingsBus;
    })(Settings = MidnightLizard.Settings || (MidnightLizard.Settings = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Colors;
    (function (Colors) {
        /**
         * HslaColor
         */
        class HslaColor {
            constructor(hue, saturation, lightness, alpha) {
                this.hue = hue;
                this.saturation = saturation;
                this.lightness = lightness;
                this.alpha = alpha;
            }
            hueToRgb(t1, t2, hue) {
                if (hue < 0)
                    hue += 6;
                if (hue >= 6)
                    hue -= 6;
                if (hue < 1)
                    return (t2 - t1) * hue + t1;
                else if (hue < 3)
                    return t2;
                else if (hue < 4)
                    return (t2 - t1) * (4 - hue) + t1;
                else
                    return t1;
            }
            static toRgbaColor(hsla) {
                let t1, t2, r, g, b;
                let hue = hsla.hue / 60;
                if (hsla.lightness <= 0.5) {
                    t2 = hsla.lightness * (hsla.saturation + 1);
                }
                else {
                    t2 = hsla.lightness + hsla.saturation - (hsla.lightness * hsla.saturation);
                }
                t1 = hsla.lightness * 2 - t2;
                r = hsla.hueToRgb(t1, t2, hue + 2) * 255;
                g = hsla.hueToRgb(t1, t2, hue) * 255;
                b = hsla.hueToRgb(t1, t2, hue - 2) * 255;
                return new Colors.RgbaColor(r, g, b, hsla.alpha);
            }
            toString() {
                if (this.alpha === 1) {
                    return `hsl(${Math.round(this.hue)}, ${Math.round(this.saturation)}, ${Math.round(this.lightness)})`;
                }
                return `hsla(${Math.round(this.hue)}, ${Math.round(this.saturation)}, ${Math.round(this.lightness)}, ${this.alpha})`;
            }
        }
        Colors.HslaColor = HslaColor;
    })(Colors = MidnightLizard.Colors || (MidnightLizard.Colors = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Colors;
    (function (Colors) {
        /**
         * RgbaColor
         */
        class RgbaColor {
            constructor(red, green, blue, alpha) {
                this.red = red;
                this.green = green;
                this.blue = blue;
                this.alpha = alpha;
            }
            toString() {
                if (this.alpha === 1) {
                    return `rgb(${Math.round(this.red)}, ${Math.round(this.green)}, ${Math.round(this.blue)})`;
                }
                return `rgba(${Math.round(this.red)}, ${Math.round(this.green)}, ${Math.round(this.blue)}, ${this.alpha})`;
            }
            static parse(str) {
                let hasAlfa = str[3] == "a";
                str = str.substr(hasAlfa ? 5 : 4, str.length - 1);
                let colorArr = str.split(",");
                return new RgbaColor(parseInt(colorArr[0]), parseInt(colorArr[1]), parseInt(colorArr[2]), hasAlfa ? parseFloat(colorArr[3]) : 1);
            }
            static toHslaColor(rgba) {
                let min, max, h = 0, s = 1, l = 1, maxcolor, rgb = [rgba.red / 255, rgba.green / 255, rgba.blue / 255];
                min = rgb[0];
                max = rgb[0];
                maxcolor = 0;
                for (let i = 0; i < rgb.length - 1; i++) {
                    if (rgb[i + 1] <= min) {
                        min = rgb[i + 1];
                    }
                    if (rgb[i + 1] >= max) {
                        max = rgb[i + 1];
                        maxcolor = i + 1;
                    }
                }
                if (maxcolor === 0) {
                    h = (rgb[1] - rgb[2]) / (max - min);
                }
                if (maxcolor == 1) {
                    h = 2 + (rgb[2] - rgb[0]) / (max - min);
                }
                if (maxcolor == 2) {
                    h = 4 + (rgb[0] - rgb[1]) / (max - min);
                }
                if (isNaN(h)) {
                    h = 0;
                }
                h = h * 60;
                if (h < 0) {
                    h = h + 360;
                }
                l = (min + max) / 2;
                if (min == max) {
                    s = 0;
                }
                else {
                    if (l < 0.5) {
                        s = (max - min) / (max + min);
                    }
                    else {
                        s = (max - min) / (2 - max - min);
                    }
                }
                return new Colors.HslaColor(h, s, l, rgba.alpha);
            }
        }
        /** White color rgb string */
        RgbaColor.White = new RgbaColor(255, 255, 255, 1).toString();
        /** Black color rgb string */
        RgbaColor.Black = new RgbaColor(0, 0, 0, 1).toString();
        /** Gray color rgb string */
        RgbaColor.Gray = new RgbaColor(127, 127, 127, 1).toString();
        Colors.RgbaColor = RgbaColor;
    })(Colors = MidnightLizard.Colors || (MidnightLizard.Colors = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Colors;
    (function (Colors) {
        /**
         * ColorShift
         */
        class ColorShift {
            constructor() { }
        }
        Colors.ColorShift = ColorShift;
    })(Colors = MidnightLizard.Colors || (MidnightLizard.Colors = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Colors;
    (function (Colors) {
        /** Html element component */
        var Component;
        (function (Component) {
            Component[Component["Background"] = 0] = "Background";
            Component[Component["Text"] = 1] = "Text";
            Component[Component["TextShadow"] = 2] = "TextShadow";
            Component[Component["Border"] = 3] = "Border";
            Component[Component["Scrollbar$Hover"] = 4] = "Scrollbar$Hover";
            Component[Component["Scrollbar$Normal"] = 5] = "Scrollbar$Normal";
            Component[Component["Scrollbar$Active"] = 6] = "Scrollbar$Active";
            Component[Component["Image"] = 7] = "Image";
            Component[Component["SvgElement"] = 8] = "SvgElement";
            Component[Component["BackgroundImage"] = 9] = "BackgroundImage";
        })(Component = Colors.Component || (Colors.Component = {}));
        /**
         * ComponentShift
         */
        class ComponentShift {
            constructor() { }
        }
        Colors.ComponentShift = ComponentShift;
    })(Colors = MidnightLizard.Colors || (MidnightLizard.Colors = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Colors;
    (function (Colors) {
        var ColorReason;
        (function (ColorReason) {
            ColorReason[ColorReason["Ok"] = 0] = "Ok";
            ColorReason[ColorReason["Parent"] = 1] = "Parent";
            ColorReason[ColorReason["Previous"] = 2] = "Previous";
            ColorReason[ColorReason["Inherited"] = 3] = "Inherited";
            ColorReason[ColorReason["Transparent"] = 4] = "Transparent";
            ColorReason[ColorReason["NotFound"] = 5] = "NotFound";
            ColorReason[ColorReason["SameAsBackground"] = 6] = "SameAsBackground";
        })(ColorReason = Colors.ColorReason || (Colors.ColorReason = {}));
        /**
         * ColorEntry
         */
        class ColorEntry {
            constructor() { }
        }
        ColorEntry.NotFound = {
            color: Colors.RgbaColor.White,
            light: 1,
            originalLight: 1,
            originalColor: Colors.RgbaColor.White,
            alpha: 1,
            reason: ColorReason.NotFound,
            owner: null
        };
        Colors.ColorEntry = ColorEntry;
    })(Colors = MidnightLizard.Colors || (MidnightLizard.Colors = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="./HslaColor.ts" />
/// <reference path="./RgbaColor.ts" />
/// <reference path="./ColorShift.ts" />
/// <reference path="./ComponentShift.ts" />
/// <reference path="./ColorEntry.ts" />
/// <reference path="../DI/-DI.ts" />
/// <reference path="./-Settings.ts" />
/// <reference path="../Cookies/CookiesManager.ts" />
/// <reference path="./IStorageManager.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="./ISettingsBus.ts" />
/// <reference path="../Utils/-Utils.ts" />
/// <reference path="../Colors/-Colors.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var Settings;
    (function (Settings) {
        let ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;
        let ResponsiveEventDispatcher = MidnightLizard.Events.ResponsiveEventDispatcher;
        class IBaseSettingsManager {
        }
        Settings.IBaseSettingsManager = IBaseSettingsManager;
        /**
         * Base Settings Manager
         */
        class BaseSettingsManager {
            /** SettingsManager constructor
             * @param _cookiesManager - abstract cookies manager
             * @param _settingsBus - abstract settings communication bus
             * @param _storageManager - abstract browser storage manager
             **/
            constructor(_app, _storageManager, _settingsBus) {
                this._app = _app;
                this._storageManager = _storageManager;
                this._settingsBus = _settingsBus;
                this._onSettingsInitialized = new ArgEventDispatcher();
                this._onSettingsChanged = new ResponsiveEventDispatcher();
                this._currentSettings = Object.assign(new Settings.ColorScheme(), Settings.ColorSchemes.dimmedDust);
                this.initCurrentSettings();
            }
            /** Current settings for communication */
            get currentSettings() { return this._currentSettings; }
            /** Current settings for calculations */
            get shift() { return this._shift; }
            /** MidnightLizard should be running on this page */
            get isActive() { return this._currentSettings.isEnabled && this._currentSettings.runOnThisSite; }
            initCurSet() {
                let set = Object.assign(new Settings.ColorScheme(), this._currentSettings);
                for (let setting in set) {
                    let prop = setting;
                    let val = set[prop];
                    if (!/Hue/g.test(prop) && MidnightLizard.Util.isNum(val)) {
                        set[prop] = val / 100;
                    }
                }
                this._shift =
                    {
                        Background: {
                            saturationLimit: set.backgroundSaturationLimit,
                            contrast: set.backgroundContrast,
                            lightnessLimit: set.backgroundLightnessLimit,
                            graySaturation: set.backgroundGraySaturation,
                            grayHue: set.backgroundGrayHue
                        },
                        Text: {
                            saturationLimit: set.textSaturationLimit,
                            contrast: set.textContrast,
                            lightnessLimit: set.textLightnessLimit,
                            graySaturation: set.textGraySaturation,
                            grayHue: set.textGrayHue
                        },
                        TextShadow: {
                            saturationLimit: set.borderSaturationLimit,
                            contrast: set.textContrast,
                            lightnessLimit: set.textLightnessLimit,
                            graySaturation: set.borderGraySaturation * 1.25,
                            grayHue: set.borderGrayHue
                        },
                        Border: {
                            saturationLimit: set.borderSaturationLimit,
                            contrast: set.borderContrast,
                            lightnessLimit: set.borderLightnessLimit,
                            graySaturation: set.borderGraySaturation,
                            grayHue: set.borderGrayHue
                        },
                        Scrollbar$Hover: {
                            saturationLimit: set.scrollbarSaturationLimit,
                            contrast: set.scrollbarContrast,
                            lightnessLimit: set.scrollbarLightnessLimit * 1,
                            graySaturation: set.scrollbarSaturationLimit,
                            grayHue: set.scrollbarGrayHue
                        },
                        Scrollbar$Normal: {
                            saturationLimit: set.scrollbarSaturationLimit,
                            contrast: set.scrollbarContrast,
                            lightnessLimit: set.scrollbarLightnessLimit * 0.8,
                            graySaturation: set.scrollbarSaturationLimit,
                            grayHue: set.scrollbarGrayHue
                        },
                        Scrollbar$Active: {
                            saturationLimit: set.scrollbarSaturationLimit,
                            contrast: set.scrollbarContrast,
                            lightnessLimit: set.scrollbarLightnessLimit * 0.7,
                            graySaturation: set.scrollbarSaturationLimit,
                            grayHue: set.scrollbarGrayHue
                        },
                        Image: {
                            saturationLimit: set.imageSaturationLimit,
                            contrast: 1,
                            lightnessLimit: set.imageLightnessLimit,
                            graySaturation: 0,
                            grayHue: 0
                        },
                        SvgElement: {
                            saturationLimit: set.backgroundSaturationLimit,
                            contrast: set.backgroundContrast,
                            lightnessLimit: set.imageLightnessLimit,
                            graySaturation: set.borderGraySaturation,
                            grayHue: set.borderGrayHue
                        },
                        BackgroundImage: {
                            saturationLimit: set.backgroundImageSaturationLimit,
                            contrast: 1,
                            lightnessLimit: set.backgroundImageLightnessLimit,
                            graySaturation: 0,
                            grayHue: 0
                        }
                    };
            }
            get onSettingsInitialized() {
                return this._onSettingsInitialized.event;
            }
            get onSettingsChanged() {
                return this._onSettingsChanged.event;
            }
        }
        Settings.BaseSettingsManager = BaseSettingsManager;
    })(Settings = MidnightLizard.Settings || (MidnightLizard.Settings = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="../Settings/ColorScheme.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var Settings;
    (function (Settings) {
        var SettingsMessageAction;
        (function (SettingsMessageAction) {
            SettingsMessageAction[SettingsMessageAction["GetCurrentSettings"] = 0] = "GetCurrentSettings";
            SettingsMessageAction[SettingsMessageAction["ApplyNewSettings"] = 1] = "ApplyNewSettings";
            SettingsMessageAction[SettingsMessageAction["DeleteSettings"] = 2] = "DeleteSettings";
            SettingsMessageAction[SettingsMessageAction["ToggleIsEnabled"] = 3] = "ToggleIsEnabled";
        })(SettingsMessageAction = Settings.SettingsMessageAction || (Settings.SettingsMessageAction = {}));
        class SettingsRequestMessage {
            constructor() { }
        }
        Settings.SettingsRequestMessage = SettingsRequestMessage;
        class CurrentSettingsRequestMessage extends SettingsRequestMessage {
            constructor() {
                super();
                this.action = SettingsMessageAction.GetCurrentSettings;
            }
        }
        Settings.CurrentSettingsRequestMessage = CurrentSettingsRequestMessage;
        class SettingsDeletionRequestMessage extends SettingsRequestMessage {
            constructor() {
                super();
                this.action = SettingsMessageAction.DeleteSettings;
            }
        }
        Settings.SettingsDeletionRequestMessage = SettingsDeletionRequestMessage;
        class IsEnabledToggleRequestMessage extends SettingsRequestMessage {
            constructor(isEnabled) {
                super();
                this.isEnabled = isEnabled;
                this.action = SettingsMessageAction.ToggleIsEnabled;
            }
        }
        Settings.IsEnabledToggleRequestMessage = IsEnabledToggleRequestMessage;
        class NewSettingsApplicationRequestMessage extends SettingsRequestMessage {
            constructor(settings) {
                super();
                this.settings = settings;
                this.action = SettingsMessageAction.ApplyNewSettings;
            }
        }
        Settings.NewSettingsApplicationRequestMessage = NewSettingsApplicationRequestMessage;
    })(Settings = MidnightLizard.Settings || (MidnightLizard.Settings = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="./ColorScheme.ts" />
/// <reference path="./ColorSchemes.ts" />
/// <reference path="./BaseSettingsManager.ts" />
/// <reference path="./SettingsRequestMessage.ts" />
/// <reference path="./ChromePromise.ts" />
/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="../Events/-Events.ts" />
var Chrome;
(function (Chrome) {
    let Action = MidnightLizard.Settings.SettingsMessageAction;
    let EventDispatcher = MidnightLizard.Events.ResponsiveEventDispatcher;
    /** Chrome Settings Communication Bus */
    let ChromeSettingsBus = class ChromeSettingsBus {
        constructor(_chromePromise, _document) {
            this._chromePromise = _chromePromise;
            this._document = _document;
            this._onCurrentSettingsRequested = new EventDispatcher();
            this._onNewSettingsApplicationRequested = new EventDispatcher();
            this._onSettingsDeletionRequested = new EventDispatcher();
            this._onIsEnabledToggleRequested = new EventDispatcher();
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (!sender.tab) {
                    switch (request.action) {
                        case Action.GetCurrentSettings:
                            this._onCurrentSettingsRequested.raise(sendResponse);
                            break;
                        case Action.ApplyNewSettings:
                            this._onNewSettingsApplicationRequested.raise(sendResponse, request.settings);
                            break;
                        case Action.DeleteSettings:
                            this._onSettingsDeletionRequested.raise(sendResponse);
                            break;
                        case Action.ToggleIsEnabled:
                            this._onIsEnabledToggleRequested.raise(sendResponse, request.isEnabled);
                            break;
                        default:
                            break;
                    }
                }
            });
        }
        get onCurrentSettingsRequested() {
            return this._onCurrentSettingsRequested.event;
        }
        get onNewSettingsApplicationRequested() {
            return this._onNewSettingsApplicationRequested.event;
        }
        get onSettingsDeletionRequested() {
            return this._onSettingsDeletionRequested.event;
        }
        get onIsEnabledToggleRequested() {
            return this._onIsEnabledToggleRequested.event;
        }
        sendMessageToSelectedTab(msg) {
            return this._chromePromise.tabs.query({ active: true, currentWindow: true })
                .then(tabs => this._chromePromise.tabs.sendMessage(tabs[0].id, msg));
        }
        sendMessageToAllTabs(msg) {
            return this._chromePromise.tabs.query({}).then(tabs => tabs.map(tab => this._chromePromise.tabs.sendMessage(tab.id, msg)));
        }
        deleteSettings() {
            return this.sendMessageToSelectedTab(new MidnightLizard.Settings.SettingsDeletionRequestMessage());
        }
        applySettings(settings) {
            return this.sendMessageToSelectedTab(new MidnightLizard.Settings.NewSettingsApplicationRequestMessage(settings));
        }
        getCurrentSettings() {
            return this.sendMessageToSelectedTab(new MidnightLizard.Settings.CurrentSettingsRequestMessage());
        }
        toggleIsEnabled(isEnabled) {
            return this.sendMessageToAllTabs(new MidnightLizard.Settings.IsEnabledToggleRequestMessage(isEnabled));
        }
    };
    ChromeSettingsBus = __decorate([
        MidnightLizard.DI.injectable(MidnightLizard.Settings.ISettingsBus),
        __metadata("design:paramtypes", [Chrome.ChromePromise, Document])
    ], ChromeSettingsBus);
})(Chrome || (Chrome = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var ContentScript;
    (function (ContentScript) {
        var PseudoClass;
        (function (PseudoClass) {
            PseudoClass[PseudoClass["Hover"] = 0] = "Hover";
            PseudoClass[PseudoClass["Focus"] = 1] = "Focus";
            PseudoClass[PseudoClass["Active"] = 2] = "Active";
            PseudoClass[PseudoClass["Checked"] = 3] = "Checked";
        })(PseudoClass = ContentScript.PseudoClass || (ContentScript.PseudoClass = {}));
        var PseudoType;
        (function (PseudoType) {
            PseudoType[PseudoType["Before"] = 0] = "Before";
            PseudoType[PseudoType["After"] = 1] = "After";
        })(PseudoType = ContentScript.PseudoType || (ContentScript.PseudoType = {}));
        class PseudoElementStyle {
            constructor() {
                this._props = new Map();
            }
            get cssText() {
                return [...this._props]
                    .map(([key, [value, priority]]) => `${key}:${value}${priority}`)
                    .join(";");
            }
            setProperty(propertyName, value, priority) {
                value
                    ? this._props.set(propertyName, [value, (priority ? "!important" : "")])
                    : this._props.delete(propertyName);
            }
            getPropertyValue(propertyName) {
                let [value] = this._props.get(propertyName) || [undefined];
                return value;
            }
        }
        ContentScript.PseudoElementStyle = PseudoElementStyle;
        function isPseudoElement(tag) {
            return tag.isPseudo;
        }
        ContentScript.isPseudoElement = isPseudoElement;
        function isRealElement(tag) {
            return !tag.isPseudo;
        }
        ContentScript.isRealElement = isRealElement;
        class PseudoElement {
            constructor(type, parent, id, computedStyle) {
                this.isPseudo = true;
                this.bgColor = "";
                this.originalFilter = null;
                this.selectors = "";
                let typeName = PseudoType[type].toLowerCase();
                this.id = id;
                this.classList = [this.className = "::" + typeName];
                this.tagName = typeName;
                this.parentElement = parent;
                this.computedStyle = computedStyle;
                this.rect = parent.rect;
                this.style = new PseudoElementStyle();
                this.ownerDocument = parent.ownerDocument;
                this.stylePromise = new Promise((resolve, reject) => this.resolveCss = resolve);
            }
            getBoundingClientRect() {
                this.rect = this.parentElement.rect = this.parentElement.rect || this.parentElement.getBoundingClientRect();
                this.area = this.rect.width * this.rect.height;
                return this.rect;
            }
            applyStyleChanges() {
                let css = this.style.cssText === ""
                    ? ""
                    : "[" + this.tagName + "-style=\"" + this.id + "\"]:not(important)" + this.className + "{ " + this.style.cssText + " }";
                `[${this.tagName}-style="${this.id}"]:not(important)${this.className}{${this.style.cssText}}`;
                this.resolveCss(css);
            }
        }
        ContentScript.PseudoElement = PseudoElement;
    })(ContentScript = MidnightLizard.ContentScript || (MidnightLizard.ContentScript = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="../DI/-DI.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var ContentScript;
    (function (ContentScript) {
        /** Unified Style Properties */
        ContentScript.USP = {
            htm: {
                dom: {
                    bgrColor: "backgroundColor",
                    brdColor: "borderColor",
                    fntColor: "color",
                    shdColor: "textShadow"
                },
                css: {
                    bgrColor: "background-color",
                    brdColor: "border-color",
                    fntColor: "color",
                    shdColor: "text-shadow"
                },
                img: "IMG"
            },
            svg: {
                dom: {
                    bgrColor: "fill",
                    brdColor: "stroke",
                    fntColor: "fill",
                    shdColor: "textShadow"
                },
                css: {
                    bgrColor: "fill",
                    brdColor: "stroke",
                    fntColor: "fill",
                    shdColor: "text-shadow"
                },
                img: "IMAGE"
            }
        };
        let CssStyle = class CssStyle {
            constructor(doc) {
                for (let prop in doc.documentElement.style) {
                    this[prop] = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
                }
            }
        };
        CssStyle = __decorate([
            MidnightLizard.DI.injectable(),
            __metadata("design:paramtypes", [Document])
        ], CssStyle);
        ContentScript.CssStyle = CssStyle;
    })(ContentScript = MidnightLizard.ContentScript || (MidnightLizard.ContentScript = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="./Pseudos.ts" />
/// <reference path="../Utils/-Utils.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var ContentScript;
    (function (ContentScript) {
        let x = MidnightLizard.Util.RegExpBuilder;
        var Var;
        (function (Var) {
            Var[Var["id"] = 0] = "id";
            Var[Var["tagName"] = 1] = "tagName";
            Var[Var["className"] = 2] = "className";
            Var[Var["notThisTagId"] = 3] = "notThisTagId";
            Var[Var["notThisClassNames"] = 4] = "notThisClassNames";
        })(Var || (Var = {}));
        class IStyleSheetProcessor {
        }
        ContentScript.IStyleSheetProcessor = IStyleSheetProcessor;
        let StyleSheetProcessor = class StyleSheetProcessor {
            /** StyleSheetProcessor constructor
             * @param _app - application settings
             */
            constructor(_app) {
                this._app = _app;
                this._stylesLimit = 500;
                this._trimmedStylesLimit = 500;
                this._styleProps = [
                    { prop: "background-color", priority: 1 },
                    { prop: "color", priority: 1 },
                    { prop: "fill", priority: 2 },
                    { prop: "border-color", priority: 2 },
                    { prop: "stroke", priority: 2 },
                    { prop: "background-image", priority: 3 },
                    { prop: "background-position", priority: 3 },
                    { prop: "background-size", priority: 4 },
                    { prop: "text-shadow", priority: 4 }
                ];
                this._externalCssPromises = new WeakMap();
                this._selectors = new WeakMap();
                this._selectorsQuality = new WeakMap();
                this._preFilteredSelectors = new WeakMap();
                //  this._excludeStylesRegExp = this.compileExcludeStylesRegExp();
                this._includeStylesRegExp = this.compileIncludeStylesRegExp();
            }
            getCssPromises(doc) {
                let promises = this._externalCssPromises.get(doc);
                return promises ? promises.values() : [];
            }
            getSelectorsCount(doc) { return (this._selectors.get(doc) || []).length; }
            getSelectorsQuality(doc) { return this._selectorsQuality.get(doc); }
            compileExcludeStylesRegExp() {
                x.resetCapturingGroups();
                return x.completely(x.sometime(x.forget(x.sometime(x.forget(
                // beginning of the current selector
                x.succeededBy(x.Next(), x.BeginningOfLine, x.any(x.outOfSet(x.Comma)), x.WhiteSpace, x.OR, x.Comma, x.any(x.outOfSet(x.Comma)), x.WhiteSpace, x.OR, x.BeginningOfLine), x.succeededBy(x.Next(), 
                // anything before a dot
                x.neverOrOnce(x.succeededBy(x.Next(), x.any(x.outOfSet(x.Dot, x.Comma, x.EndOfLine)))), x.Dot, 
                // followed by another className
                x.$var(Var[Var.notThisClassNames]), x.some(x.Literal), x.Or, 
                // another tagName
                x.notFollowedBy(x.$var(Var[Var.tagName]), x.WordBoundary), x.some(x.Word), x.Or, 
                // any tagName followed by another id
                x.any(x.Word), x.Hash, x.$var(Var[Var.notThisTagId]), x.some(x.Literal), x.WordBoundary, x.notFollowedBy(x.Minus), x.Or, 
                // any pseudo element
                x.neverOrOnce(x.succeededBy(x.Next(), x.any(x.outOfSet(x.Colon, x.Comma, x.EndOfLine)))), x.exactly(2, x.Colon)), 
                // end of the current selector
                x.any(x.outOfSet(x.Comma, x.WhiteSpace, x.EndOfLine)), x.followedBy(x.Comma, x.Or, x.EndOfLine))))));
            }
            compileIncludeStylesRegExp() {
                return x.forget(x.forget(x.BeginningOfLine, x.Or, x.WhiteSpace), x.neverOrOnce(x.forget(// tagName
                x.$var(Var[Var.tagName]))), x.neverOrOnce(x.forget(// #id
                x.Hash, x.$var(Var[Var.id]))), x.anytime(x.forget(// .className1.className2
                x.Dot, x.forget(x.$var(Var[Var.className])))), x.WordBoundary, x.notFollowedBy(// end of literal
                x.Minus), x.notFollowedBy(// exclude another tag names, ids and classes
                x.some(x.Word)), x.notFollowedBy(// exclude pseudo elements
                x.exactly(2, x.Colon)), x.any(// any attribute filters or pseudo classes
                x.outOfSet(x.Comma, x.Dot, x.Hash, x.WhiteSpace, x.EndOfLine)), 
                // end of current selector or line
                x.followedBy(x.Comma, x.Or, x.EndOfLine));
            }
            checkPropertyIsValuable(style, propName) {
                let propVal = style.getPropertyValue(propName);
                return propVal !== "" && propVal != "initial" && propVal != "inherited";
            }
            processDocumentStyleSheets(doc) {
                let externalCssPromises = this._externalCssPromises.get(doc);
                if (externalCssPromises === undefined) {
                    this._externalCssPromises.set(doc, externalCssPromises = new Map());
                }
                this._preFilteredSelectors.delete(doc);
                let styleRules = new Array();
                let styleSheets = Array.from(doc.styleSheets);
                for (let sheet of styleSheets) {
                    if (sheet.cssRules) {
                        if (sheet.cssRules.length > 0 && (!sheet.ownerNode || !sheet.ownerNode.mlIgnore)) {
                            for (let rule of Array.from(sheet.cssRules)) {
                                if (rule instanceof doc.defaultView.CSSStyleRule) {
                                    let style = rule.style;
                                    if (this._styleProps.some(p => this.checkPropertyIsValuable(style, p.prop))) {
                                        styleRules.push(rule);
                                    }
                                }
                                else if (rule instanceof doc.defaultView.CSSImportRule) {
                                    styleSheets.push(rule.styleSheet);
                                }
                            }
                        }
                    }
                    else if (sheet.href) {
                        if (!externalCssPromises.has(sheet.href)) {
                            let cssPromise = fetch(sheet.href, { cache: "force-cache" }).then(response => response.text());
                            cssPromise.catch(ex => this._app.isDebug && console.error(`Error during css file download: ${sheet.href}\nDetails: ${ex.message || ex}`));
                            externalCssPromises.set(sheet.href, MidnightLizard.Util.handlePromise(Promise.all([doc, cssPromise, externalCssPromises, sheet.href])
                                .then(([d, css, extCss, href]) => {
                                let style = d.createElement('style');
                                style.title = `MidnightLizard Cross Domain CSS Import From ${href}`;
                                style.innerText = css;
                                style.disabled = true;
                                d.head.appendChild(style);
                                style.sheet.disabled = true;
                            })));
                        }
                    }
                }
                let maxPriority = 1;
                let filteredStyleRules = styleRules;
                this._styleProps.forEach(p => maxPriority = p.priority > maxPriority ? p.priority : maxPriority);
                let styleProps = this._styleProps;
                let selectorsQuality = maxPriority;
                while (maxPriority-- > 1 && filteredStyleRules.length > this._stylesLimit) {
                    selectorsQuality--;
                    styleProps = styleProps.filter(p => p.priority <= maxPriority);
                    filteredStyleRules = filteredStyleRules.filter(r => styleProps.some(p => this.checkPropertyIsValuable(r.style, p.prop)));
                }
                if (filteredStyleRules.length > this._stylesLimit) {
                    selectorsQuality = 0;
                    let trimmer = (x) => /active|hover|disable|check|visit|link|focus|select|enable/gi.test(x.selectorText) &&
                        !/::scrollbar/gi.test(x.selectorText);
                    let trimmedStyleRules = styleRules.filter(trimmer);
                    if (trimmedStyleRules.length > this._trimmedStylesLimit) {
                        filteredStyleRules = filteredStyleRules.filter(trimmer);
                    }
                    else {
                        filteredStyleRules = trimmedStyleRules;
                    }
                }
                this._selectorsQuality.set(doc, selectorsQuality);
                this._selectors.set(doc, filteredStyleRules.map(sr => sr.selectorText));
            }
            getElementMatchedSelectors(tag) {
                if (tag instanceof ContentScript.PseudoElement) {
                    return tag.selectors;
                }
                else {
                    let preFilteredSelectors = this.getPreFilteredSelectors(tag);
                    let wrongSelectors = new Array();
                    let result = preFilteredSelectors.filter((selector) => {
                        try {
                            return tag.matches(selector);
                        }
                        catch (ex) {
                            wrongSelectors.push(selector);
                            this._app.isDebug && console.error(ex);
                            return false;
                        }
                    });
                    wrongSelectors.forEach(w => preFilteredSelectors.splice(preFilteredSelectors.indexOf(w), 1));
                    return result.join("\n");
                }
            }
            getPreFilteredSelectors(tag) {
                let key = `${tag.tagName}#${tag.id}.${tag.classList.toString()}`;
                let map = this._preFilteredSelectors.get(tag.ownerDocument);
                if (map === undefined) {
                    map = new Map();
                    this._preFilteredSelectors.set(tag.ownerDocument, map);
                }
                let preFilteredSelectors = map.get(key);
                if (preFilteredSelectors === undefined) {
                    let notThisClassNames = "", className = "";
                    if (tag.classList && tag.classList.length > 0) {
                        // let classNameRegExp = (Array.prototype.map.call(tag.classList, (c: string) => x.escape(c)) as string[]).join(
                        //     x.WordBoundary + x.notFollowedBy(x.Minus) + x.Or) +
                        //     x.WordBoundary + x.notFollowedBy(x.Minus);
                        // notThisClassNames = x.notFollowedBy(classNameRegExp);
                        className = Array.prototype.map.call(tag.classList, (c) => x.escape(c)).join(x.Or);
                    }
                    let vars = new Map();
                    vars.set(Var[Var.id], tag.id);
                    vars.set(Var[Var.tagName], tag.tagName);
                    vars.set(Var[Var.className], className);
                    //vars.set(Var[Var.notThisTagId], tag.id ? x.notFollowedBy(tag.id + x.WordBoundary) : "");
                    //vars.set(Var[Var.notThisClassNames], notThisClassNames);
                    //let excludeRegExpText = x.applyVars(this._excludeStylesRegExp, vars);
                    let includeRegExpText = x.applyVars(this._includeStylesRegExp, vars);
                    //let excludeRegExp = new RegExp(excludeRegExpText, "i");
                    let includeRegExp = new RegExp(includeRegExpText, "gi");
                    //preFilteredSelectors = this._selectors.get(tag.ownerDocument)!.filter(selector => !excludeRegExp.test(selector));
                    preFilteredSelectors = this._selectors.get(tag.ownerDocument).filter(selector => selector.search(includeRegExp) !== -1);
                    map.set(key, preFilteredSelectors);
                }
                return preFilteredSelectors;
            }
            /**
             * Checks whether there are some rulles in the style sheets with the specified {pseudoClass}
             * which might be valid for the specified {tag} at some time.
             **/
            canHavePseudoClass(tag, preFilteredSelectors, pseudoClass) {
                let pseudoClassName = ContentScript.PseudoClass[pseudoClass], pseudoRegExp = new RegExp(x.remember(x.outOfSet(x.LeftParenthesis, x.WhiteSpace)) +
                    x.Colon + pseudoClassName + x.WordBoundary, "gi");
                return preFilteredSelectors.some(s => s.search(pseudoRegExp) !== -1 && tag.matches(s.replace(pseudoRegExp, "$1")));
            }
        };
        StyleSheetProcessor = __decorate([
            MidnightLizard.DI.injectable(IStyleSheetProcessor),
            __metadata("design:paramtypes", [MidnightLizard.Settings.IApplicationSettings])
        ], StyleSheetProcessor);
    })(ContentScript = MidnightLizard.ContentScript || (MidnightLizard.ContentScript = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="../DI/-DI.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var ContentScript;
    (function (ContentScript) {
        let ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;
        var ObservationState;
        (function (ObservationState) {
            ObservationState[ObservationState["Active"] = 0] = "Active";
            ObservationState[ObservationState["Stopped"] = 1] = "Stopped";
        })(ObservationState = ContentScript.ObservationState || (ContentScript.ObservationState = {}));
        class IDocumentObserver {
        }
        ContentScript.IDocumentObserver = IDocumentObserver;
        let DocumentObserver = class DocumentObserver {
            constructor(_rootDocument, _settingsManager, _styleSheetProcessor) {
                this._rootDocument = _rootDocument;
                this._settingsManager = _settingsManager;
                this._styleSheetProcessor = _styleSheetProcessor;
                this._bodyObserverConfig = { attributes: true, subtree: true, childList: true, attributeOldValue: true, attributeFilter: ["class", "style"] };
                this._headObserverConfig = { childList: true };
                this._bodyObservers = new WeakMap();
                this._headObservers = new WeakMap();
                this._onClassChanged = new ArgEventDispatcher();
                this._onStyleChanged = new ArgEventDispatcher();
                this._onElementAdded = new ArgEventDispatcher();
                _settingsManager.onSettingsChanged.addListener(this.onSettingsChanged, this);
            }
            get onClassChanged() {
                return this._onClassChanged.event;
            }
            get onStyleChanged() {
                return this._onStyleChanged.event;
            }
            get onElementsAdded() {
                return this._onElementAdded.event;
            }
            onSettingsChanged(response, shift) {
                if (!this._settingsManager.isActive) {
                    this.stopDocumentObservation(this._rootDocument);
                }
            }
            startDocumentObservation(doc, resumeState) {
                if (resumeState !== ObservationState.Stopped) {
                    let bodyObserver = this._bodyObservers.get(doc);
                    if (bodyObserver === undefined) {
                        this._bodyObservers.set(doc, bodyObserver = new MutationObserver(this.bodyObserverCallback.bind(this)));
                    }
                    bodyObserver.observe(doc.body, this._bodyObserverConfig);
                    bodyObserver.state = ObservationState.Active;
                    let headObserver = this._headObservers.get(doc);
                    if (headObserver === undefined) {
                        this._headObservers.set(doc, headObserver = new MutationObserver(this.headObserverCallback.bind(this)));
                    }
                    headObserver.observe(doc.head, this._headObserverConfig);
                }
            }
            stopDocumentObservation(doc) {
                let originalState = undefined;
                const bodyObserver = this._bodyObservers.get(doc);
                if (bodyObserver !== undefined) {
                    let mutations = bodyObserver.takeRecords();
                    originalState = bodyObserver.state;
                    bodyObserver.disconnect();
                    bodyObserver.state = ObservationState.Stopped;
                    setTimeout(() => this.bodyObserverCallback(mutations, bodyObserver), 1);
                }
                const headObserver = this._headObservers.get(doc);
                if (headObserver !== undefined) {
                    let mutations = headObserver.takeRecords();
                    headObserver.disconnect();
                    headObserver.state = ObservationState.Stopped;
                    setTimeout(() => this.headObserverCallback(mutations, headObserver), 1);
                }
                return originalState;
            }
            bodyObserverCallback(mutations, observer) {
                let classChanges = new Set(), childListChanges = new Set(), styleChanges = new Set();
                mutations.forEach(mutation => {
                    switch (mutation.type) {
                        case "attributes":
                            if (mutation.target.isChecked && mutation.target.mlBgColor) {
                                switch (mutation.attributeName) {
                                    case "class":
                                        classChanges.add(mutation.target);
                                        break;
                                    case "style":
                                        styleChanges.add(mutation.target);
                                        break;
                                    default:
                                        break;
                                }
                            }
                            break;
                        case "childList":
                            Array.prototype.slice.call(mutation.addedNodes)
                                .forEach((node) => childListChanges.add(node));
                            break;
                        default:
                            break;
                    }
                });
                if (classChanges.size > 0) {
                    this._onClassChanged.raise(classChanges);
                }
                if (styleChanges.size > 0) {
                    this._onStyleChanged.raise(styleChanges);
                }
                if (childListChanges.size > 0) {
                    this._onElementAdded.raise(childListChanges);
                }
                if (!this._settingsManager.isActive) {
                    observer.disconnect();
                }
            }
            headObserverCallback(mutations, observer) {
                let mutation = mutations
                    .find(m => Array.prototype.slice.call(m.addedNodes)
                    .find((x) => x instanceof x.ownerDocument.defaultView.HTMLStyleElement && !x.mlIgnore));
                if (mutation) {
                    this._styleSheetProcessor.processDocumentStyleSheets(mutation.target.ownerDocument);
                }
            }
        };
        DocumentObserver = __decorate([
            MidnightLizard.DI.injectable(IDocumentObserver),
            __metadata("design:paramtypes", [Document, MidnightLizard.Settings.IBaseSettingsManager, ContentScript.IStyleSheetProcessor])
        ], DocumentObserver);
    })(ContentScript = MidnightLizard.ContentScript || (MidnightLizard.ContentScript = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="../DI/-DI.ts" />
/// <reference path="../Colors/-Colors.ts" />
/// <reference path="../Settings/-Settings.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var ContentScript;
    (function (ContentScript) {
        class ISettingsManager {
        }
        ContentScript.ISettingsManager = ISettingsManager;
        let SettingsManager = SettingsManager_1 = class SettingsManager extends MidnightLizard.Settings.BaseSettingsManager {
            constructor(_rootDocument, _cookiesManager, app, storageManager, settingsBus) {
                super(app, storageManager, settingsBus);
                this._rootDocument = _rootDocument;
                this._cookiesManager = _cookiesManager;
                settingsBus.onCurrentSettingsRequested.addListener(this.onCurrentSettingsRequested, this);
                settingsBus.onIsEnabledToggleRequested.addListener(this.onIsEnabledToggleRequested, this);
                settingsBus.onNewSettingsApplicationRequested.addListener(this.onNewSettingsApplicationRequested, this);
                settingsBus.onSettingsDeletionRequested.addListener(this.onSettingsDeletionRequested, this);
            }
            initCurrentSettings() {
                this._storageManager.get(null)
                    .then(dss => {
                    this._currentSettings.isEnabled = dss.isEnabled === undefined || dss.isEnabled;
                    if (dss.settingsVersion !== undefined) {
                        this._currentSettings.settingsVersion = dss.settingsVersion;
                        let settings = this.getSettings(dss.settingsVersion);
                        if (settings.exist) {
                            Object.assign(this._currentSettings, settings);
                            this.saveCurrentSettings();
                        }
                        else {
                            Object.assign(this._currentSettings, dss);
                        }
                    }
                    else {
                        this._currentSettings.isDefault = true;
                        this._currentSettings.settingsVersion = MidnightLizard.Util.guid("");
                        this._storageManager.set(this._currentSettings);
                    }
                    this.initCurSet();
                    this._currentSettings.hostName = this._rootDocument.location.hostname;
                    this._onSettingsInitialized.raise(this._shift);
                })
                    .catch(ex => this._app.isDebug && console.error(ex));
            }
            onSettingsDeletionRequested(response) {
                let setting;
                for (setting in this._currentSettings) {
                    if (SettingsManager_1._excludeSettingsForSave.indexOf(setting) == -1) {
                        this._cookiesManager.deleteCookieByName(this.getSettingNameForCookies(setting));
                    }
                }
                response(null);
            }
            onNewSettingsApplicationRequested(response, newSettings) {
                this._currentSettings = newSettings;
                this.saveCurrentSettings();
                this.initCurSet();
                this._onSettingsChanged.raise(response, this._shift);
            }
            onIsEnabledToggleRequested(response, isEnabled) {
                this._currentSettings.isEnabled = isEnabled;
                this._onSettingsChanged.raise(response, this._shift);
            }
            onCurrentSettingsRequested(response) {
                response(this._currentSettings);
            }
            saveCurrentSettings() {
                let setting;
                for (setting in this._currentSettings) {
                    if (SettingsManager_1._excludeSettingsForSave.indexOf(setting) == -1) {
                        this._cookiesManager.setCookie(this.getSettingNameForCookies(setting), this._currentSettings[setting], SettingsManager_1._storagePeriod);
                    }
                }
            }
            getSettingNameForCookies(propertyName) {
                return "ML" + propertyName.match(/^[^A-Z]{1,4}|[A-Z][^A-Z]{0,2}/g).join("").toUpperCase();
            }
            getSettings(version) {
                let val, settings = new MidnightLizard.Settings.ColorScheme();
                for (let setting in MidnightLizard.Settings.ColorSchemes.default) {
                    let prop = setting;
                    val = this._cookiesManager.getCookie(this.getSettingNameForCookies(setting));
                    if (val) {
                        switch (typeof MidnightLizard.Settings.ColorSchemes.default[prop]) {
                            case MidnightLizard.Util.BOOL:
                                settings[prop] = val == true.toString();
                                break;
                            case MidnightLizard.Util.NUM:
                                settings[prop] = parseInt(val);
                                break;
                            default:
                                settings[prop] = val;
                                break;
                        }
                    }
                    else
                        break;
                }
                settings.exist = settings.settingsVersion == version;
                settings.settingsVersion = version;
                return settings;
            }
        };
        /** period of settings storage in the cookies */
        SettingsManager._storagePeriod = 49;
        SettingsManager._excludeSettingsForSave = ["isEnabled", "exist", "hostName", "isDefault"];
        SettingsManager = SettingsManager_1 = __decorate([
            MidnightLizard.DI.injectable(ISettingsManager),
            MidnightLizard.DI.injectable(MidnightLizard.Settings.IBaseSettingsManager, MidnightLizard.DI.Scope.ExistingInstance),
            __metadata("design:paramtypes", [Document, MidnightLizard.Cookies.ICookiesManager, MidnightLizard.Settings.IApplicationSettings, MidnightLizard.Settings.IStorageManager, MidnightLizard.Settings.ISettingsBus])
        ], SettingsManager);
        var SettingsManager_1;
    })(ContentScript = MidnightLizard.ContentScript || (MidnightLizard.ContentScript = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="../Settings/BaseSettingsManager.ts" />
/// <reference path="-Colors.ts" />
/// <reference path="../Events/Event.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var Colors;
    (function (Colors) {
        class BaseColorProcessor {
            constructor(_app, _settingsManager) {
                this._app = _app;
                this._settingsManager = _settingsManager;
                this._colors = new Map();
                _settingsManager.onSettingsChanged.addListener(this.onSettingsChanged, this);
                _settingsManager.onSettingsInitialized.addListener(this.onSettingsInitialized, this, MidnightLizard.Events.EventHandlerPriority.High);
            }
            onSettingsInitialized(shift) {
                this._colorShift = this._settingsManager.shift[Colors.Component[this._component]];
            }
            onSettingsChanged(response, newSettings) {
                this._colorShift = this._settingsManager.shift[Colors.Component[this._component]];
                this._colors.clear();
            }
            scaleValue(currentValue, scaleLimit) {
                return Math.min(Math.min(currentValue, scaleLimit * Math.atan(currentValue * Math.PI / 2)), scaleLimit);
            }
        }
        Colors.BaseColorProcessor = BaseColorProcessor;
    })(Colors = MidnightLizard.Colors || (MidnightLizard.Colors = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="../DI/-DI.ts" />
/// <reference path="BaseColorProcessor.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="../Settings/BaseSettingsManager.ts" />
/// <reference path="./-Colors.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var Colors;
    (function (Colors) {
        class IBackgroundColorProcessor {
        }
        Colors.IBackgroundColorProcessor = IBackgroundColorProcessor;
        class ISvgBackgroundColorProcessor {
        }
        Colors.ISvgBackgroundColorProcessor = ISvgBackgroundColorProcessor;
        /** BackgroundColorProcessor */
        let BackgroundColorProcessor = class BackgroundColorProcessor extends Colors.BaseColorProcessor {
            /** BackgroundColorProcessor constructor */
            constructor(app, settingsManager) {
                super(app, settingsManager);
                this._lights = new Map();
                this._component = Colors.Component.Background;
            }
            onSettingsChanged(response, newSettings) {
                super.onSettingsChanged(response, newSettings);
                this._lights = new Map();
            }
            changeHslaColor(hsla, increaseContrast) {
                let shift = this._colorShift;
                if (hsla.saturation === 0 && shift.grayHue !== 0) {
                    hsla.hue = shift.grayHue;
                    hsla.saturation = shift.graySaturation;
                }
                else {
                    hsla.saturation = this.scaleValue(hsla.saturation, shift.saturationLimit);
                }
                const minLightDiff = shift.contrast * Math.atan(-shift.lightnessLimit * Math.PI / 2) + shift.contrast / 0.9;
                let light = hsla.lightness;
                if (increaseContrast) {
                    let oldLight = this._lights.get(light);
                    if (oldLight !== undefined) {
                        light = oldLight;
                    }
                    else {
                        if (this._lights.size > 0 && minLightDiff > 0) {
                            let prevLight = -1, nextLight = +2;
                            for (let [originalLight, otherLight] of this._lights) {
                                if (otherLight < light && otherLight > prevLight) {
                                    prevLight = otherLight;
                                }
                                if (otherLight > light && otherLight < nextLight) {
                                    nextLight = otherLight;
                                }
                            }
                            if (nextLight - prevLight < minLightDiff * 2)
                                light = (prevLight + nextLight) / 2;
                            else if (light - prevLight < minLightDiff)
                                light = prevLight + minLightDiff;
                            else if (nextLight - light < minLightDiff)
                                light = nextLight - minLightDiff;
                            light = Math.max(Math.min(light, 1), 0);
                        }
                        this._lights && this._lights.set(hsla.lightness, light);
                    }
                }
                hsla.lightness = this.scaleValue(light, shift.lightnessLimit);
            }
            changeColor(rgbaString, increaseContrast, tag, getParentBackground) {
                rgbaString = rgbaString || "rgb(255, 255, 255)";
                let prevColor = this._colors.get(rgbaString);
                if (increaseContrast && prevColor) {
                    let newColor = Object.assign({}, prevColor);
                    return Object.assign(newColor, {
                        reason: Colors.ColorReason.Previous,
                        originalColor: rgbaString,
                        owner: this._app.isDebug ? tag : null,
                        base: this._app.isDebug ? prevColor : null
                    });
                }
                else {
                    let rgba = Colors.RgbaColor.parse(rgbaString);
                    if (tag.tagName == "BODY" && rgba.alpha === 0) {
                        rgbaString = "bodyTrans";
                        rgba = { red: 255, green: 255, blue: 255, alpha: 1 };
                    }
                    if (rgba.alpha === 0 && getParentBackground) {
                        let parentBgColor = getParentBackground(tag);
                        let newColor = Object.assign({}, parentBgColor);
                        return Object.assign(newColor, {
                            color: null,
                            reason: Colors.ColorReason.Parent,
                            originalColor: rgbaString,
                            owner: this._app.isDebug ? tag : null,
                            base: this._app.isDebug ? parentBgColor : null
                        });
                    }
                    else {
                        let hsla = Colors.RgbaColor.toHslaColor(rgba);
                        let originalLight = hsla.lightness;
                        this.changeHslaColor(hsla, increaseContrast);
                        let newRgbColor = Colors.HslaColor.toRgbaColor(hsla);
                        let result = {
                            color: newRgbColor.toString(),
                            light: hsla.lightness,
                            originalLight: originalLight,
                            originalColor: rgbaString,
                            alpha: rgba.alpha,
                            reason: Colors.ColorReason.Ok,
                            owner: this._app.isDebug ? tag : null
                        };
                        this._colors.set(rgbaString, result);
                        return result;
                    }
                }
            }
        };
        BackgroundColorProcessor = __decorate([
            MidnightLizard.DI.injectable(IBackgroundColorProcessor),
            __metadata("design:paramtypes", [MidnightLizard.Settings.IApplicationSettings, MidnightLizard.Settings.IBaseSettingsManager])
        ], BackgroundColorProcessor);
        let SvgBackgroundColorProcessor = class SvgBackgroundColorProcessor extends BackgroundColorProcessor {
            constructor(app, settingsManager) {
                super(app, settingsManager);
                this._component = Colors.Component.SvgElement;
            }
        };
        SvgBackgroundColorProcessor = __decorate([
            MidnightLizard.DI.injectable(ISvgBackgroundColorProcessor),
            __metadata("design:paramtypes", [MidnightLizard.Settings.IApplicationSettings, MidnightLizard.Settings.IBaseSettingsManager])
        ], SvgBackgroundColorProcessor);
    })(Colors = MidnightLizard.Colors || (MidnightLizard.Colors = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="../DI/-DI.ts" />
/// <reference path="./-Colors.ts" />
/// <reference path="BaseColorProcessor.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="../Settings/BaseSettingsManager.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var Colors;
    (function (Colors) {
        class ITextColorProcessor {
        }
        Colors.ITextColorProcessor = ITextColorProcessor;
        class ITextShadowColorProcessor {
        }
        Colors.ITextShadowColorProcessor = ITextShadowColorProcessor;
        class IBorderColorProcessor {
        }
        Colors.IBorderColorProcessor = IBorderColorProcessor;
        class IScrollbarHoverColorProcessor {
        }
        Colors.IScrollbarHoverColorProcessor = IScrollbarHoverColorProcessor;
        class IScrollbarNormalColorProcessor {
        }
        Colors.IScrollbarNormalColorProcessor = IScrollbarNormalColorProcessor;
        class IScrollbarActiveColorProcessor {
        }
        Colors.IScrollbarActiveColorProcessor = IScrollbarActiveColorProcessor;
        /** BackgroundColorProcessor */
        class ForegroundColorProcessor extends Colors.BaseColorProcessor {
            /** BackgroundColorProcessor constructor */
            constructor(app, settingsManager) {
                super(app, settingsManager);
            }
            changeHslaColor(hsla, backgroundLightness, customContrast) {
                let shift = this._colorShift, shiftContrast = (customContrast !== undefined ? customContrast : shift.contrast) / hsla.alpha;
                if (hsla.saturation === 0 && shift.grayHue !== 0) {
                    hsla.hue = shift.grayHue;
                    hsla.saturation = shift.graySaturation;
                }
                else {
                    hsla.saturation = this.scaleValue(hsla.saturation, shift.saturationLimit);
                }
                hsla.lightness = this.scaleValue(hsla.lightness, shift.lightnessLimit);
                let currentContrast = hsla.lightness - backgroundLightness, down = Math.max(backgroundLightness - Math.min(Math.max(backgroundLightness - shiftContrast, 0), shift.lightnessLimit), 0), up = Math.max(Math.min(backgroundLightness + shiftContrast, shift.lightnessLimit) - backgroundLightness, 0);
                if (currentContrast < 0) {
                    if (down >= up) {
                        hsla.lightness = Math.max(backgroundLightness + Math.min(currentContrast, -shiftContrast), 0);
                    }
                    else {
                        hsla.lightness = Math.min(backgroundLightness + shiftContrast, shift.lightnessLimit);
                    }
                }
                else {
                    if (up >= down) {
                        hsla.lightness = Math.min(backgroundLightness + Math.max(currentContrast, shiftContrast), shift.lightnessLimit);
                    }
                    else {
                        hsla.lightness = Math.max(backgroundLightness - shiftContrast, 0);
                    }
                }
            }
            changeColor(rgbaString, backgroundLightness, inheritedColor, tag, customContrast) {
                rgbaString = rgbaString || "rgb(4, 4, 4)";
                let key = `${rgbaString}-${backgroundLightness}`, prevColor = this._colors.get(key);
                if (inheritedColor && inheritedColor.backgroundLight == backgroundLightness) {
                    let newColor = Object.assign({}, inheritedColor);
                    return Object.assign(newColor, {
                        color: null,
                        reason: Colors.ColorReason.Inherited,
                        originalColor: rgbaString,
                        owner: this._app.isDebug ? tag : null,
                        base: this._app.isDebug ? inheritedColor : null
                    });
                }
                else if (inheritedColor && inheritedColor.backgroundLight != backgroundLightness) {
                    rgbaString = inheritedColor.originalColor;
                }
                if (prevColor && prevColor !== undefined) {
                    let newColor = Object.assign({}, prevColor);
                    return Object.assign(newColor, {
                        reason: Colors.ColorReason.Previous,
                        originalColor: rgbaString,
                        owner: this._app.isDebug ? tag : null,
                        base: this._app.isDebug ? prevColor : null
                    });
                }
                else {
                    let rgba = Colors.RgbaColor.parse(rgbaString), result;
                    if (rgba.alpha === 0) {
                        result = {
                            color: null,
                            light: 0,
                            backgroundLight: backgroundLightness,
                            originalLight: 0,
                            originalColor: rgbaString,
                            alpha: 0,
                            reason: Colors.ColorReason.Transparent,
                            owner: this._app.isDebug ? tag : null,
                        };
                        this._colors.set(key, result);
                        return result;
                    }
                    else {
                        let hsla = Colors.RgbaColor.toHslaColor(rgba);
                        let originalLight = hsla.lightness;
                        this.changeHslaColor(hsla, backgroundLightness, customContrast);
                        let newRgbColor = Colors.HslaColor.toRgbaColor(hsla);
                        result = {
                            color: newRgbColor.toString(),
                            light: hsla.lightness,
                            backgroundLight: backgroundLightness,
                            originalLight: originalLight,
                            originalColor: rgbaString,
                            alpha: rgba.alpha,
                            reason: Colors.ColorReason.Ok,
                            owner: this._app.isDebug ? tag : null,
                        };
                        this._colors.set(key, result);
                        return result;
                    }
                }
            }
        }
        let TextShadowColorProcessor = class TextShadowColorProcessor extends ForegroundColorProcessor {
            constructor(app, settingsManager) {
                super(app, settingsManager);
                this._component = Colors.Component.TextShadow;
            }
        };
        TextShadowColorProcessor = __decorate([
            MidnightLizard.DI.injectable(ITextShadowColorProcessor),
            __metadata("design:paramtypes", [MidnightLizard.Settings.IApplicationSettings, MidnightLizard.Settings.IBaseSettingsManager])
        ], TextShadowColorProcessor);
        let TextColorProcessor = class TextColorProcessor extends ForegroundColorProcessor {
            constructor(app, settingsManager) {
                super(app, settingsManager);
                this._component = Colors.Component.Text;
            }
        };
        TextColorProcessor = __decorate([
            MidnightLizard.DI.injectable(ITextColorProcessor),
            __metadata("design:paramtypes", [MidnightLizard.Settings.IApplicationSettings, MidnightLizard.Settings.IBaseSettingsManager])
        ], TextColorProcessor);
        let BorderColorProcessor = class BorderColorProcessor extends ForegroundColorProcessor {
            constructor(app, settingsManager) {
                super(app, settingsManager);
                this._component = Colors.Component.Border;
            }
        };
        BorderColorProcessor = __decorate([
            MidnightLizard.DI.injectable(IBorderColorProcessor),
            __metadata("design:paramtypes", [MidnightLizard.Settings.IApplicationSettings, MidnightLizard.Settings.IBaseSettingsManager])
        ], BorderColorProcessor);
        let ScrollbarHoverColorProcessor = class ScrollbarHoverColorProcessor extends ForegroundColorProcessor {
            constructor(app, settingsManager) {
                super(app, settingsManager);
                this._component = Colors.Component.Scrollbar$Hover;
            }
        };
        ScrollbarHoverColorProcessor = __decorate([
            MidnightLizard.DI.injectable(IScrollbarHoverColorProcessor),
            __metadata("design:paramtypes", [MidnightLizard.Settings.IApplicationSettings, MidnightLizard.Settings.IBaseSettingsManager])
        ], ScrollbarHoverColorProcessor);
        let ScrollbarNormalColorProcessor = class ScrollbarNormalColorProcessor extends ForegroundColorProcessor {
            constructor(app, settingsManager) {
                super(app, settingsManager);
                this._component = Colors.Component.Scrollbar$Normal;
            }
        };
        ScrollbarNormalColorProcessor = __decorate([
            MidnightLizard.DI.injectable(IScrollbarNormalColorProcessor),
            __metadata("design:paramtypes", [MidnightLizard.Settings.IApplicationSettings, MidnightLizard.Settings.IBaseSettingsManager])
        ], ScrollbarNormalColorProcessor);
        let ScrollbarActiveColorProcessor = class ScrollbarActiveColorProcessor extends ForegroundColorProcessor {
            constructor(app, settingsManager) {
                super(app, settingsManager);
                this._component = Colors.Component.Scrollbar$Active;
            }
        };
        ScrollbarActiveColorProcessor = __decorate([
            MidnightLizard.DI.injectable(IScrollbarActiveColorProcessor),
            __metadata("design:paramtypes", [MidnightLizard.Settings.IApplicationSettings, MidnightLizard.Settings.IBaseSettingsManager])
        ], ScrollbarActiveColorProcessor);
    })(Colors = MidnightLizard.Colors || (MidnightLizard.Colors = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="../DI/-DI.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var Colors;
    (function (Colors) {
        class IColorToRgbaStringConverter {
        }
        Colors.IColorToRgbaStringConverter = IColorToRgbaStringConverter;
        let ColorToRgbaStringConverter = class ColorToRgbaStringConverter {
            constructor(_document) {
                this._document = _document;
            }
            /** Converts HslaColor to RgbaColor */
            convert(colorName) {
                let div = this._document.createElement("div");
                div.style.setProperty("display", "none", "important");
                div.style.setProperty("color", colorName, "important");
                div.mlIgnore = true;
                this._document.body.appendChild(div);
                let rgbStr = this._document.defaultView.getComputedStyle(div, "").color;
                this._document.body.removeChild(div);
                return rgbStr;
            }
        };
        ColorToRgbaStringConverter = __decorate([
            MidnightLizard.DI.injectable(IColorToRgbaStringConverter),
            __metadata("design:paramtypes", [Document])
        ], ColorToRgbaStringConverter);
    })(Colors = MidnightLizard.Colors || (MidnightLizard.Colors = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="../Colors/-Colors.ts" />
/// <reference path="../Utils/-Utils.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="DocumentObserver.ts" />
/// <reference path="StyleSheetProcessor.ts" />
/// <reference path="SettingsManager.ts" />
/// <reference path="../Colors/BackgroundColorProcessor.ts" />
/// <reference path="../Colors/ForegroundColorProcessor.ts" />
/// <reference path="../Colors/ColorToRgbaStringConverter.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var ContentScript;
    (function (ContentScript) {
        let dom = MidnightLizard.Events.HtmlEvent;
        let cx = MidnightLizard.Colors.RgbaColor;
        let Status = MidnightLizard.Util.PromiseStatus;
        let ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;
        const important = "important";
        class IDocumentProcessor {
        }
        ContentScript.IDocumentProcessor = IDocumentProcessor;
        /** Base Document Processor */
        let DocumentProcessor = DocumentProcessor_1 = class DocumentProcessor {
            /** DocumentProcessor constructor
             * @param _app - Application settings
             * @param _rootDocument - Root Document to be processed
             * @param _settingsManager - Settings manager
             */
            constructor(css, _rootDocument, _app, _settingsManager, _documentObserver, _styleSheetProcessor, _backgroundColorProcessor, _svgColorProcessor, _scrollbarHoverColorProcessor, _scrollbarNormalColorProcessor, _scrollbarActiveColorProcessor, _textColorProcessor, _textShadowColorProcessor, _borderColorProcessor, _colorConverter) {
                this._rootDocument = _rootDocument;
                this._app = _app;
                this._settingsManager = _settingsManager;
                this._documentObserver = _documentObserver;
                this._styleSheetProcessor = _styleSheetProcessor;
                this._backgroundColorProcessor = _backgroundColorProcessor;
                this._svgColorProcessor = _svgColorProcessor;
                this._scrollbarHoverColorProcessor = _scrollbarHoverColorProcessor;
                this._scrollbarNormalColorProcessor = _scrollbarNormalColorProcessor;
                this._scrollbarActiveColorProcessor = _scrollbarActiveColorProcessor;
                this._textColorProcessor = _textColorProcessor;
                this._textShadowColorProcessor = _textShadowColorProcessor;
                this._borderColorProcessor = _borderColorProcessor;
                this._colorConverter = _colorConverter;
                this._rootDocumentLoaded = false;
                this._images = new Map();
                this._imagePromises = new Map();
                this._dorm = new WeakMap();
                this._onRootDocumentProcessing = new ArgEventDispatcher();
                this._css = css;
                this._boundUserActionHandler = this.onUserAction.bind(this);
                dom.addEventListener(this._rootDocument, "DOMContentLoaded", this.onDocumentContentLoaded, this);
                _settingsManager.onSettingsInitialized.addListener(this.onSettingsInitialized, this);
                _settingsManager.onSettingsChanged.addListener(this.onSettingsChanged, this, MidnightLizard.Events.EventHandlerPriority.Low);
                _documentObserver.onElementsAdded.addListener(this.onElementsAdded, this);
                _documentObserver.onClassChanged.addListener(this.onClassChanged, this);
                _documentObserver.onStyleChanged.addListener(this.onStyleChanged, this);
            }
            get shift() { return this._settingsManager.shift; }
            get onRootDocumentProcessing() {
                return this._onRootDocumentProcessing.event;
            }
            onSettingsChanged(response, shift) {
                this._images.clear();
                this._imagePromises.clear();
                this.restoreDocumentColors(this._rootDocument);
                if (this._settingsManager.isActive) {
                    this.createDynamicStyle(this._rootDocument);
                    this.processRootDocument();
                }
                response(this._settingsManager.currentSettings);
            }
            onSettingsInitialized(shift) {
                if (this._rootDocumentLoaded) {
                    this.processRootDocument();
                }
                else if (this._settingsManager.isActive) {
                    this.createLoadingStyles(this._rootDocument);
                }
                if (this._settingsManager.isActive) {
                    this.createDynamicStyle(this._rootDocument);
                }
            }
            onDocumentContentLoaded() {
                dom.removeEventListener(this._rootDocument, "DOMContentLoaded", this.onDocumentContentLoaded);
                this._rootDocumentLoaded = true;
                if (this._settingsManager.isActive !== undefined) {
                    this.processRootDocument();
                }
            }
            processRootDocument() {
                this._onRootDocumentProcessing.raise(this._rootDocument);
                this.processDocument(this._rootDocument);
            }
            processDocument(doc) {
                if (doc.body && doc.defaultView && this._settingsManager.isActive) {
                    document.dispatchEvent(new CustomEvent("processing", { detail: doc }));
                    this._styleSheetProcessor.processDocumentStyleSheets(doc);
                    this._dorm.set(doc, new Map());
                    doc.viewArea = doc.defaultView.innerHeight * doc.defaultView.innerWidth;
                    if (this._settingsManager.currentSettings.restoreColorsOnCopy) {
                        dom.addEventListener(doc, "copy", this.onCopy, this, false, doc);
                    }
                    this.applyLoadingShadow(doc.documentElement);
                    this.removeLoadingStyles(doc);
                    this.createPseudoStyles(doc);
                    doc.body.isChecked = true;
                    this.processElement(doc.body);
                    this._documentObserver.startDocumentObservation(doc);
                    let allTags = Array.prototype.slice.call(doc.getElementsByTagName("*"))
                        .filter((tag) => this.checkElement(tag));
                    DocumentProcessor_1.processAllElements(allTags, doc.documentElement, this);
                }
            }
            observeUserActions(tag) {
                let preFilteredSelectors = this._styleSheetProcessor.getPreFilteredSelectors(tag);
                if (preFilteredSelectors.length > 0) {
                    if (this._styleSheetProcessor.canHavePseudoClass(tag, preFilteredSelectors, ContentScript.PseudoClass.Hover)) {
                        dom.addEventListener(tag, "mouseenter", this._boundUserActionHandler);
                        dom.addEventListener(tag, "mouseleave", this._boundUserActionHandler);
                    }
                    if (this._styleSheetProcessor.canHavePseudoClass(tag, preFilteredSelectors, ContentScript.PseudoClass.Focus)) {
                        dom.addEventListener(tag, "focus", this._boundUserActionHandler);
                        dom.addEventListener(tag, "blur", this._boundUserActionHandler);
                    }
                    if (this._styleSheetProcessor.canHavePseudoClass(tag, preFilteredSelectors, ContentScript.PseudoClass.Active)) {
                        dom.addEventListener(tag, "mousedown", this._boundUserActionHandler);
                        dom.addEventListener(tag, "mouseup", this._boundUserActionHandler);
                    }
                    if (this._styleSheetProcessor.canHavePseudoClass(tag, preFilteredSelectors, ContentScript.PseudoClass.Checked)) {
                        dom.addEventListener(tag, "input", this._boundUserActionHandler);
                        dom.addEventListener(tag, "change", this._boundUserActionHandler);
                    }
                }
            }
            onUserAction(eArg) {
                if (this._settingsManager.isActive && eArg.currentTarget.selectors !==
                    this._styleSheetProcessor.getElementMatchedSelectors(eArg.currentTarget)) {
                    this.reCalcRootElement(eArg.currentTarget, false, true);
                }
            }
            onCopy(doc) {
                let sel = doc.defaultView.getSelection();
                if (sel && !sel.isCollapsed) {
                    let rootElem = sel.getRangeAt(0).commonAncestorContainer;
                    rootElem.mlBgColor = null;
                    if (!this.checkElement(rootElem)) {
                        rootElem = rootElem.parentElement || rootElem;
                    }
                    rootElem = this.getColoredParent(rootElem, true, true);
                    this.reCalcRootElement(rootElem, true);
                }
            }
            reCalcRootElement(rootElem, full, clearParentBgColors = false) {
                if (rootElem) {
                    let allTags = rootElem.firstElementChild ? Array.prototype.slice.call(rootElem.getElementsByTagName("*")) : null;
                    if (allTags && allTags.length > 0) {
                        let skipSelectors = full || allTags.length < 2;
                        let filteredTags = allTags.filter(el => el.isChecked && el.mlBgColor && (skipSelectors || el.selectors !== this._styleSheetProcessor.getElementMatchedSelectors(el)));
                        if (!skipSelectors && clearParentBgColors) {
                            allTags.forEach(tag => {
                                tag.mlParentBgColor = null;
                                if (tag.mlBgColor && tag.mlBgColor.color === null) {
                                    tag.mlBgColor = null;
                                }
                            });
                        }
                        filteredTags.splice(0, 0, rootElem);
                        this._documentObserver.stopDocumentObservation(rootElem.ownerDocument);
                        if (filteredTags.length < 10 || full) {
                            filteredTags.forEach(tag => this.restoreElementColors(tag));
                            DocumentProcessor_1.processAllElements(filteredTags, rootElem, this, DocumentProcessor_1._smallReCalculationDelays);
                        }
                        else {
                            this.applyLoadingShadow(rootElem);
                            filteredTags.forEach(tag => this.restoreElementColors(tag));
                            DocumentProcessor_1.processAllElements(filteredTags, rootElem, this, DocumentProcessor_1._bigReCalculationDelays);
                        }
                    }
                    else {
                        this._documentObserver.stopDocumentObservation(rootElem.ownerDocument);
                        this.restoreElementColors(rootElem);
                        DocumentProcessor_1.procElementsChunk([rootElem], this, null, 0);
                    }
                }
            }
            onStyleChanged(changedElements) {
                let elementsForReCalculation = new Set();
                changedElements.forEach(tag => {
                    let needReCalculation = false, value;
                    const ns = tag instanceof tag.ownerDocument.defaultView.SVGElement ? ContentScript.USP.svg : ContentScript.USP.htm;
                    value = tag.style.getPropertyValue(ns.css.bgrColor);
                    if (value && tag.style.getPropertyPriority(ns.css.bgrColor) !== important ||
                        tag.mlBgColor && tag.mlBgColor.color && tag.mlBgColor.color !== value) {
                        tag.originalBackgroundColor = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.zIndex);
                    if (value && tag.style.getPropertyPriority(this._css.zIndex) !== important) {
                        tag.originalZIndex = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(ns.css.fntColor);
                    if (value && tag.style.getPropertyPriority(ns.css.fntColor) !== important ||
                        tag.mlColor && tag.mlColor.color && tag.mlColor.color !== value) {
                        tag.originalColor = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.textShadow);
                    if (value && tag.style.getPropertyPriority(this._css.textShadow) !== important) {
                        tag.originalTextShadow = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(ns.css.brdColor);
                    if (value && tag.style.getPropertyPriority(ns.css.brdColor) !== important) {
                        tag.originalBorderColor = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.borderTopColor);
                    if (value && tag.style.getPropertyPriority(this._css.borderTopColor) !== important) {
                        tag.originalBorderTopColor = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.borderRightColor);
                    if (value && tag.style.getPropertyPriority(this._css.borderRightColor) !== important) {
                        tag.originalBorderRightColor = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.borderBottomColor);
                    if (value && tag.style.getPropertyPriority(this._css.borderBottomColor) !== important) {
                        tag.originalBorderBottomColor = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.borderLeftColor);
                    if (value && tag.style.getPropertyPriority(this._css.borderLeftColor) !== important) {
                        tag.originalBorderLeftColor = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.backgroundImage);
                    if (value && tag.style.getPropertyPriority(this._css.backgroundImage) !== important) {
                        tag.originalBackgroundImage = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.backgroundSize);
                    if (value && tag.style.getPropertyPriority(this._css.backgroundSize) !== important) {
                        tag.originalBackgroundSize = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.filter);
                    if (value && tag.style.getPropertyPriority(this._css.filter) !== important) {
                        tag.originalFilter = value;
                        needReCalculation = true;
                    }
                    if (needReCalculation) {
                        elementsForReCalculation.add(tag);
                    }
                });
                elementsForReCalculation.forEach(tag => this.reCalcRootElement(tag, false));
            }
            onClassChanged(changedElements) {
                changedElements.forEach(tag => this.reCalcRootElement(tag, false));
            }
            onElementsAdded(addedElements) {
                let allNewTags = Array.from(addedElements.values()).filter(tag => this.checkElement(tag));
                DocumentProcessor_1.processAllElements(allNewTags, null, this);
                let allChildTags = new Set();
                allNewTags.forEach(newTag => {
                    Array.prototype.forEach.call(newTag.getElementsByTagName("*"), (childTag) => {
                        if (!addedElements.has(childTag) && this.checkElement(childTag)) {
                            allChildTags.add(childTag);
                        }
                    });
                });
                DocumentProcessor_1.processAllElements(Array.from(allChildTags.values()), null, this);
            }
            static processAllElements(allTags, shadowElement, docProc, delays = DocumentProcessor_1._normalDelays) {
                if (allTags.length > 0) {
                    let viewColorTags = new Array(), visColorTags = new Array(), invisColorTags = new Array(), viewImageTags = new Array(), visImageTags = new Array(), invisImageTags = new Array(), viewTransTags = new Array(), visTransTags = new Array(), invisTransTags = new Array(), ns = ContentScript.USP.htm, isSvg, bgrColor, isVisible, hasBgColor, hasImage, inView, hm = allTags[0].ownerDocument.defaultView.innerHeight, wm = allTags[0].ownerDocument.defaultView.innerWidth;
                    for (let tag of allTags) {
                        isSvg = tag instanceof tag.ownerDocument.defaultView.SVGElement;
                        ns = isSvg ? ContentScript.USP.svg : ContentScript.USP.htm;
                        tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "");
                        isVisible = tag.tagName == "BODY" || !isSvg && tag.offsetParent !== null || tag.computedStyle.position == "fixed" || isSvg;
                        bgrColor = tag.computedStyle.getPropertyValue(ns.css.bgrColor);
                        hasBgColor = !!bgrColor && bgrColor !== "rgba(0, 0, 0, 0)";
                        hasImage = tag.computedStyle.backgroundImage !== "none" || tag.tagName === ns.img;
                        if (isVisible) {
                            tag.rect = tag.rect || tag.getBoundingClientRect();
                            isVisible = tag.rect.width !== 0 && tag.rect.height !== 0;
                            inView = isVisible &&
                                (tag.rect.bottom > 0 && tag.rect.bottom < hm || tag.rect.top > 0 && tag.rect.top < hm) &&
                                (tag.rect.right > 0 && tag.rect.right < wm || tag.rect.left > 0 && tag.rect.left < wm);
                            if (!isVisible) {
                                tag.rect = null;
                                if (hasBgColor)
                                    invisColorTags.push(tag);
                                else if (hasImage)
                                    invisImageTags.push(tag);
                                else
                                    invisTransTags.push(tag);
                            }
                            else if (hasBgColor) {
                                if (inView)
                                    viewColorTags.push(tag);
                                else
                                    visColorTags.push(tag);
                            }
                            else if (hasImage) {
                                if (inView)
                                    viewImageTags.push(tag);
                                else
                                    visImageTags.push(tag);
                            }
                            else {
                                if (inView)
                                    viewTransTags.push(tag);
                                else
                                    visTransTags.push(tag);
                            }
                        }
                        else {
                            if (hasBgColor)
                                invisColorTags.push(tag);
                            else if (hasImage)
                                invisImageTags.push(tag);
                            else
                                invisTransTags.push(tag);
                        }
                    }
                    let tagsArray = [
                        [viewColorTags, null, docProc], [visColorTags, null, docProc], [viewImageTags, null, docProc],
                        [viewTransTags, null, docProc], [visTransTags, null, docProc], [visImageTags, null, docProc],
                        [invisColorTags, null, docProc], [invisImageTags, null, docProc], [invisTransTags, null, docProc]
                    ].filter(param => param[0].length > 0);
                    if (tagsArray.length > 0) {
                        tagsArray[0][1] = shadowElement;
                        let density = 2000 / allTags.length;
                        let delayArray = delays.map(d => Math.round(d / density));
                        MidnightLizard.Util.forEachPromise(tagsArray, DocumentProcessor_1.processElements, 0, (prevDelay, index) => delayArray[index]);
                    }
                    else if (shadowElement) {
                        DocumentProcessor_1.removeLoadingShadow(shadowElement, docProc);
                    }
                }
                else if (shadowElement) {
                    DocumentProcessor_1.removeLoadingShadow(shadowElement, docProc);
                }
            }
            static processElements(tags, shadowElement, docProc, prev, delay) {
                shadowElement && DocumentProcessor_1.removeLoadingShadow(shadowElement, docProc);
                if (tags.length > 0) {
                    let chunkLength = 500, cssPromises = null;
                    let needObservation = docProc._styleSheetProcessor.getSelectorsCount(tags[0].ownerDocument);
                    if (needObservation) {
                        cssPromises = docProc._styleSheetProcessor.getCssPromises(tags[0].ownerDocument);
                    }
                    if (tags.length < chunkLength) {
                        let result = DocumentProcessor_1.procElementsChunk(tags, docProc, null, delay);
                        if (needObservation) {
                            Promise.all([tags, docProc, result, ...cssPromises])
                                .then(([t, dp]) => DocumentProcessor_1.startObservation(t, dp));
                        }
                        return result;
                    }
                    else {
                        let result = MidnightLizard.Util.forEachPromise(MidnightLizard.Util.sliceIntoChunks(tags, chunkLength).map(chunk => [chunk, docProc]), DocumentProcessor_1.procElementsChunk, delay);
                        if (needObservation) {
                            Promise.all([tags, docProc, result, ...cssPromises])
                                .then(([t, dp]) => DocumentProcessor_1.startObservation(t, dp));
                        }
                        return result;
                    }
                }
                return undefined;
            }
            static procElementsChunk(chunk, docProc, prev, delay) {
                let paramsForPromiseAll = [chunk, chunk[0].ownerDocument, delay];
                docProc._documentObserver.stopDocumentObservation(chunk[0].ownerDocument);
                let results = chunk.map(tag => docProc.processElement(tag));
                docProc._documentObserver.startDocumentObservation(chunk[0].ownerDocument);
                results.filter(r => r).forEach(r => paramsForPromiseAll.push(...r.map(MidnightLizard.Util.handlePromise)));
                return Promise.all(paramsForPromiseAll)
                    .then(([tags, doc, dl, ...cssArray]) => {
                    let css = cssArray
                        .filter(result => result.status === Status.Success && result.data)
                        .map(result => result.data)
                        .join("\n");
                    if (css) {
                        if (dl) {
                            setTimeout((d, c) => d.mlPseudoStyles.appendChild(d.createTextNode(c)), dl, doc, css);
                        }
                        else {
                            doc.mlPseudoStyles.appendChild(doc.createTextNode(css));
                        }
                    }
                    return tags;
                });
            }
            static startObservation(tags, docProc) {
                tags.forEach(tag => {
                    if (!tag.isObserved) {
                        docProc.observeUserActions(tag);
                        tag.isObserved = true;
                    }
                });
            }
            tagIsSmall(tag) {
                let maxSize = 40, maxAxis = 16, check = (w, h) => w > 0 && h > 0 && (w < maxSize && h < maxSize || w < maxAxis || h < maxAxis);
                tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "");
                let width = parseInt(tag.computedStyle.width), height = parseInt(tag.computedStyle.height);
                if (!isNaN(width) && !isNaN(height)) {
                    tag.area = tag.area || width * height;
                    return check(width, height);
                }
                else if (!isNaN(width) && width < maxAxis && width > 0) {
                    return true;
                }
                else if (!isNaN(height) && height < maxAxis && height > 0) {
                    return true;
                }
                else {
                    tag.rect = tag.rect || tag.getBoundingClientRect();
                    tag.area = tag.rect.width * tag.rect.height;
                    return check(tag.rect.width, tag.rect.height);
                }
            }
            calcTagArea(tag) {
                if (tag.area === undefined) {
                    tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "");
                    let width = parseInt(tag.computedStyle.width), height = parseInt(tag.computedStyle.height);
                    if (!isNaN(width) && !isNaN(height)) {
                        tag.area = width * height;
                    }
                    else {
                        tag.rect = tag.rect || tag.getBoundingClientRect();
                        tag.area = tag.rect.width * tag.rect.height;
                    }
                }
            }
            calcElementPath(tag) {
                let parentPath = "";
                if (tag.parentElement) {
                    parentPath = (tag.parentElement.path ? tag.parentElement.path : this.calcElementPath(tag.parentElement)) + " ";
                }
                tag.path = parentPath + tag.tagName + "." + tag.classList.toString() + "#" + tag.id + tag.style.backgroundColor + (tag.bgColor || "");
                return tag.path;
            }
            getElementIndex(tag) {
                // do not remove {var}
                for (var i = 0; tag = tag.previousElementSibling; i++)
                    ;
                return i;
            }
            getParentBackground(tag, probeRect) {
                let result = MidnightLizard.Colors.ColorEntry.NotFound;
                if (tag.parentElement) {
                    let bgColor;
                    let doc = tag.ownerDocument;
                    let isSvg = tag instanceof doc.defaultView.SVGElement && tag.parentElement instanceof doc.defaultView.SVGElement;
                    tag.computedStyle = tag.computedStyle || doc.defaultView.getComputedStyle(tag, "");
                    if (ContentScript.isRealElement(tag) && (tag.computedStyle.position == "absolute" || tag.computedStyle.position == "relative" || isSvg)) {
                        tag.zIndex = isSvg ? this.getElementIndex(tag) : parseInt(tag.computedStyle.zIndex || "0");
                        tag.zIndex = isNaN(tag.zIndex) ? -999 : tag.zIndex;
                        let children = Array.prototype.filter.call(tag.parentElement.children, (otherTag, index) => {
                            if (otherTag != tag && (otherTag.isChecked || otherTag.isChecked === undefined && this.checkElement(otherTag))) {
                                otherTag.zIndex = otherTag.zIndex || isSvg ? -index :
                                    parseInt((otherTag.computedStyle = otherTag.computedStyle ? otherTag.computedStyle
                                        : doc.defaultView.getComputedStyle(otherTag, "")).zIndex || "0");
                                otherTag.zIndex = isNaN(otherTag.zIndex) ? -999 : otherTag.zIndex;
                                if (otherTag.mlBgColor && otherTag.mlBgColor.color && otherTag.zIndex < tag.zIndex) {
                                    probeRect = probeRect || (tag.rect = tag.rect || tag.getBoundingClientRect());
                                    otherTag.rect = otherTag.rect || otherTag.getBoundingClientRect();
                                    if (otherTag.rect.left <= probeRect.left && otherTag.rect.top <= probeRect.top &&
                                        otherTag.rect.right >= probeRect.right && otherTag.rect.bottom >= probeRect.bottom) {
                                        return true;
                                    }
                                }
                            }
                            return false;
                        });
                        if (children.length > 0) {
                            let maxZIndex = 0;
                            children.forEach(el => {
                                if (el.zIndex > maxZIndex) {
                                    maxZIndex = el.zIndex;
                                    bgColor = el.mlBgColor;
                                }
                            });
                        }
                    }
                    bgColor = bgColor || tag.parentElement.mlBgColor || tag.parentElement.mlParentBgColor;
                    if (bgColor) {
                        result = bgColor;
                    }
                    else {
                        probeRect = probeRect || (tag.rect = tag.rect || tag.getBoundingClientRect());
                        result = this.getParentBackground(tag.parentElement, probeRect);
                    }
                }
                ContentScript.isRealElement(tag) && (tag.mlParentBgColor = result);
                return result;
            }
            getColoredParent(tag, checkBackground, checkForeground) {
                let bgOk = !checkBackground || !!tag.style.backgroundColor, fgOk = !checkForeground || !!tag.style.color;
                if (bgOk && fgOk) {
                    return tag;
                }
                else if (tag.parentElement) {
                    return this.getColoredParent(tag.parentElement, !bgOk, !fgOk);
                }
                else {
                    return tag;
                }
            }
            getInheritedFontColor(tag, rgbStr) {
                if (tag.parentElement) {
                    if (tag.parentElement.style.color !== "") {
                        if (tag.parentElement.mlColor && tag.parentElement.mlColor.color === rgbStr) {
                            return tag.parentElement.mlColor;
                        }
                    }
                    else {
                        return this.getInheritedFontColor(tag.parentElement, rgbStr);
                    }
                }
                return null;
            }
            getInheritedTextShadowColor(tag, rgbStr) {
                if (tag.parentElement) {
                    if (tag.parentElement.style.textShadow !== "none") {
                        if (tag.parentElement.mlTextShadow && tag.parentElement.mlTextShadow.color == rgbStr) {
                            return tag.parentElement.mlTextShadow;
                        }
                    }
                    else {
                        return this.getInheritedTextShadowColor(tag.parentElement, rgbStr);
                    }
                }
                return null;
            }
            applyLoadingShadow(tag) {
                if (tag.tagName != "IMG") {
                    tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "");
                    let filter = [
                        this.shift.Background.lightnessLimit < 1 ? "brightness(" + this.shift.Background.lightnessLimit + ")" : "",
                        tag.computedStyle.filter != "none" ? tag.computedStyle.filter : ""
                    ].join(" ");
                    if (!tag.originalFilter) {
                        tag.originalFilter = tag.style.filter;
                    }
                    tag.style.setProperty("filter", filter);
                }
                return tag;
            }
            static removeLoadingShadow(tag, docProc) {
                let originalState = docProc._documentObserver.stopDocumentObservation(tag.ownerDocument);
                tag.setAttribute("transition", "filter");
                tag.style.filter = tag.originalFilter;
                tag.originalFilter = undefined;
                docProc._documentObserver.startDocumentObservation(tag.ownerDocument, originalState);
            }
            restoreDocumentColors(doc) {
                this._documentObserver.stopDocumentObservation(doc);
                this.removeDynamicStyle(doc);
                this.clearPseudoStyles(doc);
                for (let tag of doc.getElementsByTagName("*")) {
                    this.restoreElementColors(tag);
                }
            }
            restoreElementColors(tag) {
                if (tag.mlBgColor) {
                    let ns = tag instanceof tag.ownerDocument.defaultView.SVGElement ? ContentScript.USP.svg : ContentScript.USP.htm;
                    tag.mlBgColor = null;
                    tag.mlColor = null;
                    tag.mlTextShadow = null;
                    tag.mlParentBgColor = null;
                    tag.computedStyle = null;
                    tag.rect = null;
                    tag.selectors = null;
                    if (tag.originalBackgroundColor !== undefined) {
                        tag.style.setProperty(ns.css.bgrColor, tag.originalBackgroundColor);
                    }
                    if (tag.originalDisplay !== undefined) {
                        tag.style.display = tag.originalDisplay;
                    }
                    if (tag.originalZIndex !== undefined) {
                        tag.style.zIndex = tag.originalZIndex;
                    }
                    if (tag.originalColor !== undefined) {
                        tag.style.setProperty(ns.css.fntColor, tag.originalColor);
                    }
                    if (tag.originalTextShadow !== undefined) {
                        tag.style.textShadow = tag.originalTextShadow;
                    }
                    if (tag.originalBorderColor !== undefined) {
                        tag.style.setProperty(ns.css.brdColor, tag.originalBorderColor);
                    }
                    if (tag.originalBorderTopColor !== undefined) {
                        tag.style.borderTopColor = tag.originalBorderTopColor;
                    }
                    if (tag.originalBorderRightColor !== undefined) {
                        tag.style.borderRightColor = tag.originalBorderRightColor;
                    }
                    if (tag.originalBorderBottomColor !== undefined) {
                        tag.style.borderBottomColor = tag.originalBorderBottomColor;
                    }
                    if (tag.originalBorderLeftColor !== undefined) {
                        tag.style.borderLeftColor = tag.originalBorderLeftColor;
                    }
                    if (tag.originalBackgroundImage !== undefined) {
                        tag.style.backgroundImage = tag.originalBackgroundImage;
                        if (tag.originalBackgroundSize !== undefined) {
                            tag.style.backgroundSize = tag.originalBackgroundSize;
                        }
                    }
                    if (tag.originalFilter !== undefined) {
                        tag.style.filter = tag.originalFilter;
                    }
                    if (tag.hasAttribute("transition")) {
                        tag.removeAttribute("transition");
                    }
                    if (tag.hasAttribute("before-style")) {
                        tag.removeAttribute("before-style");
                    }
                    if (tag.hasAttribute("after-style")) {
                        tag.removeAttribute("after-style");
                    }
                    if (tag instanceof tag.ownerDocument.defaultView.HTMLIFrameElement) {
                        try {
                            this.restoreDocumentColors(tag.contentDocument || tag.contentWindow.document);
                        }
                        catch (ex) {
                            this._app.isDebug && console.error(ex);
                        }
                    }
                }
            }
            checkElement(tag) {
                return tag.isChecked =
                    (tag instanceof Element || tag.ownerDocument && tag.ownerDocument.defaultView && tag instanceof tag.ownerDocument.defaultView.HTMLElement) &&
                        !tag.mlBgColor && !!tag.tagName && !tag.mlIgnore && !!tag.style;
            }
            processElement(tag) {
                if (tag && tag.ownerDocument.defaultView && !tag.mlBgColor) {
                    let doc = tag.ownerDocument;
                    let isSmall, bgInverted;
                    let bgLight, roomRules, room = null;
                    let isSvg = tag instanceof doc.defaultView.SVGElement, isSvgText = tag instanceof doc.defaultView.SVGTextContentElement, isTable = tag instanceof doc.defaultView.HTMLTableElement || tag instanceof doc.defaultView.HTMLTableCellElement ||
                        tag instanceof doc.defaultView.HTMLTableRowElement || tag instanceof doc.defaultView.HTMLTableSectionElement;
                    let ns = isSvg ? ContentScript.USP.svg : ContentScript.USP.htm;
                    let beforePseudoElement, afterPseudoElement;
                    if (tag instanceof doc.defaultView.HTMLIFrameElement) {
                        setTimeout(dom.addEventListener(tag, "load", this.onIFrameLoaded, this, false, tag), 1);
                    }
                    if (ContentScript.isRealElement(tag) && tag.contentEditable == "true")
                        this.overrideInnerHtml(tag);
                    this.calcElementPath(tag);
                    tag.selectors = this._styleSheetProcessor.getElementMatchedSelectors(tag);
                    room = [tag.path, tag.selectors, tag.style.cssText, tag.color,
                        isSvg && tag.getAttribute("fill") ||
                            isTable && (tag.bgColor || tag.background || tag.getAttribute("background")), isSvg].join("\n");
                    roomRules = this._dorm.get(doc).get(room);
                    if (!roomRules) {
                        roomRules = new ContentScript.RoomRules();
                        this._app.isDebug && (roomRules.owner = tag);
                        tag.computedStyle = tag.computedStyle || doc.defaultView.getComputedStyle(tag, "");
                        if (ContentScript.isRealElement(tag)) {
                            let beforeStyle = doc.defaultView.getComputedStyle(tag, ":before");
                            let afterStyle = doc.defaultView.getComputedStyle(tag, ":after");
                            let roomId = "";
                            if (beforeStyle && beforeStyle.content) {
                                roomId = roomId || (room ? MidnightLizard.Util.hashCode(room).toString() : MidnightLizard.Util.guid());
                                beforePseudoElement = new ContentScript.PseudoElement(ContentScript.PseudoType.Before, tag, roomId, beforeStyle);
                                roomRules.attributes = roomRules.attributes || new Map();
                                roomRules.attributes.set("before-style", roomId);
                            }
                            if (afterStyle && afterStyle.content) {
                                roomId = roomId || (room ? MidnightLizard.Util.hashCode(room).toString() : MidnightLizard.Util.guid());
                                afterPseudoElement = new ContentScript.PseudoElement(ContentScript.PseudoType.After, tag, roomId, afterStyle);
                                roomRules.attributes = roomRules.attributes || new Map();
                                roomRules.attributes.set("after-style", roomId);
                            }
                        }
                        if (!isSvgText) {
                            if (isSvg) {
                                if (this.tagIsSmall(tag)) {
                                    isSvgText = true;
                                    roomRules.backgroundColor = Object.assign({}, this.getParentBackground(tag));
                                    roomRules.backgroundColor.color = null;
                                }
                                else {
                                    roomRules.backgroundColor = this._svgColorProcessor.changeColor(tag.computedStyle.getPropertyValue(ns.css.bgrColor), false, tag, this.getParentBackground.bind(this));
                                }
                            }
                            else {
                                roomRules.backgroundColor = this._backgroundColorProcessor.changeColor(tag.computedStyle.getPropertyValue(ns.css.bgrColor), true, tag, this.getParentBackground.bind(this));
                            }
                            if (this._app.preserveDisplay && roomRules.backgroundColor.color && tag.id && tag.className) {
                                roomRules.display = tag.computedStyle.display;
                            }
                        }
                        else {
                            roomRules.backgroundColor = Object.assign({}, this.getParentBackground(tag));
                            roomRules.backgroundColor.color = null;
                        }
                        if ((tag.tagName == ns.img || tag instanceof doc.defaultView.HTMLInputElement &&
                            (tag.type == "checkbox" || tag.type == "radio") && tag.computedStyle.webkitAppearance !== "none") &&
                            (this.shift.Image.lightnessLimit < 1 || this.shift.Image.saturationLimit < 1)) {
                            let imgSet = this.shift.Image;
                            roomRules.filter =
                                {
                                    value: [
                                        imgSet.lightnessLimit < 1 ? `brightness(${imgSet.lightnessLimit})` : "",
                                        imgSet.saturationLimit < 1 ? `saturate(${imgSet.saturationLimit})` : "",
                                        tag.computedStyle.filter != "none" ? tag.computedStyle.filter : ""
                                    ].join(" ").trim()
                                };
                            roomRules.attributes = roomRules.attributes || new Map();
                            roomRules.attributes.set("transition", "filter");
                        }
                        let bgInverted = roomRules.backgroundColor.originalLight - roomRules.backgroundColor.light > this.shift.Text.contrast;
                        if (tag instanceof doc.defaultView.HTMLCanvasElement) {
                            let filterValue = new Array();
                            let bgrSet = this.shift.Background, txtSet = this.shift.Text;
                            if (bgInverted) {
                                filterValue.push(`brightness(${1 - bgrSet.lightnessLimit})`, bgrSet.saturationLimit < 1 ? `saturate(${bgrSet.saturationLimit})` : "", `invert(1)`, `brightness(${txtSet.lightnessLimit})`, tag.computedStyle.filter != "none" ? tag.computedStyle.filter : "");
                            }
                            else {
                                filterValue.push(bgrSet.lightnessLimit < 1 ? `brightness(${bgrSet.lightnessLimit})` : "", bgrSet.saturationLimit < 1 ? `saturate(${bgrSet.saturationLimit})` : "", tag.computedStyle.filter != "none" ? tag.computedStyle.filter : "");
                            }
                            roomRules.filter = { value: filterValue.join(" ").trim() };
                        }
                        if (tag.isPseudo && tag.computedStyle.content.substr(0, 3) == "url") {
                            let doInvert = !isTable && bgInverted && !DocumentProcessor_1._doNotInvertRegExp.test(tag.computedStyle.content) &&
                                (this.tagIsSmall(tag) || tag.parentElement.parentElement &&
                                    this.tagIsSmall(tag.parentElement.parentElement) &&
                                    tag.parentElement.parentElement.computedStyle.overflow === "hidden");
                            if (this.shift.Image.lightnessLimit < 1 || this.shift.Image.saturationLimit < 1 || doInvert) {
                                let imgSet = this.shift.Image;
                                roomRules.filter =
                                    {
                                        value: [
                                            imgSet.lightnessLimit < 1 && !doInvert ? `brightness(${imgSet.lightnessLimit})` : "",
                                            imgSet.saturationLimit < 1 ? `saturate(${imgSet.saturationLimit})` : "",
                                            doInvert ? `brightness(${1 - this.shift.Background.lightnessLimit})` : "",
                                            doInvert ? "invert(1)" : "",
                                            tag.computedStyle.filter != "none" ? tag.computedStyle.filter : ""
                                        ].join(" ").trim()
                                    };
                            }
                        }
                        if (tag.computedStyle.backgroundImage && tag.computedStyle.backgroundImage !== "none") {
                            let backgroundImage = tag.computedStyle.backgroundImage;
                            let gradientColorMatches = backgroundImage.match(/rgba?\([^)]+\)/gi);
                            let gradientColors = new Map();
                            if (gradientColorMatches) {
                                gradientColorMatches.forEach(color => gradientColors.set(color, Math.random().toString()));
                                gradientColors.forEach((id, color) => backgroundImage =
                                    backgroundImage.replace(new RegExp(MidnightLizard.Util.escapeRegex(color), "g"), id));
                            }
                            let backgroundSizes = tag.computedStyle.backgroundSize.match(/\b[^,]+/gi);
                            let backgroundImages = backgroundImage.match(/[\w-]+\([^)]+\)/gi);
                            let bgImgLight = 1, doInvert = false, isPseudoContent = false, bgFilter = "", haveToProcBgImg = false, haveToProcBgGrad = /gradient/gi.test(backgroundImage), isInput = false;
                            if (/\burl\(/gi.test(backgroundImage)) {
                                let bgImgSet = this.shift.BackgroundImage;
                                doInvert = !isTable && bgInverted && !DocumentProcessor_1._doNotInvertRegExp.test(backgroundImage) &&
                                    (this.tagIsSmall(tag) || !!tag.parentElement && !!tag.parentElement.parentElement &&
                                        this.tagIsSmall(tag.parentElement.parentElement) &&
                                        tag.parentElement.parentElement.computedStyle.overflow === "hidden");
                                if (bgImgSet.lightnessLimit < 1 || bgImgSet.saturationLimit < 1 || doInvert) {
                                    isPseudoContent = tag.isPseudo && tag.computedStyle.content !== "''" && tag.computedStyle.content !== '""';
                                    if (bgImgSet.lightnessLimit < 1 && !doInvert) {
                                        this.calcTagArea(tag);
                                        let area = 1 - Math.min(Math.max(tag.area, 1) / doc.viewArea, 1), lim = bgImgSet.lightnessLimit, txtLim = this.shift.Text.lightnessLimit;
                                        bgImgLight = Math.min(Math.pow((Math.pow((Math.pow(lim, (1 / 2)) - lim), (1 / 3)) * area), 3) + lim, Math.max(lim, txtLim));
                                    }
                                    bgFilter = [
                                        bgImgLight < 1 ? `brightness(${bgImgLight})` : "",
                                        bgImgSet.saturationLimit < 1 ? `saturate(${bgImgSet.saturationLimit})` : "",
                                        doInvert ? `brightness(${1 - this.shift.Background.lightnessLimit})` : "",
                                        doInvert ? "invert(1)" : ""
                                    ].join(" ").trim();
                                    if (tag.tagName !== "INPUT" && tag.tagName !== "TEXTAREA") {
                                        roomRules.filter = { value: bgFilter };
                                    }
                                    else
                                        isInput = true;
                                    haveToProcBgImg = ContentScript.isRealElement(tag) && !!tag.firstChild || isPseudoContent ||
                                        !!roomRules.backgroundColor.color || haveToProcBgGrad || isInput;
                                }
                            }
                            if (haveToProcBgImg || haveToProcBgGrad) {
                                roomRules.backgroundImages = backgroundImages.map((bgImg, index) => {
                                    gradientColors.forEach((id, color) => bgImg = bgImg.replace(new RegExp(id, "g"), color));
                                    let size = backgroundSizes[Math.min(index, backgroundSizes.length)];
                                    if (haveToProcBgImg && bgImg.substr(0, 3) == "url") {
                                        return this.processBackgroundImage(tag, index, bgImg, size, roomRules, doInvert, isPseudoContent, bgFilter);
                                    }
                                    else if (/gradient/gi.test(bgImg)) {
                                        return this.processBackgroundGradient(tag, index, bgImg, size, roomRules);
                                    }
                                    else {
                                        return new ContentScript.BackgroundImage(size, bgImg, ContentScript.BackgroundImageType.Image);
                                    }
                                });
                            }
                        }
                        let bgLight = roomRules.backgroundColor.light;
                        if (!isSvg || isSvgText) {
                            let textColor = tag.computedStyle.getPropertyValue(ns.css.fntColor), inheritedTextColor = this.getInheritedFontColor(tag, textColor);
                            roomRules.color = this._textColorProcessor.changeColor(textColor, bgLight, inheritedTextColor, tag);
                            let originalTextContrast = Math.abs(roomRules.backgroundColor.originalLight - roomRules.color.originalLight);
                            let currentTextContrast = Math.abs(roomRules.backgroundColor.light - roomRules.color.light);
                            if (currentTextContrast != originalTextContrast && roomRules.color.originalLight != roomRules.color.light &&
                                tag.computedStyle.textShadow && tag.computedStyle.textShadow !== "none") {
                                let newTextShadow = tag.computedStyle.textShadow, newColor = null, prevColor, prevHslColor, shadowContrast, inheritedShadowColor;
                                let uniqColors = new Set(newTextShadow
                                    .replace(/([\.\d]+px)/gi, '')
                                    .match(/(rgba?\([^\)]+\)|#[a-z\d]+|[a-z]+)/gi) || []);
                                if (uniqColors.size > 0) {
                                    uniqColors.forEach(c => {
                                        prevColor = /rgb/gi.test(c) ? c : this._colorConverter.convert(c);
                                        if (prevColor) {
                                            inheritedShadowColor = this.getInheritedTextShadowColor(tag, prevColor);
                                            inheritedShadowColor && (prevColor = inheritedShadowColor.originalColor);
                                            prevHslColor = MidnightLizard.Colors.RgbaColor.toHslaColor(MidnightLizard.Colors.RgbaColor.parse(prevColor));
                                            shadowContrast = Math.abs(prevHslColor.lightness - roomRules.color.originalLight) / originalTextContrast * currentTextContrast;
                                            newColor = this._textShadowColorProcessor.changeColor(prevColor, roomRules.color.light, null, tag, shadowContrast);
                                            if (newColor.color) {
                                                newTextShadow = newTextShadow.replace(new RegExp(MidnightLizard.Util.escapeRegex(c), "gi"), newColor.color);
                                            }
                                        }
                                    });
                                    if (newTextShadow !== tag.computedStyle.textShadow) {
                                        roomRules.textShadow = { value: newTextShadow, color: newColor };
                                    }
                                }
                            }
                        }
                        if (isSvg || tag.computedStyle.borderStyle != "none") {
                            let brdColor = tag.computedStyle.getPropertyValue(ns.css.brdColor), result;
                            if (brdColor.indexOf(" r") == -1) {
                                if (brdColor == tag.computedStyle.getPropertyValue(ns.css.bgrColor)) {
                                    result = Object.assign({}, roomRules.backgroundColor);
                                    Object.assign(result, { reason: MidnightLizard.Colors.ColorReason.SameAsBackground, owner: this._app.isDebug ? tag : null });
                                }
                                else {
                                    result = this._borderColorProcessor.changeColor(brdColor, bgLight, null, tag);
                                }
                                roomRules.borderColor = result.color ? result : null;
                            }
                            else if (!isSvg) {
                                result = this._borderColorProcessor.changeColor(tag.computedStyle.borderTopColor, bgLight, null, tag);
                                roomRules.borderTopColor = result.color ? result : null;
                                result = this._borderColorProcessor.changeColor(tag.computedStyle.borderRightColor, bgLight, null, tag);
                                roomRules.borderRightColor = result.color ? result : null;
                                result = this._borderColorProcessor.changeColor(tag.computedStyle.borderBottomColor, bgLight, null, tag);
                                roomRules.borderBottomColor = result.color ? result : null;
                                result = this._borderColorProcessor.changeColor(tag.computedStyle.borderLeftColor, bgLight, null, tag);
                                roomRules.borderLeftColor = result.color ? result : null;
                            }
                        }
                    }
                    this.applyRoomRules(tag, roomRules, ns);
                    beforePseudoElement && this.processElement(beforePseudoElement);
                    afterPseudoElement && this.processElement(afterPseudoElement);
                    room && this._dorm.get(doc).set(room, roomRules);
                    return [beforePseudoElement, afterPseudoElement].filter(x => x).map(x => x.stylePromise);
                }
            }
            removeTemporaryFilter(tag) {
                if (tag.originalFilter !== undefined) {
                    tag.style.setProperty("filter", tag.originalFilter);
                }
                ContentScript.isRealElement(tag) && tag.removeAttribute("transition");
            }
            processBackgroundGradient(tag, index, gradient, size, roomRules) {
                let mainColor = null, lightSum = 0;
                let uniqColors = new Set(gradient
                    .replace(/webkit|repeating|linear|radial|from|\bto\b|gradient|circle|ellipse|top|left|bottom|right|farthest|closest|side|corner|[\.\d]+%|[\.\d]+[a-z]{2,3}/gi, '')
                    .match(/(rgba?\([^\)]+\)|#[a-z\d]{6}|[a-z]+)/gi) || []);
                if (uniqColors.size > 0) {
                    uniqColors.forEach(c => {
                        let prevColor = /rgb/gi.test(c) ? c : this._colorConverter.convert(c);
                        let newColor = this._backgroundColorProcessor.changeColor(prevColor, false, tag, this.getParentBackground.bind(this));
                        lightSum += newColor.light;
                        if (newColor.color) {
                            gradient = gradient.replace(new RegExp(MidnightLizard.Util.escapeRegex(c), "gi"), newColor.color);
                        }
                        if (!mainColor && newColor.alpha > 0.5) {
                            mainColor = roomRules.backgroundColor = Object.assign({}, newColor);
                        }
                    });
                    mainColor && (mainColor.light = lightSum / uniqColors.size);
                }
                return new ContentScript.BackgroundImage(size, gradient, ContentScript.BackgroundImageType.Gradient);
            }
            processBackgroundImage(tag, index, url, size, roomRules, doInvert, isPseudoContent, bgFilter) {
                let imageKey = [url, size, doInvert].join("-");
                roomRules.backgroundImageKeys = roomRules.backgroundImageKeys || {};
                roomRules.backgroundImageKeys[index] = imageKey;
                let prevImage = this._images.get(imageKey);
                if (prevImage) {
                    return prevImage;
                }
                let prevPromise = this._imagePromises.get(imageKey);
                if (prevPromise) {
                    roomRules.hasBackgroundImagePromises = true;
                    return prevPromise;
                }
                url = MidnightLizard.Util.trim(url.substr(3), "()'\"");
                let dataPromise = fetch(url, { cache: "force-cache" })
                    .then(resp => resp.blob())
                    .then(blob => new Promise((resolve, reject) => {
                    let rdr = new FileReader();
                    rdr.onload = (e) => resolve(e.target.result);
                    rdr.readAsDataURL(blob);
                }))
                    .then(dataUrl => new Promise((resolve, reject) => {
                    let img = new Image();
                    img.onload = (e) => {
                        let trg = e.target;
                        resolve({ data: trg.src, width: trg.naturalWidth, height: trg.naturalHeight });
                    };
                    img.src = dataUrl;
                }));
                let result = Promise.all([dataPromise, size, bgFilter]).then(([img, bgSize, fltr]) => {
                    let imgWidth = img.width + "px", imgHeight = img.height + "px";
                    return new ContentScript.BackgroundImage(/^(auto\s?){1,2}$/i.test(bgSize) ? imgWidth + " " + imgHeight : bgSize, "url(data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${img.width} ${img.height}" filter="${fltr}">` +
                        `<image width="${imgWidth}" height="${imgHeight}" href="${img.data}"/></svg>`).replace(/\(/g, "%28").replace(/\)/g, "%29") + ")", ContentScript.BackgroundImageType.Image);
                });
                this._imagePromises.set(imageKey, result);
                roomRules.hasBackgroundImagePromises = true;
                return result;
            }
            applyBackgroundImages(tag, backgroundImages) {
                let originalState = this._documentObserver.stopDocumentObservation(tag.ownerDocument);
                this.removeTemporaryFilter(tag);
                tag.style.setProperty("background-image", backgroundImages.map(bgImg => bgImg.data).join(","), important);
                tag.style.setProperty("background-size", backgroundImages.map(bgImg => bgImg.size).join(","), important);
                this._documentObserver.startDocumentObservation(tag.ownerDocument, originalState);
                return tag;
            }
            onIFrameLoaded(iframe) {
                try {
                    let childDoc = iframe.contentDocument || iframe.contentWindow.document;
                    setTimeout(dom.addEventListener(childDoc, "DOMContentLoaded", this.onIFrameDocumentLaoded, this, false, childDoc), 1);
                }
                catch (ex) {
                    //docProc._app.isDebug && console.error(ex);
                }
            }
            onIFrameDocumentLaoded(doc) {
                if (doc.readyState != "loading" && doc.readyState != "uninitialized" && doc.body && !doc.body.mlBgColor) {
                    doc.body.style.setProperty("color", "rgb(5,5,5)");
                    this.createDynamicStyle(doc);
                    this.processDocument(doc);
                }
            }
            overrideInnerHtml(tag) {
                if (!tag.innerHtmlGetter) {
                    tag.innerHtmlGetter = tag.__lookupGetter__('innerHTML');
                    Object.defineProperty(tag, "innerHTML", {
                        get: this.getInnerHtml.bind(this, tag),
                        set: tag.__lookupSetter__('innerHTML').bind(tag)
                    });
                }
            }
            getInnerHtml(tag) {
                if (!tag.innerHtmlCache || Date.now() - tag.innerHtmlCache.timestamp > 5000) {
                    this.restoreDocumentColors(tag.ownerDocument);
                    tag.innerHtmlCache = { timestamp: Date.now(), value: tag.innerHtmlGetter() };
                    setTimeout(this.processDocument, 1, tag.ownerDocument);
                }
                return tag.innerHtmlCache.value;
            }
            removeDynamicStyle(doc) {
                let dynamicStyle = doc.getElementById("midnight-lizard-dynamic-style");
                dynamicStyle && dynamicStyle.remove();
            }
            createDynamicStyle(doc) {
                let sheet = doc.createElement('style');
                sheet.id = "midnight-lizard-dynamic-style";
                sheet.mlIgnore = true;
                let bgLight = this.shift.Background.lightnessLimit;
                let thumbHoverColor = this._scrollbarHoverColorProcessor.changeColor(cx.White, bgLight).color;
                let thumbNormalColor = this._scrollbarNormalColorProcessor.changeColor(cx.White, bgLight).color;
                let thumbActiveColor = this._scrollbarActiveColorProcessor.changeColor(cx.White, bgLight).color;
                let trackColor = this._backgroundColorProcessor.changeColor(cx.White, false, doc).color;
                let globalVars = "";
                let component, property;
                for (component in this.shift) {
                    for (property in this.shift[component]) {
                        globalVars += `\n-${component.replace("$", "").replace(/([A-Z])/g, "-$1")}-${property.replace(/([A-Z])/g, "-$1")}:${this.shift[component][property]};`.toLowerCase();
                    }
                }
                sheet.innerHTML = `:root { ${globalVars} }
                scrollbar { width: 12px!important; height: 12px!important; background: ${thumbNormalColor}!important; }
                scrollbar-button:hover { background: ${thumbHoverColor}!important; }
                scrollbar-button { background: ${thumbNormalColor}!important; width:5px!important; height:5px!important; }
                scrollbar-button:active { background: ${thumbActiveColor}!important; }
                scrollbar-thumb:hover { background: ${thumbHoverColor}!important; }
                scrollbar-thumb { background: ${thumbNormalColor}!important; border-radius: 6px!important; box-shadow: inset 0 0 8px rgba(0,0,0,0.5)!important; border: none!important; }
                scrollbar-thumb:active { background: ${thumbActiveColor}!important; box-shadow: inset 0 0 8px rgba(0,0,0,0.2)!important; }
                scrollbar-track { background: ${trackColor}!important; box-shadow: inset 0 0 6px rgba(0,0,0,0.3)!important; border-radius: 6px!important; border: none!important; }
                scrollbar-track-piece { background: transparent!important; border: none!important; box-shadow: none!important; }
                scrollbar-corner { background: ${thumbNormalColor}!important; }`.replace(/\s{16}(?=\S)/g, ":not(impt)::-webkit-");
                doc.head.appendChild(sheet);
            }
            createPseudoStyles(doc) {
                if (!doc.mlPseudoStyles) {
                    doc.mlPseudoStyles = doc.createElement('style');
                    doc.mlPseudoStyles.id = "midnight-lizard-pseudo-styles";
                    doc.mlPseudoStyles.mlIgnore = true;
                    doc.head.appendChild(doc.mlPseudoStyles);
                }
            }
            clearPseudoStyles(doc) {
                let pseudoStyle = doc.getElementById("mlPseudoStyles");
                pseudoStyle && (pseudoStyle.innerHTML = "");
            }
            createLoadingStyles(doc) {
                let noTrans = doc.createElement('style');
                noTrans.id = "midnight-lizard-no-trans-style";
                noTrans.mlIgnore = true;
                noTrans.innerHTML = ":not([transition]) { transition: none!important; }";
                let bgrLight = this.shift.Background.lightnessLimit, imgLight = this.shift.Image.lightnessLimit, imgSatrt = this.shift.Image.saturationLimit, bgrColor = this._backgroundColorProcessor.changeColor(cx.White, false, doc).color, txtColor = this._textColorProcessor.changeColor(cx.Black, bgrLight).color, brdColor = this._borderColorProcessor.changeColor(cx.Black, bgrLight).color, style = doc.createElement('style');
                style.id = "midnight-lizard-loading-style";
                style.mlIgnore = true;
                style.innerHTML =
                    `img[src]:not(impt),iframe:not(impt){filter:brightness(${imgLight}) saturate(${imgSatrt})!important}` +
                        `:not(impt),:not(impt):before,:not(impt):after` +
                        `{` +
                        ` background-image:none!important;` +
                        ` background-color:${bgrColor}!important;` +
                        ` color:${txtColor}!important;` +
                        ` border-color:${brdColor}!important` +
                        `}`;
                doc.head.appendChild(noTrans);
                doc.head.appendChild(style);
            }
            removeLoadingStyles(doc) {
                let style = doc.getElementById("midnight-lizard-loading-style");
                style && style.remove();
                setTimeout((d) => {
                    let noTrans = d.getElementById("midnight-lizard-no-trans-style");
                    noTrans && noTrans.remove();
                }, 100, doc);
            }
            applyRoomRules(tag, roomRules, ns = ContentScript.USP.htm, isVirtual = false) {
                let applyBgPromise;
                if (ContentScript.isRealElement(tag)) {
                    if (!isVirtual) {
                        tag.mlBgColor = roomRules.backgroundColor;
                        tag.mlColor = roomRules.color;
                        roomRules.textShadow && (tag.mlTextShadow = roomRules.textShadow.color);
                    }
                    if (roomRules.attributes && roomRules.attributes.size > 0) {
                        roomRules.attributes.forEach((attrValue, attrName) => tag.setAttribute(attrName, attrValue));
                    }
                }
                if (roomRules.filter && roomRules.filter.value !== "") {
                    tag.originalFilter = tag.style.filter;
                    tag.style.setProperty("filter", roomRules.filter.value, important);
                }
                if (roomRules.backgroundImages) {
                    tag.originalBackgroundImage = tag.style.backgroundImage;
                    tag.originalBackgroundSize = tag.style.backgroundSize;
                    if (roomRules.hasBackgroundImagePromises) {
                        let fuck = [tag, roomRules, ...roomRules.backgroundImages];
                        applyBgPromise = Promise.all([tag, roomRules, ...roomRules.backgroundImages])
                            .then(([t, rr, ...bgImgs]) => {
                            rr.backgroundImages = bgImgs;
                            roomRules.hasBackgroundImagePromises = false;
                            bgImgs.forEach((img, index) => {
                                this._images.set(rr.backgroundImageKeys[index], img);
                            });
                            return this.applyBackgroundImages(t, bgImgs);
                        });
                        Promise
                            .all([tag, applyBgPromise.catch(ex => this._app.isDebug && console.error("Exception in backgroundImagePromise: " + ex))])
                            .then(([tag]) => this.removeTemporaryFilter(tag));
                    }
                    else {
                        this.applyBackgroundImages(tag, roomRules.backgroundImages);
                    }
                }
                if (roomRules.textShadow && roomRules.textShadow.value) {
                    tag.originalTextShadow = tag.style.textShadow;
                    tag.style.setProperty(ns.css.shdColor, roomRules.textShadow.value, important);
                }
                if (roomRules.display) {
                    tag.originalDisplay = tag.style.display;
                    tag.style.setProperty("display", roomRules.display, important);
                }
                if (roomRules.backgroundColor && roomRules.backgroundColor.color) {
                    tag.originalBackgroundColor = tag.style.getPropertyValue(ns.css.bgrColor);
                    tag.style.setProperty(ns.css.bgrColor, roomRules.backgroundColor.color, important);
                }
                if (roomRules.color && roomRules.color.color) {
                    tag.originalColor = tag.style.getPropertyValue(ns.css.fntColor);
                    tag.style.setProperty(ns.css.fntColor, roomRules.color.color, important);
                }
                else if (roomRules.color && roomRules.color.reason === MidnightLizard.Colors.ColorReason.Inherited && tag.style.getPropertyValue(ns.css.fntColor) !== "") {
                    tag.originalColor = "";
                }
                if (roomRules.borderColor && roomRules.borderColor.color) {
                    tag.originalBorderColor = tag.style.getPropertyValue(ns.css.brdColor);
                    tag.style.setProperty(ns.css.brdColor, roomRules.borderColor.color, important);
                }
                else {
                    if (roomRules.borderTopColor) {
                        tag.originalBorderTopColor = tag.style.borderTopColor;
                        tag.style.setProperty("border-top-color", roomRules.borderTopColor.color, important);
                    }
                    if (roomRules.borderRightColor) {
                        tag.originalBorderRightColor = tag.style.borderRightColor;
                        tag.style.setProperty("border-right-color", roomRules.borderRightColor.color, important);
                    }
                    if (roomRules.borderBottomColor) {
                        tag.originalBorderBottomColor = tag.style.borderBottomColor;
                        tag.style.setProperty("border-bottom-color", roomRules.borderBottomColor.color, important);
                    }
                    if (roomRules.borderLeftColor) {
                        tag.originalBorderLeftColor = tag.style.borderLeftColor;
                        tag.style.setProperty("border-left-color", roomRules.borderLeftColor.color, important);
                    }
                }
                if (ContentScript.isPseudoElement(tag)) {
                    if (applyBgPromise) {
                        applyBgPromise.then((x) => x.applyStyleChanges());
                        Promise.all([tag, applyBgPromise.catch(ex => ex)]).then(([t]) => t.applyStyleChanges());
                    }
                    else {
                        tag.applyStyleChanges();
                    }
                }
                if (ContentScript.isRealElement(tag) && tag.onRoomRulesApplied) {
                    tag.onRoomRulesApplied.raise(roomRules);
                }
            }
        };
        DocumentProcessor._normalDelays = [0, 1, 10, 50, 100, 250, 500, 750, 1000];
        DocumentProcessor._smallReCalculationDelays = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        DocumentProcessor._bigReCalculationDelays = [0, 1, 5, 10, 20, 50, 75, 100, 150];
        DocumentProcessor._doNotInvertRegExp = /user|account|photo|importan|light|grey|flag/gi;
        DocumentProcessor = DocumentProcessor_1 = __decorate([
            MidnightLizard.DI.injectable(IDocumentProcessor),
            __metadata("design:paramtypes", [MidnightLizard.ContentScript.CssStyle, Document, MidnightLizard.Settings.IApplicationSettings, MidnightLizard.Settings.IBaseSettingsManager, MidnightLizard.ContentScript.IDocumentObserver, MidnightLizard.ContentScript.IStyleSheetProcessor, MidnightLizard.Colors.IBackgroundColorProcessor, MidnightLizard.Colors.ISvgBackgroundColorProcessor, MidnightLizard.Colors.IScrollbarHoverColorProcessor, MidnightLizard.Colors.IScrollbarNormalColorProcessor, MidnightLizard.Colors.IScrollbarActiveColorProcessor, MidnightLizard.Colors.ITextColorProcessor, MidnightLizard.Colors.ITextShadowColorProcessor, MidnightLizard.Colors.IBorderColorProcessor, MidnightLizard.Colors.IColorToRgbaStringConverter])
        ], DocumentProcessor);
        var DocumentProcessor_1;
    })(ContentScript = MidnightLizard.ContentScript || (MidnightLizard.ContentScript = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var ContentScript;
    (function (ContentScript) {
        var BackgroundImageType;
        (function (BackgroundImageType) {
            BackgroundImageType[BackgroundImageType["Image"] = 0] = "Image";
            BackgroundImageType[BackgroundImageType["Gradient"] = 1] = "Gradient";
        })(BackgroundImageType = ContentScript.BackgroundImageType || (ContentScript.BackgroundImageType = {}));
        class BackgroundImage {
            constructor(size, data, type) {
                this.size = size;
                this.data = data;
                this.type = type;
            }
        }
        ContentScript.BackgroundImage = BackgroundImage;
    })(ContentScript = MidnightLizard.ContentScript || (MidnightLizard.ContentScript = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="../Colors/-Colors.ts" />
/// <reference path="BackgroundImage.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var ContentScript;
    (function (ContentScript) {
        class RoomRules {
            constructor() {
                this.hasBackgroundImagePromises = false;
            }
        }
        ContentScript.RoomRules = RoomRules;
    })(ContentScript = MidnightLizard.ContentScript || (MidnightLizard.ContentScript = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="Pseudos.ts" />
/// <reference path="CssStyle.ts" />
/// <reference path="StyleSheetProcessor.ts" />
/// <reference path="DocumentObserver.ts" />
/// <reference path="DocumentProcessor.ts" />
/// <reference path="BackgroundImage.ts" />
/// <reference path="RoomRules.ts" />
/// <reference path="../DI/-DI.ts" />
/// <reference path="../Colors/-Colors.ts" />
/// <reference path="../Settings/-Settings.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var Popup;
    (function (Popup) {
        let ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;
        class IPopupSettingsManager {
        }
        Popup.IPopupSettingsManager = IPopupSettingsManager;
        let PopupSettingsManager = class PopupSettingsManager extends MidnightLizard.Settings.BaseSettingsManager {
            constructor(app, storageManager, settingsBus) {
                super(app, storageManager, settingsBus);
                this._onSettingsInitializationFailed = new ArgEventDispatcher();
            }
            initCurrentSettings() {
                this._settingsBus.getCurrentSettings()
                    .then((currentSettings) => {
                    this._currentSettings = currentSettings;
                    this.initCurSet();
                    this._onSettingsInitialized.raise(this._shift);
                })
                    .catch(ex => {
                    this._app.isDebug && console.error(ex);
                    // setTimeout(() => 
                    this._onSettingsInitializationFailed.raise(ex);
                    //, 1);
                });
            }
            getDefaultSettings() {
                return this._storageManager.get(null);
            }
            get onSettingsInitializationFailed() {
                return this._onSettingsInitializationFailed.event;
            }
            toggleIsEnabled(isEnabled) {
                this._currentSettings.isEnabled = isEnabled;
                this._settingsBus.toggleIsEnabled(isEnabled)
                    .then(tabRequests => tabRequests
                    .forEach(req => req
                    .catch(ex => this._app.isDebug && console.error("Toggle request to the tab faild with: " + ex.message || ex))));
                this._onSettingsChanged.raise(x => { }, this._shift);
                return this._storageManager.set({ isEnabled: isEnabled });
            }
            setAsDefaultSettings() {
                return this._storageManager.set(this._currentSettings);
            }
            deleteAllSettings() {
                return this._storageManager.clear();
            }
            deleteCurrentSiteSettings() {
                return this._settingsBus.deleteSettings();
            }
            applySettings() {
                return this._settingsBus.applySettings(this._currentSettings);
            }
            changeSettings(newSettings) {
                this._currentSettings = newSettings;
                this.initCurSet();
                this._onSettingsChanged.raise(x => { }, this._shift);
            }
        };
        PopupSettingsManager = __decorate([
            MidnightLizard.DI.injectable(IPopupSettingsManager),
            MidnightLizard.DI.injectable(MidnightLizard.Settings.IBaseSettingsManager, MidnightLizard.DI.Scope.ExistingInstance),
            __metadata("design:paramtypes", [MidnightLizard.Settings.IApplicationSettings, MidnightLizard.Settings.IStorageManager, MidnightLizard.Settings.ISettingsBus])
        ], PopupSettingsManager);
    })(Popup = MidnightLizard.Popup || (MidnightLizard.Popup = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Controls;
    (function (Controls) {
        var Slider;
        (function (Slider) {
            let lastAttempt;
            function initSliders(doc) {
                for (let icon of Array.prototype.slice.call(doc.querySelectorAll(".ml-input-range-icon[for]"))) {
                    icon.onclick = onIconClick;
                }
            }
            Slider.initSliders = initSliders;
            function onIconClick(eventArgs) {
                let target = eventArgs.currentTarget;
                let slider = target.ownerDocument.getElementById(target.getAttribute("for"));
                if (slider) {
                    if (target.classList.contains("low")) {
                        slider.stepDown();
                    }
                    else {
                        slider.stepUp();
                    }
                    slider.dispatchEvent(new Event("input"));
                    slider.dispatchEvent(new Event('change'));
                    lastAttempt && clearTimeout(lastAttempt);
                    lastAttempt = setTimeout((s) => s.focus(), 300, slider);
                }
            }
            function onRangeChanged() {
                let host = this.parentElement, relativeValue = (this.valueAsNumber - parseFloat(this.min)) / (parseFloat(this.max) - parseFloat(this.min)) * 100;
                host.style.setProperty("--input-value", this.value, "important");
                host.style.setProperty("--input-relative-value", `${relativeValue}`, "important");
                host.style.setProperty("--input-string", `'${this.value}'`, "important");
                host.style.setProperty("--input-percent", `${this.value}%`, "important");
                host.style.setProperty("--input-relative-percent", `${relativeValue}%`, "important");
            }
            Slider.onRangeChanged = onRangeChanged;
        })(Slider = Controls.Slider || (Controls.Slider = {}));
    })(Controls = MidnightLizard.Controls || (MidnightLizard.Controls = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Controls;
    (function (Controls) {
        var Tab;
        (function (Tab) {
            function initTabControl(doc) {
                let tabs = Array.prototype.slice.call(doc.getElementsByClassName("ml-tab-item"));
                for (let tab of tabs) {
                    tab.onclick = openTab;
                    if (tab.hasAttribute("selected")) {
                        tab.click();
                    }
                }
            }
            Tab.initTabControl = initTabControl;
            function openTab(eventArgs) {
                let target = eventArgs.currentTarget;
                let doc = target.ownerDocument;
                let tabContents = Array.prototype.slice.call(doc.getElementsByClassName("ml-tab-content"));
                for (let tabContent of tabContents) {
                    tabContent.style.display = "none";
                }
                let tabs = Array.prototype.slice.call(doc.getElementsByClassName("ml-tab-item"));
                for (let tab of tabs) {
                    tab.classList.remove("active");
                }
                doc.getElementById(target.getAttribute("content")).style.display = "table-cell";
                target.classList.add("active");
            }
        })(Tab = Controls.Tab || (Controls.Tab = {}));
    })(Controls = MidnightLizard.Controls || (MidnightLizard.Controls = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="SliderControl.ts" />
/// <reference path="TabControl.ts" />
/// <reference path="../DI/-DI.ts" />
/// <reference path="../Colors/-Colors.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="../ContentScript/-ContentScript.ts" />
/// <reference path="../Controls/-Controls.ts" />
/// <reference path="../Events/-Events.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var Popup;
    (function (Popup) {
        let dom = MidnightLizard.Events.HtmlEvent;
        class IPopupManager {
        }
        Popup.IPopupManager = IPopupManager;
        let PopupManager = PopupManager_1 = class PopupManager {
            constructor(_popup, _settingsManager, _app, _documentProcessor, _textShadowColorProcessor) {
                this._popup = _popup;
                this._settingsManager = _settingsManager;
                this._app = _app;
                this._documentProcessor = _documentProcessor;
                this._textShadowColorProcessor = _textShadowColorProcessor;
                _settingsManager.onSettingsInitialized.addListener(this.beforeSettingsInitialized, this, MidnightLizard.Events.EventHandlerPriority.High);
                _settingsManager.onSettingsInitializationFailed.addListener(this.onSettingsInitializationFailed, this);
                _settingsManager.onSettingsChanged.addListener(this.beforeSettingsChanged, this, MidnightLizard.Events.EventHandlerPriority.High);
                _documentProcessor.onRootDocumentProcessing.addListener(this.beforeRootDocumentProcessedFirstTime, this, MidnightLizard.Events.EventHandlerPriority.High);
            }
            beforeSettingsInitialized(shift) {
                this._currentSiteSettings = this._settingsManager.currentSettings;
            }
            onSettingsInitializationFailed(ex) {
                this._popup.getElementById("dialogError").style.display = "block";
            }
            beforeRootDocumentProcessedFirstTime(doc) {
                this._documentProcessor.onRootDocumentProcessing.removeListener(this.beforeRootDocumentProcessedFirstTime, this);
                this._setAsDefaultButton = doc.getElementById("setAsDefaultBtn");
                this._colorSchemeSelect = doc.getElementById("colorScheme");
                this._applyButton = doc.getElementById("applyBtn");
                this._closeButton = doc.getElementById("closeBtn");
                this._hostName = doc.getElementById("hostName");
                this._isEnabledToggle = doc.getElementById("isEnabled");
                this._forgetAllSitesButton = doc.getElementById("forgetAllSitesBtn");
                this._forgetThisSiteButton = doc.getElementById("forgetThisSiteBtn");
                PopupManager_1.ignoreSelect(this._colorSchemeSelect);
                this._colorSchemeSelect.mlIgnore = false;
                this._forgetAllSitesButton.onRoomRulesApplied = new MidnightLizard.Events.ArgumentedEventDispatcher();
                this._forgetAllSitesButton.onRoomRulesApplied.addListener(this.onButtonRoomRulesApplied, this);
                let range = document.querySelector(".ml-input-range");
                range.onRoomRulesApplied = new MidnightLizard.Events.ArgumentedEventDispatcher();
                range.onRoomRulesApplied.addListener(this.onRangeRoomRulesApplied, this, MidnightLizard.Events.EventHandlerPriority.Normal, range);
                this._hostName.onclick = this._closeButton.onclick = doc.defaultView.close.bind(doc.defaultView);
                this._applyButton.onclick = this.applySettingsOnPage.bind(this);
                this._isEnabledToggle.onchange = this.toggleIsEnabled.bind(this);
                this._forgetAllSitesButton.onclick = this.forgetAllSitesSettings.bind(this);
                this._forgetThisSiteButton.onclick = this.forgetCurrentSiteSettings.bind(this);
                this._setAsDefaultButton.onclick = this.setAsDefaultSettings.bind(this);
                MidnightLizard.Controls.Tab.initTabControl(doc);
                MidnightLizard.Controls.Slider.initSliders(doc);
                this._hostName.innerText = this._currentSiteSettings.hostName || "{unknown}";
                this.setUpInputFields(this._currentSiteSettings);
                this.setUpColorSchemeSelectValue(this._currentSiteSettings);
                this.updateButtonStates();
            }
            beforeSettingsChanged(response, shift) {
                this._popup.documentElement.style.cssText = "";
                this.updateButtonStates();
            }
            onInputFieldChanged() {
                let settings = this.getSettingsFromPopup();
                this.setUpColorSchemeSelectValue(settings);
                this._settingsManager.changeSettings(settings);
            }
            getSettingsFromPopup() {
                let settings = new MidnightLizard.Settings.ColorScheme(), value;
                settings.isEnabled = this._isEnabledToggle.checked;
                for (let setting of Array.prototype.slice.call(document.querySelectorAll(".setting"))) {
                    switch (setting.type) {
                        case "hidden":
                            value = setting.value;
                            break;
                        case "checkbox":
                            value = setting.checked;
                            break;
                        default:
                            value = setting.valueAsNumber ? setting.valueAsNumber : parseInt(setting.value);
                            break;
                    }
                    settings[setting.id] = value;
                }
                return settings;
            }
            applySettingsOnPopup(settings) {
                this.setUpInputFields(settings);
                this._settingsManager.changeSettings(settings);
            }
            applySettingsOnPage() {
                this._settingsManager
                    .applySettings()
                    .then(newSiteSettings => this._currentSiteSettings = newSiteSettings)
                    .then(x => this.updateButtonStates())
                    .catch(ex => alert("Settings application failed.\n" + (ex.message || ex)));
            }
            toggleIsEnabled() {
                this._currentSiteSettings.isEnabled = this._isEnabledToggle.checked;
                this._settingsManager
                    .toggleIsEnabled(this._isEnabledToggle.checked)
                    .catch(ex => alert("Extension toggle switching failed.\n" + (ex.message || ex)));
            }
            forgetAllSitesSettings() {
                if (confirm("Are you sure? All the settings you have ever made will be deleted!")) {
                    this._settingsManager
                        .deleteAllSettings()
                        .then(x => this.updateButtonStates())
                        .then(x => alert("Done. It will take effect after page refresh."))
                        .catch(ex => alert("All sites settings deletion failed.\n" + (ex.message || ex)));
                }
            }
            forgetCurrentSiteSettings() {
                this._settingsManager
                    .deleteCurrentSiteSettings()
                    .then(x => alert("Done. It will take effect after page refresh."))
                    .catch(ex => alert("Current site settings deletion failed.\n" + (ex.message || ex)));
            }
            setAsDefaultSettings() {
                this._settingsManager
                    .setAsDefaultSettings()
                    .then(x => this.updateButtonStates())
                    .catch(ex => alert("Default settings setup failed.\n" + (ex.message || ex)));
            }
            setUpInputFields(settings) {
                let setting;
                for (setting in settings) {
                    let input = this._popup.getElementById(setting);
                    if (input) {
                        dom.removeAllEventListeners(input);
                        let settingValue = settings[setting];
                        switch (input.type) {
                            case "hidden":
                                input.value = settingValue.toString();
                                break;
                            case "checkbox":
                                input.checked = settingValue;
                                break;
                            case "range":
                                input.value = settingValue.toString();
                                dom.addEventListener(input, "input", MidnightLizard.Controls.Slider.onRangeChanged, input)();
                                break;
                            case "select-one":
                                input.value = settingValue.toString();
                                dom.addEventListener(input, "change", PopupManager_1.onHueChanged, input)();
                                PopupManager_1.ignoreSelect(input);
                                break;
                            default: break;
                        }
                        if (setting !== "isEnabled") {
                            dom.addEventListener(input, "change", this.onInputFieldChanged, this);
                        }
                    }
                }
            }
            updateButtonStates() {
                this._applyButton.disabled = this.settingsAreEqual(this._settingsManager.currentSettings, this._currentSiteSettings);
                Promise
                    .all([this._settingsManager.currentSettings, this._settingsManager.getDefaultSettings()])
                    .then(([currentSettings, defaultSettings]) => {
                    this._setAsDefaultButton.disabled = this.settingsAreEqual(currentSettings, defaultSettings);
                });
            }
            settingsAreEqual(first, second) {
                const excludeSettingsForCompare = ["isEnabled", "exist", "hostName", "isDefault", "settingsVersion"];
                for (let setting in first) {
                    let prop = setting;
                    if (excludeSettingsForCompare.indexOf(prop) == -1) {
                        if (first[prop] !== second[prop]) {
                            return false;
                        }
                    }
                }
                return true;
            }
            static ignoreSelect(select) {
                select.mlIgnore = true;
                Array.prototype.forEach.call(select.options, (opt) => opt.mlIgnore = true);
            }
            static onHueChanged() {
                this.style.cssText = this.options[this.selectedIndex].style.cssText;
            }
            setUpColorSchemeSelectValue(settings) {
                dom.removeAllEventListeners(this._colorSchemeSelect);
                setUp: {
                    if (settings.isDefault) {
                        this._colorSchemeSelect.value = "default";
                    }
                    else if (!settings.runOnThisSite) {
                        this._colorSchemeSelect.value = "original";
                    }
                    else {
                        let scheme;
                        for (scheme in MidnightLizard.Settings.ColorSchemes) {
                            if (this.settingsAreEqual(MidnightLizard.Settings.ColorSchemes[scheme], settings)) {
                                this._colorSchemeSelect.value = scheme;
                                break setUp;
                            }
                        }
                        this._colorSchemeSelect.value = "custom";
                    }
                }
                dom.addEventListener(this._colorSchemeSelect, "change", this.onColorSchemeChanged, this);
            }
            onColorSchemeChanged() {
                if (this._colorSchemeSelect.value == "default") {
                    this._settingsManager.getDefaultSettings()
                        .then(this.applySettingsOnPopup.bind(this));
                }
                else {
                    let selectedScheme;
                    if (this._colorSchemeSelect.value == "custom") {
                        this.applySettingsOnPopup(this._currentSiteSettings);
                    }
                    else {
                        let selectedScheme = Object.assign({
                            isEnabled: this._isEnabledToggle.checked,
                            settingsVersion: this._currentSiteSettings.settingsVersion
                        }, MidnightLizard.Settings.ColorSchemes[this._colorSchemeSelect.value]);
                        this.applySettingsOnPopup(selectedScheme);
                    }
                }
            }
            onButtonRoomRulesApplied(roomRules) {
                let props = Object.assign({}, MidnightLizard.ContentScript.USP.htm);
                props.css = { shdColor: "--icon-shadow-color" };
                let newRules = Object.assign(new MidnightLizard.ContentScript.RoomRules(), {
                    textShadow: {
                        value: (roomRules.textShadow && roomRules.textShadow.color && roomRules.textShadow.color.color)
                            ? roomRules.textShadow.color.color
                            : "black"
                    }
                });
                this._documentProcessor.applyRoomRules(this._forgetAllSitesButton.parentElement, newRules, props, true);
            }
            onRangeRoomRulesApplied(tag, roomRules) {
                let currentStyle = tag.ownerDocument.defaultView.getComputedStyle(tag, "");
                let props = Object.assign({}, MidnightLizard.ContentScript.USP.htm);
                props.css =
                    {
                        bgrColor: "--pseudo-background-color",
                        brdColor: "--pseudo-border-color",
                        fntColor: "--pseudo-color",
                        shdColor: "--pseudo-text-shadow-color"
                    };
                let shadowColor = this._textShadowColorProcessor.changeColor(MidnightLizard.Colors.RgbaColor.Gray, roomRules.color.light, null, tag, Math.abs(roomRules.color.light - roomRules.backgroundColor.light) / 1.4);
                let newRules = Object.assign(new MidnightLizard.ContentScript.RoomRules(), {
                    backgroundColor: { color: currentStyle.backgroundColor },
                    color: { color: currentStyle.color },
                    borderColor: { color: currentStyle.borderColor },
                    textShadow: { value: shadowColor.color }
                });
                this._documentProcessor.applyRoomRules(tag.ownerDocument.documentElement, newRules, props, true);
            }
        };
        PopupManager = PopupManager_1 = __decorate([
            MidnightLizard.DI.injectable(IPopupManager),
            __metadata("design:paramtypes", [Document, MidnightLizard.Popup.IPopupSettingsManager, MidnightLizard.Settings.IApplicationSettings, MidnightLizard.ContentScript.IDocumentProcessor, MidnightLizard.Colors.ITextShadowColorProcessor])
        ], PopupManager);
        var PopupManager_1;
    })(Popup = MidnightLizard.Popup || (MidnightLizard.Popup = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="PopupSettingsManager.ts" />
/// <reference path="PopupManager.ts" />
/// <reference path="../DI/-DI.ts" />
/// <reference path="../Typings/midnight-lizard/MidnightLizard.d.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="-Popup.ts" />
var MidnightLizard;
(function (MidnightLizard) {
    var Popup;
    (function (Popup) {
        MidnightLizard.DI.Container.register(Document, class {
            constructor() { return document; }
        });
        MidnightLizard.DI.Container.resolve(Popup.IPopupManager);
    })(Popup = MidnightLizard.Popup || (MidnightLizard.Popup = {}));
})(MidnightLizard || (MidnightLizard = {}));
/// <reference path="../../node_modules/reflect-metadata/Reflect.ts" />
/// <reference path="./ChromeApplicationSettings.ts" />
/// <reference path="../Chrome/ChromeStorageManager.ts" />
/// <reference path="../Chrome/ChromeSettingsBus.ts" />
/// <reference path="../Popup/PopupStarter.ts" /> 
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvcmVmbGVjdC1tZXRhZGF0YS9SZWZsZWN0LnRzIiwiLi4vdHMvREkvLURJLnRzIiwiLi4vdHMvU2V0dGluZ3MvSUFwcGxpY2F0aW9uU2V0dGluZ3MudHMiLCIuLi90cy9DaHJvbWUvQ2hyb21lQXBwbGljYXRpb25TZXR0aW5ncy50cyIsIi4uL3RzL0Nocm9tZS9DaHJvbWVQcm9taXNlLnRzIiwiLi4vdHMvU2V0dGluZ3MvSVN0b3JhZ2VNYW5hZ2VyLnRzIiwiLi4vdHMvQ2hyb21lL0Nocm9tZVN0b3JhZ2VNYW5hZ2VyLnRzIiwiLi4vdHMvU2V0dGluZ3MvQ29sb3JTY2hlbWUudHMiLCIuLi90cy9TZXR0aW5ncy9Db2xvclNjaGVtZXMudHMiLCIuLi90cy9Db29raWVzL0Nvb2tpZXNNYW5hZ2VyLnRzIiwiLi4vdHMvRXZlbnRzL0lFdmVudEhhbmRsZXIudHMiLCIuLi90cy9VdGlscy9BcnJheS50cyIsIi4uL3RzL1V0aWxzL0d1aWQudHMiLCIuLi90cy9VdGlscy9PYmplY3QudHMiLCIuLi90cy9VdGlscy9Qcm9taXNlLnRzIiwiLi4vdHMvVXRpbHMvU3RyaW5nLnRzIiwiLi4vdHMvVXRpbHMvVHlwZUd1YXJkcy50cyIsIi4uL3RzL1V0aWxzL0VudW0udHMiLCIuLi90cy9VdGlscy9SZWdFeHAudHMiLCIuLi90cy9VdGlscy8tVXRpbHMudHMiLCIuLi90cy9FdmVudHMvRXZlbnREaXNwYXRjaGVyLnRzIiwiLi4vdHMvRXZlbnRzL0V2ZW50LnRzIiwiLi4vdHMvRXZlbnRzL0h0bWxFdmVudC50cyIsIi4uL3RzL0V2ZW50cy8tRXZlbnRzLnRzIiwiLi4vdHMvU2V0dGluZ3MvSVNldHRpbmdzQnVzLnRzIiwiLi4vdHMvQ29sb3JzL0hzbGFDb2xvci50cyIsIi4uL3RzL0NvbG9ycy9SZ2JhQ29sb3IudHMiLCIuLi90cy9Db2xvcnMvQ29sb3JTaGlmdC50cyIsIi4uL3RzL0NvbG9ycy9Db21wb25lbnRTaGlmdC50cyIsIi4uL3RzL0NvbG9ycy9Db2xvckVudHJ5LnRzIiwiLi4vdHMvQ29sb3JzLy1Db2xvcnMudHMiLCIuLi90cy9TZXR0aW5ncy9CYXNlU2V0dGluZ3NNYW5hZ2VyLnRzIiwiLi4vdHMvU2V0dGluZ3MvU2V0dGluZ3NSZXF1ZXN0TWVzc2FnZS50cyIsIi4uL3RzL1NldHRpbmdzLy1TZXR0aW5ncy50cyIsIi4uL3RzL0Nocm9tZS9DaHJvbWVTZXR0aW5nc0J1cy50cyIsIi4uL3RzL0NvbnRlbnRTY3JpcHQvUHNldWRvcy50cyIsIi4uL3RzL0NvbnRlbnRTY3JpcHQvQ3NzU3R5bGUudHMiLCIuLi90cy9Db250ZW50U2NyaXB0L1N0eWxlU2hlZXRQcm9jZXNzb3IudHMiLCIuLi90cy9Db250ZW50U2NyaXB0L0RvY3VtZW50T2JzZXJ2ZXIudHMiLCIuLi90cy9Db250ZW50U2NyaXB0L1NldHRpbmdzTWFuYWdlci50cyIsIi4uL3RzL0NvbG9ycy9CYXNlQ29sb3JQcm9jZXNzb3IudHMiLCIuLi90cy9Db2xvcnMvQmFja2dyb3VuZENvbG9yUHJvY2Vzc29yLnRzIiwiLi4vdHMvQ29sb3JzL0ZvcmVncm91bmRDb2xvclByb2Nlc3Nvci50cyIsIi4uL3RzL0NvbG9ycy9Db2xvclRvUmdiYVN0cmluZ0NvbnZlcnRlci50cyIsIi4uL3RzL0NvbnRlbnRTY3JpcHQvRG9jdW1lbnRQcm9jZXNzb3IudHMiLCIuLi90cy9Db250ZW50U2NyaXB0L0JhY2tncm91bmRJbWFnZS50cyIsIi4uL3RzL0NvbnRlbnRTY3JpcHQvUm9vbVJ1bGVzLnRzIiwiLi4vdHMvQ29udGVudFNjcmlwdC8tQ29udGVudFNjcmlwdC50cyIsIi4uL3RzL1BvcHVwL1BvcHVwU2V0dGluZ3NNYW5hZ2VyLnRzIiwiLi4vdHMvQ29udHJvbHMvU2xpZGVyQ29udHJvbC50cyIsIi4uL3RzL0NvbnRyb2xzL1RhYkNvbnRyb2wudHMiLCIuLi90cy9Db250cm9scy8tQ29udHJvbHMudHMiLCIuLi90cy9Qb3B1cC9Qb3B1cE1hbmFnZXIudHMiLCIuLi90cy9Qb3B1cC8tUG9wdXAudHMiLCIuLi90cy9Qb3B1cC9Qb3B1cFN0YXJ0ZXIudHMiLCIuLi90cy9DaHJvbWUvQ2hyb21lUG9wdXBTdGFydGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Ozs7Ozs7Ozs7O2dGQWFnRjtBQUNoRixJQUFVLE9BQU8sQ0FvcURoQjtBQXBxREQsV0FBVSxPQUFPO0lBQ2IsWUFBWSxDQUFDO0lBd0ZiLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO0lBRS9DLGtDQUFrQztJQUNsQyxNQUFNLGNBQWMsR0FBRyxPQUFPLE1BQU0sS0FBSyxVQUFVLENBQUM7SUFDcEQsTUFBTSxpQkFBaUIsR0FBRyxjQUFjLElBQUksT0FBTyxNQUFNLENBQUMsV0FBVyxLQUFLLFdBQVcsR0FBRyxNQUFNLENBQUMsV0FBVyxHQUFHLGVBQWUsQ0FBQztJQUM3SCxNQUFNLGNBQWMsR0FBRyxjQUFjLElBQUksT0FBTyxNQUFNLENBQUMsUUFBUSxLQUFLLFdBQVcsR0FBRyxNQUFNLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQztJQUVqSCxJQUFVLE9BQU8sQ0FtQmhCO0lBbkJELFdBQVUsT0FBTztRQUNiLE1BQU0sY0FBYyxHQUFHLE9BQU8sTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVLENBQUMsQ0FBQyx5Q0FBeUM7UUFDckcsTUFBTSxhQUFhLEdBQUcsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLFlBQVksS0FBSyxDQUFDLENBQUMscUNBQXFDO1FBQy9GLE1BQU0sU0FBUyxHQUFHLENBQUMsY0FBYyxJQUFJLENBQUMsYUFBYSxDQUFDO1FBRXBELGlFQUFpRTtRQUNwRCxjQUFNLEdBQUcsY0FBYztjQUM5QixNQUFTLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBZSxDQUFDO2NBQzFELGFBQWE7a0JBQ1QsTUFBUyxjQUFjLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBVyxFQUFnQixD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R0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FDdEIsQ0FBQzt3QkFDRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDckIsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUN0QixDQUFDO3dCQUNHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO3dCQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUN2QyxDQUFDO2dCQUNMLENBQUM7Z0JBQ0QsRUFBRSxDQUFDLENBQUMsUUFBUSxLQUFLLENBQUMsQ0FBQyxDQUNuQixDQUFDO29CQUNHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDeEMsQ0FBQztnQkFDRCxFQUFFLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQ2xCLENBQUM7b0JBQ0csQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDNUMsQ0FBQztnQkFDRCxFQUFFLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQ2xCLENBQUM7b0JBQ0csQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDNUMsQ0FBQztnQkFDRCxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDYixDQUFDO29CQUNHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ1YsQ0FBQztnQkFDRCxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDWCxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQ1YsQ0FBQztvQkFDRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztnQkFDaEIsQ0FBQztnQkFDRCxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQixFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLENBQ2YsQ0FBQztvQkFDRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNWLENBQUM7Z0JBQ0QsSUFBSSxDQUNKLENBQUM7b0JBQ0csRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUNaLENBQUM7d0JBQ0csQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO29CQUNsQyxDQUFDO29CQUNELElBQUksQ0FDSixDQUFDO3dCQUNHLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7b0JBQ3RDLENBQUM7Z0JBQ0wsQ0FBQztnQkFDRCxNQUFNLENBQUMsSUFBSSxPQUFBLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDOUMsQ0FBQzs7UUF6RUQsNkJBQTZCO1FBQ04sZUFBSyxHQUFHLElBQUksU0FBUyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzFFLDZCQUE2QjtRQUNOLGVBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNwRSw0QkFBNEI7UUFDTCxjQUFJLEdBQUcsSUFBSSxTQUFTLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFoQmhFLGdCQUFTLFlBcUZyQixDQUFBO0lBQ0wsQ0FBQyxFQTNGd0IsTUFBTSxHQUFOLHFCQUFNLEtBQU4scUJBQU0sUUEyRjlCO0FBQUQsQ0FBQyxFQTNGUyxjQUFjLEtBQWQsY0FBYyxRQTJGdkI7QUMzRkQsSUFBVSxjQUFjLENBY3ZCO0FBZEQsV0FBVSxjQUFjO0lBQUMsSUFBQSxNQUFNLENBYzlCO0lBZHdCLFdBQUEsTUFBTTtRQUUzQjs7V0FFRztRQUNIO1lBT0ksZ0JBQWdCLENBQUM7U0FDcEI7UUFSWSxpQkFBVSxhQVF0QixDQUFBO0lBQ0wsQ0FBQyxFQWR3QixNQUFNLEdBQU4scUJBQU0sS0FBTixxQkFBTSxRQWM5QjtBQUFELENBQUMsRUFkUyxjQUFjLEtBQWQsY0FBYyxRQWN2QjtBQ2RELElBQVUsY0FBYyxDQWtDdkI7QUFsQ0QsV0FBVSxjQUFjO0lBQUMsSUFBQSxNQUFNLENBa0M5QjtJQWxDd0IsV0FBQSxNQUFNO1FBRTNCLDZCQUE2QjtRQUM3QixJQUFZLFNBWVg7UUFaRCxXQUFZLFNBQVM7WUFFakIscURBQVUsQ0FBQTtZQUNWLHlDQUFJLENBQUE7WUFDSixxREFBVSxDQUFBO1lBQ1YsNkNBQU0sQ0FBQTtZQUNOLCtEQUFlLENBQUE7WUFDZixpRUFBZ0IsQ0FBQTtZQUNoQixpRUFBZ0IsQ0FBQTtZQUNoQiwyQ0FBSyxDQUFBO1lBQ0wscURBQVUsQ0FBQTtZQUNWLCtEQUFlLENBQUE7UUFDbkIsQ0FBQyxFQVpXLFNBQVMsR0FBVCxnQkFBUyxLQUFULGdCQUFTLFFBWXBCO1FBRUQ7O1dBRUc7UUFDSDtZQVlJLGdCQUFnQixDQUFDO1NBQ3BCO1FBYlkscUJBQWMsaUJBYTFCLENBQUE7SUFDTCxDQUFDLEVBbEN3QixNQUFNLEdBQU4scUJBQU0sS0FBTixxQkFBTSxRQWtDOUI7QUFBRCxDQUFDLEVBbENTLGNBQWMsS0FBZCxjQUFjLFFBa0N2QjtBQ2xDRCxJQUFVLGNBQWMsQ0FzQ3ZCO0FBdENELFdBQVUsY0FBYztJQUFDLElBQUEsTUFBTSxDQXNDOUI7SUF0Q3dCLFdBQUEsTUFBTTtRQUUzQixJQUFZLFdBU1g7UUFURCxXQUFZLFdBQVc7WUFFbkIseUNBQUUsQ0FBQTtZQUNGLGlEQUFNLENBQUE7WUFDTixxREFBUSxDQUFBO1lBQ1IsdURBQVMsQ0FBQTtZQUNULDJEQUFXLENBQUE7WUFDWCxxREFBUSxDQUFBO1lBQ1IscUVBQWdCLENBQUE7UUFDcEIsQ0FBQyxFQVRXLFdBQVcsR0FBWCxrQkFBVyxLQUFYLGtCQUFXLFFBU3RCO1FBQ0Q7O1dBRUc7UUFDSDtZQXFCSSxnQkFBZ0IsQ0FBQzs7UUFuQk0sbUJBQVEsR0FBZTtZQUMxQyxLQUFLLEVBQUUsT0FBQSxTQUFTLENBQUMsS0FBSztZQUN0QixLQUFLLEVBQUUsQ0FBQztZQUNSLGFBQWEsRUFBRSxDQUFDO1lBQ2hCLGFBQWEsRUFBRSxPQUFBLFNBQVMsQ0FBQyxLQUFLO1lBQzlCLEtBQUssRUFBRSxDQUFDO1lBQ1IsTUFBTSxFQUFFLFdBQVcsQ0FBQyxRQUFRO1lBQzVCLEtBQUssRUFBRSxJQUFJO1NBQ2QsQ0FBQTtRQVZRLGlCQUFVLGFBc0J0QixDQUFBO0lBQ0wsQ0FBQyxFQXRDd0IsTUFBTSxHQUFOLHFCQUFNLEtBQU4scUJBQU0sUUFzQzlCO0FBQUQsQ0FBQyxFQXRDUyxjQUFjLEtBQWQsY0FBYyxRQXNDdkI7QUN0Q0QsdUNBQXVDO0FBQ3ZDLHVDQUF1QztBQUN2Qyx3Q0FBd0M7QUFDeEMsNENBQTRDO0FBQzVDLHdDQUF3QztBQ0p4QyxxQ0FBcUM7QUFDckMsdUNBQXVDO0FBQ3ZDLHFEQUFxRDtBQUNyRCw2Q0FBNkM7QUFDN0MsNkNBQTZDO0FBQzdDLDBDQUEwQztBQUMxQywyQ0FBMkM7QUFDM0MsNkNBQTZDO0FBRzdDLElBQVUsY0FBYyxDQW1LdkI7QUFuS0QsV0FBVSxjQUFjO0lBQUMsSUFBQSxRQUFRLENBbUtoQztJQW5Ld0IsV0FBQSxRQUFRO1FBTzdCLElBQUksa0JBQWtCLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQztRQUN6RSxJQUFJLHlCQUF5QixHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUM7UUFDaEY7U0FVQztRQVZxQiw2QkFBb0IsdUJBVXpDLENBQUE7UUFDRDs7V0FFRztRQUNIO1lBZUk7Ozs7Z0JBSUk7WUFDSixZQUN1QixJQUFrRCxFQUNsRCxlQUF3RCxFQUN4RCxZQUFrRDtnQkFGbEQsU0FBSSxHQUFKLElBQUksQ0FBOEM7Z0JBQ2xELG9CQUFlLEdBQWYsZUFBZSxDQUF5QztnQkFDeEQsaUJBQVksR0FBWixZQUFZLENBQXNDO2dCQXlHL0QsMkJBQXNCLEdBQUcsSUFBSSxrQkFBa0IsRUFBeUIsQ0FBQztnQkFNekUsdUJBQWtCLEdBQUcsSUFBSSx5QkFBeUIsRUFBd0QsQ0FBQztnQkE3R2pILElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksU0FBQSxXQUFXLEVBQUUsRUFBRSxTQUFBLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDbEYsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDL0IsQ0FBQztZQXZCRCx5Q0FBeUM7WUFDekMsSUFBVyxlQUFlLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQSxDQUFDLENBQUM7WUFJN0Qsd0NBQXdDO1lBQ3hDLElBQVcsS0FBSyxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFBLENBQUMsQ0FBQztZQUV6QyxvREFBb0Q7WUFDcEQsSUFBVyxRQUFRLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFVLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQSxDQUFDLENBQUM7WUFrQjlGLFVBQVU7Z0JBRWhCLElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxTQUFBLFdBQVcsRUFBRSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUNsRSxHQUFHLENBQUMsQ0FBQyxJQUFJLE9BQU8sSUFBSSxHQUFHLENBQUMsQ0FDeEIsQ0FBQztvQkFDRyxJQUFJLElBQUksR0FBRyxPQUFrQyxDQUFDO29CQUM5QyxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3BCLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxlQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FDMUMsQ0FBQzt3QkFDRyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQztvQkFDMUIsQ0FBQztnQkFDTCxDQUFDO2dCQUNELElBQUksQ0FBQyxNQUFNO29CQUNQO3dCQUNJLFVBQVUsRUFDVjs0QkFDSSxlQUFlLEVBQUUsR0FBRyxDQUFDLHlCQUF5Qjs0QkFDOUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxrQkFBa0I7NEJBQ2hDLGNBQWMsRUFBRSxHQUFHLENBQUMsd0JBQXdCOzRCQUM1QyxjQUFjLEVBQUUsR0FBRyxDQUFDLHdCQUF3Qjs0QkFDNUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxpQkFBaUI7eUJBQ2pDO3dCQUNELElBQUksRUFDSjs0QkFDSSxlQUFlLEVBQUUsR0FBRyxDQUFDLG1CQUFtQjs0QkFDeEMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxZQUFZOzRCQUMxQixjQUFjLEVBQUUsR0FBRyxDQUFDLGtCQUFrQjs0QkFDdEMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxrQkFBa0I7NEJBQ3RDLE9BQU8sRUFBRSxHQUFHLENBQUMsV0FBVzt5QkFDM0I7d0JBQ0QsVUFBVSxFQUNWOzRCQUNJLGVBQWUsRUFBRSxHQUFHLENBQUMscUJBQXFCOzRCQUMxQyxRQUFRLEVBQUUsR0FBRyxDQUFDLFlBQVk7NEJBQzFCLGNBQWMsRUFBRSxHQUFHLENBQUMsa0JBQWtCOzRCQUN0QyxjQUFjLEVBQUUsR0FBRyxDQUFDLG9CQUFvQixHQUFHLElBQUk7NEJBQy9DLE9BQU8sRUFBRSxHQUFHLENBQUMsYUFBYTt5QkFDN0I7d0JBQ0QsTUFBTSxFQUNOOzRCQUNJLGVBQWUsRUFBRSxHQUFHLENBQUMscUJBQXFCOzRCQUMxQyxRQUFRLEVBQUUsR0FBRyxDQUFDLGNBQWM7NEJBQzVCLGNBQWMsRUFBRSxHQUFHLENBQUMsb0JBQW9COzRCQUN4QyxjQUFjLEVBQUUsR0FBRyxDQUFDLG9CQUFvQjs0QkFDeEMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxhQUFhO3lCQUM3Qjt3QkFDRCxlQUFlLEVBQ2Y7NEJBQ0ksZUFBZSxFQUFFLEdBQUcsQ0FBQyx3QkFBd0I7NEJBQzdDLFFBQVEsRUFBRSxHQUFHLENBQUMsaUJBQWlCOzRCQUMvQixjQUFjLEVBQUUsR0FBRyxDQUFDLHVCQUF1QixHQUFHLENBQUM7NEJBQy9DLGNBQWMsRUFBRSxHQUFHLENBQUMsd0JBQXdCOzRCQUM1QyxPQUFPLEVBQUUsR0FBRyxDQUFDLGdCQUFnQjt5QkFDaEM7d0JBQ0QsZ0JBQWdCLEVBQ2hCOzRCQUNJLGVBQWUsRUFBRSxHQUFHLENBQUMsd0JBQXdCOzRCQUM3QyxRQUFRLEVBQUUsR0FBRyxDQUFDLGlCQUFpQjs0QkFDL0IsY0FBYyxFQUFFLEdBQUcsQ0FBQyx1QkFBdUIsR0FBRyxHQUFHOzRCQUNqRCxjQUFjLEVBQUUsR0FBRyxDQUFDLHdCQUF3Qjs0QkFDNUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0I7eUJBQ2hDO3dCQUNELGdCQUFnQixFQUNoQjs0QkFDSSxlQUFlLEVBQUUsR0FBRyxDQUFDLHdCQUF3Qjs0QkFDN0MsUUFBUSxFQUFFLEdBQUcsQ0FBQyxpQkFBaUI7NEJBQy9CLGNBQWMsRUFBRSxHQUFHLENBQUMsdUJBQXVCLEdBQUcsR0FBRzs0QkFDakQsY0FBYyxFQUFFLEdBQUcsQ0FBQyx3QkFBd0I7NEJBQzVDLE9BQU8sRUFBRSxHQUFHLENBQUMsZ0JBQWdCO3lCQUNoQzt3QkFDRCxLQUFLLEVBQ0w7NEJBQ0ksZUFBZSxFQUFFLEdBQUcsQ0FBQyxvQkFBb0I7NEJBQ3pDLFFBQVEsRUFBRSxDQUFDOzRCQUNYLGNBQWMsRUFBRSxHQUFHLENBQUMsbUJBQW1COzRCQUN2QyxjQUFjLEVBQUUsQ0FBQzs0QkFDakIsT0FBTyxFQUFFLENBQUM7eUJBQ2I7d0JBQ0QsVUFBVSxFQUNWOzRCQUNJLGVBQWUsRUFBRSxHQUFHLENBQUMseUJBQXlCOzRCQUM5QyxRQUFRLEVBQUUsR0FBRyxDQUFDLGtCQUFrQjs0QkFDaEMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxtQkFBbUI7NEJBQ3ZDLGNBQWMsRUFBRSxHQUFHLENBQUMsb0JBQW9COzRCQUN4QyxPQUFPLEVBQUUsR0FBRyxDQUFDLGFBQWE7eUJBQzdCO3dCQUNELGVBQWUsRUFDZjs0QkFDSSxlQUFlLEVBQUUsR0FBRyxDQUFDLDhCQUE4Qjs0QkFDbkQsUUFBUSxFQUFFLENBQUM7NEJBQ1gsY0FBYyxFQUFFLEdBQUcsQ0FBQyw2QkFBNkI7NEJBQ2pELGNBQWMsRUFBRSxDQUFDOzRCQUNqQixPQUFPLEVBQUUsQ0FBQzt5QkFDYjtxQkFDSixDQUFDO1lBQ1YsQ0FBQztZQUdELElBQVcscUJBQXFCO2dCQUU1QixNQUFNLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQztZQUM3QyxDQUFDO1lBR0QsSUFBVyxpQkFBaUI7Z0JBRXhCLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1lBQ3pDLENBQUM7U0FDSjtRQTNJcUIsNEJBQW1CLHNCQTJJeEMsQ0FBQTtJQUNMLENBQUMsRUFuS3dCLFFBQVEsR0FBUix1QkFBUSxLQUFSLHVCQUFRLFFBbUtoQztBQUFELENBQUMsRUFuS1MsY0FBYyxLQUFkLGNBQWMsUUFtS3ZCO0FDN0tELG1EQUFtRDtBQUVuRCxJQUFVLGNBQWMsQ0F3Q3ZCO0FBeENELFdBQVUsY0FBYztJQUFDLElBQUEsUUFBUSxDQXdDaEM7SUF4Q3dCLFdBQUEsUUFBUTtRQUc3QixJQUFZLHFCQU1YO1FBTkQsV0FBWSxxQkFBcUI7WUFFN0IsNkZBQWtCLENBQUE7WUFDbEIseUZBQWdCLENBQUE7WUFDaEIscUZBQWMsQ0FBQTtZQUNkLHVGQUFlLENBQUE7UUFDbkIsQ0FBQyxFQU5XLHFCQUFxQixHQUFyQiw4QkFBcUIsS0FBckIsOEJBQXFCLFFBTWhDO1FBRUQ7WUFHSSxnQkFBZ0IsQ0FBQztTQUNwQjtRQUpxQiwrQkFBc0IseUJBSTNDLENBQUE7UUFFRCxtQ0FBMkMsU0FBUSxzQkFBc0I7WUFHckU7Z0JBQWdCLEtBQUssRUFBRSxDQUFBO2dCQUR2QixXQUFNLEdBQTZDLHFCQUFxQixDQUFDLGtCQUFrQixDQUFDO1lBQ3BFLENBQUM7U0FDNUI7UUFKWSxzQ0FBNkIsZ0NBSXpDLENBQUE7UUFFRCxvQ0FBNEMsU0FBUSxzQkFBc0I7WUFHdEU7Z0JBQWdCLEtBQUssRUFBRSxDQUFBO2dCQUR2QixXQUFNLEdBQXlDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQztZQUM1RCxDQUFDO1NBQzVCO1FBSlksdUNBQThCLGlDQUkxQyxDQUFBO1FBRUQsbUNBQTJDLFNBQVEsc0JBQXNCO1lBR3JFLFlBQXFCLFNBQWtCO2dCQUFJLEtBQUssRUFBRSxDQUFBO2dCQUE3QixjQUFTLEdBQVQsU0FBUyxDQUFTO2dCQUR2QyxXQUFNLEdBQTBDLHFCQUFxQixDQUFDLGVBQWUsQ0FBQztZQUNuQyxDQUFDO1NBQ3ZEO1FBSlksc0NBQTZCLGdDQUl6QyxDQUFBO1FBRUQsMENBQWtELFNBQVEsc0JBQXNCO1lBRzVFLFlBQXFCLFFBQTZDO2dCQUFJLEtBQUssRUFBRSxDQUFBO2dCQUF4RCxhQUFRLEdBQVIsUUFBUSxDQUFxQztnQkFEbEUsV0FBTSxHQUEyQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQztZQUNWLENBQUM7U0FDbEY7UUFKWSw2Q0FBb0MsdUNBSWhELENBQUE7SUFDTCxDQUFDLEVBeEN3QixRQUFRLEdBQVIsdUJBQVEsS0FBUix1QkFBUSxRQXdDaEM7QUFBRCxDQUFDLEVBeENTLGNBQWMsS0FBZCxjQUFjLFFBd0N2QjtBQzFDRCx5Q0FBeUM7QUFDekMsMENBQTBDO0FBQzFDLGlEQUFpRDtBQUNqRCxvREFBb0Q7QUNIcEQsMkNBQTJDO0FBQzNDLHFDQUFxQztBQUNyQyxpREFBaUQ7QUFDakQsNkNBQTZDO0FBRTdDLElBQVUsTUFBTSxDQTBHZjtBQTFHRCxXQUFVLE1BQU07SUFLWixJQUFJLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDO0lBQzNELElBQUksZUFBZSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUM7SUFDdEUsd0NBQXdDO0lBRXhDLElBQU0saUJBQWlCLEdBQXZCO1FBRUksWUFDdUIsY0FBb0MsRUFDcEMsU0FBbUI7WUFEbkIsbUJBQWMsR0FBZCxjQUFjLENBQXNCO1lBQ3BDLGNBQVMsR0FBVCxTQUFTLENBQVU7WUFtQ2hDLGdDQUEyQixHQUFHLElBQUksZUFBZSxFQUE2QixDQUFDO1lBTS9FLHVDQUFrQyxHQUFHLElBQUksZUFBZSxFQUE0QixDQUFDO1lBTXJGLGlDQUE0QixHQUFHLElBQUksZUFBZSxFQUFxQixDQUFDO1lBTXhFLGdDQUEyQixHQUFHLElBQUksZUFBZSxFQUF3QixDQUFDO1lBaERoRixNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQ2hDLENBQUMsT0FBZ0IsRUFBRSxNQUFNLEVBQUUsWUFBWTtnQkFFbkMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQ2hCLENBQUM7b0JBQ0csTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUN2QixDQUFDO3dCQUNHLEtBQUssTUFBTSxDQUFDLGtCQUFrQjs0QkFDMUIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQzs0QkFDckQsS0FBSyxDQUFDO3dCQUVWLEtBQUssTUFBTSxDQUFDLGdCQUFnQjs0QkFDeEIsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDOzRCQUM5RSxLQUFLLENBQUM7d0JBRVYsS0FBSyxNQUFNLENBQUMsY0FBYzs0QkFDdEIsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQzs0QkFDdEQsS0FBSyxDQUFDO3dCQUVWLEtBQUssTUFBTSxDQUFDLGVBQWU7NEJBQ3ZCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDeEUsS0FBSyxDQUFDO3dCQUVWOzRCQUNJLEtBQUssQ0FBQztvQkFDZCxDQUFDO2dCQUNMLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztRQUNYLENBQUM7UUFHRCxJQUFXLDBCQUEwQjtZQUVqQyxNQUFNLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssQ0FBQztRQUNsRCxDQUFDO1FBR0QsSUFBVyxpQ0FBaUM7WUFFeEMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxLQUFLLENBQUM7UUFDekQsQ0FBQztRQUdELElBQVcsMkJBQTJCO1lBRWxDLE1BQU0sQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFDO1FBQ25ELENBQUM7UUFHRCxJQUFXLDBCQUEwQjtZQUVqQyxNQUFNLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssQ0FBQztRQUNsRCxDQUFDO1FBRVMsd0JBQXdCLENBQVUsR0FBbUQ7WUFFM0YsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDO2lCQUN2RSxJQUFJLENBQVUsSUFBSSxJQUNuQixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLENBQUM7UUFFUyxvQkFBb0IsQ0FBVSxHQUFtRDtZQUV2RixNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FDMUMsSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQ1osR0FBRyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRU0sY0FBYztZQUVqQixNQUFNLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFPLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxDQUFDLENBQUM7UUFDN0csQ0FBQztRQUVNLGFBQWEsQ0FBQyxRQUFxQjtZQUV0QyxNQUFNLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFjLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxvQ0FBb0MsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ2xJLENBQUM7UUFFTSxrQkFBa0I7WUFFckIsTUFBTSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBYyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDO1FBQ25ILENBQUM7UUFFTSxlQUFlLENBQUMsU0FBa0I7WUFFckMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBTyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNqSCxDQUFDO0tBQ0osQ0FBQTtJQWhHSyxpQkFBaUI7UUFEdEIsY0FBYyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUM7eUNBSXhCLE1BQU0sQ0FBQyxhQUFhLEVBQ3pCLFFBQVE7T0FKeEMsaUJBQWlCLENBZ0d0QjtBQUNMLENBQUMsRUExR1MsTUFBTSxLQUFOLE1BQU0sUUEwR2Y7QUMvR0QsSUFBVSxjQUFjLENBaUh2QjtBQWpIRCxXQUFVLGNBQWM7SUFBQyxJQUFBLGFBQWEsQ0FpSHJDO0lBakh3QixXQUFBLGFBQWE7UUFFbEMsSUFBWSxXQU1YO1FBTkQsV0FBWSxXQUFXO1lBRW5CLCtDQUFLLENBQUE7WUFDTCwrQ0FBSyxDQUFBO1lBQ0wsaURBQU0sQ0FBQTtZQUNOLG1EQUFPLENBQUE7UUFDWCxDQUFDLEVBTlcsV0FBVyxHQUFYLHlCQUFXLEtBQVgseUJBQVcsUUFNdEI7UUFFRCxJQUFZLFVBSVg7UUFKRCxXQUFZLFVBQVU7WUFFbEIsK0NBQU0sQ0FBQTtZQUNOLDZDQUFLLENBQUE7UUFDVCxDQUFDLEVBSlcsVUFBVSxHQUFWLHdCQUFVLEtBQVYsd0JBQVUsUUFJckI7UUFJRDtZQUdJO2dCQURtQixXQUFNLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7WUFDaEQsQ0FBQztZQUNqQixJQUFXLE9BQU87Z0JBRWQsTUFBTSxDQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFrQztxQkFDcEQsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsSUFBSSxLQUFLLEdBQUcsUUFBUSxFQUFFLENBQUM7cUJBQy9ELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQixDQUFDO1lBQ0QsV0FBVyxDQUFDLFlBQW9CLEVBQUUsS0FBb0IsRUFBRSxRQUFpQjtnQkFFckUsS0FBSztzQkFDQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxRQUFRLEdBQUcsWUFBWSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7c0JBQ3RFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzNDLENBQUM7WUFDRCxnQkFBZ0IsQ0FBQyxZQUFvQjtnQkFFakMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQzNELE1BQU0sQ0FBQyxLQUFLLENBQUM7WUFDakIsQ0FBQztTQUNKO1FBckJZLGdDQUFrQixxQkFxQjlCLENBQUE7UUFFRCx5QkFBZ0MsR0FBeUI7WUFFckQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUM7UUFDeEIsQ0FBQztRQUhlLDZCQUFlLGtCQUc5QixDQUFBO1FBRUQsdUJBQThCLEdBQXlCO1lBRW5ELE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUM7UUFDekIsQ0FBQztRQUhlLDJCQUFhLGdCQUc1QixDQUFBO1FBRUQ7WUFpQ0ksWUFBWSxJQUFnQixFQUFFLE1BQWUsRUFBRSxFQUFVLEVBQUUsYUFBa0M7Z0JBL0I3RixhQUFRLEdBQUcsSUFBSSxDQUFDO2dCQVVoQixZQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUViLG1CQUFjLEdBQUcsSUFBSSxDQUFDO2dCQUV0QixjQUFTLEdBQUcsRUFBRSxDQUFDO2dCQW1CWCxJQUFJLFFBQVEsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO2dCQUNiLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQztnQkFDcEQsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDO2dCQUM1QixJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUN4QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksa0JBQWtCLEVBQWtELENBQUM7Z0JBQ3RGLElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEtBQUssSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsQ0FBQztZQUNwRixDQUFDO1lBMUJELHFCQUFxQjtnQkFFakIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLHFCQUFxQixFQUFFLENBQUM7Z0JBQzVHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7Z0JBQy9DLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ3JCLENBQUM7WUFDRCxpQkFBaUI7Z0JBRWIsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEtBQUssRUFBRTtzQkFDN0IsRUFBRTtzQkFDRixHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sR0FBRyxXQUFXLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7Z0JBQzVILElBQUksSUFBSSxDQUFDLE9BQU8sV0FBVyxJQUFJLENBQUMsRUFBRSxvQkFBb0IsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxDQUFDO2dCQUM5RixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3pCLENBQUM7U0E2Qko7UUE3RFksMkJBQWEsZ0JBNkR6QixDQUFBO0lBQ0wsQ0FBQyxFQWpId0IsYUFBYSxHQUFiLDRCQUFhLEtBQWIsNEJBQWEsUUFpSHJDO0FBQUQsQ0FBQyxFQWpIUyxjQUFjLEtBQWQsY0FBYyxRQWlIdkI7QUNqSEQscUNBQXFDO0FBRXJDLElBQVUsY0FBYyxDQTZEdkI7QUE3REQsV0FBVSxjQUFjO0lBQUMsSUFBQSxhQUFhLENBNkRyQztJQTdEd0IsV0FBQSxhQUFhO1FBRWxDLCtCQUErQjtRQUNsQixpQkFBRyxHQUNaO1lBQ0ksR0FBRyxFQUNIO2dCQUNJLEdBQUcsRUFDSDtvQkFDSSxRQUFRLEVBQUUsaUJBQWlCO29CQUMzQixRQUFRLEVBQUUsYUFBYTtvQkFDdkIsUUFBUSxFQUFFLE9BQU87b0JBQ2pCLFFBQVEsRUFBRSxZQUFZO2lCQUN6QjtnQkFDRCxHQUFHLEVBQ0g7b0JBQ0ksUUFBUSxFQUFFLGtCQUFrQjtvQkFDNUIsUUFBUSxFQUFFLGNBQWM7b0JBQ3hCLFFBQVEsRUFBRSxPQUFPO29CQUNqQixRQUFRLEVBQUUsYUFBYTtpQkFDMUI7Z0JBQ0QsR0FBRyxFQUFFLEtBQUs7YUFDYjtZQUNELEdBQUcsRUFDSDtnQkFDSSxHQUFHLEVBQ0g7b0JBQ0ksUUFBUSxFQUFFLE1BQU07b0JBQ2hCLFFBQVEsRUFBRSxRQUFRO29CQUNsQixRQUFRLEVBQUUsTUFBTTtvQkFDaEIsUUFBUSxFQUFFLFlBQVk7aUJBQ3pCO2dCQUNELEdBQUcsRUFDSDtvQkFDSSxRQUFRLEVBQUUsTUFBTTtvQkFDaEIsUUFBUSxFQUFFLFFBQVE7b0JBQ2xCLFFBQVEsRUFBRSxNQUFNO29CQUNoQixRQUFRLEVBQUUsYUFBYTtpQkFDMUI7Z0JBQ0QsR0FBRyxFQUFFLE9BQU87YUFDZjtTQUNKLENBQUM7UUFTTixJQUFhLFFBQVEsR0FBckI7WUFHSSxZQUFZLEdBQWE7Z0JBRXJCLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQzNDLENBQUM7b0JBQ0csSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUMvRCxDQUFDO1lBQ0wsQ0FBQztTQUNKLENBQUE7UUFWWSxRQUFRO1lBRHBCLGVBQUEsRUFBRSxDQUFDLFVBQVUsRUFBRTs2Q0FJSyxRQUFRO1dBSGhCLFFBQVEsQ0FVcEI7UUFWWSxzQkFBUSxXQVVwQixDQUFBO0lBQ0wsQ0FBQyxFQTdEd0IsYUFBYSxHQUFiLDRCQUFhLEtBQWIsNEJBQWEsUUE2RHJDO0FBQUQsQ0FBQyxFQTdEUyxjQUFjLEtBQWQsY0FBYyxRQTZEdkI7QUMvREQscUNBQXFDO0FBQ3JDLGlEQUFpRDtBQUNqRCxxQ0FBcUM7QUFDckMsMkNBQTJDO0FBRTNDLElBQVUsY0FBYyxDQXdUdkI7QUF4VEQsV0FBVSxjQUFjO0lBQUMsSUFBQSxhQUFhLENBd1RyQztJQXhUd0IsV0FBQSxhQUFhO1FBSWxDLElBQUksQ0FBQyxHQUFHLGVBQUEsSUFBSSxDQUFDLGFBQWEsQ0FBQztRQUUzQixJQUFLLEdBT0o7UUFQRCxXQUFLLEdBQUc7WUFFSix5QkFBRSxDQUFBO1lBQ0YsbUNBQU8sQ0FBQTtZQUNQLHVDQUFTLENBQUE7WUFDVCw2Q0FBWSxDQUFBO1lBQ1osdURBQWlCLENBQUE7UUFDckIsQ0FBQyxFQVBJLEdBQUcsS0FBSCxHQUFHLFFBT1A7UUFFRDtTQVNDO1FBVHFCLGtDQUFvQix1QkFTekMsQ0FBQTtRQUdELElBQU0sbUJBQW1CLEdBQXpCO1lBbUNJOztlQUVHO1lBQ0gsWUFBK0IsSUFBbUM7Z0JBQW5DLFNBQUksR0FBSixJQUFJLENBQStCO2dCQXBDL0MsaUJBQVksR0FBRyxHQUFHLENBQUM7Z0JBQ25CLHdCQUFtQixHQUFHLEdBQUcsQ0FBQztnQkFDMUIsZ0JBQVcsR0FDOUI7b0JBQ0ksRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRTtvQkFDekMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUU7b0JBQzlCLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFO29CQUM3QixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRTtvQkFDckMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUU7b0JBQy9CLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUU7b0JBQ3pDLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUU7b0JBQzVDLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUU7b0JBQ3hDLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFO2lCQUN2QyxDQUFDO2dCQUVpQix5QkFBb0IsR0FBRyxJQUFJLE9BQU8sRUFBcUMsQ0FBQztnQkFPeEUsZUFBVSxHQUFHLElBQUksT0FBTyxFQUFzQixDQUFDO2dCQUcvQyxzQkFBaUIsR0FBRyxJQUFJLE9BQU8sRUFBb0IsQ0FBQztnQkFHcEQsMEJBQXFCLEdBQUcsSUFBSSxPQUFPLEVBQW1DLENBQUM7Z0JBVXRGLGtFQUFrRTtnQkFDbEUsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ2xFLENBQUM7WUF4QkQsY0FBYyxDQUFDLEdBQWE7Z0JBRXhCLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2xELE1BQU0sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQVMsQ0FBQztZQUNwRCxDQUFDO1lBR00saUJBQWlCLENBQUMsR0FBYSxJQUFJLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQSxDQUFDLENBQUM7WUFHbkYsbUJBQW1CLENBQUMsR0FBYSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBLENBQUMsQ0FBQztZQWdCMUUsMEJBQTBCO2dCQUVoQyxDQUFDLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztnQkFDekIsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUNuQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNO2dCQUNmLG9DQUFvQztnQkFDcEMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQ2xCLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQzNELENBQUMsQ0FBQyxFQUFFLEVBQ0osQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFDakQsQ0FBQyxDQUFDLEVBQUUsRUFDSixDQUFDLENBQUMsZUFBZSxDQUNwQixFQUNELENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtnQkFDbEIsd0JBQXdCO2dCQUN4QixDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHO2dCQUM3RixnQ0FBZ0M7Z0JBQ2hDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQ3JELENBQUMsQ0FBQyxFQUFFO2dCQUNKLGtCQUFrQjtnQkFDbEIsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQ3pFLENBQUMsQ0FBQyxFQUFFO2dCQUNKLHFDQUFxQztnQkFDckMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUNqSCxDQUFDLENBQUMsRUFBRTtnQkFDSixxQkFBcUI7Z0JBQ3JCLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUNsSDtnQkFDRCw4QkFBOEI7Z0JBQzlCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQ3JELENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FDM0MsQ0FBQyxDQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ1IsQ0FBQztZQUVTLDBCQUEwQjtnQkFFaEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQ1gsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUMvQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUUsVUFBVTtnQkFDOUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQzNCLENBQUMsRUFDRixDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUUsTUFBTTtnQkFDMUIsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDOUIsQ0FBQyxFQUNGLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBRSx5QkFBeUI7Z0JBQ3pDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUM5QyxDQUFDLEVBQ0YsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFFLGlCQUFpQjtnQkFDOUMsQ0FBQyxDQUFDLEtBQUssQ0FDVixFQUNELENBQUMsQ0FBQyxhQUFhLENBQUUsNkNBQTZDO2dCQUMxRCxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDakIsRUFDRCxDQUFDLENBQUMsYUFBYSxDQUFFLDBCQUEwQjtnQkFDdkMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUN4QixFQUNELENBQUMsQ0FBQyxHQUFHLENBQUUsMENBQTBDO2dCQUM3QyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUNoRTtnQkFDRCxrQ0FBa0M7Z0JBQ2xDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FDM0MsQ0FBQztZQUNOLENBQUM7WUFFUyx1QkFBdUIsQ0FBQyxLQUEwQixFQUFFLFFBQWdCO2dCQUUxRSxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sQ0FBQyxPQUFPLEtBQUssRUFBRSxJQUFJLE9BQU8sSUFBSSxTQUFTLElBQUksT0FBTyxJQUFJLFdBQVcsQ0FBQztZQUM1RSxDQUFDO1lBRU0sMEJBQTBCLENBQUMsR0FBYTtnQkFFM0MsSUFBSSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM3RCxFQUFFLENBQUMsQ0FBQyxtQkFBbUIsS0FBSyxTQUFTLENBQUMsQ0FDdEMsQ0FBQztvQkFDRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQyxDQUFDO2dCQUM1RixDQUFDO2dCQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3ZDLElBQUksVUFBVSxHQUFHLElBQUksS0FBSyxFQUFnQixDQUFDO2dCQUMzQyxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQW9CLENBQUM7Z0JBQ2pFLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxJQUFJLFdBQVcsQ0FBQyxDQUM5QixDQUFDO29CQUNHLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FDbkIsQ0FBQzt3QkFDRyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksQ0FBRSxLQUFLLENBQUMsU0FBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUM5RixDQUFDOzRCQUNHLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBYyxDQUFDLENBQ3pELENBQUM7Z0NBQ0csRUFBRSxDQUFDLENBQUMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQ2pELENBQUM7b0NBQ0csSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztvQ0FDdkIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDNUUsQ0FBQzt3Q0FDRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29DQUMxQixDQUFDO2dDQUNMLENBQUM7Z0NBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksWUFBWSxHQUFHLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUN2RCxDQUFDO29DQUNHLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dDQUN0QyxDQUFDOzRCQUNMLENBQUM7d0JBQ0wsQ0FBQztvQkFDTCxDQUFDO29CQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQ3BCLENBQUM7d0JBQ0csRUFBRSxDQUFDLENBQUMsQ0FBQyxtQkFBb0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQzFDLENBQUM7NEJBQ0csSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDOzRCQUMvRixVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxLQUFLLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxPQUFPLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDOzRCQUMxSSxtQkFBbUIsQ0FBQyxHQUFHLENBQ25CLEtBQUssQ0FBQyxJQUFJLEVBQ1YsZUFBQSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLG1CQUFvQixFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztpQ0FDOUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUM7Z0NBRXpCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7Z0NBQ3JDLEtBQUssQ0FBQyxLQUFLLEdBQUcsK0NBQStDLElBQUksRUFBRSxDQUFDO2dDQUNwRSxLQUFLLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQztnQ0FDdEIsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7Z0NBQ3RCLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dDQUMxQixLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7NEJBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDakIsQ0FBQztvQkFDTCxDQUFDO2dCQUNMLENBQUM7Z0JBRUQsSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQixJQUFJLGtCQUFrQixHQUFHLFVBQVUsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUMsUUFBUSxHQUFHLFdBQVcsR0FBRyxDQUFDLENBQUMsUUFBUSxHQUFHLFdBQVcsQ0FBQyxDQUFDO2dCQUNqRyxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO2dCQUNsQyxJQUFJLGdCQUFnQixHQUFHLFdBQVcsQ0FBQztnQkFDbkMsT0FBTyxXQUFXLEVBQUUsR0FBRyxDQUFDLElBQUksa0JBQWtCLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQ3pFLENBQUM7b0JBQ0csZ0JBQWdCLEVBQUUsQ0FBQztvQkFDbkIsVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLElBQUksV0FBVyxDQUFDLENBQUM7b0JBQy9ELGtCQUFrQixHQUFHLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDN0gsQ0FBQztnQkFFRCxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUNsRCxDQUFDO29CQUNHLGdCQUFnQixHQUFHLENBQUMsQ0FBQztvQkFDckIsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFlLEtBQzFCLDZEQUE2RCxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO3dCQUNsRixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO29CQUMxQyxJQUFJLGlCQUFpQixHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ25ELEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FDeEQsQ0FBQzt3QkFDRyxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQzVELENBQUM7b0JBQ0QsSUFBSSxDQUNKLENBQUM7d0JBQ0csa0JBQWtCLEdBQUcsaUJBQWlCLENBQUM7b0JBQzNDLENBQUM7Z0JBQ0wsQ0FBQztnQkFFRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUNsRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUM1RSxDQUFDO1lBRU0sMEJBQTBCLENBQUMsR0FBNEI7Z0JBRTFELEVBQUUsQ0FBQyxDQUFDLEdBQUcsWUFBWSxjQUFBLGFBQWEsQ0FBQyxDQUNqQyxDQUFDO29CQUNHLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDO2dCQUN6QixDQUFDO2dCQUNELElBQUksQ0FDSixDQUFDO29CQUNHLElBQUksb0JBQW9CLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUM3RCxJQUFJLGNBQWMsR0FBRyxJQUFJLEtBQUssRUFBVSxDQUFDO29CQUN6QyxJQUFJLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRO3dCQUU5QyxJQUNBLENBQUM7NEJBQ0csTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQ2pDLENBQUM7d0JBQ0QsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQ1YsQ0FBQzs0QkFDRyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDOzRCQUM5QixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDOzRCQUN2QyxNQUFNLENBQUMsS0FBSyxDQUFDO3dCQUNqQixDQUFDO29CQUNMLENBQUMsQ0FBQyxDQUFDO29CQUNILGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLG9CQUFxQixDQUFDLE1BQU0sQ0FBQyxvQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDOUYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzdCLENBQUM7WUFDTCxDQUFDO1lBRU0sdUJBQXVCLENBQUMsR0FBWTtnQkFFdkMsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2dCQUNqRSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDNUQsRUFBRSxDQUFDLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQyxDQUN0QixDQUFDO29CQUNHLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQztvQkFDbEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUMzRCxDQUFDO2dCQUNELElBQUksb0JBQW9CLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDeEMsRUFBRSxDQUFDLENBQUMsb0JBQW9CLEtBQUssU0FBUyxDQUFDLENBQ3ZDLENBQUM7b0JBQ0csSUFBSSxpQkFBaUIsR0FBRyxFQUFFLEVBQUUsU0FBUyxHQUFHLEVBQUUsQ0FBQztvQkFDM0MsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FDOUMsQ0FBQzt3QkFDRyxnSEFBZ0g7d0JBQ2hILDBEQUEwRDt3QkFDMUQsaURBQWlEO3dCQUNqRCx3REFBd0Q7d0JBQ3hELFNBQVMsR0FBSSxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQVMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQkFDNUcsQ0FBQztvQkFDRCxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztvQkFDckMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDOUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDeEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUN4QywwRkFBMEY7b0JBQzFGLDBEQUEwRDtvQkFFMUQsdUVBQXVFO29CQUN2RSxJQUFJLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFDO29CQUVyRSx5REFBeUQ7b0JBQ3pELElBQUksYUFBYSxHQUFHLElBQUksTUFBTSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDO29CQUN4RCxtSEFBbUg7b0JBQ25ILG9CQUFvQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDekgsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztnQkFDdkMsQ0FBQztnQkFDRCxNQUFNLENBQUMsb0JBQW9CLENBQUM7WUFDaEMsQ0FBQztZQUVEOzs7Z0JBR0k7WUFDRyxrQkFBa0IsQ0FBQyxHQUFZLEVBQUUsb0JBQThCLEVBQUUsV0FBd0I7Z0JBRTVGLElBQUksZUFBZSxHQUFHLGNBQUEsV0FBVyxDQUFDLFdBQVcsQ0FBQyxFQUMxQyxZQUFZLEdBQUcsSUFBSSxNQUFNLENBQ3JCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDdkQsQ0FBQyxDQUFDLEtBQUssR0FBRyxlQUFlLEdBQUcsQ0FBQyxDQUFDLFlBQVksRUFDMUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2QsTUFBTSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2SCxDQUFDO1NBQ0osQ0FBQTtRQTVSSyxtQkFBbUI7WUFEeEIsZUFBQSxFQUFFLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDOzZDQXVDSyxlQUFBLFFBQVEsQ0FBQyxvQkFBb0I7V0F0Q2hFLG1CQUFtQixDQTRSeEI7SUFDTCxDQUFDLEVBeFR3QixhQUFhLEdBQWIsNEJBQWEsS0FBYiw0QkFBYSxRQXdUckM7QUFBRCxDQUFDLEVBeFRTLGNBQWMsS0FBZCxjQUFjLFFBd1R2QjtBQzdURCxxQ0FBcUM7QUFHckMsSUFBVSxjQUFjLENBOEt2QjtBQTlLRCxXQUFVLGNBQWM7SUFBQyxJQUFBLGFBQWEsQ0E4S3JDO0lBOUt3QixXQUFBLGFBQWE7UUFHbEMsSUFBSSxrQkFBa0IsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLHlCQUF5QixDQUFDO1FBRXpFLElBQVksZ0JBSVg7UUFKRCxXQUFZLGdCQUFnQjtZQUV4QiwyREFBTSxDQUFBO1lBQ04sNkRBQU8sQ0FBQTtRQUNYLENBQUMsRUFKVyxnQkFBZ0IsR0FBaEIsOEJBQWdCLEtBQWhCLDhCQUFnQixRQUkzQjtRQUVEO1NBT0M7UUFQcUIsK0JBQWlCLG9CQU90QyxDQUFBO1FBR0QsSUFBTSxnQkFBZ0IsR0FBdEI7WUFRSSxZQUN1QixhQUF1QixFQUN2QixnQkFBOEQsRUFDOUQsb0JBQTBDO2dCQUYxQyxrQkFBYSxHQUFiLGFBQWEsQ0FBVTtnQkFDdkIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUE4QztnQkFDOUQseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtnQkFUOUMsd0JBQW1CLEdBQ3RDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNoRyx3QkFBbUIsR0FBeUIsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUM7Z0JBQ2hFLG1CQUFjLEdBQUcsSUFBSSxPQUFPLEVBQThCLENBQUM7Z0JBQzNELG1CQUFjLEdBQUcsSUFBSSxPQUFPLEVBQThCLENBQUM7Z0JBVXBFLG9CQUFlLEdBQUcsSUFBSSxrQkFBa0IsRUFBZ0IsQ0FBQztnQkFNekQsb0JBQWUsR0FBRyxJQUFJLGtCQUFrQixFQUFnQixDQUFDO2dCQU16RCxvQkFBZSxHQUFHLElBQUksa0JBQWtCLEVBQWdCLENBQUM7Z0JBZi9ELGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDakYsQ0FBQztZQUdELElBQVcsY0FBYztnQkFFckIsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO1lBQ3RDLENBQUM7WUFHRCxJQUFXLGNBQWM7Z0JBRXJCLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztZQUN0QyxDQUFDO1lBR0QsSUFBVyxlQUFlO2dCQUV0QixNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUM7WUFDdEMsQ0FBQztZQUVTLGlCQUFpQixDQUFDLFFBQWdELEVBQUUsS0FBNEI7Z0JBRXRHLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUNwQyxDQUFDO29CQUNHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ3JELENBQUM7WUFDTCxDQUFDO1lBRU0sd0JBQXdCLENBQUMsR0FBYSxFQUFFLFdBQThCO2dCQUV6RSxFQUFFLENBQUMsQ0FBQyxXQUFXLEtBQUssZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQzdDLENBQUM7b0JBQ0csSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2hELEVBQUUsQ0FBQyxDQUFDLFlBQVksS0FBSyxTQUFTLENBQUMsQ0FDL0IsQ0FBQzt3QkFDRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsWUFBWSxHQUFHLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzVHLENBQUM7b0JBQ0QsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO29CQUN6RCxZQUFZLENBQUMsS0FBSyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQztvQkFFN0MsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2hELEVBQUUsQ0FBQyxDQUFDLFlBQVksS0FBSyxTQUFTLENBQUMsQ0FDL0IsQ0FBQzt3QkFDRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsWUFBWSxHQUFHLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzVHLENBQUM7b0JBQ0QsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2dCQUM3RCxDQUFDO1lBQ0wsQ0FBQztZQUVNLHVCQUF1QixDQUFDLEdBQWE7Z0JBRXhDLElBQUksYUFBYSxHQUFHLFNBQVMsQ0FBQztnQkFDOUIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2xELEVBQUUsQ0FBQyxDQUFDLFlBQVksS0FBSyxTQUFTLENBQUMsQ0FDL0IsQ0FBQztvQkFDRyxJQUFJLFNBQVMsR0FBRyxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQzNDLGFBQWEsR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDO29CQUNuQyxZQUFZLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQzFCLFlBQVksQ0FBQyxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDO29CQUM5QyxVQUFVLENBQUMsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsU0FBUyxFQUFFLFlBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUM3RSxDQUFDO2dCQUVELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNsRCxFQUFFLENBQUMsQ0FBQyxZQUFZLEtBQUssU0FBUyxDQUFDLENBQy9CLENBQUM7b0JBQ0csSUFBSSxTQUFTLEdBQUcsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUMzQyxZQUFZLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQzFCLFlBQVksQ0FBQyxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDO29CQUM5QyxVQUFVLENBQUMsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsU0FBUyxFQUFFLFlBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUM3RSxDQUFDO2dCQUNELE1BQU0sQ0FBQyxhQUFhLENBQUM7WUFDekIsQ0FBQztZQUVTLG9CQUFvQixDQUFDLFNBQTJCLEVBQUUsUUFBMEI7Z0JBRWxGLElBQUksWUFBWSxHQUFHLElBQUksR0FBRyxFQUFXLEVBQ2pDLGdCQUFnQixHQUFHLElBQUksR0FBRyxFQUFXLEVBQ3JDLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBVyxDQUFDO2dCQUN0QyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVE7b0JBRXRCLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FDdEIsQ0FBQzt3QkFDRyxLQUFLLFlBQVk7NEJBQ2IsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FDM0QsQ0FBQztnQ0FDRyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQy9CLENBQUM7b0NBQ0csS0FBSyxPQUFPO3dDQUNSLFlBQVksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQWlCLENBQUMsQ0FBQzt3Q0FDN0MsS0FBSyxDQUFDO29DQUVWLEtBQUssT0FBTzt3Q0FDUixZQUFZLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFpQixDQUFDLENBQUM7d0NBQzdDLEtBQUssQ0FBQztvQ0FFVjt3Q0FDSSxLQUFLLENBQUM7Z0NBQ2QsQ0FBQzs0QkFDTCxDQUFDOzRCQUNELEtBQUssQ0FBQzt3QkFFVixLQUFLLFdBQVc7NEJBQ1osS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUM7aUNBQzFDLE9BQU8sQ0FBQyxDQUFDLElBQWEsS0FBSyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzs0QkFDNUQsS0FBSyxDQUFDO3dCQUVWOzRCQUNJLEtBQUssQ0FBQztvQkFDZCxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO2dCQUNILEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQzFCLENBQUM7b0JBQ0csSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQzdDLENBQUM7Z0JBQ0QsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FDMUIsQ0FBQztvQkFDRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDN0MsQ0FBQztnQkFDRCxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQzlCLENBQUM7b0JBQ0csSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDakQsQ0FBQztnQkFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FDcEMsQ0FBQztvQkFDRyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQzFCLENBQUM7WUFDTCxDQUFDO1lBRVMsb0JBQW9CLENBQUMsU0FBMkIsRUFBRSxRQUEwQjtnQkFFbEYsSUFBSSxRQUFRLEdBQUcsU0FBUztxQkFDbkIsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztxQkFDOUMsSUFBSSxDQUFDLENBQUMsQ0FBTyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUN0RyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FDYixDQUFDO29CQUNHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUN4RixDQUFDO1lBQ0wsQ0FBQztTQUNKLENBQUE7UUF4SkssZ0JBQWdCO1lBRHJCLGVBQUEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQzs2Q0FVUyxRQUFRLEVBQ0wsY0FBYyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFDeEMsY0FBQSxvQkFBb0I7V0FYL0QsZ0JBQWdCLENBd0pyQjtJQUNMLENBQUMsRUE5S3dCLGFBQWEsR0FBYiw0QkFBYSxLQUFiLDRCQUFhLFFBOEtyQztBQUFELENBQUMsRUE5S1MsY0FBYyxLQUFkLGNBQWMsUUE4S3ZCO0FDakxELHFDQUFxQztBQUNyQyw2Q0FBNkM7QUFDN0MsaURBQWlEO0FBRWpELElBQVUsY0FBYyxDQW1KdkI7QUFuSkQsV0FBVSxjQUFjO0lBQUMsSUFBQSxhQUFhLENBbUpyQztJQW5Kd0IsV0FBQSxhQUFhO1FBUWxDO1NBVUM7UUFWcUIsOEJBQWdCLG1CQVVyQyxDQUFBO1FBSUQsSUFBTSxlQUFlLHVCQUFyQixxQkFBc0IsU0FBUSxjQUFjLENBQUMsUUFBUSxDQUFDLG1CQUFtQjtZQUtyRSxZQUN1QixhQUF1QixFQUN2QixlQUF1RCxFQUMxRSxHQUFpRCxFQUNqRCxjQUF1RCxFQUN2RCxXQUFpRDtnQkFFakQsS0FBSyxDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBTnJCLGtCQUFhLEdBQWIsYUFBYSxDQUFVO2dCQUN2QixvQkFBZSxHQUFmLGVBQWUsQ0FBd0M7Z0JBTTFFLFdBQVcsQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMxRixXQUFXLENBQUMsMEJBQTBCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDMUYsV0FBVyxDQUFDLGlDQUFpQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3hHLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2hHLENBQUM7WUFFUyxtQkFBbUI7Z0JBRXpCLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUF1QixJQUFJLENBQUM7cUJBQy9DLElBQUksQ0FBQyxHQUFHO29CQUVMLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLFNBQVMsS0FBSyxTQUFTLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQztvQkFDL0UsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLGVBQWUsS0FBSyxTQUFTLENBQUMsQ0FDdEMsQ0FBQzt3QkFDRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUM7d0JBQzVELElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO3dCQUNyRCxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQ25CLENBQUM7NEJBQ0csTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLENBQUM7NEJBQy9DLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO3dCQUMvQixDQUFDO3dCQUNELElBQUksQ0FDSixDQUFDOzRCQUNHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxDQUFDO3dCQUM5QyxDQUFDO29CQUNMLENBQUM7b0JBQ0QsSUFBSSxDQUNKLENBQUM7d0JBQ0csSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7d0JBQ3ZDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLEdBQUcsZUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUN0RCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztvQkFDcEQsQ0FBQztvQkFDRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ2xCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO29CQUN0RSxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbkQsQ0FBQyxDQUFDO3FCQUNELEtBQUssQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzdELENBQUM7WUFFUywyQkFBMkIsQ0FBQyxRQUFxQjtnQkFFdkQsSUFBSSxPQUF5QyxDQUFDO2dCQUM5QyxHQUFHLENBQUMsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQ3RDLENBQUM7b0JBQ0csRUFBRSxDQUFDLENBQUMsaUJBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDbkUsQ0FBQzt3QkFDRyxJQUFJLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUNwRixDQUFDO2dCQUNMLENBQUM7Z0JBQ0QsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25CLENBQUM7WUFFUyxpQ0FBaUMsQ0FBQyxRQUFxQixFQUFFLFdBQWlDO2dCQUVoRyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsV0FBVyxDQUFDO2dCQUNwQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNsQixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekQsQ0FBQztZQUVTLDBCQUEwQixDQUFDLFFBQXFCLEVBQUUsU0FBa0I7Z0JBRTFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO2dCQUM1QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekQsQ0FBQztZQUVTLDBCQUEwQixDQUFDLFFBQTZCO2dCQUU5RCxRQUFRLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDcEMsQ0FBQztZQUVTLG1CQUFtQjtnQkFFekIsSUFBSSxPQUF5QyxDQUFDO2dCQUM5QyxHQUFHLENBQUMsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQ3RDLENBQUM7b0JBQ0csRUFBRSxDQUFDLENBQUMsaUJBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDbkUsQ0FBQzt3QkFDRyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxFQUFFLGlCQUFlLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQzNJLENBQUM7Z0JBQ0wsQ0FBQztZQUNMLENBQUM7WUFFUyx3QkFBd0IsQ0FBQyxZQUFvQjtnQkFFbkQsTUFBTSxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxDQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQy9GLENBQUM7WUFFUyxXQUFXLENBQUMsT0FBZTtnQkFFakMsSUFBSSxHQUFHLEVBQUUsUUFBUSxHQUFHLElBQUksZUFBQSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQy9DLEdBQUcsQ0FBQyxDQUFDLElBQUksT0FBTyxJQUFJLGVBQUEsUUFBUSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FDbEQsQ0FBQztvQkFDRyxJQUFJLElBQUksR0FBRyxPQUEyQyxDQUFDO29CQUN2RCxHQUFHLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQzdFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUNSLENBQUM7d0JBQ0csTUFBTSxDQUFDLENBQUMsT0FBTyxlQUFBLFFBQVEsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQ25ELENBQUM7NEJBQ0csS0FBSyxlQUFBLElBQUksQ0FBQyxJQUFJO2dDQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dDQUFDLEtBQUssQ0FBQzs0QkFDL0QsS0FBSyxlQUFBLElBQUksQ0FBQyxHQUFHO2dDQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBQUMsS0FBSyxDQUFDOzRCQUNyRDtnQ0FBUyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDO2dDQUFDLEtBQUssQ0FBQzt3QkFDekMsQ0FBQztvQkFDTCxDQUFDO29CQUNELElBQUk7d0JBQUMsS0FBSyxDQUFDO2dCQUNmLENBQUM7Z0JBRUQsUUFBUSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsZUFBZSxJQUFJLE9BQU8sQ0FBQztnQkFDckQsUUFBUSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUM7Z0JBQ25DLE1BQU0sQ0FBQyxRQUFRLENBQUM7WUFDcEIsQ0FBQztTQUNKLENBQUE7UUExSEcsZ0RBQWdEO1FBQ3RCLDhCQUFjLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLHVDQUF1QixHQUF1QyxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBSnRJLGVBQWU7WUFGcEIsZUFBQSxFQUFFLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDO1lBQy9CLGVBQUEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLGVBQUEsRUFBRSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQzs2Q0FPN0MsUUFBUSxFQUNOLGNBQWMsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUNyRSxjQUFjLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUNqQyxjQUFjLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFDMUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxZQUFZO1dBVm5ELGVBQWUsQ0E0SHBCOztJQUNMLENBQUMsRUFuSndCLGFBQWEsR0FBYiw0QkFBYSxLQUFiLDRCQUFhLFFBbUpyQztBQUFELENBQUMsRUFuSlMsY0FBYyxLQUFkLGNBQWMsUUFtSnZCO0FDdkpELHFDQUFxQztBQUNyQyw0REFBNEQ7QUFDNUQsMkRBQTJEO0FBQzNELG1DQUFtQztBQUNuQywyQ0FBMkM7QUFHM0MsSUFBVSxjQUFjLENBaUN2QjtBQWpDRCxXQUFVLGNBQWM7SUFBQyxJQUFBLE1BQU0sQ0FpQzlCO0lBakN3QixXQUFBLE1BQU07UUFHM0I7WUFNSSxZQUN1QixJQUFrRCxFQUNsRCxnQkFBOEQ7Z0JBRDlELFNBQUksR0FBSixJQUFJLENBQThDO2dCQUNsRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQThDO2dCQUxsRSxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUM7Z0JBT3ZELGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzdFLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFFLGVBQUEsTUFBTSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNILENBQUM7WUFFUyxxQkFBcUIsQ0FBQyxLQUE0QjtnQkFFeEQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLE9BQUEsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQWdDLENBQUMsQ0FBQztZQUM5RyxDQUFDO1lBRVMsaUJBQWlCLENBQUMsUUFBd0IsRUFBRSxXQUEyQjtnQkFFN0UsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLE9BQUEsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQWdDLENBQUMsQ0FBQztnQkFDMUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN6QixDQUFDO1lBRVMsVUFBVSxDQUFDLFlBQW9CLEVBQUUsVUFBa0I7Z0JBRXpELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDNUcsQ0FBQztTQUNKO1FBN0JxQix5QkFBa0IscUJBNkJ2QyxDQUFBO0lBQ0wsQ0FBQyxFQWpDd0IsTUFBTSxHQUFOLHFCQUFNLEtBQU4scUJBQU0sUUFpQzlCO0FBQUQsQ0FBQyxFQWpDUyxjQUFjLEtBQWQsY0FBYyxRQWlDdkI7QUN4Q0QscUNBQXFDO0FBQ3JDLDhDQUE4QztBQUM5Qyw0REFBNEQ7QUFDNUQsMkRBQTJEO0FBQzNELHFDQUFxQztBQUVyQyxJQUFVLGNBQWMsQ0F3SnZCO0FBeEpELFdBQVUsY0FBYztJQUFDLElBQUEsTUFBTSxDQXdKOUI7SUF4SndCLFdBQUEsTUFBTTtRQUUzQjtTQUlDO1FBSnFCLGdDQUF5Qiw0QkFJOUMsQ0FBQTtRQUVEO1NBSUM7UUFKcUIsbUNBQTRCLCtCQUlqRCxDQUFBO1FBRUQsK0JBQStCO1FBRS9CLElBQU0sd0JBQXdCLEdBQTlCLDhCQUErQixTQUFRLE9BQUEsa0JBQWtCO1lBSXJELDJDQUEyQztZQUMzQyxZQUNJLEdBQWlELEVBQ2pELGVBQTZEO2dCQUU3RCxLQUFLLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFDO2dCQVB0QixZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7Z0JBUTFDLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBQSxTQUFTLENBQUMsVUFBVSxDQUFDO1lBQzNDLENBQUM7WUFFUyxpQkFBaUIsQ0FBQyxRQUF3QixFQUFFLFdBQTJCO2dCQUU3RSxLQUFLLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUMvQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBQzdDLENBQUM7WUFFUyxlQUFlLENBQUMsSUFBZSxFQUFFLGdCQUF5QjtnQkFFaEUsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztnQkFDN0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FDakQsQ0FBQztvQkFDRyxJQUFJLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7b0JBQ3pCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQztnQkFDM0MsQ0FBQztnQkFDRCxJQUFJLENBQ0osQ0FBQztvQkFDRyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQzlFLENBQUM7Z0JBQ0QsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDO2dCQUM1RyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUMzQixFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUNyQixDQUFDO29CQUNHLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUN2QyxFQUFFLENBQUMsQ0FBQyxRQUFRLEtBQUssU0FBUyxDQUFDLENBQzNCLENBQUM7d0JBQ0csS0FBSyxHQUFHLFFBQVEsQ0FBQztvQkFDckIsQ0FBQztvQkFDRCxJQUFJLENBQ0osQ0FBQzt3QkFDRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUM5QyxDQUFDOzRCQUNHLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQyxFQUFFLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQzs0QkFDbkMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQ3JELENBQUM7Z0NBQ0csRUFBRSxDQUFDLENBQUMsVUFBVSxHQUFHLEtBQUssSUFBSSxVQUFVLEdBQUcsU0FBUyxDQUFDLENBQ2pELENBQUM7b0NBQ0csU0FBUyxHQUFHLFVBQVUsQ0FBQztnQ0FDM0IsQ0FBQztnQ0FDRCxFQUFFLENBQUMsQ0FBQyxVQUFVLEdBQUcsS0FBSyxJQUFJLFVBQVUsR0FBRyxTQUFTLENBQUMsQ0FDakQsQ0FBQztvQ0FDRyxTQUFTLEdBQUcsVUFBVSxDQUFDO2dDQUMzQixDQUFDOzRCQUNMLENBQUM7NEJBQ0QsRUFBRSxDQUFDLENBQUMsU0FBUyxHQUFHLFNBQVMsR0FBRyxZQUFZLEdBQUcsQ0FBQyxDQUFDO2dDQUFDLEtBQUssR0FBRyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7NEJBQ2xGLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsU0FBUyxHQUFHLFlBQVksQ0FBQztnQ0FBQyxLQUFLLEdBQUcsU0FBUyxHQUFHLFlBQVksQ0FBQzs0QkFDNUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsR0FBRyxLQUFLLEdBQUcsWUFBWSxDQUFDO2dDQUFDLEtBQUssR0FBRyxTQUFTLEdBQUcsWUFBWSxDQUFDOzRCQUM1RSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzt3QkFDNUMsQ0FBQzt3QkFDRCxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQzVELENBQUM7Z0JBQ0wsQ0FBQztnQkFDRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNsRSxDQUFDO1lBRU0sV0FBVyxDQUFDLFVBQXlCLEVBQUUsZ0JBQXlCLEVBQUUsR0FBUSxFQUFFLG1CQUE4QztnQkFFN0gsVUFBVSxHQUFHLFVBQVUsSUFBSSxvQkFBb0IsQ0FBQztnQkFDaEQsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzdDLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixJQUFJLFNBQVMsQ0FBQyxDQUNsQyxDQUFDO29CQUNHLElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUM1QyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUU7d0JBQzNCLE1BQU0sRUFBRSxPQUFBLFdBQVcsQ0FBQyxRQUFRO3dCQUM1QixhQUFhLEVBQUUsVUFBVTt3QkFDekIsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJO3dCQUNyQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxHQUFHLElBQUk7cUJBQzdDLENBQUMsQ0FBQztnQkFDUCxDQUFDO2dCQUNELElBQUksQ0FDSixDQUFDO29CQUNHLElBQUksSUFBSSxHQUFHLE9BQUEsU0FBUyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFFdkMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FDOUMsQ0FBQzt3QkFDRyxVQUFVLEdBQUcsV0FBVyxDQUFDO3dCQUN6QixJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7b0JBQ3pELENBQUM7b0JBRUQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLElBQUksbUJBQW1CLENBQUMsQ0FDNUMsQ0FBQzt3QkFDRyxJQUFJLGFBQWEsR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDN0MsSUFBSSxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUM7d0JBQ2hELE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRTs0QkFDM0IsS0FBSyxFQUFFLElBQUk7NEJBQ1gsTUFBTSxFQUFFLE9BQUEsV0FBVyxDQUFDLE1BQU07NEJBQzFCLGFBQWEsRUFBRSxVQUFVOzRCQUN6QixLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUk7NEJBQ3JDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxhQUFhLEdBQUcsSUFBSTt5QkFDakQsQ0FBQyxDQUFDO29CQUNQLENBQUM7b0JBQ0QsSUFBSSxDQUNKLENBQUM7d0JBQ0csSUFBSSxJQUFJLEdBQUcsT0FBQSxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUN2QyxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO3dCQUNuQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO3dCQUM3QyxJQUFJLFdBQVcsR0FBRyxPQUFBLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQzlDLElBQUksTUFBTSxHQUFHOzRCQUNULEtBQUssRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFOzRCQUM3QixLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVM7NEJBQ3JCLGFBQWEsRUFBRSxhQUFhOzRCQUM1QixhQUFhLEVBQUUsVUFBVTs0QkFDekIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLOzRCQUNqQixNQUFNLEVBQUUsT0FBQSxXQUFXLENBQUMsRUFBRTs0QkFDdEIsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJO3lCQUN4QyxDQUFDO3dCQUNGLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQzt3QkFDdEMsTUFBTSxDQUFDLE1BQU0sQ0FBQztvQkFDbEIsQ0FBQztnQkFDTCxDQUFDO1lBQ0wsQ0FBQztTQUNKLENBQUE7UUEzSEssd0JBQXdCO1lBRDdCLGVBQUEsRUFBRSxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQzs2Q0FPNUIsY0FBYyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFDaEMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0I7V0FQL0Qsd0JBQXdCLENBMkg3QjtRQUdELElBQU0sMkJBQTJCLEdBQWpDLGlDQUFrQyxTQUFRLHdCQUF3QjtZQUU5RCxZQUNJLEdBQWlELEVBQ2pELGVBQTZEO2dCQUU3RCxLQUFLLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFDO2dCQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQUEsU0FBUyxDQUFDLFVBQVUsQ0FBQztZQUMzQyxDQUFDO1NBQ0osQ0FBQTtRQVRLLDJCQUEyQjtZQURoQyxlQUFBLEVBQUUsQ0FBQyxVQUFVLENBQUMsNEJBQTRCLENBQUM7NkNBSS9CLGNBQWMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQ2hDLGNBQWMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CO1dBSi9ELDJCQUEyQixDQVNoQztJQUNMLENBQUMsRUF4SndCLE1BQU0sR0FBTixxQkFBTSxLQUFOLHFCQUFNLFFBd0o5QjtBQUFELENBQUMsRUF4SlMsY0FBYyxLQUFkLGNBQWMsUUF3SnZCO0FDOUpELHFDQUFxQztBQUNyQyxxQ0FBcUM7QUFDckMsOENBQThDO0FBQzlDLDREQUE0RDtBQUM1RCwyREFBMkQ7QUFHM0QsSUFBVSxjQUFjLENBdU92QjtBQXZPRCxXQUFVLGNBQWM7SUFBQyxJQUFBLE1BQU0sQ0F1TzlCO0lBdk93QixXQUFBLE1BQU07UUFFM0I7U0FJQztRQUpxQiwwQkFBbUIsc0JBSXhDLENBQUE7UUFDRDtTQUlDO1FBSnFCLGdDQUF5Qiw0QkFJOUMsQ0FBQTtRQUVEO1NBSUM7UUFKcUIsNEJBQXFCLHdCQUkxQyxDQUFBO1FBRUQ7U0FJQztRQUpxQixvQ0FBNkIsZ0NBSWxELENBQUE7UUFFRDtTQUlDO1FBSnFCLHFDQUE4QixpQ0FJbkQsQ0FBQTtRQUVEO1NBSUM7UUFKcUIscUNBQThCLGlDQUluRCxDQUFBO1FBRUQsK0JBQStCO1FBQy9CLDhCQUF3QyxTQUFRLE9BQUEsa0JBQWtCO1lBRTlELDJDQUEyQztZQUMzQyxZQUNJLEdBQWlELEVBQ2pELGVBQTZEO2dCQUU3RCxLQUFLLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBQ2hDLENBQUM7WUFFUyxlQUFlLENBQUMsSUFBZSxFQUFFLG1CQUEyQixFQUFFLGNBQXVCO2dCQUUzRixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLGFBQWEsR0FBRyxDQUFDLGNBQWMsS0FBSyxTQUFTLEdBQUcsY0FBYyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUM1SCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUNqRCxDQUFDO29CQUNHLElBQUksQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQztvQkFDekIsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDO2dCQUMzQyxDQUFDO2dCQUNELElBQUksQ0FDSixDQUFDO29CQUNHLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDOUUsQ0FBQztnQkFDRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ3ZFLElBQUksZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsbUJBQW1CLEVBQ3RELElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUMxSCxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixHQUFHLGFBQWEsRUFBRSxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hILEVBQUUsQ0FBQyxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsQ0FDeEIsQ0FBQztvQkFDRyxFQUFFLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQ2YsQ0FBQzt3QkFDRyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDbEcsQ0FBQztvQkFDRCxJQUFJLENBQ0osQ0FBQzt3QkFDRyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEdBQUcsYUFBYSxFQUFFLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztvQkFDekYsQ0FBQztnQkFDTCxDQUFDO2dCQUNELElBQUksQ0FDSixDQUFDO29CQUNHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsQ0FDZixDQUFDO3dCQUNHLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxhQUFhLENBQUMsRUFBRSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQ3BILENBQUM7b0JBQ0QsSUFBSSxDQUNKLENBQUM7d0JBQ0csSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixHQUFHLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDdEUsQ0FBQztnQkFDTCxDQUFDO1lBQ0wsQ0FBQztZQUVNLFdBQVcsQ0FBQyxVQUF5QixFQUFFLG1CQUEyQixFQUFFLGNBQWtDLEVBQUUsR0FBUyxFQUFFLGNBQXVCO2dCQUU3SSxVQUFVLEdBQUcsVUFBVSxJQUFJLGNBQWMsQ0FBQztnQkFDMUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxVQUFVLElBQUksbUJBQW1CLEVBQUUsRUFBRSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBRXBGLEVBQUUsQ0FBQyxDQUFDLGNBQWMsSUFBSSxjQUFjLENBQUMsZUFBZSxJQUFJLG1CQUFtQixDQUFDLENBQzVFLENBQUM7b0JBQ0csSUFBSSxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUM7b0JBQ2pELE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRTt3QkFDM0IsS0FBSyxFQUFFLElBQUk7d0JBQ1gsTUFBTSxFQUFFLE9BQUEsV0FBVyxDQUFDLFNBQVM7d0JBQzdCLGFBQWEsRUFBRSxVQUFVO3dCQUN6QixLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUk7d0JBQ3JDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxjQUFjLEdBQUcsSUFBSTtxQkFDbEQsQ0FBQyxDQUFDO2dCQUNQLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsSUFBSSxjQUFjLENBQUMsZUFBZSxJQUFJLG1CQUFtQixDQUFDLENBQ2pGLENBQUM7b0JBQ0csVUFBVSxHQUFHLGNBQWMsQ0FBQyxhQUFhLENBQUM7Z0JBQzlDLENBQUM7Z0JBRUQsRUFBRSxDQUFDLENBQUMsU0FBUyxJQUFJLFNBQVMsS0FBSyxTQUFTLENBQUMsQ0FDekMsQ0FBQztvQkFDRyxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDNUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFO3dCQUMzQixNQUFNLEVBQUUsT0FBQSxXQUFXLENBQUMsUUFBUTt3QkFDNUIsYUFBYSxFQUFFLFVBQVU7d0JBQ3pCLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSTt3QkFDckMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsR0FBRyxJQUFJO3FCQUM3QyxDQUFDLENBQUM7Z0JBQ1AsQ0FBQztnQkFDRCxJQUFJLENBQ0osQ0FBQztvQkFDRyxJQUFJLElBQUksR0FBRyxPQUFBLFNBQVMsQ0FBQyxLQUFLLENBQUMsVUFBVyxDQUFDLEVBQUUsTUFBa0IsQ0FBQztvQkFDNUQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FDckIsQ0FBQzt3QkFDRyxNQUFNLEdBQUc7NEJBQ0wsS0FBSyxFQUFFLElBQUk7NEJBQ1gsS0FBSyxFQUFFLENBQUM7NEJBQ1IsZUFBZSxFQUFFLG1CQUFtQjs0QkFDcEMsYUFBYSxFQUFFLENBQUM7NEJBQ2hCLGFBQWEsRUFBRSxVQUFVOzRCQUN6QixLQUFLLEVBQUUsQ0FBQzs0QkFDUixNQUFNLEVBQUUsT0FBQSxXQUFXLENBQUMsV0FBVzs0QkFDL0IsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJO3lCQUN4QyxDQUFDO3dCQUNGLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQzt3QkFDOUIsTUFBTSxDQUFDLE1BQU0sQ0FBQztvQkFDbEIsQ0FBQztvQkFDRCxJQUFJLENBQ0osQ0FBQzt3QkFDRyxJQUFJLElBQUksR0FBRyxPQUFBLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3ZDLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7d0JBQ25DLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFLGNBQWMsQ0FBQyxDQUFDO3dCQUNoRSxJQUFJLFdBQVcsR0FBRyxPQUFBLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQzlDLE1BQU0sR0FBRzs0QkFDTCxLQUFLLEVBQUUsV0FBVyxDQUFDLFFBQVEsRUFBRTs0QkFDN0IsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTOzRCQUNyQixlQUFlLEVBQUUsbUJBQW1COzRCQUNwQyxhQUFhLEVBQUUsYUFBYTs0QkFDNUIsYUFBYSxFQUFFLFVBQVU7NEJBQ3pCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSzs0QkFDakIsTUFBTSxFQUFFLE9BQUEsV0FBVyxDQUFDLEVBQUU7NEJBQ3RCLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSTt5QkFDeEMsQ0FBQzt3QkFDRixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7d0JBQzlCLE1BQU0sQ0FBQyxNQUFNLENBQUM7b0JBQ2xCLENBQUM7Z0JBQ0wsQ0FBQztZQUNMLENBQUM7U0FDSjtRQUdELElBQU0sd0JBQXdCLEdBQTlCLDhCQUErQixTQUFRLHdCQUF3QjtZQUUzRCxZQUNJLEdBQWlELEVBQ2pELGVBQTZEO2dCQUU3RCxLQUFLLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFDO2dCQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQUEsU0FBUyxDQUFDLFVBQVUsQ0FBQztZQUMzQyxDQUFDO1NBQ0osQ0FBQTtRQVRLLHdCQUF3QjtZQUQ3QixlQUFBLEVBQUUsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUM7NkNBSTVCLGNBQWMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQ2hDLGNBQWMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CO1dBSi9ELHdCQUF3QixDQVM3QjtRQUdELElBQU0sa0JBQWtCLEdBQXhCLHdCQUF5QixTQUFRLHdCQUF3QjtZQUVyRCxZQUNJLEdBQWlELEVBQ2pELGVBQTZEO2dCQUU3RCxLQUFLLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFDO2dCQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQUEsU0FBUyxDQUFDLElBQUksQ0FBQztZQUNyQyxDQUFDO1NBQ0osQ0FBQTtRQVRLLGtCQUFrQjtZQUR2QixlQUFBLEVBQUUsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUM7NkNBSXRCLGNBQWMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQ2hDLGNBQWMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CO1dBSi9ELGtCQUFrQixDQVN2QjtRQUdELElBQU0sb0JBQW9CLEdBQTFCLDBCQUEyQixTQUFRLHdCQUF3QjtZQUV2RCxZQUNJLEdBQWlELEVBQ2pELGVBQTZEO2dCQUU3RCxLQUFLLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFDO2dCQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQUEsU0FBUyxDQUFDLE1BQU0sQ0FBQztZQUN2QyxDQUFDO1NBQ0osQ0FBQTtRQVRLLG9CQUFvQjtZQUR6QixlQUFBLEVBQUUsQ0FBQyxVQUFVLENBQUMscUJBQXFCLENBQUM7NkNBSXhCLGNBQWMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQ2hDLGNBQWMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CO1dBSi9ELG9CQUFvQixDQVN6QjtRQUdELElBQU0sNEJBQTRCLEdBQWxDLGtDQUFtQyxTQUFRLHdCQUF3QjtZQUUvRCxZQUNJLEdBQWlELEVBQ2pELGVBQTZEO2dCQUU3RCxLQUFLLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFDO2dCQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQUEsU0FBUyxDQUFDLGVBQWUsQ0FBQztZQUNoRCxDQUFDO1NBQ0osQ0FBQTtRQVRLLDRCQUE0QjtZQURqQyxlQUFBLEVBQUUsQ0FBQyxVQUFVLENBQUMsNkJBQTZCLENBQUM7NkNBSWhDLGNBQWMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQ2hDLGNBQWMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CO1dBSi9ELDRCQUE0QixDQVNqQztRQUdELElBQU0sNkJBQTZCLEdBQW5DLG1DQUFvQyxTQUFRLHdCQUF3QjtZQUVoRSxZQUNJLEdBQWlELEVBQ2pELGVBQTZEO2dCQUU3RCxLQUFLLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFDO2dCQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQUEsU0FBUyxDQUFDLGdCQUFnQixDQUFDO1lBQ2pELENBQUM7U0FDSixDQUFBO1FBVEssNkJBQTZCO1lBRGxDLGVBQUEsRUFBRSxDQUFDLFVBQVUsQ0FBQyw4QkFBOEIsQ0FBQzs2Q0FJakMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFDaEMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0I7V0FKL0QsNkJBQTZCLENBU2xDO1FBR0QsSUFBTSw2QkFBNkIsR0FBbkMsbUNBQW9DLFNBQVEsd0JBQXdCO1lBRWhFLFlBQ0ksR0FBaUQsRUFDakQsZUFBNkQ7Z0JBRTdELEtBQUssQ0FBQyxHQUFHLEVBQUUsZUFBZSxDQUFDLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBQSxTQUFTLENBQUMsZ0JBQWdCLENBQUM7WUFDakQsQ0FBQztTQUNKLENBQUE7UUFUSyw2QkFBNkI7WUFEbEMsZUFBQSxFQUFFLENBQUMsVUFBVSxDQUFDLDhCQUE4QixDQUFDOzZDQUlqQyxjQUFjLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUNoQyxjQUFjLENBQUMsUUFBUSxDQUFDLG9CQUFvQjtXQUovRCw2QkFBNkIsQ0FTbEM7SUFDTCxDQUFDLEVBdk93QixNQUFNLEdBQU4scUJBQU0sS0FBTixxQkFBTSxRQXVPOUI7QUFBRCxDQUFDLEVBdk9TLGNBQWMsS0FBZCxjQUFjLFFBdU92QjtBQzlPRCxxQ0FBcUM7QUFFckMsSUFBVSxjQUFjLENBd0J2QjtBQXhCRCxXQUFVLGNBQWM7SUFBQyxJQUFBLE1BQU0sQ0F3QjlCO0lBeEJ3QixXQUFBLE1BQU07UUFFM0I7U0FHQztRQUhxQixrQ0FBMkIsOEJBR2hELENBQUE7UUFFRCxJQUFNLDBCQUEwQixHQUFoQztZQUVJLFlBQStCLFNBQW1CO2dCQUFuQixjQUFTLEdBQVQsU0FBUyxDQUFVO1lBQ2hELENBQUM7WUFDSCxzQ0FBc0M7WUFDL0IsT0FBTyxDQUFDLFNBQWlCO2dCQUU1QixJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDOUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDdEQsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDdkQsR0FBRyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDckMsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQztnQkFDeEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNwQyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2xCLENBQUM7U0FDSixDQUFBO1FBaEJLLDBCQUEwQjtZQUQvQixlQUFBLEVBQUUsQ0FBQyxVQUFVLENBQUMsMkJBQTJCLENBQUM7NkNBR0csUUFBUTtXQUZoRCwwQkFBMEIsQ0FnQi9CO0lBQ0wsQ0FBQyxFQXhCd0IsTUFBTSxHQUFOLHFCQUFNLEtBQU4scUJBQU0sUUF3QjlCO0FBQUQsQ0FBQyxFQXhCUyxjQUFjLEtBQWQsY0FBYyxRQXdCdkI7QUMxQkQscUNBQXFDO0FBQ3JDLGlEQUFpRDtBQUNqRCw2Q0FBNkM7QUFDN0MsMkNBQTJDO0FBQzNDLDZDQUE2QztBQUM3Qyw0Q0FBNEM7QUFDNUMsK0NBQStDO0FBQy9DLDJDQUEyQztBQUMzQyw4REFBOEQ7QUFDOUQsOERBQThEO0FBQzlELGdFQUFnRTtBQUVoRSxJQUFVLGNBQWMsQ0F3Z0R2QjtBQXhnREQsV0FBVSxjQUFjO0lBQUMsSUFBQSxhQUFhLENBd2dEckM7SUF4Z0R3QixXQUFBLGFBQWE7UUFFbEMsSUFBSSxHQUFHLEdBQUcsZUFBQSxNQUFNLENBQUMsU0FBUyxDQUFDO1FBQzNCLElBQUksRUFBRSxHQUFHLGVBQUEsTUFBTSxDQUFDLFNBQVMsQ0FBQztRQUMxQixJQUFJLE1BQU0sR0FBRyxlQUFBLElBQUksQ0FBQyxhQUFhLENBQUM7UUFHaEMsSUFBSSxrQkFBa0IsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLHlCQUF5QixDQUFDO1FBQ3pFLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQztRQUU5QjtTQUlDO1FBSnFCLGdDQUFrQixxQkFJdkMsQ0FBQTtRQUVELDhCQUE4QjtRQUU5QixJQUFNLGlCQUFpQix5QkFBdkI7WUFxQkk7Ozs7ZUFJRztZQUNILFlBQVksR0FBMEMsRUFDL0IsYUFBdUIsRUFDdkIsSUFBa0QsRUFDbEQsZ0JBQThELEVBQzlELGlCQUFpRSxFQUNqRSxvQkFBdUUsRUFDdkUseUJBQTBFLEVBQzFFLGtCQUFzRSxFQUN0RSw2QkFBa0YsRUFDbEYsOEJBQW9GLEVBQ3BGLDhCQUFvRixFQUNwRixtQkFBOEQsRUFDOUQseUJBQTBFLEVBQzFFLHFCQUFrRSxFQUNsRSxlQUFrRTtnQkFibEUsa0JBQWEsR0FBYixhQUFhLENBQVU7Z0JBQ3ZCLFNBQUksR0FBSixJQUFJLENBQThDO2dCQUNsRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQThDO2dCQUM5RCxzQkFBaUIsR0FBakIsaUJBQWlCLENBQWdEO2dCQUNqRSx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQW1EO2dCQUN2RSw4QkFBeUIsR0FBekIseUJBQXlCLENBQWlEO2dCQUMxRSx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9EO2dCQUN0RSxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQXFEO2dCQUNsRixtQ0FBOEIsR0FBOUIsOEJBQThCLENBQXNEO2dCQUNwRixtQ0FBOEIsR0FBOUIsOEJBQThCLENBQXNEO2dCQUNwRix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQTJDO2dCQUM5RCw4QkFBeUIsR0FBekIseUJBQXlCLENBQWlEO2dCQUMxRSwwQkFBcUIsR0FBckIscUJBQXFCLENBQTZDO2dCQUNsRSxvQkFBZSxHQUFmLGVBQWUsQ0FBbUQ7Z0JBbkMvRSx3QkFBbUIsR0FBWSxLQUFLLENBQUM7Z0JBRTVCLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQztnQkFDN0MsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBb0MsQ0FBQztnQkFDN0QsVUFBSyxHQUFHLElBQUksT0FBTyxFQUFvQyxDQUFDO2dCQU1qRSw4QkFBeUIsR0FBRyxJQUFJLGtCQUFrQixFQUFZLENBQUM7Z0JBMkJyRSxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQVUsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM1RCxHQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ2pHLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3JGLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGVBQUEsTUFBTSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM5RyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzFFLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDeEUsaUJBQWlCLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzVFLENBQUM7WUFyQ0QsSUFBYyxLQUFLLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUEsQ0FBQyxDQUFDO1lBRzVELElBQVcsd0JBQXdCO2dCQUUvQixNQUFNLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQztZQUNoRCxDQUFDO1lBaUNTLGlCQUFpQixDQUFDLFFBQWdELEVBQUUsS0FBNEI7Z0JBRXRHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3JCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQy9DLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FDbkMsQ0FBQztvQkFDRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO29CQUM1QyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDL0IsQ0FBQztnQkFDRCxRQUFRLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3BELENBQUM7WUFFUyxxQkFBcUIsQ0FBQyxLQUE0QjtnQkFFeEQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQzdCLENBQUM7b0JBQ0csSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQy9CLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FDeEMsQ0FBQztvQkFDRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUNqRCxDQUFDO2dCQUNELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FDbkMsQ0FBQztvQkFDRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUNoRCxDQUFDO1lBQ0wsQ0FBQztZQUVTLHVCQUF1QjtnQkFFN0IsR0FBRyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQzlGLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUM7Z0JBQ2hDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEtBQUssU0FBUyxDQUFDLENBQ2pELENBQUM7b0JBQ0csSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQy9CLENBQUM7WUFDTCxDQUFDO1lBRVMsbUJBQW1CO2dCQUV6QixJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDekQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDN0MsQ0FBQztZQUVTLGVBQWUsQ0FBQyxHQUFhO2dCQUVuQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUNsRSxDQUFDO29CQUNHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxXQUFXLENBQUMsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDdkUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUMxRCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxHQUFHLEVBQXFCLENBQUMsQ0FBQztvQkFDbEQsR0FBRyxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQztvQkFDeEUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUM5RCxDQUFDO3dCQUNHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDckUsQ0FBQztvQkFDRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO29CQUM3QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzlCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDN0IsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO29CQUMxQixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDOUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNyRCxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDO3lCQUNsRSxNQUFNLENBQUMsQ0FBQyxHQUFnQixLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDMUQsbUJBQWlCLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzdFLENBQUM7WUFDTCxDQUFDO1lBRVMsa0JBQWtCLENBQUMsR0FBZ0I7Z0JBRXpDLElBQUksb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNsRixFQUFFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQ3BDLENBQUM7b0JBQ0csRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxjQUFBLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUMvRixDQUFDO3dCQUNHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO3dCQUN0RSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztvQkFDMUUsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLG9CQUFvQixFQUFFLGNBQUEsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQy9GLENBQUM7d0JBQ0csR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7d0JBQ2pFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO29CQUNwRSxDQUFDO29CQUNELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsb0JBQW9CLEVBQUUsY0FBQSxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FDaEcsQ0FBQzt3QkFDRyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQzt3QkFDckUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7b0JBQ3ZFLENBQUM7b0JBQ0QsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxjQUFBLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUNqRyxDQUFDO3dCQUNHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO3dCQUNqRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztvQkFDdEUsQ0FBQztnQkFDTCxDQUFDO1lBQ0wsQ0FBQztZQUVTLFlBQVksQ0FBQyxJQUFXO2dCQUU5QixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxJQUFLLElBQUksQ0FBQyxhQUE2QixDQUFDLFNBQVM7b0JBQy9FLElBQUksQ0FBQyxvQkFBb0IsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsYUFBNEIsQ0FBQyxDQUFDLENBQzVGLENBQUM7b0JBQ0csSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxhQUE0QixFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDM0UsQ0FBQztZQUNMLENBQUM7WUFFUyxNQUFNLENBQUMsR0FBYTtnQkFFMUIsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDekMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUM1QixDQUFDO29CQUNHLElBQUksUUFBUSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXNDLENBQUM7b0JBQ3hFLFFBQVEsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO29CQUMxQixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FDakMsQ0FBQzt3QkFDRyxRQUFRLEdBQUcsUUFBUSxDQUFDLGFBQWEsSUFBSSxRQUFRLENBQUM7b0JBQ2xELENBQUM7b0JBQ0QsUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUN2RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMzQyxDQUFDO1lBQ0wsQ0FBQztZQUVTLGlCQUFpQixDQUFDLFFBQXFCLEVBQUUsSUFBYSxFQUFFLG1CQUFtQixHQUFHLEtBQUs7Z0JBRXpGLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUNiLENBQUM7b0JBQ0csSUFBSSxPQUFPLEdBQXlCLFFBQVEsQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO29CQUN2SSxFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FDbEMsQ0FBQzt3QkFDRyxJQUFJLGFBQWEsR0FBRyxJQUFJLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7d0JBQy9DLElBQUksWUFBWSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLFNBQVMsSUFBSSxDQUFDLGFBQWEsSUFBSSxFQUFFLENBQUMsU0FBUyxLQUFLLElBQUksQ0FBQyxvQkFBb0IsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3RLLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxJQUFJLG1CQUFtQixDQUFDLENBQzFDLENBQUM7NEJBQ0csT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHO2dDQUVmLEdBQUcsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO2dDQUMzQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUNsRCxDQUFDO29DQUNHLEdBQUcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO2dDQUN6QixDQUFDOzRCQUNMLENBQUMsQ0FBQyxDQUFDO3dCQUNQLENBQUM7d0JBQ0QsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO3dCQUNwQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDO3dCQUN2RSxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLEVBQUUsSUFBSSxJQUFJLENBQUMsQ0FDckMsQ0FBQzs0QkFDRyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzs0QkFDNUQsbUJBQWlCLENBQUMsa0JBQWtCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsbUJBQWlCLENBQUMseUJBQXlCLENBQUMsQ0FBQzt3QkFDcEgsQ0FBQzt3QkFDRCxJQUFJLENBQ0osQ0FBQzs0QkFDRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUM7NEJBQ2xDLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDOzRCQUM1RCxtQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxtQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO3dCQUNsSCxDQUFDO29CQUNMLENBQUM7b0JBQ0QsSUFBSSxDQUNKLENBQUM7d0JBQ0csSUFBSSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQzt3QkFDdkUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUNwQyxtQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ25FLENBQUM7Z0JBQ0wsQ0FBQztZQUNMLENBQUM7WUFFUyxjQUFjLENBQUMsZUFBaUM7Z0JBRXRELElBQUksd0JBQXdCLEdBQUcsSUFBSSxHQUFHLEVBQWUsQ0FBQztnQkFDdEQsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHO29CQUV2QixJQUFJLGlCQUFpQixHQUFHLEtBQUssRUFBRSxLQUFnQyxDQUFDO29CQUNoRSxNQUFNLEVBQUUsR0FBRyxHQUFHLFlBQVksR0FBRyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsVUFBVSxHQUFHLGNBQUEsR0FBRyxDQUFDLEdBQUcsR0FBRyxjQUFBLEdBQUcsQ0FBQyxHQUFHLENBQUM7b0JBRXZGLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3BELEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssU0FBUzt3QkFDckUsR0FBRyxDQUFDLFNBQVMsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsQ0FDMUUsQ0FBQzt3QkFDRyxHQUFHLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFDO3dCQUNwQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7b0JBQzdCLENBQUM7b0JBRUQsS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDckQsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FDM0UsQ0FBQzt3QkFDRyxHQUFHLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQzt3QkFDM0IsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO29CQUM3QixDQUFDO29CQUVELEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3BELEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssU0FBUzt3QkFDckUsR0FBRyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsQ0FDcEUsQ0FBQzt3QkFDRyxHQUFHLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQzt3QkFDMUIsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO29CQUM3QixDQUFDO29CQUVELEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ3pELEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssU0FBUyxDQUFDLENBQy9FLENBQUM7d0JBQ0csR0FBRyxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQzt3QkFDL0IsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO29CQUM3QixDQUFDO29CQUVELEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3BELEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssU0FBUyxDQUFDLENBQzFFLENBQUM7d0JBQ0csR0FBRyxDQUFDLG1CQUFtQixHQUFHLEtBQUssQ0FBQzt3QkFDaEMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO29CQUM3QixDQUFDO29CQUVELEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQzdELEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQ25GLENBQUM7d0JBQ0csR0FBRyxDQUFDLHNCQUFzQixHQUFHLEtBQUssQ0FBQzt3QkFDbkMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO29CQUM3QixDQUFDO29CQUVELEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztvQkFDL0QsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUNyRixDQUFDO3dCQUNHLEdBQUcsQ0FBQyx3QkFBd0IsR0FBRyxLQUFLLENBQUM7d0JBQ3JDLGlCQUFpQixHQUFHLElBQUksQ0FBQztvQkFDN0IsQ0FBQztvQkFFRCxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7b0JBQ2hFLEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FDdEYsQ0FBQzt3QkFDRyxHQUFHLENBQUMseUJBQXlCLEdBQUcsS0FBSyxDQUFDO3dCQUN0QyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7b0JBQzdCLENBQUM7b0JBRUQsS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztvQkFDOUQsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FDcEYsQ0FBQzt3QkFDRyxHQUFHLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFDO3dCQUNwQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7b0JBQzdCLENBQUM7b0JBRUQsS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztvQkFDOUQsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FDcEYsQ0FBQzt3QkFDRyxHQUFHLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFDO3dCQUNwQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7b0JBQzdCLENBQUM7b0JBRUQsS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztvQkFDN0QsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FDbkYsQ0FBQzt3QkFDRyxHQUFHLENBQUMsc0JBQXNCLEdBQUcsS0FBSyxDQUFDO3dCQUNuQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7b0JBQzdCLENBQUM7b0JBRUQsS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDckQsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FDM0UsQ0FBQzt3QkFDRyxHQUFHLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQzt3QkFDM0IsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO29CQUM3QixDQUFDO29CQUVELEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQ3RCLENBQUM7d0JBQ0csd0JBQXdCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUN0QyxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO2dCQUVILHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ2hGLENBQUM7WUFFUyxjQUFjLENBQUMsZUFBaUM7Z0JBRXRELGVBQWUsQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN2RSxDQUFDO1lBRVMsZUFBZSxDQUFDLGFBQStCO2dCQUVyRCxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMxRixtQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM3RCxJQUFJLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO2dCQUMxQyxVQUFVLENBQUMsT0FBTyxDQUFDLE1BQU07b0JBRXJCLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFxQjt3QkFFakYsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FDaEUsQ0FBQzs0QkFDRyxZQUFZLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUMvQixDQUFDO29CQUNMLENBQUMsQ0FBQyxDQUFDO2dCQUNQLENBQUMsQ0FBQyxDQUFDO2dCQUNILG1CQUFpQixDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3hGLENBQUM7WUFFUyxNQUFNLENBQUMsa0JBQWtCLENBQUMsT0FBc0IsRUFBRSxhQUFpQyxFQUFFLE9BQTBCLEVBQUUsTUFBTSxHQUFHLG1CQUFpQixDQUFDLGFBQWE7Z0JBRS9KLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQ3ZCLENBQUM7b0JBQ0csSUFBSSxhQUFhLEdBQUcsSUFBSSxLQUFLLEVBQWUsRUFBRSxZQUFZLEdBQUcsSUFBSSxLQUFLLEVBQWUsRUFBRSxjQUFjLEdBQUcsSUFBSSxLQUFLLEVBQWUsRUFDNUgsYUFBYSxHQUFHLElBQUksS0FBSyxFQUFlLEVBQUUsWUFBWSxHQUFHLElBQUksS0FBSyxFQUFlLEVBQUUsY0FBYyxHQUFHLElBQUksS0FBSyxFQUFlLEVBQzVILGFBQWEsR0FBRyxJQUFJLEtBQUssRUFBZSxFQUFFLFlBQVksR0FBRyxJQUFJLEtBQUssRUFBZSxFQUFFLGNBQWMsR0FBRyxJQUFJLEtBQUssRUFBZSxFQUM1SCxFQUFFLEdBQUcsY0FBQSxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQWMsRUFBRSxRQUFnQixFQUFFLFNBQWtCLEVBQUUsVUFBbUIsRUFBRSxRQUFpQixFQUFFLE1BQWUsRUFDM0gsRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFDckQsRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQztvQkFDekQsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksT0FBTyxDQUFDLENBQ3hCLENBQUM7d0JBQ0csS0FBSyxHQUFHLEdBQUcsWUFBWSxHQUFHLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUM7d0JBQ2hFLEVBQUUsR0FBRyxLQUFLLEdBQUcsY0FBQSxHQUFHLENBQUMsR0FBRyxHQUFHLGNBQUEsR0FBRyxDQUFDLEdBQUcsQ0FBQzt3QkFDL0IsR0FBRyxDQUFDLGFBQWEsR0FBRyxHQUFHLENBQUMsYUFBYSxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQzt3QkFDakcsU0FBUyxHQUFHLEdBQUcsQ0FBQyxPQUFPLElBQUksTUFBTSxJQUFJLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxZQUFZLEtBQUssSUFBSSxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsUUFBUSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUM7d0JBQzNILFFBQVEsR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQy9ELFVBQVUsR0FBRyxDQUFDLENBQUMsUUFBUSxJQUFJLFFBQVEsS0FBSyxrQkFBa0IsQ0FBQzt3QkFDM0QsUUFBUSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsZUFBZSxLQUFLLE1BQU0sSUFBSSxHQUFHLENBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUM7d0JBRWxGLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUNkLENBQUM7NEJBQ0csR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDOzRCQUNuRCxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQzs0QkFDMUQsTUFBTSxHQUFHLFNBQVM7Z0NBQ2QsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7Z0NBQ3RGLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7NEJBQzNGLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQ2YsQ0FBQztnQ0FDRyxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztnQ0FDaEIsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDO29DQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBQ3pDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUM7b0NBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQ0FDNUMsSUFBSTtvQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUNsQyxDQUFDOzRCQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FDcEIsQ0FBQztnQ0FDRyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUM7b0NBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQ0FDcEMsSUFBSTtvQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUNoQyxDQUFDOzRCQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FDbEIsQ0FBQztnQ0FDRyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUM7b0NBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQ0FDcEMsSUFBSTtvQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUNoQyxDQUFDOzRCQUNELElBQUksQ0FDSixDQUFDO2dDQUNHLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztvQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dDQUNwQyxJQUFJO29DQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7NEJBQ2hDLENBQUM7d0JBQ0wsQ0FBQzt3QkFDRCxJQUFJLENBQ0osQ0FBQzs0QkFDRyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUM7Z0NBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzs0QkFDekMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUM1QyxJQUFJO2dDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ2xDLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxJQUFJLFNBQVMsR0FDVDt3QkFDSSxDQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUM7d0JBQzdGLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQzt3QkFDNUYsQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDO3FCQUNwRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLElBQUssS0FBSyxDQUFDLENBQUMsQ0FBbUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQzlELEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQ3pCLENBQUM7d0JBQ0csU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQzt3QkFDaEMsSUFBSSxPQUFPLEdBQUcsSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7d0JBQ25DLElBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7d0JBQzFELGVBQUEsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsbUJBQWlCLENBQUMsZUFBZSxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxLQUFLLEtBQUssVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ2xILENBQUM7b0JBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUN2QixDQUFDO3dCQUNHLG1CQUFpQixDQUFDLG1CQUFtQixDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDbEUsQ0FBQztnQkFDTCxDQUFDO2dCQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FDdkIsQ0FBQztvQkFDRyxtQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ2xFLENBQUM7WUFDTCxDQUFDO1lBRVMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFtQixFQUFFLGFBQTBCLEVBQUUsT0FBMEIsRUFBRSxJQUFVLEVBQUUsS0FBYTtnQkFFbkksYUFBYSxJQUFJLG1CQUFpQixDQUFDLG1CQUFtQixDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDL0UsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FDcEIsQ0FBQztvQkFDRyxJQUFJLFdBQVcsR0FBRyxHQUFHLEVBQUUsV0FBVyxHQUEwRCxJQUFJLENBQUM7b0JBQ2pHLElBQUksZUFBZSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7b0JBQzVGLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUNwQixDQUFDO3dCQUNHLFdBQVcsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQztvQkFDckYsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxDQUM5QixDQUFDO3dCQUNHLElBQUksTUFBTSxHQUFHLG1CQUFpQixDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO3dCQUM3RSxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FDcEIsQ0FBQzs0QkFDRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFhLEVBQUUsR0FBRyxXQUFZLENBQUMsQ0FBQztpQ0FDdkQsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssbUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQ3RFLENBQUM7d0JBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQztvQkFDbEIsQ0FBQztvQkFDRCxJQUFJLENBQ0osQ0FBQzt3QkFDRyxJQUFJLE1BQU0sR0FBRyxlQUFBLElBQUksQ0FBQyxjQUFjLENBQzVCLGVBQUEsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUN0RSxtQkFBaUIsQ0FBQyxpQkFBaUIsRUFBRSxLQUFLLENBQUMsQ0FBQzt3QkFDaEQsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQ3BCLENBQUM7NEJBQ0csT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBYSxFQUFFLEdBQUcsV0FBWSxDQUFDLENBQUM7aUNBQ3ZELElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLG1CQUFpQixDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUN0RSxDQUFDO3dCQUNELE1BQU0sQ0FBQyxNQUFNLENBQUM7b0JBQ2xCLENBQUM7Z0JBQ0wsQ0FBQztnQkFDRCxNQUFNLENBQUMsU0FBUyxDQUFDO1lBQ3JCLENBQUM7WUFFUyxNQUFNLENBQUMsaUJBQWlCLENBQUMsS0FBb0IsRUFBRSxPQUEwQixFQUFFLElBQVUsRUFBRSxLQUFhO2dCQUUxRyxJQUFJLG1CQUFtQixHQUNuQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUMzQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUMxRSxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzVELE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQzNFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBRSxDQUFDLEdBQUcsQ0FBQyxlQUFBLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzdGLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUE0RCxtQkFBbUIsQ0FBQztxQkFDN0YsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLFFBQVEsQ0FBMkQ7b0JBRXpGLElBQUksR0FBRyxHQUFJLFFBQW9DO3lCQUMxQyxNQUFNLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDO3lCQUNqRSxHQUFHLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUM7eUJBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDaEIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQ1IsQ0FBQzt3QkFDRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FDUCxDQUFDOzRCQUNHLFVBQVUsQ0FBQyxDQUFDLENBQVcsRUFBRSxDQUFTLEtBQUssQ0FBQyxDQUFDLGNBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7d0JBQzdHLENBQUM7d0JBQ0QsSUFBSSxDQUNKLENBQUM7NEJBQ0csR0FBRyxDQUFDLGNBQWUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO3dCQUM3RCxDQUFDO29CQUNMLENBQUM7b0JBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDaEIsQ0FBQyxDQUFDLENBQUM7WUFDWCxDQUFDO1lBRVMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQW1CLEVBQUUsT0FBMEI7Z0JBRTdFLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRztvQkFFWixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FDcEIsQ0FBQzt3QkFDRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ2hDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO29CQUMxQixDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztZQUVTLFVBQVUsQ0FBQyxHQUE0QjtnQkFFN0MsSUFBSSxPQUFPLEdBQUcsRUFBRSxFQUFFLE9BQU8sR0FBRyxFQUFFLEVBQzFCLEtBQUssR0FBRyxDQUFDLENBQVMsRUFBRSxDQUFTLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLE9BQU8sSUFBSSxDQUFDLEdBQUcsT0FBTyxJQUFJLENBQUMsR0FBRyxPQUFPLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO2dCQUNuSCxHQUFHLENBQUMsYUFBYSxHQUFHLEdBQUcsQ0FBQyxhQUFhLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsR0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1RyxJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxLQUFNLENBQUMsRUFBRSxNQUFNLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTyxDQUFDLENBQUM7Z0JBQzdGLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQ3BDLENBQUM7b0JBQ0csR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxJQUFJLEtBQUssR0FBRyxNQUFNLENBQUM7b0JBQ3RDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUNoQyxDQUFDO2dCQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLEdBQUcsT0FBTyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FDdkQsQ0FBQztvQkFDRyxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNoQixDQUFDO2dCQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxNQUFNLEdBQUcsT0FBTyxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FDMUQsQ0FBQztvQkFDRyxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNoQixDQUFDO2dCQUNELElBQUksQ0FDSixDQUFDO29CQUNHLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMscUJBQXFCLEVBQUUsQ0FBQztvQkFDbkQsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztvQkFDNUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNsRCxDQUFDO1lBQ0wsQ0FBQztZQUVTLFdBQVcsQ0FBQyxHQUE0QjtnQkFFOUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxTQUFTLENBQUMsQ0FDM0IsQ0FBQztvQkFDRyxHQUFHLENBQUMsYUFBYSxHQUFHLEdBQUcsQ0FBQyxhQUFhLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsR0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUM1RyxJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxLQUFNLENBQUMsRUFBRSxNQUFNLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTyxDQUFDLENBQUM7b0JBQzdGLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQ3BDLENBQUM7d0JBQ0csR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLEdBQUcsTUFBTSxDQUFDO29CQUM5QixDQUFDO29CQUNELElBQUksQ0FDSixDQUFDO3dCQUNHLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMscUJBQXFCLEVBQUUsQ0FBQzt3QkFDbkQsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztvQkFDaEQsQ0FBQztnQkFDTCxDQUFDO1lBQ0wsQ0FBQztZQUVTLGVBQWUsQ0FBQyxHQUFnQztnQkFFdEQsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDO2dCQUNwQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQ3RCLENBQUM7b0JBQ0csVUFBVSxHQUFHLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsYUFBNEIsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO2dCQUNsSSxDQUFDO2dCQUNELEdBQUcsQ0FBQyxJQUFJLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBRSxHQUFXLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUMvSSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztZQUNwQixDQUFDO1lBRVMsZUFBZSxDQUFDLEdBQVk7Z0JBRWxDLHNCQUFzQjtnQkFDdEIsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxHQUFHLENBQUMsc0JBQXVCLEVBQUUsQ0FBQyxFQUFFO29CQUFDLENBQUM7Z0JBQ3hELE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDYixDQUFDO1lBRVMsbUJBQW1CLENBQUMsR0FBNEIsRUFBRSxTQUFzQjtnQkFFOUUsSUFBSSxNQUFNLEdBQUcsZUFBQSxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztnQkFDeEMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUN0QixDQUFDO29CQUNHLElBQUksT0FBTyxDQUFDO29CQUNaLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUM7b0JBQzVCLElBQUksS0FBSyxHQUFHLEdBQUcsWUFBWSxHQUFHLENBQUMsV0FBVyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsYUFBYSxZQUFZLEdBQUcsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDO29CQUNqSCxHQUFHLENBQUMsYUFBYSxHQUFHLEdBQUcsQ0FBQyxhQUFhLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUVsRyxFQUFFLENBQUMsQ0FBQyxjQUFBLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFjLENBQUMsUUFBUSxJQUFJLFVBQVUsSUFBSSxHQUFHLENBQUMsYUFBYyxDQUFDLFFBQVEsSUFBSSxVQUFVLElBQUksS0FBSyxDQUFDLENBQUMsQ0FDNUgsQ0FBQzt3QkFDRyxHQUFHLENBQUMsTUFBTSxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQzt3QkFDNUYsR0FBRyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7d0JBQ3BELElBQUksUUFBUSxHQUFjLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYyxDQUFDLFFBQVEsRUFDN0UsQ0FBQyxRQUFpQixFQUFFLEtBQWE7NEJBRTdCLEVBQUUsQ0FBQyxDQUFDLFFBQVEsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxJQUFJLFFBQVEsQ0FBQyxTQUFTLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUMvRyxDQUFDO2dDQUNHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sSUFBSSxLQUFLLEdBQUcsQ0FBQyxLQUFLO29DQUMvQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxhQUFhLEdBQUcsUUFBUSxDQUFDLGFBQWE7MENBQzVFLEdBQUcsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDO2dDQUN6RSxRQUFRLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztnQ0FDbEUsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsSUFBSSxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFPLENBQUMsQ0FDcEYsQ0FBQztvQ0FDRyxTQUFTLEdBQUcsU0FBUyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLENBQUM7b0NBQzlFLFFBQVEsQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksSUFBSSxRQUFRLENBQUMscUJBQXFCLEVBQUUsQ0FBQztvQ0FDbEUsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksU0FBUyxDQUFDLElBQUksSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxTQUFTLENBQUMsR0FBRzt3Q0FDMUUsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksU0FBUyxDQUFDLEtBQUssSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQ3ZGLENBQUM7d0NBQ0csTUFBTSxDQUFDLElBQUksQ0FBQztvQ0FDaEIsQ0FBQztnQ0FDTCxDQUFDOzRCQUNMLENBQUM7NEJBQ0QsTUFBTSxDQUFDLEtBQUssQ0FBQzt3QkFDakIsQ0FBQyxDQUFDLENBQUM7d0JBQ1AsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FDeEIsQ0FBQzs0QkFDRyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7NEJBQ2xCLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQ0FFZixFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTyxHQUFHLFNBQVMsQ0FBQyxDQUMzQixDQUFDO29DQUNHLFNBQVMsR0FBRyxFQUFFLENBQUMsTUFBTyxDQUFDO29DQUN2QixPQUFPLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQztnQ0FDM0IsQ0FBQzs0QkFDTCxDQUFDLENBQUMsQ0FBQzt3QkFDUCxDQUFDO29CQUNMLENBQUM7b0JBQ0QsT0FBTyxHQUFHLE9BQU8sSUFBSSxHQUFHLENBQUMsYUFBYyxDQUFDLFNBQVMsSUFBSSxHQUFHLENBQUMsYUFBYyxDQUFDLGVBQWUsQ0FBQztvQkFDeEYsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQ1osQ0FBQzt3QkFDRyxNQUFNLEdBQUcsT0FBTyxDQUFDO29CQUNyQixDQUFDO29CQUNELElBQUksQ0FDSixDQUFDO3dCQUNHLFNBQVMsR0FBRyxTQUFTLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLHFCQUFxQixFQUFFLENBQUMsQ0FBQzt3QkFDOUUsTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsYUFBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUNyRSxDQUFDO2dCQUNMLENBQUM7Z0JBQ0QsY0FBQSxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2xCLENBQUM7WUFFUyxnQkFBZ0IsQ0FBQyxHQUFnQixFQUFFLGVBQXdCLEVBQUUsZUFBd0I7Z0JBRTNGLElBQUksSUFBSSxHQUFHLENBQUMsZUFBZSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFDdEQsSUFBSSxHQUFHLENBQUMsZUFBZSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztnQkFDakQsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUNqQixDQUFDO29CQUNHLE1BQU0sQ0FBQyxHQUFHLENBQUM7Z0JBQ2YsQ0FBQztnQkFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUMzQixDQUFDO29CQUNHLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNsRSxDQUFDO2dCQUNELElBQUksQ0FDSixDQUFDO29CQUNHLE1BQU0sQ0FBQyxHQUFHLENBQUM7Z0JBQ2YsQ0FBQztZQUNMLENBQUM7WUFFUyxxQkFBcUIsQ0FBQyxHQUE0QixFQUFFLE1BQWM7Z0JBRXhFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FDdEIsQ0FBQztvQkFDRyxFQUFFLENBQUMsQ0FBRSxHQUFHLENBQUMsYUFBNkIsQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQyxDQUMxRCxDQUFDO3dCQUNHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssS0FBSyxNQUFNLENBQUMsQ0FDNUUsQ0FBQzs0QkFDRyxNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7d0JBQ3JDLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxJQUFJLENBQ0osQ0FBQzt3QkFDRyxNQUFNLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUE7b0JBQ2hFLENBQUM7Z0JBQ0wsQ0FBQztnQkFDRCxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ2hCLENBQUM7WUFFUywyQkFBMkIsQ0FBQyxHQUE0QixFQUFFLE1BQWM7Z0JBRTlFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FDdEIsQ0FBQztvQkFDRyxFQUFFLENBQUMsQ0FBRSxHQUFHLENBQUMsYUFBNkIsQ0FBQyxLQUFLLENBQUMsVUFBVSxLQUFLLE1BQU0sQ0FBQyxDQUNuRSxDQUFDO3dCQUNHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsWUFBWSxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLEtBQUssSUFBSSxNQUFNLENBQUMsQ0FDckYsQ0FBQzs0QkFDRyxNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUM7d0JBQzFDLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxJQUFJLENBQ0osQ0FBQzt3QkFDRyxNQUFNLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUE7b0JBQ3RFLENBQUM7Z0JBQ0wsQ0FBQztnQkFDRCxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ2hCLENBQUM7WUFFUyxrQkFBa0IsQ0FBQyxHQUFnQjtnQkFFekMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FDekIsQ0FBQztvQkFDRyxHQUFHLENBQUMsYUFBYSxHQUFHLEdBQUcsQ0FBQyxhQUFhLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNqRyxJQUFJLE1BQU0sR0FBRzt3QkFDVCxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxHQUFHLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxjQUFjLEdBQUcsR0FBRyxHQUFHLEVBQUU7d0JBQzFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxJQUFJLE1BQU0sR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxFQUFFO3FCQUNyRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDWixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FDeEIsQ0FBQzt3QkFDRyxHQUFHLENBQUMsY0FBYyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO29CQUMxQyxDQUFDO29CQUNELEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDNUMsQ0FBQztnQkFDRCxNQUFNLENBQUMsR0FBRyxDQUFDO1lBQ2YsQ0FBQztZQUVTLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxHQUFnQixFQUFFLE9BQTBCO2dCQUU3RSxJQUFJLGFBQWEsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUN6RixHQUFHLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDekMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLGNBQWUsQ0FBQztnQkFDdkMsR0FBRyxDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUM7Z0JBQy9CLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3pGLENBQUM7WUFFUyxxQkFBcUIsQ0FBQyxHQUFhO2dCQUV6QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM1QixHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FDOUMsQ0FBQztvQkFDRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBa0IsQ0FBQyxDQUFDO2dCQUNsRCxDQUFDO1lBQ0wsQ0FBQztZQUVTLG9CQUFvQixDQUFDLEdBQWdCO2dCQUUzQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQ2xCLENBQUM7b0JBQ0csSUFBSSxFQUFFLEdBQUcsR0FBRyxZQUFZLEdBQUcsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLFVBQVUsR0FBRyxjQUFBLEdBQUcsQ0FBQyxHQUFHLEdBQUcsY0FBQSxHQUFHLENBQUMsR0FBRyxDQUFDO29CQUVyRixHQUFHLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztvQkFDckIsR0FBRyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7b0JBQ25CLEdBQUcsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO29CQUN4QixHQUFHLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztvQkFDM0IsR0FBRyxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7b0JBQ3pCLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO29CQUNoQixHQUFHLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztvQkFFckIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLHVCQUF1QixLQUFLLFNBQVMsQ0FBQyxDQUM5QyxDQUFDO3dCQUNHLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO29CQUN4RSxDQUFDO29CQUNELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEtBQUssU0FBUyxDQUFDLENBQ3RDLENBQUM7d0JBQ0csR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQztvQkFDNUMsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxLQUFLLFNBQVMsQ0FBQyxDQUNyQyxDQUFDO3dCQUNHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUM7b0JBQzFDLENBQUM7b0JBQ0QsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsS0FBSyxTQUFTLENBQUMsQ0FDcEMsQ0FBQzt3QkFDRyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7b0JBQzlELENBQUM7b0JBQ0QsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLGtCQUFrQixLQUFLLFNBQVMsQ0FBQyxDQUN6QyxDQUFDO3dCQUNHLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQztvQkFDbEQsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEtBQUssU0FBUyxDQUFDLENBQzFDLENBQUM7d0JBQ0csR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7b0JBQ3BFLENBQUM7b0JBQ0QsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLHNCQUFzQixLQUFLLFNBQVMsQ0FBQyxDQUM3QyxDQUFDO3dCQUNHLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxHQUFHLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQztvQkFDMUQsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEtBQUssU0FBUyxDQUFDLENBQy9DLENBQUM7d0JBQ0csR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsd0JBQXdCLENBQUM7b0JBQzlELENBQUM7b0JBQ0QsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLHlCQUF5QixLQUFLLFNBQVMsQ0FBQyxDQUNoRCxDQUFDO3dCQUNHLEdBQUcsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxDQUFDLHlCQUF5QixDQUFDO29CQUNoRSxDQUFDO29CQUNELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsS0FBSyxTQUFTLENBQUMsQ0FDOUMsQ0FBQzt3QkFDRyxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxHQUFHLENBQUMsdUJBQXVCLENBQUM7b0JBQzVELENBQUM7b0JBQ0QsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLHVCQUF1QixLQUFLLFNBQVMsQ0FBQyxDQUM5QyxDQUFDO3dCQUNHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQzt3QkFDeEQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLHNCQUFzQixLQUFLLFNBQVMsQ0FBQyxDQUM3QyxDQUFDOzRCQUNHLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxHQUFHLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQzt3QkFDMUQsQ0FBQztvQkFDTCxDQUFDO29CQUNELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEtBQUssU0FBUyxDQUFDLENBQ3JDLENBQUM7d0JBQ0csR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQztvQkFDMUMsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQ25DLENBQUM7d0JBQ0csR0FBRyxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQTtvQkFDckMsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQ3JDLENBQUM7d0JBQ0csR0FBRyxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQTtvQkFDdkMsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQ3BDLENBQUM7d0JBQ0csR0FBRyxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtvQkFDdEMsQ0FBQztvQkFFRCxFQUFFLENBQUMsQ0FBQyxHQUFHLFlBQVksR0FBRyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FDbkUsQ0FBQzt3QkFDRyxJQUNBLENBQUM7NEJBQ0csSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxlQUFlLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQzt3QkFDbEYsQ0FBQzt3QkFDRCxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FDVixDQUFDOzRCQUNHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQzNDLENBQUM7b0JBQ0wsQ0FBQztnQkFDTCxDQUFDO1lBQ0wsQ0FBQztZQUVTLFlBQVksQ0FBQyxHQUFZO2dCQUUvQixNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVM7b0JBQ2hCLENBQUMsR0FBRyxZQUFZLE9BQU8sSUFBSSxHQUFJLENBQUMsYUFBYSxJQUFJLEdBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxJQUFJLEdBQUcsWUFBWSxHQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUM7d0JBQzdJLENBQUMsR0FBRyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFFLEdBQW1CLENBQUMsS0FBSyxDQUFDO1lBQ3pGLENBQUM7WUFFUyxjQUFjLENBQUMsR0FBZ0M7Z0JBRXJELEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsYUFBYSxDQUFDLFdBQVcsSUFBSSxDQUFFLEdBQW1CLENBQUMsU0FBUyxDQUFDLENBQzVFLENBQUM7b0JBQ0csSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQztvQkFDNUIsSUFBSSxPQUFPLEVBQUUsVUFBVSxDQUFDO29CQUN4QixJQUFJLE9BQWUsRUFBRSxTQUFnQyxFQUFFLElBQUksR0FBa0IsSUFBSSxDQUFDO29CQUNsRixJQUFJLEtBQUssR0FBRyxHQUFHLFlBQVksR0FBRyxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQ2pELFNBQVMsR0FBRyxHQUFHLFlBQVksR0FBRyxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsRUFDaEUsT0FBTyxHQUNILEdBQUcsWUFBWSxHQUFHLENBQUMsV0FBVyxDQUFDLGdCQUFnQixJQUFJLEdBQUcsWUFBWSxHQUFHLENBQUMsV0FBVyxDQUFDLG9CQUFvQjt3QkFDdEcsR0FBRyxZQUFZLEdBQUcsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLElBQUksR0FBRyxZQUFZLEdBQUcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUM7b0JBQ3JILElBQUksRUFBRSxHQUFHLEtBQUssR0FBRyxjQUFBLEdBQUcsQ0FBQyxHQUFHLEdBQUcsY0FBQSxHQUFHLENBQUMsR0FBRyxDQUFDO29CQUNuQyxJQUFJLG1CQUE4QyxFQUFFLGtCQUE2QyxDQUFDO29CQUVsRyxFQUFFLENBQUMsQ0FBQyxHQUFHLFlBQVksR0FBRyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUNyRCxDQUFDO3dCQUNHLFVBQVUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQzVGLENBQUM7b0JBQ0QsRUFBRSxDQUFDLENBQUMsY0FBQSxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsSUFBSSxNQUFNLENBQUM7d0JBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUVyRixJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUMxQixHQUFHLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDMUUsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFHLEdBQVcsQ0FBQyxLQUFLO3dCQUN0RSxLQUFLLElBQUssR0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUM7NEJBQzFDLE9BQU8sSUFBSSxDQUFFLEdBQVcsQ0FBQyxPQUFPLElBQUssR0FBVyxDQUFDLFVBQVUsSUFBSyxHQUFXLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMzSCxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUUzQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUNmLENBQUM7d0JBQ0csU0FBUyxHQUFHLElBQUksY0FBQSxTQUFTLEVBQUUsQ0FBQzt3QkFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDO3dCQUM3QyxHQUFHLENBQUMsYUFBYSxHQUFHLEdBQUcsQ0FBQyxhQUFhLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDO3dCQUNsRyxFQUFFLENBQUMsQ0FBQyxjQUFBLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUN2QixDQUFDOzRCQUNHLElBQUksV0FBVyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDOzRCQUNuRSxJQUFJLFVBQVUsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQzs0QkFDakUsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDOzRCQUNoQixFQUFFLENBQUMsQ0FBQyxXQUFXLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUN2QyxDQUFDO2dDQUNHLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLEdBQUcsZUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLGVBQUEsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7Z0NBQ3pFLG1CQUFtQixHQUFHLElBQUksY0FBQSxhQUFhLENBQUMsY0FBQSxVQUFVLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0NBQ3JGLFNBQVMsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDLFVBQVUsSUFBSSxJQUFJLEdBQUcsRUFBa0IsQ0FBQztnQ0FDekUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDOzRCQUNyRCxDQUFDOzRCQUNELEVBQUUsQ0FBQyxDQUFDLFVBQVUsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQ3JDLENBQUM7Z0NBQ0csTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksR0FBRyxlQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLEdBQUcsZUFBQSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztnQ0FDekUsa0JBQWtCLEdBQUcsSUFBSSxjQUFBLGFBQWEsQ0FBQyxjQUFBLFVBQVUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztnQ0FDbEYsU0FBUyxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsVUFBVSxJQUFJLElBQUksR0FBRyxFQUFrQixDQUFDO2dDQUN6RSxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7NEJBQ3BELENBQUM7d0JBQ0wsQ0FBQzt3QkFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUNmLENBQUM7NEJBQ0csRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQ1YsQ0FBQztnQ0FDRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQ3pCLENBQUM7b0NBQ0csU0FBUyxHQUFHLElBQUksQ0FBQztvQ0FDakIsU0FBUyxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQ0FDN0UsU0FBUyxDQUFDLGVBQWUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO2dDQUMzQyxDQUFDO2dDQUNELElBQUksQ0FDSixDQUFDO29DQUNHLFNBQVMsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FDM0QsR0FBRyxDQUFDLGFBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dDQUMvRyxDQUFDOzRCQUNMLENBQUM7NEJBQ0QsSUFBSSxDQUNKLENBQUM7Z0NBQ0csU0FBUyxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsV0FBVyxDQUNsRSxHQUFHLENBQUMsYUFBYyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7NEJBQzlHLENBQUM7NEJBRUQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLElBQUksU0FBUyxDQUFDLGVBQWUsQ0FBQyxLQUFLLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQzVGLENBQUM7Z0NBQ0csU0FBUyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsYUFBYyxDQUFDLE9BQU8sQ0FBQzs0QkFDbkQsQ0FBQzt3QkFDTCxDQUFDO3dCQUNELElBQUksQ0FDSixDQUFDOzRCQUNHLFNBQVMsQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7NEJBQzdFLFNBQVMsQ0FBQyxlQUFlLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQzt3QkFDM0MsQ0FBQzt3QkFFRCxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxHQUFHLFlBQVksR0FBRyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0I7NEJBQ3pFLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxVQUFVLElBQUksR0FBRyxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsYUFBYyxDQUFDLGdCQUFnQixLQUFLLE1BQU0sQ0FBQzs0QkFDbEcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUNsRixDQUFDOzRCQUNHLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDOzRCQUM5QixTQUFTLENBQUMsTUFBTTtnQ0FDWjtvQ0FDSSxLQUFLLEVBQUU7d0NBQ0gsTUFBTSxDQUFDLGNBQWMsR0FBRyxDQUFDLEdBQUcsY0FBYyxNQUFNLENBQUMsY0FBYyxHQUFHLEdBQUcsRUFBRTt3Q0FDdkUsTUFBTSxDQUFDLGVBQWUsR0FBRyxDQUFDLEdBQUcsWUFBWSxNQUFNLENBQUMsZUFBZSxHQUFHLEdBQUcsRUFBRTt3Q0FDdkUsR0FBRyxDQUFDLGFBQWMsQ0FBQyxNQUFNLElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxhQUFjLENBQUMsTUFBTSxHQUFHLEVBQUU7cUNBQ3ZFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRTtpQ0FDckIsQ0FBQzs0QkFDTixTQUFTLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxVQUFVLElBQUksSUFBSSxHQUFHLEVBQWtCLENBQUM7NEJBQ3pFLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQzt3QkFDckQsQ0FBQzt3QkFDRCxJQUFJLFVBQVUsR0FBRyxTQUFTLENBQUMsZUFBZSxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUMsZUFBZSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7d0JBRXRILEVBQUUsQ0FBQyxDQUFDLEdBQUcsWUFBWSxHQUFHLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQ3JELENBQUM7NEJBQ0csSUFBSSxXQUFXLEdBQUcsSUFBSSxLQUFLLEVBQVUsQ0FBQzs0QkFDdEMsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQzlCLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQzs0QkFFN0IsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQ2YsQ0FBQztnQ0FDRyxXQUFXLENBQUMsSUFBSSxDQUNaLGNBQWMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxjQUFjLEdBQUcsRUFDMUMsTUFBTSxDQUFDLGVBQWUsR0FBRyxDQUFDLEdBQUcsWUFBWSxNQUFNLENBQUMsZUFBZSxHQUFHLEdBQUcsRUFBRSxFQUN2RSxXQUFXLEVBQ1gsY0FBYyxNQUFNLENBQUMsY0FBYyxHQUFHLEVBQ3RDLEdBQUcsQ0FBQyxhQUFjLENBQUMsTUFBTSxJQUFJLE1BQU0sR0FBRyxHQUFHLENBQUMsYUFBYyxDQUFDLE1BQU8sR0FBRyxFQUFFLENBQ3hFLENBQUM7NEJBQ04sQ0FBQzs0QkFDRCxJQUFJLENBQ0osQ0FBQztnQ0FDRyxXQUFXLENBQUMsSUFBSSxDQUNaLE1BQU0sQ0FBQyxjQUFjLEdBQUcsQ0FBQyxHQUFHLGNBQWMsTUFBTSxDQUFDLGNBQWMsR0FBRyxHQUFHLEVBQUUsRUFDdkUsTUFBTSxDQUFDLGVBQWUsR0FBRyxDQUFDLEdBQUcsWUFBWSxNQUFNLENBQUMsZUFBZSxHQUFHLEdBQUcsRUFBRSxFQUN2RSxHQUFHLENBQUMsYUFBYyxDQUFDLE1BQU0sSUFBSSxNQUFNLEdBQUcsR0FBRyxDQUFDLGFBQWMsQ0FBQyxNQUFPLEdBQUcsRUFBRSxDQUN4RSxDQUFDOzRCQUNOLENBQUM7NEJBQ0QsU0FBUyxDQUFDLE1BQU0sR0FBRyxFQUFFLEtBQUssRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7d0JBQy9ELENBQUM7d0JBRUQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsSUFBSSxHQUFHLENBQUMsYUFBYyxDQUFDLE9BQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUN0RSxDQUFDOzRCQUNHLElBQUksUUFBUSxHQUFHLENBQUMsT0FBTyxJQUFJLFVBQVUsSUFBSSxDQUFDLG1CQUFpQixDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYyxDQUFDLE9BQVEsQ0FBQztnQ0FDNUcsQ0FDSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxhQUFjLENBQUMsYUFBYTtvQ0FDeEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsYUFBYyxDQUFDLGFBQWMsQ0FBQztvQ0FDbEQsR0FBRyxDQUFDLGFBQWMsQ0FBQyxhQUFjLENBQUMsYUFBYyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQ3pFLENBQUM7NEJBQ04sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUM1RixDQUFDO2dDQUNHLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO2dDQUM5QixTQUFTLENBQUMsTUFBTTtvQ0FDWjt3Q0FDSSxLQUFLLEVBQUU7NENBQ0gsTUFBTSxDQUFDLGNBQWMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsY0FBYyxNQUFNLENBQUMsY0FBYyxHQUFHLEdBQUcsRUFBRTs0Q0FDcEYsTUFBTSxDQUFDLGVBQWUsR0FBRyxDQUFDLEdBQUcsWUFBWSxNQUFNLENBQUMsZUFBZSxHQUFHLEdBQUcsRUFBRTs0Q0FDdkUsUUFBUSxHQUFHLGNBQWMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLGNBQWMsR0FBRyxHQUFHLEVBQUU7NENBQ3pFLFFBQVEsR0FBRyxXQUFXLEdBQUcsRUFBRTs0Q0FDM0IsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLEVBQUU7eUNBQ3JFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRTtxQ0FDckIsQ0FBQzs0QkFDVixDQUFDO3dCQUNMLENBQUM7d0JBRUQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWMsQ0FBQyxlQUFlLElBQUksR0FBRyxDQUFDLGFBQWMsQ0FBQyxlQUFlLEtBQUssTUFBTSxDQUFDLENBQ3hGLENBQUM7NEJBQ0csSUFBSSxlQUFlLEdBQUcsR0FBRyxDQUFDLGFBQWMsQ0FBQyxlQUFnQixDQUFDOzRCQUMxRCxJQUFJLG9CQUFvQixHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQzs0QkFDckUsSUFBSSxjQUFjLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7NEJBQy9DLEVBQUUsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQ3pCLENBQUM7Z0NBQ0csb0JBQW9CLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dDQUMzRixjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLEtBQUssS0FBSyxlQUFlO29DQUNqRCxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLGVBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDOzRCQUMvRSxDQUFDOzRCQUNELElBQUksZUFBZSxHQUFHLEdBQUcsQ0FBQyxhQUFjLENBQUMsY0FBZSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUUsQ0FBQzs0QkFDN0UsSUFBSSxnQkFBZ0IsR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFFLENBQUM7NEJBQ25FLElBQUksVUFBVSxHQUFHLENBQUMsRUFBRSxRQUFRLEdBQVksS0FBSyxFQUFFLGVBQWUsR0FBRyxLQUFLLEVBQUUsUUFBUSxHQUFHLEVBQUUsRUFBRSxlQUFlLEdBQUcsS0FBSyxFQUMxRyxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLE9BQU8sR0FBRyxLQUFLLENBQUM7NEJBQzNFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FDdEMsQ0FBQztnQ0FDRyxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQztnQ0FFMUMsUUFBUSxHQUFHLENBQUMsT0FBTyxJQUFJLFVBQVUsSUFBSSxDQUFDLG1CQUFpQixDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7b0NBQzVGLENBQ0ksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxhQUFhO3dDQUNoRixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDO3dDQUNoRCxHQUFHLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxhQUFjLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FDdkUsQ0FBQztnQ0FFTixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsZUFBZSxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FDNUUsQ0FBQztvQ0FDRyxlQUFlLEdBQUcsR0FBRyxDQUFDLFFBQVEsSUFBSSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sS0FBSyxJQUFJLElBQUksR0FBRyxDQUFDLGFBQWMsQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDO29DQUU1RyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUM3QyxDQUFDO3dDQUNHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7d0NBQ3RCLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUssRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsUUFBUyxFQUFFLENBQUMsQ0FBQyxFQUM5RCxHQUFHLEdBQUcsUUFBUSxDQUFDLGNBQWMsRUFDN0IsTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQzt3Q0FDNUMsVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBQSxDQUFDLFNBQUEsQ0FBQyxTQUFBLEdBQUcsRUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQSxHQUFHLEdBQUcsQ0FBQyxFQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBLEdBQUcsSUFBSSxDQUFDLEVBQUksQ0FBQyxDQUFBLEdBQUcsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0NBQ3hHLENBQUM7b0NBRUQsUUFBUSxHQUFHO3dDQUNQLFVBQVUsR0FBRyxDQUFDLEdBQUcsY0FBYyxVQUFVLEdBQUcsR0FBRyxFQUFFO3dDQUNqRCxRQUFRLENBQUMsZUFBZSxHQUFHLENBQUMsR0FBRyxZQUFZLFFBQVEsQ0FBQyxlQUFlLEdBQUcsR0FBRyxFQUFFO3dDQUMzRSxRQUFRLEdBQUcsY0FBYyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsY0FBYyxHQUFHLEdBQUcsRUFBRTt3Q0FDekUsUUFBUSxHQUFHLFdBQVcsR0FBRyxFQUFFO3FDQUM5QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQ0FFbkIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLE9BQU8sS0FBSyxVQUFVLENBQUMsQ0FDMUQsQ0FBQzt3Q0FDRyxTQUFTLENBQUMsTUFBTSxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDO29DQUMzQyxDQUFDO29DQUNELElBQUk7d0NBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztvQ0FFcEIsZUFBZSxHQUFHLGNBQUEsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLGVBQWU7d0NBQ3ZFLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLEtBQUssSUFBSSxnQkFBZ0IsSUFBSSxPQUFPLENBQUM7Z0NBQ3pFLENBQUM7NEJBQ0wsQ0FBQzs0QkFDRCxFQUFFLENBQUMsQ0FBQyxlQUFlLElBQUksZ0JBQWdCLENBQUMsQ0FDeEMsQ0FBQztnQ0FDRyxTQUFTLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUs7b0NBRTNELGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxLQUFLLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO29DQUN6RixJQUFJLElBQUksR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0NBQ3BFLEVBQUUsQ0FBQyxDQUFDLGVBQWUsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FDbkQsQ0FBQzt3Q0FDRyxNQUFNLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFVLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FBQztvQ0FDakgsQ0FBQztvQ0FDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUNsQyxDQUFDO3dDQUNHLE1BQU0sQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVUsQ0FBQyxDQUFDO29DQUMvRSxDQUFDO29DQUNELElBQUksQ0FDSixDQUFDO3dDQUNHLE1BQU0sQ0FBQyxJQUFJLGNBQUEsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsY0FBQSxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQ0FDdkUsQ0FBQztnQ0FDTCxDQUFDLENBQUMsQ0FBQzs0QkFDUCxDQUFDO3dCQUNMLENBQUM7d0JBRUQsSUFBSSxPQUFPLEdBQUcsU0FBUyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUM7d0JBQzlDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLFNBQVMsQ0FBQyxDQUN4QixDQUFDOzRCQUNHLElBQUksU0FBUyxHQUFHLEdBQUcsQ0FBQyxhQUFjLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFDaEUsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQzs0QkFDcEUsU0FBUyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxDQUFDLENBQUM7NEJBQ3BHLElBQUksb0JBQW9CLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDOzRCQUM3RyxJQUFJLG1CQUFtQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQzs0QkFDNUYsRUFBRSxDQUFDLENBQUMsbUJBQW1CLElBQUksb0JBQW9CLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQyxhQUFhLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLO2dDQUNyRyxHQUFHLENBQUMsYUFBYyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsYUFBYyxDQUFDLFVBQVUsS0FBSyxNQUFNLENBQUMsQ0FDOUUsQ0FBQztnQ0FDRyxJQUFJLGFBQWEsR0FBRyxHQUFHLENBQUMsYUFBYyxDQUFDLFVBQVcsRUFBRSxRQUFRLEdBQTZCLElBQUksRUFBRSxTQUF3QixFQUNuSCxZQUE4QixFQUFFLGNBQXNCLEVBQUUsb0JBQW9CLENBQUM7Z0NBQ2pGLElBQUksVUFBVSxHQUFHLElBQUksR0FBRyxDQUFTLGFBQWE7cUNBQ3pDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDO3FDQUM1QixLQUFLLENBQUMsc0NBQXNDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztnQ0FDMUQsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FDeEIsQ0FBQztvQ0FDRyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7d0NBRWhCLFNBQVMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQzt3Q0FDbEUsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQ2QsQ0FBQzs0Q0FDRyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDOzRDQUN4RSxvQkFBb0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsQ0FBQzs0Q0FDekUsWUFBWSxHQUFHLGVBQUEsTUFBTSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsZUFBQSxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDOzRDQUMvRSxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsU0FBUyxHQUFHLFNBQVUsQ0FBQyxLQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsb0JBQW9CLEdBQUcsbUJBQW1CLENBQUM7NENBQ2pJLFFBQVEsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxTQUFVLENBQUMsS0FBTSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDOzRDQUNySCxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQ25CLENBQUM7Z0RBQ0csYUFBYSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsZUFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQzs0Q0FDakcsQ0FBQzt3Q0FDTCxDQUFDO29DQUNMLENBQUMsQ0FBQyxDQUFDO29DQUNILEVBQUUsQ0FBQyxDQUFDLGFBQWEsS0FBSyxHQUFHLENBQUMsYUFBYyxDQUFDLFVBQVUsQ0FBQyxDQUNwRCxDQUFDO3dDQUNHLFNBQVMsQ0FBQyxVQUFVLEdBQUcsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQztvQ0FDckUsQ0FBQztnQ0FDTCxDQUFDOzRCQUNMLENBQUM7d0JBQ0wsQ0FBQzt3QkFFRCxFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksR0FBRyxDQUFDLGFBQWMsQ0FBQyxXQUFXLElBQUksTUFBTSxDQUFDLENBQ3RELENBQUM7NEJBQ0csSUFBSSxRQUFRLEdBQUcsR0FBRyxDQUFDLGFBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUMvRCxNQUF5QixDQUFDOzRCQUM5QixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQ2pDLENBQUM7Z0NBQ0csRUFBRSxDQUFDLENBQUMsUUFBUSxJQUFJLEdBQUcsQ0FBQyxhQUFjLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUNyRSxDQUFDO29DQUNHLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7b0NBQ3RELE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLGVBQUEsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUM7Z0NBQ2xILENBQUM7Z0NBQ0QsSUFBSSxDQUNKLENBQUM7b0NBQ0csTUFBTSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0NBQ2xGLENBQUM7Z0NBQ0QsU0FBUyxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUM7NEJBQ3pELENBQUM7NEJBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQ2hCLENBQUM7Z0NBQ0csTUFBTSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLGFBQWMsQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztnQ0FDdkcsU0FBUyxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUM7Z0NBQ3hELE1BQU0sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFjLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztnQ0FDekcsU0FBUyxDQUFDLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQztnQ0FDMUQsTUFBTSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLGFBQWMsQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dDQUMxRyxTQUFTLENBQUMsaUJBQWlCLEdBQUcsTUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDO2dDQUMzRCxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsYUFBYyxDQUFDLGVBQWUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dDQUN4RyxTQUFTLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQzs0QkFDN0QsQ0FBQzt3QkFDTCxDQUFDO29CQUNMLENBQUM7b0JBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUV4QyxtQkFBbUIsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUM7b0JBQ2hFLGtCQUFrQixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQztvQkFFOUQsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBRWxELE1BQU0sQ0FBQyxDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDOUYsQ0FBQztZQUNMLENBQUM7WUFFUyxxQkFBcUIsQ0FBQyxHQUFnQztnQkFFNUQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsS0FBSyxTQUFTLENBQUMsQ0FDckMsQ0FBQztvQkFDRyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO2dCQUN2RCxDQUFDO2dCQUNELGNBQUEsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDNUQsQ0FBQztZQUVTLHlCQUF5QixDQUFDLEdBQWdDLEVBQUUsS0FBYSxFQUFFLFFBQWdCLEVBQUUsSUFBWSxFQUFFLFNBQW9CO2dCQUVySSxJQUFJLFNBQVMsR0FBNkIsSUFBSSxFQUFFLFFBQVEsR0FBRyxDQUFDLENBQUM7Z0JBQzdELElBQUksVUFBVSxHQUFHLElBQUksR0FBRyxDQUFTLFFBQVE7cUJBQ3BDLE9BQU8sQ0FBQyxvSkFBb0osRUFBRSxFQUFFLENBQUM7cUJBQ2pLLEtBQUssQ0FBQyx3Q0FBd0MsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUM1RCxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUN4QixDQUFDO29CQUNHLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFFaEIsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3RFLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUN0SCxRQUFRLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQzt3QkFDM0IsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUNuQixDQUFDOzRCQUNHLFFBQVEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLGVBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ3ZGLENBQUM7d0JBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksUUFBUSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FDdkMsQ0FBQzs0QkFDRyxTQUFTLEdBQUcsU0FBUyxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQzt3QkFDeEUsQ0FBQztvQkFDTCxDQUFDLENBQUMsQ0FBQztvQkFDSCxTQUFTLElBQUksQ0FBQyxTQUFVLENBQUMsS0FBSyxHQUFHLFFBQVEsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2pFLENBQUM7Z0JBQ0QsTUFBTSxDQUFDLElBQUksY0FBQSxlQUFlLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxjQUFBLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzdFLENBQUM7WUFFUyxzQkFBc0IsQ0FBQyxHQUFnQyxFQUFFLEtBQWEsRUFBRSxHQUFXLEVBQ3pGLElBQVksRUFBRSxTQUFvQixFQUFFLFFBQWlCLEVBQUUsZUFBd0IsRUFBRSxRQUFnQjtnQkFHakcsSUFBSSxRQUFRLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDL0MsU0FBUyxDQUFDLG1CQUFtQixHQUFHLFNBQVMsQ0FBQyxtQkFBbUIsSUFBSSxFQUFFLENBQUM7Z0JBQ3BFLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxRQUFRLENBQUM7Z0JBQ2hELElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMzQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FDZCxDQUFDO29CQUNHLE1BQU0sQ0FBQyxTQUFTLENBQUM7Z0JBQ3JCLENBQUM7Z0JBQ0QsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3BELEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUNoQixDQUFDO29CQUNHLFNBQVMsQ0FBQywwQkFBMEIsR0FBRyxJQUFJLENBQUM7b0JBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUM7Z0JBQ3ZCLENBQUM7Z0JBQ0QsR0FBRyxHQUFHLGVBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUN4QyxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxDQUFDO3FCQUNqRCxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztxQkFDekIsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxNQUFNO29CQUU5QyxJQUFJLEdBQUcsR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUMzQixHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLE9BQU8sQ0FBRSxDQUFDLENBQUMsTUFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDN0QsR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDNUIsQ0FBQyxDQUFDLENBQUM7cUJBQ0YsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLE9BQU8sQ0FBa0QsQ0FBQyxPQUFPLEVBQUUsTUFBTTtvQkFFMUYsSUFBSSxHQUFHLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDdEIsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7d0JBRVgsSUFBSSxHQUFHLEdBQUksQ0FBQyxDQUFDLE1BQTJCLENBQUM7d0JBQ3pDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQTtvQkFDbEYsQ0FBQyxDQUFDO29CQUNGLEdBQUcsQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDO2dCQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVSLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUN4RCxDQUFDLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUM7b0JBRWhCLElBQUksUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxFQUFFLFNBQVMsR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztvQkFDL0QsTUFBTSxDQUFDLElBQUksY0FBQSxlQUFlLENBQ3RCLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxRQUFRLEdBQUcsR0FBRyxHQUFHLFNBQVMsR0FBRyxNQUFNLEVBQ3RFLHlCQUF5QixHQUFHLGtCQUFrQixDQUUxQyx3REFBd0QsR0FBRyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsTUFBTSxhQUFhLElBQUksSUFBSTt3QkFDcEcsaUJBQWlCLFFBQVEsYUFBYSxTQUFTLFdBQVcsR0FBRyxDQUFDLElBQUksV0FBVyxDQUM1RSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxHQUFHLEVBQ3ZELGNBQUEsbUJBQW1CLENBQUMsS0FBSyxDQUM1QixDQUFDO2dCQUNOLENBQUMsQ0FBQyxDQUFDO2dCQUNQLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDMUMsU0FBUyxDQUFDLDBCQUEwQixHQUFHLElBQUksQ0FBQztnQkFDNUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUNsQixDQUFDO1lBRVMscUJBQXFCLENBQUMsR0FBZ0MsRUFBRSxnQkFBbUM7Z0JBRWpHLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ3RGLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDaEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsa0JBQWtCLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUMxRyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ3pHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFDO2dCQUNsRixNQUFNLENBQUMsR0FBRyxDQUFDO1lBQ2YsQ0FBQztZQUVTLGNBQWMsQ0FBQyxNQUF5QjtnQkFFOUMsSUFDQSxDQUFDO29CQUNHLElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxlQUFlLElBQUksTUFBTSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUM7b0JBQ3ZFLFVBQVUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLGtCQUFrQixFQUFFLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMxSCxDQUFDO2dCQUNELEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUNWLENBQUM7b0JBQ0csNENBQTRDO2dCQUNoRCxDQUFDO1lBQ0wsQ0FBQztZQUVTLHNCQUFzQixDQUFDLEdBQWE7Z0JBRTFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksU0FBUyxJQUFJLEdBQUcsQ0FBQyxVQUFVLElBQUksZUFBZSxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUN4RyxDQUFDO29CQUNHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7b0JBQ2xELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDN0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDOUIsQ0FBQztZQUNMLENBQUM7WUFFUyxpQkFBaUIsQ0FBQyxHQUFnQjtnQkFFeEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQ3pCLENBQUM7b0JBQ0csR0FBRyxDQUFDLGVBQWUsR0FBRyxHQUFHLENBQUMsZ0JBQWdCLENBQVMsV0FBVyxDQUFDLENBQUM7b0JBQ2hFLE1BQU0sQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFDbEM7d0JBQ0ksR0FBRyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUM7d0JBQ3RDLEdBQUcsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztxQkFDbkQsQ0FBQyxDQUFDO2dCQUNYLENBQUM7WUFDTCxDQUFDO1lBRVMsWUFBWSxDQUFDLEdBQWdCO2dCQUVuQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUM1RSxDQUFDO29CQUNHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7b0JBQzlDLEdBQUcsQ0FBQyxjQUFjLEdBQUcsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztvQkFDN0UsVUFBVSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDM0QsQ0FBQztnQkFDRCxNQUFNLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUM7WUFDcEMsQ0FBQztZQUVTLGtCQUFrQixDQUFDLEdBQWE7Z0JBRXRDLElBQUksWUFBWSxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUMsK0JBQStCLENBQUMsQ0FBQztnQkFDdkUsWUFBWSxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMxQyxDQUFDO1lBRVMsa0JBQWtCLENBQUMsR0FBYTtnQkFFdEMsSUFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDdkMsS0FBSyxDQUFDLEVBQUUsR0FBRywrQkFBK0IsQ0FBQztnQkFDM0MsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7Z0JBQ3RCLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQztnQkFDbkQsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQztnQkFDOUYsSUFBSSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsOEJBQThCLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDO2dCQUNoRyxJQUFJLGdCQUFnQixHQUFHLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUM7Z0JBQ2hHLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO2dCQUN4RixJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUM7Z0JBQ3BCLElBQUksU0FBc0MsRUFDdEMsUUFBaUMsQ0FBQztnQkFDdEMsR0FBRyxDQUFDLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FDN0IsQ0FBQztvQkFDRyxHQUFHLENBQUMsQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUN2QyxDQUFDO3dCQUNHLFVBQVUsSUFBSSxNQUNWLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUNwRCxJQUNBLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FDbEMsSUFDQSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FDOUIsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUMxQixDQUFDO2dCQUNMLENBQUM7Z0JBQ0QsS0FBSyxDQUFDLFNBQVMsR0FBRyxXQUFXLFVBQVU7eUZBQ3NDLGdCQUFnQjt1REFDbEQsZUFBZTtpREFDckIsZ0JBQWdCO3dEQUNULGdCQUFnQjtzREFDbEIsZUFBZTtnREFDckIsZ0JBQWdCO3VEQUNULGdCQUFnQjtnREFDdkIsVUFBVTs7aURBRVQsZ0JBQWdCLGVBQWUsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLHNCQUFzQixDQUFDLENBQUM7Z0JBQ3RILEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hDLENBQUM7WUFFUyxrQkFBa0IsQ0FBQyxHQUFhO2dCQUV0QyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FDeEIsQ0FBQztvQkFDRyxHQUFHLENBQUMsY0FBYyxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ2hELEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxHQUFHLCtCQUErQixDQUFDO29CQUN4RCxHQUFHLENBQUMsY0FBYyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7b0JBQ25DLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDN0MsQ0FBQztZQUNMLENBQUM7WUFFUyxpQkFBaUIsQ0FBQyxHQUFhO2dCQUVyQyxJQUFJLFdBQVcsR0FBRyxHQUFHLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQ3ZELFdBQVcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDaEQsQ0FBQztZQUVTLG1CQUFtQixDQUFDLEdBQWE7Z0JBRXZDLElBQUksT0FBTyxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3pDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsZ0NBQWdDLENBQUM7Z0JBQzlDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO2dCQUN4QixPQUFPLENBQUMsU0FBUyxHQUFHLG9EQUFvRCxDQUFDO2dCQUV6RSxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQy9DLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQzFDLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQzNDLFFBQVEsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFDakYsUUFBUSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQ3pFLFFBQVEsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUMzRSxLQUFLLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDdkMsS0FBSyxDQUFDLEVBQUUsR0FBRywrQkFBK0IsQ0FBQztnQkFDM0MsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7Z0JBRXRCLEtBQUssQ0FBQyxTQUFTO29CQUNYLHlEQUF5RCxRQUFRLGNBQWMsUUFBUSxjQUFjO3dCQUNyRywrQ0FBK0M7d0JBQy9DLEdBQUc7d0JBQ0gsbUNBQW1DO3dCQUNuQyxxQkFBcUIsUUFBUSxhQUFhO3dCQUMxQyxVQUFVLFFBQVEsYUFBYTt3QkFDL0IsaUJBQWlCLFFBQVEsWUFBWTt3QkFDckMsR0FBRyxDQUFDO2dCQUVSLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUM5QixHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNoQyxDQUFDO1lBRVMsbUJBQW1CLENBQUMsR0FBYTtnQkFFdkMsSUFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO2dCQUNoRSxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUN4QixVQUFVLENBQUMsQ0FBQyxDQUFXO29CQUVuQixJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsY0FBYyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7b0JBQ2pFLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2hDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDakIsQ0FBQztZQUVNLGNBQWMsQ0FBQyxHQUFnQyxFQUFFLFNBQW9CLEVBQUUsRUFBRSxHQUFHLGNBQUEsR0FBRyxDQUFDLEdBQUcsRUFBRSxTQUFTLEdBQUcsS0FBSztnQkFFekcsSUFBSSxjQUFjLENBQUM7Z0JBQ25CLEVBQUUsQ0FBQyxDQUFDLGNBQUEsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQ3ZCLENBQUM7b0JBQ0csRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FDZixDQUFDO3dCQUNHLEdBQUcsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLGVBQWUsQ0FBQzt3QkFDMUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDO3dCQUM5QixTQUFTLENBQUMsVUFBVSxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUM1RSxDQUFDO29CQUNELEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQzFELENBQUM7d0JBQ0csU0FBUyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLEVBQUUsUUFBUSxLQUFLLEdBQUcsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7b0JBQ2pHLENBQUM7Z0JBQ0wsQ0FBQztnQkFDRCxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQyxDQUN0RCxDQUFDO29CQUNHLEdBQUcsQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7b0JBQ3RDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDdEUsQ0FBQztnQkFFRCxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FDL0IsQ0FBQztvQkFDRyxHQUFHLENBQUMsdUJBQXVCLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUM7b0JBQ3hELEdBQUcsQ0FBQyxzQkFBc0IsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQztvQkFDdEQsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLENBQ3pDLENBQUM7d0JBQ0csSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7d0JBQzNELGNBQWMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUN2QixDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzs2QkFDaEQsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsTUFBTSxDQUE0RDs0QkFFaEYsRUFBRSxDQUFDLGdCQUFnQixHQUFHLE1BQTJCLENBQUM7NEJBQ2xELFNBQVMsQ0FBQywwQkFBMEIsR0FBRyxLQUFLLENBQUM7NEJBQzdDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFvQixFQUFFLEtBQUs7Z0NBRXZDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQzs0QkFDekQsQ0FBQyxDQUFDLENBQUM7NEJBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsTUFBMkIsQ0FBQyxDQUFDO3dCQUN0RSxDQUFDLENBQUMsQ0FBQzt3QkFDUCxPQUFPOzZCQUNGLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLHVDQUF1QyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs2QkFDeEgsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDMUQsQ0FBQztvQkFDRCxJQUFJLENBQ0osQ0FBQzt3QkFDRyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxnQkFBcUMsQ0FBQyxDQUFDO29CQUNyRixDQUFDO2dCQUNMLENBQUM7Z0JBRUQsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUN2RCxDQUFDO29CQUNHLEdBQUcsQ0FBQyxrQkFBa0IsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztvQkFDOUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ2xGLENBQUM7Z0JBRUQsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUN0QixDQUFDO29CQUNHLEdBQUcsQ0FBQyxlQUFlLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7b0JBQ3hDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUNuRSxDQUFDO2dCQUVELEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFlLElBQUksU0FBUyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FDakUsQ0FBQztvQkFDRyxHQUFHLENBQUMsdUJBQXVCLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUMxRSxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDdkYsQ0FBQztnQkFFRCxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQzdDLENBQUM7b0JBQ0csR0FBRyxDQUFDLGFBQWEsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ2hFLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUM3RSxDQUFDO2dCQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLGVBQUEsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUMxSSxDQUFDO29CQUNHLEdBQUcsQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFDO2dCQUMzQixDQUFDO2dCQUVELEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FDekQsQ0FBQztvQkFDRyxHQUFHLENBQUMsbUJBQW1CLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN0RSxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDbkYsQ0FBQztnQkFDRCxJQUFJLENBQ0osQ0FBQztvQkFDRyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQzdCLENBQUM7d0JBQ0csR0FBRyxDQUFDLHNCQUFzQixHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDO3dCQUN0RCxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDekYsQ0FBQztvQkFFRCxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FDL0IsQ0FBQzt3QkFDRyxHQUFHLENBQUMsd0JBQXdCLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQzt3QkFDMUQsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDN0YsQ0FBQztvQkFFRCxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsQ0FDaEMsQ0FBQzt3QkFDRyxHQUFHLENBQUMseUJBQXlCLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQzt3QkFDNUQsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMscUJBQXFCLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDL0YsQ0FBQztvQkFFRCxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQzlCLENBQUM7d0JBQ0csR0FBRyxDQUFDLHVCQUF1QixHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDO3dCQUN4RCxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDM0YsQ0FBQztnQkFDTCxDQUFDO2dCQUVELEVBQUUsQ0FBQyxDQUFDLGNBQUEsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQ3pCLENBQUM7b0JBQ0csRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQ25CLENBQUM7d0JBQ0csY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQWdCLEtBQUssQ0FBQyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQzt3QkFDakUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO29CQUM1RixDQUFDO29CQUNELElBQUksQ0FDSixDQUFDO3dCQUNHLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO29CQUM1QixDQUFDO2dCQUNMLENBQUM7Z0JBRUQsRUFBRSxDQUFDLENBQUMsY0FBQSxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQ2pELENBQUM7b0JBQ0csR0FBRyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDNUMsQ0FBQztZQUNMLENBQUM7U0FDSixDQUFBO1FBbi9DNkIsK0JBQWEsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDekQsMkNBQXlCLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hELHlDQUF1QixHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUU5RCxvQ0FBa0IsR0FBRywrQ0FBK0MsQ0FBQztRQU43RixpQkFBaUI7WUFEdEIsZUFBQSxFQUFFLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDOzZDQTJCYixjQUFjLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFDaEIsUUFBUSxFQUNqQixjQUFjLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUNoQyxjQUFjLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUMzQyxjQUFjLENBQUMsYUFBYSxDQUFDLGlCQUFpQixFQUMzQyxjQUFjLENBQUMsYUFBYSxDQUFDLG9CQUFvQixFQUM1QyxjQUFjLENBQUMsTUFBTSxDQUFDLHlCQUF5QixFQUN0RCxjQUFjLENBQUMsTUFBTSxDQUFDLDRCQUE0QixFQUN2QyxjQUFjLENBQUMsTUFBTSxDQUFDLDZCQUE2QixFQUNsRCxjQUFjLENBQUMsTUFBTSxDQUFDLDhCQUE4QixFQUNwRCxjQUFjLENBQUMsTUFBTSxDQUFDLDhCQUE4QixFQUMvRCxjQUFjLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUNuQyxjQUFjLENBQUMsTUFBTSxDQUFDLHlCQUF5QixFQUNuRCxjQUFjLENBQUMsTUFBTSxDQUFDLHFCQUFxQixFQUNqRCxjQUFjLENBQUMsTUFBTSxDQUFDLDJCQUEyQjtXQXhDdkYsaUJBQWlCLENBcS9DdEI7O0lBQ0wsQ0FBQyxFQXhnRHdCLGFBQWEsR0FBYiw0QkFBYSxLQUFiLDRCQUFhLFFBd2dEckM7QUFBRCxDQUFDLEVBeGdEUyxjQUFjLEtBQWQsY0FBYyxRQXdnRHZCO0FDcGhERCxJQUFVLGNBQWMsQ0FZdkI7QUFaRCxXQUFVLGNBQWM7SUFBQyxJQUFBLGFBQWEsQ0FZckM7SUFad0IsV0FBQSxhQUFhO1FBRWxDLElBQVksbUJBSVg7UUFKRCxXQUFZLG1CQUFtQjtZQUUzQiwrREFBSyxDQUFBO1lBQ0wscUVBQVEsQ0FBQTtRQUNaLENBQUMsRUFKVyxtQkFBbUIsR0FBbkIsaUNBQW1CLEtBQW5CLGlDQUFtQixRQUk5QjtRQUVEO1lBRUksWUFBcUIsSUFBWSxFQUFXLElBQVksRUFBVyxJQUF5QjtnQkFBdkUsU0FBSSxHQUFKLElBQUksQ0FBUTtnQkFBVyxTQUFJLEdBQUosSUFBSSxDQUFRO2dCQUFXLFNBQUksR0FBSixJQUFJLENBQXFCO1lBQUksQ0FBQztTQUNwRztRQUhZLDZCQUFlLGtCQUczQixDQUFBO0lBQ0wsQ0FBQyxFQVp3QixhQUFhLEdBQWIsNEJBQWEsS0FBYiw0QkFBYSxRQVlyQztBQUFELENBQUMsRUFaUyxjQUFjLEtBQWQsY0FBYyxRQVl2QjtBQ1pELDZDQUE2QztBQUM3QywyQ0FBMkM7QUFHM0MsSUFBVSxjQUFjLENBb0J2QjtBQXBCRCxXQUFVLGNBQWM7SUFBQyxJQUFBLGFBQWEsQ0FvQnJDO0lBcEJ3QixXQUFBLGFBQWE7UUFFbEM7WUFBQTtnQkFnQkksK0JBQTBCLEdBQVksS0FBSyxDQUFDO1lBQ2hELENBQUM7U0FBQTtRQWpCWSx1QkFBUyxZQWlCckIsQ0FBQTtJQUNMLENBQUMsRUFwQndCLGFBQWEsR0FBYiw0QkFBYSxLQUFiLDRCQUFhLFFBb0JyQztBQUFELENBQUMsRUFwQlMsY0FBYyxLQUFkLGNBQWMsUUFvQnZCO0FDeEJELG1DQUFtQztBQUNuQyxvQ0FBb0M7QUFDcEMsK0NBQStDO0FBQy9DLDRDQUE0QztBQUM1Qyw2Q0FBNkM7QUFDN0MsMkNBQTJDO0FBQzNDLHFDQUFxQztBQ05yQyxxQ0FBcUM7QUFDckMsNkNBQTZDO0FBQzdDLGlEQUFpRDtBQUVqRCxJQUFVLGNBQWMsQ0E2R3ZCO0FBN0dELFdBQVUsY0FBYztJQUFDLElBQUEsS0FBSyxDQTZHN0I7SUE3R3dCLFdBQUEsS0FBSztRQU8xQixJQUFJLGtCQUFrQixHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUM7UUFFekU7U0FrQkM7UUFsQnFCLDJCQUFxQix3QkFrQjFDLENBQUE7UUFJRCxJQUFNLG9CQUFvQixHQUExQiwwQkFBMkIsU0FBUSxjQUFjLENBQUMsUUFBUSxDQUFDLG1CQUFtQjtZQUcxRSxZQUNJLEdBQWlELEVBQ2pELGNBQXVELEVBQ3ZELFdBQWlEO2dCQUVqRCxLQUFLLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQztnQkEwQmxDLG9DQUErQixHQUFHLElBQUksa0JBQWtCLEVBQU8sQ0FBQztZQXpCMUUsQ0FBQztZQUVTLG1CQUFtQjtnQkFFekIsSUFBSSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsRUFBRTtxQkFDakMsSUFBSSxDQUFDLENBQUMsZUFBcUM7b0JBRXhDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxlQUFlLENBQUM7b0JBQ3hDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDbEIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ25ELENBQUMsQ0FBQztxQkFDRCxLQUFLLENBQUMsRUFBRTtvQkFFTCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUN2QyxvQkFBb0I7b0JBQ3BCLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQy9DLE9BQU87Z0JBQ1gsQ0FBQyxDQUFDLENBQUM7WUFDWCxDQUFDO1lBRU0sa0JBQWtCO2dCQUVyQixNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQXVCLElBQUksQ0FBQyxDQUFDO1lBQ2hFLENBQUM7WUFHRCxJQUFXLDhCQUE4QjtnQkFFckMsTUFBTSxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxLQUFLLENBQUM7WUFDdEQsQ0FBQztZQUVNLGVBQWUsQ0FBQyxTQUFrQjtnQkFFckMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7Z0JBQzVDLElBQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQztxQkFDdkMsSUFBSSxDQUFDLFdBQVcsSUFBSSxXQUFXO3FCQUMzQixPQUFPLENBQUMsR0FBRyxJQUFJLEdBQUc7cUJBQ2QsS0FBSyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxHQUFHLEVBQUUsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzVILElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBQzlELENBQUM7WUFFTSxvQkFBb0I7Z0JBRXZCLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUMzRCxDQUFDO1lBRU0saUJBQWlCO2dCQUVwQixNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN4QyxDQUFDO1lBRU0seUJBQXlCO2dCQUU1QixNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUM5QyxDQUFDO1lBRU0sYUFBYTtnQkFFaEIsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ2xFLENBQUM7WUFFTSxjQUFjLENBQUMsV0FBaUM7Z0JBRW5ELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxXQUFXLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDbEIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6RCxDQUFDO1NBQ0osQ0FBQTtRQTdFSyxvQkFBb0I7WUFGekIsZUFBQSxFQUFFLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDO1lBQ3BDLGVBQUEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLGVBQUEsRUFBRSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQzs2Q0FLMUUsY0FBYyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFDakMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQzFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsWUFBWTtXQU5uRCxvQkFBb0IsQ0E2RXpCO0lBQ0wsQ0FBQyxFQTdHd0IsS0FBSyxHQUFMLG9CQUFLLEtBQUwsb0JBQUssUUE2RzdCO0FBQUQsQ0FBQyxFQTdHUyxjQUFjLEtBQWQsY0FBYyxRQTZHdkI7QUNqSEQsSUFBVSxjQUFjLENBMkN2QjtBQTNDRCxXQUFVLGNBQWM7SUFBQyxJQUFBLFFBQVEsQ0EyQ2hDO0lBM0N3QixXQUFBLFFBQVE7UUFBQyxJQUFBLE1BQU0sQ0EyQ3ZDO1FBM0NpQyxXQUFBLE1BQU07WUFFcEMsSUFBSSxXQUFtQixDQUFDO1lBRXhCLHFCQUE0QixHQUFhO2dCQUVyQyxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxDQUMvRixDQUFDO29CQUNHLElBQUksQ0FBQyxPQUFPLEdBQUcsV0FBVyxDQUFDO2dCQUMvQixDQUFDO1lBQ0wsQ0FBQztZQU5lLGtCQUFXLGNBTTFCLENBQUE7WUFFRCxxQkFBcUIsU0FBZ0I7Z0JBRWpDLElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQyxhQUF3QixDQUFDO2dCQUNoRCxJQUFJLE1BQU0sR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBRyxDQUFxQixDQUFDO2dCQUNuRyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FDWCxDQUFDO29CQUNHLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQ3JDLENBQUM7d0JBQ0csTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUN0QixDQUFDO29CQUNELElBQUksQ0FDSixDQUFDO3dCQUNHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDcEIsQ0FBQztvQkFDRCxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQ3pDLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztvQkFDMUMsV0FBVyxJQUFJLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDekMsV0FBVyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQWMsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN6RSxDQUFDO1lBQ0wsQ0FBQztZQUVEO2dCQUVJLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFjLEVBQzFCLGFBQWEsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO2dCQUN0SCxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDakUsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxhQUFhLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDbEYsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBQ3pFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUN6RSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQywwQkFBMEIsRUFBRSxHQUFHLGFBQWEsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3pGLENBQUM7WUFUZSxxQkFBYyxpQkFTN0IsQ0FBQTtRQUNMLENBQUMsRUEzQ2lDLE1BQU0sR0FBTixlQUFNLEtBQU4sZUFBTSxRQTJDdkM7SUFBRCxDQUFDLEVBM0N3QixRQUFRLEdBQVIsdUJBQVEsS0FBUix1QkFBUSxRQTJDaEM7QUFBRCxDQUFDLEVBM0NTLGNBQWMsS0FBZCxjQUFjLFFBMkN2QjtBQzNDRCxJQUFVLGNBQWMsQ0FrQ3ZCO0FBbENELFdBQVUsY0FBYztJQUFDLElBQUEsUUFBUSxDQWtDaEM7SUFsQ3dCLFdBQUEsUUFBUTtRQUFDLElBQUEsR0FBRyxDQWtDcEM7UUFsQ2lDLFdBQUEsR0FBRztZQUVqQyx3QkFBK0IsR0FBYTtnQkFFeEMsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUNqRixHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FDckIsQ0FBQztvQkFDRyxHQUFHLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztvQkFDdEIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUNqQyxDQUFDO3dCQUNHLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDaEIsQ0FBQztnQkFDTCxDQUFDO1lBQ0wsQ0FBQztZQVhlLGtCQUFjLGlCQVc3QixDQUFBO1lBRUQsaUJBQWlCLFNBQWdCO2dCQUU3QixJQUFJLE1BQU0sR0FBRyxTQUFTLENBQUMsYUFBd0IsQ0FBQztnQkFDaEQsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQztnQkFFL0IsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7Z0JBQzNGLEdBQUcsQ0FBQyxDQUFDLElBQUksVUFBVSxJQUFJLFdBQVcsQ0FBQyxDQUNuQyxDQUFDO29CQUNHLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztnQkFDdEMsQ0FBQztnQkFFRCxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pGLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUNyQixDQUFDO29CQUNHLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNuQyxDQUFDO2dCQUNELEdBQUcsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUcsQ0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsWUFBWSxDQUFDO2dCQUNwRixNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNuQyxDQUFDO1FBQ0wsQ0FBQyxFQWxDaUMsR0FBRyxHQUFILFlBQUcsS0FBSCxZQUFHLFFBa0NwQztJQUFELENBQUMsRUFsQ3dCLFFBQVEsR0FBUix1QkFBUSxLQUFSLHVCQUFRLFFBa0NoQztBQUFELENBQUMsRUFsQ1MsY0FBYyxLQUFkLGNBQWMsUUFrQ3ZCO0FDbENELHlDQUF5QztBQUN6QyxzQ0FBc0M7QUNEdEMscUNBQXFDO0FBQ3JDLDZDQUE2QztBQUM3QyxpREFBaUQ7QUFDakQsMkRBQTJEO0FBQzNELGlEQUFpRDtBQUNqRCw2Q0FBNkM7QUFFN0MsSUFBVSxjQUFjLENBMFZ2QjtBQTFWRCxXQUFVLGNBQWM7SUFBQyxJQUFBLEtBQUssQ0EwVjdCO0lBMVZ3QixXQUFBLEtBQUs7UUFFMUIsSUFBSSxHQUFHLEdBQUcsZUFBQSxNQUFNLENBQUMsU0FBUyxDQUFDO1FBQzNCO1NBQXVDO1FBQWpCLG1CQUFhLGdCQUFJLENBQUE7UUFHdkMsSUFBTSxZQUFZLG9CQUFsQjtZQVlJLFlBQ3VCLE1BQWdCLEVBQ2hCLGdCQUE0RCxFQUM1RCxJQUFrRCxFQUNsRCxrQkFBbUUsRUFDbkUseUJBQTBFO2dCQUoxRSxXQUFNLEdBQU4sTUFBTSxDQUFVO2dCQUNoQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQTRDO2dCQUM1RCxTQUFJLEdBQUosSUFBSSxDQUE4QztnQkFDbEQsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFpRDtnQkFDbkUsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUFpRDtnQkFFN0YsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLEVBQUUsZUFBQSxNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzNILGdCQUFnQixDQUFDLDhCQUE4QixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsOEJBQThCLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZHLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFFLGVBQUEsTUFBTSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNuSCxrQkFBa0IsQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLElBQUksRUFBRSxlQUFBLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvSSxDQUFDO1lBRVMseUJBQXlCLENBQUMsS0FBNEI7Z0JBRTVELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO1lBQ3RFLENBQUM7WUFFUyw4QkFBOEIsQ0FBQyxFQUFPO2dCQUU1QyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztZQUN2RSxDQUFDO1lBRVMsb0NBQW9DLENBQUMsR0FBYTtnQkFFeEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLHdCQUF3QixDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsb0NBQW9DLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ2pILElBQUksQ0FBQyxtQkFBbUIsR0FBRyxHQUFHLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFzQixDQUFDO2dCQUN0RixJQUFJLENBQUMsa0JBQWtCLEdBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQXNCLENBQUM7Z0JBQ2pGLElBQUksQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQXNCLENBQUM7Z0JBQ3hFLElBQUksQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQXNCLENBQUM7Z0JBQ3hFLElBQUksQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQXNCLENBQUM7Z0JBQ3JFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBcUIsQ0FBQztnQkFDNUUsSUFBSSxDQUFDLHFCQUFxQixHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQXNCLENBQUM7Z0JBQzFGLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxHQUFHLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFzQixDQUFDO2dCQUUxRixjQUFZLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUNuRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztnQkFFekMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGtCQUFrQixHQUFHLElBQUksZUFBQSxNQUFNLENBQUMseUJBQXlCLEVBQTJCLENBQUM7Z0JBQ2hILElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMvRixJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFxQixDQUFDO2dCQUMxRSxLQUFLLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxlQUFBLE1BQU0sQ0FBQyx5QkFBeUIsRUFBMkIsQ0FBQztnQkFDM0YsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsdUJBQThCLEVBQUUsSUFBSSxFQUFFLGVBQUEsTUFBTSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFFM0gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDakcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDakUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM1RSxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQy9FLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFeEUsZUFBQSxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakMsZUFBQSxRQUFRLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFFakMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsSUFBSSxXQUFXLENBQUM7Z0JBRTdFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztnQkFDakQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUM1RCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM5QixDQUFDO1lBRVMscUJBQXFCLENBQUMsUUFBZ0QsRUFBRSxLQUE0QjtnQkFFMUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQy9DLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzlCLENBQUM7WUFFUyxtQkFBbUI7Z0JBRXpCLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUMzQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbkQsQ0FBQztZQUVTLG9CQUFvQjtnQkFFMUIsSUFBSSxRQUFRLEdBQUcsSUFBSSxlQUFBLFFBQVEsQ0FBQyxXQUFXLEVBQUUsRUFBRSxLQUFnQyxDQUFDO2dCQUM1RSxRQUFRLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUM7Z0JBQ25ELEdBQUcsQ0FBQyxDQUFDLElBQUksT0FBTyxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUN0RixDQUFDO29CQUNHLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FDckIsQ0FBQzt3QkFDRyxLQUFLLFFBQVE7NEJBQ1QsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFlLENBQUM7NEJBQ2hDLEtBQUssQ0FBQzt3QkFFVixLQUFLLFVBQVU7NEJBQ1gsS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFrQixDQUFDOzRCQUNuQyxLQUFLLENBQUM7d0JBRVY7NEJBQ0ksS0FBSyxHQUFHLE9BQU8sQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDOzRCQUNoRixLQUFLLENBQUM7b0JBQ2QsQ0FBQztvQkFDRCxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQXNDLENBQUMsR0FBRyxLQUFLLENBQUM7Z0JBQ3JFLENBQUM7Z0JBQ0QsTUFBTSxDQUFDLFFBQVEsQ0FBQztZQUNwQixDQUFDO1lBRVMsb0JBQW9CLENBQUMsUUFBOEI7Z0JBRXpELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNuRCxDQUFDO1lBRVMsbUJBQW1CO2dCQUV6QixJQUFJLENBQUMsZ0JBQWdCO3FCQUNoQixhQUFhLEVBQUU7cUJBQ2YsSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEdBQUcsZUFBZSxDQUFDO3FCQUNwRSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO3FCQUNwQyxLQUFLLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxnQ0FBZ0MsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25GLENBQUM7WUFFUyxlQUFlO2dCQUVyQixJQUFJLENBQUMsb0JBQW9CLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUM7Z0JBQ3BFLElBQUksQ0FBQyxnQkFBZ0I7cUJBQ2hCLGVBQWUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDO3FCQUM5QyxLQUFLLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pGLENBQUM7WUFFUyxzQkFBc0I7Z0JBRTVCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxvRUFBb0UsQ0FBQyxDQUFDLENBQ2xGLENBQUM7b0JBQ0csSUFBSSxDQUFDLGdCQUFnQjt5QkFDaEIsaUJBQWlCLEVBQUU7eUJBQ25CLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7eUJBQ3BDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLCtDQUErQyxDQUFDLENBQUM7eUJBQ2pFLEtBQUssQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLHVDQUF1QyxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFGLENBQUM7WUFDTCxDQUFDO1lBRVMseUJBQXlCO2dCQUUvQixJQUFJLENBQUMsZ0JBQWdCO3FCQUNoQix5QkFBeUIsRUFBRTtxQkFDM0IsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsK0NBQStDLENBQUMsQ0FBQztxQkFDakUsS0FBSyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsMENBQTBDLEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3RixDQUFDO1lBRVMsb0JBQW9CO2dCQUUxQixJQUFJLENBQUMsZ0JBQWdCO3FCQUNoQixvQkFBb0IsRUFBRTtxQkFDdEIsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztxQkFDcEMsS0FBSyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsa0NBQWtDLEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyRixDQUFDO1lBRVMsZ0JBQWdCLENBQUMsUUFBOEI7Z0JBRXJELElBQUksT0FBeUMsQ0FBQztnQkFDOUMsR0FBRyxDQUFDLENBQUMsT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUN6QixDQUFDO29CQUNHLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBeUMsQ0FBQztvQkFDeEYsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQ1YsQ0FBQzt3QkFDRyxHQUFHLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ25DLElBQUksWUFBWSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDckMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUNuQixDQUFDOzRCQUNHLEtBQUssUUFBUTtnQ0FDVCxLQUFLLENBQUMsS0FBSyxHQUFHLFlBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQ0FDdkMsS0FBSyxDQUFDOzRCQUVWLEtBQUssVUFBVTtnQ0FDVixLQUFhLENBQUMsT0FBTyxHQUFHLFlBQVksQ0FBQztnQ0FDdEMsS0FBSyxDQUFDOzRCQUVWLEtBQUssT0FBTztnQ0FDUixLQUFLLENBQUMsS0FBSyxHQUFHLFlBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQ0FDdkMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsY0FBYyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0NBQzdGLEtBQUssQ0FBQzs0QkFFVixLQUFLLFlBQVk7Z0NBQ2IsS0FBSyxDQUFDLEtBQUssR0FBRyxZQUFhLENBQUMsUUFBUSxFQUFFLENBQUM7Z0NBQ3ZDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLGNBQVksQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQ0FDMUUsY0FBWSxDQUFDLFlBQVksQ0FBQyxLQUEwQixDQUFDLENBQUM7Z0NBQ3RELEtBQUssQ0FBQzs0QkFFVixTQUFTLEtBQUssQ0FBQzt3QkFDbkIsQ0FBQzt3QkFDRCxFQUFFLENBQUMsQ0FBQyxPQUFPLEtBQUssV0FBVyxDQUFDLENBQzVCLENBQUM7NEJBQ0csR0FBRyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxDQUFDO3dCQUMxRSxDQUFDO29CQUNMLENBQUM7Z0JBQ0wsQ0FBQztZQUNMLENBQUM7WUFFUyxrQkFBa0I7Z0JBRXhCLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUNySCxPQUFPO3FCQUNGLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQztxQkFDeEYsSUFBSSxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDO29CQUVyQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLENBQUM7Z0JBQ2hHLENBQUMsQ0FBQyxDQUFDO1lBQ1gsQ0FBQztZQUVTLGdCQUFnQixDQUFDLEtBQTJCLEVBQUUsTUFBNEI7Z0JBRWhGLE1BQU0seUJBQXlCLEdBQXVDLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixDQUFDLENBQUM7Z0JBQ3pJLEdBQUcsQ0FBQyxDQUFDLElBQUksT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUMxQixDQUFDO29CQUNHLElBQUksSUFBSSxHQUFHLE9BQTJDLENBQUM7b0JBQ3ZELEVBQUUsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUNsRCxDQUFDO3dCQUNHLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDakMsQ0FBQzs0QkFDRyxNQUFNLENBQUMsS0FBSyxDQUFDO3dCQUNqQixDQUFDO29CQUNMLENBQUM7Z0JBQ0wsQ0FBQztnQkFDRCxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ2hCLENBQUM7WUFFUyxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQXlCO2dCQUVuRCxNQUFNLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztnQkFDdkIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFzQixLQUFLLEdBQUcsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDbEcsQ0FBQztZQUVTLE1BQU0sQ0FBQyxZQUFZO2dCQUV6QixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQXVCLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQztZQUMvRixDQUFDO1lBRVMsMkJBQTJCLENBQUMsUUFBOEI7Z0JBRWhFLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztnQkFDckQsS0FBSyxFQUNMLENBQUM7b0JBQ0csRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUN2QixDQUFDO3dCQUNHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO29CQUM5QyxDQUFDO29CQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FDakMsQ0FBQzt3QkFDRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQztvQkFDL0MsQ0FBQztvQkFDRCxJQUFJLENBQ0osQ0FBQzt3QkFDRyxJQUFJLE1BQWdDLENBQUM7d0JBQ3JDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBSSxlQUFBLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FDckMsQ0FBQzs0QkFDRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBQSxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQ25FLENBQUM7Z0NBQ0csSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7Z0NBQ3ZDLEtBQUssQ0FBQyxLQUFLLENBQUM7NEJBQ2hCLENBQUM7d0JBQ0wsQ0FBQzt3QkFDRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQztvQkFDN0MsQ0FBQztnQkFDTCxDQUFDO2dCQUNELEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM3RixDQUFDO1lBRVMsb0JBQW9CO2dCQUUxQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxJQUFJLFNBQVMsQ0FBQyxDQUMvQyxDQUFDO29CQUNHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRTt5QkFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDcEQsQ0FBQztnQkFDRCxJQUFJLENBQ0osQ0FBQztvQkFDRyxJQUFJLGNBQWMsQ0FBQztvQkFDbkIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssSUFBSSxRQUFRLENBQUMsQ0FDOUMsQ0FBQzt3QkFDRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7b0JBQ3pELENBQUM7b0JBQ0QsSUFBSSxDQUNKLENBQUM7d0JBQ0csSUFBSSxjQUFjLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FDOUI7NEJBQ0ksU0FBUyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPOzRCQUN4QyxlQUFlLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGVBQWU7eUJBQzdELEVBQ0QsZUFBQSxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFpQyxDQUFDLENBQUMsQ0FBQzt3QkFDdEYsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDO29CQUM5QyxDQUFDO2dCQUNMLENBQUM7WUFDTCxDQUFDO1lBRVMsd0JBQXdCLENBQUMsU0FBa0M7Z0JBRWpFLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGVBQUEsYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDckQsS0FBSyxDQUFDLEdBQUcsR0FBRyxFQUFFLFFBQVEsRUFBRSxxQkFBcUIsRUFBUyxDQUFDO2dCQUN2RCxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksZUFBQSxhQUFhLENBQUMsU0FBUyxFQUFFLEVBQ3REO29CQUNJLFVBQVUsRUFDVjt3QkFDSSxLQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxJQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxJQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQzs4QkFDekYsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSzs4QkFDaEMsT0FBTztxQkFDaEI7aUJBQ0osQ0FBQyxDQUFDO2dCQUNQLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGFBQWMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzdHLENBQUM7WUFFUyx1QkFBdUIsQ0FBQyxHQUFnQixFQUFFLFNBQWtDO2dCQUVsRixJQUFJLFlBQVksR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzNFLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGVBQUEsYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDckQsS0FBSyxDQUFDLEdBQUc7b0JBQ0w7d0JBQ0ksUUFBUSxFQUFFLDJCQUEyQjt3QkFDckMsUUFBUSxFQUFFLHVCQUF1Qjt3QkFDakMsUUFBUSxFQUFFLGdCQUFnQjt3QkFDMUIsUUFBUSxFQUFFLDRCQUE0QjtxQkFDekMsQ0FBQztnQkFFTixJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsV0FBVyxDQUN4RCxlQUFBLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxLQUFNLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQ3hELElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQU0sQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLGVBQWdCLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQy9FLElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxlQUFBLGFBQWEsQ0FBQyxTQUFTLEVBQUUsRUFDdEQ7b0JBQ0ksZUFBZSxFQUFFLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxlQUFlLEVBQUU7b0JBQ3hELEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUMsS0FBSyxFQUFFO29CQUNwQyxXQUFXLEVBQUUsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLFdBQVcsRUFBRTtvQkFDaEQsVUFBVSxFQUFFLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxLQUFLLEVBQUU7aUJBQzNDLENBQUMsQ0FBQztnQkFDUCxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDckcsQ0FBQztTQUNKLENBQUE7UUFuVkssWUFBWTtZQURqQixlQUFBLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDOzZDQWNNLFFBQVEsRUFDRSxjQUFjLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUN0RCxjQUFjLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUM5QixjQUFjLENBQUMsYUFBYSxDQUFDLGtCQUFrQixFQUN4QyxjQUFjLENBQUMsTUFBTSxDQUFDLHlCQUF5QjtXQWpCL0YsWUFBWSxDQW1WakI7O0lBQ0wsQ0FBQyxFQTFWd0IsS0FBSyxHQUFMLG9CQUFLLEtBQUwsb0JBQUssUUEwVjdCO0FBQUQsQ0FBQyxFQTFWUyxjQUFjLEtBQWQsY0FBYyxRQTBWdkI7QUNqV0QsZ0RBQWdEO0FBQ2hELHdDQUF3QztBQ0R4QyxxQ0FBcUM7QUFDckMsdUVBQXVFO0FBQ3ZFLGlEQUFpRDtBQUNqRCxrQ0FBa0M7QUFFbEMsSUFBVSxjQUFjLENBSXZCO0FBSkQsV0FBVSxjQUFjO0lBQUMsSUFBQSxLQUFLLENBSTdCO0lBSndCLFdBQUEsS0FBSztRQUUxQixlQUFBLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtZQUFRLGdCQUFnQixNQUFNLENBQUMsUUFBUSxDQUFBLENBQUMsQ0FBQztTQUFFLENBQUMsQ0FBQztRQUM3RSxlQUFBLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQUEsYUFBYSxDQUFDLENBQUM7SUFDeEMsQ0FBQyxFQUp3QixLQUFLLEdBQUwsb0JBQUssS0FBTCxvQkFBSyxRQUk3QjtBQUFELENBQUMsRUFKUyxjQUFjLEtBQWQsY0FBYyxRQUl2QjtBQ1RELHVFQUF1RTtBQUN2RSx1REFBdUQ7QUFDdkQsMERBQTBEO0FBQzFELHVEQUF1RDtBQUN2RCxpREFBaUQifQ==