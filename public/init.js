function noop() { }
const identity = x => x;
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function get_store_value(store) {
    let value;
    subscribe(store, _ => value = _)();
    return value;
}
function component_subscribe(component, store, callback) {
    component.$$.on_destroy.push(subscribe(store, callback));
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
    if (slot_changes) {
        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
        slot.p(slot_context, slot_changes);
    }
}
function get_all_dirty_from_scope($$scope) {
    if ($$scope.ctx.length > 32) {
        const dirty = [];
        const length = $$scope.ctx.length / 32;
        for (let i = 0; i < length; i++) {
            dirty[i] = -1;
        }
        return dirty;
    }
    return -1;
}
function null_to_empty(value) {
    return value == null ? '' : value;
}
function set_store_value(store, ret, value) {
    store.set(value);
    return ret;
}
function action_destroyer(action_result) {
    return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
}

const is_client = typeof window !== 'undefined';
let now = is_client
    ? () => window.performance.now()
    : () => Date.now();
let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

const tasks = new Set();
function run_tasks(now) {
    tasks.forEach(task => {
        if (!task.c(now)) {
            tasks.delete(task);
            task.f();
        }
    });
    if (tasks.size !== 0)
        raf(run_tasks);
}
/**
 * Creates a new task that runs on each raf frame
 * until it returns a falsy value or is aborted
 */
function loop(callback) {
    let task;
    if (tasks.size === 0)
        raf(run_tasks);
    return {
        promise: new Promise(fulfill => {
            tasks.add(task = { c: callback, f: fulfill });
        }),
        abort() {
            tasks.delete(task);
        }
    };
}
function append(target, node) {
    target.appendChild(node);
}
function get_root_for_style(node) {
    if (!node)
        return document;
    const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
    if (root && root.host) {
        return root;
    }
    return node.ownerDocument;
}
function append_empty_stylesheet(node) {
    const style_element = element('style');
    append_stylesheet(get_root_for_style(node), style_element);
    return style_element.sheet;
}
function append_stylesheet(node, style) {
    append(node.head || node, style);
    return style.sheet;
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function prevent_default(fn) {
    return function (event) {
        event.preventDefault();
        // @ts-ignore
        return fn.call(this, event);
    };
}
function stop_propagation(fn) {
    return function (event) {
        event.stopPropagation();
        // @ts-ignore
        return fn.call(this, event);
    };
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function set_attributes(node, attributes) {
    // @ts-ignore
    const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
    for (const key in attributes) {
        if (attributes[key] == null) {
            node.removeAttribute(key);
        }
        else if (key === 'style') {
            node.style.cssText = attributes[key];
        }
        else if (key === '__value') {
            node.value = node[key] = attributes[key];
        }
        else if (descriptors[key] && descriptors[key].set) {
            node[key] = attributes[key];
        }
        else {
            attr(node, key, attributes[key]);
        }
    }
}
function to_number(value) {
    return value === '' ? null : +value;
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.wholeText !== data)
        text.data = data;
}
function set_input_value(input, value) {
    input.value = value == null ? '' : value;
}
function set_style(node, key, value, important) {
    if (value === null) {
        node.style.removeProperty(key);
    }
    else {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, cancelable, detail);
    return e;
}
function construct_svelte_component(component, props) {
    return new component(props);
}

// we need to store the information for multiple documents because a Svelte application could also contain iframes
// https://github.com/sveltejs/svelte/issues/3624
const managed_styles = new Map();
let active = 0;
// https://github.com/darkskyapp/string-hash/blob/master/index.js
function hash(str) {
    let hash = 5381;
    let i = str.length;
    while (i--)
        hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
    return hash >>> 0;
}
function create_style_information(doc, node) {
    const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
    managed_styles.set(doc, info);
    return info;
}
function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
    const step = 16.666 / duration;
    let keyframes = '{\n';
    for (let p = 0; p <= 1; p += step) {
        const t = a + (b - a) * ease(p);
        keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
    }
    const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
    const name = `__svelte_${hash(rule)}_${uid}`;
    const doc = get_root_for_style(node);
    const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
    if (!rules[name]) {
        rules[name] = true;
        stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
    }
    const animation = node.style.animation || '';
    node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
    active += 1;
    return name;
}
function delete_rule(node, name) {
    const previous = (node.style.animation || '').split(', ');
    const next = previous.filter(name
        ? anim => anim.indexOf(name) < 0 // remove specific animation
        : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
    );
    const deleted = previous.length - next.length;
    if (deleted) {
        node.style.animation = next.join(', ');
        active -= deleted;
        if (!active)
            clear_rules();
    }
}
function clear_rules() {
    raf(() => {
        if (active)
            return;
        managed_styles.forEach(info => {
            const { ownerNode } = info.stylesheet;
            // there is no ownerNode if it runs on jsdom.
            if (ownerNode)
                detach(ownerNode);
        });
        managed_styles.clear();
    });
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
/**
 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
 * it can be called from an external module).
 *
 * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
 *
 * https://svelte.dev/docs#run-time-svelte-onmount
 */
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
/**
 * Schedules a callback to run immediately before the component is unmounted.
 *
 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
 * only one that runs inside a server-side component.
 *
 * https://svelte.dev/docs#run-time-svelte-ondestroy
 */
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
}
/**
 * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
 *
 * Component events created with `createEventDispatcher` create a
 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
 * property and can contain any type of data.
 *
 * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
 */
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail, { cancelable = false } = {}) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail, { cancelable });
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
            return !event.defaultPrevented;
        }
        return true;
    };
}
/**
 * Associates an arbitrary `context` object with the current component and the specified `key`
 * and returns that object. The context is then available to children of the component
 * (including slotted content) with `getContext`.
 *
 * Like lifecycle functions, this must be called during component initialisation.
 *
 * https://svelte.dev/docs#run-time-svelte-setcontext
 */
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
    return context;
}
/**
 * Retrieves the context that belongs to the closest parent component with the specified `key`.
 * Must be called during component initialisation.
 *
 * https://svelte.dev/docs#run-time-svelte-getcontext
 */
function getContext(key) {
    return get_current_component().$$.context.get(key);
}
// TODO figure out if we still want to support
// shorthand events, or if we want to implement
// a real bubbling mechanism
function bubble(component, event) {
    const callbacks = component.$$.callbacks[event.type];
    if (callbacks) {
        // @ts-ignore
        callbacks.slice().forEach(fn => fn.call(this, event));
    }
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function tick() {
    schedule_update();
    return resolved_promise;
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
function add_flush_callback(fn) {
    flush_callbacks.push(fn);
}
// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();
let flushidx = 0; // Do *not* move this inside the flush() function
function flush() {
    const saved_component = current_component;
    do {
        // first, call beforeUpdate functions
        // and update components
        while (flushidx < dirty_components.length) {
            const component = dirty_components[flushidx];
            flushidx++;
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        flushidx = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    seen_callbacks.clear();
    set_current_component(saved_component);
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}

let promise;
function wait() {
    if (!promise) {
        promise = Promise.resolve();
        promise.then(() => {
            promise = null;
        });
    }
    return promise;
}
function dispatch(node, direction, kind) {
    node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
    else if (callback) {
        callback();
    }
}
const null_transition = { duration: 0 };
function create_bidirectional_transition(node, fn, params, intro) {
    const options = { direction: 'both' };
    let config = fn(node, params, options);
    let t = intro ? 0 : 1;
    let running_program = null;
    let pending_program = null;
    let animation_name = null;
    function clear_animation() {
        if (animation_name)
            delete_rule(node, animation_name);
    }
    function init(program, duration) {
        const d = (program.b - t);
        duration *= Math.abs(d);
        return {
            a: t,
            b: program.b,
            d,
            duration,
            start: program.start,
            end: program.start + duration,
            group: program.group
        };
    }
    function go(b) {
        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
        const program = {
            start: now() + delay,
            b
        };
        if (!b) {
            // @ts-ignore todo: improve typings
            program.group = outros;
            outros.r += 1;
        }
        if (running_program || pending_program) {
            pending_program = program;
        }
        else {
            // if this is an intro, and there's a delay, we need to do
            // an initial tick and/or apply CSS animation immediately
            if (css) {
                clear_animation();
                animation_name = create_rule(node, t, b, duration, delay, easing, css);
            }
            if (b)
                tick(0, 1);
            running_program = init(program, duration);
            add_render_callback(() => dispatch(node, b, 'start'));
            loop(now => {
                if (pending_program && now > pending_program.start) {
                    running_program = init(pending_program, duration);
                    pending_program = null;
                    dispatch(node, running_program.b, 'start');
                    if (css) {
                        clear_animation();
                        animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                    }
                }
                if (running_program) {
                    if (now >= running_program.end) {
                        tick(t = running_program.b, 1 - t);
                        dispatch(node, running_program.b, 'end');
                        if (!pending_program) {
                            // we're done
                            if (running_program.b) {
                                // intro — we can tidy up immediately
                                clear_animation();
                            }
                            else {
                                // outro — needs to be coordinated
                                if (!--running_program.group.r)
                                    run_all(running_program.group.c);
                            }
                        }
                        running_program = null;
                    }
                    else if (now >= running_program.start) {
                        const p = now - running_program.start;
                        t = running_program.a + running_program.d * easing(p / running_program.duration);
                        tick(t, 1 - t);
                    }
                }
                return !!(running_program || pending_program);
            });
        }
    }
    return {
        run(b) {
            if (is_function(config)) {
                wait().then(() => {
                    // @ts-ignore
                    config = config(options);
                    go(b);
                });
            }
            else {
                go(b);
            }
        },
        end() {
            clear_animation();
            running_program = pending_program = null;
        }
    };
}

function destroy_block(block, lookup) {
    block.d(1);
    lookup.delete(block.key);
}
function outro_and_destroy_block(block, lookup) {
    transition_out(block, 1, 1, () => {
        lookup.delete(block.key);
    });
}
function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
    let o = old_blocks.length;
    let n = list.length;
    let i = o;
    const old_indexes = {};
    while (i--)
        old_indexes[old_blocks[i].key] = i;
    const new_blocks = [];
    const new_lookup = new Map();
    const deltas = new Map();
    i = n;
    while (i--) {
        const child_ctx = get_context(ctx, list, i);
        const key = get_key(child_ctx);
        let block = lookup.get(key);
        if (!block) {
            block = create_each_block(key, child_ctx);
            block.c();
        }
        else if (dynamic) {
            block.p(child_ctx, dirty);
        }
        new_lookup.set(key, new_blocks[i] = block);
        if (key in old_indexes)
            deltas.set(key, Math.abs(i - old_indexes[key]));
    }
    const will_move = new Set();
    const did_move = new Set();
    function insert(block) {
        transition_in(block, 1);
        block.m(node, next);
        lookup.set(block.key, block);
        next = block.first;
        n--;
    }
    while (o && n) {
        const new_block = new_blocks[n - 1];
        const old_block = old_blocks[o - 1];
        const new_key = new_block.key;
        const old_key = old_block.key;
        if (new_block === old_block) {
            // do nothing
            next = new_block.first;
            o--;
            n--;
        }
        else if (!new_lookup.has(old_key)) {
            // remove old block
            destroy(old_block, lookup);
            o--;
        }
        else if (!lookup.has(new_key) || will_move.has(new_key)) {
            insert(new_block);
        }
        else if (did_move.has(old_key)) {
            o--;
        }
        else if (deltas.get(new_key) > deltas.get(old_key)) {
            did_move.add(new_key);
            insert(new_block);
        }
        else {
            will_move.add(old_key);
            o--;
        }
    }
    while (o--) {
        const old_block = old_blocks[o];
        if (!new_lookup.has(old_block.key))
            destroy(old_block, lookup);
    }
    while (n)
        insert(new_blocks[n - 1]);
    return new_blocks;
}

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}
function get_spread_object(spread_props) {
    return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
}

function bind$1(component, name, callback, value) {
    const index = component.$$.props[name];
    if (index !== undefined) {
        component.$$.bound[index] = callback;
        if (value === undefined) {
            callback(component.$$.ctx[index]);
        }
    }
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
            // if the component was destroyed immediately
            // it will update the `$$.on_destroy` reference to `null`.
            // the destructured on_destroy may still reference to the old array
            if (component.$$.on_destroy) {
                component.$$.on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: [],
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false,
        root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        if (!is_function(callback)) {
            return noop;
        }
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

/**
 * Provides common object manipulation utilities including depth traversal, obtaining accessors, safely setting values /
 * equality tests, and validation.
 */

const s_TAG_OBJECT = '[object Object]';

/**
 * Recursively deep merges all source objects into the target object in place. Like `Object.assign` if you provide `{}`
 * as the target a copy is produced. If the target and source property are object literals they are merged.
 * Deleting keys is supported by specifying a property starting with `-=`.
 *
 * @param {object}      target - Target object.
 *
 * @param {...object}   sourceObj - One or more source objects.
 *
 * @returns {object}    Target object.
 */
function deepMerge(target = {}, ...sourceObj)
{
   if (Object.prototype.toString.call(target) !== s_TAG_OBJECT)
   {
      throw new TypeError(`deepMerge error: 'target' is not an 'object'.`);
   }

   for (let cntr = 0; cntr < sourceObj.length; cntr++)
   {
      if (Object.prototype.toString.call(sourceObj[cntr]) !== s_TAG_OBJECT)
      {
         throw new TypeError(`deepMerge error: 'sourceObj[${cntr}]' is not an 'object'.`);
      }
   }

   return _deepMerge(target, ...sourceObj);
}

/**
 * Tests for whether an object is iterable.
 *
 * @param {*} value - Any value.
 *
 * @returns {boolean} Whether object is iterable.
 */
function isIterable(value)
{
   if (value === null || value === void 0 || typeof value !== 'object') { return false; }

   return typeof value[Symbol.iterator] === 'function';
}

/**
 * Tests for whether object is not null and a typeof object.
 *
 * @param {*} value - Any value.
 *
 * @returns {boolean} Is it an object.
 */
function isObject(value)
{
   return value !== null && typeof value === 'object';
}

/**
 * Tests for whether the given value is a plain object.
 *
 * An object is plain if it is created by either: {}, new Object() or Object.create(null).
 *
 * @param {*} value - Any value
 *
 * @returns {boolean} Is it a plain object.
 */
function isPlainObject(value)
{
   if (Object.prototype.toString.call(value) !== s_TAG_OBJECT) { return false; }

   const prototype = Object.getPrototypeOf(value);
   return prototype === null || prototype === Object.prototype;
}

/**
 * Provides a way to safely access an objects data / entries given an accessor string which describes the
 * entries to walk. To access deeper entries into the object format the accessor string with `.` between entries
 * to walk.
 *
 * @param {object}   data - An object to access entry data.
 *
 * @param {string}   accessor - A string describing the entries to access.
 *
 * @param {*}        defaultValue - (Optional) A default value to return if an entry for accessor is not found.
 *
 * @returns {object} The data object.
 */
function safeAccess(data, accessor, defaultValue = void 0)
{
   if (typeof data !== 'object') { return defaultValue; }
   if (typeof accessor !== 'string') { return defaultValue; }

   const access = accessor.split('.');

   // Walk through the given object by the accessor indexes.
   for (let cntr = 0; cntr < access.length; cntr++)
   {
      // If the next level of object access is undefined or null then return the empty string.
      if (typeof data[access[cntr]] === 'undefined' || data[access[cntr]] === null) { return defaultValue; }

      data = data[access[cntr]];
   }

   return data;
}

/**
 * Provides a way to safely set an objects data / entries given an accessor string which describes the
 * entries to walk. To access deeper entries into the object format the accessor string with `.` between entries
 * to walk.
 *
 * @param {object}   data - An object to access entry data.
 *
 * @param {string}   accessor - A string describing the entries to access.
 *
 * @param {*}        value - A new value to set if an entry for accessor is found.
 *
 * @param {string}   [operation='set'] - Operation to perform including: 'add', 'div', 'mult', 'set',
 *                                       'set-undefined', 'sub'.
 *
 * @param {boolean}  [createMissing=true] - If true missing accessor entries will be created as objects
 *                                          automatically.
 *
 * @returns {boolean} True if successful.
 */
function safeSet(data, accessor, value, operation = 'set', createMissing = true)
{
   if (typeof data !== 'object') { throw new TypeError(`safeSet Error: 'data' is not an 'object'.`); }
   if (typeof accessor !== 'string') { throw new TypeError(`safeSet Error: 'accessor' is not a 'string'.`); }

   const access = accessor.split('.');

   // Walk through the given object by the accessor indexes.
   for (let cntr = 0; cntr < access.length; cntr++)
   {
      // If data is an array perform validation that the accessor is a positive integer otherwise quit.
      if (Array.isArray(data))
      {
         const number = (+access[cntr]);

         if (!Number.isInteger(number) || number < 0) { return false; }
      }

      if (cntr === access.length - 1)
      {
         switch (operation)
         {
            case 'add':
               data[access[cntr]] += value;
               break;

            case 'div':
               data[access[cntr]] /= value;
               break;

            case 'mult':
               data[access[cntr]] *= value;
               break;

            case 'set':
               data[access[cntr]] = value;
               break;

            case 'set-undefined':
               if (typeof data[access[cntr]] === 'undefined') { data[access[cntr]] = value; }
               break;

            case 'sub':
               data[access[cntr]] -= value;
               break;
         }
      }
      else
      {
         // If createMissing is true and the next level of object access is undefined then create a new object entry.
         if (createMissing && typeof data[access[cntr]] === 'undefined') { data[access[cntr]] = {}; }

         // Abort if the next level is null or not an object and containing a value.
         if (data[access[cntr]] === null || typeof data[access[cntr]] !== 'object') { return false; }

         data = data[access[cntr]];
      }
   }

   return true;
}

/**
 * Internal implementation for `deepMerge`.
 *
 * @param {object}      target - Target object.
 *
 * @param {...object}   sourceObj - One or more source objects.
 *
 * @returns {object}    Target object.
 */
function _deepMerge(target = {}, ...sourceObj)
{
   // Iterate and merge all source objects into target.
   for (let cntr = 0; cntr < sourceObj.length; cntr++)
   {
      const obj = sourceObj[cntr];

      for (const prop in obj)
      {
         if (Object.prototype.hasOwnProperty.call(obj, prop))
         {
            // Handle the special property starting with '-=' to delete keys.
            if (prop.startsWith('-='))
            {
               delete target[prop.slice(2)];
               continue;
            }

            // If target already has prop and both target[prop] and obj[prop] are object literals then merge them
            // otherwise assign obj[prop] to target[prop].
            target[prop] = Object.prototype.hasOwnProperty.call(target, prop) && target[prop]?.constructor === Object &&
            obj[prop]?.constructor === Object ? _deepMerge({}, target[prop], obj[prop]) : obj[prop];
         }
      }
   }

   return target;
}

/**
 * Provides several helpful utility methods for accessibility and keyboard navigation.
 */
class A11yHelper
{
   /**
    * Returns first focusable element within a specified element.
    *
    * @param {HTMLElement|Document} [element=document] - Optional element to start query.
    *
    * @param {object} [options] - Iterable list of classes to ignore elements.
    *
    * @param {Iterable<string>} [options.ignoreClasses] - Iterable list of classes to ignore elements.
    *
    * @param {Set<HTMLElement>} [options.ignoreElements] - Set of elements to ignore.
    *
    * @returns {HTMLElement} First focusable child element
    */
   static getFirstFocusableElement(element = document, options)
   {
      const focusableElements = this.getFocusableElements(element, options);

      return focusableElements.length > 0 ? focusableElements[0] : void 0;
   }

   /**
    * Returns all focusable elements within a specified element.
    *
    * @param {HTMLElement|Document} [element=document] Optional element to start query.
    *
    * @param {object} [options] - Iterable list of classes to ignore elements.
    *
    * @param {Iterable<string>} [options.ignoreClasses] - Iterable list of classes to ignore elements.
    *
    * @param {Set<HTMLElement>} [options.ignoreElements] - Set of elements to ignore.
    *
    * @returns {Array<HTMLElement>} Child keyboard focusable
    */
   static getFocusableElements(element = document, { ignoreClasses, ignoreElements } = {})
   {
      if (!(element instanceof HTMLElement) && !(element instanceof Document))
      {
         throw new TypeError(`'element' is not a HTMLElement or Document instance.`);
      }

      if (ignoreClasses !== void 0 && !isIterable(ignoreClasses))
      {
         throw new TypeError(`'ignoreClasses' is not an iterable list.`);
      }

      if (ignoreElements !== void 0 && !(ignoreElements instanceof Set))
      {
         throw new TypeError(`'ignoreElements' is not a Set.`);
      }

      const allElements = [...element.querySelectorAll(
       'a[href], button, details, embed, iframe, input, object, select, textarea, [tabindex]:not([tabindex="-1"])')];

      if (ignoreElements && ignoreClasses)
      {
         return allElements.filter((el) => {
            let hasIgnoreClass = false;
            for (const ignoreClass of ignoreClasses)
            {
               if (el.classList.contains(ignoreClass))
               {
                  hasIgnoreClass = true;
                  break;
               }
            }

            return !hasIgnoreClass && !ignoreElements.has(el) && el.style.display !== 'none' &&
             el.style.visibility !== 'hidden' && !el.hasAttribute('disabled') &&
              el.getAttribute('aria-hidden') !== 'true';
         });
      }
      else if (ignoreClasses)
      {
         return allElements.filter((el) => {
            let hasIgnoreClass = false;
            for (const ignoreClass of ignoreClasses)
            {
               if (el.classList.contains(ignoreClass))
               {
                  hasIgnoreClass = true;
                  break;
               }
            }

            return !hasIgnoreClass && el.style.display !== 'none' && el.style.visibility !== 'hidden' &&
             !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true';
         });
      }
      else if (ignoreElements)
      {
         return allElements.filter((el) => {
            return !ignoreElements.has(el) && el.style.display !== 'none' && el.style.visibility !== 'hidden' &&
             !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true';
         });
      }
      else
      {
         return allElements.filter((el) => {
            return el.style.display !== 'none' && el.style.visibility !== 'hidden' && !el.hasAttribute('disabled') &&
             el.getAttribute('aria-hidden') !== 'true';
         });
      }
   }

   /**
    * Returns first focusable element within a specified element.
    *
    * @param {HTMLElement|Document} [element=document] - Optional element to start query.
    *
    * @param {object} [options] - Iterable list of classes to ignore elements.
    *
    * @param {Iterable<string>} [options.ignoreClasses] - Iterable list of classes to ignore elements.
    *
    * @param {Set<HTMLElement>} [options.ignoreElements] - Set of elements to ignore.
    *
    * @returns {HTMLElement} First focusable child element
    */
   static getLastFocusableElement(element = document, options)
   {
      const focusableElements = this.getFocusableElements(element, options);

      return focusableElements.length > 0 ? focusableElements[focusableElements.length - 1] : void 0;
   }
}

/**
 * Provides access to the Clipboard API for reading / writing text strings. This requires a secure context.
 *
 * Note: `writeText` will attempt to use the older `execCommand` if available when `navigator.clipboard` is not
 * available.
 */
class ClipboardAccess
{
   /**
    * Uses `navigator.clipboard` if available to read text from the clipboard.
    *
    * Note: Always returns `undefined` when `navigator.clipboard` is not available or the clipboard contains the
    * empty string.
    *
    * @returns {Promise<string|undefined>} The current clipboard text or undefined.
    */
   static async readText()
   {
      let result;

      if (globalThis?.navigator?.clipboard)
      {
         try
         {
            result = await globalThis.navigator.clipboard.readText();
         }
         catch (err) { /**/ }
      }

      return result === '' ? void 0 : result;
   }

   /**
    * Uses `navigator.clipboard` if available then falls back to `document.execCommand('copy')` if available to copy
    * the given text to the clipboard.
    *
    * @param {string}   text - Text to copy to the browser clipboard.
    *
    * @returns {Promise<boolean>} Copy successful.
    */
   static async writeText(text)
   {
      if (typeof text !== 'string')
      {
         throw new TypeError(`ClipboardAccess.writeText error: 'text' is not a string.`);
      }

      let success = false;

      if (globalThis?.navigator?.clipboard)
      {
         try
         {
            await globalThis.navigator.clipboard.writeText(text);
            success = true;
         }
         catch (err) { /**/ }
      }
      else if (globalThis?.document?.execCommand instanceof Function)
      {
         const textArea = globalThis.document.createElement('textarea');

         // Place in the top-left corner of screen regardless of scroll position.
         textArea.style.position = 'fixed';
         textArea.style.top = '0';
         textArea.style.left = '0';

         // Ensure it has a small width and height. Setting to 1px / 1em
         // doesn't work as this gives a negative w/h on some browsers.
         textArea.style.width = '2em';
         textArea.style.height = '2em';

         // We don't need padding, reducing the size if it does flash render.
         textArea.style.padding = '0';

         // Clean up any borders.
         textArea.style.border = 'none';
         textArea.style.outline = 'none';
         textArea.style.boxShadow = 'none';

         // Avoid flash of the white box if rendered for any reason.
         textArea.style.background = 'transparent';

         textArea.value = text;

         globalThis.document.body.appendChild(textArea);
         textArea.focus();
         textArea.select();

         try
         {
            success = document.execCommand('copy');
         }
         catch (err) { /**/ }

         document.body.removeChild(textArea);
      }

      return success;
   }
}

/**
 * Recursive function that finds the closest parent stacking context.
 * See also https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Positioning/Understanding_z_index/The_stacking_context
 *
 * Original author: Kerry Liu / https://github.com/gwwar
 *
 * @see https://github.com/gwwar/z-context/blob/master/content-script.js
 * @see https://github.com/gwwar/z-context/blob/master/LICENSE
 *
 * @param {Element} node -
 *
 * @returns {StackingContext} The closest parent stacking context
 */
function getStackingContext(node)
{
   // the root element (HTML).
   if (!node || node.nodeName === 'HTML')
   {
      return { node: document.documentElement, reason: 'root' };
   }

   // handle shadow root elements.
   if (node.nodeName === '#document-fragment')
   {
      return getStackingContext(node.host);
   }

   const computedStyle = globalThis.getComputedStyle(node);

   // position: fixed or sticky.
   if (computedStyle.position === 'fixed' || computedStyle.position === 'sticky')
   {
      return { node, reason: `position: ${computedStyle.position}` };
   }

   // positioned (absolutely or relatively) with a z-index value other than "auto".
   if (computedStyle.zIndex !== 'auto' && computedStyle.position !== 'static')
   {
      return { node, reason: `position: ${computedStyle.position}; z-index: ${computedStyle.zIndex}` };
   }

   // elements with an opacity value less than 1.
   if (computedStyle.opacity !== '1')
   {
      return { node, reason: `opacity: ${computedStyle.opacity}` };
   }

   // elements with a transform value other than "none".
   if (computedStyle.transform !== 'none')
   {
      return { node, reason: `transform: ${computedStyle.transform}` };
   }

   // elements with a mix-blend-mode value other than "normal".
   if (computedStyle.mixBlendMode !== 'normal')
   {
      return { node, reason: `mixBlendMode: ${computedStyle.mixBlendMode}` };
   }

   // elements with a filter value other than "none".
   if (computedStyle.filter !== 'none')
   {
      return { node, reason: `filter: ${computedStyle.filter}` };
   }

   // elements with a perspective value other than "none".
   if (computedStyle.perspective !== 'none')
   {
      return { node, reason: `perspective: ${computedStyle.perspective}` };
   }

   // elements with a clip-path value other than "none".
   if (computedStyle.clipPath !== 'none')
   {
      return { node, reason: `clip-path: ${computedStyle.clipPath} ` };
   }

   // elements with a mask value other than "none".
   const mask = computedStyle.mask || computedStyle.webkitMask;
   if (mask !== 'none' && mask !== undefined)
   {
      return { node, reason: `mask:  ${mask}` };
   }

   // elements with a mask-image value other than "none".
   const maskImage = computedStyle.maskImage || computedStyle.webkitMaskImage;
   if (maskImage !== 'none' && maskImage !== undefined)
   {
      return { node, reason: `mask-image: ${maskImage}` };
   }

   // elements with a mask-border value other than "none".
   const maskBorder = computedStyle.maskBorder || computedStyle.webkitMaskBorder;
   if (maskBorder !== 'none' && maskBorder !== undefined)
   {
      return { node, reason: `mask-border: ${maskBorder}` };
   }

   // elements with isolation set to "isolate".
   if (computedStyle.isolation === 'isolate')
   {
      return { node, reason: `isolation: ${computedStyle.isolation}` };
   }

   // transform or opacity in will-change even if you don't specify values for these attributes directly.
   if (computedStyle.willChange === 'transform' || computedStyle.willChange === 'opacity')
   {
      return { node, reason: `willChange: ${computedStyle.willChange}` };
   }

   // elements with -webkit-overflow-scrolling set to "touch".
   if (computedStyle.webkitOverflowScrolling === 'touch')
   {
      return { node, reason: '-webkit-overflow-scrolling: touch' };
   }

   // an item with a z-index value other than "auto".
   if (computedStyle.zIndex !== 'auto')
   {
      const parentStyle = globalThis.getComputedStyle(node.parentNode);
      // with a flex|inline-flex parent.
      if (parentStyle.display === 'flex' || parentStyle.display === 'inline-flex')
      {
         return { node, reason: `flex-item; z-index: ${computedStyle.zIndex}` };
         // with a grid parent.
      }
      else if (parentStyle.grid !== 'none / none / none / row / auto / auto')
      {
         return { node, reason: `child of grid container; z-index: ${computedStyle.zIndex}` };
      }
   }

   // contain with a value of layout, or paint, or a composite value that includes either of them
   const contain = computedStyle.contain;
   if (['layout', 'paint', 'strict', 'content'].indexOf(contain) > -1 ||
    contain.indexOf('paint') > -1 ||
    contain.indexOf('layout') > -1
   )
   {
      return { node, reason: `contain: ${contain}` };
   }

   return getStackingContext(node.parentNode);
}

/**
 * @typedef {object} StackingContext
 *
 * @property {Element} node - A DOM Element.
 *
 * @property {string}  reason - Reason for why a stacking context was created.
 */

/**
 * First pass at a system to create a unique style sheet for the UI library that loads default values for all CSS
 * variables.
 */
class StyleManager
{
   /** @type {string} */
   #docKey;

   /** @type {string} */
   #selector;

   /** @type {HTMLStyleElement} */
   #styleElement;

   /** @type {CSSStyleRule} */
   #cssRule;

   /**
    *
    * @param {object}   opts - Options.
    *
    * @param {string}   opts.docKey - Required key providing a link to a specific style sheet element.
    *
    * @param {string}   [opts.selector=:root] - Selector element.
    *
    * @param {Document} [opts.document] - Target document to load styles into.
    *
    */
   constructor({ docKey, selector = ':root', document = globalThis.document } = {})
   {
      if (typeof selector !== 'string') { throw new TypeError(`StyleManager error: 'selector' is not a string.`); }
      if (typeof docKey !== 'string') { throw new TypeError(`StyleManager error: 'docKey' is not a string.`); }

      this.#selector = selector;
      this.#docKey = docKey;

      if (document[this.#docKey] === void 0)
      {
         this.#styleElement = document.createElement('style');

         document.head.append(this.#styleElement);

         this.#styleElement.sheet.insertRule(`${selector} {}`, 0);

         this.#cssRule = this.#styleElement.sheet.cssRules[0];

         document[docKey] = this.#styleElement;
      }
      else
      {
         this.#styleElement = document[docKey];
         this.#cssRule = this.#styleElement.sheet.cssRules[0];
      }
   }

   /**
    * Provides an accessor to get the `cssText` for the style sheet.
    *
    * @returns {string}
    */
   get cssText()
   {
      return this.#cssRule.style.cssText;
   }

   /**
    * Provides a copy constructor to duplicate an existing StyleManager instance into a new document.
    *
    * Note: This is used to support the `PopOut` module.
    *
    * @param [document] Target browser document to clone into.
    *
    * @returns {StyleManager} New style manager instance.
    */
   clone(document = globalThis.document)
   {
      const newStyleManager = new StyleManager({ selector: this.#selector, docKey: this.#docKey, document });

      newStyleManager.#cssRule.style.cssText = this.#cssRule.style.cssText;

      return newStyleManager;
   }

   get()
   {
      const cssText = this.#cssRule.style.cssText;

      const result = {};

      if (cssText !== '')
      {
         for (const entry of cssText.split(';'))
         {
            if (entry !== '')
            {
               const values = entry.split(':');
               result[values[0].trim()] = values[1];
            }
         }
      }

      return result;
   }

   /**
    * Gets a particular CSS variable.
    *
    * @param {string}   key - CSS variable property key.
    *
    * @returns {string} Returns CSS variable value.
    */
   getProperty(key)
   {
      return this.#cssRule.style.getPropertyValue(key);
   }

   /**
    * Set rules by property / value; useful for CSS variables.
    *
    * @param {Object<string, string>}  rules - An object with property / value string pairs to load.
    *
    * @param {boolean}                 [overwrite=true] - When true overwrites any existing values.
    */
   setProperties(rules, overwrite = true)
   {
      if (overwrite)
      {
         for (const [key, value] of Object.entries(rules))
         {
            this.#cssRule.style.setProperty(key, value);
         }
      }
      else
      {
         // Only set property keys for entries that don't have an existing rule set.
         for (const [key, value] of Object.entries(rules))
         {
            if (this.#cssRule.style.getPropertyValue(key) === '')
            {
               this.#cssRule.style.setProperty(key, value);
            }
         }
      }
   }

   /**
    * Sets a particular property.
    *
    * @param {string}   key - CSS variable property key.
    *
    * @param {string}   value - CSS variable value.
    *
    * @param {boolean}  [overwrite=true] - Overwrite any existing value.
    */
   setProperty(key, value, overwrite = true)
   {
      if (overwrite)
      {
         this.#cssRule.style.setProperty(key, value);
      }
      else
      {
         if (this.#cssRule.style.getPropertyValue(key) === '')
         {
            this.#cssRule.style.setProperty(key, value);
         }
      }
   }

   /**
    * Removes the property keys specified. If `keys` is a string a single property is removed. Or if `keys` is an
    * iterable list then all property keys in the list are removed.
    *
    * @param {string|Iterable<string>} keys - The property keys to remove.
    */
   removeProperties(keys)
   {
      if (isIterable(keys))
      {
         for (const key of keys)
         {
            if (typeof key === 'string') { this.#cssRule.style.removeProperty(key); }
         }
      }
   }

   /**
    * Removes a particular CSS variable.
    *
    * @param {string}   key - CSS variable property key.
    *
    * @returns {string} CSS variable value when removed.
    */
   removeProperty(key)
   {
      return this.#cssRule.style.removeProperty(key);
   }
}

const s_REGEX = /(\d+)\s*px/;

/**
 * Parses a pixel string / computed styles. Ex. `100px` returns `100`.
 *
 * @param {string}   value - Value to parse.
 *
 * @returns {number|undefined} The integer component of a pixel string.
 */
function styleParsePixels(value)
{
   if (typeof value !== 'string') { return void 0; }

   const isPixels = s_REGEX.test(value);
   const number = parseInt(value);

   return isPixels && Number.isFinite(number) ? number : void 0;
}

/**
 * Defines the application shell contract. If Svelte components export getter / setters for the following properties
 * then that component is considered an application shell.
 *
 * @type {string[]}
 */
const applicationShellContract = ['elementRoot'];

Object.freeze(applicationShellContract);

/**
 * Provides a method to determine if the passed in object / Svelte component follows the application shell contract.
 * This involves ensuring that the accessors defined in `applicationShellContract`.
 *
 * Note: A caveat is that when using Vite in a developer build components are wrapped in a proxy / ProxyComponent that
 * defines instance accessors versus on the prototype, so the check below ensures that all accessors in the contract are
 * either available on the prototype or directly on the instance.
 *
 * @param {*}  component - Object / component to test.
 *
 * @returns {boolean} Whether the component is a ApplicationShell or TJSApplicationShell.
 */
function isApplicationShell(component)
{
   if (component === null || component === void 0) { return false; }

   let compHasContract = true;
   let protoHasContract = true;

   // Check for accessors on the instance.
   for (const accessor of applicationShellContract)
   {
      const descriptor = Object.getOwnPropertyDescriptor(component, accessor);
      if (descriptor === void 0 || descriptor.get === void 0 || descriptor.set === void 0) { compHasContract = false; }
   }

   // Get the prototype which is the parent SvelteComponent that has any getter / setters.
   const prototype = Object.getPrototypeOf(component);

   // Verify the application shell contract. If the accessors (getters / setters) are defined for
   // `applicationShellContract`.
   for (const accessor of applicationShellContract)
   {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, accessor);
      if (descriptor === void 0 || descriptor.get === void 0 || descriptor.set === void 0) { protoHasContract = false; }
   }

   return compHasContract || protoHasContract;
}

/**
 * Provides basic duck typing to determine if the provided object is a HMR ProxyComponent instance or class.
 *
 * @param {*}  comp - Data to check as a HMR proxy component.
 *
 * @returns {boolean} Whether basic duck typing succeeds.
 */
function isHMRProxy(comp)
{
   const instanceName = comp?.constructor?.name;
   if (typeof instanceName === 'string' && (instanceName.startsWith('Proxy<') || instanceName === 'ProxyComponent'))
   {
      return true;
   }

   const prototypeName = comp?.prototype?.constructor?.name;
   return typeof prototypeName === 'string' && (prototypeName.startsWith('Proxy<') ||
    prototypeName === 'ProxyComponent');
}

/**
 * Provides basic duck typing to determine if the provided function is a constructor function for a Svelte component.
 *
 * @param {*}  comp - Data to check as a Svelte component.
 *
 * @returns {boolean} Whether basic duck typing succeeds.
 */
function isSvelteComponent(comp)
{
   if (comp === null || comp === void 0 || typeof comp !== 'function') { return false; }

   // When using Vite in a developer build the SvelteComponent is wrapped in a ProxyComponent class.
   // This class doesn't define methods on the prototype, so we must check if the constructor name
   // starts with `Proxy<` as it provides the wrapped component as `Proxy<_wrapped component name_>`.
   const prototypeName = comp?.prototype?.constructor?.name;
   if (typeof prototypeName === 'string' && (prototypeName.startsWith('Proxy<') || prototypeName === 'ProxyComponent'))
   {
      return true;
   }

   return typeof window !== void 0 ?
    typeof comp.prototype.$destroy === 'function' && typeof comp.prototype.$on === 'function' : // client-side
     typeof comp.render === 'function'; // server-side
}

/**
 * Runs outro transition then destroys Svelte component.
 *
 * Workaround for https://github.com/sveltejs/svelte/issues/4056
 *
 * @param {*}  instance - A Svelte component.
 */
async function outroAndDestroy(instance)
{
   return new Promise((resolve) =>
   {
      if (instance.$$.fragment && instance.$$.fragment.o)
      {
         group_outros();
         transition_out(instance.$$.fragment, 0, 0, () =>
         {
            instance.$destroy();
            resolve();
         });
         check_outros();
      }
      else
      {
         instance.$destroy();
         resolve();
      }
   });
}

/**
 * Parses a TyphonJS Svelte config object ensuring that classes specified are Svelte components and props are set
 * correctly.
 *
 * @param {object}   config - Svelte config object.
 *
 * @param {*}        [thisArg] - `This` reference to set for invoking any props function.
 *
 * @returns {object} The processed Svelte config object.
 */
function parseSvelteConfig(config, thisArg = void 0)
{
   if (typeof config !== 'object')
   {
      throw new TypeError(`parseSvelteConfig - 'config' is not an object:\n${JSON.stringify(config)}.`);
   }

   if (!isSvelteComponent(config.class))
   {
      throw new TypeError(
       `parseSvelteConfig - 'class' is not a Svelte component constructor for config:\n${JSON.stringify(config)}.`);
   }

   if (config.hydrate !== void 0 && typeof config.hydrate !== 'boolean')
   {
      throw new TypeError(
       `parseSvelteConfig - 'hydrate' is not a boolean for config:\n${JSON.stringify(config)}.`);
   }

   if (config.intro !== void 0 && typeof config.intro !== 'boolean')
   {
      throw new TypeError(
       `parseSvelteConfig - 'intro' is not a boolean for config:\n${JSON.stringify(config)}.`);
   }

   if (config.target !== void 0 && typeof config.target !== 'string' && !(config.target instanceof HTMLElement) &&
    !(config.target instanceof ShadowRoot) && !(config.target instanceof DocumentFragment))
   {
      throw new TypeError(
       `parseSvelteConfig - 'target' is not a string, HTMLElement, ShadowRoot, or DocumentFragment for config:\n${
        JSON.stringify(config)}.`);
   }

   if (config.anchor !== void 0 && typeof config.anchor !== 'string' && !(config.anchor instanceof HTMLElement) &&
    !(config.anchor instanceof ShadowRoot) && !(config.anchor instanceof DocumentFragment))
   {
      throw new TypeError(
       `parseSvelteConfig - 'anchor' is not a string, HTMLElement, ShadowRoot, or DocumentFragment for config:\n${
        JSON.stringify(config)}.`);
   }

   if (config.context !== void 0 && typeof config.context !== 'function' && !(config.context instanceof Map) &&
    typeof config.context !== 'object')
   {
      throw new TypeError(
       `parseSvelteConfig - 'context' is not a Map, function or object for config:\n${JSON.stringify(config)}.`);
   }

   // Validate extra TyphonJS options --------------------------------------------------------------------------------

   // `selectorTarget` optionally stores a target element found in main element.
   if (config.selectorTarget !== void 0 && typeof config.selectorTarget !== 'string')
   {
      throw new TypeError(
       `parseSvelteConfig - 'selectorTarget' is not a string for config:\n${JSON.stringify(config)}.`);
   }

   // `options` stores `injectApp`, `injectEventbus`, and `selectorElement`.
   if (config.options !== void 0 && typeof config.options !== 'object')
   {
      throw new TypeError(
       `parseSvelteConfig - 'options' is not an object for config:\n${JSON.stringify(config)}.`);
   }

   // Validate TyphonJS standard options.
   if (config.options !== void 0)
   {
      if (config.options.injectApp !== void 0 && typeof config.options.injectApp !== 'boolean')
      {
         throw new TypeError(
          `parseSvelteConfig - 'options.injectApp' is not a boolean for config:\n${JSON.stringify(config)}.`);
      }

      if (config.options.injectEventbus !== void 0 && typeof config.options.injectEventbus !== 'boolean')
      {
         throw new TypeError(
          `parseSvelteConfig - 'options.injectEventbus' is not a boolean for config:\n${JSON.stringify(config)}.`);
      }

      // `selectorElement` optionally stores a main element selector to be found in a HTMLElement target.
      if (config.options.selectorElement !== void 0 && typeof config.options.selectorElement !== 'string')
      {
         throw new TypeError(
          `parseSvelteConfig - 'selectorElement' is not a string for config:\n${JSON.stringify(config)}.`);
      }
   }

   const svelteConfig = { ...config };

   // Delete extra Svelte options.
   delete svelteConfig.options;

   let externalContext = {};

   // If a context callback function is provided then invoke it with `this` being the Foundry app.
   // If an object is returned it adds the entries to external context.
   if (typeof svelteConfig.context === 'function')
   {
      const contextFunc = svelteConfig.context;
      delete svelteConfig.context;

      const result = contextFunc.call(thisArg);
      if (typeof result === 'object')
      {
         externalContext = { ...result };
      }
      else
      {
         throw new Error(`parseSvelteConfig - 'context' is a function that did not return an object for config:\n${
          JSON.stringify(config)}`);
      }
   }
   else if (svelteConfig.context instanceof Map)
   {
      externalContext = Object.fromEntries(svelteConfig.context);
      delete svelteConfig.context;
   }
   else if (typeof svelteConfig.context === 'object')
   {
      externalContext = svelteConfig.context;
      delete svelteConfig.context;
   }

   // If a props is a function then invoke it with `this` being the Foundry app.
   // If an object is returned set it as the props.
   svelteConfig.props = s_PROCESS_PROPS(svelteConfig.props, thisArg, config);

   // Process children components attaching to external context.
   if (Array.isArray(svelteConfig.children))
   {
      const children = [];

      for (let cntr = 0; cntr < svelteConfig.children.length; cntr++)
      {
         const child = svelteConfig.children[cntr];

         if (!isSvelteComponent(child.class))
         {
            throw new Error(`parseSvelteConfig - 'class' is not a Svelte component for child[${cntr}] for config:\n${
             JSON.stringify(config)}`);
         }

         child.props = s_PROCESS_PROPS(child.props, thisArg, config);

         children.push(child);
      }

      if (children.length > 0)
      {
         externalContext.children = children;
      }

      delete svelteConfig.children;
   }
   else if (typeof svelteConfig.children === 'object')
   {
      if (!isSvelteComponent(svelteConfig.children.class))
      {
         throw new Error(`parseSvelteConfig - 'class' is not a Svelte component for children object for config:\n${
          JSON.stringify(config)}`);
      }

      svelteConfig.children.props = s_PROCESS_PROPS(svelteConfig.children.props, thisArg, config);

      externalContext.children = [svelteConfig.children];
      delete svelteConfig.children;
   }

   if (!(svelteConfig.context instanceof Map))
   {
      svelteConfig.context = new Map();
   }

   svelteConfig.context.set('external', externalContext);

   return svelteConfig;
}

/**
 * Processes Svelte props. Potentially props can be a function to invoke with `thisArg`.
 *
 * @param {object|Function}   props - Svelte props.
 *
 * @param {*}                 thisArg - `This` reference to set for invoking any props function.
 *
 * @param {object}            config - Svelte config
 *
 * @returns {object|void}     Svelte props.
 */
function s_PROCESS_PROPS(props, thisArg, config)
{
   // If a props is a function then invoke it with `this` being the Foundry app.
   // If an object is returned set it as the props.
   if (typeof props === 'function')
   {
      const result = props.call(thisArg);
      if (typeof result === 'object')
      {
         return result;
      }
      else
      {
         throw new Error(`parseSvelteConfig - 'props' is a function that did not return an object for config:\n${
          JSON.stringify(config)}`);
      }
   }
   else if (typeof props === 'object')
   {
      return props;
   }
   else if (props !== void 0)
   {
      throw new Error(
       `parseSvelteConfig - 'props' is not a function or an object for config:\n${JSON.stringify(config)}`);
   }

   return {};
}

/**
 * Wraps a callback in a debounced timeout.
 *
 * Delay execution of the callback function until the function has not been called for the given delay in milliseconds.
 *
 * @param {Function} callback - A function to execute once the debounced threshold has been passed.
 *
 * @param {number}   delay - An amount of time in milliseconds to delay.
 *
 * @returns {Function} A wrapped function that can be called to debounce execution.
 */
function debounce(callback, delay)
{
   let timeoutId;

   return function(...args)
   {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => { callback.apply(this, args); }, delay);
   };
}

/**
 * Provides a method to determine if the passed in Svelte component has a getter accessor.
 *
 * @param {*}        object - An object.
 *
 * @param {string}   accessor - Accessor to test.
 *
 * @returns {boolean} Whether the component has the getter for accessor.
 */
function hasGetter(object, accessor)
{
   if (object === null || object === void 0) { return false; }

   // Check for instance accessor.
   const iDescriptor = Object.getOwnPropertyDescriptor(object, accessor);
   if (iDescriptor !== void 0 && iDescriptor.get !== void 0) { return true; }

   // Walk parent prototype chain. Check for descriptor at each prototype level.
   for (let o = Object.getPrototypeOf(object); o; o = Object.getPrototypeOf(o))
   {
      const descriptor = Object.getOwnPropertyDescriptor(o, accessor);
      if (descriptor !== void 0 && descriptor.get !== void 0) { return true; }
   }

   return false;
}

const subscriber_queue = [];
/**
 * Creates a `Readable` store that allows reading by subscription.
 * @param value initial value
 * @param {StartStopNotifier}start start and stop notifications for subscriptions
 */
function readable(value, start) {
    return {
        subscribe: writable$1(value, start).subscribe
    };
}
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable$1(value, start = noop) {
    let stop;
    const subscribers = new Set();
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (const subscriber of subscribers) {
                    subscriber[1]();
                    subscriber_queue.push(subscriber, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.add(subscriber);
        if (subscribers.size === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            subscribers.delete(subscriber);
            if (subscribers.size === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}
function derived(stores, fn, initial_value) {
    const single = !Array.isArray(stores);
    const stores_array = single
        ? [stores]
        : stores;
    const auto = fn.length < 2;
    return readable(initial_value, (set) => {
        let inited = false;
        const values = [];
        let pending = 0;
        let cleanup = noop;
        const sync = () => {
            if (pending) {
                return;
            }
            cleanup();
            const result = fn(single ? values[0] : values, set);
            if (auto) {
                set(result);
            }
            else {
                cleanup = is_function(result) ? result : noop;
            }
        };
        const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
            values[i] = value;
            pending &= ~(1 << i);
            if (inited) {
                sync();
            }
        }, () => {
            pending |= (1 << i);
        }));
        inited = true;
        sync();
        return function stop() {
            run_all(unsubscribers);
            cleanup();
        };
    });
}

/**
 * Provides a readable store to track keys actively pressed. KeyStore is designed to be used with the {@link keyforward}
 * action.
 */
class KeyStore
{
   #keySet;

   /**
    * @type {Map<string, number>}
    */
   #keyMap = new Map();

   /**
    * @type {KeyStoreOptions}
    */
   #options = { preventDefault: true, useCode: true, stopPropagation: true };

   /**
    * Stores the subscribers.
    *
    * @type {(function(KeyStore): void)[]}
    */
   #subscriptions = [];

   /**
    * @param {Iterable<string>}  [keyNames] -
    *
    * @param {KeyStoreOptions}   [options] - Optional parameters
    */
   constructor(keyNames, options)
   {
      if (!isIterable(keyNames))
      {
         throw new TypeError(`'keyNames' is not an iterable list.`);
      }

      this.setOptions(options);

      this.#keySet = new Set(keyNames);
   }

   /**
    * Add given key to the tracking key set.
    *
    * @param {string}   key - Key to add.
    */
   addKey(key)
   {
      if (typeof key !== 'string') { throw new TypeError(`'key' is not a string.`); }

      this.#keySet.add(key);
   }

   /**
    * @returns {boolean} True if any keys in the key set are pressed.
    */

   /**
    * Returns true if any of given keys are pressed. If `keys` is undefined then the result is true if any keys being
    * tracked are pressed.
    *
    * @param {string|Iterable<string>|undefined} keys - Zero or more key strings or list to verify if any pressed.
    *
    * @returns {boolean} True if any keys set are pressed.
    */
   anyPressed(keys)
   {
      // When no keys given then check if any key is pressed.
      if (keys === void 0) { return this.#keyMap.size > 0; }

      const isList = isIterable(keys);

      if (typeof keys !== 'string' && !isList)
      {
         throw new TypeError(`'keys' is not a string or iterable list of strings.`);
      }

      let result = false;

      if (isList)
      {
         for (const key of keys)
         {
            if (this.#keyMap.has(key))
            {
               result = true;
               break;
            }
         }
      }
      else
      {
         if (this.#keyMap.has(keys)) { result = true; }
      }

      return result;
   }

   /**
    * Is the given key in the tracking key set.
    *
    * @param {string}   key - Key to check.
    */
   hasKey(key)
   {
      if (typeof key !== 'string') { throw new TypeError(`'key' is not a string.`); }

      this.#keySet.has(key);
   }

   /**
    * Returns true if all given keys are pressed.
    *
    * @param {string|Iterable<string>} keys - One or more key strings to verify if pressed.
    *
    * @returns {boolean} Are all keys pressed.
    */
   isPressed(keys)
   {
      const isList = isIterable(keys);

      if (typeof keys !== 'string' && !isList)
      {
         throw new TypeError(`'keys' is not a string or iterable list of strings.`);
      }

      let result = true;

      if (isList)
      {
         for (const key of keys)
         {
            if (!this.#keyMap.has(key))
            {
               result = false;
               break;
            }
         }
      }
      else
      {
         if (!this.#keyMap.has(keys)) { result = false; }
      }

      return result;
   }

   /**
    * Handle keydown event adding any key from the tracked key set.
    *
    * @param {KeyboardEvent}  event - KeyboardEvent.
    */
   keydown(event)
   {
      const key = this.#options.useCode ? event.code : event.key;

      if (this.#keySet.has(key))
      {
         if (!this.#keyMap.has(key))
         {
            this.#keyMap.set(key, 1);
            this._updateSubscribers();
         }

         if (this.#options.preventDefault) { event.preventDefault(); }
         if (this.#options.stopPropagation) { event.stopPropagation(); }
      }
   }

   /**
    * Returns current pressed keys iterator.
    *
    * @returns {IterableIterator<string>}
    */
   keysPressed()
   {
      return this.#keyMap.keys();
   }

   /**
    * Returns currently tracked keys iterator.
    *
    * @returns {IterableIterator<string>}
    */
   keysTracked()
   {
      return this.#keySet.keys();
   }

   /**
    * Handle keyup event removing any key from the tracked key set.
    *
    * @param {KeyboardEvent}  event - KeyboardEvent.
    */
   keyup(event)
   {
      const key = this.#options.useCode ? event.code : event.key;

      if (this.#keySet.has(key))
      {
         if (this.#keyMap.has(key))
         {
            this.#keyMap.delete(key);
            this._updateSubscribers();
         }

         if (this.#options.preventDefault) { event.preventDefault(); }
         if (this.#options.stopPropagation) { event.stopPropagation(); }
      }
   }

   /**
    * Remove the given key from the tracking key set.
    *
    * @param {string}   key - Key to remove.
    */
   removeKey(key)
   {
      if (typeof key !== 'string') { throw new TypeError(`'key' is not a string.`); }

      if (this.#keySet.has(key))
      {
         this.#keySet.delete(key);

         if (this.#keyMap.has(key))
         {
            this.#keyMap.delete(key);
            this._updateSubscribers();
         }
      }
   }

   /**
    * Update options.
    *
    * @param {KeyStoreOptions}   options - Options to set.
    */
   setOptions(options)
   {
      if (typeof options?.preventDefault === 'boolean') { this.#options.preventDefault = options.preventDefault; }
      if (typeof options?.useCode === 'boolean') { this.#options.useCode = options.useCode; }
      if (typeof options?.stopPropagation === 'boolean') { this.#options.stopPropagation = options.stopPropagation; }
   }

   /**
    * @param {string}   key - key or key code to lookup.
    *
    * @returns {number} 1 if currently pressed and 0 if not pressed.
    */
   value(key)
   {
      return this.#keyMap.has(key) ? 1 : 0;
   }

   // Store subscriber implementation --------------------------------------------------------------------------------

   /**
    * @param {function(KeyStore): void} handler - Callback function that is invoked on update / changes.
    *
    * @returns {(function(): void)} Unsubscribe function.
    */
   subscribe(handler)
   {
      this.#subscriptions.push(handler); // add handler to the array of subscribers

      handler(this);                     // call handler with current value

      // Return unsubscribe function.
      return () =>
      {
         const index = this.#subscriptions.findIndex((sub) => sub === handler);
         if (index >= 0) { this.#subscriptions.splice(index, 1); }
      };
   }

   /**
    * Updates subscribers.
    *
    * @protected
    */
   _updateSubscribers()
   {
      for (let cntr = 0; cntr < this.#subscriptions.length; cntr++) { this.#subscriptions[cntr](this); }
   }
}

/**
 * @typedef {object} KeyStoreOptions
 *
 * @property {boolean}  [preventDefault=true] - Invoke `preventDefault` on key events.
 *
 * @property {boolean}  [useCode=true] - When true use `event.code` otherwise use `event.key` to get active key.
 *
 * @property {boolean}  [stopPropagation=true] - Invoke `stopPropagation` on key events.
 */

// src/generator.ts
function isSimpleDeriver(deriver) {
  return deriver.length < 2;
}
function generator(storage) {
  function readable(key, value, start) {
    return {
      subscribe: writable(key, value, start).subscribe
    };
  }
  function writable(key, value, start = noop) {
    function wrap_start(ogSet) {
      return start(function wrap_set(new_value) {
        if (storage) {
          storage.setItem(key, JSON.stringify(new_value));
        }
        return ogSet(new_value);
      });
    }
    if (storage) {
      const storageValue = storage.getItem(key);
      try {
        if (storageValue) {
          value = JSON.parse(storageValue);
        }
      } catch (err) {
      }
      storage.setItem(key, JSON.stringify(value));
    }
    const ogStore = writable$1(value, start ? wrap_start : void 0);
    function set(new_value) {
      if (storage) {
        storage.setItem(key, JSON.stringify(new_value));
      }
      ogStore.set(new_value);
    }
    function update(fn) {
      set(fn(get_store_value(ogStore)));
    }
    function subscribe(run, invalidate = noop) {
      return ogStore.subscribe(run, invalidate);
    }
    return {set, update, subscribe};
  }
  function derived(key, stores, fn, initial_value) {
    const single = !Array.isArray(stores);
    const stores_array = single ? [stores] : stores;
    if (storage && storage.getItem(key)) {
      try {
        initial_value = JSON.parse(storage.getItem(key));
      } catch (err) {
      }
    }
    return readable(key, initial_value, (set) => {
      let inited = false;
      const values = [];
      let pending = 0;
      let cleanup = noop;
      const sync = () => {
        if (pending) {
          return;
        }
        cleanup();
        const input = single ? values[0] : values;
        if (isSimpleDeriver(fn)) {
          set(fn(input));
        } else {
          const result = fn(input, set);
          cleanup = is_function(result) ? result : noop;
        }
      };
      const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
        values[i] = value;
        pending &= ~(1 << i);
        if (inited) {
          sync();
        }
      }, () => {
        pending |= 1 << i;
      }));
      inited = true;
      sync();
      return function stop() {
        run_all(unsubscribers);
        cleanup();
      };
    });
  }
  return {
    readable,
    writable,
    derived,
    get: get_store_value
  };
}

// src/session.ts
var storage = typeof window !== "undefined" ? window.sessionStorage : void 0;
var g$1 = generator(storage);
var writable = g$1.writable;

class TJSSessionStorage
{
   /**
    * @type {Map<string, import('svelte/store').Writable>}
    */
   #stores = new Map();

   /**
    * Creates a new store for the given key.
    *
    * @param {string}   key - Key to lookup in stores map.
    *
    * @param {boolean}  [defaultValue] - A default value to set for the store.
    *
    * @returns {import('svelte/store').Writable} The new store.
    */
   static #createStore(key, defaultValue = void 0)
   {
      try
      {
         const value = sessionStorage.getItem(key);
         if (value !== null) { defaultValue = value === 'undefined' ? void 0 : JSON.parse(value); }
      }
      catch (err) { /**/ }

      return writable(key, defaultValue);
   }

   /**
    * Gets a store from the `stores` Map or creates a new store for the key and a given default value.
    *
    * @param {string}               key - Key to lookup in stores map.
    *
    * @param {boolean}              [defaultValue] - A default value to set for the store.
    *
    * @returns {import('svelte/store').Writable} The store for the given key.
    */
   #getStore(key, defaultValue = void 0)
   {
      let store = this.#stores.get(key);
      if (store === void 0)
      {
         store = TJSSessionStorage.#createStore(key, defaultValue);
         this.#stores.set(key, store);
      }

      return store;
   }

   /**
    * Get value from the sessionStorage.
    *
    * @param {string}   key - Key to lookup in sessionStorage.
    *
    * @param {*}        [defaultValue] - A default value to return if key not present in session storage.
    *
    * @returns {*} Value from session storage or if not defined any default value provided.
    */
   getItem(key, defaultValue)
   {
      let value = defaultValue;

      const storageValue = sessionStorage.getItem(key);

      if (storageValue !== null)
      {
         try
         {
            value = storageValue === 'undefined' ? void 0 : JSON.parse(storageValue);
         }
         catch (err)
         {
            value = defaultValue;
         }
      }
      else if (defaultValue !== void 0)
      {
         try
         {
            const newValue = JSON.stringify(defaultValue);

            // If there is no existing storage value and defaultValue is defined the storage value needs to be set.
            sessionStorage.setItem(key, newValue === 'undefined' ? void 0 : newValue);
         }
         catch (err) { /* */ }
      }

      return value;
   }

   /**
    * Returns the backing Svelte store for the given key; potentially sets a default value if the key
    * is not already set.
    *
    * @param {string}   key - Key to lookup in sessionStorage.
    *
    * @param {*}        [defaultValue] - A default value to return if key not present in session storage.
    *
    * @returns {import('svelte/store').Writable} The Svelte store for this key.
    */
   getStore(key, defaultValue)
   {
      return this.#getStore(key, defaultValue);
   }

   /**
    * Sets the value for the given key in sessionStorage.
    *
    * @param {string}   key - Key to lookup in sessionStorage.
    *
    * @param {*}        value - A value to set for this key.
    */
   setItem(key, value)
   {
      const store = this.#getStore(key);
      store.set(value);
   }

   /**
    * Convenience method to swap a boolean value stored in session storage.
    *
    * @param {string}   key - Key to lookup in sessionStorage.
    *
    * @param {boolean}  [defaultValue] - A default value to return if key not present in session storage.
    *
    * @returns {boolean} The boolean swap for the given key.
    */
   swapItemBoolean(key, defaultValue)
   {
      const store = this.#getStore(key, defaultValue);

      let currentValue = false;

      try
      {
         currentValue = !!JSON.parse(sessionStorage.getItem(key));
      }
      catch (err) { /**/ }

      const newValue = typeof currentValue === 'boolean' ? !currentValue : false;

      store.set(newValue);
      return newValue;
   }
}

/**
 * Provides a basic test for a given variable to test if it has the shape of a readable store by having a `subscribe`
 * function.
 *
 * Note: functions are also objects, so test that the variable might be a function w/ a `subscribe` function.
 *
 * @param {*}  store - variable to test that might be a store.
 *
 * @returns {boolean} Whether the variable tested has the shape of a store.
 */
function isReadableStore(store)
{
   if (store === null || store === void 0) { return false; }

   switch (typeof store)
   {
      case 'function':
      case 'object':
         return typeof store.subscribe === 'function';
   }

   return false;
}

/**
 * Provides a basic test for a given variable to test if it has the shape of a writable store by having a `subscribe`
 * `set`, and `update` functions.
 *
 * Note: functions are also objects, so test that the variable might be a function w/ `subscribe` & `set` functions.
 *
 * @param {*}  store - variable to test that might be a store.
 *
 * @returns {boolean} Whether the variable tested has the shape of a store.
 */
function isWritableStore(store)
{
   if (store === null || store === void 0) { return false; }

   switch (typeof store)
   {
      case 'function':
      case 'object':
         return typeof store.subscribe === 'function' && typeof store.set === 'function';
   }

   return false;
}

/**
 * Subscribes to the given store with the update function provided and ignores the first automatic
 * update. All future updates are dispatched to the update function.
 *
 * @param {import('svelte/store').Readable | import('svelte/store').Writable} store -
 *  Store to subscribe to...
 *
 * @param {import('svelte/store').Updater} update - function to receive future updates.
 *
 * @returns {import('svelte/store').Unsubscriber} Store unsubscribe function.
 */
function subscribeIgnoreFirst(store, update)
{
   let firedFirst = false;

   return store.subscribe((value) =>
   {
      if (!firedFirst)
      {
         firedFirst = true;
      }
      else
      {
         update(value);
      }
   });
}

/**
 * Subscribes to the given store with two update functions provided. The first function is invoked on the initial
 * subscription. All future updates are dispatched to the update function.
 *
 * @param {import('svelte/store').Readable | import('svelte/store').Writable} store -
 *  Store to subscribe to...
 *
 * @param {import('svelte/store').Updater} first - Function to receive first update.
 *
 * @param {import('svelte/store').Updater} update - Function to receive future updates.
 *
 * @returns {import('svelte/store').Unsubscriber} Store unsubscribe function.
 */
function subscribeFirstRest(store, first, update)
{
   let firedFirst = false;

   return store.subscribe((value) =>
   {
      if (!firedFirst)
      {
         firedFirst = true;
         first(value);
      }
      else
      {
         update(value);
      }
   });
}

/**
 * @external Store
 * @see [Svelte stores](https://svelte.dev/docs#component-format-script-4-prefix-stores-with-$-to-access-their-values-store-contract)
 */

/**
 * Create a store similar to [Svelte's `derived`](https://svelte.dev/docs#run-time-svelte-store-writable),
 * but which has its own `set` and `update` methods and can send values back to the origin stores.
 * [Read more...](https://github.com/PixievoltNo1/svelte-writable-derived#default-export-writablederived)
 * 
 * @param {Store|Store[]} origins One or more stores to derive from. Same as
 * [`derived`](https://svelte.dev/docs#run-time-svelte-store-writable)'s 1st parameter.
 * @param {!Function} derive The callback to determine the derived value. Same as
 * [`derived`](https://svelte.dev/docs#run-time-svelte-store-writable)'s 2nd parameter.
 * @param {!Function|{withOld: !Function}} reflect Called when the
 * derived store gets a new value via its `set` or `update` methods, and determines new values for
 * the origin stores. [Read more...](https://github.com/PixievoltNo1/svelte-writable-derived#new-parameter-reflect)
 * @param [initial] The new store's initial value. Same as
 * [`derived`](https://svelte.dev/docs#run-time-svelte-store-writable)'s 3rd parameter.
 * 
 * @returns {Store} A writable store.
 */
function writableDerived(origins, derive, reflect, initial) {
	var childDerivedSetter, originValues, blockNextDerive = false;
	var reflectOldValues = "withOld" in reflect;
	var wrappedDerive = (got, set) => {
		childDerivedSetter = set;
		if (reflectOldValues) {
			originValues = got;
		}
		if (!blockNextDerive) {
			let returned = derive(got, set);
			if (derive.length < 2) {
				set(returned);
			} else {
				return returned;
			}
		}
		blockNextDerive = false;
	};
	var childDerived = derived(origins, wrappedDerive, initial);
	
	var singleOrigin = !Array.isArray(origins);
	var sendUpstream = (setWith) => {
		if (singleOrigin) {
			blockNextDerive = true;
			origins.set(setWith);
		} else {
			setWith.forEach( (value, i) => {
				blockNextDerive = true;
				origins[i].set(value);
			} );
		}
		blockNextDerive = false;
	};
	if (reflectOldValues) {
		reflect = reflect.withOld;
	}
	var reflectIsAsync = reflect.length >= (reflectOldValues ? 3 : 2);
	var cleanup = null;
	function doReflect(reflecting) {
		if (cleanup) {
			cleanup();
			cleanup = null;
		}

		if (reflectOldValues) {
			var returned = reflect(reflecting, originValues, sendUpstream);
		} else {
			var returned = reflect(reflecting, sendUpstream);
		}
		if (reflectIsAsync) {
			if (typeof returned == "function") {
				cleanup = returned;
			}
		} else {
			sendUpstream(returned);
		}
	}
	
	var tryingSet = false;
	function update(fn) {
		var isUpdated, mutatedBySubscriptions, oldValue, newValue;
		if (tryingSet) {
			newValue = fn( get_store_value(childDerived) );
			childDerivedSetter(newValue);
			return;
		}
		var unsubscribe = childDerived.subscribe( (value) => {
			if (!tryingSet) {
				oldValue = value;
			} else if (!isUpdated) {
				isUpdated = true;
			} else {
				mutatedBySubscriptions = true;
			}
		} );
		newValue = fn(oldValue);
		tryingSet = true;
		childDerivedSetter(newValue);
		unsubscribe();
		tryingSet = false;
		if (mutatedBySubscriptions) {
			newValue = get_store_value(childDerived);
		}
		if (isUpdated) {
			doReflect(newValue);
		}
	}
	return {
		subscribe: childDerived.subscribe,
		set(value) { update( () => value ); },
		update,
	};
}

/**
 * Create a store for a property value in an object contained in another store.
 * [Read more...](https://github.com/PixievoltNo1/svelte-writable-derived#named-export-propertystore)
 * 
 * @param {Store} origin The store containing the object to get/set from.
 * @param {string|number|symbol|Array<string|number|symbol>} propName The property to get/set, or a path of
 * properties in nested objects.
 *
 * @returns {Store} A writable store.
 */
function propertyStore(origin, propName) {
	if (!Array.isArray(propName)) {
		return writableDerived(
			origin,
			(object) => object[propName],
			{ withOld(reflecting, object) {
				object[propName] = reflecting;
				return object;
			} }
		);
	} else {
		let props = propName.concat();
		return writableDerived(
			origin,
			(value) => {
				for (let i = 0; i < props.length; ++i) {
					value = value[ props[i] ];
				}
				return value;
			},
			{ withOld(reflecting, object) {
				let target = object;
				for (let i = 0; i < props.length - 1; ++i) {
					target = target[ props[i] ];
				}
				target[ props[props.length - 1] ] = reflecting;
				return object;
			} }
		);
	}
}

/**
 * @typedef TJSDocumentCollectionOptions
 *
 * @property {Function} [delete] - Optional delete function to invoke when document is deleted.
 */

const storeState = writable$1(void 0);

/**
 * @type {GameState} Provides a Svelte store wrapping the Foundry runtime / global game state.
 */
({
   subscribe: storeState.subscribe,
   get: () => game
});

Hooks.once('ready', () => storeState.set(game));

function cubicOut(t) {
    const f = t - 1.0;
    return f * f * f + 1.0;
}

/**
 * Performs linear interpolation between a start & end value by given amount between 0 - 1 inclusive.
 *
 * @param {number}   start - Start value.
 *
 * @param {number}   end - End value.
 *
 * @param {number}   amount - Current amount between 0 - 1 inclusive.
 *
 * @returns {number} Linear interpolated value between start & end.
 */
function lerp$5(start, end, amount)
{
   return (1 - amount) * start + amount * end;
}

/**
 * Converts the given number from degrees to radians.
 *
 * @param {number}   deg - Degree number to convert
 *
 * @returns {number} Degree as radians.
 */
function degToRad(deg)
{
   return deg * (Math.PI / 180.0);
}

/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON = 0.000001;
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
var RANDOM = Math.random;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * 3x3 Matrix
 * @module mat3
 */

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */

function create$6() {
  var out = new ARRAY_TYPE(9);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
  }

  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
}

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function create$5() {
  var out = new ARRAY_TYPE(16);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {ReadonlyMat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */

function clone$5(a) {
  var out = new ARRAY_TYPE(16);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function copy$5(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Create a new mat4 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m03 Component in column 0, row 3 position (index 3)
 * @param {Number} m10 Component in column 1, row 0 position (index 4)
 * @param {Number} m11 Component in column 1, row 1 position (index 5)
 * @param {Number} m12 Component in column 1, row 2 position (index 6)
 * @param {Number} m13 Component in column 1, row 3 position (index 7)
 * @param {Number} m20 Component in column 2, row 0 position (index 8)
 * @param {Number} m21 Component in column 2, row 1 position (index 9)
 * @param {Number} m22 Component in column 2, row 2 position (index 10)
 * @param {Number} m23 Component in column 2, row 3 position (index 11)
 * @param {Number} m30 Component in column 3, row 0 position (index 12)
 * @param {Number} m31 Component in column 3, row 1 position (index 13)
 * @param {Number} m32 Component in column 3, row 2 position (index 14)
 * @param {Number} m33 Component in column 3, row 3 position (index 15)
 * @returns {mat4} A new mat4
 */

function fromValues$5(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
  var out = new ARRAY_TYPE(16);
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m03;
  out[4] = m10;
  out[5] = m11;
  out[6] = m12;
  out[7] = m13;
  out[8] = m20;
  out[9] = m21;
  out[10] = m22;
  out[11] = m23;
  out[12] = m30;
  out[13] = m31;
  out[14] = m32;
  out[15] = m33;
  return out;
}
/**
 * Set the components of a mat4 to the given values
 *
 * @param {mat4} out the receiving matrix
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m03 Component in column 0, row 3 position (index 3)
 * @param {Number} m10 Component in column 1, row 0 position (index 4)
 * @param {Number} m11 Component in column 1, row 1 position (index 5)
 * @param {Number} m12 Component in column 1, row 2 position (index 6)
 * @param {Number} m13 Component in column 1, row 3 position (index 7)
 * @param {Number} m20 Component in column 2, row 0 position (index 8)
 * @param {Number} m21 Component in column 2, row 1 position (index 9)
 * @param {Number} m22 Component in column 2, row 2 position (index 10)
 * @param {Number} m23 Component in column 2, row 3 position (index 11)
 * @param {Number} m30 Component in column 3, row 0 position (index 12)
 * @param {Number} m31 Component in column 3, row 1 position (index 13)
 * @param {Number} m32 Component in column 3, row 2 position (index 14)
 * @param {Number} m33 Component in column 3, row 3 position (index 15)
 * @returns {mat4} out
 */

function set$5(out, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m03;
  out[4] = m10;
  out[5] = m11;
  out[6] = m12;
  out[7] = m13;
  out[8] = m20;
  out[9] = m21;
  out[10] = m22;
  out[11] = m23;
  out[12] = m30;
  out[13] = m31;
  out[14] = m32;
  out[15] = m33;
  return out;
}
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */

function identity$2(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function transpose(out, a) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if (out === a) {
    var a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    var a12 = a[6],
        a13 = a[7];
    var a23 = a[11];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a01;
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a02;
    out[9] = a12;
    out[11] = a[14];
    out[12] = a03;
    out[13] = a13;
    out[14] = a23;
  } else {
    out[0] = a[0];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a[1];
    out[5] = a[5];
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a[2];
    out[9] = a[6];
    out[10] = a[10];
    out[11] = a[14];
    out[12] = a[3];
    out[13] = a[7];
    out[14] = a[11];
    out[15] = a[15];
  }

  return out;
}
/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function invert$2(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function adjoint(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  out[0] = a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22);
  out[1] = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
  out[2] = a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12);
  out[3] = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
  out[4] = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
  out[5] = a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22);
  out[6] = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
  out[7] = a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12);
  out[8] = a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21);
  out[9] = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
  out[10] = a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11);
  out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
  out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
  out[13] = a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21);
  out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
  out[15] = a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11);
  return out;
}
/**
 * Calculates the determinant of a mat4
 *
 * @param {ReadonlyMat4} a the source matrix
 * @returns {Number} determinant of a
 */

function determinant(a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply$5(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {mat4} out
 */

function translate$1(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {ReadonlyVec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/

function scale$5(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Rotates a mat4 by the given angle around the given axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function rotate$1(out, a, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  var b00, b01, b02;
  var b10, b11, b12;
  var b20, b21, b22;

  if (len < EPSILON) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  a00 = a[0];
  a01 = a[1];
  a02 = a[2];
  a03 = a[3];
  a10 = a[4];
  a11 = a[5];
  a12 = a[6];
  a13 = a[7];
  a20 = a[8];
  a21 = a[9];
  a22 = a[10];
  a23 = a[11]; // Construct the elements of the rotation matrix

  b00 = x * x * t + c;
  b01 = y * x * t + z * s;
  b02 = z * x * t - y * s;
  b10 = x * y * t - z * s;
  b11 = y * y * t + c;
  b12 = z * y * t + x * s;
  b20 = x * z * t + y * s;
  b21 = y * z * t - x * s;
  b22 = z * z * t + c; // Perform rotation-specific matrix multiplication

  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22;

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  return out;
}
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateX$3(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateY$3(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateZ$3(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, dest, vec);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {ReadonlyVec3} v Translation vector
 * @returns {mat4} out
 */

function fromTranslation$1(out, v) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.scale(dest, dest, vec);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {ReadonlyVec3} v Scaling vector
 * @returns {mat4} out
 */

function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = v[1];
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = v[2];
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a given angle around a given axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotate(dest, dest, rad, axis);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function fromRotation$1(out, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;

  if (len < EPSILON) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c; // Perform rotation-specific matrix multiplication

  out[0] = x * x * t + c;
  out[1] = y * x * t + z * s;
  out[2] = z * x * t - y * s;
  out[3] = 0;
  out[4] = x * y * t - z * s;
  out[5] = y * y * t + c;
  out[6] = z * y * t + x * s;
  out[7] = 0;
  out[8] = x * z * t + y * s;
  out[9] = y * z * t - x * s;
  out[10] = z * z * t + c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the X axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateX(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function fromXRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = c;
  out[6] = s;
  out[7] = 0;
  out[8] = 0;
  out[9] = -s;
  out[10] = c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the Y axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateY(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function fromYRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = c;
  out[1] = 0;
  out[2] = -s;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = s;
  out[9] = 0;
  out[10] = c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the Z axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateZ(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function fromZRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = c;
  out[1] = s;
  out[2] = 0;
  out[3] = 0;
  out[4] = -s;
  out[5] = c;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @returns {mat4} out
 */

function fromRotationTranslation$1(out, q, v) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - (yy + zz);
  out[1] = xy + wz;
  out[2] = xz - wy;
  out[3] = 0;
  out[4] = xy - wz;
  out[5] = 1 - (xx + zz);
  out[6] = yz + wx;
  out[7] = 0;
  out[8] = xz + wy;
  out[9] = yz - wx;
  out[10] = 1 - (xx + yy);
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 from a dual quat.
 *
 * @param {mat4} out Matrix
 * @param {ReadonlyQuat2} a Dual Quaternion
 * @returns {mat4} mat4 receiving operation result
 */

function fromQuat2(out, a) {
  var translation = new ARRAY_TYPE(3);
  var bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3],
      ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7];
  var magnitude = bx * bx + by * by + bz * bz + bw * bw; //Only scale if it makes sense

  if (magnitude > 0) {
    translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2 / magnitude;
    translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2 / magnitude;
    translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2 / magnitude;
  } else {
    translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
    translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
    translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
  }

  fromRotationTranslation$1(out, a, translation);
  return out;
}
/**
 * Returns the translation vector component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslation,
 *  the returned vector will be the same as the translation vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive translation component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getTranslation$1(out, mat) {
  out[0] = mat[12];
  out[1] = mat[13];
  out[2] = mat[14];
  return out;
}
/**
 * Returns the scaling factor component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslationScale
 *  with a normalized Quaternion paramter, the returned vector will be
 *  the same as the scaling vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive scaling factor component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getScaling(out, mat) {
  var m11 = mat[0];
  var m12 = mat[1];
  var m13 = mat[2];
  var m21 = mat[4];
  var m22 = mat[5];
  var m23 = mat[6];
  var m31 = mat[8];
  var m32 = mat[9];
  var m33 = mat[10];
  out[0] = Math.hypot(m11, m12, m13);
  out[1] = Math.hypot(m21, m22, m23);
  out[2] = Math.hypot(m31, m32, m33);
  return out;
}
/**
 * Returns a quaternion representing the rotational component
 *  of a transformation matrix. If a matrix is built with
 *  fromRotationTranslation, the returned quaternion will be the
 *  same as the quaternion originally supplied.
 * @param {quat} out Quaternion to receive the rotation component
 * @param {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {quat} out
 */

function getRotation(out, mat) {
  var scaling = new ARRAY_TYPE(3);
  getScaling(scaling, mat);
  var is1 = 1 / scaling[0];
  var is2 = 1 / scaling[1];
  var is3 = 1 / scaling[2];
  var sm11 = mat[0] * is1;
  var sm12 = mat[1] * is2;
  var sm13 = mat[2] * is3;
  var sm21 = mat[4] * is1;
  var sm22 = mat[5] * is2;
  var sm23 = mat[6] * is3;
  var sm31 = mat[8] * is1;
  var sm32 = mat[9] * is2;
  var sm33 = mat[10] * is3;
  var trace = sm11 + sm22 + sm33;
  var S = 0;

  if (trace > 0) {
    S = Math.sqrt(trace + 1.0) * 2;
    out[3] = 0.25 * S;
    out[0] = (sm23 - sm32) / S;
    out[1] = (sm31 - sm13) / S;
    out[2] = (sm12 - sm21) / S;
  } else if (sm11 > sm22 && sm11 > sm33) {
    S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
    out[3] = (sm23 - sm32) / S;
    out[0] = 0.25 * S;
    out[1] = (sm12 + sm21) / S;
    out[2] = (sm31 + sm13) / S;
  } else if (sm22 > sm33) {
    S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
    out[3] = (sm31 - sm13) / S;
    out[0] = (sm12 + sm21) / S;
    out[1] = 0.25 * S;
    out[2] = (sm23 + sm32) / S;
  } else {
    S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
    out[3] = (sm12 - sm21) / S;
    out[0] = (sm31 + sm13) / S;
    out[1] = (sm23 + sm32) / S;
    out[2] = 0.25 * S;
  }

  return out;
}
/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @param {ReadonlyVec3} s Scaling vector
 * @returns {mat4} out
 */

function fromRotationTranslationScale(out, q, v, s) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  var sx = s[0];
  var sy = s[1];
  var sz = s[2];
  out[0] = (1 - (yy + zz)) * sx;
  out[1] = (xy + wz) * sx;
  out[2] = (xz - wy) * sx;
  out[3] = 0;
  out[4] = (xy - wz) * sy;
  out[5] = (1 - (xx + zz)) * sy;
  out[6] = (yz + wx) * sy;
  out[7] = 0;
  out[8] = (xz + wy) * sz;
  out[9] = (yz - wx) * sz;
  out[10] = (1 - (xx + yy)) * sz;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     mat4.translate(dest, origin);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *     mat4.translate(dest, negativeOrigin);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @param {ReadonlyVec3} s Scaling vector
 * @param {ReadonlyVec3} o The origin vector around which to scale and rotate
 * @returns {mat4} out
 */

function fromRotationTranslationScaleOrigin(out, q, v, s, o) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  var sx = s[0];
  var sy = s[1];
  var sz = s[2];
  var ox = o[0];
  var oy = o[1];
  var oz = o[2];
  var out0 = (1 - (yy + zz)) * sx;
  var out1 = (xy + wz) * sx;
  var out2 = (xz - wy) * sx;
  var out4 = (xy - wz) * sy;
  var out5 = (1 - (xx + zz)) * sy;
  var out6 = (yz + wx) * sy;
  var out8 = (xz + wy) * sz;
  var out9 = (yz - wx) * sz;
  var out10 = (1 - (xx + yy)) * sz;
  out[0] = out0;
  out[1] = out1;
  out[2] = out2;
  out[3] = 0;
  out[4] = out4;
  out[5] = out5;
  out[6] = out6;
  out[7] = 0;
  out[8] = out8;
  out[9] = out9;
  out[10] = out10;
  out[11] = 0;
  out[12] = v[0] + ox - (out0 * ox + out4 * oy + out8 * oz);
  out[13] = v[1] + oy - (out1 * ox + out5 * oy + out9 * oz);
  out[14] = v[2] + oz - (out2 * ox + out6 * oy + out10 * oz);
  out[15] = 1;
  return out;
}
/**
 * Calculates a 4x4 matrix from the given quaternion
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {ReadonlyQuat} q Quaternion to create matrix from
 *
 * @returns {mat4} out
 */

function fromQuat(out, q) {
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var yx = y * x2;
  var yy = y * y2;
  var zx = z * x2;
  var zy = z * y2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - yy - zz;
  out[1] = yx + wz;
  out[2] = zx - wy;
  out[3] = 0;
  out[4] = yx - wz;
  out[5] = 1 - xx - zz;
  out[6] = zy + wx;
  out[7] = 0;
  out[8] = zx + wy;
  out[9] = zy - wx;
  out[10] = 1 - xx - yy;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */

function frustum(out, left, right, bottom, top, near, far) {
  var rl = 1 / (right - left);
  var tb = 1 / (top - bottom);
  var nf = 1 / (near - far);
  out[0] = near * 2 * rl;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = near * 2 * tb;
  out[6] = 0;
  out[7] = 0;
  out[8] = (right + left) * rl;
  out[9] = (top + bottom) * tb;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = far * near * 2 * nf;
  out[15] = 0;
  return out;
}
/**
 * Generates a perspective projection matrix with the given bounds.
 * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
 * which matches WebGL/OpenGL's clip volume.
 * Passing null/undefined/no value for far will generate infinite projection matrix.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum, can be null or Infinity
 * @returns {mat4} out
 */

function perspectiveNO(out, fovy, aspect, near, far) {
  var f = 1.0 / Math.tan(fovy / 2),
      nf;
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;

  if (far != null && far !== Infinity) {
    nf = 1 / (near - far);
    out[10] = (far + near) * nf;
    out[14] = 2 * far * near * nf;
  } else {
    out[10] = -1;
    out[14] = -2 * near;
  }

  return out;
}
/**
 * Alias for {@link mat4.perspectiveNO}
 * @function
 */

var perspective = perspectiveNO;
/**
 * Generates a perspective projection matrix suitable for WebGPU with the given bounds.
 * The near/far clip planes correspond to a normalized device coordinate Z range of [0, 1],
 * which matches WebGPU/Vulkan/DirectX/Metal's clip volume.
 * Passing null/undefined/no value for far will generate infinite projection matrix.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum, can be null or Infinity
 * @returns {mat4} out
 */

function perspectiveZO(out, fovy, aspect, near, far) {
  var f = 1.0 / Math.tan(fovy / 2),
      nf;
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;

  if (far != null && far !== Infinity) {
    nf = 1 / (near - far);
    out[10] = far * nf;
    out[14] = far * near * nf;
  } else {
    out[10] = -1;
    out[14] = -near;
  }

  return out;
}
/**
 * Generates a perspective projection matrix with the given field of view.
 * This is primarily useful for generating projection matrices to be used
 * with the still experiemental WebVR API.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Object} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */

function perspectiveFromFieldOfView(out, fov, near, far) {
  var upTan = Math.tan(fov.upDegrees * Math.PI / 180.0);
  var downTan = Math.tan(fov.downDegrees * Math.PI / 180.0);
  var leftTan = Math.tan(fov.leftDegrees * Math.PI / 180.0);
  var rightTan = Math.tan(fov.rightDegrees * Math.PI / 180.0);
  var xScale = 2.0 / (leftTan + rightTan);
  var yScale = 2.0 / (upTan + downTan);
  out[0] = xScale;
  out[1] = 0.0;
  out[2] = 0.0;
  out[3] = 0.0;
  out[4] = 0.0;
  out[5] = yScale;
  out[6] = 0.0;
  out[7] = 0.0;
  out[8] = -((leftTan - rightTan) * xScale * 0.5);
  out[9] = (upTan - downTan) * yScale * 0.5;
  out[10] = far / (near - far);
  out[11] = -1.0;
  out[12] = 0.0;
  out[13] = 0.0;
  out[14] = far * near / (near - far);
  out[15] = 0.0;
  return out;
}
/**
 * Generates a orthogonal projection matrix with the given bounds.
 * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
 * which matches WebGL/OpenGL's clip volume.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */

function orthoNO(out, left, right, bottom, top, near, far) {
  var lr = 1 / (left - right);
  var bt = 1 / (bottom - top);
  var nf = 1 / (near - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 2 * nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;
  out[15] = 1;
  return out;
}
/**
 * Alias for {@link mat4.orthoNO}
 * @function
 */

var ortho = orthoNO;
/**
 * Generates a orthogonal projection matrix with the given bounds.
 * The near/far clip planes correspond to a normalized device coordinate Z range of [0, 1],
 * which matches WebGPU/Vulkan/DirectX/Metal's clip volume.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */

function orthoZO(out, left, right, bottom, top, near, far) {
  var lr = 1 / (left - right);
  var bt = 1 / (bottom - top);
  var nf = 1 / (near - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = near * nf;
  out[15] = 1;
  return out;
}
/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis.
 * If you want a matrix that actually makes an object look at another object, you should use targetTo instead.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {ReadonlyVec3} eye Position of the viewer
 * @param {ReadonlyVec3} center Point the viewer is looking at
 * @param {ReadonlyVec3} up vec3 pointing up
 * @returns {mat4} out
 */

function lookAt(out, eye, center, up) {
  var x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
  var eyex = eye[0];
  var eyey = eye[1];
  var eyez = eye[2];
  var upx = up[0];
  var upy = up[1];
  var upz = up[2];
  var centerx = center[0];
  var centery = center[1];
  var centerz = center[2];

  if (Math.abs(eyex - centerx) < EPSILON && Math.abs(eyey - centery) < EPSILON && Math.abs(eyez - centerz) < EPSILON) {
    return identity$2(out);
  }

  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;
  len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;
  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len = Math.hypot(x0, x1, x2);

  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len = 1 / len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;
  len = Math.hypot(y0, y1, y2);

  if (!len) {
    y0 = 0;
    y1 = 0;
    y2 = 0;
  } else {
    len = 1 / len;
    y0 *= len;
    y1 *= len;
    y2 *= len;
  }

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
}
/**
 * Generates a matrix that makes something look at something else.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {ReadonlyVec3} eye Position of the viewer
 * @param {ReadonlyVec3} center Point the viewer is looking at
 * @param {ReadonlyVec3} up vec3 pointing up
 * @returns {mat4} out
 */

function targetTo(out, eye, target, up) {
  var eyex = eye[0],
      eyey = eye[1],
      eyez = eye[2],
      upx = up[0],
      upy = up[1],
      upz = up[2];
  var z0 = eyex - target[0],
      z1 = eyey - target[1],
      z2 = eyez - target[2];
  var len = z0 * z0 + z1 * z1 + z2 * z2;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
    z0 *= len;
    z1 *= len;
    z2 *= len;
  }

  var x0 = upy * z2 - upz * z1,
      x1 = upz * z0 - upx * z2,
      x2 = upx * z1 - upy * z0;
  len = x0 * x0 + x1 * x1 + x2 * x2;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  out[0] = x0;
  out[1] = x1;
  out[2] = x2;
  out[3] = 0;
  out[4] = z1 * x2 - z2 * x1;
  out[5] = z2 * x0 - z0 * x2;
  out[6] = z0 * x1 - z1 * x0;
  out[7] = 0;
  out[8] = z0;
  out[9] = z1;
  out[10] = z2;
  out[11] = 0;
  out[12] = eyex;
  out[13] = eyey;
  out[14] = eyez;
  out[15] = 1;
  return out;
}
/**
 * Returns a string representation of a mat4
 *
 * @param {ReadonlyMat4} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */

function str$5(a) {
  return "mat4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ", " + a[8] + ", " + a[9] + ", " + a[10] + ", " + a[11] + ", " + a[12] + ", " + a[13] + ", " + a[14] + ", " + a[15] + ")";
}
/**
 * Returns Frobenius norm of a mat4
 *
 * @param {ReadonlyMat4} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */

function frob(a) {
  return Math.hypot(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15]);
}
/**
 * Adds two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function add$5(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  out[6] = a[6] + b[6];
  out[7] = a[7] + b[7];
  out[8] = a[8] + b[8];
  out[9] = a[9] + b[9];
  out[10] = a[10] + b[10];
  out[11] = a[11] + b[11];
  out[12] = a[12] + b[12];
  out[13] = a[13] + b[13];
  out[14] = a[14] + b[14];
  out[15] = a[15] + b[15];
  return out;
}
/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function subtract$3(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  out[4] = a[4] - b[4];
  out[5] = a[5] - b[5];
  out[6] = a[6] - b[6];
  out[7] = a[7] - b[7];
  out[8] = a[8] - b[8];
  out[9] = a[9] - b[9];
  out[10] = a[10] - b[10];
  out[11] = a[11] - b[11];
  out[12] = a[12] - b[12];
  out[13] = a[13] - b[13];
  out[14] = a[14] - b[14];
  out[15] = a[15] - b[15];
  return out;
}
/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat4} out
 */

function multiplyScalar(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  out[6] = a[6] * b;
  out[7] = a[7] * b;
  out[8] = a[8] * b;
  out[9] = a[9] * b;
  out[10] = a[10] * b;
  out[11] = a[11] * b;
  out[12] = a[12] * b;
  out[13] = a[13] * b;
  out[14] = a[14] * b;
  out[15] = a[15] * b;
  return out;
}
/**
 * Adds two mat4's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat4} out the receiving vector
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat4} out
 */

function multiplyScalarAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  out[4] = a[4] + b[4] * scale;
  out[5] = a[5] + b[5] * scale;
  out[6] = a[6] + b[6] * scale;
  out[7] = a[7] + b[7] * scale;
  out[8] = a[8] + b[8] * scale;
  out[9] = a[9] + b[9] * scale;
  out[10] = a[10] + b[10] * scale;
  out[11] = a[11] + b[11] * scale;
  out[12] = a[12] + b[12] * scale;
  out[13] = a[13] + b[13] * scale;
  out[14] = a[14] + b[14] * scale;
  out[15] = a[15] + b[15] * scale;
  return out;
}
/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyMat4} a The first matrix.
 * @param {ReadonlyMat4} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function exactEquals$5(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] && a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
}
/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {ReadonlyMat4} a The first matrix.
 * @param {ReadonlyMat4} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function equals$5(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var a4 = a[4],
      a5 = a[5],
      a6 = a[6],
      a7 = a[7];
  var a8 = a[8],
      a9 = a[9],
      a10 = a[10],
      a11 = a[11];
  var a12 = a[12],
      a13 = a[13],
      a14 = a[14],
      a15 = a[15];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  var b4 = b[4],
      b5 = b[5],
      b6 = b[6],
      b7 = b[7];
  var b8 = b[8],
      b9 = b[9],
      b10 = b[10],
      b11 = b[11];
  var b12 = b[12],
      b13 = b[13],
      b14 = b[14],
      b15 = b[15];
  return Math.abs(a0 - b0) <= EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= EPSILON * Math.max(1.0, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= EPSILON * Math.max(1.0, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= EPSILON * Math.max(1.0, Math.abs(a8), Math.abs(b8)) && Math.abs(a9 - b9) <= EPSILON * Math.max(1.0, Math.abs(a9), Math.abs(b9)) && Math.abs(a10 - b10) <= EPSILON * Math.max(1.0, Math.abs(a10), Math.abs(b10)) && Math.abs(a11 - b11) <= EPSILON * Math.max(1.0, Math.abs(a11), Math.abs(b11)) && Math.abs(a12 - b12) <= EPSILON * Math.max(1.0, Math.abs(a12), Math.abs(b12)) && Math.abs(a13 - b13) <= EPSILON * Math.max(1.0, Math.abs(a13), Math.abs(b13)) && Math.abs(a14 - b14) <= EPSILON * Math.max(1.0, Math.abs(a14), Math.abs(b14)) && Math.abs(a15 - b15) <= EPSILON * Math.max(1.0, Math.abs(a15), Math.abs(b15));
}
/**
 * Alias for {@link mat4.multiply}
 * @function
 */

var mul$5 = multiply$5;
/**
 * Alias for {@link mat4.subtract}
 * @function
 */

var sub$3 = subtract$3;

const mat4 = /*#__PURE__*/Object.freeze({
   __proto__: null,
   create: create$5,
   clone: clone$5,
   copy: copy$5,
   fromValues: fromValues$5,
   set: set$5,
   identity: identity$2,
   transpose: transpose,
   invert: invert$2,
   adjoint: adjoint,
   determinant: determinant,
   multiply: multiply$5,
   translate: translate$1,
   scale: scale$5,
   rotate: rotate$1,
   rotateX: rotateX$3,
   rotateY: rotateY$3,
   rotateZ: rotateZ$3,
   fromTranslation: fromTranslation$1,
   fromScaling: fromScaling,
   fromRotation: fromRotation$1,
   fromXRotation: fromXRotation,
   fromYRotation: fromYRotation,
   fromZRotation: fromZRotation,
   fromRotationTranslation: fromRotationTranslation$1,
   fromQuat2: fromQuat2,
   getTranslation: getTranslation$1,
   getScaling: getScaling,
   getRotation: getRotation,
   fromRotationTranslationScale: fromRotationTranslationScale,
   fromRotationTranslationScaleOrigin: fromRotationTranslationScaleOrigin,
   fromQuat: fromQuat,
   frustum: frustum,
   perspectiveNO: perspectiveNO,
   perspective: perspective,
   perspectiveZO: perspectiveZO,
   perspectiveFromFieldOfView: perspectiveFromFieldOfView,
   orthoNO: orthoNO,
   ortho: ortho,
   orthoZO: orthoZO,
   lookAt: lookAt,
   targetTo: targetTo,
   str: str$5,
   frob: frob,
   add: add$5,
   subtract: subtract$3,
   multiplyScalar: multiplyScalar,
   multiplyScalarAndAdd: multiplyScalarAndAdd,
   exactEquals: exactEquals$5,
   equals: equals$5,
   mul: mul$5,
   sub: sub$3
});

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create$4() {
  var out = new ARRAY_TYPE(3);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {ReadonlyVec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */

function clone$4(a) {
  var out = new ARRAY_TYPE(3);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
/**
 * Calculates the length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate length of
 * @returns {Number} length of a
 */

function length$4(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return Math.hypot(x, y, z);
}
/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */

function fromValues$4(x, y, z) {
  var out = new ARRAY_TYPE(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the source vector
 * @returns {vec3} out
 */

function copy$4(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */

function set$4(out, x, y, z) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function add$4(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function subtract$2(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}
/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function multiply$4(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  return out;
}
/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function divide$2(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  return out;
}
/**
 * Math.ceil the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to ceil
 * @returns {vec3} out
 */

function ceil$2(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  out[2] = Math.ceil(a[2]);
  return out;
}
/**
 * Math.floor the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to floor
 * @returns {vec3} out
 */

function floor$2(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  out[2] = Math.floor(a[2]);
  return out;
}
/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function min$2(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  return out;
}
/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function max$2(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  return out;
}
/**
 * Math.round the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to round
 * @returns {vec3} out
 */

function round$2(out, a) {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  out[2] = Math.round(a[2]);
  return out;
}
/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */

function scale$4(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}
/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */

function scaleAndAdd$2(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  return out;
}
/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} distance between a and b
 */

function distance$2(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  return Math.hypot(x, y, z);
}
/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} squared distance between a and b
 */

function squaredDistance$2(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  return x * x + y * y + z * z;
}
/**
 * Calculates the squared length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */

function squaredLength$4(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return x * x + y * y + z * z;
}
/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to negate
 * @returns {vec3} out
 */

function negate$2(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  return out;
}
/**
 * Returns the inverse of the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to invert
 * @returns {vec3} out
 */

function inverse$2(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize$4(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Calculates the dot product of two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} dot product of a and b
 */

function dot$4(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function cross$2(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2];
  var bx = b[0],
      by = b[1],
      bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}
/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */

function lerp$4(out, a, b, t) {
  var ax = a[0];
  var ay = a[1];
  var az = a[2];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  out[2] = az + t * (b[2] - az);
  return out;
}
/**
 * Performs a hermite interpolation with two control points
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {ReadonlyVec3} c the third operand
 * @param {ReadonlyVec3} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */

function hermite(out, a, b, c, d, t) {
  var factorTimes2 = t * t;
  var factor1 = factorTimes2 * (2 * t - 3) + 1;
  var factor2 = factorTimes2 * (t - 2) + t;
  var factor3 = factorTimes2 * (t - 1);
  var factor4 = factorTimes2 * (3 - 2 * t);
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  return out;
}
/**
 * Performs a bezier interpolation with two control points
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {ReadonlyVec3} c the third operand
 * @param {ReadonlyVec3} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */

function bezier(out, a, b, c, d, t) {
  var inverseFactor = 1 - t;
  var inverseFactorTimesTwo = inverseFactor * inverseFactor;
  var factorTimes2 = t * t;
  var factor1 = inverseFactorTimesTwo * inverseFactor;
  var factor2 = 3 * t * inverseFactorTimesTwo;
  var factor3 = 3 * factorTimes2 * inverseFactor;
  var factor4 = factorTimes2 * t;
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */

function random$3(out, scale) {
  scale = scale || 1.0;
  var r = RANDOM() * 2.0 * Math.PI;
  var z = RANDOM() * 2.0 - 1.0;
  var zScale = Math.sqrt(1.0 - z * z) * scale;
  out[0] = Math.cos(r) * zScale;
  out[1] = Math.sin(r) * zScale;
  out[2] = z * scale;
  return out;
}
/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec3} out
 */

function transformMat4$2(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat3} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */

function transformMat3$1(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  out[0] = x * m[0] + y * m[3] + z * m[6];
  out[1] = x * m[1] + y * m[4] + z * m[7];
  out[2] = x * m[2] + y * m[5] + z * m[8];
  return out;
}
/**
 * Transforms the vec3 with a quat
 * Can also be used for dual quaternions. (Multiply it with the real part)
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyQuat} q quaternion to transform with
 * @returns {vec3} out
 */

function transformQuat$1(out, a, q) {
  // benchmarks: https://jsperf.com/quaternion-transform-vec3-implementations-fixed
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3];
  var x = a[0],
      y = a[1],
      z = a[2]; // var qvec = [qx, qy, qz];
  // var uv = vec3.cross([], qvec, a);

  var uvx = qy * z - qz * y,
      uvy = qz * x - qx * z,
      uvz = qx * y - qy * x; // var uuv = vec3.cross([], qvec, uv);

  var uuvx = qy * uvz - qz * uvy,
      uuvy = qz * uvx - qx * uvz,
      uuvz = qx * uvy - qy * uvx; // vec3.scale(uv, uv, 2 * w);

  var w2 = qw * 2;
  uvx *= w2;
  uvy *= w2;
  uvz *= w2; // vec3.scale(uuv, uuv, 2);

  uuvx *= 2;
  uuvy *= 2;
  uuvz *= 2; // return vec3.add(out, a, vec3.add(out, uv, uuv));

  out[0] = x + uvx + uuvx;
  out[1] = y + uvy + uuvy;
  out[2] = z + uvz + uuvz;
  return out;
}
/**
 * Rotate a 3D vector around the x-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateX$2(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[0];
  r[1] = p[1] * Math.cos(rad) - p[2] * Math.sin(rad);
  r[2] = p[1] * Math.sin(rad) + p[2] * Math.cos(rad); //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Rotate a 3D vector around the y-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateY$2(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
  r[1] = p[1];
  r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad); //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Rotate a 3D vector around the z-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateZ$2(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[0] * Math.cos(rad) - p[1] * Math.sin(rad);
  r[1] = p[0] * Math.sin(rad) + p[1] * Math.cos(rad);
  r[2] = p[2]; //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Get the angle between two 3D vectors
 * @param {ReadonlyVec3} a The first operand
 * @param {ReadonlyVec3} b The second operand
 * @returns {Number} The angle in radians
 */

function angle$1(a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2],
      bx = b[0],
      by = b[1],
      bz = b[2],
      mag1 = Math.sqrt(ax * ax + ay * ay + az * az),
      mag2 = Math.sqrt(bx * bx + by * by + bz * bz),
      mag = mag1 * mag2,
      cosine = mag && dot$4(a, b) / mag;
  return Math.acos(Math.min(Math.max(cosine, -1), 1));
}
/**
 * Set the components of a vec3 to zero
 *
 * @param {vec3} out the receiving vector
 * @returns {vec3} out
 */

function zero$2(out) {
  out[0] = 0.0;
  out[1] = 0.0;
  out[2] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {ReadonlyVec3} a vector to represent as a string
 * @returns {String} string representation of the vector
 */

function str$4(a) {
  return "vec3(" + a[0] + ", " + a[1] + ", " + a[2] + ")";
}
/**
 * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyVec3} a The first vector.
 * @param {ReadonlyVec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function exactEquals$4(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {ReadonlyVec3} a The first vector.
 * @param {ReadonlyVec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function equals$4(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2];
  return Math.abs(a0 - b0) <= EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2));
}
/**
 * Alias for {@link vec3.subtract}
 * @function
 */

var sub$2 = subtract$2;
/**
 * Alias for {@link vec3.multiply}
 * @function
 */

var mul$4 = multiply$4;
/**
 * Alias for {@link vec3.divide}
 * @function
 */

var div$2 = divide$2;
/**
 * Alias for {@link vec3.distance}
 * @function
 */

var dist$2 = distance$2;
/**
 * Alias for {@link vec3.squaredDistance}
 * @function
 */

var sqrDist$2 = squaredDistance$2;
/**
 * Alias for {@link vec3.length}
 * @function
 */

var len$4 = length$4;
/**
 * Alias for {@link vec3.squaredLength}
 * @function
 */

var sqrLen$4 = squaredLength$4;
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach$2 = function () {
  var vec = create$4();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
}();

const vec3 = /*#__PURE__*/Object.freeze({
   __proto__: null,
   create: create$4,
   clone: clone$4,
   length: length$4,
   fromValues: fromValues$4,
   copy: copy$4,
   set: set$4,
   add: add$4,
   subtract: subtract$2,
   multiply: multiply$4,
   divide: divide$2,
   ceil: ceil$2,
   floor: floor$2,
   min: min$2,
   max: max$2,
   round: round$2,
   scale: scale$4,
   scaleAndAdd: scaleAndAdd$2,
   distance: distance$2,
   squaredDistance: squaredDistance$2,
   squaredLength: squaredLength$4,
   negate: negate$2,
   inverse: inverse$2,
   normalize: normalize$4,
   dot: dot$4,
   cross: cross$2,
   lerp: lerp$4,
   hermite: hermite,
   bezier: bezier,
   random: random$3,
   transformMat4: transformMat4$2,
   transformMat3: transformMat3$1,
   transformQuat: transformQuat$1,
   rotateX: rotateX$2,
   rotateY: rotateY$2,
   rotateZ: rotateZ$2,
   angle: angle$1,
   zero: zero$2,
   str: str$4,
   exactEquals: exactEquals$4,
   equals: equals$4,
   sub: sub$2,
   mul: mul$4,
   div: div$2,
   dist: dist$2,
   sqrDist: sqrDist$2,
   len: len$4,
   sqrLen: sqrLen$4,
   forEach: forEach$2
});

/**
 * 4 Dimensional Vector
 * @module vec4
 */

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */

function create$3() {
  var out = new ARRAY_TYPE(4);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }

  return out;
}
/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to normalize
 * @returns {vec4} out
 */

function normalize$3(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  var len = x * x + y * y + z * z + w * w;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
  }

  out[0] = x * len;
  out[1] = y * len;
  out[2] = z * len;
  out[3] = w * len;
  return out;
}
/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create$3();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
})();

/**
 * Quaternion
 * @module quat
 */

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */

function create$2() {
  var out = new ARRAY_TYPE(4);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  out[3] = 1;
  return out;
}
/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyVec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/

function setAxisAngle(out, axis, rad) {
  rad = rad * 0.5;
  var s = Math.sin(rad);
  out[0] = s * axis[0];
  out[1] = s * axis[1];
  out[2] = s * axis[2];
  out[3] = Math.cos(rad);
  return out;
}
/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

function slerp(out, a, b, t) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = b[0],
      by = b[1],
      bz = b[2],
      bw = b[3];
  var omega, cosom, sinom, scale0, scale1; // calc cosine

  cosom = ax * bx + ay * by + az * bz + aw * bw; // adjust signs (if necessary)

  if (cosom < 0.0) {
    cosom = -cosom;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  } // calculate coefficients


  if (1.0 - cosom > EPSILON) {
    // standard case (slerp)
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t;
    scale1 = t;
  } // calculate final values


  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;
  return out;
}
/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyMat3} m rotation matrix
 * @returns {quat} out
 * @function
 */

function fromMat3(out, m) {
  // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
  // article "Quaternion Calculus and Fast Animation".
  var fTrace = m[0] + m[4] + m[8];
  var fRoot;

  if (fTrace > 0.0) {
    // |w| > 1/2, may as well choose w > 1/2
    fRoot = Math.sqrt(fTrace + 1.0); // 2w

    out[3] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot; // 1/(4w)

    out[0] = (m[5] - m[7]) * fRoot;
    out[1] = (m[6] - m[2]) * fRoot;
    out[2] = (m[1] - m[3]) * fRoot;
  } else {
    // |w| <= 1/2
    var i = 0;
    if (m[4] > m[0]) i = 1;
    if (m[8] > m[i * 3 + i]) i = 2;
    var j = (i + 1) % 3;
    var k = (i + 2) % 3;
    fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);
    out[i] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot;
    out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
    out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
    out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
  }

  return out;
}
/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */

var normalize$2 = normalize$3;
/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {ReadonlyVec3} a the initial vector
 * @param {ReadonlyVec3} b the destination vector
 * @returns {quat} out
 */

(function () {
  var tmpvec3 = create$4();
  var xUnitVec3 = fromValues$4(1, 0, 0);
  var yUnitVec3 = fromValues$4(0, 1, 0);
  return function (out, a, b) {
    var dot = dot$4(a, b);

    if (dot < -0.999999) {
      cross$2(tmpvec3, xUnitVec3, a);
      if (len$4(tmpvec3) < 0.000001) cross$2(tmpvec3, yUnitVec3, a);
      normalize$4(tmpvec3, tmpvec3);
      setAxisAngle(out, tmpvec3, Math.PI);
      return out;
    } else if (dot > 0.999999) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
      return out;
    } else {
      cross$2(tmpvec3, a, b);
      out[0] = tmpvec3[0];
      out[1] = tmpvec3[1];
      out[2] = tmpvec3[2];
      out[3] = 1 + dot;
      return normalize$2(out, out);
    }
  };
})();
/**
 * Performs a spherical linear interpolation with two control points
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {ReadonlyQuat} c the third operand
 * @param {ReadonlyQuat} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

(function () {
  var temp1 = create$2();
  var temp2 = create$2();
  return function (out, a, b, c, d, t) {
    slerp(temp1, a, d, t);
    slerp(temp2, b, c, t);
    slerp(out, temp1, temp2, 2 * t * (1 - t));
    return out;
  };
})();
/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {ReadonlyVec3} view  the vector representing the viewing direction
 * @param {ReadonlyVec3} right the vector representing the local "right" direction
 * @param {ReadonlyVec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */

(function () {
  var matr = create$6();
  return function (out, view, right, up) {
    matr[0] = right[0];
    matr[3] = right[1];
    matr[6] = right[2];
    matr[1] = up[0];
    matr[4] = up[1];
    matr[7] = up[2];
    matr[2] = -view[0];
    matr[5] = -view[1];
    matr[8] = -view[2];
    return normalize$2(out, fromMat3(out, matr));
  };
})();

/**
 * 2 Dimensional Vector
 * @module vec2
 */

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */

function create() {
  var out = new ARRAY_TYPE(2);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
  }

  return out;
}
/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 2;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
    }

    return a;
  };
})();

/**
 * Provides a basic {@link TJSBasicAnimation} implementation for Position animation.
 */
class AnimationControl
{
   /** @type {object} */
   #animationData;

   /** @type {Promise<void>} */
   #finishedPromise;

   #willFinish;

   /**
    * Defines a static empty / void animation control.
    *
    * @type {AnimationControl}
    */
   static #voidControl = new AnimationControl(null);

   /**
    * Provides a static void / undefined AnimationControl that is automatically resolved.
    *
    * @returns {AnimationControl} Void AnimationControl
    */
   static get voidControl() { return this.#voidControl; }

   /**
    * @param {object|null} [animationData] - Animation data from {@link AnimationAPI}.
    *
    * @param {boolean}     [willFinish] - Promise that tracks animation finished state.
    */
   constructor(animationData, willFinish = false)
   {
      this.#animationData = animationData;
      this.#willFinish = willFinish;

      // Set this control to animation data.
      if (animationData !== null && typeof animationData === 'object')
      {
         animationData.control = this;
      }
   }

   /**
    * Get a promise that resolves when animation is finished.
    *
    * @returns {Promise<void>}
    */
   get finished()
   {
      if (!(this.#finishedPromise instanceof Promise))
      {
         this.#finishedPromise = this.#willFinish ? new Promise((resolve) => this.#animationData.resolve = resolve) :
          Promise.resolve();
      }

      return this.#finishedPromise;
   }

   /**
    * Returns whether this animation is currently active / animating.
    *
    * Note: a delayed animation may not be started / active yet. Use {@link AnimationControl.isFinished} to determine
    * if an animation is actually finished.
    *
    * @returns {boolean} Animation active state.
    */
   get isActive() { return this.#animationData.active; }

   /**
    * Returns whether this animation is completely finished.
    *
    * @returns {boolean} Animation finished state.
    */
   get isFinished() { return this.#animationData.finished; }

   /**
    * Cancels the animation.
    */
   cancel()
   {
      const animationData = this.#animationData;

      if (animationData === null || animationData === void 0) { return; }

      // Set cancelled state to true and this animation data instance will be removed from AnimationManager on next
      // update.
      animationData.cancelled = true;
   }
}

/**
 * Provides animation management and scheduling allowing all Position instances to utilize one micro-task.
 */
class AnimationManager
{
   /**
    * @type {object[]}
    */
   static activeList = [];

   /**
    * @type {object[]}
    */
   static newList = [];

   /**
    * @type {number}
    */
   static current;

   /**
    * Add animation data.
    *
    * @param {object}   data -
    */
   static add(data)
   {
      const now = performance.now();

      // Offset start time by delta between last rAF time. This allows continuous tween cycles to appear naturally as
      // starting from the instant they are added to the AnimationManager. This is what makes `draggable` smooth when
      // easing is enabled.
      data.start = now + (AnimationManager.current - now);

      AnimationManager.newList.push(data);
   }

   /**
    * Manage all animation
    */
   static animate()
   {
      const current = AnimationManager.current = performance.now();

      // Early out of the rAF callback when there are no current animations.
      if (AnimationManager.activeList.length === 0 && AnimationManager.newList.length === 0)
      {
         globalThis.requestAnimationFrame(AnimationManager.animate);
         return;
      }

      if (AnimationManager.newList.length)
      {
         // Process new data
         for (let cntr = AnimationManager.newList.length; --cntr >= 0;)
         {
            const data = AnimationManager.newList[cntr];

            // If animation instance has been cancelled before start then remove it from new list and cleanup.
            if (data.cancelled)
            {
               AnimationManager.newList.splice(cntr, 1);
               data.cleanup(data);
            }

            // If data is active then process it now. Delayed animations start with `active` false.
            if (data.active)
            {
               // Remove from new list and add to active list.
               AnimationManager.newList.splice(cntr, 1);
               AnimationManager.activeList.push(data);
            }
         }
      }

      // Process active animations.
      for (let cntr = AnimationManager.activeList.length; --cntr >= 0;)
      {
         const data = AnimationManager.activeList[cntr];

         // Remove any animations that have been canceled.
         // Ensure that the element is still connected otherwise remove it from active list and continue.
         if (data.cancelled || (data.el !== void 0 && !data.el.isConnected))
         {
            AnimationManager.activeList.splice(cntr, 1);
            data.cleanup(data);
            continue;
         }

         data.current = current - data.start;

         // Remove this animation instance if current animating time exceeds duration.
         if (data.current >= data.duration)
         {
            // Prepare final update with end position data.
            for (let dataCntr = data.keys.length; --dataCntr >= 0;)
            {
               const key = data.keys[dataCntr];
               data.newData[key] = data.destination[key];
            }

            data.position.set(data.newData);

            AnimationManager.activeList.splice(cntr, 1);
            data.cleanup(data);

            continue;
         }

         // Apply easing to create an eased time.
         const easedTime = data.ease(data.current / data.duration);

         for (let dataCntr = data.keys.length; --dataCntr >= 0;)
         {
            const key = data.keys[dataCntr];
            data.newData[key] = data.interpolate(data.initial[key], data.destination[key], easedTime);
         }

         data.position.set(data.newData);
      }

      globalThis.requestAnimationFrame(AnimationManager.animate);
   }

   /**
    * Cancels all animations for given Position instance.
    *
    * @param {Position} position - Position instance.
    */
   static cancel(position)
   {
      for (let cntr = AnimationManager.activeList.length; --cntr >= 0;)
      {
         const data = AnimationManager.activeList[cntr];
         if (data.position === position)
         {
            AnimationManager.activeList.splice(cntr, 1);
            data.cancelled = true;
            data.cleanup(data);
         }
      }

      for (let cntr = AnimationManager.newList.length; --cntr >= 0;)
      {
         const data = AnimationManager.newList[cntr];
         if (data.position === position)
         {
            AnimationManager.newList.splice(cntr, 1);
            data.cancelled = true;
            data.cleanup(data);
         }
      }
   }

   /**
    * Cancels all active and delayed animations.
    */
   static cancelAll()
   {
      for (let cntr = AnimationManager.activeList.length; --cntr >= 0;)
      {
         const data = AnimationManager.activeList[cntr];
         data.cancelled = true;
         data.cleanup(data);
      }

      for (let cntr = AnimationManager.newList.length; --cntr >= 0;)
      {
         const data = AnimationManager.newList[cntr];
         data.cancelled = true;
         data.cleanup(data);
      }

      AnimationManager.activeList.length = 0;
      AnimationManager.newList.length = 0;
   }

   /**
    * Gets all {@link AnimationControl} instances for a given Position instance.
    *
    * @param {Position} position - Position instance.
    *
    * @returns {AnimationControl[]} All scheduled AnimationControl instances for the given Position instance.
    */
   static getScheduled(position)
   {
      const results = [];

      for (let cntr = AnimationManager.activeList.length; --cntr >= 0;)
      {
         const data = AnimationManager.activeList[cntr];
         if (data.position === position)
         {
            results.push(data.control);
         }
      }

      for (let cntr = AnimationManager.newList.length; --cntr >= 0;)
      {
         const data = AnimationManager.newList[cntr];
         if (data.position === position)
         {
            results.push(data.control);
         }
      }

      return results;
   }
}

// Start animation manager immediately. It constantly is running in background.
AnimationManager.animate();

/**
 * Stores the PositionData properties that can be animated.
 *
 * @type {Set<string>}
 */
const animateKeys = new Set([
   // Main keys
   'left', 'top', 'maxWidth', 'maxHeight', 'minWidth', 'minHeight', 'width', 'height',
   'rotateX', 'rotateY', 'rotateZ', 'scale', 'translateX', 'translateY', 'translateZ', 'zIndex',

   // Aliases
   'rotation'
]);

/**
 * Defines the keys of PositionData that are transform keys.
 *
 * @type {string[]}
 */
const transformKeys = ['rotateX', 'rotateY', 'rotateZ', 'scale', 'translateX', 'translateY', 'translateZ'];

Object.freeze(transformKeys);

/**
 * Parses a relative value string in the form of '+=', '-=', or '*=' and float / numeric value. IE '+=0.2'.
 *
 * @type {RegExp}
 */
const relativeRegex = /^([-+*])=(-?[\d]*\.?[\d]+)$/;

/**
 * Provides numeric defaults for all parameters. This is used by {@link Position.get} to optionally provide
 * numeric defaults.
 *
 * @type {{rotation: number, scale: number, minWidth: null, minHeight: null, translateZ: number, top: number, left: number, maxHeight: null, translateY: number, translateX: number, width: number, transformOrigin: null, rotateX: number, rotateY: number, height: number, maxWidth: null, zIndex: null, rotateZ: number}}
 */
const numericDefaults = {
   // Other keys
   height: 0,
   left: 0,
   maxHeight: null,
   maxWidth: null,
   minHeight: null,
   minWidth: null,
   top: 0,
   transformOrigin: null,
   width: 0,
   zIndex: null,

   rotateX: 0,
   rotateY: 0,
   rotateZ: 0,
   scale: 1,
   translateX: 0,
   translateY: 0,
   translateZ: 0,

   rotation: 0
};

Object.freeze(numericDefaults);

/**
 * Sets numeric defaults for a {@link PositionData} like object.
 *
 * @param {object}   data - A PositionData like object.
 */
function setNumericDefaults(data)
{
   // Transform keys
   if (data.rotateX === null) { data.rotateX = 0; }
   if (data.rotateY === null) { data.rotateY = 0; }
   if (data.rotateZ === null) { data.rotateZ = 0; }
   if (data.translateX === null) { data.translateX = 0; }
   if (data.translateY === null) { data.translateY = 0; }
   if (data.translateZ === null) { data.translateZ = 0; }
   if (data.scale === null) { data.scale = 1; }

   // Aliases
   if (data.rotation === null) { data.rotation = 0; }
}

/**
 * Defines bitwise keys for transforms used in {@link Transforms.getMat4}.
 *
 * @type {object}
 */
const transformKeysBitwise = {
   rotateX: 1,
   rotateY: 2,
   rotateZ: 4,
   scale: 8,
   translateX: 16,
   translateY: 32,
   translateZ: 64
};

Object.freeze(transformKeysBitwise);

/**
 * Defines the default transform origin.
 *
 * @type {string}
 */
const transformOriginDefault = 'top left';

/**
 * Defines the valid transform origins.
 *
 * @type {string[]}
 */
const transformOrigins = ['top left', 'top center', 'top right', 'center left', 'center', 'center right', 'bottom left',
 'bottom center', 'bottom right'];

Object.freeze(transformOrigins);

/**
 * Converts any relative string values for animatable keys to actual updates performed against current data.
 *
 * @param {PositionDataExtended}    positionData - position data.
 *
 * @param {Position|PositionData}   position - The source position instance.
 */
function convertRelative(positionData, position)
{
   for (const key in positionData)
   {
      // Key is animatable / numeric.
      if (animateKeys.has(key))
      {
         const value = positionData[key];

         if (typeof value !== 'string') { continue; }

         // Ignore 'auto' and 'inherit' string values.
         if (value === 'auto' || value === 'inherit') { continue; }

         const regexResults = relativeRegex.exec(value);

         if (!regexResults)
         {
            throw new Error(
             `convertRelative error: malformed relative key (${key}) with value (${value})`);
         }

         const current = position[key];

         switch (regexResults[1])
         {
            case '-':
               positionData[key] = current - parseFloat(regexResults[2]);
               break;

            case '+':
               positionData[key] = current + parseFloat(regexResults[2]);
               break;

            case '*':
               positionData[key] = current * parseFloat(regexResults[2]);
               break;
         }
      }
   }
}

class AnimationAPI
{
   /** @type {PositionData} */
   #data;

   /** @type {Position} */
   #position;

   /**
    * Tracks the number of animation control instances that are active.
    *
    * @type {number}
    */
   #instanceCount = 0;

   /**
    * Provides a bound function to pass as data to AnimationManager to invoke
    *
    * @type {Function}
    * @see {AnimationAPI.#cleanupInstance}
    */
   #cleanup;

   constructor(position, data)
   {
      this.#position = position;
      this.#data = data;

      this.#cleanup = this.#cleanupInstance.bind(this);
   }

   /**
    * Returns whether there are scheduled animations whether active or delayed for this Position.
    *
    * @returns {boolean} Are there active animation instances.
    */
   get isScheduled()
   {
      return this.#instanceCount > 0;
   }

   /**
    * Adds / schedules an animation w/ the AnimationManager. This contains the final steps common to all tweens.
    *
    * @param {object}      initial -
    *
    * @param {object}      destination -
    *
    * @param {number}      duration -
    *
    * @param {HTMLElement} el -
    *
    * @param {number}      delay -
    *
    * @param {Function}    ease -
    *
    * @param {Function}    interpolate -
    *
    * @returns {AnimationControl} The associated animation control.
    */
   #addAnimation(initial, destination, duration, el, delay, ease, interpolate)
   {
      // Set initial data for transform values that are often null by default.
      setNumericDefaults(initial);
      setNumericDefaults(destination);

      // Reject all initial data that is not a number.
      for (const key in initial)
      {
         if (!Number.isFinite(initial[key])) { delete initial[key]; }
      }

      const keys = Object.keys(initial);
      const newData = Object.assign({ immediateElementUpdate: true }, initial);

      // Nothing to animate, so return now.
      if (keys.length === 0) { return AnimationControl.voidControl; }

      const animationData = {
         active: true,
         cleanup: this.#cleanup,
         cancelled: false,
         control: void 0,
         current: 0,
         destination,
         duration: duration * 1000, // Internally the AnimationManager works in ms.
         ease,
         el,
         finished: false,
         initial,
         interpolate,
         keys,
         newData,
         position: this.#position,
         resolve: void 0,
         start: void 0
      };

      if (delay > 0)
      {
         animationData.active = false;

         // Delay w/ setTimeout and schedule w/ AnimationManager if not already canceled
         setTimeout(() =>
         {
            if (!animationData.cancelled)
            {
               animationData.active = true;

               const now = performance.now();

               // Offset start time by delta between last rAF time. This allows a delayed tween to start from the
               // precise delayed time.
               animationData.start = now + (AnimationManager.current - now);
            }
         }, delay * 1000);
      }

      // Schedule immediately w/ AnimationManager
      this.#instanceCount++;
      AnimationManager.add(animationData);

      // Create animation control
      return new AnimationControl(animationData, true);
   }

   /**
    * Cancels all animation instances for this Position instance.
    */
   cancel()
   {
      AnimationManager.cancel(this.#position);
   }

   /**
    * Cleans up an animation instance.
    *
    * @param {object}   data - Animation data for an animation instance.
    */
   #cleanupInstance(data)
   {
      this.#instanceCount--;

      data.active = false;
      data.finished = true;

      if (typeof data.resolve === 'function') { data.resolve(data.cancelled); }
   }

   /**
    * Returns all currently scheduled AnimationControl instances for this Position instance.
    *
    * @returns {AnimationControl[]} All currently scheduled animation controls for this Position instance.
    */
   getScheduled()
   {
      return AnimationManager.getScheduled(this.#position);
   }

   /**
    * Provides a tween from given position data to the current position.
    *
    * @param {PositionDataExtended} fromData - The starting position.
    *
    * @param {object}         [opts] - Optional parameters.
    *
    * @param {number}         [opts.delay=0] - Delay in seconds before animation starts.
    *
    * @param {number}         [opts.duration=1] - Duration in seconds.
    *
    * @param {Function}       [opts.ease=cubicOut] - Easing function.
    *
    * @param {Function}       [opts.interpolate=lerp] - Interpolation function.
    *
    * @returns {AnimationControl}  A control object that can cancel animation and provides a `finished` Promise.
    */
   from(fromData, { delay = 0, duration = 1, ease = cubicOut, interpolate = lerp$5 } = {})
   {
      if (!isObject(fromData))
      {
         throw new TypeError(`AnimationAPI.from error: 'fromData' is not an object.`);
      }

      const position = this.#position;
      const parent = position.parent;

      // Early out if the application is not positionable.
      if (parent !== void 0 && typeof parent?.options?.positionable === 'boolean' && !parent?.options?.positionable)
      {
         return AnimationControl.voidControl;
      }

      // Cache any target element allowing AnimationManager to stop animation if it becomes disconnected from DOM.
      const targetEl = parent instanceof HTMLElement ? parent : parent?.elementTarget;
      const el = targetEl instanceof HTMLElement && targetEl.isConnected ? targetEl : void 0;

      if (!Number.isFinite(delay) || delay < 0)
      {
         throw new TypeError(`AnimationAPI.from error: 'delay' is not a positive number.`);
      }

      if (!Number.isFinite(duration) || duration < 0)
      {
         throw new TypeError(`AnimationAPI.from error: 'duration' is not a positive number.`);
      }

      if (typeof ease !== 'function')
      {
         throw new TypeError(`AnimationAPI.from error: 'ease' is not a function.`);
      }

      if (typeof interpolate !== 'function')
      {
         throw new TypeError(`AnimationAPI.from error: 'interpolate' is not a function.`);
      }

      const initial = {};
      const destination = {};

      const data = this.#data;

      // Set initial data if the key / data is defined and the end position is not equal to current data.
      for (const key in fromData)
      {
         if (data[key] !== void 0 && fromData[key] !== data[key])
         {
            initial[key] = fromData[key];
            destination[key] = data[key];
         }
      }

      convertRelative(initial, data);

      return this.#addAnimation(initial, destination, duration, el, delay, ease, interpolate);
   }

   /**
    * Provides a tween from given position data to the current position.
    *
    * @param {PositionDataExtended} fromData - The starting position.
    *
    * @param {PositionDataExtended} toData - The ending position.
    *
    * @param {object}         [opts] - Optional parameters.
    *
    * @param {number}         [opts.delay=0] - Delay in seconds before animation starts.
    *
    * @param {number}         [opts.duration=1] - Duration in seconds.
    *
    * @param {Function}       [opts.ease=cubicOut] - Easing function.
    *
    * @param {Function}       [opts.interpolate=lerp] - Interpolation function.
    *
    * @returns {AnimationControl}  A control object that can cancel animation and provides a `finished` Promise.
    */
   fromTo(fromData, toData, { delay = 0, duration = 1, ease = cubicOut, interpolate = lerp$5 } = {})
   {
      if (!isObject(fromData))
      {
         throw new TypeError(`AnimationAPI.fromTo error: 'fromData' is not an object.`);
      }

      if (!isObject(toData))
      {
         throw new TypeError(`AnimationAPI.fromTo error: 'toData' is not an object.`);
      }

      const parent = this.#position.parent;

      // Early out if the application is not positionable.
      if (parent !== void 0 && typeof parent?.options?.positionable === 'boolean' && !parent?.options?.positionable)
      {
         return AnimationControl.voidControl;
      }

      // Cache any target element allowing AnimationManager to stop animation if it becomes disconnected from DOM.
      const targetEl = parent instanceof HTMLElement ? parent : parent?.elementTarget;
      const el = targetEl instanceof HTMLElement && targetEl.isConnected ? targetEl : void 0;

      if (!Number.isFinite(delay) || delay < 0)
      {
         throw new TypeError(`AnimationAPI.fromTo error: 'delay' is not a positive number.`);
      }

      if (!Number.isFinite(duration) || duration < 0)
      {
         throw new TypeError(`AnimationAPI.fromTo error: 'duration' is not a positive number.`);
      }

      if (typeof ease !== 'function')
      {
         throw new TypeError(`AnimationAPI.fromTo error: 'ease' is not a function.`);
      }

      if (typeof interpolate !== 'function')
      {
         throw new TypeError(`AnimationAPI.fromTo error: 'interpolate' is not a function.`);
      }

      const initial = {};
      const destination = {};

      const data = this.#data;

      // Set initial data if the key / data is defined and the end position is not equal to current data.
      for (const key in fromData)
      {
         if (toData[key] === void 0)
         {
            console.warn(
             `AnimationAPI.fromTo warning: key ('${key}') from 'fromData' missing in 'toData'; skipping this key.`);
            continue;
         }

         if (data[key] !== void 0)
         {
            initial[key] = fromData[key];
            destination[key] = toData[key];
         }
      }

      convertRelative(initial, data);
      convertRelative(destination, data);

      return this.#addAnimation(initial, destination, duration, el, delay, ease, interpolate);
   }

   /**
    * Provides a tween to given position data from the current position.
    *
    * @param {PositionDataExtended} toData - The destination position.
    *
    * @param {object}         [opts] - Optional parameters.
    *
    * @param {number}         [opts.delay=0] - Delay in seconds before animation starts.
    *
    * @param {number}         [opts.duration=1] - Duration in seconds.
    *
    * @param {Function}       [opts.ease=cubicOut] - Easing function.
    *
    * @param {Function}       [opts.interpolate=lerp] - Interpolation function.
    *
    * @returns {AnimationControl}  A control object that can cancel animation and provides a `finished` Promise.
    */
   to(toData, { delay = 0, duration = 1, ease = cubicOut, interpolate = lerp$5 } = {})
   {
      if (!isObject(toData))
      {
         throw new TypeError(`AnimationAPI.to error: 'toData' is not an object.`);
      }

      const parent = this.#position.parent;

      // Early out if the application is not positionable.
      if (parent !== void 0 && typeof parent?.options?.positionable === 'boolean' && !parent?.options?.positionable)
      {
         return AnimationControl.voidControl;
      }

      // Cache any target element allowing AnimationManager to stop animation if it becomes disconnected from DOM.
      const targetEl = parent instanceof HTMLElement ? parent : parent?.elementTarget;
      const el = targetEl instanceof HTMLElement && targetEl.isConnected ? targetEl : void 0;

      if (!Number.isFinite(delay) || delay < 0)
      {
         throw new TypeError(`AnimationAPI.to error: 'delay' is not a positive number.`);
      }

      if (!Number.isFinite(duration) || duration < 0)
      {
         throw new TypeError(`AnimationAPI.to error: 'duration' is not a positive number.`);
      }

      if (typeof ease !== 'function')
      {
         throw new TypeError(`AnimationAPI.to error: 'ease' is not a function.`);
      }

      if (typeof interpolate !== 'function')
      {
         throw new TypeError(`AnimationAPI.to error: 'interpolate' is not a function.`);
      }

      const initial = {};
      const destination = {};

      const data = this.#data;

      // Set initial data if the key / data is defined and the end position is not equal to current data.
      for (const key in toData)
      {
         if (data[key] !== void 0 && toData[key] !== data[key])
         {
            destination[key] = toData[key];
            initial[key] = data[key];
         }
      }

      convertRelative(destination, data);

      return this.#addAnimation(initial, destination, duration, el, delay, ease, interpolate);
   }

   /**
    * Returns a function that provides an optimized way to constantly update a to-tween.
    *
    * @param {Iterable<string>}  keys - The keys for quickTo.
    *
    * @param {object}            [opts] - Optional parameters.
    *
    * @param {number}            [opts.duration=1] - Duration in seconds.
    *
    * @param {Function}          [opts.ease=cubicOut] - Easing function.
    *
    * @param {Function}          [opts.interpolate=lerp] - Interpolation function.
    *
    * @returns {quickToCallback} quick-to tween function.
    */
   quickTo(keys, { duration = 1, ease = cubicOut, interpolate = lerp$5 } = {})
   {
      if (!isIterable(keys))
      {
         throw new TypeError(`AnimationAPI.quickTo error: 'keys' is not an iterable list.`);
      }

      const parent = this.#position.parent;

      // Early out if the application is not positionable.
      if (parent !== void 0 && typeof parent?.options?.positionable === 'boolean' && !parent?.options?.positionable)
      {
         throw new Error(`AnimationAPI.quickTo error: 'parent' is not positionable.`);
      }

      if (!Number.isFinite(duration) || duration < 0)
      {
         throw new TypeError(`AnimationAPI.quickTo error: 'duration' is not a positive number.`);
      }

      if (typeof ease !== 'function')
      {
         throw new TypeError(`AnimationAPI.quickTo error: 'ease' is not a function.`);
      }

      if (typeof interpolate !== 'function')
      {
         throw new TypeError(`AnimationAPI.quickTo error: 'interpolate' is not a function.`);
      }

      const initial = {};
      const destination = {};

      const data = this.#data;

      // Set initial data if the key / data is defined and the end position is not equal to current data.
      for (const key of keys)
      {
         if (typeof key !== 'string')
         {
            throw new TypeError(`AnimationAPI.quickTo error: key is not a string.`);
         }

         if (!animateKeys.has(key))
         {
            throw new Error(`AnimationAPI.quickTo error: key ('${key}') is not animatable.`);
         }

         if (data[key] !== void 0)
         {
            destination[key] = data[key];
            initial[key] = data[key];
         }
      }

      const keysArray = [...keys];

      Object.freeze(keysArray);

      const newData = Object.assign({ immediateElementUpdate: true }, initial);

      const animationData = {
         active: true,
         cleanup: this.#cleanup,
         cancelled: false,
         control: void 0,
         current: 0,
         destination,
         duration: duration * 1000, // Internally the AnimationManager works in ms.
         ease,
         el: void 0,
         finished: true, // Note: start in finished state to add to AnimationManager on first callback.
         initial,
         interpolate,
         keys,
         newData,
         position: this.#position,
         resolve: void 0,
         start: void 0
      };

      const quickToCB = (...args) =>
      {
         const argsLength = args.length;

         if (argsLength === 0) { return; }

         for (let cntr = keysArray.length; --cntr >= 0;)
         {
            const key = keysArray[cntr];
            if (data[key] !== void 0) { initial[key] = data[key]; }
         }

         // Handle case where the first arg is an object. Update all quickTo keys from data contained in the object.
         if (isObject(args[0]))
         {
            const objData = args[0];

            for (const key in objData)
            {
               if (destination[key] !== void 0) { destination[key] = objData[key]; }
            }
         }
         else // Assign each variable argument to the key specified in the initial `keys` array above.
         {
            for (let cntr = 0; cntr < argsLength && cntr < keysArray.length; cntr++)
            {
               const key = keysArray[cntr];
               if (destination[key] !== void 0) { destination[key] = args[cntr]; }
            }
         }

         convertRelative(destination, data);

         // Set initial data for transform values that are often null by default.
         setNumericDefaults(initial);
         setNumericDefaults(destination);

         // Set target element to animation data to track if it is removed from the DOM hence ending the animation.
         const targetEl = parent instanceof HTMLElement ? parent : parent?.elementTarget;
         animationData.el = targetEl instanceof HTMLElement && targetEl.isConnected ? targetEl : void 0;

         // Reschedule the quickTo animation with AnimationManager as it is finished.
         if (animationData.finished)
         {
            animationData.finished = false;
            animationData.active = true;
            animationData.current = 0;

            this.#instanceCount++;
            AnimationManager.add(animationData);
         }
         else // QuickTo animation is currently scheduled w/ AnimationManager so reset start and current time.
         {
            const now = performance.now();

            // Offset start time by delta between last rAF time. This allows a delayed tween to start from the
            // precise delayed time.
            animationData.start = now + (AnimationManager.current - now);
            animationData.current = 0;
         }
      };

      quickToCB.keys = keysArray;

      /**
       * Sets options of quickTo tween.
       *
       * @param {object}            [opts] - Optional parameters.
       *
       * @param {number}            [opts.duration] - Duration in seconds.
       *
       * @param {Function}          [opts.ease] - Easing function.
       *
       * @param {Function}          [opts.interpolate] - Interpolation function.
       *
       * @returns {quickToCallback} The quickTo callback.
       */
      quickToCB.options = ({ duration, ease, interpolate } = {}) => // eslint-disable-line no-shadow
      {
         if (duration !== void 0 && (!Number.isFinite(duration) || duration < 0))
         {
            throw new TypeError(`AnimationAPI.quickTo.options error: 'duration' is not a positive number.`);
         }

         if (ease !== void 0 && typeof ease !== 'function')
         {
            throw new TypeError(`AnimationAPI.quickTo.options error: 'ease' is not a function.`);
         }

         if (interpolate !== void 0 && typeof interpolate !== 'function')
         {
            throw new TypeError(`AnimationAPI.quickTo.options error: 'interpolate' is not a function.`);
         }

         if (duration >= 0) { animationData.duration = duration * 1000; }
         if (ease) { animationData.ease = ease; }
         if (interpolate) { animationData.interpolate = interpolate; }

         return quickToCB;
      };

      return quickToCB;
   }
}

/**
 * @callback quickToCallback
 *
 * @param {...number|object} args - Either individual numbers corresponding to the order in which keys are specified or
 *                                  a single object with keys specified and numerical values.
 *
 * @property {({duration?: number, ease?: Function, interpolate?: Function}) => quickToCallback} options - A function
 *                                  to update options for quickTo function.
 */

/**
 * Provides a basic {@link TJSBasicAnimation} implementation for a Position animation for a group of Position instances.
 */
class AnimationGroupControl
{
   /** @type {AnimationControl[]} */
   #animationControls;

   /** @type {Promise<Awaited<unknown>[]>} */
   #finishedPromise;

   /**
    * Defines a static empty / void animation control.
    *
    * @type {AnimationGroupControl}
    */
   static #voidControl = new AnimationGroupControl(null);

   /**
    * Provides a static void / undefined AnimationGroupControl that is automatically resolved.
    *
    * @returns {AnimationGroupControl} Void AnimationGroupControl
    */
   static get voidControl() { return this.#voidControl; }

   /**
    * @param {AnimationControl[]} animationControls - An array of AnimationControl instances.
    */
   constructor(animationControls)
   {
      this.#animationControls = animationControls;
   }

   /**
    * Get a promise that resolves when all animations are finished.
    *
    * @returns {Promise<Awaited<unknown>[]>|Promise<void>} Finished Promise for all animations.
    */
   get finished()
   {
      const animationControls = this.#animationControls;

      if (animationControls === null || animationControls === void 0) { return Promise.resolve(); }

      if (!(this.#finishedPromise instanceof Promise))
      {
         const promises = [];
         for (let cntr = animationControls.length; --cntr >= 0;)
         {
            promises.push(animationControls[cntr].finished);
         }

         this.#finishedPromise = Promise.all(promises);
      }

      return this.#finishedPromise;
   }

   /**
    * Returns whether there are active animation instances for this group.
    *
    * Note: a delayed animation may not be started / active yet. Use {@link AnimationGroupControl.isFinished} to
    * determine if all animations in the group are finished.
    *
    * @returns {boolean} Are there active animation instances.
    */
   get isActive()
   {
      const animationControls = this.#animationControls;

      if (animationControls === null || animationControls === void 0) { return false; }

      for (let cntr = animationControls.length; --cntr >= 0;)
      {
         if (animationControls[cntr].isActive) { return true; }
      }

      return false;
   }

   /**
    * Returns whether all animations in the group are finished.
    *
    * @returns {boolean} Are all animation instances finished.
    */
   get isFinished()
   {
      const animationControls = this.#animationControls;

      if (animationControls === null || animationControls === void 0) { return true; }

      for (let cntr = animationControls.length; --cntr >= 0;)
      {
         if (!animationControls[cntr].isFinished) { return false; }
      }

      return false;
   }

   /**
    * Cancels the all animations.
    */
   cancel()
   {
      const animationControls = this.#animationControls;

      if (animationControls === null || animationControls === void 0) { return; }

      for (let cntr = this.#animationControls.length; --cntr >= 0;)
      {
         this.#animationControls[cntr].cancel();
      }
   }
}

/**
 * Provides a public API for grouping multiple {@link Position} animations together with the AnimationManager.
 *
 * Note: To remove cyclic dependencies as this class provides the Position static / group Animation API `instanceof`
 * checks are not done against Position. Instead, a check for the animate property being an instanceof
 * {@link AnimationAPI} is performed in {@link AnimationGroupAPI.#isPosition}.
 *
 * @see AnimationAPI
 */
class AnimationGroupAPI
{
   /**
    * Checks of the given object is a Position instance by checking for AnimationAPI.
    *
    * @param {*}  object - Any data.
    *
    * @returns {boolean} Is Position.
    */
   static #isPosition(object)
   {
      return object !== null && typeof object === 'object' && object.animate instanceof AnimationAPI;
   }

   /**
    * Cancels any animation for given Position data.
    *
    * @param {Position|{position: Position}|Iterable<Position>|Iterable<{position: Position}>} position -
    */
   static cancel(position)
   {
      if (isIterable(position))
      {
         let index = -1;

         for (const entry of position)
         {
            index++;

            const actualPosition = this.#isPosition(entry) ? entry : entry.position;

            if (!this.#isPosition(actualPosition))
            {
               console.warn(`AnimationGroupAPI.cancel warning: No Position instance found at index: ${index}.`);
               continue;
            }

            AnimationManager.cancel(actualPosition);
         }
      }
      else
      {
         const actualPosition = this.#isPosition(position) ? position : position.position;

         if (!this.#isPosition(actualPosition))
         {
            console.warn(`AnimationGroupAPI.cancel warning: No Position instance found.`);
            return;
         }

         AnimationManager.cancel(actualPosition);
      }
   }

   /**
    * Cancels all Position animation.
    */
   static cancelAll() { AnimationManager.cancelAll(); }

   /**
    * Gets all animation controls for the given position data.
    *
    * @param {Position|{position: Position}|Iterable<Position>|Iterable<{position: Position}>} position -
    *
    * @returns {{position: Position, data: object|void, controls: AnimationControl[]}[]} Results array.
    */
   static getScheduled(position)
   {
      const results = [];

      if (isIterable(position))
      {
         let index = -1;

         for (const entry of position)
         {
            index++;

            const isPosition = this.#isPosition(entry);
            const actualPosition = isPosition ? entry : entry.position;

            if (!this.#isPosition(actualPosition))
            {
               console.warn(`AnimationGroupAPI.getScheduled warning: No Position instance found at index: ${index}.`);
               continue;
            }

            const controls = AnimationManager.getScheduled(actualPosition);

            results.push({ position: actualPosition, data: isPosition ? void 0 : entry, controls });
         }
      }
      else
      {
         const isPosition = this.#isPosition(position);
         const actualPosition = isPosition ? position : position.position;

         if (!this.#isPosition(actualPosition))
         {
            console.warn(`AnimationGroupAPI.getScheduled warning: No Position instance found.`);
            return results;
         }

         const controls = AnimationManager.getScheduled(actualPosition);

         results.push({ position: actualPosition, data: isPosition ? void 0 : position, controls });
      }

      return results;
   }

   /**
    * Provides the `from` animation tween for one or more Position instances as a group.
    *
    * @param {Position|{position: Position}|Iterable<Position>|Iterable<{position: Position}>} position -
    *
    * @param {object|Function}   fromData -
    *
    * @param {object|Function}   options -
    *
    * @returns {TJSBasicAnimation} Basic animation control.
    */
   static from(position, fromData, options)
   {
      if (!isObject(fromData) && typeof fromData !== 'function')
      {
         throw new TypeError(`AnimationGroupAPI.from error: 'fromData' is not an object or function.`);
      }

      if (options !== void 0 && !isObject(options) && typeof options !== 'function')
      {
         throw new TypeError(`AnimationGroupAPI.from error: 'options' is not an object or function.`);
      }

      /**
       * @type {AnimationControl[]}
       */
      const animationControls = [];

      let index = -1;
      let callbackOptions;

      const hasDataCallback = typeof fromData === 'function';
      const hasOptionCallback = typeof options === 'function';
      const hasCallback = hasDataCallback || hasOptionCallback;

      if (hasCallback) { callbackOptions = { index, position: void 0, data: void 0 }; }

      let actualFromData = fromData;
      let actualOptions = options;

      if (isIterable(position))
      {
         for (const entry of position)
         {
            index++;

            const isPosition = this.#isPosition(entry);
            const actualPosition = isPosition ? entry : entry.position;

            if (!this.#isPosition(actualPosition))
            {
               console.warn(`AnimationGroupAPI.from warning: No Position instance found at index: ${index}.`);
               continue;
            }

            if (hasCallback)
            {
               callbackOptions.index = index;
               callbackOptions.position = position;
               callbackOptions.data = isPosition ? void 0 : entry;
            }

            if (hasDataCallback)
            {
               actualFromData = fromData(callbackOptions);

               // Returned data from callback is null / undefined, so skip this position instance.
               if (actualFromData === null || actualFromData === void 0) { continue; }

               if (typeof actualFromData !== 'object')
               {
                  throw new TypeError(`AnimationGroupAPI.from error: fromData callback function iteration(${
                   index}) failed to return an object.`);
               }
            }

            if (hasOptionCallback)
            {
               actualOptions = options(callbackOptions);

               // Returned data from callback is null / undefined, so skip this position instance.
               if (actualOptions === null || actualOptions === void 0) { continue; }

               if (typeof actualOptions !== 'object')
               {
                  throw new TypeError(`AnimationGroupAPI.from error: options callback function iteration(${
                   index}) failed to return an object.`);
               }
            }

            animationControls.push(actualPosition.animate.from(actualFromData, actualOptions));
         }
      }
      else
      {
         const isPosition = this.#isPosition(position);
         const actualPosition = isPosition ? position : position.position;

         if (!this.#isPosition(actualPosition))
         {
            console.warn(`AnimationGroupAPI.from warning: No Position instance found.`);
            return AnimationGroupControl.voidControl;
         }

         if (hasCallback)
         {
            callbackOptions.index = 0;
            callbackOptions.position = position;
            callbackOptions.data = isPosition ? void 0 : position;
         }

         if (hasDataCallback)
         {
            actualFromData = fromData(callbackOptions);

            if (typeof actualFromData !== 'object')
            {
               throw new TypeError(
                `AnimationGroupAPI.from error: fromData callback function failed to return an object.`);
            }
         }

         if (hasOptionCallback)
         {
            actualOptions = options(callbackOptions);

            if (typeof actualOptions !== 'object')
            {
               throw new TypeError(
                `AnimationGroupAPI.from error: options callback function failed to return an object.`);
            }
         }

         animationControls.push(actualPosition.animate.from(actualFromData, actualOptions));
      }

      return new AnimationGroupControl(animationControls);
   }

   /**
    * Provides the `fromTo` animation tween for one or more Position instances as a group.
    *
    * @param {Position|{position: Position}|Iterable<Position>|Iterable<{position: Position}>} position -
    *
    * @param {object|Function}   fromData -
    *
    * @param {object|Function}   toData -
    *
    * @param {object|Function}   options -
    *
    * @returns {TJSBasicAnimation} Basic animation control.
    */
   static fromTo(position, fromData, toData, options)
   {
      if (!isObject(fromData) && typeof fromData !== 'function')
      {
         throw new TypeError(`AnimationGroupAPI.fromTo error: 'fromData' is not an object or function.`);
      }

      if (!isObject(toData) && typeof toData !== 'function')
      {
         throw new TypeError(`AnimationGroupAPI.fromTo error: 'toData' is not an object or function.`);
      }

      if (options !== void 0 && !isObject(options) && typeof options !== 'function')
      {
         throw new TypeError(`AnimationGroupAPI.fromTo error: 'options' is not an object or function.`);
      }

      /**
       * @type {AnimationControl[]}
       */
      const animationControls = [];

      let index = -1;
      let callbackOptions;

      const hasFromCallback = typeof fromData === 'function';
      const hasToCallback = typeof toData === 'function';
      const hasOptionCallback = typeof options === 'function';
      const hasCallback = hasFromCallback || hasToCallback || hasOptionCallback;

      if (hasCallback) { callbackOptions = { index, position: void 0, data: void 0 }; }

      let actualFromData = fromData;
      let actualToData = toData;
      let actualOptions = options;

      if (isIterable(position))
      {
         for (const entry of position)
         {
            index++;

            const isPosition = this.#isPosition(entry);
            const actualPosition = isPosition ? entry : entry.position;

            if (!this.#isPosition(actualPosition))
            {
               console.warn(`AnimationGroupAPI.fromTo warning: No Position instance found at index: ${index}.`);
               continue;
            }

            if (hasCallback)
            {
               callbackOptions.index = index;
               callbackOptions.position = position;
               callbackOptions.data = isPosition ? void 0 : entry;
            }

            if (hasFromCallback)
            {
               actualFromData = fromData(callbackOptions);

               // Returned data from callback is null / undefined, so skip this position instance.
               if (actualFromData === null || actualFromData === void 0) { continue; }

               if (typeof actualFromData !== 'object')
               {
                  throw new TypeError(`AnimationGroupAPI.fromTo error: fromData callback function iteration(${
                   index}) failed to return an object.`);
               }
            }

            if (hasToCallback)
            {
               actualToData = toData(callbackOptions);

               // Returned data from callback is null / undefined, so skip this position instance.
               if (actualToData === null || actualToData === void 0) { continue; }

               if (typeof actualToData !== 'object')
               {
                  throw new TypeError(`AnimationGroupAPI.fromTo error: toData callback function iteration(${
                   index}) failed to return an object.`);
               }
            }

            if (hasOptionCallback)
            {
               actualOptions = options(callbackOptions);

               // Returned data from callback is null / undefined, so skip this position instance.
               if (actualOptions === null || actualOptions === void 0) { continue; }

               if (typeof actualOptions !== 'object')
               {
                  throw new TypeError(`AnimationGroupAPI.fromTo error: options callback function iteration(${
                   index}) failed to return an object.`);
               }
            }

            animationControls.push(actualPosition.animate.fromTo(actualFromData, actualToData, actualOptions));
         }
      }
      else
      {
         const isPosition = this.#isPosition(position);
         const actualPosition = isPosition ? position : position.position;

         if (!this.#isPosition(actualPosition))
         {
            console.warn(`AnimationGroupAPI.fromTo warning: No Position instance found.`);
            return AnimationGroupControl.voidControl;
         }

         if (hasCallback)
         {
            callbackOptions.index = 0;
            callbackOptions.position = position;
            callbackOptions.data = isPosition ? void 0 : position;
         }

         if (hasFromCallback)
         {
            actualFromData = fromData(callbackOptions);

            if (typeof actualFromData !== 'object')
            {
               throw new TypeError(
                `AnimationGroupAPI.fromTo error: fromData callback function failed to return an object.`);
            }
         }

         if (hasToCallback)
         {
            actualToData = toData(callbackOptions);

            if (typeof actualToData !== 'object')
            {
               throw new TypeError(
                `AnimationGroupAPI.fromTo error: toData callback function failed to return an object.`);
            }
         }

         if (hasOptionCallback)
         {
            actualOptions = options(callbackOptions);

            if (typeof actualOptions !== 'object')
            {
               throw new TypeError(
                `AnimationGroupAPI.fromTo error: options callback function failed to return an object.`);
            }
         }

         animationControls.push(actualPosition.animate.fromTo(actualFromData, actualToData, actualOptions));
      }

      return new AnimationGroupControl(animationControls);
   }

   /**
    * Provides the `to` animation tween for one or more Position instances as a group.
    *
    * @param {Position|{position: Position}|Iterable<Position>|Iterable<{position: Position}>} position -
    *
    * @param {object|Function}   toData -
    *
    * @param {object|Function}   options -
    *
    * @returns {TJSBasicAnimation} Basic animation control.
    */
   static to(position, toData, options)
   {
      if (!isObject(toData) && typeof toData !== 'function')
      {
         throw new TypeError(`AnimationGroupAPI.to error: 'toData' is not an object or function.`);
      }

      if (options !== void 0 && !isObject(options) && typeof options !== 'function')
      {
         throw new TypeError(`AnimationGroupAPI.to error: 'options' is not an object or function.`);
      }

      /**
       * @type {AnimationControl[]}
       */
      const animationControls = [];

      let index = -1;
      let callbackOptions;

      const hasDataCallback = typeof toData === 'function';
      const hasOptionCallback = typeof options === 'function';
      const hasCallback = hasDataCallback || hasOptionCallback;

      if (hasCallback) { callbackOptions = { index, position: void 0, data: void 0 }; }

      let actualToData = toData;
      let actualOptions = options;

      if (isIterable(position))
      {
         for (const entry of position)
         {
            index++;

            const isPosition = this.#isPosition(entry);
            const actualPosition = isPosition ? entry : entry.position;

            if (!this.#isPosition(actualPosition))
            {
               console.warn(`AnimationGroupAPI.to warning: No Position instance found at index: ${index}.`);
               continue;
            }

            if (hasCallback)
            {
               callbackOptions.index = index;
               callbackOptions.position = position;
               callbackOptions.data = isPosition ? void 0 : entry;
            }

            if (hasDataCallback)
            {
               actualToData = toData(callbackOptions);

               // Returned data from callback is null / undefined, so skip this position instance.
               if (actualToData === null || actualToData === void 0) { continue; }

               if (typeof actualToData !== 'object')
               {
                  throw new TypeError(`AnimationGroupAPI.to error: toData callback function iteration(${
                   index}) failed to return an object.`);
               }
            }

            if (hasOptionCallback)
            {
               actualOptions = options(callbackOptions);

               // Returned data from callback is null / undefined, so skip this position instance.
               if (actualOptions === null || actualOptions === void 0) { continue; }

               if (typeof actualOptions !== 'object')
               {
                  throw new TypeError(`AnimationGroupAPI.to error: options callback function iteration(${
                   index}) failed to return an object.`);
               }
            }

            animationControls.push(actualPosition.animate.to(actualToData, actualOptions));
         }
      }
      else
      {
         const isPosition = this.#isPosition(position);
         const actualPosition = isPosition ? position : position.position;

         if (!this.#isPosition(actualPosition))
         {
            console.warn(`AnimationGroupAPI.to warning: No Position instance found.`);
            return AnimationGroupControl.voidControl;
         }

         if (hasCallback)
         {
            callbackOptions.index = 0;
            callbackOptions.position = position;
            callbackOptions.data = isPosition ? void 0 : position;
         }

         if (hasDataCallback)
         {
            actualToData = toData(callbackOptions);

            if (typeof actualToData !== 'object')
            {
               throw new TypeError(
                `AnimationGroupAPI.to error: toData callback function failed to return an object.`);
            }
         }

         if (hasOptionCallback)
         {
            actualOptions = options(callbackOptions);

            if (typeof actualOptions !== 'object')
            {
               throw new TypeError(
                `AnimationGroupAPI.to error: options callback function failed to return an object.`);
            }
         }

         animationControls.push(actualPosition.animate.to(actualToData, actualOptions));
      }

      return new AnimationGroupControl(animationControls);
   }

   /**
    * Provides the `to` animation tween for one or more Position instances as a group.
    *
    * @param {Position|{position: Position}|Iterable<Position>|Iterable<{position: Position}>} position -
    *
    * @param {Iterable<string>}  keys -
    *
    * @param {object|Function}   options -
    *
    * @returns {quickToCallback} Basic animation control.
    */
   static quickTo(position, keys, options)
   {
      if (!isIterable(keys))
      {
         throw new TypeError(`AnimationGroupAPI.quickTo error: 'keys' is not an iterable list.`);
      }

      if (options !== void 0 && !isObject(options) && typeof options !== 'function')
      {
         throw new TypeError(`AnimationGroupAPI.quickTo error: 'options' is not an object or function.`);
      }

      /**
       * @type {quickToCallback[]}
       */
      const quickToCallbacks = [];

      let index = -1;

      const hasOptionCallback = typeof options === 'function';

      const callbackOptions = { index, position: void 0, data: void 0 };

      let actualOptions = options;

      if (isIterable(position))
      {
         for (const entry of position)
         {
            index++;

            const isPosition = this.#isPosition(entry);
            const actualPosition = isPosition ? entry : entry.position;

            if (!this.#isPosition(actualPosition))
            {
               console.warn(`AnimationGroupAPI.quickTo warning: No Position instance found at index: ${index}.`);
               continue;
            }

            callbackOptions.index = index;
            callbackOptions.position = position;
            callbackOptions.data = isPosition ? void 0 : entry;

            if (hasOptionCallback)
            {
               actualOptions = options(callbackOptions);

               // Returned data from callback is null / undefined, so skip this position instance.
               if (actualOptions === null || actualOptions === void 0) { continue; }

               if (typeof actualOptions !== 'object')
               {
                  throw new TypeError(`AnimationGroupAPI.quickTo error: options callback function iteration(${
                   index}) failed to return an object.`);
               }
            }

            quickToCallbacks.push(actualPosition.animate.quickTo(keys, actualOptions));
         }
      }
      else
      {
         const isPosition = this.#isPosition(position);
         const actualPosition = isPosition ? position : position.position;

         if (!this.#isPosition(actualPosition))
         {
            console.warn(`AnimationGroupAPI.quickTo warning: No Position instance found.`);
            return () => null;
         }

         callbackOptions.index = 0;
         callbackOptions.position = position;
         callbackOptions.data = isPosition ? void 0 : position;

         if (hasOptionCallback)
         {
            actualOptions = options(callbackOptions);

            if (typeof actualOptions !== 'object')
            {
               throw new TypeError(
                `AnimationGroupAPI.quickTo error: options callback function failed to return an object.`);
            }
         }

         quickToCallbacks.push(actualPosition.animate.quickTo(keys, actualOptions));
      }

      const keysArray = [...keys];

      Object.freeze(keysArray);

      const quickToCB = (...args) =>
      {
         const argsLength = args.length;

         if (argsLength === 0) { return; }

         if (typeof args[0] === 'function')
         {
            const dataCallback = args[0];

            index = -1;
            let cntr = 0;

            if (isIterable(position))
            {
               for (const entry of position)
               {
                  index++;

                  const isPosition = this.#isPosition(entry);
                  const actualPosition = isPosition ? entry : entry.position;

                  if (!this.#isPosition(actualPosition)) { continue; }

                  callbackOptions.index = index;
                  callbackOptions.position = position;
                  callbackOptions.data = isPosition ? void 0 : entry;

                  const toData = dataCallback(callbackOptions);

                  // Returned data from callback is null / undefined, so skip this position instance.
                  if (toData === null || toData === void 0) { continue; }

                  /**
                   * @type {boolean}
                   */
                  const toDataIterable = isIterable(toData);

                  if (!Number.isFinite(toData) && !toDataIterable && typeof toData !== 'object')
                  {
                     throw new TypeError(`AnimationGroupAPI.quickTo error: toData callback function iteration(${
                      index}) failed to return a finite number, iterable list, or object.`);
                  }

                  if (toDataIterable)
                  {
                     quickToCallbacks[cntr++](...toData);
                  }
                  else
                  {
                     quickToCallbacks[cntr++](toData);
                  }
               }
            }
            else
            {
               const isPosition = this.#isPosition(position);
               const actualPosition = isPosition ? position : position.position;

               if (!this.#isPosition(actualPosition)) { return; }

               callbackOptions.index = 0;
               callbackOptions.position = position;
               callbackOptions.data = isPosition ? void 0 : position;

               const toData = dataCallback(callbackOptions);

               // Returned data from callback is null / undefined, so skip this position instance.
               if (toData === null || toData === void 0) { return; }

               const toDataIterable = isIterable(toData);

               if (!Number.isFinite(toData) && !toDataIterable && typeof toData !== 'object')
               {
                  throw new TypeError(`AnimationGroupAPI.quickTo error: toData callback function iteration(${
                   index}) failed to return a finite number, iterable list, or object.`);
               }

               if (toDataIterable)
               {
                  quickToCallbacks[cntr++](...toData);
               }
               else
               {
                  quickToCallbacks[cntr++](toData);
               }
            }
         }
         else
         {
            for (let cntr = quickToCallbacks.length; --cntr >= 0;)
            {
               quickToCallbacks[cntr](...args);
            }
         }
      };

      quickToCB.keys = keysArray;

      /**
       * Sets options of quickTo tween.
       *
       * @param {object|Function}   [options] - Optional parameters.
       *
       * @param {number}            [options.duration] - Duration in seconds.
       *
       * @param {Function}          [options.ease] - Easing function.
       *
       * @param {Function}          [options.interpolate] - Interpolation function.
       *
       * @returns {quickToCallback} The quickTo callback.
       */
      quickToCB.options = (options) => // eslint-disable-line no-shadow
      {
         if (options !== void 0 && !isObject(options) && typeof options !== 'function')
         {
            throw new TypeError(`AnimationGroupAPI.quickTo error: 'options' is not an object or function.`);
         }

         // Set options object for each quickTo callback.
         if (isObject(options))
         {
            for (let cntr = quickToCallbacks.length; --cntr >= 0;) { quickToCallbacks[cntr].options(options); }
         }
         else if (typeof options === 'function')
         {
            if (isIterable(position))
            {
               index = -1;
               let cntr = 0;

               for (const entry of position)
               {
                  index++;

                  const isPosition = this.#isPosition(entry);
                  const actualPosition = isPosition ? entry : entry.position;

                  if (!this.#isPosition(actualPosition))
                  {
                     console.warn(
                      `AnimationGroupAPI.quickTo.options warning: No Position instance found at index: ${index}.`);
                     continue;
                  }

                  callbackOptions.index = index;
                  callbackOptions.position = position;
                  callbackOptions.data = isPosition ? void 0 : entry;

                  actualOptions = options(callbackOptions);

                  // Returned data from callback is null / undefined, so skip this position instance.
                  if (actualOptions === null || actualOptions === void 0) { continue; }

                  if (typeof actualOptions !== 'object')
                  {
                     throw new TypeError(
                      `AnimationGroupAPI.quickTo.options error: options callback function iteration(${
                       index}) failed to return an object.`);
                  }

                  quickToCallbacks[cntr++].options(actualOptions);
               }
            }
            else
            {
               const isPosition = this.#isPosition(position);
               const actualPosition = isPosition ? position : position.position;

               if (!this.#isPosition(actualPosition))
               {
                  console.warn(`AnimationGroupAPI.quickTo.options warning: No Position instance found.`);
                  return quickToCB;
               }

               callbackOptions.index = 0;
               callbackOptions.position = position;
               callbackOptions.data = isPosition ? void 0 : position;

               actualOptions = options(callbackOptions);

               if (typeof actualOptions !== 'object')
               {
                  throw new TypeError(
                   `AnimationGroupAPI.quickTo error: options callback function failed to return an object.`);
               }

               quickToCallbacks[0].options(actualOptions);
            }
         }

         return quickToCB;
      };

      return quickToCB;
   }
}

class Centered
{
   /**
    * @type {HTMLElement}
    */
   #element;

   /**
    * Provides a manual setting of the element height. As things go `offsetHeight` causes a browser layout and is not
    * performance oriented. If manually set this height is used instead of `offsetHeight`.
    *
    * @type {number}
    */
   #height;

   /**
    * Set from an optional value in the constructor to lock accessors preventing modification.
    */
   #lock;

   /**
    * Provides a manual setting of the element width. As things go `offsetWidth` causes a browser layout and is not
    * performance oriented. If manually set this width is used instead of `offsetWidth`.
    *
    * @type {number}
    */
   #width;

   constructor({ element, lock = false, width, height } = {})
   {
      this.element = element;
      this.width = width;
      this.height = height;

      this.#lock = typeof lock === 'boolean' ? lock : false;
   }

   get element() { return this.#element; }

   get height() { return this.#height; }

   get width() { return this.#width; }

   set element(element)
   {
      if (this.#lock) { return; }

      if (element === void 0  || element === null || element instanceof HTMLElement)
      {
         this.#element = element;
      }
      else
      {
         throw new TypeError(`'element' is not a HTMLElement, undefined, or null.`);
      }
   }

   set height(height)
   {
      if (this.#lock) { return; }

      if (height === void 0 || Number.isFinite(height))
      {
         this.#height = height;
      }
      else
      {
         throw new TypeError(`'height' is not a finite number or undefined.`);
      }
   }

   set width(width)
   {
      if (this.#lock) { return; }

      if (width === void 0 || Number.isFinite(width))
      {
         this.#width = width;
      }
      else
      {
         throw new TypeError(`'width' is not a finite number or undefined.`);
      }
   }

   setDimension(width, height)
   {
      if (this.#lock) { return; }

      if (width === void 0 || Number.isFinite(width))
      {
         this.#width = width;
      }
      else
      {
         throw new TypeError(`'width' is not a finite number or undefined.`);
      }

      if (height === void 0 || Number.isFinite(height))
      {
         this.#height = height;
      }
      else
      {
         throw new TypeError(`'height' is not a finite number or undefined.`);
      }
   }

   getLeft(width)
   {
      // Determine containing bounds from manual values; or any element; lastly the browser width / height.
      const boundsWidth = this.#width ?? this.#element?.offsetWidth ?? globalThis.innerWidth;

      return (boundsWidth - width) / 2;
   }

   getTop(height)
   {
      const boundsHeight = this.#height ?? this.#element?.offsetHeight ?? globalThis.innerHeight;

      return (boundsHeight - height) / 2;
   }
}

const browserCentered = new Centered();

var positionInitial = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Centered: Centered,
    browserCentered: browserCentered
});

class PositionChangeSet
{
   constructor()
   {
      this.left = false;
      this.top = false;
      this.width = false;
      this.height = false;
      this.maxHeight = false;
      this.maxWidth = false;
      this.minHeight = false;
      this.minWidth = false;
      this.zIndex = false;
      this.transform = false;
      this.transformOrigin = false;
   }

   hasChange()
   {
      return this.left || this.top || this.width || this.height || this.maxHeight || this.maxWidth || this.minHeight ||
       this.minWidth || this.zIndex || this.transform || this.transformOrigin;
   }

   set(value)
   {
      this.left = value;
      this.top = value;
      this.width = value;
      this.height = value;
      this.maxHeight = value;
      this.maxWidth = value;
      this.minHeight = value;
      this.minWidth = value;
      this.zIndex = value;
      this.transform = value;
      this.transformOrigin = value;
   }
}

/**
 * Defines stored positional data.
 */
class PositionData
{
   constructor({ height = null, left = null, maxHeight = null, maxWidth = null, minHeight = null, minWidth = null,
    rotateX = null, rotateY = null, rotateZ = null, scale = null, translateX = null, translateY = null,
     translateZ = null, top = null, transformOrigin = null, width = null, zIndex = null } = {})
   {
      /**
       * @type {number|'auto'|'inherit'|null}
       */
      this.height = height;

      /**
       * @type {number|null}
       */
      this.left = left;

      /**
       * @type {number|null}
       */
      this.maxHeight = maxHeight;

      /**
       * @type {number|null}
       */
      this.maxWidth = maxWidth;

      /**
       * @type {number|null}
       */
      this.minHeight = minHeight;

      /**
       * @type {number|null}
       */
      this.minWidth = minWidth;

      /**
       * @type {number|null}
       */
      this.rotateX = rotateX;

      /**
       * @type {number|null}
       */
      this.rotateY = rotateY;

      /**
       * @type {number|null}
       */
      this.rotateZ = rotateZ;

      /**
       * @type {number|null}
       */
      this.scale = scale;

      /**
       * @type {number|null}
       */
      this.top = top;

      /**
       * @type {string|null}
       */
      this.transformOrigin = transformOrigin;

      /**
       * @type {number|null}
       */
      this.translateX = translateX;

      /**
       * @type {number|null}
       */
      this.translateY = translateY;

      /**
       * @type {number|null}
       */
      this.translateZ = translateZ;

      /**
       * @type {number|'auto'|'inherit'|null}
       */
      this.width = width;

      /**
       * @type {number|null}
       */
      this.zIndex = zIndex;

      Object.seal(this);
   }

   /**
    * Copies given data to this instance.
    *
    * @param {PositionData}   data - Copy from this instance.
    *
    * @returns {PositionData} This instance.
    */
   copy(data)
   {
      this.height = data.height;
      this.left = data.left;
      this.maxHeight = data.maxHeight;
      this.maxWidth = data.maxWidth;
      this.minHeight = data.minHeight;
      this.minWidth = data.minWidth;
      this.rotateX = data.rotateX;
      this.rotateY = data.rotateY;
      this.rotateZ = data.rotateZ;
      this.scale = data.scale;
      this.top = data.top;
      this.transformOrigin = data.transformOrigin;
      this.translateX = data.translateX;
      this.translateY = data.translateY;
      this.translateZ = data.translateZ;
      this.width = data.width;
      this.zIndex = data.zIndex;

      return this;
   }
}

class PositionStateAPI
{
   /** @type {PositionData} */
   #data;

   /**
    * @type {Map<string, PositionDataExtended>}
    */
   #dataSaved = new Map();

   /** @type {Position} */
   #position;

   /** @type {Transforms} */
   #transforms;

   constructor(position, data, transforms)
   {
      this.#position = position;
      this.#data = data;
      this.#transforms = transforms;
   }

   /**
    * Returns any stored save state by name.
    *
    * @param {string}   name - Saved data set name.
    *
    * @returns {PositionDataExtended} The saved data set.
    */
   get({ name })
   {
      if (typeof name !== 'string') { throw new TypeError(`Position - getSave error: 'name' is not a string.`); }

      return this.#dataSaved.get(name);
   }

   /**
    * Returns any associated default data.
    *
    * @returns {PositionDataExtended} Associated default data.
    */
   getDefault()
   {
      return this.#dataSaved.get('#defaultData');
   }

   /**
    * Removes and returns any position state by name.
    *
    * @param {object}   options - Options.
    *
    * @param {string}   options.name - Name to remove and retrieve.
    *
    * @returns {PositionDataExtended} Saved position data.
    */
   remove({ name })
   {
      if (typeof name !== 'string') { throw new TypeError(`Position - remove: 'name' is not a string.`); }

      const data = this.#dataSaved.get(name);
      this.#dataSaved.delete(name);

      return data;
   }

   /**
    * Resets data to default values and invokes set.
    *
    * @param {object}   [opts] - Optional parameters.
    *
    * @param {boolean}  [opts.keepZIndex=false] - When true keeps current z-index.
    *
    * @param {boolean}  [opts.invokeSet=true] - When true invokes set method.
    *
    * @returns {boolean} Operation successful.
    */
   reset({ keepZIndex = false, invokeSet = true } = {})
   {
      const defaultData = this.#dataSaved.get('#defaultData');

      // Quit early if there is no saved default data.
      if (typeof defaultData !== 'object') { return false; }

      // Cancel all animations for Position if there are currently any scheduled.
      if (this.#position.animate.isScheduled)
      {
         this.#position.animate.cancel();
      }

      const zIndex = this.#position.zIndex;

      const data = Object.assign({}, defaultData);

      if (keepZIndex) { data.zIndex = zIndex; }

      // Reset the transform data.
      this.#transforms.reset(data);

      // If current minimized invoke `maximize`.
      if (this.#position.parent?.reactive?.minimized)
      {
         this.#position.parent?.maximize?.({ animate: false, duration: 0 });
      }

      // Note next clock tick scheduling.
      if (invokeSet) { setTimeout(() => this.#position.set(data), 0); }

      return true;
   }

   /**
    * Restores a saved positional state returning the data. Several optional parameters are available
    * to control whether the restore action occurs silently (no store / inline styles updates), animates
    * to the stored data, or simply sets the stored data. Restoring via {@link AnimationAPI.to} allows
    * specification of the duration, easing, and interpolate functions along with configuring a Promise to be
    * returned if awaiting the end of the animation.
    *
    * @param {object}            params - Parameters
    *
    * @param {string}            params.name - Saved data set name.
    *
    * @param {boolean}           [params.remove=false] - Remove data set.
    *
    * @param {Iterable<string>}  [params.properties] - Specific properties to set / animate.
    *
    * @param {boolean}           [params.silent] - Set position data directly; no store or style updates.
    *
    * @param {boolean}           [params.async=false] - If animating return a Promise that resolves with any saved data.
    *
    * @param {boolean}           [params.animateTo=false] - Animate to restore data.
    *
    * @param {number}            [params.duration=0.1] - Duration in seconds.
    *
    * @param {Function}          [params.ease=linear] - Easing function.
    *
    * @param {Function}          [params.interpolate=lerp] - Interpolation function.
    *
    * @returns {PositionDataExtended|Promise<PositionDataExtended>} Saved position data.
    */
   restore({ name, remove = false, properties, silent = false, async = false, animateTo = false, duration = 0.1,
    ease = identity, interpolate = lerp$5 })
   {
      if (typeof name !== 'string') { throw new TypeError(`Position - restore error: 'name' is not a string.`); }

      const dataSaved = this.#dataSaved.get(name);

      if (dataSaved)
      {
         if (remove) { this.#dataSaved.delete(name); }

         let data = dataSaved;

         if (isIterable(properties))
         {
            data = {};
            for (const property of properties) { data[property] = dataSaved[property]; }
         }

         // Update data directly with no store or inline style updates.
         if (silent)
         {
            for (const property in data) { this.#data[property] = data[property]; }
            return dataSaved;
         }
         else if (animateTo)  // Animate to saved data.
         {
            // Provide special handling to potentially change transform origin as this parameter is not animated.
            if (data.transformOrigin !== this.#position.transformOrigin)
            {
               this.#position.transformOrigin = data.transformOrigin;
            }

            // Return a Promise with saved data that resolves after animation ends.
            if (async)
            {
               return this.#position.animate.to(data, { duration, ease, interpolate }).finished.then(() => dataSaved);
            }
            else  // Animate synchronously.
            {
               this.#position.animate.to(data, { duration, ease, interpolate });
            }
         }
         else
         {
            // Default options is to set data for an immediate update.
            this.#position.set(data);
         }
      }

      return dataSaved;
   }

   /**
    * Saves current position state with the opportunity to add extra data to the saved state.
    *
    * @param {object}   opts - Options.
    *
    * @param {string}   opts.name - name to index this saved data.
    *
    * @param {...*}     [opts.extra] - Extra data to add to saved data.
    *
    * @returns {PositionData} Current position data
    */
   save({ name, ...extra })
   {
      if (typeof name !== 'string') { throw new TypeError(`Position - save error: 'name' is not a string.`); }

      const data = this.#position.get(extra);

      this.#dataSaved.set(name, data);

      return data;
   }

   /**
    * Directly sets a position state.
    *
    * @param {object}   opts - Options.
    *
    * @param {string}   opts.name - name to index this saved data.
    *
    * @param {...*}     [opts.data] - Position data to set.
    */
   set({ name, ...data })
   {
      if (typeof name !== 'string') { throw new TypeError(`Position - set error: 'name' is not a string.`); }

      this.#dataSaved.set(name, data);
   }
}

class StyleCache
{
   constructor()
   {
      /** @type {HTMLElement|undefined} */
      this.el = void 0;

      /** @type {CSSStyleDeclaration} */
      this.computed = void 0;

      /** @type {number|undefined} */
      this.marginLeft = void 0;

      /** @type {number|undefined} */
      this.marginTop = void 0;

      /** @type {number|undefined} */
      this.maxHeight = void 0;

      /** @type {number|undefined} */
      this.maxWidth = void 0;

      /** @type {number|undefined} */
      this.minHeight = void 0;

      /** @type {number|undefined} */
      this.minWidth = void 0;

      /** @type {boolean} */
      this.hasWillChange = false;

      /**
       * @type {ResizeObserverData}
       */
      this.resizeObserved = {
         contentHeight: void 0,
         contentWidth: void 0,
         offsetHeight: void 0,
         offsetWidth: void 0
      };

      /**
       * Provides a writable store to track offset & content width / height from an associated `resizeObserver` action.
       *
       * @type {Writable<ResizeObserverData>}
       */
      const storeResizeObserved = writable$1(this.resizeObserved);

      this.stores = {
         element: writable$1(this.el),
         resizeContentHeight: propertyStore(storeResizeObserved, 'contentHeight'),
         resizeContentWidth: propertyStore(storeResizeObserved, 'contentWidth'),
         resizeObserved: storeResizeObserved,
         resizeOffsetHeight: propertyStore(storeResizeObserved, 'offsetHeight'),
         resizeOffsetWidth: propertyStore(storeResizeObserved, 'offsetWidth')
      };
   }

   /**
    * Returns the cached offsetHeight from any attached `resizeObserver` action otherwise gets the offsetHeight from
    * the element directly. The more optimized path is using `resizeObserver` as getting it from the element
    * directly is more expensive and alters the execution order of an animation frame.
    *
    * @returns {number} The element offsetHeight.
    */
   get offsetHeight()
   {
      if (this.el instanceof HTMLElement)
      {
         return this.resizeObserved.offsetHeight !== void 0 ? this.resizeObserved.offsetHeight : this.el.offsetHeight;
      }

      throw new Error(`StyleCache - get offsetHeight error: no element assigned.`);
   }

   /**
    * Returns the cached offsetWidth from any attached `resizeObserver` action otherwise gets the offsetWidth from
    * the element directly. The more optimized path is using `resizeObserver` as getting it from the element
    * directly is more expensive and alters the execution order of an animation frame.
    *
    * @returns {number} The element offsetHeight.
    */
   get offsetWidth()
   {
      if (this.el instanceof HTMLElement)
      {
         return this.resizeObserved.offsetWidth !== void 0 ? this.resizeObserved.offsetWidth : this.el.offsetWidth;
      }

      throw new Error(`StyleCache - get offsetWidth error: no element assigned.`);
   }

   /**
    * @param {HTMLElement} el -
    *
    * @returns {boolean} Does element match cached element.
    */
   hasData(el) { return this.el === el; }

   /**
    * Resets the style cache.
    */
   reset()
   {
      // Remove will-change inline style from previous element if it is still connected.
      if (this.el instanceof HTMLElement && this.el.isConnected && !this.hasWillChange)
      {
         this.el.style.willChange = null;
      }

      this.el = void 0;
      this.computed = void 0;
      this.marginLeft = void 0;
      this.marginTop = void 0;
      this.maxHeight = void 0;
      this.maxWidth = void 0;
      this.minHeight = void 0;
      this.minWidth = void 0;

      this.hasWillChange = false;

      // Silently reset `resizedObserved`; With proper usage the `resizeObserver` action issues an update on removal.
      this.resizeObserved.contentHeight = void 0;
      this.resizeObserved.contentWidth = void 0;
      this.resizeObserved.offsetHeight = void 0;
      this.resizeObserved.offsetWidth = void 0;

      // Reset the tracked element this Position instance is modifying.
      this.stores.element.set(void 0);
   }

   /**
    * Updates the style cache with new data from the given element.
    *
    * @param {HTMLElement} el - An HTML element.
    */
   update(el)
   {
      this.el = el;

      this.computed = globalThis.getComputedStyle(el);

      this.marginLeft = styleParsePixels(el.style.marginLeft) ?? styleParsePixels(this.computed.marginLeft);
      this.marginTop = styleParsePixels(el.style.marginTop) ?? styleParsePixels(this.computed.marginTop);
      this.maxHeight = styleParsePixels(el.style.maxHeight) ?? styleParsePixels(this.computed.maxHeight);
      this.maxWidth = styleParsePixels(el.style.maxWidth) ?? styleParsePixels(this.computed.maxWidth);

      // Note that the computed styles for below will always be 0px / 0 when no style is active.
      this.minHeight = styleParsePixels(el.style.minHeight) ?? styleParsePixels(this.computed.minHeight);
      this.minWidth = styleParsePixels(el.style.minWidth) ?? styleParsePixels(this.computed.minWidth);

      // Tracks if there already is a will-change property on the inline or computed styles.
      const willChange = el.style.willChange !== '' ? el.style.willChange : this.computed.willChange;

      this.hasWillChange = willChange !== '' && willChange !== 'auto';

      // Update the tracked element this Position instance is modifying.
      this.stores.element.set(el);
   }
}

/**
 * Provides the output data for {@link Transforms.getData}.
 */
class TransformData
{
   constructor()
   {
      Object.seal(this);
   }

   /**
    * Stores the calculated bounding rectangle.
    *
    * @type {DOMRect}
    */
   #boundingRect = new DOMRect();

   /**
    * Stores the individual transformed corner points of the window in screenspace clockwise from:
    * top left -> top right -> bottom right -> bottom left.
    *
    * @type {Vector3[]}
    */
   #corners = [vec3.create(), vec3.create(), vec3.create(), vec3.create()];

   /**
    * Stores the current gl-matrix mat4 data.
    *
    * @type {Matrix4}
    */
   #mat4 = mat4.create();

   /**
    * Stores the pre & post origin translations to apply to matrix transforms.
    *
    * @type {Matrix4[]}
    */
   #originTranslations = [mat4.create(), mat4.create()];

   /**
    * @returns {DOMRect} The bounding rectangle.
    */
   get boundingRect() { return this.#boundingRect; }

   /**
    * @returns {Vector3[]} The transformed corner points as vec3 in screen space.
    */
   get corners() { return this.#corners; }

   /**
    * @returns {string} Returns the CSS style string for the transform matrix.
    */
   get css() { return `matrix3d(${this.mat4.join(',')})`; }

   /**
    * @returns {Matrix4} The transform matrix.
    */
   get mat4() { return this.#mat4; }

   /**
    * @returns {Matrix4[]} The pre / post translation matrices for origin translation.
    */
   get originTranslations() { return this.#originTranslations; }
}

/**
 * @typedef {Float32Array} Vector3 - 3 Dimensional Vector.
 *
 * @see https://glmatrix.net/docs/module-vec3.html
 */

/**
 * @typedef {Float32Array} Matrix4 - 4x4 Matrix; Format: column-major, when typed out it looks like row-major.
 *
 * @see https://glmatrix.net/docs/module-mat4.html
 */

/**
 * Provides the storage and sequencing of managed position validators. Each validator added may be a bespoke function or
 * a {@link ValidatorData} object containing an `id`, `validator`, and `weight` attributes; `validator` is the only
 * required attribute.
 *
 * The `id` attribute can be anything that creates a unique ID for the validator; recommended strings or numbers. This
 * allows validators to be removed by ID easily.
 *
 * The `weight` attribute is a number between 0 and 1 inclusive that allows validators to be added in a
 * predictable order which is especially handy if they are manipulated at runtime. A lower weighted validator always
 * runs before a higher weighted validator. If no weight is specified the default of '1' is assigned and it is appended
 * to the end of the validators list.
 *
 * This class forms the public API which is accessible from the `.validators` getter in the main Position instance.
 * ```
 * const position = new Position(<PositionData>);
 * position.validators.add(...);
 * position.validators.clear();
 * position.validators.length;
 * position.validators.remove(...);
 * position.validators.removeBy(...);
 * position.validators.removeById(...);
 * ```
 */
class AdapterValidators
{
   /**
    * @type {ValidatorData[]}
    */
   #validatorData;

   #mapUnsubscribe = new Map();

   /**
    * @returns {[AdapterValidators, ValidatorData[]]} Returns this and internal storage for validator adapter.
    */
   constructor()
   {
      this.#validatorData = [];

      Object.seal(this);

      return [this, this.#validatorData];
   }

   /**
    * @returns {number} Returns the length of the validators array.
    */
   get length() { return this.#validatorData.length; }

   /**
    * Provides an iterator for validators.
    *
    * @returns {Generator<ValidatorData|undefined>} Generator / iterator of validators.
    * @yields {ValidatorData<T>}
    */
   *[Symbol.iterator]()
   {
      if (this.#validatorData.length === 0) { return; }

      for (const entry of this.#validatorData)
      {
         yield { ...entry };
      }
   }

   /**
    * @param {...(ValidatorFn<T>|ValidatorData<T>)}   validators -
    */
   add(...validators)
   {

      for (const validator of validators)
      {
         const validatorType = typeof validator;

         if (validatorType !== 'function' && validatorType !== 'object' || validator === null)
         {
            throw new TypeError(`AdapterValidator error: 'validator' is not a function or object.`);
         }

         let data = void 0;
         let subscribeFn = void 0;

         switch (validatorType)
         {
            case 'function':
               data = {
                  id: void 0,
                  validator,
                  weight: 1
               };

               subscribeFn = validator.subscribe;
               break;

            case 'object':
               if (typeof validator.validator !== 'function')
               {
                  throw new TypeError(`AdapterValidator error: 'validator' attribute is not a function.`);
               }

               if (validator.weight !== void 0 && typeof validator.weight !== 'number' ||
                (validator.weight < 0 || validator.weight > 1))
               {
                  throw new TypeError(
                   `AdapterValidator error: 'weight' attribute is not a number between '0 - 1' inclusive.`);
               }

               data = {
                  id: validator.id !== void 0 ? validator.id : void 0,
                  validator: validator.validator.bind(validator),
                  weight: validator.weight || 1,
                  instance: validator
               };

               subscribeFn = validator.validator.subscribe ?? validator.subscribe;
               break;
         }

         // Find the index to insert where data.weight is less than existing values weight.
         const index = this.#validatorData.findIndex((value) =>
         {
            return data.weight < value.weight;
         });

         // If an index was found insert at that location.
         if (index >= 0)
         {
            this.#validatorData.splice(index, 0, data);
         }
         else // push to end of validators.
         {
            this.#validatorData.push(data);
         }

         if (typeof subscribeFn === 'function')
         {
            // TODO: consider how to handle validator updates.
            const unsubscribe = subscribeFn();

            // Ensure that unsubscribe is a function.
            if (typeof unsubscribe !== 'function')
            {
               throw new TypeError(
                'AdapterValidator error: Filter has subscribe function, but no unsubscribe function is returned.');
            }

            // Ensure that the same validator is not subscribed to multiple times.
            if (this.#mapUnsubscribe.has(data.validator))
            {
               throw new Error(
                'AdapterValidator error: Filter added already has an unsubscribe function registered.');
            }

            this.#mapUnsubscribe.set(data.validator, unsubscribe);
         }
      }

      // Filters with subscriber functionality are assumed to immediately invoke the `subscribe` callback. If the
      // subscriber count is less than the amount of validators added then automatically trigger an index update
      // manually.
      // TODO: handle validator updates.
      // if (subscribeCount < validators.length) { this.#indexUpdate(); }
   }

   clear()
   {
      this.#validatorData.length = 0;

      // Unsubscribe from all validators with subscription support.
      for (const unsubscribe of this.#mapUnsubscribe.values())
      {
         unsubscribe();
      }

      this.#mapUnsubscribe.clear();

      // TODO: handle validator updates.
      // this.#indexUpdate();
   }

   /**
    * @param {...(ValidatorFn<T>|ValidatorData<T>)}   validators -
    */
   remove(...validators)
   {
      const length = this.#validatorData.length;

      if (length === 0) { return; }

      for (const data of validators)
      {
         // Handle the case that the validator may either be a function or a validator entry / object.
         const actualValidator = typeof data === 'function' ? data : data !== null && typeof data === 'object' ?
          data.validator : void 0;

         if (!actualValidator) { continue; }

         for (let cntr = this.#validatorData.length; --cntr >= 0;)
         {
            if (this.#validatorData[cntr].validator === actualValidator)
            {
               this.#validatorData.splice(cntr, 1);

               // Invoke any unsubscribe function for given validator then remove from tracking.
               let unsubscribe = void 0;
               if (typeof (unsubscribe = this.#mapUnsubscribe.get(actualValidator)) === 'function')
               {
                  unsubscribe();
                  this.#mapUnsubscribe.delete(actualValidator);
               }
            }
         }
      }

      // Update the index a validator was removed.
      // TODO: handle validator updates.
      // if (length !== this.#validatorData.length) { this.#indexUpdate(); }
   }

   /**
    * Remove validators by the provided callback. The callback takes 3 parameters: `id`, `validator`, and `weight`.
    * Any truthy value returned will remove that validator.
    *
    * @param {function(*, ValidatorFn<T>, number): boolean} callback - Callback function to evaluate each validator
    *                                                                  entry.
    */
   removeBy(callback)
   {
      const length = this.#validatorData.length;

      if (length === 0) { return; }

      if (typeof callback !== 'function')
      {
         throw new TypeError(`AdapterValidator error: 'callback' is not a function.`);
      }

      this.#validatorData = this.#validatorData.filter((data) =>
      {
         const remove = callback.call(callback, { ...data });

         if (remove)
         {
            let unsubscribe;
            if (typeof (unsubscribe = this.#mapUnsubscribe.get(data.validator)) === 'function')
            {
               unsubscribe();
               this.#mapUnsubscribe.delete(data.validator);
            }
         }

         // Reverse remove boolean to properly validator / remove this validator.
         return !remove;
      });

      // TODO: handle validator updates.
      // if (length !== this.#validatorData.length) { this.#indexUpdate(); }
   }

   removeById(...ids)
   {
      const length = this.#validatorData.length;

      if (length === 0) { return; }

      this.#validatorData = this.#validatorData.filter((data) =>
      {
         let remove = false;

         for (const id of ids) { remove |= data.id === id; }

         // If not keeping invoke any unsubscribe function for given validator then remove from tracking.
         if (remove)
         {
            let unsubscribe;
            if (typeof (unsubscribe = this.#mapUnsubscribe.get(data.validator)) === 'function')
            {
               unsubscribe();
               this.#mapUnsubscribe.delete(data.validator);
            }
         }

         return !remove; // Swap here to actually remove the item via array validator method.
      });

      // TODO: handle validator updates.
      // if (length !== this.#validatorData.length) { this.#indexUpdate(); }
   }
}

/**
 * @callback ValidatorFn - Position validator function that takes a {@link PositionData} instance potentially
 *                             modifying it or returning null if invalid.
 *
 * @param {ValidationData} valData - Validation data.
 *
 * @returns {PositionData|null} The validated position data or null to cancel position update.
 *
 */

/**
 * @typedef {object} ValidatorData
 *
 * @property {*}           [id=undefined] - An ID associated with this validator. Can be used to remove the validator.
 *
 * @property {ValidatorFn} validator - Position validator function that takes a {@link PositionData} instance
 *                                     potentially modifying it or returning null if invalid.
 *
 * @property {number}      [weight=1] - A number between 0 and 1 inclusive to position this validator against others.
 *
 * @property {Function}    [subscribe] - Optional subscribe function following the Svelte store / subscribe pattern.
 */

class BasicBounds
{
   /**
    * When true constrains the min / max width or height to element.
    *
    * @type {boolean}
    */
   #constrain;

   /**
    * @type {HTMLElement}
    */
   #element;

   /**
    * When true the validator is active.
    *
    * @type {boolean}
    */
   #enabled;

   /**
    * Provides a manual setting of the element height. As things go `offsetHeight` causes a browser layout and is not
    * performance oriented. If manually set this height is used instead of `offsetHeight`.
    *
    * @type {number}
    */
   #height;

   /**
    * Set from an optional value in the constructor to lock accessors preventing modification.
    */
   #lock;

   /**
    * Provides a manual setting of the element width. As things go `offsetWidth` causes a browser layout and is not
    * performance oriented. If manually set this width is used instead of `offsetWidth`.
    *
    * @type {number}
    */
   #width;

   constructor({ constrain = true, element, enabled = true, lock = false, width, height } = {})
   {
      this.element = element;
      this.constrain = constrain;
      this.enabled = enabled;
      this.width = width;
      this.height = height;

      this.#lock = typeof lock === 'boolean' ? lock : false;
   }

   get constrain() { return this.#constrain; }

   get element() { return this.#element; }

   get enabled() { return this.#enabled; }

   get height() { return this.#height; }

   get width() { return this.#width; }

   set constrain(constrain)
   {
      if (this.#lock) { return; }

      if (typeof constrain !== 'boolean') { throw new TypeError(`'constrain' is not a boolean.`); }

      this.#constrain = constrain;
   }

   set element(element)
   {
      if (this.#lock) { return; }

      if (element === void 0  || element === null || element instanceof HTMLElement)
      {
         this.#element = element;
      }
      else
      {
         throw new TypeError(`'element' is not a HTMLElement, undefined, or null.`);
      }
   }

   set enabled(enabled)
   {
      if (this.#lock) { return; }

      if (typeof enabled !== 'boolean') { throw new TypeError(`'enabled' is not a boolean.`); }

      this.#enabled = enabled;
   }

   set height(height)
   {
      if (this.#lock) { return; }

      if (height === void 0 || Number.isFinite(height))
      {
         this.#height = height;
      }
      else
      {
         throw new TypeError(`'height' is not a finite number or undefined.`);
      }
   }

   set width(width)
   {
      if (this.#lock) { return; }

      if (width === void 0 || Number.isFinite(width))
      {
         this.#width = width;
      }
      else
      {
         throw new TypeError(`'width' is not a finite number or undefined.`);
      }
   }

   setDimension(width, height)
   {
      if (this.#lock) { return; }

      if (width === void 0 || Number.isFinite(width))
      {
         this.#width = width;
      }
      else
      {
         throw new TypeError(`'width' is not a finite number or undefined.`);
      }

      if (height === void 0 || Number.isFinite(height))
      {
         this.#height = height;
      }
      else
      {
         throw new TypeError(`'height' is not a finite number or undefined.`);
      }
   }

   /**
    * Provides a validator that respects transforms in positional data constraining the position to within the target
    * elements bounds.
    *
    * @param {ValidationData}   valData - The associated validation data for position updates.
    *
    * @returns {PositionData} Potentially adjusted position data.
    */
   validator(valData)
   {
      // Early out if element is undefined or local enabled state is false.
      if (!this.#enabled) { return valData.position; }

      // Determine containing bounds from manual values; or any element; lastly the browser width / height.
      const boundsWidth = this.#width ?? this.#element?.offsetWidth ?? globalThis.innerWidth;
      const boundsHeight = this.#height ?? this.#element?.offsetHeight ?? globalThis.innerHeight;

      if (typeof valData.position.width === 'number')
      {
         const maxW = valData.maxWidth ?? (this.#constrain ? boundsWidth : Number.MAX_SAFE_INTEGER);
         valData.position.width = valData.width = Math.clamped(valData.position.width, valData.minWidth, maxW);

         if ((valData.width + valData.position.left + valData.marginLeft) > boundsWidth)
         {
            valData.position.left = boundsWidth - valData.width - valData.marginLeft;
         }
      }

      if (typeof valData.position.height === 'number')
      {
         const maxH = valData.maxHeight ?? (this.#constrain ? boundsHeight : Number.MAX_SAFE_INTEGER);
         valData.position.height = valData.height = Math.clamped(valData.position.height, valData.minHeight, maxH);

         if ((valData.height + valData.position.top + valData.marginTop) > boundsHeight)
         {
            valData.position.top = boundsHeight - valData.height - valData.marginTop;
         }
      }

      const maxL = Math.max(boundsWidth - valData.width - valData.marginLeft, 0);
      valData.position.left = Math.round(Math.clamped(valData.position.left, 0, maxL));

      const maxT = Math.max(boundsHeight - valData.height - valData.marginTop, 0);
      valData.position.top = Math.round(Math.clamped(valData.position.top, 0, maxT));

      return valData.position;
   }
}

const s_TRANSFORM_DATA = new TransformData();

class TransformBounds
{
   /**
    * When true constrains the min / max width or height to element.
    *
    * @type {boolean}
    */
   #constrain;

   /**
    * @type {HTMLElement}
    */
   #element;

   /**
    * When true the validator is active.
    *
    * @type {boolean}
    */
   #enabled;

   /**
    * Provides a manual setting of the element height. As things go `offsetHeight` causes a browser layout and is not
    * performance oriented. If manually set this height is used instead of `offsetHeight`.
    *
    * @type {number}
    */
   #height;

   /**
    * Set from an optional value in the constructor to lock accessors preventing modification.
    */
   #lock;

   /**
    * Provides a manual setting of the element width. As things go `offsetWidth` causes a browser layout and is not
    * performance oriented. If manually set this width is used instead of `offsetWidth`.
    *
    * @type {number}
    */
   #width;

   constructor({ constrain = true, element, enabled = true, lock = false, width, height } = {})
   {
      this.element = element;
      this.constrain = constrain;
      this.enabled = enabled;
      this.width = width;
      this.height = height;

      this.#lock = typeof lock === 'boolean' ? lock : false;
   }

   get constrain() { return this.#constrain; }

   get element() { return this.#element; }

   get enabled() { return this.#enabled; }

   get height() { return this.#height; }

   get width() { return this.#width; }

   set constrain(constrain)
   {
      if (this.#lock) { return; }

      if (typeof constrain !== 'boolean') { throw new TypeError(`'constrain' is not a boolean.`); }

      this.#constrain = constrain;
   }

   set element(element)
   {
      if (this.#lock) { return; }

      if (element === void 0 || element === null || element instanceof HTMLElement)
      {
         this.#element = element;
      }
      else
      {
         throw new TypeError(`'element' is not a HTMLElement, undefined, or null.`);
      }
   }

   set enabled(enabled)
   {
      if (this.#lock) { return; }

      if (typeof enabled !== 'boolean') { throw new TypeError(`'enabled' is not a boolean.`); }

      this.#enabled = enabled;
   }

   set height(height)
   {
      if (this.#lock) { return; }

      if (height === void 0 || Number.isFinite(height))
      {
         this.#height = height;
      }
      else
      {
         throw new TypeError(`'height' is not a finite number or undefined.`);
      }
   }

   set width(width)
   {
      if (this.#lock) { return; }

      if (width === void 0 || Number.isFinite(width))
      {
         this.#width = width;
      }
      else
      {
         throw new TypeError(`'width' is not a finite number or undefined.`);
      }
   }

   setDimension(width, height)
   {
      if (this.#lock) { return; }

      if (width === void 0 || Number.isFinite(width))
      {
         this.#width = width;
      }
      else
      {
         throw new TypeError(`'width' is not a finite number or undefined.`);
      }

      if (height === void 0 || Number.isFinite(height))
      {
         this.#height = height;
      }
      else
      {
         throw new TypeError(`'height' is not a finite number or undefined.`);
      }
   }

   /**
    * Provides a validator that respects transforms in positional data constraining the position to within the target
    * elements bounds.
    *
    * @param {ValidationData}   valData - The associated validation data for position updates.
    *
    * @returns {PositionData} Potentially adjusted position data.
    */
   validator(valData)
   {
      // Early out if element is undefined or local enabled state is false.
      if (!this.#enabled) { return valData.position; }

      // Determine containing bounds from manual values; or any element; lastly the browser width / height.
      const boundsWidth = this.#width ?? this.#element?.offsetWidth ?? globalThis.innerWidth;
      const boundsHeight = this.#height ?? this.#element?.offsetHeight ?? globalThis.innerHeight;

      // Ensure min / max width constraints when position width is a number; not 'auto' or 'inherit'. If constrain is
      // true cap width bounds.
      if (typeof valData.position.width === 'number')
      {
         const maxW = valData.maxWidth ?? (this.#constrain ? boundsWidth : Number.MAX_SAFE_INTEGER);
         valData.position.width = Math.clamped(valData.width, valData.minWidth, maxW);
      }

      // Ensure min / max height constraints when position height is a number; not 'auto' or 'inherit'. If constrain
      // is true cap height bounds.
      if (typeof valData.position.height === 'number')
      {
         const maxH = valData.maxHeight ?? (this.#constrain ? boundsHeight : Number.MAX_SAFE_INTEGER);
         valData.position.height = Math.clamped(valData.height, valData.minHeight, maxH);
      }

      // Get transform data. First set constraints including any margin top / left as offsets and width / height. Used
      // when position width / height is 'auto'.
      const data = valData.transforms.getData(valData.position, s_TRANSFORM_DATA, valData);

      // Check the bounding rectangle against browser height / width. Adjust position based on how far the overlap of
      // the bounding rect is outside the bounds height / width. The order below matters as the constraints are top /
      // left oriented, so perform those checks last.

      const initialX = data.boundingRect.x;
      const initialY = data.boundingRect.y;

      if (data.boundingRect.bottom + valData.marginTop > boundsHeight)
      {
         data.boundingRect.y += boundsHeight - data.boundingRect.bottom - valData.marginTop;
      }

      if (data.boundingRect.right + valData.marginLeft > boundsWidth)
      {
         data.boundingRect.x += boundsWidth - data.boundingRect.right - valData.marginLeft;
      }

      if (data.boundingRect.top - valData.marginTop < 0)
      {
         data.boundingRect.y += Math.abs(data.boundingRect.top - valData.marginTop);
      }

      if (data.boundingRect.left - valData.marginLeft < 0)
      {
         data.boundingRect.x += Math.abs(data.boundingRect.left - valData.marginLeft);
      }

      valData.position.left -= initialX - data.boundingRect.x;
      valData.position.top -= initialY - data.boundingRect.y;

      return valData.position;
   }
}

const basicWindow = new BasicBounds({ lock: true });
const transformWindow = new TransformBounds({ lock: true });

var positionValidators = /*#__PURE__*/Object.freeze({
    __proto__: null,
    BasicBounds: BasicBounds,
    TransformBounds: TransformBounds,
    basicWindow: basicWindow,
    transformWindow: transformWindow
});

/** @type {number[]} */
const s_SCALE_VECTOR = [1, 1, 1];

/** @type {number[]} */
const s_TRANSLATE_VECTOR = [0, 0, 0];

/** @type {Matrix4} */
const s_MAT4_RESULT = mat4.create();

/** @type {Matrix4} */
const s_MAT4_TEMP = mat4.create();

/** @type {Vector3} */
const s_VEC3_TEMP = vec3.create();

class Transforms
{
   /**
    * Stores the transform keys in the order added.
    *
    * @type {string[]}
    */
   #orderList = [];

   constructor()
   {
      this._data = {};
   }

   /**
    * @returns {boolean} Whether there are active transforms in local data.
    */
   get isActive() { return this.#orderList.length > 0; }

   /**
    * @returns {number|undefined} Any local rotateX data.
    */
   get rotateX() { return this._data.rotateX; }

   /**
    * @returns {number|undefined} Any local rotateY data.
    */
   get rotateY() { return this._data.rotateY; }

   /**
    * @returns {number|undefined} Any local rotateZ data.
    */
   get rotateZ() { return this._data.rotateZ; }

   /**
    * @returns {number|undefined} Any local rotateZ scale.
    */
   get scale() { return this._data.scale; }

   /**
    * @returns {number|undefined} Any local translateZ data.
    */
   get translateX() { return this._data.translateX; }

   /**
    * @returns {number|undefined} Any local translateZ data.
    */
   get translateY() { return this._data.translateY; }

   /**
    * @returns {number|undefined} Any local translateZ data.
    */
   get translateZ() { return this._data.translateZ; }

   /**
    * Sets the local rotateX data if the value is a finite number otherwise removes the local data.
    *
    * @param {number|null|undefined}   value - A value to set.
    */
   set rotateX(value)
   {
      if (Number.isFinite(value))
      {
         if (this._data.rotateX === void 0) { this.#orderList.push('rotateX'); }

         this._data.rotateX = value;
      }
      else
      {
         if (this._data.rotateX !== void 0)
         {
            const index = this.#orderList.findIndex((entry) => entry === 'rotateX');
            if (index >= 0) { this.#orderList.splice(index, 1); }
         }

         delete this._data.rotateX;
      }
   }

   /**
    * Sets the local rotateY data if the value is a finite number otherwise removes the local data.
    *
    * @param {number|null|undefined}   value - A value to set.
    */
   set rotateY(value)
   {
      if (Number.isFinite(value))
      {
         if (this._data.rotateY === void 0) { this.#orderList.push('rotateY'); }

         this._data.rotateY = value;
      }
      else
      {
         if (this._data.rotateY !== void 0)
         {
            const index = this.#orderList.findIndex((entry) => entry === 'rotateY');
            if (index >= 0) { this.#orderList.splice(index, 1); }
         }

         delete this._data.rotateY;
      }
   }

   /**
    * Sets the local rotateZ data if the value is a finite number otherwise removes the local data.
    *
    * @param {number|null|undefined}   value - A value to set.
    */
   set rotateZ(value)
   {
      if (Number.isFinite(value))
      {
         if (this._data.rotateZ === void 0) { this.#orderList.push('rotateZ'); }

         this._data.rotateZ = value;
      }

      else
      {
         if (this._data.rotateZ !== void 0)
         {
            const index = this.#orderList.findIndex((entry) => entry === 'rotateZ');
            if (index >= 0) { this.#orderList.splice(index, 1); }
         }

         delete this._data.rotateZ;
      }
   }

   /**
    * Sets the local scale data if the value is a finite number otherwise removes the local data.
    *
    * @param {number|null|undefined}   value - A value to set.
    */
   set scale(value)
   {
      if (Number.isFinite(value))
      {
         if (this._data.scale === void 0) { this.#orderList.push('scale'); }

         this._data.scale = value;
      }
      else
      {
         if (this._data.scale !== void 0)
         {
            const index = this.#orderList.findIndex((entry) => entry === 'scale');
            if (index >= 0) { this.#orderList.splice(index, 1); }
         }

         delete this._data.scale;
      }
   }

   /**
    * Sets the local translateX data if the value is a finite number otherwise removes the local data.
    *
    * @param {number|null|undefined}   value - A value to set.
    */
   set translateX(value)
   {
      if (Number.isFinite(value))
      {
         if (this._data.translateX === void 0) { this.#orderList.push('translateX'); }

         this._data.translateX = value;
      }

      else
      {
         if (this._data.translateX !== void 0)
         {
            const index = this.#orderList.findIndex((entry) => entry === 'translateX');
            if (index >= 0) { this.#orderList.splice(index, 1); }
         }

         delete this._data.translateX;
      }
   }

   /**
    * Sets the local translateY data if the value is a finite number otherwise removes the local data.
    *
    * @param {number|null|undefined}   value - A value to set.
    */
   set translateY(value)
   {
      if (Number.isFinite(value))
      {
         if (this._data.translateY === void 0) { this.#orderList.push('translateY'); }

         this._data.translateY = value;
      }

      else
      {
         if (this._data.translateY !== void 0)
         {
            const index = this.#orderList.findIndex((entry) => entry === 'translateY');
            if (index >= 0) { this.#orderList.splice(index, 1); }
         }

         delete this._data.translateY;
      }
   }

   /**
    * Sets the local translateZ data if the value is a finite number otherwise removes the local data.
    *
    * @param {number|null|undefined}   value - A value to set.
    */
   set translateZ(value)
   {
      if (Number.isFinite(value))
      {
         if (this._data.translateZ === void 0) { this.#orderList.push('translateZ'); }

         this._data.translateZ = value;
      }

      else
      {
         if (this._data.translateZ !== void 0)
         {
            const index = this.#orderList.findIndex((entry) => entry === 'translateZ');
            if (index >= 0) { this.#orderList.splice(index, 1); }
         }

         delete this._data.translateZ;
      }
   }

   /**
    * Returns the matrix3d CSS transform for the given position / transform data.
    *
    * @param {object} [data] - Optional position data otherwise use local stored transform data.
    *
    * @returns {string} The CSS matrix3d string.
    */
   getCSS(data = this._data)
   {
      return `matrix3d(${this.getMat4(data, s_MAT4_RESULT).join(',')})`;
   }

   /**
    * Returns the matrix3d CSS transform for the given position / transform data.
    *
    * @param {object} [data] - Optional position data otherwise use local stored transform data.
    *
    * @returns {string} The CSS matrix3d string.
    */
   getCSSOrtho(data = this._data)
   {
      return `matrix3d(${this.getMat4Ortho(data, s_MAT4_RESULT).join(',')})`;
   }

   /**
    * Collects all data including a bounding rect, transform matrix, and points array of the given {@link PositionData}
    * instance with the applied local transform data.
    *
    * @param {PositionData} position - The position data to process.
    *
    * @param {TransformData} [output] - Optional TransformData output instance.
    *
    * @param {object} [validationData] - Optional validation data for adjustment parameters.
    *
    * @returns {TransformData} The output TransformData instance.
    */
   getData(position, output = new TransformData(), validationData = {})
   {
      const valWidth = validationData.width ?? 0;
      const valHeight = validationData.height ?? 0;
      const valOffsetTop = validationData.offsetTop ?? validationData.marginTop ?? 0;
      const valOffsetLeft = validationData.offsetLeft ?? validationData.offsetLeft ?? 0;

      position.top += valOffsetTop;
      position.left += valOffsetLeft;

      const width = Number.isFinite(position.width) ? position.width : valWidth;
      const height = Number.isFinite(position.height) ? position.height : valHeight;

      const rect = output.corners;

      if (this.hasTransform(position))
      {
         rect[0][0] = rect[0][1] = rect[0][2] = 0;
         rect[1][0] = width;
         rect[1][1] = rect[1][2] = 0;
         rect[2][0] = width;
         rect[2][1] = height;
         rect[2][2] = 0;
         rect[3][0] = 0;
         rect[3][1] = height;
         rect[3][2] = 0;

         const matrix = this.getMat4(position, output.mat4);

         const translate = s_GET_ORIGIN_TRANSLATION(position.transformOrigin, width, height, output.originTranslations);

         if (transformOriginDefault === position.transformOrigin)
         {
            vec3.transformMat4(rect[0], rect[0], matrix);
            vec3.transformMat4(rect[1], rect[1], matrix);
            vec3.transformMat4(rect[2], rect[2], matrix);
            vec3.transformMat4(rect[3], rect[3], matrix);
         }
         else
         {
            vec3.transformMat4(rect[0], rect[0], translate[0]);
            vec3.transformMat4(rect[0], rect[0], matrix);
            vec3.transformMat4(rect[0], rect[0], translate[1]);

            vec3.transformMat4(rect[1], rect[1], translate[0]);
            vec3.transformMat4(rect[1], rect[1], matrix);
            vec3.transformMat4(rect[1], rect[1], translate[1]);

            vec3.transformMat4(rect[2], rect[2], translate[0]);
            vec3.transformMat4(rect[2], rect[2], matrix);
            vec3.transformMat4(rect[2], rect[2], translate[1]);

            vec3.transformMat4(rect[3], rect[3], translate[0]);
            vec3.transformMat4(rect[3], rect[3], matrix);
            vec3.transformMat4(rect[3], rect[3], translate[1]);
         }

         rect[0][0] = position.left + rect[0][0];
         rect[0][1] = position.top + rect[0][1];
         rect[1][0] = position.left + rect[1][0];
         rect[1][1] = position.top + rect[1][1];
         rect[2][0] = position.left + rect[2][0];
         rect[2][1] = position.top + rect[2][1];
         rect[3][0] = position.left + rect[3][0];
         rect[3][1] = position.top + rect[3][1];
      }
      else
      {
         rect[0][0] = position.left;
         rect[0][1] = position.top;
         rect[1][0] = position.left + width;
         rect[1][1] = position.top;
         rect[2][0] = position.left + width;
         rect[2][1] = position.top + height;
         rect[3][0] = position.left;
         rect[3][1] = position.top + height;

         mat4.identity(output.mat4);
      }

      let maxX = Number.MIN_SAFE_INTEGER;
      let maxY = Number.MIN_SAFE_INTEGER;
      let minX = Number.MAX_SAFE_INTEGER;
      let minY = Number.MAX_SAFE_INTEGER;

      for (let cntr = 4; --cntr >= 0;)
      {
         if (rect[cntr][0] > maxX) { maxX = rect[cntr][0]; }
         if (rect[cntr][0] < minX) { minX = rect[cntr][0]; }
         if (rect[cntr][1] > maxY) { maxY = rect[cntr][1]; }
         if (rect[cntr][1] < minY) { minY = rect[cntr][1]; }
      }

      const boundingRect = output.boundingRect;
      boundingRect.x = minX;
      boundingRect.y = minY;
      boundingRect.width = maxX - minX;
      boundingRect.height = maxY - minY;

      position.top -= valOffsetTop;
      position.left -= valOffsetLeft;

      return output;
   }

   /**
    * Creates a transform matrix based on local data applied in order it was added.
    *
    * If no data object is provided then the source is the local transform data. If another data object is supplied
    * then the stored local transform order is applied then all remaining transform keys are applied. This allows the
    * construction of a transform matrix in advance of setting local data and is useful in collision detection.
    *
    * @param {object}   [data] - PositionData instance or local transform data.
    *
    * @param {Matrix4}  [output] - The output mat4 instance.
    *
    * @returns {Matrix4} Transform matrix.
    */
   getMat4(data = this._data, output = mat4.create())
   {
      const matrix = mat4.identity(output);

      // Bitwise tracks applied transform keys from local transform data.
      let seenKeys = 0;

      const orderList = this.#orderList;

      // First apply ordered transforms from local transform data.
      for (let cntr = 0; cntr < orderList.length; cntr++)
      {
         const key = orderList[cntr];

         switch (key)
         {
            case 'rotateX':
               seenKeys |= transformKeysBitwise.rotateX;
               mat4.multiply(matrix, matrix, mat4.fromXRotation(s_MAT4_TEMP, degToRad(data[key])));
               break;

            case 'rotateY':
               seenKeys |= transformKeysBitwise.rotateY;
               mat4.multiply(matrix, matrix, mat4.fromYRotation(s_MAT4_TEMP, degToRad(data[key])));
               break;

            case 'rotateZ':
               seenKeys |= transformKeysBitwise.rotateZ;
               mat4.multiply(matrix, matrix, mat4.fromZRotation(s_MAT4_TEMP, degToRad(data[key])));
               break;

            case 'scale':
               seenKeys |= transformKeysBitwise.scale;
               s_SCALE_VECTOR[0] = s_SCALE_VECTOR[1] = data[key];
               mat4.multiply(matrix, matrix, mat4.fromScaling(s_MAT4_TEMP, s_SCALE_VECTOR));
               break;

            case 'translateX':
               seenKeys |= transformKeysBitwise.translateX;
               s_TRANSLATE_VECTOR[0] = data.translateX;
               s_TRANSLATE_VECTOR[1] = 0;
               s_TRANSLATE_VECTOR[2] = 0;
               mat4.multiply(matrix, matrix, mat4.fromTranslation(s_MAT4_TEMP, s_TRANSLATE_VECTOR));
               break;

            case 'translateY':
               seenKeys |= transformKeysBitwise.translateY;
               s_TRANSLATE_VECTOR[0] = 0;
               s_TRANSLATE_VECTOR[1] = data.translateY;
               s_TRANSLATE_VECTOR[2] = 0;
               mat4.multiply(matrix, matrix, mat4.fromTranslation(s_MAT4_TEMP, s_TRANSLATE_VECTOR));
               break;

            case 'translateZ':
               seenKeys |= transformKeysBitwise.translateZ;
               s_TRANSLATE_VECTOR[0] = 0;
               s_TRANSLATE_VECTOR[1] = 0;
               s_TRANSLATE_VECTOR[2] = data.translateZ;
               mat4.multiply(matrix, matrix, mat4.fromTranslation(s_MAT4_TEMP, s_TRANSLATE_VECTOR));
               break;
         }
      }

      // Now apply any new keys not set in local transform data that have not been applied yet.
      if (data !== this._data)
      {
         for (let cntr = 0; cntr < transformKeys.length; cntr++)
         {
            const key = transformKeys[cntr];

            // Reject bad / no data or if the key has already been applied.
            if (data[key] === null || (seenKeys & transformKeysBitwise[key]) > 0) { continue; }

            switch (key)
            {
               case 'rotateX':
                  mat4.multiply(matrix, matrix, mat4.fromXRotation(s_MAT4_TEMP, degToRad(data[key])));
                  break;

               case 'rotateY':
                  mat4.multiply(matrix, matrix, mat4.fromYRotation(s_MAT4_TEMP, degToRad(data[key])));
                  break;

               case 'rotateZ':
                  mat4.multiply(matrix, matrix, mat4.fromZRotation(s_MAT4_TEMP, degToRad(data[key])));
                  break;

               case 'scale':
                  s_SCALE_VECTOR[0] = s_SCALE_VECTOR[1] = data[key];
                  mat4.multiply(matrix, matrix, mat4.fromScaling(s_MAT4_TEMP, s_SCALE_VECTOR));
                  break;

               case 'translateX':
                  s_TRANSLATE_VECTOR[0] = data[key];
                  s_TRANSLATE_VECTOR[1] = 0;
                  s_TRANSLATE_VECTOR[2] = 0;
                  mat4.multiply(matrix, matrix, mat4.fromTranslation(s_MAT4_TEMP, s_TRANSLATE_VECTOR));
                  break;

               case 'translateY':
                  s_TRANSLATE_VECTOR[0] = 0;
                  s_TRANSLATE_VECTOR[1] = data[key];
                  s_TRANSLATE_VECTOR[2] = 0;
                  mat4.multiply(matrix, matrix, mat4.fromTranslation(s_MAT4_TEMP, s_TRANSLATE_VECTOR));
                  break;

               case 'translateZ':
                  s_TRANSLATE_VECTOR[0] = 0;
                  s_TRANSLATE_VECTOR[1] = 0;
                  s_TRANSLATE_VECTOR[2] = data[key];
                  mat4.multiply(matrix, matrix, mat4.fromTranslation(s_MAT4_TEMP, s_TRANSLATE_VECTOR));
                  break;
            }
         }
      }

      return matrix;
   }

   /**
    * Provides an orthographic enhancement to convert left / top positional data to a translate operation.
    *
    * This transform matrix takes into account that the remaining operations are , but adds any left / top attributes from passed in data to
    * translate X / Y.
    *
    * If no data object is provided then the source is the local transform data. If another data object is supplied
    * then the stored local transform order is applied then all remaining transform keys are applied. This allows the
    * construction of a transform matrix in advance of setting local data and is useful in collision detection.
    *
    * @param {object}   [data] - PositionData instance or local transform data.
    *
    * @param {Matrix4}  [output] - The output mat4 instance.
    *
    * @returns {Matrix4} Transform matrix.
    */
   getMat4Ortho(data = this._data, output = mat4.create())
   {
      const matrix = mat4.identity(output);

      // Attempt to retrieve values from passed in data otherwise default to 0.
      // Always perform the translation last regardless of order added to local transform data.
      // Add data.left to translateX and data.top to translateY.
      s_TRANSLATE_VECTOR[0] = (data.left ?? 0) + (data.translateX ?? 0);
      s_TRANSLATE_VECTOR[1] = (data.top ?? 0) + (data.translateY ?? 0);
      s_TRANSLATE_VECTOR[2] = data.translateZ ?? 0;
      mat4.multiply(matrix, matrix, mat4.fromTranslation(s_MAT4_TEMP, s_TRANSLATE_VECTOR));

      // Scale can also be applied out of order.
      if (data.scale !== null)
      {
         s_SCALE_VECTOR[0] = s_SCALE_VECTOR[1] = data.scale;
         mat4.multiply(matrix, matrix, mat4.fromScaling(s_MAT4_TEMP, s_SCALE_VECTOR));
      }

      // Early out if there is not rotation data.
      if (data.rotateX === null && data.rotateY === null && data.rotateZ === null) { return matrix; }

      // Rotation transforms must be applied in the order they are added.

      // Bitwise tracks applied transform keys from local transform data.
      let seenKeys = 0;

      const orderList = this.#orderList;

      // First apply ordered transforms from local transform data.
      for (let cntr = 0; cntr < orderList.length; cntr++)
      {
         const key = orderList[cntr];

         switch (key)
         {
            case 'rotateX':
               seenKeys |= transformKeysBitwise.rotateX;
               mat4.multiply(matrix, matrix, mat4.fromXRotation(s_MAT4_TEMP, degToRad(data[key])));
               break;

            case 'rotateY':
               seenKeys |= transformKeysBitwise.rotateY;
               mat4.multiply(matrix, matrix, mat4.fromYRotation(s_MAT4_TEMP, degToRad(data[key])));
               break;

            case 'rotateZ':
               seenKeys |= transformKeysBitwise.rotateZ;
               mat4.multiply(matrix, matrix, mat4.fromZRotation(s_MAT4_TEMP, degToRad(data[key])));
               break;
         }
      }

      // Now apply any new keys not set in local transform data that have not been applied yet.
      if (data !== this._data)
      {
         for (let cntr = 0; cntr < transformKeys.length; cntr++)
         {
            const key = transformKeys[cntr];

            // Reject bad / no data or if the key has already been applied.
            if (data[key] === null || (seenKeys & transformKeysBitwise[key]) > 0) { continue; }

            switch (key)
            {
               case 'rotateX':
                  mat4.multiply(matrix, matrix, mat4.fromXRotation(s_MAT4_TEMP, degToRad(data[key])));
                  break;

               case 'rotateY':
                  mat4.multiply(matrix, matrix, mat4.fromYRotation(s_MAT4_TEMP, degToRad(data[key])));
                  break;

               case 'rotateZ':
                  mat4.multiply(matrix, matrix, mat4.fromZRotation(s_MAT4_TEMP, degToRad(data[key])));
                  break;
            }
         }
      }

      return matrix;
   }

   /**
    * Tests an object if it contains transform keys and the values are finite numbers.
    *
    * @param {object} data - An object to test for transform data.
    *
    * @returns {boolean} Whether the given PositionData has transforms.
    */
   hasTransform(data)
   {
      for (const key of transformKeys)
      {
         if (Number.isFinite(data[key])) { return true; }
      }

      return false;
   }

   /**
    * Resets internal data from the given object containing valid transform keys.
    *
    * @param {object}   data - An object with transform data.
    */
   reset(data)
   {
      for (const key in data)
      {
         if (transformKeys.includes(key))
         {
            if (Number.isFinite(data[key]))
            {
               this._data[key] = data[key];
            }
            else
            {
               const index = this.#orderList.findIndex((entry) => entry === key);
               if (index >= 0) { this.#orderList.splice(index, 1); }

               delete this._data[key];
            }
         }
      }
   }
}

/**
 * Returns the translations necessary to translate a matrix operation based on the `transformOrigin` parameter of the
 * given position instance. The first entry / index 0 is the pre-translation and last entry / index 1 is the post-
 * translation.
 *
 * This method is used internally, but may be useful if you need the origin translation matrices to transform
 * bespoke points based on any `transformOrigin` set in {@link PositionData}.
 *
 * @param {string}   transformOrigin - The transform origin attribute from PositionData.
 *
 * @param {number}   width - The PositionData width or validation data width when 'auto'.
 *
 * @param {number}   height - The PositionData height or validation data height when 'auto'.
 *
 * @param {Matrix4[]}   output - Output Mat4 array.
 *
 * @returns {Matrix4[]} Output Mat4 array.
 */
function s_GET_ORIGIN_TRANSLATION(transformOrigin, width, height, output)
{
   const vector = s_VEC3_TEMP;

   switch (transformOrigin)
   {
      case 'top left':
         vector[0] = vector[1] = 0;
         mat4.fromTranslation(output[0], vector);
         mat4.fromTranslation(output[1], vector);
         break;

      case 'top center':
         vector[0] = -width * 0.5;
         vector[1] = 0;
         mat4.fromTranslation(output[0], vector);
         vector[0] = width * 0.5;
         mat4.fromTranslation(output[1], vector);
         break;

      case 'top right':
         vector[0] = -width;
         vector[1] = 0;
         mat4.fromTranslation(output[0], vector);
         vector[0] = width;
         mat4.fromTranslation(output[1], vector);
         break;

      case 'center left':
         vector[0] = 0;
         vector[1] = -height * 0.5;
         mat4.fromTranslation(output[0], vector);
         vector[1] = height * 0.5;
         mat4.fromTranslation(output[1], vector);
         break;

      case null: // By default null / no transform is center.
      case 'center':
         vector[0] = -width * 0.5;
         vector[1] = -height * 0.5;
         mat4.fromTranslation(output[0], vector);
         vector[0] = width * 0.5;
         vector[1] = height * 0.5;
         mat4.fromTranslation(output[1], vector);
         break;

      case 'center right':
         vector[0] = -width;
         vector[1] = -height * 0.5;
         mat4.fromTranslation(output[0], vector);
         vector[0] = width;
         vector[1] = height * 0.5;
         mat4.fromTranslation(output[1], vector);
         break;

      case 'bottom left':
         vector[0] = 0;
         vector[1] = -height;
         mat4.fromTranslation(output[0], vector);
         vector[1] = height;
         mat4.fromTranslation(output[1], vector);
         break;

      case 'bottom center':
         vector[0] = -width * 0.5;
         vector[1] = -height;
         mat4.fromTranslation(output[0], vector);
         vector[0] = width * 0.5;
         vector[1] = height;
         mat4.fromTranslation(output[1], vector);
         break;

      case 'bottom right':
         vector[0] = -width;
         vector[1] = -height;
         mat4.fromTranslation(output[0], vector);
         vector[0] = width;
         vector[1] = height;
         mat4.fromTranslation(output[1], vector);
         break;

      // No valid transform origin parameter; set identity.
      default:
         mat4.identity(output[0]);
         mat4.identity(output[1]);
         break;
   }

   return output;
}

class UpdateElementData
{
   constructor()
   {
      /**
       * Stores the private data from Position.
       *
       * @type {PositionData}
       */
      this.data = void 0;

      /**
       * Provides a copy of local data sent to subscribers.
       *
       * @type {PositionData}
       */
      this.dataSubscribers = new PositionData();

      /**
       * Stores the current dimension data used for the readable `dimension` store.
       *
       * @type {{width: number | 'auto', height: number | 'auto'}}
       */
      this.dimensionData = { width: 0, height: 0 };

      /**
       * @type {PositionChangeSet}
       */
      this.changeSet = void 0;

      /**
       * @type {PositionOptions}
       */
      this.options = void 0;

      /**
       * Stores if this Position / update data is queued for update.
       *
       * @type {boolean}
       */
      this.queued = false;

      /**
       * @type {StyleCache}
       */
      this.styleCache = void 0;

      /**
       * @type {Transforms}
       */
      this.transforms = void 0;

      /**
       * Stores the current transform data used for the readable `transform` store. It is only active when there are
       * subscribers to the store or calculateTransform options is true.
       *
       * @type {TransformData}
       */
      this.transformData = new TransformData();

      /**
       * @type {(function(PositionData): void)[]}
       */
      this.subscriptions = void 0;

      /**
       * @type {Writable<{width: (number|"auto"), height: (number|"auto")}>}
       */
      this.storeDimension = writable$1(this.dimensionData);

      // When there are subscribers set option to calculate transform updates; set to false when no subscribers.

      /**
       * @type {Writable<TransformData>}
       */
      this.storeTransform = writable$1(this.transformData, () =>
      {
         this.options.transformSubscribed = true;
         return () => this.options.transformSubscribed = false;
      });

      /**
       * Stores the queued state for update element processing.
       *
       * @type {boolean}
       */
      this.queued = false;

      // Seal data backing readable stores.
      Object.seal(this.dimensionData);
   }
}

/**
 * Awaits `requestAnimationFrame` calls by the counter specified. This allows asynchronous applications for direct /
 * inline style modification amongst other direct animation techniques.
 *
 * @param {number}   [cntr=1] - A positive integer greater than 0 for amount of requestAnimationFrames to wait.
 *
 * @returns {Promise<number>} Returns current time equivalent to `performance.now()`.
 */
async function nextAnimationFrame(cntr = 1)
{
   if (!Number.isInteger(cntr) || cntr < 1)
   {
      throw new TypeError(`nextAnimationFrame error: 'cntr' must be a positive integer greater than 0.`);
   }

   let currentTime = performance.now();
   for (;--cntr >= 0;)
   {
      currentTime = await new Promise((resolve) => requestAnimationFrame(resolve));
   }

   return currentTime;
}

/**
 * Decouples updates to any parent target HTMLElement inline styles. Invoke {@link Position.elementUpdated} to await
 * on the returned promise that is resolved with the current render time via `nextAnimationFrame` /
 * `requestAnimationFrame`. This allows the underlying data model to be updated immediately while updates to the
 * element are in sync with the browser and potentially in the future be further throttled.
 *
 * @param {HTMLElement} el - The target HTMLElement.
 */
class UpdateElementManager
{
   static list = [];
   static listCntr = 0;

   static updatePromise;

   static get promise() { return this.updatePromise; }

   /**
    * Potentially adds the given element and internal updateData instance to the list.
    *
    * @param {HTMLElement}       el - An HTMLElement instance.
    *
    * @param {UpdateElementData} updateData - An UpdateElementData instance.
    *
    * @returns {Promise<number>} The unified next frame update promise. Returns `currentTime`.
    */
   static add(el, updateData)
   {
      if (this.listCntr < this.list.length)
      {
         const entry = this.list[this.listCntr];
         entry[0] = el;
         entry[1] = updateData;
      }
      else
      {
         this.list.push([el, updateData]);
      }

      this.listCntr++;
      updateData.queued = true;

      if (!this.updatePromise) { this.updatePromise = this.wait(); }

      return this.updatePromise;
   }

   /**
    * Await on `nextAnimationFrame` and iterate over list map invoking callback functions.
    *
    * @returns {Promise<number>} The next frame Promise / currentTime from nextAnimationFrame.
    */
   static async wait()
   {
      // Await the next animation frame. In the future this can be extended to multiple frames to divide update rate.
      const currentTime = await nextAnimationFrame();

      this.updatePromise = void 0;

      for (let cntr = this.listCntr; --cntr >= 0;)
      {
         // Obtain data for entry.
         const entry = this.list[cntr];
         const el = entry[0];
         const updateData = entry[1];

         // Clear entry data.
         entry[0] = void 0;
         entry[1] = void 0;

         // Reset queued state.
         updateData.queued = false;

         // Early out if the element is no longer connected to the DOM / shadow root.
         // if (!el.isConnected || !updateData.changeSet.hasChange()) { continue; }
         if (!el.isConnected) { continue; }

         if (updateData.options.ortho)
         {
            s_UPDATE_ELEMENT_ORTHO(el, updateData);
         }
         else
         {
            s_UPDATE_ELEMENT(el, updateData);
         }

         // If calculate transform options is enabled then update the transform data and set the readable store.
         if (updateData.options.calculateTransform || updateData.options.transformSubscribed)
         {
            s_UPDATE_TRANSFORM(el, updateData);
         }

         // Update all subscribers with changed data.
         this.updateSubscribers(updateData);
      }

      this.listCntr = 0;

      return currentTime;
   }

   /**
    * Potentially immediately updates the given element.
    *
    * @param {HTMLElement}       el - An HTMLElement instance.
    *
    * @param {UpdateElementData} updateData - An UpdateElementData instance.
    */
   static immediate(el, updateData)
   {
      // Early out if the element is no longer connected to the DOM / shadow root.
      // if (!el.isConnected || !updateData.changeSet.hasChange()) { continue; }
      if (!el.isConnected) { return; }

      if (updateData.options.ortho)
      {
         s_UPDATE_ELEMENT_ORTHO(el, updateData);
      }
      else
      {
         s_UPDATE_ELEMENT(el, updateData);
      }

      // If calculate transform options is enabled then update the transform data and set the readable store.
      if (updateData.options.calculateTransform || updateData.options.transformSubscribed)
      {
         s_UPDATE_TRANSFORM(el, updateData);
      }

      // Update all subscribers with changed data.
      this.updateSubscribers(updateData);
   }

   /**
    * @param {UpdateElementData} updateData - Data change set.
    */
   static updateSubscribers(updateData)
   {
      const data = updateData.data;
      const changeSet = updateData.changeSet;

      if (!changeSet.hasChange()) { return; }

      // Make a copy of the data.
      const output = updateData.dataSubscribers.copy(data);

      const subscriptions = updateData.subscriptions;

      // Early out if there are no subscribers.
      if (subscriptions.length > 0)
      {
         for (let cntr = 0; cntr < subscriptions.length; cntr++) { subscriptions[cntr](output); }
      }

      // Update dimension data if width / height has changed.
      if (changeSet.width || changeSet.height)
      {
         updateData.dimensionData.width = data.width;
         updateData.dimensionData.height = data.height;
         updateData.storeDimension.set(updateData.dimensionData);
      }

      changeSet.set(false);
   }
}

/**
 * Decouples updates to any parent target HTMLElement inline styles. Invoke {@link Position.elementUpdated} to await
 * on the returned promise that is resolved with the current render time via `nextAnimationFrame` /
 * `requestAnimationFrame`. This allows the underlying data model to be updated immediately while updates to the
 * element are in sync with the browser and potentially in the future be further throttled.
 *
 * @param {HTMLElement} el - The target HTMLElement.
 *
 * @param {UpdateElementData} updateData - Update data.
 */
function s_UPDATE_ELEMENT(el, updateData)
{
   const changeSet = updateData.changeSet;
   const data = updateData.data;

   if (changeSet.left)
   {
      el.style.left = `${data.left}px`;
   }

   if (changeSet.top)
   {
      el.style.top = `${data.top}px`;
   }

   if (changeSet.zIndex)
   {
      el.style.zIndex = typeof data.zIndex === 'number' ? `${data.zIndex}` : null;
   }

   if (changeSet.width)
   {
      el.style.width = typeof data.width === 'number' ? `${data.width}px` : data.width;
   }

   if (changeSet.height)
   {
      el.style.height = typeof data.height === 'number' ? `${data.height}px` : data.height;
   }

   if (changeSet.transformOrigin)
   {
      // When set to 'center' we can simply set the transform to null which is center by default.
      el.style.transformOrigin = data.transformOrigin === 'center' ? null : data.transformOrigin;
   }

   // Update all transforms in order added to transforms object.
   if (changeSet.transform)
   {
      el.style.transform = updateData.transforms.isActive ? updateData.transforms.getCSS() : null;
   }
}

/**
 * Decouples updates to any parent target HTMLElement inline styles. Invoke {@link Position.elementUpdated} to await
 * on the returned promise that is resolved with the current render time via `nextAnimationFrame` /
 * `requestAnimationFrame`. This allows the underlying data model to be updated immediately while updates to the
 * element are in sync with the browser and potentially in the future be further throttled.
 *
 * @param {HTMLElement} el - The target HTMLElement.
 *
 * @param {UpdateElementData} updateData - Update data.
 */
function s_UPDATE_ELEMENT_ORTHO(el, updateData)
{
   const changeSet = updateData.changeSet;
   const data = updateData.data;

   if (changeSet.zIndex)
   {
      el.style.zIndex = typeof data.zIndex === 'number' ? `${data.zIndex}` : null;
   }

   if (changeSet.width)
   {
      el.style.width = typeof data.width === 'number' ? `${data.width}px` : data.width;
   }

   if (changeSet.height)
   {
      el.style.height = typeof data.height === 'number' ? `${data.height}px` : data.height;
   }

   if (changeSet.transformOrigin)
   {
      // When set to 'center' we can simply set the transform to null which is center by default.
      el.style.transformOrigin = data.transformOrigin === 'center' ? null : data.transformOrigin;
   }

   // Update all transforms in order added to transforms object.
   if (changeSet.left || changeSet.top || changeSet.transform)
   {
      el.style.transform = updateData.transforms.getCSSOrtho(data);
   }
}

/**
 * Updates the applied transform data and sets the readble `transform` store.
 *
 * @param {HTMLElement} el - The target HTMLElement.
 *
 * @param {UpdateElementData} updateData - Update element data.
 */
function s_UPDATE_TRANSFORM(el, updateData)
{
   s_VALIDATION_DATA$1.height = updateData.data.height !== 'auto' ? updateData.data.height :
    updateData.styleCache.offsetHeight;

   s_VALIDATION_DATA$1.width = updateData.data.width !== 'auto' ? updateData.data.width :
    updateData.styleCache.offsetWidth;

   s_VALIDATION_DATA$1.marginLeft = updateData.styleCache.marginLeft;

   s_VALIDATION_DATA$1.marginTop = updateData.styleCache.marginTop;

   // Get transform data. First set constraints including any margin top / left as offsets and width / height. Used
   // when position width / height is 'auto'.
   updateData.transforms.getData(updateData.data, updateData.transformData, s_VALIDATION_DATA$1);

   updateData.storeTransform.set(updateData.transformData);
}

const s_VALIDATION_DATA$1 = {
   height: void 0,
   width: void 0,
   marginLeft: void 0,
   marginTop: void 0
};

/**
 * Provides a store for position following the subscriber protocol in addition to providing individual writable derived
 * stores for each independent variable.
 */
class Position
{
   /**
    * @type {PositionData}
    */
   #data = new PositionData();

   /**
    * Provides the animation API.
    *
    * @type {AnimationAPI}
    */
   #animate = new AnimationAPI(this, this.#data);

   /**
    * Provides a way to turn on / off the position handling.
    *
    * @type {boolean}
    */
   #enabled = true;

   /**
    * Stores the style attributes that changed on update.
    *
    * @type {PositionChangeSet}
    */
   #positionChangeSet = new PositionChangeSet();

   /**
    * Stores ongoing options that are set in the constructor or by transform store subscription.
    *
    * @type {PositionOptions}
    */
   #options = {
      calculateTransform: false,
      initialHelper: void 0,
      ortho: true,
      transformSubscribed: false
   };

   /**
    * The associated parent for positional data tracking. Used in validators.
    *
    * @type {PositionParent}
    */
   #parent;

   /**
    * @type {StorePosition}
    */
   #stores;

   /**
    * Stores an instance of the computer styles for the target element.
    *
    * @type {StyleCache}
    */
   #styleCache;

   /**
    * Stores the subscribers.
    *
    * @type {(function(PositionData): void)[]}
    */
   #subscriptions = [];

   /**
    * @type {Transforms}
    */
   #transforms = new Transforms();

   /**
    * @type {UpdateElementData}
    */
   #updateElementData;

   /**
    * Stores the UpdateElementManager wait promise.
    *
    * @type {Promise}
    */
   #updateElementPromise;

   /**
    * @type {AdapterValidators}
    */
   #validators;

   /**
    * @type {ValidatorData[]}
    */
   #validatorData;

   /**
    * @type {PositionStateAPI}
    */
   #state = new PositionStateAPI(this, this.#data, this.#transforms);

   /**
    * @returns {AnimationGroupAPI} Public Animation API.
    */
   static get Animate() { return AnimationGroupAPI; }

   /**
    * @returns {{browserCentered?: Centered, Centered?: *}} Initial position helpers.
    */
   static get Initial() { return positionInitial; }

   /**
    * Returns TransformData class / constructor.
    *
    * @returns {TransformData} TransformData class / constructor.
    */
   static get TransformData() { return TransformData; }

   /**
    * Returns default validators.
    *
    * Note: `basicWindow` and `BasicBounds` will eventually be removed.
    *
    * @returns {{basicWindow?: BasicBounds, transformWindow?: TransformBounds, TransformBounds?: *, BasicBounds?: *}}
    *  Available validators.
    */
   static get Validators() { return positionValidators; }

   /**
    * Returns a duplicate of a given position instance copying any options and validators.
    *
    * // TODO: Consider more safety over options processing.
    *
    * @param {Position}          position - A position instance.
    *
    * @param {PositionOptions}   options - Position options.
    *
    * @returns {Position} A duplicate position instance.
    */
   static duplicate(position, options)
   {
      if (!(position instanceof Position)) { throw new TypeError(`'position' is not an instance of Position.`); }

      const newPosition = new Position(options);

      newPosition.#options = Object.assign({}, position.#options, options);
      newPosition.#validators.add(...position.#validators);

      newPosition.set(position.#data);

      return newPosition;
   }

   /**
    * @param {PositionParent|PositionOptionsAll}   [parent] - A potential parent element or object w/ `elementTarget`
    *                                                      getter. May also be the PositionOptions object w/ 1 argument.
    *
    * @param {PositionOptionsAll}   [options] - Default values.
    */
   constructor(parent, options)
   {
      // Test if `parent` is a plain object; if so treat as options object.
      if (isPlainObject(parent))
      {
         options = parent;
      }
      else
      {
         this.#parent = parent;
      }

      const data = this.#data;
      const transforms = this.#transforms;

      this.#styleCache = new StyleCache();

      const updateData = new UpdateElementData();

      updateData.changeSet = this.#positionChangeSet;
      updateData.data = this.#data;
      updateData.options = this.#options;
      updateData.styleCache = this.#styleCache;
      updateData.subscriptions = this.#subscriptions;
      updateData.transforms = this.#transforms;

      this.#updateElementData = updateData;

      if (typeof options === 'object')
      {
         // Set Position options
         if (typeof options.calculateTransform === 'boolean')
         {
            this.#options.calculateTransform = options.calculateTransform;
         }

         if (typeof options.ortho === 'boolean')
         {
            this.#options.ortho = options.ortho;
         }

         // Set default values from options.

         if (Number.isFinite(options.height) || options.height === 'auto' || options.height === 'inherit' ||
          options.height === null)
         {
            data.height = updateData.dimensionData.height = typeof options.height === 'number' ?
             Math.round(options.height) : options.height;
         }

         if (Number.isFinite(options.left) || options.left === null)
         {
            data.left = typeof options.left === 'number' ? Math.round(options.left) : options.left;
         }

         if (Number.isFinite(options.maxHeight) || options.maxHeight === null)
         {
            data.maxHeight = typeof options.maxHeight === 'number' ? Math.round(options.maxHeight) : options.maxHeight;
         }

         if (Number.isFinite(options.maxWidth) || options.maxWidth === null)
         {
            data.maxWidth = typeof options.maxWidth === 'number' ? Math.round(options.maxWidth) : options.maxWidth;
         }

         if (Number.isFinite(options.minHeight) || options.minHeight === null)
         {
            data.minHeight = typeof options.minHeight === 'number' ? Math.round(options.minHeight) : options.minHeight;
         }

         if (Number.isFinite(options.minWidth) || options.minWidth === null)
         {
            data.minWidth = typeof options.minWidth === 'number' ? Math.round(options.minWidth) : options.minWidth;
         }

         if (Number.isFinite(options.rotateX) || options.rotateX === null)
         {
            transforms.rotateX = data.rotateX = options.rotateX;
         }

         if (Number.isFinite(options.rotateY) || options.rotateY === null)
         {
            transforms.rotateY = data.rotateY = options.rotateY;
         }

         if (Number.isFinite(options.rotateZ) || options.rotateZ === null)
         {
            transforms.rotateZ = data.rotateZ = options.rotateZ;
         }

         if (Number.isFinite(options.scale) || options.scale === null)
         {
            transforms.scale = data.scale = options.scale;
         }

         if (Number.isFinite(options.top) || options.top === null)
         {
            data.top = typeof options.top === 'number' ? Math.round(options.top) : options.top;
         }

         if (typeof options.transformOrigin === 'string' || options.transformOrigin === null)
         {
            data.transformOrigin = transformOrigins.includes(options.transformOrigin) ?
             options.transformOrigin : null;
         }

         if (Number.isFinite(options.translateX) || options.translateX === null)
         {
            transforms.translateX = data.translateX = options.translateX;
         }

         if (Number.isFinite(options.translateY) || options.translateY === null)
         {
            transforms.translateY = data.translateY = options.translateY;
         }

         if (Number.isFinite(options.translateZ) || options.translateZ === null)
         {
            transforms.translateZ = data.translateZ = options.translateZ;
         }

         if (Number.isFinite(options.width) || options.width === 'auto' || options.width === 'inherit' ||
          options.width === null)
         {
            data.width = updateData.dimensionData.width = typeof options.width === 'number' ?
             Math.round(options.width) : options.width;
         }

         if (Number.isFinite(options.zIndex) || options.zIndex === null)
         {
            data.zIndex = typeof options.zIndex === 'number' ? Math.round(options.zIndex) : options.zIndex;
         }
      }

      this.#stores = {
         // The main properties for manipulating Position.
         height: propertyStore(this, 'height'),
         left: propertyStore(this, 'left'),
         rotateX: propertyStore(this, 'rotateX'),
         rotateY: propertyStore(this, 'rotateY'),
         rotateZ: propertyStore(this, 'rotateZ'),
         scale: propertyStore(this, 'scale'),
         top: propertyStore(this, 'top'),
         transformOrigin: propertyStore(this, 'transformOrigin'),
         translateX: propertyStore(this, 'translateX'),
         translateY: propertyStore(this, 'translateY'),
         translateZ: propertyStore(this, 'translateZ'),
         width: propertyStore(this, 'width'),
         zIndex: propertyStore(this, 'zIndex'),

         // Stores that control validation when width / height is not `auto`.
         maxHeight: propertyStore(this, 'maxHeight'),
         maxWidth: propertyStore(this, 'maxWidth'),
         minHeight: propertyStore(this, 'minHeight'),
         minWidth: propertyStore(this, 'minWidth'),

         // Readable stores based on updates or from resize observer changes.
         dimension: { subscribe: updateData.storeDimension.subscribe },
         element: { subscribe: this.#styleCache.stores.element.subscribe },
         resizeContentHeight: { subscribe: this.#styleCache.stores.resizeContentHeight.subscribe },
         resizeContentWidth: { subscribe: this.#styleCache.stores.resizeContentWidth.subscribe },
         resizeOffsetHeight: { subscribe: this.#styleCache.stores.resizeOffsetHeight.subscribe },
         resizeOffsetWidth: { subscribe: this.#styleCache.stores.resizeOffsetWidth.subscribe },
         transform: { subscribe: updateData.storeTransform.subscribe },

         // Protected store that should only be set by resizeObserver action.
         resizeObserved: this.#styleCache.stores.resizeObserved,
      };

      // When resize change from any applied resizeObserver action automatically set data for new validation run.
      // A resizeObserver prop should be set to true for ApplicationShell components or usage of resizeObserver action
      // to monitor for changes. This should only be used on elements that have 'auto' for width or height.
      subscribeIgnoreFirst(this.#stores.resizeObserved, (resizeData) =>
      {
         const parent = this.#parent;
         const el = parent instanceof HTMLElement ? parent : parent?.elementTarget;

         // Only invoke set if there is a target element and the resize data has a valid offset width & height.
         if (el instanceof HTMLElement && Number.isFinite(resizeData?.offsetWidth) &&
          Number.isFinite(resizeData?.offsetHeight))
         {
            this.set(data);
         }
      });

      this.#stores.transformOrigin.values = transformOrigins;

      [this.#validators, this.#validatorData] = new AdapterValidators();

      if (options?.initial || options?.positionInitial)
      {
         const initialHelper = options.initial ?? options.positionInitial;

         if (typeof initialHelper?.getLeft !== 'function' || typeof initialHelper?.getTop !== 'function')
         {
            throw new Error(
             `'options.initial' position helper does not contain 'getLeft' and / or 'getTop' functions.`);
         }

         this.#options.initialHelper = options.initial;
      }

      if (options?.validator)
      {
         if (isIterable(options?.validator)) { this.validators.add(...options.validator); }
         else { this.validators.add(options.validator); }
      }
   }

   /**
    * Returns the animation API.
    *
    * @returns {AnimationAPI} Animation API.
    */
   get animate()
   {
      return this.#animate;
   }

   /**
    * Returns the dimension data for the readable store.
    *
    * @returns {{width: number | 'auto', height: number | 'auto'}} Dimension data.
    */
   get dimension()
   {
      return this.#updateElementData.dimensionData;
   }

   /**
    * Returns the enabled state.
    *
    * @returns {boolean} Enabled state.
    */
   get enabled()
   {
      return this.#enabled;
   }

   /**
    * Returns the current HTMLElement being positioned.
    *
    * @returns {HTMLElement|undefined} Current HTMLElement being positioned.
    */
   get element()
   {
      return this.#styleCache.el;
   }

   /**
    * Returns a promise that is resolved on the next element update with the time of the update.
    *
    * @returns {Promise<number>} Promise resolved on element update.
    */
   get elementUpdated()
   {
      return this.#updateElementPromise;
   }

   /**
    * Returns the associated {@link PositionParent} instance.
    *
    * @returns {PositionParent} The PositionParent instance.
    */
   get parent() { return this.#parent; }

   /**
    * Returns the state API.
    *
    * @returns {PositionStateAPI} Position state API.
    */
   get state() { return this.#state; }

   /**
    * Returns the derived writable stores for individual data variables.
    *
    * @returns {StorePosition} Derived / writable stores.
    */
   get stores() { return this.#stores; }

   /**
    * Returns the transform data for the readable store.
    *
    * @returns {TransformData} Transform Data.
    */
   get transform()
   {
      return this.#updateElementData.transformData;
   }

   /**
    * Returns the validators.
    *
    * @returns {AdapterValidators} validators.
    */
   get validators() { return this.#validators; }

   /**
    * Sets the enabled state.
    *
    * @param {boolean}  enabled - New enabled state.
    */
   set enabled(enabled)
   {
      if (typeof enabled !== 'boolean')
      {
         throw new TypeError(`'enabled' is not a boolean.`);
      }

      this.#enabled = enabled;
   }

   /**
    * Sets the associated {@link PositionParent} instance. Resets the style cache and default data.
    *
    * @param {PositionParent|void} parent - A PositionParent instance.
    */
   set parent(parent)
   {
      if (parent !== void 0 && !(parent instanceof HTMLElement) && !isObject(parent))
      {
         throw new TypeError(`'parent' is not an HTMLElement, object, or undefined.`);
      }

      this.#parent = parent;

      // Reset any stored default data & the style cache.
      this.#state.remove({ name: '#defaultData' });
      this.#styleCache.reset();

      // If a parent is defined then invoke set to update any parent element.
      if (parent) { this.set(this.#data); }
   }

// Data accessors ----------------------------------------------------------------------------------------------------

   /**
    * @returns {number|'auto'|'inherit'|null} height
    */
   get height() { return this.#data.height; }

   /**
    * @returns {number|null} left
    */
   get left() { return this.#data.left; }

   /**
    * @returns {number|null} maxHeight
    */
   get maxHeight() { return this.#data.maxHeight; }

   /**
    * @returns {number|null} maxWidth
    */
   get maxWidth() { return this.#data.maxWidth; }

   /**
    * @returns {number|null} minHeight
    */
   get minHeight() { return this.#data.minHeight; }

   /**
    * @returns {number|null} minWidth
    */
   get minWidth() { return this.#data.minWidth; }

   /**
    * @returns {number|null} rotateX
    */
   get rotateX() { return this.#data.rotateX; }

   /**
    * @returns {number|null} rotateY
    */
   get rotateY() { return this.#data.rotateY; }

   /**
    * @returns {number|null} rotateZ
    */
   get rotateZ() { return this.#data.rotateZ; }

   /**
    * @returns {number|null} alias for rotateZ
    */
   get rotation() { return this.#data.rotateZ; }

   /**
    * @returns {number|null} scale
    */
   get scale() { return this.#data.scale; }

   /**
    * @returns {number|null} top
    */
   get top() { return this.#data.top; }

   /**
    * @returns {string} transformOrigin
    */
   get transformOrigin() { return this.#data.transformOrigin; }

   /**
    * @returns {number|null} translateX
    */
   get translateX() { return this.#data.translateX; }

   /**
    * @returns {number|null} translateY
    */
   get translateY() { return this.#data.translateY; }

   /**
    * @returns {number|null} translateZ
    */
   get translateZ() { return this.#data.translateZ; }

   /**
    * @returns {number|'auto'|'inherit'|null} width
    */
   get width() { return this.#data.width; }

   /**
    * @returns {number|null} z-index
    */
   get zIndex() { return this.#data.zIndex; }

   /**
    * @param {number|string|null} height -
    */
   set height(height)
   {
      this.#stores.height.set(height);
   }

   /**
    * @param {number|string|null} left -
    */
   set left(left)
   {
      this.#stores.left.set(left);
   }

   /**
    * @param {number|string|null} maxHeight -
    */
   set maxHeight(maxHeight)
   {
      this.#stores.maxHeight.set(maxHeight);
   }

   /**
    * @param {number|string|null} maxWidth -
    */
   set maxWidth(maxWidth)
   {
      this.#stores.maxWidth.set(maxWidth);
   }

   /**
    * @param {number|string|null} minHeight -
    */
   set minHeight(minHeight)
   {
      this.#stores.minHeight.set(minHeight);
   }

   /**
    * @param {number|string|null} minWidth -
    */
   set minWidth(minWidth)
   {
      this.#stores.minWidth.set(minWidth);
   }

   /**
    * @param {number|string|null} rotateX -
    */
   set rotateX(rotateX)
   {
      this.#stores.rotateX.set(rotateX);
   }

   /**
    * @param {number|string|null} rotateY -
    */
   set rotateY(rotateY)
   {
      this.#stores.rotateY.set(rotateY);
   }

   /**
    * @param {number|string|null} rotateZ -
    */
   set rotateZ(rotateZ)
   {
      this.#stores.rotateZ.set(rotateZ);
   }

   /**
    * @param {number|string|null} rotateZ - alias for rotateZ
    */
   set rotation(rotateZ)
   {
      this.#stores.rotateZ.set(rotateZ);
   }

   /**
    * @param {number|string|null} scale -
    */
   set scale(scale)
   {
      this.#stores.scale.set(scale);
   }

   /**
    * @param {number|string|null} top -
    */
   set top(top)
   {
      this.#stores.top.set(top);
   }

   /**
    * @param {string} transformOrigin -
    */
   set transformOrigin(transformOrigin)
   {
      if (transformOrigins.includes(transformOrigin)) { this.#stores.transformOrigin.set(transformOrigin); }
   }

   /**
    * @param {number|string|null} translateX -
    */
   set translateX(translateX)
   {
      this.#stores.translateX.set(translateX);
   }

   /**
    * @param {number|string|null} translateY -
    */
   set translateY(translateY)
   {
      this.#stores.translateY.set(translateY);
   }

   /**
    * @param {number|string|null} translateZ -
    */
   set translateZ(translateZ)
   {
      this.#stores.translateZ.set(translateZ);
   }

   /**
    * @param {number|string|null} width -
    */
   set width(width)
   {
      this.#stores.width.set(width);
   }

   /**
    * @param {number|string|null} zIndex -
    */
   set zIndex(zIndex)
   {
      this.#stores.zIndex.set(zIndex);
   }

   /**
    * Assigns current position to object passed into method.
    *
    * @param {object|PositionData}  [position] - Target to assign current position data.
    *
    * @param {PositionGetOptions}   [options] - Defines options for specific keys and substituting null for numeric
    *                                           default values.
    *
    * @returns {PositionData} Passed in object with current position data.
    */
   get(position = {}, options)
   {
      const keys = options?.keys;
      const excludeKeys = options?.exclude;
      const numeric = options?.numeric ?? false;

      if (isIterable(keys))
      {
         // Replace any null values potentially with numeric default values.
         if (numeric)
         {
            for (const key of keys) { position[key] = this[key] ?? numericDefaults[key]; }
         }
         else // Accept current values.
         {
            for (const key of keys) { position[key] = this[key]; }
         }

         // Remove any excluded keys.
         if (isIterable(excludeKeys))
         {
            for (const key of excludeKeys) { delete position[key]; }
         }

         return position;
      }
      else
      {
         const data = Object.assign(position, this.#data);

         // Remove any excluded keys.
         if (isIterable(excludeKeys))
         {
            for (const key of excludeKeys) { delete data[key]; }
         }

         // Potentially set numeric defaults.
         if (numeric) { setNumericDefaults(data); }

         return data;
      }
   }

   /**
    * @returns {PositionData} Current position data.
    */
   toJSON()
   {
      return Object.assign({}, this.#data);
   }

   /**
    * All calculation and updates of position are implemented in {@link Position}. This allows position to be fully
    * reactive and in control of updating inline styles for the application.
    *
    * Note: the logic for updating position is improved and changes a few aspects from the default
    * {@link Application.setPosition}. The gate on `popOut` is removed, so to ensure no positional application occurs
    * popOut applications can set `this.options.positionable` to false ensuring no positional inline styles are
    * applied.
    *
    * The initial set call on an application with a target element will always set width / height as this is
    * necessary for correct calculations.
    *
    * When a target element is present updated styles are applied after validation. To modify the behavior of set
    * implement one or more validator functions and add them from the application via
    * `this.position.validators.add(<Function>)`.
    *
    * Updates to any target element are decoupled from the underlying Position data. This method returns this instance
    * that you can then await on the target element inline style update by using {@link Position.elementUpdated}.
    *
    * @param {PositionDataExtended} [position] - Position data to set.
    *
    * @returns {Position} This Position instance.
    */
   set(position = {})
   {
      if (typeof position !== 'object') { throw new TypeError(`Position - set error: 'position' is not an object.`); }

      const parent = this.#parent;

      // An early out to prevent `set` from taking effect if not enabled.
      if (!this.#enabled)
      {
         return this;
      }

      // An early out to prevent `set` from taking effect if options `positionable` is false.
      if (parent !== void 0 && typeof parent?.options?.positionable === 'boolean' && !parent?.options?.positionable)
      {
         return this;
      }

      // Callers can specify to immediately update an associated element. This is useful if set is called from
      // requestAnimationFrame / rAF. Library integrations like GSAP invoke set from rAF.
      const immediateElementUpdate = position.immediateElementUpdate === true;

      const data = this.#data;
      const transforms = this.#transforms;

      // Find the target HTML element and verify that it is connected storing it in `el`.
      const targetEl = parent instanceof HTMLElement ? parent : parent?.elementTarget;
      const el = targetEl instanceof HTMLElement && targetEl.isConnected ? targetEl : void 0;

      const changeSet = this.#positionChangeSet;
      const styleCache = this.#styleCache;

      if (el)
      {
         // Cache the computed styles of the element.
         if (!styleCache.hasData(el))
         {
            styleCache.update(el);

            // Add will-change property if not already set in inline or computed styles.
            if (!styleCache.hasWillChange)
            ;

            // Update all properties / clear queued state.
            changeSet.set(true);
            this.#updateElementData.queued = false;
         }

         // Converts any relative string position data to numeric inputs.
         convertRelative(position, this);

         position = this.#updatePosition(position, parent, el, styleCache);

         // Check if a validator cancelled the update.
         if (position === null) { return this; }
      }

      if (Number.isFinite(position.left))
      {
         position.left = Math.round(position.left);

         if (data.left !== position.left) { data.left = position.left; changeSet.left = true; }
      }

      if (Number.isFinite(position.top))
      {
         position.top = Math.round(position.top);

         if (data.top !== position.top) { data.top = position.top; changeSet.top = true; }
      }

      if (Number.isFinite(position.maxHeight) || position.maxHeight === null)
      {
         position.maxHeight = typeof position.maxHeight === 'number' ? Math.round(position.maxHeight) : null;

         if (data.maxHeight !== position.maxHeight) { data.maxHeight = position.maxHeight; changeSet.maxHeight = true; }
      }

      if (Number.isFinite(position.maxWidth) || position.maxWidth === null)
      {
         position.maxWidth = typeof position.maxWidth === 'number' ? Math.round(position.maxWidth) : null;

         if (data.maxWidth !== position.maxWidth) { data.maxWidth = position.maxWidth; changeSet.maxWidth = true; }
      }

      if (Number.isFinite(position.minHeight) || position.minHeight === null)
      {
         position.minHeight = typeof position.minHeight === 'number' ? Math.round(position.minHeight) : null;

         if (data.minHeight !== position.minHeight) { data.minHeight = position.minHeight; changeSet.minHeight = true; }
      }

      if (Number.isFinite(position.minWidth) || position.minWidth === null)
      {
         position.minWidth = typeof position.minWidth === 'number' ? Math.round(position.minWidth) : null;

         if (data.minWidth !== position.minWidth) { data.minWidth = position.minWidth; changeSet.minWidth = true; }
      }

      if (Number.isFinite(position.rotateX) || position.rotateX === null)
      {
         if (data.rotateX !== position.rotateX)
         {
            data.rotateX = transforms.rotateX = position.rotateX;
            changeSet.transform = true;
         }
      }

      if (Number.isFinite(position.rotateY) || position.rotateY === null)
      {
         if (data.rotateY !== position.rotateY)
         {
            data.rotateY = transforms.rotateY = position.rotateY;
            changeSet.transform = true;
         }
      }

      if (Number.isFinite(position.rotateZ) || position.rotateZ === null)
      {
         if (data.rotateZ !== position.rotateZ)
         {
            data.rotateZ = transforms.rotateZ = position.rotateZ;
            changeSet.transform = true;
         }
      }

      if (Number.isFinite(position.scale) || position.scale === null)
      {
         position.scale = typeof position.scale === 'number' ? Math.max(0, Math.min(position.scale, 1000)) : null;

         if (data.scale !== position.scale)
         {
            data.scale = transforms.scale = position.scale;
            changeSet.transform = true;
         }
      }

      if ((typeof position.transformOrigin === 'string' && transformOrigins.includes(
       position.transformOrigin)) || position.transformOrigin === null)
      {
         if (data.transformOrigin !== position.transformOrigin)
         {
            data.transformOrigin = position.transformOrigin;
            changeSet.transformOrigin = true;
         }
      }

      if (Number.isFinite(position.translateX) || position.translateX === null)
      {
         if (data.translateX !== position.translateX)
         {
            data.translateX = transforms.translateX = position.translateX;
            changeSet.transform = true;
         }
      }

      if (Number.isFinite(position.translateY) || position.translateY === null)
      {
         if (data.translateY !== position.translateY)
         {
            data.translateY = transforms.translateY = position.translateY;
            changeSet.transform = true;
         }
      }

      if (Number.isFinite(position.translateZ) || position.translateZ === null)
      {
         if (data.translateZ !== position.translateZ)
         {
            data.translateZ = transforms.translateZ = position.translateZ;
            changeSet.transform = true;
         }
      }

      if (Number.isFinite(position.zIndex))
      {
         position.zIndex = Math.round(position.zIndex);

         if (data.zIndex !== position.zIndex) { data.zIndex = position.zIndex; changeSet.zIndex = true; }
      }

      if (Number.isFinite(position.width) || position.width === 'auto' || position.width === 'inherit' ||
       position.width === null)
      {
         position.width = typeof position.width === 'number' ? Math.round(position.width) : position.width;

         if (data.width !== position.width) { data.width = position.width; changeSet.width = true; }
      }

      if (Number.isFinite(position.height) || position.height === 'auto' || position.height === 'inherit' ||
       position.height === null)
      {
         position.height = typeof position.height === 'number' ? Math.round(position.height) : position.height;

         if (data.height !== position.height) { data.height = position.height; changeSet.height = true; }
      }

      if (el)
      {
         const defaultData = this.#state.getDefault();

         // Set default data after first set operation that has a target element.
         if (typeof defaultData !== 'object')
         {
            this.#state.save({ name: '#defaultData', ...Object.assign({}, data) });
         }

         // If `immediateElementUpdate` is true in position data passed to `set` then update the element immediately.
         // This is for rAF based library integrations like GSAP.
         if (immediateElementUpdate)
         {
            UpdateElementManager.immediate(el, this.#updateElementData);
            this.#updateElementPromise = Promise.resolve(performance.now());
         }
         // Else if not queued then queue an update for the next rAF callback.
         else if (!this.#updateElementData.queued)
         {
            this.#updateElementPromise = UpdateElementManager.add(el, this.#updateElementData);
         }
      }
      else
      {
         // Notify main store subscribers.
         UpdateElementManager.updateSubscribers(this.#updateElementData);
      }

      return this;
   }

   /**
    *
    * @param {function(PositionData): void} handler - Callback function that is invoked on update / changes. Receives
    *                                                 a copy of the PositionData.
    *
    * @returns {(function(): void)} Unsubscribe function.
    */
   subscribe(handler)
   {
      this.#subscriptions.push(handler); // add handler to the array of subscribers

      handler(Object.assign({}, this.#data));                     // call handler with current value

      // Return unsubscribe function.
      return () =>
      {
         const index = this.#subscriptions.findIndex((sub) => sub === handler);
         if (index >= 0) { this.#subscriptions.splice(index, 1); }
      };
   }

   /**
    * @param {PositionDataExtended} opts -
    *
    * @param {number|null} opts.left -
    *
    * @param {number|null} opts.top -
    *
    * @param {number|null} opts.maxHeight -
    *
    * @param {number|null} opts.maxWidth -
    *
    * @param {number|null} opts.minHeight -
    *
    * @param {number|null} opts.minWidth -
    *
    * @param {number|'auto'|null} opts.width -
    *
    * @param {number|'auto'|null} opts.height -
    *
    * @param {number|null} opts.rotateX -
    *
    * @param {number|null} opts.rotateY -
    *
    * @param {number|null} opts.rotateZ -
    *
    * @param {number|null} opts.scale -
    *
    * @param {string} opts.transformOrigin -
    *
    * @param {number|null} opts.translateX -
    *
    * @param {number|null} opts.translateY -
    *
    * @param {number|null} opts.translateZ -
    *
    * @param {number|null} opts.zIndex -
    *
    * @param {number|null} opts.rotation - alias for rotateZ
    *
    * @param {*} opts.rest -
    *
    * @param {object} parent -
    *
    * @param {HTMLElement} el -
    *
    * @param {StyleCache} styleCache -
    *
    * @returns {null|PositionData} Updated position data or null if validation fails.
    */
   #updatePosition({
      // Directly supported parameters
      left, top, maxWidth, maxHeight, minWidth, minHeight, width, height, rotateX, rotateY, rotateZ, scale,
       transformOrigin, translateX, translateY, translateZ, zIndex,

      // Aliased parameters
      rotation,

      ...rest
   } = {}, parent, el, styleCache)
   {
      let currentPosition = s_DATA_UPDATE.copy(this.#data);

      // Update width if an explicit value is passed, or if no width value is set on the element.
      if (el.style.width === '' || width !== void 0)
      {
         if (width === 'auto' || (currentPosition.width === 'auto' && width !== null))
         {
            currentPosition.width = 'auto';
            width = styleCache.offsetWidth;
         }
         else if (width === 'inherit' || (currentPosition.width === 'inherit' && width !== null))
         {
            currentPosition.width = 'inherit';
            width = styleCache.offsetWidth;
         }
         else
         {
            const newWidth = Number.isFinite(width) ? width : currentPosition.width;
            currentPosition.width = width = Number.isFinite(newWidth) ? Math.round(newWidth) : styleCache.offsetWidth;
         }
      }
      else
      {
         width = Number.isFinite(currentPosition.width) ? currentPosition.width : styleCache.offsetWidth;
      }

      // Update height if an explicit value is passed, or if no height value is set on the element.
      if (el.style.height === '' || height !== void 0)
      {
         if (height === 'auto' || (currentPosition.height === 'auto' && height !== null))
         {
            currentPosition.height = 'auto';
            height = styleCache.offsetHeight;
         }
         else if (height === 'inherit' || (currentPosition.height === 'inherit' && height !== null))
         {
            currentPosition.height = 'inherit';
            height = styleCache.offsetHeight;
         }
         else
         {
            const newHeight = Number.isFinite(height) ? height : currentPosition.height;
            currentPosition.height = height = Number.isFinite(newHeight) ? Math.round(newHeight) :
             styleCache.offsetHeight;
         }
      }
      else
      {
         height = Number.isFinite(currentPosition.height) ? currentPosition.height : styleCache.offsetHeight;
      }

      // Update left
      if (Number.isFinite(left))
      {
         currentPosition.left = left;
      }
      else if (!Number.isFinite(currentPosition.left))
      {
         // Potentially use any initial position helper if available or set to 0.
         currentPosition.left = typeof this.#options.initialHelper?.getLeft === 'function' ?
          this.#options.initialHelper.getLeft(width) : 0;
      }

      // Update top
      if (Number.isFinite(top))
      {
         currentPosition.top = top;
      }
      else if (!Number.isFinite(currentPosition.top))
      {
         // Potentially use any initial position helper if available or set to 0.
         currentPosition.top = typeof this.#options.initialHelper?.getTop === 'function' ?
          this.#options.initialHelper.getTop(height) : 0;
      }

      if (Number.isFinite(maxHeight) || maxHeight === null)
      {
         currentPosition.maxHeight = Number.isFinite(maxHeight) ? Math.round(maxHeight) : null;
      }

      if (Number.isFinite(maxWidth) || maxWidth === null)
      {
         currentPosition.maxWidth = Number.isFinite(maxWidth) ? Math.round(maxWidth) : null;
      }

      if (Number.isFinite(minHeight) || minHeight === null)
      {
         currentPosition.minHeight = Number.isFinite(minHeight) ? Math.round(minHeight) : null;
      }

      if (Number.isFinite(minWidth) || minWidth === null)
      {
         currentPosition.minWidth = Number.isFinite(minWidth) ? Math.round(minWidth) : null;
      }

      // Update rotate X/Y/Z, scale, z-index
      if (Number.isFinite(rotateX) || rotateX === null) { currentPosition.rotateX = rotateX; }
      if (Number.isFinite(rotateY) || rotateY === null) { currentPosition.rotateY = rotateY; }

      // Handle alias for rotateZ. First check if `rotateZ` is valid and different from the current value. Next check if
      // `rotation` is valid and use it for `rotateZ`.
      if (rotateZ !== currentPosition.rotateZ && (Number.isFinite(rotateZ) || rotateZ === null))
      {
         currentPosition.rotateZ = rotateZ;
      }
      else if (rotation !== currentPosition.rotateZ && (Number.isFinite(rotation) || rotation === null))
      {
         currentPosition.rotateZ = rotation;
      }

      if (Number.isFinite(translateX) || translateX === null) { currentPosition.translateX = translateX; }
      if (Number.isFinite(translateY) || translateY === null) { currentPosition.translateY = translateY; }
      if (Number.isFinite(translateZ) || translateZ === null) { currentPosition.translateZ = translateZ; }

      if (Number.isFinite(scale) || scale === null)
      {
         currentPosition.scale = typeof scale === 'number' ? Math.max(0, Math.min(scale, 1000)) : null;
      }

      if (typeof transformOrigin === 'string' || transformOrigin === null)
      {
         currentPosition.transformOrigin = transformOrigins.includes(transformOrigin) ? transformOrigin :
          null;
      }

      if (Number.isFinite(zIndex) || zIndex === null)
      {
         currentPosition.zIndex = typeof zIndex === 'number' ? Math.round(zIndex) : zIndex;
      }

      const validatorData = this.#validatorData;

      // If there are any validators allow them to potentially modify position data or reject the update.
      if (validatorData.length)
      {
         s_VALIDATION_DATA.parent = parent;

         s_VALIDATION_DATA.el = el;

         s_VALIDATION_DATA.computed = styleCache.computed;

         s_VALIDATION_DATA.transforms = this.#transforms;

         s_VALIDATION_DATA.height = height;

         s_VALIDATION_DATA.width = width;

         s_VALIDATION_DATA.marginLeft = styleCache.marginLeft;

         s_VALIDATION_DATA.marginTop = styleCache.marginTop;

         s_VALIDATION_DATA.maxHeight = styleCache.maxHeight ?? currentPosition.maxHeight;

         s_VALIDATION_DATA.maxWidth = styleCache.maxWidth ?? currentPosition.maxWidth;

         // Given a parent w/ reactive state and is minimized ignore styleCache min-width/height.
         const isMinimized = parent?.reactive?.minimized ?? false;

         // Note the use of || for accessing the style cache as the left hand is ignored w/ falsy values such as '0'.
         s_VALIDATION_DATA.minHeight = isMinimized ? currentPosition.minHeight ?? 0 :
          styleCache.minHeight || (currentPosition.minHeight ?? 0);

         s_VALIDATION_DATA.minWidth = isMinimized ? currentPosition.minWidth ?? 0 :
          styleCache.minWidth || (currentPosition.minWidth ?? 0);

         for (let cntr = 0; cntr < validatorData.length; cntr++)
         {
            s_VALIDATION_DATA.position = currentPosition;
            s_VALIDATION_DATA.rest = rest;
            currentPosition = validatorData[cntr].validator(s_VALIDATION_DATA);

            if (currentPosition === null) { return null; }
         }
      }

      // Return the updated position object.
      return currentPosition;
   }
}

const s_DATA_UPDATE = new PositionData();

/**
 * @type {ValidationData}
 */
const s_VALIDATION_DATA = {
   position: void 0,
   parent: void 0,
   el: void 0,
   computed: void 0,
   transforms: void 0,
   height: void 0,
   width: void 0,
   marginLeft: void 0,
   marginTop: void 0,
   maxHeight: void 0,
   maxWidth: void 0,
   minHeight: void 0,
   minWidth: void 0,
   rest: void 0
};

Object.seal(s_VALIDATION_DATA);

/**
 * @typedef {object} InitialHelper
 *
 * @property {Function} getLeft - A function that takes the width parameter and returns the left position.
 *
 * @property {Function} getTop - A function that takes the height parameter and returns the top position.
 */

/**
 * @typedef {object} PositionDataExtended
 *
 * @property {number|string|null} [height] -
 *
 * @property {number|string|null} [left] -
 *
 * @property {number|string|null} [maxHeight] -
 *
 * @property {number|string|null} [maxWidth] -
 *
 * @property {number|string|null} [minHeight] -
 *
 * @property {number|string|null} [minWidth] -
 *
 * @property {number|string|null} [rotateX] -
 *
 * @property {number|string|null} [rotateY] -
 *
 * @property {number|string|null} [rotateZ] -
 *
 * @property {number|string|null} [scale] -
 *
 * @property {number|string|null} [top] -
 *
 * @property {string|null} [transformOrigin] -
 *
 * @property {number|string|null} [translateX] -
 *
 * @property {number|string|null} [translateY] -
 *
 * @property {number|string|null} [translateZ] -
 *
 * @property {number|string|null} [width] -
 *
 * @property {number|string|null} [zIndex] -
 *
 * Extended properties -----------------------------------------------------------------------------------------------
 *
 * @property {boolean} [immediateElementUpdate] - When true any associated element is updated immediately.
 *
 * @property {number|null} [rotation] - Alias for `rotateZ`.
 */

/**
 * @typedef {object} PositionGetOptions
 *
 * @property {Iterable<string>} keys - When provided only these keys are copied.
 *
 * @property {Iterable<string>} exclude - When provided these keys are excluded.
 *
 * @property {boolean} numeric - When true any `null` values are converted into defaults.
 */

/**
 * @typedef {object} PositionOptions - Options set in constructor.
 *
 * @property {boolean} calculateTransform - When true always calculate transform data.
 *
 * @property {InitialHelper} initialHelper - Provides a helper for setting initial position data.
 *
 * @property {boolean} ortho - Sets Position to orthographic mode using just transform / matrix3d for positioning.
 *
 * @property {boolean} transformSubscribed - Set to true when there are subscribers to the readable transform store.
 */

/**
 * @typedef {PositionOptions & PositionData} PositionOptionsAll
 */

/**
 * @typedef {HTMLElement | object} PositionParent
 *
 * @property {Function} [elementTarget] - Potentially returns any parent object.
 */

/**
 * @typedef {object} ResizeObserverData
 *
 * @property {number|undefined} contentHeight -
 *
 * @property {number|undefined} contentWidth -
 *
 * @property {number|undefined} offsetHeight -
 *
 * @property {number|undefined} offsetWidth -
 */

/**
 * @typedef {object} StorePosition - Provides individual writable stores for {@link Position}.
 *
 * @property {import('svelte/store').Readable<{width: number, height: number}>} dimension - Readable store for dimension
 *                                                                                          data.
 *
 * @property {import('svelte/store').Readable<HTMLElement>} element - Readable store for current element.
 *
 * @property {import('svelte/store').Writable<number|null>} left - Derived store for `left` updates.
 *
 * @property {import('svelte/store').Writable<number|null>} top - Derived store for `top` updates.
 *
 * @property {import('svelte/store').Writable<number|'auto'|null>} width - Derived store for `width` updates.
 *
 * @property {import('svelte/store').Writable<number|'auto'|null>} height - Derived store for `height` updates.
 *
 * @property {import('svelte/store').Writable<number|null>} maxHeight - Derived store for `maxHeight` updates.
 *
 * @property {import('svelte/store').Writable<number|null>} maxWidth - Derived store for `maxWidth` updates.
 *
 * @property {import('svelte/store').Writable<number|null>} minHeight - Derived store for `minHeight` updates.
 *
 * @property {import('svelte/store').Writable<number|null>} minWidth - Derived store for `minWidth` updates.
 *
 * @property {import('svelte/store').Readable<number|undefined>} resizeContentHeight - Readable store for `contentHeight`.
 *
 * @property {import('svelte/store').Readable<number|undefined>} resizeContentWidth - Readable store for `contentWidth`.
 *
 * @property {import('svelte/store').Writable<ResizeObserverData>} resizeObserved - Protected store for resize observer updates.
 *
 * @property {import('svelte/store').Readable<number|undefined>} resizeOffsetHeight - Readable store for `offsetHeight`.
 *
 * @property {import('svelte/store').Readable<number|undefined>} resizeOffsetWidth - Readable store for `offsetWidth`.
 *
 * @property {import('svelte/store').Writable<number|null>} rotate - Derived store for `rotate` updates.
 *
 * @property {import('svelte/store').Writable<number|null>} rotateX - Derived store for `rotateX` updates.
 *
 * @property {import('svelte/store').Writable<number|null>} rotateY - Derived store for `rotateY` updates.
 *
 * @property {import('svelte/store').Writable<number|null>} rotateZ - Derived store for `rotateZ` updates.
 *
 * @property {import('svelte/store').Writable<number|null>} scale - Derived store for `scale` updates.
 *
 * @property {import('svelte/store').Readable<TransformData>} transform - Readable store for transform data.
 *
 * @property {import('svelte/store').Writable<string>} transformOrigin - Derived store for `transformOrigin`.
 *
 * @property {import('svelte/store').Writable<number|null>} translateX - Derived store for `translateX` updates.
 *
 * @property {import('svelte/store').Writable<number|null>} translateY - Derived store for `translateY` updates.
 *
 * @property {import('svelte/store').Writable<number|null>} translateZ - Derived store for `translateZ` updates.
 *
 * @property {import('svelte/store').Writable<number|null>} zIndex - Derived store for `zIndex` updates.
 */

/**
 * @typedef {object} ValidationData
 *
 * @property {PositionData} position -
 *
 * @property {PositionParent} parent -
 *
 * @property {HTMLElement} el -
 *
 * @property {CSSStyleDeclaration} computed -
 *
 * @property {Transforms} transforms -
 *
 * @property {number} height -
 *
 * @property {number} width -
 *
 * @property {number|undefined} marginLeft -
 *
 * @property {number|undefined} marginTop -
 *
 * @property {number|undefined} maxHeight -
 *
 * @property {number|undefined} maxWidth -
 *
 * @property {number|undefined} minHeight -
 *
 * @property {number|undefined} minWidth -
 *
 * @property {object} rest - The rest of any data submitted to {@link Position.set}
 */

class ApplicationState
{
   /** @type {ApplicationShellExt} */
   #application;

   /** @type {Map<string, ApplicationData>} */
   #dataSaved = new Map();

   #sessionStorage;

   /**
    * @param {ApplicationShellExt}   application - The application.
    */
   constructor(application)
   {
      this.#application = application;

      const optionsSessionStorage = application?.options?.sessionStorage;

      if (optionsSessionStorage !== void 0 && !(optionsSessionStorage instanceof TJSSessionStorage))
      {
         throw new TypeError(`'options.sessionStorage' is not an instance of TJSSessionStorage.`);
      }

      this.#sessionStorage = optionsSessionStorage !== void 0 ? optionsSessionStorage : new TJSSessionStorage();
   }

   /**
    * @returns {TJSSessionStorage} Returns TJSSessionStorage instance.
    */
   get sessionStorage()
   {
      return this.#sessionStorage;
   }

   /**
    * Returns current application state along with any extra data passed into method.
    *
    * @param {object} [extra] - Extra data to add to application state.
    *
    * @returns {ApplicationData} Passed in object with current application state.
    */
   get(extra = {})
   {
      return Object.assign(extra, {
         position: this.#application?.position?.get(),
         beforeMinimized: this.#application?.position?.state.get({ name: '#beforeMinimized' }),
         options: Object.assign({}, this.#application?.options),
         ui: { minimized: this.#application?.reactive?.minimized }
      });
   }

   /**
    * Returns any stored save state by name.
    *
    * @param {string}   name - Saved data set name.
    *
    * @returns {ApplicationData} The saved data set.
    */
   getSave({ name })
   {
      if (typeof name !== 'string')
      {
         throw new TypeError(`ApplicationState - getSave error: 'name' is not a string.`);
      }

      return this.#dataSaved.get(name);
   }

   /**
    * Removes and returns any application state by name.
    *
    * @param {object}   options - Options.
    *
    * @param {string}   options.name - Name to remove and retrieve.
    *
    * @returns {ApplicationData} Saved application data.
    */
   remove({ name })
   {
      if (typeof name !== 'string') { throw new TypeError(`ApplicationState - remove: 'name' is not a string.`); }

      const data = this.#dataSaved.get(name);
      this.#dataSaved.delete(name);

      return data;
   }

   /**
    * Restores a saved application state returning the data. Several optional parameters are available
    * to control whether the restore action occurs silently (no store / inline styles updates), animates
    * to the stored data, or simply sets the stored data. Restoring via {@link AnimationAPI.to} allows
    * specification of the duration, easing, and interpolate functions along with configuring a Promise to be
    * returned if awaiting the end of the animation.
    *
    * @param {object}            params - Parameters
    *
    * @param {string}            params.name - Saved data set name.
    *
    * @param {boolean}           [params.remove=false] - Remove data set.
    *
    * @param {boolean}           [params.async=false] - If animating return a Promise that resolves with any saved data.
    *
    * @param {boolean}           [params.animateTo=false] - Animate to restore data.
    *
    * @param {number}            [params.duration=0.1] - Duration in seconds.
    *
    * @param {Function}          [params.ease=linear] - Easing function.
    *
    * @param {Function}          [params.interpolate=lerp] - Interpolation function.
    *
    * @returns {ApplicationData|Promise<ApplicationData>} Saved application data.
    */
   restore({ name, remove = false, async = false, animateTo = false, duration = 0.1, ease = identity,
    interpolate = lerp$5 })
   {
      if (typeof name !== 'string')
      {
         throw new TypeError(`ApplicationState - restore error: 'name' is not a string.`);
      }

      const dataSaved = this.#dataSaved.get(name);

      if (dataSaved)
      {
         if (remove) { this.#dataSaved.delete(name); }

         if (async)
         {
            return this.set(dataSaved, { async, animateTo, duration, ease, interpolate }).then(() => dataSaved);
         }
         else
         {
            this.set(dataSaved, { async, animateTo, duration, ease, interpolate });
         }
      }

      return dataSaved;
   }

   /**
    * Saves current application state with the opportunity to add extra data to the saved state.
    *
    * @param {object}   options - Options.
    *
    * @param {string}   options.name - name to index this saved data.
    *
    * @param {...*}     [options.extra] - Extra data to add to saved data.
    *
    * @returns {ApplicationData} Current application data
    */
   save({ name, ...extra })
   {
      if (typeof name !== 'string') { throw new TypeError(`ApplicationState - save error: 'name' is not a string.`); }

      const data = this.get(extra);

      this.#dataSaved.set(name, data);

      return data;
   }

   /**
    * Restores a saved application state returning the data. Several optional parameters are available
    * to control whether the restore action occurs silently (no store / inline styles updates), animates
    * to the stored data, or simply sets the stored data. Restoring via {@link AnimationAPI.to} allows
    * specification of the duration, easing, and interpolate functions along with configuring a Promise to be
    * returned if awaiting the end of the animation.
    *
    * Note: If serializing application state any minimized apps will use the before minimized state on initial render
    * of the app as it is currently not possible to render apps with Foundry VTT core API in the minimized state.
    *
    * TODO: THIS METHOD NEEDS TO BE REFACTORED WHEN TRL IS MADE INTO A STANDALONE FRAMEWORK.
    *
    * @param {ApplicationData}   data - Saved data set name.
    *
    * @param {object}            [opts] - Optional parameters
    *
    * @param {boolean}           [opts.async=false] - If animating return a Promise that resolves with any saved data.
    *
    * @param {boolean}           [opts.animateTo=false] - Animate to restore data.
    *
    * @param {number}            [opts.duration=0.1] - Duration in seconds.
    *
    * @param {Function}          [opts.ease=linear] - Easing function.
    *
    * @param {Function}          [opts.interpolate=lerp] - Interpolation function.
    *
    * @returns {ApplicationShellExt|Promise<ApplicationShellExt>} When synchronous the application or Promise when
    *                                                             animating resolving with application.
    */
   set(data, { async = false, animateTo = false, duration = 0.1, ease = identity, interpolate = lerp$5 } = {})
   {
      if (!isObject(data))
      {
         throw new TypeError(`ApplicationState - restore error: 'data' is not an object.`);
      }

      const application = this.#application;

      if (!isObject(data?.position))
      {
         console.warn(`ApplicationState.set warning: 'data.position' is not an object.`);
         return application;
      }

      // TODO: TAKE NOTE THAT WE ARE ACCESSING A FOUNDRY APP v1 GETTER HERE TO DETERMINE IF APPLICATION IS RENDERED.
      // TODO: THIS NEEDS TO BE REFACTORED WHEN CONVERTING TRL TO A GENERIC FRAMEWORK.
      const rendered = application.rendered;

      if (animateTo && !rendered)
      {
         console.warn(`ApplicationState.set warning: Application is not rendered and 'animateTo' is true.`);
         return application;
      }

      // Update data directly with no store or inline style updates.
      if (animateTo)  // Animate to saved data.
      {
         // Provide special handling to potentially change transform origin as this parameter is not animated.
         if (data.position.transformOrigin !== application.position.transformOrigin)
         {
            application.position.transformOrigin = data.position.transformOrigin;
         }

         if (isObject(data?.ui))
         {
            const minimized = typeof data.ui?.minimized === 'boolean' ? data.ui.minimized : false;

            if (application?.reactive?.minimized && !minimized)
            {
               application.maximize({ animate: false, duration: 0 });
            }
         }

         const promise = application.position.animate.to(data.position,
          { duration, ease, interpolate }).finished.then((cancelled) =>
         {
            if (cancelled) { return application; }

            // Merge in saved options to application.
            if (isObject(data?.options))
            {
               application?.reactive.mergeOptions(data.options);
            }

            if (isObject(data?.ui))
            {
               const minimized = typeof data.ui?.minimized === 'boolean' ? data.ui.minimized : false;

               // Application is currently minimized and stored state is not, so reset minimized state without
               // animation.
               if (!application?.reactive?.minimized && minimized)
               {
                  application.minimize({ animate: false, duration: 0 });
               }
            }

            if (isObject(data?.beforeMinimized))
            {
               application.position.state.set({ name: '#beforeMinimized', ...data.beforeMinimized });
            }

            return application;
         });

         // Return a Promise with the application that resolves after animation ends.
         if (async) { return promise; }
      }
      else
      {
         if (rendered)
         {
            // Merge in saved options to application.
            if (isObject(data?.options))
            {
               application?.reactive.mergeOptions(data.options);
            }

            if (isObject(data?.ui))
            {
               const minimized = typeof data.ui?.minimized === 'boolean' ? data.ui.minimized : false;

               // Application is currently minimized and stored state is not, so reset minimized state without
               // animation.
               if (application?.reactive?.minimized && !minimized)
               {
                  application.maximize({ animate: false, duration: 0 });
               }
               else if (!application?.reactive?.minimized && minimized)
               {
                  application.minimize({ animate: false, duration });
               }
            }

            if (isObject(data?.beforeMinimized))
            {
               application.position.state.set({ name: '#beforeMinimized', ...data.beforeMinimized });
            }

            // Default options is to set data for an immediate update.
            application.position.set(data.position);
         }
         else
         {
            // When not rendered set position to the 'beforeMinimized' data if it exists otherwise set w/ 'position'.
            // Currently w/ Foundry core Application API it is impossible to initially render an app in the minimized
            // state.

            let positionData = data.position;

            if (isObject(data.beforeMinimized))
            {
               // Take before minimized data.
               positionData = data.beforeMinimized;

               // Apply position left / top to before minimized data. This covers the case when an app is minimized,
               // but then moved. This allows restoration of the before minimized parameters w/ the last position
               // location.
               positionData.left = data.position.left;
               positionData.top = data.position.top;
            }

            application.position.set(positionData);
         }
      }

      return application;
   }
}

/**
 * @typedef {object} ApplicationData
 *
 * @property {PositionDataExtended}   position - Application position.
 *
 * @property {object}         beforeMinimized - Any application saved position state for #beforeMinimized
 *
 * @property {object}         options - Application options.
 *
 * @property {object}         ui - Application UI state.
 */

/**
 * Provides a helper class for {@link SvelteApplication} by combining all methods that work on the {@link SvelteData[]}
 * of mounted components. This class is instantiated and can be retrieved by the getter `svelte` via SvelteApplication.
 */
class GetSvelteData
{
   /**
    * @type {MountedAppShell[]|null[]}
    */
   #applicationShellHolder;

   /**
    * @type {SvelteData[]}
    */
   #svelteData;

   /**
    * Keep a direct reference to the SvelteData array in an associated {@link SvelteApplication}.
    *
    * @param {MountedAppShell[]|null[]}  applicationShellHolder - A reference to the MountedAppShell array.
    *
    * @param {SvelteData[]}  svelteData - A reference to the SvelteData array of mounted components.
    */
   constructor(applicationShellHolder, svelteData)
   {
      this.#applicationShellHolder = applicationShellHolder;
      this.#svelteData = svelteData;
   }

   /**
    * Returns any mounted {@link MountedAppShell}.
    *
    * @returns {MountedAppShell|null} Any mounted application shell.
    */
   get applicationShell() { return this.#applicationShellHolder[0]; }

   /**
    * Returns the indexed Svelte component.
    *
    * @param {number}   index -
    *
    * @returns {object} The loaded Svelte component.
    */
   component(index)
   {
      const data = this.#svelteData[index];
      return typeof data === 'object' ? data?.component : void 0;
   }

   /**
    * Returns the Svelte component entries iterator.
    *
    * @returns {Generator<Array<number|SvelteComponent>>} Svelte component entries iterator.
    * @yields
    */
   *componentEntries()
   {
      for (let cntr = 0; cntr < this.#svelteData.length; cntr++)
      {
         yield [cntr, this.#svelteData[cntr].component];
      }
   }

   /**
    * Returns the Svelte component values iterator.
    *
    * @returns {Generator<SvelteComponent>} Svelte component values iterator.
    * @yields
    */
   *componentValues()
   {
      for (let cntr = 0; cntr < this.#svelteData.length; cntr++)
      {
         yield this.#svelteData[cntr].component;
      }
   }

   /**
    * Returns the indexed SvelteData entry.
    *
    * @param {number}   index -
    *
    * @returns {SvelteData} The loaded Svelte config + component.
    */
   data(index)
   {
      return this.#svelteData[index];
   }

   /**
    * Returns the {@link SvelteData} instance for a given component.
    *
    * @param {object} component - Svelte component.
    *
    * @returns {SvelteData} -  The loaded Svelte config + component.
    */
   dataByComponent(component)
   {
      for (const data of this.#svelteData)
      {
         if (data.component === component) { return data; }
      }

      return void 0;
   }

   /**
    * Returns the SvelteData entries iterator.
    *
    * @returns {IterableIterator<[number, SvelteData]>} SvelteData entries iterator.
    */
   dataEntries()
   {
      return this.#svelteData.entries();
   }

   /**
    * Returns the SvelteData values iterator.
    *
    * @returns {IterableIterator<SvelteData>} SvelteData values iterator.
    */
   dataValues()
   {
      return this.#svelteData.values();
   }

   /**
    * Returns the length of the mounted Svelte component list.
    *
    * @returns {number} Length of mounted Svelte component list.
    */
   get length()
   {
      return this.#svelteData.length;
   }
}

/**
 * Instantiates and attaches a Svelte component to the main inserted HTML.
 *
 * @param {object}            opts - Optional parameters.
 *
 * @param {object}            opts.app - The target application
 *
 * @param {HTMLElement}       opts.template - Any HTML template.
 *
 * @param {object}            opts.config - Svelte component options
 *
 * @param {Function}          opts.elementRootUpdate - A callback to assign to the external context.
 *
 * @returns {SvelteData} The config + instantiated Svelte component.
 */
function loadSvelteConfig({ app, template, config, elementRootUpdate } = {})
{
   const svelteOptions = typeof config.options === 'object' ? config.options : {};

   let target;

   // A specific HTMLElement to append Svelte component.
   if (config.target instanceof HTMLElement)
   {
      target = config.target;
   }
   // A string target defines a selector to find in existing HTML.
   else if (template instanceof HTMLElement && typeof config.target === 'string')
   {
      target = template.querySelector(config.target);
   }
   else                                            // No target defined, create a document fragment.
   {
      target = document.createDocumentFragment();
   }

   if (target === void 0)
   {
      console.log(
       `%c[TRL] loadSvelteConfig error - could not find target selector, '${config.target}', for config:\n`,
       'background: rgb(57,34,34)', config);

      throw new Error();
   }

   const NewSvelteComponent = config.class;

   const svelteConfig = parseSvelteConfig({ ...config, target }, app);

   const externalContext = svelteConfig.context.get('external');

   // Inject the Foundry application instance and `elementRootUpdate` to the external context.
   externalContext.application = app;
   externalContext.elementRootUpdate = elementRootUpdate;
   externalContext.sessionStorage = app.state.sessionStorage;

   let eventbus;

   // Potentially inject any TyphonJS eventbus and track the proxy in the SvelteData instance.
   if (typeof app._eventbus === 'object' && typeof app._eventbus.createProxy === 'function')
   {
      eventbus = app._eventbus.createProxy();
      externalContext.eventbus = eventbus;
   }

   // Create the Svelte component.
   /**
    * @type {import('svelte').SvelteComponent}
    */
   const component = new NewSvelteComponent(svelteConfig);

   // Set any eventbus to the config.
   svelteConfig.eventbus = eventbus;

   /**
    * @type {HTMLElement}
    */
   let element;

   // We can directly get the root element from components which follow the application store contract.
   if (isApplicationShell(component))
   {
      element = component.elementRoot;
   }

   // Detect if target is a synthesized DocumentFragment with a child element. Child elements will be present
   // if the Svelte component mounts and renders initial content into the document fragment.
   if (target instanceof DocumentFragment && target.firstElementChild)
   {
      if (element === void 0) { element = target.firstElementChild; }
      template.append(target);
   }
   else if (config.target instanceof HTMLElement && element === void 0)
   {
      if (config.target instanceof HTMLElement && typeof svelteOptions.selectorElement !== 'string')
      {
         console.log(
          `%c[TRL] loadSvelteConfig error - HTMLElement target with no 'selectorElement' defined.\n` +
          `\nNote: If configuring an application shell and directly targeting a HTMLElement did you bind an` +
          `'elementRoot' and include '<svelte:options accessors={true}/>'?\n` +
          `\nOffending config:\n`, 'background: rgb(57,34,34)', config);

         throw new Error();
      }

      // The target is an HTMLElement so find the Application element from `selectorElement` option.
      element = target.querySelector(svelteOptions.selectorElement);

      if (element === null || element === void 0)
      {
         console.log(
          `%c[TRL] loadSvelteConfig error - HTMLElement target with 'selectorElement', '${
           svelteOptions.selectorElement}', not found for config:\n`,
          'background: rgb(57,34,34)', config);

         throw new Error();
      }
   }

   // If the configuration / original target is an HTML element then do not inject HTML.
   const injectHTML = !(config.target instanceof HTMLElement);

   return { config: svelteConfig, component, element, injectHTML };
}

/**
 * Contains the reactive functionality / Svelte stores associated with SvelteApplication.
 */
class SvelteReactive
{
   /**
    * @type {SvelteApplication}
    */
   #application;

   /**
    * @type {boolean}
    */
   #initialized = false;

   /**
    * The Application option store which is injected into mounted Svelte component context under the `external` key.
    *
    * @type {StoreAppOptions}
    */
   #storeAppOptions;

   /**
    * Stores the update function for `#storeAppOptions`.
    *
    * @type {import('svelte/store').Writable.update}
    */
   #storeAppOptionsUpdate;

   /**
    * Stores the UI state data to make it accessible via getters.
    *
    * @type {object}
    */
   #dataUIState;

   /**
    * The UI option store which is injected into mounted Svelte component context under the `external` key.
    *
    * @type {StoreUIOptions}
    */
   #storeUIState;

   /**
    * Stores the update function for `#storeUIState`.
    *
    * @type {import('svelte/store').Writable.update}
    */
   #storeUIStateUpdate;

   /**
    * Stores the unsubscribe functions from local store subscriptions.
    *
    * @type {import('svelte/store').Unsubscriber[]}
    */
   #storeUnsubscribe = [];

   /**
    * @param {SvelteApplication} application - The host Foundry application.
    */
   constructor(application)
   {
      this.#application = application;
   }

   /**
    * Initializes reactive support. Package private for internal use.
    *
    * @returns {SvelteStores} Internal methods to interact with Svelte stores.
    * @package
    */
   initialize()
   {
      if (this.#initialized) { return; }

      this.#initialized = true;

      this.#storesInitialize();

      return {
         appOptionsUpdate: this.#storeAppOptionsUpdate,
         uiOptionsUpdate: this.#storeUIStateUpdate,
         subscribe: this.#storesSubscribe.bind(this),
         unsubscribe: this.#storesUnsubscribe.bind(this)
      };
   }

// Only reactive getters ---------------------------------------------------------------------------------------------

   /**
    * Returns the current dragging UI state.
    *
    * @returns {boolean} Dragging UI state.
    */
   get dragging() { return this.#dataUIState.dragging; }

   /**
    * Returns the current minimized UI state.
    *
    * @returns {boolean} Minimized UI state.
    */
   get minimized() { return this.#dataUIState.minimized; }

   /**
    * Returns the current resizing UI state.
    *
    * @returns {boolean} Resizing UI state.
    */
   get resizing() { return this.#dataUIState.resizing; }

// Reactive getter / setters -----------------------------------------------------------------------------------------

   /**
    * Returns the draggable app option.
    *
    * @returns {boolean} Draggable app option.
    */
   get draggable() { return this.#application?.options?.draggable; }

   /**
    * Returns the headerButtonNoClose app option.
    *
    * @returns {boolean} Remove the close the button in header app option.
    */
   get headerButtonNoClose() { return this.#application?.options?.headerButtonNoClose; }

   /**
    * Returns the headerButtonNoLabel app option.
    *
    * @returns {boolean} Remove the labels from buttons in header app option.
    */
   get headerButtonNoLabel() { return this.#application?.options?.headerButtonNoLabel; }

   /**
    * Returns the headerNoTitleMinimized app option.
    *
    * @returns {boolean} When true removes the header title when minimized.
    */
   get headerNoTitleMinimized() { return this.#application?.options?.headerNoTitleMinimized; }

   /**
    * Returns the minimizable app option.
    *
    * @returns {boolean} Minimizable app option.
    */
   get minimizable() { return this.#application?.options?.minimizable; }

   /**
    * @inheritDoc
    */
   get popOut() { return this.#application.popOut; }

   /**
    * Returns the resizable option.
    *
    * @returns {boolean} Resizable app option.
    */
   get resizable() { return this.#application?.options?.resizable; }

   /**
    * Returns the store for app options.
    *
    * @returns {StoreAppOptions} App options store.
    */
   get storeAppOptions() { return this.#storeAppOptions; }

   /**
    * Returns the store for UI options.
    *
    * @returns {StoreUIOptions} UI options store.
    */
   get storeUIState() { return this.#storeUIState; }

   /**
    * Returns the title accessor from the parent Application class.
    * TODO: Application v2; note that super.title localizes `this.options.title`; IMHO it shouldn't.
    *
    * @returns {string} Title.
    */
   get title() { return this.#application.title; }

   /**
    * Sets `this.options.draggable` which is reactive for application shells.
    *
    * @param {boolean}  draggable - Sets the draggable option.
    */
   set draggable(draggable)
   {
      if (typeof draggable === 'boolean') { this.setOptions('draggable', draggable); }
   }

   /**
    * Sets `this.options.headerButtonNoClose` which is reactive for application shells.
    *
    * @param {boolean}  headerButtonNoClose - Sets the headerButtonNoClose option.
    */
   set headerButtonNoClose(headerButtonNoClose)
   {
      if (typeof headerButtonNoClose === 'boolean') { this.setOptions('headerButtonNoClose', headerButtonNoClose); }
   }

   /**
    * Sets `this.options.headerButtonNoLabel` which is reactive for application shells.
    *
    * @param {boolean}  headerButtonNoLabel - Sets the headerButtonNoLabel option.
    */
   set headerButtonNoLabel(headerButtonNoLabel)
   {
      if (typeof headerButtonNoLabel === 'boolean') { this.setOptions('headerButtonNoLabel', headerButtonNoLabel); }
   }

   /**
    * Sets `this.options.headerNoTitleMinimized` which is reactive for application shells.
    *
    * @param {boolean}  headerNoTitleMinimized - Sets the headerNoTitleMinimized option.
    */
   set headerNoTitleMinimized(headerNoTitleMinimized)
   {
      if (typeof headerNoTitleMinimized === 'boolean')
      {
         this.setOptions('headerNoTitleMinimized', headerNoTitleMinimized);
      }
   }

   /**
    * Sets `this.options.minimizable` which is reactive for application shells that are also pop out.
    *
    * @param {boolean}  minimizable - Sets the minimizable option.
    */
   set minimizable(minimizable)
   {
      if (typeof minimizable === 'boolean') { this.setOptions('minimizable', minimizable); }
   }

   /**
    * Sets `this.options.popOut` which is reactive for application shells. This will add / remove this application
    * from `ui.windows`.
    *
    * @param {boolean}  popOut - Sets the popOut option.
    */
   set popOut(popOut)
   {
      if (typeof popOut === 'boolean') { this.setOptions('popOut', popOut); }
   }

   /**
    * Sets `this.options.resizable` which is reactive for application shells.
    *
    * @param {boolean}  resizable - Sets the resizable option.
    */
   set resizable(resizable)
   {
      if (typeof resizable === 'boolean') { this.setOptions('resizable', resizable); }
   }

   /**
    * Sets `this.options.title` which is reactive for application shells.
    *
    * Note: Will set empty string if title is undefined or null.
    *
    * @param {string|undefined|null}   title - Application title; will be localized, so a translation key is fine.
    */
   set title(title)
   {
      if (typeof title === 'string')
      {
         this.setOptions('title', title);
      }
      else if (title === void 0 || title === null)
      {
         this.setOptions('title', '');
      }
   }

   /**
    * Provides a way to safely get this applications options given an accessor string which describes the
    * entries to walk. To access deeper entries into the object format the accessor string with `.` between entries
    * to walk.
    *
    * // TODO DOCUMENT the accessor in more detail.
    *
    * @param {string}   accessor - The path / key to set. You can set multiple levels.
    *
    * @param {*}        [defaultValue] - A default value returned if the accessor is not found.
    *
    * @returns {*} Value at the accessor.
    */
   getOptions(accessor, defaultValue)
   {
      return safeAccess(this.#application.options, accessor, defaultValue);
   }

   /**
    * Provides a way to merge `options` into this applications options and update the appOptions store.
    *
    * @param {object}   options - The options object to merge with `this.options`.
    */
   mergeOptions(options)
   {
      this.#storeAppOptionsUpdate((instanceOptions) => deepMerge(instanceOptions, options));
   }

   /**
    * Provides a way to safely set this applications options given an accessor string which describes the
    * entries to walk. To access deeper entries into the object format the accessor string with `.` between entries
    * to walk.
    *
    * Additionally if an application shell Svelte component is mounted and exports the `appOptions` property then
    * the application options is set to `appOptions` potentially updating the application shell / Svelte component.
    *
    * // TODO DOCUMENT the accessor in more detail.
    *
    * @param {string}   accessor - The path / key to set. You can set multiple levels.
    *
    * @param {*}        value - Value to set.
    */
   setOptions(accessor, value)
   {
      const success = safeSet(this.#application.options, accessor, value);

      // If `this.options` modified then update the app options store.
      if (success)
      {
         this.#storeAppOptionsUpdate(() => this.#application.options);
      }
   }

   /**
    * Initializes the Svelte stores and derived stores for the application options and UI state.
    *
    * While writable stores are created the update method is stored in private variables locally and derived Readable
    * stores are provided for essential options which are commonly used.
    *
    * These stores are injected into all Svelte components mounted under the `external` context: `storeAppOptions` and
    * ` storeUIState`.
    */
   #storesInitialize()
   {
      const writableAppOptions = writable$1(this.#application.options);

      // Keep the update function locally, but make the store essentially readable.
      this.#storeAppOptionsUpdate = writableAppOptions.update;

      /**
       * Create custom store. The main subscribe method for all app options changes is provided along with derived
       * writable stores for all reactive options.
       *
       * @type {StoreAppOptions}
       */
      const storeAppOptions = {
         subscribe: writableAppOptions.subscribe,

         draggable: propertyStore(writableAppOptions, 'draggable'),
         headerButtonNoClose: propertyStore(writableAppOptions, 'headerButtonNoClose'),
         headerButtonNoLabel: propertyStore(writableAppOptions, 'headerButtonNoLabel'),
         headerNoTitleMinimized: propertyStore(writableAppOptions, 'headerNoTitleMinimized'),
         minimizable: propertyStore(writableAppOptions, 'minimizable'),
         popOut: propertyStore(writableAppOptions, 'popOut'),
         resizable: propertyStore(writableAppOptions, 'resizable'),
         title: propertyStore(writableAppOptions, 'title')
      };

      Object.freeze(storeAppOptions);

      this.#storeAppOptions = storeAppOptions;

      this.#dataUIState = {
         dragging: false,
         headerButtons: [],
         minimized: this.#application._minimized,
         resizing: false
      };

      // Create a store for UI state data.
      const writableUIOptions = writable$1(this.#dataUIState);

      // Keep the update function locally, but make the store essentially readable.
      this.#storeUIStateUpdate = writableUIOptions.update;

      /**
       * @type {StoreUIOptions}
       */
      const storeUIState = {
         subscribe: writableUIOptions.subscribe,

         dragging: propertyStore(writableUIOptions, 'dragging'),
         headerButtons: derived(writableUIOptions, ($options, set) => set($options.headerButtons)),
         minimized: derived(writableUIOptions, ($options, set) => set($options.minimized)),
         resizing: propertyStore(writableUIOptions, 'resizing')
      };

      Object.freeze(storeUIState);

      // Initialize the store with options set in the Application constructor.
      this.#storeUIState = storeUIState;
   }

   /**
    * Registers local store subscriptions for app options. `popOut` controls registering this app with `ui.windows`.
    * `zIndex` controls the z-index style of the element root.
    *
    * @see SvelteApplication._injectHTML
    */
   #storesSubscribe()
   {
      // Register local subscriptions.

      // Handles updating header buttons to add / remove the close button.
      this.#storeUnsubscribe.push(subscribeIgnoreFirst(this.#storeAppOptions.headerButtonNoClose, (value) =>
      {
         this.updateHeaderButtons({ headerButtonNoClose: value });
      }));

      // Handles updating header buttons to add / remove button labels.
      this.#storeUnsubscribe.push(subscribeIgnoreFirst(this.#storeAppOptions.headerButtonNoLabel, (value) =>
      {
         this.updateHeaderButtons({ headerButtonNoLabel: value });
      }));

      // Handles adding / removing this application from `ui.windows` when popOut changes.
      this.#storeUnsubscribe.push(subscribeIgnoreFirst(this.#storeAppOptions.popOut, (value) =>
      {
         if (value && this.#application.rendered)
         {
            globalThis.ui.windows[this.#application.appId] = this.#application;
         }
         else
         {
            delete globalThis.ui.windows[this.#application.appId];
         }
      }));
   }

   /**
    * Unsubscribes from any locally monitored stores.
    *
    * @see SvelteApplication.close
    */
   #storesUnsubscribe()
   {
      this.#storeUnsubscribe.forEach((unsubscribe) => unsubscribe());
      this.#storeUnsubscribe = [];
   }

   /**
    * Updates the UI Options store with the current header buttons. You may dynamically add / remove header buttons
    * if using an application shell Svelte component. In either overriding `_getHeaderButtons` or responding to the
    * Hooks fired return a new button array and the uiOptions store is updated and the application shell will render
    * the new buttons.
    *
    * Optionally you can set in the Foundry app options `headerButtonNoClose` to remove the close button and
    * `headerButtonNoLabel` to true and labels will be removed from the header buttons.
    *
    * @param {object} opts - Optional parameters (for internal use)
    *
    * @param {boolean} opts.headerButtonNoClose - The value for `headerButtonNoClose`.
    *
    * @param {boolean} opts.headerButtonNoLabel - The value for `headerButtonNoLabel`.
    */
   updateHeaderButtons({ headerButtonNoClose = this.#application.options.headerButtonNoClose,
    headerButtonNoLabel = this.#application.options.headerButtonNoLabel } = {})
   {
      let buttons = this.#application._getHeaderButtons();

      // Remove close button if this.options.headerButtonNoClose is true;
      if (typeof headerButtonNoClose === 'boolean' && headerButtonNoClose)
      {
         buttons = buttons.filter((button) => button.class !== 'close');
      }

      // Remove labels if this.options.headerButtonNoLabel is true;
      if (typeof headerButtonNoLabel === 'boolean' && headerButtonNoLabel)
      {
         for (const button of buttons) { button.label = void 0; }
      }

      this.#storeUIStateUpdate((options) =>
      {
         options.headerButtons = buttons;
         return options;
      });
   }
}

// import { Position }           from '@typhonjs-fvtt/runtime/svelte/store';

/**
 * Provides a Svelte aware extension to Application to control the app lifecycle appropriately. You can declaratively
 * load one or more components from `defaultOptions`.
 */
class SvelteApplication extends Application
{
   /**
    * Stores the first mounted component which follows the application shell contract.
    *
    * @type {MountedAppShell[]|null[]} Application shell.
    */
   #applicationShellHolder = [null];

   /**
    * Stores and manages application state for saving / restoring / serializing.
    *
    * @type {ApplicationState}
    */
   #applicationState;

   /**
    * Stores the target element which may not necessarily be the main element.
    *
    * @type {HTMLElement}
    */
   #elementTarget = null;

   /**
    * Stores the content element which is set for application shells.
    *
    * @type {HTMLElement}
    */
   #elementContent = null;

   /**
    * Stores initial z-index from `_renderOuter` to set to target element / Svelte component.
    *
    * @type {number}
    */
   #initialZIndex = 95;

   /**
    * Stores on mount state which is checked in _render to trigger onSvelteMount callback.
    *
    * @type {boolean}
    */
   #onMount = false;

   /**
    * The position store.
    *
    * @type {Position}
    */
   #position;

   /**
    * Contains the Svelte stores and reactive accessors.
    *
    * @type {SvelteReactive}
    */
   #reactive;

   /**
    * Stores SvelteData entries with instantiated Svelte components.
    *
    * @type {SvelteData[]}
    */
   #svelteData = [];

   /**
    * Provides a helper class that combines multiple methods for interacting with the mounted components tracked in
    * {@link SvelteData}.
    *
    * @type {GetSvelteData}
    */
   #getSvelteData = new GetSvelteData(this.#applicationShellHolder, this.#svelteData);

   /**
    * Contains methods to interact with the Svelte stores.
    *
    * @type {SvelteStores}
    */
   #stores;

   /**
    * @inheritDoc
    */
   constructor(options = {})
   {
      super(options);

      this.#applicationState = new ApplicationState(this);

      // Initialize Position with the position object set by Application.
      this.#position = new Position(this, {
         ...this.position,
         ...this.options,
         initial: this.options.positionInitial,
         ortho: this.options.positionOrtho,
         validator: this.options.positionValidator
      });

      // Remove old position field.
      delete this.position;

      /**
       * Define accessors to retrieve Position by `this.position`.
       *
       * @member {Position} position - Adds accessors to SvelteApplication to get / set the position data.
       *
       * @memberof SvelteApplication#
       */
      Object.defineProperty(this, 'position', {
         get: () => this.#position,
         set: (position) => { if (typeof position === 'object') { this.#position.set(position); } }
      });

      this.#reactive = new SvelteReactive(this);

      this.#stores = this.#reactive.initialize();
   }

   /**
    * Specifies the default options that SvelteApplication supports.
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions()
   {
      return deepMerge(super.defaultOptions, {
         defaultCloseAnimation: true,     // If false the default slide close animation is not run.
         draggable: true,                 // If true then application shells are draggable.
         headerButtonNoClose: false,      // If true then the close header button is removed.
         headerButtonNoLabel: false,      // If true then header button labels are removed for application shells.
         headerNoTitleMinimized: false,   // If true then header title is hidden when application is minimized.
         minHeight: MIN_WINDOW_HEIGHT,    // Assigned to position. Number specifying minimum window height.
         minWidth: MIN_WINDOW_WIDTH,      // Assigned to position. Number specifying minimum window width.
         positionable: true,              // If false then `position.set` does not take effect.
         positionInitial: Position.Initial.browserCentered,      // A helper for initial position placement.
         positionOrtho: true,             // When true Position is optimized for orthographic use.
         positionValidator: Position.Validators.transformWindow, // A function providing the default validator.
         sessionStorage: void 0,          // An instance of SessionStorage to share across SvelteApplications.
         transformOrigin: 'top left'      // By default, 'top / left' respects rotation when minimizing.
      });
   }

   /**
    * Returns the content element if an application shell is mounted.
    *
    * @returns {HTMLElement} Content element.
    */
   get elementContent() { return this.#elementContent; }

   /**
    * Returns the target element or main element if no target defined.
    *
    * @returns {HTMLElement} Target element.
    */
   get elementTarget() { return this.#elementTarget; }

   /**
    * Returns the reactive accessors & Svelte stores for SvelteApplication.
    *
    * @returns {SvelteReactive} The reactive accessors & Svelte stores.
    */
   get reactive() { return this.#reactive; }

   /**
    * Returns the application state manager.
    *
    * @returns {ApplicationState} The application state manager.
    */
   get state() { return this.#applicationState; }

   /**
    * Returns the Svelte helper class w/ various methods to access mounted Svelte components.
    *
    * @returns {GetSvelteData} GetSvelteData
    */
   get svelte() { return this.#getSvelteData; }

   /**
    * In this case of when a template is defined in app options `html` references the inner HTML / template. However,
    * to activate classic v1 tabs for a Svelte component the element target is passed as an array simulating JQuery as
    * the element is retrieved immediately and the core listeners use standard DOM queries.
    *
    * @inheritDoc
    * @protected
    * @ignore
    */
   _activateCoreListeners(html)
   {
      super._activateCoreListeners(typeof this.options.template === 'string' ? html : [this.#elementTarget]);
   }

   /**
    * Provide an override to set this application as the active window regardless of z-index. Changes behaviour from
    * Foundry core. This is important / used for instance in dialog key handling for left / right button selection.
    *
    * @param {object} [opts] - Optional parameters.
    *
    * @param {boolean} [opts.force=false] - Force bring to top; will increment z-index by popOut order.
    *
    */
   bringToTop({ force = false } = {})
   {
      if (force || this.popOut) { super.bringToTop(); }

      // If the activeElement is not `document.body` and not contained in this app via elementTarget then blur the
      // current active element and make `document.body`focused. This allows <esc> key to close all open apps / windows.
      if (document.activeElement !== document.body && !this.elementTarget.contains(document.activeElement))
      {
         // Blur current active element.
         if (document.activeElement instanceof HTMLElement) { document.activeElement.blur(); }

         // Make document body focused.
         document.body.focus();
      }

      globalThis.ui.activeWindow = this;
   }

   /**
    * Note: This method is fully overridden and duplicated as Svelte components need to be destroyed manually and the
    * best visual result is to destroy them after the default slide up animation occurs, but before the element
    * is removed from the DOM.
    *
    * If you destroy the Svelte components before the slide up animation the Svelte elements are removed immediately
    * from the DOM. The purpose of overriding ensures the slide up animation is always completed before
    * the Svelte components are destroyed and then the element is removed from the DOM.
    *
    * Close the application and un-register references to it within UI mappings.
    * This function returns a Promise which resolves once the window closing animation concludes
    *
    * @param {object}   [options] - Optional parameters.
    *
    * @param {boolean}  [options.force] - Force close regardless of render state.
    *
    * @returns {Promise<void>}    A Promise which resolves once the application is closed.
    * @ignore
    */
   async close(options = {})
   {
      const states = Application.RENDER_STATES;
      if (!options.force && ![states.RENDERED, states.ERROR].includes(this._state)) { return; }

      // Unsubscribe from any local stores.
      this.#stores.unsubscribe();

      /**
       * @ignore
       */
      this._state = states.CLOSING;

      /**
       * Get the element.
       *
       * @type {HTMLElement}
       */
      const el = this.#elementTarget;
      if (!el) { return this._state = states.CLOSED; }

      // Make any window content overflow hidden to avoid any scrollbars appearing in default or Svelte outro
      // transitions.
      const content = el.querySelector('.window-content');
      if (content)
      {
         content.style.overflow = 'hidden';

         // Set all children of content to overflow hidden as if there is going to be additional scrolling elements
         // they are likely one level deep.
         for (let cntr = content.children.length; --cntr >= 0;)
         {
            content.children[cntr].style.overflow = 'hidden';
         }
      }

      // Dispatch Hooks for closing the base and subclass applications
      for (const cls of this.constructor._getInheritanceChain())
      {
         /**
          * A hook event that fires whenever this Application is closed.
          *
          * @param {Application} app                     The Application instance being closed
          *
          * @param {jQuery[]} html                       The application HTML when it is closed
          *
          * @function closeApplication
          *
          * @memberof hookEvents
          */
         Hooks.call(`close${cls.name}`, this, el);
      }

      // If options `defaultCloseAnimation` is false then do not execute the standard slide up animation.
      // This allows Svelte components to provide any out transition. Application shells will automatically set
      // `defaultCloseAnimation` based on any out transition set or unset.
      const animate = typeof this.options.defaultCloseAnimation === 'boolean' ? this.options.defaultCloseAnimation :
       true;

      if (animate)
      {
         // Set min height for full slide.
         el.style.minHeight = '0';

         const { paddingBottom, paddingTop } = globalThis.getComputedStyle(el);

         // Slide-up application.
         await el.animate([
            { maxHeight: `${el.clientHeight}px`, paddingTop, paddingBottom },
            { maxHeight: 0, paddingTop: 0, paddingBottom: 0 }
         ], { duration: 250, easing: 'ease-in', fill: 'forwards' }).finished;
      }

      // Stores the Promises returned from running outro transitions and destroying each Svelte component.
      const svelteDestroyPromises = [];

      // Manually invoke the destroy callbacks for all Svelte components.
      for (const entry of this.#svelteData)
      {
         // Use `outroAndDestroy` to run outro transitions before destroying.
         svelteDestroyPromises.push(outroAndDestroy(entry.component));

         // If any proxy eventbus has been added then remove all event registrations from the component.
         const eventbus = entry.config.eventbus;
         if (typeof eventbus === 'object' && typeof eventbus.off === 'function')
         {
            eventbus.off();
            entry.config.eventbus = void 0;
         }
      }

      // Await all Svelte components to destroy.
      await Promise.all(svelteDestroyPromises);

      // Reset SvelteData like this to maintain reference to GetSvelteData / `this.svelte`.
      this.#svelteData.length = 0;

      // Remove element from the DOM. Most SvelteComponents have already removed it.
      el.remove();

      // Silently restore any width / height state before minimized as applicable.
      this.position.state.restore({
         name: '#beforeMinimized',
         properties: ['width', 'height'],
         silent: true,
         remove: true
      });

      // Clean up data
      this.#applicationShellHolder[0] = null;
      /**
       * @ignore
       */
      this._element = null;
      this.#elementContent = null;
      this.#elementTarget = null;
      delete globalThis.ui.windows[this.appId];
      /**
       * @ignore
       */
      this._minimized = false;
      /**
       * @ignore
       */
      this._scrollPositions = null;
      this._state = states.CLOSED;

      this.#onMount = false;

      // Update the minimized UI store options.
      this.#stores.uiOptionsUpdate((storeOptions) => deepMerge(storeOptions, { minimized: this._minimized }));
   }

   /**
    * Inject the Svelte components defined in `this.options.svelte`. The Svelte component can attach to the existing
    * pop-out of Application or provide no template and render into a document fragment which is then attached to the
    * DOM.
    *
    * @param {JQuery} html -
    *
    * @inheritDoc
    * @ignore
    */
   _injectHTML(html)
   {
      if (this.popOut && html.length === 0 && Array.isArray(this.options.svelte))
      {
         throw new Error(
          'SvelteApplication - _injectHTML - A popout app with no template can only support one Svelte component.');
      }

      // Make sure the store is updated with the latest header buttons. Also allows filtering buttons before display.
      this.reactive.updateHeaderButtons();

      // Create a function to generate a callback for Svelte components to invoke to update the tracked elements for
      // application shells in the rare cases that the main element root changes. The update is only trigged on
      // successive changes of `elementRoot`. Returns a boolean to indicate the element roots are updated.
      const elementRootUpdate = () =>
      {
         let cntr = 0;

         return (elementRoot) =>
         {
            if (elementRoot !== null && elementRoot !== void 0 && cntr++ > 0)
            {
               this.#updateApplicationShell();
               return true;
            }

            return false;
         };
      };

      if (Array.isArray(this.options.svelte))
      {
         for (const svelteConfig of this.options.svelte)
         {
            const svelteData = loadSvelteConfig({
               app: this,
               template: html[0],
               config: svelteConfig,
               elementRootUpdate
            });

            if (isApplicationShell(svelteData.component))
            {
               if (this.svelte.applicationShell !== null)
               {
                  throw new Error(
                   `SvelteApplication - _injectHTML - An application shell is already mounted; offending config:
                    ${JSON.stringify(svelteConfig)}`);
               }

               this.#applicationShellHolder[0] = svelteData.component;

               // If Vite / HMR / svelte_hmr is enabled then add a hook to receive callbacks when the ProxyComponent
               // refreshes. Update the element root accordingly and force an update to Position.
               // See this issue for info about `on_hmr`:
               // https://github.com/sveltejs/svelte-hmr/issues/57
               if (isHMRProxy(svelteData.component) && Array.isArray(svelteData.component?.$$?.on_hmr))
               {
                  svelteData.component.$$.on_hmr.push(() => () => this.#updateApplicationShell());
               }
            }

            this.#svelteData.push(svelteData);
         }
      }
      else if (typeof this.options.svelte === 'object')
      {
         const svelteData = loadSvelteConfig({
            app: this,
            template: html[0],
            config: this.options.svelte,
            elementRootUpdate
         });

         if (isApplicationShell(svelteData.component))
         {
            // A sanity check as shouldn't hit this case as only one component is being mounted.
            if (this.svelte.applicationShell !== null)
            {
               throw new Error(
                `SvelteApplication - _injectHTML - An application shell is already mounted; offending config:
                 ${JSON.stringify(this.options.svelte)}`);
            }

            this.#applicationShellHolder[0] = svelteData.component;

            // If Vite / HMR / svelte_hmr is enabled then add a hook to receive callbacks when the ProxyComponent
            // refreshes. Update the element root accordingly and force an update to Position.
            // See this issue for info about `on_hmr`:
            // https://github.com/sveltejs/svelte-hmr/issues/57
            if (isHMRProxy(svelteData.component) && Array.isArray(svelteData.component?.$$?.on_hmr))
            {
               svelteData.component.$$.on_hmr.push(() => () => this.#updateApplicationShell());
            }
         }

         this.#svelteData.push(svelteData);
      }

      // Detect if this is a synthesized DocumentFragment.
      const isDocumentFragment = html.length && html[0] instanceof DocumentFragment;

      // If any of the Svelte components mounted directly targets an HTMLElement then do not inject HTML.
      let injectHTML = true;
      for (const svelteData of this.#svelteData)
      {
         if (!svelteData.injectHTML) { injectHTML = false; break; }
      }
      if (injectHTML) { super._injectHTML(html); }

      if (this.svelte.applicationShell !== null)
      {
         this._element = $(this.svelte.applicationShell.elementRoot);

         // Detect if the application shell exports an `elementContent` accessor.
         this.#elementContent = hasGetter(this.svelte.applicationShell, 'elementContent') ?
          this.svelte.applicationShell.elementContent : null;

         // Detect if the application shell exports an `elementTarget` accessor.
         this.#elementTarget = hasGetter(this.svelte.applicationShell, 'elementTarget') ?
          this.svelte.applicationShell.elementTarget : null;
      }
      else if (isDocumentFragment) // Set the element of the app to the first child element in order of Svelte components mounted.
      {
         for (const svelteData of this.#svelteData)
         {
            if (svelteData.element instanceof HTMLElement)
            {
               this._element = $(svelteData.element);
               break;
            }
         }
      }

      // Potentially retrieve a specific target element if `selectorTarget` is defined otherwise make the target the
      // main element.
      if (this.#elementTarget === null)
      {
         const element = typeof this.options.selectorTarget === 'string' ?
          this._element.find(this.options.selectorTarget) : this._element;

         this.#elementTarget = element[0];
      }

      // TODO VERIFY THIS CHECK ESPECIALLY `this.#elementTarget.length === 0`.
      if (this.#elementTarget === null || this.#elementTarget === void 0 || this.#elementTarget.length === 0)
      {
         throw new Error(`SvelteApplication - _injectHTML: Target element '${this.options.selectorTarget}' not found.`);
      }

      // The initial zIndex may be set in application options or for popOut applications is stored by `_renderOuter`
      // in `this.#initialZIndex`.
      if (typeof this.options.positionable === 'boolean' && this.options.positionable)
      {
         this.#elementTarget.style.zIndex = typeof this.options.zIndex === 'number' ? this.options.zIndex :
          this.#initialZIndex ?? 95;
      }

      // Subscribe to local store handling.
      this.#stores.subscribe();
   }

   /**
    * Provides a mechanism to update the UI options store for maximized.
    *
    * Note: the sanity check is duplicated from {@link Application.maximize} the store is updated _before_
    * performing the rest of animations. This allows application shells to remove / show any resize handlers
    * correctly. Extra constraint data is stored in a saved position state in {@link SvelteApplication.minimize}
    * to animate the content area.
    *
    * @param {object}   [opts] - Optional parameters.
    *
    * @param {boolean}  [opts.animate=true] - When true perform default maximizing animation.
    *
    * @param {number}   [opts.duration=0.1] - Controls content area animation duration in seconds.
    */
   async maximize({ animate = true, duration = 0.1 } = {})
   {
      if (!this.popOut || [false, null].includes(this._minimized)) { return; }

      this._minimized = null;

      const durationMS = duration * 1000; // For WAAPI.

      // Get content
      const element = this.elementTarget;
      const header = element.querySelector('.window-header');
      const content = element.querySelector('.window-content');

      // Get the complete position before minimized. Used to reset min width & height to initial values later.
      const positionBefore = this.position.state.get({ name: '#beforeMinimized' });

      // First animate / restore width / async.
      if (animate)
      {
         await this.position.state.restore({
            name: '#beforeMinimized',
            async: true,
            animateTo: true,
            properties: ['width'],
            duration: 0.1
         });
      }

      // Reset display none on all children of header.
      for (let cntr = header.children.length; --cntr >= 0;) { header.children[cntr].style.display = null; }

      content.style.display = null;

      let constraints;

      if (animate)
      {
         // Next animate / restore height synchronously and remove key. Retrieve constraints data for slide up animation
         // below.
         ({ constraints } = this.position.state.restore({
            name: '#beforeMinimized',
            animateTo: true,
            properties: ['height'],
            remove: true,
            duration
         }));
      }
      else
      {
         ({ constraints } = this.position.state.remove({ name: '#beforeMinimized' }));
      }

      // Slide down content with stored constraints.
      await content.animate([
         { maxHeight: 0, paddingTop: 0, paddingBottom: 0, offset: 0 },
         { ...constraints, offset: 1 },
         { maxHeight: '100%', offset: 1 },
      ], { duration: durationMS, fill: 'forwards' }).finished; // WAAPI in ms.

      // Restore previous min width & height from saved data, app options, or default Foundry values.
      this.position.set({
         minHeight: positionBefore.minHeight ?? this.options?.minHeight ?? MIN_WINDOW_HEIGHT,
         minWidth: positionBefore.minWidth ?? this.options?.minWidth ?? MIN_WINDOW_WIDTH,
      });

      // Remove inline styles that override any styles assigned to the app.
      element.style.minWidth = null;
      element.style.minHeight = null;

      element.classList.remove('minimized');

      this._minimized = false;

      // Using a 50ms timeout prevents any instantaneous display of scrollbars with the above maximize animation.
      setTimeout(() =>
      {
         content.style.overflow = null;

         // Reset all children of content removing overflow hidden.
         for (let cntr = content.children.length; --cntr >= 0;)
         {
            content.children[cntr].style.overflow = null;
         }
      }, 50);

      this.#stores.uiOptionsUpdate((options) => deepMerge(options, { minimized: false }));
   }

   /**
    * Provides a mechanism to update the UI options store for minimized.
    *
    * Note: the sanity check is duplicated from {@link Application.minimize} the store is updated _before_
    * performing the rest of animations. This allows application shells to remove / show any resize handlers
    * correctly. Extra constraint data is stored in a saved position state in {@link SvelteApplication.minimize}
    * to animate the content area.
    *
    * @param {object}   [opts] - Optional parameters
    *
    * @param {boolean}  [opts.animate=true] - When true perform default minimizing animation.
    *
    * @param {number}   [opts.duration=0.1] - Controls content area animation duration in seconds.
    */
   async minimize({ animate = true, duration = 0.1 } = {})
   {
      if (!this.rendered || !this.popOut || [true, null].includes(this._minimized)) { return; }

      this.#stores.uiOptionsUpdate((options) => deepMerge(options, { minimized: true }));

      this._minimized = null;

      const durationMS = duration * 1000; // For WAAPI.

      const element = this.elementTarget;

      // Get content
      const header = element.querySelector('.window-header');
      const content = element.querySelector('.window-content');

      // Save current max / min height & width.
      const beforeMinWidth = this.position.minWidth;
      const beforeMinHeight = this.position.minHeight;

      // Set minimized min width & height for header bar.
      this.position.set({ minWidth: 100, minHeight: 30 });

      // Also set inline styles to override any styles scoped to the app.
      element.style.minWidth = '100px';
      element.style.minHeight = '30px';

      if (content)
      {
         content.style.overflow = 'hidden';

         // Set all children of content to overflow hidden as if there is going to be additional scrolling elements
         // they are likely one level deep.
         for (let cntr = content.children.length; --cntr >= 0;)
         {
            content.children[cntr].style.overflow = 'hidden';
         }
      }

      const { paddingBottom, paddingTop } = globalThis.getComputedStyle(content);

      // Extra data that is saved with the current position. Used during `maximize`.
      const constraints = {
         maxHeight: `${content.clientHeight}px`,
         paddingTop,
         paddingBottom
      };

      // Slide-up content
      if (animate)
      {
         const animation = content.animate([
            constraints,
            { maxHeight: 0, paddingTop: 0, paddingBottom: 0 }
         ], { duration: durationMS, fill: 'forwards' }); // WAAPI in ms.

         // Set display style to none when animation finishes.
         animation.finished.then(() => content.style.display = 'none');
      }
      else
      {
         setTimeout(() => content.style.display = 'none', durationMS);
      }

      // Save current position state and add the constraint data to use in `maximize`.
      const saved = this.position.state.save({ name: '#beforeMinimized', constraints });

      // Set the initial before min width & height.
      saved.minWidth = beforeMinWidth;
      saved.minHeight = beforeMinHeight;

      const headerOffsetHeight = header.offsetHeight;

      // minHeight needs to be adjusted to header height.
      this.position.minHeight = headerOffsetHeight;

      if (animate)
      {
         // First await animation of height upward.
         await this.position.animate.to({ height: headerOffsetHeight }, { duration }).finished;
      }

      // Set all header buttons besides close and the window title to display none.
      for (let cntr = header.children.length; --cntr >= 0;)
      {
         const className = header.children[cntr].className;

         if (className.includes('window-title') || className.includes('close')) { continue; }

         // v10+ of Foundry core styles automatically hides anything besides the window title and close button, so
         // explicitly set display to block.
         if (className.includes('keep-minimized'))
         {
            header.children[cntr].style.display = 'block';
            continue;
         }

         header.children[cntr].style.display = 'none';
      }

      if (animate)
      {
         // Await animation of width to the left / minimum width.
         await this.position.animate.to({ width: MIN_WINDOW_WIDTH }, { duration: 0.1 }).finished;
      }

      element.classList.add('minimized');

      this._minimized = true;
   }

   /**
    * Provides a callback after all Svelte components are initialized.
    *
    * @param {object}      [opts] - Optional parameters.
    *
    * @param {HTMLElement} [opts.element] - HTMLElement container for main application element.
    *
    * @param {HTMLElement} [opts.elementContent] - HTMLElement container for content area of application shells.
    *
    * @param {HTMLElement} [opts.elementTarget] - HTMLElement container for main application target element.
    */
   onSvelteMount({ element, elementContent, elementTarget } = {}) {} // eslint-disable-line no-unused-vars

   /**
    * Provides a callback after the main application shell is remounted. This may occur during HMR / hot module
    * replacement or directly invoked from the `elementRootUpdate` callback passed to the application shell component
    * context.
    *
    * @param {object}      [opts] - Optional parameters.
    *
    * @param {HTMLElement} [opts.element] - HTMLElement container for main application element.
    *
    * @param {HTMLElement} [opts.elementContent] - HTMLElement container for content area of application shells.
    *
    * @param {HTMLElement} [opts.elementTarget] - HTMLElement container for main application target element.
    */
   onSvelteRemount({ element, elementContent, elementTarget } = {}) {} // eslint-disable-line no-unused-vars

   /**
    * Override replacing HTML as Svelte components control the rendering process. Only potentially change the outer
    * application frame / title for pop-out applications.
    *
    * @inheritDoc
    * @ignore
    */
   _replaceHTML(element, html)  // eslint-disable-line no-unused-vars
   {
      if (!element.length) { return; }

      this.reactive.updateHeaderButtons();
   }

   /**
    * Provides an override verifying that a new Application being rendered for the first time doesn't have a
    * corresponding DOM element already loaded. This is a check that only occurs when `this._state` is
    * `Application.RENDER_STATES.NONE`. It is useful in particular when SvelteApplication has a static ID
    * explicitly set in `this.options.id` and long intro / outro transitions are assigned. If a new application
    * sharing this static ID attempts to open / render for the first time while an existing DOM element sharing
    * this static ID exists then the initial render is cancelled below rather than crashing later in the render
    * cycle {@link Position.set}.
    *
    * @inheritDoc
    * @protected
    * @ignore
    */
   async _render(force = false, options = {})
   {
      if (this._state === Application.RENDER_STATES.NONE &&
       document.querySelector(`#${this.id}`) instanceof HTMLElement)
      {
         console.warn(`SvelteApplication - _render: A DOM element already exists for CSS ID '${this.id
         }'. Cancelling initial render for new application with appId '${this.appId}'.`);

         return;
      }

      await super._render(force, options);

      if (!this.#onMount)
      {
         this.onSvelteMount({ element: this._element[0], elementContent: this.#elementContent, elementTarget:
          this.#elementTarget });

         this.#onMount = true;
      }
   }

   /**
    * Render the inner application content. Only render a template if one is defined otherwise provide an empty
    * JQuery element per the core Foundry API.
    *
    * @param {Object} data         The data used to render the inner template
    *
    * @returns {Promise.<JQuery>}   A promise resolving to the constructed jQuery object
    *
    * @protected
    * @ignore
    */
   async _renderInner(data)
   {
      const html = typeof this.template === 'string' ? await renderTemplate(this.template, data) :
       document.createDocumentFragment();

      return $(html);
   }

   /**
    * Stores the initial z-index set in `_renderOuter` which is used in `_injectHTML` to set the target element
    * z-index after the Svelte component is mounted.
    *
    * @returns {Promise<JQuery>} Outer frame / unused.
    * @protected
    * @ignore
    */
   async _renderOuter()
   {
      const html = await super._renderOuter();
      this.#initialZIndex = html[0].style.zIndex;
      return html;
   }

   /**
    * All calculation and updates of position are implemented in {@link Position.set}. This allows position to be fully
    * reactive and in control of updating inline styles for the application.
    *
    * This method remains for backward compatibility with Foundry. If you have a custom override quite likely you need
    * to update to using the {@link Position.validators} functionality.
    *
    * @param {PositionDataExtended}   [position] - Position data.
    *
    * @returns {Position} The updated position object for the application containing the new values
    */
   setPosition(position)
   {
      return this.position.set(position);
   }

   /**
    * This method is invoked by the `elementRootUpdate` callback that is added to the external context passed to
    * Svelte components. When invoked it updates the local element roots tracked by SvelteApplication.
    *
    * This method may also be invoked by HMR / hot module replacement via `svelte-hmr`.
    */
   #updateApplicationShell()
   {
      const applicationShell = this.svelte.applicationShell;

      if (applicationShell !== null)
      {
         this._element = $(applicationShell.elementRoot);

         // Detect if the application shell exports an `elementContent` accessor.
         this.#elementContent = hasGetter(applicationShell, 'elementContent') ?
          applicationShell.elementContent : null;

         // Detect if the application shell exports an `elementTarget` accessor.
         this.#elementTarget = hasGetter(applicationShell, 'elementTarget') ?
          applicationShell.elementTarget : null;

         if (this.#elementTarget === null)
         {
            const element = typeof this.options.selectorTarget === 'string' ?
             this._element.find(this.options.selectorTarget) : this._element;

            this.#elementTarget = element[0];
         }

         // The initial zIndex may be set in application options or for popOut applications is stored by `_renderOuter`
         // in `this.#initialZIndex`.
         if (typeof this.options.positionable === 'boolean' && this.options.positionable)
         {
            this.#elementTarget.style.zIndex = typeof this.options.zIndex === 'number' ? this.options.zIndex :
             this.#initialZIndex ?? 95;

            super.bringToTop();

            // Ensure that new root element has inline position styles set.
            this.position.set(this.position.get());
         }

         super._activateCoreListeners([this.#elementTarget]);

         this.onSvelteRemount({ element: this._element[0], elementContent: this.#elementContent, elementTarget:
          this.#elementTarget });
      }
   }
}

/**
 * @typedef {object} SvelteData
 *
 * @property {object}                           config -
 *
 * @property {import('svelte').SvelteComponent} component -
 *
 * @property {HTMLElement}                      element -
 *
 * @property {boolean}                          injectHTML -
 */

/**
 * @typedef {object} SvelteStores
 *
 * @property {import('svelte/store').Writable.update} appOptionsUpdate - Update function for app options store.
 *
 * @property {Function} subscribe - Subscribes to local stores.
 *
 * @property {import('svelte/store').Writable.update} uiOptionsUpdate - Update function for UI options store.
 *
 * @property {Function} unsubscribe - Unsubscribes from local stores.
 */

const s_STYLE_KEY$1 = '#__tjs-root-styles';

const cssVariables$1 = new StyleManager({ docKey: s_STYLE_KEY$1 });

// Below is the static ResizeObserverManager ------------------------------------------------------------------------

const s_MAP = new Map();

/**
 * Defines the various shape / update type of the given target.
 *
 * @type {Record<string, number>}
 */
const s_UPDATE_TYPES = {
   none: 0,
   attribute: 1,
   function: 2,
   resizeObserved: 3,
   setContentBounds: 4,
   setDimension: 5,
   storeObject: 6,
   storesObject: 7
};

new ResizeObserver((entries) =>
{
   for (const entry of entries)
   {
      const subscribers = s_MAP.get(entry?.target);

      if (Array.isArray(subscribers))
      {
         const contentWidth = entry.contentRect.width;
         const contentHeight = entry.contentRect.height;

         for (const subscriber of subscribers)
         {
            s_UPDATE_SUBSCRIBER(subscriber, contentWidth, contentHeight);
         }
      }
   }
});

/**
 * Updates a subscriber target with given content width & height values. Offset width & height is calculated from
 * the content values + cached styles.
 *
 * @param {object}            subscriber - Internal data about subscriber.
 *
 * @param {number|undefined}  contentWidth - ResizeObserver contentRect.width value or undefined.
 *
 * @param {number|undefined}  contentHeight - ResizeObserver contentRect.height value or undefined.
 */
function s_UPDATE_SUBSCRIBER(subscriber, contentWidth, contentHeight)
{
   const styles = subscriber.styles;

   subscriber.contentWidth = contentWidth;
   subscriber.contentHeight = contentHeight;

   const offsetWidth = Number.isFinite(contentWidth) ? contentWidth + styles.additionalWidth : void 0;
   const offsetHeight = Number.isFinite(contentHeight) ? contentHeight + styles.additionalHeight : void 0;

   const target = subscriber.target;

   switch (subscriber.updateType)
   {
      case s_UPDATE_TYPES.attribute:
         target.contentWidth = contentWidth;
         target.contentHeight = contentHeight;
         target.offsetWidth = offsetWidth;
         target.offsetHeight = offsetHeight;
         break;

      case s_UPDATE_TYPES.function:
         target?.(offsetWidth, offsetHeight, contentWidth, contentHeight);
         break;

      case s_UPDATE_TYPES.resizeObserved:
         target.resizeObserved?.(offsetWidth, offsetHeight, contentWidth, contentHeight);
         break;

      case s_UPDATE_TYPES.setContentBounds:
         target.setContentBounds?.(contentWidth, contentHeight);
         break;

      case s_UPDATE_TYPES.setDimension:
         target.setDimension?.(offsetWidth, offsetHeight);
         break;

      case s_UPDATE_TYPES.storeObject:
         target.resizeObserved.update((object) =>
         {
            object.contentHeight = contentHeight;
            object.contentWidth = contentWidth;
            object.offsetHeight = offsetHeight;
            object.offsetWidth = offsetWidth;

            return object;
         });
         break;

      case s_UPDATE_TYPES.storesObject:
         target.stores.resizeObserved.update((object) =>
         {
            object.contentHeight = contentHeight;
            object.contentWidth = contentWidth;
            object.offsetHeight = offsetHeight;
            object.offsetWidth = offsetWidth;

            return object;
         });
         break;
   }
}

/**
 * Provides an action to blur the element when any pointer down event occurs outside the element. This can be useful
 * for input elements including select to blur / unfocus the element when any pointer down occurs outside the element.
 *
 * @param {HTMLElement}   node - The node to handle automatic blur on focus loss.
 *
 * @returns {{destroy: Function}} Lifecycle functions.
 */
function autoBlur(node)
{
   /**
    * Removes listener on blur.
    */
   function onBlur() { document.body.removeEventListener('pointerdown', onPointerDown); }

   /**
    * Adds listener on focus.
    */
   function onFocus() { document.body.addEventListener('pointerdown', onPointerDown); }

   /**
    * Blur the node if a pointer down event happens outside the node.
    *
    * @param {PointerEvent} event -
    */
   function onPointerDown(event)
   {
      if (event.target === node || node.contains(event.target)) { return; }

      if (document.activeElement === node) { node.blur(); }
   }

   node.addEventListener('blur', onBlur);
   node.addEventListener('focus', onFocus);

   return {
      destroy: () =>
      {
         document.body.removeEventListener('pointerdown', onPointerDown);
         node.removeEventListener('blur', onBlur);
         node.removeEventListener('focus', onFocus);
      }
   };
}

/**
 * Provides an action to monitor focus state of a given element and set an associated store with current focus state.
 *
 * This action is usable with any writable store. 
 *
 * @param {HTMLElement} node - Target element.
 *
 * @param {import('svelte/store').Writable<boolean>}  storeFocused - Update store for focus changes.
 *
 * @returns {{update: update, destroy: (function(): void)}} Action lifecycle methods.
 */
function isFocused(node, storeFocused)
{
   let localFocused = false;

   function setFocused(current)
   {
      localFocused = current;

      if (isWritableStore(storeFocused)) { storeFocused.set(localFocused); }
   }

   function onFocus()
   {
      setFocused(true);
   }

   function onBlur()
   {
      setFocused(false);
   }

   function activateListeners()
   {
      node.addEventListener('focus', onFocus);
      node.addEventListener('blur', onBlur);
   }

   function removeListeners()
   {
      node.removeEventListener('focus', onFocus);
      node.removeEventListener('blur', onBlur);
   }

   activateListeners();

   return {
      update: (newStoreFocused) =>  // eslint-disable-line no-shadow
      {
         storeFocused = newStoreFocused;
         setFocused(localFocused);
      },

      destroy: () => removeListeners()
   };
}

/**
 * Provides an action to forward on key down & up events. This can be any object that has associated `keydown` and
 * `keyup` methods. See {@link KeyStore} for a store implementation.
 *
 * @param {HTMLElement} node - Target element.
 *
 * @param {{keydown: Function, keyup: Function}}   keyStore - Object to forward events key down / up events to...
 *
 * @returns {{update: update, destroy: (function(): void)}} Action lifecycle methods.
 */
function keyforward(node, keyStore)
{

   if (typeof keyStore?.keydown !== 'function' || typeof keyStore.keyup !== 'function')
   {
      throw new TypeError(`'keyStore' doesn't have required 'keydown' or 'keyup' methods.`);
   }

   /**
    * @param {KeyboardEvent} event -
    */
   function onKeydown(event)
   {
      keyStore.keydown(event);
   }

   /**
    * @param {KeyboardEvent} event -
    */
   function onKeyup(event)
   {
      keyStore.keyup(event);
   }

   function activateListeners()
   {
      node.addEventListener('keydown', onKeydown);
      node.addEventListener('keyup', onKeyup);
   }

   function removeListeners()
   {
      node.removeEventListener('keydown', onKeydown);
      node.removeEventListener('keyup', onKeyup);
   }

   activateListeners();

   return {
      update: (newKeyStore) =>  // eslint-disable-line no-shadow
      {
         keyStore = newKeyStore;

         if (typeof keyStore?.keydown !== 'function' || typeof keyStore.keyup !== 'function')
         {
            throw new TypeError(`'newKeyStore' doesn't have required 'keydown' or 'keyup' methods.`);
         }
      },

      destroy: () => removeListeners()
   };
}

/**
 * Provides an action to apply style properties provided as an object.
 *
 * @param {HTMLElement} node - Target element
 *
 * @param {object}      properties - Key / value object of properties to set.
 *
 * @returns {Function} Update function.
 */
function applyStyles(node, properties)
{
   /** Sets properties on node. */
   function setProperties()
   {
      if (typeof properties !== 'object') { return; }

      for (const prop of Object.keys(properties))
      {
         node.style.setProperty(`${prop}`, properties[prop]);
      }
   }

   setProperties();

   return {
      update(newProperties)
      {
         properties = newProperties;
         setProperties();
      }
   };
}

/**
 * A helper to create a set of radio checkbox input elements in a named set.
 * The provided keys are the possible radio values while the provided values are human readable labels.
 *
 * @param {string} name         The radio checkbox field name
 *
 * @param {object} choices      A mapping of radio checkbox values to human readable labels
 *
 * @param {object} options      Options which customize the radio boxes creation
 *
 * @param {string} options.checked    Which key is currently checked?
 *
 * @param {boolean} options.localize  Pass each label through string localization?
 *
 * @returns {string} HTML for radio boxes.
 *
 * @example <caption>The provided input data</caption>
 * let groupName = "importantChoice";
 * let choices = {a: "Choice A", b: "Choice B"};
 * let chosen = "a";
 *
 * @example <caption>The template HTML structure</caption>
 * <div class="form-group">
 *   <label>Radio Group Label</label>
 *   <div class="form-fields">
 *     {@html radioBoxes(groupName, choices, { checked: chosen, localize: true})}
 *   </div>
 * </div>
 */

/**
 * Localize a string including variable formatting for input arguments. Provide a string ID which defines the localized
 * template. Variables can be included in the template enclosed in braces and will be substituted using those named
 * keys.
 *
 * @param {string}   stringId - The string ID to translate.
 *
 * @param {object}   [data] - Provided input data.
 *
 * @returns {string} The translated and formatted string
 */
function localize(stringId, data)
{
   const result = typeof data !== 'object' ? globalThis.game.i18n.localize(stringId) :
    globalThis.game.i18n.format(stringId, data);

   return result !== void 0 ? result : '';
}

/**
 * @typedef {object} TransformData
 *
 * @property {Function} transition - A transition applying to both in & out.
 *
 * @property {Function} inTransition - A transition applying to in.
 *
 * @property {Function} outTransition - A transition applying to out.
 *
 * @property {object}   transitionOptions - The options config object for in & out transitions.
 *
 * @property {object}   inTransitionOptions - The options config object for in transitions.
 *
 * @property {object}   outTransitionOptions - The options config object for out transitions.
 */

/**
 * Provides default CSS variables for core components.
 */
cssVariables$1.setProperties({
   // Anchor text shadow / header buttons
   '--tjs-anchor-text-shadow-focus-hover': '0 0 8px var(--color-shadow-primary)',

   // TJSApplicationShell app background.
   '--tjs-app-background': `url("${globalThis.foundry.utils.getRoute('/ui/denim075.png')}")`,
}, false);

// Handle `PopOut!` module hooks to allow applications to popout to their own browser window -------------------------

Hooks.on('PopOut:loading', (app) =>
{
   if (app instanceof SvelteApplication) { app.position.enabled = false; }
});

Hooks.on('PopOut:popin', (app) =>
{
   if (app instanceof SvelteApplication) { app.position.enabled = true; }
});

Hooks.on('PopOut:close', (app) =>
{
   if (app instanceof SvelteApplication) { app.position.enabled = true; }
});

/**
 * @typedef {object} MountedAppShell - Application shell contract for Svelte components.
 *
 * @property {HTMLElement} elementRoot - The root element / exported prop.
 *
 * @property {HTMLElement} [elementContent] - The content element / exported prop.
 *
 * @property {HTMLElement} [elementTarget] - The target element / exported prop.
 */

/**
 * @typedef {object} StoreAppOptions - Provides a custom readable Svelte store for Application options state.
 *
 * @property {import('svelte/store').Readable.subscribe} subscribe - Subscribe to all app options updates.
 *
 * @property {import('svelte/store').Readable<boolean>} draggable - Derived store for `draggable` updates.
 *
 * @property {import('svelte/store').Readable<boolean>} minimizable - Derived store for `minimizable` updates.
 *
 * @property {import('svelte/store').Readable<boolean>} popOut - Derived store for `popOut` updates.
 *
 * @property {import('svelte/store').Readable<boolean>} resizable - Derived store for `resizable` updates.
 *
 * @property {import('svelte/store').Readable<string>} title - Derived store for `title` updates.
 *
 * @property {import('svelte/store').Readable<number>} zIndex - Derived store for `zIndex` updates.
 */

/**
 * @typedef {object} StoreUIOptions - Provides a custom readable Svelte store for UI options state.
 *
 * @property {import('svelte/store').Readable.subscribe} subscribe - Subscribe to all UI options updates.
 *
 * @property {import('svelte/store').Readable<ApplicationHeaderButton[]>} headerButtons - Derived store for
 *                                                                                        `headerButtons` updates.
 *
 * @property {import('svelte/store').Readable<boolean>} minimized - Derived store for `minimized` updates.
 */

const s_STYLE_KEY = '#__tjs-root-styles';

const cssVariables = new StyleManager({ docKey: s_STYLE_KEY });

/**
 * Parses the core Foundry style sheet creating an indexed object of properties by selector.
 */
class FoundryStyles
{
   static #sheet = void 0;

   static #sheetMap = new Map();

   static #initialized = false;

   /**
    * Called once on initialization / first usage. Parses the core foundry style sheet.
    */
   static #initialize()
   {
      this.#initialized = true;

      const styleSheets = Array.from(document.styleSheets).filter((sheet) => sheet.href !== null);

      let sheet;

      const foundryStyleSheet = globalThis.foundry.utils.getRoute('/css/style.css');

      // Find the core Foundry stylesheet.
      for (const styleSheet of styleSheets)
      {
         let url;

         try { url = new URL(styleSheet.href); } catch (err) { continue; }

         if (typeof url.pathname === 'string' && url.pathname === foundryStyleSheet)
         {
            this.#sheet = sheet = styleSheet;
            break;
         }
      }

      // Quit now if the Foundry style sheet was not found.
      if (!sheet) { return; }

      // Parse each CSSStyleRule and build the map of selectors to parsed properties.
      for (const rule of sheet.cssRules)
      {
         if (!(rule instanceof CSSStyleRule)) { continue; }

         const obj = {};

         // Parse `cssText` into an object of properties & values.
         for (const entry of rule.style.cssText.split(';'))
         {
            const parts = entry.split(':');

            // Sanity check.
            if (parts.length < 2) { continue; }

            obj[parts[0].trim()] = parts[1].trim();
         }

         this.#sheetMap.set(rule.selectorText, obj);
      }
   }

   /**
    * Gets the properties object associated with the selector. Try and use a direct match otherwise all keys
    * are iterated to find a selector string that includes the `selector`.
    *
    * @param {string}   selector - Selector to find.
    *
    * @returns {Object<string, string>} Properties object.
    */
   static getProperties(selector)
   {
      if (!this.#initialized) { this.#initialize(); }

      // If there is a direct selector match then return a value immediately.
      if (this.#sheetMap.has(selector))
      {
         return this.#sheetMap.get(selector);
      }

      for (const key of this.#sheetMap.keys())
      {
         if (key.includes(selector)) { return this.#sheetMap.get(key); }
      }

      return void 0;
   }

   /**
    * Gets a specific property value from the given `selector` and `property` key. Try and use a direct selector
    * match otherwise all keys are iterated to find a selector string that includes `selector`.
    *
    * @param {string}   selector - Selector to find.
    *
    * @param {string}   property - Specific property to locate.
    *
    * @returns {string|undefined} Property value.
    */
   static getProperty(selector, property)
   {
      if (!this.#initialized) { this.#initialize(); }

      // If there is a direct selector match then return a value immediately.
      if (this.#sheetMap.has(selector))
      {
         const data = this.#sheetMap.get(selector);
         return typeof data === 'object' && property in data ? data[property] : void 0;
      }

      for (const key of this.#sheetMap.keys())
      {
         if (key.includes(selector))
         {
            const data = this.#sheetMap.get(key);
            if (typeof data === 'object' && property in data) { return data[property]; }
         }
      }

      return void 0;
   }
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\button\TJSIconButton.svelte generated by Svelte v3.55.0-cq */

function create_fragment$o(ctx) {
	let div;
	let a;
	let i;
	let i_class_value;
	let a_title_value;
	let applyStyles_action;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			a = element("a");
			i = element("i");
			attr(i, "class", i_class_value = "" + (null_to_empty(/*icon*/ ctx[0]) + " svelte-16px1w4"));
			attr(a, "role", "button");
			attr(a, "tabindex", "0");
			attr(a, "title", a_title_value = localize(/*title*/ ctx[1]));
			attr(a, "class", "svelte-16px1w4");
			attr(div, "class", "tjs-icon-button svelte-16px1w4");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, a);
			append(a, i);

			if (!mounted) {
				dispose = [
					listen(a, "click", /*onClick*/ ctx[4]),
					listen(a, "contextmenu", /*onContextMenu*/ ctx[5]),
					listen(a, "keydown", /*onKeydown*/ ctx[6]),
					listen(a, "keyup", /*onKeyup*/ ctx[7]),
					listen(a, "click", /*click_handler*/ ctx[13]),
					listen(a, "contextmenu", /*contextmenu_handler*/ ctx[14]),
					action_destroyer(/*efx*/ ctx[3].call(null, a)),
					action_destroyer(applyStyles_action = applyStyles.call(null, div, /*styles*/ ctx[2]))
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*icon*/ 1 && i_class_value !== (i_class_value = "" + (null_to_empty(/*icon*/ ctx[0]) + " svelte-16px1w4"))) {
				attr(i, "class", i_class_value);
			}

			if (dirty & /*title*/ 2 && a_title_value !== (a_title_value = localize(/*title*/ ctx[1]))) {
				attr(a, "title", a_title_value);
			}

			if (applyStyles_action && is_function(applyStyles_action.update) && dirty & /*styles*/ 4) applyStyles_action.update.call(null, /*styles*/ ctx[2]);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$o($$self, $$props, $$invalidate) {
	let { button = void 0 } = $$props;
	let { icon = void 0 } = $$props;
	let { title = void 0 } = $$props;
	let { styles = void 0 } = $$props;
	let { efx = void 0 } = $$props;
	let { keyCode = void 0 } = $$props;
	let { onPress = void 0 } = $$props;
	let { onContextClick = void 0 } = $$props;
	let { onClickPropagate = void 0 } = $$props;
	const dispatch = createEventDispatcher();

	/**
 * Handle click event.
 *
 * @param {MouseEvent}    event -
 */
	function onClick(event) {
		if (typeof onPress === 'function') {
			onPress();
		}

		dispatch('press');

		if (!onClickPropagate) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
 * @param {MouseEvent}   event -
 */
	function onContextMenu(event) {
		if (typeof onContextClick === 'function') {
			onContextClick();
		}

		if (!onClickPropagate) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
 * Consume / stop propagation of key down when key codes match.
 *
 * @param {KeyboardEvent}    event -
 */
	function onKeydown(event) {
		if (event.code === keyCode) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
 * Handle press event if key codes match.
 *
 * @param {KeyboardEvent}    event -
 */
	function onKeyup(event) {
		if (event.code === keyCode) {
			if (typeof onPress === 'function') {
				onPress();
			}

			dispatch('press');
			event.preventDefault();
			event.stopPropagation();
		}
	}

	function click_handler(event) {
		bubble.call(this, $$self, event);
	}

	function contextmenu_handler(event) {
		bubble.call(this, $$self, event);
	}

	$$self.$$set = $$props => {
		if ('button' in $$props) $$invalidate(12, button = $$props.button);
		if ('icon' in $$props) $$invalidate(0, icon = $$props.icon);
		if ('title' in $$props) $$invalidate(1, title = $$props.title);
		if ('styles' in $$props) $$invalidate(2, styles = $$props.styles);
		if ('efx' in $$props) $$invalidate(3, efx = $$props.efx);
		if ('keyCode' in $$props) $$invalidate(8, keyCode = $$props.keyCode);
		if ('onPress' in $$props) $$invalidate(9, onPress = $$props.onPress);
		if ('onContextClick' in $$props) $$invalidate(10, onContextClick = $$props.onContextClick);
		if ('onClickPropagate' in $$props) $$invalidate(11, onClickPropagate = $$props.onClickPropagate);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*button, icon*/ 4097) {
			$$invalidate(0, icon = isObject(button) && typeof button.icon === 'string'
			? button.icon
			: typeof icon === 'string' ? icon : '');
		}

		if ($$self.$$.dirty & /*button, title*/ 4098) {
			$$invalidate(1, title = isObject(button) && typeof button.title === 'string'
			? button.title
			: typeof title === 'string' ? title : '');
		}

		if ($$self.$$.dirty & /*button, styles*/ 4100) {
			$$invalidate(2, styles = isObject(button) && typeof button.styles === 'object'
			? button.styles
			: typeof styles === 'object' ? styles : void 0);
		}

		if ($$self.$$.dirty & /*button, efx*/ 4104) {
			$$invalidate(3, efx = isObject(button) && typeof button.efx === 'function'
			? button.efx
			: typeof efx === 'function'
				? efx
				: () => {
						
					});
		}

		if ($$self.$$.dirty & /*button, keyCode*/ 4352) {
			$$invalidate(8, keyCode = isObject(button) && typeof button.keyCode === 'string'
			? button.keyCode
			: typeof keyCode === 'string' ? keyCode : 'Enter');
		}

		if ($$self.$$.dirty & /*button, onPress*/ 4608) {
			$$invalidate(9, onPress = isObject(button) && typeof button.onPress === 'function'
			? button.onPress
			: typeof onPress === 'function' ? onPress : void 0);
		}

		if ($$self.$$.dirty & /*button, onContextClick*/ 5120) {
			$$invalidate(10, onContextClick = isObject(button) && typeof button.onContextClick === 'function'
			? button.onContextClick
			: typeof onContextClick === 'function'
				? onContextClick
				: void 0);
		}

		if ($$self.$$.dirty & /*button, onClickPropagate*/ 6144) {
			$$invalidate(11, onClickPropagate = isObject(button) && typeof button.onClickPropagate === 'boolean'
			? button.onClickPropagate
			: typeof onClickPropagate === 'boolean'
				? onClickPropagate
				: false);
		}
	};

	return [
		icon,
		title,
		styles,
		efx,
		onClick,
		onContextMenu,
		onKeydown,
		onKeyup,
		keyCode,
		onPress,
		onContextClick,
		onClickPropagate,
		button,
		click_handler,
		contextmenu_handler
	];
}

class TJSIconButton extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$o, create_fragment$o, safe_not_equal, {
			button: 12,
			icon: 0,
			title: 1,
			styles: 2,
			efx: 3,
			keyCode: 8,
			onPress: 9,
			onContextClick: 10,
			onClickPropagate: 11
		});
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\button\TJSToggleIconButton.svelte generated by Svelte v3.55.0-cq */

function create_if_block$8(ctx) {
	let current;
	const default_slot_template = /*#slots*/ ctx[23].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[22], null);

	return {
		c() {
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 4194304)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[22],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[22])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[22], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function create_fragment$n(ctx) {
	let div;
	let a;
	let i;
	let i_class_value;
	let a_title_value;
	let t;
	let applyStyles_action;
	let current;
	let mounted;
	let dispose;
	let if_block = /*selected*/ ctx[4] && create_if_block$8(ctx);

	return {
		c() {
			div = element("div");
			a = element("a");
			i = element("i");
			t = space();
			if (if_block) if_block.c();
			attr(i, "class", i_class_value = "" + (null_to_empty(/*icon*/ ctx[0]) + " svelte-1uoyagd"));
			toggle_class(i, "selected", /*selected*/ ctx[4]);
			attr(a, "role", "button");
			attr(a, "tabindex", "0");
			attr(a, "title", a_title_value = localize(/*titleCurrent*/ ctx[5]));
			attr(a, "class", "svelte-1uoyagd");
			toggle_class(a, "selected", /*selected*/ ctx[4]);
			attr(div, "class", "tjs-toggle-icon-button svelte-1uoyagd");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, a);
			append(a, i);
			append(div, t);
			if (if_block) if_block.m(div, null);
			current = true;

			if (!mounted) {
				dispose = [
					listen(a, "click", /*onClick*/ ctx[6]),
					listen(a, "contextmenu", /*onContextMenu*/ ctx[7]),
					listen(a, "keydown", /*onKeydown*/ ctx[10]),
					listen(a, "keyup", /*onKeyup*/ ctx[11]),
					listen(a, "click", /*click_handler*/ ctx[24]),
					listen(a, "contextmenu", /*contextmenu_handler*/ ctx[25]),
					action_destroyer(/*efx*/ ctx[3].call(null, a)),
					listen(div, "click", /*onClickDiv*/ ctx[8]),
					listen(div, "close", /*onCloseHandler*/ ctx[9]),
					action_destroyer(applyStyles_action = applyStyles.call(null, div, /*styles*/ ctx[2]))
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (!current || dirty & /*icon*/ 1 && i_class_value !== (i_class_value = "" + (null_to_empty(/*icon*/ ctx[0]) + " svelte-1uoyagd"))) {
				attr(i, "class", i_class_value);
			}

			if (!current || dirty & /*icon, selected*/ 17) {
				toggle_class(i, "selected", /*selected*/ ctx[4]);
			}

			if (!current || dirty & /*titleCurrent*/ 32 && a_title_value !== (a_title_value = localize(/*titleCurrent*/ ctx[5]))) {
				attr(a, "title", a_title_value);
			}

			if (!current || dirty & /*selected*/ 16) {
				toggle_class(a, "selected", /*selected*/ ctx[4]);
			}

			if (/*selected*/ ctx[4]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*selected*/ 16) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$8(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (applyStyles_action && is_function(applyStyles_action.update) && dirty & /*styles*/ 4) applyStyles_action.update.call(null, /*styles*/ ctx[2]);
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (if_block) if_block.d();
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$n($$self, $$props, $$invalidate) {
	let titleCurrent;

	let $store,
		$$unsubscribe_store = noop,
		$$subscribe_store = () => ($$unsubscribe_store(), $$unsubscribe_store = subscribe(store, $$value => $$invalidate(21, $store = $$value)), store);

	$$self.$$.on_destroy.push(() => $$unsubscribe_store());
	let { $$slots: slots = {}, $$scope } = $$props;
	let { button = void 0 } = $$props;
	let { icon = void 0 } = $$props;
	let { title = void 0 } = $$props;
	let { titleSelected = void 0 } = $$props;
	let { store = void 0 } = $$props;
	$$subscribe_store();
	let { styles = void 0 } = $$props;
	let { efx = void 0 } = $$props;
	let { keyCode = void 0 } = $$props;
	let { onPress = void 0 } = $$props;
	let { onClose = void 0 } = $$props;
	let { onContextClick = void 0 } = $$props;
	let { onClickPropagate = void 0 } = $$props;
	let { onClosePropagate = void 0 } = $$props;
	const dispatch = createEventDispatcher();
	let selected = false;

	/**
 * Handle click event.
 *
 * @param {MouseEvent}    event -
 */
	function onClick(event) {
		$$invalidate(4, selected = !selected);

		if (store) {
			store.set(selected);
		}

		if (typeof onPress === 'function') {
			onPress(selected);
		}

		dispatch('press', { selected });

		if (!onClickPropagate) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
 * @param {MouseEvent}   event -
 */
	function onContextMenu(event) {
		if (typeof onContextClick === 'function') {
			onContextClick();
		}

		if (!onClickPropagate) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
 * In this case we can't set pointer-events: none for the div due to the slotted component, so process clicks on the
 * div in respect to onClickPropagate.
 *
 * @param {MouseEvent} event -
 */
	function onClickDiv(event) {
		if (!onClickPropagate) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
 * Handles `close` event from any children elements.
 */
	function onCloseHandler(event) {
		$$invalidate(4, selected = false);

		if (store) {
			store.set(false);
		}

		if (typeof onClose === 'function') {
			onClose(selected);
		}

		if (!onClosePropagate) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
 * Consume / stop propagation of key down when key codes match.
 *
 * @param {KeyboardEvent}    event -
 */
	function onKeydown(event) {
		if (event.code === keyCode) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
 * Handle press event if key codes match.
 *
 * @param {KeyboardEvent}    event -
 */
	function onKeyup(event) {
		if (event.code === keyCode) {
			$$invalidate(4, selected = !selected);

			if (store) {
				store.set(selected);
			}

			if (typeof onPress === 'function') {
				onPress(selected);
			}

			dispatch('press', { selected });
			event.preventDefault();
			event.stopPropagation();
		}
	}

	function click_handler(event) {
		bubble.call(this, $$self, event);
	}

	function contextmenu_handler(event) {
		bubble.call(this, $$self, event);
	}

	$$self.$$set = $$props => {
		if ('button' in $$props) $$invalidate(20, button = $$props.button);
		if ('icon' in $$props) $$invalidate(0, icon = $$props.icon);
		if ('title' in $$props) $$invalidate(12, title = $$props.title);
		if ('titleSelected' in $$props) $$invalidate(13, titleSelected = $$props.titleSelected);
		if ('store' in $$props) $$subscribe_store($$invalidate(1, store = $$props.store));
		if ('styles' in $$props) $$invalidate(2, styles = $$props.styles);
		if ('efx' in $$props) $$invalidate(3, efx = $$props.efx);
		if ('keyCode' in $$props) $$invalidate(14, keyCode = $$props.keyCode);
		if ('onPress' in $$props) $$invalidate(15, onPress = $$props.onPress);
		if ('onClose' in $$props) $$invalidate(16, onClose = $$props.onClose);
		if ('onContextClick' in $$props) $$invalidate(17, onContextClick = $$props.onContextClick);
		if ('onClickPropagate' in $$props) $$invalidate(18, onClickPropagate = $$props.onClickPropagate);
		if ('onClosePropagate' in $$props) $$invalidate(19, onClosePropagate = $$props.onClosePropagate);
		if ('$$scope' in $$props) $$invalidate(22, $$scope = $$props.$$scope);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*button, icon*/ 1048577) {
			$$invalidate(0, icon = isObject(button) && typeof button.icon === 'string'
			? button.icon
			: typeof icon === 'string' ? icon : '');
		}

		if ($$self.$$.dirty & /*button, title*/ 1052672) {
			$$invalidate(12, title = isObject(button) && typeof button.title === 'string'
			? button.title
			: typeof title === 'string' ? title : '');
		}

		if ($$self.$$.dirty & /*button, titleSelected*/ 1056768) {
			$$invalidate(13, titleSelected = isObject(button) && typeof button.titleSelected === 'string'
			? button.titleSelected
			: typeof titleSelected === 'string' ? titleSelected : '');
		}

		if ($$self.$$.dirty & /*button, store*/ 1048578) {
			$$subscribe_store($$invalidate(1, store = isObject(button) && isWritableStore(button.store)
			? button.store
			: isWritableStore(store) ? store : void 0));
		}

		if ($$self.$$.dirty & /*button, styles*/ 1048580) {
			$$invalidate(2, styles = isObject(button) && typeof button.styles === 'object'
			? button.styles
			: typeof styles === 'object' ? styles : void 0);
		}

		if ($$self.$$.dirty & /*button, efx*/ 1048584) {
			$$invalidate(3, efx = isObject(button) && typeof button.efx === 'function'
			? button.efx
			: typeof efx === 'function'
				? efx
				: () => {
						
					});
		}

		if ($$self.$$.dirty & /*button, keyCode*/ 1064960) {
			$$invalidate(14, keyCode = isObject(button) && typeof button.keyCode === 'string'
			? button.keyCode
			: typeof keyCode === 'string' ? keyCode : 'Enter');
		}

		if ($$self.$$.dirty & /*button, onPress*/ 1081344) {
			$$invalidate(15, onPress = isObject(button) && typeof button.onPress === 'function'
			? button.onPress
			: typeof onPress === 'function' ? onPress : void 0);
		}

		if ($$self.$$.dirty & /*button, onClose*/ 1114112) {
			$$invalidate(16, onClose = isObject(button) && typeof button.onClose === 'function'
			? button.onClose
			: typeof onClose === 'function' ? onClose : void 0);
		}

		if ($$self.$$.dirty & /*button, onContextClick*/ 1179648) {
			$$invalidate(17, onContextClick = isObject(button) && typeof button.onContextClick === 'function'
			? button.onContextClick
			: typeof onContextClick === 'function'
				? onContextClick
				: void 0);
		}

		if ($$self.$$.dirty & /*button, onClosePropagate*/ 1572864) {
			$$invalidate(19, onClosePropagate = isObject(button) && typeof button.onClosePropagate === 'boolean'
			? button.onClosePropagate
			: typeof onClosePropagate === 'boolean'
				? onClosePropagate
				: false);
		}

		if ($$self.$$.dirty & /*button, onClickPropagate*/ 1310720) {
			$$invalidate(18, onClickPropagate = isObject(button) && typeof button.onClickPropagate === 'boolean'
			? button.onClickPropagate
			: typeof onClickPropagate === 'boolean'
				? onClickPropagate
				: false);
		}

		if ($$self.$$.dirty & /*store, $store*/ 2097154) {
			if (store) {
				$$invalidate(4, selected = $store);
			}
		}

		if ($$self.$$.dirty & /*selected, titleSelected, title*/ 12304) {
			// Chose the current title when `selected` changes; if there is no `titleSelected` fallback to `title`.
			$$invalidate(5, titleCurrent = selected && titleSelected !== '' ? titleSelected : title);
		}
	};

	return [
		icon,
		store,
		styles,
		efx,
		selected,
		titleCurrent,
		onClick,
		onContextMenu,
		onClickDiv,
		onCloseHandler,
		onKeydown,
		onKeyup,
		title,
		titleSelected,
		keyCode,
		onPress,
		onClose,
		onContextClick,
		onClickPropagate,
		onClosePropagate,
		button,
		$store,
		$$scope,
		slots,
		click_handler,
		contextmenu_handler
	];
}

class TJSToggleIconButton extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$n, create_fragment$n, safe_not_equal, {
			button: 20,
			icon: 0,
			title: 12,
			titleSelected: 13,
			store: 1,
			styles: 2,
			efx: 3,
			keyCode: 14,
			onPress: 15,
			onClose: 16,
			onContextClick: 17,
			onClickPropagate: 18,
			onClosePropagate: 19
		});
	}
}

var r={grad:.9,turn:360,rad:360/(2*Math.PI)},t=function(r){return "string"==typeof r?r.length>0:"number"==typeof r},n=function(r,t,n){return void 0===t&&(t=0),void 0===n&&(n=Math.pow(10,t)),Math.round(n*r)/n+0},o=function(r,t,n){return void 0===t&&(t=0),void 0===n&&(n=1),r>n?n:r>t?r:t},e=function(r){return (r=isFinite(r)?r%360:0)>0?r:r+360},u=function(r){return {r:o(r.r,0,255),g:o(r.g,0,255),b:o(r.b,0,255),a:o(r.a)}},a=function(r,t){return void 0===t&&(t=0),{r:n(r.r,t),g:n(r.g,t),b:n(r.b,t),a:n(r.a,3>t?3:t)}},i=/^#([0-9a-f]{3,8})$/i,s=function(r){var t=r.toString(16);return t.length<2?"0"+t:t},c=function(r){var t=r.r,n=r.g,o=r.b,e=r.a,u=Math.max(t,n,o),a=u-Math.min(t,n,o),i=a?u===t?(n-o)/a:u===n?2+(o-t)/a:4+(t-n)/a:0;return {h:60*(i<0?i+6:i),s:u?a/u*100:0,v:u/255*100,a:e}},h=function(r){var t=r.h,n=r.s,o=r.v,e=r.a;t=t/360*6,n/=100,o/=100;var u=Math.floor(t),a=o*(1-n),i=o*(1-(t-u)*n),s=o*(1-(1-t+u)*n),c=u%6;return {r:255*[o,i,a,a,s,o][c],g:255*[s,o,o,i,a,a][c],b:255*[a,a,s,o,o,i][c],a:e}},d=function(r){return {h:e(r.h),s:o(r.s,0,100),l:o(r.l,0,100),a:o(r.a)}},b=function(r,t){return void 0===t&&(t=0),{h:n(r.h,t),s:n(r.s,t),l:n(r.l,t),a:n(r.a,3>t?3:t)}},g=function(r){return h((n=(t=r).s,{h:t.h,s:(n*=((o=t.l)<50?o:100-o)/100)>0?2*n/(o+n)*100:0,v:o+n,a:t.a}));var t,n,o;},f=function(r){return {h:(t=c(r)).h,s:(e=(200-(n=t.s))*(o=t.v)/100)>0&&e<200?n*o/100/(e<=100?e:200-e)*100:0,l:e/2,a:t.a};var t,n,o,e;},v=/^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s*,\s*([+-]?\d*\.?\d+)%\s*,\s*([+-]?\d*\.?\d+)%\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,l=/^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s+([+-]?\d*\.?\d+)%\s+([+-]?\d*\.?\d+)%\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,p=/^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,m=/^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,y={string:[[function(r){var t=i.exec(r);return t?(r=t[1]).length<=4?{r:parseInt(r[0]+r[0],16),g:parseInt(r[1]+r[1],16),b:parseInt(r[2]+r[2],16),a:4===r.length?n(parseInt(r[3]+r[3],16)/255,2):1}:6===r.length||8===r.length?{r:parseInt(r.substr(0,2),16),g:parseInt(r.substr(2,2),16),b:parseInt(r.substr(4,2),16),a:8===r.length?n(parseInt(r.substr(6,2),16)/255,2):1}:null:null},"hex"],[function(r){var t=p.exec(r)||m.exec(r);return t?t[2]!==t[4]||t[4]!==t[6]?null:u({r:Number(t[1])/(t[2]?100/255:1),g:Number(t[3])/(t[4]?100/255:1),b:Number(t[5])/(t[6]?100/255:1),a:void 0===t[7]?1:Number(t[7])/(t[8]?100:1)}):null},"rgb"],[function(t){var n=v.exec(t)||l.exec(t);if(!n)return null;var o,e,u=d({h:(o=n[1],e=n[2],void 0===e&&(e="deg"),Number(o)*(r[e]||1)),s:Number(n[3]),l:Number(n[4]),a:void 0===n[5]?1:Number(n[5])/(n[6]?100:1)});return g(u)},"hsl"]],object:[[function(r){var n=r.r,o=r.g,e=r.b,a=r.a,i=void 0===a?1:a;return t(n)&&t(o)&&t(e)?u({r:Number(n),g:Number(o),b:Number(e),a:Number(i)}):null},"rgb"],[function(r){var n=r.h,o=r.s,e=r.l,u=r.a,a=void 0===u?1:u;if(!t(n)||!t(o)||!t(e))return null;var i=d({h:Number(n),s:Number(o),l:Number(e),a:Number(a)});return g(i)},"hsl"],[function(r){var n=r.h,u=r.s,a=r.v,i=r.a,s=void 0===i?1:i;if(!t(n)||!t(u)||!t(a))return null;var c=function(r){return {h:e(r.h),s:o(r.s,0,100),v:o(r.v,0,100),a:o(r.a)}}({h:Number(n),s:Number(u),v:Number(a),a:Number(s)});return h(c)},"hsv"]]},N=function(r,t){for(var n=0;n<t.length;n++){var o=t[n][0](r);if(o)return [o,t[n][1]]}return [null,void 0]},x=function(r){return "string"==typeof r?N(r.trim(),y.string):"object"==typeof r&&null!==r?N(r,y.object):[null,void 0]},I=function(r){return x(r)[1]},M=function(r,t){var n=f(r);return {h:n.h,s:o(n.s+100*t,0,100),l:n.l,a:n.a}},H=function(r){return (299*r.r+587*r.g+114*r.b)/1e3/255},$$1=function(r,t){var n=f(r);return {h:n.h,s:n.s,l:o(n.l+100*t,0,100),a:n.a}},j=function(){function r(r){this.parsed=x(r)[0],this.rgba=this.parsed||{r:0,g:0,b:0,a:1};}return r.prototype.isValid=function(){return null!==this.parsed},r.prototype.brightness=function(){return n(H(this.rgba),2)},r.prototype.isDark=function(){return H(this.rgba)<.5},r.prototype.isLight=function(){return H(this.rgba)>=.5},r.prototype.toHex=function(){return r=a(this.rgba),t=r.r,o=r.g,e=r.b,i=(u=r.a)<1?s(n(255*u)):"","#"+s(t)+s(o)+s(e)+i;var r,t,o,e,u,i;},r.prototype.toRgb=function(r){return void 0===r&&(r=0),a(this.rgba,r)},r.prototype.toRgbString=function(r){return void 0===r&&(r=0),function(r,t){void 0===t&&(t=0);var n=a(r,t),o=n.r,e=n.g,u=n.b,i=n.a;return i<1?"rgba(".concat(o,", ").concat(e,", ").concat(u,", ").concat(i,")"):"rgb(".concat(o,", ").concat(e,", ").concat(u,")")}(this.rgba,r)},r.prototype.toHsl=function(r){return void 0===r&&(r=0),b(f(this.rgba),r)},r.prototype.toHslString=function(r){return void 0===r&&(r=0),function(r,t){void 0===t&&(t=0);var n=b(f(r),t),o=n.h,e=n.s,u=n.l,a=n.a;return a<1?"hsla(".concat(o,", ").concat(e,"%, ").concat(u,"%, ").concat(a,")"):"hsl(".concat(o,", ").concat(e,"%, ").concat(u,"%)")}(this.rgba,r)},r.prototype.toHsv=function(r){return void 0===r&&(r=0),function(r,t){return void 0===t&&(t=0),{h:n(r.h,t),s:n(r.s,t),v:n(r.v,t),a:n(r.a,3>t?3:t)}}(c(this.rgba),r)},r.prototype.invert=function(){return w({r:255-(r=this.rgba).r,g:255-r.g,b:255-r.b,a:r.a});var r;},r.prototype.saturate=function(r){return void 0===r&&(r=.1),w(M(this.rgba,r))},r.prototype.desaturate=function(r){return void 0===r&&(r=.1),w(M(this.rgba,-r))},r.prototype.grayscale=function(){return w(M(this.rgba,-1))},r.prototype.lighten=function(r){return void 0===r&&(r=.1),w($$1(this.rgba,r))},r.prototype.darken=function(r){return void 0===r&&(r=.1),w($$1(this.rgba,-r))},r.prototype.rotate=function(r){return void 0===r&&(r=15),this.hue(this.hue()+r)},r.prototype.alpha=function(r){return "number"==typeof r?w({r:(t=this.rgba).r,g:t.g,b:t.b,a:r}):n(this.rgba.a,3);var t;},r.prototype.hue=function(r){var t=f(this.rgba);return "number"==typeof r?w({h:r,s:t.s,l:t.l,a:t.a}):n(t.h)},r.prototype.isEqual=function(r){return this.toHex()===w(r).toHex()},r}(),w=function(r){return r instanceof j?r:new j(r)};

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\TJSColordButton.svelte generated by Svelte v3.55.0-cq */

function create_fragment$m(ctx) {
	let div1;
	let div0;
	let div1_title_value;
	let applyStyles_action;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[15].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[14], null);

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			if (default_slot) default_slot.c();
			attr(div0, "class", "tjs-color-button-inner svelte-r2plwn");
			attr(div0, "role", "button");
			attr(div0, "tabindex", "0");
			attr(div1, "class", "tjs-color-button svelte-r2plwn");
			attr(div1, "title", div1_title_value = localize(/*title*/ ctx[0]));
			set_style(div1, "--tjs-icon-button-background", /*hslColor*/ ctx[3]);
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);

			if (default_slot) {
				default_slot.m(div0, null);
			}

			current = true;

			if (!mounted) {
				dispose = [
					listen(div0, "click", /*onClick*/ ctx[4]),
					listen(div0, "contextmenu", /*onContextMenu*/ ctx[5]),
					listen(div0, "keydown", /*onKeydown*/ ctx[6]),
					listen(div0, "keyup", /*onKeyup*/ ctx[7]),
					listen(div0, "click", /*click_handler*/ ctx[16]),
					listen(div0, "contextmenu", /*contextmenu_handler*/ ctx[17]),
					action_destroyer(/*efx*/ ctx[2].call(null, div0)),
					action_destroyer(applyStyles_action = applyStyles.call(null, div1, /*styles*/ ctx[1]))
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 16384)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[14],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[14])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[14], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*title*/ 1 && div1_title_value !== (div1_title_value = localize(/*title*/ ctx[0]))) {
				attr(div1, "title", div1_title_value);
			}

			if (applyStyles_action && is_function(applyStyles_action.update) && dirty & /*styles*/ 2) applyStyles_action.update.call(null, /*styles*/ ctx[1]);

			if (dirty & /*hslColor*/ 8) {
				set_style(div1, "--tjs-icon-button-background", /*hslColor*/ ctx[3]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$m($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let { button = void 0 } = $$props;
	let { color = void 0 } = $$props;
	let { title = void 0 } = $$props;
	let { styles = void 0 } = $$props;
	let { efx = void 0 } = $$props;
	let { keyCode = void 0 } = $$props;
	let { onPress = void 0 } = $$props;
	let { onContextClick = void 0 } = $$props;
	let { onClickPropagate = void 0 } = $$props;
	const dispatch = createEventDispatcher();
	let hslColor;

	/**
 * Handle click event.
 *
 * @param {KeyboardEvent}    event -
 */
	function onClick(event) {
		if (typeof onPress === 'function') {
			onPress(hslColor);
		}

		dispatch('press', { color: hslColor });

		if (!onClickPropagate) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
 * @param {MouseEvent}   event -
 */
	function onContextMenu(event) {
		if (typeof onContextClick === 'function') {
			onContextClick(hslColor);
		}

		if (!onClickPropagate) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
 * Consume / stop propagation of key down when key codes match.
 *
 * @param {KeyboardEvent}    event -
 */
	function onKeydown(event) {
		if (event.code === keyCode) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
 * Handle press event if key codes match.
 *
 * @param {KeyboardEvent}    event -
 */
	function onKeyup(event) {
		if (event.code === keyCode) {
			if (typeof onPress === 'function') {
				onPress(hslColor);
			}

			dispatch('press', { color: hslColor });
			event.preventDefault();
			event.stopPropagation();
		}
	}

	function click_handler(event) {
		bubble.call(this, $$self, event);
	}

	function contextmenu_handler(event) {
		bubble.call(this, $$self, event);
	}

	$$self.$$set = $$props => {
		if ('button' in $$props) $$invalidate(12, button = $$props.button);
		if ('color' in $$props) $$invalidate(13, color = $$props.color);
		if ('title' in $$props) $$invalidate(0, title = $$props.title);
		if ('styles' in $$props) $$invalidate(1, styles = $$props.styles);
		if ('efx' in $$props) $$invalidate(2, efx = $$props.efx);
		if ('keyCode' in $$props) $$invalidate(8, keyCode = $$props.keyCode);
		if ('onPress' in $$props) $$invalidate(9, onPress = $$props.onPress);
		if ('onContextClick' in $$props) $$invalidate(10, onContextClick = $$props.onContextClick);
		if ('onClickPropagate' in $$props) $$invalidate(11, onClickPropagate = $$props.onClickPropagate);
		if ('$$scope' in $$props) $$invalidate(14, $$scope = $$props.$$scope);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*button, title*/ 4097) {
			$$invalidate(0, title = isObject(button) && typeof button.title === 'string'
			? button.title
			: typeof title === 'string' ? title : '');
		}

		if ($$self.$$.dirty & /*button, styles*/ 4098) {
			$$invalidate(1, styles = isObject(button) && typeof button.styles === 'object'
			? button.styles
			: typeof styles === 'object' ? styles : void 0);
		}

		if ($$self.$$.dirty & /*button, efx*/ 4100) {
			$$invalidate(2, efx = isObject(button) && typeof button.efx === 'function'
			? button.efx
			: typeof efx === 'function'
				? efx
				: () => {
						
					});
		}

		if ($$self.$$.dirty & /*button, keyCode*/ 4352) {
			$$invalidate(8, keyCode = isObject(button) && typeof button.keyCode === 'string'
			? button.keyCode
			: typeof keyCode === 'string' ? keyCode : 'Enter');
		}

		if ($$self.$$.dirty & /*button, onPress*/ 4608) {
			$$invalidate(9, onPress = isObject(button) && typeof button.onPress === 'function'
			? button.onPress
			: typeof onPress === 'function' ? onPress : void 0);
		}

		if ($$self.$$.dirty & /*button, onContextClick*/ 5120) {
			$$invalidate(10, onContextClick = isObject(button) && typeof button.onContextClick === 'function'
			? button.onContextClick
			: typeof onContextClick === 'function'
				? onContextClick
				: void 0);
		}

		if ($$self.$$.dirty & /*button, onClickPropagate*/ 6144) {
			$$invalidate(11, onClickPropagate = isObject(button) && typeof button.onClickPropagate === 'boolean'
			? button.onClickPropagate
			: typeof onClickPropagate === 'boolean'
				? onClickPropagate
				: false);
		}

		if ($$self.$$.dirty & /*color*/ 8192) {
			{
				const colordInstance = w(color);

				$$invalidate(3, hslColor = colordInstance.isValid()
				? colordInstance.toHslString()
				: 'transparent');
			}
		}
	};

	return [
		title,
		styles,
		efx,
		hslColor,
		onClick,
		onContextMenu,
		onKeydown,
		onKeyup,
		keyCode,
		onPress,
		onContextClick,
		onClickPropagate,
		button,
		color,
		$$scope,
		slots,
		click_handler,
		contextmenu_handler
	];
}

class TJSColordButton extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$m, create_fragment$m, safe_not_equal, {
			button: 12,
			color: 13,
			title: 0,
			styles: 1,
			efx: 2,
			keyCode: 8,
			onPress: 9,
			onContextClick: 10,
			onClickPropagate: 11
		});
	}
}

/**
 * Manages the addon state instantiating external user defined addons storing the model and providing a readable store
 * of all addons for {@link AddOnPanel}.
 */
class AddOnState
{
   #addOnMap = new Map();

   #addOnArray = [];

   /**
    * @type {InternalState}
    */
   #internalState;

   /**
    * Stores the subscribers.
    *
    * @type {(function(TJSFolderData[]): void)[]}
    */
   #subscriptions = [];

   /**
    * @param {InternalState}  internalState -
    */
   constructor(internalState)
   {
      this.#internalState = internalState;
   }

   /**
    * @returns {number} Number of addons.
    */
   get size()
   {
      return this.#addOnMap.size;
   }

   /**
    * @param {string}   key - Addon ID.
    *
    * @returns {object} The model instance for any associated addon.
    */
   get(key)
   {
      return this.#addOnMap.get(key);
   }

   /**
    * @param {string}   key - Addon ID.
    *
    * @returns {boolean} Is an addon with the given ID found?
    */
   has(key)
   {
      return this.#addOnMap.has(key);
   }

   /**
    * Invoked from {@link InternalState} to update addon state.
    *
    * @param {Iterable<Function>}   addonOptions - `options.addons` iterable list of addon constructor functions.
    */
   updateOptions(addonOptions)
   {
      // Store all existing addon IDs / keys and any not maintained in the initial loop through `addOnOptions` are
      // removed.
      const removeKeys = new Set(this.#addOnMap.keys());

      for (const AddOn of addonOptions)
      {
         if (typeof AddOn?.id !== 'string')
         {
            throw new TypeError(`'options.addons' missing static 'id' accessor.`);
         }

         const hasId = this.#addOnMap.has(AddOn.id);

         if (!hasId)
         {
            try
            {
               // Add a temporary key so that addons can add buttons by ID in addon constructor.
               this.#addOnMap.set(AddOn.id, {});

               const addOnInstance = new AddOn({ internalState: this.#internalState });

               this.#addOnMap.set(AddOn.id, addOnInstance);
            }
            catch (err)
            {
               console.error(`TJSColordPicker addon error: Failed to load addon (${AddOn.id}).`, err);
               this.#addOnMap.delete(AddOn.id);
            }
         }
         else
         {
            // ID for addon maintained and removed from removeKeys
            removeKeys.delete(AddOn.id);
         }
      }

      for (const key of removeKeys)
      {
         const addon = this.#addOnMap.get(key);
         this.#addOnMap.delete(key);

         // Remove any associated buttons.
         this.#internalState.buttonState.removeById(key);

         // Invoke any destroy function allowing the addon model to cleanup / do any housekeeping.
         if (typeof addon?.destroy === 'function') { addon.destroy(); }
      }

      const duplicateSet = new Set();

      this.#addOnArray = [];

      // Create new addon array from the order of the given `options.addons` iterable removing any duplicates.
      for (const AddOn of addonOptions)
      {
         if (!duplicateSet.has(AddOn.id)) { this.#addOnArray.push(this.#addOnMap.get(AddOn.id)); }
         duplicateSet.add(AddOn.id);
      }

      this.#updateSubscribers();
   }

   // Store subscriber implementation --------------------------------------------------------------------------------

   /**
    * @param {function(TJSFolderData[]): void} handler - Callback function that is invoked on update / changes.
    *
    * @returns {(function(): void)} Unsubscribe function.
    */
   subscribe(handler)
   {
      this.#subscriptions.push(handler); // add handler to the array of subscribers

      handler(this.#addOnArray);         // call handler with current value

      // Return unsubscribe function.
      return () =>
      {
         const index = this.#subscriptions.findIndex((sub) => sub === handler);
         if (index >= 0) { this.#subscriptions.splice(index, 1); }
      };
   }

   /**
    * Updates subscribers.
    */
   #updateSubscribers()
   {
      for (let cntr = 0; cntr < this.#subscriptions.length; cntr++) { this.#subscriptions[cntr](this.#addOnArray); }
   }
}

/**
 * Manages the addon button state allowing addons to add buttons to the button bar. When addons are removed
 * {@link AddOnState} invokes {@link ButtonState.removeById}.
 */
class ButtonState
{
   #buttonList = [];

   /**
    * @type {InternalState}
    */
   #internalState;

   /**
    * Stores the subscribers.
    *
    * @type {(function(object[]): void)[]}
    */
   #subscriptions = [];

   /**
    * @param {InternalState}  internalState -
    */
   constructor(internalState)
   {
      this.#internalState = internalState;
   }

   /**
    * @returns {number} Number of addons.
    */
   get length()
   {
      return this.#buttonList.length;
   }

   /**
    * Adds a {@link TJSIconButton} or {@link TJSToggleIconButton} to the {@link ButtonBar}.
    *
    * @param {object}   button - Button data; optional `isToggle` boolean to indicate a toggle button.
    */
   add(button)
   {
      if (!isObject(button)) { throw new TypeError(`'button' is not an object.`); }

      if (typeof button.id !== 'string') { throw new TypeError(`'button.id' is not a string.`); }
      if (typeof button.icon !== 'string') { throw new TypeError(`'button.icon' is not a string.`); }
      if (typeof button.onClick !== 'function') { throw new TypeError(`'button.onClick' is not a function.`); }

      if (button.isToggle !== void 0 && typeof button.isToggle !== 'boolean')
      {
         throw new TypeError(`'button.isToggle' is not a boolean.`);
      }

      if (!this.#internalState.addOnState.has(button.id))
      {
         throw new Error(`'button.id' does not match any addon ID.`);
      }

      this.#buttonList.push(button);

      this.#updateSubscribers();
   }

   removeById(id)
   {
      let index;

      do
      {
         index = this.#buttonList.findIndex((button) => button.id === id);
         if (index >= 0) { this.#buttonList.splice(index, 1); }
      } while (index >= 0);

      this.#updateSubscribers();
   }

   // Store subscriber implementation --------------------------------------------------------------------------------

   /**
    * @param {function(object[]): void} handler - Callback function that is invoked on update / changes.
    *
    * @returns {(function(): void)} Unsubscribe function.
    */
   subscribe(handler)
   {
      this.#subscriptions.push(handler); // add handler to the array of subscribers

      handler(this.#buttonList);         // call handler with current value

      // Return unsubscribe function.
      return () =>
      {
         const index = this.#subscriptions.findIndex((sub) => sub === handler);
         if (index >= 0) { this.#subscriptions.splice(index, 1); }
      };
   }

   /**
    * Updates subscribers.
    */
   #updateSubscribers()
   {
      for (let cntr = 0; cntr < this.#subscriptions.length; cntr++) { this.#subscriptions[cntr](this.#buttonList); }
   }
}

/**
 * Defines the classic Material Design ripple effect as an action. `ripple` is a wrapper around the returned action.
 * This allows it to be easily used as a prop.
 *
 * Note: A negative one translateZ transform is applied to the added spans allowing other content to be layered on top
 * with a positive translateZ.
 *
 * Styling: There is a single CSS variable `--tjs-action-ripple-background` that can be set to control the background.
 *
 * @param {object}   [opts] - Optional parameters.
 *
 * @param {number}   [opts.duration=600] - Duration in milliseconds.
 *
 * @param {string}   [opts.background='rgba(255, 255, 255, 0.7)'] - A valid CSS background attribute.
 *
 * @param {Iterable<string>}  [opts.events=['click', 'keyup']] - DOM event to bind element to respond with the ripple
 *                                                                  effect.
 *
 * @param {string}   [opts.keyCode='Enter'] - Key code to trigger for any applicable key events.
 *
 * @param {number}   [opts.debounce=undefined] - Add a debounce to incoming events in milliseconds.
 *
 * @returns Function - Actual action.
 */
function ripple({ duration = 600, background = 'rgba(255, 255, 255, 0.7)', events = ['click', 'keyup'],
 keyCode = 'Enter', debounce: debounce$1 } = {})
{
   return (element) =>
   {
      /**
       * Creates the ripple effect.
       *
       * @param {MouseEvent|KeyboardEvent}   e -
       */
      function createRipple(e)
      {
         const elementRect = element.getBoundingClientRect();

         const diameter = Math.max(elementRect.width, elementRect.height);
         const radius = diameter / 2;

         // Find the adjusted click location relative to center or if no `clientX/Y` parameters choose center.
         const left = e.clientX ? `${e.clientX - (elementRect.left + radius)}px` : '0';
         const top = e.clientY ? `${e.clientY - (elementRect.top + radius)}px` : '0';

         const span = document.createElement('span');

         span.style.position = 'absolute';
         span.style.width = `${diameter}px`;
         span.style.height = `${diameter}px`;
         span.style.left = left;
         span.style.top = top;

         span.style.background = `var(--tjs-action-ripple-background, ${background})`;
         span.style.borderRadius = '50%';
         span.style.pointerEvents = 'none';
         span.style.transform = 'translateZ(-1px)';

         element.prepend(span);

         const animation = span.animate([
            {  // from
               transform: 'scale(.7)',
               opacity: 0.5,
               filter: 'blur(2px)'
            },
            {  // to
               transform: 'scale(4)',
               opacity: 0,
               filter: 'blur(5px)'
            }
         ],
         duration);

         animation.onfinish = () =>
         {
            if (span && span.isConnected) { span.remove(); }
         };
      }

      /**
       * Handles any key event and only triggers the ripple effect if key code matches.
       *
       * @param {KeyboardEvent}  event -
       */
      function keyHandler(event)
      {
         if (event?.code === keyCode) { createRipple(event); }
      }

      const eventFn = Number.isInteger(debounce$1) && debounce$1 > 0 ? debounce(createRipple, debounce$1) : createRipple;
      const keyEventFn = Number.isInteger(debounce$1) && debounce$1 > 0 ? debounce(keyHandler, debounce$1) : keyHandler;

      for (const event of events)
      {
         if (['keydown', 'keyup'].includes(event))
         {
            element.addEventListener(event, keyEventFn);
         }
         else
         {
            element.addEventListener(event, eventFn);
         }
      }

      return {
         destroy: () =>
         {
            for (const event of events)
            {
               if (['keydown', 'keyup'].includes(event))
               {
                  element.removeEventListener(event, keyEventFn);
               }
               else
               {
                  element.removeEventListener(event, eventFn);
               }
            }
         }
      };
   }
}

/**
 * Defines the classic Material Design ripple effect as an action that is attached to an elements focus and blur events.
 * `rippleFocus` is a wrapper around the returned action. This allows it to be easily used as a prop.
 *
 * Note: A negative one translateZ transform is applied to the added span allowing other content to be layered on top
 * with a positive translateZ.
 *
 * If providing the `selectors` option a target child element will be registered for the focus events otherwise the
 * first child is targeted with a final fallback of the element assigned to this action.
 *
 * Styling: There is a single CSS variable `--tjs-action-ripple-background-focus` that can be set to control the
 * background with a fallback to `--tjs-action-ripple-background`.
 *
 * @param {object}   [opts] - Optional parameters.
 *
 * @param {number}   [opts.duration=600] - Duration in milliseconds.
 *
 * @param {string}   [opts.background='rgba(255, 255, 255, 0.7)'] - A valid CSS background attribute.
 *
 * @param {string}   [opts.selectors] - A valid CSS selectors string.
 *
 * @returns Function - Actual action.
 */
function rippleFocus({ duration = 300, background = 'rgba(255, 255, 255, 0.7)', selectors } = {})
{
   return (element) =>
   {
      const targetEl = typeof selectors === 'string' ? element.querySelector(selectors) :
       element.firstChild instanceof HTMLElement ? element.firstChild : element;

      let span = void 0;
      let clientX = -1;
      let clientY = -1;

      function blurRipple()
      {
         // When clicking outside the browser window or to another tab `document.activeElement` remains
         // the same despite blur being invoked; IE the target element.
         if (!(span instanceof HTMLElement) || document.activeElement === targetEl)
         {
            return;
         }

         const animation = span.animate(
         [
            {  // from
               transform: 'scale(3)',
               opacity: 0.3,
            },
            {  // to
               transform: 'scale(.7)',
               opacity: 0.0,
            }
         ],
         {
            duration,
            fill: 'forwards'
         });

         animation.onfinish = () =>
         {
            clientX = clientY = -1;
            if (span && span.isConnected) { span.remove(); }
            span = void 0;
         };
      }

      function focusRipple()
      {
         // If already focused and the span exists do not create another ripple effect.
         if (span instanceof HTMLElement) { return; }

         const elementRect = element.getBoundingClientRect();

         // The order of events don't always occur with a pointer event first. In this case use the center of the
         // element as the click point. Mostly this is seen when the focused target element has a followup event off
         // the app / screen. If the next pointer down occurs on the target element the focus callback occurs before
         // pointer down in Chrome and Firefox.
         const actualX = clientX >= 0 ? clientX : elementRect.left + (elementRect.width / 2);
         const actualY = clientX >= 0 ? clientY : elementRect.top + (elementRect.height / 2);

         const diameter = Math.max(elementRect.width, elementRect.height);
         const radius = diameter / 2;
         const left = `${actualX - (elementRect.left + radius)}px`;
         const top = `${actualY - (elementRect.top + radius)}px`;

         span = document.createElement('span');

         span.style.position = 'absolute';
         span.style.width = `${diameter}px`;
         span.style.height = `${diameter}px`;
         span.style.left = left;
         span.style.top = top;

         span.style.background =
          `var(--tjs-action-ripple-background-focus, var(--tjs-action-ripple-background, ${background}))`;

         span.style.borderRadius = '50%';
         span.style.pointerEvents = 'none';
         span.style.transform = 'translateZ(-1px)';

         element.prepend(span);

         span.animate([
            {  // from
               transform: 'scale(.7)',
               opacity: 0.5,
            },
            {  // to
               transform: 'scale(3)',
               opacity: 0.3,
            }
         ],
         {
            duration,
            fill: 'forwards'
         });
      }

      // Store the pointer down location for the origination of the ripple.
      function onPointerDown(e)
      {
         clientX = e.clientX;
         clientY = e.clientY;
      }

      targetEl.addEventListener('pointerdown', onPointerDown);
      targetEl.addEventListener('blur', blurRipple);
      targetEl.addEventListener('focus', focusRipple);

      return {
         destroy: () => {
            targetEl.removeEventListener('pointerdown', onPointerDown);
            targetEl.removeEventListener('blur', blurRipple);
            targetEl.removeEventListener('focus', focusRipple);
         }
      };
   }
}

/**
 * Provides a toggle action for `details` HTML elements. The boolean store provided controls animation.
 *
 * It is not necessary to bind the store to the `open` attribute of the associated details element.
 *
 * When the action is triggered to close the details element a data attribute `closing` is set to `true`. This allows
 * any associated closing transitions to start immediately.
 *
 * @param {HTMLDetailsElement} details - The details element.
 *
 * @param {object} opts - Options parameters.
 *
 * @param {import('svelte/store').Writable<boolean>} store - A boolean store.
 *
 * @param {boolean} [clickActive] - When false click events are not handled.
 *
 * @returns {object} Destroy callback.
 */
function toggleDetails(details, { store, clickActive = true } = {})
{
   /** @type {HTMLElement} */
   const summary = details.querySelector('summary');

   /** @type {Animation} */
   let animation;

   /** @type {boolean} */
   let open = details.open;

   // The store sets initial open state and handles animation on further changes.
   const unsubscribe = subscribeFirstRest(store, (value) => { open = value; details.open = open; }, async (value) =>
   {
      open = value;

      // Await `tick` to allow any conditional logic in the template to complete updating before handling animation.
      await tick();

      handleAnimation();
   });

   /**
    * @param {number} a -
    *
    * @param {number} b -
    *
    * @param {boolean} value -
    */
   function animate(a, b, value)
   {
      details.style.overflow = 'hidden';

      // Must guard when `b - a === 0`; add a small epsilon and wrap with Math.max.
      const duration = Math.max(0, 30 * Math.log(Math.abs(b - a) + Number.EPSILON));

      animation = details.animate(
       {
          height: [`${a}px`, `${b}px`]
       },
       {
          duration,
          easing: 'ease-out'
       }
      );

      animation.onfinish = () =>
      {
         details.open = value;
         details.dataset.closing = 'false';
         details.style.overflow = '';
      };
   }

   /**
    * Handles animation coordination based on current state.
    */
   function handleAnimation()
   {
      if (open)
      {
         const a = details.offsetHeight;
         if (animation) { animation.cancel(); }
         details.open = true;
         const b = details.offsetHeight;

         animate(a, b, true);
      }
      else
      {
         const a = details.offsetHeight;
         const b = summary.offsetHeight;

         details.dataset.closing = 'true';

         animate(a, b, false);
      }
   }

   /**
    * @param {MouseEvent} e - A mouse event.
    */
   function handleClick(e)
   {
      if (clickActive)
      {
         e.preventDefault();

         // Simply set the store to the opposite of current open state and the callback above handles animation.
         store.set(!open);
      }
   }

   summary.addEventListener('click', handleClick);

   return {
      destroy()
      {
         unsubscribe();
         summary.removeEventListener('click', handleClick);
      }
   };
}

/**
 * Provides a buffered set of stores converting the current color from color state into a rounded alpha
 * value for display in the {@link TextInput} component. The alpha component store has an overridden set method that
 * validate updates from the number inputs they are assigned to keeping number ranges between `0-1`.
 * Also handling the case when the number input is `null` which occurs when the user removes all input
 * values or inputs `-` a minus character, etc. In that case `0` is substituted for `null`.
 *
 * Note: Alpha state changes do not set `#colorStateAccess.internalUpdate.textUpdate` to true.
 */
class AlphaState
{
   /** @type {number} */
   #alpha;

   /** @type {ColorStateAccess} */
   #colorStateAccess;

   /** @type {TextStateAccess} */
   #textStateAccess;

   /** @type {AlphaStateInputData} */
   #inputData;

   /** @type {AlphaStateStores} */
   #stores;

   /**
    * Stores the original writable set methods.
    *
    * @type {Function}
    */
   #storeSet;

   /**
    * @param {ColorStateAccess}  colorStateAccess -
    *
    * @param {TextStateAccess}   textStateAccess -
    */
   constructor(colorStateAccess, textStateAccess)
   {
      this.#alpha = 1;

      this.#colorStateAccess = colorStateAccess;
      this.#textStateAccess = textStateAccess;

      // Setup custom stores that swap out the writable set method invoking `#updateComponent` that after
      // validation of new component data invokes the original set method.
      const alpha = writable$1(this.#alpha);
      this.#storeSet = alpha.set;
      alpha.set = (value) => this.#updateComponent(value);

      this.#stores = { alpha };

      this.#inputData = {
         alpha: {
            store: alpha,
            efx: rippleFocus(),
            type: 'number',
            min: 0,
            max: 1,
            step: 0.01,
            options: {
               blurOnEnterKey: false,
               cancelOnEscKey: true
            },
            aria: {
               label: 'transparency channel color'
            }
         }
      };
   }

   /**
    * @returns {AlphaStateInputData} Alpha input component data.
    */
   get inputData()
   {
      return this.#inputData;
   }

   /**
    * @returns {AlphaStateStores} Alpha text state stores.
    */
   get stores()
   {
      return this.#stores;
   }

   /**
    * @param {number|null} value - An alpha component value to validate and update.
    */
   #updateComponent(value)
   {
      // Handle case when all number input is removed or invalid and value is null.
      if (value === null) { value = 1; }

      if (typeof value !== 'number') { throw new TypeError(`AlphaState 'set' error: 'value' is not a number.`); }

      // Validate that input values; (0-1).
      if (value === Number.NaN) { value = 1; }
      if (value < 0) { value = 0; }
      if (value > 1) { value = 1; }

      // Update local component value.
      this.#alpha = value;

      this.#colorStateAccess.stores.alpha.set(this.#alpha);

      // Hack to have parsed / validated value always take by setting store temporarily to null. This handles the edge
      // case of writable stores not setting the same value. IE when the value is 0 and the user backspaces the number
      // input and the corrected value is `0` again.
      this.#storeSet(null);
      this.#storeSet(value);
   }

   /**
    * Updates the internal state from changes in color state current color.
    *
    * @param {object}   color - Current color value (HSV currently).
    *
    * @package
    */
   _updateColor(color)
   {
      this.#alpha = typeof color.a === 'number' ? Math.round(color.a * 100) / 100 : 1;

      this.#storeSet(this.#alpha);
   }
}

/**
 * @typedef {object} AlphaStateInputData Provides the input data options to use in number input components.
 *
 * @property {object} alpha - Alpha input component data.
 */

/**
 * @typedef {object} AlphaStateStores Provides the buffered stores to use in number input components.
 *
 * @property {import('svelte/store').Writable<number|null>} alpha - Alpha component value.
 */

/**
 * Provides a buffered set of stores converting the current color from {@link ColorState} into a hex values for display
 * in the {@link TextInput} component. The hex store has an overridden set method that validate updates from the text
 * input assigned to it keeping ensuring that the string value is a valid hex color. A validation store `isHexValid`
 * is also available to be able to selectively set a CSS class on the input to notify users when the entered string
 * is not a valid hex color.
 */
class HexState
{
   /** @type {string} */
   #hex;

   /** @type {ColorStateAccess} */
   #colorStateAccess;

   /** @type {TextStateAccess} */
   #textStateAccess;

   /** @type {HexStateInputData} */
   #inputData;

   /** @type {HexStateStores} */
   #stores;

   /**
    * Stores the original writable set methods.
    *
    * @type {{ hex: Function }}
    */
   #storeSet = {};

   /**
    * @param {ColorStateAccess}  colorStateAccess -
    *
    * @param {TextStateAccess}   textStateAccess -
    */
   constructor(colorStateAccess, textStateAccess)
   {
      this.#hex = '#ff0000';

      this.#colorStateAccess = colorStateAccess;
      this.#textStateAccess = textStateAccess;

      // Setup custom stores that swap out the writable set method invoking `#updateComponent` that after
      // validation of new component data invokes the original set method.
      const hex = writable$1(this.#hex);
      this.#storeSet.hex = hex.set;
      hex.set = (value) => this.#updateComponent(value);

      const isHexValid = writable$1(true);
      this.#stores = { hex, isHexValid };

      this.#inputData = [
         {
            pickerLabel: 'HEX',
            store: hex,
            storeIsValid: isHexValid,
            efx: rippleFocus(),
            type: 'text',
            options: {
               blurOnEnterKey: false,
               cancelOnEscKey: true
            },
            aria: {
               label: 'hex color'
            }
         }
      ];
   }

   /**
    * @returns {boolean} Supports separate alpha channel.
    */
   get hasAlpha()
   {
      return false
   }

   /**
    * @returns {HexStateInputData} Hex input component data.
    */
   get inputData()
   {
      return this.#inputData;
   }

   /**
    * @returns {HexStateStores} Hex text state stores.
    */
   get stores()
   {
      return this.#stores;
   }

   /**
    * Returns whether all RGB components are the same value. If so when converted to HSV there is no
    * hue information, so a new hue value should not be set to maintain existing hue in the UI otherwise
    * it will be set to `0` which will always jump it to red.
    *
    * @returns {boolean} Are all RGB components the same.
    */
   #isRgbEqual(rgb)
   {
      return rgb.r === rgb.g && rgb.r === rgb.b;
   }

   /**
    * @param {string|null} value - A hex value to validate and update.
    */
   #updateComponent(value)
   {
      if (typeof value !== 'string') { value = '#'; }

      // Handle case when all number input is removed or invalid and value is null.
      if (value === '') { value = '#'; }

      // Insert a leading `#` if there is none.
      if (!value.startsWith('#')) { value = `#${value}`; }

      const colordInstance = w(value);

      if (!colordInstance.isValid())
      {
         this.#storeSet.hex(null);
         this.#storeSet.hex(value);

         this.#stores.isHexValid.set(false);
         return;
      }

      // Set the `textUpdate` flag to true so when ColorState.#updateCurrentColor executes it does not update
      // TextState.
      this.#colorStateAccess.internalUpdate.textUpdate = true;

      // Update local component value.
      this.#hex = colordInstance.toHex();

      // Update ColorState hue and sv component stores w/ parsed local hex color data.
      const newHsv = colordInstance.toHsv(5);

      // Only change 'hue' when RGB components are not equal as the RGB to HSV conversion loses current hue value when
      // RGB components are equal (IE it switches to 0 / red).
      if (!this.#isRgbEqual(colordInstance.toRgb())) { this.#colorStateAccess.stores.hue.set(newHsv.h); }

      this.#colorStateAccess.stores.sv.set({ s: newHsv.s, v: newHsv.v });

      // Set the alpha state when available as hex colors can contain alpha values.
      if (typeof newHsv.a === 'number') { this.#colorStateAccess.stores.alpha.set(newHsv.a); }

      // Hack to have parsed / validated value always take by setting store temporarily to null. This handles the edge
      // case of writable stores not setting the same value. IE when the value is '#' and the user backspaces the text
      // input and the corrected value is `#` again.
      this.#storeSet.hex(null);
      this.#storeSet.hex(value);

      // Set the isHexValid store to true as the hex color is valid.
      this.#stores.isHexValid.set(true);

      // Update all other text state modes, but exclude HexState.
      this.#textStateAccess.updateColorInternal(newHsv, 'hex');
   }

   /**
    * Updates the internal state from changes in {@link ColorState} current color.
    * Covert to a hex color for display in the TextInput component.
    *
    * @param {object}   color - Current color value (HSV currently).
    *
    * @package
    */
   _updateColor(color)
   {
      const hex = w(color).toHex();

      this.#storeSet.hex(hex);
      this.#stores.isHexValid.set(true);
   }
}

/**
 * @typedef {object[]} HexStateInputData Provides the input data options to use in text input components.
 */

/**
 * @typedef {object} HexStateStores Provides the buffered stores to use in text input components.
 *
 * @property {import('svelte/store').Writable<string|null>} hex - Hex value.
 *
 * @property {import('svelte/store').Writable<boolean>}     isHexValid - Is current entered hex string valid.
 */

/**
 * Provides a buffered set of stores converting the current color from {@link ColorState} into rounded HSL component
 * values for display in the {@link TextInput} component. These HSL component stores have an overridden set method that
 * validate updates from the number inputs they are assigned to keeping number ranges between `0-360` for hue / h and
 * s / l (0 - 100). Also handling the case when the number input is `null` which occurs when the user removes all input
 * values or inputs `-` a minus character, etc. In that case `0` is substituted for `null`.
 */
class HslState
{
   /** @type {{ h: number, s: number, l: number}} */
   #data;

   /** @type {ColorStateAccess} */
   #colorStateAccess;

   /** @type {TextStateAccess} */
   #textStateAccess;

   /** @type {HslStateInputData} */
   #inputData;

   /** @type {HslStateStores} */
   #stores;

   /**
    * Stores the original writable set methods.
    *
    * @type {{h: Function, s: Function, l: Function}}
    */
   #storeSet = {};

   /**
    * @param {ColorStateAccess}  colorStateAccess -
    *
    * @param {TextStateAccess}   textStateAccess -
    */
   constructor(colorStateAccess, textStateAccess)
   {
      this.#data = { h: 0, s: 100, l: 50 };

      this.#colorStateAccess = colorStateAccess;
      this.#textStateAccess = textStateAccess;

      // Setup custom stores that swap out the writable set method invoking `#updateComponent` that after
      // validation of new component data invokes the original set method.
      const h = writable$1(this.#data.h);
      this.#storeSet.h = h.set;
      h.set = (value) => this.#updateComponent(value, 'h');

      const s = writable$1(this.#data.s);
      this.#storeSet.s = s.set;
      s.set = (value) => this.#updateComponent(value, 's');

      const l = writable$1(this.#data.l);
      this.#storeSet.l = l.set;
      l.set = (value) => this.#updateComponent(value, 'l');

      this.#stores = { h, s, l };

      this.#inputData = [
         {
            pickerLabel: 'H',
            store: h,
            efx: rippleFocus(),
            type: 'number',
            min: 0,
            max: 360,
            options: {
               blurOnEnterKey: false,
               cancelOnEscKey: true
            },
            aria: {
               label: 'hue channel color'
            }
         },
         {
            pickerLabel: 'S',
            store: s,
            efx: rippleFocus(),
            type: 'number',
            min: 0,
            max: 100,
            options: {
               blurOnEnterKey: false,
               cancelOnEscKey: true
            },
            aria: {
               label: 'saturation channel color'
            }
         },
         {
            pickerLabel: 'L',
            store: l,
            efx: rippleFocus(),
            type: 'number',
            min: 0,
            max: 100,
            options: {
               blurOnEnterKey: false,
               cancelOnEscKey: true
            },
            aria: {
               label: 'luminance channel color'
            }
         }
      ];
   }

   /**
    * @returns {boolean} Supports separate alpha channel.
    */
   get hasAlpha()
   {
      return true;
   }

   /**
    * @returns {HslStateInputData} HSL input component data.
    */
   get inputData()
   {
      return this.#inputData;
   }

   /**
    * @returns {HslStateStores} HSV text state stores.
    */
   get stores()
   {
      return this.#stores;
   }

   /**
    * @param {number|null} value - A HSL component value to validate and update.
    *
    * @param {'h'|'s'|'l'} index - HSL component index.
    */
   #updateComponent(value, index)
   {
      // Handle case when all number input is removed or invalid and value is null.
      if (value === null) { value = 0; }

      if (typeof value !== 'number') { throw new TypeError(`HslState 'set ${index}' error: 'value' is not a number.`); }

      // Validate that input values; h (0-360) / s & l (0 - 100).
      if (value === Number.NaN) { value = 0; }
      if (value < 0) { value = 0; }

      switch (index)
      {
         case 'h':
            if (value > 360) { value = 360; }
            break;

         case 's':
         case 'l':
            if (value > 100) { value = 100; }
            break;
      }

      // Set the `textUpdate` flag to true so when ColorState.#updateCurrentColor executes it does not update
      // TextState.
      this.#colorStateAccess.internalUpdate.textUpdate = true;

      // Update local component value.
      this.#data[index] = value;

      // Update ColorState hue and sv component stores w/ parsed local HSL component data.
      const newHsv = w(this.#data).toHsv(5);

      // The colord conversion will not maintain hue when `s` or `l` is `0`.
      if (this.#data.s === 0 || this.#data.l === 0) { newHsv.h = this.#data.h; }

      // The colord conversion will covert a hue of `360` to `0` wrapping around.
      if (this.#data.h === 360) { newHsv.h = 360; }

      // Update the appropriate ColorState store.
      switch (index)
      {
         case 'h':
            this.#colorStateAccess.stores.hue.set(newHsv.h);
            break;

         case 's':
         case 'l':
            this.#colorStateAccess.stores.sv.set({ s: newHsv.s, v: newHsv.v });
            break;
      }

      // Hack to have parsed / validated value always take by setting store temporarily to null. This handles the edge
      // case of writable stores not setting the same value. IE when the value is 0 and the user backspaces the number
      // input and the corrected value is `0` again.
      this.#storeSet[index](null);
      this.#storeSet[index](value);

      // Update all other text state modes, but exclude HslState.
      this.#textStateAccess.updateColorInternal(newHsv, 'hsl');
   }

   /**
    * Updates the internal state from changes in {@link ColorState} current color.
    * Covert to HSL and round values for display in the TextInput component.
    *
    * @param {object}   color - Current color value (HSV currently).
    *
    * @package
    */
   _updateColor(color)
   {
      const hsl = w(color).toHsl();

      // The colord conversion will not maintain hue when `s` or `v` is `0`.
      if (hsl.h === 0 && hsl.s === 0) { hsl.h = color.h; }

      // The colord conversion will covert a hue of `360` to `0` wrapping around.
      if (color.h === 360) { hsl.h = 360; }

      this.#data.h = Math.round(hsl.h);
      this.#data.s = Math.round(hsl.s);
      this.#data.l = Math.round(hsl.l);

      this.#storeSet.h(this.#data.h);
      this.#storeSet.s(this.#data.s);
      this.#storeSet.l(this.#data.l);
   }
}

/**
 * @typedef {object[]} HslStateInputData Provides the input data options to use in number input components.
 */

/**
 * @typedef {object} HslStateStores Provides the buffered stores to use in text input components.
 *
 * @property {import('svelte/store').Writable<number|null>} h - Hue component value.
 *
 * @property {import('svelte/store').Writable<number|null>} s - Saturation component value.
 *
 * @property {import('svelte/store').Writable<number|null>} l - Luminance component value.
 */

/**
 * Provides a buffered set of stores converting the current color from {@link ColorState} into rounded HSV component
 * values for display in the {@link TextInput} component. These HSV component stores have an overridden set method that
 * validate updates from the number inputs they are assigned to keeping number ranges between `0-360` for hue / h and
 * s / v (0 - 100). Also handling the case when the number input is `null` which occurs when the user removes all input
 * values or inputs `-` a minus character, etc. In that case `0` is substituted for `null`.
 */
class HsvState
{
   /** @type {{ h: number, s: number, v: number}} */
   #data;

   /** @type {ColorStateAccess} */
   #colorStateAccess;

   /** @type {TextStateAccess} */
   #textStateAccess;

   /** @type {HsvStateInputData} */
   #inputData;

   /** @type {HsvStateStores} */
   #stores;

   /**
    * Stores the original writable set methods.
    *
    * @type {{h: Function, s: Function, v: Function}}
    */
   #storeSet = {};

   /**
    * @param {ColorStateAccess}  colorStateAccess -
    *
    * @param {TextStateAccess}   textStateAccess -
    */
   constructor(colorStateAccess, textStateAccess)
   {
      this.#data = { h: 0, s: 100, v: 100 };

      this.#colorStateAccess = colorStateAccess;
      this.#textStateAccess = textStateAccess;

      // Setup custom stores that swap out the writable set method invoking `#updateComponent` that after
      // validation of new component data invokes the original set method.
      const h = writable$1(this.#data.h);
      this.#storeSet.h = h.set;
      h.set = (value) => this.#updateComponent(value, 'h');

      const s = writable$1(this.#data.s);
      this.#storeSet.s = s.set;
      s.set = (value) => this.#updateComponent(value, 's');

      const v = writable$1(this.#data.v);
      this.#storeSet.v = v.set;
      v.set = (value) => this.#updateComponent(value, 'v');

      this.#stores = { h, s, v };

      this.#inputData = [
         {
            pickerLabel: 'H',
            store: h,
            efx: rippleFocus(),
            type: 'number',
            min: 0,
            max: 360,
            options: {
               blurOnEnterKey: false,
               cancelOnEscKey: true
            },
            aria: {
               label: 'hue channel color'
            }
         },
         {
            pickerLabel: 'S',
            store: s,
            efx: rippleFocus(),
            type: 'number',
            min: 0,
            max: 100,
            options: {
               blurOnEnterKey: false,
               cancelOnEscKey: true
            },
            aria: {
               label: 'saturation channel color'
            }
         },
         {
            pickerLabel: 'V',
            store: v,
            efx: rippleFocus(),
            type: 'number',
            min: 0,
            max: 100,
            options: {
               blurOnEnterKey: false,
               cancelOnEscKey: true
            },
            aria: {
               label: 'brightness channel color'
            }
         }
      ];
   }

   /**
    * @returns {boolean} Supports separate alpha channel.
    */
   get hasAlpha()
   {
      return true;
   }

   /**
    * @returns {HsvStateInputData} HSV input component data.
    */
   get inputData()
   {
      return this.#inputData;
   }

   /**
    * @returns {HsvStateStores} HSV text state stores.
    */
   get stores()
   {
      return this.#stores;
   }

   /**
    * @param {number|null} value - A HSV component value to validate and update.
    *
    * @param {'h'|'s'|'v'} index - HSV component index.
    */
   #updateComponent(value, index)
   {
      // Handle case when all number input is removed or invalid and value is null.
      if (value === null) { value = 0; }

      if (typeof value !== 'number') { throw new TypeError(`HsvState 'set ${index}' error: 'value' is not a number.`); }

      // Validate that input values; h (0-360) / s & v (0 - 100).
      if (value === Number.NaN) { value = 0; }
      if (value < 0) { value = 0; }

      switch (index)
      {
         case 'h':
            if (value > 360) { value = 360; }
            break;

         case 's':
         case 'v':
            if (value > 100) { value = 100; }
            break;
      }

      // Set the `textUpdate` flag to true so when ColorState.#updateCurrentColor executes it does not update
      // TextState.
      this.#colorStateAccess.internalUpdate.textUpdate = true;

      // Update local component value.
      this.#data[index] = value;

      // Update the appropriate ColorState store.
      switch (index)
      {
         case 'h':
            this.#colorStateAccess.stores.hue.set(this.#data.h);
            break;

         case 's':
         case 'v':
            this.#colorStateAccess.stores.sv.set({ s: this.#data.s, v: this.#data.v });
            break;
      }

      // Hack to have parsed / validated value always take by setting store temporarily to null. This handles the edge
      // case of writable stores not setting the same value. IE when the value is 0 and the user backspaces the number
      // input and the corrected value is `0` again.
      this.#storeSet[index](null);
      this.#storeSet[index](value);

      // Update all other text state modes, but exclude RgbState.
      this.#textStateAccess.updateColorInternal(this.#data, 'hsv');
   }

   /**
    * Updates the internal state from changes in {@link ColorState} current color.
    * Covert to HSV and round values for display in the TextInput component.
    *
    * @param {object}   color - Current color value (HSV currently).
    *
    * @package
    */
   _updateColor(color)
   {
      this.#data.h = Math.round(color.h);
      this.#data.s = Math.round(color.s);
      this.#data.v = Math.round(color.v);

      this.#storeSet.h(this.#data.h);
      this.#storeSet.s(this.#data.s);
      this.#storeSet.v(this.#data.v);
   }
}

/**
 * @typedef {object[]} HsvStateInputData Provides the input data options to use in number input components.
 */

/**
 * @typedef {object} HsvStateStores Provides the buffered stores to use in text input components.
 *
 * @property {import('svelte/store').Writable<number|null>} h - Hue component value.
 *
 * @property {import('svelte/store').Writable<number|null>} s - Saturation component value.
 *
 * @property {import('svelte/store').Writable<number|null>} v - Value / brightness component value.
 */

/**
 * Provides a buffered set of stores converting the current color from {@link ColorState} into rounded RGB component
 * values for display in the {@link TextInput} component. These RGB component stores have an overridden set method that
 * validate updates from the number inputs they are assigned to keeping number ranges between `0-255` and also handling
 * the case when the number input is `null` which occurs when the user removes all input values or inputs `-` a minus
 * character, etc. In that case `0` is substituted for `null`.
 */
class RgbState
{
   /** @type {{ r: number, g: number, b: number}} */
   #data;

   /** @type {ColorStateAccess} */
   #colorStateAccess;

   /** @type {TextStateAccess} */
   #textStateAccess;

   /** @type {RgbStateInputData} */
   #inputData;

   /** @type {RgbStateStores} */
   #stores;

   /**
    * Stores the original writable set methods.
    *
    * @type {{r: Function, g: Function, b: Function}}
    */
   #storeSet = {};

   /**
    * @param {ColorStateAccess}  colorStateAccess -
    *
    * @param {TextStateAccess}   textStateAccess -
    */
   constructor(colorStateAccess, textStateAccess)
   {
      this.#data = { r: 255, g: 0, b: 0 };

      this.#colorStateAccess = colorStateAccess;
      this.#textStateAccess = textStateAccess;

      // Setup custom stores that swap out the writable set method invoking `#updateComponent` that after
      // validation of new component data invokes the original set method.
      const r = writable$1(this.#data.r);
      this.#storeSet.r = r.set;
      r.set = (value) => this.#updateComponent(value, 'r');

      const g = writable$1(this.#data.g);
      this.#storeSet.g = g.set;
      g.set = (value) => this.#updateComponent(value, 'g');

      const b = writable$1(this.#data.b);
      this.#storeSet.b = b.set;
      b.set = (value) => this.#updateComponent(value, 'b');

      this.#stores = { r, g, b };

      this.#inputData = [
         {
            pickerLabel: 'R',
            store: r,
            efx: rippleFocus(),
            type: 'number',
            min: 0,
            max: 255,
            options: {
               blurOnEnterKey: false,
               cancelOnEscKey: true
            },
            aria: {
               label: 'red channel color'
            }
         },
         {
            pickerLabel: 'G',
            store: g,
            efx: rippleFocus(),
            type: 'number',
            min: 0,
            max: 255,
            options: {
               blurOnEnterKey: false,
               cancelOnEscKey: true
            },
            aria: {
               label: 'green channel color'
            }
         },
         {
            pickerLabel: 'B',
            store: b,
            efx: rippleFocus(),
            type: 'number',
            min: 0,
            max: 255,
            options: {
               blurOnEnterKey: false,
               cancelOnEscKey: true
            },
            aria: {
               label: 'blue channel color'
            }
         }
      ];
   }

   /**
    * @returns {boolean} Supports separate alpha channel.
    */
   get hasAlpha()
   {
      return true;
   }

   /**
    * @returns {RgbStateInputData} HSL input component data.
    */
   get inputData()
   {
      return this.#inputData;
   }

   /**
    * @returns {RgbStateStores} RGB text state stores.
    */
   get stores()
   {
      return this.#stores;
   }

   /**
    * Returns whether all RGB components are the same value. If so when converted to HSV there is no
    * hue information, so a new hue value should not be set to maintain existing hue in the UI otherwise
    * it will be set to `0` which will always jump it to red.
    *
    * @returns {boolean} Are all RGB components the same.
    */
   #isRgbEqual()
   {
      return this.#data.r === this.#data.g && this.#data.r === this.#data.b;
   }

   /**
    * @param {number|null} value - A RGB component value to validate and update.
    *
    * @param {'r'|'g'|'b'} index - RGB component index.
    */
   #updateComponent(value, index)
   {
      // Handle case when all number input is removed or invalid and value is null.
      if (value === null) { value = 0; }

      if (typeof value !== 'number') { throw new TypeError(`RgbState 'set ${index}' error: 'value' is not a number.`); }

      // Validate that input values are between `0 - 255`.
      if (value === Number.NaN) { value = 0; }
      if (value < 0) { value = 0; }
      if (value > 255) { value = 255; }

      // Set the `textUpdate` flag to true so when ColorState.#updateCurrentColor executes it does not update
      // TextState.
      this.#colorStateAccess.internalUpdate.textUpdate = true;

      // Update local component value.
      this.#data[index] = value;

      // Update ColorState hue and sv component stores w/ parsed local RGB component data.
      const newHsv = w(this.#data).toHsv(5);

      // Only change 'hue' when RGB components are not equal as the RGB to HSV conversion loses current hue value when
      // RGB components aare equal (IE it switches to 0 / red).
      if (!this.#isRgbEqual()) { this.#colorStateAccess.stores.hue.set(newHsv.h); }

      this.#colorStateAccess.stores.sv.set({ s: newHsv.s, v: newHsv.v });

      // Hack to have parsed / validated value always take by setting store temporarily to null. This handles the edge
      // case of writable stores not setting the same value. IE when the value is 0 and the user backspaces the number
      // input and the corrected value is `0` again.
      this.#storeSet[index](null);
      this.#storeSet[index](value);

      // Update all other text state modes, but exclude RgbState.
      this.#textStateAccess.updateColorInternal(newHsv, 'rgb');
   }

   /**
    * Updates the internal state from changes in {@link ColorState} current color.
    * Covert to RGB and round values for display in the TextInput component.
    *
    * @param {object}   color - Current color value (HSV currently).
    *
    * @package
    */
   _updateColor(color)
   {
      const rgb = w(color).toRgb();

      this.#data.r = Math.round(rgb.r);
      this.#data.g = Math.round(rgb.g);
      this.#data.b = Math.round(rgb.b);

      this.#storeSet.r(this.#data.r);
      this.#storeSet.g(this.#data.g);
      this.#storeSet.b(this.#data.b);
   }
}

/**
 * @typedef {object[]} RgbStateInputData Provides the input data options to use in number input components.
 */

/**
 * @typedef {object} RgbStateStores Provides the buffered stores to use in text input components.
 *
 * @property {import('svelte/store').Writable<number|null>} r - Red component value.
 *
 * @property {import('svelte/store').Writable<number|null>} g - Green component value.
 *
 * @property {import('svelte/store').Writable<number|null>} b - Blue component value.
 */

class ActiveTextState
{
   #activeKey;

   #activeState;

   #allState;

   #modeKeys;

   /**
    * Stores the subscribers.
    *
    * @type {(function(ActiveTextState): void)[]}
    */
   #subscriptions = [];

   constructor(allState, activeKey = 'hex')
   {
      this.#allState = allState;
      this.#modeKeys = Object.keys(allState);
      this.#activeKey = activeKey;
      this.#activeState = allState[this.#activeKey];
   }

   /**
    * @returns {object} Current active text mode configuration.
    */
   get active()
   {
      return this.#allState[this.#activeKey];
   }

   /**
    * Advances to the next color text mode.
    */
   next()
   {
      const currentIndex = this.#modeKeys.findIndex((entry) => entry === this.#activeKey);
      const newIndex = (currentIndex + 1) % this.#modeKeys.length;

      this.#activeKey = this.#modeKeys[newIndex];

      this.#updateSubscribers();
   }

   /**
    * Selects the previous color text mode.
    */
   previous()
   {
      const currentIndex = this.#modeKeys.findIndex((entry) => entry === this.#activeKey);
      const newIndex = currentIndex === 0 ? this.#modeKeys.length - 1 : currentIndex - 1;

      this.#activeKey = this.#modeKeys[newIndex];

      this.#updateSubscribers();
   }

   /**
    * Sets the active key / format for text component display.
    *
    * @param {string}   format -
    */
   setFormat(format)
   {
      if (this.#allState[format] === void 0)
      {
         throw new TypeError(`ActiveTextState setFormat error: Unknown format key (${format}).`);
      }

      this.#activeKey = format;
      this.#updateSubscribers();
   }

   // Store subscriber implementation --------------------------------------------------------------------------------

   /**
    * @param {function(ActiveTextState): void} handler - Callback function that is invoked on update / changes.
    *
    * @returns {(function(): void)} Unsubscribe function.
    */
   subscribe(handler)
   {
      this.#subscriptions.push(handler); // add handler to the array of subscribers

      handler(this.#allState[this.#activeKey]);                     // call handler with current value

      // Return unsubscribe function.
      return () =>
      {
         const index = this.#subscriptions.findIndex((sub) => sub === handler);
         if (index >= 0) { this.#subscriptions.splice(index, 1); }
      };
   }

   /**
    * Updates subscribers.
    */
   #updateSubscribers()
   {
      // for (let cntr = 0; cntr < this.#subscriptions.length; cntr++) { this.#subscriptions[cntr](this); }
      for (let cntr = 0; cntr < this.#subscriptions.length; cntr++) { this.#subscriptions[cntr](this.#allState[this.#activeKey]); }
   }
}

/**
 * Manages the text state for all supported color formats such as `rgb` and `hex` formats. The internal storage format
 * is HSV and the conversions between floating point and integer representation in the text input GUI is lossy.
 * TextState provides a store that tracks the text representations like `rgb` component values (0 - 255). Changes from
 * the text input component are converted into internal HSV representation and set the `hue` and `sv` stores setting
 * the #interalUpdate `textUpdate` flag so that {@link ColorState.#updateCurrentColor} doesn't update TextState. This
 * makes it possible to support a single internal color representation in HSV and not have independent variables for
 * each type.
 */
class TextState
{
   /** @type {{ hex: HexState, hsl: HslState, hsv: HsvState, rgb: RgbState }} */
   #allState;

   /** @type {AlphaState} */
   #alphaState;

   /**
    * Stores the subscribers.
    *
    * @type {(function(TextState): void)[]}
    */
   #subscriptions = [];

   #activeTextState;

   /**
    * @param {ColorState}                 colorState - ColorState instance.
    *
    * @param {ColorStateInternalUpdate}   internalUpdate - ColorState internal store update data.
    */
   constructor(colorState, internalUpdate)
   {
      /** @type {ColorStateAccess} */
      const colorStateAccess = {
         stores: colorState.stores,
         internalUpdate
      };

      /** @type {TextStateAccess} */
      const textStateAccess = {
         updateColorInternal: this.#updateColorInternal.bind(this)
      };

      this.#alphaState = new AlphaState(colorStateAccess, textStateAccess);

      this.#allState = {
         hex: new HexState(colorStateAccess, textStateAccess),
         hsl: new HslState(colorStateAccess, textStateAccess),
         hsv: new HsvState(colorStateAccess, textStateAccess),
         rgb: new RgbState(colorStateAccess, textStateAccess)
      };

      this.#activeTextState = new ActiveTextState(this.#allState, colorState.format);

      this.updateColor(colorState.hsv);
   }

   /**
    * @returns {ActiveTextState}
    */
   get activeState()
   {
      return this.#activeTextState;
   }

   /**
    * @returns {AlphaState}
    */
   get alpha()
   {
      return this.#alphaState;
   }

   /**
    * @returns {HexState}
    */
   get hex()
   {
      return this.#allState.hex;
   }

   /**
    * @returns {HslState}
    */
   get hsl()
   {
      return this.#allState.hsl;
   }

   /**
    * @returns {HsvState}
    */
   get hsv()
   {
      return this.#allState.hsv;
   }

   /**
    * @returns {RgbState}
    */
   get rgb()
   {
      return this.#allState.rgb;
   }

   /**
    * Updates all text state for supported formats from the given color.
    *
    * @param {object}  color - A supported ColorD color format.
    */
   updateColor(color)
   {
      this.#alphaState._updateColor(color);

      this.#allState.hex._updateColor(color);
      this.#allState.hsl._updateColor(color);
      this.#allState.hsv._updateColor(color);
      this.#allState.rgb._updateColor(color);

      this.#updateSubscribers();
   }

   /**
    * Updates active text state format when format option changes.
    *
    * @param {string} format -
    */
   updateFormat(format)
   {
      this.#activeTextState.setFormat(format);
   }

   /**
    * Provides a mechanism for the various color modes to update the other modes on changes to internal state.
    *
    * @param {object}   color - Color object from the source mode.
    *
    * @param {string}   skipMode - Mode index to skip; IE when invoked from a given mode that mode is skipped.
    */
   #updateColorInternal(color, skipMode)
   {
      for (const key in this.#allState)
      {
         if (key === skipMode) { continue; }

         this.#allState[key]._updateColor(color);
      }

      this.#updateSubscribers();
   }

   // Store subscriber implementation --------------------------------------------------------------------------------

   /**
    * @param {function(TextState): void} handler - Callback function that is invoked on update / changes.
    *
    * @returns {(function(): void)} Unsubscribe function.
    */
   subscribe(handler)
   {
      this.#subscriptions.push(handler); // add handler to the array of subscribers

      handler(this);                     // call handler with current value

      // Return unsubscribe function.
      return () =>
      {
         const index = this.#subscriptions.findIndex((sub) => sub === handler);
         if (index >= 0) { this.#subscriptions.splice(index, 1); }
      };
   }

   /**
    * Updates subscribers.
    */
   #updateSubscribers()
   {
      for (let cntr = 0; cntr < this.#subscriptions.length; cntr++) { this.#subscriptions[cntr](this); }
   }
}

/**
 * @typedef {object} ColorStateAccess
 *
 * @property {ColorStateStores} stores - The stores from {@link ColorState}.
 *
 * @property {ColorStateInternalUpdate} internalUpdate - The internal tracking state from {@link ColorState}.
 */

/**
 * @typedef {object} TextStateAccess
 *
 * @property {Function} updateColorInternal - Provides access to the #updateColorInternal method.
 */

/**
 * @typedef {object} TextStateStores
 *
 * @property {import('svelte/store').Readable<object>} activeMode - The current active text mode config object.
 */

/**
 * Provides generic color model utilities.
 */
class ColorParser
{
   /**
    * Valid CSS <angle> units.
    * https://developer.mozilla.org/en-US/docs/Web/CSS/angle
    *
    * @type {Record<string, number>}
    */
   static #ANGLE_UNITS = {
      grad: 360 / 400,
      turn: 360,
      rad: 360 / (Math.PI * 2)
   };

   /**
    * Parses the given color object or string returning the color model format and storage type.
    *
    * @param {object|string}color -
    *
    * @returns {{ format: 'hex'|'hsl'|'hsv'|'rgb', type: 'object'|'string' }|undefined} Color format data.
    */
   static getColorFormat(color)
   {
      const format = I(color);
      if (!format) { return void 0; }

      return {
         format,
         type: typeof color
      };
   }

   /**
    * Processes and clamps a degree (angle) value properly.
    * Any `NaN` or `Infinity` will be converted to `0`.
    * Examples: -1 => 359, 361 => 1
    *
    * @param {number}   degrees - Degree value to clamp
    *
    * @returns {number}
    */
   static clampHue(degrees)
   {
      degrees = isFinite(degrees) ? degrees % 360 : 0;
      return degrees > 0 ? degrees : degrees + 360;
   }

   /**
    * @param {string} value - Hue numerical component
    *
    * @param {string} [unit='deg'] - Hue unit if available.
    */
   static parseHue(value, unit = 'deg')
   {
      return Number(value) * (this.#ANGLE_UNITS[unit] ?? 1);
   }

   /**
    * @param {number} number - Number to round.
    *
    * @param {number} [digits=0] - Digit precision.
    *
    * @param {number} [base] - Base to round.
    *
    * @returns {number} Rounded number.
    */
   static round(number, digits = 0, base = Math.pow(10, digits))
   {
      return Math.round(base * number) / base;
   };
}

class ColorState
{
   /** @type {Set<string>} */
   static #supportedFormats = new Set(['hex', 'hsl', 'hsv', 'rgb']);

   /** @type {Set<string>} */
   static #supportedFormatTypes = new Set(['object', 'string']);

   /** @type {ColorStateData} */
   #data = {
      alpha: 1,
      currentColor: 'hsl(0, 100%, 50%)',
      currentColorString: 'hsl(0, 100%, 50%)',
      format: 'hsl',
      formatType: 'string',
      hue: 0,
      initialPopupColor: 'hsl(0, 100%, 50%)',
      isDark: false,
      precision: 0,
      hslString: 'hsl(0, 100%, 50%)',
      hslHueString: 'hsl(0, 100%, 50%)',
      hslaString: 'hsla(0, 100%, 50%, 1)',
      lockTextFormat: false,
      sv: { s: 100, v: 100 }
   };

   /**
    * @type {InternalState}
    */
   #internalState;

   #lastTime = Number.MIN_SAFE_INTEGER;

   /** @type {ColorStateStores} */
   #stores = {};

   /**
    * Provides access to the externally "readable" stores set methods.
    *
    * @type {Record<string, Function>}
    */
   #storeSet;

   /**
    * Store unsubscribe functions for alpha, hue, sv stores that are subscribed to internally.
    *
    * @type {Function[]}
    */
   #unsubscribe = [];

   /** @type {ColorStateInternalUpdate} */
   #internalUpdate = {
      h: void 0,
      sv: void 0,
      a: void 0,
      textUpdate: false
   };

   /**
    * Debounces {@link ColorState.#updateCurrentColor} with a 0ms delay. This is invoked by the independent alpha, hue,
    * sv stores on the internal handlers to
    *
    * @type {Function}
    */
   #updateCurrentColorDebounce;

   /**
    * @param {InternalState}           internalState -
    *
    * @param {object|string}           color -
    *
    * @param {TJSColordPickerOptions}   options -
    */
   constructor(internalState, color, options)
   {
      this.#internalState = internalState;

      this.#validateOptions(options);

      // Attempt to parse color model format & type.
      if (color !== void 0)
      {
         const colorFormat = ColorParser.getColorFormat(color);

         // Post a warning message that any initial bound color prop is invalid. The default will be set to red.
         if (!colorFormat)
         {
            console.warn(`TJSColordPicker warning - initial 'color' prop value is invalid: ${color}`);
         }
         else
         {
            this.#data.format = colorFormat.format;
            this.#data.formatType = colorFormat.type;

            const initialHsv = HsvColorParser.parseExternal(color);
            this.#updateColorData(initialHsv);
         }
      }

      // Override any parsed color format / format type above if explicitly set in initial options.
      if (typeof options.format === 'string') { this.#data.format = options.format; }
      if (typeof options.formatType === 'string') { this.#data.formatType = options.formatType; }

      // Set initial precision.
      this.#data.precision = internalState.precision;

      // 'alpha', 'hue', and 'sv' stores on subscription below invoke `#updateCurrentColor` on the next tick.
      this.#updateCurrentColorDebounce = debounce(() =>
      {
         this.#updateCurrentColor(this.#internalUpdate);
         this.#internalUpdate.h = void 0;
         this.#internalUpdate.sv = void 0;
         this.#internalUpdate.a = void 0;
         this.#internalUpdate.textUpdate = false;
      }, 0);

      // Cache externally "readable" store set methods.
      const tempStoreCurrentColor = writable$1(this.#data.currentColor);
      const tempStoreCurrentColorString = writable$1(this.#data.currentColorString);
      const tempStoreIsDark = writable$1(this.#data.isDark);
      const tempStoreHslString = writable$1(this.#data.hslString);
      const tempStoreHslHueString = writable$1(this.#data.hslHueString);
      const tempStoreHslaString = writable$1(this.#data.hslaString);

      this.#storeSet = {
         currentColor: tempStoreCurrentColor.set,
         currentColorString: tempStoreCurrentColorString.set,
         isDark: tempStoreIsDark.set,
         hslString: tempStoreHslString.set,
         hslaString: tempStoreHslaString.set,
         hslHueString: tempStoreHslHueString.set,
      };

      // Writable stores
      this.#stores.alpha = writable$1(this.#data.alpha);
      this.#stores.hue = writable$1(this.#data.hue);
      this.#stores.sv = writable$1(this.#data.sv);

      // Readable stores
      this.#stores.textState = new TextState(this, this.#internalUpdate);
      this.#stores.isDark = { subscribe: tempStoreIsDark.subscribe };
      this.#stores.hslString = { subscribe: tempStoreHslString.subscribe };
      this.#stores.hslHueString = { subscribe: tempStoreHslHueString.subscribe };
      this.#stores.hslaString = { subscribe: tempStoreHslaString.subscribe };
      this.#stores.currentColor = { subscribe: tempStoreCurrentColor.subscribe };
      this.#stores.currentColorString = { subscribe: tempStoreCurrentColorString.subscribe };

      this.#unsubscribe.push(subscribeIgnoreFirst(this.#stores.alpha, (a) =>
      {
         this.#internalUpdate.a = a;
         this.#updateCurrentColorDebounce();
      }));

      this.#unsubscribe.push(subscribeIgnoreFirst(this.#stores.hue, (h) =>
      {
         this.#internalUpdate.h = h;
         this.#updateCurrentColorDebounce();
      }));

      this.#unsubscribe.push(subscribeIgnoreFirst(this.#stores.sv, (sv) =>
      {
         this.#internalUpdate.sv = sv;
         this.#updateCurrentColorDebounce();
      }));

      // Subscribe to InternalState `hasAlpha` option to set ColorState alpha store when disabled.
      this.#unsubscribe.push(subscribeIgnoreFirst(internalState.stores.hasAlpha, (hasAlpha) =>
      {
         if (!hasAlpha) { this.#stores.alpha.set(1); }
      }));

      // Subscribe to InternalState `precision` option to set new color precision.
      this.#unsubscribe.push(subscribeIgnoreFirst(internalState.stores.precision, (precision) =>
      {
         this.#data.precision = precision;
         this.#updateCurrentColor();
      }));
   }

   /**
    * @returns {number}
    */
   get alpha()
   {
      return this.#data.alpha;
   }

   /**
    * @returns {"hex"|"hsl"|"hsv"|"rgb"}
    */
   get format()
   {
      return this.#data.format;
   }

   /**
    * @returns {"object"|"string"}
    */
   get formatType()
   {
      return this.#data.formatType;
   }

   /**
    * @returns {number}
    */
   get hue()
   {
      return this.#data.hue;
   }

   /**
    * @returns {{ h: number, s: number, v: number, a: number }} Current HSV color object.
    */
   get hsv()
   {
      return { h: this.#data.hue, s: this.#data.sv.s, v: this.#data.sv.v, a: this.#data.alpha };
   }

   /**
    * @returns {ColorStateStores}
    */
   get stores()
   {
      return this.#stores;
   }

   /**
    * @returns {{s: number, v: number}}
    */
   get sv()
   {
      return this.#data.sv;
   }

   destroy()
   {
      for (const unsubscribe of this.#unsubscribe) { unsubscribe(); }
   }

   /**
    * Gets the current color in the specific format and format type.
    *
    * @param {object}                  [opts] - Optional parameters.
    *
    * @param {'hex'|'hsl'|'hsv'|'rgb'} [opts.format='hsl'] - Format to convert to...
    *
    * @param {'object'|'string'}       [opts.formatType='string'] - Primitive type.
    *
    * @param {number}                  [opts.precision=0] - Primitive type.
    *
    * @returns {object|string} Current color.
    */
   getColor(opts)
   {
      const currentHsv = { h: this.#data.hue, s: this.#data.sv.s, v: this.#data.sv.v, a: this.#data.alpha };

      return HsvColorParser.convertColor(currentHsv, opts);
   }

   /**
    * Returns initial color when in popup mode and container is openend.
    *
    * @returns {string|Object} Initial color before popup.
    */
   getPopupColor()
   {
      return this.#data.initialPopupColor;
   }

   /**
    * Sets current color from given color data.
    *
    * @param {object|string}   color - Supported ColorD color format.
    */
   setColor(color)
   {
      let colordInstance = w(color);
      if (colordInstance.isValid())
      {
         // If alpha is disabled then reset it in case the given color is not opaque.
         if (!this.#internalState.hasAlpha) { colordInstance = colordInstance.alpha(1); }

         const newHsv = colordInstance.toHsv();

         this.#stores.hue.set(newHsv.h);
         this.#stores.sv.set({ s: newHsv.s, v: newHsv.v });
         this.#stores.alpha.set(newHsv.a);
      }
      else
      {
         console.warn('TJSColordPicker setColor warning: Invalid color; ', color);
      }
   }

   /**
    * Saves the current color when in popup mode and picker is initially opened.
    */
   savePopupColor()
   {
      this.#data.initialPopupColor = this.#data.currentColor;
   }

   /**
    * @param {object}   hsvColor -
    */
   #updateColorData(hsvColor)
   {
      this.#data.hue = hsvColor.h;
      this.#data.sv = { s: hsvColor.s, v: hsvColor.v };
      this.#data.alpha = hsvColor.a ?? 1;

      const colordInstance = w(hsvColor);

      this.#data.isDark = colordInstance.isDark();

      this.#data.hslString = HsvColorParser.convertColor({ ...hsvColor, a: 1 }, { precision: 3 });
      this.#data.hslHueString = HsvColorParser.convertColor({ h: hsvColor.h, s: 100, v: 100, a: 1 }, { precision: 3 });
      this.#data.hslaString = HsvColorParser.convertColor(hsvColor, { precision: 3 });

      // Update current color based on `format` and `formatType`
      this.#data.currentColor = HsvColorParser.convertColor(hsvColor, this.#data);

      // Update current color string based on `format` where string is defined or `hsl`.
      this.#data.currentColorString = HsvColorParser.convertColor(hsvColor, {
         format: this.#data.format === 'hsv' ? 'hsl' : this.#data.format,
         formatType: 'string',
         precision: this.#data.precision
      });
   }

   #updateCurrentColor({ h = this.#data.hue, sv = this.#data.sv, a = this.#data.alpha, textUpdate = false } = {})
   {
      const newHsv = { h, s: sv.s, v: sv.v, a };

      this.#updateColorData(newHsv);

      // Update TextState store if the update didn't come from TextState.
      if (!textUpdate) { this.#stores.textState.updateColor(newHsv); }

      this.#lastTime = globalThis.performance.now();

      this.#storeSet.currentColor(this.#data.currentColor);
      this.#storeSet.currentColorString(this.#data.currentColorString);
      this.#storeSet.isDark(this.#data.isDark);

      this.#storeSet.hslString(this.#data.hslString);
      this.#storeSet.hslHueString(this.#data.hslHueString);
      this.#storeSet.hslaString(this.#data.hslaString);
   }

   updateExternal(extColor)
   {
      if (!w(extColor).isValid())
      {
         console.warn(`TJSColordPicker warning: 'color' prop set externally is not valid; '${extColor}'.`);
         return;
      }

      const newHsv = HsvColorParser.parseExternal(extColor);

      if (w(newHsv).isEqual(this.#data.currentColor)) { return; }

      if (typeof newHsv.h === 'number') { this.#stores.hue.set(newHsv.h); }

      if (typeof newHsv.s === 'number' && typeof newHsv.v === 'number')
      {
         this.#stores.sv.set({ s: newHsv.s, v: newHsv.v });
      }

      if (typeof newHsv.a === 'number') { this.#stores.alpha.set(newHsv.a); }
   }

   /**
    * Updates options related to ColorState.
    *
    * @param {TJSColordPickerOptions}   options -
    */
   updateOptions(options)
   {
      this.#validateOptions(options);

      let updateColor = false;

      if (options.format !== void 0 && options.format !== this.#data.format)
      {
         this.#data.format = options.format;
         updateColor = true;

         // Explicitly update text mode format when format mode changes.
         this.#stores.textState.updateFormat(this.#data.format);
      }

      if (options.formatType !== void 0 && options.formatType !== this.#data.formatType)
      {
         this.#data.formatType = options.formatType;
         updateColor = true;
      }

      if (options.lockTextFormat !== void 0 && options.lockTextFormat !== this.#data.lockTextFormat)
      {
         this.#data.lockTextFormat = options.lockTextFormat;

         // When switching to locked text format state set update text state format.
         if (this.#data.lockTextFormat) { this.#stores.textState.updateFormat(this.#data.format); }
      }

      if (updateColor) { this.#updateCurrentColor(); }
   }

   /**
    * Validates external user defined options.
    *
    * @param {TJSColordPickerOptions} opts -
    */
   #validateOptions(opts)
   {
      if (opts.format !== void 0)
      {
         if (typeof opts.format !== 'string') { throw new TypeError(`'options.format' is not a string.`); }

         if (!ColorState.#supportedFormats.has(opts.format))
         {
            throw new Error(`'TJSColordPicker error: Unknown format for 'options.format' - '${opts.format}'.`);
         }
      }

      if (opts.formatType !== void 0)
      {
         if (typeof opts.formatType !== 'string') { throw new TypeError(`'options.formatType' is not a string.`); }

         if (!ColorState.#supportedFormatTypes.has(opts.formatType))
         {
            throw new Error(
             `'TJSColordPicker error: Unknown format type for 'options.formatType' - '${opts.formatType}'.`);
         }
      }
   }
}

class HsvColorParser
{
   // Functional syntax
   // hsl( <hue>, <percentage>, <percentage>, <alpha-value>? )
   static #hslaMatcherComma = /^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s*,\s*([+-]?\d*\.?\d+)%\s*,\s*([+-]?\d*\.?\d+)%\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i;

   // Whitespace syntax
   // hsl( <hue> <percentage> <percentage> [ / <alpha-value> ]? )
   static #hslaMatcherSpace = /^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s+([+-]?\d*\.?\d+)%\s+([+-]?\d*\.?\d+)%\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i;

   /**
    * Converts the internal HSV color to the given format and primitive type.
    *
    * @param {object}                  color - HSV color to convert.
    *
    * @param {object}                  [opts] - Optional parameters.
    *
    * @param {'hex'|'hsl'|'hsv'|'rgb'} [opts.format='hsl'] - Format to convert to...
    *
    * @param {'object'|'string'}       [opts.formatType='string'] - Primitive type.
    *
    * @param {number}                  [opts.precision=0] - Primitive type.
    *
    * @returns {object|string} Converted color.
    */
   static convertColor(color, { hue = color?.h, format = 'hsl', formatType = 'string',
    precision = 0 } = {})
   {
      let result;

      const colordInstance = w(color);

      if (formatType === 'object')
      {
         switch (format)
         {
            case 'hsl':
            {
               const newHsl = colordInstance.toHsl(precision);
               newHsl.h = ColorParser.round(hue, precision);
               result = newHsl;
               break;
            }

            case 'hsv':
               const newHsv = colordInstance.toHsv(precision);
               newHsv.h = ColorParser.round(hue, precision);
               result = newHsv;
               break;

            case 'rgb':
            {
               result = colordInstance.toRgb(precision);
               break;
            }
         }
      }
      else
      {
         switch (format)
         {
            case 'hex':
               result = colordInstance.toHex(precision);
               break;

            case 'hsl':
            {
               const newHsl = colordInstance.toHslString(precision);
               const hsvColor = colordInstance.toHsv();

               // The colord conversion will not maintain hue when `s` or `v` is `0`.
               // Replace hue value with rounded original hue from `color`.
               result = hsvColor.s === 0 || hsvColor.v === 0 ?
                newHsl.replace(/(hsla?\()\s*([+-]?\d*\.?\d+)(.*)/, (match, p1, p2, p3) =>
                 `${p1}${ColorParser.round(hue, precision)}${p3}`) : newHsl;
               break;
            }

            case 'rgb':
               result = colordInstance.toRgbString(precision);
               break;
         }
      }

      return result;
   }

   /**
    * Parses an externally set color. If HSL or HSV the hue is maintained in conversion to internal HSV data.
    *
    * @param {object|string}   color - Color to parse.
    *
    * @returns {object} HSV color.
    */
   static parseExternal(color)
   {
      const colorModel = ColorParser.getColorFormat(color);

      let initialHue = 0;

      // Parse initial hue value from `hsl` or `hsv` formats.
      if (colorModel.format === 'hsv' && colorModel.type === 'object')
      {
         initialHue = color.h ?? 0;
      }
      else if (colorModel.format === 'hsl')
      {
         switch (colorModel.type)
         {
            case 'object':
               initialHue = color.h ?? 0;
               break;

            case 'string':
            {
               const match = this.#hslaMatcherComma.exec(color) ?? this.#hslaMatcherSpace.exec(color);
               if (match) { initialHue = ColorParser.parseHue(match[1], match[2]); }
            }
         }
      }

      const newHsv = w(color).toHsv(5);
      newHsv.h = ColorParser.clampHue(initialHue);

      return newHsv;
   }
}


/**
 * @typedef {object} ColorStateData
 *
 * @property {number} alpha - Current alpha value.
 *
 * @property {object|string} currentColor - Current color value.
 *
 * @property {string} currentColorString - Current color value; matches format if string available otherwise HSL.
 *
 * @property {'hex'|'hsl'|'hsv'|'rgb'} format - Output color format determined from initial color prop or options.
 *
 * @property {'object'|'string'} formatType - Output color format type determined from initial color prop or options.
 *
 * @property {number} hue - Current hue value.
 *
 * @property {string|object} initialPopupColor - Stores the initial color when in popup mode and picker is opened.
 *
 * @property {boolean} isDark - Is the current color considered dark.
 *
 * @property {number} precision - The rounding precision for the current color output.
 *
 * @property {string} hslString - Current color as RGB string without `alpha` component.
 *
 * @property {string} hslHueString - Current hue as RGB string.
 *
 * @property {string} hslaString - Current color as RGB string with `alpha` component.
 *
 * @property {boolean} lockTextFormat - Current lock text state format state.
 *
 * @property {{ s: number, v: number }} sv - Current internal color saturation / value state.
 */

/**
 * @typedef {object} ColorStateInternalUpdate
 *
 * The separated store updates for alpha, hue, sv are debounced with a next tick update and this object
 * collates the values for each store update in the same tick. It is reset in #updaateOutputColorDebounce.
 *
 * `textUpdate` determines if the update came from {@link TextState} and if so TextState is not updated in
 * #updateCurrentColor.
 *
 * @property {number}                  a - New alpha value.
 *
 * @property {number}                  h - New hue value.
 *
 * @property {{s: number, v: number}}  sv - New SV value.
 *
 * @property {boolean}                 textUpdate - Did the update come from {@link TextState}.
 */

/**
 * @typedef {object} ColorStateStores
 *
 * @property {import('svelte/store').Writable<number>} alpha - The current alpha value (0 - 1).
 *
 * @property {import('svelte/store').Writable<number>} hue - The current hue value (0 - 360).
 *
 * @property {import('svelte/store').Readable<string|object>} currentColor - The current color.
 *
 * @property {import('svelte/store').Readable<string>} currentColorString - The current color string matching format or HSL.
 *
 * @property {import('svelte/store').Readable<boolean>} isDark - Is the current color considered "dark".
 *
 * @property {TextState} textState - The text state for various supported color formats.
 *
 * @property {import('svelte/store').Readable<string>} hslString - The current color / RGB only string.
 *
 * @property {import('svelte/store').Readable<string>} hslHueString - The current color hue / RGB only string.
 *
 * @property {import('svelte/store').Readable<string>} hslaString - The current color / RGBA only string.
 *
 * @property {import('svelte/store').Writable<{ s: number, v: number }>} sv - The saturation / value pair for HSV components.
 */

/**
 * Provides a wrapper around the browser EyeDropper API. The EyeDropper requires a secure context including `localhost`.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API
 */
class EyeDropper
{
   /**
    * @returns {boolean} Is the EyeDropper API available?
    */
   static get isAvailable()
   {
      return globalThis.EyeDropper !== void 0;
   }

   /**
    * Defines the button data for TJSIconButton launching the EyeDropper API and assigning any result to
    * `colorState`.
    *
    * @param {{ setColor: Function }} colorState - Provides a callback function setting any user selected color.
    *
    * @returns {{onClick: ((function(): Promise<void>)|*), icon: string}} TJSIconButton data object.
    */
   static buttonData(colorState) {
      return {
         icon: 'fas fa-eye-dropper',
         keyCode: 'Space',
         onPress: async () =>
         {
            try
            {
               const eyeDropper = new globalThis.EyeDropper();

               const colorSelectionResult = await eyeDropper.open();

               if (typeof colorSelectionResult?.sRGBHex === 'string')
               {
                  colorState.setColor(colorSelectionResult.sRGBHex);
               }
            }
            catch (err) { /**/ }
         }
      }
   }
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\layout\default\FocusWrap.svelte generated by Svelte v3.55.0-cq */

function create_fragment$l(ctx) {
	let div;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			attr(div, "class", "tjs-color-picker-last-focus svelte-6jszeb");
			attr(div, "tabindex", "0");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (!mounted) {
				dispose = action_destroyer(isFocused.call(null, div, /*focused*/ ctx[2]));
				mounted = true;
			}
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			mounted = false;
			dispose();
		}
	};
}

function instance$l($$self, $$props, $$invalidate) {
	let $firstFocusEl;
	let $focused;
	let $isPopup;
	const internalState = getContext('#tjs-color-picker-state');
	const { firstFocusEl, isPopup } = internalState.stores;
	component_subscribe($$self, firstFocusEl, value => $$invalidate(3, $firstFocusEl = value));
	component_subscribe($$self, isPopup, value => $$invalidate(5, $isPopup = value));
	const focused = writable$1(false);
	component_subscribe($$self, focused, value => $$invalidate(4, $focused = value));

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$isPopup, $focused, $firstFocusEl*/ 56) {
			/**
 * Handle forwarding on focus to any first focusable element set when in popup mode.
 */
			if ($isPopup && $focused && $firstFocusEl instanceof HTMLElement) {
				$firstFocusEl.focus();
			}
		}
	};

	return [firstFocusEl, isPopup, focused, $firstFocusEl, $focused, $isPopup];
}

class FocusWrap extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$l, create_fragment$l, safe_not_equal, {});
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\layout\default\PickerIndicator.svelte generated by Svelte v3.55.0-cq */

function create_fragment$k(ctx) {
	let div;
	let applyStyles_action;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			attr(div, "class", "tjs-picker-indicator svelte-11yyuj2");
			toggle_class(div, "focused", /*focused*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (!mounted) {
				dispose = action_destroyer(applyStyles_action = applyStyles.call(null, div, /*styles*/ ctx[1]));
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (applyStyles_action && is_function(applyStyles_action.update) && dirty & /*styles*/ 2) applyStyles_action.update.call(null, /*styles*/ ctx[1]);

			if (dirty & /*focused*/ 1) {
				toggle_class(div, "focused", /*focused*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			mounted = false;
			dispose();
		}
	};
}

function instance$k($$self, $$props, $$invalidate) {
	let { focused = false } = $$props;
	let { styles = void 0 } = $$props;

	$$self.$$set = $$props => {
		if ('focused' in $$props) $$invalidate(0, focused = $$props.focused);
		if ('styles' in $$props) $$invalidate(1, styles = $$props.styles);
	};

	return [focused, styles];
}

class PickerIndicator extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$k, create_fragment$k, safe_not_equal, { focused: 0, styles: 1 });
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\layout\default\PickerWrapper.svelte generated by Svelte v3.55.0-cq */

function create_fragment$j(ctx) {
	let div;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			div = element("div");
			if (default_slot) default_slot.c();
			attr(div, "class", "tjs-picker-wrapper svelte-kouigw");
			toggle_class(div, "focused", /*focused*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*focused*/ 1) {
				toggle_class(div, "focused", /*focused*/ ctx[0]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$j($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let { focused = void 0 } = $$props;

	$$self.$$set = $$props => {
		if ('focused' in $$props) $$invalidate(0, focused = $$props.focused);
		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
	};

	return [focused, $$scope, slots];
}

let PickerWrapper$1 = class PickerWrapper extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$j, create_fragment$j, safe_not_equal, { focused: 0 });
	}
};

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\layout\default\SliderIndicator.svelte generated by Svelte v3.55.0-cq */

function create_fragment$i(ctx) {
	let div;
	let applyStyles_action;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			attr(div, "class", "tjs-slider-indicator svelte-1dd3h48");
			toggle_class(div, "focused", /*focused*/ ctx[0]);
			toggle_class(div, "horizontal", /*sliderHorizontal*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (!mounted) {
				dispose = action_destroyer(applyStyles_action = applyStyles.call(null, div, /*styles*/ ctx[1]));
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (applyStyles_action && is_function(applyStyles_action.update) && dirty & /*styles*/ 2) applyStyles_action.update.call(null, /*styles*/ ctx[1]);

			if (dirty & /*focused*/ 1) {
				toggle_class(div, "focused", /*focused*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			mounted = false;
			dispose();
		}
	};
}

function instance$i($$self, $$props, $$invalidate) {
	const sliderHorizontal = getContext('#tjs-color-picker-slider-horizontal');
	let { focused = false } = $$props;
	let { styles = void 0 } = $$props;

	$$self.$$set = $$props => {
		if ('focused' in $$props) $$invalidate(0, focused = $$props.focused);
		if ('styles' in $$props) $$invalidate(1, styles = $$props.styles);
	};

	return [focused, styles, sliderHorizontal];
}

class SliderIndicator extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$i, create_fragment$i, safe_not_equal, { focused: 0, styles: 1 });
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\layout\default\SliderWrapper.svelte generated by Svelte v3.55.0-cq */

function create_fragment$h(ctx) {
	let div;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			div = element("div");
			if (default_slot) default_slot.c();
			attr(div, "class", "tjs-slider-wrapper svelte-156e84g");
			toggle_class(div, "horizontal", /*sliderHorizontal*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$h($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	const internalState = getContext('#tjs-color-picker-state');
	const sliderHorizontal = getContext('#tjs-color-picker-slider-horizontal');
	internalState.stores;

	$$self.$$set = $$props => {
		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
	};

	return [sliderHorizontal, $$scope, slots];
}

class SliderWrapper extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\folder\TJSSvgFolder.svelte generated by Svelte v3.55.0-cq */
const get_summary_end_slot_changes = dirty => ({});
const get_summary_end_slot_context = ctx => ({});
const get_label_slot_changes = dirty => ({});
const get_label_slot_context = ctx => ({});

// (416:12) {:else}
function create_else_block$1(ctx) {
	let div;
	let t_value = localize(/*label*/ ctx[1]) + "";
	let t;

	return {
		c() {
			div = element("div");
			t = text(t_value);
			attr(div, "class", "label svelte-jjz59m");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
			/*div_binding*/ ctx[33](div);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*label*/ 2 && t_value !== (t_value = localize(/*label*/ ctx[1]) + "")) set_data(t, t_value);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			/*div_binding*/ ctx[33](null);
		}
	};
}

// (414:12) {#if isSvelteComponent(folder?.slotLabel?.class)}
function create_if_block_3$2(ctx) {
	let switch_instance;
	let switch_instance_anchor;
	let current;

	const switch_instance_spread_levels = [
		isObject(/*folder*/ ctx[5]?.slotLabel?.props)
		? /*folder*/ ctx[5].slotLabel.props
		: {}
	];

	var switch_value = /*folder*/ ctx[5].slotLabel.class;

	function switch_props(ctx) {
		let switch_instance_props = {};

		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
		}

		return { props: switch_instance_props };
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props());
	}

	return {
		c() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m(target, anchor) {
			if (switch_instance) mount_component(switch_instance, target, anchor);
			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const switch_instance_changes = (dirty[0] & /*folder*/ 32)
			? get_spread_update(switch_instance_spread_levels, [
					get_spread_object(isObject(/*folder*/ ctx[5]?.slotLabel?.props)
					? /*folder*/ ctx[5].slotLabel.props
					: {})
				])
			: {};

			if (switch_value !== (switch_value = /*folder*/ ctx[5].slotLabel.class)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props());
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

// (413:25)               
function fallback_block_2(ctx) {
	let show_if;
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block_3$2, create_else_block$1];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (dirty[0] & /*folder*/ 32) show_if = null;
		if (show_if == null) show_if = !!isSvelteComponent(/*folder*/ ctx[5]?.slotLabel?.class);
		if (show_if) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx, [-1, -1]);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx, dirty);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (422:12) {#if isSvelteComponent(folder?.slotSummaryEnd?.class)}
function create_if_block_2$3(ctx) {
	let switch_instance;
	let switch_instance_anchor;
	let current;

	const switch_instance_spread_levels = [
		isObject(/*folder*/ ctx[5]?.slotSummaryEnd?.props)
		? /*folder*/ ctx[5].slotSummaryEnd.props
		: {}
	];

	var switch_value = /*folder*/ ctx[5].slotSummaryEnd.class;

	function switch_props(ctx) {
		let switch_instance_props = {};

		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
		}

		return { props: switch_instance_props };
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props());
	}

	return {
		c() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m(target, anchor) {
			if (switch_instance) mount_component(switch_instance, target, anchor);
			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const switch_instance_changes = (dirty[0] & /*folder*/ 32)
			? get_spread_update(switch_instance_spread_levels, [
					get_spread_object(isObject(/*folder*/ ctx[5]?.slotSummaryEnd?.props)
					? /*folder*/ ctx[5].slotSummaryEnd.props
					: {})
				])
			: {};

			if (switch_value !== (switch_value = /*folder*/ ctx[5].slotSummaryEnd.class)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props());
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

// (421:33)               
function fallback_block_1(ctx) {
	let show_if = isSvelteComponent(/*folder*/ ctx[5]?.slotSummaryEnd?.class);
	let if_block_anchor;
	let current;
	let if_block = show_if && create_if_block_2$3(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty[0] & /*folder*/ 32) show_if = isSvelteComponent(/*folder*/ ctx[5]?.slotSummaryEnd?.class);

			if (show_if) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty[0] & /*folder*/ 32) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_2$3(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (429:8) {#if visible}
function create_if_block$7(ctx) {
	let current;
	const default_slot_template = /*#slots*/ ctx[25].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[24], null);
	const default_slot_or_fallback = default_slot || fallback_block(ctx);

	return {
		c() {
			if (default_slot_or_fallback) default_slot_or_fallback.c();
		},
		m(target, anchor) {
			if (default_slot_or_fallback) {
				default_slot_or_fallback.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty[0] & /*$$scope*/ 16777216)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[24],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[24])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[24], dirty, null),
						null
					);
				}
			} else {
				if (default_slot_or_fallback && default_slot_or_fallback.p && (!current || dirty[0] & /*folder*/ 32)) {
					default_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot_or_fallback, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot_or_fallback, local);
			current = false;
		},
		d(detaching) {
			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
		}
	};
}

// (431:16) {#if isSvelteComponent(folder?.slotDefault?.class)}
function create_if_block_1$4(ctx) {
	let switch_instance;
	let switch_instance_anchor;
	let current;

	const switch_instance_spread_levels = [
		isObject(/*folder*/ ctx[5]?.slotDefault?.props)
		? /*folder*/ ctx[5].slotDefault.props
		: {}
	];

	var switch_value = /*folder*/ ctx[5].slotDefault.class;

	function switch_props(ctx) {
		let switch_instance_props = {};

		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
		}

		return { props: switch_instance_props };
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props());
	}

	return {
		c() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m(target, anchor) {
			if (switch_instance) mount_component(switch_instance, target, anchor);
			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const switch_instance_changes = (dirty[0] & /*folder*/ 32)
			? get_spread_update(switch_instance_spread_levels, [
					get_spread_object(isObject(/*folder*/ ctx[5]?.slotDefault?.props)
					? /*folder*/ ctx[5].slotDefault.props
					: {})
				])
			: {};

			if (switch_value !== (switch_value = /*folder*/ ctx[5].slotDefault.class)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props());
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

// (430:18)                   
function fallback_block(ctx) {
	let show_if = isSvelteComponent(/*folder*/ ctx[5]?.slotDefault?.class);
	let if_block_anchor;
	let current;
	let if_block = show_if && create_if_block_1$4(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty[0] & /*folder*/ 32) show_if = isSvelteComponent(/*folder*/ ctx[5]?.slotDefault?.class);

			if (show_if) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty[0] & /*folder*/ 32) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_1$4(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function create_fragment$g(ctx) {
	let details;
	let summary;
	let svg;
	let path;
	let t0;
	let t1;
	let t2;
	let div;
	let toggleDetails_action;
	let applyStyles_action;
	let current;
	let mounted;
	let dispose;
	const label_slot_template = /*#slots*/ ctx[25].label;
	const label_slot = create_slot(label_slot_template, ctx, /*$$scope*/ ctx[24], get_label_slot_context);
	const label_slot_or_fallback = label_slot || fallback_block_2(ctx);
	const summary_end_slot_template = /*#slots*/ ctx[25]["summary-end"];
	const summary_end_slot = create_slot(summary_end_slot_template, ctx, /*$$scope*/ ctx[24], get_summary_end_slot_context);
	const summary_end_slot_or_fallback = summary_end_slot || fallback_block_1(ctx);
	let if_block = /*visible*/ ctx[11] && create_if_block$7(ctx);

	return {
		c() {
			details = element("details");
			summary = element("summary");
			svg = svg_element("svg");
			path = svg_element("path");
			t0 = space();
			if (label_slot_or_fallback) label_slot_or_fallback.c();
			t1 = space();
			if (summary_end_slot_or_fallback) summary_end_slot_or_fallback.c();
			t2 = space();
			div = element("div");
			if (if_block) if_block.c();
			attr(path, "fill", "currentColor");
			attr(path, "stroke", "currentColor");
			set_style(path, "stroke-linejoin", "round");
			set_style(path, "stroke-width", "3");
			attr(path, "d", "M5,8L19,8L12,15Z");
			attr(svg, "viewBox", "0 0 24 24");
			attr(svg, "class", "svelte-jjz59m");
			attr(summary, "class", "svelte-jjz59m");
			toggle_class(summary, "default-cursor", /*localOptions*/ ctx[7].chevronOnly);
			attr(div, "class", "contents svelte-jjz59m");
			attr(details, "class", "tjs-svg-folder svelte-jjz59m");
			attr(details, "data-id", /*id*/ ctx[0]);
			attr(details, "data-label", /*label*/ ctx[1]);
			attr(details, "data-closing", "false");
		},
		m(target, anchor) {
			insert(target, details, anchor);
			append(details, summary);
			append(summary, svg);
			append(svg, path);
			/*svg_binding*/ ctx[32](svg);
			append(summary, t0);

			if (label_slot_or_fallback) {
				label_slot_or_fallback.m(summary, null);
			}

			append(summary, t1);

			if (summary_end_slot_or_fallback) {
				summary_end_slot_or_fallback.m(summary, null);
			}

			/*summary_binding*/ ctx[34](summary);
			append(details, t2);
			append(details, div);
			if (if_block) if_block.m(div, null);
			/*details_binding*/ ctx[35](details);
			current = true;

			if (!mounted) {
				dispose = [
					listen(summary, "click", /*onClickSummary*/ ctx[12], true),
					listen(summary, "contextmenu", function () {
						if (is_function(/*onContextClick*/ ctx[4])) /*onContextClick*/ ctx[4].apply(this, arguments);
					}),
					listen(summary, "keydown", /*onKeyDown*/ ctx[13], true),
					listen(summary, "keyup", /*onKeyUp*/ ctx[14], true),
					listen(details, "close", /*onLocalClose*/ ctx[15]),
					listen(details, "closeAny", /*onLocalClose*/ ctx[15]),
					listen(details, "open", /*onLocalOpen*/ ctx[16]),
					listen(details, "openAny", /*onLocalOpen*/ ctx[16]),
					listen(details, "click", /*click_handler*/ ctx[26]),
					listen(details, "keydown", /*keydown_handler*/ ctx[27]),
					listen(details, "open", /*open_handler*/ ctx[28]),
					listen(details, "close", /*close_handler*/ ctx[29]),
					listen(details, "openAny", /*openAny_handler*/ ctx[30]),
					listen(details, "closeAny", /*closeAny_handler*/ ctx[31]),
					action_destroyer(toggleDetails_action = toggleDetails.call(null, details, {
						store: /*store*/ ctx[2],
						clickActive: false
					})),
					action_destroyer(applyStyles_action = applyStyles.call(null, details, /*styles*/ ctx[3]))
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (label_slot) {
				if (label_slot.p && (!current || dirty[0] & /*$$scope*/ 16777216)) {
					update_slot_base(
						label_slot,
						label_slot_template,
						ctx,
						/*$$scope*/ ctx[24],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[24])
						: get_slot_changes(label_slot_template, /*$$scope*/ ctx[24], dirty, get_label_slot_changes),
						get_label_slot_context
					);
				}
			} else {
				if (label_slot_or_fallback && label_slot_or_fallback.p && (!current || dirty[0] & /*folder, labelEl, label*/ 290)) {
					label_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
				}
			}

			if (summary_end_slot) {
				if (summary_end_slot.p && (!current || dirty[0] & /*$$scope*/ 16777216)) {
					update_slot_base(
						summary_end_slot,
						summary_end_slot_template,
						ctx,
						/*$$scope*/ ctx[24],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[24])
						: get_slot_changes(summary_end_slot_template, /*$$scope*/ ctx[24], dirty, get_summary_end_slot_changes),
						get_summary_end_slot_context
					);
				}
			} else {
				if (summary_end_slot_or_fallback && summary_end_slot_or_fallback.p && (!current || dirty[0] & /*folder*/ 32)) {
					summary_end_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
				}
			}

			if (!current || dirty[0] & /*localOptions*/ 128) {
				toggle_class(summary, "default-cursor", /*localOptions*/ ctx[7].chevronOnly);
			}

			if (/*visible*/ ctx[11]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty[0] & /*visible*/ 2048) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$7(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (!current || dirty[0] & /*id*/ 1) {
				attr(details, "data-id", /*id*/ ctx[0]);
			}

			if (!current || dirty[0] & /*label*/ 2) {
				attr(details, "data-label", /*label*/ ctx[1]);
			}

			if (toggleDetails_action && is_function(toggleDetails_action.update) && dirty[0] & /*store*/ 4) toggleDetails_action.update.call(null, {
				store: /*store*/ ctx[2],
				clickActive: false
			});

			if (applyStyles_action && is_function(applyStyles_action.update) && dirty[0] & /*styles*/ 8) applyStyles_action.update.call(null, /*styles*/ ctx[3]);
		},
		i(local) {
			if (current) return;
			transition_in(label_slot_or_fallback, local);
			transition_in(summary_end_slot_or_fallback, local);
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(label_slot_or_fallback, local);
			transition_out(summary_end_slot_or_fallback, local);
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(details);
			/*svg_binding*/ ctx[32](null);
			if (label_slot_or_fallback) label_slot_or_fallback.d(detaching);
			if (summary_end_slot_or_fallback) summary_end_slot_or_fallback.d(detaching);
			/*summary_binding*/ ctx[34](null);
			if (if_block) if_block.d();
			/*details_binding*/ ctx[35](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$g($$self, $$props, $$invalidate) {
	let $store,
		$$unsubscribe_store = noop,
		$$subscribe_store = () => ($$unsubscribe_store(), $$unsubscribe_store = subscribe(store, $$value => $$invalidate(23, $store = $$value)), store);

	$$self.$$.on_destroy.push(() => $$unsubscribe_store());
	let { $$slots: slots = {}, $$scope } = $$props;
	let { folder = void 0 } = $$props;
	let { id = void 0 } = $$props;
	let { label = void 0 } = $$props;
	let { keyCode = void 0 } = $$props;
	let { options = void 0 } = $$props;
	let { store = void 0 } = $$props;
	$$subscribe_store();
	let { styles = void 0 } = $$props;
	let { onClose = void 0 } = $$props;
	let { onOpen = void 0 } = $$props;
	let { onContextClick = void 0 } = $$props;

	/** @type {TJSFolderOptions} */
	const localOptions = { chevronOnly: false, noKeys: false };

	let detailsEl, labelEl, summaryEl, svgEl;
	let storeUnsubscribe;

	// For performance reasons when the folder is closed the main slot is not rendered.
	// When the folder is closed `visible` is set to false with a slight delay to allow the closing animation to
	// complete.
	let visible = $store;

	let timeoutId;
	onDestroy(() => storeUnsubscribe());

	/**
 * Create a CustomEvent with details object containing relevant element and props.
 *
 * @param {string}   type - Event name / type.
 *
 * @param {boolean}  [bubbles=false] - Does the event bubble.
 *
 * @returns {CustomEvent<object>}
 */
	function createEvent(type, bubbles = false) {
		return new CustomEvent(type,
		{
				detail: {
					element: detailsEl,
					folder,
					id,
					label,
					store
				},
				bubbles
			});
	}

	/**
 * Handles opening / closing the details element from either click or keyboard event when summary focused.
 *
 * @param {KeyboardEvent|MouseEvent} event -
 *
 * @param {boolean} [fromKeyboard=false] - True when event is coming from keyboard. This is used to ignore the
 * chevronOnly click event handling.
 */
	function handleOpenClose(event, fromKeyboard = false) {
		const target = event.target;
		const chevronTarget = target === svgEl || svgEl.contains(target);

		if (target === summaryEl || target === labelEl || chevronTarget || target.querySelector('.summary-click') !== null) {
			if (!fromKeyboard && localOptions.chevronOnly && !chevronTarget) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}

			set_store_value(store, $store = !$store, $store);

			if ($store && typeof onOpen === 'function') {
				onOpen();
			} else if (typeof onClose === 'function') {
				onClose();
			}

			event.preventDefault();
			event.stopPropagation();
		} else {
			// Handle exclusion cases when no-summary-click class is in target, targets children, or targets parent
			// element.
			if (target.classList.contains('no-summary-click') || target.querySelector('.no-summary-click') !== null || target.parentElement && target.parentElement.classList.contains('no-summary-click')) {
				event.preventDefault();
				event.stopPropagation();
			}
		}
	}

	/**
 * Detects whether the summary click came from a pointer / mouse device or the keyboard. If from the keyboard and
 * the active element is `summaryEl` then no action is taken and `onKeyDown` will handle the key event to open /
 * close the detail element.
 *
 * @param {PointerEvent|MouseEvent} event
 */
	function onClickSummary(event) {
		// Firefox sends a `click` event / non-standard response so check for mozInputSource equaling 6 (keyboard) or
		// a negative pointerId from Chromium and prevent default. This allows `onKeyUp` to handle any open / close
		// action.
		if (document.activeElement === summaryEl && (event?.pointerId === -1 || event?.mozInputSource === 6)) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}

		handleOpenClose(event);
	}

	/**
 * When localOptions `noKeys` is true prevent `space bar` / 'space' from activating folder open / close.
 *
 * Otherwise, detect if the key event came from the active tabbed / focused summary element and `options.keyCode`
 * matches.
 *
 * @param {KeyboardEvent} event -
 */
	function onKeyDown(event) {
		if (localOptions.noKeys && event.code === 'Space') {
			event.preventDefault();
		}

		if (document.activeElement === summaryEl && event.code === keyCode) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
 * When localOptions `noKeys` is true prevent `space bar` / 'space' from activating folder open / close.
 *
 * Otherwise, detect if the key event came from the active tabbed / focused summary element and `options.keyCode`
 * matches.
 *
 * @param {KeyboardEvent} event -
 */
	function onKeyUp(event) {
		if (localOptions.noKeys && event.code === 'Space') {
			event.preventDefault();
		}

		if (document.activeElement === summaryEl && event.code === keyCode) {
			handleOpenClose(event, true);
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
 * Handle receiving bubbled event from summary or content to close details / content.
 */
	function onLocalClose(event) {
		event.preventDefault();
		event.stopPropagation();
		store.set(false);
	}

	/**
 * Handle receiving bubbled event from summary bar to open details / content.
 */
	function onLocalOpen(event) {
		event.preventDefault();
		event.stopPropagation();
		store.set(true);
	}

	function click_handler(event) {
		bubble.call(this, $$self, event);
	}

	function keydown_handler(event) {
		bubble.call(this, $$self, event);
	}

	function open_handler(event) {
		bubble.call(this, $$self, event);
	}

	function close_handler(event) {
		bubble.call(this, $$self, event);
	}

	function openAny_handler(event) {
		bubble.call(this, $$self, event);
	}

	function closeAny_handler(event) {
		bubble.call(this, $$self, event);
	}

	function svg_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			svgEl = $$value;
			$$invalidate(10, svgEl);
		});
	}

	function div_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			labelEl = $$value;
			$$invalidate(8, labelEl);
		});
	}

	function summary_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			summaryEl = $$value;
			$$invalidate(9, summaryEl);
		});
	}

	function details_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			detailsEl = $$value;
			$$invalidate(6, detailsEl);
		});
	}

	$$self.$$set = $$props => {
		if ('folder' in $$props) $$invalidate(5, folder = $$props.folder);
		if ('id' in $$props) $$invalidate(0, id = $$props.id);
		if ('label' in $$props) $$invalidate(1, label = $$props.label);
		if ('keyCode' in $$props) $$invalidate(17, keyCode = $$props.keyCode);
		if ('options' in $$props) $$invalidate(18, options = $$props.options);
		if ('store' in $$props) $$subscribe_store($$invalidate(2, store = $$props.store));
		if ('styles' in $$props) $$invalidate(3, styles = $$props.styles);
		if ('onClose' in $$props) $$invalidate(19, onClose = $$props.onClose);
		if ('onOpen' in $$props) $$invalidate(20, onOpen = $$props.onOpen);
		if ('onContextClick' in $$props) $$invalidate(4, onContextClick = $$props.onContextClick);
		if ('$$scope' in $$props) $$invalidate(24, $$scope = $$props.$$scope);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*folder, id*/ 33) {
			$$invalidate(0, id = isObject(folder) && typeof folder.id === 'string'
			? folder.id
			: typeof id === 'string' ? id : void 0);
		}

		if ($$self.$$.dirty[0] & /*folder, label*/ 34) {
			$$invalidate(1, label = isObject(folder) && typeof folder.label === 'string'
			? folder.label
			: typeof label === 'string' ? label : '');
		}

		if ($$self.$$.dirty[0] & /*folder, keyCode*/ 131104) {
			$$invalidate(17, keyCode = isObject(folder) && typeof folder.keyCode === 'string'
			? folder.keyCode
			: typeof keyCode === 'string' ? keyCode : 'Enter');
		}

		if ($$self.$$.dirty[0] & /*folder, options*/ 262176) {
			{
				$$invalidate(18, options = isObject(folder) && isObject(folder.options)
				? folder.options
				: isObject(options) ? options : {});

				if (typeof options?.chevronOnly === 'boolean') {
					$$invalidate(7, localOptions.chevronOnly = options.chevronOnly, localOptions);
				}

				if (typeof options?.noKeys === 'boolean') {
					$$invalidate(7, localOptions.noKeys = options.noKeys, localOptions);
				}
			}
		}

		if ($$self.$$.dirty[0] & /*folder, store, storeUnsubscribe, detailsEl*/ 2097252) {
			{
				$$subscribe_store($$invalidate(2, store = isObject(folder) && isWritableStore(folder.store)
				? folder.store
				: isWritableStore(store) ? store : writable$1(false)));

				if (typeof storeUnsubscribe === 'function') {
					storeUnsubscribe();
				}

				// Manually subscribe to store in order to trigger only on changes; avoids initial dispatch on mount as `detailsEl`
				// is not set yet. Directly dispatch custom events as Svelte 3 does not support bubbling of custom events by
				// `createEventDispatcher`.
				$$invalidate(21, storeUnsubscribe = subscribeIgnoreFirst(store, value => {
					if (detailsEl) {
						detailsEl.dispatchEvent(createEvent(value ? 'open' : 'close'));
						detailsEl.dispatchEvent(createEvent(value ? 'openAny' : 'closeAny', true));
					}
				}));
			}
		}

		if ($$self.$$.dirty[0] & /*folder, styles*/ 40) {
			$$invalidate(3, styles = isObject(folder) && isObject(folder.styles)
			? folder.styles
			: isObject(styles) ? styles : void 0);
		}

		if ($$self.$$.dirty[0] & /*folder, onClose*/ 524320) {
			$$invalidate(19, onClose = isObject(folder) && typeof folder.onClose === 'function'
			? folder.onClose
			: typeof onClose === 'function' ? onClose : void 0);
		}

		if ($$self.$$.dirty[0] & /*folder, onOpen*/ 1048608) {
			$$invalidate(20, onOpen = isObject(folder) && typeof folder.onOpen === 'function'
			? folder.onOpen
			: typeof onOpen === 'function' ? onOpen : void 0);
		}

		if ($$self.$$.dirty[0] & /*folder, onContextClick*/ 48) {
			$$invalidate(4, onContextClick = isObject(folder) && typeof folder.onContextClick === 'function'
			? folder.onContextClick
			: typeof onContextClick === 'function'
				? onContextClick
				: () => null);
		}

		if ($$self.$$.dirty[0] & /*$store, timeoutId*/ 12582912) {
			if (!$store) {
				$$invalidate(22, timeoutId = setTimeout(() => $$invalidate(11, visible = false), 500));
			} else {
				clearTimeout(timeoutId);
				$$invalidate(11, visible = true);
			}
		}
	};

	return [
		id,
		label,
		store,
		styles,
		onContextClick,
		folder,
		detailsEl,
		localOptions,
		labelEl,
		summaryEl,
		svgEl,
		visible,
		onClickSummary,
		onKeyDown,
		onKeyUp,
		onLocalClose,
		onLocalOpen,
		keyCode,
		options,
		onClose,
		onOpen,
		storeUnsubscribe,
		timeoutId,
		$store,
		$$scope,
		slots,
		click_handler,
		keydown_handler,
		open_handler,
		close_handler,
		openAny_handler,
		closeAny_handler,
		svg_binding,
		div_binding,
		summary_binding,
		details_binding
	];
}

class TJSSvgFolder extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance$g,
			create_fragment$g,
			safe_not_equal,
			{
				folder: 5,
				id: 0,
				label: 1,
				keyCode: 17,
				options: 18,
				store: 2,
				styles: 3,
				onClose: 19,
				onOpen: 20,
				onContextClick: 4
			},
			null,
			[-1, -1]
		);
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\AddOnPanel.svelte generated by Svelte v3.55.0-cq */

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[3] = list[i];
	return child_ctx;
}

// (11:0) {#if $addOnState.length > 0}
function create_if_block$6(ctx) {
	let div;
	let each_blocks = [];
	let each_1_lookup = new Map();
	let current;
	let each_value = /*$addOnState*/ ctx[0];
	const get_key = ctx => /*addOn*/ ctx[3].id;

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context$2(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div, "class", "tjs-color-picker-addons svelte-1w46bg4");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*$addOnState*/ 1) {
				each_value = /*$addOnState*/ ctx[0];
				group_outros();
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d();
			}
		}
	};
}

// (13:8) {#each $addOnState as addOn (addOn.id)}
function create_each_block$2(key_1, ctx) {
	let section;
	let tjssvgfolder;
	let t;
	let current;

	tjssvgfolder = new TJSSvgFolder({
			props: {
				folder: /*addOn*/ ctx[3].folderData,
				keyCode: 'Space'
			}
		});

	return {
		key: key_1,
		first: null,
		c() {
			section = element("section");
			create_component(tjssvgfolder.$$.fragment);
			t = space();
			attr(section, "class", "svelte-1w46bg4");
			this.first = section;
		},
		m(target, anchor) {
			insert(target, section, anchor);
			mount_component(tjssvgfolder, section, null);
			append(section, t);
			current = true;
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			const tjssvgfolder_changes = {};
			if (dirty & /*$addOnState*/ 1) tjssvgfolder_changes.folder = /*addOn*/ ctx[3].folderData;
			tjssvgfolder.$set(tjssvgfolder_changes);
		},
		i(local) {
			if (current) return;
			transition_in(tjssvgfolder.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(tjssvgfolder.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(section);
			destroy_component(tjssvgfolder);
		}
	};
}

function create_fragment$f(ctx) {
	let if_block_anchor;
	let current;
	let if_block = /*$addOnState*/ ctx[0].length > 0 && create_if_block$6(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*$addOnState*/ ctx[0].length > 0) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*$addOnState*/ 1) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$6(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$f($$self, $$props, $$invalidate) {
	let $addOnState;
	const internalState = getContext('#tjs-color-picker-state');
	const addOnState = internalState.addOnState;
	component_subscribe($$self, addOnState, value => $$invalidate(0, $addOnState = value));
	return [$addOnState, addOnState];
}

class AddOnPanel extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\ButtonBar.svelte generated by Svelte v3.55.0-cq */

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[10] = list[i];
	return child_ctx;
}

// (42:4) {#if $hasEyeDropper}
function create_if_block_2$2(ctx) {
	let tjsiconbutton;
	let current;

	tjsiconbutton = new TJSIconButton({
			props: {
				button: EyeDropper.buttonData(/*internalState*/ ctx[4].colorState),
				efx: ripple({ keyCode: 'Space' })
			}
		});

	return {
		c() {
			create_component(tjsiconbutton.$$.fragment);
		},
		m(target, anchor) {
			mount_component(tjsiconbutton, target, anchor);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(tjsiconbutton.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(tjsiconbutton.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(tjsiconbutton, detaching);
		}
	};
}

// (46:4) {#if $hasAddons}
function create_if_block$5(ctx) {
	let each_1_anchor;
	let current;
	let each_value = /*$buttonState*/ ctx[3];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*$buttonState, ripple*/ 8) {
				each_value = /*$buttonState*/ ctx[3];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

// (50:12) {:else}
function create_else_block(ctx) {
	let tjsiconbutton;
	let current;

	tjsiconbutton = new TJSIconButton({
			props: {
				button: /*button*/ ctx[10],
				efx: ripple({ keyCode: 'Space' }),
				keyCode: 'Space'
			}
		});

	return {
		c() {
			create_component(tjsiconbutton.$$.fragment);
		},
		m(target, anchor) {
			mount_component(tjsiconbutton, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const tjsiconbutton_changes = {};
			if (dirty & /*$buttonState*/ 8) tjsiconbutton_changes.button = /*button*/ ctx[10];
			tjsiconbutton.$set(tjsiconbutton_changes);
		},
		i(local) {
			if (current) return;
			transition_in(tjsiconbutton.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(tjsiconbutton.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(tjsiconbutton, detaching);
		}
	};
}

// (48:12) {#if button.isToggle}
function create_if_block_1$3(ctx) {
	let tjstoggleiconbutton;
	let current;

	tjstoggleiconbutton = new TJSToggleIconButton({
			props: {
				button: /*button*/ ctx[10],
				efx: ripple({ keyCode: 'Space' }),
				keyCode: 'Space'
			}
		});

	return {
		c() {
			create_component(tjstoggleiconbutton.$$.fragment);
		},
		m(target, anchor) {
			mount_component(tjstoggleiconbutton, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const tjstoggleiconbutton_changes = {};
			if (dirty & /*$buttonState*/ 8) tjstoggleiconbutton_changes.button = /*button*/ ctx[10];
			tjstoggleiconbutton.$set(tjstoggleiconbutton_changes);
		},
		i(local) {
			if (current) return;
			transition_in(tjstoggleiconbutton.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(tjstoggleiconbutton.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(tjstoggleiconbutton, detaching);
		}
	};
}

// (47:8) {#each $buttonState as button}
function create_each_block$1(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block_1$3, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*button*/ ctx[10].isToggle) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function create_fragment$e(ctx) {
	let section;
	let tjscolordbutton;
	let t0;
	let t1;
	let current;

	tjscolordbutton = new TJSColordButton({
			props: {
				color: /*$currentColorString*/ ctx[0],
				efx: ripple({ keyCode: 'Space' }),
				keyCode: 'Space'
			}
		});

	tjscolordbutton.$on("press", /*onPress*/ ctx[9]);
	let if_block0 = /*$hasEyeDropper*/ ctx[1] && create_if_block_2$2(ctx);
	let if_block1 = /*$hasAddons*/ ctx[2] && create_if_block$5(ctx);

	return {
		c() {
			section = element("section");
			create_component(tjscolordbutton.$$.fragment);
			t0 = space();
			if (if_block0) if_block0.c();
			t1 = space();
			if (if_block1) if_block1.c();
			attr(section, "class", "svelte-1gkkeh9");
		},
		m(target, anchor) {
			insert(target, section, anchor);
			mount_component(tjscolordbutton, section, null);
			append(section, t0);
			if (if_block0) if_block0.m(section, null);
			append(section, t1);
			if (if_block1) if_block1.m(section, null);
			current = true;
		},
		p(ctx, [dirty]) {
			const tjscolordbutton_changes = {};
			if (dirty & /*$currentColorString*/ 1) tjscolordbutton_changes.color = /*$currentColorString*/ ctx[0];
			tjscolordbutton.$set(tjscolordbutton_changes);

			if (/*$hasEyeDropper*/ ctx[1]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty & /*$hasEyeDropper*/ 2) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_2$2(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(section, t1);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (/*$hasAddons*/ ctx[2]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty & /*$hasAddons*/ 4) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block$5(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(section, null);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(tjscolordbutton.$$.fragment, local);
			transition_in(if_block0);
			transition_in(if_block1);
			current = true;
		},
		o(local) {
			transition_out(tjscolordbutton.$$.fragment, local);
			transition_out(if_block0);
			transition_out(if_block1);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(section);
			destroy_component(tjscolordbutton);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
		}
	};
}

function instance$e($$self, $$props, $$invalidate) {
	let $currentColorString;
	let $hasEyeDropper;
	let $hasAddons;
	let $buttonState;
	const internalState = getContext('#tjs-color-picker-state');
	const buttonState = internalState.buttonState;
	component_subscribe($$self, buttonState, value => $$invalidate(3, $buttonState = value));
	const { hasAddons, hasEyeDropper } = internalState.stores;
	component_subscribe($$self, hasAddons, value => $$invalidate(2, $hasAddons = value));
	component_subscribe($$self, hasEyeDropper, value => $$invalidate(1, $hasEyeDropper = value));
	const { currentColorString } = internalState.colorState.stores;
	component_subscribe($$self, currentColorString, value => $$invalidate(0, $currentColorString = value));

	/**
 * Copy current color string to clipboard.
 *
 * TODO Eventbus: If / when an app eventbus is added trigger UI notification message
 */
	function onPress() {
		ClipboardAccess.writeText($currentColorString);
	}

	return [
		$currentColorString,
		$hasEyeDropper,
		$hasAddons,
		$buttonState,
		internalState,
		buttonState,
		hasAddons,
		hasEyeDropper,
		currentColorString,
		onPress
	];
}

class ButtonBar extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\Input.svelte generated by Svelte v3.55.0-cq */

function create_fragment$d(ctx) {
	let div1;
	let mounted;
	let dispose;

	return {
		c() {
			div1 = element("div");
			div1.innerHTML = `<div class="tjs-color-picker-input-inner svelte-z8tv2q"></div>`;
			attr(div1, "class", "tjs-color-picker-input svelte-z8tv2q");
			attr(div1, "role", "button");
			attr(div1, "tabindex", "0");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			/*div1_binding*/ ctx[2](div1);

			if (!mounted) {
				dispose = listen(div1, "click", /*onClick*/ ctx[1]);
				mounted = true;
			}
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
			/*div1_binding*/ ctx[2](null);
			mounted = false;
			dispose();
		}
	};
}

function instance$d($$self, $$props, $$invalidate) {
	let { inputEl = void 0 } = $$props;
	const internalState = getContext('#tjs-color-picker-state');
	const colorState = internalState.colorState;

	/**
 * Handles opening / closing popup; when opening saves current color on initial open.
 */
	function onClick() {
		if (!internalState.isOpen) {
			colorState.savePopupColor();
		}

		internalState.swapIsOpen();
	}

	function div1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			inputEl = $$value;
			$$invalidate(0, inputEl);
		});
	}

	$$self.$$set = $$props => {
		if ('inputEl' in $$props) $$invalidate(0, inputEl = $$props.inputEl);
	};

	return [inputEl, onClick, div1_binding];
}

class Input extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$d, create_fragment$d, safe_not_equal, { inputEl: 0 });
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\layout\MainLayout.svelte generated by Svelte v3.55.0-cq */

function create_if_block$4(ctx) {
	let main;
	let div;
	let switch_instance;
	let main_role_value;
	let main_transition;
	let current;
	let mounted;
	let dispose;
	var switch_value = /*$components*/ ctx[3].wrapper;

	function switch_props(ctx) {
		return {};
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props());
	}

	return {
		c() {
			main = element("main");
			div = element("div");
			if (switch_instance) create_component(switch_instance.$$.fragment);
			attr(div, "class", "tjs-color-picker-container svelte-tn84n8");
			attr(main, "class", "tjs-color-picker-main-layout svelte-tn84n8");
			attr(main, "tabindex", "-1");
			attr(main, "role", main_role_value = /*$isPopup*/ ctx[1] ? 'dialog' : 'none');
			attr(main, "aria-label", "color picker");
			toggle_class(main, "isOpen", /*$isOpen*/ ctx[2]);
			toggle_class(main, "isPopup", /*$isPopup*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, main, anchor);
			append(main, div);
			if (switch_instance) mount_component(switch_instance, div, null);
			/*main_binding*/ ctx[10](main);
			current = true;

			if (!mounted) {
				dispose = listen(main, "pointerdown", stop_propagation(/*onPointerDownLocal*/ ctx[7]));
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (switch_value !== (switch_value = /*$components*/ ctx[3].wrapper)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props());
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, div, null);
				} else {
					switch_instance = null;
				}
			}

			if (!current || dirty & /*$isPopup*/ 2 && main_role_value !== (main_role_value = /*$isPopup*/ ctx[1] ? 'dialog' : 'none')) {
				attr(main, "role", main_role_value);
			}

			if (!current || dirty & /*$isOpen*/ 4) {
				toggle_class(main, "isOpen", /*$isOpen*/ ctx[2]);
			}

			if (!current || dirty & /*$isPopup*/ 2) {
				toggle_class(main, "isPopup", /*$isPopup*/ ctx[1]);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

			add_render_callback(() => {
				if (!main_transition) main_transition = create_bidirectional_transition(main, /*updatePosition*/ ctx[8], {}, true);
				main_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			if (!main_transition) main_transition = create_bidirectional_transition(main, /*updatePosition*/ ctx[8], {}, false);
			main_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(main);
			if (switch_instance) destroy_component(switch_instance);
			/*main_binding*/ ctx[10](null);
			if (detaching && main_transition) main_transition.end();
			mounted = false;
			dispose();
		}
	};
}

function create_fragment$c(ctx) {
	let if_block_anchor;
	let current;
	let if_block = /*$isOpen*/ ctx[2] && create_if_block$4(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*$isOpen*/ ctx[2]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*$isOpen*/ 4) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$4(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$c($$self, $$props, $$invalidate) {
	let $isPopup;
	let $isOpen;
	let $components;
	let { containerEl = void 0 } = $$props;
	let { inputEl = void 0 } = $$props;
	const internalState = getContext('#tjs-color-picker-state');
	const { components, isOpen, isPopup } = internalState.stores;
	component_subscribe($$self, components, value => $$invalidate(3, $components = value));
	component_subscribe($$self, isOpen, value => $$invalidate(2, $isOpen = value));
	component_subscribe($$self, isPopup, value => $$invalidate(1, $isPopup = value));
	onDestroy(() => document.body.removeEventListener('pointerdown', onPointerDown));

	/**
 * Handles pointerdown events in popup mode that reach `document.body` to detect when the user clicks away from the
 * popup in order to close it.
 *
 * @param {PointerEvent}   event -
 */
	function onPointerDown(event) {
		// Early out if pointer down on container element or child element of wrapper.
		if (containerEl !== null && (event.target === containerEl || containerEl.contains(event.target))) {
			return;
		}

		// Remove listener.
		document.body.removeEventListener('pointerdown', onPointerDown);

		if ($isPopup) {
			// Close picker / popup.
			set_store_value(isOpen, $isOpen = false, $isOpen);
		}
	}

	/**
 * Handles pointerdown events and focuses the main container programmatically. This allows key events to be captured
 * in popup mode even when interactions where interactions are pointer driven. The container focus is not shown
 * visually.
 */
	function onPointerDownLocal() {
		if (containerEl) {
			containerEl.focus();
		}
	}

	/**
 * Provides a custom transition allowing inspection of the element to change positioning styles based on the
 * height / width of the element and the containing stacking context element. This allows the picker when in popup
 * mode to position in the most visible way inside the stacking context / app.
 *
 * TODO: Modify to use future TRL popup API to move popup outside of stacking context / app window.
 *
 * @param {HTMLElement} node - Container element.
 *
 * @returns {undefined} No transition object is returned.
 */
	function updatePosition(node) {
		// Clear any explicit absolute positioning styles when not in popup mode.
		if (!$isPopup) {
			node.style.top = null;
			node.style.bottom = null;
			node.style.left = null;
			node.style.right = null;
			return;
		}

		// Find parent stacking context. This usually is `window-app` or it could be the browser window.
		const result = getStackingContext(node.parentElement);

		if (!(result?.node instanceof HTMLElement)) {
			console.warn(`'TJSColordPicker.updatePosition warning: Could not locate parent stacking context element.`);
			return;
		}

		const stackingContextRect = result?.node.getBoundingClientRect();
		const nodeRect = node.getBoundingClientRect();
		const inputRect = inputEl.getBoundingClientRect();

		// Check to make sure that the menu width does not exceed the right side of the stacking context element.
		// If not open to the right.
		if (inputRect.x + nodeRect.width < stackingContextRect.right) {
			node.style.left = `0`;
			node.style.removeProperty('right');
		} else // Open left.
		{
			node.style.right = `0`;
			node.style.removeProperty('left');
		}

		let applyTop;

		// Test if popup fits inside stacking context downward.
		if (inputRect.y + inputRect.height + nodeRect.height > stackingContextRect.y + stackingContextRect.height) {
			// Only adjust to top if it actually fits upward otherwise apply top / downward
			applyTop = inputRect.y - nodeRect.height <= stackingContextRect.y;
		} else {
			applyTop = true;
		}

		if (applyTop) {
			node.style.removeProperty('bottom');
			node.style.top = `${inputRect.height}px`;
		} else {
			node.style.removeProperty('top');
			node.style.bottom = `${inputRect.height}px`;
		}
	}

	function main_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			containerEl = $$value;
			$$invalidate(0, containerEl);
		});
	}

	$$self.$$set = $$props => {
		if ('containerEl' in $$props) $$invalidate(0, containerEl = $$props.containerEl);
		if ('inputEl' in $$props) $$invalidate(9, inputEl = $$props.inputEl);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$isPopup, $isOpen, containerEl*/ 7) {
			if ($isPopup && $isOpen && containerEl) {
				document.body.addEventListener('pointerdown', onPointerDown, { capture: true });

				// Focus containerEl on next tick so that potential tab navigation in popup mode can be traversed in reverse.
				setTimeout(() => containerEl.focus(), 0);
			}
		}

		if ($$self.$$.dirty & /*$isPopup*/ 2) {
			// Sanity case to remove listener when `options.isPopup` state changes externally.
			if (!$isPopup) {
				document.body.removeEventListener('pointerdown', onPointerDown);
			}
		}
	};

	return [
		containerEl,
		$isPopup,
		$isOpen,
		$components,
		components,
		isOpen,
		isPopup,
		onPointerDownLocal,
		updatePosition,
		inputEl,
		main_binding
	];
}

class MainLayout extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$c, create_fragment$c, safe_not_equal, { containerEl: 0, inputEl: 9 });
	}
}

/**
 * Ease in out sin base function.
 *
 * @param {number}   x - param, between 1 and infinity
 *
 * @param {number}   min - starting return value, default .001
 *
 * @param {number}   max ending return value, default .01
 *
 * @returns {number} A number between min and max.
 */
function easeInOutSin(x, min = 0.001, max = 0.01)
{
   /**
    * after the delay, the ease in starts (i.e. after x = DELAY)*
    */
   const DELAY = 50;

   /**
    * Duration of the transition (i.e. bewteen x = DELAY and x = DELAY + DURATION)
    */
   const DURATION = 50;

   const X = Math.min(1, Math.max(1, x - DELAY) / DURATION);

   return min + ((max - min) / 2) * (1 - Math.cos(Math.PI * X));
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\Picker.svelte generated by Svelte v3.55.0-cq */

function create_default_slot$2(ctx) {
	let div;
	let switch_instance;
	let div_aria_valuetext_value;
	let current;
	let mounted;
	let dispose;
	var switch_value = /*$components*/ ctx[3].pickerIndicator;

	function switch_props(ctx) {
		return {
			props: {
				focused: /*$focused*/ ctx[4],
				styles: /*stylesPickerIndicator*/ ctx[2]
			}
		};
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
	}

	return {
		c() {
			div = element("div");
			if (switch_instance) create_component(switch_instance.$$.fragment);
			attr(div, "class", "picker svelte-187594h");
			attr(div, "tabindex", "0");
			attr(div, "aria-label", "saturation and brightness picker (arrow keyboard navigation)");
			attr(div, "aria-valuemin", 0);
			attr(div, "aria-valuemax", 100);
			attr(div, "aria-valuetext", div_aria_valuetext_value = "saturation " + /*pos*/ ctx[1].x?.toFixed() + "%, brightness " + /*pos*/ ctx[1].y?.toFixed() + "%");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (switch_instance) mount_component(switch_instance, div, null);
			/*div_binding*/ ctx[14](div);
			current = true;

			if (!mounted) {
				dispose = [
					listen(div, "pointerdown", prevent_default(/*onPointerDown*/ ctx[9])),
					listen(div, "pointermove", stop_propagation(prevent_default(/*onPointerMove*/ ctx[11]))),
					listen(div, "pointerup", stop_propagation(prevent_default(/*onPointerUp*/ ctx[10]))),
					action_destroyer(isFocused.call(null, div, /*focused*/ ctx[8])),
					action_destroyer(keyforward.call(null, div, /*keyStore*/ ctx[7]))
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			const switch_instance_changes = {};
			if (dirty & /*$focused*/ 16) switch_instance_changes.focused = /*$focused*/ ctx[4];
			if (dirty & /*stylesPickerIndicator*/ 4) switch_instance_changes.styles = /*stylesPickerIndicator*/ ctx[2];

			if (switch_value !== (switch_value = /*$components*/ ctx[3].pickerIndicator)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, div, null);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}

			if (!current || dirty & /*pos*/ 2 && div_aria_valuetext_value !== (div_aria_valuetext_value = "saturation " + /*pos*/ ctx[1].x?.toFixed() + "%, brightness " + /*pos*/ ctx[1].y?.toFixed() + "%")) {
				attr(div, "aria-valuetext", div_aria_valuetext_value);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (switch_instance) destroy_component(switch_instance);
			/*div_binding*/ ctx[14](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function create_fragment$b(ctx) {
	let switch_instance;
	let switch_instance_anchor;
	let current;
	var switch_value = /*$components*/ ctx[3].pickerWrapper;

	function switch_props(ctx) {
		return {
			props: {
				focused: /*focused*/ ctx[8],
				$$slots: { default: [create_default_slot$2] },
				$$scope: { ctx }
			}
		};
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
	}

	return {
		c() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m(target, anchor) {
			if (switch_instance) mount_component(switch_instance, target, anchor);
			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const switch_instance_changes = {};

			if (dirty & /*$$scope, pos, pickerEl, $components, $focused, stylesPickerIndicator*/ 4194335) {
				switch_instance_changes.$$scope = { dirty, ctx };
			}

			if (switch_value !== (switch_value = /*$components*/ ctx[3].pickerWrapper)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

function clamp(value, min, max) {
	return Math.min(Math.max(min, value), max);
}

function instance$b($$self, $$props, $$invalidate) {
	let $sv;
	let $keyStore;
	let $components;
	let $focused;
	let { pickerEl = void 0 } = $$props;
	const internalState = getContext('#tjs-color-picker-state');
	const constraint = getContext('#tjs-color-picker-constraint');
	const { components } = internalState.stores;
	component_subscribe($$self, components, value => $$invalidate(3, $components = value));
	const { sv } = internalState.colorState.stores;
	component_subscribe($$self, sv, value => $$invalidate(12, $sv = value));

	const stylesPickerIndicator = {
		background: 'var(--_tjs-color-picker-current-color-hsl)'
	};

	/**
 * @type {KeyStore}
 */
	const keyStore = new KeyStore(['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']);

	component_subscribe($$self, keyStore, value => $$invalidate(13, $keyStore = value));

	/** @type {boolean} */
	let isPointerDown = false;

	/**
 * @type {Writable<boolean>}
 */
	let focused = writable$1(false);

	component_subscribe($$self, focused, value => $$invalidate(4, $focused = value));

	/** @type {number | undefined} */
	let focusMovementIntervalId = void 0;

	/** @type {number} */
	let focusMovementCounter = void 0;

	/** @type {{ x: number, y: number }} */
	let pos = { x: 100, y: 0 };

	/**
 * @param {{ offsetX: number; offsetY: number }}    e -
 */
	function onClick(e) {
		const pointer = { x: e.offsetX, y: e.offsetY };
		const rect = pickerEl.getBoundingClientRect();
		let width = rect.width;
		let height = rect.height;

		set_store_value(
			sv,
			$sv = {
				s: clamp(pointer.x / width, 0, 1) * 100,
				v: clamp((height - pointer.y) / height, 0, 1) * 100
			},
			$sv
		);
	}

	/**
 * @param {KeyStore} keys
 */
	function move(keys) {
		if (keys.anyPressed()) {
			if (!focusMovementIntervalId) {
				focusMovementCounter = 0;

				focusMovementIntervalId = window.setInterval(
					() => {
						let focusMovementFactor = easeInOutSin(++focusMovementCounter);

						set_store_value(
							sv,
							$sv = {
								s: Math.min(100, Math.max(0, $sv.s + (keys.value('ArrowRight') - keys.value('ArrowLeft')) * focusMovementFactor * 100)),
								v: Math.min(100, Math.max(0, $sv.v + (keys.value('ArrowUp') - keys.value('ArrowDown')) * focusMovementFactor * 100))
							},
							$sv
						);
					},
					10
				);
			}
		} else if (focusMovementIntervalId) {
			clearInterval(focusMovementIntervalId);
			focusMovementIntervalId = void 0;
		}
	}

	/**
 * @param {PointerEvent} event -
 */
	function onPointerDown(event) {
		if (event.button === 0) {
			isPointerDown = true;
			pickerEl.setPointerCapture(event.pointerId);
			onClick(event);
		}
	}

	/**
 * @param {PointerEvent} event -
 */
	function onPointerUp(event) {
		isPointerDown = false;
		pickerEl.releasePointerCapture(event.pointerId);
	}

	/**
 * @param {PointerEvent} event -
 */
	function onPointerMove(event) {
		if (isPointerDown) {
			const rect = pickerEl.getBoundingClientRect();

			onClick({
				offsetX: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
				offsetY: Math.max(0, Math.min(rect.height, event.clientY - rect.top))
			});
		}
	}

	function div_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			pickerEl = $$value;
			$$invalidate(0, pickerEl);
		});
	}

	$$self.$$set = $$props => {
		if ('pickerEl' in $$props) $$invalidate(0, pickerEl = $$props.pickerEl);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$keyStore*/ 8192) {
			// When there is a change to keys monitored invoke `move`.
			move($keyStore);
		}

		if ($$self.$$.dirty & /*$sv, pickerEl, pos*/ 4099) {
			if (typeof $sv.s === 'number' && typeof $sv.v === 'number' && pickerEl) {
				$$invalidate(1, pos = { x: $sv.s, y: 100 - $sv.v });

				// Take into account the margin-left
				$$invalidate(2, stylesPickerIndicator.left = `calc(${pos.x / 100} * ${constraint.width}cqw - max(6px, 3.5cqw))`, stylesPickerIndicator);

				$$invalidate(2, stylesPickerIndicator.top = `calc(${pos.y / 100} * ${constraint.height}cqw - max(6px, 3.5cqw))`, stylesPickerIndicator);
			}
		}
	};

	return [
		pickerEl,
		pos,
		stylesPickerIndicator,
		$components,
		$focused,
		components,
		sv,
		keyStore,
		focused,
		onPointerDown,
		onPointerUp,
		onPointerMove,
		$sv,
		$keyStore,
		div_binding
	];
}

class Picker extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$b, create_fragment$b, safe_not_equal, { pickerEl: 0 });
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\SliderAlpha.svelte generated by Svelte v3.55.0-cq */

function create_default_slot$1(ctx) {
	let div;
	let switch_instance;
	let div_aria_valuenow_value;
	let div_aria_valuetext_value;
	let current;
	let mounted;
	let dispose;
	var switch_value = /*$components*/ ctx[3].alphaIndicator;

	function switch_props(ctx) {
		return {
			props: {
				focused: /*$focused*/ ctx[4],
				styles: /*stylesSliderIndicator*/ ctx[2]
			}
		};
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
	}

	return {
		c() {
			div = element("div");
			if (switch_instance) create_component(switch_instance.$$.fragment);
			attr(div, "class", "tjs-color-picker-slider svelte-13c495v");
			attr(div, "tabindex", "0");
			attr(div, "aria-label", "transparency picker (arrow keyboard navigation)");
			attr(div, "aria-valuemin", 0);
			attr(div, "aria-valuemax", 100);
			attr(div, "aria-valuenow", div_aria_valuenow_value = Math.round(/*pos*/ ctx[1]));
			attr(div, "aria-valuetext", div_aria_valuetext_value = "" + (/*pos*/ ctx[1]?.toFixed() + "%"));
			toggle_class(div, "horizontal", /*sliderHorizontal*/ ctx[5]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (switch_instance) mount_component(switch_instance, div, null);
			/*div_binding*/ ctx[16](div);
			current = true;

			if (!mounted) {
				dispose = [
					listen(div, "pointerdown", prevent_default(/*onPointerDown*/ ctx[10])),
					listen(div, "pointermove", stop_propagation(prevent_default(/*onPointerMove*/ ctx[12]))),
					listen(div, "pointerup", stop_propagation(prevent_default(/*onPointerUp*/ ctx[11]))),
					listen(div, "wheel", stop_propagation(prevent_default(/*onWheel*/ ctx[13]))),
					action_destroyer(isFocused.call(null, div, /*focused*/ ctx[9])),
					action_destroyer(keyforward.call(null, div, /*keyStore*/ ctx[8]))
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			const switch_instance_changes = {};
			if (dirty & /*$focused*/ 16) switch_instance_changes.focused = /*$focused*/ ctx[4];
			if (dirty & /*stylesSliderIndicator*/ 4) switch_instance_changes.styles = /*stylesSliderIndicator*/ ctx[2];

			if (switch_value !== (switch_value = /*$components*/ ctx[3].alphaIndicator)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, div, null);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}

			if (!current || dirty & /*pos*/ 2 && div_aria_valuenow_value !== (div_aria_valuenow_value = Math.round(/*pos*/ ctx[1]))) {
				attr(div, "aria-valuenow", div_aria_valuenow_value);
			}

			if (!current || dirty & /*pos*/ 2 && div_aria_valuetext_value !== (div_aria_valuetext_value = "" + (/*pos*/ ctx[1]?.toFixed() + "%"))) {
				attr(div, "aria-valuetext", div_aria_valuetext_value);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (switch_instance) destroy_component(switch_instance);
			/*div_binding*/ ctx[16](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function create_fragment$a(ctx) {
	let switch_instance;
	let switch_instance_anchor;
	let current;
	var switch_value = /*$components*/ ctx[3].alphaWrapper;

	function switch_props(ctx) {
		return {
			props: {
				$$slots: { default: [create_default_slot$1] },
				$$scope: { ctx }
			}
		};
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
	}

	return {
		c() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m(target, anchor) {
			if (switch_instance) mount_component(switch_instance, target, anchor);
			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const switch_instance_changes = {};

			if (dirty & /*$$scope, pos, sliderEl, $components, $focused, stylesSliderIndicator*/ 33554463) {
				switch_instance_changes.$$scope = { dirty, ctx };
			}

			if (switch_value !== (switch_value = /*$components*/ ctx[3].alphaWrapper)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

function instance$a($$self, $$props, $$invalidate) {
	let $alpha;
	let $keyStore;
	let $components;
	let $focused;
	const internalState = getContext('#tjs-color-picker-state');
	const sliderConstraint = getContext('#tjs-color-picker-slider-constraint');
	const sliderHorizontal = getContext('#tjs-color-picker-slider-horizontal');
	const { components } = internalState.stores;
	component_subscribe($$self, components, value => $$invalidate(3, $components = value));
	const { alpha } = internalState.colorState.stores;
	component_subscribe($$self, alpha, value => $$invalidate(14, $alpha = value));
	const stylesSliderIndicator = {};

	/**
 * Capture all arrow keys.
 *
 * @type {KeyStore}
 */
	const keyStore = new KeyStore(['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']);

	component_subscribe($$self, keyStore, value => $$invalidate(15, $keyStore = value));

	/**
 * Specific keys for either horizontal / vertical based on slider orientation to check.
 *
 * @type {string[]}
 */
	const targetKeys = sliderHorizontal
	? ['ArrowRight', 'ArrowLeft']
	: ['ArrowDown', 'ArrowUp'];

	/** @type {HTMLDivElement} */
	let sliderEl = void 0;

	/** @type {boolean} */
	let isPointerDown = false;

	/**
 * @type {Writable<boolean>}
 */
	let focused = writable$1(false);

	component_subscribe($$self, focused, value => $$invalidate(4, $focused = value));

	/** @type {number | undefined} */
	let focusMovementIntervalId = void 0;

	/** @type {number} */
	let focusMovementCounter = void 0;

	/** @type {number} */
	let pos = void 0;

	/**
 * @param {number}    constraint -
 */
	function onClick(constraint) {
		const rect = sliderEl.getBoundingClientRect();
		const size = sliderHorizontal ? rect.width : rect.height;
		const boundedPos = Math.max(0, Math.min(size, constraint));
		set_store_value(alpha, $alpha = boundedPos / size, $alpha);
	}

	/**
 * @param {KeyStore} keys -
 */
	function move(keys) {
		if (keys.anyPressed(targetKeys)) {
			if (!focusMovementIntervalId) {
				focusMovementCounter = 0;

				focusMovementIntervalId = window.setInterval(
					() => {
						const focusMovementFactor = easeInOutSin(++focusMovementCounter);

						const movement = sliderHorizontal
						? keys.value('ArrowRight') - keys.value('ArrowLeft')
						: keys.value('ArrowDown') - keys.value('ArrowUp');

						set_store_value(alpha, $alpha = Math.min(1, Math.max(0, internalState.colorState.alpha + movement * focusMovementFactor)), $alpha);
					},
					10
				);
			}
		} else if (focusMovementIntervalId) {
			clearInterval(focusMovementIntervalId);
			focusMovementIntervalId = void 0;
		}
	}

	/**
 * @param {PointerEvent} event -
 */
	function onPointerDown(event) {
		if (event.button === 0) {
			isPointerDown = true;
			sliderEl.setPointerCapture(event.pointerId);
			onClick(sliderHorizontal ? event.offsetX : event.offsetY);
		}
	}

	/**
 * @param {PointerEvent} event -
 */
	function onPointerUp(event) {
		isPointerDown = false;
		sliderEl.releasePointerCapture(event.pointerId);
	}

	/**
 * @param {PointerEvent} event -
 */
	function onPointerMove(event) {
		if (isPointerDown) {
			const rect = sliderEl.getBoundingClientRect();

			onClick(sliderHorizontal
			? event.clientX - rect.left
			: event.clientY - rect.top);
		}
	}

	/**
 * @param {WheelEvent}   event -
 */
	function onWheel(event) {
		if (event.deltaY !== 0) {
			set_store_value(alpha, $alpha = Math.max(0, Math.min(1, event.deltaY > 0 ? $alpha + 0.01 : $alpha - 0.01)), $alpha);
		}
	}

	function div_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			sliderEl = $$value;
			$$invalidate(0, sliderEl);
		});
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$keyStore*/ 32768) {
			// When there is a change to keys monitored invoke `move`.
			move($keyStore);
		}

		if ($$self.$$.dirty & /*$alpha, sliderEl*/ 16385) {
			if (typeof $alpha === 'number' && sliderEl) {
				$$invalidate(1, pos = 100 * $alpha);
			}
		}

		if ($$self.$$.dirty & /*pos*/ 2) {
			if (sliderHorizontal) {
				// max(6px, 4cqw) comes from SliderWrapper section padding offset.
				$$invalidate(2, stylesSliderIndicator.left = `calc(${pos / 100} * calc(${sliderConstraint}cqw - max(12px, 7cqw) - max(6px, 4cqw)))`, stylesSliderIndicator);

				$$invalidate(2, stylesSliderIndicator.top = null, stylesSliderIndicator);
			} else {
				$$invalidate(2, stylesSliderIndicator.left = null, stylesSliderIndicator);
				$$invalidate(2, stylesSliderIndicator.top = `calc(${pos / 100} * calc(${sliderConstraint}cqw - max(12px, 7cqw)))`, stylesSliderIndicator);
			}
		}
	};

	return [
		sliderEl,
		pos,
		stylesSliderIndicator,
		$components,
		$focused,
		sliderHorizontal,
		components,
		alpha,
		keyStore,
		focused,
		onPointerDown,
		onPointerUp,
		onPointerMove,
		onWheel,
		$alpha,
		$keyStore,
		div_binding
	];
}

class SliderAlpha extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\SliderHue.svelte generated by Svelte v3.55.0-cq */

function create_default_slot(ctx) {
	let div;
	let switch_instance;
	let div_aria_valuenow_value;
	let current;
	let mounted;
	let dispose;
	var switch_value = /*$components*/ ctx[3].sliderIndicator;

	function switch_props(ctx) {
		return {
			props: {
				focused: /*$focused*/ ctx[4],
				styles: /*stylesSliderIndicator*/ ctx[2]
			}
		};
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
	}

	return {
		c() {
			div = element("div");
			if (switch_instance) create_component(switch_instance.$$.fragment);
			attr(div, "class", "tjs-color-picker-slider svelte-o6ogr7");
			attr(div, "tabindex", "0");
			attr(div, "aria-label", "hue picker (arrow keyboard navigation)");
			attr(div, "aria-valuemin", 0);
			attr(div, "aria-valuemax", 360);
			attr(div, "aria-valuenow", div_aria_valuenow_value = Math.round(/*$hue*/ ctx[1]));
			toggle_class(div, "horizontal", /*sliderHorizontal*/ ctx[5]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (switch_instance) mount_component(switch_instance, div, null);
			/*div_binding*/ ctx[16](div);
			current = true;

			if (!mounted) {
				dispose = [
					listen(div, "pointerdown", prevent_default(/*onPointerDown*/ ctx[10])),
					listen(div, "pointermove", stop_propagation(prevent_default(/*onPointerMove*/ ctx[12]))),
					listen(div, "pointerup", stop_propagation(prevent_default(/*onPointerUp*/ ctx[11]))),
					listen(div, "wheel", stop_propagation(prevent_default(/*onWheel*/ ctx[13]))),
					action_destroyer(isFocused.call(null, div, /*focused*/ ctx[9])),
					action_destroyer(keyforward.call(null, div, /*keyStore*/ ctx[8]))
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			const switch_instance_changes = {};
			if (dirty & /*$focused*/ 16) switch_instance_changes.focused = /*$focused*/ ctx[4];
			if (dirty & /*stylesSliderIndicator*/ 4) switch_instance_changes.styles = /*stylesSliderIndicator*/ ctx[2];

			if (switch_value !== (switch_value = /*$components*/ ctx[3].sliderIndicator)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, div, null);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}

			if (!current || dirty & /*$hue*/ 2 && div_aria_valuenow_value !== (div_aria_valuenow_value = Math.round(/*$hue*/ ctx[1]))) {
				attr(div, "aria-valuenow", div_aria_valuenow_value);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (switch_instance) destroy_component(switch_instance);
			/*div_binding*/ ctx[16](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function create_fragment$9(ctx) {
	let switch_instance;
	let switch_instance_anchor;
	let current;
	var switch_value = /*$components*/ ctx[3].sliderWrapper;

	function switch_props(ctx) {
		return {
			props: {
				$$slots: { default: [create_default_slot] },
				$$scope: { ctx }
			}
		};
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
	}

	return {
		c() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m(target, anchor) {
			if (switch_instance) mount_component(switch_instance, target, anchor);
			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const switch_instance_changes = {};

			if (dirty & /*$$scope, $hue, sliderEl, $components, $focused, stylesSliderIndicator*/ 33554463) {
				switch_instance_changes.$$scope = { dirty, ctx };
			}

			if (switch_value !== (switch_value = /*$components*/ ctx[3].sliderWrapper)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

function instance$9($$self, $$props, $$invalidate) {
	let $hue;
	let $keyStore;
	let $components;
	let $focused;
	const internalState = getContext('#tjs-color-picker-state');
	const sliderConstraint = getContext('#tjs-color-picker-slider-constraint');
	const sliderHorizontal = getContext('#tjs-color-picker-slider-horizontal');
	const hue = internalState.colorState.stores.hue;
	component_subscribe($$self, hue, value => $$invalidate(1, $hue = value));
	const { components } = internalState.stores;
	component_subscribe($$self, components, value => $$invalidate(3, $components = value));

	const stylesSliderIndicator = {
		background: 'var(--_tjs-color-picker-current-color-hsl-hue)'
	};

	/**
 * Capture all arrow keys.
 *
 * @type {KeyStore}
 */
	const keyStore = new KeyStore(['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']);

	component_subscribe($$self, keyStore, value => $$invalidate(15, $keyStore = value));

	/**
 * Specific keys for either horizontal / vertical based on slider orientation to check.
 *
 * @type {string[]}
 */
	const targetKeys = sliderHorizontal
	? ['ArrowRight', 'ArrowLeft']
	: ['ArrowDown', 'ArrowUp'];

	/** @type {HTMLDivElement} */
	let sliderEl = void 0;

	/** @type {boolean} */
	let isPointerDown = false;

	/** @type {number} */
	let pos = 0;

	/**
 * @type {Writable<boolean>}
 */
	let focused = writable$1(false);

	component_subscribe($$self, focused, value => $$invalidate(4, $focused = value));

	/** @type {number | undefined} */
	let focusMovementIntervalId = void 0;

	/** @type {number} */
	let focusMovementCounter = void 0;

	/**
 * @param {number}    constraint -
 */
	function onClick(constraint) {
		const rect = sliderEl.getBoundingClientRect();
		const size = sliderHorizontal ? rect.width : rect.height;
		const boundedPos = Math.max(0, Math.min(size, constraint));
		set_store_value(hue, $hue = boundedPos / size * 360, $hue);
	}

	/**
 * @param {KeyStore} keys -
 */
	function move(keys) {
		if (keys.anyPressed(targetKeys)) {
			if (!focusMovementIntervalId) {
				focusMovementCounter = 0;

				focusMovementIntervalId = window.setInterval(
					() => {
						const focusMovementFactor = easeInOutSin(++focusMovementCounter);

						const movement = sliderHorizontal
						? keys.value('ArrowRight') - keys.value('ArrowLeft')
						: keys.value('ArrowDown') - keys.value('ArrowUp');

						set_store_value(hue, $hue = Math.min(360, Math.max(0, internalState.colorState.hue + movement * 360 * focusMovementFactor)), $hue);
					},
					10
				);
			}
		} else if (focusMovementIntervalId) {
			clearInterval(focusMovementIntervalId);
			focusMovementIntervalId = undefined;
		}
	}

	/**
 * @param {PointerEvent} event -
 */
	function onPointerDown(event) {
		if (event.button === 0) {
			isPointerDown = true;
			sliderEl.setPointerCapture(event.pointerId);
			onClick(sliderHorizontal ? event.offsetX : event.offsetY);
		}
	}

	/**
 * @param {PointerEvent} event -
 */
	function onPointerUp(event) {
		isPointerDown = false;
		sliderEl.releasePointerCapture(event.pointerId);
	}

	/**
 * @param {PointerEvent} event -
 */
	function onPointerMove(event) {
		if (isPointerDown) {
			const rect = sliderEl.getBoundingClientRect();

			onClick(sliderHorizontal
			? event.clientX - rect.left
			: event.clientY - rect.top);
		}
	}

	/**
 * @param {WheelEvent}   event -
 */
	function onWheel(event) {
		if (event.deltaY !== 0) {
			set_store_value(hue, $hue = Math.max(0, Math.min(360, event.deltaY > 0 ? $hue + 1 : $hue - 1)), $hue);
		}
	}

	function div_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			sliderEl = $$value;
			$$invalidate(0, sliderEl);
		});
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$keyStore*/ 32768) {
			// When there is a change to keys monitored invoke `move`.
			move($keyStore);
		}

		if ($$self.$$.dirty & /*$hue, sliderEl*/ 3) {
			if (typeof $hue === 'number' && sliderEl) {
				$$invalidate(14, pos = 100 * $hue / 360);
			}
		}

		if ($$self.$$.dirty & /*pos*/ 16384) {
			if (sliderHorizontal) {
				// max(6px, 4cqw) comes from SliderWrapper section padding offset.
				$$invalidate(2, stylesSliderIndicator.left = `calc(${pos / 100} * calc(${sliderConstraint}cqw - max(12px, 7cqw) - max(6px, 4cqw)))`, stylesSliderIndicator);

				$$invalidate(2, stylesSliderIndicator.top = null, stylesSliderIndicator);
			} else {
				$$invalidate(2, stylesSliderIndicator.left = null, stylesSliderIndicator);
				$$invalidate(2, stylesSliderIndicator.top = `calc(${pos / 100} * calc(${sliderConstraint}cqw - max(12px, 7cqw)))`, stylesSliderIndicator);
			}
		}
	};

	return [
		sliderEl,
		$hue,
		stylesSliderIndicator,
		$components,
		$focused,
		sliderHorizontal,
		hue,
		components,
		keyStore,
		focused,
		onPointerDown,
		onPointerUp,
		onPointerMove,
		onWheel,
		pos,
		$keyStore,
		div_binding
	];
}

class SliderHue extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\form\input\TJSInputNumber.svelte generated by Svelte v3.55.0-cq */

function create_fragment$8(ctx) {
	let div;
	let input_1;
	let applyStyles_action;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			input_1 = element("input");
			attr(input_1, "class", "tjs-input svelte-14v1m55");
			attr(input_1, "type", "number");
			attr(input_1, "max", /*max*/ ctx[1]);
			attr(input_1, "min", /*min*/ ctx[2]);
			attr(input_1, "step", /*step*/ ctx[4]);
			attr(input_1, "placeholder", /*placeholder*/ ctx[3]);
			input_1.disabled = /*disabled*/ ctx[0];
			toggle_class(input_1, "is-value-invalid", !/*$storeIsValid*/ ctx[10]);
			attr(div, "class", "tjs-input-container svelte-14v1m55");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, input_1);
			/*input_1_binding*/ ctx[16](input_1);
			set_input_value(input_1, /*$store*/ ctx[11]);

			if (!mounted) {
				dispose = [
					listen(input_1, "input", /*input_1_input_handler*/ ctx[17]),
					action_destroyer(autoBlur.call(null, input_1)),
					listen(input_1, "focusin", /*onFocusIn*/ ctx[12]),
					listen(input_1, "keydown", /*onKeyDown*/ ctx[13]),
					action_destroyer(/*efx*/ ctx[8].call(null, div)),
					action_destroyer(applyStyles_action = applyStyles.call(null, div, /*styles*/ ctx[7]))
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*max*/ 2) {
				attr(input_1, "max", /*max*/ ctx[1]);
			}

			if (dirty & /*min*/ 4) {
				attr(input_1, "min", /*min*/ ctx[2]);
			}

			if (dirty & /*step*/ 16) {
				attr(input_1, "step", /*step*/ ctx[4]);
			}

			if (dirty & /*placeholder*/ 8) {
				attr(input_1, "placeholder", /*placeholder*/ ctx[3]);
			}

			if (dirty & /*disabled*/ 1) {
				input_1.disabled = /*disabled*/ ctx[0];
			}

			if (dirty & /*$store*/ 2048 && to_number(input_1.value) !== /*$store*/ ctx[11]) {
				set_input_value(input_1, /*$store*/ ctx[11]);
			}

			if (dirty & /*$storeIsValid*/ 1024) {
				toggle_class(input_1, "is-value-invalid", !/*$storeIsValid*/ ctx[10]);
			}

			if (applyStyles_action && is_function(applyStyles_action.update) && dirty & /*styles*/ 128) applyStyles_action.update.call(null, /*styles*/ ctx[7]);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			/*input_1_binding*/ ctx[16](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$8($$self, $$props, $$invalidate) {
	let $storeIsValid,
		$$unsubscribe_storeIsValid = noop,
		$$subscribe_storeIsValid = () => ($$unsubscribe_storeIsValid(), $$unsubscribe_storeIsValid = subscribe(storeIsValid, $$value => $$invalidate(10, $storeIsValid = $$value)), storeIsValid);

	let $store,
		$$unsubscribe_store = noop,
		$$subscribe_store = () => ($$unsubscribe_store(), $$unsubscribe_store = subscribe(store, $$value => $$invalidate(11, $store = $$value)), store);

	$$self.$$.on_destroy.push(() => $$unsubscribe_storeIsValid());
	$$self.$$.on_destroy.push(() => $$unsubscribe_store());
	let { input = void 0 } = $$props;
	let { disabled = void 0 } = $$props;
	let { options = void 0 } = $$props;
	let { max = void 0 } = $$props;
	let { min = void 0 } = $$props;
	let { placeholder = void 0 } = $$props;
	let { step = void 0 } = $$props;
	let { store = void 0 } = $$props;
	$$subscribe_store();
	let { storeIsValid = void 0 } = $$props;
	$$subscribe_storeIsValid();
	let { styles = void 0 } = $$props;
	let { efx = void 0 } = $$props;

	const localOptions = {
		blurOnEnterKey: true,
		cancelOnEscKey: false
	};

	let inputEl;

	/** @type {number|null} */
	let initialValue;

	/**
 * Save initial value on focus. Convert to number or null the same way that Svelte does for binding `value`.
 */
	function onFocusIn() {
		if (localOptions.cancelOnEscKey) {
			initialValue = inputEl.value === ''
			? null
			: globalThis.parseFloat(inputEl.value);
		}
	}

	/**
 * Blur input on enter key down.
 *
 * @param {KeyboardEvent} event -
 */
	function onKeyDown(event) {
		if (localOptions.blurOnEnterKey && event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			inputEl.blur();
			return;
		}

		if (event.key === 'Escape') {
			if (localOptions.cancelOnEscKey && (initialValue === null || typeof initialValue === 'number')) {
				event.preventDefault();
				event.stopPropagation();
				store.set(initialValue);
				initialValue = void 0;
				inputEl.blur();
			}
		}
	}

	function input_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			inputEl = $$value;
			$$invalidate(9, inputEl);
		});
	}

	function input_1_input_handler() {
		$store = to_number(this.value);
		store.set($store);
	}

	$$self.$$set = $$props => {
		if ('input' in $$props) $$invalidate(15, input = $$props.input);
		if ('disabled' in $$props) $$invalidate(0, disabled = $$props.disabled);
		if ('options' in $$props) $$invalidate(14, options = $$props.options);
		if ('max' in $$props) $$invalidate(1, max = $$props.max);
		if ('min' in $$props) $$invalidate(2, min = $$props.min);
		if ('placeholder' in $$props) $$invalidate(3, placeholder = $$props.placeholder);
		if ('step' in $$props) $$invalidate(4, step = $$props.step);
		if ('store' in $$props) $$subscribe_store($$invalidate(5, store = $$props.store));
		if ('storeIsValid' in $$props) $$subscribe_storeIsValid($$invalidate(6, storeIsValid = $$props.storeIsValid));
		if ('styles' in $$props) $$invalidate(7, styles = $$props.styles);
		if ('efx' in $$props) $$invalidate(8, efx = $$props.efx);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*input, disabled*/ 32769) {
			$$invalidate(0, disabled = isObject(input) && typeof input.disabled === 'boolean'
			? input.disabled
			: typeof disabled === 'boolean' ? disabled : false);
		}

		if ($$self.$$.dirty & /*input, options*/ 49152) {
			{
				$$invalidate(14, options = isObject(input) && isObject(input.options)
				? input.options
				: isObject(options) ? options : {});

				if (typeof options?.blurOnEnterKey === 'boolean') {
					localOptions.blurOnEnterKey = options.blurOnEnterKey;
				}

				if (typeof options?.cancelOnEscKey === 'boolean') {
					localOptions.cancelOnEscKey = options.cancelOnEscKey;
				}
			}
		}

		if ($$self.$$.dirty & /*input, max*/ 32770) {
			$$invalidate(1, max = isObject(input) && typeof input.max === 'number'
			? input.max
			: typeof max === 'number' ? max : void 0);
		}

		if ($$self.$$.dirty & /*input, min*/ 32772) {
			$$invalidate(2, min = isObject(input) && typeof input.min === 'number'
			? input.min
			: typeof min === 'number' ? min : void 0);
		}

		if ($$self.$$.dirty & /*input, placeholder*/ 32776) {
			$$invalidate(3, placeholder = isObject(input) && typeof input.placeholder === 'string'
			? localize(input.placeholder)
			: typeof placeholder === 'string'
				? localize(placeholder)
				: void 0);
		}

		if ($$self.$$.dirty & /*input, step*/ 32784) {
			$$invalidate(4, step = isObject(input) && typeof input.step === 'number'
			? input.step
			: typeof step === 'number' ? step : void 0);
		}

		if ($$self.$$.dirty & /*input, store*/ 32800) {
			$$subscribe_store($$invalidate(5, store = isObject(input) && isWritableStore(input.store)
			? input.store
			: isWritableStore(store) ? store : writable$1(void 0)));
		}

		if ($$self.$$.dirty & /*input, storeIsValid*/ 32832) {
			$$subscribe_storeIsValid($$invalidate(6, storeIsValid = isObject(input) && isReadableStore(input.storeIsValid)
			? input.storeIsValid
			: isReadableStore(storeIsValid)
				? storeIsValid
				: writable$1(true)));
		}

		if ($$self.$$.dirty & /*input, storeIsValid*/ 32832) {
			$$subscribe_storeIsValid($$invalidate(6, storeIsValid = isObject(input) && isReadableStore(input.storeIsValid)
			? input.storeIsValid
			: isReadableStore(storeIsValid)
				? storeIsValid
				: writable$1(true)));
		}

		if ($$self.$$.dirty & /*input, styles*/ 32896) {
			$$invalidate(7, styles = isObject(input) && isObject(input.styles)
			? input.styles
			: typeof styles === 'object' ? styles : void 0);
		}

		if ($$self.$$.dirty & /*input, efx*/ 33024) {
			$$invalidate(8, efx = isObject(input) && typeof input.efx === 'function'
			? input.efx
			: typeof efx === 'function'
				? efx
				: () => {
						
					});
		}
	};

	return [
		disabled,
		max,
		min,
		placeholder,
		step,
		store,
		storeIsValid,
		styles,
		efx,
		inputEl,
		$storeIsValid,
		$store,
		onFocusIn,
		onKeyDown,
		options,
		input,
		input_1_binding,
		input_1_input_handler
	];
}

class TJSInputNumber extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
			input: 15,
			disabled: 0,
			options: 14,
			max: 1,
			min: 2,
			placeholder: 3,
			step: 4,
			store: 5,
			storeIsValid: 6,
			styles: 7,
			efx: 8
		});
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\form\input\TJSInputText.svelte generated by Svelte v3.55.0-cq */

function create_fragment$7(ctx) {
	let div;
	let input_1;
	let applyStyles_action;
	let mounted;
	let dispose;

	let input_1_levels = [
		{ class: "tjs-input" },
		{ type: /*type*/ ctx[0] },
		{ placeholder: /*placeholder*/ ctx[2] },
		{ disabled: /*disabled*/ ctx[1] }
	];

	let input_1_data = {};

	for (let i = 0; i < input_1_levels.length; i += 1) {
		input_1_data = assign(input_1_data, input_1_levels[i]);
	}

	return {
		c() {
			div = element("div");
			input_1 = element("input");
			set_attributes(input_1, input_1_data);
			toggle_class(input_1, "is-value-invalid", !/*$storeIsValid*/ ctx[8]);
			toggle_class(input_1, "svelte-1uhyvg8", true);
			attr(div, "class", "tjs-input-container svelte-1uhyvg8");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, input_1);
			if (input_1.autofocus) input_1.focus();
			/*input_1_binding*/ ctx[14](input_1);
			set_input_value(input_1, /*$store*/ ctx[9]);

			if (!mounted) {
				dispose = [
					listen(input_1, "input", /*input_1_input_handler*/ ctx[15]),
					action_destroyer(autoBlur.call(null, input_1)),
					listen(input_1, "focusin", /*onFocusIn*/ ctx[10]),
					listen(input_1, "keydown", /*onKeyDown*/ ctx[11]),
					action_destroyer(/*efx*/ ctx[6].call(null, div)),
					action_destroyer(applyStyles_action = applyStyles.call(null, div, /*styles*/ ctx[5]))
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			set_attributes(input_1, input_1_data = get_spread_update(input_1_levels, [
				{ class: "tjs-input" },
				dirty & /*type*/ 1 && { type: /*type*/ ctx[0] },
				dirty & /*placeholder*/ 4 && { placeholder: /*placeholder*/ ctx[2] },
				dirty & /*disabled*/ 2 && { disabled: /*disabled*/ ctx[1] }
			]));

			if (dirty & /*$store*/ 512 && input_1.value !== /*$store*/ ctx[9]) {
				set_input_value(input_1, /*$store*/ ctx[9]);
			}

			toggle_class(input_1, "is-value-invalid", !/*$storeIsValid*/ ctx[8]);
			toggle_class(input_1, "svelte-1uhyvg8", true);
			if (applyStyles_action && is_function(applyStyles_action.update) && dirty & /*styles*/ 32) applyStyles_action.update.call(null, /*styles*/ ctx[5]);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			/*input_1_binding*/ ctx[14](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$7($$self, $$props, $$invalidate) {
	let $storeIsValid,
		$$unsubscribe_storeIsValid = noop,
		$$subscribe_storeIsValid = () => ($$unsubscribe_storeIsValid(), $$unsubscribe_storeIsValid = subscribe(storeIsValid, $$value => $$invalidate(8, $storeIsValid = $$value)), storeIsValid);

	let $store,
		$$unsubscribe_store = noop,
		$$subscribe_store = () => ($$unsubscribe_store(), $$unsubscribe_store = subscribe(store, $$value => $$invalidate(9, $store = $$value)), store);

	$$self.$$.on_destroy.push(() => $$unsubscribe_storeIsValid());
	$$self.$$.on_destroy.push(() => $$unsubscribe_store());
	let { input = void 0 } = $$props;
	let { type = void 0 } = $$props;
	let { disabled = void 0 } = $$props;
	let { options = void 0 } = $$props;
	let { placeholder = void 0 } = $$props;
	let { store = void 0 } = $$props;
	$$subscribe_store();
	let { storeIsValid = void 0 } = $$props;
	$$subscribe_storeIsValid();
	let { styles = void 0 } = $$props;
	let { efx = void 0 } = $$props;

	const localOptions = {
		blurOnEnterKey: true,
		cancelOnEscKey: false,
		clearOnEscKey: false
	};

	let inputEl;
	let initialValue;

	function onFocusIn(event) {
		initialValue = localOptions.cancelOnEscKey ? inputEl.value : void 0;
	}

	/**
 * Blur input on enter key down.
 *
 * @param {KeyboardEvent} event -
 */
	function onKeyDown(event) {
		if (localOptions.blurOnEnterKey && event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			inputEl.blur();
			return;
		}

		if (event.key === 'Escape') {
			if (localOptions.cancelOnEscKey && typeof initialValue === 'string') {
				event.preventDefault();
				event.stopPropagation();
				store.set(initialValue);
				initialValue = void 0;
				inputEl.blur();
			} else if (localOptions.clearOnEscKey) {
				event.preventDefault();
				event.stopPropagation();
				store.set('');
				inputEl.blur();
			}
		}
	}

	function input_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			inputEl = $$value;
			$$invalidate(7, inputEl);
		});
	}

	function input_1_input_handler() {
		$store = this.value;
		store.set($store);
	}

	$$self.$$set = $$props => {
		if ('input' in $$props) $$invalidate(13, input = $$props.input);
		if ('type' in $$props) $$invalidate(0, type = $$props.type);
		if ('disabled' in $$props) $$invalidate(1, disabled = $$props.disabled);
		if ('options' in $$props) $$invalidate(12, options = $$props.options);
		if ('placeholder' in $$props) $$invalidate(2, placeholder = $$props.placeholder);
		if ('store' in $$props) $$subscribe_store($$invalidate(3, store = $$props.store));
		if ('storeIsValid' in $$props) $$subscribe_storeIsValid($$invalidate(4, storeIsValid = $$props.storeIsValid));
		if ('styles' in $$props) $$invalidate(5, styles = $$props.styles);
		if ('efx' in $$props) $$invalidate(6, efx = $$props.efx);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*input, type*/ 8193) {
			{
				$$invalidate(0, type = isObject(input) && typeof input.type === 'string'
				? input.type
				: typeof type === 'string' ? type : 'text');

				switch (type) {
					case 'email':
					case 'password':
					case 'search':
					case 'text':
					case 'url':
						break;
					default:
						throw new Error(`'TJSInputText only supports text input types: 'email', 'password', 'search', 'text', 'url'.`);
				}
			}
		}

		if ($$self.$$.dirty & /*input, disabled*/ 8194) {
			$$invalidate(1, disabled = isObject(input) && typeof input.disabled === 'boolean'
			? input.disabled
			: typeof disabled === 'boolean' ? disabled : false);
		}

		if ($$self.$$.dirty & /*input, options*/ 12288) {
			{
				$$invalidate(12, options = isObject(input) && isObject(input.options)
				? input.options
				: isObject(options) ? options : {});

				if (typeof options?.blurOnEnterKey === 'boolean') {
					localOptions.blurOnEnterKey = options.blurOnEnterKey;
				}

				if (typeof options?.cancelOnEscKey === 'boolean') {
					localOptions.cancelOnEscKey = options.cancelOnEscKey;
				}

				if (typeof options?.clearOnEscKey === 'boolean') {
					localOptions.clearOnEscKey = options.clearOnEscKey;
				}
			}
		}

		if ($$self.$$.dirty & /*input, placeholder*/ 8196) {
			$$invalidate(2, placeholder = isObject(input) && typeof input.placeholder === 'string'
			? localize(input.placeholder)
			: typeof placeholder === 'string'
				? localize(placeholder)
				: void 0);
		}

		if ($$self.$$.dirty & /*input, store*/ 8200) {
			$$subscribe_store($$invalidate(3, store = isObject(input) && isWritableStore(input.store)
			? input.store
			: isWritableStore(store) ? store : writable$1(void 0)));
		}

		if ($$self.$$.dirty & /*input, storeIsValid*/ 8208) {
			$$subscribe_storeIsValid($$invalidate(4, storeIsValid = isObject(input) && isReadableStore(input.storeIsValid)
			? input.storeIsValid
			: isReadableStore(storeIsValid)
				? storeIsValid
				: writable$1(true)));
		}

		if ($$self.$$.dirty & /*input, styles*/ 8224) {
			$$invalidate(5, styles = isObject(input) && isObject(input.styles)
			? input.styles
			: typeof styles === 'object' ? styles : void 0);
		}

		if ($$self.$$.dirty & /*input, efx*/ 8256) {
			$$invalidate(6, efx = isObject(input) && typeof input.efx === 'function'
			? input.efx
			: typeof efx === 'function'
				? efx
				: () => {
						
					});
		}
	};

	return [
		type,
		disabled,
		placeholder,
		store,
		storeIsValid,
		styles,
		efx,
		inputEl,
		$storeIsValid,
		$store,
		onFocusIn,
		onKeyDown,
		options,
		input,
		input_1_binding,
		input_1_input_handler
	];
}

class TJSInputText extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
			input: 13,
			type: 0,
			disabled: 1,
			options: 12,
			placeholder: 2,
			store: 3,
			storeIsValid: 4,
			styles: 5,
			efx: 6
		});
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\form\input\TJSInput.svelte generated by Svelte v3.55.0-cq */

function create_fragment$6(ctx) {
	let switch_instance;
	let switch_instance_anchor;
	let current;
	var switch_value = /*component*/ ctx[1];

	function switch_props(ctx) {
		return { props: { input: /*input*/ ctx[0] } };
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
	}

	return {
		c() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m(target, anchor) {
			if (switch_instance) mount_component(switch_instance, target, anchor);
			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const switch_instance_changes = {};
			if (dirty & /*input*/ 1) switch_instance_changes.input = /*input*/ ctx[0];

			if (switch_value !== (switch_value = /*component*/ ctx[1])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

function instance$6($$self, $$props, $$invalidate) {
	let { input = void 0 } = $$props;
	let component;

	$$self.$$set = $$props => {
		if ('input' in $$props) $$invalidate(0, input = $$props.input);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*input*/ 1) {
			{
				const type = isObject(input) && typeof input.type === 'string'
				? input.type
				: 'text';

				switch (type) {
					case 'email':
					case 'password':
					case 'search':
					case 'text':
					case 'url':
						$$invalidate(1, component = TJSInputText);
						break;
					case 'number':
						$$invalidate(1, component = TJSInputNumber);
						break;
					default:
						throw new Error(`'TJSInput' currently only supports text input types: 'email', 'number', 'password', 'search', 'text', 'url'.`);
				}
			}
		}
	};

	return [input, component];
}

class TJSInput extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$6, create_fragment$6, safe_not_equal, { input: 0 });
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\TextInput.svelte generated by Svelte v3.55.0-cq */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[16] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[16] = list[i];
	return child_ctx;
}

// (59:6) {#each $activeTextState.inputData as input (input.pickerLabel)}
function create_each_block_1(key_1, ctx) {
	let first;
	let tjsinput;
	let current;
	tjsinput = new TJSInput({ props: { input: /*input*/ ctx[16] } });

	return {
		key: key_1,
		first: null,
		c() {
			first = empty();
			create_component(tjsinput.$$.fragment);
			this.first = first;
		},
		m(target, anchor) {
			insert(target, first, anchor);
			mount_component(tjsinput, target, anchor);
			current = true;
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			const tjsinput_changes = {};
			if (dirty & /*$activeTextState*/ 2) tjsinput_changes.input = /*input*/ ctx[16];
			tjsinput.$set(tjsinput_changes);
		},
		i(local) {
			if (current) return;
			transition_in(tjsinput.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(tjsinput.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(first);
			destroy_component(tjsinput, detaching);
		}
	};
}

// (62:6) {#if $hasAlpha && $activeTextState.hasAlpha}
function create_if_block_1$2(ctx) {
	let tjsinput;
	let current;
	tjsinput = new TJSInput({ props: { input: /*alpha*/ ctx[8] } });

	return {
		c() {
			create_component(tjsinput.$$.fragment);
		},
		m(target, anchor) {
			mount_component(tjsinput, target, anchor);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(tjsinput.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(tjsinput.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(tjsinput, detaching);
		}
	};
}

// (75:6) {#each $activeTextState.inputData as input (input.pickerLabel)}
function create_each_block(key_1, ctx) {
	let span;
	let t_value = /*input*/ ctx[16].pickerLabel + "";
	let t;

	return {
		key: key_1,
		first: null,
		c() {
			span = element("span");
			t = text(t_value);
			attr(span, "class", "svelte-g5ivbx");
			this.first = span;
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*$activeTextState*/ 2 && t_value !== (t_value = /*input*/ ctx[16].pickerLabel + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (78:6) {#if $hasAlpha && $activeTextState.hasAlpha}
function create_if_block$3(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "A";
			attr(span, "class", "svelte-g5ivbx");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

function create_fragment$5(ctx) {
	let div2;
	let div0;
	let each_blocks_1 = [];
	let each0_lookup = new Map();
	let t0;
	let t1;
	let div1;
	let each_blocks = [];
	let each1_lookup = new Map();
	let t2;
	let div1_tabindex_value;
	let current;
	let mounted;
	let dispose;
	let each_value_1 = /*$activeTextState*/ ctx[1].inputData;
	const get_key = ctx => /*input*/ ctx[16].pickerLabel;

	for (let i = 0; i < each_value_1.length; i += 1) {
		let child_ctx = get_each_context_1(ctx, each_value_1, i);
		let key = get_key(child_ctx);
		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
	}

	let if_block0 = /*$hasAlpha*/ ctx[2] && /*$activeTextState*/ ctx[1].hasAlpha && create_if_block_1$2(ctx);
	let each_value = /*$activeTextState*/ ctx[1].inputData;
	const get_key_1 = ctx => /*input*/ ctx[16].pickerLabel;

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context(ctx, each_value, i);
		let key = get_key_1(child_ctx);
		each1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
	}

	let if_block1 = /*$hasAlpha*/ ctx[2] && /*$activeTextState*/ ctx[1].hasAlpha && create_if_block$3();

	return {
		c() {
			div2 = element("div");
			div0 = element("div");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t0 = space();
			if (if_block0) if_block0.c();
			t1 = space();
			div1 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t2 = space();
			if (if_block1) if_block1.c();
			attr(div0, "class", "input-container svelte-g5ivbx");
			attr(div1, "class", "input-attributes svelte-g5ivbx");
			attr(div1, "role", "button");
			attr(div1, "aria-label", "next color format");
			attr(div1, "tabindex", div1_tabindex_value = !/*$lockTextFormat*/ ctx[0] ? 0 : -1);
			toggle_class(div1, "lock-text-format", /*$lockTextFormat*/ ctx[0]);
			attr(div2, "class", "picker-text-input svelte-g5ivbx");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(div0, null);
			}

			append(div0, t0);
			if (if_block0) if_block0.m(div0, null);
			append(div2, t1);
			append(div2, div1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div1, null);
			}

			append(div1, t2);
			if (if_block1) if_block1.m(div1, null);
			current = true;

			if (!mounted) {
				dispose = [
					listen(div1, "click", prevent_default(/*onClick*/ ctx[9])),
					listen(div1, "keydown", onKeydown),
					listen(div1, "keyup", /*onKeyup*/ ctx[10])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*$activeTextState*/ 2) {
				each_value_1 = /*$activeTextState*/ ctx[1].inputData;
				group_outros();
				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, div0, outro_and_destroy_block, create_each_block_1, t0, get_each_context_1);
				check_outros();
			}

			if (/*$hasAlpha*/ ctx[2] && /*$activeTextState*/ ctx[1].hasAlpha) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty & /*$hasAlpha, $activeTextState*/ 6) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_1$2(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(div0, null);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (dirty & /*$activeTextState*/ 2) {
				each_value = /*$activeTextState*/ ctx[1].inputData;
				each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, div1, destroy_block, create_each_block, t2, get_each_context);
			}

			if (/*$hasAlpha*/ ctx[2] && /*$activeTextState*/ ctx[1].hasAlpha) {
				if (if_block1) ; else {
					if_block1 = create_if_block$3();
					if_block1.c();
					if_block1.m(div1, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (!current || dirty & /*$lockTextFormat*/ 1 && div1_tabindex_value !== (div1_tabindex_value = !/*$lockTextFormat*/ ctx[0] ? 0 : -1)) {
				attr(div1, "tabindex", div1_tabindex_value);
			}

			if (!current || dirty & /*$lockTextFormat*/ 1) {
				toggle_class(div1, "lock-text-format", /*$lockTextFormat*/ ctx[0]);
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value_1.length; i += 1) {
				transition_in(each_blocks_1[i]);
			}

			transition_in(if_block0);
			current = true;
		},
		o(local) {
			for (let i = 0; i < each_blocks_1.length; i += 1) {
				transition_out(each_blocks_1[i]);
			}

			transition_out(if_block0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div2);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].d();
			}

			if (if_block0) if_block0.d();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d();
			}

			if (if_block1) if_block1.d();
			mounted = false;
			run_all(dispose);
		}
	};
}

function onKeydown(event) {
	if (event.code === 'Space') {
		event.preventDefault();
		event.stopPropagation();
	}
}

function instance$5($$self, $$props, $$invalidate) {
	let $lockTextFormat;
	let $isOpen;
	let $isPopup;
	let $activeTextState;
	let $hasAlpha;
	const internalState = getContext('#tjs-color-picker-state');
	const colorState = internalState.colorState;
	const { hasAlpha, isOpen, isPopup, lockTextFormat } = internalState.stores;
	component_subscribe($$self, hasAlpha, value => $$invalidate(2, $hasAlpha = value));
	component_subscribe($$self, isOpen, value => $$invalidate(11, $isOpen = value));
	component_subscribe($$self, isPopup, value => $$invalidate(12, $isPopup = value));
	component_subscribe($$self, lockTextFormat, value => $$invalidate(0, $lockTextFormat = value));
	const { textState } = colorState.stores;
	const activeTextState = textState.activeState;
	component_subscribe($$self, activeTextState, value => $$invalidate(1, $activeTextState = value));
	const { alpha } = textState.alpha.inputData;

	/**
 * Advances color format on click.
 */
	function onClick() {
		if (!$lockTextFormat) {
			activeTextState.next();
		}
	}

	/**
 * Advances color format on `Space` key up.
 *
 * @param {KeyboardEvent}  event -
 */
	function onKeyup(event) {
		if (!$lockTextFormat && event.code === 'Space') {
			activeTextState.next();
			event.preventDefault();
			event.stopPropagation();
		}
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$isPopup, $isOpen*/ 6144) {
			/**
 * When in popout mode and not open reset active text state to the current color format.
 */
			if ($isPopup && !$isOpen) {
				activeTextState.setFormat(colorState.format);
			}
		}
	};

	return [
		$lockTextFormat,
		$activeTextState,
		$hasAlpha,
		hasAlpha,
		isOpen,
		isPopup,
		lockTextFormat,
		activeTextState,
		alpha,
		onClick,
		onKeyup,
		$isOpen,
		$isPopup
	];
}

class TextInput extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\layout\default\Wrapper.svelte generated by Svelte v3.55.0-cq */

function create_if_block_3$1(ctx) {
	let slideralpha;
	let current;
	slideralpha = new SliderAlpha({});

	return {
		c() {
			create_component(slideralpha.$$.fragment);
		},
		m(target, anchor) {
			mount_component(slideralpha, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(slideralpha.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(slideralpha.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(slideralpha, detaching);
		}
	};
}

// (75:8) {#if $hasTextInput}
function create_if_block_2$1(ctx) {
	let textinput;
	let current;
	textinput = new TextInput({});

	return {
		c() {
			create_component(textinput.$$.fragment);
		},
		m(target, anchor) {
			mount_component(textinput, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(textinput.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(textinput.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(textinput, detaching);
		}
	};
}

// (78:8) {#if $hasButtonBar}
function create_if_block_1$1(ctx) {
	let buttonbar;
	let current;
	buttonbar = new ButtonBar({});

	return {
		c() {
			create_component(buttonbar.$$.fragment);
		},
		m(target, anchor) {
			mount_component(buttonbar, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(buttonbar.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(buttonbar.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(buttonbar, detaching);
		}
	};
}

// (81:8) {#if $hasAddons}
function create_if_block$2(ctx) {
	let addonpanel;
	let current;
	addonpanel = new AddOnPanel({});

	return {
		c() {
			create_component(addonpanel.$$.fragment);
		},
		m(target, anchor) {
			mount_component(addonpanel, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(addonpanel.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(addonpanel.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(addonpanel, detaching);
		}
	};
}

function create_fragment$4(ctx) {
	let div;
	let section0;
	let picker;
	let updating_pickerEl;
	let t0;
	let sliderhue;
	let t1;
	let t2;
	let section1;
	let t3;
	let t4;
	let t5;
	let switch_instance;
	let switch_instance_anchor;
	let current;

	function picker_pickerEl_binding(value) {
		/*picker_pickerEl_binding*/ ctx[18](value);
	}

	let picker_props = {};

	if (/*pickerEl*/ ctx[1] !== void 0) {
		picker_props.pickerEl = /*pickerEl*/ ctx[1];
	}

	picker = new Picker({ props: picker_props });
	binding_callbacks.push(() => bind$1(picker, 'pickerEl', picker_pickerEl_binding, /*pickerEl*/ ctx[1]));
	sliderhue = new SliderHue({});
	let if_block0 = /*$hasAlpha*/ ctx[2] && create_if_block_3$1();
	let if_block1 = /*$hasTextInput*/ ctx[4] && create_if_block_2$1();
	let if_block2 = /*$hasButtonBar*/ ctx[5] && create_if_block_1$1();
	let if_block3 = /*$hasAddons*/ ctx[3] && create_if_block$2();
	var switch_value = /*$components*/ ctx[6].focusWrap;

	function switch_props(ctx) {
		return {};
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props());
	}

	return {
		c() {
			div = element("div");
			section0 = element("section");
			create_component(picker.$$.fragment);
			t0 = space();
			create_component(sliderhue.$$.fragment);
			t1 = space();
			if (if_block0) if_block0.c();
			t2 = space();
			section1 = element("section");
			if (if_block1) if_block1.c();
			t3 = space();
			if (if_block2) if_block2.c();
			t4 = space();
			if (if_block3) if_block3.c();
			t5 = space();
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
			attr(section0, "class", "main svelte-1cbvxxt");
			attr(section1, "class", "extra svelte-1cbvxxt");
			toggle_class(section1, "display-none", !(/*$hasAddons*/ ctx[3] || /*$hasTextInput*/ ctx[4] || /*$hasButtonBar*/ ctx[5]));
			attr(div, "class", "tjs-color-picker-wrapper svelte-1cbvxxt");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, section0);
			mount_component(picker, section0, null);
			append(section0, t0);
			mount_component(sliderhue, section0, null);
			append(section0, t1);
			if (if_block0) if_block0.m(section0, null);
			append(div, t2);
			append(div, section1);
			if (if_block1) if_block1.m(section1, null);
			append(section1, t3);
			if (if_block2) if_block2.m(section1, null);
			append(section1, t4);
			if (if_block3) if_block3.m(section1, null);
			/*div_binding*/ ctx[19](div);
			insert(target, t5, anchor);
			if (switch_instance) mount_component(switch_instance, target, anchor);
			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const picker_changes = {};

			if (!updating_pickerEl && dirty & /*pickerEl*/ 2) {
				updating_pickerEl = true;
				picker_changes.pickerEl = /*pickerEl*/ ctx[1];
				add_flush_callback(() => updating_pickerEl = false);
			}

			picker.$set(picker_changes);

			if (/*$hasAlpha*/ ctx[2]) {
				if (if_block0) {
					if (dirty & /*$hasAlpha*/ 4) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_3$1();
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(section0, null);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (/*$hasTextInput*/ ctx[4]) {
				if (if_block1) {
					if (dirty & /*$hasTextInput*/ 16) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block_2$1();
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(section1, t3);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}

			if (/*$hasButtonBar*/ ctx[5]) {
				if (if_block2) {
					if (dirty & /*$hasButtonBar*/ 32) {
						transition_in(if_block2, 1);
					}
				} else {
					if_block2 = create_if_block_1$1();
					if_block2.c();
					transition_in(if_block2, 1);
					if_block2.m(section1, t4);
				}
			} else if (if_block2) {
				group_outros();

				transition_out(if_block2, 1, 1, () => {
					if_block2 = null;
				});

				check_outros();
			}

			if (/*$hasAddons*/ ctx[3]) {
				if (if_block3) {
					if (dirty & /*$hasAddons*/ 8) {
						transition_in(if_block3, 1);
					}
				} else {
					if_block3 = create_if_block$2();
					if_block3.c();
					transition_in(if_block3, 1);
					if_block3.m(section1, null);
				}
			} else if (if_block3) {
				group_outros();

				transition_out(if_block3, 1, 1, () => {
					if_block3 = null;
				});

				check_outros();
			}

			if (!current || dirty & /*$hasAddons, $hasTextInput, $hasButtonBar*/ 56) {
				toggle_class(section1, "display-none", !(/*$hasAddons*/ ctx[3] || /*$hasTextInput*/ ctx[4] || /*$hasButtonBar*/ ctx[5]));
			}

			if (switch_value !== (switch_value = /*$components*/ ctx[6].focusWrap)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props());
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(picker.$$.fragment, local);
			transition_in(sliderhue.$$.fragment, local);
			transition_in(if_block0);
			transition_in(if_block1);
			transition_in(if_block2);
			transition_in(if_block3);
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(picker.$$.fragment, local);
			transition_out(sliderhue.$$.fragment, local);
			transition_out(if_block0);
			transition_out(if_block1);
			transition_out(if_block2);
			transition_out(if_block3);
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(picker);
			destroy_component(sliderhue);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			if (if_block3) if_block3.d();
			/*div_binding*/ ctx[19](null);
			if (detaching) detach(t5);
			if (detaching) detach(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

function instance$4($$self, $$props, $$invalidate) {
	let $padding;
	let $width;
	let $isOpen;
	let $firstFocusEl;
	let $hasAlpha;
	let $hasAddons;
	let $hasTextInput;
	let $hasButtonBar;
	let $components;
	setContext('#tjs-color-picker-constraint', { width: 75, height: 75 });
	setContext('#tjs-color-picker-slider-constraint', 75);
	setContext('#tjs-color-picker-slider-horizontal', false);
	const internalState = getContext('#tjs-color-picker-state');
	const { components, firstFocusEl, hasAddons, hasAlpha, hasButtonBar, hasTextInput, isOpen, padding, width } = internalState.stores;
	component_subscribe($$self, components, value => $$invalidate(6, $components = value));
	component_subscribe($$self, firstFocusEl, value => $$invalidate(21, $firstFocusEl = value));
	component_subscribe($$self, hasAddons, value => $$invalidate(3, $hasAddons = value));
	component_subscribe($$self, hasAlpha, value => $$invalidate(2, $hasAlpha = value));
	component_subscribe($$self, hasButtonBar, value => $$invalidate(5, $hasButtonBar = value));
	component_subscribe($$self, hasTextInput, value => $$invalidate(4, $hasTextInput = value));
	component_subscribe($$self, isOpen, value => $$invalidate(17, $isOpen = value));
	component_subscribe($$self, padding, value => $$invalidate(20, $padding = value));
	component_subscribe($$self, width, value => $$invalidate(16, $width = value));

	/** @type {HTMLElement} */
	let pickerEl, wrapperEl;

	// Set first focusable element for cyclic focus traversal in popup mode.
	onMount(() => set_store_value(firstFocusEl, $firstFocusEl = pickerEl, $firstFocusEl));

	function picker_pickerEl_binding(value) {
		pickerEl = value;
		$$invalidate(1, pickerEl);
	}

	function div_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			wrapperEl = $$value;
			(($$invalidate(0, wrapperEl), $$invalidate(17, $isOpen)), $$invalidate(16, $width));
		});
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*wrapperEl, $isOpen, $width*/ 196609) {
			/**
 * This is a bit of magic number adjustment of internal `padding` store to compensate for the container width
 * adjustment given that this layout below ~185px the container query layout expands the width of the sliders
 * which expands the inner wrapper beyond the optional `width` amount. A padding offset is calculated from the
 * parent container and this wrapper. This allows automatic adjustment to align container without a manual
 * external padding option.
 */
			if (wrapperEl && $isOpen) {
				const parentRect = wrapperEl.parentElement.getBoundingClientRect();
				const wrapperRect = wrapperEl.getBoundingClientRect();
				const widthNum = Number.parseFloat($width);

				if (widthNum > 185 && parentRect.width >= wrapperRect.width) {
					$$invalidate(0, wrapperEl.style.width = '100%', wrapperEl);
					set_store_value(padding, $padding = `0`, $padding);
				} else {
					$$invalidate(0, wrapperEl.style.width = 'max-content', wrapperEl);
					set_store_value(padding, $padding = `0 calc(${wrapperRect.width}px - ${parentRect.width}px) 0 0`, $padding);
				}
			}
		}
	};

	return [
		wrapperEl,
		pickerEl,
		$hasAlpha,
		$hasAddons,
		$hasTextInput,
		$hasButtonBar,
		$components,
		components,
		firstFocusEl,
		hasAddons,
		hasAlpha,
		hasButtonBar,
		hasTextInput,
		isOpen,
		padding,
		width,
		$width,
		$isOpen,
		picker_pickerEl_binding,
		div_binding
	];
}

let Wrapper$1 = class Wrapper extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});
	}
};

/**
 * The default layout components.
 *
 * @type {PickerComponents}
 */
const components$1 = {
   alphaIndicator: SliderIndicator,
   alphaWrapper: SliderWrapper,
   focusWrap: FocusWrap,
   pickerIndicator: PickerIndicator,
   pickerWrapper: PickerWrapper$1,
   sliderIndicator: SliderIndicator,
   sliderWrapper: SliderWrapper,
   wrapper: Wrapper$1
};

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\layout\chrome\PickerWrapper.svelte generated by Svelte v3.55.0-cq */

function create_fragment$3(ctx) {
	let div;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			div = element("div");
			if (default_slot) default_slot.c();
			attr(div, "class", "tjs-picker-wrapper svelte-1sxuqc0");
			toggle_class(div, "focused", /*focused*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*focused*/ 1) {
				toggle_class(div, "focused", /*focused*/ ctx[0]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let { focused = void 0 } = $$props;

	$$self.$$set = $$props => {
		if ('focused' in $$props) $$invalidate(0, focused = $$props.focused);
		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
	};

	return [focused, $$scope, slots];
}

class PickerWrapper extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$3, create_fragment$3, safe_not_equal, { focused: 0 });
	}
}

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\view\layout\chrome\Wrapper.svelte generated by Svelte v3.55.0-cq */

function create_if_block_3(ctx) {
	let slideralpha;
	let current;
	slideralpha = new SliderAlpha({});

	return {
		c() {
			create_component(slideralpha.$$.fragment);
		},
		m(target, anchor) {
			mount_component(slideralpha, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(slideralpha.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(slideralpha.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(slideralpha, detaching);
		}
	};
}

// (60:12) {#if $hasTextInput}
function create_if_block_2(ctx) {
	let textinput;
	let current;
	textinput = new TextInput({});

	return {
		c() {
			create_component(textinput.$$.fragment);
		},
		m(target, anchor) {
			mount_component(textinput, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(textinput.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(textinput.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(textinput, detaching);
		}
	};
}

// (63:12) {#if $hasButtonBar}
function create_if_block_1(ctx) {
	let buttonbar;
	let current;
	buttonbar = new ButtonBar({});

	return {
		c() {
			create_component(buttonbar.$$.fragment);
		},
		m(target, anchor) {
			mount_component(buttonbar, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(buttonbar.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(buttonbar.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(buttonbar, detaching);
		}
	};
}

// (66:12) {#if $hasAddons}
function create_if_block$1(ctx) {
	let addonpanel;
	let current;
	addonpanel = new AddOnPanel({});

	return {
		c() {
			create_component(addonpanel.$$.fragment);
		},
		m(target, anchor) {
			mount_component(addonpanel, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(addonpanel.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(addonpanel.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(addonpanel, detaching);
		}
	};
}

function create_fragment$2(ctx) {
	let div1;
	let picker;
	let updating_pickerEl;
	let t0;
	let div0;
	let section0;
	let sliderhue;
	let t1;
	let t2;
	let section1;
	let t3;
	let t4;
	let t5;
	let switch_instance;
	let switch_instance_anchor;
	let current;

	function picker_pickerEl_binding(value) {
		/*picker_pickerEl_binding*/ ctx[16](value);
	}

	let picker_props = {};

	if (/*pickerEl*/ ctx[1] !== void 0) {
		picker_props.pickerEl = /*pickerEl*/ ctx[1];
	}

	picker = new Picker({ props: picker_props });
	binding_callbacks.push(() => bind$1(picker, 'pickerEl', picker_pickerEl_binding, /*pickerEl*/ ctx[1]));
	sliderhue = new SliderHue({});
	let if_block0 = /*$hasAlpha*/ ctx[2] && create_if_block_3();
	let if_block1 = /*$hasTextInput*/ ctx[4] && create_if_block_2();
	let if_block2 = /*$hasButtonBar*/ ctx[5] && create_if_block_1();
	let if_block3 = /*$hasAddons*/ ctx[3] && create_if_block$1();
	var switch_value = /*$components*/ ctx[6].focusWrap;

	function switch_props(ctx) {
		return {};
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props());
	}

	return {
		c() {
			div1 = element("div");
			create_component(picker.$$.fragment);
			t0 = space();
			div0 = element("div");
			section0 = element("section");
			create_component(sliderhue.$$.fragment);
			t1 = space();
			if (if_block0) if_block0.c();
			t2 = space();
			section1 = element("section");
			if (if_block1) if_block1.c();
			t3 = space();
			if (if_block2) if_block2.c();
			t4 = space();
			if (if_block3) if_block3.c();
			t5 = space();
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
			attr(section0, "class", "sliders svelte-16s4wmb");
			attr(section1, "class", "extra svelte-16s4wmb");
			toggle_class(section1, "display-none", !(/*$hasAddons*/ ctx[3] || /*$hasTextInput*/ ctx[4] || /*$hasButtonBar*/ ctx[5]));
			attr(div0, "class", "tjs-color-picker-wrapper-body svelte-16s4wmb");
			attr(div1, "class", "tjs-color-picker-wrapper svelte-16s4wmb");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			mount_component(picker, div1, null);
			append(div1, t0);
			append(div1, div0);
			append(div0, section0);
			mount_component(sliderhue, section0, null);
			append(section0, t1);
			if (if_block0) if_block0.m(section0, null);
			append(div0, t2);
			append(div0, section1);
			if (if_block1) if_block1.m(section1, null);
			append(section1, t3);
			if (if_block2) if_block2.m(section1, null);
			append(section1, t4);
			if (if_block3) if_block3.m(section1, null);
			/*div1_binding*/ ctx[17](div1);
			insert(target, t5, anchor);
			if (switch_instance) mount_component(switch_instance, target, anchor);
			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const picker_changes = {};

			if (!updating_pickerEl && dirty & /*pickerEl*/ 2) {
				updating_pickerEl = true;
				picker_changes.pickerEl = /*pickerEl*/ ctx[1];
				add_flush_callback(() => updating_pickerEl = false);
			}

			picker.$set(picker_changes);

			if (/*$hasAlpha*/ ctx[2]) {
				if (if_block0) {
					if (dirty & /*$hasAlpha*/ 4) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_3();
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(section0, null);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (/*$hasTextInput*/ ctx[4]) {
				if (if_block1) {
					if (dirty & /*$hasTextInput*/ 16) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block_2();
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(section1, t3);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}

			if (/*$hasButtonBar*/ ctx[5]) {
				if (if_block2) {
					if (dirty & /*$hasButtonBar*/ 32) {
						transition_in(if_block2, 1);
					}
				} else {
					if_block2 = create_if_block_1();
					if_block2.c();
					transition_in(if_block2, 1);
					if_block2.m(section1, t4);
				}
			} else if (if_block2) {
				group_outros();

				transition_out(if_block2, 1, 1, () => {
					if_block2 = null;
				});

				check_outros();
			}

			if (/*$hasAddons*/ ctx[3]) {
				if (if_block3) {
					if (dirty & /*$hasAddons*/ 8) {
						transition_in(if_block3, 1);
					}
				} else {
					if_block3 = create_if_block$1();
					if_block3.c();
					transition_in(if_block3, 1);
					if_block3.m(section1, null);
				}
			} else if (if_block3) {
				group_outros();

				transition_out(if_block3, 1, 1, () => {
					if_block3 = null;
				});

				check_outros();
			}

			if (!current || dirty & /*$hasAddons, $hasTextInput, $hasButtonBar*/ 56) {
				toggle_class(section1, "display-none", !(/*$hasAddons*/ ctx[3] || /*$hasTextInput*/ ctx[4] || /*$hasButtonBar*/ ctx[5]));
			}

			if (switch_value !== (switch_value = /*$components*/ ctx[6].focusWrap)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props());
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(picker.$$.fragment, local);
			transition_in(sliderhue.$$.fragment, local);
			transition_in(if_block0);
			transition_in(if_block1);
			transition_in(if_block2);
			transition_in(if_block3);
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(picker.$$.fragment, local);
			transition_out(sliderhue.$$.fragment, local);
			transition_out(if_block0);
			transition_out(if_block1);
			transition_out(if_block2);
			transition_out(if_block3);
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			destroy_component(picker);
			destroy_component(sliderhue);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			if (if_block3) if_block3.d();
			/*div1_binding*/ ctx[17](null);
			if (detaching) detach(t5);
			if (detaching) detach(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	let $padding;
	let $isOpen;
	let $firstFocusEl;
	let $hasAlpha;
	let $hasAddons;
	let $hasTextInput;
	let $hasButtonBar;
	let $components;
	setContext('#tjs-color-picker-constraint', { width: 100, height: 77 });
	setContext('#tjs-color-picker-slider-constraint', 98);
	setContext('#tjs-color-picker-slider-horizontal', true);
	const internalState = getContext('#tjs-color-picker-state');
	const { components, firstFocusEl, hasAddons, hasAlpha, hasButtonBar, hasTextInput, isOpen, padding, width } = internalState.stores;
	component_subscribe($$self, components, value => $$invalidate(6, $components = value));
	component_subscribe($$self, firstFocusEl, value => $$invalidate(19, $firstFocusEl = value));
	component_subscribe($$self, hasAddons, value => $$invalidate(3, $hasAddons = value));
	component_subscribe($$self, hasAlpha, value => $$invalidate(2, $hasAlpha = value));
	component_subscribe($$self, hasButtonBar, value => $$invalidate(5, $hasButtonBar = value));
	component_subscribe($$self, hasTextInput, value => $$invalidate(4, $hasTextInput = value));
	component_subscribe($$self, isOpen, value => $$invalidate(15, $isOpen = value));
	component_subscribe($$self, padding, value => $$invalidate(18, $padding = value));

	/** @type {HTMLElement} */
	let pickerEl, wrapperEl;

	// Set first focusable element for cyclic focus traversal in popup mode.
	onMount(() => set_store_value(firstFocusEl, $firstFocusEl = pickerEl, $firstFocusEl));

	function picker_pickerEl_binding(value) {
		pickerEl = value;
		$$invalidate(1, pickerEl);
	}

	function div1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			wrapperEl = $$value;
			$$invalidate(0, wrapperEl);
		});
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*wrapperEl, $isOpen*/ 32769) {
			/**
 * This is a bit of magic number adjustment of internal `padding` store to compensate for the container width
 * adjustment that the default layout sets. In this case just for a sanity case padding needs to be set to '0' if
 * in the case that layout first was the default layout then switched to "chrome".
 */
			if (wrapperEl && $isOpen) {
				set_store_value(padding, $padding = `0`, $padding);
			}
		}
	};

	return [
		wrapperEl,
		pickerEl,
		$hasAlpha,
		$hasAddons,
		$hasTextInput,
		$hasButtonBar,
		$components,
		components,
		firstFocusEl,
		hasAddons,
		hasAlpha,
		hasButtonBar,
		hasTextInput,
		isOpen,
		padding,
		$isOpen,
		picker_pickerEl_binding,
		div1_binding
	];
}

class Wrapper extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
	}
}

/**
 * The `chrome` style layout components.
 *
 * @type {PickerComponents}
 */
const components = {
   pickerWrapper: PickerWrapper,
   wrapper: Wrapper
};

/**
 * The layouts available for the color picker.
 *
 * @type {{default: PickerComponents, chrome: PickerComponents}}
 */
const layout = {
   default: components$1,
   chrome: components
};

class InternalState
{
   /**
    * @type {AddOnState}
    */
   #addonState;

   /**
    * @type {ButtonState}
    */
   #buttonState;

   /**
    * @type {ColorState}
    */
   #colorState;

   /**
    * Stores external user configurable settings.
    *
    * @type {TJSColordPickerOptions}
    */
   #externalData = {};

   /**
    * Stores internal data.
    *
    * @type {PickerInternalData}
    */
   #internalData = {};

   /**
    * External TJSSessionStorage instance.
    *
    * @type {TJSSessionStorage}
    */
   #sessionStorage;

   /**
    * @type {PickerStores}
    */
   #stores;

   /**
    * @param {object|string}           color -
    *
    * @param {TJSColordPickerOptions}  options -
    *
    * @param {TJSSessionStorage}       sessionStorage - External TJSSessionStorage instance.
    */
   constructor(color, options, sessionStorage)
   {
      const opts = isObject(options) ? options : {};

      this.#validateOptions(opts);

      this.#sessionStorage = sessionStorage;

      this.#buttonState = new ButtonState(this);

      this.#addonState = new AddOnState(this);
      this.#addonState.updateOptions(isIterable(opts.addons) ? opts.addons : []);

      // External data -----------------------------------------------------------------------------------------------

      this.#externalData.hasAlpha = typeof opts.hasAlpha === 'boolean' ? opts.hasAlpha : true;

      this.#externalData.hasAddons = typeof opts.hasAddons === 'boolean' ? opts.hasAddons : true;

      this.#externalData.hasButtonBar = typeof opts.hasButtonBar === 'boolean' ? opts.hasButtonBar : true;

      this.#externalData.hasEyeDropper = typeof opts.hasEyeDropper === 'boolean' ?
       opts.hasEyeDropper && EyeDropper.isAvailable : EyeDropper.isAvailable;

      this.#externalData.hasTextInput = typeof opts.hasTextInput === 'boolean' ? opts.hasTextInput : true;

      this.#externalData.inputName = typeof opts.inputName === 'string' ? opts.inputName : 'tjs-color-picker';

      this.#externalData.isPopup = typeof opts.isPopup === 'boolean' ? opts.isPopup : true;

      this.#externalData.lockTextFormat = typeof opts.lockTextFormat === 'boolean' ? opts.lockTextFormat : false;

      this.#externalData.precision = Number.isInteger(opts.precision) ? opts.precision : 0;

      this.#externalData.width = Number.isInteger(opts.width) ? `${opts.width}px` : opts.width;

      // Internal data -----------------------------------------------------------------------------------------------

      this.#internalData.hasAddons = this.#externalData.hasAddons && this.#addonState.size > 0;

      this.#internalData.isOpen = !this.#externalData.isPopup;

      this.#internalData.padding = '0';

      const externalData = writable$1(this.#externalData);
      const internalData = writable$1(this.#internalData);

      this.#stores = {
         components: writable$1(this.#prepareComponents(opts)), // Sets this.#externalData.layout

         hasEyeDropper: propertyStore(externalData, 'hasEyeDropper'),
         hasAlpha: propertyStore(externalData, 'hasAlpha'),
         hasButtonBar: propertyStore(externalData, 'hasButtonBar'),
         hasTextInput: propertyStore(externalData, 'hasTextInput'),
         inputName: propertyStore(externalData, 'inputName'),
         isPopup: propertyStore(externalData, 'isPopup'),
         lockTextFormat: propertyStore(externalData, 'lockTextFormat'),
         precision: propertyStore(externalData, 'precision'),
         width: propertyStore(externalData, 'width'),

         firstFocusEl: writable$1(void 0),
         hasAddons: propertyStore(internalData, 'hasAddons'),
         isOpen: propertyStore(internalData, 'isOpen'),
         padding: propertyStore(internalData, 'padding')
      };

      this.#colorState = new ColorState(this, color, opts);
   }

   /**
    * @returns {AddOnState}
    */
   get addOnState()
   {
      return this.#addonState;
   }

   /**
    * @returns {ButtonState}
    */
   get buttonState()
   {
      return this.#buttonState;
   }

   /**
    * @returns {ColorState}
    */
   get colorState()
   {
      return this.#colorState;
   }

   /**
    * @returns {boolean} Current 'hasAlpha' state.
    */
   get hasAlpha()
   {
      return this.#externalData.hasAlpha;
   }

   /**
    * @returns {boolean} Current `isOpen` state.
    */
   get isOpen()
   {
      return this.#internalData.isOpen;
   }

   /**
    * @returns {number}
    */
   get precision()
   {
      return this.#externalData.precision;
   }

   /**
    * @returns {TJSSessionStorage}
    */
   get sessionStorage()
   {
      return this.#sessionStorage;
   }

   /**
    * @returns {PickerStores}
    */
   get stores()
   {
      return this.#stores;
   }

   /**
    * @param {boolean}  isOpen - New `isOpen` state.
    */
   set isOpen(isOpen)
   {
      this.#stores.isOpen.set(isOpen);
   }

   destroy()
   {
      this.#colorState.destroy();
      this.#sessionStorage = void 0;
   }

   /**
    * Prepares layout components based on any user provided `options.layout`
    *
    * @param {TJSColordPickerOptions} opts -
    *
    * @returns {PickerComponents} Configured layout components.
    */
   #prepareComponents(opts)
   {
      let selectedVariant = {};

      switch(opts.layout)
      {
         case 'chrome':
            this.#externalData.layout = 'chrome';
            selectedVariant = layout.chrome;
            break;

         case 'default':
         default:
            this.#externalData.layout = void 0;
            break;
      }

      return {
         ...layout.default,
         ...(isObject(opts.components) ? opts.components : selectedVariant)
      }
   }

   /**
    * Swaps the current `isOpen` state.
    *
    * @returns {boolean} The current `isOpen` state.
    */
   swapIsOpen()
   {
      const result = !this.#internalData.isOpen;

      this.#stores.isOpen.set(result);

      return result;
   }

   /**
    * Updates external & internal data on changes to the `options` prop.
    *
    * @param {TJSColordPickerOptions} options -
    */
   updateOptions(options)
   {
      const opts = isObject(options) ? options : {};

      this.#validateOptions(opts);

      const currentIsPopup = this.#externalData.isPopup;

      this.#addonState.updateOptions(isIterable(opts.addons) ? opts.addons : []);

      // External data -----------------------------------------------------------------------------------------------

      this.#stores.hasAlpha.set(typeof opts.hasAlpha === 'boolean' ? opts.hasAlpha : true);

      this.#externalData.hasAddons = typeof opts.hasAddons === 'boolean' ? opts.hasAddons : true;

      this.#stores.hasButtonBar.set(typeof opts.hasButtonBar === 'boolean' ? opts.hasButtonBar : true);

      this.#stores.hasEyeDropper.set(typeof opts.hasEyeDropper === 'boolean' ?
       opts.hasEyeDropper && EyeDropper.isAvailable : EyeDropper.isAvailable);

      this.#stores.hasTextInput.set(typeof opts.hasTextInput === 'boolean' ? opts.hasTextInput : true);

      this.#stores.inputName.set(typeof opts.inputName === 'string' ? opts.inputName : 'tjs-color-picker');

      const newIsPopup = typeof opts.isPopup === 'boolean' ? opts.isPopup : true;

      this.#stores.isPopup.set(newIsPopup);

      if (opts.layout !== this.#externalData.layout) { this.#stores.components.set(this.#prepareComponents(opts)); }

      this.#stores.lockTextFormat.set(typeof opts.lockTextFormat === 'boolean' ? opts.lockTextFormat : false);

      this.#stores.precision.set(Number.isInteger(opts.precision) ? opts.precision : 0);

      this.#stores.width.set(Number.isInteger(opts.width) ? `${opts.width}px` : opts.width);

      // Internal data -----------------------------------------------------------------------------------------------

      this.#stores.hasAddons.set(this.#externalData.hasAddons && this.#addonState.size > 0);

      // Only reset `isOpen` if external `options.isPopup` has changed. When isPopup is false isOpen must be true.
      if (newIsPopup !== currentIsPopup) { this.#stores.isOpen.set(!newIsPopup); }

      // Update color state options (color format / type) ------------------------------------------------------------

      this.#colorState.updateOptions(opts);
   }

   /**
    * Validates external user defined options.
    *
    * @param {TJSColordPickerOptions} opts -
    */
   #validateOptions(opts)
   {
      if (opts.addons !== void 0 && !isIterable(opts.addons))
      {
         throw new TypeError(`'options.addons' is not an iterable list of addon constructor functions.`);
      }

      if (opts.hasAddons !== void 0 && typeof opts.hasAddons !== 'boolean')
      {
         throw new TypeError(`'options.hasAddons' is not a boolean.`);
      }

      if (opts.hasAlpha !== void 0 && typeof opts.hasAlpha !== 'boolean')
      {
         throw new TypeError(`'options.hasAlpha' is not a boolean.`);
      }

      if (opts.hasButtonBar !== void 0 && typeof opts.hasButtonBar !== 'boolean')
      {
         throw new TypeError(`'options.hasButtonBar' is not a boolean.`);
      }

      if (opts.hasEyeDropper !== void 0 && typeof opts.hasEyeDropper !== 'boolean')
      {
         throw new TypeError(`'options.hasEyeDropper' is not a boolean.`);
      }

      if (opts.hasTextInput !== void 0 && typeof opts.hasTextInput !== 'boolean')
      {
         throw new TypeError(`'options.hasTextInput' is not a boolean.`);
      }

      if (opts.inputName !== void 0 && typeof opts.inputName !== 'string')
      {
         throw new TypeError(`'options.inputName' is not a string.`);
      }

      if (opts.isPopup !== void 0 && typeof opts.isPopup !== 'boolean')
      {
         throw new TypeError(`'options.isPopup' is not a boolean.`);
      }

      if (opts.layout !== void 0 && typeof opts.layout !== 'string')
      {
         throw new TypeError(`'options.layout' is not a string or undefined.`);
      }

      if (opts.lockTextFormat !== void 0 && typeof opts.lockTextFormat !== 'boolean')
      {
         throw new TypeError(`'options.lockTextFormat' is not a boolean.`);
      }

      if (opts.precision !== void 0 && (!Number.isInteger(opts.precision) || opts.precision < 0))
      {
         throw new TypeError(`'options.precision' must be an integer >= 0.`);
      }

      if (opts.width !== void 0)
      {
         switch (typeof opts.width)
         {
            case 'number':
               if (Number.isInteger(opts.width) && opts.width < 50)
               {
                  throw new TypeError(`'options.width' must be an integer >= 50 or valid CSS dimension string.`);
               }
               break;

            default:
               if (typeof opts.width !== 'string')
               {
                  throw new TypeError(`'options.width' must be an integer >= 50 or valid CSS dimension string.`);
               }
               break;
         }
      }
   }
}

/**
 * @typedef {object|string} TJSColordPickerColor
 */

/**
 * @typedef {object} TJSColordPickerOptions
 *
 * @property {Iterable<Function>} [addons] - Iterable list of addon class constructor functions.
 *
 * @property {PickerComponents} [components] - User defined picker component overrides.
 *
 * @property {'hex'|'hsl'|'hsv'|'rgb'} [format] - The user defined color format.
 *
 * @property {'object'|'string'} [formatType] - The user defined color format type.
 *
 * @property {boolean} [hasAddons=true] - Enables the addons panel / can set to false to hide panel when addons loaded.
 *
 * @property {boolean} [hasAlpha=true] - Enables alpha / opacity color selection and output.
 *
 * @property {boolean} [hasButtonBar=true] - Enables the button bar.
 *
 * @property {boolean} [hasEyeDropper=true] - Enables eye dropper support if available (requires secure context).
 *
 * @property {boolean} [hasTextInput=true] - Enables text input component.
 *
 * @property {string} [inputName='tjs-color-picker'] - Name attribute for hidden input element / form submission.
 *
 * @property {boolean} [isPopup=true] - Is the picker configured as a pop-up.
 *
 * @property {'chrome'|undefined} [layout=undefined] - Picker layout variant.
 *
 * @property {boolean} [lockTextFormat=false] - When true text input format can not be changed from current format.
 *
 * @property {number} [precision=0] - A positive integer defining rounding precision.
 *
 * @property {import('svelte/store').Writable<string|object>} [store] - An external store to update current color.
 *
 * @property {object} [styles] - Inline styles to apply to TJSColordPicker span; useful to set CSS variables.
 *
 * @property {number|string} [width=200] - A positive integer greater than 50 defining the main container width in
 *                                         pixels or a valid CSS dimension string.
 */

/**
 * @typedef {object} PickerInternalData
 *
 * @property {boolean} hasAddons - true when external options `hasAddons` is true and there are addons loaded.
 *
 * @property {boolean} isOpen - Is the color picker in the open state.
 *
 * @property {string} [padding] - A padding style to add to the main container to compensate for any layout adjustments.
 */

/**
 * @typedef {object} PickerComponents
 *
 * @property {import('svelte').SvelteComponent} [alphaIndicator] - Alpha slider indicator.
 *
 * @property {import('svelte').SvelteComponent} [alphaWrapper] - Alpha slider wrapper.
 *
 * @property {import('svelte').SvelteComponent} [focusWrap] - When in popup model advances focus to prop element.
 *
 * @property {import('svelte').SvelteComponent} [pickerIndicator] - Picker indicator.
 *
 * @property {import('svelte').SvelteComponent} [pickerWrapper] - Picker wrapper.
 *
 * @property {import('svelte').SvelteComponent} [sliderIndicator] - Hue slider indicator.
 *
 * @property {import('svelte').SvelteComponent} [sliderWrapper] - Hue slider wrapper.
 *
 * @property {import('svelte').SvelteComponent} [textInput] - Text input component.
 *
 * @property {import('svelte').SvelteComponent} [wrapper] - Outer wrapper for all components.
 */

/**
 * @typedef {object} PickerStores
 *
 * @property {import('svelte/store').Writable<PickerComponents>} components - This selected layout components.
 *
 * @property {import('svelte/store').Writable<boolean>} hasAlpha - See {@link TJSColordPickerOptions.hasAlpha}
 *
 * @property {import('svelte/store').Writable<boolean>} hasButtonBar - See {@link TJSColordPickerOptions.hasButtonBar}
 *
 * @property {import('svelte/store').Writable<boolean>} hasEyeDropper - See {@link TJSColordPickerOptions.hasEyeDropper}
 *
 * @property {import('svelte/store').Writable<boolean>} hasTextInput - See {@link TJSColordPickerOptions.hasTextInput}
 *
 * @property {import('svelte/store').Writable<string>} inputName - See {@link TJSColordPickerOptions.inputName}
 *
 * @property {import('svelte/store').Writable<boolean>} isPopup - See {@link TJSColordPickerOptions.isPopup}
 *
 * @property {import('svelte/store').Writable<boolean>} lockTextFormat - See {@link TJSColordPickerOptions.lockTextFormat}
 *
 * @property {import('svelte/store').Writable<number>} precision - See {@link TJSColordPickerOptions.precision}
 *
 * @property {import('svelte/store').Writable<string>} width - See {@link TJSColordPickerOptions.width}
 *
 *
 * @property {import('svelte/store').Writable<boolean>} firstFocusEl - Stores first tab / focus traversable element.
 *
 * @property {import('svelte/store').Writable<boolean>} hasAddons - See {@link PickerInternalData.hasAddons}
 *
 * @property {import('svelte/store').Writable<boolean>} isOpen - See {@link PickerInternalData.isOpen}
 *
 * @property {import('svelte/store').Writable<string>} padding - See {@link PickerInternalData.padding}
 */

/* ..\..\typhonjs-fvtt-lib\svelte-standard\_dist\component\standard\color\picker-colord\TJSColordPicker.svelte generated by Svelte v3.55.0-cq */

function create_if_block(ctx) {
	let input;
	let updating_inputEl;
	let current;

	function input_inputEl_binding(value) {
		/*input_inputEl_binding*/ ctx[29](value);
	}

	let input_props = {};

	if (/*inputEl*/ ctx[2] !== void 0) {
		input_props.inputEl = /*inputEl*/ ctx[2];
	}

	input = new Input({ props: input_props });
	binding_callbacks.push(() => bind$1(input, 'inputEl', input_inputEl_binding, /*inputEl*/ ctx[2]));

	return {
		c() {
			create_component(input.$$.fragment);
		},
		m(target, anchor) {
			mount_component(input, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const input_changes = {};

			if (!updating_inputEl && dirty[0] & /*inputEl*/ 4) {
				updating_inputEl = true;
				input_changes.inputEl = /*inputEl*/ ctx[2];
				add_flush_callback(() => updating_inputEl = false);
			}

			input.$set(input_changes);
		},
		i(local) {
			if (current) return;
			transition_in(input.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(input.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(input, detaching);
		}
	};
}

function create_fragment$1(ctx) {
	let span;
	let input;
	let t0;
	let t1;
	let mainlayout;
	let updating_containerEl;
	let applyStyles_action;
	let current;
	let mounted;
	let dispose;
	let if_block = /*$isPopup*/ ctx[5] && create_if_block(ctx);

	function mainlayout_containerEl_binding(value) {
		/*mainlayout_containerEl_binding*/ ctx[30](value);
	}

	let mainlayout_props = { inputEl: /*inputEl*/ ctx[2] };

	if (/*containerEl*/ ctx[1] !== void 0) {
		mainlayout_props.containerEl = /*containerEl*/ ctx[1];
	}

	mainlayout = new MainLayout({ props: mainlayout_props });
	binding_callbacks.push(() => bind$1(mainlayout, 'containerEl', mainlayout_containerEl_binding, /*containerEl*/ ctx[1]));

	return {
		c() {
			span = element("span");
			input = element("input");
			t0 = space();
			if (if_block) if_block.c();
			t1 = space();
			create_component(mainlayout.$$.fragment);
			attr(input, "name", /*$inputName*/ ctx[12]);
			attr(input, "type", "hidden");
			input.value = /*$currentColorString*/ ctx[6];
			attr(span, "class", "tjs-color-picker svelte-tuxj6d");
			set_style(span, "--_tjs-color-picker-current-color-hsl", /*$hslString*/ ctx[7]);
			set_style(span, "--_tjs-color-picker-current-color-hsl-hue", /*$hslHueString*/ ctx[8]);
			set_style(span, "--_tjs-color-picker-current-color-hsla", /*$hslaString*/ ctx[9]);
			set_style(span, "--_tjs-color-picker-width-option", /*$width*/ ctx[10]);
			set_style(span, "--_tjs-color-picker-padding-option", /*$padding*/ ctx[11]);
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, input);
			append(span, t0);
			if (if_block) if_block.m(span, null);
			append(span, t1);
			mount_component(mainlayout, span, null);
			/*span_binding*/ ctx[31](span);
			current = true;

			if (!mounted) {
				dispose = [
					listen(span, "keydown", /*onKeydown*/ ctx[23]),
					action_destroyer(applyStyles_action = applyStyles.call(null, span, /*styles*/ ctx[4]))
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (!current || dirty[0] & /*$inputName*/ 4096) {
				attr(input, "name", /*$inputName*/ ctx[12]);
			}

			if (!current || dirty[0] & /*$currentColorString*/ 64) {
				input.value = /*$currentColorString*/ ctx[6];
			}

			if (/*$isPopup*/ ctx[5]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty[0] & /*$isPopup*/ 32) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(span, t1);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			const mainlayout_changes = {};
			if (dirty[0] & /*inputEl*/ 4) mainlayout_changes.inputEl = /*inputEl*/ ctx[2];

			if (!updating_containerEl && dirty[0] & /*containerEl*/ 2) {
				updating_containerEl = true;
				mainlayout_changes.containerEl = /*containerEl*/ ctx[1];
				add_flush_callback(() => updating_containerEl = false);
			}

			mainlayout.$set(mainlayout_changes);
			if (applyStyles_action && is_function(applyStyles_action.update) && dirty[0] & /*styles*/ 16) applyStyles_action.update.call(null, /*styles*/ ctx[4]);

			if (dirty[0] & /*$hslString*/ 128) {
				set_style(span, "--_tjs-color-picker-current-color-hsl", /*$hslString*/ ctx[7]);
			}

			if (dirty[0] & /*$hslHueString*/ 256) {
				set_style(span, "--_tjs-color-picker-current-color-hsl-hue", /*$hslHueString*/ ctx[8]);
			}

			if (dirty[0] & /*$hslaString*/ 512) {
				set_style(span, "--_tjs-color-picker-current-color-hsla", /*$hslaString*/ ctx[9]);
			}

			if (dirty[0] & /*$width*/ 1024) {
				set_style(span, "--_tjs-color-picker-width-option", /*$width*/ ctx[10]);
			}

			if (dirty[0] & /*$padding*/ 2048) {
				set_style(span, "--_tjs-color-picker-padding-option", /*$padding*/ ctx[11]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			transition_in(mainlayout.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			transition_out(mainlayout.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (if_block) if_block.d();
			destroy_component(mainlayout);
			/*span_binding*/ ctx[31](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let styles;
	let externalStore;
	let $firstFocusEl;
	let $currentColor;
	let $isPopup;
	let $currentColorString;

	let $externalStore,
		$$unsubscribe_externalStore = noop,
		$$subscribe_externalStore = () => ($$unsubscribe_externalStore(), $$unsubscribe_externalStore = subscribe(externalStore, $$value => $$invalidate(28, $externalStore = $$value)), externalStore);

	let $hslString;
	let $hslHueString;
	let $hslaString;
	let $width;
	let $padding;
	let $inputName;
	$$self.$$.on_destroy.push(() => $$unsubscribe_externalStore());
	let { color = void 0 } = $$props;
	let { options = void 0 } = $$props;
	const dispatch = createEventDispatcher();
	const external = getContext('external');
	const internalState = new InternalState(color, options, external?.sessionStorage);
	setContext('#tjs-color-picker-state', internalState);
	const { components, firstFocusEl, inputName, isPopup, padding, width } = internalState.stores;
	component_subscribe($$self, firstFocusEl, value => $$invalidate(32, $firstFocusEl = value));
	component_subscribe($$self, inputName, value => $$invalidate(12, $inputName = value));
	component_subscribe($$self, isPopup, value => $$invalidate(5, $isPopup = value));
	component_subscribe($$self, padding, value => $$invalidate(11, $padding = value));
	component_subscribe($$self, width, value => $$invalidate(10, $width = value));
	const colorState = internalState.colorState;
	const { currentColor, currentColorString, hslString, hslHueString, hslaString } = colorState.stores;
	component_subscribe($$self, currentColor, value => $$invalidate(27, $currentColor = value));
	component_subscribe($$self, currentColorString, value => $$invalidate(6, $currentColorString = value));
	component_subscribe($$self, hslString, value => $$invalidate(7, $hslString = value));
	component_subscribe($$self, hslHueString, value => $$invalidate(8, $hslHueString = value));
	component_subscribe($$self, hslaString, value => $$invalidate(9, $hslaString = value));

	// Provides options to `A11yHelper.getFocusableElements` to ignore FocusWrap by CSS class.
	const s_IGNORE_CLASSES = {
		ignoreClasses: ['tjs-color-picker-last-focus']
	};

	onDestroy(() => internalState.destroy());

	/** @type {HTMLDivElement} */
	let containerEl = void 0;

	/** @type {HTMLDivElement} */
	let inputEl = void 0;

	/** @type {HTMLSpanElement} */
	let spanEl = void 0;

	/**
 * Copy `currentColorString` to clipboard.
 *
 * TODO Eventbus: If / when an app eventbus is added trigger UI notification message.
 *
 * @returns {Promise<void>}
 */
	async function handleCopy() {
		const copyColor = $currentColorString;

		if (typeof copyColor === 'string') {
			await ClipboardAccess.writeText(copyColor);
		}
	}

	/**
 * Handle pasting any valid color from secure context (localhost / HTTPS).
 *
 * @returns {Promise<void>}
 */
	async function handlePaste() {
		const newColor = await ClipboardAccess.readText();

		if (w(newColor).isValid()) {
			colorState.setColor(newColor);
		}
	}

	/**
 * Special capture handling of keydown events for specific actions.
 *
 * Support copy, cut, paste.
 *
 * When in popup mode like `Esc` to reset color to initial state when popped up and `Enter` to close the picker
 * container. `Shift-Tab` when the `firstFocusEl` is the active element the last focusable element that is not
 * `FocusWrap` is focused.
 *
 * @param {KeyboardEvent}    event -
 */
	function onKeydown(event) {
		// Handle cut / copy / paste directly to circumvent external key listeners.
		switch (event.code) {
			case 'KeyC':
			case 'KeyX':
				// Note: Do not perform action if the active element is TJSInput.
				if (document.activeElement?.classList.contains('tjs-input')) {
					break;
				}
				if (event.ctrlKey || event.metaKey) {
					handleCopy();
					event.preventDefault();
					event.stopImmediatePropagation();
				}
				break;
			case 'KeyV':
				if (event.ctrlKey || event.metaKey) {
					// Note: Do not perform action if the active element is TJSInput.
					if (document.activeElement?.classList.contains('tjs-input')) {
						break;
					}

					handlePaste();
					event.preventDefault();
					event.stopImmediatePropagation();
				}
				break;
		}

		// The handling below is for popup mode, so exit now otherwise.
		if (!$isPopup) {
			return;
		}

		switch (event.code) {
			case 'Enter':
				const isOpen = internalState.isOpen;
				// Save initial color when popup opens.
				if (!isOpen) {
					colorState.savePopupColor();
				}
				internalState.swapIsOpen();
				event.preventDefault();
				event.stopImmediatePropagation();
				// If previously open and now closed focus the picker input element.
				if (isOpen) {
					inputEl.focus();
				}
				break;
			case 'Escape':
				// Reset color to initial value when popped out.
				if (internalState.isOpen) {
					const initialPopupColor = colorState.getPopupColor();

					if (!w($currentColor).isEqual(initialPopupColor)) {
						// Reset to initial popup color.
						colorState.setColor(initialPopupColor);
					} else {
						// Current color is the same as initial so close popup.
						$$invalidate(26, internalState.isOpen = false, internalState);

						inputEl.focus();
					}

					event.preventDefault();
					event.stopImmediatePropagation();
				}
				break;
			case 'Space':
				// Capture any space key from propagating; space is used in popup mode to select buttons.
				event.preventDefault();
				event.stopPropagation();
				break;
			case 'Tab':
				// If the popup is open and `Shift-Tab` is pressed and the active element is the first focus element
				// or container element then search for the last focusable element that is not `FocusWrap` to traverse
				// internally in the container.
				if (internalState.isOpen && event.shiftKey && (containerEl === document.activeElement || $firstFocusEl === document.activeElement)) {
					// Collect all focusable elements from `elementRoot` and ignore TJSFocusWrap.
					const lastFocusEl = A11yHelper.getLastFocusableElement(containerEl, s_IGNORE_CLASSES);

					if (lastFocusEl instanceof HTMLElement) {
						lastFocusEl.focus();
					}

					event.preventDefault();
					event.stopImmediatePropagation();
				}
				break;
		}
	}

	function input_inputEl_binding(value) {
		inputEl = value;
		$$invalidate(2, inputEl);
	}

	function mainlayout_containerEl_binding(value) {
		containerEl = value;
		$$invalidate(1, containerEl);
	}

	function span_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			spanEl = $$value;
			$$invalidate(3, spanEl);
		});
	}

	$$self.$$set = $$props => {
		if ('color' in $$props) $$invalidate(24, color = $$props.color);
		if ('options' in $$props) $$invalidate(25, options = $$props.options);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*options*/ 33554432) {
			/** @type {object} */
			$$invalidate(4, styles = isObject(options) && isObject(options.styles)
			? options.styles
			: void 0);
		}

		if ($$self.$$.dirty[0] & /*options*/ 33554432) {
			$$subscribe_externalStore($$invalidate(0, externalStore = isObject(options) && isWritableStore(options.store)
			? options.store
			: void 0));
		}

		if ($$self.$$.dirty[0] & /*internalState, options*/ 100663296) {
			// When options changes update internal state.
			internalState.updateOptions(options);
		}

		if ($$self.$$.dirty[0] & /*$currentColor, externalStore*/ 134217729) {
			// Set changes in internal color state to external prop. Set any optional store and dispatch an event.
			{
				const newColor = $currentColor;
				$$invalidate(24, color = newColor);

				// Note: We must store `$currentColor` in a temporary variable to use below otherwise this reactive block will
				// be triggered by external changes in color.
				// If any external store is set in options then set current color.
				if (externalStore) {
					externalStore.set(newColor);
				}

				// Dispatch `on:input` event for current color.
				dispatch('input', { color: newColor });
			}
		}

		if ($$self.$$.dirty[0] & /*$currentColor, color*/ 150994944) {
			// When `color` prop changes detect if it is an external change potentially updating internal state.
			if (!w($currentColor).isEqual(color)) {
				colorState.updateExternal(color);
			}
		}

		if ($$self.$$.dirty[0] & /*externalStore, $currentColor, $externalStore*/ 402653185) {
			// When any `externalStore` from `options` changes detect any external change potentially updating internal state.
			if (externalStore && !w($currentColor).isEqual($externalStore)) {
				colorState.updateExternal($externalStore);
			}
		}
	};

	return [
		externalStore,
		containerEl,
		inputEl,
		spanEl,
		styles,
		$isPopup,
		$currentColorString,
		$hslString,
		$hslHueString,
		$hslaString,
		$width,
		$padding,
		$inputName,
		firstFocusEl,
		inputName,
		isPopup,
		padding,
		width,
		currentColor,
		currentColorString,
		hslString,
		hslHueString,
		hslaString,
		onKeydown,
		color,
		options,
		internalState,
		$currentColor,
		$externalStore,
		input_inputEl_binding,
		mainlayout_containerEl_binding,
		span_binding
	];
}

class TJSColordPicker extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { color: 24, options: 25 }, null, [-1, -1]);
	}
}

Hooks.once('init', () =>
{
   !globalThis.foundry.utils.isNewerVersion(10, globalThis.game.version ?? globalThis.game?.data?.version);
});

function findDiffStart(a, b, pos) {
    for (let i = 0;; i++) {
        if (i == a.childCount || i == b.childCount)
            return a.childCount == b.childCount ? null : pos;
        let childA = a.child(i), childB = b.child(i);
        if (childA == childB) {
            pos += childA.nodeSize;
            continue;
        }
        if (!childA.sameMarkup(childB))
            return pos;
        if (childA.isText && childA.text != childB.text) {
            for (let j = 0; childA.text[j] == childB.text[j]; j++)
                pos++;
            return pos;
        }
        if (childA.content.size || childB.content.size) {
            let inner = findDiffStart(childA.content, childB.content, pos + 1);
            if (inner != null)
                return inner;
        }
        pos += childA.nodeSize;
    }
}
function findDiffEnd(a, b, posA, posB) {
    for (let iA = a.childCount, iB = b.childCount;;) {
        if (iA == 0 || iB == 0)
            return iA == iB ? null : { a: posA, b: posB };
        let childA = a.child(--iA), childB = b.child(--iB), size = childA.nodeSize;
        if (childA == childB) {
            posA -= size;
            posB -= size;
            continue;
        }
        if (!childA.sameMarkup(childB))
            return { a: posA, b: posB };
        if (childA.isText && childA.text != childB.text) {
            let same = 0, minSize = Math.min(childA.text.length, childB.text.length);
            while (same < minSize && childA.text[childA.text.length - same - 1] == childB.text[childB.text.length - same - 1]) {
                same++;
                posA--;
                posB--;
            }
            return { a: posA, b: posB };
        }
        if (childA.content.size || childB.content.size) {
            let inner = findDiffEnd(childA.content, childB.content, posA - 1, posB - 1);
            if (inner)
                return inner;
        }
        posA -= size;
        posB -= size;
    }
}

/**
A fragment represents a node's collection of child nodes.

Like nodes, fragments are persistent data structures, and you
should not mutate them or their content. Rather, you create new
instances whenever needed. The API tries to make this easy.
*/
class Fragment {
    /**
    @internal
    */
    constructor(
    /**
    @internal
    */
    content, size) {
        this.content = content;
        this.size = size || 0;
        if (size == null)
            for (let i = 0; i < content.length; i++)
                this.size += content[i].nodeSize;
    }
    /**
    Invoke a callback for all descendant nodes between the given two
    positions (relative to start of this fragment). Doesn't descend
    into a node when the callback returns `false`.
    */
    nodesBetween(from, to, f, nodeStart = 0, parent) {
        for (let i = 0, pos = 0; pos < to; i++) {
            let child = this.content[i], end = pos + child.nodeSize;
            if (end > from && f(child, nodeStart + pos, parent || null, i) !== false && child.content.size) {
                let start = pos + 1;
                child.nodesBetween(Math.max(0, from - start), Math.min(child.content.size, to - start), f, nodeStart + start);
            }
            pos = end;
        }
    }
    /**
    Call the given callback for every descendant node. `pos` will be
    relative to the start of the fragment. The callback may return
    `false` to prevent traversal of a given node's children.
    */
    descendants(f) {
        this.nodesBetween(0, this.size, f);
    }
    /**
    Extract the text between `from` and `to`. See the same method on
    [`Node`](https://prosemirror.net/docs/ref/#model.Node.textBetween).
    */
    textBetween(from, to, blockSeparator, leafText) {
        let text = "", separated = true;
        this.nodesBetween(from, to, (node, pos) => {
            if (node.isText) {
                text += node.text.slice(Math.max(from, pos) - pos, to - pos);
                separated = !blockSeparator;
            }
            else if (node.isLeaf) {
                if (leafText) {
                    text += typeof leafText === "function" ? leafText(node) : leafText;
                }
                else if (node.type.spec.leafText) {
                    text += node.type.spec.leafText(node);
                }
                separated = !blockSeparator;
            }
            else if (!separated && node.isBlock) {
                text += blockSeparator;
                separated = true;
            }
        }, 0);
        return text;
    }
    /**
    Create a new fragment containing the combined content of this
    fragment and the other.
    */
    append(other) {
        if (!other.size)
            return this;
        if (!this.size)
            return other;
        let last = this.lastChild, first = other.firstChild, content = this.content.slice(), i = 0;
        if (last.isText && last.sameMarkup(first)) {
            content[content.length - 1] = last.withText(last.text + first.text);
            i = 1;
        }
        for (; i < other.content.length; i++)
            content.push(other.content[i]);
        return new Fragment(content, this.size + other.size);
    }
    /**
    Cut out the sub-fragment between the two given positions.
    */
    cut(from, to = this.size) {
        if (from == 0 && to == this.size)
            return this;
        let result = [], size = 0;
        if (to > from)
            for (let i = 0, pos = 0; pos < to; i++) {
                let child = this.content[i], end = pos + child.nodeSize;
                if (end > from) {
                    if (pos < from || end > to) {
                        if (child.isText)
                            child = child.cut(Math.max(0, from - pos), Math.min(child.text.length, to - pos));
                        else
                            child = child.cut(Math.max(0, from - pos - 1), Math.min(child.content.size, to - pos - 1));
                    }
                    result.push(child);
                    size += child.nodeSize;
                }
                pos = end;
            }
        return new Fragment(result, size);
    }
    /**
    @internal
    */
    cutByIndex(from, to) {
        if (from == to)
            return Fragment.empty;
        if (from == 0 && to == this.content.length)
            return this;
        return new Fragment(this.content.slice(from, to));
    }
    /**
    Create a new fragment in which the node at the given index is
    replaced by the given node.
    */
    replaceChild(index, node) {
        let current = this.content[index];
        if (current == node)
            return this;
        let copy = this.content.slice();
        let size = this.size + node.nodeSize - current.nodeSize;
        copy[index] = node;
        return new Fragment(copy, size);
    }
    /**
    Create a new fragment by prepending the given node to this
    fragment.
    */
    addToStart(node) {
        return new Fragment([node].concat(this.content), this.size + node.nodeSize);
    }
    /**
    Create a new fragment by appending the given node to this
    fragment.
    */
    addToEnd(node) {
        return new Fragment(this.content.concat(node), this.size + node.nodeSize);
    }
    /**
    Compare this fragment to another one.
    */
    eq(other) {
        if (this.content.length != other.content.length)
            return false;
        for (let i = 0; i < this.content.length; i++)
            if (!this.content[i].eq(other.content[i]))
                return false;
        return true;
    }
    /**
    The first child of the fragment, or `null` if it is empty.
    */
    get firstChild() { return this.content.length ? this.content[0] : null; }
    /**
    The last child of the fragment, or `null` if it is empty.
    */
    get lastChild() { return this.content.length ? this.content[this.content.length - 1] : null; }
    /**
    The number of child nodes in this fragment.
    */
    get childCount() { return this.content.length; }
    /**
    Get the child node at the given index. Raise an error when the
    index is out of range.
    */
    child(index) {
        let found = this.content[index];
        if (!found)
            throw new RangeError("Index " + index + " out of range for " + this);
        return found;
    }
    /**
    Get the child node at the given index, if it exists.
    */
    maybeChild(index) {
        return this.content[index] || null;
    }
    /**
    Call `f` for every child node, passing the node, its offset
    into this parent node, and its index.
    */
    forEach(f) {
        for (let i = 0, p = 0; i < this.content.length; i++) {
            let child = this.content[i];
            f(child, p, i);
            p += child.nodeSize;
        }
    }
    /**
    Find the first position at which this fragment and another
    fragment differ, or `null` if they are the same.
    */
    findDiffStart(other, pos = 0) {
        return findDiffStart(this, other, pos);
    }
    /**
    Find the first position, searching from the end, at which this
    fragment and the given fragment differ, or `null` if they are
    the same. Since this position will not be the same in both
    nodes, an object with two separate positions is returned.
    */
    findDiffEnd(other, pos = this.size, otherPos = other.size) {
        return findDiffEnd(this, other, pos, otherPos);
    }
    /**
    Find the index and inner offset corresponding to a given relative
    position in this fragment. The result object will be reused
    (overwritten) the next time the function is called. (Not public.)
    */
    findIndex(pos, round = -1) {
        if (pos == 0)
            return retIndex(0, pos);
        if (pos == this.size)
            return retIndex(this.content.length, pos);
        if (pos > this.size || pos < 0)
            throw new RangeError(`Position ${pos} outside of fragment (${this})`);
        for (let i = 0, curPos = 0;; i++) {
            let cur = this.child(i), end = curPos + cur.nodeSize;
            if (end >= pos) {
                if (end == pos || round > 0)
                    return retIndex(i + 1, end);
                return retIndex(i, curPos);
            }
            curPos = end;
        }
    }
    /**
    Return a debugging string that describes this fragment.
    */
    toString() { return "<" + this.toStringInner() + ">"; }
    /**
    @internal
    */
    toStringInner() { return this.content.join(", "); }
    /**
    Create a JSON-serializeable representation of this fragment.
    */
    toJSON() {
        return this.content.length ? this.content.map(n => n.toJSON()) : null;
    }
    /**
    Deserialize a fragment from its JSON representation.
    */
    static fromJSON(schema, value) {
        if (!value)
            return Fragment.empty;
        if (!Array.isArray(value))
            throw new RangeError("Invalid input for Fragment.fromJSON");
        return new Fragment(value.map(schema.nodeFromJSON));
    }
    /**
    Build a fragment from an array of nodes. Ensures that adjacent
    text nodes with the same marks are joined together.
    */
    static fromArray(array) {
        if (!array.length)
            return Fragment.empty;
        let joined, size = 0;
        for (let i = 0; i < array.length; i++) {
            let node = array[i];
            size += node.nodeSize;
            if (i && node.isText && array[i - 1].sameMarkup(node)) {
                if (!joined)
                    joined = array.slice(0, i);
                joined[joined.length - 1] = node
                    .withText(joined[joined.length - 1].text + node.text);
            }
            else if (joined) {
                joined.push(node);
            }
        }
        return new Fragment(joined || array, size);
    }
    /**
    Create a fragment from something that can be interpreted as a
    set of nodes. For `null`, it returns the empty fragment. For a
    fragment, the fragment itself. For a node or array of nodes, a
    fragment containing those nodes.
    */
    static from(nodes) {
        if (!nodes)
            return Fragment.empty;
        if (nodes instanceof Fragment)
            return nodes;
        if (Array.isArray(nodes))
            return this.fromArray(nodes);
        if (nodes.attrs)
            return new Fragment([nodes], nodes.nodeSize);
        throw new RangeError("Can not convert " + nodes + " to a Fragment" +
            (nodes.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
    }
}
/**
An empty fragment. Intended to be reused whenever a node doesn't
contain anything (rather than allocating a new empty fragment for
each leaf node).
*/
Fragment.empty = new Fragment([], 0);
const found = { index: 0, offset: 0 };
function retIndex(index, offset) {
    found.index = index;
    found.offset = offset;
    return found;
}

/**
Error type raised by [`Node.replace`](https://prosemirror.net/docs/ref/#model.Node.replace) when
given an invalid replacement.
*/
class ReplaceError extends Error {
}
/*
ReplaceError = function(this: any, message: string) {
  let err = Error.call(this, message)
  ;(err as any).__proto__ = ReplaceError.prototype
  return err
} as any

ReplaceError.prototype = Object.create(Error.prototype)
ReplaceError.prototype.constructor = ReplaceError
ReplaceError.prototype.name = "ReplaceError"
*/
/**
A slice represents a piece cut out of a larger document. It
stores not only a fragment, but also the depth up to which nodes on
both side are ‘open’ (cut through).
*/
class Slice {
    /**
    Create a slice. When specifying a non-zero open depth, you must
    make sure that there are nodes of at least that depth at the
    appropriate side of the fragment—i.e. if the fragment is an
    empty paragraph node, `openStart` and `openEnd` can't be greater
    than 1.
    
    It is not necessary for the content of open nodes to conform to
    the schema's content constraints, though it should be a valid
    start/end/middle for such a node, depending on which sides are
    open.
    */
    constructor(
    /**
    The slice's content.
    */
    content, 
    /**
    The open depth at the start of the fragment.
    */
    openStart, 
    /**
    The open depth at the end.
    */
    openEnd) {
        this.content = content;
        this.openStart = openStart;
        this.openEnd = openEnd;
    }
    /**
    The size this slice would add when inserted into a document.
    */
    get size() {
        return this.content.size - this.openStart - this.openEnd;
    }
    /**
    @internal
    */
    insertAt(pos, fragment) {
        let content = insertInto(this.content, pos + this.openStart, fragment);
        return content && new Slice(content, this.openStart, this.openEnd);
    }
    /**
    @internal
    */
    removeBetween(from, to) {
        return new Slice(removeRange(this.content, from + this.openStart, to + this.openStart), this.openStart, this.openEnd);
    }
    /**
    Tests whether this slice is equal to another slice.
    */
    eq(other) {
        return this.content.eq(other.content) && this.openStart == other.openStart && this.openEnd == other.openEnd;
    }
    /**
    @internal
    */
    toString() {
        return this.content + "(" + this.openStart + "," + this.openEnd + ")";
    }
    /**
    Convert a slice to a JSON-serializable representation.
    */
    toJSON() {
        if (!this.content.size)
            return null;
        let json = { content: this.content.toJSON() };
        if (this.openStart > 0)
            json.openStart = this.openStart;
        if (this.openEnd > 0)
            json.openEnd = this.openEnd;
        return json;
    }
    /**
    Deserialize a slice from its JSON representation.
    */
    static fromJSON(schema, json) {
        if (!json)
            return Slice.empty;
        let openStart = json.openStart || 0, openEnd = json.openEnd || 0;
        if (typeof openStart != "number" || typeof openEnd != "number")
            throw new RangeError("Invalid input for Slice.fromJSON");
        return new Slice(Fragment.fromJSON(schema, json.content), openStart, openEnd);
    }
    /**
    Create a slice from a fragment by taking the maximum possible
    open value on both side of the fragment.
    */
    static maxOpen(fragment, openIsolating = true) {
        let openStart = 0, openEnd = 0;
        for (let n = fragment.firstChild; n && !n.isLeaf && (openIsolating || !n.type.spec.isolating); n = n.firstChild)
            openStart++;
        for (let n = fragment.lastChild; n && !n.isLeaf && (openIsolating || !n.type.spec.isolating); n = n.lastChild)
            openEnd++;
        return new Slice(fragment, openStart, openEnd);
    }
}
/**
The empty slice.
*/
Slice.empty = new Slice(Fragment.empty, 0, 0);
function removeRange(content, from, to) {
    let { index, offset } = content.findIndex(from), child = content.maybeChild(index);
    let { index: indexTo, offset: offsetTo } = content.findIndex(to);
    if (offset == from || child.isText) {
        if (offsetTo != to && !content.child(indexTo).isText)
            throw new RangeError("Removing non-flat range");
        return content.cut(0, from).append(content.cut(to));
    }
    if (index != indexTo)
        throw new RangeError("Removing non-flat range");
    return content.replaceChild(index, child.copy(removeRange(child.content, from - offset - 1, to - offset - 1)));
}
function insertInto(content, dist, insert, parent) {
    let { index, offset } = content.findIndex(dist), child = content.maybeChild(index);
    if (offset == dist || child.isText) {
        if (parent && !parent.canReplace(index, index, insert))
            return null;
        return content.cut(0, dist).append(insert).append(content.cut(dist));
    }
    let inner = insertInto(child.content, dist - offset - 1, insert);
    return inner && content.replaceChild(index, child.copy(inner));
}

// Recovery values encode a range index and an offset. They are
// represented as numbers, because tons of them will be created when
// mapping, for example, a large number of decorations. The number's
// lower 16 bits provide the index, the remaining bits the offset.
//
// Note: We intentionally don't use bit shift operators to en- and
// decode these, since those clip to 32 bits, which we might in rare
// cases want to overflow. A 64-bit float can represent 48-bit
// integers precisely.
const lower16 = 0xffff;
const factor16 = Math.pow(2, 16);
function makeRecover(index, offset) { return index + offset * factor16; }
function recoverIndex(value) { return value & lower16; }
function recoverOffset(value) { return (value - (value & lower16)) / factor16; }
const DEL_BEFORE = 1, DEL_AFTER = 2, DEL_ACROSS = 4, DEL_SIDE = 8;
/**
An object representing a mapped position with extra
information.
*/
class MapResult {
    /**
    @internal
    */
    constructor(
    /**
    The mapped version of the position.
    */
    pos, 
    /**
    @internal
    */
    delInfo, 
    /**
    @internal
    */
    recover) {
        this.pos = pos;
        this.delInfo = delInfo;
        this.recover = recover;
    }
    /**
    Tells you whether the position was deleted, that is, whether the
    step removed the token on the side queried (via the `assoc`)
    argument from the document.
    */
    get deleted() { return (this.delInfo & DEL_SIDE) > 0; }
    /**
    Tells you whether the token before the mapped position was deleted.
    */
    get deletedBefore() { return (this.delInfo & (DEL_BEFORE | DEL_ACROSS)) > 0; }
    /**
    True when the token after the mapped position was deleted.
    */
    get deletedAfter() { return (this.delInfo & (DEL_AFTER | DEL_ACROSS)) > 0; }
    /**
    Tells whether any of the steps mapped through deletes across the
    position (including both the token before and after the
    position).
    */
    get deletedAcross() { return (this.delInfo & DEL_ACROSS) > 0; }
}
/**
A map describing the deletions and insertions made by a step, which
can be used to find the correspondence between positions in the
pre-step version of a document and the same position in the
post-step version.
*/
class StepMap {
    /**
    Create a position map. The modifications to the document are
    represented as an array of numbers, in which each group of three
    represents a modified chunk as `[start, oldSize, newSize]`.
    */
    constructor(
    /**
    @internal
    */
    ranges, 
    /**
    @internal
    */
    inverted = false) {
        this.ranges = ranges;
        this.inverted = inverted;
        if (!ranges.length && StepMap.empty)
            return StepMap.empty;
    }
    /**
    @internal
    */
    recover(value) {
        let diff = 0, index = recoverIndex(value);
        if (!this.inverted)
            for (let i = 0; i < index; i++)
                diff += this.ranges[i * 3 + 2] - this.ranges[i * 3 + 1];
        return this.ranges[index * 3] + diff + recoverOffset(value);
    }
    mapResult(pos, assoc = 1) { return this._map(pos, assoc, false); }
    map(pos, assoc = 1) { return this._map(pos, assoc, true); }
    /**
    @internal
    */
    _map(pos, assoc, simple) {
        let diff = 0, oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
        for (let i = 0; i < this.ranges.length; i += 3) {
            let start = this.ranges[i] - (this.inverted ? diff : 0);
            if (start > pos)
                break;
            let oldSize = this.ranges[i + oldIndex], newSize = this.ranges[i + newIndex], end = start + oldSize;
            if (pos <= end) {
                let side = !oldSize ? assoc : pos == start ? -1 : pos == end ? 1 : assoc;
                let result = start + diff + (side < 0 ? 0 : newSize);
                if (simple)
                    return result;
                let recover = pos == (assoc < 0 ? start : end) ? null : makeRecover(i / 3, pos - start);
                let del = pos == start ? DEL_AFTER : pos == end ? DEL_BEFORE : DEL_ACROSS;
                if (assoc < 0 ? pos != start : pos != end)
                    del |= DEL_SIDE;
                return new MapResult(result, del, recover);
            }
            diff += newSize - oldSize;
        }
        return simple ? pos + diff : new MapResult(pos + diff, 0, null);
    }
    /**
    @internal
    */
    touches(pos, recover) {
        let diff = 0, index = recoverIndex(recover);
        let oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
        for (let i = 0; i < this.ranges.length; i += 3) {
            let start = this.ranges[i] - (this.inverted ? diff : 0);
            if (start > pos)
                break;
            let oldSize = this.ranges[i + oldIndex], end = start + oldSize;
            if (pos <= end && i == index * 3)
                return true;
            diff += this.ranges[i + newIndex] - oldSize;
        }
        return false;
    }
    /**
    Calls the given function on each of the changed ranges included in
    this map.
    */
    forEach(f) {
        let oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
        for (let i = 0, diff = 0; i < this.ranges.length; i += 3) {
            let start = this.ranges[i], oldStart = start - (this.inverted ? diff : 0), newStart = start + (this.inverted ? 0 : diff);
            let oldSize = this.ranges[i + oldIndex], newSize = this.ranges[i + newIndex];
            f(oldStart, oldStart + oldSize, newStart, newStart + newSize);
            diff += newSize - oldSize;
        }
    }
    /**
    Create an inverted version of this map. The result can be used to
    map positions in the post-step document to the pre-step document.
    */
    invert() {
        return new StepMap(this.ranges, !this.inverted);
    }
    /**
    @internal
    */
    toString() {
        return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
    }
    /**
    Create a map that moves all positions by offset `n` (which may be
    negative). This can be useful when applying steps meant for a
    sub-document to a larger document, or vice-versa.
    */
    static offset(n) {
        return n == 0 ? StepMap.empty : new StepMap(n < 0 ? [0, -n, 0] : [0, 0, n]);
    }
}
/**
A StepMap that contains no changed ranges.
*/
StepMap.empty = new StepMap([]);

const stepsByID = Object.create(null);
/**
A step object represents an atomic change. It generally applies
only to the document it was created for, since the positions
stored in it will only make sense for that document.

New steps are defined by creating classes that extend `Step`,
overriding the `apply`, `invert`, `map`, `getMap` and `fromJSON`
methods, and registering your class with a unique
JSON-serialization identifier using
[`Step.jsonID`](https://prosemirror.net/docs/ref/#transform.Step^jsonID).
*/
class Step {
    /**
    Get the step map that represents the changes made by this step,
    and which can be used to transform between positions in the old
    and the new document.
    */
    getMap() { return StepMap.empty; }
    /**
    Try to merge this step with another one, to be applied directly
    after it. Returns the merged step when possible, null if the
    steps can't be merged.
    */
    merge(other) { return null; }
    /**
    Deserialize a step from its JSON representation. Will call
    through to the step class' own implementation of this method.
    */
    static fromJSON(schema, json) {
        if (!json || !json.stepType)
            throw new RangeError("Invalid input for Step.fromJSON");
        let type = stepsByID[json.stepType];
        if (!type)
            throw new RangeError(`No step type ${json.stepType} defined`);
        return type.fromJSON(schema, json);
    }
    /**
    To be able to serialize steps to JSON, each step needs a string
    ID to attach to its JSON representation. Use this method to
    register an ID for your step classes. Try to pick something
    that's unlikely to clash with steps from other modules.
    */
    static jsonID(id, stepClass) {
        if (id in stepsByID)
            throw new RangeError("Duplicate use of step JSON ID " + id);
        stepsByID[id] = stepClass;
        stepClass.prototype.jsonID = id;
        return stepClass;
    }
}
/**
The result of [applying](https://prosemirror.net/docs/ref/#transform.Step.apply) a step. Contains either a
new document or a failure value.
*/
class StepResult {
    /**
    @internal
    */
    constructor(
    /**
    The transformed document, if successful.
    */
    doc, 
    /**
    The failure message, if unsuccessful.
    */
    failed) {
        this.doc = doc;
        this.failed = failed;
    }
    /**
    Create a successful step result.
    */
    static ok(doc) { return new StepResult(doc, null); }
    /**
    Create a failed step result.
    */
    static fail(message) { return new StepResult(null, message); }
    /**
    Call [`Node.replace`](https://prosemirror.net/docs/ref/#model.Node.replace) with the given
    arguments. Create a successful result if it succeeds, and a
    failed one if it throws a `ReplaceError`.
    */
    static fromReplace(doc, from, to, slice) {
        try {
            return StepResult.ok(doc.replace(from, to, slice));
        }
        catch (e) {
            if (e instanceof ReplaceError)
                return StepResult.fail(e.message);
            throw e;
        }
    }
}

function mapFragment(fragment, f, parent) {
    let mapped = [];
    for (let i = 0; i < fragment.childCount; i++) {
        let child = fragment.child(i);
        if (child.content.size)
            child = child.copy(mapFragment(child.content, f, child));
        if (child.isInline)
            child = f(child, parent, i);
        mapped.push(child);
    }
    return Fragment.fromArray(mapped);
}
/**
Add a mark to all inline content between two positions.
*/
class AddMarkStep extends Step {
    /**
    Create a mark step.
    */
    constructor(
    /**
    The start of the marked range.
    */
    from, 
    /**
    The end of the marked range.
    */
    to, 
    /**
    The mark to add.
    */
    mark) {
        super();
        this.from = from;
        this.to = to;
        this.mark = mark;
    }
    apply(doc) {
        let oldSlice = doc.slice(this.from, this.to), $from = doc.resolve(this.from);
        let parent = $from.node($from.sharedDepth(this.to));
        let slice = new Slice(mapFragment(oldSlice.content, (node, parent) => {
            if (!node.isAtom || !parent.type.allowsMarkType(this.mark.type))
                return node;
            return node.mark(this.mark.addToSet(node.marks));
        }, parent), oldSlice.openStart, oldSlice.openEnd);
        return StepResult.fromReplace(doc, this.from, this.to, slice);
    }
    invert() {
        return new RemoveMarkStep(this.from, this.to, this.mark);
    }
    map(mapping) {
        let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
        if (from.deleted && to.deleted || from.pos >= to.pos)
            return null;
        return new AddMarkStep(from.pos, to.pos, this.mark);
    }
    merge(other) {
        if (other instanceof AddMarkStep &&
            other.mark.eq(this.mark) &&
            this.from <= other.to && this.to >= other.from)
            return new AddMarkStep(Math.min(this.from, other.from), Math.max(this.to, other.to), this.mark);
        return null;
    }
    toJSON() {
        return { stepType: "addMark", mark: this.mark.toJSON(),
            from: this.from, to: this.to };
    }
    /**
    @internal
    */
    static fromJSON(schema, json) {
        if (typeof json.from != "number" || typeof json.to != "number")
            throw new RangeError("Invalid input for AddMarkStep.fromJSON");
        return new AddMarkStep(json.from, json.to, schema.markFromJSON(json.mark));
    }
}
Step.jsonID("addMark", AddMarkStep);
/**
Remove a mark from all inline content between two positions.
*/
class RemoveMarkStep extends Step {
    /**
    Create a mark-removing step.
    */
    constructor(
    /**
    The start of the unmarked range.
    */
    from, 
    /**
    The end of the unmarked range.
    */
    to, 
    /**
    The mark to remove.
    */
    mark) {
        super();
        this.from = from;
        this.to = to;
        this.mark = mark;
    }
    apply(doc) {
        let oldSlice = doc.slice(this.from, this.to);
        let slice = new Slice(mapFragment(oldSlice.content, node => {
            return node.mark(this.mark.removeFromSet(node.marks));
        }, doc), oldSlice.openStart, oldSlice.openEnd);
        return StepResult.fromReplace(doc, this.from, this.to, slice);
    }
    invert() {
        return new AddMarkStep(this.from, this.to, this.mark);
    }
    map(mapping) {
        let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
        if (from.deleted && to.deleted || from.pos >= to.pos)
            return null;
        return new RemoveMarkStep(from.pos, to.pos, this.mark);
    }
    merge(other) {
        if (other instanceof RemoveMarkStep &&
            other.mark.eq(this.mark) &&
            this.from <= other.to && this.to >= other.from)
            return new RemoveMarkStep(Math.min(this.from, other.from), Math.max(this.to, other.to), this.mark);
        return null;
    }
    toJSON() {
        return { stepType: "removeMark", mark: this.mark.toJSON(),
            from: this.from, to: this.to };
    }
    /**
    @internal
    */
    static fromJSON(schema, json) {
        if (typeof json.from != "number" || typeof json.to != "number")
            throw new RangeError("Invalid input for RemoveMarkStep.fromJSON");
        return new RemoveMarkStep(json.from, json.to, schema.markFromJSON(json.mark));
    }
}
Step.jsonID("removeMark", RemoveMarkStep);
/**
Add a mark to a specific node.
*/
class AddNodeMarkStep extends Step {
    /**
    Create a node mark step.
    */
    constructor(
    /**
    The position of the target node.
    */
    pos, 
    /**
    The mark to add.
    */
    mark) {
        super();
        this.pos = pos;
        this.mark = mark;
    }
    apply(doc) {
        let node = doc.nodeAt(this.pos);
        if (!node)
            return StepResult.fail("No node at mark step's position");
        let updated = node.type.create(node.attrs, null, this.mark.addToSet(node.marks));
        return StepResult.fromReplace(doc, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
    }
    invert(doc) {
        let node = doc.nodeAt(this.pos);
        if (node) {
            let newSet = this.mark.addToSet(node.marks);
            if (newSet.length == node.marks.length) {
                for (let i = 0; i < node.marks.length; i++)
                    if (!node.marks[i].isInSet(newSet))
                        return new AddNodeMarkStep(this.pos, node.marks[i]);
                return new AddNodeMarkStep(this.pos, this.mark);
            }
        }
        return new RemoveNodeMarkStep(this.pos, this.mark);
    }
    map(mapping) {
        let pos = mapping.mapResult(this.pos, 1);
        return pos.deletedAfter ? null : new AddNodeMarkStep(pos.pos, this.mark);
    }
    toJSON() {
        return { stepType: "addNodeMark", pos: this.pos, mark: this.mark.toJSON() };
    }
    /**
    @internal
    */
    static fromJSON(schema, json) {
        if (typeof json.pos != "number")
            throw new RangeError("Invalid input for AddNodeMarkStep.fromJSON");
        return new AddNodeMarkStep(json.pos, schema.markFromJSON(json.mark));
    }
}
Step.jsonID("addNodeMark", AddNodeMarkStep);
/**
Remove a mark from a specific node.
*/
class RemoveNodeMarkStep extends Step {
    /**
    Create a mark-removing step.
    */
    constructor(
    /**
    The position of the target node.
    */
    pos, 
    /**
    The mark to remove.
    */
    mark) {
        super();
        this.pos = pos;
        this.mark = mark;
    }
    apply(doc) {
        let node = doc.nodeAt(this.pos);
        if (!node)
            return StepResult.fail("No node at mark step's position");
        let updated = node.type.create(node.attrs, null, this.mark.removeFromSet(node.marks));
        return StepResult.fromReplace(doc, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
    }
    invert(doc) {
        let node = doc.nodeAt(this.pos);
        if (!node || !this.mark.isInSet(node.marks))
            return this;
        return new AddNodeMarkStep(this.pos, this.mark);
    }
    map(mapping) {
        let pos = mapping.mapResult(this.pos, 1);
        return pos.deletedAfter ? null : new RemoveNodeMarkStep(pos.pos, this.mark);
    }
    toJSON() {
        return { stepType: "removeNodeMark", pos: this.pos, mark: this.mark.toJSON() };
    }
    /**
    @internal
    */
    static fromJSON(schema, json) {
        if (typeof json.pos != "number")
            throw new RangeError("Invalid input for RemoveNodeMarkStep.fromJSON");
        return new RemoveNodeMarkStep(json.pos, schema.markFromJSON(json.mark));
    }
}
Step.jsonID("removeNodeMark", RemoveNodeMarkStep);

/**
Replace a part of the document with a slice of new content.
*/
class ReplaceStep extends Step {
    /**
    The given `slice` should fit the 'gap' between `from` and
    `to`—the depths must line up, and the surrounding nodes must be
    able to be joined with the open sides of the slice. When
    `structure` is true, the step will fail if the content between
    from and to is not just a sequence of closing and then opening
    tokens (this is to guard against rebased replace steps
    overwriting something they weren't supposed to).
    */
    constructor(
    /**
    The start position of the replaced range.
    */
    from, 
    /**
    The end position of the replaced range.
    */
    to, 
    /**
    The slice to insert.
    */
    slice, 
    /**
    @internal
    */
    structure = false) {
        super();
        this.from = from;
        this.to = to;
        this.slice = slice;
        this.structure = structure;
    }
    apply(doc) {
        if (this.structure && contentBetween(doc, this.from, this.to))
            return StepResult.fail("Structure replace would overwrite content");
        return StepResult.fromReplace(doc, this.from, this.to, this.slice);
    }
    getMap() {
        return new StepMap([this.from, this.to - this.from, this.slice.size]);
    }
    invert(doc) {
        return new ReplaceStep(this.from, this.from + this.slice.size, doc.slice(this.from, this.to));
    }
    map(mapping) {
        let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
        if (from.deletedAcross && to.deletedAcross)
            return null;
        return new ReplaceStep(from.pos, Math.max(from.pos, to.pos), this.slice);
    }
    merge(other) {
        if (!(other instanceof ReplaceStep) || other.structure || this.structure)
            return null;
        if (this.from + this.slice.size == other.from && !this.slice.openEnd && !other.slice.openStart) {
            let slice = this.slice.size + other.slice.size == 0 ? Slice.empty
                : new Slice(this.slice.content.append(other.slice.content), this.slice.openStart, other.slice.openEnd);
            return new ReplaceStep(this.from, this.to + (other.to - other.from), slice, this.structure);
        }
        else if (other.to == this.from && !this.slice.openStart && !other.slice.openEnd) {
            let slice = this.slice.size + other.slice.size == 0 ? Slice.empty
                : new Slice(other.slice.content.append(this.slice.content), other.slice.openStart, this.slice.openEnd);
            return new ReplaceStep(other.from, this.to, slice, this.structure);
        }
        else {
            return null;
        }
    }
    toJSON() {
        let json = { stepType: "replace", from: this.from, to: this.to };
        if (this.slice.size)
            json.slice = this.slice.toJSON();
        if (this.structure)
            json.structure = true;
        return json;
    }
    /**
    @internal
    */
    static fromJSON(schema, json) {
        if (typeof json.from != "number" || typeof json.to != "number")
            throw new RangeError("Invalid input for ReplaceStep.fromJSON");
        return new ReplaceStep(json.from, json.to, Slice.fromJSON(schema, json.slice), !!json.structure);
    }
}
Step.jsonID("replace", ReplaceStep);
/**
Replace a part of the document with a slice of content, but
preserve a range of the replaced content by moving it into the
slice.
*/
class ReplaceAroundStep extends Step {
    /**
    Create a replace-around step with the given range and gap.
    `insert` should be the point in the slice into which the content
    of the gap should be moved. `structure` has the same meaning as
    it has in the [`ReplaceStep`](https://prosemirror.net/docs/ref/#transform.ReplaceStep) class.
    */
    constructor(
    /**
    The start position of the replaced range.
    */
    from, 
    /**
    The end position of the replaced range.
    */
    to, 
    /**
    The start of preserved range.
    */
    gapFrom, 
    /**
    The end of preserved range.
    */
    gapTo, 
    /**
    The slice to insert.
    */
    slice, 
    /**
    The position in the slice where the preserved range should be
    inserted.
    */
    insert, 
    /**
    @internal
    */
    structure = false) {
        super();
        this.from = from;
        this.to = to;
        this.gapFrom = gapFrom;
        this.gapTo = gapTo;
        this.slice = slice;
        this.insert = insert;
        this.structure = structure;
    }
    apply(doc) {
        if (this.structure && (contentBetween(doc, this.from, this.gapFrom) ||
            contentBetween(doc, this.gapTo, this.to)))
            return StepResult.fail("Structure gap-replace would overwrite content");
        let gap = doc.slice(this.gapFrom, this.gapTo);
        if (gap.openStart || gap.openEnd)
            return StepResult.fail("Gap is not a flat range");
        let inserted = this.slice.insertAt(this.insert, gap.content);
        if (!inserted)
            return StepResult.fail("Content does not fit in gap");
        return StepResult.fromReplace(doc, this.from, this.to, inserted);
    }
    getMap() {
        return new StepMap([this.from, this.gapFrom - this.from, this.insert,
            this.gapTo, this.to - this.gapTo, this.slice.size - this.insert]);
    }
    invert(doc) {
        let gap = this.gapTo - this.gapFrom;
        return new ReplaceAroundStep(this.from, this.from + this.slice.size + gap, this.from + this.insert, this.from + this.insert + gap, doc.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
    }
    map(mapping) {
        let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
        let gapFrom = mapping.map(this.gapFrom, -1), gapTo = mapping.map(this.gapTo, 1);
        if ((from.deletedAcross && to.deletedAcross) || gapFrom < from.pos || gapTo > to.pos)
            return null;
        return new ReplaceAroundStep(from.pos, to.pos, gapFrom, gapTo, this.slice, this.insert, this.structure);
    }
    toJSON() {
        let json = { stepType: "replaceAround", from: this.from, to: this.to,
            gapFrom: this.gapFrom, gapTo: this.gapTo, insert: this.insert };
        if (this.slice.size)
            json.slice = this.slice.toJSON();
        if (this.structure)
            json.structure = true;
        return json;
    }
    /**
    @internal
    */
    static fromJSON(schema, json) {
        if (typeof json.from != "number" || typeof json.to != "number" ||
            typeof json.gapFrom != "number" || typeof json.gapTo != "number" || typeof json.insert != "number")
            throw new RangeError("Invalid input for ReplaceAroundStep.fromJSON");
        return new ReplaceAroundStep(json.from, json.to, json.gapFrom, json.gapTo, Slice.fromJSON(schema, json.slice), json.insert, !!json.structure);
    }
}
Step.jsonID("replaceAround", ReplaceAroundStep);
function contentBetween(doc, from, to) {
    let $from = doc.resolve(from), dist = to - from, depth = $from.depth;
    while (dist > 0 && depth > 0 && $from.indexAfter(depth) == $from.node(depth).childCount) {
        depth--;
        dist--;
    }
    if (dist > 0) {
        let next = $from.node(depth).maybeChild($from.indexAfter(depth));
        while (dist > 0) {
            if (!next || next.isLeaf)
                return true;
            next = next.firstChild;
            dist--;
        }
    }
    return false;
}

/**
Update an attribute in a specific node.
*/
class AttrStep extends Step {
    /**
    Construct an attribute step.
    */
    constructor(
    /**
    The position of the target node.
    */
    pos, 
    /**
    The attribute to set.
    */
    attr, 
    // The attribute's new value.
    value) {
        super();
        this.pos = pos;
        this.attr = attr;
        this.value = value;
    }
    apply(doc) {
        let node = doc.nodeAt(this.pos);
        if (!node)
            return StepResult.fail("No node at attribute step's position");
        let attrs = Object.create(null);
        for (let name in node.attrs)
            attrs[name] = node.attrs[name];
        attrs[this.attr] = this.value;
        let updated = node.type.create(attrs, null, node.marks);
        return StepResult.fromReplace(doc, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
    }
    getMap() {
        return StepMap.empty;
    }
    invert(doc) {
        return new AttrStep(this.pos, this.attr, doc.nodeAt(this.pos).attrs[this.attr]);
    }
    map(mapping) {
        let pos = mapping.mapResult(this.pos, 1);
        return pos.deletedAfter ? null : new AttrStep(pos.pos, this.attr, this.value);
    }
    toJSON() {
        return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
    }
    static fromJSON(schema, json) {
        if (typeof json.pos != "number" || typeof json.attr != "string")
            throw new RangeError("Invalid input for AttrStep.fromJSON");
        return new AttrStep(json.pos, json.attr, json.value);
    }
}
Step.jsonID("attr", AttrStep);

/**
@internal
*/
let TransformError = class extends Error {
};
TransformError = function TransformError(message) {
    let err = Error.call(this, message);
    err.__proto__ = TransformError.prototype;
    return err;
};
TransformError.prototype = Object.create(Error.prototype);
TransformError.prototype.constructor = TransformError;
TransformError.prototype.name = "TransformError";

const classesById = Object.create(null);
/**
Superclass for editor selections. Every selection type should
extend this. Should not be instantiated directly.
*/
class Selection {
    /**
    Initialize a selection with the head and anchor and ranges. If no
    ranges are given, constructs a single range across `$anchor` and
    `$head`.
    */
    constructor(
    /**
    The resolved anchor of the selection (the side that stays in
    place when the selection is modified).
    */
    $anchor, 
    /**
    The resolved head of the selection (the side that moves when
    the selection is modified).
    */
    $head, ranges) {
        this.$anchor = $anchor;
        this.$head = $head;
        this.ranges = ranges || [new SelectionRange($anchor.min($head), $anchor.max($head))];
    }
    /**
    The selection's anchor, as an unresolved position.
    */
    get anchor() { return this.$anchor.pos; }
    /**
    The selection's head.
    */
    get head() { return this.$head.pos; }
    /**
    The lower bound of the selection's main range.
    */
    get from() { return this.$from.pos; }
    /**
    The upper bound of the selection's main range.
    */
    get to() { return this.$to.pos; }
    /**
    The resolved lower  bound of the selection's main range.
    */
    get $from() {
        return this.ranges[0].$from;
    }
    /**
    The resolved upper bound of the selection's main range.
    */
    get $to() {
        return this.ranges[0].$to;
    }
    /**
    Indicates whether the selection contains any content.
    */
    get empty() {
        let ranges = this.ranges;
        for (let i = 0; i < ranges.length; i++)
            if (ranges[i].$from.pos != ranges[i].$to.pos)
                return false;
        return true;
    }
    /**
    Get the content of this selection as a slice.
    */
    content() {
        return this.$from.doc.slice(this.from, this.to, true);
    }
    /**
    Replace the selection with a slice or, if no slice is given,
    delete the selection. Will append to the given transaction.
    */
    replace(tr, content = Slice.empty) {
        // Put the new selection at the position after the inserted
        // content. When that ended in an inline node, search backwards,
        // to get the position after that node. If not, search forward.
        let lastNode = content.content.lastChild, lastParent = null;
        for (let i = 0; i < content.openEnd; i++) {
            lastParent = lastNode;
            lastNode = lastNode.lastChild;
        }
        let mapFrom = tr.steps.length, ranges = this.ranges;
        for (let i = 0; i < ranges.length; i++) {
            let { $from, $to } = ranges[i], mapping = tr.mapping.slice(mapFrom);
            tr.replaceRange(mapping.map($from.pos), mapping.map($to.pos), i ? Slice.empty : content);
            if (i == 0)
                selectionToInsertionEnd(tr, mapFrom, (lastNode ? lastNode.isInline : lastParent && lastParent.isTextblock) ? -1 : 1);
        }
    }
    /**
    Replace the selection with the given node, appending the changes
    to the given transaction.
    */
    replaceWith(tr, node) {
        let mapFrom = tr.steps.length, ranges = this.ranges;
        for (let i = 0; i < ranges.length; i++) {
            let { $from, $to } = ranges[i], mapping = tr.mapping.slice(mapFrom);
            let from = mapping.map($from.pos), to = mapping.map($to.pos);
            if (i) {
                tr.deleteRange(from, to);
            }
            else {
                tr.replaceRangeWith(from, to, node);
                selectionToInsertionEnd(tr, mapFrom, node.isInline ? -1 : 1);
            }
        }
    }
    /**
    Find a valid cursor or leaf node selection starting at the given
    position and searching back if `dir` is negative, and forward if
    positive. When `textOnly` is true, only consider cursor
    selections. Will return null when no valid selection position is
    found.
    */
    static findFrom($pos, dir, textOnly = false) {
        let inner = $pos.parent.inlineContent ? new TextSelection($pos)
            : findSelectionIn($pos.node(0), $pos.parent, $pos.pos, $pos.index(), dir, textOnly);
        if (inner)
            return inner;
        for (let depth = $pos.depth - 1; depth >= 0; depth--) {
            let found = dir < 0
                ? findSelectionIn($pos.node(0), $pos.node(depth), $pos.before(depth + 1), $pos.index(depth), dir, textOnly)
                : findSelectionIn($pos.node(0), $pos.node(depth), $pos.after(depth + 1), $pos.index(depth) + 1, dir, textOnly);
            if (found)
                return found;
        }
        return null;
    }
    /**
    Find a valid cursor or leaf node selection near the given
    position. Searches forward first by default, but if `bias` is
    negative, it will search backwards first.
    */
    static near($pos, bias = 1) {
        return this.findFrom($pos, bias) || this.findFrom($pos, -bias) || new AllSelection($pos.node(0));
    }
    /**
    Find the cursor or leaf node selection closest to the start of
    the given document. Will return an
    [`AllSelection`](https://prosemirror.net/docs/ref/#state.AllSelection) if no valid position
    exists.
    */
    static atStart(doc) {
        return findSelectionIn(doc, doc, 0, 0, 1) || new AllSelection(doc);
    }
    /**
    Find the cursor or leaf node selection closest to the end of the
    given document.
    */
    static atEnd(doc) {
        return findSelectionIn(doc, doc, doc.content.size, doc.childCount, -1) || new AllSelection(doc);
    }
    /**
    Deserialize the JSON representation of a selection. Must be
    implemented for custom classes (as a static class method).
    */
    static fromJSON(doc, json) {
        if (!json || !json.type)
            throw new RangeError("Invalid input for Selection.fromJSON");
        let cls = classesById[json.type];
        if (!cls)
            throw new RangeError(`No selection type ${json.type} defined`);
        return cls.fromJSON(doc, json);
    }
    /**
    To be able to deserialize selections from JSON, custom selection
    classes must register themselves with an ID string, so that they
    can be disambiguated. Try to pick something that's unlikely to
    clash with classes from other modules.
    */
    static jsonID(id, selectionClass) {
        if (id in classesById)
            throw new RangeError("Duplicate use of selection JSON ID " + id);
        classesById[id] = selectionClass;
        selectionClass.prototype.jsonID = id;
        return selectionClass;
    }
    /**
    Get a [bookmark](https://prosemirror.net/docs/ref/#state.SelectionBookmark) for this selection,
    which is a value that can be mapped without having access to a
    current document, and later resolved to a real selection for a
    given document again. (This is used mostly by the history to
    track and restore old selections.) The default implementation of
    this method just converts the selection to a text selection and
    returns the bookmark for that.
    */
    getBookmark() {
        return TextSelection.between(this.$anchor, this.$head).getBookmark();
    }
}
Selection.prototype.visible = true;
/**
Represents a selected range in a document.
*/
class SelectionRange {
    /**
    Create a range.
    */
    constructor(
    /**
    The lower bound of the range.
    */
    $from, 
    /**
    The upper bound of the range.
    */
    $to) {
        this.$from = $from;
        this.$to = $to;
    }
}
let warnedAboutTextSelection = false;
function checkTextSelection($pos) {
    if (!warnedAboutTextSelection && !$pos.parent.inlineContent) {
        warnedAboutTextSelection = true;
        console["warn"]("TextSelection endpoint not pointing into a node with inline content (" + $pos.parent.type.name + ")");
    }
}
/**
A text selection represents a classical editor selection, with a
head (the moving side) and anchor (immobile side), both of which
point into textblock nodes. It can be empty (a regular cursor
position).
*/
class TextSelection extends Selection {
    /**
    Construct a text selection between the given points.
    */
    constructor($anchor, $head = $anchor) {
        checkTextSelection($anchor);
        checkTextSelection($head);
        super($anchor, $head);
    }
    /**
    Returns a resolved position if this is a cursor selection (an
    empty text selection), and null otherwise.
    */
    get $cursor() { return this.$anchor.pos == this.$head.pos ? this.$head : null; }
    map(doc, mapping) {
        let $head = doc.resolve(mapping.map(this.head));
        if (!$head.parent.inlineContent)
            return Selection.near($head);
        let $anchor = doc.resolve(mapping.map(this.anchor));
        return new TextSelection($anchor.parent.inlineContent ? $anchor : $head, $head);
    }
    replace(tr, content = Slice.empty) {
        super.replace(tr, content);
        if (content == Slice.empty) {
            let marks = this.$from.marksAcross(this.$to);
            if (marks)
                tr.ensureMarks(marks);
        }
    }
    eq(other) {
        return other instanceof TextSelection && other.anchor == this.anchor && other.head == this.head;
    }
    getBookmark() {
        return new TextBookmark(this.anchor, this.head);
    }
    toJSON() {
        return { type: "text", anchor: this.anchor, head: this.head };
    }
    /**
    @internal
    */
    static fromJSON(doc, json) {
        if (typeof json.anchor != "number" || typeof json.head != "number")
            throw new RangeError("Invalid input for TextSelection.fromJSON");
        return new TextSelection(doc.resolve(json.anchor), doc.resolve(json.head));
    }
    /**
    Create a text selection from non-resolved positions.
    */
    static create(doc, anchor, head = anchor) {
        let $anchor = doc.resolve(anchor);
        return new this($anchor, head == anchor ? $anchor : doc.resolve(head));
    }
    /**
    Return a text selection that spans the given positions or, if
    they aren't text positions, find a text selection near them.
    `bias` determines whether the method searches forward (default)
    or backwards (negative number) first. Will fall back to calling
    [`Selection.near`](https://prosemirror.net/docs/ref/#state.Selection^near) when the document
    doesn't contain a valid text position.
    */
    static between($anchor, $head, bias) {
        let dPos = $anchor.pos - $head.pos;
        if (!bias || dPos)
            bias = dPos >= 0 ? 1 : -1;
        if (!$head.parent.inlineContent) {
            let found = Selection.findFrom($head, bias, true) || Selection.findFrom($head, -bias, true);
            if (found)
                $head = found.$head;
            else
                return Selection.near($head, bias);
        }
        if (!$anchor.parent.inlineContent) {
            if (dPos == 0) {
                $anchor = $head;
            }
            else {
                $anchor = (Selection.findFrom($anchor, -bias, true) || Selection.findFrom($anchor, bias, true)).$anchor;
                if (($anchor.pos < $head.pos) != (dPos < 0))
                    $anchor = $head;
            }
        }
        return new TextSelection($anchor, $head);
    }
}
Selection.jsonID("text", TextSelection);
class TextBookmark {
    constructor(anchor, head) {
        this.anchor = anchor;
        this.head = head;
    }
    map(mapping) {
        return new TextBookmark(mapping.map(this.anchor), mapping.map(this.head));
    }
    resolve(doc) {
        return TextSelection.between(doc.resolve(this.anchor), doc.resolve(this.head));
    }
}
/**
A node selection is a selection that points at a single node. All
nodes marked [selectable](https://prosemirror.net/docs/ref/#model.NodeSpec.selectable) can be the
target of a node selection. In such a selection, `from` and `to`
point directly before and after the selected node, `anchor` equals
`from`, and `head` equals `to`..
*/
class NodeSelection extends Selection {
    /**
    Create a node selection. Does not verify the validity of its
    argument.
    */
    constructor($pos) {
        let node = $pos.nodeAfter;
        let $end = $pos.node(0).resolve($pos.pos + node.nodeSize);
        super($pos, $end);
        this.node = node;
    }
    map(doc, mapping) {
        let { deleted, pos } = mapping.mapResult(this.anchor);
        let $pos = doc.resolve(pos);
        if (deleted)
            return Selection.near($pos);
        return new NodeSelection($pos);
    }
    content() {
        return new Slice(Fragment.from(this.node), 0, 0);
    }
    eq(other) {
        return other instanceof NodeSelection && other.anchor == this.anchor;
    }
    toJSON() {
        return { type: "node", anchor: this.anchor };
    }
    getBookmark() { return new NodeBookmark(this.anchor); }
    /**
    @internal
    */
    static fromJSON(doc, json) {
        if (typeof json.anchor != "number")
            throw new RangeError("Invalid input for NodeSelection.fromJSON");
        return new NodeSelection(doc.resolve(json.anchor));
    }
    /**
    Create a node selection from non-resolved positions.
    */
    static create(doc, from) {
        return new NodeSelection(doc.resolve(from));
    }
    /**
    Determines whether the given node may be selected as a node
    selection.
    */
    static isSelectable(node) {
        return !node.isText && node.type.spec.selectable !== false;
    }
}
NodeSelection.prototype.visible = false;
Selection.jsonID("node", NodeSelection);
class NodeBookmark {
    constructor(anchor) {
        this.anchor = anchor;
    }
    map(mapping) {
        let { deleted, pos } = mapping.mapResult(this.anchor);
        return deleted ? new TextBookmark(pos, pos) : new NodeBookmark(pos);
    }
    resolve(doc) {
        let $pos = doc.resolve(this.anchor), node = $pos.nodeAfter;
        if (node && NodeSelection.isSelectable(node))
            return new NodeSelection($pos);
        return Selection.near($pos);
    }
}
/**
A selection type that represents selecting the whole document
(which can not necessarily be expressed with a text selection, when
there are for example leaf block nodes at the start or end of the
document).
*/
class AllSelection extends Selection {
    /**
    Create an all-selection over the given document.
    */
    constructor(doc) {
        super(doc.resolve(0), doc.resolve(doc.content.size));
    }
    replace(tr, content = Slice.empty) {
        if (content == Slice.empty) {
            tr.delete(0, tr.doc.content.size);
            let sel = Selection.atStart(tr.doc);
            if (!sel.eq(tr.selection))
                tr.setSelection(sel);
        }
        else {
            super.replace(tr, content);
        }
    }
    toJSON() { return { type: "all" }; }
    /**
    @internal
    */
    static fromJSON(doc) { return new AllSelection(doc); }
    map(doc) { return new AllSelection(doc); }
    eq(other) { return other instanceof AllSelection; }
    getBookmark() { return AllBookmark; }
}
Selection.jsonID("all", AllSelection);
const AllBookmark = {
    map() { return this; },
    resolve(doc) { return new AllSelection(doc); }
};
// FIXME we'll need some awareness of text direction when scanning for selections
// Try to find a selection inside the given node. `pos` points at the
// position where the search starts. When `text` is true, only return
// text selections.
function findSelectionIn(doc, node, pos, index, dir, text = false) {
    if (node.inlineContent)
        return TextSelection.create(doc, pos);
    for (let i = index - (dir > 0 ? 0 : 1); dir > 0 ? i < node.childCount : i >= 0; i += dir) {
        let child = node.child(i);
        if (!child.isAtom) {
            let inner = findSelectionIn(doc, child, pos + dir, dir < 0 ? child.childCount : 0, dir, text);
            if (inner)
                return inner;
        }
        else if (!text && NodeSelection.isSelectable(child)) {
            return NodeSelection.create(doc, pos - (dir < 0 ? child.nodeSize : 0));
        }
        pos += child.nodeSize * dir;
    }
    return null;
}
function selectionToInsertionEnd(tr, startLen, bias) {
    let last = tr.steps.length - 1;
    if (last < startLen)
        return;
    let step = tr.steps[last];
    if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep))
        return;
    let map = tr.mapping.maps[last], end;
    map.forEach((_from, _to, _newFrom, newTo) => { if (end == null)
        end = newTo; });
    tr.setSelection(Selection.near(tr.doc.resolve(end), bias));
}

function bind(f, self) {
    return !self || !f ? f : f.bind(self);
}
class FieldDesc {
    constructor(name, desc, self) {
        this.name = name;
        this.init = bind(desc.init, self);
        this.apply = bind(desc.apply, self);
    }
}
[
    new FieldDesc("doc", {
        init(config) { return config.doc || config.schema.topNodeType.createAndFill(); },
        apply(tr) { return tr.doc; }
    }),
    new FieldDesc("selection", {
        init(config, instance) { return config.selection || Selection.atStart(instance.doc); },
        apply(tr) { return tr.selection; }
    }),
    new FieldDesc("storedMarks", {
        init(config) { return config.storedMarks || null; },
        apply(tr, _marks, _old, state) { return state.selection.$cursor ? tr.storedMarks : null; }
    }),
    new FieldDesc("scrollToSelection", {
        init() { return 0; },
        apply(tr, prev) { return tr.scrolledIntoView ? prev + 1 : prev; }
    })
];

// Protect for absent global `ProseMirror` on Foundry v9.
globalThis.ProseMirror ? ProseMirror.ProseMirrorKeyMaps : class {};

// -------------------------------------------------------------------------------------------------------------------

/**
 * Assign all TyphonJS thematic CSS variables.
 */

cssVariables.setProperties({
   // For components w/ transparent background checkered pattern.
   '--tjs-checkerboard-background-dark': 'rgb(205, 205, 205)',
   '--tjs-checkerboard-background-10': `url('data:image/svg+xml;utf8,<svg preserveAspectRatio="none"  viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="5" height="5" fill="transparent" /><rect x="5" y="5" width="5" height="5" fill="transparent" /><rect x="5" y="0" width="5" height="5" fill="white" /><rect x="0" y="5" width="5" height="5" fill="white" /></svg>') 0 0 / 10px 10px, var(--tjs-checkerboard-background-dark, rgb(205, 205, 205))`
}, false);

// -------------------------------------------------------------------------------------------------------------------

/**
 * Assign all TyphonJS CSS variables to Foundry defaults.
 */

cssVariables.setProperties({
   '--tjs-action-ripple-background': 'rgba(0, 0, 0, 0.35)'
}, false);

// -------------------------------------------------------------------------------------------------------------------

cssVariables.setProperties({
   '--tjs-icon-button-background': 'none',
   '--tjs-icon-button-background-focus': 'var(--tjs-icon-button-background-hover)',
   '--tjs-icon-button-background-hover': 'rgba(0, 0, 0, 0.10)',
   '--tjs-icon-button-background-selected': 'rgba(0, 0, 0, 0.20)',
   '--tjs-icon-button-border-radius': '50%',
   '--tjs-icon-button-diameter': '2em',
   '--tjs-icon-button-transition': 'background 0.2s ease-in-out, clip-path 0.2s ease-in-out'
}, false);

{
   /**
    * All input related components including: TJSSelect,
    */
   const props = FoundryStyles.getProperties('input[type="text"], input[type="number"]');

   if (typeof props === 'object')
   {
      cssVariables.setProperties({
         '--tjs-input-background': 'background' in props ? props.background : 'rgba(0, 0, 0, 0.05)',
         '--tjs-input-border': 'border' in props ? props.border : '1px solid var(--color-border-light-tertiary)',
         '--tjs-input-border-radius': 'border-radius' in props ? props['border-radius'] : '3px',
         '--tjs-input-height': 'height' in props ? props.height : 'var(--form-field-height)',
         '--tjs-input-min-width': 'min-width' in props ? props['min-width'] : '20px',
         '--tjs-input-padding': 'padding' in props ? props['padding'] : '1px 3px',
         '--tjs-input-width': 'width' in props ? props.width : 'calc(100% - 2px)',

         // Set default values that are only to be referenced and not set.
         '--_tjs-default-input-height': 'height' in props ? props.height : 'var(--form-field-height)',

         // Set directly / no lookup:
         '--tjs-input-border-color': 'var(--color-border-light-tertiary)',
         '--tjs-input-border-width': '1px',
         '--tjs-input-value-invalid-color': 'red'
      }, false);
   }
}

{
   /**
    * Select options related: TJSSelect,
    */
   const props = FoundryStyles.getProperties('option, optgroup');

   if (typeof props === 'object')
   {
      cssVariables.setProperties({
         '--tjs-select-option-background': 'background' in props ? props.background : 'var(--color-bg-option)'
      }, false);
   }
}

cssVariables.setProperties({
   '--tjs-label-transition': 'background 200ms linear'
}, false);

cssVariables.setProperties({
   '--tjs-menu-border': '1px solid var(--color-border-dark, #000)',
   '--tjs-menu-box-shadow': '0 0 2px var(--color-shadow-dark, #000)',
   '--tjs-menu-color': 'var(--color-text-light-primary, #EEE)',
   '--tjs-menu-item-hover-text-shadow-color': 'var(--color-text-hyperlink, red)',
}, false);

// Handle `PopOut!` module hooks to allow applications to popout to their own browser window -------------------------

Hooks.on('PopOut:loading', (app, popout) =>
{
   if (app instanceof SvelteApplication)
   {
      // Clone and load `svelte-standard` CSS variables into new window document.
      popout.document.addEventListener('DOMContentLoaded', () => cssVariables.clone(popout.document));
   }
});

/* src\Main.svelte generated by Svelte v3.55.0-cq */

function create_fragment(ctx) {
	let div1;
	let div0;
	let label;
	let t0;
	let input;
	let t1;
	let t2_value = /*options1*/ ctx[0].width + "";
	let t2;
	let t3;
	let t4;
	let tjscolordpicker0;
	let updating_color;
	let t5;
	let tjscolordpicker1;
	let updating_color_1;
	let t6;
	let tjscolordpicker2;
	let current;
	let mounted;
	let dispose;

	function tjscolordpicker0_color_binding(value) {
		/*tjscolordpicker0_color_binding*/ ctx[4](value);
	}

	let tjscolordpicker0_props = { options: /*options1*/ ctx[0] };

	if (/*color*/ ctx[1] !== void 0) {
		tjscolordpicker0_props.color = /*color*/ ctx[1];
	}

	tjscolordpicker0 = new TJSColordPicker({ props: tjscolordpicker0_props });
	binding_callbacks.push(() => bind$1(tjscolordpicker0, 'color', tjscolordpicker0_color_binding, /*color*/ ctx[1]));

	function tjscolordpicker1_color_binding(value) {
		/*tjscolordpicker1_color_binding*/ ctx[5](value);
	}

	let tjscolordpicker1_props = { options: /*options2*/ ctx[2] };

	if (/*color*/ ctx[1] !== void 0) {
		tjscolordpicker1_props.color = /*color*/ ctx[1];
	}

	tjscolordpicker1 = new TJSColordPicker({ props: tjscolordpicker1_props });
	binding_callbacks.push(() => bind$1(tjscolordpicker1, 'color', tjscolordpicker1_color_binding, /*color*/ ctx[1]));
	tjscolordpicker2 = new TJSColordPicker({ props: { options: /*options2*/ ctx[2] } });

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			label = element("label");
			t0 = text("Width: ");
			input = element("input");
			t1 = text(" (");
			t2 = text(t2_value);
			t3 = text(")");
			t4 = space();
			create_component(tjscolordpicker0.$$.fragment);
			t5 = space();
			create_component(tjscolordpicker1.$$.fragment);
			t6 = space();
			create_component(tjscolordpicker2.$$.fragment);
			attr(input, "type", "range");
			attr(input, "min", "50");
			attr(input, "max", "400");
			set_style(input, "width", "100px");
			attr(div0, "class", "options svelte-1m1glgu");
			attr(div1, "class", "content svelte-1m1glgu");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			append(div0, label);
			append(label, t0);
			append(label, input);
			set_input_value(input, /*options1*/ ctx[0].width);
			append(label, t1);
			append(label, t2);
			append(label, t3);
			append(div1, t4);
			mount_component(tjscolordpicker0, div1, null);
			append(div1, t5);
			mount_component(tjscolordpicker1, div1, null);
			append(div1, t6);
			mount_component(tjscolordpicker2, div1, null);
			current = true;

			if (!mounted) {
				dispose = [
					listen(input, "change", /*input_change_input_handler*/ ctx[3]),
					listen(input, "input", /*input_change_input_handler*/ ctx[3])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*options1*/ 1) {
				set_input_value(input, /*options1*/ ctx[0].width);
			}

			if ((!current || dirty & /*options1*/ 1) && t2_value !== (t2_value = /*options1*/ ctx[0].width + "")) set_data(t2, t2_value);
			const tjscolordpicker0_changes = {};
			if (dirty & /*options1*/ 1) tjscolordpicker0_changes.options = /*options1*/ ctx[0];

			if (!updating_color && dirty & /*color*/ 2) {
				updating_color = true;
				tjscolordpicker0_changes.color = /*color*/ ctx[1];
				add_flush_callback(() => updating_color = false);
			}

			tjscolordpicker0.$set(tjscolordpicker0_changes);
			const tjscolordpicker1_changes = {};

			if (!updating_color_1 && dirty & /*color*/ 2) {
				updating_color_1 = true;
				tjscolordpicker1_changes.color = /*color*/ ctx[1];
				add_flush_callback(() => updating_color_1 = false);
			}

			tjscolordpicker1.$set(tjscolordpicker1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(tjscolordpicker0.$$.fragment, local);
			transition_in(tjscolordpicker1.$$.fragment, local);
			transition_in(tjscolordpicker2.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(tjscolordpicker0.$$.fragment, local);
			transition_out(tjscolordpicker1.$$.fragment, local);
			transition_out(tjscolordpicker2.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			destroy_component(tjscolordpicker0);
			destroy_component(tjscolordpicker1);
			destroy_component(tjscolordpicker2);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	const options1 = { width: 190, isPopup: false };
	const options2 = { width: 80, isPopup: false };
	let color;

	function input_change_input_handler() {
		options1.width = to_number(this.value);
		$$invalidate(0, options1);
	}

	function tjscolordpicker0_color_binding(value) {
		color = value;
		$$invalidate(1, color);
	}

	function tjscolordpicker1_color_binding(value) {
		color = value;
		$$invalidate(1, color);
	}

	return [
		options1,
		color,
		options2,
		input_change_input_handler,
		tjscolordpicker0_color_binding,
		tjscolordpicker1_color_binding
	];
}

class Main extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, {});
	}
}

new Main({ target: document.body });
