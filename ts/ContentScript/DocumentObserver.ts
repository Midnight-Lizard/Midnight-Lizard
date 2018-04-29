/// <reference path="../DI/-DI.ts" />

namespace MidnightLizard.ContentScript
{
    type ArgEvent<TArgs> = MidnightLizard.Events.ArgumentedEvent<TArgs>;
    const ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;
    const mutationThrottleTime = 30, maxMutationsCount = 300;

    export enum ObservationState
    {
        Active,
        Stopped
    }

    export abstract class IDocumentObserver
    {
        abstract startDocumentObservation(document: Document, resumeState?: ObservationState): void;
        abstract stopDocumentObservation(doc: Document): ObservationState | undefined;
        abstract get onClassChanged(): ArgEvent<Set<Element>>;
        abstract get onStyleChanged(): ArgEvent<Set<Element>>;
        abstract get onElementsAdded(): ArgEvent<Set<Element>>;
    }

    @DI.injectable(IDocumentObserver)
    class DocumentObserver implements IDocumentObserver
    {
        protected readonly _bodyObserverConfig: MutationObserverInit =
            { subtree: true, childList: true, /*attributeOldValue: true,*/ attributes: true, attributeFilter: ["class", "style", "fill", "stroke"] };
        protected readonly _simpleBodyObserverConfig: MutationObserverInit =
            { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] };
        protected readonly _headObserverConfig: MutationObserverInit = { childList: true };
        protected readonly _bodyObservers = new WeakMap<Document, MutationObserver>();
        protected readonly _headObservers = new WeakMap<Document, MutationObserver>();

        constructor(
            protected readonly _rootDocument: Document,
            protected readonly _settingsManager: MidnightLizard.Settings.IBaseSettingsManager,
            protected readonly _styleSheetProcessor: IStyleSheetProcessor)
        {
            _settingsManager.onSettingsChanged.addListener(this.beforeSettingsChanged, this, Events.EventHandlerPriority.High);
        }

        protected _onClassChanged = new ArgEventDispatcher<Set<Element>>();
        public get onClassChanged()
        {
            return this._onClassChanged.event;
        }

        protected _onStyleChanged = new ArgEventDispatcher<Set<Element>>();
        public get onStyleChanged()
        {
            return this._onStyleChanged.event;
        }

        protected _onElementAdded = new ArgEventDispatcher<Set<Element>>();
        public get onElementsAdded()
        {
            return this._onElementAdded.event;
        }

        protected beforeSettingsChanged(response: (scheme: Settings.ColorScheme) => void, shift?: Colors.ComponentShift): void
        {
            if (!this._settingsManager.isActive)
            {
                this.stopDocumentObservation(this._rootDocument);
            }
        }

        public startDocumentObservation(doc: Document, resumeState?: ObservationState): void
        {
            if (resumeState !== ObservationState.Stopped)
            {
                let bodyObserver = this._bodyObservers.get(doc);
                if (bodyObserver === undefined)
                {
                    this._bodyObservers.set(doc, bodyObserver = new MutationObserver(this.bodyObserverCallback.bind(this)));
                }
                bodyObserver.observe(doc.body, this._settingsManager.isComplex
                    ? this._bodyObserverConfig : this._simpleBodyObserverConfig);
                bodyObserver.state = ObservationState.Active;

                if (doc.head && this._settingsManager.isComplex)
                {
                    let headObserver = this._headObservers.get(doc);
                    if (headObserver === undefined)
                    {
                        this._headObservers.set(doc, headObserver = new MutationObserver(this.headObserverCallback.bind(this)));
                    }
                    headObserver.observe(doc.head, this._headObserverConfig);
                }
            }
        }

        public stopDocumentObservation(doc: Document): ObservationState | undefined
        {
            let originalState = undefined;
            const bodyObserver = this._bodyObservers.get(doc);
            if (bodyObserver !== undefined)
            {
                let mutations = bodyObserver.takeRecords();
                originalState = bodyObserver.state;
                bodyObserver.disconnect();
                bodyObserver.state = ObservationState.Stopped;
                setTimeout(() => this.bodyObserverCallback(mutations, bodyObserver!), 1);
            }
            if (doc.head)
            {
                const headObserver = this._headObservers.get(doc);
                if (headObserver !== undefined)
                {
                    let mutations = headObserver.takeRecords();
                    headObserver.disconnect();
                    headObserver.state = ObservationState.Stopped;
                    if (this._settingsManager.isComplex)
                    {
                        setTimeout(() => this.headObserverCallback(mutations, headObserver!), 1);
                    }
                }
            }
            return originalState;
        }

        protected bodyObserverCallback(mutations: MutationRecord[], observer: MutationObserver)
        {
            let classChanges = new Set<Element>(),
                childListChanges = new Set<Element>(),
                styleChanges = new Set<Element>();
            const now = Date.now();
            mutations.forEach(mutation =>
            {
                switch (mutation.type)
                {
                    case "attributes":
                        if ((mutation.target.mlTimestamp &&
                            now - mutation.target.mlTimestamp < mutationThrottleTime))
                        {
                            mutation.target.mlMutationThrottledCount =
                                (mutation.target.mlMutationThrottledCount || 0) + 1;
                        }
                        if ((!mutation.target.mlMutationThrottledCount ||
                            mutation.target.mlMutationThrottledCount < maxMutationsCount) &&
                            (mutation.target.isChecked || mutation.target instanceof HTMLBodyElement))
                        {
                            switch (mutation.attributeName)
                            {
                                case "class":
                                    classChanges.add(mutation.target as Element);
                                    break;

                                case "style":
                                case "fill":
                                case "stroke":
                                    if (this._settingsManager.isComplex)
                                    {
                                        styleChanges.add(mutation.target as Element);
                                    }
                                    break;

                                default:
                                    break;
                            }
                        }
                        break;

                    case "childList":
                        Array.prototype.slice.call(mutation.addedNodes)
                            .forEach((node: Element) => childListChanges.add(node));
                        break;

                    default:
                        break;
                }
            });
            if (styleChanges.size > 0)
            {
                this._onStyleChanged.raise(styleChanges);
            }
            if (childListChanges.size > 0)
            {
                this._onElementAdded.raise(childListChanges);
            }
            if (classChanges.size > 0)
            {
                this._onClassChanged.raise(classChanges);
            }
            if (!this._settingsManager.isActive)
            {
                observer.disconnect();
            }
        }

        protected headObserverCallback(mutations: MutationRecord[], observer: MutationObserver)
        {
            let mutation = mutations
                .find(m => Array.prototype.slice.call(m.addedNodes)
                    .find((x: Node) => x instanceof x.ownerDocument.defaultView.HTMLStyleElement && !x.mlIgnore));
            if (mutation)
            {
                this._styleSheetProcessor.processDocumentStyleSheets(mutation.target.ownerDocument);
            }
        }
    }
}