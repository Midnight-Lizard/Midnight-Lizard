var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var Reflect;
(function (Reflect) {
    "use strict";
    const hasOwn = Object.prototype.hasOwnProperty;
    const supportsSymbol = typeof Symbol === "function";
    const toPrimitiveSymbol = supportsSymbol && typeof Symbol.toPrimitive !== "undefined" ? Symbol.toPrimitive : "@@toPrimitive";
    const iteratorSymbol = supportsSymbol && typeof Symbol.iterator !== "undefined" ? Symbol.iterator : "@@iterator";
    var HashMap;
    (function (HashMap) {
        const supportsCreate = typeof Object.create === "function";
        const supportsProto = { __proto__: [] } instanceof Array;
        const downLevel = !supportsCreate && !supportsProto;
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
    const functionPrototype = Object.getPrototypeOf(Function);
    const usePolyfill = typeof process === "object" && process.env && process.env["REFLECT_METADATA_USE_MAP_POLYFILL"] === "true";
    const _Map = !usePolyfill && typeof Map === "function" && typeof Map.prototype.entries === "function" ? Map : CreateMapPolyfill();
    const _Set = !usePolyfill && typeof Set === "function" && typeof Set.prototype.entries === "function" ? Set : CreateSetPolyfill();
    const _WeakMap = !usePolyfill && typeof WeakMap === "function" ? WeakMap : CreateWeakMapPolyfill();
    const Metadata = new _WeakMap();
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
    function defineMetadata(metadataKey, metadataValue, target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
    }
    Reflect.defineMetadata = defineMetadata;
    function hasMetadata(metadataKey, target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryHasMetadata(metadataKey, target, propertyKey);
    }
    Reflect.hasMetadata = hasMetadata;
    function hasOwnMetadata(metadataKey, target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryHasOwnMetadata(metadataKey, target, propertyKey);
    }
    Reflect.hasOwnMetadata = hasOwnMetadata;
    function getMetadata(metadataKey, target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryGetMetadata(metadataKey, target, propertyKey);
    }
    Reflect.getMetadata = getMetadata;
    function getOwnMetadata(metadataKey, target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryGetOwnMetadata(metadataKey, target, propertyKey);
    }
    Reflect.getOwnMetadata = getOwnMetadata;
    function getMetadataKeys(target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryMetadataKeys(target, propertyKey);
    }
    Reflect.getMetadataKeys = getMetadataKeys;
    function getOwnMetadataKeys(target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryOwnMetadataKeys(target, propertyKey);
    }
    Reflect.getOwnMetadataKeys = getOwnMetadataKeys;
    function deleteMetadata(metadataKey, target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
        const metadataMap = GetOrCreateMetadataMap(target, propertyKey, false);
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
    function OrdinaryHasMetadata(MetadataKey, O, P) {
        const hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
        if (hasOwn)
            return true;
        const parent = OrdinaryGetPrototypeOf(O);
        if (!IsNull(parent))
            return OrdinaryHasMetadata(MetadataKey, parent, P);
        return false;
    }
    function OrdinaryHasOwnMetadata(MetadataKey, O, P) {
        const metadataMap = GetOrCreateMetadataMap(O, P, false);
        if (IsUndefined(metadataMap))
            return false;
        return ToBoolean(metadataMap.has(MetadataKey));
    }
    function OrdinaryGetMetadata(MetadataKey, O, P) {
        const hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
        if (hasOwn)
            return OrdinaryGetOwnMetadata(MetadataKey, O, P);
        const parent = OrdinaryGetPrototypeOf(O);
        if (!IsNull(parent))
            return OrdinaryGetMetadata(MetadataKey, parent, P);
        return undefined;
    }
    function OrdinaryGetOwnMetadata(MetadataKey, O, P) {
        const metadataMap = GetOrCreateMetadataMap(O, P, false);
        if (IsUndefined(metadataMap))
            return undefined;
        return metadataMap.get(MetadataKey);
    }
    function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P) {
        const metadataMap = GetOrCreateMetadataMap(O, P, true);
        metadataMap.set(MetadataKey, MetadataValue);
    }
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
    function OrdinaryOwnMetadataKeys(O, P) {
        const keys = [];
        const metadataMap = GetOrCreateMetadataMap(O, P, false);
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
    function Type(x) {
        if (x === null)
            return 1;
        switch (typeof x) {
            case "undefined": return 0;
            case "boolean": return 2;
            case "string": return 3;
            case "symbol": return 4;
            case "number": return 5;
            case "object": return x === null ? 1 : 6;
            default: return 6;
        }
    }
    function IsUndefined(x) {
        return x === undefined;
    }
    function IsNull(x) {
        return x === null;
    }
    function IsSymbol(x) {
        return typeof x === "symbol";
    }
    function IsObject(x) {
        return typeof x === "object" ? x !== null : typeof x === "function";
    }
    function ToPrimitive(input, PreferredType) {
        switch (Type(input)) {
            case 0: return input;
            case 1: return input;
            case 2: return input;
            case 3: return input;
            case 4: return input;
            case 5: return input;
        }
        const hint = PreferredType === 3 ? "string" : PreferredType === 5 ? "number" : "default";
        const exoticToPrim = GetMethod(input, toPrimitiveSymbol);
        if (exoticToPrim !== undefined) {
            const result = exoticToPrim.call(input, hint);
            if (IsObject(result))
                throw new TypeError();
            return result;
        }
        return OrdinaryToPrimitive(input, hint === "default" ? "number" : hint);
    }
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
    function ToBoolean(argument) {
        return !!argument;
    }
    function ToString(argument) {
        return "" + argument;
    }
    function ToPropertyKey(argument) {
        const key = ToPrimitive(argument, 3);
        if (IsSymbol(key))
            return key;
        return ToString(key);
    }
    function IsArray(argument) {
        return Array.isArray
            ? Array.isArray(argument)
            : argument instanceof Object
                ? argument instanceof Array
                : Object.prototype.toString.call(argument) === "[object Array]";
    }
    function IsCallable(argument) {
        return typeof argument === "function";
    }
    function IsConstructor(argument) {
        return typeof argument === "function";
    }
    function IsPropertyKey(argument) {
        switch (Type(argument)) {
            case 3: return true;
            case 4: return true;
            default: return false;
        }
    }
    function GetMethod(V, P) {
        const func = V[P];
        if (func === undefined || func === null)
            return undefined;
        if (!IsCallable(func))
            throw new TypeError();
        return func;
    }
    function GetIterator(obj) {
        const method = GetMethod(obj, iteratorSymbol);
        if (!IsCallable(method))
            throw new TypeError();
        const iterator = method.call(obj);
        if (!IsObject(iterator))
            throw new TypeError();
        return iterator;
    }
    function IteratorValue(iterResult) {
        return iterResult.value;
    }
    function IteratorStep(iterator) {
        const result = iterator.next();
        return result.done ? false : result;
    }
    function IteratorClose(iterator) {
        const f = iterator["return"];
        if (f)
            f.call(iterator);
    }
    function OrdinaryGetPrototypeOf(O) {
        const proto = Object.getPrototypeOf(O);
        if (typeof O !== "function" || O === functionPrototype)
            return proto;
        if (proto !== functionPrototype)
            return proto;
        const prototype = O.prototype;
        const prototypeProto = prototype && Object.getPrototypeOf(prototype);
        if (prototypeProto == null || prototypeProto === Object.prototype)
            return proto;
        const constructor = prototypeProto.constructor;
        if (typeof constructor !== "function")
            return proto;
        if (constructor === O)
            return proto;
        return constructor;
    }
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
            has(key) { return this._find(key, false) >= 0; }
            get(key) {
                const index = this._find(key, false);
                return index >= 0 ? this._values[index] : undefined;
            }
            set(key, value) {
                const index = this._find(key, true);
                this._values[index] = value;
                return this;
            }
            delete(key) {
                const index = this._find(key, false);
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
    function CreateWeakMapPolyfill() {
        const UUID_SIZE = 16;
        const keys = HashMap.create();
        const rootKey = CreateUniqueKey();
        return class WeakMap {
            constructor() {
                this._key = CreateUniqueKey();
            }
            has(target) {
                const table = GetOrCreateWeakMapTable(target, false);
                return table !== undefined ? HashMap.has(table, this._key) : false;
            }
            get(target) {
                const table = GetOrCreateWeakMapTable(target, false);
                return table !== undefined ? HashMap.get(table, this._key) : undefined;
            }
            set(target, value) {
                const table = GetOrCreateWeakMapTable(target, true);
                table[this._key] = value;
                return this;
            }
            delete(target) {
                const table = GetOrCreateWeakMapTable(target, false);
                return table !== undefined ? delete table[this._key] : false;
            }
            clear() {
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
    function MakeDictionary(obj) {
        obj.__ = undefined;
        delete obj.__;
        return obj;
    }
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
var MidnightLizard;
(function (MidnightLizard) {
    var DI;
    (function (DI) {
        class IRegistrator {
        }
        DI.IRegistrator = IRegistrator;
        var Scope;
        (function (Scope) {
            Scope[Scope["SingleInstance"] = 0] = "SingleInstance";
            Scope[Scope["InstancePerDependency"] = 1] = "InstancePerDependency";
            Scope[Scope["ExistingInstance"] = 2] = "ExistingInstance";
        })(Scope = DI.Scope || (DI.Scope = {}));
        class RegistrationCompletedError extends Error {
            constructor() {
                super("Registration process has been completed. No more new registrations can be done.");
                Object.setPrototypeOf(this, RegistrationCompletedError.prototype);
            }
        }
        DI.RegistrationCompletedError = RegistrationCompletedError;
        class ResolveFailedError extends Error {
            constructor(abstraction) {
                super(`DependencyInjector could not resolve type: ${abstraction}.`);
                Object.setPrototypeOf(this, ResolveFailedError.prototype);
            }
        }
        DI.ResolveFailedError = ResolveFailedError;
        class DependencyInjector {
            constructor() {
                this._registrations = new Map();
                this._resolvedInstances = new WeakMap();
            }
            register(abstraction, implementaion, parameterTypes = new Array(), scope = Scope.SingleInstance) {
                if (!this._registrationCompleted) {
                    this._registrations.set(abstraction, { implementaion: implementaion, parameterTypes: parameterTypes, scope: scope });
                }
                else {
                    throw new RegistrationCompletedError();
                }
            }
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
        DI.Container = new DependencyInjector();
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
var Chrome;
(function (Chrome) {
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
var Chrome;
(function (Chrome) {
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
        class ColorScheme {
            constructor() { }
        }
        Settings.ColorScheme = ColorScheme;
    })(Settings = MidnightLizard.Settings || (MidnightLizard.Settings = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Settings;
    (function (Settings) {
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
var MidnightLizard;
(function (MidnightLizard) {
    var Cookies;
    (function (Cookies) {
        class ICookiesManager {
        }
        Cookies.ICookiesManager = ICookiesManager;
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
                    hash = hash | 0;
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
        Util.BOOL = Boolean.name.toLowerCase();
        Util.NUM = Number.name.toLowerCase();
        Util.STR = String.name.toLowerCase();
        function isNum(arg) {
            return typeof arg === Util.NUM;
        }
        Util.isNum = isNum;
        function isStr(arg) {
            return typeof arg === Util.STR;
        }
        Util.isStr = isStr;
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
        function getEnumNames(enumType) {
            return Object.keys(enumType)
                .map(key => enumType[key])
                .filter(key => isNaN(Number(key)));
        }
        Util.getEnumNames = getEnumNames;
    })(Util = MidnightLizard.Util || (MidnightLizard.Util = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Util;
    (function (Util) {
        var RegExpBuilder;
        (function (RegExpBuilder) {
            let capturingGroupsCount = 0;
            function resetCapturingGroups() {
                capturingGroupsCount = 0;
            }
            RegExpBuilder.resetCapturingGroups = resetCapturingGroups;
            function Next() {
                return ++capturingGroupsCount;
            }
            RegExpBuilder.Next = Next;
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
            function $var(varName) {
                return `$\{${varName}}`;
            }
            RegExpBuilder.$var = $var;
            function applyVars(exp, vars) {
                let result = exp;
                vars.forEach((varValue, varName) => result = result.replace(RegExp(escape($var(varName)), "g"), varValue));
                return result;
            }
            RegExpBuilder.applyVars = applyVars;
            RegExpBuilder.char = escape;
            function escape(str) {
                return str.replace(/[\[\](){}?*+\^\$\\\.|\-]/g, "\\$&");
            }
            RegExpBuilder.escape = escape;
            function shrink(str) {
                return str ? str.replace(/\s(?=(\s+))/g, "").trim() : "";
            }
            RegExpBuilder.shrink = shrink;
            function or(...arrayOfExpressions) {
                return arrayOfExpressions.join("|");
            }
            RegExpBuilder.or = or;
            RegExpBuilder.join = and, RegExpBuilder.combine = and;
            function and(...arrayOfExpressions) {
                return arrayOfExpressions.join("");
            }
            RegExpBuilder.and = and;
            RegExpBuilder.oneOf = fromSet;
            function fromSet(...charSet) {
                return `[${charSet.join("")}]`;
            }
            RegExpBuilder.fromSet = fromSet;
            function outOfSet(...charSet) {
                return `[^${charSet.join("")}]`;
            }
            RegExpBuilder.outOfSet = outOfSet;
            RegExpBuilder.anytime = any;
            function any(exp) {
                return `${exp}*`;
            }
            RegExpBuilder.any = any;
            RegExpBuilder.sometime = some;
            function some(exp) {
                return `${exp}+`;
            }
            RegExpBuilder.some = some;
            RegExpBuilder.neverOrOnce = noneOrOne;
            function noneOrOne(exp) {
                return `${exp}?`;
            }
            RegExpBuilder.noneOrOne = noneOrOne;
            function exactly(occurs, exp) {
                return `${exp}{${occurs}}`;
            }
            RegExpBuilder.exactly = exactly;
            function strictly(minOccurs, maxOccurs, exp) {
                return `${exp}{${minOccurs},${maxOccurs}}`;
            }
            RegExpBuilder.strictly = strictly;
            function remember(...exps) {
                return `(${exps.join("")})`;
            }
            RegExpBuilder.remember = remember;
            function forget(...exps) {
                return `(?:${exps.join("")})`;
            }
            RegExpBuilder.forget = forget;
            function followedBy(...exps) {
                return `(?=${exps.join("")})`;
            }
            RegExpBuilder.followedBy = followedBy;
            function notFollowedBy(...exps) {
                return `(?!${exps.join("")})`;
            }
            RegExpBuilder.notFollowedBy = notFollowedBy;
            function succeededBy(index, ...exps) {
                return `(?=(${exps.join("")}))\\${index}`;
            }
            RegExpBuilder.succeededBy = succeededBy;
            function wholeWord(...exps) {
                return `\\b${exps.join("")}\\b`;
            }
            RegExpBuilder.wholeWord = wholeWord;
            RegExpBuilder.completely = wholeString;
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
            RegExpBuilder.SomethingInParentheses = somethingIn("(", ")");
            RegExpBuilder.SomethingInBraces = somethingIn("{", "}");
            RegExpBuilder.SomethingInBrackets = somethingIn("[", "]");
            RegExpBuilder.SomethingInChevrons = somethingIn("<", ">");
            RegExpBuilder.Literal = fromSet(RegExpBuilder.Word, RegExpBuilder.Minus);
        })(RegExpBuilder = Util.RegExpBuilder || (Util.RegExpBuilder = {}));
    })(Util = MidnightLizard.Util || (MidnightLizard.Util = {}));
})(MidnightLizard || (MidnightLizard = {}));
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
var MidnightLizard;
(function (MidnightLizard) {
    var Events;
    (function (Events) {
        var EventHandlerPriority;
        (function (EventHandlerPriority) {
            EventHandlerPriority[EventHandlerPriority["High"] = 1] = "High";
            EventHandlerPriority[EventHandlerPriority["Normal"] = 2] = "Normal";
            EventHandlerPriority[EventHandlerPriority["Low"] = 3] = "Low";
            EventHandlerPriority[EventHandlerPriority["After"] = 4] = "After";
        })(EventHandlerPriority = Events.EventHandlerPriority || (Events.EventHandlerPriority = {}));
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
var MidnightLizard;
(function (MidnightLizard) {
    var Settings;
    (function (Settings) {
        class ISettingsBus {
        }
        Settings.ISettingsBus = ISettingsBus;
    })(Settings = MidnightLizard.Settings || (MidnightLizard.Settings = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Colors;
    (function (Colors) {
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
        RgbaColor.White = new RgbaColor(255, 255, 255, 1).toString();
        RgbaColor.Black = new RgbaColor(0, 0, 0, 1).toString();
        RgbaColor.Gray = new RgbaColor(127, 127, 127, 1).toString();
        Colors.RgbaColor = RgbaColor;
    })(Colors = MidnightLizard.Colors || (MidnightLizard.Colors = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var Colors;
    (function (Colors) {
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
var MidnightLizard;
(function (MidnightLizard) {
    var Settings;
    (function (Settings) {
        let ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;
        let ResponsiveEventDispatcher = MidnightLizard.Events.ResponsiveEventDispatcher;
        class IBaseSettingsManager {
        }
        Settings.IBaseSettingsManager = IBaseSettingsManager;
        class BaseSettingsManager {
            constructor(_app, _storageManager, _settingsBus) {
                this._app = _app;
                this._storageManager = _storageManager;
                this._settingsBus = _settingsBus;
                this._onSettingsInitialized = new ArgEventDispatcher();
                this._onSettingsChanged = new ResponsiveEventDispatcher();
                this._currentSettings = Object.assign(new Settings.ColorScheme(), Settings.ColorSchemes.dimmedDust);
                this.initCurrentSettings();
            }
            get currentSettings() { return this._currentSettings; }
            get shift() { return this._shift; }
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
var Chrome;
(function (Chrome) {
    let Action = MidnightLizard.Settings.SettingsMessageAction;
    let EventDispatcher = MidnightLizard.Events.ResponsiveEventDispatcher;
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
        var PseudoStyleStandard;
        (function (PseudoStyleStandard) {
            PseudoStyleStandard[PseudoStyleStandard["BackgroundImage"] = 0] = "BackgroundImage";
            PseudoStyleStandard[PseudoStyleStandard["InvertedBackgroundImage"] = 1] = "InvertedBackgroundImage";
        })(PseudoStyleStandard = ContentScript.PseudoStyleStandard || (ContentScript.PseudoStyleStandard = {}));
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
            constructor(type, parent, id, computedStyle, parentRoomRules) {
                this.parentRoomRules = parentRoomRules;
                this.isPseudo = true;
                this.bgColor = "";
                this.selectors = "";
                this.originalFilter = null;
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
            applyStyleChanges(standardCssText) {
                const cssText = standardCssText === undefined ? this.style.cssText : standardCssText;
                let css = cssText === ""
                    ? ""
                    : `[${this.tagName}-style="${this.id}"]:not(impt)${this.className}{${cssText}}`;
                this.resolveCss(css);
            }
        }
        ContentScript.PseudoElement = PseudoElement;
    })(ContentScript = MidnightLizard.ContentScript || (MidnightLizard.ContentScript = {}));
})(MidnightLizard || (MidnightLizard = {}));
var MidnightLizard;
(function (MidnightLizard) {
    var ContentScript;
    (function (ContentScript) {
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
        class CssConstants {
            constructor() {
                this.all = "all";
                this.none = "none";
                this.important = "important";
                this.zeroSec = "0s";
                this._200ms = "200ms";
                this["px"] = "px";
                this["fixed"] = "fixed";
                this["absolute"] = "absolute";
                this["relative"] = "relative";
                this["hidden"] = "hidden";
            }
        }
        let CssStyle = class CssStyle extends CssConstants {
            constructor(doc) {
                super();
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
var MidnightLizard;
(function (MidnightLizard) {
    var ContentScript;
    (function (ContentScript) {
        const x = MidnightLizard.Util.RegExpBuilder;
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
                return x.completely(x.sometime(x.forget(x.sometime(x.forget(x.succeededBy(x.Next(), x.BeginningOfLine, x.any(x.outOfSet(x.Comma)), x.WhiteSpace, x.OR, x.Comma, x.any(x.outOfSet(x.Comma)), x.WhiteSpace, x.OR, x.BeginningOfLine), x.succeededBy(x.Next(), x.neverOrOnce(x.succeededBy(x.Next(), x.any(x.outOfSet(x.Dot, x.Comma, x.EndOfLine)))), x.Dot, x.$var(Var[Var.notThisClassNames]), x.some(x.Literal), x.Or, x.notFollowedBy(x.$var(Var[Var.tagName]), x.WordBoundary), x.some(x.Word), x.Or, x.any(x.Word), x.Hash, x.$var(Var[Var.notThisTagId]), x.some(x.Literal), x.WordBoundary, x.notFollowedBy(x.Minus), x.Or, x.neverOrOnce(x.succeededBy(x.Next(), x.any(x.outOfSet(x.Colon, x.Comma, x.EndOfLine)))), x.exactly(2, x.Colon)), x.any(x.outOfSet(x.Comma, x.WhiteSpace, x.EndOfLine)), x.followedBy(x.Comma, x.Or, x.EndOfLine))))));
            }
            compileIncludeStylesRegExp() {
                return x.forget(x.forget(x.BeginningOfLine, x.Or, x.WhiteSpace), x.neverOrOnce(x.forget(x.$var(Var[Var.tagName]))), x.neverOrOnce(x.forget(x.Hash, x.$var(Var[Var.id]))), x.anytime(x.forget(x.Dot, x.forget(x.$var(Var[Var.className])))), x.WordBoundary, x.notFollowedBy(x.Minus), x.notFollowedBy(x.some(x.Word)), x.notFollowedBy(x.exactly(2, x.Colon)), x.any(x.outOfSet(x.Comma, x.Dot, x.Hash, x.WhiteSpace, x.EndOfLine)), x.followedBy(x.Comma, x.Or, x.EndOfLine));
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
                        className = Array.prototype.map.call(tag.classList, (c) => x.escape(c)).join(x.Or);
                    }
                    let vars = new Map();
                    vars.set(Var[Var.id], tag.id);
                    vars.set(Var[Var.tagName], tag.tagName);
                    vars.set(Var[Var.className], className);
                    let includeRegExpText = x.applyVars(this._includeStylesRegExp, vars);
                    let includeRegExp = new RegExp(includeRegExpText, "gi");
                    preFilteredSelectors = this._selectors.get(tag.ownerDocument).filter(selector => selector.search(includeRegExp) !== -1);
                    map.set(key, preFilteredSelectors);
                }
                return preFilteredSelectors;
            }
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
var MidnightLizard;
(function (MidnightLizard) {
    var ContentScript;
    (function (ContentScript) {
        const ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;
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
                            if (mutation.target.isChecked) {
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
        let BackgroundColorProcessor = class BackgroundColorProcessor extends Colors.BaseColorProcessor {
            constructor(app, settingsManager) {
                super(app, settingsManager);
                this._lights = new Map();
                this._lightAreas = new Map();
                this._component = Colors.Component.Background;
            }
            onSettingsChanged(response, newSettings) {
                super.onSettingsChanged(response, newSettings);
                this._lights.clear();
                this._lightAreas.clear();
            }
            tryGetTagArea(tag) {
                if (tag.area === undefined) {
                    tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "");
                    let width = parseInt(tag.computedStyle.width), height = parseInt(tag.computedStyle.height);
                    if (!isNaN(width) && !isNaN(height)) {
                        tag.area = width * height;
                    }
                }
                return tag.area;
            }
            getTagArea(tag) {
                if (tag.area === undefined) {
                    if (this.tryGetTagArea(tag) === undefined) {
                        tag.rect = tag.rect || tag.getBoundingClientRect();
                        tag.area = tag.rect.width * tag.rect.height;
                    }
                }
                return tag.area;
            }
            changeHslaColor(hsla, increaseContrast, tag) {
                const shift = this._colorShift;
                if (hsla.saturation === 0 && shift.grayHue !== 0) {
                    hsla.hue = shift.grayHue;
                    hsla.saturation = shift.graySaturation;
                }
                else {
                    hsla.saturation = this.scaleValue(hsla.saturation, shift.saturationLimit);
                }
                let light = hsla.lightness;
                if (increaseContrast) {
                    let oldLight = this._lights.get(hsla.lightness);
                    if (oldLight !== undefined) {
                        light = oldLight;
                        let area = this.tryGetTagArea(tag);
                        if (area !== undefined) {
                            let oldArea = this._lightAreas.get(hsla.lightness);
                            if (oldArea && oldArea < area || !oldArea) {
                                this._lightAreas.set(hsla.lightness, area);
                            }
                        }
                    }
                    else {
                        const minLightDiff = shift.contrast * Math.atan(-shift.lightnessLimit * Math.PI / 2) + shift.contrast / 0.9;
                        let thisTagArea = this.getTagArea(tag);
                        if (this._lights.size > 0 && minLightDiff > 0) {
                            let prevLight = -1, nextLight = +2, prevOrigin = 0, nextOrigin = 1;
                            for (let [originalLight, otherLight] of this._lights) {
                                if (otherLight < light && otherLight > prevLight) {
                                    prevLight = otherLight;
                                    prevOrigin = originalLight;
                                }
                                if (otherLight > light && otherLight < nextLight) {
                                    nextLight = otherLight;
                                    nextOrigin = originalLight;
                                }
                            }
                            let prevArea = this._lightAreas.get(prevOrigin), nextArea = this._lightAreas.get(nextOrigin);
                            let deflect = 0;
                            if (prevArea !== undefined && nextArea !== undefined && prevArea !== nextArea) {
                                deflect = (nextLight - prevLight) *
                                    (prevArea > nextArea
                                        ? 0.5 - nextArea / prevArea
                                        : prevArea / nextArea - 0.5);
                            }
                            if (nextLight - prevLight < minLightDiff * 2)
                                light = (prevLight + nextLight) / 2 + deflect;
                            else if (light - prevLight < minLightDiff)
                                light = prevLight + minLightDiff;
                            else if (nextLight - light < minLightDiff)
                                light = nextLight - minLightDiff;
                            light = Math.max(Math.min(light, 1), 0);
                        }
                        this._lights.set(hsla.lightness, light);
                        this._lightAreas.set(hsla.lightness, thisTagArea);
                    }
                }
                hsla.lightness = this.scaleValue(light, shift.lightnessLimit);
            }
            changeColor(rgbaString, increaseContrast, tag, getParentBackground) {
                rgbaString = rgbaString || "rgb(255, 255, 255)";
                let prevColor = increaseContrast ? this._colors.get(rgbaString) : null;
                if (prevColor) {
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
                        this.changeHslaColor(hsla, increaseContrast, tag);
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
                        increaseContrast && this._colors.set(rgbaString, result);
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
        class ForegroundColorProcessor extends Colors.BaseColorProcessor {
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
            changeColor(rgbaString, backgroundLightness, tag, customContrast) {
                rgbaString = rgbaString || "rgb(4, 4, 4)";
                let key = `${rgbaString}-${backgroundLightness}`, prevColor = this._colors.get(key);
                const inheritedColor = this.getInheritedColor(tag, rgbaString);
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
            getInheritedColor(tag, rgbStr) {
                if (tag.parentElement) {
                    if (tag.parentElement.style.textShadow !== "none") {
                        if (tag.parentElement.mlTextShadow && tag.parentElement.mlTextShadow.color == rgbStr) {
                            return tag.parentElement.mlTextShadow;
                        }
                    }
                    else {
                        return this.getInheritedColor(tag.parentElement, rgbStr);
                    }
                }
                return null;
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
            getInheritedColor(tag, rgbStr) {
                if (tag.parentElement) {
                    if (tag.parentElement.style.color !== "") {
                        if (tag.parentElement.mlColor && tag.parentElement.mlColor.color === rgbStr) {
                            return tag.parentElement.mlColor;
                        }
                    }
                    else {
                        return this.getInheritedColor(tag.parentElement, rgbStr);
                    }
                }
                return null;
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
            getInheritedColor(tag, rgbStr) {
                return null;
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
            getInheritedColor(tag, rgbStr) {
                return null;
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
            getInheritedColor(tag, rgbStr) {
                return null;
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
            getInheritedColor(tag, rgbStr) {
                return null;
            }
        };
        ScrollbarActiveColorProcessor = __decorate([
            MidnightLizard.DI.injectable(IScrollbarActiveColorProcessor),
            __metadata("design:paramtypes", [MidnightLizard.Settings.IApplicationSettings, MidnightLizard.Settings.IBaseSettingsManager])
        ], ScrollbarActiveColorProcessor);
    })(Colors = MidnightLizard.Colors || (MidnightLizard.Colors = {}));
})(MidnightLizard || (MidnightLizard = {}));
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
var MidnightLizard;
(function (MidnightLizard) {
    var ContentScript;
    (function (ContentScript) {
        const dom = MidnightLizard.Events.HtmlEvent;
        const cx = MidnightLizard.Colors.RgbaColor;
        const Status = MidnightLizard.Util.PromiseStatus;
        const ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;
        const normalDelays = [0, 1, 10, 50, 100, 250, 500, 750, 1000];
        const smallReCalculationDelays = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        const bigReCalculationDelays = [0, 1, 5, 10, 20, 50, 75, 100, 150];
        const doNotInvertRegExp = /user|account|photo|importan|grey|gray|flag/gi;
        class IDocumentProcessor {
        }
        ContentScript.IDocumentProcessor = IDocumentProcessor;
        let DocumentProcessor = DocumentProcessor_1 = class DocumentProcessor {
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
                this._standardPseudoCssTexts = new Map();
                this._images = new Map();
                this._imagePromises = new Map();
                this._dorm = new WeakMap();
                this._onRootDocumentProcessing = new ArgEventDispatcher();
                this._css = css;
                this._transitionForbiddenProperties = new Set([
                    this._css.all,
                    this._css.background,
                    this._css.backgroundColor,
                    this._css.backgroundImage,
                    this._css.color,
                    this._css.border,
                    this._css.borderBottom,
                    this._css.borderBottomColor,
                    this._css.borderColor,
                    this._css.borderLeft,
                    this._css.borderLeftColor,
                    this._css.borderRight,
                    this._css.borderRightColor,
                    this._css.borderTop,
                    this._css.borderTopColor,
                    this._css.textShadow,
                    this._css.filter
                ]);
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
            createStandardPseudoCssTexts() {
                this._standardPseudoCssTexts.set(ContentScript.PseudoStyleStandard.InvertedBackgroundImage, `${this._css.filter}:saturate(${this.shift.BackgroundImage.saturationLimit}) brightness(${1 - this.shift.Background.lightnessLimit}) invert(1)`);
                this._standardPseudoCssTexts.set(ContentScript.PseudoStyleStandard.BackgroundImage, `${this._css.filter}:saturate(${this.shift.BackgroundImage.saturationLimit}) brightness(${this.shift.BackgroundImage.lightnessLimit})`);
            }
            onSettingsChanged(response, shift) {
                this._images.clear();
                this._imagePromises.clear();
                this.createStandardPseudoCssTexts();
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
                    this.createStandardPseudoCssTexts();
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
                    if (this.checkElement(rootElem) === false) {
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
                        let skipSelectors = full || (this._styleSheetProcessor.getSelectorsQuality(rootElem.ownerDocument) === 0);
                        let filteredTags = allTags.filter(el => el.isChecked && el.mlBgColor && (skipSelectors || el.selectors !== this._styleSheetProcessor.getElementMatchedSelectors(el)));
                        if (!skipSelectors && clearParentBgColors) {
                            allTags.forEach(tag => {
                                tag.mlParentBgColor = null;
                                if (tag.mlBgColor && (tag.mlBgColor.color === null)) {
                                    tag.mlBgColor = null;
                                }
                            });
                        }
                        filteredTags.splice(0, 0, rootElem);
                        if (filteredTags.length < 10 || full) {
                            this._documentObserver.stopDocumentObservation(rootElem.ownerDocument);
                            filteredTags.forEach(tag => this.restoreElementColors(tag));
                            this._documentObserver.startDocumentObservation(rootElem.ownerDocument);
                            DocumentProcessor_1.processAllElements(filteredTags, null, this, smallReCalculationDelays);
                        }
                        else if (filteredTags.length < 100) {
                            this._documentObserver.stopDocumentObservation(rootElem.ownerDocument);
                            this.applyLoadingShadow(rootElem);
                            filteredTags.forEach(tag => this.restoreElementColors(tag));
                            this._documentObserver.startDocumentObservation(rootElem.ownerDocument);
                            DocumentProcessor_1.processAllElements(filteredTags, rootElem, this, bigReCalculationDelays);
                        }
                        else {
                            this._documentObserver.stopDocumentObservation(rootElem.ownerDocument);
                            this.restoreElementColors(rootElem);
                            DocumentProcessor_1.procElementsChunk([rootElem], this, null, 0);
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
                    if (value && tag.style.getPropertyPriority(ns.css.bgrColor) !== this._css.important ||
                        tag.mlBgColor && tag.mlBgColor.color && tag.mlBgColor.color !== value) {
                        tag.originalBackgroundColor = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.zIndex);
                    if (value && tag.style.getPropertyPriority(this._css.zIndex) !== this._css.important) {
                        tag.originalZIndex = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(ns.css.fntColor);
                    if (value && tag.style.getPropertyPriority(ns.css.fntColor) !== this._css.important ||
                        tag.mlColor && tag.mlColor.color && tag.mlColor.color !== value) {
                        tag.originalColor = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.textShadow);
                    if (value && tag.style.getPropertyPriority(this._css.textShadow) !== this._css.important) {
                        tag.originalTextShadow = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(ns.css.brdColor);
                    if (value && tag.style.getPropertyPriority(ns.css.brdColor) !== this._css.important) {
                        tag.originalBorderColor = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.borderTopColor);
                    if (value && tag.style.getPropertyPriority(this._css.borderTopColor) !== this._css.important) {
                        tag.originalBorderTopColor = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.borderRightColor);
                    if (value && tag.style.getPropertyPriority(this._css.borderRightColor) !== this._css.important) {
                        tag.originalBorderRightColor = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.borderBottomColor);
                    if (value && tag.style.getPropertyPriority(this._css.borderBottomColor) !== this._css.important) {
                        tag.originalBorderBottomColor = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.borderLeftColor);
                    if (value && tag.style.getPropertyPriority(this._css.borderLeftColor) !== this._css.important) {
                        tag.originalBorderLeftColor = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.backgroundImage);
                    if (value && tag.style.getPropertyPriority(this._css.backgroundImage) !== this._css.important) {
                        tag.originalBackgroundImage = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.backgroundSize);
                    if (value && tag.style.getPropertyPriority(this._css.backgroundSize) !== this._css.important) {
                        tag.originalBackgroundSize = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.filter);
                    if (value && tag.currentFilter !== value) {
                        tag.originalFilter = value;
                        needReCalculation = true;
                    }
                    value = tag.style.getPropertyValue(this._css.transitionDuration);
                    if (value && tag.style.getPropertyPriority(this._css.transitionDuration) !== this._css.important) {
                        tag.originalTransitionDuration = value;
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
                        if ((addedElements.has(childTag) === false) && this.checkElement(childTag)) {
                            allChildTags.add(childTag);
                        }
                    });
                });
                DocumentProcessor_1.processAllElements(Array.from(allChildTags.values()), null, this);
            }
            static processAllElements(allTags, shadowElement, docProc, delays = normalDelays) {
                if (allTags.length > 0) {
                    let viewColorTags = new Array(), visColorTags = new Array(), invisColorTags = new Array(), viewImageTags = new Array(), visImageTags = new Array(), invisImageTags = new Array(), viewTransTags = new Array(), visTransTags = new Array(), invisTransTags = new Array(), ns = ContentScript.USP.htm, isSvg, bgrColor, isVisible, hasBgColor, hasImage, inView, hm = allTags[0].ownerDocument.defaultView.innerHeight, wm = allTags[0].ownerDocument.defaultView.innerWidth;
                    for (let tag of allTags) {
                        isSvg = tag instanceof tag.ownerDocument.defaultView.SVGElement;
                        ns = isSvg ? ContentScript.USP.svg : ContentScript.USP.htm;
                        tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "");
                        isVisible = tag.tagName == "BODY" || !isSvg && tag.offsetParent !== null || tag.computedStyle.position == docProc._css.fixed || isSvg;
                        bgrColor = tag.computedStyle.getPropertyValue(ns.css.bgrColor);
                        hasBgColor = !!bgrColor && bgrColor !== "rgba(0, 0, 0, 0)";
                        hasImage = tag.computedStyle.backgroundImage !== docProc._css.none || (tag.tagName === ns.img);
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
                tag.path = parentPath + tag.tagName +
                    (!(tag instanceof ContentScript.PseudoElement) ? Array.from(tag.attributes).map(x => `${x.name}=${x.value}`).join(";") : "");
                return tag.path;
            }
            getElementIndex(tag) {
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
                    if (ContentScript.isRealElement(tag) && (tag.computedStyle.position == this._css.absolute || tag.computedStyle.position == this._css.relative || isSvg)) {
                        tag.zIndex = isSvg ? this.getElementIndex(tag) : parseInt(tag.computedStyle.zIndex || "0");
                        tag.zIndex = isNaN(tag.zIndex) ? -999 : tag.zIndex;
                        let children = Array.prototype.filter.call(tag.parentElement.children, (otherTag, index) => {
                            if (otherTag != tag && (otherTag.isChecked || (otherTag.isChecked === undefined) && this.checkElement(otherTag))) {
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
            applyLoadingShadow(tag) {
                if (tag.tagName != ContentScript.USP.htm.img) {
                    tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "");
                    let filter = [
                        this.shift.Background.lightnessLimit < 1 ? "brightness(" + this.shift.Background.lightnessLimit + ")" : "",
                        tag.computedStyle.filter != this._css.none ? tag.computedStyle.filter : ""
                    ].join(" ");
                    if (!tag.originalFilter) {
                        tag.originalFilter = tag.style.filter;
                    }
                    tag.style.setProperty(this._css.filter, filter);
                }
                return tag;
            }
            static removeLoadingShadow(tag, docProc) {
                let originalState = docProc._documentObserver.stopDocumentObservation(tag.ownerDocument);
                tag.setAttribute(docProc._css.transition, docProc._css.filter);
                tag.style.filter = tag.originalFilter;
                tag.originalFilter = undefined;
                setTimeout(() => tag.removeAttribute(docProc._css.transition), 1);
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
                    tag.rect = null;
                    tag.selectors = null;
                    tag.path = null;
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
                    if (tag.originalTransitionDuration !== undefined) {
                        tag.style.transitionDuration = tag.originalTransitionDuration;
                    }
                    if (tag.hasAttribute(this._css.transition)) {
                        tag.removeAttribute(this._css.transition);
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
                    if (ContentScript.isRealElement(tag) && tag.contentEditable == true.toString())
                        this.overrideInnerHtml(tag);
                    this.calcElementPath(tag);
                    tag.selectors = this._styleSheetProcessor.getElementMatchedSelectors(tag);
                    room = [
                        tag.path, tag.selectors, tag.style.cssText,
                        !(tag instanceof ContentScript.PseudoElement) ? Array.from(tag.attributes).map(x => `${x.name}=${x.value}`).join(";") : ""
                    ].join("\n");
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
                                beforePseudoElement = new ContentScript.PseudoElement(ContentScript.PseudoType.Before, tag, roomId, beforeStyle, roomRules);
                                roomRules.attributes = roomRules.attributes || new Map();
                                roomRules.attributes.set("before-style", roomId);
                            }
                            if (afterStyle && afterStyle.content) {
                                roomId = roomId || (room ? MidnightLizard.Util.hashCode(room).toString() : MidnightLizard.Util.guid());
                                afterPseudoElement = new ContentScript.PseudoElement(ContentScript.PseudoType.After, tag, roomId, afterStyle, roomRules);
                                roomRules.attributes = roomRules.attributes || new Map();
                                roomRules.attributes.set("after-style", roomId);
                            }
                        }
                        this.processTransitions(tag, roomRules);
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
                            (tag.type == "checkbox" || tag.type == "radio") && tag.computedStyle.webkitAppearance !== this._css.none) &&
                            (this.shift.Image.lightnessLimit < 1 || this.shift.Image.saturationLimit < 1)) {
                            let imgSet = this.shift.Image;
                            roomRules.filter =
                                {
                                    value: [
                                        imgSet.saturationLimit < 1 ? `saturate(${imgSet.saturationLimit})` : "",
                                        imgSet.lightnessLimit < 1 ? `brightness(${imgSet.lightnessLimit})` : "",
                                        tag.computedStyle.filter != this._css.none ? tag.computedStyle.filter : ""
                                    ].filter(f => f).join(" ").trim()
                                };
                            roomRules.attributes = roomRules.attributes || new Map();
                            roomRules.attributes.set(this._css.transition, this._css.filter);
                        }
                        let bgInverted = roomRules.backgroundColor.originalLight - roomRules.backgroundColor.light > this.shift.Text.contrast;
                        if (tag instanceof doc.defaultView.HTMLCanvasElement) {
                            let filterValue = new Array();
                            let bgrSet = this.shift.Background, txtSet = this.shift.Text;
                            if (bgInverted) {
                                filterValue.push(bgrSet.saturationLimit < 1 ? `saturate(${bgrSet.saturationLimit})` : "", `brightness(${1 - bgrSet.lightnessLimit})`, `invert(1)`, `brightness(${txtSet.lightnessLimit})`, tag.computedStyle.filter != this._css.none ? tag.computedStyle.filter : "");
                            }
                            else {
                                filterValue.push(bgrSet.saturationLimit < 1 ? `saturate(${bgrSet.saturationLimit})` : "", bgrSet.lightnessLimit < 1 ? `brightness(${bgrSet.lightnessLimit})` : "", tag.computedStyle.filter != this._css.none ? tag.computedStyle.filter : "");
                            }
                            roomRules.filter = { value: filterValue.filter(f => f).join(" ").trim() };
                        }
                        if (tag.isPseudo && tag.computedStyle.content.substr(0, 3) == "url") {
                            let doInvert = (!isTable) && bgInverted && (tag.computedStyle.content.search(doNotInvertRegExp) === -1) &&
                                (this.tagIsSmall(tag) || tag.parentElement.parentElement &&
                                    this.tagIsSmall(tag.parentElement.parentElement) &&
                                    (tag.parentElement.parentElement.computedStyle.overflow === this._css.hidden));
                            if (this.shift.Image.lightnessLimit < 1 || this.shift.Image.saturationLimit < 1 || doInvert) {
                                let imgSet = this.shift.Image;
                                roomRules.filter =
                                    {
                                        value: [
                                            imgSet.saturationLimit < 1 ? `saturate(${imgSet.saturationLimit})` : "",
                                            imgSet.lightnessLimit < 1 && !doInvert ? `brightness(${imgSet.lightnessLimit})` : "",
                                            doInvert ? `brightness(${1 - this.shift.Background.lightnessLimit})` : "",
                                            doInvert ? "invert(1)" : "",
                                            tag.computedStyle.filter != this._css.none ? tag.computedStyle.filter : ""
                                        ].filter(f => f).join(" ").trim()
                                    };
                            }
                        }
                        if (tag.computedStyle.backgroundImage && tag.computedStyle.backgroundImage !== this._css.none) {
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
                                doInvert = (!isTable) && bgInverted && (backgroundImage.search(doNotInvertRegExp) === -1) &&
                                    (this.tagIsSmall(tag) || !!tag.parentElement && !!tag.parentElement.parentElement &&
                                        this.tagIsSmall(tag.parentElement.parentElement) &&
                                        (tag.parentElement.parentElement.computedStyle.overflow === this._css.hidden));
                                if (bgImgSet.lightnessLimit < 1 || bgImgSet.saturationLimit < 1 || doInvert) {
                                    isPseudoContent = tag.isPseudo && tag.computedStyle.content !== "''" && tag.computedStyle.content !== '""';
                                    if (bgImgSet.lightnessLimit < 1 && !doInvert) {
                                        this.calcTagArea(tag);
                                        let area = 1 - Math.min(Math.max(tag.area, 1) / doc.viewArea, 1), lim = bgImgSet.lightnessLimit, txtLim = this.shift.Text.lightnessLimit;
                                        bgImgLight = Math.min(Math.pow((Math.pow((Math.pow(lim, (1 / 2)) - lim), (1 / 3)) * area), 3) + lim, Math.max(lim, txtLim));
                                    }
                                    bgFilter = [
                                        bgImgSet.saturationLimit < 1 ? `saturate(${bgImgSet.saturationLimit})` : "",
                                        bgImgLight < 1 ? `brightness(${bgImgLight})` : "",
                                        doInvert ? `brightness(${1 - this.shift.Background.lightnessLimit})` : "",
                                        doInvert ? "invert(1)" : ""
                                    ].filter(f => f).join(" ").trim();
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
                            let textColor = tag.computedStyle.getPropertyValue(ns.css.fntColor);
                            roomRules.color = this._textColorProcessor.changeColor(textColor, bgLight, tag);
                            let originalTextContrast = Math.abs(roomRules.backgroundColor.originalLight - roomRules.color.originalLight);
                            let currentTextContrast = Math.abs(roomRules.backgroundColor.light - roomRules.color.light);
                            if (currentTextContrast != originalTextContrast && roomRules.color.originalLight != roomRules.color.light &&
                                tag.computedStyle.textShadow && tag.computedStyle.textShadow !== this._css.none) {
                                let newTextShadow = tag.computedStyle.textShadow, newColor = null, prevColor, prevHslColor, shadowContrast, inheritedShadowColor;
                                let uniqColors = new Set(newTextShadow
                                    .replace(/([\.\d]+px)/gi, '')
                                    .match(/(rgba?\([^\)]+\)|#[a-z\d]+|[a-z]+)/gi) || []);
                                if (uniqColors.size > 0) {
                                    uniqColors.forEach(c => {
                                        prevColor = /rgb/gi.test(c) ? c : this._colorConverter.convert(c);
                                        if (prevColor) {
                                            inheritedShadowColor = this._textShadowColorProcessor.getInheritedColor(tag, prevColor);
                                            inheritedShadowColor && (prevColor = inheritedShadowColor.originalColor);
                                            prevHslColor = MidnightLizard.Colors.RgbaColor.toHslaColor(MidnightLizard.Colors.RgbaColor.parse(prevColor));
                                            shadowContrast = Math.abs(prevHslColor.lightness - roomRules.color.originalLight) / originalTextContrast * currentTextContrast;
                                            newColor = this._textShadowColorProcessor.changeColor(prevColor, roomRules.color.light, tag, shadowContrast);
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
                        if (isSvg || tag.computedStyle.borderStyle != this._css.none) {
                            let brdColor = tag.computedStyle.getPropertyValue(ns.css.brdColor), result;
                            if (brdColor.indexOf(" r") == -1) {
                                if (brdColor == tag.computedStyle.getPropertyValue(ns.css.bgrColor)) {
                                    result = Object.assign({}, roomRules.backgroundColor);
                                    Object.assign(result, { reason: MidnightLizard.Colors.ColorReason.SameAsBackground, owner: this._app.isDebug ? tag : null });
                                }
                                else {
                                    result = this._borderColorProcessor.changeColor(brdColor, bgLight, tag);
                                }
                                roomRules.borderColor = result.color ? result : null;
                            }
                            else if (!isSvg) {
                                result = this._borderColorProcessor.changeColor(tag.computedStyle.borderTopColor, bgLight, tag);
                                roomRules.borderTopColor = result.color ? result : null;
                                result = this._borderColorProcessor.changeColor(tag.computedStyle.borderRightColor, bgLight, tag);
                                roomRules.borderRightColor = result.color ? result : null;
                                result = this._borderColorProcessor.changeColor(tag.computedStyle.borderBottomColor, bgLight, tag);
                                roomRules.borderBottomColor = result.color ? result : null;
                                result = this._borderColorProcessor.changeColor(tag.computedStyle.borderLeftColor, bgLight, tag);
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
            processTransitions(tag, roomRules) {
                if (tag.computedStyle && tag.computedStyle.transitionDuration !== this._css.zeroSec) {
                    let hasForbiddenTransition = false;
                    let durations = tag.computedStyle.transitionDuration.split(", ");
                    tag.computedStyle.transitionProperty.split(", ").forEach((prop, index) => {
                        if (this._transitionForbiddenProperties.has(prop)) {
                            durations[index] = this._css.zeroSec;
                            hasForbiddenTransition = true;
                        }
                    });
                    if (hasForbiddenTransition) {
                        roomRules.transitionDuration = { value: durations.join(", ") };
                    }
                }
            }
            removeTemporaryFilter(tag) {
                if (tag.originalFilter !== undefined) {
                    tag.style.setProperty(this._css.filter, tag.originalFilter);
                }
                ContentScript.isRealElement(tag) && tag.removeAttribute(this._css.transition);
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
                    let imgWidth = img.width + this._css.px, imgHeight = img.height + this._css.px;
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
                tag.style.setProperty(this._css.backgroundImage, backgroundImages.map(bgImg => bgImg.data).join(","), this._css.important);
                tag.style.setProperty(this._css.backgroundSize, backgroundImages.map(bgImg => bgImg.size).join(","), this._css.important);
                this._documentObserver.startDocumentObservation(tag.ownerDocument, originalState);
                return tag;
            }
            onIFrameLoaded(iframe) {
                try {
                    let childDoc = iframe.contentDocument || iframe.contentWindow.document;
                    setTimeout(dom.addEventListener(childDoc, "DOMContentLoaded", this.onIFrameDocumentLaoded, this, false, childDoc), 1);
                }
                catch (ex) {
                }
            }
            onIFrameDocumentLaoded(doc) {
                if (doc.readyState != "loading" && doc.readyState != "uninitialized" && doc.body && !doc.body.mlBgColor) {
                    doc.body.style.setProperty(this._css.color, "rgb(5,5,5)");
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
                let trackColor = this._backgroundColorProcessor.changeColor(cx.White, false, doc.documentElement).color;
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
                    doc.mlPseudoStyles.innerHTML = this.getStandardPseudoStyles();
                    doc.head.appendChild(doc.mlPseudoStyles);
                }
            }
            getStandardPseudoStyles() {
                const css = new Array();
                for (let pseudoType of MidnightLizard.Util.getEnumValues(ContentScript.PseudoType)) {
                    for (let pseudoStandard of MidnightLizard.Util.getEnumValues(ContentScript.PseudoStyleStandard)) {
                        css.push(this.getStandardPseudoStyleSelector(pseudoType, pseudoStandard, this._standardPseudoCssTexts.get(pseudoStandard)));
                    }
                }
                return css.join("\n");
            }
            getStandardPseudoStyleSelector(pseudoType, pseudoStyleStandard, cssText) {
                const pseudo = ContentScript.PseudoType[pseudoType].toLowerCase();
                return `[${pseudo}-style="${ContentScript.PseudoStyleStandard[pseudoStyleStandard]}"]:not(impt)::${pseudo} { ${cssText}!${this._css.important} }`;
            }
            clearPseudoStyles(doc) {
                if (doc.mlPseudoStyles) {
                    doc.mlPseudoStyles.innerHTML = "";
                }
            }
            createLoadingStyles(doc) {
                let noTrans = doc.createElement('style');
                noTrans.id = "midnight-lizard-no-trans-style";
                noTrans.mlIgnore = true;
                noTrans.innerHTML = ":not([transition]) { transition: all 0s ease 0s !important; }";
                doc.head.appendChild(noTrans);
                let bgrLight = this.shift.Background.lightnessLimit, imgLight = this.shift.Image.lightnessLimit, imgSatrt = this.shift.Image.saturationLimit, bgrColor = this._backgroundColorProcessor.changeColor(cx.White, false, doc.documentElement).color, txtColor = this._textColorProcessor.changeColor(cx.Black, bgrLight, doc.documentElement).color, brdColor = this._borderColorProcessor.changeColor(cx.Black, bgrLight, doc.documentElement).color, style = doc.createElement('style');
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
                doc.head.appendChild(style);
            }
            removeLoadingStyles(doc) {
                let style = doc.getElementById("midnight-lizard-loading-style");
                style && style.remove();
                setTimeout((d) => {
                    let noTrans = d.getElementById("midnight-lizard-no-trans-style");
                    noTrans && noTrans.remove();
                }, 1, doc);
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
                if (roomRules.filter && roomRules.filter.value) {
                    tag.originalFilter = tag.style.filter;
                    tag.currentFilter = roomRules.filter.value;
                    tag.style.setProperty(this._css.filter, roomRules.filter.value);
                }
                if (roomRules.transitionDuration && roomRules.transitionDuration.value) {
                    tag.originalTransitionDuration = tag.style.transitionDuration;
                    tag.style.setProperty(this._css.transitionDuration, roomRules.transitionDuration.value, this._css.important);
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
                    tag.style.setProperty(ns.css.shdColor, roomRules.textShadow.value, this._css.important);
                }
                if (roomRules.display) {
                    tag.originalDisplay = tag.style.display;
                    tag.style.setProperty(this._css.display, roomRules.display, this._css.important);
                }
                if (roomRules.backgroundColor && roomRules.backgroundColor.color) {
                    tag.originalBackgroundColor = tag.style.getPropertyValue(ns.css.bgrColor);
                    tag.style.setProperty(ns.css.bgrColor, roomRules.backgroundColor.color, this._css.important);
                }
                if (roomRules.color && roomRules.color.color) {
                    tag.originalColor = tag.style.getPropertyValue(ns.css.fntColor);
                    tag.style.setProperty(ns.css.fntColor, roomRules.color.color, this._css.important);
                }
                else if (roomRules.color && (roomRules.color.reason === MidnightLizard.Colors.ColorReason.Inherited) && tag.style.getPropertyValue(ns.css.fntColor)) {
                    tag.originalColor = "";
                }
                if (roomRules.borderColor && roomRules.borderColor.color) {
                    tag.originalBorderColor = tag.style.getPropertyValue(ns.css.brdColor);
                    tag.style.setProperty(ns.css.brdColor, roomRules.borderColor.color, this._css.important);
                }
                else {
                    if (roomRules.borderTopColor) {
                        tag.originalBorderTopColor = tag.style.borderTopColor;
                        tag.style.setProperty(this._css.borderTopColor, roomRules.borderTopColor.color, this._css.important);
                    }
                    if (roomRules.borderRightColor) {
                        tag.originalBorderRightColor = tag.style.borderRightColor;
                        tag.style.setProperty(this._css.borderRightColor, roomRules.borderRightColor.color, this._css.important);
                    }
                    if (roomRules.borderBottomColor) {
                        tag.originalBorderBottomColor = tag.style.borderBottomColor;
                        tag.style.setProperty(this._css.borderBottomColor, roomRules.borderBottomColor.color, this._css.important);
                    }
                    if (roomRules.borderLeftColor) {
                        tag.originalBorderLeftColor = tag.style.borderLeftColor;
                        tag.style.setProperty(this._css.borderLeftColor, roomRules.borderLeftColor.color, this._css.important);
                    }
                }
                if (ContentScript.isPseudoElement(tag)) {
                    if (applyBgPromise) {
                        applyBgPromise.then((x) => x.applyStyleChanges());
                        Promise.all([tag, applyBgPromise.catch(ex => ex)]).then(([t]) => t.applyStyleChanges());
                    }
                    else {
                        let cssText = tag.style.cssText;
                        if (cssText) {
                            for (let [standardType, standardCssText] of this._standardPseudoCssTexts) {
                                if (cssText === standardCssText) {
                                    const attrName = `${tag.tagName}-style`, attrValue = ContentScript.PseudoStyleStandard[standardType];
                                    tag.parentRoomRules.attributes.set(attrName, attrValue);
                                    tag.parentElement.setAttribute(attrName, attrValue);
                                    cssText = "";
                                    break;
                                }
                            }
                        }
                        tag.applyStyleChanges(cssText);
                    }
                }
                if (ContentScript.isRealElement(tag) && tag.onRoomRulesApplied) {
                    tag.onRoomRulesApplied.raise(roomRules);
                }
            }
        };
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
                    this._onSettingsInitializationFailed.raise(ex);
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
                let shadowColor = this._textShadowColorProcessor.changeColor(MidnightLizard.Colors.RgbaColor.Gray, roomRules.color.light, tag, Math.abs(roomRules.color.light - roomRules.backgroundColor.light) / 1.4);
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
