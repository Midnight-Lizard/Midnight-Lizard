/// <reference path="../../node_modules/reflect-metadata/Reflect.ts" />

namespace MidnightLizard.DI
{
    type Prototype<T> = { prototype: T };
    type Constructor = new (...args: any[]) => any;
    /**
     * Implement this class to add custom registrations at runtime.
     * IRegistrator implementaion should be marked as @DI.injectable(DI.IRegistrator) to be resolved.
     **/
    export abstract class IRegistrator { }
    /** Lifetime scope of the injected instance */
    export enum Scope
    {
        /** Global singleton instance - this is default value */
        SingleInstance,
        /** New instance per dependency */
        InstancePerDependency,
        /** The same as {SingleInstance} but won't ever create a new instance */
        ExistingInstance
    }
    /**
     * RegistrationCompletedError would be thrown if
     * DependencyInjector.register method has been called after
     * DependencyInjector.resolve method had been called first time
     **/
    export class RegistrationCompletedError extends Error
    {
        name: "RegistrationCompletedError";
        constructor()
        {
            super("Registration process has been completed. No more new registrations can be done.");
            Object.setPrototypeOf(this, RegistrationCompletedError.prototype);
        }
    }
    /**
     * ResolveFailedError would be thrown if DependencyInjector could not resolve the requested abstraction
     **/
    export class ResolveFailedError extends Error
    {
        name: "ResolveFailedError";
        constructor(abstraction: any)
        {
            super(`DependencyInjector could not resolve type: ${abstraction}.`);
            Object.setPrototypeOf(this, ResolveFailedError.prototype);
        }
    }
    /**
     * Dependency Injector
     **/
    export class DependencyInjector
    {
        protected _registrationCompleted: boolean;
        protected readonly _registrations = new Map<Prototype<any>, { implementaion: Constructor, parameterTypes: any[], scope: Scope }>();
        protected readonly _resolvedInstances = new WeakMap<Prototype<any>, any>();
        /** Dependency Injector constructor */
        constructor() { }

        /** Registers the implementaion of the abstract type
         * @param abstraction - Abstract type to be registered
         * @param implementaion - Constructor of the implementaion of the abstract type
         * @param parameterTypes - List of the parameter types of the constructor
         * @param scope - Lifetime scope of the implementaion instance
         **/
        public register(abstraction: Prototype<any>, implementaion: Constructor, parameterTypes = new Array<any>(), scope = Scope.SingleInstance)
        {
            if (!this._registrationCompleted)
            {
                this._registrations.set(abstraction, { implementaion: implementaion, parameterTypes: parameterTypes, scope: scope });
            }
            else
            {
                throw new RegistrationCompletedError();
            }
        }

        /**
         * - Resolves specified type.
         * - When called first time tries to resolve IRegistrator to finish registration process.
         * - No more registrations can be added after that.
         * @param abstraction - abstract type to be resolved
         **/
        public resolve<T>(abstraction: Prototype<T>): T
        {
            if (!this._registrationCompleted)
            {
                this.resolveInternal(IRegistrator);
                this._registrationCompleted = true;
            }
            let result = this.resolveInternal(abstraction);
            if (result !== undefined)
            {
                return result;
            }
            else throw new ResolveFailedError(abstraction);
        }

        protected resolveInternal<T>(abstraction: Prototype<T>): T | undefined
        {
            let implementaionOptions = this._registrations.get(abstraction), resolvedInstance: any;
            if (implementaionOptions)
            {
                if (implementaionOptions.scope === Scope.SingleInstance || implementaionOptions.scope === Scope.ExistingInstance)
                {
                    resolvedInstance = this._resolvedInstances.get(abstraction);
                    if (resolvedInstance === undefined && implementaionOptions.scope === Scope.ExistingInstance)
                    {
                        this._registrations.forEach((otherOptions, otherAbstraction) =>
                        {
                            if (resolvedInstance === undefined && otherOptions.implementaion === implementaionOptions!.implementaion)
                            {
                                resolvedInstance = this._resolvedInstances.get(otherAbstraction);
                            }
                        });
                        if (resolvedInstance !== undefined)
                        {
                            this._resolvedInstances.set(abstraction, resolvedInstance);
                        }
                    }
                }
                if (resolvedInstance === undefined && implementaionOptions.scope !== Scope.ExistingInstance)
                {
                    let resolvedParameters = implementaionOptions.parameterTypes.map(p => this.resolveInternal(p));
                    resolvedInstance = new implementaionOptions.implementaion(...resolvedParameters);
                    if (implementaionOptions.scope === Scope.SingleInstance)
                    {
                        this._resolvedInstances.set(abstraction, resolvedInstance);
                    }
                }
                return resolvedInstance;
            }
            else if (abstraction as any === IRegistrator)
            {
                return undefined;
            }
            throw new ResolveFailedError(abstraction);
        }
    }

    /** Default Dependency Injector */
    export const Container = new DependencyInjector();

    /** Marks the class as injectable.
     * @param abstraction - Current class implements this abstraction.
     * @param scope - Lifetime scope of the implementaion instance.
     **/
    export function injectable(abstraction?: Prototype<any>, scope = Scope.SingleInstance)
    {
        return (constructor: Constructor) =>
        {
            let constructorParameterTypes = Reflect.getMetadata("design:paramtypes", constructor) as any[];
            Container.register(abstraction || constructor, constructor, constructorParameterTypes, scope);
        };
    }
}