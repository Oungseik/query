var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ReactiveValue_fn, _ReactiveValue_subscribe;
import { createSubscriber } from 'svelte/reactivity';
export class ReactiveValue {
    constructor(fn, onSubscribe) {
        _ReactiveValue_fn.set(this, void 0);
        _ReactiveValue_subscribe.set(this, void 0);
        __classPrivateFieldSet(this, _ReactiveValue_fn, fn, "f");
        __classPrivateFieldSet(this, _ReactiveValue_subscribe, createSubscriber((update) => onSubscribe(update)), "f");
    }
    get current() {
        __classPrivateFieldGet(this, _ReactiveValue_subscribe, "f").call(this);
        return __classPrivateFieldGet(this, _ReactiveValue_fn, "f").call(this);
    }
}
_ReactiveValue_fn = new WeakMap(), _ReactiveValue_subscribe = new WeakMap();
/**
 * Makes all of the top-level keys of an object into $state.raw fields whose initial values
 * are the same as in the original object. Does not mutate the original object. Provides an `update`
 * function that _can_ (but does not have to be) be used to replace all of the object's top-level keys
 * with the values of the new object, while maintaining the original root object's reference.
 */
export function createRawRef(init) {
    const refObj = (Array.isArray(init) ? [] : {});
    const hiddenKeys = new Set();
    const out = new Proxy(refObj, {
        set(target, prop, value, receiver) {
            hiddenKeys.delete(prop);
            if (prop in target) {
                return Reflect.set(target, prop, value, receiver);
            }
            let state = $state.raw(value);
            Object.defineProperty(target, prop, {
                configurable: true,
                enumerable: true,
                get: () => {
                    // If this is a lazy value, we need to call it.
                    // We can't do something like typeof state === 'function'
                    // because the value could actually be a function that we don't want to call.
                    return state && isBranded(state) ? state() : state;
                },
                set: (v) => {
                    state = v;
                },
            });
            return true;
        },
        has: (target, prop) => {
            if (hiddenKeys.has(prop)) {
                return false;
            }
            return prop in target;
        },
        ownKeys(target) {
            return Reflect.ownKeys(target).filter((key) => !hiddenKeys.has(key));
        },
        getOwnPropertyDescriptor(target, prop) {
            if (hiddenKeys.has(prop)) {
                return undefined;
            }
            return Reflect.getOwnPropertyDescriptor(target, prop);
        },
        deleteProperty(target, prop) {
            if (prop in target) {
                // @ts-expect-error
                // We need to set the value to undefined to signal to the listeners that the value has changed.
                // If we just deleted it, the reactivity system wouldn't have any idea that the value was gone.
                target[prop] = undefined;
                hiddenKeys.add(prop);
                if (Array.isArray(target)) {
                    target.length--;
                }
                return true;
            }
            return false;
        },
    });
    function update(newValue) {
        const existingKeys = Object.keys(out);
        const newKeys = Object.keys(newValue);
        const keysToRemove = existingKeys.filter((key) => !newKeys.includes(key));
        for (const key of keysToRemove) {
            // @ts-expect-error
            delete out[key];
        }
        for (const key of newKeys) {
            // @ts-expect-error
            // This craziness is required because Tanstack Query defines getters for all of the keys on the object.
            // These getters track property access, so if we access all of them here, we'll end up tracking everything.
            // So we wrap the property access in a special function that we can identify later to lazily access the value.
            // (See above)
            out[key] = brand(() => newValue[key]);
        }
    }
    // we can't pass `init` directly into the proxy because it'll never set the state fields
    // (because (prop in target) will always be true)
    update(init);
    return [out, update];
}
const lazyBrand = Symbol('LazyValue');
function brand(fn) {
    // @ts-expect-error
    fn[lazyBrand] = true;
    return fn;
}
function isBranded(fn) {
    return Boolean(fn[lazyBrand]);
}
