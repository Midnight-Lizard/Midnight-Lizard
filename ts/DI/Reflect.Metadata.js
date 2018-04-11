var root = typeof global === "object" ? global :
    typeof self === "object" ? self :
        typeof this === "object" ? this :
            Function("return this;")();
root.Reflect = {};